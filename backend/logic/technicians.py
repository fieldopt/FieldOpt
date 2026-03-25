"""
Technician Business Logic
Core logic for technician operations
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime, date

from backend.database.models import Technician, TechnicianStatus, Assignment, Job, JobStatus


async def create_technician(
	db: AsyncSession,
	name: str,
	home_latitude: float,
	home_longitude: float,
	skills: List[str],
	employee_id: Optional[str] = None,
	phone: Optional[str] = None,
	email: Optional[str] = None,
	home_address: Optional[str] = None,
	shift_start: Optional[str] = None,
	shift_end: Optional[str] = None,
	max_jobs_per_day: int = 8,
) -> Technician:
	"""Create a new technician"""
	tech = Technician(
		name=name,
		employee_id=employee_id,
		phone=phone,
		email=email,
		home_latitude=home_latitude,
		home_longitude=home_longitude,
		home_address=home_address,
		skills=skills,
		shift_start=shift_start,
		shift_end=shift_end,
		max_jobs_per_day=max_jobs_per_day,
		status=TechnicianStatus.AVAILABLE,
		is_active=True,
	)

	db.add(tech)
	await db.commit()
	await db.refresh(tech)

	return tech


async def get_technician(db: AsyncSession, tech_id: int) -> Optional[Technician]:
	"""Get a technician by ID"""
	result = await db.execute(select(Technician).where(Technician.id == tech_id))
	return result.scalar_one_or_none()


async def get_all_technicians(
	db: AsyncSession,
	active_only: bool = True,
	skip: int = 0,
	limit: int = 100,
) -> List[Technician]:
	"""Get all technicians with optional filtering"""
	query = select(Technician)

	if active_only:
		query = query.where(Technician.is_active == True)

	query = query.offset(skip).limit(limit)
	result = await db.execute(query)
	return result.scalars().all()


async def get_available_technicians(db: AsyncSession) -> List[Technician]:
	"""Get all available technicians"""
	result = await db.execute(
		select(Technician).where(
			Technician.is_active == True,
			Technician.status == TechnicianStatus.AVAILABLE,
		)
	)
	return result.scalars().all()


async def update_technician(
	db: AsyncSession,
	tech_id: int,
	**kwargs,
) -> Optional[Technician]:
	"""Update technician fields"""
	tech = await get_technician(db, tech_id)
	if not tech:
		return None

	for field, value in kwargs.items():
		if hasattr(tech, field) and value is not None:
			setattr(tech, field, value)

	tech.updated_at = datetime.utcnow()

	await db.commit()
	await db.refresh(tech)

	return tech


async def update_technician_location(
	db: AsyncSession,
	tech_id: int,
	latitude: float,
	longitude: float,
) -> Optional[Technician]:
	"""Update technician's current location"""
	tech = await get_technician(db, tech_id)
	if not tech:
		return None

	tech.current_latitude = latitude
	tech.current_longitude = longitude
	tech.last_location_update = datetime.utcnow()

	await db.commit()
	await db.refresh(tech)

	return tech


async def update_technician_status(
	db: AsyncSession,
	tech_id: int,
	status: TechnicianStatus,
) -> Optional[Technician]:
	"""Update technician's status"""
	tech = await get_technician(db, tech_id)
	if not tech:
		return None

	tech.status = status
	tech.updated_at = datetime.utcnow()

	await db.commit()
	await db.refresh(tech)

	return tech


async def add_skill_to_technician(
	db: AsyncSession,
	tech_id: int,
	skill_code: str,
) -> bool:
	"""Add a skill to a technician"""
	tech = await get_technician(db, tech_id)
	if not tech:
		return False

	if skill_code not in tech.skills:
		tech.skills = [*tech.skills, skill_code]  # Reassign to trigger JSON change detection
		await db.commit()

	return True


async def remove_skill_from_technician(
	db: AsyncSession,
	tech_id: int,
	skill_code: str,
) -> bool:
	"""Remove a skill from a technician"""
	tech = await get_technician(db, tech_id)
	if not tech:
		return False

	if skill_code in tech.skills:
		tech.skills = [s for s in tech.skills if s != skill_code]
		await db.commit()

	return True


async def get_technician_workload(
	db: AsyncSession,
	tech_id: int,
) -> Optional[dict]:
	"""
	Get technician's workload for today.

	FIX: Route called this with only tech_id but the old signature required
	target_date as a second positional argument — causing a TypeError at runtime.
	Now defaults to today and makes the date optional.
	"""
	tech = await get_technician(db, tech_id)
	if not tech:
		return None

	today = datetime.utcnow().date()
	start_of_day = datetime.combine(today, datetime.min.time())
	end_of_day = datetime.combine(today, datetime.max.time())

	result = await db.execute(
		select(Assignment)
		.join(Job, Assignment.job_id == Job.id)
		.where(
			Assignment.technician_id == tech_id,
			Job.scheduled_date >= start_of_day,
			Job.scheduled_date <= end_of_day,
			Job.status.in_([JobStatus.ASSIGNED, JobStatus.IN_PROGRESS]),
		)
	)
	assignments = result.scalars().all()

	assigned_jobs = len(assignments)
	total_estimated_hours = sum(
		a.job.estimated_duration for a in assignments if a.job
	) / 60.0

	return {
		"technician_id": tech.id,
		"technician_name": tech.name,
		"date": datetime.utcnow(),
		"assigned_jobs": assigned_jobs,
		"max_jobs": tech.max_jobs_per_day,
		"available_capacity": tech.max_jobs_per_day - assigned_jobs,
		"total_estimated_hours": total_estimated_hours,
		"status": tech.status,
	}


async def delete_technician(db: AsyncSession, tech_id: int) -> bool:
	"""
	Soft-delete a technician by deactivating them.

	FIX: Route called tech_logic.delete_technician() but only
	deactivate_technician() existed in the logic layer — hard crash at runtime.
	Renamed to delete_technician and maps to the soft-delete (deactivate) pattern,
	which is the correct behavior — you don't want to hard-delete techs with history.
	"""
	tech = await get_technician(db, tech_id)
	if not tech:
		return False

	tech.is_active = False
	tech.status = TechnicianStatus.OFF_DUTY
	tech.updated_at = datetime.utcnow()

	await db.commit()

	return True


def has_required_skills(tech: Technician, required_skills: List[str]) -> bool:
	"""Check if technician has all required skills for a job"""
	if not required_skills:
		return True
	return all(skill in tech.skills for skill in required_skills)


async def get_technicians_with_skills(
	db: AsyncSession,
	required_skills: List[str],
) -> List[Technician]:
	"""Get all available technicians that have the required skills"""
	all_techs = await get_available_technicians(db)
	return [tech for tech in all_techs if has_required_skills(tech, required_skills)]
