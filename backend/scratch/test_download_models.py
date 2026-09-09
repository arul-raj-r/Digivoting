import urllib.request
import os

os.makedirs('models', exist_ok=True)
yunet_url = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
sface_url = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"

print("Testing download from OpenCV Zoo...")
try:
    urllib.request.urlretrieve(yunet_url, "models/face_detection_yunet_2023mar.onnx")
    print("YuNet downloaded successfully.")
    urllib.request.urlretrieve(sface_url, "models/face_recognition_sface_2021dec.onnx")
    print("SFace downloaded successfully.")
except Exception as e:
    print("Download error:", e)
