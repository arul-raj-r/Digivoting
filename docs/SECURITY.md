# Security Baseline Analysis & Disclaimers

This document analyzes the security controls implemented in the Digital Election & Voting Platform.

---

## 1. Authentication & Session Protections

### Hashed Credentials
- Password data is never stored in plain text. Django's default PBKDF2 hashing algorithm with SHA-256 is used, which conforms to industrial security baselines.
- OTP (One-Time Password) codes are hashed using Django's standard hashing algorithm (`make_password`) before being saved to the database. Even if the database is compromised, active OTP codes cannot be read in plaintext.

### OTP Cooldown & Attempts Rate Limit
- **Max Verification Attempts**: Each OTP record allows a maximum of 3 verification attempts. After 3 failures (`attempts` increment checked in `OTPVerifyView`), the OTP is invalidated.
- **Resend Cooldown**: Generating a new OTP enforces a minimum 60-second delay. The backend checks the `created_at` timestamp of the user's latest OTP and throws HTTP 429 Too Many Requests if the cooldown is active.

### API Rate Limiting (Throttling)
Django REST Framework throttling limits requests to protect endpoints from brute-force or DDoS attacks:
- Anonymous users: Max 200 requests/day.
- Logged-in users: Max 2,000 requests/day.
- Login submissions: Max 15 attempts/minute.
- OTP verification: Max 5 attempts/minute.
- Cast vote endpoint: Max 10 attempts/minute.

---

## 2. Biometrics & Privacy Trade-off Disclaimer

> [!WARNING]
> **Biometric Minimization Principle Warning**
> In this academic prototype, raw webcam face capture frame strings (Base64) are saved directly in `face_photo_url` on the `Voter` table.
> This design choice is implemented strictly to simplify visual verification auditing in the Admin Dashboard for demonstration reviews.
>
> In a **production-grade secure deployment**, raw facial images must **never** be stored in a database. Instead, only irreversible, cryptographically encrypted facial embeddings/vectors should be kept. This ensures that even in the event of a system breach, the voters' biometric facial features cannot be reconstituted or stolen.

---

## 3. WebAuthn Passkeys (Future Scope)

For a production-ready secondary layer, the platform outlines a browser-native WebAuthn (Passkey) credential workflow:
1. **Registration**: The user registers a hardware key (Windows Hello, TouchID, YubiKey) using `navigator.credentials.create()`. The backend verifies the key signature against challenge parameters and stores the public key string.
2. **Login Challenge**: Upon entering credentials, the user signs a challenge string using `navigator.credentials.get()`. The backend verifies the signature counter to prevent replay attacks.
3. This is documented under `WebAuthnCredential` database models for academic completeness.

---

## 4. Voter ID Card Verification & Audits

### Knowledge & Possession Verification Check
- **Scope**: The card verification login step is a **card-number + visual-confirmation check**, not automated biometric face recognition.
- **Visual Audit**: The system displays the voter's registered photo (blurred for login privacy, fully visible in admin logs) for a manual physical cross-check, similar to a polling officer checking a physical card.
- **Project Limits**: This design choice keeps the academic project scope realistic and avoids overclaiming security guarantees that would require a certified biometric face-matching pipeline. In a future production iteration, this visual confirmation checkpoint could be upgraded to integrate automated biometrics comparison algorithms (e.g. cosine similarity checks on facial vectors).
