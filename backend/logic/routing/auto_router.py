"""
Auto-Routing Algorithm
Automatically assign jobs to technicians based on WFX principles
"""
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Tuple, Optional
from datetime import date

from backend.database.models import Job, Technician, JobStatus, TechnicianStatus
from backend.logic import jobs as job_logic
from backend.logic import technicians as tech_logic
from backend.logic import assignments as assignment_logic
from backend.logic.routing.distance import haversine_distance


async def auto_route_jobs(
	db: AsyncSession,
	target_date: Optional[date] = None,
) -> Dict:
	"""
	Auto-route pending jobs to available technicians.
	Based on WFX Auto-Route logic: skills, capacity, distance.

	Returns a summary dict of assignment results.
	"""
	pending_jobs = await job_logic.get_pending_jobs(db, scheduled_date=target_date)
	available_techs = await tech_logic.get_available_technicians(db)

	if not pending_jobs:
		return {
			"success": True,
			"message": "No pending jobs to route",
			"jobs_assigned": 0,
			"jobs_unassigned": 0,
			"unassigned_details": [],
		}

	if not available_techs:
		return {
			"success": False,
			"message": "No available technicians",
			"jobs_assigned": 0,
			"jobs_unassigned": len(pending_jobs),
			"unassigned_details": [
				{"job_id": j.id, "reason": "No available technicians"} for j in pending_jobs
			],
		}

	assigned_count = 0
	unassigned_jobs = []

	# Sort jobs by priority (1 = highest priority)
	pending_jobs = sorted(pending_jobs, key=lambda j: j.priority)

	for job in pending_jobs:
		eligible_techs = []

		for tech in available_techs:
			result = job_logic.can_technician_do_job(job, tech)
			if not result["can_do"]:
				continue

			# FIX: Use current location when available, fall back to home base
			origin_lat = tech.current_latitude if tech.current_latitude is not None else tech.home_latitude
			origin_lon = tech.current_longitude if tech.current_longitude is not None else tech.home_longitude

			distance = haversine_distance(origin_lat, origin_lon, job.latitude, job.longitude)
			eligible_techs.append((tech, distance))

		if not eligible_techs:
			unassigned_jobs.append({
				"job_id": job.id,
				"reason": "No technicians with required skills",
			})
			continue

		# Closest eligible technician first
		eligible_techs.sort(key=lambda x: x[1])
		best_tech, distance = eligible_techs[0]

		try:
			await assignment_logic.create_assignment(db, job.id, best_tech.id)
			assigned_count += 1
		except Exception as e:
			unassigned_jobs.append({
				"job_id": job.id,
				"reason": str(e),
			})

	return {
		"success": True,
		"message": "Auto-routing complete",
		"jobs_assigned": assigned_count,
		"jobs_unassigned": len(unassigned_jobs),
		"unassigned_details": unassigned_jobs,
	}


async def find_best_technician_for_job(
	db: AsyncSession,
	job_id: int,
) -> Optional[Tuple[Technician, float]]:
	"""
	Find the best available technician for a specific job.
	Returns (technician, distance_miles) or None if no match.
	"""
	job = await job_logic.get_job(db, job_id)
	if not job:
		return None

	available_techs = await tech_logic.get_available_technicians(db)
	eligible_techs = []

	for tech in available_techs:
		result = job_logic.can_technician_do_job(job, tech)
		if not result["can_do"]:
			continue

		origin_lat = tech.current_latitude if tech.current_latitude is not None else tech.home_latitude
		origin_lon = tech.current_longitude if tech.current_longitude is not None else tech.home_longitude

		distance = haversine_distance(origin_lat, origin_lon, job.latitude, job.longitude)
		eligible_techs.append((tech, distance))

	if not eligible_techs:
		return None

	eligible_techs.sort(key=lambda x: x[1])
	return eligible_techs[0]
