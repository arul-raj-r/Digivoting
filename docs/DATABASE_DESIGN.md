# DigiVote Database Design Specification

This document details the database schema layout for the **DigiVote** platform. To support secure, high-concurrency real-world voting while maintaining complete anonymity, the schema strictly isolates core user accounts from eligible voter rolls, and completely decouples citizen records from encrypted ballot submissions.

---

## 1. Entity Relationship Overview

The database design enforces strict structural isolation:
- **Citizen Account & Session Management**: Tracks registered users, MFA OTP tokens, device sessions, and security audit logs.
- **Election Management & Voter Rolls**: Manages elections, eligible voter rosters, candidate nominations, verification flags, and audit logs.
- **Cryptographic Ballot Box**: Anonymous envelope-encrypted ballots using AES-256-GCM. Ballots store NO foreign keys, user references, or timestamps traceable to specific voters.

---

## 2. Core Tables Specification

### 2.1. Authentication & Security (Modules 1 - 7)

#### `authentication_user`
* `id` (UUID, Primary Key)
* `username` (VARCHAR(150), Unique)
* `email` (VARCHAR(255), Unique)
* `role` (VARCHAR(20)) - Choices: `VOTER`, `ELECTION_CREATOR`, `ADMIN`
* `email_verified` (BOOLEAN, Default: `False`)
* `account_status` (VARCHAR(20), Default: `'ACTIVE'`)
* `failed_login_count` (INTEGER, Default: 0)
* `locked_until` (TIMESTAMP WITH TIME ZONE, Nullable)

#### `authentication_usersession`
* `id` (UUID, Primary Key)
* `user_id` (UUID, Foreign Key -> `authentication_user`)
* `refresh_token_jti` (VARCHAR(255), Unique)
* `ip_address` (GenericIPAddress)
* `user_agent` (TEXT)
* `device_info` (JSONField)
* `created_at` (TIMESTAMP WITH TIME ZONE)
* `expires_at` (TIMESTAMP WITH TIME ZONE)
* `revoked` (BOOLEAN, Default: `False`)

#### `authentication_loginattempt`
* `id` (UUID, Primary Key)
* `user_id` (UUID, Foreign Key -> `authentication_user`, Nullable)
* `email_attempted` (VARCHAR(255))
* `successful` (BOOLEAN)
* `mfa_completed` (BOOLEAN)
* `ip_address` (GenericIPAddress)
* `timestamp` (TIMESTAMP WITH TIME ZONE)

---

### 2.2. Election Management (Modules 8 - 11)

#### `elections_election`
* `id` (UUID, Primary Key)
* `title` (VARCHAR(255))
* `description` (TEXT)
* `election_type` (VARCHAR(20)) - `general`, `referendum`, `municipal`, `organizational`
* `status` (VARCHAR(20)) - `draft`, `configured`, `scheduled`, `active`, `completed`, `cancelled`
* `start_datetime` (TIMESTAMP WITH TIME ZONE, Nullable)
* `end_datetime` (TIMESTAMP WITH TIME ZONE, Nullable)
* `created_by_id` (UUID, Foreign Key -> `authentication_user`)

#### `elections_eligiblevoter`
* `id` (UUID, Primary Key)
* `election_id` (UUID, Foreign Key -> `elections_election`)
* `user_id` (UUID, Foreign Key -> `authentication_user`, Nullable)
* `email` (VARCHAR(255))
* `has_voted` (BOOLEAN, Default: `False`)
* `added_at` (TIMESTAMP WITH TIME ZONE)

#### `elections_candidate`
* `id` (UUID, Primary Key)
* `election_id` (UUID, Foreign Key -> `elections_election`)
* `full_name` (VARCHAR(255))
* `party_or_affiliation` (VARCHAR(255), Nullable)
* `bio` (TEXT, Nullable)
* `photo` (ImageField, Nullable)
* `display_order` (INTEGER, Default: 0)

#### `elections_electionverificationconfig`
* `id` (UUID, Primary Key)
* `election_id` (UUID, OneToOne -> `elections_election`)
* `require_email_otp` (BOOLEAN, Default: `True`)
* `require_webcam_verification` (BOOLEAN, Default: `False`)
* `require_biometric_verification` (BOOLEAN, Default: `False`)

#### `elections_electionrules`
* `id` (UUID, Primary Key)
* `election_id` (UUID, OneToOne -> `elections_election`)
* `results_visibility` (VARCHAR(20)) - `immediate`, `scheduled`, `manual`
* `results_visible_at` (TIMESTAMP WITH TIME ZONE, Nullable)
* `allow_vote_change` (BOOLEAN, Default: `False`)

---

### 2.3. Cryptographic Voting (Module 12)

#### `voting_ballot`
* `id` (UUID, Primary Key)
* `election_id` (UUID, Foreign Key -> `elections_election`)
* `encrypted_choice` (JSONField) - AES-256-GCM ciphertext, iv, auth_tag
* `submitted_at` (TIMESTAMP WITH TIME ZONE)
*(Strictly contains NO voter-linked fields to guarantee secrecy)*

#### `voting_ballotconfirmationtoken`
* `id` (UUID, Primary Key)
* `election_id` (UUID, Foreign Key -> `elections_election`)
* `token_hash` (VARCHAR(64), Unique)
* `voter_email` (VARCHAR(255))
* `candidate_id` (UUID, Foreign Key -> `elections_candidate`)
* `expires_at` (TIMESTAMP WITH TIME ZONE)
* `used` (BOOLEAN, Default: `False`)

#### `voting_electionencryptionkey`
* `id` (UUID, Primary Key)
* `election_id` (UUID, OneToOne -> `elections_election`)
* `encrypted_private_key` (TEXT)
* `public_key` (TEXT)
* `key_status` (VARCHAR(20)) - `active`, `rotated`, `archived`
