"""initial_schema

Revision ID: 11e10fe0d98b
Revises: 
Create Date: 2026-10-15 04:24:26.952227

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '11e10fe0d98b'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema with safe inspector checks for existing tables and columns."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'system_settings' not in tables:
        op.create_table('system_settings',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('key', sa.String(length=100), nullable=False),
            sa.Column('value', sa.Text(), nullable=False),
            sa.Column('description', sa.String(length=255), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_system_settings_key'), 'system_settings', ['key'], unique=True)

    if 'audit_logs' not in tables:
        op.create_table('audit_logs',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('user_id', sa.String(length=36), nullable=True),
            sa.Column('ip_address', sa.String(length=45), nullable=True),
            sa.Column('action', sa.String(length=100), nullable=False),
            sa.Column('details', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
        op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'], unique=False)
        op.create_index(op.f('ix_audit_logs_id'), 'audit_logs', ['id'], unique=False)
        op.create_index(op.f('ix_audit_logs_ip_address'), 'audit_logs', ['ip_address'], unique=False)
        op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)

    if 'ocr_jobs' in tables:
        ocr_jobs_cols = [c['name'] for c in inspector.get_columns('ocr_jobs')]
        if 'user_id' not in ocr_jobs_cols:
            with op.batch_alter_table('ocr_jobs') as batch_op:
                batch_op.add_column(sa.Column('user_id', sa.String(length=36), nullable=True))
                batch_op.create_index(batch_op.f('ix_ocr_jobs_user_id'), ['user_id'], unique=False)
                batch_op.create_foreign_key('fk_ocr_jobs_user_id', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    if 'users' in tables:
        users_cols = [c['name'] for c in inspector.get_columns('users')]
        with op.batch_alter_table('users') as batch_op:
            if 'is_admin' not in users_cols:
                batch_op.add_column(sa.Column('is_admin', sa.Boolean(), nullable=False, server_default=sa.false()))
            if 'is_banned' not in users_cols:
                batch_op.add_column(sa.Column('is_banned', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('is_banned')
        batch_op.drop_column('is_admin')

    with op.batch_alter_table('ocr_jobs') as batch_op:
        batch_op.drop_constraint('fk_ocr_jobs_user_id', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_ocr_jobs_user_id'))
        batch_op.drop_column('user_id')

    op.drop_index(op.f('ix_audit_logs_user_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_ip_address'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_created_at'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_action'), table_name='audit_logs')
    op.drop_table('audit_logs')
    op.drop_index(op.f('ix_system_settings_key'), table_name='system_settings')
    op.drop_table('system_settings')
    # ### end Alembic commands ###
