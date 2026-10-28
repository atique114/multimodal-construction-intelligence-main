# Sitewise — Multimodal Construction Intelligence Platform

Skill Wallet Capstone Project 1. A full-stack construction decision-support app built with **FastAPI, React, TypeScript, and Vite**. Sitewise combines image screening, structured project planning, real-estate valuation estimates, and weather-aware daily protocols. It uses no external database.

## Features

- **Site safety and PPE audit:** JPG/PNG/WEBP upload, optional site context, PPE checklist (helmet, high-visibility vest, steel-toe boots, harness), visible hazards, severity, remedies, score, and JSON export.
- **Crack diagnostics:** defect category, rough width estimate, severity, possible causes, urgency, engineer-selected repair considerations, and JSON export.
- **Planning and valuation:** structure type, floor area, Indian location tier, city, and completion inputs; INR project budget, capex incurred, indicative property valuation, steel/cement planning quantities, milestone progress, and a phase-by-phase estimated task schedule.
- **Architectural visualization prompt:** creates a detailed conceptual rendering prompt to copy into an image tool; the app does not make an unapproved third-party image request.
- **Daily site assistant:** selectable high wind, heavy rain, extreme heat, and normal protocols, plus multi-turn construction Q&A.
- **Demo mode:** UI and calculations work without a Gemini key. Image reports are clearly labeled demonstrations and are not derived from uploaded images.
- **JSON contracts:** Pydantic response models give the frontend predictable report structures.

## Repository layout

```text
.
├── backend/
│   ├── app/                 # FastAPI routes, AI client, schemas, planning service
│   ├── tests/               # API and calculation checks
│   ├── .env.example
│   ├── Dockerfile
│   ├── requirements.txt
│   └── requirements-dev.txt
├── frontend/
│   ├── src/                 # React/TypeScript application and API client
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
└── README.md
```

## Requirements

- Python 3.9 or newer
- Node.js 18 or newer and npm
- Optional: Docker Desktop / Docker Engine
- Optional for live AI: a Google Gemini API key

## Run locally

### 1. Start the backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
# Add GEMINI_API_KEY to backend/.env to enable Gemini; leave blank for demo mode.
uvicorn app.main:app --reload --port 8000
```

The API is at `http://localhost:8000`; interactive API docs are at `http://localhost:8000/docs`.

### 2. Start the React frontend

In a second terminal, from the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to the local FastAPI backend. For another backend address, copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL`.

## Configure Gemini securely

Set `GEMINI_API_KEY` on the **backend only**. The browser never receives the key. For local development use `backend/.env` (ignored by Git). For hosting, set it in the backend service's secret/environment settings. Do not commit `.env` files or paste keys into frontend variables. `GEMINI_MODEL` defaults to `gemini-3.6-flash` and can be overridden on the backend.

Without a key, safety/crack endpoints return labeled demonstration examples and the assistant gives a demo response. A configured but invalid/unavailable key returns a visible error; the app does not disguise API failures as successful analysis.

## Run checks

Backend functional checks:

```powershell
cd backend
python -m pip install -r requirements-dev.txt
python -m pytest
```

Frontend type check and production build:

```powershell
cd frontend
npm install
npm run build
```

## Deploy with Docker

From the repository root, set `GEMINI_API_KEY` as an environment variable if live AI is wanted, then run:

```powershell
docker compose up --build
```

Open `http://localhost:8080`. Nginx serves the built React app and proxies `/api` requests to FastAPI. The backend is not exposed directly to the public host port in this local compose setup. For cloud deployment, deploy the backend and static frontend separately, configure `GEMINI_API_KEY` on the backend, set `FRONTEND_ORIGINS` to the exact frontend origin, and set `VITE_API_URL` during the frontend build if it is not served behind the same-origin `/api` proxy.

## API routes

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API readiness and AI configuration status |
| POST | `/api/safety/analyze` | Multipart image + context → PPE and hazard report |
| POST | `/api/cracks/analyze` | Multipart image + context → defect screening report |
| POST | `/api/planning/estimate` | Project inputs → INR budget, quantities, and valuation |
| POST | `/api/visualization/prompt` | Project inputs → conceptual rendering prompt |
| POST | `/api/assistant/chat` | Chat message and history → construction guidance |

## Assumptions and limitations

- Cost rates, location multipliers, asset values, and material intensities in `backend/app/planning.py` are illustrative placeholders. Replace them with a local schedule of rates, BOQ, structural design, and verified market comparables.
- Width estimates from a photo are approximate; image screening cannot assess crack movement, structural capacity, hidden site conditions, PPE certification, or full code compliance.
- The weather selector is manual; this project does not fetch a live weather forecast.
- AI findings are screening suggestions, not engineering reports, regulatory determinations, safety certification, or investment advice. A competent safety professional and licensed structural engineer must make site-specific decisions.

## Prepare for GitHub

Create a new empty GitHub repository, then from this project directory:

```powershell
git init
git add .
git commit -m "Build Sitewise construction intelligence platform"
git branch -M main
git remote add origin https://github.com/<your-account>/<your-repository>.git
git push -u origin main
```

Confirm `backend/.env` is not staged. The repository `.gitignore` excludes `.env`, virtual environments, caches, and build outputs.
