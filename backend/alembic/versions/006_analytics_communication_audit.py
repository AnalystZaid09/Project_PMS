"""Analytics, communication, chat, notifications, and email logs

Revision ID: 006
Revises: 005
Create Date: 2026-11-21 23:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Create chat_messages table
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('branch_id', sa.String(length=36), sa.ForeignKey('branches.id', ondelete='CASCADE'), nullable=True),
        sa.Column('sender_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('recipient_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        sa.Column('channel', sa.String(length=50), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('case_id', sa.String(length=36), sa.ForeignKey('cases.id', ondelete='SET NULL'), nullable=True),
        sa.Column('report_id', sa.String(length=36), sa.ForeignKey('clinical_reports.id', ondelete='SET NULL'), nullable=True),
        sa.Column('is_read', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    try:
        op.create_index(op.f('ix_chat_messages_organization_id'), 'chat_messages', ['organization_id'], unique=False)
        op.create_index(op.f('ix_chat_messages_branch_id'), 'chat_messages', ['branch_id'], unique=False)
        op.create_index(op.f('ix_chat_messages_sender_id'), 'chat_messages', ['sender_id'], unique=False)
        op.create_index(op.f('ix_chat_messages_recipient_id'), 'chat_messages', ['recipient_id'], unique=False)
        op.create_index(op.f('ix_chat_messages_channel'), 'chat_messages', ['channel'], unique=False)
    except Exception:
        pass

    # 2. Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('notification_type', sa.String(length=50), server_default='info', nullable=False),
        sa.Column('link_url', sa.String(length=255), nullable=True),
        sa.Column('is_read', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    try:
        op.create_index(op.f('ix_notifications_organization_id'), 'notifications', ['organization_id'], unique=False)
        op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)
    except Exception:
        pass

    # 3. Create email_logs table
    op.create_table(
        'email_logs',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('branch_id', sa.String(length=36), sa.ForeignKey('branches.id', ondelete='CASCADE'), nullable=True),
        sa.Column('sender_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('recipient_email', sa.String(length=255), nullable=False),
        sa.Column('recipient_name', sa.String(length=200), nullable=True),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('template_id', sa.String(length=36), sa.ForeignKey('email_templates.id', ondelete='SET NULL'), nullable=True),
        sa.Column('case_id', sa.String(length=36), sa.ForeignKey('cases.id', ondelete='SET NULL'), nullable=True),
        sa.Column('report_id', sa.String(length=36), sa.ForeignKey('clinical_reports.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='sent', nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    try:
        op.create_index(op.f('ix_email_logs_organization_id'), 'email_logs', ['organization_id'], unique=False)
        op.create_index(op.f('ix_email_logs_branch_id'), 'email_logs', ['branch_id'], unique=False)
    except Exception:
        pass


def downgrade():
    op.drop_table('email_logs')
    op.drop_table('notifications')
    op.drop_table('chat_messages')
