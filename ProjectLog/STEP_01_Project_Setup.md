# 🛡️ SmartSec: AI-Based Cyber Defense Platform
## 📋 Project Development Log — Step 1: Project Setup & Basic FastAPI App

---

> **Date:** 2026-04-25
> **Step:** 1 of (estimated) 10
> **Status:** ✅ Completed
> **Developer:** Learning with AI Mentor (Antigravity)

---

## 📌 What This Step Was About

This was the **foundation step** of the entire SmartSec project.
Before writing any real security or AI logic, we set up:

1. The **folder structure** (the blueprint of the project)
2. The **Python dependencies** (tools/libraries we'll need)
3. The **environment configuration** (secret keys, settings)
4. The **FastAPI application** (our backend server — the brain of SmartSec)

Think of this like laying the concrete foundation before building a house.
Without a solid structure, everything built on top would be unstable.

---

## 🗂️ Folder Structure Created

```
SmartSec AI-Based Cyber Defense Platform/
│
├── 📁 backend/                      ← All Python/FastAPI server code
│   ├── 📄 main.py                   ← Application entry point
│   ├── 📄 requirements.txt          ← Python package dependencies
│   ├── 📄 .env                      ← Environment variables (secrets)
│   │
│   ├── 📁 routers/                  ← URL route handlers (future: auth, IDS, phishing)
│   │   └── 📄 __init__.py
│   │
│   ├── 📁 models/                   ← Database table schemas (future: User, Alert, etc.)
│   │   └── 📄 __init__.py
│   │
│   ├── 📁 services/                 ← Business logic layer (future: ML, scoring)
│   │   └── 📄 __init__.py
│   │
│   └── 📁 ml_models/                ← Trained AI model files (future: .pkl files)
│
├── 📁 frontend/                     ← React app (to be built in a later step)
│
└── 📁 ProjectLog/                   ← 📖 THIS FOLDER — development logs per step
    └── 📄 STEP_01_Project_Setup.md  ← You are reading this file
```

---

## 📦 Dependencies Installed (`requirements.txt`)

| Package | Version | Purpose |
|---|---|---|
| `fastapi` | ≥0.111.0 | The web framework — creates our API server |
| `uvicorn` | ≥0.30.1 | The ASGI server — runs FastAPI in production & dev |
| `python-jose[cryptography]` | ≥3.3.0 | JWT token creation & verification (for login auth) |
| `passlib[bcrypt]` | ≥1.7.4 | Password hashing (never store plain text passwords!) |
| `python-multipart` | ≥0.0.9 | Handles file uploads and HTML form data |
| `sqlalchemy` | ≥2.0.30 | ORM — lets us talk to our database using Python objects |
| `pydantic` | ≥2.7.1 | Data validation — ensures API inputs are the right type |
| `scikit-learn` | ≥1.5.0 | ML library — for Isolation Forest (IDS) and phishing detection |
| `numpy` | ≥2.0.0 | Numerical computing — required by scikit-learn |
| `requests` | ≥2.32.3 | Makes HTTP requests (e.g., to external services) |
| `python-dotenv` | ≥1.0.1 | Loads `.env` file values into Python environment |

### ⚠️ Issue Encountered & Fixed
- **Problem:** The initial `requirements.txt` had strict version pins (e.g., `scikit-learn==1.4.2`, `numpy==1.26.4`) that were incompatible with **Python 3.13/3.14**.
- **Root Cause:** Python 3.13 is newer than what those locked versions were built for. The pre-built wheels didn't exist, and building from source failed.
- **Fix:** Changed `==` to `>=` (minimum version) so pip could download the latest compatible pre-built wheels.
- **Lesson:** When working with Python 3.13+, always use flexible version specifiers or check PyPI for available wheels.

---

## 🔐 Environment Configuration (`.env`)

```env
SECRET_KEY=smartsec-super-secret-key-change-in-production-2024
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DATABASE_URL=sqlite:///./smartsec.db
APP_NAME=SmartSec
APP_VERSION=1.0.0
DEBUG=True
```

### Why `.env` Matters
- **`SECRET_KEY`**: Used to sign JWT tokens. If someone gets this, they can forge login tokens. **Never commit this to GitHub.**
- **`ALGORITHM`**: HS256 = HMAC with SHA-256. This is the standard JWT signing algorithm.
- **`ACCESS_TOKEN_EXPIRE_MINUTES`**: JWT tokens expire after 30 minutes for security.
- **`DATABASE_URL`**: SQLite file path. SQLite is a file-based database — no separate server needed. Perfect for development.
- **`python-dotenv`** reads this file and injects these values into the Python `os.environ` dictionary at runtime.

---

## 📄 File-by-File Explanation

### `backend/main.py` — The Application Entry Point

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()  # Load .env file into environment
```

**What this does:** Imports the tools we need, then loads our `.env` file so `os.getenv()` can read values like `SECRET_KEY`.

---

```python
app = FastAPI(
    title="SmartSec",
    description="🛡️ AI-Based Cyber Defense Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)
```

**What this does:** Creates the FastAPI application object. This is like turning the power on.
- `docs_url="/docs"` → Auto-generates a beautiful Swagger UI at `http://localhost:8000/docs`
- `redoc_url="/redoc"` → Alternative documentation UI

---

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**What this does:** Adds CORS (Cross-Origin Resource Sharing) support.
- **Why needed?** Browsers have a security feature that blocks JavaScript on one domain from fetching data from another domain/port. Our React app (port 3000 or 5173) needs to call our API (port 8000).
- Without this middleware, **every API call from the frontend would be blocked** by the browser.
- `allow_origins` = the list of frontend URLs that are allowed to call us.

---

```python
@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "🛡️ SmartSec Platform is running!",
        "status": "online",
        ...
    }
```

**What this does:** Defines a route. When someone visits `GET /`, this function runs and returns a JSON response.
- `@app.get("/")` is a **decorator** — it tells FastAPI "this function handles GET requests to /"
- `async def` means this is an **asynchronous function** — it won't block the server while waiting
- Returns a Python `dict`, which FastAPI automatically converts to **JSON**

---

```python
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "modules": { ... }
    }
```

**What this does:** A dedicated health check endpoint. In real production systems, tools like Kubernetes or load balancers ping `/health` to know if the server is alive and should receive traffic.

---

### `backend/routers/__init__.py`, `models/__init__.py`, `services/__init__.py`

These are empty (except a comment) but **required by Python**.
In Python, a folder is only treated as a **package** (importable module) if it contains an `__init__.py` file.
Without them, `from backend.routers import auth` would fail with an `ImportError`.

---

## 🚀 How to Run the Server

```bash
# Navigate to backend folder
cd "SmartSec AI-Based Cyber Defense Platform/backend"

# Install all dependencies (only needed once)
py -m pip install -r requirements.txt

# Start the development server
py -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### What the flags mean:
| Flag | Meaning |
|---|---|
| `main:app` | Load the `app` object from `main.py` |
| `--reload` | Auto-restart when code changes (great for development) |
| `--host 0.0.0.0` | Listen on all network interfaces (not just localhost) |
| `--port 8000` | Use port 8000 |

---

## 🌐 Available Endpoints After This Step

| URL | Method | What it returns |
|---|---|---|
| `http://localhost:8000/` | GET | Platform status message |
| `http://localhost:8000/health` | GET | Health status of all 4 modules |
| `http://localhost:8000/docs` | GET | Interactive Swagger UI (API explorer) |
| `http://localhost:8000/redoc` | GET | Alternative API documentation |

---

## 🧠 Concepts Learned in This Step

| Concept | Simple Explanation |
|---|---|
| **FastAPI** | A Python web framework for building fast APIs with automatic docs |
| **API** | A "waiter" between frontend and backend — takes requests, returns data |
| **REST API** | An API that uses HTTP methods (GET, POST, PUT, DELETE) |
| **JSON** | JavaScript Object Notation — the standard data format APIs use |
| **Endpoint / Route** | A specific URL that does a specific job (e.g., `/health`) |
| **Middleware** | Code that runs on every request before it hits your route |
| **CORS** | Browser security policy — controls which origins can call your API |
| **Uvicorn** | An ASGI server — the engine that actually runs the FastAPI app |
| **Environment Variables** | Config values stored outside code (in `.env`) for security |
| **JWT** | JSON Web Token — a secure way to prove identity after login |
| **`__init__.py`** | Makes a folder a Python package (importable module) |
| **`async def`** | Non-blocking function — server can handle other requests while waiting |

---

## 🔮 What Comes Next (Step 2)

**Database Setup + User Model**

In the next step we will:
1. Set up SQLite database with SQLAlchemy
2. Create the `User` table (id, username, email, hashed_password, etc.)
3. Create Pydantic schemas for request/response validation
4. Create a `database.py` configuration file
5. Initialize the database tables on startup

This is the foundation that **all other modules depend on** — authentication, IDS logs, and phishing scan history all need a database.

---

## 📊 Project Progress Tracker

| Step | Topic | Status |
|---|---|---|
| ✅ Step 1 | Project Setup & Basic FastAPI | **Done** |
| ⏳ Step 2 | Database Setup + User Model | Next |
| ⬜ Step 3 | User Authentication (JWT Login) | Pending |
| ⬜ Step 4 | AI Intrusion Detection System (IDS) | Pending |
| ⬜ Step 5 | Phishing URL Detector | Pending |
| ⬜ Step 6 | Risk Scoring Engine | Pending |
| ⬜ Step 7 | React Frontend Setup | Pending |
| ⬜ Step 8 | Dashboard UI | Pending |
| ⬜ Step 9 | Frontend ↔ Backend Integration | Pending |
| ⬜ Step 10 | Final Polish & Testing | Pending |

---

*Log created by: Antigravity AI Mentor*
*Project: SmartSec — AI-Based Cyber Defense Platform*
