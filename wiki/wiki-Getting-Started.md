# Getting Started

## Quick Start (5 minutes)

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15
- Docker (recommended)

### Clone & Install

```bash
git clone https://github.com/zblauser/fieldopt.git
cd fieldopt

# Backend
pip install -r requirements.txt

# Frontend
npm install --prefix frontend
```

### Run Locally

```bash
# Terminal 1: Backend
python -m uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
npm run dev --prefix frontend

# Terminal 3: Database (Docker)
docker run -d --name fieldopt-db -e POSTGRES_PASSWORD=fieldopt -p 5432:5432 postgres:15
```

Access at: **http://localhost:5173**

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/zblauser/fieldopt.git
cd fieldopt
```

### 2. Backend Environment

Create `.env` in `/backend`:

```env
DATABASE_URL=postgresql://fieldopt:fieldopt@localhost:5432/fieldopt
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=true
CORS_ORIGINS=["http://localhost","http://127.0.0.1","http://localhost:5173"]
LOG_LEVEL=INFO
DEBUG=true
```

### 3. Database Setup

Using Docker:

```bash
docker run -d \
  --name fieldopt-postgres \
  -e POSTGRES_USER=fieldopt \
  -e POSTGRES_PASSWORD=fieldopt \
  -e POSTGRES_DB=fieldopt \
  -p 5432:5432 \
  postgres:15-alpine
```

Initialize seed data:

```bash
cd backend
python -m backend.database.reset_db
```

### 4. Backend Installation

```bash
pip install -r requirements.txt
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be at: **http://localhost:8000**

### 5. Frontend Installation

```bash
cd frontend
npm install
npm run dev
```

Frontend will be at: **http://localhost:5173**

---

## Running the Demo

### Live Demo (24/7)

Visit: **https://demo.fieldopt.dev**

The demo runs on AWS EC2 with:
- Fresh seed data (jazz musicians, NYC venues)
- Database resets every hour
- Full feature access
- Real dispatch console in action

### Local Demo with Docker Compose

```bash
npm run build --prefix frontend
docker compose up
```

Access at: **http://localhost**

---

## Seed Data

The demo and local setup come with sample data:

### Technicians (Jazz Musicians)
- Miles Davis
- Chet Baker
- John Coltrane
- Thelonious Monk
- Billie Holiday
- And more...

### Jobs (NYC Venues)
- Blue Note
- Village Vanguard
- Apollo Theater
- Carnegie Hall
- Lincoln Center
- And more...

### Skills
Each technician has skills assigned: install, repair, maintenance, disconnect, service_change, inspection

---

## Troubleshooting

### "Cannot connect to database"
- Make sure PostgreSQL is running: `docker ps | grep postgres`
- Check `DATABASE_URL` in `.env` is correct

### "Port 5173 already in use"
```bash
# Kill the process using that port
lsof -i :5173
kill -9 <PID>
```

### "Module not found" error
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
npm install --prefix frontend
```

### Frontend shows blank page
- Clear browser cache (Cmd+Shift+Delete)
- Check DevTools Console for errors
- Make sure backend is running on port 8000

---

## Next Steps

- Explore the [Features](Features) to see what you can do
- Check out the [API Documentation](API-Documentation) if integrating
- Read [Architecture](Architecture) to understand how it works
- See [Deployment](Deployment) to get it running in production
