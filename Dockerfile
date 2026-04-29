# Multi-stage build: frontend (node) + backend (python) in one image.
# FastAPI serves the built SPA via StaticFiles. No separate nginx needed.

# ── Stage 1: build frontend ──────────────────────────────────────────
FROM node:20-alpine AS frontend
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ── Stage 2: python runtime ──────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
		gcc \
		postgresql-client \
	&& rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir \
		--timeout 300 \
		--retries 10 \
		-r requirements.txt

COPY backend/ ./backend/
COPY alembic/ ./alembic/
COPY alembic.ini ./

# Built SPA from stage 1
COPY --from=frontend /app/frontend/dist ./frontend/dist

ENV PYTHONUNBUFFERED=1 \
	PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
