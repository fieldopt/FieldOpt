"""
Seed database with sample data for development and testing
"""
from datetime import datetime, timedelta
from backend.database.connection import get_db_session
from backend.database.models import Skill, Technician, Job, TimeSlot


def seed_skills(db):
	"""Create sample skills"""
	skills_data = [
		{"code": "BASIC_INSTALL", "description": "Basic Installation", "route_priority": 1},
		{"code": "ADVANCED_INSTALL", "description": "Advanced Installation", "route_priority": 2},
		{"code": "HSD_INSTALL", "description": "High-Speed Data Installation", "route_priority": 2},
		{"code": "TROUBLE_CALL", "description": "Troubleshooting", "route_priority": 3},
		{"code": "DISCONNECT", "description": "Service Disconnect", "route_priority": 1},
		{"code": "SECURITY_INSTALL", "description": "Home Security Install", "route_priority": 3},
		{"code": "VIDEO_REPAIR", "description": "Video Service Repair", "route_priority": 2},
		{"code": "PHONE_INSTALL", "description": "Phone Service Installation", "route_priority": 2},
	]
	
	for skill_data in skills_data:
		existing = db.query(Skill).filter(Skill.code == skill_data["code"]).first()
		if not existing:
			skill = Skill(**skill_data)
			db.add(skill)
	
	db.commit()
	print("✓ Skills seeded")


def seed_timeslots(db):
	"""Create sample time slots"""
	timeslots_data = [
		{"code": "AM", "description": "Morning (8AM-12PM)", "start_time": "08:00", "end_time": "12:00", "sort_order": 1},
		{"code": "PM", "description": "Afternoon (12PM-5PM)", "start_time": "12:00", "end_time": "17:00", "sort_order": 2},
		{"code": "ANYTIME", "description": "Anytime (8AM-5PM)", "start_time": "08:00", "end_time": "17:00", "sort_order": 3},
		{"code": "8-10", "description": "8AM-10AM", "start_time": "08:00", "end_time": "10:00", "sort_order": 4},
		{"code": "10-12", "description": "10AM-12PM", "start_time": "10:00", "end_time": "12:00", "sort_order": 5},
		{"code": "12-2", "description": "12PM-2PM", "start_time": "12:00", "end_time": "14:00", "sort_order": 6},
		{"code": "2-5", "description": "2PM-5PM", "start_time": "14:00", "end_time": "17:00", "sort_order": 7},
	]
	
	for slot_data in timeslots_data:
		existing = db.query(TimeSlot).filter(TimeSlot.code == slot_data["code"]).first()
		if not existing:
			slot = TimeSlot(**slot_data)
			db.add(slot)
	
	db.commit()
	print("✓ Time slots seeded")


def seed_technicians(db):
	"""Create sample technicians"""
	# Get some skills for assignment
	basic = db.query(Skill).filter(Skill.code == "BASIC_INSTALL").first()
	advanced = db.query(Skill).filter(Skill.code == "ADVANCED_INSTALL").first()
	hsd = db.query(Skill).filter(Skill.code == "HSD_INSTALL").first()
	trouble = db.query(Skill).filter(Skill.code == "TROUBLE_CALL").first()
	disconnect = db.query(Skill).filter(Skill.code == "DISCONNECT").first()
	security = db.query(Skill).filter(Skill.code == "SECURITY_INSTALL").first()
	
	techs_data = [
		{
			"name": "John Smith",
			"phone": "555-0101",
			"email": "john.smith@fieldopt.com",
			"start_latitude": 40.7128,
			"start_longitude": -74.0060,
			"skills": [basic, trouble, disconnect]
		},
		{
			"name": "Sarah Johnson",
			"phone": "555-0102",
			"email": "sarah.johnson@fieldopt.com",
			"start_latitude": 40.7589,
			"start_longitude": -73.9851,
			"skills": [basic, advanced, hsd, trouble]
		},
		{
			"name": "Mike Davis",
			"phone": "555-0103",
			"email": "mike.davis@fieldopt.com",
			"start_latitude": 40.6782,
			"start_longitude": -73.9442,
			"skills": [basic, disconnect, trouble]
		},
		{
			"name": "Emily Wilson",
			"phone": "555-0104",
			"email": "emily.wilson@fieldopt.com",
			"start_latitude": 40.7589,
			"start_longitude": -73.9851,
			"skills": [basic, advanced, hsd, security, trouble]
		},
		{
			"name": "David Martinez",
			"phone": "555-0105",
			"email": "david.martinez@fieldopt.com",
			"start_latitude": 40.7306,
			"start_longitude": -73.9352,
			"skills": [basic, hsd, trouble, disconnect]
		},
	]
	
	for tech_data in techs_data:
		existing = db.query(Technician).filter(Technician.email == tech_data["email"]).first()
		if not existing:
			skills = tech_data.pop("skills")
			tech = Technician(**tech_data)
			tech.current_latitude = tech.start_latitude
			tech.current_longitude = tech.start_longitude
			tech.skills.extend(skills)
			db.add(tech)
	
	db.commit()
	print("✓ Technicians seeded")


def seed_sample_jobs(db):
	"""Create sample jobs for testing"""
	tomorrow = datetime.now() + timedelta(days=1)
	tomorrow = tomorrow.replace(hour=8, minute=0, second=0, microsecond=0)
	
	# Get skills
	basic = db.query(Skill).filter(Skill.code == "BASIC_INSTALL").first()
	hsd = db.query(Skill).filter(Skill.code == "HSD_INSTALL").first()
	trouble = db.query(Skill).filter(Skill.code == "TROUBLE_CALL").first()
	disconnect = db.query(Skill).filter(Skill.code == "DISCONNECT").first()
	
	jobs_data = [
		{
			"customer_name": "Alice Anderson",
			"customer_address": "123 Main St, New York, NY 10001",
			"customer_phone": "555-1001",
			"latitude": 40.7489,
			"longitude": -73.9680,
			"scheduled_date": tomorrow,
			"job_class": "new_connect",
			"timeslot_code": "AM",
			"estimated_duration_minutes": 60,
			"skills": [basic]
		},
		{
			"customer_name": "Bob Brown",
			"customer_address": "456 Oak Ave, Brooklyn, NY 11201",
			"customer_phone": "555-1002",
			"latitude": 40.6940,
			"longitude": -73.9902,
			"scheduled_date": tomorrow,
			"job_class": "hsd_install",
			"timeslot_code": "AM",
			"estimated_duration_minutes": 90,
			"priority": 1,
			"skills": [basic, hsd]
		},
		{
			"customer_name": "Carol Clark",
			"customer_address": "789 Elm St, Queens, NY 11354",
			"customer_phone": "555-1003",
			"latitude": 40.7614,
			"longitude": -73.8264,
			"scheduled_date": tomorrow,
			"job_class": "trouble_call",
			"timeslot_code": "PM",
			"estimated_duration_minutes": 45,
			"priority": 2,
			"vip": True,
			"skills": [trouble]
		},
		{
			"customer_name": "David Drake",
			"customer_address": "321 Pine Rd, Bronx, NY 10451",
			"customer_phone": "555-1004",
			"latitude": 40.8203,
			"longitude": -73.9224,
			"scheduled_date": tomorrow,
			"job_class": "disconnect",
			"timeslot_code": "ANYTIME",
			"estimated_duration_minutes": 30,
			"skills": [disconnect]
		},
		{
			"customer_name": "Eve Evans",
			"customer_address": "654 Maple Dr, Manhattan, NY 10022",
			"customer_phone": "555-1005",
			"latitude": 40.7614,
			"longitude": -73.9776,
			"scheduled_date": tomorrow,
			"job_class": "new_connect",
			"timeslot_code": "PM",
			"estimated_duration_minutes": 60,
			"skills": [basic]
		},
	]
	
	for job_data in jobs_data:
		skills = job_data.pop("skills")
		job = Job(**job_data)
		job.required_skills.extend(skills)
		db.add(job)
	
	db.commit()
	print("✓ Sample jobs seeded")


def seed_all():
	"""Seed all data"""
	with get_db_session() as db:
		print("\n🌱 Seeding database...")
		seed_skills(db)
		seed_timeslots(db)
		seed_technicians(db)
		seed_sample_jobs(db)
		print("✓ Database seeding complete!\n")


if __name__ == "__main__":
	seed_all()
