"""Master Data Tables (Departments, Cities, Patient/Doctor Categories, Doctors, Rates, Investigations, Pricing, Other Charges, Templates)

Revision ID: 002_master_data
Revises: 001_initial_core
Create Date: 2026-11-12 01:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_master_data'
down_revision: Union[str, None] = '001_initial_core'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Departments
    op.create_table(
        'departments',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_departments_org_id', 'departments', ['organization_id'])

    # 2. Cities
    op.create_table(
        'cities',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('state', sa.String(length=100), nullable=False),
        sa.Column('country', sa.String(length=100), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 3. Patient Categories
    op.create_table(
        'patient_categories',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('discount_percentage', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_patient_categories_org_id', 'patient_categories', ['organization_id'])

    # 4. Doctor Categories
    op.create_table(
        'doctor_categories',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_doctor_categories_org_id', 'doctor_categories', ['organization_id'])

    # 5. Doctors
    op.create_table(
        'doctors',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('category_id', sa.String(length=36), sa.ForeignKey('doctor_categories.id', ondelete='SET NULL'), nullable=True),
        sa.Column('department_id', sa.String(length=36), sa.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('qualification', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('doctor_type', sa.String(length=50), nullable=False, server_default='both'),
        sa.Column('commission_rate', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('address_line1', sa.String(length=255), nullable=True),
        sa.Column('address_line2', sa.String(length=255), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_doctors_org_id', 'doctors', ['organization_id'])

    # 6. Report Templates
    op.create_table(
        'report_templates',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('department_id', sa.String(length=36), sa.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True),
        sa.Column('schema_json', sa.Text(), nullable=True),
        sa.Column('default_text', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_report_templates_org_id', 'report_templates', ['organization_id'])

    # 7. Investigation Categories
    op.create_table(
        'investigation_categories',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_investigation_categories_org_id', 'investigation_categories', ['organization_id'])

    # 8. Investigations
    op.create_table(
        'investigations',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('category_id', sa.String(length=36), sa.ForeignKey('investigation_categories.id', ondelete='SET NULL'), nullable=True),
        sa.Column('department_id', sa.String(length=36), sa.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('default_price', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('emergency_price', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('turnaround_hours', sa.Integer(), nullable=False, server_default='24'),
        sa.Column('template_id', sa.String(length=36), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_investigations_org_id', 'investigations', ['organization_id'])

    # 9. Investigation Branch Prices
    op.create_table(
        'investigation_branch_prices',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('investigation_id', sa.String(length=36), sa.ForeignKey('investigations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('branch_id', sa.String(length=36), sa.ForeignKey('branches.id', ondelete='CASCADE'), nullable=False),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('emergency_price', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 10. Doctor Investigation Rates
    op.create_table(
        'doctor_investigation_rates',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('doctor_id', sa.String(length=36), sa.ForeignKey('doctors.id', ondelete='CASCADE'), nullable=False),
        sa.Column('investigation_id', sa.String(length=36), sa.ForeignKey('investigations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('rate_type', sa.String(length=20), nullable=False, server_default='referral'),
        sa.Column('regular_fixed', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('regular_percentage', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('emergency_fixed', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('emergency_percentage', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 11. Other Charge Types
    op.create_table(
        'other_charge_types',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('default_amount', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('is_taxable', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_other_charge_types_org_id', 'other_charge_types', ['organization_id'])

    # 12. Email Templates
    op.create_table(
        'email_templates',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_email_templates_org_id', 'email_templates', ['organization_id'])


def downgrade() -> None:
    op.drop_table('email_templates')
    op.drop_table('other_charge_types')
    op.drop_table('doctor_investigation_rates')
    op.drop_table('investigation_branch_prices')
    op.drop_table('investigations')
    op.drop_table('investigation_categories')
    op.drop_table('report_templates')
    op.drop_table('doctors')
    op.drop_table('doctor_categories')
    op.drop_table('patient_categories')
    op.drop_table('cities')
    op.drop_table('departments')
