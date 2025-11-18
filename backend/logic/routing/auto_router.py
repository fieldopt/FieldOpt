"""
Auto-Routing Algorithm
Automatically assign jobs to technicians based on WFX principles
"""
from sqlalchemy.orm import Session
from typing import List, Dict, Tuple, Optional
from datetime import datetime, date

from backend.database.models import Job, Technician, JobStatus, TechnicianStatus
from backend.logic import jobs as job_logic
from backend.logic import technicians as tech_logic
from backend.logic import assignments as assignment_logic
from backend.logic.routing.distance import haversine_distance


def auto_route_jobs(
	db: Session,
	target_date: Optional[date] = None
) -> Dict:
	"""
	Auto-route pending jobs to available technicians
	Based on WFX Auto-Route logic: skills, time, distance
	
	Returns summary of assignments made
	"""
	# Get pending jobs
	pending_jobs = job_logic.get_pending_jobs(db, scheduled_date=target_date)
	
	# Get available technicians
	available_techs = tech_logic.get_available_technicians(db)
	
	if not pending_jobs:
		return {
			"success": True,
			"message": "No pending jobs to route",
			"jobs_assigned": 0,
			"jobs_unassigned": 0
		}
	
	if not available_techs:
		return {
			"success": False,
			"message": "No available technicians",
			"jobs_assigned": 0,
			"jobs_unassigned": len(pending_jobs)
		}
	
	assigned_count = 0
	unassigned_jobs = []
	
	# Sort jobs by priority (highest first)
	pending_jobs.sort(key=lambda j: j.priority)
	
	for job in pending_jobs:
		# Find eligible technicians (have required skills)
		eligible_techs = []
		
		for tech in available_techs:
			can_do, missing = job_logic.can_technician_do_job(job, tech)
			if can_do:
				# Calculate distance
				distance = haversine_distance(
					tech.home_latitude,
					tech.home_longitude,
					job.latitude,
					job.longitude
				)
				eligible_techs.append((tech, distance))
		
		if not eligible_techs:
			unassigned_jobs.append({
				"job_id": job.id,
				"reason": "No technicians with required skills"
			})
			continue
		
		# Sort by distance (closest first)
		eligible_techs.sort(key=lambda x: x[1])
		
		# Assign to closest eligible technician
		best_tech, distance = eligible_techs[0]
		
		try:
			assignment_logic.create_assignment(db, job.id, best_tech.id)
			assigned_count += 1
		except Exception as e:
			unassigned_jobs.append({
				"job_id": job.id,
				"reason": str(e)
			})
	
	return {
		"success": True,
		"message": f"Auto-routing complete",
		"jobs_assigned": assigned_count,
		"jobs_unassigned": len(unassigned_jobs),
		"unassigned_details": unassigned_jobs
	}


def find_best_technician_for_job(
	db: Session,
	job_id: int
) -> Optional[Tuple[Technician, float]]:
	"""
	Find the best technician for a specific job
	Returns (technician, distance) or None
	"""
	job = job_logic.get_job(db, job_id)
	if not job:
		return None
	
	available_techs = tech_logic.get_available_technicians(db)
	eligible_techs = []
	
	for tech in available_techs:
		can_do, missing = job_logic.can_technician_do_job(job, tech)
		if can_do:
			distance = haversine_distance(
				tech.home_latitude,
				tech.home_longitude,
				job.latitude,
				job.longitude
			)
			eligible_techs.append((tech, distance))
	
	if not eligible_techs:
		return None
	
	# Return closest
	eligible_techs.sort(key=lambda x: x[1])
	return eligible_techs[0]
