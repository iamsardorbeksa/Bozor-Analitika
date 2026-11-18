"""products.emoji: per-product symbol shown in the UI

Revision ID: 7c1e2d9a4b10
Revises: 59a54b77c854
Create Date: 2026-11-18 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7c1e2d9a4b10"
down_revision: Union[str, Sequence[str], None] = "59a54b77c854"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("products", schema=None) as batch_op:
        batch_op.add_column(sa.Column("emoji", sa.String(length=16), nullable=False, server_default="\U0001F4E6"))


def downgrade() -> None:
    with op.batch_alter_table("products", schema=None) as batch_op:
        batch_op.drop_column("emoji")
