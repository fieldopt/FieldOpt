"""
Pydantic Schemas for Technician API
Request/Response models for validation and serialization
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from backend.database.models import TechnicianStatus


# Base schema with common fields
class TechnicianBase(BaseModel):
	"""Base technician schema"""
	name: str = Field(..., min_length=1, max_length=100)
	employee_id: Optional[str] = Field(None, max_length=50)
	phone: Optional[str] = Field(None, max_length=20)
	email: Optional[str] = Field(None, max_length=100)


# Schema for creating a new technician
class TechnicianCreate(TechnicianBase):
	"""Schema for creating a new technician"""
	home_latitude: float = Field(..., ge=-90, le=90)
	home_longitude: float = Field(..., ge=-180, le=180)
	home_address: Optional[str] = None
	skills: List[str] = Field(default_factory=list)
	shift_start: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")  # HH:MM format
	shift_end: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
	max_jobs_per_day: int = Field(default=8, ge=1, le=20)


# Schema for updating technician
class TechnicianUpdate(BaseModel):
	"""Schema for updating technician information"""
	name: Optional[str] = Field(None, min_length=1, max_length=100)
	phone: Optional[str] = Field(None, max_length=20)
	email: Optional[str] = Field(None, max_length=100)
	home_latitude: Optional[float] = Field(None, ge=-90, le=90)
	home_longitude: Optional[float] = Field(None, ge=-180, le=180)
	home_address: Optional[str] = None
	skills: Optional[List[str]] = None
	shift_start: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
	shift_end: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
	max_jobs_per_day: Optional[int] = Field(None, ge=1, le=20)
	is_active: Optional[bool] = None


# Schema for location updates
class TechnicianLocationUpdate(BaseModel):
	"""Schema for updating technician location"""
	latitude: float = Field(..., ge=-90, le=90)
	longitude: float = Field(..., ge=-180, le=180)


# Schema for status updates
class TechnicianStatusUpdate(BaseModel):
	"""Schema for updating technician status"""
	status: TechnicianStatus


# Schema for API responses
class TechnicianResponse(TechnicianBase):
	"""Schema for technician responses"""
	id: int
	status: TechnicianStatus
	is_active: bool
	current_latitude: Optional[float]
	current_longitude: Optional[float]
	last_location_update: Optional[datetime]
	home_latitude: float
	home_longitude: float
	home_address: Optional[str]
	skills: List[str]
	shift_start: Optional[str]
	shift_end: Optional[str]
	max_jobs_per_day: int
	created_at: datetime
	updated_at: datetime
	
	model_config = ConfigDict(from_attributes=True)


# Workload information
class TechnicianWorkload(BaseModel):
	"""Schema for technician workload information"""
	technician_id: int
	technician_name: str
	date: datetime
	assigned_jobs: int
	max_jobs: int
	available_capacity: int
	total_estimated_hours: float
	status: TechnicianStatus


# Generic message response
class MessageResponse(BaseModel):
	"""Generic message response"""
	success: bool
	message: str
