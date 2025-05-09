"""Add expense_id to Payment

Revision ID: 5e27df99c7fb
Revises: 3d841c4ffe33
Create Date: 2025-04-25 17:07:43.295330

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5e27df99c7fb'
down_revision = '3d841c4ffe33'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('payment', schema=None) as batch_op:
        # allow NULLs so existing rows pass
        batch_op.add_column(
            sa.Column('expense_id', sa.Integer(), nullable=True)
        )
        batch_op.create_foreign_key(
            None,
            'expense',
            ['expense_id'],
            ['id']
        )
    # ### end Alembic commands ###



def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('payment', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_column('expense_id')

    # ### end Alembic commands ###
