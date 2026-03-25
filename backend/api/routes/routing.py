"""
API routes for routing operations
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_db
from backend.api.schemas import AutoRouteRequest, AutoRouteResponse, BestTechResponse
from backend.logic.routing import auto_router
from backend.logic import jobs as job_logic

router = APIRouter()


@router.post("/auto-route", response_model=AutoRouteResponse)
async def auto_route(route_request: AutoRouteRequest, db: AsyncSession = Depends(get_db)):
	"""
	Automatically route pending jobs to available technicians.
	Based on WFX Auto-Route: considers skills, capacity, and distance.
	"""
	result = await auto_router.auto_route_jobs(db, target_date=route_request.target_date)
	return AutoRouteResponse(**result)


@router.get("/best-tech/{job_id}", response_model=BestTechResponse)
async def find_best_tech(job_id: int, db: AsyncSession = Depends(get_db)):
	"""Find the best available technician for a specific job"""
	job = await job_logic.get_job(db, job_id)
	if not job:
		raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

	result = await auto_router.find_best_technician_for_job(db, job_id)

	if not result:
		return BestTechResponse(
			job_id=job_id,
			technician_id=None,
			technician_name=None,
			distance=None,
			has_match=False,
		)

	tech, distance = result
	return BestTechResponse(
		job_id=job_id,
		technician_id=tech.id,
		technician_name=tech.name,
		distance=distance,
		has_match=True,
	)
