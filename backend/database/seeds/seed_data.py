"""
Seed database with jazz-themed sample data for development and testing.
Techs are jazz musicians, jobs are concert venue gigs.

Management Areas:
  MN-DOWNTOWN  — Lower Manhattan (below 14th St)
  MN-MIDTOWN   — Midtown Manhattan (14th–59th St)
  MN-WEST      — Upper West Side (59th–110th St west)
  MN-EAST      — Upper East Side (59th–110th St east)
  MN-HARLEM    — Harlem / Washington Heights (110th+ St)
  MN-WASH-HTS  — Washington Heights (155th+ St)
  BK-NORTH     — North Brooklyn (Williamsburg, Greenpoint, DUMBO)
  BK-WEST      — West Brooklyn (Cobble Hill, Park Slope, Red Hook)
  BK-SOUTH     — South Brooklyn (Flatbush, Midwood)
  BK-EAST      — East Brooklyn (Bed-Stuy, Bushwick, East NY)
  QN-SOUTH     — South Queens (Jamaica, Far Rockaway)
  QN-CENTRAL   — Central Queens (Flushing, Forest Hills)
  BX-SOUTH     — South Bronx

Usage:
	python -m backend.database.seeds.seed_data
"""
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select

from backend.database.connection import AsyncSessionLocal, init_db
from backend.database.models import Technician, Job, Assignment, TechnicianStatus, JobStatus, JobType


# ── Jazz Musician Technicians ──────────────────────────────────────────────
TECHNICIANS = [
	{
		"name": "Miles Davis",
		"employee_id": "MD001",
		"phone": "555-0101",
		"email": "miles@fieldopt.com",
		"home_latitude": 40.7831,
		"home_longitude": -73.9712,
		"home_address": "Upper West Side, Manhattan",
		"skills": ["install", "repair", "maintenance"],
		"assigned_routes": ["MN-WEST", "MN-MIDTOWN"],
		"shift_start": "08:00",
		"shift_end": "17:00",
		"max_jobs_per_day": 8,
		"status": TechnicianStatus.AVAILABLE,
	},
	{
		"name": "Chet Baker",
		"employee_id": "CB002",
		"phone": "555-0102",
		"email": "chet@fieldopt.com",
		"home_latitude": 40.7282,
		"home_longitude": -73.7949,
		"home_address": "Jamaica, Queens",
		"skills": ["install", "repair", "disconnect"],
		"assigned_routes": ["QN-SOUTH", "QN-CENTRAL"],
		"shift_start": "07:00",
		"shift_end": "16:00",
		"max_jobs_per_day": 7,
		"status": TechnicianStatus.AVAILABLE,
	},
	{
		"name": "John Coltrane",
		"employee_id": "JC003",
		"phone": "555-0103",
		"email": "coltrane@fieldopt.com",
		"home_latitude": 40.6892,
		"home_longitude": -73.9857,
		"home_address": "Cobble Hill, Brooklyn",
		"skills": ["install", "repair", "maintenance", "inspection", "service_change"],
		"assigned_routes": ["BK-NORTH", "BK-WEST"],
		"shift_start": "08:00",
		"shift_end": "18:00",
		"max_jobs_per_day": 10,
		"status": TechnicianStatus.AVAILABLE,
	},
	{
		"name": "Thelonious Monk",
		"employee_id": "TM004",
		"phone": "555-0104",
		"email": "monk@fieldopt.com",
		"home_latitude": 40.8116,
		"home_longitude": -73.9465,
		"home_address": "Harlem, Manhattan",
		"skills": ["repair", "maintenance", "inspection"],
		"assigned_routes": ["MN-HARLEM", "MN-WASH-HTS"],
		"shift_start": "09:00",
		"shift_end": "17:00",
		"max_jobs_per_day": 6,
		"status": TechnicianStatus.AVAILABLE,
	},
	{
		"name": "Charles Mingus",
		"employee_id": "CM005",
		"phone": "555-0105",
		"email": "mingus@fieldopt.com",
		"home_latitude": 40.6501,
		"home_longitude": -73.9496,
		"home_address": "Flatbush, Brooklyn",
		"skills": ["install", "disconnect", "service_change"],
		"assigned_routes": ["BK-SOUTH", "BK-EAST"],
		"shift_start": "07:00",
		"shift_end": "15:00",
		"max_jobs_per_day": 8,
		"status": TechnicianStatus.AVAILABLE,
	},
	{
		"name": "Ella Fitzgerald",
		"employee_id": "EF006",
		"phone": "555-0106",
		"email": "ella@fieldopt.com",
		"home_latitude": 40.7527,
		"home_longitude": -73.9772,
		"home_address": "Midtown East, Manhattan",
		"skills": ["install", "repair", "maintenance", "disconnect"],
		"assigned_routes": ["MN-MIDTOWN", "MN-EAST"],
		"shift_start": "08:00",
		"shift_end": "17:00",
		"max_jobs_per_day": 9,
		"status": TechnicianStatus.AVAILABLE,
	},
	{
		"name": "Dizzy Gillespie",
		"employee_id": "DG007",
		"phone": "555-0107",
		"email": "dizzy@fieldopt.com",
		"home_latitude": 40.8296,
		"home_longitude": -73.9262,
		"home_address": "South Bronx, Bronx",
		"skills": ["install", "repair", "inspection"],
		"assigned_routes": ["BX-SOUTH", "MN-HARLEM"],
		"shift_start": "08:00",
		"shift_end": "16:00",
		"max_jobs_per_day": 7,
		"status": TechnicianStatus.ON_BREAK,
	},
	{
		"name": "John Zorn",
		"employee_id": "JZ008",
		"phone": "555-0108",
		"email": "zorn@fieldopt.com",
		"home_latitude": 40.7185,
		"home_longitude": -73.9868,
		"home_address": "Lower East Side, Manhattan",
		"skills": ["repair", "maintenance", "service_change", "inspection"],
		"assigned_routes": ["MN-DOWNTOWN", "MN-EAST"],
		"shift_start": "10:00",
		"shift_end": "19:00",
		"max_jobs_per_day": 6,
		"status": TechnicianStatus.AVAILABLE,
	},
	{
		"name": "Billie Holiday",
		"employee_id": "BH009",
		"phone": "555-0109",
		"email": "billie@fieldopt.com",
		"home_latitude": 40.7614,
		"home_longitude": -73.9776,
		"home_address": "5th Ave, Manhattan",
		"skills": ["install", "repair", "disconnect"],
		"assigned_routes": ["MN-MIDTOWN", "MN-WEST"],
		"shift_start": "08:00",
		"shift_end": "17:00",
		"max_jobs_per_day": 8,
		"status": TechnicianStatus.OFF_DUTY,
	},
	{
		"name": "Art Blakey",
		"employee_id": "AB010",
		"phone": "555-0110",
		"email": "blakey@fieldopt.com",
		"home_latitude": 40.6872,
		"home_longitude": -73.9418,
		"home_address": "Bedford-Stuyvesant, Brooklyn",
		"skills": ["install", "maintenance", "repair", "disconnect", "service_change"],
		"assigned_routes": ["BK-NORTH", "BK-EAST"],
		"shift_start": "06:00",
		"shift_end": "15:00",
		"max_jobs_per_day": 10,
		"status": TechnicianStatus.AVAILABLE,
	},
]


# ── Concert Venue Jobs ─────────────────────────────────────────────────────
def make_jobs():
	"""Generate jobs scheduled for today and tomorrow."""
	today = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
	tomorrow = today + timedelta(days=1)

	return [
		# -- Today's jobs --
		{
			"customer_name": "Blue Note Jazz Club",
			"service_address": "131 W 3rd St",
			"service_city": "New York",
			"service_zip": "10012",
			"latitude": 40.7308,
			"longitude": -73.9973,
			"job_type": JobType.INSTALL,
			"required_skills": ["install"],
			"route_criteria": "MN-DOWNTOWN",
			"priority": 1,
			"scheduled_date": today,
			"time_slot_start": "08:00",
			"time_slot_end": "12:00",
			"estimated_duration": 90,
			"description": "Sound system install — main stage",
		},
		{
			"customer_name": "Village Vanguard",
			"service_address": "178 7th Ave S",
			"service_city": "New York",
			"service_zip": "10014",
			"latitude": 40.7359,
			"longitude": -74.0014,
			"job_type": JobType.REPAIR,
			"required_skills": ["repair"],
			"route_criteria": "MN-DOWNTOWN",
			"priority": 2,
			"scheduled_date": today,
			"time_slot_start": "08:00",
			"time_slot_end": "12:00",
			"estimated_duration": 60,
			"description": "Stage monitor repair — intermittent signal",
		},
		{
			"customer_name": "Birdland Jazz Club",
			"service_address": "315 W 44th St",
			"service_city": "New York",
			"service_zip": "10036",
			"latitude": 40.7590,
			"longitude": -73.9905,
			"job_type": JobType.MAINTENANCE,
			"required_skills": ["maintenance"],
			"route_criteria": "MN-MIDTOWN",
			"priority": 3,
			"scheduled_date": today,
			"time_slot_start": "12:00",
			"time_slot_end": "17:00",
			"estimated_duration": 45,
			"description": "Quarterly PA system maintenance",
		},
		{
			"customer_name": "Jazz at Lincoln Center",
			"service_address": "10 Columbus Cir",
			"service_city": "New York",
			"service_zip": "10019",
			"latitude": 40.7688,
			"longitude": -73.9830,
			"job_type": JobType.INSTALL,
			"required_skills": ["install", "service_change"],
			"route_criteria": "MN-WEST",
			"priority": 1,
			"scheduled_date": today,
			"time_slot_start": "08:00",
			"time_slot_end": "12:00",
			"estimated_duration": 120,
			"description": "New wireless mic system — Rose Theater",
			"special_instructions": "VIP venue — coordinate with house manager",
		},
		{
			"customer_name": "Smalls Jazz Club",
			"service_address": "183 W 10th St",
			"service_city": "New York",
			"service_zip": "10014",
			"latitude": 40.7337,
			"longitude": -74.0023,
			"job_type": JobType.REPAIR,
			"required_skills": ["repair", "maintenance"],
			"route_criteria": "MN-DOWNTOWN",
			"priority": 2,
			"scheduled_date": today,
			"time_slot_start": "12:00",
			"time_slot_end": "17:00",
			"estimated_duration": 45,
			"description": "Mixing console channel 7-8 dead — needs trace",
		},
		{
			"customer_name": "Dizzy's Club",
			"service_address": "10 Columbus Cir, 5th Fl",
			"service_city": "New York",
			"service_zip": "10019",
			"latitude": 40.7686,
			"longitude": -73.9828,
			"job_type": JobType.INSPECTION,
			"required_skills": ["inspection"],
			"route_criteria": "MN-WEST",
			"priority": 3,
			"scheduled_date": today,
			"time_slot_start": "08:00",
			"time_slot_end": "17:00",
			"estimated_duration": 30,
			"description": "Annual safety inspection — stage rigging",
		},
		{
			"customer_name": "The Stone at New School",
			"service_address": "55 W 13th St",
			"service_city": "New York",
			"service_zip": "10011",
			"latitude": 40.7365,
			"longitude": -73.9960,
			"job_type": JobType.DISCONNECT,
			"required_skills": ["disconnect"],
			"route_criteria": "MN-DOWNTOWN",
			"priority": 4,
			"scheduled_date": today,
			"time_slot_start": "12:00",
			"time_slot_end": "17:00",
			"estimated_duration": 30,
			"description": "Remove old analog board — prep for digital upgrade",
		},
		{
			"customer_name": "Minton's Playhouse",
			"service_address": "206 W 118th St",
			"service_city": "New York",
			"service_zip": "10026",
			"latitude": 40.8039,
			"longitude": -73.9541,
			"job_type": JobType.INSTALL,
			"required_skills": ["install", "repair"],
			"route_criteria": "MN-HARLEM",
			"priority": 2,
			"scheduled_date": today,
			"time_slot_start": "08:00",
			"time_slot_end": "12:00",
			"estimated_duration": 90,
			"description": "Stage lighting control install + existing dimmer repair",
		},
		{
			"customer_name": "Apollo Theater",
			"service_address": "253 W 125th St",
			"service_city": "New York",
			"service_zip": "10027",
			"latitude": 40.8100,
			"longitude": -73.9500,
			"job_type": JobType.SERVICE_CHANGE,
			"required_skills": ["service_change", "install"],
			"route_criteria": "MN-HARLEM",
			"priority": 1,
			"scheduled_date": today,
			"time_slot_start": "08:00",
			"time_slot_end": "12:00",
			"estimated_duration": 120,
			"description": "Upgrade house sound from analog to digital snake",
			"special_instructions": "Load-in door on 126th — call house audio",
		},
		{
			"customer_name": "Zinc Bar",
			"service_address": "82 W 3rd St",
			"service_city": "New York",
			"service_zip": "10012",
			"latitude": 40.7300,
			"longitude": -73.9990,
			"job_type": JobType.REPAIR,
			"required_skills": ["repair"],
			"route_criteria": "MN-DOWNTOWN",
			"priority": 3,
			"scheduled_date": today,
			"time_slot_start": "12:00",
			"time_slot_end": "17:00",
			"estimated_duration": 45,
			"description": "Subwoofer rattling — likely blown driver",
		},
		# -- Tomorrow's jobs --
		{
			"customer_name": "Brooklyn Bowl",
			"service_address": "61 Wythe Ave",
			"service_city": "Brooklyn",
			"service_zip": "11249",
			"latitude": 40.7188,
			"longitude": -73.9618,
			"job_type": JobType.INSTALL,
			"required_skills": ["install", "maintenance"],
			"route_criteria": "BK-NORTH",
			"priority": 2,
			"scheduled_date": tomorrow,
			"time_slot_start": "08:00",
			"time_slot_end": "12:00",
			"estimated_duration": 90,
			"description": "New monitor wedge install — 6 positions",
		},
		{
			"customer_name": "National Sawdust",
			"service_address": "80 N 6th St",
			"service_city": "Brooklyn",
			"service_zip": "11249",
			"latitude": 40.7182,
			"longitude": -73.9621,
			"job_type": JobType.MAINTENANCE,
			"required_skills": ["maintenance", "inspection"],
			"route_criteria": "BK-NORTH",
			"priority": 3,
			"scheduled_date": tomorrow,
			"time_slot_start": "08:00",
			"time_slot_end": "17:00",
			"estimated_duration": 60,
			"description": "Semi-annual acoustic panel inspection + cleaning",
		},
		{
			"customer_name": "Le Poisson Rouge",
			"service_address": "158 Bleecker St",
			"service_city": "New York",
			"service_zip": "10012",
			"latitude": 40.7283,
			"longitude": -74.0002,
			"job_type": JobType.REPAIR,
			"required_skills": ["repair", "service_change"],
			"route_criteria": "MN-DOWNTOWN",
			"priority": 2,
			"scheduled_date": tomorrow,
			"time_slot_start": "12:00",
			"time_slot_end": "17:00",
			"estimated_duration": 75,
			"description": "FOH board output bus failure — swap needed",
		},
		{
			"customer_name": "SOB's",
			"service_address": "204 Varick St",
			"service_city": "New York",
			"service_zip": "10014",
			"latitude": 40.7274,
			"longitude": -74.0057,
			"job_type": JobType.INSTALL,
			"required_skills": ["install"],
			"route_criteria": "MN-DOWNTOWN",
			"priority": 4,
			"scheduled_date": tomorrow,
			"time_slot_start": "08:00",
			"time_slot_end": "17:00",
			"estimated_duration": 60,
			"description": "Install backup DI box rack — stage left",
		},
		{
			"customer_name": "Mezzrow Jazz Club",
			"service_address": "163 W 10th St",
			"service_city": "New York",
			"service_zip": "10014",
			"latitude": 40.7340,
			"longitude": -74.0020,
			"job_type": JobType.INSPECTION,
			"required_skills": ["inspection"],
			"route_criteria": "MN-DOWNTOWN",
			"priority": 5,
			"scheduled_date": tomorrow,
			"time_slot_start": "12:00",
			"time_slot_end": "17:00",
			"estimated_duration": 30,
			"description": "Routine wiring inspection — basement venue",
		},
	]


async def seed_all():
	"""Drop existing data and seed fresh."""
	await init_db()

	async with AsyncSessionLocal() as session:
		print("\n🎷 Seeding FieldOpt with jazz data...\n")

		# Clear existing data (order matters — assignments first)
		await session.execute(Assignment.__table__.delete())
		await session.execute(Job.__table__.delete())
		await session.execute(Technician.__table__.delete())
		await session.commit()
		print("  ✓ Cleared existing data")

		# Seed technicians
		for tech_data in TECHNICIANS:
			tech = Technician(
				**{k: v for k, v in tech_data.items()},
				current_latitude=tech_data["home_latitude"],
				current_longitude=tech_data["home_longitude"],
			)
			session.add(tech)
		await session.commit()
		print(f"  ✓ {len(TECHNICIANS)} technicians seeded")

		# Seed jobs
		jobs_data = make_jobs()
		for job_data in jobs_data:
			job = Job(**job_data)
			session.add(job)
		await session.commit()
		print(f"  ✓ {len(jobs_data)} jobs seeded")

		print("\n🎵 Done! All jazz, all day.\n")


if __name__ == "__main__":
	asyncio.run(seed_all())
