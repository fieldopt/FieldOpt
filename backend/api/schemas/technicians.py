"""
Pydantic Schemas for Technician API
Request/Response models for validation and serialization
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from backend.database.models import TechnicianStatus


class TechnicianBase(BaseModel):
	"""Base technician schema"""
	name: str = Field(..., min_length=1, max_length=100)
	employee_id: Optional[str] = Field(None, max_length=50)
	phone: Optional[str] = Field(None, max_length=20)
	email: Optional[str] = Field(None, max_length=100)


class TechnicianCreate(TechnicianBase):
	"""Schema for creating a new technician"""
	home_latitude: float = Field(..., ge=-90, le=90)
	home_longitude: float = Field(..., ge=-180, le=180)
	home_address: Optional[str] = None
	skills: List[str] = Field(default_factory=list)
	assigned_routes: List[str] = Field(default_factory=list)
	shift_start: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
	shift_end: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
	max_jobs_per_day: int = Field(default=8, ge=1, le=20)


class TechnicianUpdate(BaseModel):
	"""Schema for updating technician information"""
	name: Optional[str] = Field(None, min_length=1, max_length=100)
	phone: Optional[str] = Field(None, max_length=20)
	email: Optional[str] = Field(None, max_length=100)
	home_latitude: Optional[float] = Field(None, ge=-90, le=90)
	home_longitude: Optional[float] = Field(None, ge=-180, le=180)
	home_address: Optional[str] = None
	skills: Optional[List[str]] = None
	assigned_routes: Optional[List[str]] = None
	shift_start: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
	shift_end: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
	max_jobs_per_day: Optional[int] = Field(None, ge=1, le=20)
	is_active: Optional[bool] = None


class TechnicianLocationUpdate(BaseModel):
	"""Schema for updating technician location"""
	latitude: float = Field(..., ge=-90, le=90)
	longitude: float = Field(..., ge=-180, le=180)


class TechnicianStatusUpdate(BaseModel):
	"""Schema for updating technician status"""
	status: TechnicianStatus


class TechnicianResponse(TechnicianBase):
	"""Schema for technician responses — includes job counts"""
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
	assigned_routes: List[str]
	shift_start: Optional[str]
	shift_end: Optional[str]
	max_jobs_per_day: int
	created_at: datetime
	updated_at: datetime
	# Computed from assignments relationship
	assigned_jobs: int = 0
	completed_jobs: int = 0

	model_config = ConfigDict(from_attributes=True)

	@classmethod
	def from_orm_with_counts(cls, tech):
		"""Build response with job counts from assignments"""
		assigned = 0
		completed = 0
		if tech.assignments:
			for a in tech.assignments:
				if a.job:
					if a.job.status == 'completed':
						completed += 1
					else:
						assigned += 1
				else:
					assigned += 1

		return cls(
			id=tech.id,
			name=tech.name,
			employee_id=tech.employee_id,
			phone=tech.phone,
			email=tech.email,
			status=tech.status,
			is_active=tech.is_active,
			current_latitude=tech.current_latitude,
			current_longitude=tech.current_longitude,
			last_location_update=tech.last_location_update,
			home_latitude=tech.home_latitude,
			home_longitude=tech.home_longitude,
			home_address=tech.home_address,
			skills=tech.skills,
			assigned_routes=tech.assigned_routes if tech.assigned_routes else [],
			shift_start=tech.shift_start,
			shift_end=tech.shift_end,
			max_jobs_per_day=tech.max_jobs_per_day,
			created_at=tech.created_at,
			updated_at=tech.updated_at,
			assigned_jobs=assigned,
			completed_jobs=completed,
		)


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


class MessageResponse(BaseModel):
	"""Generic message response"""
	success: bool
	message: str
