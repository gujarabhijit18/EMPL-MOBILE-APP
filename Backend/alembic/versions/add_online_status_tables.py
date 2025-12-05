"""Add online status tables for tracking online/offline status during attendance

Revision ID: add_online_status_001
Revises: 
Create Date: 2024-12-03

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_online_status_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create online_statuses table
    op.create_table(
        'online_statuses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('attendance_id', sa.Integer(), nullable=False),
        sa.Column('is_online', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['attendance_id'], ['attendances.attendance_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_online_statuses_id'), 'online_statuses', ['id'], unique=False)
    op.create_index('ix_online_statuses_user_attendance', 'online_statuses', ['user_id', 'attendance_id'], unique=False)

    # Create online_status_logs table
    op.create_table(
        'online_status_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('attendance_id', sa.Integer(), nullable=False),
        sa.Column('online_status_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('offline_reason', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_minutes', sa.Float(), default=0.0),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['attendance_id'], ['attendances.attendance_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['online_status_id'], ['online_statuses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_online_status_logs_id'), 'online_status_logs', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_online_status_logs_id'), table_name='online_status_logs')
    op.drop_table('online_status_logs')
    op.drop_index('ix_online_statuses_user_attendance', table_name='online_statuses')
    op.drop_index(op.f('ix_online_statuses_id'), table_name='online_statuses')
    op.drop_table('online_statuses')
