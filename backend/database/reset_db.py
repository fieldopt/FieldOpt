"""
Reset the FieldOpt database — drops all tables, recreates them, and optionally reseeds.
Usage:
	python -m backend.database.reset_db          # Reset + reseed
	python -m backend.database.reset_db --empty   # Reset only, no seed data
"""
import asyncio
import sys

from alembic import command
from alembic.config import Config

from backend.database.connection import reset_db
from backend.database.seeds.seed_data import seed_all


async def do_reset(empty: bool):
	print("\n⚠️  Resetting FieldOpt database...")
	await reset_db()
	if not empty:
		await seed_all()
	else:
		print("\n✓ Database reset (empty). No seed data loaded.\n")


def stamp_alembic_head():
	"""Run alembic stamp outside the async context."""
	alembic_cfg = Config("alembic.ini")
	command.stamp(alembic_cfg, "head")
	print("✓ Alembic stamped to head")


if __name__ == "__main__":
	empty = "--empty" in sys.argv
	asyncio.run(do_reset(empty))
	stamp_alembic_head()
