"""
Dispatch strategy protocol and implementations.

DispatchStrategy — Protocol defining the tick interface.
HeuristicStrategy — Skill + distance routing, time-slot gated.
MLStrategy — Skill + predicted completion time routing using embedded tech model.

v0.0.9 default is MLStrategy. HeuristicStrategy kept for A/B comparison.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional, Protocol, runtime_checkable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.models import Assignment, Job, JobStatus, Technician, TechnicianStatus
from backend.logic import assignments as assignment_logic
from backend.logic.jobs import can_technician_do_job
from backend.logic.routing.distance import haversine_distance, calculate_travel_time

logger = logging.getLogger(__name__)


@dataclass
class DispatchEvent:
    event_type: str          # "job_assigned" | "job_started" | "job_completed" | "overrun_warning" | "no_ops"
    timestamp: datetime
    job_id: int | None = None
    tech_id: int | None = None
    tech_name: str | None = None
    customer_name: str | None = None
    details: dict = field(default_factory=dict)


@runtime_checkable
class DispatchStrategy(Protocol):
    async def tick(self, db: AsyncSession, now: datetime, sim_date: Optional[datetime] = None) -> list[DispatchEvent]:
        """Called each sim tick. Assign pending jobs, return events. Idempotent."""
        ...


def _slot_minutes(time_str: str | None) -> int:
    """Parse HH:MM → minutes since midnight. Returns 0 if unparseable."""
    if not time_str:
        return 0
    try:
        h, m = map(int, time_str.split(':'))
        return h * 60 + m
    except (ValueError, AttributeError):
        return 0


def _now_minutes(now: datetime, sim_date: Optional[datetime]) -> int:
    """Dispatch-day minutes (08:00 = 480), monotonic across virtual midnight."""
    if sim_date is not None:
        elapsed = int((now - sim_date).total_seconds() / 60)
        return 8 * 60 + elapsed
    return now.hour * 60 + now.minute


async def _get_eligible_jobs(db: AsyncSession, now: datetime, sim_date: Optional[datetime] = None) -> list[Job]:
    """Pending jobs whose time_slot_start has passed. Filtered to sim_date only if provided."""
    query = select(Job).where(Job.status == JobStatus.PENDING)
    if sim_date is not None:
        day_start = sim_date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        query = query.where(Job.scheduled_date >= day_start, Job.scheduled_date < day_end)
    result = await db.execute(query)
    all_pending = result.scalars().all()

    now_min = _now_minutes(now, sim_date)
    return [j for j in all_pending if _slot_minutes(j.time_slot_start) <= now_min]


def _on_shift(tech: Technician, now_minutes: int) -> bool:
    """Tech eligible only while inside their shift window AND not on a scheduled
    break or lunch.

    Schedule (staggered by tech id parity so coverage stays continuous):
      mid-morning break: 15 min
        even ids → 10:30-10:45
        odd  ids → 10:45-11:00
      lunch:            30 min
        even ids → 12:00-12:30
        odd  ids → 12:30-13:00
    """
    if not tech.shift_start or not tech.shift_end:
        return True
    start = _slot_minutes(tech.shift_start)
    end = _slot_minutes(tech.shift_end)
    if not (start <= now_minutes < end):
        return False
    even = (tech.id or 0) % 2 == 0
    break_start = 10 * 60 + 30 if even else 10 * 60 + 45
    break_end = break_start + 15
    if break_start <= now_minutes < break_end:
        return False
    lunch_start = 12 * 60 if even else 12 * 60 + 30
    lunch_end = lunch_start + 30
    if lunch_start <= now_minutes < lunch_end:
        return False
    return True


def _fits_in_window(job: Job, now_minutes: int, travel_min: int, duration_min: int) -> bool:
    """Skip late dispatches: tech must at least *arrive* before the customer
    window closes. Work itself may legitimately spill past the window end —
    UI flags overruns separately. No time_slot_end → no constraint.
    """
    end = _slot_minutes(job.time_slot_end)
    if not end:
        return True
    return now_minutes + travel_min <= end


async def _get_available_techs(db: AsyncSession, now_minutes: int | None = None) -> list[Technician]:
    # Exclude techs already on an active job (defence-in-depth — status flag is the
    # primary gate, but a stale status shouldn't allow double-booking).
    busy_tech_ids = select(Assignment.technician_id).join(Job, Assignment.job_id == Job.id).where(
        Job.status.in_([JobStatus.ASSIGNED, JobStatus.IN_PROGRESS])
    )
    result = await db.execute(
        select(Technician).where(
            Technician.is_active == True,
            Technician.status == TechnicianStatus.AVAILABLE,
            ~Technician.id.in_(busy_tech_ids),
        )
    )
    techs = list(result.scalars().all())
    if now_minutes is not None:
        techs = [t for t in techs if _on_shift(t, now_minutes)]
    return techs


class HeuristicStrategy:
    """
    Skill + distance routing, time-slot gated.
    Assigns to the closest qualified technician.
    """
    async def tick(self, db: AsyncSession, now: datetime, sim_date: Optional[datetime] = None) -> list[DispatchEvent]:
        jobs = await _get_eligible_jobs(db, now, sim_date)
        if not jobs:
            return [DispatchEvent(event_type="no_ops", timestamp=now)]

        now_min = _now_minutes(now, sim_date)
        techs = await _get_available_techs(db, now_minutes=now_min)
        if not techs:
            return [DispatchEvent(event_type="no_ops", timestamp=now)]

        jobs.sort(key=lambda j: j.priority)
        events: list[DispatchEvent] = []

        for job in jobs:
            best_tech, best_dist = None, float('inf')
            for tech in techs:
                if not can_technician_do_job(job, tech)['can_do']:
                    continue
                lat = tech.current_latitude or tech.home_latitude
                lon = tech.current_longitude or tech.home_longitude
                d = haversine_distance(lat, lon, job.latitude, job.longitude)
                if d < best_dist:
                    best_dist, best_tech = d, tech
            if best_tech:
                try:
                    await assignment_logic.create_assignment(db, job.id, best_tech.id, now=now)
                    techs.remove(best_tech)  # tech now busy — don't pick again this tick
                    events.append(DispatchEvent(
                        event_type="job_assigned", timestamp=now,
                        job_id=job.id, tech_id=best_tech.id,
                        tech_name=best_tech.name, customer_name=job.customer_name,
                    ))
                except Exception:
                    logger.debug("Heuristic assign failed job=%s", job.id)

        return events or [DispatchEvent(event_type="no_ops", timestamp=now)]


class MLStrategy:
    """
    Embedded model routing — scores each (job, tech) pair by predicted
    completion time: travel_minutes + what_if_duration(job, tech).

    what_if_duration uses the hidden tech performance modifiers
    (speed_factor, skill_bonuses) to predict actual job duration.
    Techs that are faster at a job type get lower scores and win
    assignments over equidistant but slower techs — the key difference
    vs HeuristicStrategy.

    Also time-slot gated: jobs only dispatched once their window opens.
    """
    async def tick(self, db: AsyncSession, now: datetime, sim_date: Optional[datetime] = None) -> list[DispatchEvent]:
        from backend.simulation.sampler import what_if_duration

        jobs = await _get_eligible_jobs(db, now, sim_date)
        if not jobs:
            return [DispatchEvent(event_type="no_ops", timestamp=now)]

        now_min = _now_minutes(now, sim_date)
        techs = await _get_available_techs(db, now_minutes=now_min)
        if not techs:
            return [DispatchEvent(event_type="no_ops", timestamp=now)]

        jobs.sort(key=lambda j: j.priority)
        events: list[DispatchEvent] = []

        for job in jobs:
            # Two-pass: prefer techs who can still arrive inside the customer
            # window, but fall back to the best available tech (will flag as
            # overdue in the UI) so jobs don't sit PENDING forever.
            in_window = []
            any_match = []
            for tech in techs:
                if not can_technician_do_job(job, tech)['can_do']:
                    continue
                lat = tech.current_latitude or tech.home_latitude
                lon = tech.current_longitude or tech.home_longitude
                travel = calculate_travel_time(
                    haversine_distance(lat, lon, job.latitude, job.longitude)
                )
                predicted = what_if_duration(job, tech)
                score = travel + predicted          # minimise: arrive + finish
                any_match.append((score, tech))
                if _fits_in_window(job, now_min, travel, predicted):
                    in_window.append((score, tech))
            pool = in_window if in_window else any_match
            best_tech = min(pool, key=lambda x: x[0])[1] if pool else None
            best_score = min(pool, key=lambda x: x[0])[0] if pool else float('inf')

            if best_tech:
                try:
                    await assignment_logic.create_assignment(db, job.id, best_tech.id, now=now)
                    techs.remove(best_tech)  # tech now busy — don't pick again this tick
                    events.append(DispatchEvent(
                        event_type="job_assigned", timestamp=now,
                        job_id=job.id, tech_id=best_tech.id,
                        tech_name=best_tech.name, customer_name=job.customer_name,
                        details={"predicted_completion_minutes": int(best_score)},
                    ))
                except Exception:
                    logger.debug("ML assign failed job=%s", job.id)

        return events or [DispatchEvent(event_type="no_ops", timestamp=now)]
