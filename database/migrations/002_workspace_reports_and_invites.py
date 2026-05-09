"""Add workspace reports, invites, and organisation country

Revision ID: 002_workspace_reports_and_invites
Revises: 001_initial
"""

from alembic import op
import sqlalchemy as sa


revision = "002_workspace_reports_and_invites"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("organisations", sa.Column("country", sa.String(length=100), nullable=True))

    op.create_table(
        "report_documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organisation_id", sa.Integer(), sa.ForeignKey("organisations.id"), nullable=False),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("report_type", sa.String(length=50), nullable=False),
        sa.Column("period_label", sa.String(length=120), nullable=True),
        sa.Column("narrative", sa.Text(), nullable=False),
        sa.Column("ai_generated", sa.Boolean(), nullable=True),
        sa.Column("share_token", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_report_documents_organisation_id", "report_documents", ["organisation_id"])
    op.create_index("ix_report_documents_created_by", "report_documents", ["created_by"])
    op.create_index("ix_report_documents_report_type", "report_documents", ["report_type"])
    op.create_index("ix_report_documents_share_token", "report_documents", ["share_token"], unique=True)

    op.create_table(
        "workspace_invites",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organisation_id", sa.Integer(), sa.ForeignKey("organisations.id"), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.Column("invite_token", sa.String(length=64), nullable=False),
        sa.Column("invited_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("accepted", sa.Boolean(), nullable=True),
        sa.Column("accepted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_workspace_invites_organisation_id", "workspace_invites", ["organisation_id"])
    op.create_index("ix_workspace_invites_email", "workspace_invites", ["email"])
    op.create_index("ix_workspace_invites_invite_token", "workspace_invites", ["invite_token"], unique=True)


def downgrade():
    op.drop_index("ix_workspace_invites_invite_token", table_name="workspace_invites")
    op.drop_index("ix_workspace_invites_email", table_name="workspace_invites")
    op.drop_index("ix_workspace_invites_organisation_id", table_name="workspace_invites")
    op.drop_table("workspace_invites")

    op.drop_index("ix_report_documents_share_token", table_name="report_documents")
    op.drop_index("ix_report_documents_report_type", table_name="report_documents")
    op.drop_index("ix_report_documents_created_by", table_name="report_documents")
    op.drop_index("ix_report_documents_organisation_id", table_name="report_documents")
    op.drop_table("report_documents")

    op.drop_column("organisations", "country")
