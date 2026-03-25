"""
Database Models for FieldOpt
SQLAlchemy ORM models for technicians, jobs, and assignments
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Enum, ForeignKey, JSON, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
import enum


class Base(DeclarativeBase):
	"""Base class for all database models"""
	pass


class JobStatus(str, enum.Enum):
	"""Job status states following FSM pattern"""
	PENDING = "pending"
	ASSIGNED = "assigned"
	IN_PROGRESS = "in_progress"
	COMPLETED = "completed"
	CANCELLED = "cancelled"
	ON_HOLD = "on_hold"


class JobType(str, enum.Enum):
	"""Types of service jobs"""
	INSTALL = "install"
	REPAIR = "repair"
	MAINTENANCE = "maintenance"
	INSPECTION = "inspection"
	DISCONNECT = "disconnect"
	SERVICE_CHANGE = "service_change"


class TechnicianStatus(str, enum.Enum):
	"""Technician availability states"""
	AVAILABLE = "available"
	ON_JOB = "on_job"
	EN_ROUTE = "en_route"
	ON_BREAK = "on_break"
	OFF_DUTY = "off_duty"


class Technician(Base):
	"""
	Technician model representing field service technicians
	"""
	__tablename__ = "technicians"

	# Primary Key
	id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

	# Basic Info
	name: Mapped[str] = mapped_column(String(100), nullable=False)
	employee_id: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True)
	phone: Mapped[Optional[str]] = mapped_column(String(20))
	email: Mapped[Optional[str]] = mapped_column(String(100))

	# Status
	status: Mapped[TechnicianStatus] = mapped_column(
		Enum(TechnicianStatus),
		default=TechnicianStatus.AVAILABLE,
		nullable=False
	)
	is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

	# Location (current position)
	current_latitude: Mapped[Optional[float]] = mapped_column(Float)
	current_longitude: Mapped[Optional[float]] = mapped_column(Float)
	last_location_update: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

	# Home Base (starting location for routing)
	home_latitude: Mapped[float] = mapped_column(Float, nullable=False)
	home_longitude: Mapped[float] = mapped_column(Float, nullable=False)
	home_address: Mapped[Optional[str]] = mapped_column(String(255))

	# Skills (stored as JSON array of skill strings)
	skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

	# Schedule
	shift_start: Mapped[Optional[str]] = mapped_column(String(5))  # HH:MM format
	shift_end: Mapped[Optional[str]] = mapped_column(String(5))
	max_jobs_per_day: Mapped[int] = mapped_column(Integer, default=8)

	# Metadata
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
	updated_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True),
		default=datetime.utcnow,
		onupdate=datetime.utcnow
	)

	# Relationships — lazy="selectin" required for async SQLAlchemy
	# selectin loads related objects in a second SELECT IN query automatically,
	# avoiding the MissingGreenlet error that lazy="select" causes under asyncio
	assignments: Mapped[List["Assignment"]] = relationship(
		"Assignment",
		back_populates="technician",
		cascade="all, delete-orphan",
		lazy="selectin",
	)

	def __repr__(self):
		return f"<Technician(id={self.id}, name='{self.name}', status='{self.status}')>"


class Job(Base):
	"""
	Job model representing service jobs to be assigned and completed
	"""
	__tablename__ = "jobs"

	# Primary Key
	id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

	# Job Info
	job_number: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True)
	job_type: Mapped[JobType] = mapped_column(
		Enum(JobType),
		default=JobType.REPAIR,
		nullable=False
	)
	status: Mapped[JobStatus] = mapped_column(
		Enum(JobStatus),
		default=JobStatus.PENDING,
		nullable=False,
		index=True
	)

	# Customer Info
	customer_name: Mapped[str] = mapped_column(String(100), nullable=False)
	customer_phone: Mapped[Optional[str]] = mapped_column(String(20))
	customer_email: Mapped[Optional[str]] = mapped_column(String(100))

	# Service Address
	service_address: Mapped[str] = mapped_column(String(255), nullable=False)
	service_city: Mapped[Optional[str]] = mapped_column(String(100))
	service_zip: Mapped[Optional[str]] = mapped_column(String(10))
	latitude: Mapped[float] = mapped_column(Float, nullable=False)
	longitude: Mapped[float] = mapped_column(Float, nullable=False)

	# Required Skills (stored as JSON array)
	required_skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

	# Priority and Scheduling
	priority: Mapped[int] = mapped_column(Integer, default=3)  # 1=highest, 5=lowest
	scheduled_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
	time_slot_start: Mapped[Optional[str]] = mapped_column(String(5))  # HH:MM
	time_slot_end: Mapped[Optional[str]] = mapped_column(String(5))

	# Duration Estimate
	estimated_duration: Mapped[int] = mapped_column(Integer, default=60)  # minutes

	# Job Details
	description: Mapped[Optional[str]] = mapped_column(Text)
	notes: Mapped[Optional[str]] = mapped_column(Text)
	special_instructions: Mapped[Optional[str]] = mapped_column(Text)

	# Timing
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
	updated_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True),
		default=datetime.utcnow,
		onupdate=datetime.utcnow
	)
	started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
	completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

	# Relationships — lazy="selectin" for async safety
	assignment: Mapped[Optional["Assignment"]] = relationship(
		"Assignment",
		back_populates="job",
		uselist=False,
		cascade="all, delete-orphan",
		lazy="selectin",
	)

	def __repr__(self):
		return f"<Job(id={self.id}, type='{self.job_type}', status='{self.status}')>"


class Assignment(Base):
	"""
	Assignment model linking jobs to technicians with routing information
	"""
	__tablename__ = "assignments"

	# Primary Key
	id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

	# Foreign Keys
	job_id: Mapped[int] = mapped_column(Integer, ForeignKey("jobs.id"), unique=True, nullable=False)
	technician_id: Mapped[int] = mapped_column(Integer, ForeignKey("technicians.id"), nullable=False)

	# Assignment Details
	assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
	sequence: Mapped[Optional[int]] = mapped_column(Integer)  # Order in tech's route

	# Route Optimization Data
	estimated_travel_time: Mapped[Optional[int]] = mapped_column(Integer)  # minutes
	estimated_distance: Mapped[Optional[float]] = mapped_column(Float)    # miles
	estimated_arrival: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

	# Actual Performance
	actual_travel_time: Mapped[Optional[int]] = mapped_column(Integer)
	actual_arrival: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
	actual_completion: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

	# Metadata
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
	updated_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True),
		default=datetime.utcnow,
		onupdate=datetime.utcnow
	)

	# Relationships — lazy="selectin" for async safety
	job: Mapped["Job"] = relationship(
		"Job",
		back_populates="assignment",
		lazy="selectin",
	)
	technician: Mapped["Technician"] = relationship(
		"Technician",
		back_populates="assignments",
		lazy="selectin",
	)

	def __repr__(self):
		return f"<Assignment(id={self.id}, job_id={self.job_id}, tech_id={self.technician_id})>"
