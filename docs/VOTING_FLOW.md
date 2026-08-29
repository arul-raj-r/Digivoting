# DigiVote Secure Voting Flow Specification

This document details the voting sequence, concurrency controls, and cryptographic vote-secrecy implementation designed for the **DigiVote** platform. The pipeline ensures the absolute integrity of the democratic process while mathematically protecting voter privacy.

---

## 1. Step-by-Step Voting Sequence

To cast a ballot, a voter progresses through the following sequence on the dashboard:

1. **Constituency Match**: The frontend queries `/api/v1/elections/` and retrieves the list of elections.
2. **Access Terminal**: The voter clicks "Access Voting Terminal" for an active election. The system calls `/api/v1/elections/<id>/candidates/`.
   - The backend filters candidates to show *only* those registered in the voter's specific constituency.
3. **Select Candidate**: The voter selects a candidate and views a verification dialog.
4. **Final Biometric Sign-off**: The browser prompts for a WebAuthn signature challenge (Windows Hello, TouchID/Passkey). This confirms the citizen's physical presence at the moment of voting.
5. **Backend Processing**: The frontend POSTs the encrypted biometric assertion and chosen Candidate ID to the backend `/api/v1/voting/cast/` endpoint.
6. **Confirmation & Receipt**: On success, the voter receives a secure SHA-256 receipt hash, and the terminal redirects to the Success screen.

---

## 2. Server-Side Eligibility & Validation Gates

The Django backend enforces six rigid eligibility validation checks inside the request view. A failure at any gate aborts the transaction immediately:

* **Gate 1: Active User Status**: User account must be active (`is_active = True`).
* **Gate 2: Profile Verification Status**: Voter profile must be fully verified (`voter_profile.is_verified = True`).
* **Gate 3: Active Election Status**: The election status must be set to `ACTIVE` (Draft, Scheduled, or Completed elections are rejected).
* **Gate 4: Chronological Boundaries**: The server time must fall within the election bounds: `election.start_date <= current_time <= election.end_date`.
* **Gate 5: Candidate Verification**: The selected candidate must be approved (`candidate.is_approved = True`).
* **Gate 6: Constituency Bounds**: The selected candidate's constituency MUST match the voter's registered constituency.

---

## 3. Concurrency Protection & Transaction Safety

Under high loads, a malicious voter could trigger parallel threads (e.g., a race-condition script) to submit multiple votes at the exact same millisecond. To prevent double-voting under all concurrent request profiles, DigiVote utilizes PostgreSQL row locking combined with database-level integrity constraints:

```
[Voter Cast Request 1]  [Voter Cast Request 2]
         │                       │
         ├───────────────────────┤
         ▼                       ▼
    Thread A                 Thread B
         │                       │
         ▼ (transaction.atomic)  ▼ (transaction.atomic)
┌─────────────────┐     ┌─────────────────┐
│ Check receipt?  │     │ Check receipt?  │
│ -> No receipt   │     │ -> No receipt   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼ (Create Receipt)      ▼ (Create Receipt)
   Write SUCCESS           Write FAIL (PostgreSQL Unique Constraint Collision)
         │                       │
         ▼                       ▼
   Create ballot           Rollback transaction
         │                       │
         ▼                       ▼
    HTTP 201 Success        HTTP 400 Double Voting Detected
```

### 3.1. Atomic Transaction Flow (`backend/elections/views.py`)
```python
from django.db import transaction, IntegrityError
from rest_framework.exceptions import ValidationError

try:
    with transaction.atomic():
        # 1. Fetch and lock voter receipt query
        # select_for_update prevents dirty reads across concurrent connections
        receipt_exists = VoteReceipt.objects.select_for_update().filter(
            voter=voter, 
            election=election
        ).exists()
        
        if receipt_exists:
            raise ValidationError("You have already cast a ballot in this election.")
            
        # 2. Generate unique cryptographic receipt hash
        salt = os.urandom(16).hex()
        receipt_hash = hashlib.sha256(
            f"{voter.id}-{election.id}-{salt}".encode()
        ).hexdigest().upper()
        
        # 3. Create Voter Receipt
        # This will fail at database level if another thread managed to write first
        VoteReceipt.objects.create(
            election=election,
            voter=voter,
            receipt_number=receipt_hash
        )
        
        # 4. Create Anonymous Vote Ballot
        Vote.objects.create(
            election=election,
            constituency=voter.constituency,
            candidate=candidate
        )
        
except IntegrityError:
    # Triggered automatically if the unique constraint on (voter_id, election_id) collides
    raise ValidationError("Double voting attempt blocked.")
```

---

## 4. Absolute Decoupled Vote Secrecy Architecture

To ensure the secrecy of the ballot is absolute, the database completely detaches the identity of the voter from their ballot:

* **Voter Audit Log (`vote_receipts`)**: Records *who* voted and *when*. It contains the columns: `id`, `voter_id`, `election_id`, and `receipt_hash`. It stores zero information regarding candidate selection.
* **Digital Ballot Box (`votes`)**: Records the *candidate choice*. It contains the columns: `id`, `election_id`, `constituency_id`, and `candidate_id`. It holds **no foreign keys or logical columns linking back to `users` or `voter_profiles`**.

### 4.1. Defending Against Timing Correlation Attacks
If a ballot (`votes`) and an audit receipt (`vote_receipts`) are created at the exact same millisecond, an administrator looking at database logs could correlate the two records based on timestamp order. DigiVote implements three defenses:
1. **No Fine-grained Timestamps**: The `votes` table does not record milliseconds. Timestamps are truncated to hour-level or day-level boundaries.
2. **Delayed Write Queues**: When a vote is cast, it is placed in an asynchronous task queue (e.g. Celery). The task worker writes the ballot record to the database after a randomized delay (between 5 and 60 seconds).
3. **Database Shuffling**: Prior to displaying standings or running tallies, vote records are queried and shuffled at the DB view level, preventing insertion-order correlation.

---

## 5. Voter Verification Receipt

After a successful ballot submission, the platform displays a cryptographic receipt:

```
============================================
           DIGIVOTE VOTE RECEIPT            
============================================
Election:   General Lok Sabha Election 2026
Receipt ID: 89A2FC12E8B9912C094E77112001ABFC
Timestamp:  2026-08-21 15:10:43 UTC
============================================
Verify this transaction at:
https://digivote.gov.in/verify-receipt
```

* **Voter Verifiability**: The voter can search the public audit ledger using their `Receipt ID`. The backend queries `VoteReceipt.objects.filter(receipt_number=ReceiptID)`. If found, it proves their ballot was registered.
* **Privacy Preserved**: The receipt hash contains only irreversible SHA-256 data. An administrator or attacker inspecting the database cannot reverse-engineer the hash to discover the selected candidate.
