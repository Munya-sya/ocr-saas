"""add_stripe_subscription_and_webhook_tables

Revision ID: 28a93ef0d19c
Revises: 11e10fe0d98b
Create Date: 2026-10-15 18:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '28a93ef0d19c'
down_revision: Union[str, Sequence[str], None] = '11e10fe0d98b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 1. Add Stripe fields to users table
    if "users" in tables:
        existing_cols = [c["name"] for c in inspector.get_columns("users")]
        with op.batch_alter_table("users", schema=None) as batch_op:
            if "stripe_customer_id" not in existing_cols:
                batch_op.add_column(sa.Column("stripe_customer_id", sa.String(255), nullable=True))
                batch_op.create_index("ix_users_stripe_customer_id", ["stripe_customer_id"], unique=True)
            if "stripe_subscription_id" not in existing_cols:
                batch_op.add_column(sa.Column("stripe_subscription_id", sa.String(255), nullable=True))
                batch_op.create_index("ix_users_stripe_subscription_id", ["stripe_subscription_id"], unique=True)
            if "subscription_status" not in existing_cols:
                batch_op.add_column(sa.Column("subscription_status", sa.String(50), nullable=True))
            if "current_period_end" not in existing_cols:
                batch_op.add_column(sa.Column("current_period_end", sa.DateTime(), nullable=True))

    # 2. Create processed_webhook_events table for idempotency
    if "processed_webhook_events" not in tables:
        op.create_table(
            "processed_webhook_events",
            sa.Column("event_id", sa.String(255), primary_key=True),
            sa.Column("event_type", sa.String(100), nullable=False),
            sa.Column("processed_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_processed_webhook_events_event_id", "processed_webhook_events", ["event_id"], unique=False)

def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "processed_webhook_events" in tables:
        op.drop_table("processed_webhook_events")

    if "users" in tables:
        with op.batch_alter_table("users", schema=None) as batch_op:
            batch_op.drop_index("ix_users_stripe_customer_id")
            batch_op.drop_index("ix_users_stripe_subscription_id")
            batch_op.drop_column("current_period_end")
            batch_op.drop_column("subscription_status")
            batch_op.drop_column("stripe_subscription_id")
            batch_op.drop_column("stripe_customer_id")
