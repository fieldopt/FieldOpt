# Architecture

## System Overview

FieldOpt is a modern field service management (FSM) dispatch console with three main components:

### 1. Backend (FastAPI)
- RESTful API for all operations
- Async SQLAlchemy for database access
- Real-time capability foundation (WebSockets ready for v0.0.8)
- Role-based access control (coming v0.0.9)

### 2. Frontend (React + Vite)
- Real-time technician & job grids (AG Grid)
- Drag-drop job assignment
- Geographic job mapping (Leaflet)
- Timeline visualization
- Advanced search & filtering
- Desktop-first, mobile-ready in v0.0.8+

### 3. Database (PostgreSQL)
- Technician records & skill assignments
- Job registry & history
- Assignment tracking
- Dispatch history (for ML training in v0.0.8+)

---

## Data Flow

```
User Action (UI)
    ↓
Frontend sends API request
    ↓
Backend validates & processes
    ↓
Database updates
    ↓
Backend responds with updated data
    ↓
Frontend updates UI in real-time
```

---

## Tech Stack

### Backend
- **Framework:** FastAPI (async)
- **Database:** PostgreSQL 15
- **ORM:** SQLAlchemy (async)
- **Driver:** asyncpg
- **Validation:** Pydantic
- **Server:** Uvicorn
- **HTTP Client:** httpx (async)

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Data Grid:** AG Grid Community
- **Maps:** Leaflet
- **Drag & Drop:** @dnd-kit
- **UI Components:** react-contexify (context menus)
- **HTTP Client:** Axios
- **Styling:** Handwritten CSS (no frameworks)

### Infrastructure
- **Hosting:** AWS EC2 (us-east-1)
- **Containerization:** Docker & Docker Compose
- **CI/CD:** GitHub Actions (planned)
- **Reverse Proxy:** Nginx
- **SSL:** Let's Encrypt (Certbot)

### Development
- **Languages:** Python 3.11, JavaScript (ES6+)
- **Code Style:** Tabs (not spaces)
- **Git:** Conventional commits
- **License:** AGPL-3.0

---

## Project Structure

```
fieldopt/
├── backend/
│   ├── api/
│   │   ├── main.py                 (FastAPI app entry)
│   │   ├── routes/                 (API endpoints)
│   │   └── v1/                     (API v1 routes)
│   ├── database/
│   │   ├── models.py               (SQLAlchemy models)
│   │   ├── connection.py           (DB connection setup)
│   │   ├── reset_db.py             (Database reset script)
│   │   └── seeds/                  (Seed data files)
│   ├── config.py                   (Settings & environment)
│   ├── requirements.txt            (Python dependencies)
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── api/                    (API client)
│   │   ├── components/             (React components)
│   │   ├── styles/                 (CSS)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/                     (Static assets)
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── website/                        (Marketing site)
│   ├── index.html
│   ├── styles.css
│   └── assets/
│
├── wiki/                           (Documentation)
│   ├── Home.md
│   ├── Getting-Started.md
│   ├── Architecture.md
│   ├── Features.md
│   ├── API-Documentation.md
│   ├── Deployment.md
│   └── Contributing.md
│
├── deploy/
│   └── nginx.conf                  (Nginx configuration)
│
├── docker-compose.yml              (Local development)
├── docker-compose.prod.yml         (Production)
├── Dockerfile                      (Backend image)
└── .github/
    └── workflows/                  (CI/CD pipelines)
```

---

## Key Design Decisions

### Async Throughout
- FastAPI with async/await for concurrency
- asyncpg driver for non-blocking database I/O
- Designed for real-time updates (WebSockets in v0.0.8)

### AG Grid for Data
- Enterprise-grade grids (technicians, jobs)
- Efficient rendering, supports 10k+ rows
- Built-in filtering, sorting, selection
- Customizable columns and cell renderers

### Handwritten CSS
- No framework dependencies (Tailwind, Bootstrap)
- Full control over design
- Lighter bundle size
- Custom styling matches app aesthetic

### AGPL-3.0 License
- Open-source foundation
- Commercial dual-license support
- Community contributions protected

---

## Component Breakdown

### Backend Routes

**API Versions:**
- `/api/v1/` — Current version

**Endpoints:**
- `/technicians/` — Technician CRUD
- `/jobs/` — Job CRUD
- `/assignments/` — Assignment operations
- `/routing/` — Auto-routing logic

### Frontend Components

**Main Views:**
- Technician grid (left pane)
- Job grid (center pane)
- Timeline (right pane)
- Map (floating window)

**Modal/Dialogs:**
- Search windows
- Filter window
- Context menus (right-click)

### Database Schema

**Tables:**
- `technicians` — Tech info, skills, status
- `jobs` — Job details, requirements, status
- `assignments` — Job-to-tech mappings
- `dispatch_history` — Audit log (for ML training)

---

## Scalability Considerations

### Current (v0.0.7)
- ~100-200 technicians
- ~500-1000 jobs per day
- Single PostgreSQL instance sufficient

### Future (v0.0.8+)
- Real-time WebSocket updates (horizontal scaling)
- Redis for caching & session store
- Read replicas for analytics
- ML model training on dispatch history

---

## Security

### Currently (Development)
- No authentication (open demo)
- CORS configured for localhost

### Coming (v0.0.9)
- JWT token authentication
- Role-based access control (Dispatcher, Supervisor, Manager, Admin)
- API key authentication for integrations
- Rate limiting

---

## Performance Targets

- **API Response Time:** <100ms (p95)
- **Grid Render:** <500ms for 1000 rows
- **Map Load:** <1s
- **Assignment Operation:** <200ms (single + batch)

---

## Development Workflow

1. Create feature branch: `git checkout -b feat/your-feature`
2. Make changes following code style
3. Test locally
4. Commit: `git commit -m "feat(scope): message"`
5. Push & create PR
6. After merge, tag release: `git tag -a v0.0.X`

See [Contributing](Contributing) for details.
