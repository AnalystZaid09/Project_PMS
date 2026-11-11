from sqlalchemy import Column, ForeignKey, String, Text
from app.db.session import Base
from app.models.base import TimestampMixin, generate_uuid


class SystemSetting(Base, TimestampMixin):
    __tablename__ = "system_settings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    setting_key = Column(String(100), nullable=False)
    setting_value = Column(Text, nullable=True)
    category = Column(String(50), default="general", nullable=False)
    description = Column(Text, nullable=True)

