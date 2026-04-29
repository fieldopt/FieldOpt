"""
Duration sampler for the simulation engine.

Samples actual job duration at assignment time using a seeded log-normal
distribution. The seed is deterministic on (job_id, tech_id) so the same
pair always produces the same duration — consistent across reruns.

final_multiplier = tech.speed_factor * tech.skill_bonuses.get(job_type, 1.0)
mean_duration    = job.estimated_duration * final_multiplier
"""
import numpy as np

from backend.database.models import Job, Technician

_SIGMA = 0.25  # log-normal spread — moderate real-world variability


def _seed(job_id: int, tech_id: int) -> int:
	return abs(hash((job_id, tech_id))) % (2 ** 32)


def sample_duration(job: Job, tech: Technician) -> int:
	"""
	Sample actual duration (minutes) for this job/tech pair.
	Store result in Assignment.actual_duration_minutes at assignment time.
	"""
	rng = np.random.default_rng(seed=_seed(job.id, tech.id))
	multiplier = tech.speed_factor * tech.skill_bonuses.get(job.job_type.value, 1.0)
	mean = job.estimated_duration * multiplier
	mu = np.log(mean) - (_SIGMA ** 2) / 2
	minutes = int(round(float(rng.lognormal(mu, _SIGMA))))
	return max(1, minutes)


def what_if_duration(job: Job, hypothetical_tech: Technician) -> int:
	"""
	Counterfactual: what would this job take with a different tech?
	Used by God View to reveal hidden modifier impact.
	"""
	return sample_duration(job, hypothetical_tech)
