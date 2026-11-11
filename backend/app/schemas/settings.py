from typing import Optional
from pydantic import BaseModel


class SystemSettingUpdate(BaseModel):
    app_name: str
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None


class SystemSettingResponse(BaseModel):
    app_name: str
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    currency_code: str = "INR"
    currency_symbol: str = "₹"
    timezone: str = "Asia/Kolkata"
    date_format: str = "DD/MM/YYYY"

