"""Patient and Case Workflow Tables (Patients, Cases, Case Items, Case Other Charges)

Revision ID: 003_patient_and_case
Revises: 002_master_data
Create Date: 2026-11-12 02:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '003_patient_and_case'
down_revision: Union[str, None] = '002_master_data'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Patients Table
    op.create_table(
        'patients',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('branch_id', sa.String(length=36), sa.ForeignKey('branches.id', ondelete='CASCADE'), nullable=False),
        sa.Column('patient_uhid', sa.String(length=50), unique=True, nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('dob', sa.Date(), nullable=True),
        sa.Column('age', sa.Integer(), nullable=True),
        sa.Column('gender', sa.String(length=20), nullable=False),
        sa.Column('blood_group', sa.String(length=10), nullable=True),
        sa.Column('national_id', sa.String(length=50), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('emergency_contact', sa.String(length=100), nullable=True),
        sa.Column('category_id', sa.String(length=36), sa.ForeignKey('patient_categories.id', ondelete='SET NULL'), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_patients_uhid', 'patients', ['patient_uhid'])
    op.create_index('ix_patients_phone', 'patients', ['phone'])
    op.create_index('ix_patients_org_branch', 'patients', ['organization_id', 'branch_id'])

    # 2. Cases Table
    op.create_table(
        'cases',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('branch_id', sa.String(length=36), sa.ForeignKey('branches.id', ondelete='CASCADE'), nullable=False),
        sa.Column('case_number', sa.String(length=50), unique=True, nullable=False),
        sa.Column('patient_id', sa.String(length=36), sa.ForeignKey('patients.id', ondelete='CASCADE'), nullable=False),
        sa.Column('referring_doctor_id', sa.String(length=36), sa.ForeignKey('doctors.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reporting_doctor_id', sa.String(length=36), sa.ForeignKey('doctors.id', ondelete='SET NULL'), nullable=True),
        sa.Column('radiologist_id', sa.String(length=36), sa.ForeignKey('doctors.id', ondelete='SET NULL'), nullable=True),
        sa.Column('pathologist_id', sa.String(length=36), sa.ForeignKey('doctors.id', ondelete='SET NULL'), nullable=True),
        sa.Column('physician_id', sa.String(length=36), sa.ForeignKey('doctors.id', ondelete='SET NULL'), nullable=True),
        sa.Column('other_doctor_id', sa.String(length=36), sa.ForeignKey('doctors.id', ondelete='SET NULL'), nullable=True),
        sa.Column('department_id', sa.String(length=36), sa.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True),
        sa.Column('visit_datetime', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='registered'),
        sa.Column('symptoms', sa.Text(), nullable=True),
        sa.Column('clinical_notes', sa.Text(), nullable=True),
        sa.Column('priority', sa.String(length=20), nullable=False, server_default='normal'),
        sa.Column('case_category', sa.String(length=50), nullable=False, server_default='regular'),
        sa.Column('patient_category_id', sa.String(length=36), sa.ForeignKey('patient_categories.id', ondelete='SET NULL'), nullable=True),
        sa.Column('total_charges', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('discount_total', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('tax_total', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('net_amount', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('created_by_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_cases_case_number', 'cases', ['case_number'])
    op.create_index('ix_cases_patient_id', 'cases', ['patient_id'])
    op.create_index('ix_cases_org_branch', 'cases', ['organization_id', 'branch_id'])

    # 3. Case Items Table
    op.create_table(
        'case_items',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('case_id', sa.String(length=36), sa.ForeignKey('cases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('investigation_id', sa.String(length=36), sa.ForeignKey('investigations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('discount_amount', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('tax_amount', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('final_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_case_items_case_id', 'case_items', ['case_id'])

    # 4. Case Other Charges Table
    op.create_table(
        'case_other_charges',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('case_id', sa.String(length=36), sa.ForeignKey('cases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('charge_type_id', sa.String(length=36), sa.ForeignKey('other_charge_types.id', ondelete='CASCADE'), nullable=False),
        sa.Column('charge_name', sa.String(length=100), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_case_other_charges_case_id', 'case_other_charges', ['case_id'])


def downgrade() -> None:
    op.drop_table('case_other_charges')
    op.drop_table('case_items')
    op.drop_table('cases')
    op.drop_table('patients')
