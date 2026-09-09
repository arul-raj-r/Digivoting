import csv
import io
import re
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from authentication.models import User
from elections.models import EligibleVoter

MAX_CSV_FILE_SIZE = 5 * 1024 * 1024  # 5 MB ceiling
MAX_CSV_ROWS = 25000                 # 25,000 rows ceiling

def parse_and_validate_voters_csv(file_obj, election, dry_run=False):
    """
    Validates and optionally bulk registers eligible voters from a CSV file.
    Supports columns: email (required), name, student_id, mobile_number.
    - If dry_run=True: Performs validation, identifies valid/invalid/duplicate records,
      and returns preview rows without committing to database.
    - If dry_run=False: Bulk inserts only the valid non-duplicate records into the database.
    """
    # 1. Check file size ceiling
    if file_obj.size > MAX_CSV_FILE_SIZE:
        raise ValueError(f"CSV file exceeds the maximum allowed size of {MAX_CSV_FILE_SIZE // (1024 * 1024)}MB.")

    # 2. Decode file content safely supporting UTF-8 and UTF-8-BOM
    try:
        content = file_obj.read().decode('utf-8-sig')
    except UnicodeDecodeError:
        raise ValueError("Invalid file encoding. Please upload a valid UTF-8 encoded CSV file.")

    # 3. Read rows
    csv_file = io.StringIO(content)
    reader = csv.reader(csv_file)
    
    rows = list(reader)
    if not rows:
        raise ValueError("The uploaded CSV file is empty.")

    # Check header
    raw_header = [h.strip().lower() for h in rows[0]]
    
    # Resolve column indexes flexibly
    email_idx = None
    name_idx = None
    student_id_idx = None
    mobile_idx = None

    for idx, h in enumerate(raw_header):
        normalized = h.replace(' ', '_').replace('-', '_')
        if normalized in ['email', 'e_mail', 'mail', 'email_address']:
            email_idx = idx
        elif normalized in ['name', 'full_name', 'fullname', 'voter_name']:
            name_idx = idx
        elif normalized in ['student_id', 'studentid', 'roll_no', 'roll_number', 'rollno', 'voter_id', 'id_number', 'id']:
            student_id_idx = idx
        elif normalized in ['mobile_number', 'mobile', 'phone', 'phone_number', 'contact', 'contact_number']:
            mobile_idx = idx

    if email_idx is None:
        raise ValueError("CSV header must contain an 'email' column (e.g., name,email,mobile_number,student_id).")

    data_rows = rows[1:]

    # 4. Check row count ceiling
    if len(data_rows) > MAX_CSV_ROWS:
        raise ValueError(f"CSV file exceeds the maximum ceiling of {MAX_CSV_ROWS} rows per batch.")

    if not data_rows:
        raise ValueError("CSV file has header but no voter rows.")

    # 5. Fetch existing voter emails and student IDs for this election to detect existing duplicates
    existing_records = EligibleVoter.objects.filter(election=election).values('email', 'student_id')
    existing_emails = {r['email'].lower() for r in existing_records if r['email']}
    existing_student_ids = {r['student_id'].lower() for r in existing_records if r['student_id']}

    # 6. Pre-fetch existing Users matching these emails to link
    all_row_emails = [r[email_idx].strip().lower() for r in data_rows if len(r) > email_idx and r[email_idx].strip()]
    user_map = {
        u.email.lower(): u
        for u in User.objects.filter(email__in=all_row_emails)
    }

    seen_emails_in_batch = set()
    seen_ids_in_batch = set()

    voters_to_create = []
    valid_records = []
    duplicate_records = []
    invalid_records = []

    for row_idx, row in enumerate(data_rows, start=2):
        if not row or not any(field.strip() for field in row):
            continue  # Ignore empty blank lines

        # Extract values
        raw_email = row[email_idx].strip() if len(row) > email_idx else ""
        raw_name = row[name_idx].strip() if name_idx is not None and len(row) > name_idx else ""
        raw_student_id = row[student_id_idx].strip() if student_id_idx is not None and len(row) > student_id_idx else ""
        raw_mobile = row[mobile_idx].strip() if mobile_idx is not None and len(row) > mobile_idx else ""

        cleaned_email = raw_email.lower()
        cleaned_student_id = raw_student_id.lower()

        # Check missing email
        if not cleaned_email:
            invalid_records.append({
                "row": row_idx,
                "name": raw_name,
                "email": "",
                "student_id": raw_student_id,
                "mobile": raw_mobile,
                "reason": "Email field is empty",
                "status": "INVALID"
            })
            continue

        # Validate email format
        try:
            validate_email(cleaned_email)
        except ValidationError:
            invalid_records.append({
                "row": row_idx,
                "name": raw_name,
                "email": raw_email,
                "student_id": raw_student_id,
                "mobile": raw_mobile,
                "reason": "Invalid email address format",
                "status": "INVALID"
            })
            continue

        # Check duplicate email in batch
        if cleaned_email in seen_emails_in_batch:
            duplicate_records.append({
                "row": row_idx,
                "name": raw_name,
                "email": cleaned_email,
                "student_id": raw_student_id,
                "mobile": raw_mobile,
                "reason": f"Duplicate email '{cleaned_email}' in uploaded file",
                "status": "DUPLICATE"
            })
            continue

        # Check duplicate student_id in batch if provided
        if cleaned_student_id and cleaned_student_id in seen_ids_in_batch:
            duplicate_records.append({
                "row": row_idx,
                "name": raw_name,
                "email": cleaned_email,
                "student_id": raw_student_id,
                "mobile": raw_mobile,
                "reason": f"Duplicate Student ID '{raw_student_id}' in uploaded file",
                "status": "DUPLICATE"
            })
            continue

        # Check duplicate email in existing DB
        if cleaned_email in existing_emails:
            duplicate_records.append({
                "row": row_idx,
                "name": raw_name,
                "email": cleaned_email,
                "student_id": raw_student_id,
                "mobile": raw_mobile,
                "reason": "Email already registered in this election's voter roll",
                "status": "DUPLICATE"
            })
            continue

        # Check duplicate student_id in existing DB if provided
        if cleaned_student_id and cleaned_student_id in existing_student_ids:
            duplicate_records.append({
                "row": row_idx,
                "name": raw_name,
                "email": cleaned_email,
                "student_id": raw_student_id,
                "mobile": raw_mobile,
                "reason": f"Student ID '{raw_student_id}' already registered in this election",
                "status": "DUPLICATE"
            })
            continue

        seen_emails_in_batch.add(cleaned_email)
        if cleaned_student_id:
            seen_ids_in_batch.add(cleaned_student_id)

        matched_user = user_map.get(cleaned_email)
        
        valid_rec = {
            "row": row_idx,
            "name": raw_name or cleaned_email.split('@')[0].capitalize(),
            "email": cleaned_email,
            "student_id": raw_student_id,
            "mobile": raw_mobile,
            "linked_user": bool(matched_user),
            "status": "VALID"
        }
        valid_records.append(valid_rec)

        if not dry_run:
            voter_obj = EligibleVoter(
                election=election,
                email=cleaned_email,
                name=raw_name or None,
                student_id=raw_student_id or None,
                mobile_number=raw_mobile or None,
                user=matched_user,
                has_voted=False
            )
            voters_to_create.append(voter_obj)

    # 7. Bulk insert valid rows if not dry-run
    if not dry_run and voters_to_create:
        EligibleVoter.objects.bulk_create(voters_to_create)

    return {
        "total_rows_processed": len(data_rows),
        "valid_count": len(valid_records),
        "duplicate_count": len(duplicate_records),
        "invalid_count": len(invalid_records),
        "success_count": len(valid_records),
        "skipped_count": len(duplicate_records),
        "failed_count": len(invalid_records),
        "valid_records": valid_records,
        "duplicate_records": duplicate_records,
        "invalid_records": invalid_records,
        "is_dry_run": dry_run,
        "imported_count": len(voters_to_create) if not dry_run else 0,
        "created": [{"email": v["email"], "linked_user": v["linked_user"]} for v in valid_records],
        "skipped": [{"email": d["email"], "reason": d["reason"]} for d in duplicate_records],
        "errors": [{"email": i["email"], "reason": i["reason"]} for i in invalid_records]
    }
