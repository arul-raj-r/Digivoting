# Digital Election & Voting Management Platform (Academic Prototype)

A secure, secret, and responsive Digital Election & Voting Management Platform built using React (Vite + TypeScript) on the frontend, and Django REST Framework on the backend, backed by PostgreSQL.

---

## 1. Tech Stack Overview

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, Zustand, Axios, React Router, Recharts, Lucide Icons.
- **Backend**: Python 3, Django, Django REST Framework, SimpleJWT (JSON Web Tokens).
- **Database**: PostgreSQL (Supabase / Local container).
- **MFA Layer**: Hashed Password + 6-digit verification code (OTP).
- **Biometrics (Demo)**: Web-camera capture frame visual auditing with simulated browser-native liveness/blink checks.

---

## 2. Folder Structure

```
d:/DigiVoting/
├── backend/
│   ├── authentication/   # Custom user, OTP verification, WebAuthn schemas, audit log ledger
│   ├── voters/           # Voter registration profiles, constituency associations
│   ├── elections/        # Elections CRUD, candidate setups, decoupled ballot counts, results analytics
│   ├── config/           # Global settings, CORS definitions, and main URLs routing
│   ├── seed.py           # Demo data seeding script
│   └── requirements.txt  # Python package requirements
├── frontend/
│   ├── src/
│   │   ├── components/   # Layout wrapper, ProtectedRoute wrappers
│   │   ├── store/        # Zustand state stores (global authentication, role sessions)
│   │   ├── utils/        # Axios API client setup
│   │   ├── pages/        # Landing page, Login, Register, Dashboards (Voter, Admin, Results)
│   │   └── index.css     # Tailwind v4 import stylesheet and theme parameters
│   └── package.json      # Node packages config
├── docs/
│   ├── README.md         # Setup and run guide
│   ├── ARCHITECTURE.md   # Vote secrecy & Double-voting prevention designs
│   ├── DATABASE.md       # Database tables schema details
│   ├── SECURITY.md       # Security audits, OTP throttling limits, and rate limits
│   └── TESTING.md        # Concurrency verification test scripts
└── docker-compose.yml    # Development environment orchestration
```

---

## 3. Quick Start (Local Run)

### Method A: Running via Docker Compose (Recommended)
Make sure you have Docker installed and running, then execute in the root workspace folder:
```bash
docker-compose up --build
```
This builds and initializes:
1. `db`: PostgreSQL container on port `5432`.
2. `backend`: Runs migrations, seeds fake data, and starts dev server on `http://localhost:8000`.
3. `frontend`: Installs modules and hosts the React application on `http://localhost:5173`.

### Method B: Manual Standalone Run (Offline/No Docker)

#### 1. Setup Backend APIs:
```bash
cd backend
python -m venv venv
# Windows powershell:
.\venv\Scripts\Activate.ps1
# Install packages:
pip install -r requirements.txt
# Run migrations:
python manage.py migrate
# Seed demo dataset:
python seed.py
# Start server:
python manage.py runserver
```
*Note: OTP verification codes print directly to the command terminal output screen.*

#### 2. Setup Frontend UI:
Open a separate terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## 4. Default Seed Credentials (Fake Data)

- **Administrator**:
  - Username: `admin`
  - Password: `password123`
- **Verified Voter (Chennai Central)**:
  - Username: `voter1`
  - Password: `password123`
- **Unverified Voter (Madurai North)**:
  - Username: `voter2`
  - Password: `password123`
- **Verified Voter (Coimbatore South)**:
  - Username: `voter3`
  - Password: `password123`
