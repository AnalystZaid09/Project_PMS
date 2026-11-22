import os
import re
from pathlib import Path
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# Whitelist of allowed extensions for diagnostic scans, clinical attachments and reports
ALLOWED_FILE_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".dcm", ".dicom", ".zip", ".csv"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Production security headers hardening middleware ensuring OWASP compliance.
    """
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        response: Response = await call_next(request)

        # Standard OWASP security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        return response


def sanitize_filename(filename: str) -> str:
    """
    Removes path traversal components and illegal characters.
    """
    clean_name = os.path.basename(filename)
    # Remove any non-alphanumeric characters except dot, dash, underscore
    clean_name = re.sub(r"[^\w\s\.-]", "", clean_name).strip()
    return clean_name or "uploaded_file"


def validate_file_upload(filename: str, file_size: int) -> bool:
    """
    Validates file extension and size constraints against security policies.
    """
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB.",
        )

    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_FILE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Disallowed file extension '{ext}'. Only clinical diagnostics formats ({', '.join(ALLOWED_FILE_EXTENSIONS)}) are permitted.",
        )

    return True
