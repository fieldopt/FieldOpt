"""
API routes for technician operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.database.connection import get_db
from backend.api.schemas import (
	TechnicianCreate, TechnicianResponse, TechnicianUpdate,
	TechnicianLocationUpdate, TechnicianStatusUpdate,
	TechnicianWorkload, MessageResponse
)
from backend.logic import technicians as tech_logic
from backend.database.models import TechnicianStatus

router = APIRouter()


@router.post("/", response_model=TechnicianResponse, status_code=201)
def create_technician(tech_data: TechnicianCreate, db: Session = Depends(get_db)):
	"""Create a new technician"""
	try:
		technician = tech_logic.create_technician(
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
			max_jobs_per_day=tech_data.max_jobs_per_day
		)
		return technician
	except Exception as e:
		raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[TechnicianResponse])
def get_technicians(
	skip: int = Query(0, ge=0),
	limit: int = Query(100, ge=1, le=500),
	db: Session = Depends(get_db)
):
	"""Get all technicians"""
	technicians = tech_logic.get_all_technicians(db, skip=skip, limit=limit)
	return technicians


@router.get("/available", response_model=List[TechnicianResponse])
def get_available_technicians(db: Session = Depends(get_db)):
	"""Get all available technicians"""
	technicians = tech_logic.get_available_technicians(db)
	return technicians


@router.get("/{tech_id}", response_model=TechnicianResponse)
def get_technician(tech_id: int, db: Session = Depends(get_db)):
	"""Get a specific technician by ID"""
	technician = tech_logic.get_technician(db, tech_id)
	if not technician:
		raise HTTPException(status_code=404, detail=f"Technician {tech_id} not found")
	return technician


@router.patch("/{tech_id}", response_model=TechnicianResponse)
def update_technician(
	tech_id: int,
	tech_data: TechnicianUpdate,
	db: Session = Depends(get_db)
):
	"""Update technician information"""
	technician = tech_logic.get_technician(db, tech_id)
	if not technician:
		raise HTTPException(status_code=404, detail=f"Technician {tech_id} not found")
	
	# Update fields if provided
	update_data = tech_data.model_dump(exclude_unset=True)
	updated_tech = tech_logic.update_technician(db, tech_id, **update_data)
	
	return updated_tech


@router.patch("/{tech_id}/location", response_model=TechnicianResponse)
def update_technician_location(
	tech_id: int,
	location_data: TechnicianLocationUpdate,
	db: Session = Depends(get_db)
):
	"""Update technician's current location"""
	technician = tech_logic.update_technician_location(
		db,
		tech_id,
		location_data.latitude,
		location_data.longitude
	)
	if not technician:
		raise HTTPException(status_code=404, detail=f"Technician {tech_id} not found")
	return technician


@router.patch("/{tech_id}/status", response_model=TechnicianResponse)
def update_technician_status(
	tech_id: int,
	status_data: TechnicianStatusUpdate,
	db: Session = Depends(get_db)
):
	"""Update technician's status"""
	technician = tech_logic.update_technician_status(db, tech_id, status_data.status)
	if not technician:
		raise HTTPException(status_code=404, detail=f"Technician {tech_id} not found")
	return technician


@router.get("/{tech_id}/workload", response_model=TechnicianWorkload)
def get_technician_workload(tech_id: int, db: Session = Depends(get_db)):
	"""Get technician's current workload"""
	workload = tech_logic.get_technician_workload(db, tech_id)
	if workload is None:
		raise HTTPException(status_code=404, detail=f"Technician {tech_id} not found")
	return workload


@router.delete("/{tech_id}", response_model=MessageResponse)
def delete_technician(tech_id: int, db: Session = Depends(get_db)):
	"""Delete a technician"""
	success = tech_logic.delete_technician(db, tech_id)
	if not success:
		raise HTTPException(status_code=404, detail=f"Technician {tech_id} not found")
	return MessageResponse(success=True, message=f"Technician {tech_id} deleted")
