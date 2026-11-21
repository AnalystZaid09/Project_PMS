from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.rbac import AuthenticatedUserContext, require_permission
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.role import Role
from app.models.schema_all import ChatMessage, Notification, Case, ClinicalReport
from app.schemas.analytics_communication import (
    ChatMessageCreate, ChatMessageResponse, ChatChannelItem, ChatUserItem
)

router = APIRouter(prefix="/chat", tags=["Internal Staff Communication"])

PREDEFINED_CHANNELS = [
    {
        "id": "general",
        "name": "general",
        "display_name": "General Announcements",
        "description": "Hospital & clinic-wide notices and general staff discussions",
    },
    {
        "id": "clinical-updates",
        "name": "clinical-updates",
        "display_name": "Clinical & Diagnostic Updates",
        "description": "Urgent scan results, emergency patient arrivals, and doctor reviews",
    },
    {
        "id": "billing",
        "name": "billing",
        "display_name": "Billing & Front Desk",
        "description": "Invoice collections, insurance queries, and patient billing coordination",
    },
]


@router.get("/channels", response_model=List[ChatChannelItem])
def list_channels(
    current_user: AuthenticatedUserContext = Depends(require_permission("chat:view")),
    db: Session = Depends(get_db),
):
    """
    List available communication channels with unread status and latest message snippets.
    """
    result: List[ChatChannelItem] = []

    for ch in PREDEFINED_CHANNELS:
        ch_name = ch["name"]

        # Latest message
        last_msg = db.query(ChatMessage).filter(
            ChatMessage.organization_id == current_user.organization_id,
            ChatMessage.channel == ch_name,
        ).order_by(ChatMessage.created_at.desc()).first()

        # Unread count (messages sent after last read by other users)
        unread = db.query(func.count(ChatMessage.id)).filter(
            ChatMessage.organization_id == current_user.organization_id,
            ChatMessage.channel == ch_name,
            ChatMessage.sender_id != current_user.user_id,
            ChatMessage.is_read == False,
        ).scalar() or 0

        result.append(ChatChannelItem(
            id=ch["id"],
            name=ch["name"],
            display_name=ch["display_name"],
            description=ch["description"],
            unread_count=unread,
            last_message=last_msg.content[:80] + "..." if last_msg and len(last_msg.content) > 80 else (last_msg.content if last_msg else None),
            last_message_at=last_msg.created_at if last_msg else None,
        ))

    return result


@router.get("/users", response_model=List[ChatUserItem])
def list_chat_users(
    current_user: AuthenticatedUserContext = Depends(require_permission("chat:view")),
    db: Session = Depends(get_db),
):
    """
    List colleagues for 1-to-1 direct messaging with unread message counts.
    """
    users = db.query(User).filter(
        User.organization_id == current_user.organization_id,
        User.id != current_user.user_id,
        User.is_active == True,
    ).all()

    result: List[ChatUserItem] = []
    for u in users:
        # Determine primary role
        role_rel = db.query(Role).join(UserRole, Role.id == UserRole.role_id).filter(
            UserRole.user_id == u.id
        ).first()
        role_title = role_rel.name if role_rel else "Staff Member"

        # Count unread messages sent by this user to current_user
        unread = db.query(func.count(ChatMessage.id)).filter(
            ChatMessage.organization_id == current_user.organization_id,
            ChatMessage.sender_id == u.id,
            ChatMessage.recipient_id == current_user.user_id,
            ChatMessage.is_read == False,
        ).scalar() or 0

        result.append(ChatUserItem(
            id=u.id,
            full_name=u.full_name,
            username=u.username,
            role=role_title,
            is_online=True,
            unread_count=unread,
        ))

    return result


@router.get("/messages", response_model=List[ChatMessageResponse])
def get_messages(
    channel: Optional[str] = Query(None, description="Channel identifier"),
    recipient_id: Optional[str] = Query(None, description="Colleague user ID for 1-to-1 chat"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: AuthenticatedUserContext = Depends(require_permission("chat:view")),
    db: Session = Depends(get_db),
):
    """
    Fetch message stream for a channel or 1-to-1 direct message conversation.
    """
    if not channel and not recipient_id:
        channel = "general"

    query = db.query(ChatMessage).filter(ChatMessage.organization_id == current_user.organization_id)

    if channel:
        query = query.filter(ChatMessage.channel == channel)
    elif recipient_id:
        # 1-to-1 messages between current_user and recipient_id in either direction
        query = query.filter(
            or_(
                (ChatMessage.sender_id == current_user.user_id) & (ChatMessage.recipient_id == recipient_id),
                (ChatMessage.sender_id == recipient_id) & (ChatMessage.recipient_id == current_user.user_id),
            )
        )

    db_messages = query.order_by(ChatMessage.created_at.asc()).offset(skip).limit(limit).all()

    response: List[ChatMessageResponse] = []
    for msg in db_messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        recipient = db.query(User).filter(User.id == msg.recipient_id).first() if msg.recipient_id else None

        sender_role_obj = db.query(Role).join(UserRole, Role.id == UserRole.role_id).filter(
            UserRole.user_id == msg.sender_id
        ).first()
        sender_role = sender_role_obj.name if sender_role_obj else "Staff"

        case_no = None
        if msg.case_id:
            c = db.query(Case).filter(Case.id == msg.case_id).first()
            if c:
                case_no = c.case_number

        report_no = None
        if msg.report_id:
            rep = db.query(ClinicalReport).filter(ClinicalReport.id == msg.report_id).first()
            if rep:
                report_no = rep.report_number

        response.append(ChatMessageResponse(
            id=msg.id,
            sender_id=msg.sender_id,
            sender_name=sender.full_name if sender else "Staff",
            sender_role=sender_role,
            recipient_id=msg.recipient_id,
            recipient_name=recipient.full_name if recipient else None,
            channel=msg.channel,
            content=msg.content,
            case_id=msg.case_id,
            case_number=case_no,
            report_id=msg.report_id,
            report_number=report_no,
            is_read=msg.is_read,
            created_at=msg.created_at,
        ))

    return response


@router.post("/messages", response_model=ChatMessageResponse)
def send_message(
    payload: ChatMessageCreate,
    current_user: AuthenticatedUserContext = Depends(require_permission("chat:send")),
    db: Session = Depends(get_db),
):
    """
    Send an internal chat message to a channel or direct message a colleague.
    """
    if not payload.channel and not payload.recipient_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must specify either a channel or a recipient_id.",
        )

    # Validate recipient exists if direct message
    recipient = None
    if payload.recipient_id:
        recipient = db.query(User).filter(
            User.id == payload.recipient_id,
            User.organization_id == current_user.organization_id,
        ).first()
        if not recipient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient user not found.")

    msg = ChatMessage(
        organization_id=current_user.organization_id,
        branch_id=current_user.active_branch_id,
        sender_id=current_user.user_id,
        recipient_id=payload.recipient_id,
        channel=payload.channel,
        content=payload.content,
        case_id=payload.case_id,
        report_id=payload.report_id,
        is_read=False,
    )
    db.add(msg)
    db.flush()

    # Trigger In-App Notification if direct message
    sender = db.query(User).filter(User.id == current_user.user_id).first()
    if payload.recipient_id:
        db.add(Notification(
            organization_id=current_user.organization_id,
            user_id=payload.recipient_id,
            title=f"Direct Message from {sender.full_name if sender else 'Colleague'}",
            message=payload.content[:120],
            notification_type="info",
            link_url=f"/communication/chat?user={current_user.user_id}",
            is_read=False,
        ))

    db.commit()
    db.refresh(msg)

    sender_role_obj = db.query(Role).join(UserRole, Role.id == UserRole.role_id).filter(
        UserRole.user_id == current_user.user_id
    ).first()
    sender_role = sender_role_obj.name if sender_role_obj else "Staff"

    case_no = None
    if msg.case_id:
        c = db.query(Case).filter(Case.id == msg.case_id).first()
        if c:
            case_no = c.case_number

    report_no = None
    if msg.report_id:
        rep = db.query(ClinicalReport).filter(ClinicalReport.id == msg.report_id).first()
        if rep:
            report_no = rep.report_number

    return ChatMessageResponse(
        id=msg.id,
        sender_id=msg.sender_id,
        sender_name=sender.full_name if sender else "Staff",
        sender_role=sender_role,
        recipient_id=msg.recipient_id,
        recipient_name=recipient.full_name if recipient else None,
        channel=msg.channel,
        content=msg.content,
        case_id=msg.case_id,
        case_number=case_no,
        report_id=msg.report_id,
        report_number=report_no,
        is_read=msg.is_read,
        created_at=msg.created_at,
    )


@router.post("/mark-read")
def mark_messages_as_read(
    channel: Optional[str] = Query(None),
    sender_id: Optional[str] = Query(None),
    current_user: AuthenticatedUserContext = Depends(require_permission("chat:view")),
    db: Session = Depends(get_db),
):
    """
    Mark channel messages or direct message conversation as read.
    """
    query = db.query(ChatMessage).filter(
        ChatMessage.organization_id == current_user.organization_id,
        ChatMessage.is_read == False,
    )

    if channel:
        query = query.filter(
            ChatMessage.channel == channel,
            ChatMessage.sender_id != current_user.user_id,
        )
    elif sender_id:
        query = query.filter(
            ChatMessage.sender_id == sender_id,
            ChatMessage.recipient_id == current_user.user_id,
        )

    unread_messages = query.all()
    for m in unread_messages:
        m.is_read = True

    db.commit()
    return {"status": "success", "marked_read_count": len(unread_messages)}
