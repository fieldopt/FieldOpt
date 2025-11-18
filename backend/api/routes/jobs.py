"""
API routes for job operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from backend.database.connection import get_db
from backend.api.schemas import (
	JobCreate, JobResponse, JobUpdate, JobStatusUpdate,
	JobSummary, CanDoResult, MessageResponse
)
from backend.logic import jobs as job_logic
from backend.logic import technicians as tech_logic
from backend.database.models import JobStatus

router = APIRouter()


@router.post("/", response_model=JobResponse, status_code=201)
def create_job(job_data: JobCreate, db: Session = Depends(get_db)):
	"""Create a new job"""
	try:
		job = job_logic.create_job(
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
			priority=job_data.priority,
			scheduled_date=job_data.scheduled_date,
			time_slot_start=job_data.time_slot_start,
			time_slot_end=job_data.time_slot_end,
			estimated_duration=job_data.estimated_duration,
			description=job_data.description,
			notes=job_data.notes,
			special_instructions=job_data.special_instructions
		)
		return job
	except Exception as e:
		raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[JobResponse])
def get_jobs(
	status: Optional[JobStatus] = Query(None, description="Filter by job status"),
	skip: int = Query(0, ge=0),
	limit: int = Query(100, ge=1, le=500),
	db: Session = Depends(get_db)
):
	"""Get all jobs with optional status filtering"""
	jobs = job_logic.get_all_jobs(db, status=status, skip=skip, limit=limit)
	return jobs


@router.get("/pending", response_model=List[JobResponse])
def get_pending_jobs(
	scheduled_date: Optional[date] = Query(None, description="Filter by scheduled date"),
	db: Session = Depends(get_db)
):
	"""Get all pending (unassigned) jobs"""
	jobs = job_logic.get_pending_jobs(db, scheduled_date=scheduled_date)
	return jobs


@router.get("/summary", response_model=JobSummary)
def get_jobs_summary(
	target_date: Optional[date] = Query(None, description="Get summary for specific date"),
	db: Session = Depends(get_db)
):
	"""Get summary statistics of jobs by status"""
	summary = job_logic.get_jobs_summary(db, target_date=target_date)
	return JobSummary(**summary)


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
	"""Get a specific job by ID"""
	job = job_logic.get_job(db, job_id)
	if not job:
		raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
	return job


@router.patch("/{job_id}", response_model=JobResponse)
def update_job(
	job_id: int,
	job_data: JobUpdate,
	db: Session = Depends(get_db)
):
	"""Update job information"""
	job = job_logic.get_job(db, job_id)
	if not job:
		raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
	
	# Update fields if provided
	update_data = job_data.model_dump(exclude_unset=True)
	updated_job = job_logic.update_job(db, job_id, **update_data)
	
	return updated_job


@router.patch("/{job_id}/status", response_model=JobResponse)
def update_job_status(
	job_id: int,
	status_data: JobStatusUpdate,
	db: Session = Depends(get_db)
):
	"""Update job status"""
	try:
		job = job_logic.update_job_status(db, job_id, status_data.status)
		if not job:
			raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
		return job
	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))


@router.post("/{job_id}/start", response_model=JobResponse)
def start_job(job_id: int, db: Session = Depends(get_db)):
	"""Start a job (transition to in_progress)"""
	try:
		job = job_logic.start_job(db, job_id)
		if not job:
			raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
		return job
	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))


@router.post("/{job_id}/complete", response_model=JobResponse)
def complete_job(job_id: int, db: Session = Depends(get_db)):
	"""Complete a job"""
	try:
		job = job_logic.complete_job(db, job_id)
		if not job:
			raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
		return job
	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))


@router.post("/{job_id}/cancel", response_model=JobResponse)
def cancel_job(
	job_id: int,
	reason: Optional[str] = Query(None, max_length=500),
	db: Session = Depends(get_db)
):
	"""Cancel a job"""
	job = job_logic.cancel_job(db, job_id, reason=reason)
	if not job:
		raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
	return job


@router.delete("/{job_id}", response_model=MessageResponse)
def delete_job(job_id: int, db: Session = Depends(get_db)):
	"""Delete a job (hard delete - use with caution)"""
	try:
		success = job_logic.delete_job(db, job_id)
		if not success:
			raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
		return MessageResponse(success=True, message=f"Job {job_id} deleted")
	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))


@router.get("/{job_id}/can-do/{tech_id}", response_model=CanDoResult)
def check_can_do(job_id: int, tech_id: int, db: Session = Depends(get_db)):
	"""
	Check if a technician can perform a job (CanDo functionality from WFX)
	Returns whether tech has required skills
	"""
	job = job_logic.get_job(db, job_id)
	if not job:
		raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
	
	tech = tech_logic.get_technician(db, tech_id)
	if not tech:
		raise HTTPException(status_code=404, detail=f"Technician {tech_id} not found")
	
	can_do, missing_skills = job_logic.can_technician_do_job(job, tech)
	
	return CanDoResult(
		job_id=job_id,
		technician_id=tech_id,
		can_do=can_do,
		missing_skills=missing_skills
	)
