# Testing & Verification Guide

This document describes how to execute automated unit test suites and verify the voting system flows manually step-by-step.

---

## 1. Running Automated Backend Tests

The backend test suite validates voter eligibility rules, unapproved candidate filters, constituency mismatch barriers, and double voting prevention.

To run the automated tests:
1. Ensure the Python virtual environment is activated:
   ```bash
   cd backend
   .\venv\Scripts\Activate.ps1
   ```
2. Execute the tests:
   ```bash
   python manage.py test
   ```

*You should see output similar to:*
```text
Creating test database for alias 'default'...
Ran 6 tests in 29.35s
OK
Destroying test database...
```

---

## 2. Database Transaction Notice

> [!IMPORTANT]
> **PostgreSQL (Supabase) is Required**
> SQLite is NOT supported in this project and must not be used at any stage of development or testing.
>
> 1. To ensure concurrent voting constraints work correctly, we rely on PostgreSQL's row-level locking and transaction isolation behavior under Django's `transaction.atomic()`.
> 2. All tests, including the concurrent double-vote test, MUST be run against PostgreSQL (via the Supabase Connection Pooler, port 6543).
> 3. Verify that your `.env` contains a valid `DATABASE_URL` pointing to the Supabase connection pooler endpoint before executing tests.


---

## 3. Step-by-Step Manual Verification Script

Follow these steps to demonstrate the full system flow during evaluations:

### Step A: Setup & Start
1. Start the system via Docker: `docker-compose up --build` (or start backend and frontend manually).
2. Seed mock data: `python seed.py` (executed automatically on Docker compose start).

### Step B: The Voter Journey (Attempting to Vote Unverified)
1. Open `http://localhost:5173`.
2. Click **Sign In**. Log in using `voter2` / `password123`.
3. Check the command prompt terminal. Locate the printed log:
   `[DEMO OTP] Verification code for 'voter2': XXXXXX`
4. Enter the 6-digit code.
5. In the Voter Dashboard, note the banner: **Pending Admin Verification**.
6. Attempt to find active elections. Note that since you are unverified, you are blocked from casting a vote.

### Step C: The Admin Approval Journey
1. Open a new private browser window or log out.
2. Sign in as `admin` / `password123`. Enter the OTP code from the console.
3. In the **Admin Panel** tab, look at the **Voter Approvals Queue**.
4. Locate `voter2` (Priya Dharshini). Cross-check her captured biometric face signature canvas frame.
5. Click **Approve & Verify**.
6. Switch to the **Elections** tab and change the status of `General Lok Sabha Election 2026` from `ACTIVE` to `DRAFT` and back to `ACTIVE` to verify CRUD state controls.
7. Switch to the **Audit Trails** tab and verify the logged actions (`VOTER_REGISTRATION`, `LOGIN_SUCCESS`, `VOTER_VERIFIED`).

### Step D: Casting a Ballot (Secrecy & Seeding Verification)
1. Log back in as `voter2` / `password123`. Note that your status is now **Verified & Eligible to Vote**.
2. Click **Access Voting Terminal** under the `General Lok Sabha Election 2026`.
3. You will see candidates running in your constituency (Madurai North): Veerapandian K. and Dr. Shanthi Priya. Note that candidates from Chennai Central or Coimbatore South are filtered out.
4. Click **Cast Vote** on a candidate. A confirmation modal will appear.
5. Click **Yes, Confirm Vote**.
6. The terminal transitions to the success page.
7. **Verify Secrecy**: Click **Copy Receipt**. Verify that the receipt hash contains no information about which candidate you selected.
8. Click **Return to Dashboard**. Verify that you cannot vote in that election again, and you can access your receipt hash.
9. Log in as `admin` and open the **Audit Trails** tab. Verify that the `VOTE_CAST` event was logged with the receipt hash, but the candidate selection remains anonymous.
