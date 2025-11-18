"""
Technician Business Logic
Core logic for technician operations
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from backend.database.models import Technician, TechnicianStatus, Assignment, Job, JobStatus


def create_technician(
	db: Session,
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
	max_jobs_per_day: int = 8
) -> Technician:
	"""
	Create a new technician
	"""
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
		is_active=True
	)
	
	db.add(tech)
	db.commit()
	db.refresh(tech)
	
	return tech


def get_technician(db: Session, tech_id: int) -> Optional[Technician]:
	"""Get a technician by ID"""
	return db.query(Technician).filter(Technician.id == tech_id).first()


def get_all_technicians(
	db: Session,
	active_only: bool = True,
	skip: int = 0,
	limit: int = 100
) -> List[Technician]:
	"""
	Get all technicians with optional filtering
	"""
	query = db.query(Technician)
	
	if active_only:
		query = query.filter(Technician.is_active == True)
	
	return query.offset(skip).limit(limit).all()


def get_available_technicians(db: Session) -> List[Technician]:
	"""Get all available technicians"""
	return db.query(Technician).filter(
		Technician.is_active == True,
		Technician.status == TechnicianStatus.AVAILABLE
	).all()


def update_technician_location(
	db: Session,
	tech_id: int,
	latitude: float,
	longitude: float
) -> Optional[Technician]:
	"""Update technician's current location"""
	tech = get_technician(db, tech_id)
	if not tech:
		return None
	
	tech.current_latitude = latitude
	tech.current_longitude = longitude
	tech.last_location_update = datetime.utcnow()
	
	db.commit()
	db.refresh(tech)
	
	return tech


def update_technician_status(
	db: Session,
	tech_id: int,
	status: TechnicianStatus
) -> Optional[Technician]:
	"""Update technician's status"""
	tech = get_technician(db, tech_id)
	if not tech:
		return None
	
	tech.status = status
	tech.updated_at = datetime.utcnow()
	
	db.commit()
	db.refresh(tech)
	
	return tech


def add_skill_to_technician(
	db: Session,
	tech_id: int,
	skill_code: str
) -> bool:
	"""Add a skill to a technician"""
	tech = get_technician(db, tech_id)
	if not tech:
		return False
	
	if skill_code not in tech.skills:
		tech.skills.append(skill_code)
		db.commit()
	
	return True


def remove_skill_from_technician(
	db: Session,
	tech_id: int,
	skill_code: str
) -> bool:
	"""Remove a skill from a technician"""
	tech = get_technician(db, tech_id)
	if not tech:
		return False
	
	if skill_code in tech.skills:
		tech.skills.remove(skill_code)
		db.commit()
	
	return True


def get_technician_workload(
	db: Session,
	tech_id: int,
	target_date: datetime
) -> dict:
	"""
	Get technician's workload for a specific date
	"""
	tech = get_technician(db, tech_id)
	if not tech:
		return None
	
	# Get assignments for the specified date
	assignments = db.query(Assignment).join(Job).filter(
		Assignment.technician_id == tech_id,
		Job.scheduled_date >= target_date.replace(hour=0, minute=0, second=0),
		Job.scheduled_date < target_date.replace(hour=23, minute=59, second=59),
		Job.status.in_([JobStatus.ASSIGNED, JobStatus.IN_PROGRESS])
	).all()
	
	assigned_jobs = len(assignments)
	total_estimated_hours = sum(job.estimated_duration for assignment in assignments for job in [assignment.job]) / 60.0
	
	return {
		"technician_id": tech.id,
		"technician_name": tech.name,
		"date": target_date,
		"assigned_jobs": assigned_jobs,
		"max_jobs": tech.max_jobs_per_day,
		"available_capacity": tech.max_jobs_per_day - assigned_jobs,
		"total_estimated_hours": total_estimated_hours,
		"status": tech.status
	}


def deactivate_technician(db: Session, tech_id: int) -> bool:
	"""Deactivate a technician (soft delete)"""
	tech = get_technician(db, tech_id)
	if not tech:
		return False
	
	tech.is_active = False
	tech.status = TechnicianStatus.OFF_DUTY
	tech.updated_at = datetime.utcnow()
	
	db.commit()
	
	return True


def has_required_skills(tech: Technician, required_skills: List[str]) -> bool:
	"""
	Check if technician has all required skills for a job
	"""
	if not required_skills:
		return True
	
	return all(skill in tech.skills for skill in required_skills)


def get_technicians_with_skills(
	db: Session,
	required_skills: List[str]
) -> List[Technician]:
	"""
	Get all technicians that have the required skills
	"""
	all_techs = get_available_technicians(db)
	return [tech for tech in all_techs if has_required_skills(tech, required_skills)]
