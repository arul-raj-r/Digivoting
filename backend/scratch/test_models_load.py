import cv2
import numpy as np

detector = cv2.FaceDetectorYN.create(
    "models/face_detection_yunet_2023mar.onnx",
    "",
    (320, 320)
)
recognizer = cv2.FaceRecognizerSF.create(
    "models/face_recognition_sface_2021dec.onnx",
    ""
)
print("Detector loaded:", detector is not None)
print("Recognizer loaded:", recognizer is not None)
