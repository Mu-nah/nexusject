"""Initial migration — all tables

Revision ID: 001_initial
Revises: 
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This migration is handled automatically by SQLAlchemy's create_all().
    # For production, run: alembic revision --autogenerate -m "initial"
    # then: alembic upgrade head
    pass


def downgrade() -> None:
    pass
