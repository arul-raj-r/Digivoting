# DigiVote Security Architecture Specification

This document details the security controls, data encryption rules, session management, and vulnerability defense mechanisms designed to protect the **DigiVote** platform from exploitation, tampering, and denial-of-service.

---

## 1. Authentication & Session Protections

### 1.1. Password & OTP Hashing
* **Portal Passwords**: Hashed on the backend using Django's default implementation of PBKDF2 with SHA-256 (36,000 iterations minimum).
* **One-Time Passwords (OTP)**: OTP codes sent via email/SMS are hashed using Django's standard hashing primitives (`make_password`) before database insertion. Even with database access, active verification codes cannot be read in plaintext.

### 1.2. Token Lifecycle & Refresh Token Rotation (RTR)
To prevent session hijacking via token theft, DigiVote implements JSON Web Token (JWT) rotation:
- **Token Lifetime**: Access tokens have a lifetime of 15 minutes. Refresh tokens are valid for 24 hours.
- **Rotation Mechanics**: Every time the React client requests a new access token using a refresh token (`/api/v1/auth/token/refresh/`), the backend invalidates the used refresh token, issues a brand-new access token, and returns a new refresh token.
- **Blacklisting**: Refresh tokens store a unique token identifier (`jti`). The backend records used `jti` identifiers in a Redis/Supabase blacklist table. If a compromised refresh token is reused, the backend detects the violation, immediately revokes the entire family of tokens associated with that session, and flags a critical security event.

### 1.3. OTP Cooldown & Brute-Force Rate Limiting
- **Attempts Cap**: An `OTPVerification` record allows a maximum of 3 verification attempts. On the third failure, the record's `is_verified` flag is set to `False` and its expiration is accelerated to the past.
- **Resend Cooldown**: Requesting a new OTP code enforces a 60-second delay. The backend compares `created_at` timestamps of the user's latest OTPs and blocks generation if the cooldown window is active.
- **Rate-Limiting Throttles**: REST Framework middleware limits request velocities:
  - `AnonRateThrottle`: 100 requests/hour (unauthenticated routes).
  - `UserRateThrottle`: 1,000 requests/hour (authenticated dashboard routes).
  - `LoginView`: Maximum 5 attempts/minute per IP/username.
  - `OTPVerifyView`: Maximum 3 attempts/minute.
  - `VoteCastView`: Maximum 2 attempts/minute.

---

## 2. WebAuthn Biometrics Security

The biometric finger/face key data never leaves the citizen's device. Security is maintained through FIDO2/WebAuthn public-key cryptography:

1. **Platform Isolation**: The browser utilizes the local secure enclave (TPM, Secure Enclave, Windows Hello, FaceID) to prompt user consent. Only cryptographic signatures are transmitted to the server.
2. **Backend Assertion Verification**: During verification, the Django backend receives the signature, the authenticating client data, and the credential identifier.
   - The backend retrieves the stored public key associated with the `webauthn_credentials` record.
   - It verifies the signature against the server's generated challenge.
   - It checks that the returned challenge matches the cached registration parameters exactly.
3. **Sign Counter Protection**: The database stores a `sign_count` parameter. The backend compares the incoming counter in the assertion payload with the database value. If the incoming counter is not greater than the stored value, a cloned authenticator is detected, the transaction is rejected, and the credential is suspended.

---

## 3. Web Application Vulnerability Mitigation

DigiVote incorporates mitigations against the OWASP Top 10 vulnerabilities:

### 3.1. SQL Injection (SQLi)
* **Defense**: Django ORM is utilized for all database operations. The ORM compiles queries using parameterized statements, binding inputs separate from query commands. Raw SQL queries are prohibited.

### 3.2. Cross-Site Scripting (XSS)
* **Defense**: The React UI automatically escapes variable values in JSX before rendering them.
* **Content Security Policy (CSP)**: The server returns standard headers:
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self' https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://api.dicebear.com; connect-src 'self' https://services.digitallocker.gov.in; frame-ancestors 'none';
  ```

### 3.3. Cross-Site Request Forgery (CSRF)
* **Defense**: Access tokens are stored as short-lived in-memory JS variables on the frontend. Refresh tokens are stored in an HTTP-only, Secure cookie with a path restricted to `/api/v1/auth/token/refresh/`. Since JavaScript cannot read HTTP-only cookies, the application is protected against script-based token harvesting. CSRF tokens are validated for all state-changing POST/PUT operations.

### 3.4. Insecure Direct Object Reference (IDOR)
* **Defense**: Database records (such as voters, elections, candidates, receipts) are keyed using randomly generated **UUIDv4** keys rather than sequential integers. This prevents attackers from guessing and accessing neighboring records.

### 3.5. Cookie & Session Security Headers
All session cookies are configured with security flags:
- `HttpOnly`: Prevents client-side scripts from reading the cookie.
- `Secure`: Forces cookies to be sent only over HTTPS connections.
- `SameSite=Strict`: Restricts cookie dispatches to same-site navigations, neutralizing CSRF attacks.

The Django backend serves standard HTTP security headers:
```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## 4. Session & Device Management

To detect credential-sharing or unauthorized logins, DigiVote registers and tracks browser parameters:

* **Fingerprinting**: The frontend compiles canvas parameters, OS, browser engines, and screen resolutions to establish a basic client fingerprint.
* **Revocation Console**: Voters can access their Security Settings tab to view the list of active sessions (IP, Location, User-Agent, Last Active time).
* **Session Revocation**: A voter can click "Revoke Session" for an unknown device. The backend invalidates the corresponding JTI refresh token blacklist entry and terminates the session.

---

## 5. Audit Logging & Suspicious Activity Detection

The platform writes all security actions to the append-only `AuditLog` table. This ledger is decoupled from the voting terminal.

### 5.1. Security Event Escalation
When the system detects anomalies (such as signature verification mismatches, rapid concurrent logins across disparate IPs, or rate-limit violations), it generates a `SecurityEvents` record:
* **Severity Levels**: `LOW` (login failed), `MEDIUM` (OTP threshold exceeded), `HIGH` (token reuse anomaly, WebAuthn replay attempt).
* **Alerting**: High and Critical events trigger Slack/webhook dispatches to security administrators. They also place a hold on the target user profile, locking out access to the voting terminal until an auditor reviews the event.
