import os
import sys
import django
from datetime import timedelta
from django.utils import timezone

# Configure Django Environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from authentication.models import User
from voters.models import Constituency, Voter
from elections.models import Election, Candidate

def seed_data():
    print("Initializing demo data seeding...")
    
    # 1. Clear existing data
    print("Clearing existing records...")
    Candidate.objects.all().delete()
    Election.objects.all().delete()
    Voter.objects.all().delete()
    Constituency.objects.all().delete()
    User.objects.filter(is_superuser=False).delete()

    # 2. Create Constituencies
    print("Creating constituencies...")
    c1 = Constituency.objects.create(name="Chennai Central", description="Central Parliamentary Constituency")
    c2 = Constituency.objects.create(name="Madurai North", description="Madurai North Assembly Constituency")
    c3 = Constituency.objects.create(name="Coimbatore South", description="Coimbatore South Assembly Constituency")
    
    # 3. Create Admin User
    print("Creating admin user...")
    admin = User.objects.create_superuser(
        username="admin",
        password="password123",
        email="admin@digivote.gov.in",
        first_name="Election",
        last_name="Commissioner",
        role=User.ADMIN
    )
    print("Admin user created: admin / password123")

    # 4. Create Voters
    print("Creating voters...")
    # Verified Voter in Chennai Central
    v1_user = User.objects.create_user(
        username="voter1",
        password="password123",
        email="voter1@mail.com",
        first_name="Ramesh",
        last_name="Kumar",
        role=User.VOTER
    )
    v1 = Voter.objects.create(
        user=v1_user,
        voter_id_number="VT982001",
        constituency=c1,
        is_verified=True,
        verification_date=timezone.now(),
        verified_by=admin
    )
    
    # Unverified Voter in Madurai North
    v2_user = User.objects.create_user(
        username="voter2",
        password="password123",
        email="voter2@mail.com",
        first_name="Priya",
        last_name="Dharshini",
        role=User.VOTER
    )
    v2 = Voter.objects.create(
        user=v2_user,
        voter_id_number="VT982002",
        constituency=c2,
        is_verified=False
    )
    
    # Verified Voter in Coimbatore South
    v3_user = User.objects.create_user(
        username="voter3",
        password="password123",
        email="voter3@mail.com",
        first_name="Karthik",
        last_name="Raja",
        role=User.VOTER
    )
    v3 = Voter.objects.create(
        user=v3_user,
        voter_id_number="VT982003",
        constituency=c3,
        is_verified=True,
        verification_date=timezone.now(),
        verified_by=admin
    )
    print("Voters created:")
    print(" - voter1 / password123 (Chennai Central, Verified)")
    print(" - voter2 / password123 (Madurai North, Pending Verification)")
    print(" - voter3 / password123 (Coimbatore South, Verified)")

    # 5. Create Elections
    print("Creating elections...")
    
    # Active Election
    el_active = Election.objects.create(
        title="General Lok Sabha Election 2026",
        description="Active nationwide assembly polls. Make sure to review candidate manifestos before casting your secure vote.",
        start_date=timezone.now() - timedelta(hours=2),
        end_date=timezone.now() + timedelta(days=2),
        status=Election.ACTIVE
    )
    
    # Scheduled Election
    el_scheduled = Election.objects.create(
        title="State Assembly By-Elections 2026",
        description="Upcoming state legislative assembly by-polls.",
        start_date=timezone.now() + timedelta(days=5),
        end_date=timezone.now() + timedelta(days=6),
        status=Election.SCHEDULED
    )
    
    # Completed Election
    el_completed = Election.objects.create(
        title="Constituency Development Poll 2025",
        description="Local body developmental voting regarding budget usage.",
        start_date=timezone.now() - timedelta(days=10),
        end_date=timezone.now() - timedelta(days=8),
        status=Election.COMPLETED
    )
    print("Elections created: Active, Scheduled, Completed")

    # 6. Create Candidates for Active Election
    print("Creating candidates...")
    
    # Chennai Central Candidates (Voter 1)
    Candidate.objects.create(
        election=el_active,
        constituency=c1,
        name="Anbuchelvan S.",
        party_name="Secular Progressive Front",
        bio="Focusing on regional infrastructure, digital governance, and clean drinking water facilities.",
        is_approved=True,
        photo_url="https://api.dicebear.com/7.x/initials/svg?seed=Anbuchelvan",
        party_logo_url="https://api.dicebear.com/7.x/initials/svg?seed=SPF"
    )
    Candidate.objects.create(
        election=el_active,
        constituency=c1,
        name="Meenakshi Sundaram",
        party_name="Democratic People Alliance",
        bio="Advocating for educational reforms, tech parks investment, and sanitation projects.",
        is_approved=True,
        photo_url="https://api.dicebear.com/7.x/initials/svg?seed=Meenakshi",
        party_logo_url="https://api.dicebear.com/7.x/initials/svg?seed=DPA"
    )
    
    # Madurai North Candidates (Voter 2)
    Candidate.objects.create(
        election=el_active,
        constituency=c2,
        name="Veerapandian K.",
        party_name="Farmers Right Collective",
        bio="Committed to agriculture pricing, lake restorations, and Madurai heritage support.",
        is_approved=True,
        photo_url="https://api.dicebear.com/7.x/initials/svg?seed=Veerapandian",
        party_logo_url="https://api.dicebear.com/7.x/initials/svg?seed=FRC"
    )
    Candidate.objects.create(
        election=el_active,
        constituency=c2,
        name="Dr. Shanthi Priya",
        party_name="National Welfare Party",
        bio="Pillared on free healthcare accessibility, smart classrooms, and vocational training centers.",
        is_approved=True,
        photo_url="https://api.dicebear.com/7.x/initials/svg?seed=Shanthi",
        party_logo_url="https://api.dicebear.com/7.x/initials/svg?seed=NWP"
    )
    
    # Coimbatore South Candidates (Voter 3)
    Candidate.objects.create(
        election=el_active,
        constituency=c3,
        name="Balakrishnan G.",
        party_name="Industrial Labor Front",
        bio="Industrial sector representation, worker insurance, and Coimbatore smart roads.",
        is_approved=True,
        photo_url="https://api.dicebear.com/7.x/initials/svg?seed=Balakrishnan",
        party_logo_url="https://api.dicebear.com/7.x/initials/svg?seed=ILF"
    )
    
    # Unapproved candidate to test admin approval queues
    Candidate.objects.create(
        election=el_active,
        constituency=c3,
        name="Rangarajan V.",
        party_name="Youth Progress Forum",
        bio="Youth unemployment allowances and sports stadium setups.",
        is_approved=False,
        photo_url="https://api.dicebear.com/7.x/initials/svg?seed=Rangarajan",
        party_logo_url="https://api.dicebear.com/7.x/initials/svg?seed=YPF"
    )
    
    print("Candidates registered. Seeding completed successfully.")

if __name__ == '__main__':
    seed_data()
