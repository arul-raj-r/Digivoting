import os
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from authentication.models import User, UserProfile
from voters.models import VoterProfile
from locations.models import State, District, Constituency, PollingStation
from elections.models import (
    Election,
    EligibleVoter,
    Candidate as ElectionCandidateModel,
    ElectionVerificationConfig,
    ElectionRules
)
from voting.models import (
    Ballot,
    ElectionEncryptionKey,
    ElectionResult,
    CandidateResult,
    BallotConfirmationToken
)
from voting.crypto import generate_election_key

class Command(BaseCommand):
    help = 'Seeds the database with synthetic organizational demo data for DigiVote.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Initializing organizational demo data seeding...")

        # 1. Clear existing data in correct dependency order
        self.stdout.write("Clearing existing records...")
        CandidateResult.objects.all().delete()
        ElectionResult.objects.all().delete()
        BallotConfirmationToken.objects.all().delete()
        Ballot.objects.all().delete()
        ElectionEncryptionKey.objects.all().delete()
        ElectionCandidateModel.objects.all().delete()
        EligibleVoter.objects.all().delete()
        ElectionRules.objects.all().delete()
        ElectionVerificationConfig.objects.all().delete()
        Election.objects.all().delete()
        VoterProfile.objects.all().delete()
        UserProfile.objects.all().delete()

        # Clear Locations (legacy cleanup)
        PollingStation.objects.all().delete()
        Constituency.objects.all().delete()
        District.objects.all().delete()
        State.objects.all().delete()

        # Deleting users
        User.objects.filter(is_superuser=False).delete()
        User.objects.filter(username__in=["admin", "creator", "voter1", "voter2", "voter3"]).delete()

        # 2. Create Admin & Creator Users
        self.stdout.write("Creating administrator and election creator accounts...")
        admin = User.objects.create_superuser(
            username="admin",
            password="password123",
            email="admin@digivote.app",
            first_name="System",
            last_name="Admin",
            role=User.ADMIN,
            email_verified=True,
            account_status='ACTIVE'
        )
        self.stdout.write(self.style.SUCCESS("Admin created: admin@digivote.app / password123"))

        creator = User.objects.create_user(
            username="creator",
            password="password123",
            email="creator@digivote.app",
            first_name="Alex",
            last_name="Morgan",
            role=User.ELECTION_CREATOR,
            email_verified=True,
            account_status='ACTIVE'
        )
        self.stdout.write(self.style.SUCCESS("Creator created: creator@digivote.app / password123"))

        # 3. Create Voters and Demo Constituency
        self.stdout.write("Creating organization voter profiles...")
        demo_state, _ = State.objects.get_or_create(name="DEMO Region")
        demo_district, _ = District.objects.get_or_create(state=demo_state, name="DEMO District")
        demo_constituency, _ = Constituency.objects.get_or_create(district=demo_district, name="DEMO Central", defaults={'description': 'Demo Organization Voting Precinct'})

        v1_user = User.objects.create_user(
            username="voter1",
            password="password123",
            email="voter1@digivote.app",
            first_name="Jordan",
            last_name="Lee",
            role=User.VOTER,
            email_verified=True,
            account_status='ACTIVE'
        )
        v1_profile, _ = VoterProfile.objects.get_or_create(user=v1_user)
        v1_profile.constituency = demo_constituency
        v1_profile.verification_status = 'VERIFIED'
        v1_profile.save()

        v2_user = User.objects.create_user(
            username="voter2",
            password="password123",
            email="voter2@digivote.app",
            first_name="Sam",
            last_name="Taylor",
            role=User.VOTER,
            email_verified=True,
            account_status='ACTIVE'
        )
        v2_profile, _ = VoterProfile.objects.get_or_create(user=v2_user)
        v2_profile.constituency = demo_constituency
        v2_profile.verification_status = 'VERIFIED'
        v2_profile.save()

        v3_user = User.objects.create_user(
            username="voter3",
            password="password123",
            email="voter3@digivote.app",
            first_name="Casey",
            last_name="Rivers",
            role=User.VOTER,
            email_verified=True,
            account_status='ACTIVE'
        )
        v3_profile, _ = VoterProfile.objects.get_or_create(user=v3_user)
        v3_profile.constituency = demo_constituency
        v3_profile.verification_status = 'VERIFIED'
        v3_profile.save()

        self.stdout.write(self.style.SUCCESS("Voters seeded:"))
        self.stdout.write(" - voter1@digivote.app / password123")
        self.stdout.write(" - voter2@digivote.app / password123")
        self.stdout.write(" - voter3@digivote.app / password123")

        now = timezone.now()

        # 4. Create Active Election: "Student Council Election 2025"
        self.stdout.write("Creating active election: Student Council Election 2025...")
        el_active = Election.objects.create(
            created_by=creator,
            title="Student Council Election 2025",
            description="Annual campus student council vote. Cast your ballot for the next student body representative.",
            election_type='academic',
            start_datetime=now - timedelta(hours=2),
            end_datetime=now + timedelta(days=2),
            actual_start_at=now - timedelta(hours=2),
            status='active',
            is_locked=True
        )
        generate_election_key(el_active)

        ElectionVerificationConfig.objects.filter(election=el_active).update(
            require_email_otp=False,
            require_webcam_verification=False,
            require_biometric_verification=False
        )
        ElectionRules.objects.filter(election=el_active).update(
            results_visibility='immediate',
            allow_vote_change=False
        )

        cand1 = ElectionCandidateModel.objects.create(
            election=el_active,
            full_name="Sarah Chen",
            party_or_affiliation="Computer Science Dept",
            bio="Committed to campus sustainability, 24/7 library hours, and modern lab resources.",
            display_order=1
        )
        cand2 = ElectionCandidateModel.objects.create(
            election=el_active,
            full_name="Marcus Brody",
            party_or_affiliation="Business & Economics",
            bio="Advocating for expanded student grants, career workshops, and transparent budgeting.",
            display_order=2
        )

        EligibleVoter.objects.create(election=el_active, email="voter1@digivote.app", user=v1_user, has_voted=False)
        EligibleVoter.objects.create(election=el_active, email="voter2@digivote.app", user=v2_user, has_voted=False)
        EligibleVoter.objects.create(election=el_active, email="voter3@digivote.app", user=v3_user, has_voted=False)

        # 5. Create Scheduled Election: "Class Representative Election"
        self.stdout.write("Creating scheduled election: Class Representative Election...")
        el_scheduled = Election.objects.create(
            created_by=creator,
            title="Class Representative Election",
            description="Nominee selection for Semester 5 Class Representative.",
            election_type='academic',
            start_datetime=now + timedelta(days=1),
            end_datetime=now + timedelta(days=3),
            status='scheduled',
            is_locked=False
        )
        generate_election_key(el_scheduled)

        ElectionVerificationConfig.objects.filter(election=el_scheduled).update(
            require_email_otp=False,
            require_webcam_verification=False
        )
        ElectionRules.objects.filter(election=el_scheduled).update(
            results_visibility='scheduled',
            results_visible_at=now + timedelta(days=3, hours=1),
            allow_vote_change=False
        )

        ElectionCandidateModel.objects.create(
            election=el_scheduled,
            full_name="David Kim",
            party_or_affiliation="Section A",
            bio="Focusing on study circle coordination and peer mentoring initiatives.",
            display_order=1
        )
        ElectionCandidateModel.objects.create(
            election=el_scheduled,
            full_name="Priya Patel",
            party_or_affiliation="Section B",
            bio="Dedicated to project milestone reminders and open communication channels.",
            display_order=2
        )

        EligibleVoter.objects.create(election=el_scheduled, email="voter1@digivote.app", user=v1_user, has_voted=False)
        EligibleVoter.objects.create(election=el_scheduled, email="voter2@digivote.app", user=v2_user, has_voted=False)

        # 6. Create Completed Election: "Best Employee of the Month Poll"
        self.stdout.write("Creating completed election: Best Employee of the Month Poll...")
        el_completed = Election.objects.create(
            created_by=creator,
            title="Best Employee of the Month Poll",
            description="Workplace recognition poll celebrating outstanding team collaboration and leadership.",
            election_type='workplace',
            start_datetime=now - timedelta(days=7),
            end_datetime=now - timedelta(days=1),
            actual_start_at=now - timedelta(days=7),
            status='completed',
            is_locked=True
        )
        generate_election_key(el_completed)

        ElectionVerificationConfig.objects.filter(election=el_completed).update(
            require_email_otp=False,
            require_webcam_verification=False
        )
        ElectionRules.objects.filter(election=el_completed).update(
            results_visibility='immediate',
            allow_vote_change=False
        )

        c_emp1 = ElectionCandidateModel.objects.create(
            election=el_completed,
            full_name="Elena Rostova",
            party_or_affiliation="Engineering Team",
            bio="Delivered key platform reliability upgrades with zero downtime.",
            display_order=1
        )
        c_emp2 = ElectionCandidateModel.objects.create(
            election=el_completed,
            full_name="James Wilson",
            party_or_affiliation="Design & UX",
            bio="Spearheaded intuitive interface enhancements and accessibility audits.",
            display_order=2
        )

        EligibleVoter.objects.create(election=el_completed, email="voter1@digivote.app", user=v1_user, has_voted=True)
        EligibleVoter.objects.create(election=el_completed, email="voter2@digivote.app", user=v2_user, has_voted=True)

        # Create certified result for completed election
        res, _ = ElectionResult.objects.get_or_create(
            election=el_completed,
            defaults={
                'total_ballots_cast': 2,
                'integrity_verified': True,
                'is_published': True,
                'published_at': now - timedelta(days=1)
            }
        )
        CandidateResult.objects.create(election_result=res, candidate=c_emp1, vote_count=2)
        CandidateResult.objects.create(election_result=res, candidate=c_emp2, vote_count=0)

        # 7. Create Draft Election: "Club President Election"
        self.stdout.write("Creating draft election: Club President Election...")
        el_draft = Election.objects.create(
            created_by=creator,
            title="Club President Election",
            description="Upcoming leadership election for the Robotics & AI Society.",
            election_type='club',
            status='draft',
            is_locked=False
        )
        generate_election_key(el_draft)
        ElectionVerificationConfig.objects.filter(election=el_draft).update(
            require_email_otp=True,
            require_webcam_verification=False
        )
        ElectionRules.objects.filter(election=el_draft).update(
            results_visibility='manual',
            allow_vote_change=False
        )

        self.stdout.write(self.style.SUCCESS("Organizational demo database seed complete."))
