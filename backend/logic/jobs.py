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
	route_criteria: Optional[str] = None,
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
		route_criteria=route_criteria,
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
	scheduled_date: Optional[date] = None,
	skip: int = 0,
	limit: int = 100,
) -> List[Job]:
	"""Get all jobs with optional status and date filtering"""
	query = select(Job)

	if status:
		query = query.where(Job.status == status)

	if scheduled_date:
		start_of_day = datetime.combine(scheduled_date, datetime.min.time())
		end_of_day = datetime.combine(scheduled_date, datetime.max.time())
		query = query.where(
			Job.scheduled_date >= start_of_day,
			Job.scheduled_date <= end_of_day,
		)

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


def can_technician_do_job(job: Job, technician: Technician) -> dict:
	"""
	Full CanDo evaluation — skill, route, time checks.
	Based on WFX CanDo functionality with 3 checkmarks.

	Returns dict with has_skill, has_route, has_time, missing_skills, route_match, distance_miles.
	"""
	import math

	# Skill check
	missing_skills = []
	if job.required_skills:
		missing_skills = [skill for skill in job.required_skills if skill not in technician.skills]
	has_skill = len(missing_skills) == 0

	# Route check — does the job's route_criteria match one of the tech's assigned_routes?
	route_match = False
	if job.route_criteria and technician.assigned_routes:
		route_match = job.route_criteria in technician.assigned_routes
	elif not job.route_criteria:
		# No route criteria on job — no restriction
		route_match = True
	has_route = route_match

	# Time check — does the tech have enough shift time remaining for this job?
	has_time = True
	if technician.shift_end and job.estimated_duration:
		try:
			end_h, end_m = map(int, technician.shift_end.split(':'))
			shift_end_mins = end_h * 60 + end_m
			# Calculate how many minutes of work already assigned
			assigned_mins = 0
			if technician.assignments:
				for a in technician.assignments:
					if a.job and a.job.status not in ('completed', 'cancelled'):
						assigned_mins += (a.job.estimated_duration or 0)
			start_h, start_m = map(int, technician.shift_start.split(':')) if technician.shift_start else (8, 0)
			shift_start_mins = start_h * 60 + start_m
			available_mins = (shift_end_mins - shift_start_mins) - assigned_mins
			has_time = available_mins >= job.estimated_duration
		except (ValueError, TypeError):
			has_time = True  # If we can't parse, don't block

	# Distance calculation (haversine — straight line miles)
	distance_miles = None
	tech_lat = technician.current_latitude or technician.home_latitude
	tech_lon = technician.current_longitude or technician.home_longitude
	if tech_lat and tech_lon and job.latitude and job.longitude:
		R = 3959  # Earth radius in miles
		dlat = math.radians(job.latitude - tech_lat)
		dlon = math.radians(job.longitude - tech_lon)
		a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(tech_lat)) * math.cos(math.radians(job.latitude)) * math.sin(dlon / 2) ** 2
		c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
		distance_miles = round(R * c, 1)

	can_do = has_skill and has_route and has_time

	return {
		"can_do": can_do,
		"has_skill": has_skill,
		"has_route": has_route,
		"has_time": has_time,
		"missing_skills": missing_skills,
		"route_match": route_match,
		"distance_miles": distance_miles,
	}


async def search_jobs(
	db: AsyncSession,
	date_from: Optional[date] = None,
	date_to: Optional[date] = None,
	job_id: Optional[int] = None,
	job_number: Optional[str] = None,
	tech_id: Optional[int] = None,
	customer_name: Optional[str] = None,
	status: Optional[JobStatus] = None,
	job_type: Optional[JobType] = None,
	route_criteria: Optional[str] = None,
	skill_group: Optional[str] = None,
	limit: int = 200,
) -> List[Job]:
	"""
	Multi-criteria job search — supports historical, current, and future queries.
	Mirrors WFX Job Search functionality.
	"""
	query = select(Job)
	filters = []

	if job_id:
		filters.append(Job.id == job_id)
	if job_number:
		filters.append(Job.job_number.ilike(f"%{job_number}%"))
	if customer_name:
		filters.append(Job.customer_name.ilike(f"%{customer_name}%"))
	if status:
		filters.append(Job.status == status)
	if job_type:
		filters.append(Job.job_type == job_type)
	if route_criteria:
		filters.append(Job.route_criteria == route_criteria)

	if date_from:
		start_of_day = datetime.combine(date_from, datetime.min.time())
		filters.append(Job.scheduled_date >= start_of_day)
	if date_to:
		end_of_day = datetime.combine(date_to, datetime.max.time())
		filters.append(Job.scheduled_date <= end_of_day)

	# Tech filter — need to join through assignments
	if tech_id:
		query = query.join(Assignment, Assignment.job_id == Job.id)
		filters.append(Assignment.technician_id == tech_id)

	if filters:
		query = query.where(and_(*filters))

	query = query.order_by(Job.scheduled_date.desc(), Job.priority.asc()).limit(limit)
	result = await db.execute(query)
	return result.scalars().all()
