from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.rbac import AuthenticatedUserContext, get_current_user
from app.db.session import get_db
from app.models.schema_all import Notification
from app.schemas.analytics_communication import NotificationResponse, NotificationsListResponse

router = APIRouter(prefix="/notifications", tags=["In-App Notifications"])


@router.get("", response_model=NotificationsListResponse)
def get_user_notifications(
    current_user: AuthenticatedUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get user notifications and unread alert count.
    """
    notifications = db.query(Notification).filter(
        Notification.organization_id == current_user.organization_id,
        Notification.user_id == current_user.user_id,
    ).order_by(Notification.created_at.desc()).limit(20).all()

    unread_count = db.query(Notification).filter(
        Notification.organization_id == current_user.organization_id,
        Notification.user_id == current_user.user_id,
        Notification.is_read == False,
    ).count()

    return NotificationsListResponse(
        unread_count=unread_count,
        items=[
            NotificationResponse(
                id=n.id,
                title=n.title,
                message=n.message,
                notification_type=n.notification_type,
                link_url=n.link_url,
                is_read=n.is_read,
                created_at=n.created_at,
            )
            for n in notifications
        ],
    )


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user: AuthenticatedUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mark an individual notification as read.
    """
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.user_id,
    ).first()

    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    notif.is_read = True
    db.commit()
    return {"status": "success", "id": notification_id}


@router.post("/read-all")
def mark_all_notifications_read(
    current_user: AuthenticatedUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mark all notifications for the current user as read.
    """
    unread = db.query(Notification).filter(
        Notification.user_id == current_user.user_id,
        Notification.is_read == False,
    ).all()

    for n in unread:
        n.is_read = True

    db.commit()
    return {"status": "success", "marked_read_count": len(unread)}
