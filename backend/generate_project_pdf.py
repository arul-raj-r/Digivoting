import os
import sys
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print 'Page X of Y'
    along with running header and footer.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Skip running header and footer on the cover page
        if self._pageNumber > 1:
            # Running Header
            self.drawString(54, 750, "DigiVote Platform — Comprehensive System Architecture & Operational Guide")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, 744, 558, 744)

            # Running Footer
            self.line(54, 45, 558, 45)
            self.drawString(54, 32, "CONFIDENTIAL & PROPRIETARY — DIGIVOTE SECURE CIVIC SYSTEMS")
            page_text = f"Page {self._pageNumber} of {page_count}"
            self.drawRightString(558, 32, page_text)

        self.restoreState()


def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY = colors.HexColor("#1e3a8a")     # Deep Navy
    SECONDARY = colors.HexColor("#4338ca")   # Indigo
    DARK = colors.HexColor("#0f172a")        # Slate 900
    TEXT = colors.HexColor("#334155")        # Slate 700
    LIGHT_BG = colors.HexColor("#f8fafc")    # Slate 50
    ACCENT = colors.HexColor("#059669")      # Emerald 600
    BORDER = colors.HexColor("#e2e8f0")      # Slate 200

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY,
        alignment=1, # Center
        spaceAfter=8,
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=SECONDARY,
        alignment=1,
        spaceAfter=20,
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=PRIMARY,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=SECONDARY,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True,
    )

    h3_style = ParagraphStyle(
        'Header3',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=DARK,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=TEXT,
        spaceAfter=6,
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName='Helvetica-Bold',
        textColor=DARK,
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=body_style,
        leftIndent=14,
        bulletIndent=4,
        spaceAfter=3,
    )

    code_style = ParagraphStyle(
        'CodeText',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#1e293b"),
        backColor=colors.HexColor("#f1f5f9"),
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=6,
    )

    qa_q_style = ParagraphStyle(
        'QAQuestion',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13.5,
        textColor=PRIMARY,
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True,
    )

    qa_a_style = ParagraphStyle(
        'QAAnswer',
        parent=body_style,
        leftIndent=8,
        spaceAfter=8,
    )

    story = []

    # =========================================================================
    # COVER / TITLE BANNER
    # =========================================================================
    story.append(Spacer(1, 20))
    story.append(Paragraph("DIGIVOTE: DIGITAL VOTING SYSTEM", title_style))
    story.append(Paragraph("Comprehensive Platform Architecture, End-to-End Workflows, Security Protocols, and AI Knowledge Specification", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceAfter=15))

    meta_table_data = [
        [
            Paragraph("<b>Document Version:</b> 2.0 (Official)", body_style),
            Paragraph("<b>Classification:</b> Public Civic Specification", body_style),
        ],
        [
            Paragraph("<b>Target Audience:</b> Voters, Organizers, Auditors, AI Assistant", body_style),
            Paragraph("<b>Primary Backend Engine:</b> Django REST Framework + Gemini + Pinecone", body_style),
        ],
        [
            Paragraph("<b>Security Standard:</b> AES-256-GCM / WebAuthn FIDO2 / ArcFace", body_style),
            Paragraph("<b>Frontend Framework:</b> React 19 + Vite + Tailwind CSS", body_style),
        ],
    ]
    meta_table = Table(meta_table_data, colWidths=[250, 254])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 1, BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 15))

    # =========================================================================
    # EXECUTIVE SUMMARY
    # =========================================================================
    story.append(Paragraph("Executive Summary & Core Mission", h1_style))
    story.append(Paragraph(
        "<b>DigiVote</b> is a high-assurance, tamper-evident digital voting platform engineered to conduct secure, "
        "transparent, and verifiable elections for civic governments, academic institutions, corporations, and community "
        "organizations. The platform balances two traditionally conflicting imperatives in digital democracy: "
        "<b>strict voter identity verification</b> and <b>absolute ballot anonymity</b>.",
        body_style
    ))
    story.append(Paragraph(
        "To guarantee integrity, DigiVote enforces a <i>Triple-Separation Architecture</i> across the entire lifecycle:",
        body_style
    ))
    story.append(Paragraph("• <b>Citizen Identity Layer (Accounts/Authentication):</b> Governs user accounts, passwords, MFA OTP challenges, session tokens, and security audits.", bullet_style))
    story.append(Paragraph("• <b>Election Eligibility Layer (Elections):</b> Enforces bounded voter rosters, registration rules, candidate nomination slates, and multi-stage biometric verification.", bullet_style))
    story.append(Paragraph("• <b>Cryptographic Ballot Box (Voting):</b> A zero-knowledge blind repository where ballots are envelope-encrypted with AES-256-GCM. Ballots store no user foreign keys, IP addresses, or traceable timestamps.", bullet_style))

    story.append(Spacer(1, 10))

    # =========================================================================
    # SECTION 1: SYSTEM ARCHITECTURE & TECHNOLOGY STACK
    # =========================================================================
    story.append(Paragraph("1. System Architecture & Technology Stack", h1_style))
    story.append(Paragraph(
        "DigiVote is designed as a modular decoupled system consisting of an asynchronous REST API backend, "
        "an ultra-responsive Single Page Application frontend, a relational persistent store, and a dual-stream RAG AI Assistant:",
        body_style
    ))

    tech_table_data = [
        [Paragraph("<b>Component</b>", body_bold), Paragraph("<b>Technology</b>", body_bold), Paragraph("<b>Key Responsibilities</b>", body_bold)],
        [
            Paragraph("Frontend", body_style),
            Paragraph("React 19, Vite, Tailwind CSS, Lucide Icons", body_style),
            Paragraph("Client-side dashboard, accessible voting booth, live theme toggle (Light/Dark/System), AI chat UI.", body_style)
        ],
        [
            Paragraph("Backend API", body_style),
            Paragraph("Python 3.11, Django 5.x, Django REST Framework", body_style),
            Paragraph("RESTful endpoints, business logic validation, state machines, atomic database transactions.", body_style)
        ],
        [
            Paragraph("Database", body_style),
            Paragraph("PostgreSQL / SQLite, UUIDv4 Primary Keys", body_style),
            Paragraph("ACID transactions, row-level locking (select_for_update), relational voter rolls and candidate slates.", body_style)
        ],
        [
            Paragraph("Authentication", body_style),
            Paragraph("SimpleJWT, HMAC OTP, WebAuthn / FIDO2", body_style),
            Paragraph("Short-lived bearer access tokens, rotating refresh tokens, session tracking, device fingerprinting.", body_style)
        ],
        [
            Paragraph("Biometrics", body_style),
            Paragraph("ArcFace, MediaPipe, OpenCV", body_style),
            Paragraph("Webcam facial landmark liveness detection, 512-dimensional facial embedding match against voter KYC photo.", body_style)
        ],
        [
            Paragraph("AI RAG Pipeline", body_style),
            Paragraph("Pinecone Vector DB, Google Gemini LLM", body_style),
            Paragraph("Semantic vector search (gemini-embedding-001, 3072 dims), authorized DB context synthesis, generative answers (gemini-2.5-flash).", body_style)
        ],
    ]
    tech_table = Table(tech_table_data, colWidths=[80, 160, 264])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e0e7ff")),
        ('TEXTCOLOR', (0, 0), (-1, 0), PRIMARY),
        ('BOX', (0, 0), (-1, -1), 1, BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(tech_table)

    story.append(Spacer(1, 10))

    # =========================================================================
    # SECTION 2: USER ROLES & AUTHORIZATION MATRIX
    # =========================================================================
    story.append(Paragraph("2. User Roles & Authorization Matrix", h1_style))
    story.append(Paragraph(
        "DigiVote operates on a Principle of Least Privilege (PoLP). Every request is evaluated against user credentials and contextual ownership:",
        body_style
    ))

    roles_data = [
        [Paragraph("<b>Role Name</b>", body_bold), Paragraph("<b>Scope & Definition</b>", body_bold), Paragraph("<b>Permitted Capabilities</b>", body_bold)],
        [
            Paragraph("Citizen Voter<br/>(<code>VOTER</code>)", body_style),
            Paragraph("Standard authenticated citizen.", body_style),
            Paragraph("View public & assigned elections, verify identity via OTP/facial scan, cast single anonymous ballot, download receipt, consult AI Assistant.", body_style)
        ],
        [
            Paragraph("Election Creator<br/>(<code>ELECTION_CREATOR</code>)", body_style),
            Paragraph("Authorized election organizer.", body_style),
            Paragraph("Create draft elections, upload voter roll CSVs, configure candidates/photos, set verification requirements, schedule, pause/resume, and publish results.", body_style)
        ],
        [
            Paragraph("System Administrator<br/>(<code>ADMIN</code>)", body_style),
            Paragraph("Platform security officer.", body_style),
            Paragraph("Global user management, institutional oversight, emergency election cancellation, system health monitoring, cryptographic audit inspection.", body_style)
        ],
    ]
    roles_table = Table(roles_data, colWidths=[95, 120, 289])
    roles_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e0e7ff")),
        ('BOX', (0, 0), (-1, -1), 1, BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(roles_table)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 3: COMPLETE END-TO-END WORKFLOWS (MODULES 1 - 12)
    # =========================================================================
    story.append(Paragraph("3. Complete End-to-End System Workflows", h1_style))

    # Workflow 1 & 2
    story.append(Paragraph("3.1. Workflow 1 & 2: Citizen Registration, Verification & Multi-Factor Login", h2_style))
    story.append(Paragraph(
        "Every citizen participating in DigiVote must undergo an authentic onboarding sequence. "
        "Account creation requires full name, valid national/institutional email, phone number, and a secure password. "
        "An email verification link with a cryptographic token is dispatched immediately. Once confirmed, the account transitions "
        "from <code>PENDING_EMAIL_VERIFICATION</code> to <code>ACTIVE</code>.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Multi-Factor Authentication (MFA) Protocol:</b><br/>"
        "1. Citizen enters email and password into the React portal.<br/>"
        "2. Backend verifies hashed credentials (Argon2 / PBKDF2). If valid, a <code>PENDING_MFA</code> pre-authorization challenge token is issued.<br/>"
        "3. A 6-digit cryptographic OTP is generated, hashed with SHA-256, stored in <code>OTPVerification</code> with a 5-minute expiry, and sent via email.<br/>"
        "4. Citizen inputs the OTP into the 6-digit input mask.<br/>"
        "5. Backend validates the code within maximum attempt limits (3 attempts). Upon success, full JWT Access and Refresh tokens are issued.",
        body_style
    ))

    # Workflow 3
    story.append(Paragraph("3.2. Workflow 3: Device Session Tracking & Session Revocation", h2_style))
    story.append(Paragraph(
        "DigiVote continuously monitors active sessions to detect anomalous concurrent access or compromised credentials. "
        "Each successful authentication records the IP address, user-agent, operating system, and unique JWT token ID (<code>jti</code>) into "
        "<code>UserSession</code>. Citizens can view all active devices from the <i>Sessions & Security</i> dashboard and instantly "
        "revoke suspicious sessions or trigger a global <i>Revoke All Other Sessions</i> command.",
        body_style
    ))

    # Workflow 4
    story.append(Paragraph("3.3. Workflow 4: Election Creation, Rules & State Machine Lifecycle", h2_style))
    story.append(Paragraph(
        "Elections follow a strict, non-reversible state machine managed by the backend engine to ensure chronological fairness:",
        body_style
    ))

    state_data = [
        [Paragraph("<b>Status Code</b>", body_bold), Paragraph("<b>State Description</b>", body_bold), Paragraph("<b>Allowed Operations</b>", body_bold)],
        [
            Paragraph("<code>DRAFT</code>", body_style),
            Paragraph("Initial creation state.", body_style),
            Paragraph("Edit title, description, election type. Upload voter rosters and candidate nominations.", body_style)
        ],
        [
            Paragraph("<code>CONFIGURED</code>", body_style),
            Paragraph("Setup finalized and locked.", body_style),
            Paragraph("Define verification rules (OTP, Webcam, Biometric) and results visibility schedules.", body_style)
        ],
        [
            Paragraph("<code>SCHEDULED</code>", body_style),
            Paragraph("Timers armed for automated start.", body_style),
            Paragraph("Countdown timer active. Voters can preview election details and test verification.", body_style)
        ],
        [
            Paragraph("<code>ACTIVE</code> (Live)", body_style),
            Paragraph("Voting polls are officially open.", body_style),
            Paragraph("Eligible voters can access the voting booth and cast ballots. Organizer can view live turnout statistics.", body_style)
        ],
        [
            Paragraph("<code>PAUSED</code>", body_style),
            Paragraph("Temporary emergency freeze.", body_style),
            Paragraph("Organizer pauses voting in case of network disruptions or security investigation. No votes accepted.", body_style)
        ],
        [
            Paragraph("<code>COMPLETED</code>", body_style),
            Paragraph("Polls closed; tallies computed.", body_style),
            Paragraph("Automatic official tally calculation. Results published immediately or on scheduled date.", body_style)
        ],
    ]
    state_table = Table(state_data, colWidths=[90, 140, 274])
    state_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e0e7ff")),
        ('BOX', (0, 0), (-1, -1), 1, BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(state_table)

    story.append(Spacer(1, 10))

    # Workflow 5 & 6
    story.append(Paragraph("3.4. Workflow 5 & 6: Candidate Configuration & Voter Roll Management", h2_style))
    story.append(Paragraph(
        "<b>Candidate Slate Setup:</b> Organizers add candidates with full legal name, political or organizational affiliation, "
        "biographical profile, and verified photo. Display order can be reordered atomically via <code>POST /api/elections/{id}/candidates/reorder/</code> "
        "or configured for randomized ballot presentation to eliminate positional bias.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Voter Roll Configuration:</b> To vote in an election, a citizen's email must exist on the election's official <code>EligibleVoter</code> roll. "
        "Organizers can add individual eligible voters or execute a <b>Bulk CSV Upload</b> (e.g. university rosters, corporate directories, or municipal registries). "
        "The system links registered user accounts with eligible records while maintaining independent participation records.",
        body_style
    ))

    # Workflow 7
    story.append(Paragraph("3.5. Workflow 7: Multi-Stage Voter Verification Gateway", h2_style))
    story.append(Paragraph(
        "Before entering the voting booth, citizens must clear the election-specific verification gate configured by the organizer:<br/>"
        "• <b>Level 1 (Email OTP):</b> A unique 6-digit challenge dispatched to the voter's registered email.<br/>"
        "• <b>Level 2 (Webcam Liveness Detection):</b> The browser captures video frames analyzed via MediaPipe/OpenCV to verify 3D human presence and prevent spoofing.<br/>"
        "• <b>Level 3 (Facial Biometric Match):</b> The citizen's live face embedding is matched against their government KYC profile photo using ArcFace (512-dimension cosine distance threshold >= 0.68).<br/>"
        "Upon completion, an encrypted, time-bounded <code>VotingAuthorizationToken</code> is issued permitting access to the polling booth.",
        body_style
    ))

    story.append(PageBreak())

    # Workflow 8
    story.append(Paragraph("3.6. Workflow 8: Secure Polling Booth & Cryptographic Ballot Casting", h2_style))
    story.append(Paragraph(
        "The voting sequence is protected by mathematical vote-secrecy and strict database concurrency controls:",
        body_style
    ))
    story.append(Paragraph(
        "1. <b>Ballot Presentation:</b> The frontend renders the ballot candidates. The UI presents clean selection buttons with a confirmation modal. "
        "No voting action or automated vote-casting is permitted via third parties or AI assistants.<br/>"
        "2. <b>Atomic Server Transaction:</b> When the voter clicks <i>Confirm & Submit Ballot</i>, the request enters an atomic database transaction "
        "(<code>transaction.atomic()</code>) with row-level locking (<code>select_for_update</code>) on the voter's receipt record.<br/>"
        "3. <b>Double-Voting Collision Defense:</b> The system verifies whether a <code>VoteReceipt</code> exists for <code>(voter_id, election_id)</code>. "
        "If a duplicate request is received concurrently, the unique database constraint collides immediately and the transaction rolls back.<br/>"
        "4. <b>Zero-Knowledge Ballot Recording:</b> The anonymous ballot is encrypted with AES-256-GCM and stored in <code>voting_ballot</code>. "
        "Crucially, the ballot record contains <b>NO voter foreign key, NO user identifier, and NO IP address</b>.<br/>"
        "5. <b>Cryptographic Receipt Generation:</b> A unique SHA-256 receipt token is computed: <code>SHA256(voter_id + election_id + cryptographic_salt)</code>. "
        "The voter receives this receipt to independently audit that their vote was included in the election tally without exposing who they voted for.",
        body_style
    ))

    # Workflow 9 & 10 & 11
    story.append(Paragraph("3.7. Workflow 9, 10 & 11: Real-Time Turnout, Tamper-Evident Auditing & Official Results", h2_style))
    story.append(Paragraph(
        "<b>Turnout Monitoring:</b> Organizers have access to live aggregated turnout graphs (percentage of registered voters who have cast ballots) "
        "without revealing candidate vote shares during polling.<br/>"
        "<b>Cryptographic Audit Trail:</b> Every critical event (election state transitions, voter additions, configuration updates, emergency pauses) "
        "is recorded in <code>AuditLog</code> with SHA-256 integrity hash chains ensuring retroactive tamper-evidence.<br/>"
        "<b>Official Tally & Reports:</b> Once the election reaches <code>COMPLETED</code> status, the tallying engine executes an automated sum of all valid ballots. "
        "Certified reports detailing participation numbers, percentage distributions, candidate rankings, and cryptographic verification seals are generated "
        "and exportable as certified PDF and CSV files.",
        body_style
    ))

    # Workflow 12
    story.append(Paragraph("3.8. Workflow 12: DigiVote AI Assistant RAG Pipeline", h2_style))
    story.append(Paragraph(
        "DigiVote features an integrated civic AI Assistant engineered to guide voters through procedures, rules, and election logistics. "
        "The assistant employs a <b>Dual-Stream Context Architecture</b> combining document knowledge retrieval with live database context:",
        body_style
    ))

    rag_steps = [
        [Paragraph("<b>Step</b>", body_bold), Paragraph("<b>Subsystem</b>", body_bold), Paragraph("<b>Operational Mechanics</b>", body_bold)],
        [
            Paragraph("1. User Query", body_style),
            Paragraph("React Frontend", body_style),
            Paragraph("User types question in AI Assistant. Query is validated (max 2000 chars, no empty input). Dispatched via POST /api/ai/chat/.", body_style)
        ],
        [
            Paragraph("2. Document RAG", body_style),
            Paragraph("Pinecone Vector DB", body_style),
            Paragraph("Query is embedded with gemini-embedding-001 (3072 dims). Pinecone queries 'digivote-docs' namespace to extract top-k relevant policy text chunks.", body_style)
        ],
        [
            Paragraph("3. Live DB Context", body_style),
            Paragraph("PostgreSQL ContextService", body_style),
            Paragraph("If election_id is passed, queries read-only database state: user eligibility, election status, start/end dates, and candidate names.", body_style)
        ],
        [
            Paragraph("4. Guardrails Synthesis", body_style),
            Paragraph("ContextBuilder", body_style),
            Paragraph("Assembles prompt with strict system instructions: prompt injection defense, strict candidate neutrality, refusal of voting persuasion.", body_style)
        ],
        [
            Paragraph("5. Answer Generation", body_style),
            Paragraph("Gemini 2.5 Flash", body_style),
            Paragraph("Synthesizes accurate civic answer with page citations. Does not recommend candidates or execute voting actions.", body_style)
        ],
    ]
    rag_table = Table(rag_steps, colWidths=[70, 110, 324])
    rag_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e0e7ff")),
        ('BOX', (0, 0), (-1, -1), 1, BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(rag_table)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 4: REST API ENDPOINTS SPECIFICATION
    # =========================================================================
    story.append(Paragraph("4. Comprehensive REST API Endpoints Specification", h1_style))
    story.append(Paragraph("All API endpoints require HTTPS and standard JSON payloads. Authenticated endpoints require a valid Bearer JWT header.", body_style))

    api_data = [
        [Paragraph("<b>Method & Endpoint</b>", body_bold), Paragraph("<b>Auth Required</b>", body_bold), Paragraph("<b>Description & Payload</b>", body_bold)],
        [
            Paragraph("<code>POST /api/auth/register/</code>", body_style),
            Paragraph("Public", body_style),
            Paragraph("Register citizen account: <code>{ username, email, password, phone }</code>.", body_style)
        ],
        [
            Paragraph("<code>POST /api/auth/login/</code>", body_style),
            Paragraph("Public", body_style),
            Paragraph("Submit credentials. Returns <code>OTP_REQUIRED</code> with challenge ID.", body_style)
        ],
        [
            Paragraph("<code>POST /api/auth/verify-otp/</code>", body_style),
            Paragraph("Pre-Auth", body_style),
            Paragraph("Validate 6-digit MFA OTP: <code>{ challenge_id, code }</code>. Returns JWT tokens.", body_style)
        ],
        [
            Paragraph("<code>GET, POST /api/elections/</code>", body_style),
            Paragraph("Authenticated", body_style),
            Paragraph("List user elections or create new draft election.", body_style)
        ],
        [
            Paragraph("<code>GET /api/elections/{id}/</code>", body_style),
            Paragraph("Authenticated", body_style),
            Paragraph("Fetch election details, rules, and candidate roster.", body_style)
        ],
        [
            Paragraph("<code>POST /api/elections/{id}/voters/bulk-upload/</code>", body_style),
            Paragraph("Creator / Admin", body_style),
            Paragraph("Upload CSV roster of eligible voter emails.", body_style)
        ],
        [
            Paragraph("<code>POST /api/elections/{id}/start/</code>", body_style),
            Paragraph("Creator / Admin", body_style),
            Paragraph("Transition election status from scheduled to active.", body_style)
        ],
        [
            Paragraph("<code>GET /api/voter/elections/{id}/eligibility/</code>", body_style),
            Paragraph("Voter", body_style),
            Paragraph("Check citizen eligibility and completed verification gates.", body_style)
        ],
        [
            Paragraph("<code>POST /api/voting/{id}/submit/</code>", body_style),
            Paragraph("Verified Voter", body_style),
            Paragraph("Submit encrypted ballot. Returns cryptographic receipt hash.", body_style)
        ],
        [
            Paragraph("<code>GET /api/results/{id}/</code>", body_style),
            Paragraph("Authenticated", body_style),
            Paragraph("View official tally breakdown and turnout statistics.", body_style)
        ],
        [
            Paragraph("<code>GET /api/ai/health/</code>", body_style),
            Paragraph("Public", body_style),
            Paragraph("Health check for Gemini and Pinecone RAG configuration.", body_style)
        ],
        [
            Paragraph("<code>POST /api/ai/chat/</code>", body_style),
            Paragraph("Authenticated", body_style),
            Paragraph("AI Assistant query: <code>{ message, election_id? }</code>. Returns answer and sources.", body_style)
        ],
    ]
    api_table = Table(api_data, colWidths=[150, 80, 274])
    api_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e0e7ff")),
        ('BOX', (0, 0), (-1, -1), 1, BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(api_table)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 5: COMPREHENSIVE AI KNOWLEDGE Q&A BANK (FOR RAG RETRIEVAL)
    # =========================================================================
    story.append(Paragraph("5. Official DigiVote Knowledge Q&A Reference", h1_style))
    story.append(Paragraph(
        "This section serves as the definitive reference manual indexed by the DigiVote AI Assistant. "
        "The questions and authoritative answers below provide exact procedural, legal, and operational guidance.",
        body_style
    ))
    story.append(Spacer(1, 6))

    qa_items = [
        (
            "Q1: What is DigiVote?",
            "DigiVote is an enterprise-grade digital voting system designed for secure, transparent, and legally sound elections. "
            "It combines strict multi-factor voter verification (email OTP, device security, and optional biometric face matching) "
            "with zero-knowledge encrypted ballot boxes. The platform guarantees voter privacy, prevents double-voting through database row locking, "
            "and provides cryptographic receipt tokens for independent verification."
        ),
        (
            "Q2: How do I register as a citizen on DigiVote?",
            "To register, navigate to the Register page, enter your full legal name, national or institutional email address, phone number, "
            "and a strong password. A confirmation email with a cryptographic activation link will be sent to your inbox. Click the link "
            "to verify your email. Once verified, you can sign in and access the Citizen Voter Portal."
        ),
        (
            "Q3: How does multi-factor authentication (MFA) work during login?",
            "When signing in, enter your email and password. If your credentials are correct, DigiVote generates a secure 6-digit One-Time Password (OTP) "
            "and dispatches it to your registered email address. Enter the OTP code within 5 minutes to complete authentication. "
            "You can also check 'Remember this device' to simplify subsequent logins on trusted personal computers."
        ),
        (
            "Q4: How do I know whether I am eligible to vote in an election?",
            "Eligibility is determined by the official voter roll configured by the election organizer. When you log in, go to 'Available Elections'. "
            "The system automatically compares your registered email with the election's eligible voter roster. Elections where you are eligible "
            "display an 'Eligible Voter' green badge. You can also ask the DigiVote Assistant: 'Am I eligible to vote in this election?' "
            "while viewing an election to receive an instant, personalized eligibility confirmation."
        ),
        (
            "Q5: How does voter verification work before voting?",
            "Before voting, you must complete the verification requirements established for that election. Depending on the organizer's configuration, "
            "this may include: (1) An email OTP challenge, (2) A webcam liveness scan to verify physical presence, or (3) Biometric facial matching "
            "comparing your live webcam photo to your registered profile photo using the ArcFace neural pipeline. Once verified, you are authorized "
            "to enter the Voting Booth."
        ),
        (
            "Q6: How do I cast my vote in the Voting Booth?",
            "Once identity verification is complete, enter the Voting Booth for your active election. Review the list of official candidates, "
            "their affiliations, and biographies. Select your chosen candidate and click 'Confirm & Submit Ballot'. A modal will request your final "
            "confirmation. Once submitted, the system records your anonymous ballot and issues an immutable cryptographic SHA-256 voting receipt."
        ),
        (
            "Q7: Can anyone, including administrators or organizers, see who I voted for?",
            "No. DigiVote enforces absolute ballot secrecy through its decoupled zero-knowledge architecture. When your ballot is cast, "
            "it is encrypted with AES-256-GCM and stored in the ballot box without any user ID, username, IP address, or timestamp linkage. "
            "Your receipt proves that a ballot was cast from your account, but it contains no data indicating which candidate you selected. "
            "Even system administrators with direct database access cannot correlate voters to their choices."
        ),
        (
            "Q8: What happens if someone tries to vote twice?",
            "Double voting is mathematically and architecturally prevented by DigiVote. When a vote submission begins, the backend opens an atomic "
            "transaction with row-level locking on your voter receipt record. If a voter receipt already exists or if multiple concurrent requests "
            "are fired simultaneously, the PostgreSQL unique database constraint on (voter_id, election_id) triggers a collision, rolls back the transaction, "
            "and returns an HTTP 400 'Double Voting Detected' security rejection."
        ),
        (
            "Q9: Can I change my vote after submitting?",
            "By default, votes are final and immutable once submitted to preserve election finality. However, if an election organizer explicitly enables "
            "the 'Allow Vote Change' rule in the election settings before polling opens, voters may update their vote while the election remains Active. "
            "When vote changing is disabled, a cast ballot cannot be modified or replaced under any circumstance."
        ),
        (
            "Q10: What is the Voting Receipt and how do I use it?",
            "A Voting Receipt is an SHA-256 cryptographic hash provided upon ballot submission (e.g., 7A3F9C1E...B402). It is uniquely derived from "
            "your voter identifier, the election ID, and a high-entropy salt. You can save or print this receipt to verify that your ballot was "
            "included in the official tally audit logs after the election closes without compromising ballot secrecy."
        ),
        (
            "Q11: How do election organizers create and manage an election?",
            "Organizers navigate to 'My Elections' and click 'Create Election'. They enter the title, description, and election category. "
            "Next, they configure the candidate slate (uploading bios and official photos), upload the eligible voter roll via CSV bulk ingestion, "
            "and establish verification gates (Email OTP, Webcam, Biometrics) and results visibility schedules. Once configured, the election is "
            "scheduled and transitions automatically to Active at the designated start time."
        ),
        (
            "Q12: How are election results published and verified?",
            "When an election reaches its scheduled end time or when an organizer manually completes polling, the election transitions to Completed. "
            "The tallying engine automatically aggregates the anonymous ballots. Depending on the election rules, results are displayed immediately, "
            "scheduled for a future ceremony, or manually published by the administrator. Certified reports with audit log signatures can be exported "
            "as PDF and CSV documents."
        ),
        (
            "Q13: Why does the DigiVote Assistant refuse to recommend candidates?",
            "The DigiVote AI Assistant is bound by strict civic neutrality guardrails. It is programmed to assist citizens with voting procedures, "
            "eligibility verification, election schedules, and technical support. It will never express an opinion, rank candidates, recommend who to vote for, "
            "or participate in political persuasion. If asked who to vote for, it will neutrally direct you to review candidate biographies in the Voting Booth."
        ),
        (
            "Q14: Can the AI Assistant cast a vote on my behalf?",
            "No. The AI Assistant has no voting capabilities or execution authority. It cannot cast ballots, confirm votes, change election configurations, "
            "or modify voter records. All voting actions must be performed directly and intentionally by the verified citizen inside the Voting Booth."
        ),
    ]

    for q, a in qa_items:
        story.append(Paragraph(q, qa_q_style))
        story.append(Paragraph(a, qa_a_style))

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated comprehensive DigiVote PDF: {filename}")


if __name__ == '__main__':
    target_path = Path("d:/DigiVoting/docs/DigiVote_Comprehensive_System_Guide.pdf")
    target_path.parent.mkdir(parents=True, exist_ok=True)
    build_pdf(str(target_path))

    # Also copy to root directory for easy access
    root_copy = Path("d:/DigiVoting/DigiVote_Comprehensive_System_Guide.pdf")
    import shutil
    shutil.copy(target_path, root_copy)
    print(f"Copied PDF to root: {root_copy}")
