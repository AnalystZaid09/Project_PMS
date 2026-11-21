"""Clinical reports, verification workflow, versions and attachments

Revision ID: 005
Revises: 004
Create Date: 2026-11-21 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Upgrade clinical_reports table
    op.add_column('clinical_reports', sa.Column('case_id', sa.String(length=36), nullable=True))
    op.add_column('clinical_reports', sa.Column('report_number', sa.String(length=50), nullable=True))
    op.add_column('clinical_reports', sa.Column('report_name', sa.String(length=255), nullable=True))
    op.add_column('clinical_reports', sa.Column('report_heading', sa.String(length=255), nullable=True))
    op.add_column('clinical_reports', sa.Column('findings_text', sa.Text(), nullable=True))
    op.add_column('clinical_reports', sa.Column('impression', sa.Text(), nullable=True))
    op.add_column('clinical_reports', sa.Column('recommendation', sa.Text(), nullable=True))
    op.add_column('clinical_reports', sa.Column('verification_remarks', sa.Text(), nullable=True))
    op.add_column('clinical_reports', sa.Column('digital_signature', sa.Boolean(), server_default='0', nullable=False))
    op.add_column('clinical_reports', sa.Column('patient_email', sa.String(length=255), nullable=True))

    try:
        op.create_index(op.f('ix_clinical_reports_case_id'), 'clinical_reports', ['case_id'], unique=False)
        op.create_index(op.f('ix_clinical_reports_report_number'), 'clinical_reports', ['report_number'], unique=True)
    except Exception:
        pass

    # 2. Upgrade report_versions table
    op.add_column('report_versions', sa.Column('report_name', sa.String(length=255), nullable=True))
    op.add_column('report_versions', sa.Column('report_heading', sa.String(length=255), nullable=True))
    op.add_column('report_versions', sa.Column('findings_text', sa.Text(), nullable=True))
    op.add_column('report_versions', sa.Column('impression', sa.Text(), nullable=True))
    op.add_column('report_versions', sa.Column('recommendation', sa.Text(), nullable=True))

    # 3. Create report_attachments table
    op.create_table(
        'report_attachments',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('report_id', sa.String(length=36), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_type', sa.String(length=100), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('file_data', sa.Text(), nullable=True),
        sa.Column('caption', sa.String(length=255), nullable=True),
        sa.Column('uploaded_by_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['report_id'], ['clinical_reports.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    try:
        op.create_index(op.f('ix_report_attachments_report_id'), 'report_attachments', ['report_id'], unique=False)
    except Exception:
        pass


def downgrade():
    op.drop_table('report_attachments')
    op.drop_column('report_versions', 'recommendation')
    op.drop_column('report_versions', 'impression')
    op.drop_column('report_versions', 'findings_text')
    op.drop_column('report_versions', 'report_heading')
    op.drop_column('report_versions', 'report_name')
    op.drop_column('clinical_reports', 'patient_email')
    op.drop_column('clinical_reports', 'digital_signature')
    op.drop_column('clinical_reports', 'verification_remarks')
    op.drop_column('clinical_reports', 'recommendation')
    op.drop_column('clinical_reports', 'impression')
    op.drop_column('clinical_reports', 'findings_text')
    op.drop_column('clinical_reports', 'report_heading')
    op.drop_column('clinical_reports', 'report_name')
    op.drop_column('clinical_reports', 'report_number')
    op.drop_column('clinical_reports', 'case_id')
