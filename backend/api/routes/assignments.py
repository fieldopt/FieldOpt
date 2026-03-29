"""
API routes for assignment operations
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from backend.database.connection import get_db
from backend.api.schemas import (
	AssignmentCreate, AssignmentResponse,
	UnassignRequest, ReassignRequest, MessageResponse,
	BatchAssignRequest, BatchUnassignRequest, BatchResult,
)
from backend.logic import assignments as assignment_logic

router = APIRouter()


@router.post("/", response_model=AssignmentResponse, status_code=201)
async def create_assignment(assign_data: AssignmentCreate, db: AsyncSession = Depends(get_db)):
	"""Assign a job to a technician"""
	try:
		assignment = await assignment_logic.create_assignment(
			db=db,
			job_id=assign_data.job_id,
			technician_id=assign_data.technician_id,
			sequence=assign_data.sequence,
		)
		return assignment
	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))


@router.get("/technician/{tech_id}", response_model=List[AssignmentResponse])
async def get_technician_assignments(tech_id: int, db: AsyncSession = Depends(get_db)):
	"""Get all assignments for a technician"""
	return await assignment_logic.get_assignments_for_technician(db, tech_id)


@router.get("/job/{job_id}", response_model=AssignmentResponse)
async def get_job_assignment(job_id: int, db: AsyncSession = Depends(get_db)):
	"""Get assignment for a specific job"""
	assignment = await assignment_logic.get_assignments_for_job(db, job_id)
	if not assignment:
		raise HTTPException(status_code=404, detail=f"No assignment found for job {job_id}")
	return assignment


@router.post("/unassign", response_model=MessageResponse)
async def unassign_job(unassign_data: UnassignRequest, db: AsyncSession = Depends(get_db)):
	"""Unassign a job from its technician"""
	success = await assignment_logic.unassign_job(db, unassign_data.job_id)
	if not success:
		raise HTTPException(status_code=404, detail=f"No assignment found for job {unassign_data.job_id}")
	return MessageResponse(success=True, message=f"Job {unassign_data.job_id} unassigned")


@router.post("/reassign", response_model=AssignmentResponse)
async def reassign_job(reassign_data: ReassignRequest, db: AsyncSession = Depends(get_db)):
	"""Reassign a job to a different technician"""
	try:
		assignment = await assignment_logic.reassign_job(
			db=db,
			job_id=reassign_data.job_id,
			new_technician_id=reassign_data.new_technician_id,
		)
		return assignment
	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))


@router.post("/batch-assign", response_model=BatchResult)
async def batch_assign(data: BatchAssignRequest, db: AsyncSession = Depends(get_db)):
	"""Assign multiple jobs to a single technician in one transaction"""
	try:
		result = await assignment_logic.batch_assign(
			db=db,
			job_ids=data.job_ids,
			technician_id=data.technician_id,
		)
		return BatchResult(
			success=result["assigned"] > 0,
			assigned=result["assigned"],
			skipped=result["skipped"],
			errors=result["errors"],
		)
	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))


@router.post("/batch-unassign", response_model=BatchResult)
async def batch_unassign(data: BatchUnassignRequest, db: AsyncSession = Depends(get_db)):
	"""Unassign multiple jobs in one transaction"""
	result = await assignment_logic.batch_unassign(db=db, job_ids=data.job_ids)
	return BatchResult(
		success=result["unassigned"] > 0,
		unassigned=result["unassigned"],
		skipped=result["skipped"],
	)
