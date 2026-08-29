import os
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from authentication.models import User, UserProfile
from voters.models import VoterProfile, VoterIDCard
from locations.models import State, District, Constituency, PollingStation
from elections.models import Election, ElectionPhase
from candidates.models import PoliticalParty, Candidate, ElectionCandidate
from voting.models import Vote, VoteReceipt, VoteTransaction

class Command(BaseCommand):
    help = 'Seeds the database with synthetic demo data for DigiVote local audits.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Initializing demo data seeding...")

        # 1. Clear existing data in correct dependency order
        self.stdout.write("Clearing existing records...")
        VoteReceipt.objects.all().delete()
        VoteTransaction.objects.all().delete()
        Vote.objects.all().delete()
        ElectionCandidate.objects.all().delete()
        Candidate.objects.all().delete()
        PoliticalParty.objects.all().delete()
        ElectionPhase.objects.all().delete()
        Election.objects.all().delete()
        VoterIDCard.objects.all().delete()
        VoterProfile.objects.all().delete()
        UserProfile.objects.all().delete()
        
        # Clear Locations
        PollingStation.objects.all().delete()
        Constituency.objects.all().delete()
        District.objects.all().delete()
        State.objects.all().delete()
        
        # Deleting all users except active superusers if any
        User.objects.filter(is_superuser=False).delete()
        User.objects.filter(username="admin").delete()

        # 2. Create Location Hierarchy
        self.stdout.write("Creating location structures...")
        s1 = State.objects.create(name="DEMO State (Tamil Nadu)")
        
        dist1 = District.objects.create(state=s1, name="DEMO District (Chennai)")
        dist2 = District.objects.create(state=s1, name="DEMO District (Madurai)")
        dist3 = District.objects.create(state=s1, name="DEMO District (Coimbatore)")
        
        c1 = Constituency.objects.create(district=dist1, name="DEMO Constituency (Chennai Central)", description="Central Parliamentary Constituency")
        c2 = Constituency.objects.create(district=dist2, name="DEMO Constituency (Madurai North)", description="Madurai Assembly Constituency")
        c3 = Constituency.objects.create(district=dist3, name="DEMO Constituency (Coimbatore South)", description="Coimbatore Assembly Constituency")
        
        PollingStation.objects.create(constituency=c1, name="DEMO Polling Station #45", address="Chennai Central Community Hall")
        PollingStation.objects.create(constituency=c2, name="DEMO Polling Station #12", address="Madurai North Higher Secondary School")
        PollingStation.objects.create(constituency=c3, name="DEMO Polling Station #88", address="Coimbatore South Municipal Library")

        # 3. Create Admin User
        self.stdout.write("Creating admin user...")
        admin = User.objects.create_superuser(
            username="admin",
            password="password123",
            email="admin@digivote.gov.in",
            first_name="Election",
            last_name="Commissioner",
            role=User.ADMIN,
            email_verified=True,
            account_status='ACTIVE'
        )
        self.stdout.write(self.style.SUCCESS("Admin created: admin@digivote.gov.in / password123 (username: admin)"))

        # 4. Create Voters & VoterProfiles
        self.stdout.write("Creating citizen profiles...")
        
        # Verified Voter in Chennai Central
        v1_user = User.objects.create_user(
            username="voter1",
            password="password123",
            email="voter1@mail.com",
            first_name="Ramesh",
            last_name="Kumar",
            role=User.VOTER,
            email_verified=True,
            account_status='ACTIVE'
        )
        v1 = VoterProfile.objects.create(
            user=v1_user,
            voter_reference="VT982001",
            constituency=c1,
            verification_status='VERIFIED',
            verification_method='MANUAL',
            verified_at=timezone.now(),
            verified_by=admin
        )

        # Unverified Voter in Madurai North
        v2_user = User.objects.create_user(
            username="voter2",
            password="password123",
            email="voter2@mail.com",
            first_name="Priya",
            last_name="Dharshini",
            role=User.VOTER,
            email_verified=True,
            account_status='ACTIVE'
        )
        v2 = VoterProfile.objects.create(
            user=v2_user,
            voter_reference="VT982002",
            constituency=c2,
            verification_status='PENDING'
        )

        # Verified Voter in Coimbatore South
        v3_user = User.objects.create_user(
            username="voter3",
            password="password123",
            email="voter3@mail.com",
            first_name="Karthik",
            last_name="Raja",
            role=User.VOTER,
            email_verified=True,
            account_status='ACTIVE'
        )
        v3 = VoterProfile.objects.create(
            user=v3_user,
            voter_reference="VT982003",
            constituency=c3,
            verification_status='VERIFIED',
            verification_method='MANUAL',
            verified_at=timezone.now(),
            verified_by=admin
        )

        self.stdout.write("Voter profiles seeded:")
        self.stdout.write(" - voter1@mail.com / password123 (Verified, Chennai Central)")
        self.stdout.write(" - voter2@mail.com / password123 (Pending, Madurai North)")
        self.stdout.write(" - voter3@mail.com / password123 (Verified, Coimbatore South)")

        # 5. Create Political Parties
        self.stdout.write("Creating political party allocations...")
        p1 = PoliticalParty.objects.create(name="DEMO Secular Progressive Front", symbol_tag="SPF")
        p2 = PoliticalParty.objects.create(name="DEMO Democratic People Alliance", symbol_tag="DPA")
        p3 = PoliticalParty.objects.create(name="DEMO Farmers Right Collective", symbol_tag="FRC")

        # 6. Create Nominees
        self.stdout.write("Creating contesting candidates...")
        cand1 = Candidate.objects.create(name="Anbuchelvan S.", party=p1, bio="Committed to regional infrastructure and smart city development.")
        cand2 = Candidate.objects.create(name="Meenakshi Sundaram", party=p2, bio="Focusing on education reforms and healthcare access.")
        cand3 = Candidate.objects.create(name="Veerapandian K.", party=p3, bio="Advocating for farmers pricing, smart agriculture, and lake restorations.")

        # 7. Create Elections & Phase details
        self.stdout.write("Scheduling elections...")
        el_active = Election.objects.create(
            name="DEMO General Lok Sabha Election 2026",
            description="Active nationwide parliamentary polls. Review candidate profiles.",
            election_type='GENERAL',
            start_datetime=timezone.now() - timedelta(hours=2),
            end_datetime=timezone.now() + timedelta(days=2),
            status='ACTIVE'
        )
        ElectionPhase.objects.create(
            election=el_active,
            name="General Polling Phase 1",
            start_datetime=el_active.start_datetime,
            end_datetime=el_active.end_datetime,
            status='ACTIVE'
        )

        el_scheduled = Election.objects.create(
            name="DEMO State Assembly By-Elections 2026",
            description="Scheduled assembly by-polls.",
            election_type='BY_ELECTION',
            start_datetime=timezone.now() + timedelta(days=5),
            end_datetime=timezone.now() + timedelta(days=6),
            status='SCHEDULED'
        )

        el_completed = Election.objects.create(
            name="DEMO Constituency Development Poll 2025",
            description="Completed developmental voting outcomes.",
            election_type='MUNICIPAL',
            start_datetime=timezone.now() - timedelta(days=10),
            end_datetime=timezone.now() - timedelta(days=8),
            status='COMPLETED'
        )

        # 8. Map candidates to constituency seats in active election
        self.stdout.write("Binding candidates to active election seats...")
        ElectionCandidate.objects.create(election=el_active, candidate=cand1, constituency=c1, is_approved=True)
        ElectionCandidate.objects.create(election=el_active, candidate=cand2, constituency=c1, is_approved=True)
        ElectionCandidate.objects.create(election=el_active, candidate=cand3, constituency=c2, is_approved=True)

        self.stdout.write(self.style.SUCCESS("Demo database seed complete."))
