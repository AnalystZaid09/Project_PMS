import os
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.backup import create_backup, restore_backup, delete_backup
from app.core.rbac import AuthenticatedUserContext, require_permission
from app.db.session import get_db
from app.models.user import User
from app.models.schema_all import BackupRecord
from app.schemas.backups import BackupCreateRequest, BackupResponse, BackupRestoreResponse

router = APIRouter(prefix="/backups", tags=["Database & System Backups"])


@router.get("", response_model=List[BackupResponse])
def list_backups(
    current_user: AuthenticatedUserContext = Depends(require_permission("general_settings:view")),
    db: Session = Depends(get_db),
):
    """
    List database and archive backup snapshots corresponding to eight_tab_create_backups.png.
    """
    backups = db.query(BackupRecord).filter(
        BackupRecord.organization_id == current_user.organization_id
    ).order_by(BackupRecord.created_at.desc()).all()

    result: List[BackupResponse] = []
    for b in backups:
        creator_name = None
        if b.created_by_id:
            u = db.query(User).filter(User.id == b.created_by_id).first()
            if u:
                creator_name = u.full_name

        result.append(BackupResponse(
            id=b.id,
            filename=b.filename,
            file_size_bytes=b.file_size_bytes,
            file_size_human=b.file_size_human,
            backup_type=b.backup_type,
            status=b.status,
            checksum_sha256=b.checksum_sha256,
            created_by_name=creator_name,
            notes=b.notes,
            created_at=b.created_at,
        ))

    return result


@router.post("", response_model=BackupResponse)
def trigger_backup(
    payload: BackupCreateRequest,
    current_user: AuthenticatedUserContext = Depends(require_permission("general_settings:update")),
    db: Session = Depends(get_db),
):
    """
    Create a new manual database or full-system archive snapshot.
    """
    try:
        record = create_backup(
            db=db,
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            backup_type=payload.backup_type,
            notes=payload.notes,
        )

        creator_name = current_user.full_name

        return BackupResponse(
            id=record.id,
            filename=record.filename,
            file_size_bytes=record.file_size_bytes,
            file_size_human=record.file_size_human,
            backup_type=record.backup_type,
            status=record.status,
            checksum_sha256=record.checksum_sha256,
            created_by_name=creator_name,
            notes=record.notes,
            created_at=record.created_at,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backup snapshot creation failed: {str(e)}",
        )


@router.get("/{backup_id}/download")
def download_backup_file(
    backup_id: str,
    current_user: AuthenticatedUserContext = Depends(require_permission("general_settings:view")),
    db: Session = Depends(get_db),
):
    """
    Securely download backup snapshot file.
    """
    record = db.query(BackupRecord).filter(
        BackupRecord.id == backup_id,
        BackupRecord.organization_id == current_user.organization_id,
    ).first()

    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup record not found.")

    file_path = Path(record.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup file missing on disk.")

    media_type = "application/zip" if record.filename.endswith(".zip") else "application/octet-stream"
    return FileResponse(
        path=str(file_path),
        filename=record.filename,
        media_type=media_type,
    )


@router.post("/{backup_id}/restore", response_model=BackupRestoreResponse)
def trigger_restore(
    backup_id: str,
    current_user: AuthenticatedUserContext = Depends(require_permission("general_settings:update")),
    db: Session = Depends(get_db),
):
    """
    Restores the database state from selected backup snapshot.
    """
    try:
        res = restore_backup(
            db=db,
            backup_id=backup_id,
            organization_id=current_user.organization_id,
            user_id=current_user.id,
        )
        return BackupRestoreResponse(**res)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except FileNotFoundError as fe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fe))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Restore operation failed: {str(e)}",
        )


@router.delete("/{backup_id}")
def remove_backup(
    backup_id: str,
    current_user: AuthenticatedUserContext = Depends(require_permission("general_settings:update")),
    db: Session = Depends(get_db),
):
    """
    Delete an old backup snapshot from storage and audit logs.
    """
    try:
        return delete_backup(
            db=db,
            backup_id=backup_id,
            organization_id=current_user.organization_id,
            user_id=current_user.id,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete backup: {str(e)}",
        )
