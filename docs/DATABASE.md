# Database Schema Documentation

This prototype uses Supabase PostgreSQL configured with Django ORM migrations. SQLite is not supported. All primary keys are UUIDs to prevent enumeration attacks and ensure unique identifiers.

---

## 1. Table Definitions

### Table: `users`
Custom extensions of Django's default authentication table.
- `id` (UUID, Primary Key)
- `username` (VARCHAR, Unique)
- `email` (VARCHAR)
- `role` (VARCHAR: `ADMIN` or `VOTER`)
- `phone_number` (VARCHAR, Nullable)
- `password` (VARCHAR, Hashed)

### Table: `voters_constituency`
- `id` (UUID, Primary Key)
- `name` (VARCHAR, Unique)
- `description` (TEXT)
- `created_at`, `updated_at` (TIMESTAMP)

### Table: `voters_voter`
Profile info linked to the core auth user.
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> `users.id`, Unique)
- `voter_id_number` (VARCHAR, Unique)
- `constituency_id` (UUID, Foreign Key -> `voters_constituency.id`)
- `is_verified` (BOOLEAN)
- `verification_date` (TIMESTAMP, Nullable)
- `verified_by_id` (UUID, Foreign Key -> `users.id`, Nullable)
- `face_photo_url` (TEXT, Nullable) - stores raw base64 webcam frame strings in this prototype.
- `created_at`, `updated_at` (TIMESTAMP)

### Table: `elections_election`
- `id` (UUID, Primary Key)
- `title` (VARCHAR)
- `description` (TEXT)
- `start_date`, `end_date` (TIMESTAMP)
- `status` (VARCHAR: `DRAFT`, `SCHEDULED`, `ACTIVE`, `COMPLETED`)
- `created_at`, `updated_at` (TIMESTAMP)

### Table: `elections_candidate`
- `id` (UUID, Primary Key)
- `election_id` (UUID, Foreign Key -> `elections_election.id`)
- `constituency_id` (UUID, Foreign Key -> `voters_constituency.id`)
- `name` (VARCHAR)
- `party_name` (VARCHAR)
- `party_logo_url` (TEXT, Nullable)
- `photo_url` (TEXT, Nullable)
- `bio` (TEXT, Nullable)
- `is_approved` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMP)

### Table: `elections_votereceipt`
Audit log of which voter cast a ballot in which election.
- `id` (UUID, Primary Key)
- `election_id` (UUID, Foreign Key -> `elections_election.id`)
- `voter_id` (UUID, Foreign Key -> `voters_voter.id`)
- `receipt_number` (VARCHAR, Unique)
- `timestamp` (TIMESTAMP)
- **Index**: Unique Together (`voter_id`, `election_id`)

### Table: `elections_vote`
The anonymous ballot record. Completely detached from voter attributes.
- `id` (UUID, Primary Key)
- `election_id` (UUID, Foreign Key -> `elections_election.id`)
- `constituency_id` (UUID, Foreign Key -> `voters_constituency.id`)
- `candidate_id` (UUID, Foreign Key -> `elections_candidate.id`)
- `created_at` (TIMESTAMP)

### Table: `authentication_otpverification`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> `users.id`)
- `otp_code_hash` (VARCHAR)
- `attempts` (INTEGER) - tracks failed verifications (max 3)
- `expires_at` (TIMESTAMP)
- `is_verified` (BOOLEAN)
- `created_at` (TIMESTAMP)

### Table: `authentication_auditlog`
Append-only log tracking security credentials transactions.
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> `users.id`, Nullable)
- `action` (VARCHAR) - e.g. `LOGIN_SUCCESS`, `VOTE_CAST`, `VOTER_VERIFIED`
- `ip_address` (VARCHAR, Nullable)
- `user_agent` (TEXT, Nullable)
- `details` (JSONB)
- `created_at` (TIMESTAMP)

---

## 2. Key Constraints & Indexes

1. **Unique Voter Election (One Vote Limit)**:
   - `elections_votereceipt` has a database unique constraint mapping `(voter_id, election_id)`.
2. **Anonymous Decoupling**:
   - `elections_vote` table **must never** hold references (foreign keys or logical references) pointing to `voters_voter` or `users`.
3. **Primary Key UUIDs**:
   - All primary keys generate a secure random standard UUIDv4.

---

## 3. Supabase Project Setup & Connection

To prepare and connect the application to your Supabase PostgreSQL instance:

### Step A: Create a Supabase Project
1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project** and select your organization.
3. Configure your project name, database password, and region, then click **Create new project**.

### Step B: Retrieve the Connection Pooler String
1. Once the project is provisioned, navigate to **Project Settings** (gear icon) -> **Database**.
2. Scroll to the **Connection String** section.
3. Select the **URI** tab.
4. Select Mode: **Transaction** (which uses PgBouncer on port `6543`).
5. Copy the connection URI. It will look like this:
   `postgresql://postgres.[YOUR_PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require`

### Step C: Configure Environment Variables
1. Copy the `backend/.env.example` file to `backend/.env`.
2. Update the `DATABASE_URL` environment variable with the Transaction Connection Pooler URI you copied (make sure to replace `[PASSWORD]` with your actual database password).

### Step D: Run Database Migrations & Seeding
From the `backend` folder, ensure your Python virtual environment is activated and dependencies are installed, then run:
```bash
python manage.py migrate
python seed.py
```
