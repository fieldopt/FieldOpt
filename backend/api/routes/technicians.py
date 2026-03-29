"""
API routes for technician operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from backend.database.connection import get_db
from backend.api.schemas import (
	TechnicianCreate, TechnicianResponse, TechnicianUpdate,
	TechnicianLocationUpdate, TechnicianStatusUpdate,
	TechnicianWorkload, MessageResponse,
)
from backend.logic import technicians as tech_logic
from backend.database.models import TechnicianStatus

router = APIRouter()


@router.post("/", response_model=TechnicianResponse, status_code=201)
async def create_technician(tech_data: TechnicianCreate, db: AsyncSession = Depends(get_db)):
	"""Create a new technician"""
	try:
		technician = await tech_logic.create_technician(
			db=db,
			name=tech_data.name,
			email=tech_data.email,
			phone=tech_data.phone,
			home_latitude=tech_data.home_latitude,
			home_longitude=tech_data.home_longitude,
			skills=tech_data.skills,
			home_address=tech_data.home_address,
			shift_start=tech_data.shift_start,
			shift_end=tech_data.shift_end,
			max_jobs_per_day=tech_data.max_jobs_per_day,
		)
		return TechnicianResponse.from_orm_with_counts(technician)
	except Exception as e:
		raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[TechnicianResponse])
async def get_technicians(
	skip: int = Query(0, ge=0),
	limit: int = Query(100, ge=1, le=500),
	db: AsyncSession = Depends(get_db),
):
	"""Get all technicians with job counts"""
	techs = await tech_logic.get_all_technicians(db, skip=skip, limit=limit)
	return [TechnicianResponse.from_orm_with_counts(t) for t in techs]


@router.get("/available", response_model=List[TechnicianResponse])
async def get_available_technicians(db: AsyncSession = Depends(get_db)):
	"""Get all available technicians"""
	techs = await tech_logic.get_available_technicians(db)
	return [TechnicianResponse.from_orm_with_counts(t) for t in techs]


@router.get("/{tech_id}", response_model=TechnicianResponse)
async def get_technician(tech_id: int, db: AsyncSession = Depends(get_db)):
	"""Get a specific technician by ID"""
	technician = await tech_logic.get_technician(db, tech_id)
	if not technician:
		raise HTTPException(status_code=404, detail=f"Technician {tech_id} not found")
	return TechnicianResponse.from_orm_with_counts(technician)


@router.patch("/{tech_id}", response_model=TechnicianResponse)
async def update_technician(
	tech_id: int,
	tech_data: TechnicianUpdate,
	db: AsyncSession = Depends(get_db),
):
	"""Update technician information"""
	technician = await tech_logic.get_technician(db, tech_id)
	if not technician:
		raise HTTPException(status_code=404, detail=f"Technician {tech_id} not found")

	update_data = tech_data.model_dump(exclude_unset=True)
	updated = await tech_logic.update_technician(db, tech_id, **update_data)
	return TechnicianResponse.from_orm_with_counts(updated)


@router.patch("/{tech_id}/location", response_model=TechnicianResponse)
async def update_technician_location(
	tech_id: int,
	location_data: TechnicianLocationUpdate,
	db: AsyncSession = Depends(get_db),
):
	"""Update technician's current location"""
	technician = await tech_logic.update_technician_location(
		db, tech_id, location_data.latitude, location_data.longitude,
	)
	if not technician:
		raise HTTPException(status_code=404, detail=f"Technician {tech_id} not found")
	return TechnicianResponse.from_orm_with_counts(technician)


@router.patch("/{tech_id}/status", response_model=TechnicianResponse)
async def update_technician_status(
	tech_id: int,
	status_data: TechnicianStatusUpdate,
	db: AsyncSession = Depends(get_db),
):
	"""Update technician's status"""
	technician = await tech_logic.update_technician_status(db, tech_id, status_data.status)
	if not technician:
		raise HTTPException(status_code=404, detail=f"Technician {tech_id} not found")
	return TechnicianResponse.from_orm_with_counts(technician)


@router.get("/{tech_id}/workload", response_model=TechnicianWorkload)
async def get_technician_workload(tech_id: int, db: AsyncSession = Depends(get_db)):
	"""Get technician's current workload for today"""
	workload = await tech_logic.get_technician_workload(db, tech_id)
	if workload is None:
		raise HTTPException(status_code=404, detail=f"Technician {tech_id} not found")
	return workload


@router.delete("/{tech_id}", response_model=MessageResponse)
async def delete_technician(tech_id: int, db: AsyncSession = Depends(get_db)):
	"""Deactivate a technician (soft delete)"""
	success = await tech_logic.delete_technician(db, tech_id)
	if not success:
		raise HTTPException(status_code=404, detail=f"Technician {tech_id} not found")
	return MessageResponse(success=True, message=f"Technician {tech_id} deactivated")
