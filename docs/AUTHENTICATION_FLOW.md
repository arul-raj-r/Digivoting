# DigiVote Identity & Authentication Flow

This document outlines the end-to-end authentication, identity verification, and voter onboarding sequence designed for the **DigiVote** platform. The pipeline guarantees that a person creating a portal account must successfully complete multiple out-of-band verification steps before being authorized to access the voting terminal.

---

## 1. Target User Flow Pipeline

The voter progression contains multiple distinct gates, moving sequentially from account setup to ballot access:

```
[ Landing Page ]
       │
       ▼
[ Create Account / Login ] ──► (Email + Password OR Google Login)
       │
       ▼
[ Email/Mobile OTP Verification ] ──► (2FA Challenge)
       │
       ▼
[ User Dashboard ] ──► (State: Unverified Voter)
       │
       ▼
[ Identity Verification ] ──► (DigiLocker OAuth 2.0 OR Aadhaar Validation)
       │
       ▼
[ Face Verification ] ──► (Webcam Capture + Anti-Spoofing Liveness Audits)
       │
       ▼
[ Biometric Enrollment ] ──► (WebAuthn Platform Passkey Registration)
       │
       ▼
[ Eligibility Verification ] ──► (Constituency Check + Active Election Mapping)
       │
       ▼
[ Authorized Voter Dashboard ] ──► (Active Election Access Enabled)
```

---

## 2. Website Account vs. Verified Voter Profile

A critical security tenant of DigiVote is the separation of concerns between core website accounts and official voter profiles:

| Dimension | Website Account (`users`) | Verified Voter Profile (`voter_profiles`) |
| :--- | :--- | :--- |
| **Creation** | Instantly created by voter during sign up. | Created only upon successful Aadhaar or DigiLocker authentication. |
| **Role** | Represents credentials for logging in (JWT holder). | Holds geographical, polling station, and eligibility parameters. |
| **Status** | Active upon registration (with email verified). | Starts as `is_verified = False` and requires visual audit approval. |
| **Access Limit** | Allowed to access help tickets and dashboard settings. | Granted access to the cryptographic voting terminal. |

---

## 3. Google OAuth & Identity Token Validation

To prevent account takeover and spoofing, DigiVote integrates Google OAuth with zero trust in frontend claims:

1. **Frontend Auth Init**: The React frontend initializes the Google Sign-In SDK, prompting the voter. Upon consent, Google returns an Identity Token (`id_token` in JWT format).
2. **Token Forwarding**: The frontend transmits the raw `id_token` to `/api/v1/auth/google/` on the Django backend.
3. **Backend Token Validation Pipeline**:
   - The backend uses Google's official cryptography libraries (`google-auth`) to verify the token signature.
   - It checks that the issuer (`iss`) is `accounts.google.com` or `https://accounts.google.com`.
   - It verifies that the audience (`aud`) matches the backend's registered `GOOGLE_CLIENT_ID`.
   - It checks that the token is not expired (`exp` claim).
   - If valid, the backend extracts the validated claims: `sub` (Google user ID), `email`, and `name`.
   - The email is matched against the database. If no user exists, a new inactive user is provisioned. If the email matches, a JWT session is returned.
   *Security Note: The frontend-supplied email parameter is NEVER trusted directly.*

---

## 4. Aadhaar Verification Abstraction

DigiVote does not host an Aadhaar database. Instead, it utilizes an integration abstraction interface to connect to authorized UIDAI providers (such as CDAC or UIDAI e-KYC gateways).

### Abstraction Interface Layout (`backend/identity/providers/aadhaar.py`)
```python
from abc import ABC, abstractmethod
from typing import Dict, Any

class AadhaarVerificationProvider(ABC):
    @abstractmethod
    def generate_otp(self, aadhaar_number: str) -> str:
        """
        Triggers an OTP verification request to the registered mobile number
        linked with the Aadhaar card via the gateway. Returns transaction ID.
        """
        pass

    @abstractmethod
    def verify_otp(self, transaction_id: str, otp_code: str) -> Dict[str, Any]:
        """
        Verifies the OTP code against UIDAI. On success, returns demographic
        claims: Full Name, Date of Birth, Gender, Photo (Base64), and Address.
        """
        pass
```
Production deployments will swap a real class (e.g. `UIDAIeKYCProvider`) into Django settings, while the development environment will use a mock provider.

---

## 5. DigiLocker OAuth 2.0 Integration

DigiLocker integration follows the standard OAuth 2.0 / OpenID Connect workflow to pull verified government records (like the Aadhaar card or official Voter ID card) directly from the voter's repository:

1. **Redirect to DigiLocker**: The voter clicks "Connect DigiLocker" on the dashboard. React redirects the voter to the secure DigiLocker authorize endpoint:
   `https://services.digitallocker.gov.in/oauth/authorize?response_type=code&client_id=<CLIENT_ID>&redirect_uri=<REDIRECT_URI>&state=<STATE>`
2. **Voter Consents**: The voter logs in directly on DigiLocker's official login portal. DigiLocker redirects back to Django's callback URL `/api/v1/digilocker/callback/` with an authorization code.
3. **Token Exchange**: The Django backend exchanges the authorization code for an Access Token by sending a secure POST request to DigiLocker's token endpoint using the client secret.
4. **Data Pull**: The backend requests the voter's e-Aadhaar or Voter ID JSON metadata from the issued documents endpoint. It parses the authenticated response:
   - Full Name
   - Date of Birth (validated format `YYYY-MM-DD`)
   - Gender
   - EPIC Card Number
5. **Session Isolation**: No DigiLocker password or pin is ever requested, scraped, or stored by DigiVote. Access tokens are stored in the database encrypted using AES-256-GCM.

---

## 6. Hybrid Demo Mode Architecture

To accommodate evaluations, local development, and academic demonstrations without exposing real API keys, the platform utilizes a hybrid configuration switch:

```bash
# configure in backend/.env
DEMO_MODE=true
```

### 6.1. When `DEMO_MODE=true`
* **Google Login**: Accepts signed test tokens or mocks the verification response, allowing logging in with simulated accounts (`voter1`, `voter2`).
* **Aadhaar / DigiLocker Verification**: Provides a dropdown of synthetic test identities (e.g., "Priyanka Sharma, DOB: 1994-05-12, EPIC: TNY8710293"). Selecting an identity registers the voter instantly.
* **OTP Dispatch**: OTPs are bypassed or printed directly to the backend command terminal logs instead of invoking paid SMS/Email gateways.
* **WebAuthn**: Allows virtual software-based authenticators or accepts test credential keys.

### 6.2. When `DEMO_MODE=false` (Production Mode)
* **Real Tokens**: The Google validation wrapper throws an error if token signatures fail cryptographic validation.
* **UIDAI / DigiLocker Gateways**: Attempts to dispatch requests directly to external HTTPS endpoints. Valid client certificates and API signatures are required.
* **MFA**: Connects to SMTP email servers or SMS gateways (e.g., Twilio) to dispatch secure OTP verification codes.
