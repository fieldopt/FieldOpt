"""
Day script — defines the simulated dispatch day's arrival curve and scripted beats.

Jobs are split into two pools:
  - PRELOADED: Already in DB as PENDING at sim start (morning load, ~20 jobs).
  - DRIP: Released into PENDING state at specific virtual times during the day.

Scripted beats inject drama at known virtual times for the demo story.

The loop calls `get_drip_jobs(now, last_tick)` each tick to find any jobs
that should be released between last_tick and now.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Callable, Awaitable

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.models import Job, JobStatus, Technician, TechnicianStatus


@dataclass
class Beat:
    """A scripted event at a specific virtual offset from sim start."""
    offset_minutes: int   # minutes after sim start (08:00)
    description: str
    handler: str          # name of the handler function below


# ── Arrival curve ────────────────────────────────────────────────────────────
# Each entry: (offset_minutes_from_start, route_criteria, job_type_filter)
# The loop uses this to pick matching PENDING jobs and keep them PENDING until
# the right virtual time, then un-holds them.
#
# Simpler approach used here: jobs with scheduled_date = today are ALL preloaded
# as PENDING. The drip effect is achieved by holding a subset ON_HOLD and
# releasing them on schedule.

DRIP_SCHEDULE = [
	# (offset_minutes, route_criteria_hint)
	# These jobs get released from ON_HOLD at these virtual times.
	# Populated dynamically from day_script.json — see load_script().
]


# ── Scripted beats ───────────────────────────────────────────────────────────

BEATS: list[Beat] = [
	Beat(
		offset_minutes=167,  # 10:47 virtual — about 1/3 into an 8-hour day
		description="VIP emergency: Apollo Theater — main console failure mid-load-in",
		handler="vip_emergency",
	),
	Beat(
		offset_minutes=240,  # 12:00 — afternoon drip surge
		description="Afternoon rush — 5 new jobs drop in",
		handler="afternoon_surge",
	),
]

_fired_beats: set[int] = set()


async def process_beats(
	db: AsyncSession,
	now: datetime,
	sim_start: datetime,
) -> list[str]:
	"""
	Check scripted beats and fire any that fall between last processed time and now.
	Returns list of description strings for fired beats (for event emission).
	"""
	elapsed_min = (now - sim_start).total_seconds() / 60
	fired = []

	for beat in BEATS:
		if beat.offset_minutes in _fired_beats:
			continue
		if elapsed_min >= beat.offset_minutes:
			_fired_beats.add(beat.offset_minutes)
			handler = _BEAT_HANDLERS.get(beat.handler)
			if handler:
				await handler(db, now)
			fired.append(beat.description)

	return fired


def reset_beats() -> None:
	"""Call on sim reset so beats fire again on next run."""
	_fired_beats.clear()


# ── Beat handlers ────────────────────────────────────────────────────────────

async def _vip_emergency(db: AsyncSession, now: datetime) -> None:
	"""Inject a priority-1 emergency job into the pending queue."""
	from backend.logic.routing.distance import haversine_distance
	emergency = Job(
		job_number="VIP-EMERGENCY-001",
		job_type="service_change",
		status=JobStatus.PENDING,
		customer_name="Apollo Theater — EMERGENCY",
		service_address="253 W 125th St",
		service_city="New York",
		service_zip="10027",
		latitude=40.8100,
		longitude=-73.9500,
		required_skills=["service_change", "install"],
		route_criteria="MN-HARLEM",
		priority=1,
		scheduled_date=now,
		estimated_duration=120,
		description="Main console failed mid-load-in — show in 3 hours",
		special_instructions="VIP EMERGENCY — drop everything",
	)
	db.add(emergency)
	await db.commit()


async def _tech_on_break(db: AsyncSession, now: datetime) -> None:
	"""Put Dizzy Gillespie on break."""
	result = await db.execute(
		select(Technician).where(Technician.employee_id == "DG007")
	)
	tech = result.scalar_one_or_none()
	if tech and tech.status == TechnicianStatus.AVAILABLE:
		tech.status = TechnicianStatus.ON_BREAK
		await db.commit()


async def _afternoon_surge(db: AsyncSession, now: datetime) -> None:
	"""Release ON_HOLD jobs tagged for afternoon drip."""
	await db.execute(
		update(Job)
		.where(
			Job.status == JobStatus.ON_HOLD,
			Job.notes.contains("DRIP:AFTERNOON"),
		)
		.values(status=JobStatus.PENDING)
	)
	await db.commit()


_BEAT_HANDLERS: dict[str, Callable] = {
	"vip_emergency": _vip_emergency,
	"tech_on_break": _tech_on_break,
	"afternoon_surge": _afternoon_surge,
}
