"""
Assignment Business Logic
Manage job assignments to technicians
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from backend.database.models import Assignment, Job, Technician, JobStatus
from backend.logic.routing.distance import haversine_distance, calculate_travel_time


def create_assignment(
	db: Session,
	job_id: int,
	technician_id: int,
	sequence: Optional[int] = None
) -> Assignment:
	"""Create a new assignment linking a job to a technician"""
	# Check if job is already assigned
	existing = db.query(Assignment).filter(Assignment.job_id == job_id).first()
	if existing:
		raise ValueError(f"Job {job_id} is already assigned to technician {existing.technician_id}")
	
	# Get job and technician
	job = db.query(Job).filter(Job.id == job_id).first()
	tech = db.query(Technician).filter(Technician.id == technician_id).first()
	
	if not job:
		raise ValueError(f"Job {job_id} not found")
	if not tech:
		raise ValueError(f"Technician {technician_id} not found")
	
	# Calculate distance from tech's home base to job
	distance = haversine_distance(
		tech.home_latitude,
		tech.home_longitude,
		job.latitude,
		job.longitude
	)
	travel_time = calculate_travel_time(distance)
	
	# Create assignment
	assignment = Assignment(
		job_id=job_id,
		technician_id=technician_id,
		sequence=sequence,
		estimated_distance=distance,
		estimated_travel_time=travel_time
	)
	
	# Update job status
	job.status = JobStatus.ASSIGNED
	
	db.add(assignment)
	db.commit()
	db.refresh(assignment)
	
	return assignment


def get_assignment(db: Session, assignment_id: int) -> Optional[Assignment]:
	"""Get an assignment by ID"""
	return db.query(Assignment).filter(Assignment.id == assignment_id).first()


def get_assignments_for_technician(
	db: Session,
	technician_id: int
) -> List[Assignment]:
	"""Get all assignments for a technician"""
	return db.query(Assignment).filter(
		Assignment.technician_id == technician_id
	).order_by(Assignment.sequence).all()


def get_assignments_for_job(db: Session, job_id: int) -> Optional[Assignment]:
	"""Get assignment for a job"""
	return db.query(Assignment).filter(Assignment.job_id == job_id).first()


def unassign_job(db: Session, job_id: int) -> bool:
	"""Remove assignment for a job"""
	assignment = db.query(Assignment).filter(Assignment.job_id == job_id).first()
	if not assignment:
		return False
	
	# Update job status back to pending
	job = db.query(Job).filter(Job.id == job_id).first()
	if job:
		job.status = JobStatus.PENDING
	
	db.delete(assignment)
	db.commit()
	
	return True


def reassign_job(
	db: Session,
	job_id: int,
	new_technician_id: int
) -> Assignment:
	"""Reassign a job to a different technician"""
	# Remove old assignment
	unassign_job(db, job_id)
	
	# Create new assignment
	return create_assignment(db, job_id, new_technician_id)
