from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class BackupCreateRequest(BaseModel):
    backup_type: str = Field(default="database_dump", description="database_dump or full_system_archive")
    notes: Optional[str] = None


class BackupResponse(BaseModel):
    id: str
    filename: str
    file_size_bytes: int
    file_size_human: str
    backup_type: str
    status: str
    checksum_sha256: Optional[str] = None
    created_by_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BackupRestoreResponse(BaseModel):
    status: str
    message: str
    restored_at: str
