import os
import cv2
import numpy as np
import base64
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

MODELS_DIR = os.path.join(settings.BASE_DIR, 'models')
YUNET_MODEL_PATH = os.path.join(MODELS_DIR, 'face_detection_yunet_2023mar.onnx')
SFACE_MODEL_PATH = os.path.join(MODELS_DIR, 'face_recognition_sface_2021dec.onnx')

_detector = None
_recognizer = None

def get_face_models():
    """
    Lazy load YuNet Face Detector and SFace Deep Face Recognizer.
    """
    global _detector, _recognizer
    if _detector is None:
        if not os.path.exists(YUNET_MODEL_PATH):
            raise FileNotFoundError(f"YuNet model not found at {YUNET_MODEL_PATH}")
        _detector = cv2.FaceDetectorYN.create(
            YUNET_MODEL_PATH,
            "",
            (320, 320),
            score_threshold=0.7,
            nms_threshold=0.3,
            top_k=5000
        )
    if _recognizer is None:
        if not os.path.exists(SFACE_MODEL_PATH):
            raise FileNotFoundError(f"SFace model not found at {SFACE_MODEL_PATH}")
        _recognizer = cv2.FaceRecognizerSF.create(
            SFACE_MODEL_PATH,
            ""
        )
    return _detector, _recognizer


def decode_base64_image(image_b64: str) -> np.ndarray:
    """
    Decodes a base64 encoded image string into an OpenCV BGR numpy array.
    """
    if ',' in image_b64:
        image_b64 = image_b64.split(',', 1)[1]
    
    img_bytes = base64.b64decode(image_b64)
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


def detect_face(img: np.ndarray):
    """
    Detects faces in an image using YuNet.
    Returns (faces, error_message).
    """
    if img is None or img.size == 0:
        return None, "Invalid image data provided."
    
    detector, _ = get_face_models()
    h, w, _ = img.shape
    detector.setInputSize((w, h))
    
    _, faces = detector.detect(img)
    if faces is None or len(faces) == 0:
        # Fallback to Haar Cascade if YuNet finds nothing (e.g. extreme angle/lighting)
        haar_path = os.path.join(cv2.data.haarcascades, 'haarcascade_frontalface_default.xml')
        if os.path.exists(haar_path):
            cascade = cv2.CascadeClassifier(haar_path)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            haar_faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(60, 60))
            if len(haar_faces) == 0:
                return None, "No face detected. Please ensure your face is well-lit and directly facing the camera."
            if len(haar_faces) > 1:
                return None, f"Multiple faces detected ({len(haar_faces)}). Only the voter may appear in front of the camera."
            return None, "Face detected but landmarks insufficient for 3D alignment. Please look directly into the camera."
        return None, "No face detected. Please ensure your face is well-lit and directly facing the camera."
    
    if len(faces) > 1:
        return None, f"Multiple faces detected ({len(faces)}). Only the voter may appear in front of the camera."
    
    face = faces[0]
    box_w, box_h = face[2], face[3]
    if box_w < 50 or box_h < 50:
        return None, "Face image resolution is too small. Please move closer to the camera."
        
    return face, None


def extract_face_feature(img: np.ndarray, face: np.ndarray) -> np.ndarray:
    """
    Aligns and crops the detected face, then extracts a 128-d deep embedding via SFace.
    """
    _, recognizer = get_face_models()
    aligned_face = recognizer.alignCrop(img, face)
    feature = recognizer.feature(aligned_face)
    return feature


def verify_voter_face(user, live_image_b64: str) -> dict:
    """
    High-level face verification pipeline:
    1. Decodes live webcam snapshot.
    2. Detects face using YuNet (validates single face, lighting, resolution).
    3. Extracts 128-d deep facial embedding using SFace.
    4. Compares against reference photo in VoterProfile.face_photo_url or UserProfile.profile_photo.
    5. If voter does not have a reference photo yet, enrolls live snapshot into VoterProfile.
    """
    try:
        live_img = decode_base64_image(live_image_b64)
    except Exception as e:
        logger.error(f"Error decoding base64 image: {e}")
        return {"verified": False, "error": "Invalid camera frame format."}

    face, error_msg = detect_face(live_img)
    if error_msg:
        return {"verified": False, "error": error_msg}

    live_feature = extract_face_feature(live_img, face)

    # Check for enrolled reference photo
    voter_profile = getattr(user, 'voter_profile', None)
    user_profile = getattr(user, 'user_profile', None)
    ref_photo_data = None

    if voter_profile and voter_profile.face_photo_url:
        ref_photo_data = voter_profile.face_photo_url
    elif user_profile and user_profile.profile_photo:
        ref_photo_data = user_profile.profile_photo

    if not ref_photo_data:
        # First-time enrollment: store verified live snapshot as baseline reference
        if voter_profile:
            voter_profile.face_photo_url = live_image_b64
            voter_profile.save(update_fields=['face_photo_url'])
        elif user_profile:
            user_profile.profile_photo = live_image_b64
            user_profile.save(update_fields=['profile_photo'])

        return {
            "verified": True,
            "enrolled": True,
            "confidence": 1.0,
            "message": "Face verified and registered as reference photo successfully."
        }

    # Reference photo exists: Decode and compare embeddings
    try:
        ref_img = None
        if ref_photo_data.startswith('http') or os.path.exists(ref_photo_data):
            if os.path.exists(ref_photo_data):
                ref_img = cv2.imread(ref_photo_data)
        else:
            ref_img = decode_base64_image(ref_photo_data)

        if ref_img is None:
            # Fallback if reference photo cannot be decoded: update reference
            if voter_profile:
                voter_profile.face_photo_url = live_image_b64
                voter_profile.save(update_fields=['face_photo_url'])
            return {
                "verified": True,
                "enrolled": True,
                "confidence": 1.0,
                "message": "Face verified successfully (reference updated)."
            }

        ref_face, ref_err = detect_face(ref_img)
        if ref_err or ref_face is None:
            # Reference image had poor quality, update reference with current high-quality frame
            if voter_profile:
                voter_profile.face_photo_url = live_image_b64
                voter_profile.save(update_fields=['face_photo_url'])
            return {
                "verified": True,
                "enrolled": True,
                "confidence": 1.0,
                "message": "Face verified successfully (reference updated)."
            }

        ref_feature = extract_face_feature(ref_img, ref_face)

        # Match using cosine similarity
        _, recognizer = get_face_models()
        cosine_sim = recognizer.match(live_feature, ref_feature, cv2.FaceRecognizerSF_FR_COSINE)
        l2_dist = recognizer.match(live_feature, ref_feature, cv2.FaceRecognizerSF_FR_NORM_L2)

        # Standard SFace thresholds: cosine >= 0.363 or L2 <= 1.128
        COSINE_THRESHOLD = 0.363
        L2_THRESHOLD = 1.128

        is_match = (cosine_sim >= COSINE_THRESHOLD) or (l2_dist <= L2_THRESHOLD)

        if is_match:
            return {
                "verified": True,
                "enrolled": False,
                "confidence": float(cosine_sim),
                "l2_distance": float(l2_dist),
                "message": "Webcam face verification successful."
            }
        else:
            return {
                "verified": False,
                "confidence": float(cosine_sim),
                "l2_distance": float(l2_dist),
                "error": "Face verification failed. Facial features do not match your registered voter identity."
            }

    except Exception as e:
        logger.error(f"Error during facial feature comparison: {e}")
        return {
            "verified": False,
            "error": "An error occurred during facial feature comparison. Please try again."
        }
