"""
Pydantic Schemas for Job API
Request/Response models for validation and serialization
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from backend.database.models import JobStatus, JobType


class JobBase(BaseModel):
	"""Base job schema"""
	customer_name: str = Field(..., min_length=1, max_length=100)
	customer_phone: Optional[str] = Field(None, max_length=20)
	customer_email: Optional[str] = Field(None, max_length=100)
	service_address: str = Field(..., min_length=1, max_length=255)
	service_city: Optional[str] = Field(None, max_length=100)
	service_zip: Optional[str] = Field(None, max_length=10)


class JobCreate(JobBase):
	"""Schema for creating a new job"""
	job_number: Optional[str] = Field(None, max_length=50)
	job_type: JobType
	latitude: float = Field(..., ge=-90, le=90)
	longitude: float = Field(..., ge=-180, le=180)
	required_skills: List[str] = Field(default_factory=list)
	route_criteria: Optional[str] = Field(None, max_length=50)
	priority: int = Field(default=3, ge=1, le=5)
	scheduled_date: Optional[datetime] = None
	time_slot_start: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
	time_slot_end: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
	estimated_duration: int = Field(default=60, ge=15, le=480)
	description: Optional[str] = None
	notes: Optional[str] = None
	special_instructions: Optional[str] = None


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
	route_criteria: Optional[str] = Field(None, max_length=50)
	priority: Optional[int] = Field(None, ge=1, le=5)
	scheduled_date: Optional[datetime] = None
	time_slot_start: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
	time_slot_end: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
	estimated_duration: Optional[int] = Field(None, ge=15, le=480)
	description: Optional[str] = None
	notes: Optional[str] = None
	special_instructions: Optional[str] = None


class JobStatusUpdate(BaseModel):
	"""Schema for updating job status"""
	status: JobStatus
	reason: Optional[str] = Field(None, max_length=500)


class JobResponse(JobBase):
	"""Schema for job responses — includes assignment info"""
	id: int
	job_number: Optional[str]
	job_type: JobType
	status: JobStatus
	latitude: float
	longitude: float
	required_skills: List[str]
	route_criteria: Optional[str] = None
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
	# Assignment data — populated from the relationship
	assigned_tech_id: Optional[int] = None
	assigned_tech_name: Optional[str] = None
	# Live schedule — used by the tech timeline so blocks reflect actual ETA
	# and sampled duration, not the customer-facing time-slot window.
	estimated_arrival: Optional[datetime] = None
	actual_duration_minutes: Optional[int] = None

	model_config = ConfigDict(from_attributes=True)

	@classmethod
	def from_orm_with_assignment(cls, job):
		"""Build response with assignment data included"""
		data = {
			"id": job.id,
			"job_number": job.job_number,
			"job_type": job.job_type,
			"status": job.status,
			"customer_name": job.customer_name,
			"customer_phone": job.customer_phone,
			"customer_email": job.customer_email,
			"service_address": job.service_address,
			"service_city": job.service_city,
			"service_zip": job.service_zip,
			"latitude": job.latitude,
			"longitude": job.longitude,
			"required_skills": job.required_skills,
			"route_criteria": job.route_criteria,
			"priority": job.priority,
			"scheduled_date": job.scheduled_date,
			"time_slot_start": job.time_slot_start,
			"time_slot_end": job.time_slot_end,
			"estimated_duration": job.estimated_duration,
			"description": job.description,
			"notes": job.notes,
			"special_instructions": job.special_instructions,
			"created_at": job.created_at,
			"updated_at": job.updated_at,
			"started_at": job.started_at,
			"completed_at": job.completed_at,
			"assigned_tech_id": None,
			"assigned_tech_name": None,
			"estimated_arrival": None,
			"actual_duration_minutes": None,
		}
		if job.assignment:
			data["assigned_tech_id"] = job.assignment.technician_id
			data["estimated_arrival"] = job.assignment.estimated_arrival
			data["actual_duration_minutes"] = job.assignment.actual_duration_minutes
			if job.assignment.technician:
				data["assigned_tech_name"] = job.assignment.technician.name
		return cls(**data)


class JobSummary(BaseModel):
	"""Schema for job summary statistics"""
	total: int
	pending: int
	assigned: int
	in_progress: int
	completed: int
	cancelled: int
	on_hold: int


class CanDoResult(BaseModel):
	"""Schema for CanDo functionality result — skill, route, time checks"""
	job_id: int
	technician_id: int
	can_do: bool
	has_skill: bool
	has_route: bool
	has_time: bool
	missing_skills: List[str]
	route_match: bool
	distance_miles: Optional[float] = None
