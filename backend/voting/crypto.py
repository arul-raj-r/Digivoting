import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from voting.models import ElectionEncryptionKey

# =========================================================================
# ENVELOPE ENCRYPTION ENGINE FOR BALLOTS (AES-256-GCM)
# =========================================================================
# Documented Architecture:
# - A master key (VOTING_MASTER_KEY) encrypts per-election symmetric keys at rest.
# - Each election has a unique 256-bit AES key generated at election creation.
# - Individual ballot choices are encrypted with the per-election key.
# - Master key is read strictly from environment variable VOTING_MASTER_KEY.
# - TODO: In production, retrieve VOTING_MASTER_KEY from a hardware security module
#   or cloud KMS (AWS KMS / HashiCorp Vault) rather than a static environment variable.
# =========================================================================

def get_master_key() -> bytes:
    """
    Retrieves the 32-byte master key from the environment.
    Strictly forbids fallback to Django SECRET_KEY.
    """
    raw_key = os.environ.get('VOTING_MASTER_KEY', '').strip()
    if not raw_key:
        raise RuntimeError(
            "VOTING_MASTER_KEY environment variable is missing or empty. "
            "Envelope encryption cannot proceed without an isolated master key."
        )

    try:
        # 1. Direct 64-char hex string
        if len(raw_key) == 64 and all(c in '0123456789abcdefABCDEF' for c in raw_key):
            key_bytes = bytes.fromhex(raw_key)
        else:
            decoded = base64.urlsafe_b64decode(raw_key.encode('ascii'))
            if len(decoded) == 32:
                key_bytes = decoded
            elif len(decoded) == 64 and all(chr(c) in '0123456789abcdefABCDEF' for c in decoded):
                key_bytes = bytes.fromhex(decoded.decode('ascii'))
            else:
                key_bytes = decoded
    except Exception as e:
        raise RuntimeError(f"VOTING_MASTER_KEY could not be decoded: {str(e)}")

    if len(key_bytes) != 32:
        raise RuntimeError(
            f"VOTING_MASTER_KEY must be exactly 32 bytes (256 bits). Found {len(key_bytes)} bytes."
        )

    return key_bytes


def generate_election_key(election):
    """
    Generates a new 256-bit symmetric key for the election, encrypts it with
    the master key using AES-256-GCM, and persists it in ElectionEncryptionKey.
    Triggered automatically on election creation.
    """
    master_key = get_master_key()
    election_key = AESGCM.generate_key(bit_length=256)
    nonce = os.urandom(12)
    associated_data = str(election.id).encode('utf-8')

    aesgcm = AESGCM(master_key)
    ciphertext = aesgcm.encrypt(nonce, election_key, associated_data)
    stored_payload = nonce + ciphertext

    obj, _ = ElectionEncryptionKey.objects.update_or_create(
        election=election,
        defaults={'encrypted_key': stored_payload}
    )
    return obj


def get_election_key(election) -> bytes:
    """
    Decrypts the per-election key into memory using the master key.
    Never persisted decrypted; never written to any log.
    """
    master_key = get_master_key()
    try:
        key_record = ElectionEncryptionKey.objects.get(election=election)
    except ElectionEncryptionKey.DoesNotExist:
        # If not present for some reason, provision it immediately
        key_record = generate_election_key(election)

    encrypted_payload = bytes(key_record.encrypted_key)
    if len(encrypted_payload) < 28: # 12 bytes nonce + 16 bytes tag minimum
        raise RuntimeError(f"Corrupt encryption key payload for election {election.id}")

    nonce = encrypted_payload[:12]
    ciphertext = encrypted_payload[12:]
    associated_data = str(election.id).encode('utf-8')

    aesgcm = AESGCM(master_key)
    try:
        election_key = aesgcm.decrypt(nonce, ciphertext, associated_data)
    except Exception as e:
        raise RuntimeError(f"Failed to decrypt election encryption key: {str(e)}")

    return election_key


def encrypt_ballot_choice(election, choice_str: str) -> bytes:
    """
    Encrypts a voter's choice string (candidate UUID) using the per-election key.
    Returns nonce + ciphertext (including 16-byte GCM authentication tag).
    """
    election_key = get_election_key(election)
    nonce = os.urandom(12)
    associated_data = str(election.id).encode('utf-8')

    aesgcm = AESGCM(election_key)
    ciphertext = aesgcm.encrypt(nonce, choice_str.encode('utf-8'), associated_data)
    return nonce + ciphertext


def decrypt_ballot_choice(election, encrypted_payload: bytes) -> str:
    """
    Decrypts a ballot's choice bytes using the per-election key.
    Executed in memory during tally computation.
    """
    election_key = get_election_key(election)
    payload = bytes(encrypted_payload)
    if len(payload) < 28:
        raise RuntimeError("Corrupt encrypted ballot payload")

    nonce = payload[:12]
    ciphertext = payload[12:]
    associated_data = str(election.id).encode('utf-8')

    aesgcm = AESGCM(election_key)
    plaintext_bytes = aesgcm.decrypt(nonce, ciphertext, associated_data)
    return plaintext_bytes.decode('utf-8')
