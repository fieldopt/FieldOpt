import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

from backend.config import get_settings
from backend.database.models import Base

config = context.config

settings = get_settings()


def _async_url(url: str) -> str:
	if url.startswith("postgresql://"):
		return url.replace("postgresql://", "postgresql+asyncpg://", 1)
	if url.startswith("postgresql+psycopg2://"):
		return url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
	return url


db_url = _async_url(settings.DATABASE_URL)
config.set_main_option("sqlalchemy.url", db_url)

if config.config_file_name is not None:
	fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
	"""Offline mode — emits SQL without connecting."""
	context.configure(
		url=db_url,
		target_metadata=target_metadata,
		literal_binds=True,
		dialect_opts={"paramstyle": "named"},
		compare_type=True,
		compare_server_default=True,
	)
	with context.begin_transaction():
		context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
	context.configure(
		connection=connection,
		target_metadata=target_metadata,
		compare_type=True,
		compare_server_default=True,
	)
	with context.begin_transaction():
		context.run_migrations()


async def run_async_migrations() -> None:
	connectable = async_engine_from_config(
		config.get_section(config.config_ini_section, {}),
		prefix="sqlalchemy.",
		poolclass=pool.NullPool,
	)
	async with connectable.connect() as connection:
		await connection.run_sync(do_run_migrations)
	await connectable.dispose()


def run_migrations_online() -> None:
	asyncio.run(run_async_migrations())


if context.is_offline_mode():
	run_migrations_offline()
else:
	run_migrations_online()
