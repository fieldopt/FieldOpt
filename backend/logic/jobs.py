"""
Job Business Logic
Core logic for job operations based on WFX routing concepts
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from datetime import datetime, date

from backend.database.models import Job, JobStatus, JobType, Technician, Assignment


async def create_job(
	db: AsyncSession,
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
	special_instructions: Optional[str] = None,
) -> Job:
	"""Create a new service job"""
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
		special_instructions=special_instructions,
	)

	db.add(job)
	await db.commit()
	await db.refresh(job)

	return job


async def get_job(db: AsyncSession, job_id: int) -> Optional[Job]:
	"""Get a job by ID"""
	result = await db.execute(select(Job).where(Job.id == job_id))
	return result.scalar_one_or_none()


async def get_job_by_number(db: AsyncSession, job_number: str) -> Optional[Job]:
	"""Get a job by job number"""
	result = await db.execute(select(Job).where(Job.job_number == job_number))
	return result.scalar_one_or_none()


async def get_all_jobs(
	db: AsyncSession,
	status: Optional[JobStatus] = None,
	skip: int = 0,
	limit: int = 100,
) -> List[Job]:
	"""Get all jobs with optional status filtering"""
	query = select(Job)

	if status:
		query = query.where(Job.status == status)

	query = query.order_by(Job.created_at.desc()).offset(skip).limit(limit)
	result = await db.execute(query)
	return result.scalars().all()


async def get_pending_jobs(
	db: AsyncSession,
	scheduled_date: Optional[date] = None,
) -> List[Job]:
	"""Get all pending (unassigned) jobs, optionally filtered by scheduled date"""
	query = select(Job).where(Job.status == JobStatus.PENDING)

	if scheduled_date:
		start_of_day = datetime.combine(scheduled_date, datetime.min.time())
		end_of_day = datetime.combine(scheduled_date, datetime.max.time())
		query = query.where(
			Job.scheduled_date >= start_of_day,
			Job.scheduled_date <= end_of_day,
		)

	query = query.order_by(Job.priority.asc(), Job.created_at.asc())
	result = await db.execute(query)
	return result.scalars().all()


async def get_assigned_jobs(
	db: AsyncSession,
	scheduled_date: Optional[date] = None,
) -> List[Job]:
	"""Get all assigned jobs, optionally filtered by scheduled date"""
	query = select(Job).where(Job.status == JobStatus.ASSIGNED)

	if scheduled_date:
		start_of_day = datetime.combine(scheduled_date, datetime.min.time())
		end_of_day = datetime.combine(scheduled_date, datetime.max.time())
		query = query.where(
			Job.scheduled_date >= start_of_day,
			Job.scheduled_date <= end_of_day,
		)

	query = query.order_by(Job.priority.asc())
	result = await db.execute(query)
	return result.scalars().all()


async def update_job_status(
	db: AsyncSession,
	job_id: int,
	new_status: JobStatus,
) -> Optional[Job]:
	"""
	Update job status with FSM validation.

	Valid transitions:
	  pending     → assigned, cancelled, on_hold
	  assigned    → in_progress, pending, cancelled, on_hold
	  in_progress → completed, on_hold, cancelled
	  on_hold     → pending, assigned, cancelled
	  completed   → (terminal)
	  cancelled   → (terminal)
	"""
	job = await get_job(db, job_id)
	if not job:
		return None

	valid_transitions = {
		JobStatus.PENDING:     [JobStatus.ASSIGNED, JobStatus.CANCELLED, JobStatus.ON_HOLD],
		JobStatus.ASSIGNED:    [JobStatus.IN_PROGRESS, JobStatus.PENDING, JobStatus.CANCELLED, JobStatus.ON_HOLD],
		JobStatus.IN_PROGRESS: [JobStatus.COMPLETED, JobStatus.ON_HOLD, JobStatus.CANCELLED],
		JobStatus.ON_HOLD:     [JobStatus.PENDING, JobStatus.ASSIGNED, JobStatus.CANCELLED],
		JobStatus.COMPLETED:   [],
		JobStatus.CANCELLED:   [],
	}

	if new_status not in valid_transitions.get(job.status, []):
		raise ValueError(f"Invalid state transition from {job.status} to {new_status}")

	old_status = job.status
	job.status = new_status
	job.updated_at = datetime.utcnow()

	if new_status == JobStatus.IN_PROGRESS and not job.started_at:
		job.started_at = datetime.utcnow()

	if new_status == JobStatus.COMPLETED and not job.completed_at:
		job.completed_at = datetime.utcnow()

	if new_status == JobStatus.PENDING and old_status == JobStatus.ASSIGNED:
		job.started_at = None

	await db.commit()
	await db.refresh(job)

	return job


async def start_job(db: AsyncSession, job_id: int) -> Optional[Job]:
	"""Transition job from assigned to in_progress"""
	return await update_job_status(db, job_id, JobStatus.IN_PROGRESS)


async def complete_job(db: AsyncSession, job_id: int) -> Optional[Job]:
	"""Transition job from in_progress to completed"""
	return await update_job_status(db, job_id, JobStatus.COMPLETED)


async def cancel_job(
	db: AsyncSession,
	job_id: int,
	reason: Optional[str] = None,
) -> Optional[Job]:
	"""Cancel a job from any non-terminal state"""
	job = await get_job(db, job_id)
	if not job:
		return None

	if reason:
		cancellation_note = f"\n[CANCELLED {datetime.utcnow().isoformat()}]: {reason}"
		job.notes = (job.notes or "") + cancellation_note

	return await update_job_status(db, job_id, JobStatus.CANCELLED)


async def update_job(
	db: AsyncSession,
	job_id: int,
	**kwargs,
) -> Optional[Job]:
	"""Update job fields"""
	job = await get_job(db, job_id)
	if not job:
		return None

	for field, value in kwargs.items():
		if hasattr(job, field) and value is not None:
			setattr(job, field, value)

	job.updated_at = datetime.utcnow()

	await db.commit()
	await db.refresh(job)

	return job


async def delete_job(db: AsyncSession, job_id: int) -> bool:
	"""Delete a job (hard delete)"""
	job = await get_job(db, job_id)
	if not job:
		return False

	if job.status in [JobStatus.IN_PROGRESS, JobStatus.COMPLETED]:
		raise ValueError(f"Cannot delete job in {job.status} status. Cancel it instead.")

	await db.delete(job)
	await db.commit()

	return True


async def get_jobs_summary(
	db: AsyncSession,
	target_date: Optional[date] = None,
) -> dict:
	"""
	Get a summary of job counts by status.

	FIX: Previously passed `True` as a SQLAlchemy filter when no date was
	provided, which worked accidentally in sync mode but fails in async.
	Now builds the where clause explicitly.
	"""
	async def _count(query) -> int:
		result = await db.execute(query)
		return result.scalar_one()

	def _base(extra_filter=None):
		q = select(func.count(Job.id))
		filters = []
		if target_date:
			start_of_day = datetime.combine(target_date, datetime.min.time())
			end_of_day = datetime.combine(target_date, datetime.max.time())
			filters.append(Job.scheduled_date >= start_of_day)
			filters.append(Job.scheduled_date <= end_of_day)
		if extra_filter is not None:
			filters.append(extra_filter)
		if filters:
			q = q.where(and_(*filters))
		return q

	return {
		"total":       await _count(_base()),
		"pending":     await _count(_base(Job.status == JobStatus.PENDING)),
		"assigned":    await _count(_base(Job.status == JobStatus.ASSIGNED)),
		"in_progress": await _count(_base(Job.status == JobStatus.IN_PROGRESS)),
		"completed":   await _count(_base(Job.status == JobStatus.COMPLETED)),
		"cancelled":   await _count(_base(Job.status == JobStatus.CANCELLED)),
		"on_hold":     await _count(_base(Job.status == JobStatus.ON_HOLD)),
	}


def can_technician_do_job(job: Job, technician: Technician) -> tuple[bool, List[str]]:
	"""
	Check if a technician can perform a job based on skills.
	Returns (can_do, missing_skills).

	Based on WFX CanDo functionality. Pure in-memory check — no DB call needed.
	"""
	if not job.required_skills:
		return True, []

	missing_skills = [skill for skill in job.required_skills if skill not in technician.skills]

	return len(missing_skills) == 0, missing_skills
