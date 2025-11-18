"""
Database Connection Management
Handles SQLAlchemy engine, session creation, and database initialization
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from backend.config import get_settings
from backend.database.models import Base

settings = get_settings()

# Create database engine for PostgreSQL
engine = create_engine(
	settings.DATABASE_URL,
	echo=settings.DATABASE_ECHO,
	pool_pre_ping=True,  # Verify connections before using them
	pool_size=10,  # Number of connections to maintain
	max_overflow=20  # Max connections beyond pool_size
)

# Create session factory
SessionLocal = sessionmaker(
	autocommit=False,
	autoflush=False,
	bind=engine
)


def init_db() -> None:
	"""
	Initialize database - create all tables
	This should be called once at application startup
	"""
	Base.metadata.create_all(bind=engine)
	print("✅ Database tables created successfully")


def get_db() -> Generator[Session, None, None]:
	"""
	Dependency function to get database session
	Use this in FastAPI route dependencies
	
	Usage:
		@app.get("/items")
		def read_items(db: Session = Depends(get_db)):
			return db.query(Item).all()
	"""
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()


def reset_db() -> None:
	"""
	Drop all tables and recreate them
	WARNING: This will delete all data!
	Use only for development/testing
	"""
	print("⚠️  Dropping all tables...")
	Base.metadata.drop_all(bind=engine)
	print("✅ Tables dropped")
	print("Creating tables...")
	Base.metadata.create_all(bind=engine)
	print("✅ Database reset complete")
