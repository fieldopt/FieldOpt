"""v008 tech modifiers and actual duration

Revision ID: 9c63b447e86f
Revises: 628d89c70c0f
Create Date: 2026-04-13 10:03:44.184922

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '9c63b447e86f'
down_revision: Union[str, None] = '628d89c70c0f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
	"""Upgrade schema."""
	op.add_column('assignments', sa.Column('actual_duration_minutes', sa.Integer(), nullable=True))

	op.alter_column('jobs', 'required_skills',
				existing_type=postgresql.JSON(astext_type=sa.Text()),
				type_=postgresql.JSONB(astext_type=sa.Text()),
				existing_nullable=False)

	# Add speed_factor with a server default so existing rows get 1.0,
	# then drop the server default — the Python-side default on the model
	# takes over for future inserts.
	op.add_column('technicians', sa.Column('speed_factor', sa.Float(), nullable=False, server_default='1.0'))
	op.alter_column('technicians', 'speed_factor', server_default=None)

	# Same pattern for skill_bonuses — backfill existing rows with '{}'.
	op.add_column('technicians', sa.Column('skill_bonuses', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")))
	op.alter_column('technicians', 'skill_bonuses', server_default=None)

	op.alter_column('technicians', 'skills',
				existing_type=postgresql.JSON(astext_type=sa.Text()),
				type_=postgresql.JSONB(astext_type=sa.Text()),
				existing_nullable=False)
	op.alter_column('technicians', 'assigned_routes',
				existing_type=postgresql.JSON(astext_type=sa.Text()),
				type_=postgresql.JSONB(astext_type=sa.Text()),
				existing_nullable=False)


def downgrade() -> None:
	"""Downgrade schema."""
	op.alter_column('technicians', 'assigned_routes',
				existing_type=postgresql.JSONB(astext_type=sa.Text()),
				type_=postgresql.JSON(astext_type=sa.Text()),
				existing_nullable=False)
	op.alter_column('technicians', 'skills',
				existing_type=postgresql.JSONB(astext_type=sa.Text()),
				type_=postgresql.JSON(astext_type=sa.Text()),
				existing_nullable=False)
	op.drop_column('technicians', 'skill_bonuses')
	op.drop_column('technicians', 'speed_factor')
	op.alter_column('jobs', 'required_skills',
				existing_type=postgresql.JSONB(astext_type=sa.Text()),
				type_=postgresql.JSON(astext_type=sa.Text()),
				existing_nullable=False)
	op.drop_column('assignments', 'actual_duration_minutes')

