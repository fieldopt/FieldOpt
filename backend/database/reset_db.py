"""
Reset the FieldOpt database — drops all tables, recreates them, and optionally reseeds.

Usage:
    python -m backend.database.reset_db          # Reset + reseed
    python -m backend.database.reset_db --empty   # Reset only, no seed data
"""
import asyncio
import sys

from backend.database.connection import reset_db
from backend.database.seeds.seed_data import seed_all


async def main():
	empty = "--empty" in sys.argv

	print("\n⚠️  Resetting FieldOpt database...")
	await reset_db()

	if not empty:
		await seed_all()
	else:
		print("\n✓ Database reset (empty). No seed data loaded.\n")


if __name__ == "__main__":
	asyncio.run(main())
