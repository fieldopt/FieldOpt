"""
Assignment Business Logic
Manage job assignments to technicians
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime

from backend.database.models import Assignment, Job, Technician, JobStatus
from backend.logic.routing.distance import haversine_distance, calculate_travel_time


async def create_assignment(
	db: AsyncSession,
	job_id: int,
	technician_id: int,
	sequence: Optional[int] = None,
) -> Assignment:
	"""Create a new assignment linking a job to a technician"""
	# Check if job is already assigned
	existing_result = await db.execute(
		select(Assignment).where(Assignment.job_id == job_id)
	)
	existing = existing_result.scalar_one_or_none()
	if existing:
		raise ValueError(f"Job {job_id} is already assigned to technician {existing.technician_id}")

	# Get job and technician
	job_result = await db.execute(select(Job).where(Job.id == job_id))
	job = job_result.scalar_one_or_none()

	tech_result = await db.execute(select(Technician).where(Technician.id == technician_id))
	tech = tech_result.scalar_one_or_none()

	if not job:
		raise ValueError(f"Job {job_id} not found")
	if not tech:
		raise ValueError(f"Technician {technician_id} not found")

	# Use current location if available, otherwise fall back to home base
	origin_lat = tech.current_latitude if tech.current_latitude is not None else tech.home_latitude
	origin_lon = tech.current_longitude if tech.current_longitude is not None else tech.home_longitude

	distance = haversine_distance(origin_lat, origin_lon, job.latitude, job.longitude)
	travel_time = calculate_travel_time(distance)

	assignment = Assignment(
		job_id=job_id,
		technician_id=technician_id,
		sequence=sequence,
		estimated_distance=distance,
		estimated_travel_time=travel_time,
	)

	job.status = JobStatus.ASSIGNED

	db.add(assignment)
	await db.commit()
	await db.refresh(assignment)

	return assignment


async def get_assignment(db: AsyncSession, assignment_id: int) -> Optional[Assignment]:
	"""Get an assignment by ID"""
	result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
	return result.scalar_one_or_none()


async def get_assignments_for_technician(
	db: AsyncSession,
	technician_id: int,
) -> List[Assignment]:
	"""Get all assignments for a technician ordered by sequence"""
	result = await db.execute(
		select(Assignment)
		.where(Assignment.technician_id == technician_id)
		.order_by(Assignment.sequence)
	)
	return result.scalars().all()


async def get_assignments_for_job(db: AsyncSession, job_id: int) -> Optional[Assignment]:
	"""Get assignment for a job"""
	result = await db.execute(select(Assignment).where(Assignment.job_id == job_id))
	return result.scalar_one_or_none()


async def unassign_job(db: AsyncSession, job_id: int) -> bool:
	"""Remove assignment for a job and revert job status to pending"""
	assignment_result = await db.execute(
		select(Assignment).where(Assignment.job_id == job_id)
	)
	assignment = assignment_result.scalar_one_or_none()
	if not assignment:
		return False

	job_result = await db.execute(select(Job).where(Job.id == job_id))
	job = job_result.scalar_one_or_none()
	if job:
		job.status = JobStatus.PENDING

	await db.delete(assignment)
	await db.commit()

	return True


async def reassign_job(
	db: AsyncSession,
	job_id: int,
	new_technician_id: int,
) -> Assignment:
	"""
	Reassign a job to a different technician.

	FIX: Old version called unassign_job() then create_assignment() as two
	separate commits — a failure between them would leave the job unassigned
	with no assignment record. Now runs as a single atomic transaction.
	"""
	# Remove existing assignment within the same session (no commit yet)
	assignment_result = await db.execute(
		select(Assignment).where(Assignment.job_id == job_id)
	)
	existing = assignment_result.scalar_one_or_none()
	if existing:
		await db.delete(existing)

	# Get job and new technician
	job_result = await db.execute(select(Job).where(Job.id == job_id))
	job = job_result.scalar_one_or_none()
	if not job:
		raise ValueError(f"Job {job_id} not found")

	tech_result = await db.execute(select(Technician).where(Technician.id == new_technician_id))
	tech = tech_result.scalar_one_or_none()
	if not tech:
		raise ValueError(f"Technician {new_technician_id} not found")

	# Use current location if available, otherwise home base
	origin_lat = tech.current_latitude if tech.current_latitude is not None else tech.home_latitude
	origin_lon = tech.current_longitude if tech.current_longitude is not None else tech.home_longitude

	distance = haversine_distance(origin_lat, origin_lon, job.latitude, job.longitude)
	travel_time = calculate_travel_time(distance)

	new_assignment = Assignment(
		job_id=job_id,
		technician_id=new_technician_id,
		estimated_distance=distance,
		estimated_travel_time=travel_time,
	)

	job.status = JobStatus.ASSIGNED

	db.add(new_assignment)
	await db.commit()  # Single commit — atomic
	await db.refresh(new_assignment)

	return new_assignment
