"""
Database Connection Management
Async SQLAlchemy engine, session creation, and database initialization
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from typing import AsyncGenerator

from backend.config import get_settings
from backend.database.models import Base

settings = get_settings()

# Build async URL — swap postgresql:// to postgresql+asyncpg://
def _async_url(url: str) -> str:
	if url.startswith("postgresql://"):
		return url.replace("postgresql://", "postgresql+asyncpg://", 1)
	if url.startswith("postgresql+psycopg2://"):
		return url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
	return url

engine = create_async_engine(
	_async_url(settings.DATABASE_URL),
	echo=settings.DATABASE_ECHO,
	pool_pre_ping=True,
	pool_size=10,
	max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
	bind=engine,
	class_=AsyncSession,
	autocommit=False,
	autoflush=False,
	expire_on_commit=False,  # Prevents MissingGreenlet on post-commit attribute access
)


async def init_db() -> None:
	"""
	Initialize database — create all tables.
	Called once at application startup.
	"""
	async with engine.begin() as conn:
		await conn.run_sync(Base.metadata.create_all)
	print("✅ Database tables created successfully")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
	"""
	Async dependency that yields a database session.

	Usage:
		@router.get("/items")
		async def read_items(db: AsyncSession = Depends(get_db)):
			result = await db.execute(select(Item))
			return result.scalars().all()
	"""
	async with AsyncSessionLocal() as session:
		try:
			yield session
		except Exception:
			await session.rollback()
			raise


async def reset_db() -> None:
	"""
	Drop all tables and recreate them.
	WARNING: Destroys all data. Development/testing only.
	"""
	print("⚠️  Dropping all tables...")
	async with engine.begin() as conn:
		await conn.run_sync(Base.metadata.drop_all)
	print("✅ Tables dropped")
	print("Creating tables...")
	async with engine.begin() as conn:
		await conn.run_sync(Base.metadata.create_all)
	print("✅ Database reset complete")
