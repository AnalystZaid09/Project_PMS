from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


# ------------------------------------------------------------------------------
# 1. Executive Dashboard & Analytics Schemas
# ------------------------------------------------------------------------------

class DashboardKpiSummary(BaseModel):
    total_patients: int
    today_cases: int
    week_cases: int
    month_cases: int
    emergency_cases: int
    draft_reports: int
    pending_verification_reports: int
    finalized_reports: int
    today_revenue: Decimal
    month_revenue: Decimal
    total_revenue: Decimal
    outstanding_dues: Decimal

    model_config = ConfigDict(from_attributes=True)


class RevenueTrendItem(BaseModel):
    date: str
    revenue: Decimal
    collections: Decimal


class DepartmentDistributionItem(BaseModel):
    department_id: str
    department_name: str
    case_count: int
    revenue: Decimal


class PriorityBreakdownItem(BaseModel):
    priority: str
    count: int


class TopInvestigationItem(BaseModel):
    investigation_id: str
    investigation_code: str
    investigation_name: str
    count: int
    total_billed: Decimal


class EmergencyQueueItem(BaseModel):
    id: str
    case_number: str
    patient_uhid: str
    patient_name: str
    priority: str
    status: str
    visit_datetime: datetime
    department_name: Optional[str] = None


class PendingVerificationQueueItem(BaseModel):
    id: str
    report_number: str
    case_number: str
    patient_name: str
    investigation_name: str
    status: str
    submitted_at: datetime


class DashboardAnalyticsResponse(BaseModel):
    kpis: DashboardKpiSummary
    revenue_trends: List[RevenueTrendItem]
    department_distribution: List[DepartmentDistributionItem]
    priority_breakdown: List[PriorityBreakdownItem]
    top_investigations: List[TopInvestigationItem]
    emergency_queue: List[EmergencyQueueItem]
    pending_verifications: List[PendingVerificationQueueItem]


# ------------------------------------------------------------------------------
# 2. Internal Staff Chat Schemas
# ------------------------------------------------------------------------------

class ChatMessageCreate(BaseModel):
    recipient_id: Optional[str] = None
    channel: Optional[str] = None  # general, clinical-updates, billing
    content: str = Field(..., min_length=1)
    case_id: Optional[str] = None
    report_id: Optional[str] = None


class ChatMessageResponse(BaseModel):
    id: str
    sender_id: str
    sender_name: str
    sender_role: str
    recipient_id: Optional[str] = None
    recipient_name: Optional[str] = None
    channel: Optional[str] = None
    content: str
    case_id: Optional[str] = None
    case_number: Optional[str] = None
    report_id: Optional[str] = None
    report_number: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatChannelItem(BaseModel):
    id: str
    name: str
    display_name: str
    description: str
    unread_count: int = 0
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None


class ChatUserItem(BaseModel):
    id: str
    full_name: str
    username: str
    role: str
    is_online: bool = True
    unread_count: int = 0


# ------------------------------------------------------------------------------
# 3. Notification Schemas
# ------------------------------------------------------------------------------

class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    notification_type: str  # info, warning, urgent, clinical, billing
    link_url: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationsListResponse(BaseModel):
    unread_count: int
    items: List[NotificationResponse]


# ------------------------------------------------------------------------------
# 4. Email Communication Schemas
# ------------------------------------------------------------------------------

class SendEmailRequest(BaseModel):
    recipient_email: str = Field(..., min_length=5)
    recipient_name: Optional[str] = None
    template_id: Optional[str] = None
    subject: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)
    case_id: Optional[str] = None
    report_id: Optional[str] = None


class EmailLogResponse(BaseModel):
    id: str
    recipient_email: str
    recipient_name: Optional[str] = None
    subject: str
    body: str
    sender_name: Optional[str] = None
    status: str
    case_id: Optional[str] = None
    case_number: Optional[str] = None
    report_id: Optional[str] = None
    report_number: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# 5. Enhanced Audit Log Stats Schemas
# ------------------------------------------------------------------------------

class AuditLogStatsResponse(BaseModel):
    total_logs: int
    login_events: int
    clinical_events: int
    financial_events: int
    master_events: int
