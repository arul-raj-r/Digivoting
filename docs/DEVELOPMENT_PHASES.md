# DigiVote Development Roadmap & Execution Phases

This document lays out the phased implementation timeline for bringing the **DigiVote** platform from a local prototype to a production-grade digital voting service.

---

## Phase 1: Tech Stack Transition & Core Bug Fixes
**Goal**: Align the codebases with target technologies and correct existing security bypass logic.

### 1.1. Frontend Transition (Vite/TS to React/JS)
- Delete Vite-specific configuration parameters (`vite.config.ts`, `tsconfig.json`).
- Rename files from `.tsx`/`.ts` to `.jsx`/`.js`.
- Configure a standard Babel/Webpack compilation baseline (e.g. using custom configurations).
- Migrate Zustand state management stores to Vanilla JavaScript, removing TypeScript type interfaces.

### 1.2. Core Backend Refactoring
- **Voter Registration Fix**: Modify `VoterRegisterSerializer` to set `is_verified = False` on registration. Remove auto-generation of Voter ID Cards at this step.
- **Login Verification Fix**: Remove the OTP and Card Verification bypass logic from `LoginView`. Force the sequential progression: Credentials → OTP Verification → Card Number Check → Token Issuance.

---

## Phase 2: PostgreSQL Migration & Supabase Setup
**Goal**: Establish a production-grade Supabase PostgreSQL instance and configure enterprise storage assets.

### 2.1. Supabase Initialization
- Provision a Supabase project and database instance.
- Configure `.env` with the Transaction Connection Pooler string (`aws-0-ap-southeast-1.pooler.supabase.com:6543`).
- Set up connection pooling parameters on Django `DATABASES` settings.

### 2.2. Schema Deployment & Migration
- Delete previous SQLite migrations files to prevent database type collision.
- Run `python manage.py makemigrations` and `python manage.py migrate` to apply the tables to Supabase.
- Run `python seed.py` to test connection latency and verify administrative and constituency seeding.

### 2.3. Database Security Policy Configuration
- Enable **Row-Level Security (RLS)** on sensitive tables: `voter_profiles`, `webauthn_credentials`, `digilocker_connections`.
- Create a script to configure the pgvector pg extension for `face_embeddings` table:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```

---

## Phase 3: External Authentication Integrations
**Goal**: Connect real-world external authentication providers and implement verification abstractions.

### 3.1. Google OAuth Backend Validation
- Install `google-auth` packages on backend.
- Replace dummy endpoints with token verification logic that validates incoming frontend tokens against Google servers.

### 3.2. DigiLocker OAuth Integration
- Build a separate Django app `digilocker`.
- Register DigiLocker OAuth redirect callback handlers.
- Write encryption routines to encrypt DigiLocker access/refresh tokens in the DB using AES-GCM-256.
- Implement the parsing logic to extract demographics (EPIC Number, DOB, Gender) and match them against the voter's dashboard form parameters.

### 3.3. Aadhaar Provider Abstraction
- Write the generic interface classes for Aadhaar gateway connections.
- Implement standard verification routing based on environment settings.

---

## Phase 4: Biometrics Verification Pipelines
**Goal**: Integrate real-world biometrics checks (Webcam liveness and WebAuthn credentials).

### 4.1. Face Verification Pipeline
- Set up backend image processing with OpenCV/Pillow to check face photo resolution, illumination, and blur.
- Set up liveness checks (incorporating blinking indicators or random pose prompts on the React webcam UI).
- Connect face matching libraries (e.g. ArcFace or FaceNet) to generate 512-dimensional vectors.
- Implement vector insert logic to store embeddings in Supabase's `face_embeddings` table.

### 4.2. WebAuthn Passkeys Integration
- Refactor the `webauthn_auth` app using the `fido2` library.
- Create two core API routes:
  1. `/api/v1/webauthn/register/` (generates challenge parameters for the browser's `navigator.credentials.create()`).
  2. `/api/v1/webauthn/register/verify/` (verifies the returned attestation signature and stores the public key).
- Build equivalent login challenge endpoints to verify credentials using cryptographically signed messages.

---

## Phase 5: Secure Voting Terminal, Auditing, & Dashboard
**Goal**: Secure ballot casting, implement anonymous writes, and construct administrative audit analytics.

### 5.1. Secure Ballot Casting view
- Implement the `transaction.atomic()` block in `VoteCastView` with row-level locking.
- Verify unique constraints on `VoteReceipt` to catch duplicate casting.
- Decouple the ballot write operation from the receipt creation.

### 5.2. Audit Ledger Page
- Create the public receipt validation page (`/verify-receipt`) where citizens can query the ledger to check that their receipt hash exists.
- Implement the admin audit panel featuring live streaming of `AuditLog` events.
- Implement reports generation (Excel export via `openpyxl`).
