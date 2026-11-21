# Deployment & Operations Guide — Apex Health Diagnostics PMS

This guide outlines the production deployment architecture, security hardening, automated backup scheduling, and disaster recovery procedures for the **Apex Health Diagnostics Patient Management System (PMS)**.

---

## 1. System Architecture & Topology

The PMS application is built on an enterprise containerized multi-tier architecture designed for high availability, branch data isolation, and strict role-based access control (RBAC).

```
                 Internet / Clinical WAN
                           │
                           ▼ (HTTPS / Port 443)
              ┌───────────────────────────┐
              │    NGINX Reverse Proxy    │
              │  SSL Termination + OWASP  │
              └─────────────┬─────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
            ▼ (/api/*)                      ▼ (/*)
   ┌─────────────────┐             ┌─────────────────┐
   │ FastAPI Backend │             │ React Vite SPA  │
   │   (Port 8000)   │             │   (Port 80/3000)│
   └────────┬────────┘             └─────────────────┘
            │
      ┌─────┴──────────────────┐
      │                        │
      ▼                        ▼
┌──────────────┐      ┌─────────────────┐
│PostgreSQL 16 │      │  Redis 7 Cache  │
│(Port 5432)   │      │   (Port 6379)   │
└──────────────┘      └─────────────────┘
```

### Components
1. **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS / shadcn/ui. Static assets served by NGINX Alpine with client-side SPA routing (`try_files $uri /index.html`).
2. **Backend**: Python 3.11 + FastAPI + SQLAlchemy 2.0 + Pydantic v2. High-performance asynchronous ASGI service running behind Uvicorn.
3. **Database**: PostgreSQL 16 Alpine with ACID compliance, JSONB audit logging, foreign-key constraints, and automated indexing.
4. **Cache & Queuing**: Redis 7 Alpine for session cache, real-time channels, and background job coordination.
5. **Private Storage**: Dedicated volume mounts for encrypted clinical scan uploads, PDF medical reports, and database snapshots.

---

## 2. Production Environment Setup

### 2.1 Prerequisites
- Linux Server (Ubuntu 22.04 LTS or 24.04 LTS recommended) / Docker Engine 24.0+ and Docker Compose v2.20+
- Minimum Server Specs: 4 vCPU, 8 GB RAM, 100 GB SSD (expandable based on scan volume)
- Registered Domain Name with DNS A-records pointing to the host IP (e.g., `pms.apexhealth.org`)
- Valid SSL/TLS Certificate (Let's Encrypt / Certbot or Enterprise Wildcard)

### 2.2 Environment Configuration
Create a production environment file: `/opt/pms/.env.production`

```bash
# General
ENVIRONMENT=production
PROJECT_NAME="Apex Health Diagnostics PMS"
SECRET_KEY="GENERATE_A_SECURE_RANDOM_64_CHAR_KEY_HERE"
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Database Configuration
POSTGRES_SERVER=db
POSTGRES_USER=apex_pms_prod
POSTGRES_PASSWORD="GENERATE_A_SECURE_POSTGRES_PASSWORD"
POSTGRES_DB=apex_pms_db
POSTGRES_PORT=5432
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_SERVER}:${POSTGRES_PORT}/${POSTGRES_DB}

# CORS & Networking
CORS_ORIGINS=["https://pms.apexhealth.org","https://api.pms.apexhealth.org"]
BACKEND_PORT=8000
FRONTEND_PORT=3000

# Storage
STORAGE_DIR=/app/storage
MAX_UPLOAD_SIZE_BYTES=10485760
ALLOWED_EXTENSIONS=[".pdf",".png",".jpg",".jpeg",".dcm",".dicom",".zip",".csv"]
```

---

## 3. Docker Production Deployment

### 3.1 Production Compose File (`docker-compose.prod.yml`)

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: apex_pms_db
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: apex_pms_redis
    restart: always
    volumes:
      - redis_prod_data:/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: apex_pms_backend
    restart: always
    depends_on:
      db:
        condition: service_healthy
    env_file:
      - .env.production
    volumes:
      - storage_prod_data:/app/storage
    ports:
      - "127.0.0.1:8000:8000"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: apex_pms_frontend
    restart: always
    depends_on:
      - backend
    ports:
      - "127.0.0.1:3000:80"

volumes:
  postgres_prod_data:
  redis_prod_data:
  storage_prod_data:
```

### 3.2 Launch & Initial Database Migration
```bash
# 1. Pull base images and build containers
docker compose -f docker-compose.prod.yml build

# 2. Start services in detached mode
docker compose -f docker-compose.prod.yml up -d

# 3. Apply all Alembic database migrations up to Phase 7
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# 4. Verify seed data and initial organization bootstrap
docker compose -f docker-compose.prod.yml exec backend python -m app.db.seed
```

---

## 4. Reverse Proxy & Security Hardening

### 4.1 Production NGINX Virtual Host with SSL Termination
Install NGINX and configure `/etc/nginx/sites-available/apex-pms.conf`:

```nginx
# Rate limiting zone (10 requests per second per IP)
limit_req_zone $binary_remote_addr zone=pms_limit:10m rate=10r/s;

server {
    listen 80;
    server_name pms.apexhealth.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pms.apexhealth.org;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/pms.apexhealth.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pms.apexhealth.org/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # OWASP Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Maximum file upload size for clinical scans and reports
    client_max_body_size 10M;

    # Frontend Single Page Application
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend REST API and WebSockets
    location /api/ {
        limit_req zone=pms_limit burst=20 nodelay;
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # API Documentation (Restricted to internal IP or disabled in prod)
    location ~ ^/(docs|redoc|openapi.json) {
        allow 192.168.1.0/24; # Internal management subnet
        deny all;
        proxy_pass http://127.0.0.1:8000;
    }
}
```

---

## 5. Automated Backups & Disaster Recovery

### 5.1 Automated Cron Backup Scheduling
The PMS includes a standalone CLI utility (`scripts/backup_restore.py`) that operates without external runtime dependencies.

Configure daily automated snapshots via Linux `crontab -e`:

```bash
# Run database backup every night at 00:00 UTC
0 0 * * * /usr/bin/python3 /opt/pms/scripts/backup_restore.py --backup >> /var/log/pms_backup.log 2>&1

# Run full system archive snapshot (DB + scan uploads + reports) every Sunday at 02:00 UTC
0 2 * * 0 /usr/bin/python3 /opt/pms/scripts/backup_restore.py --backup --full >> /var/log/pms_backup.log 2>&1
```

### 5.2 Standalone CLI Utility Commands

| Action | Command | Description |
|---|---|---|
| **Create DB Snapshot** | `python scripts/backup_restore.py --backup` | Creates atomic SHA-256 verified database snapshot |
| **Create Full System Archive**| `python scripts/backup_restore.py --backup --full` | Archives DB and all stored clinical documents |
| **List Available Backups** | `python scripts/backup_restore.py --list` | Displays snapshots, sizes, timestamps, and checksums |
| **Restore from Snapshot** | `python scripts/backup_restore.py --restore <SNAPSHOT_NAME>` | Validates checksum, rolls back safely if integrity fails |

### 5.3 Disaster Recovery Procedure (Acceptance Scenario 17)

When recovering from data corruption or server failure:

1. **Verify Snapshot Integrity**:
   ```bash
   python scripts/backup_restore.py --list
   ```
2. **Execute Safe Restoration**:
   ```bash
   python scripts/backup_restore.py --restore pms_backup_20261121_230000.db
   ```
   *The restore engine automatically creates a temporary safety pre-restore rollback copy before altering active data.*
3. **Verify Integrity Checksum**:
   If the SHA-256 hash does not match the registered ledger, the restore aborts immediately, preventing corrupted state writes.
4. **Restart Backend Service**:
   ```bash
   docker compose -f docker-compose.prod.yml restart backend
   ```
5. **Post-Restore Health Check**:
   ```bash
   curl -s http://127.0.0.1:8000/api/v1/health | jq .
   ```

---

## 6. Security Hardening Checklist

- [x] **Strict Transport Security (HSTS)**: 2-year duration with subdomains and preloading enabled.
- [x] **X-Content-Type-Options: nosniff**: Prevents MIME-confusion attacks.
- [x] **X-Frame-Options: DENY**: Protects against clickjacking across all clinical screens.
- [x] **File Sanitization**: All uploaded clinical files are renamed with secure UUID prefixes; path traversal sequences (`../`, `..\`) are stripped.
- [x] **MIME Whitelist**: Executable extensions (`.exe`, `.sh`, `.bat`, `.js`, `.py`, `.dll`) are strictly blocked with `HTTP 400 Bad Request`.
- [x] **Upload Size Limit**: 10MB strict limit per upload enforced both at NGINX and FastAPI middleware layers.
- [x] **Branch Isolation**: SQL queries enforce `organization_id` and `branch_id` scoping at the ORM layer.
- [x] **Tamper-Evident Backups**: SHA-256 checksums stored and validated prior to restoration.

---

## 7. Operational Health Monitoring

The system exposes unauthenticated and authenticated monitoring endpoints:

- `GET /api/v1/health`: Checks overall system uptime and process status.
- `GET /api/v1/health/db`: Executes a ping query against PostgreSQL / SQLite connection pool.
- `GET /api/v1/backups`: Provides snapshots status, sizes, and disk usage (requires admin privileges).
