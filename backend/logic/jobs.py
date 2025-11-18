"""
Job Business Logic
Core logic for job operations based on WFX routing concepts
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime, date, timedelta

from backend.database.models import Job, JobStatus, JobType, Technician, Assignment


def create_job(
	db: Session,
	customer_name: str,
	service_address: str,
	latitude: float,
	longitude: float,
	job_type: JobType,
	required_skills: List[str],
	job_number: Optional[str] = None,
	customer_phone: Optional[str] = None,
	customer_email: Optional[str] = None,
	service_city: Optional[str] = None,
	service_zip: Optional[str] = None,
	priority: int = 3,
	scheduled_date: Optional[datetime] = None,
	time_slot_start: Optional[str] = None,
	time_slot_end: Optional[str] = None,
	estimated_duration: int = 60,
	description: Optional[str] = None,
	notes: Optional[str] = None,
	special_instructions: Optional[str] = None
) -> Job:
	"""
	Create a new service job
	
	Args:
		customer_name: Customer name (required)
		service_address: Service location address (required)
		latitude: Job location latitude (required)
		longitude: Job location longitude (required)
		job_type: Type of job (install, repair, etc.)
		required_skills: List of skills needed to complete job
		priority: Job priority (1=highest, 5=lowest)
		scheduled_date: When job should be performed
		time_slot_start: Start of time window (HH:MM)
		time_slot_end: End of time window (HH:MM)
		estimated_duration: Expected duration in minutes
	"""
	job = Job(
		job_number=job_number,
		job_type=job_type,
		status=JobStatus.PENDING,
		customer_name=customer_name,
		customer_phone=customer_phone,
		customer_email=customer_email,
		service_address=service_address,
		service_city=service_city,
		service_zip=service_zip,
		latitude=latitude,
		longitude=longitude,
		required_skills=required_skills,
		priority=priority,
		scheduled_date=scheduled_date,
		time_slot_start=time_slot_start,
		time_slot_end=time_slot_end,
		estimated_duration=estimated_duration,
		description=description,
		notes=notes,
		special_instructions=special_instructions
	)
	
	db.add(job)
	db.commit()
	db.refresh(job)
	
	return job


def get_job(db: Session, job_id: int) -> Optional[Job]:
	"""Get a job by ID"""
	return db.query(Job).filter(Job.id == job_id).first()


def get_job_by_number(db: Session, job_number: str) -> Optional[Job]:
	"""Get a job by job number"""
	return db.query(Job).filter(Job.job_number == job_number).first()


def get_all_jobs(
	db: Session,
	status: Optional[JobStatus] = None,
	skip: int = 0,
	limit: int = 100
) -> List[Job]:
	"""
	Get all jobs with optional status filtering
	"""
	query = db.query(Job)
	
	if status:
		query = query.filter(Job.status == status)
	
	return query.order_by(Job.created_at.desc()).offset(skip).limit(limit).all()


def get_pending_jobs(
	db: Session,
	scheduled_date: Optional[date] = None
) -> List[Job]:
	"""
	Get all pending (unassigned) jobs
	Optionally filter by scheduled date
	"""
	query = db.query(Job).filter(Job.status == JobStatus.PENDING)
	
	if scheduled_date:
		# Get jobs for the specified date
		start_of_day = datetime.combine(scheduled_date, datetime.min.time())
		end_of_day = datetime.combine(scheduled_date, datetime.max.time())
		query = query.filter(
			Job.scheduled_date >= start_of_day,
			Job.scheduled_date <= end_of_day
		)
	
	return query.order_by(Job.priority.asc(), Job.created_at.asc()).all()


def get_assigned_jobs(
	db: Session,
	scheduled_date: Optional[date] = None
) -> List[Job]:
	"""
	Get all assigned jobs
	Optionally filter by scheduled date
	"""
	query = db.query(Job).filter(Job.status == JobStatus.ASSIGNED)
	
	if scheduled_date:
		start_of_day = datetime.combine(scheduled_date, datetime.min.time())
		end_of_day = datetime.combine(scheduled_date, datetime.max.time())
		query = query.filter(
			Job.scheduled_date >= start_of_day,
			Job.scheduled_date <= end_of_day
		)
	
	return query.order_by(Job.priority.asc()).all()


def update_job_status(
	db: Session,
	job_id: int,
	new_status: JobStatus
) -> Optional[Job]:
	"""
	Update job status with FSM validation
	Valid transitions:
	- pending → assigned
	- assigned → in_progress
	- in_progress → completed
	- Any → cancelled
	- Any → on_hold
	"""
	job = get_job(db, job_id)
	if not job:
		return None
	
	# Validate state transition
	valid_transitions = {
		JobStatus.PENDING: [JobStatus.ASSIGNED, JobStatus.CANCELLED, JobStatus.ON_HOLD],
		JobStatus.ASSIGNED: [JobStatus.IN_PROGRESS, JobStatus.PENDING, JobStatus.CANCELLED, JobStatus.ON_HOLD],
		JobStatus.IN_PROGRESS: [JobStatus.COMPLETED, JobStatus.ON_HOLD, JobStatus.CANCELLED],
		JobStatus.ON_HOLD: [JobStatus.PENDING, JobStatus.ASSIGNED, JobStatus.CANCELLED],
		JobStatus.COMPLETED: [],  # Completed is terminal
		JobStatus.CANCELLED: []   # Cancelled is terminal
	}
	
	if new_status not in valid_transitions.get(job.status, []):
		raise ValueError(f"Invalid state transition from {job.status} to {new_status}")
	
	# Update status and timestamps
	old_status = job.status
	job.status = new_status
	job.updated_at = datetime.utcnow()
	
	# Set timestamps based on status
	if new_status == JobStatus.IN_PROGRESS and not job.started_at:
		job.started_at = datetime.utcnow()
	
	if new_status == JobStatus.COMPLETED and not job.completed_at:
		job.completed_at = datetime.utcnow()
	
	# If unassigning (going back to pending), clear started_at
	if new_status == JobStatus.PENDING and old_status == JobStatus.ASSIGNED:
		job.started_at = None
	
	db.commit()
	db.refresh(job)
	
	return job


def start_job(db: Session, job_id: int) -> Optional[Job]:
	"""Transition job from assigned to in_progress"""
	return update_job_status(db, job_id, JobStatus.IN_PROGRESS)


def complete_job(db: Session, job_id: int) -> Optional[Job]:
	"""Transition job from in_progress to completed"""
	return update_job_status(db, job_id, JobStatus.COMPLETED)


def cancel_job(db: Session, job_id: int, reason: Optional[str] = None) -> Optional[Job]:
	"""Cancel a job (can be done from any state)"""
	job = get_job(db, job_id)
	if not job:
		return None
	
	if reason:
		cancellation_note = f"\n[CANCELLED {datetime.utcnow().isoformat()}]: {reason}"
		job.notes = (job.notes or "") + cancellation_note
	
	return update_job_status(db, job_id, JobStatus.CANCELLED)


def update_job(
	db: Session,
	job_id: int,
	**kwargs
) -> Optional[Job]:
	"""Update job fields"""
	job = get_job(db, job_id)
	if not job:
		return None
	
	for field, value in kwargs.items():
		if hasattr(job, field) and value is not None:
			setattr(job, field, value)
	
	job.updated_at = datetime.utcnow()
	
	db.commit()
	db.refresh(job)
	
	return job


def delete_job(db: Session, job_id: int) -> bool:
	"""Delete a job (hard delete)"""
	job = get_job(db, job_id)
	if not job:
		return False
	
	if job.status in [JobStatus.IN_PROGRESS, JobStatus.COMPLETED]:
		raise ValueError(f"Cannot delete job in {job.status} status. Cancel it instead.")
	
	db.delete(job)
	db.commit()
	
	return True


def get_jobs_summary(db: Session, target_date: Optional[date] = None) -> dict:
	"""Get a summary of job counts by status"""
	if target_date:
		start_of_day = datetime.combine(target_date, datetime.min.time())
		end_of_day = datetime.combine(target_date, datetime.max.time())
		date_filter = and_(
			Job.scheduled_date >= start_of_day,
			Job.scheduled_date <= end_of_day
		)
	else:
		date_filter = True
	
	return {
		"total": db.query(Job).filter(date_filter).count(),
		"pending": db.query(Job).filter(date_filter, Job.status == JobStatus.PENDING).count(),
		"assigned": db.query(Job).filter(date_filter, Job.status == JobStatus.ASSIGNED).count(),
		"in_progress": db.query(Job).filter(date_filter, Job.status == JobStatus.IN_PROGRESS).count(),
		"completed": db.query(Job).filter(date_filter, Job.status == JobStatus.COMPLETED).count(),
		"cancelled": db.query(Job).filter(date_filter, Job.status == JobStatus.CANCELLED).count(),
		"on_hold": db.query(Job).filter(date_filter, Job.status == JobStatus.ON_HOLD).count(),
	}


def can_technician_do_job(job: Job, technician: Technician) -> tuple[bool, List[str]]:
	"""
	Check if a technician can perform a job based on skills
	Returns (can_do, missing_skills)
	
	Based on WFX "CanDo" functionality
	"""
	if not job.required_skills:
		return True, []
	
	missing_skills = [skill for skill in job.required_skills if skill not in technician.skills]
	
	return len(missing_skills) == 0, missing_skills
