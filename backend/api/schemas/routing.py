"""
Pydantic Schemas for Routing API
"""
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import date


class AutoRouteRequest(BaseModel):
	"""Schema for auto-route request"""
	target_date: Optional[date] = None


class AutoRouteResponse(BaseModel):
	"""Schema for auto-route response"""
	success: bool
	message: str
	jobs_assigned: int
	jobs_unassigned: int
	unassigned_details: Optional[List[Dict]] = None


class BestTechResponse(BaseModel):
	"""Schema for best technician response"""
	job_id: int
	technician_id: Optional[int]
	technician_name: Optional[str]
	distance: Optional[float]
	has_match: bool
