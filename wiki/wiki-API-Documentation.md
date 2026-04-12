# API Documentation

Complete reference for all FieldOpt API endpoints.

Base URL: `http://localhost:8000/api/v1`

---

## Authentication

Currently: **No authentication** (development mode)

Coming in v0.0.9: JWT tokens and role-based access control

---

## Technician Endpoints

### GET /technicians/
List all technicians

**Response:**
```json
[
  {
    "id": 1,
    "name": "Miles Davis",
    "status": "available",
    "phone": "555-0101",
    "skills": ["install", "repair"],
    "capacity": 4,
    "current_workload": 2
  }
]
```

### GET /technicians/{id}
Get a specific technician by ID

**Response:**
```json
{
  "id": 1,
  "name": "Miles Davis",
  "status": "available",
  "phone": "555-0101",
  "skills": ["install", "repair"],
  "capacity": 4,
  "current_workload": 2
}
```

### POST /technicians/
Create a new technician

**Request:**
```json
{
  "name": "John Coltrane",
  "phone": "555-0102",
  "status": "available",
  "skills": ["repair", "maintenance"]
}
```

**Response:** Created technician object (HTTP 201)

### PATCH /technicians/{id}/status
Update technician status

**Request:**
```json
{
  "status": "on_break"
}
```

Valid statuses: `available`, `on_break`, `assigned`, `off_duty`

### PATCH /technicians/{id}/location
Update technician location

**Request:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

---

## Job Endpoints

### GET /jobs/
List all jobs with optional filters

**Query parameters:**
- `scheduled_date` — YYYY-MM-DD format
- `status` — pending, assigned, in_progress, completed, failed
- `type` — install, repair, maintenance, disconnect, service_change, inspection

**Example:**
```
GET /jobs/?scheduled_date=2026-04-15&status=pending
```

**Response:**
```json
[
  {
    "id": 1,
    "type": "install",
    "customer": "Acme Corp",
    "address": "123 Main St, NYC",
    "skills_required": ["install"],
    "status": "pending",
    "scheduled_date": "2026-04-15",
    "time_slot": "08:00-12:00",
    "assigned_technician": null
  }
]
```

### GET /jobs/{id}
Get a specific job

### POST /jobs/
Create a new job

**Request:**
```json
{
  "type": "install",
  "customer": "Acme Corp",
  "address": "123 Main St, NYC",
  "scheduled_date": "2026-04-15",
  "time_slot": "08:00-12:00",
  "skills_required": ["install", "service_change"]
}
```

### PATCH /jobs/{id}
Update job details

**Request:**
```json
{
  "status": "in_progress",
  "customer": "Updated Name"
}
```

### POST /jobs/{id}/start
Mark job as in_progress

### POST /jobs/{id}/complete
Mark job as completed

### POST /jobs/{id}/cancel
Mark job as cancelled

### GET /jobs/summary
Get summary statistics

**Response:**
```json
{
  "total_jobs": 42,
  "pending": 15,
  "assigned": 18,
  "in_progress": 5,
  "completed": 4,
  "failed": 0
}
```

---

## Assignment Endpoints

### POST /assignments/
Create a single assignment (assign job to tech)

**Request:**
```json
{
  "job_id": 1,
  "technician_id": 1
}
```

**Response:**
```json
{
  "id": 1,
  "job_id": 1,
  "technician_id": 1,
  "assigned_at": "2026-04-11T14:30:00Z"
}
```

### POST /assignments/batch-assign
Assign multiple jobs to one technician

**Request:**
```json
{
  "job_ids": [1, 2, 3, 4],
  "technician_id": 1
}
```

**Response:**
```json
{
  "assigned_count": 4,
  "assignments": [
    { "job_id": 1, "technician_id": 1 },
    { "job_id": 2, "technician_id": 1 },
    { "job_id": 3, "technician_id": 1 },
    { "job_id": 4, "technician_id": 1 }
  ]
}
```

### POST /assignments/batch-unassign
Unassign multiple jobs

**Request:**
```json
{
  "job_ids": [1, 2, 3]
}
```

### POST /assignments/unassign
Unassign a single job

**Request:**
```json
{
  "job_id": 1
}
```

### POST /assignments/reassign
Reassign job to a different tech

**Request:**
```json
{
  "job_id": 1,
  "new_technician_id": 2
}
```

### GET /assignments/technician/{id}
Get all assignments for a technician

**Response:**
```json
[
  {
    "job_id": 1,
    "technician_id": 5,
    "assigned_at": "2026-04-11T08:00:00Z"
  }
]
```

### GET /assignments/job/{id}
Get assignment for a job

---

## Routing Endpoints

### POST /routing/auto-route
Find the best technician for a job

**Request:**
```json
{
  "job_id": 1
}
```

**Response:**
```json
{
  "job_id": 1,
  "recommended_technician": {
    "id": 2,
    "name": "Chet Baker",
    "skills": ["install", "repair"],
    "capacity_available": true,
    "match_score": 0.95
  }
}
```

### GET /routing/best-tech/{job_id}
Alias for auto-route (GET version)

---

## Skill Validation Endpoints

### GET /jobs/{job_id}/can-do/{tech_id}
Check if a technician can do a job

**Response:**
```json
{
  "can_do": true,
  "tech_id": 1,
  "job_id": 1,
  "missing_skills": []
}
```

If `can_do` is false, `missing_skills` will list required skills the tech doesn't have.

---

## Error Responses

All errors return standard HTTP status codes:

**400 Bad Request** — Invalid input
```json
{
  "detail": "Invalid request body"
}
```

**404 Not Found** — Resource doesn't exist
```json
{
  "detail": "Job not found"
}
```

**409 Conflict** — Operation conflicts with current state
```json
{
  "detail": "Technician already has maximum capacity"
}
```

**500 Internal Server Error** — Server error
```json
{
  "detail": "Internal server error"
}
```

---

## Rate Limiting

Currently: No rate limiting (development)

Coming in v0.0.9: Standard rate limits to prevent abuse

---

## Testing Endpoints with cURL

### Create a job
```bash
curl -X POST http://localhost:8000/api/v1/jobs/ \
  -H "Content-Type: application/json" \
  -d '{
    "type": "install",
    "customer": "Test Co",
    "address": "456 Oak Ave, NYC",
    "skills_required": ["install"],
    "time_slot": "10:00-14:00"
  }'
```

### List all technicians
```bash
curl http://localhost:8000/api/v1/technicians/
```

### Assign a job to a tech
```bash
curl -X POST http://localhost:8000/api/v1/assignments/ \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": 1,
    "technician_id": 1
  }'
```

### Batch assign 5 jobs
```bash
curl -X POST http://localhost:8000/api/v1/assignments/batch-assign \
  -H "Content-Type: application/json" \
  -d '{
    "job_ids": [1, 2, 3, 4, 5],
    "technician_id": 1
  }'
```

### Get auto-route recommendation
```bash
curl -X POST http://localhost:8000/api/v1/routing/auto-route \
  -H "Content-Type: application/json" \
  -d '{ "job_id": 1 }'
```

### Check if tech can do job
```bash
curl http://localhost:8000/api/v1/jobs/1/can-do/1
```

---

## Status Codes Reference

- **200 OK** — Successful GET/PATCH request
- **201 Created** — Successful POST request (resource created)
- **204 No Content** — Successful operation with no response body
- **400 Bad Request** — Invalid input
- **404 Not Found** — Resource not found
- **409 Conflict** — Operation conflicts with state
- **500 Internal Server Error** — Server error
