"""
Pydantic Schemas for Assignment API
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class AssignmentCreate(BaseModel):
	"""Schema for creating an assignment"""
	job_id: int
	technician_id: int
	sequence: Optional[int] = None


class AssignmentResponse(BaseModel):
	"""Schema for assignment responses"""
	id: int
	job_id: int
	technician_id: int
	assigned_at: datetime
	sequence: Optional[int]
	estimated_travel_time: Optional[int]
	estimated_distance: Optional[float]
	estimated_arrival: Optional[datetime]
	created_at: datetime
	updated_at: datetime
	
	model_config = ConfigDict(from_attributes=True)


class UnassignRequest(BaseModel):
	"""Schema for unassigning a job"""
	job_id: int


class ReassignRequest(BaseModel):
	"""Schema for reassigning a job"""
	job_id: int
	new_technician_id: int
