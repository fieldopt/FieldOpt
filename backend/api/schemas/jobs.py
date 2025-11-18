"""
Pydantic Schemas for Job API
Request/Response models for validation and serialization
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from backend.database.models import JobStatus, JobType


# Base schema with common fields
class JobBase(BaseModel):
	"""Base job schema"""
	customer_name: str = Field(..., min_length=1, max_length=100)
	customer_phone: Optional[str] = Field(None, max_length=20)
	customer_email: Optional[str] = Field(None, max_length=100)
	service_address: str = Field(..., min_length=1, max_length=255)
	service_city: Optional[str] = Field(None, max_length=100)
	service_zip: Optional[str] = Field(None, max_length=10)


# Schema for creating a new job
class JobCreate(JobBase):
	"""Schema for creating a new job"""
	job_number: Optional[str] = Field(None, max_length=50)
	job_type: JobType
	latitude: float = Field(..., ge=-90, le=90)
	longitude: float = Field(..., ge=-180, le=180)
	required_skills: List[str] = Field(default_factory=list)
	priority: int = Field(default=3, ge=1, le=5)
	scheduled_date: Optional[datetime] = None
	time_slot_start: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
	time_slot_end: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
	estimated_duration: int = Field(default=60, ge=15, le=480)
	description: Optional[str] = None
	notes: Optional[str] = None
	special_instructions: Optional[str] = None


# Schema for updating a job
class JobUpdate(BaseModel):
	"""Schema for updating job information"""
	customer_name: Optional[str] = Field(None, min_length=1, max_length=100)
	customer_phone: Optional[str] = Field(None, max_length=20)
	customer_email: Optional[str] = Field(None, max_length=100)
	service_address: Optional[str] = Field(None, min_length=1, max_length=255)
	service_city: Optional[str] = Field(None, max_length=100)
	service_zip: Optional[str] = Field(None, max_length=10)
	latitude: Optional[float] = Field(None, ge=-90, le=90)
	longitude: Optional[float] = Field(None, ge=-180, le=180)
	required_skills: Optional[List[str]] = None
	priority: Optional[int] = Field(None, ge=1, le=5)
	scheduled_date: Optional[datetime] = None
	time_slot_start: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
	time_slot_end: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
	estimated_duration: Optional[int] = Field(None, ge=15, le=480)
	description: Optional[str] = None
	notes: Optional[str] = None
	special_instructions: Optional[str] = None


# Schema for status updates
class JobStatusUpdate(BaseModel):
	"""Schema for updating job status"""
	status: JobStatus
	reason: Optional[str] = Field(None, max_length=500)


# Schema for API responses
class JobResponse(JobBase):
	"""Schema for job responses"""
	id: int
	job_number: Optional[str]
	job_type: JobType
	status: JobStatus
	latitude: float
	longitude: float
	required_skills: List[str]
	priority: int
	scheduled_date: Optional[datetime]
	time_slot_start: Optional[str]
	time_slot_end: Optional[str]
	estimated_duration: int
	description: Optional[str]
	notes: Optional[str]
	special_instructions: Optional[str]
	created_at: datetime
	updated_at: datetime
	started_at: Optional[datetime]
	completed_at: Optional[datetime]
	
	model_config = ConfigDict(from_attributes=True)


# Job summary for dashboard
class JobSummary(BaseModel):
	"""Schema for job summary statistics"""
	total: int
	pending: int
	assigned: int
	in_progress: int
	completed: int
	cancelled: int
	on_hold: int


# CanDo result
class CanDoResult(BaseModel):
	"""Schema for CanDo functionality result"""
	job_id: int
	technician_id: int
	can_do: bool
	missing_skills: List[str]
