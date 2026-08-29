# DigiVote — Secure Digital Voting Platform

A civic-grade, secure digital voting platform designed with end-to-end encryption, multi-factor verification, and tamper-evident election audit trails.

---

## Architecture Overview (Authentication System: 7 Modules)
- **Module 1: User Registration** *(Current)* — Citizen registration, server-side duplicate checks (409 Conflict), PBKDF2/Argon2 password hashing, live strength checklist, and email verification holding state.
- **Module 2: User Login & JWT** *(Next)*
- **Module 3: Google OAuth Integration**
- **Module 4: Email Verification Service**
- **Module 5: Mobile & Email OTP MFA**
- **Module 6: Device & Session Management**
- **Module 7: Security Hardening & Audit Logs**

---

## Quickstart Guide

### 1. Backend Setup (Django + DRF)

```powershell
# Navigate to backend directory
cd backend

# Activate Python virtual environment
.\venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Run Module 1 unit & security tests
python manage.py test accounts

# Start Django backend server
python manage.py runserver
```

The backend server runs on `http://localhost:8000`. The registration endpoint is accessible at `POST /api/auth/register/` and `POST /api/v1/auth/register/`.

---

### 2. Frontend Setup (React + Vite)

```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite React development server
npm run dev
```

The frontend application runs on `http://localhost:5173`. Access the registration page at `http://localhost:5173/register`.

---

## Module 1 API Specification

### `POST /api/auth/register/`

#### Request Payload:
```json
{
  "full_name": "Eleanor Vance",
  "email": "citizen@election.gov.in",
  "mobile_number": "9876543210",
  "password": "CommissionGradePassword@123",
  "confirm_password": "CommissionGradePassword@123"
}
```

#### Successful Response (`201 Created`):
```json
{
  "success": true,
  "message": "Account registered successfully. Please verify your email address to proceed.",
  "user": {
    "id": "c71a39f6-613d-4c3e-908e-17796dcf982e",
    "full_name": "Eleanor Vance",
    "email": "citizen@election.gov.in",
    "mobile_number": "9876543210",
    "status": "pending_verification",
    "is_email_verified": false,
    "date_joined": "2026-08-29T20:00:00Z"
  }
}
```

#### Duplicate Account Error (`409 Conflict`):
```json
{
  "success": false,
  "field": "email",
  "message": "This email is already registered — try logging in instead."
}
```
