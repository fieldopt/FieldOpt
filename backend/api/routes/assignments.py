"""
API routes for assignment operations
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.database.connection import get_db
from backend.api.schemas import (
	AssignmentCreate, AssignmentResponse,
	UnassignRequest, ReassignRequest, MessageResponse
)
from backend.logic import assignments as assignment_logic

router = APIRouter()


@router.post("/", response_model=AssignmentResponse, status_code=201)
def create_assignment(assign_data: AssignmentCreate, db: Session = Depends(get_db)):
	"""Assign a job to a technician"""
	try:
		assignment = assignment_logic.create_assignment(
			db=db,
			job_id=assign_data.job_id,
			technician_id=assign_data.technician_id,
			sequence=assign_data.sequence
		)
		return assignment
	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))


@router.get("/technician/{tech_id}", response_model=List[AssignmentResponse])
def get_technician_assignments(tech_id: int, db: Session = Depends(get_db)):
	"""Get all assignments for a technician"""
	assignments = assignment_logic.get_assignments_for_technician(db, tech_id)
	return assignments


@router.get("/job/{job_id}", response_model=AssignmentResponse)
def get_job_assignment(job_id: int, db: Session = Depends(get_db)):
	"""Get assignment for a specific job"""
	assignment = assignment_logic.get_assignments_for_job(db, job_id)
	if not assignment:
		raise HTTPException(status_code=404, detail=f"No assignment found for job {job_id}")
	return assignment


@router.post("/unassign", response_model=MessageResponse)
def unassign_job(unassign_data: UnassignRequest, db: Session = Depends(get_db)):
	"""Unassign a job from its technician"""
	success = assignment_logic.unassign_job(db, unassign_data.job_id)
	if not success:
		raise HTTPException(status_code=404, detail=f"No assignment found for job {unassign_data.job_id}")
	return MessageResponse(success=True, message=f"Job {unassign_data.job_id} unassigned")


@router.post("/reassign", response_model=AssignmentResponse)
def reassign_job(reassign_data: ReassignRequest, db: Session = Depends(get_db)):
	"""Reassign a job to a different technician"""
	try:
		assignment = assignment_logic.reassign_job(
			db=db,
			job_id=reassign_data.job_id,
			new_technician_id=reassign_data.new_technician_id
		)
		return assignment
	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))
