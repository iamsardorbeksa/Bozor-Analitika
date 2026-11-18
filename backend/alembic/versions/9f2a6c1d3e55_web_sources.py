"""Real prices from public websites: offer source fields, optional stock.

Revision ID: 9f2a6c1d3e55
Revises: 7c1e2d9a4b10
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "9f2a6c1d3e55"
down_revision: Union[str, Sequence[str], None] = "7c1e2d9a4b10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("offers") as b:
        b.add_column(sa.Column("source_site", sa.String(length=40), nullable=True))
        b.add_column(sa.Column("source_url", sa.String(length=500), nullable=True))
        b.add_column(sa.Column("external_id", sa.String(length=120), nullable=True))
        b.alter_column("available_qty", existing_type=sa.Numeric(14, 2), nullable=True)
        b.create_index("ix_offers_source_site", ["source_site"])
        b.create_unique_constraint("uq_offer_external", ["source_site", "external_id"])


def downgrade() -> None:
    with op.batch_alter_table("offers") as b:
        b.drop_constraint("uq_offer_external", type_="unique")
        b.drop_index("ix_offers_source_site")
        b.alter_column("available_qty", existing_type=sa.Numeric(14, 2), nullable=False)
        b.drop_column("external_id")
        b.drop_column("source_url")
        b.drop_column("source_site")
