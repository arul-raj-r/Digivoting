import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import cv2
import numpy as np
import base64
from voting.face_service import detect_face, extract_face_feature, verify_voter_face
from authentication.models import User

print("Testing face_service...")
# Create a blank image with a circle (should be rejected as no face)
blank = np.zeros((300, 300, 3), dtype=np.uint8)
_, buffer = cv2.imencode('.jpg', blank)
b64 = base64.b64encode(buffer).decode('utf-8')

user = User.objects.first()
res = verify_voter_face(user, b64)
print("Blank image verification result:", res)
assert res['verified'] is False
assert "No face detected" in res['error']
print("Face rejection test passed!")
