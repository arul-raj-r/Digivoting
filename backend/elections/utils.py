import csv
import io
import re
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from authentication.models import User
from elections.models import EligibleVoter

MAX_CSV_FILE_SIZE = 5 * 1024 * 1024  # 5 MB ceiling
MAX_CSV_ROWS = 25000                 # 25,000 rows ceiling

def sanitize_identity_field(val: str, field_type: str = 'text') -> str:
    """
    Sanitizes voter identity input for database storage without altering
    canonical identity values (e.g. preserves '+' on international phone numbers,
    '-' on student/employee IDs). Strips unprintable control characters and formula triggers (=, @).
    """
    if not val:
        return ""
    val_str = str(val).strip()
    # Disarm dangerous formula execution triggers without stripping valid identity prefixes
    if val_str.startswith(('=', '@')):
        val_str = re.sub(r'^[=@]+', '', val_str).strip()
    # Disarm control characters
    val_str = val_str.replace('\t', ' ').replace('\r', '').replace('\n', ' ').strip()
    return val_str

def sanitize_csv_cell(val: str) -> str:
    """Backward compatible alias for identity field sanitization."""
    return sanitize_identity_field(val)

def disarm_formula_for_export(val: str) -> str:
    """
    Prepends a single quote when exporting to a spreadsheet file if the cell
    starts with formula triggers (=, +, -, @) so that spreadsheet software
    displays it as literal text rather than executing it.
    """
    if not val:
        return ""
    val_str = str(val)
    if val_str and val_str[0] in ('=', '+', '-', '@'):
        return f"'{val_str}"
    return val_str

def parse_and_validate_voters_csv(file_obj, election, dry_run=False):
    """
    Validates and optionally bulk registers eligible voters from a CSV file.
    Requires the creator-facing voter-roll schema:
    ``student_id, full_name, email, mobile``.  The stored model uses ``name``
    and ``mobile_number`` internally, but imports intentionally use the clear
    public template fields.
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
    
    normalized_header = [h.replace(' ', '_').replace('-', '_') for h in raw_header]
    required_columns = ('student_id', 'full_name', 'email', 'mobile')
    missing_columns = [column for column in required_columns if column not in normalized_header]
    if missing_columns:
        raise ValueError(
            "CSV header must contain exactly the required fields: "
            "student_id, full_name, email, mobile. Missing: " + ', '.join(missing_columns) + '.'
        )

    student_id_idx = normalized_header.index('student_id')
    name_idx = normalized_header.index('full_name')
    email_idx = normalized_header.index('email')
    mobile_idx = normalized_header.index('mobile')

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
    all_row_emails = [sanitize_csv_cell(r[email_idx]).lower() for r in data_rows if len(r) > email_idx and r[email_idx].strip()]
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

        # Extract and sanitize values against spreadsheet formula injection
        raw_email = sanitize_csv_cell(row[email_idx]) if len(row) > email_idx else ""
        raw_name = sanitize_csv_cell(row[name_idx]) if name_idx is not None and len(row) > name_idx else ""
        raw_student_id = sanitize_csv_cell(row[student_id_idx]) if student_id_idx is not None and len(row) > student_id_idx else ""
        raw_mobile = sanitize_csv_cell(row[mobile_idx]) if mobile_idx is not None and len(row) > mobile_idx else ""

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

        if not raw_name or not raw_student_id or not raw_mobile:
            missing_fields = [
                label for label, value in (
                    ('student_id', raw_student_id), ('full_name', raw_name), ('mobile', raw_mobile)
                ) if not value
            ]
            invalid_records.append({
                "row": row_idx,
                "name": raw_name,
                "email": raw_email,
                "student_id": raw_student_id,
                "mobile": raw_mobile,
                "reason": "Required field(s) missing: " + ', '.join(missing_fields),
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
