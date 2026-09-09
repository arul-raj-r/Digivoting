# DigiVote Authentication & Voter Flow

This document outlines the authentication and voting sequence designed for the **DigiVote** platform according to the approved module specifications.

---

## 1. Voter Progression Flow

```
[ Citizen Registration (Module 1) ]
       │
       ▼
[ Email Verification (Module 4) ]
       │
       ▼
[ Citizen Login & Lockout Protection (Modules 2 & 3) ]
       │
       ▼
[ MFA OTP Verification (Module 5) ]
       │
       ▼
[ Active Citizen Session (Module 6) & Security Audit (Module 7) ]
       │
       ▼
[ Voter Dashboard: Active Elections (Modules 8-11) ]
       │
       ▼
[ Election Polling Booth (Module 12) ]
       │──► Silent Eligibility Validation (Checked against EligibleVoter Roll)
       │──► Optional Verification Check (Webcam / Biometrics Flag Validation)
       │──► Ephemeral Confirmation Token
       ▼
[ Encrypted Ballot Submission & Cryptographic Receipt ]
```

---

## 2. Authentication Modules (Modules 1 - 7)

1. **Module 1 - Citizen Registration**:
   - Collects full name, email, mobile number, and password.
   - Enforces password complexity and email uniqueness.
   - Sets `email_verified=False` initially.

2. **Module 2 - Login & Lockout Protection**:
   - Validates credentials.
   - Enforces atomic failed attempt tracking with progressive timeouts and lockouts (Module 7).
   - Generates pre-auth tokens for pending MFA.

3. **Module 3 - Google OAuth 2.0**:
   - Validates Google ID token cryptographically on backend.

4. **Module 4 - Email Verification**:
   - Sends secure 64-character activation token link to citizen's email.
   - Sets `email_verified=True` upon confirmation.

5. **Module 5 - Multi-Factor Authentication (OTP)**:
   - Generates cryptographically secure 6-digit OTP sent to registered email.
   - 5-minute validity window with 3-attempt limit and 30-second resend cooldown.

6. **Module 6 - Session Management**:
   - Tracks active sessions across devices with IP address and browser details.
   - Allows voters to inspect active sessions and revoke single or all other sessions.

7. **Module 7 - Security Audit & Monitoring**:
   - Logs security events (login attempts, lockouts, throttles).
   - Voter-facing security audit timeline on dashboard.

---

## 3. Voter Verification in Polling Booth (Module 12)

- **Voter Eligibility Validation**: Automatically validated against the election's `EligibleVoter` roll when attempting to vote.
- **Biometric / Webcam Verification Flags**: Configured per-election by the creator. Checked silently at vote-time. If enabled and infrastructure is unavailable, voting blocks with a clear error. No voter-facing enrollment flow.
- **One-Time Voting Authorization**: Enforced by marking `has_voted=True` atomically upon ballot submission.
