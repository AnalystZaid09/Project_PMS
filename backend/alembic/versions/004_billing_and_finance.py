"""Billing and financial registers schema migration

Revision ID: 004
Revises: 003
Create Date: 2026-11-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    # Upgrade financial_registers columns
    op.add_column('financial_registers', sa.Column('serial_no', sa.Integer(), nullable=True))
    op.add_column('financial_registers', sa.Column('transaction_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('financial_registers', sa.Column('cheque_no', sa.String(length=50), nullable=True))
    op.add_column('financial_registers', sa.Column('particulars', sa.String(length=255), nullable=True))
    op.add_column('financial_registers', sa.Column('regular_or_emergency', sa.String(length=50), server_default='regular', nullable=True))
    op.add_column('financial_registers', sa.Column('payment_mode', sa.String(length=50), server_default='cash', nullable=True))
    op.add_column('financial_registers', sa.Column('due_or_paid', sa.String(length=50), server_default='paid', nullable=True))
    op.add_column('financial_registers', sa.Column('patient_name', sa.String(length=255), nullable=True))
    op.add_column('financial_registers', sa.Column('case_number', sa.String(length=50), nullable=True))
    op.add_column('financial_registers', sa.Column('receipt_number', sa.String(length=50), nullable=True))
    op.add_column('financial_registers', sa.Column('remark', sa.Text(), nullable=True))

    # Invoices
    op.add_column('invoices', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('invoices', sa.Column('discount_reason', sa.String(length=255), nullable=True))

    # Payments
    op.add_column('payments', sa.Column('is_refund', sa.Boolean(), server_default='0', nullable=False))
    op.add_column('payments', sa.Column('notes', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('payments', 'notes')
    op.drop_column('payments', 'is_refund')
    op.drop_column('invoices', 'discount_reason')
    op.drop_column('invoices', 'notes')
    op.drop_column('financial_registers', 'remark')
    op.drop_column('financial_registers', 'receipt_number')
    op.drop_column('financial_registers', 'case_number')
    op.drop_column('financial_registers', 'patient_name')
    op.drop_column('financial_registers', 'due_or_paid')
    op.drop_column('financial_registers', 'payment_mode')
    op.drop_column('financial_registers', 'regular_or_emergency')
    op.drop_column('financial_registers', 'particulars')
    op.drop_column('financial_registers', 'cheque_no')
    op.drop_column('financial_registers', 'transaction_date')
    op.drop_column('financial_registers', 'serial_no')

