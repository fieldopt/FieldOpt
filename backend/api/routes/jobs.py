"""
API routes for job operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import date

from backend.database.connection import get_db
from backend.api.schemas import (
	JobCreate, JobResponse, JobUpdate, JobStatusUpdate,
	JobSummary, CanDoResult, MessageResponse,
)
from backend.logic import jobs as job_logic
from backend.logic import technicians as tech_logic
from backend.database.models import JobStatus, JobType

router = APIRouter()


@router.post("/", response_model=JobResponse, status_code=201)
async def create_job(job_data: JobCreate, db: AsyncSession = Depends(get_db)):
	"""Create a new job"""
	try:
		job = await job_logic.create_job(
			db=db,
			customer_name=job_data.customer_name,
			service_address=job_data.service_address,
			latitude=job_data.latitude,
			longitude=job_data.longitude,
			job_type=job_data.job_type,
			required_skills=job_data.required_skills,
			job_number=job_data.job_number,
			customer_phone=job_data.customer_phone,
			customer_email=job_data.customer_email,
			service_city=job_data.service_city,
			service_zip=job_data.service_zip,
			route_criteria=job_data.route_criteria,
			priority=job_data.priority,
			scheduled_date=job_data.scheduled_date,
			time_slot_start=job_data.time_slot_start,
			time_slot_end=job_data.time_slot_end,
			estimated_duration=job_data.estimated_duration,
			description=job_data.description,
			notes=job_data.notes,
			special_instructions=job_data.special_instructions,
		)
		return JobResponse.from_orm_with_assignment(job)
	except Exception as e:
		raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[JobResponse])
async def get_jobs(
	status: Optional[JobStatus] = Query(None, description="Filter by job status"),
	scheduled_date: Optional[date] = Query(None, description="Filter by scheduled date"),
	skip: int = Query(0, ge=0),
	limit: int = Query(100, ge=1, le=500),
	db: AsyncSession = Depends(get_db),
):
	"""Get all jobs with optional status and date filtering"""
	jobs = await job_logic.get_all_jobs(db, status=status, scheduled_date=scheduled_date, skip=skip, limit=limit)
	return [JobResponse.from_orm_with_assignment(j) for j in jobs]


@router.get("/pending", response_model=List[JobResponse])
async def get_pending_jobs(
	scheduled_date: Optional[date] = Query(None, description="Filter by scheduled date"),
	db: AsyncSession = Depends(get_db),
):
	"""Get all pending (unassigned) jobs"""
	jobs = await job_logic.get_pending_jobs(db, scheduled_date=scheduled_date)
	return [JobResponse.from_orm_with_assignment(j) for j in jobs]


@router.get("/summary", response_model=JobSummary)
async def get_jobs_summary(
	target_date: Optional[date] = Query(None, description="Get summary for specific date"),
	db: AsyncSession = Depends(get_db),
):
	"""Get summary statistics of jobs by status"""
	summary = await job_logic.get_jobs_summary(db, target_date=target_date)
	return JobSummary(**summary)


@router.get("/search/query", response_model=List[JobResponse])
async def search_jobs(
	date_from: Optional[date] = Query(None, description="Search from date"),
	date_to: Optional[date] = Query(None, description="Search to date"),
	job_id: Optional[int] = Query(None, description="Filter by job ID"),
	job_number: Optional[str] = Query(None, description="Filter by job number (partial match)"),
	tech_id: Optional[int] = Query(None, description="Filter by assigned technician ID"),
	customer_name: Optional[str] = Query(None, description="Filter by customer name (partial match)"),
	status: Optional[JobStatus] = Query(None, description="Filter by job status"),
	job_type: Optional[JobType] = Query(None, description="Filter by job type"),
	route_criteria: Optional[str] = Query(None, description="Filter by route criteria / management area"),
	skill_group: Optional[str] = Query(None, description="Filter by required skill"),
	limit: int = Query(200, ge=1, le=1000),
	db: AsyncSession = Depends(get_db),
):
	"""
	Multi-criteria job search — historical, current, and future jobs.
	At least one search criteria should be provided.
	"""
	jobs = await job_logic.search_jobs(
		db,
		date_from=date_from,
		date_to=date_to,
		job_id=job_id,
		job_number=job_number,
		tech_id=tech_id,
		customer_name=customer_name,
		status=status,
		job_type=job_type,
		route_criteria=route_criteria,
		skill_group=skill_group,
		limit=limit,
	)
	return [JobResponse.from_orm_with_assignment(j) for j in jobs]


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
	"""Get a specific job by ID"""
	job = await job_logic.get_job(db, job_id)
	if not job:
		raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
	return JobResponse.from_orm_with_assignment(job)


@router.patch("/{job_id}", response_model=JobResponse)
async def update_job(
	job_id: int,
	job_data: JobUpdate,
	db: AsyncSession = Depends(get_db),
):
	"""Update job information"""
	job = await job_logic.get_job(db, job_id)
	if not job:
		raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

	update_data = job_data.model_dump(exclude_unset=True)
	updated = await job_logic.update_job(db, job_id, **update_data)
	return JobResponse.from_orm_with_assignment(updated)


@router.patch("/{job_id}/status", response_model=JobResponse)
async def update_job_status(
	job_id: int,
	status_data: JobStatusUpdate,
	db: AsyncSession = Depends(get_db),
):
	"""Update job status"""
	try:
		job = await job_logic.update_job_status(db, job_id, status_data.status)
		if not job:
			raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
		return JobResponse.from_orm_with_assignment(job)
	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))


@router.post("/{job_id}/start", response_model=JobResponse)
async def start_job(job_id: int, db: AsyncSession = Depends(get_db)):
	"""Start a job (transition to in_progress)"""
	try:
		job = await job_logic.start_job(db, job_id)
		if not job:
			raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
		return JobResponse.from_orm_with_assignment(job)
	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))


@router.post("/{job_id}/complete", response_model=JobResponse)
async def complete_job(job_id: int, db: AsyncSession = Depends(get_db)):
	"""Complete a job"""
	try:
		job = await job_logic.complete_job(db, job_id)
		if not job:
			raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
		return JobResponse.from_orm_with_assignment(job)
	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))


@router.post("/{job_id}/cancel", response_model=JobResponse)
async def cancel_job(
	job_id: int,
	reason: Optional[str] = Query(None, max_length=500),
	db: AsyncSession = Depends(get_db),
):
	"""Cancel a job"""
	job = await job_logic.cancel_job(db, job_id, reason=reason)
	if not job:
		raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
	return JobResponse.from_orm_with_assignment(job)


@router.delete("/{job_id}", response_model=MessageResponse)
async def delete_job(job_id: int, db: AsyncSession = Depends(get_db)):
	"""Delete a job (hard delete — use with caution)"""
	try:
		success = await job_logic.delete_job(db, job_id)
		if not success:
			raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
		return MessageResponse(success=True, message=f"Job {job_id} deleted")
	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))


@router.get("/{job_id}/can-do/{tech_id}", response_model=CanDoResult)
async def check_can_do(job_id: int, tech_id: int, db: AsyncSession = Depends(get_db)):
	"""Check if a technician can perform a job (CanDo — skill, route, time)"""
	job = await job_logic.get_job(db, job_id)
	if not job:
		raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

	tech = await tech_logic.get_technician(db, tech_id)
	if not tech:
		raise HTTPException(status_code=404, detail=f"Technician {tech_id} not found")

	result = job_logic.can_technician_do_job(job, tech)

	return CanDoResult(
		job_id=job_id,
		technician_id=tech_id,
		**result,
	)

