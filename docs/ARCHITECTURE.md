# Vote Privacy & Double-Voting Architecture

This document explains the security architecture designed to enforce the "one-person-one-vote" constraint while mathematically preserving vote secrecy (secrecy of the ballot).

---

## 1. Decoupled Voting Design

In traditional database systems, storing votes with a foreign key pointing to the voter table destroys secrecy. To solve this, this platform implements a completely **decoupled schema**:

```
[Voter castings ballot]
           │
           ▼
┌────────────────────────────────────────┐
│     Django API (transaction.atomic)    │
│  - Check eligibility criteria         │
└──────────────────┬─────────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌─────────────────┐ ┌─────────────────┐
│  VoteReceipt    │ │      Vote       │
│  (Audit Log)    │ │ (Ballot Box)    │
├─────────────────┤ ├─────────────────┤
│ - voter_id      │ │ - election_id   │
│ - election_id   │ │ - candidate_id  │
│ - receipt_hash  │ │ - constituency  │
└─────────────────┘ └─────────────────┘
 (Unique index on    (No link back to 
  voter + election)   the Voter profile)
```

### Table 1: `VoteReceipt` (The Audit Log)
- **Role**: Records **that** a specific voter has cast a ballot in a specific election.
- **Foreign Keys**: `voter_id`, `election_id`.
- **Constraint**: Unique index on `(voter_id, election_id)`.
- **Privacy**: Does not store candidate selection, party, or ballot metadata.

### Table 2: `Vote` (The Digital Ballot Box)
- **Role**: Records the actual choice.
- **Foreign Keys**: `election_id`, `candidate_id`, `constituency_id`.
- **Privacy**: Contains no voter ID, user association, or timestamp/session metadata.

---

## 2. Double-Voting Prevention & Transaction Safety

To prevent double voting (even under highly concurrent requests), the API verification checks and DB writes are executed inside a Django `transaction.atomic()` block:

```python
with transaction.atomic():
    # 1. Lock the check on VoteReceipt existence
    if VoteReceipt.objects.filter(voter=voter, election=election).exists():
        raise ValidationError("Double voting detected.")
        
    # 2. Insert Voter Audit Receipt
    VoteReceipt.objects.create(
        election=election,
        voter=voter,
        receipt_number=receipt_hash
    )
    
    # 3. Insert Independent Ballot Choice
    Vote.objects.create(
        election=election,
        constituency=voter.constituency,
        candidate=candidate
    )
```

### Concurrency Handling
- Under concurrent conditions (e.g. if the same voter submits two parallel voting requests at the exact same millisecond), both threads will read that no receipt exists.
- However, when the database attempts to write, the PostgreSQL database unique constraint on `VoteReceipt (voter_id, election_id)` forces a collision.
- The database raises an `IntegrityError` on the second insert, which triggers an immediate roll-back of the second transaction. No duplicate ballot is cast, and the system integrity is preserved.

---

## 3. Voter Eligibility Gates

Prior to casting a ballot, the backend API enforces five eligibility gates:
1. **Verified Account Check**: `voter.is_verified == True`. Pending applications cannot vote.
2. **Election Status Check**: `election.status == Election.ACTIVE`.
3. **Timeline Bounds Check**: `start_date <= current_time <= end_date`.
4. **Candidate Approval Check**: `candidate.is_approved == True`.
5. **Constituency Scope Gate**: `voter.constituency == candidate.constituency`. A voter registered in Chennai Central cannot cast a vote for a candidate running in Coimbatore South.

---

## 4. Voter ID Card Auto-Generation & Verification Login Flow

### 4.1 Auto-Generation Workflow
```
[Admin Verifies Voter] 
       │
       ▼ (transaction.atomic)
[Generate Unique 10-char Card Number (e.g. ABC1234567)]
       │
       ▼
[Create VoterIDCard record linked to Voter Profile]
       │
       ▼
[Populate QR Code details (card_number + voter_id) & Demographics]
```

### 4.2 Multi-Factor Login Verification Pipeline
The verification process occurs sequentially, requiring both knowledge (password, card number) and possession (OTP):
1. **Factor 1 (Credentials)**: Voter submits username/email and password.
2. **Factor 2 (OTP)**: Voter enters the 6-digit OTP code printed/sent.
3. **Factor 3 (Card Possession Check)**:
   - System presents a blurred thumbnail preview of the registered face photo to provide visual feedback.
   - Voter must enter their unique **Voter ID Card Number**.
   - Backend compares inputs case-insensitively with `VoterIDCard.card_number`.
   - On success, final simple JWT session tokens are generated.
   - On mismatch, failed-attempt count increments. The session invalidates after 3 failures. Throttling limits prevent brute-force attacks.
