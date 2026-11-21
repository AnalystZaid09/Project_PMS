#!/usr/bin/env python3
"""
Apex Health Diagnostics — Database Backup & Disaster Recovery CLI Utility
Usage:
  python scripts/backup_restore.py --backup [--type full_system_archive] [--notes "Nightly backup"]
  python scripts/backup_restore.py --list
  python scripts/backup_restore.py --restore <BACKUP_ID>
"""
import argparse
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.db.session import SessionLocal
from app.models.organization import Organization
from app.models.schema_all import BackupRecord
from app.core.backup import create_backup, restore_backup


def main():
    parser = argparse.ArgumentParser(description="Apex Health PMS Backup & Recovery Utility")
    parser.add_argument("--backup", action="store_true", help="Create a new backup snapshot")
    parser.add_argument("--type", default="database_dump", choices=["database_dump", "full_system_archive"], help="Backup type")
    parser.add_argument("--notes", default="Automated scheduled snapshot", help="Optional backup notes")
    parser.add_argument("--list", action="store_true", help="List all recorded backup snapshots")
    parser.add_argument("--restore", metavar="BACKUP_ID", help="Restore database from specified BACKUP_ID")

    args = parser.parse_args()

    db = SessionLocal()
    try:
        org = db.query(Organization).filter(Organization.code == "APEX").first()
        if not org:
            print("ERROR: Default organization 'APEX' not found. Please ensure database is seeded.")
            sys.exit(1)

        if args.backup:
            print(f"[*] Initiating {args.type} for organization '{org.name}' ({org.code})...")
            record = create_backup(
                db=db,
                organization_id=org.id,
                backup_type=args.type,
                notes=args.notes,
            )
            print(f"[+] Backup successfully generated:")
            print(f"    - ID:       {record.id}")
            print(f"    - File:     {record.filename}")
            print(f"    - Size:     {record.file_size_human}")
            print(f"    - Checksum: {record.checksum_sha256}")
            print(f"    - Path:     {record.file_path}")

        elif args.list:
            backups = db.query(BackupRecord).filter(
                BackupRecord.organization_id == org.id
            ).order_by(BackupRecord.created_at.desc()).all()

            print(f"\nRecorded Backup Snapshots for '{org.name}' ({len(backups)} total):")
            print("-" * 90)
            print(f"{'ID':<38} {'TYPE':<20} {'SIZE':<10} {'DATE & TIME':<22}")
            print("-" * 90)
            for b in backups:
                dt_str = b.created_at.strftime("%Y-%m-%d %H:%M:%S") if b.created_at else "N/A"
                print(f"{b.id:<38} {b.backup_type:<20} {b.file_size_human:<10} {dt_str:<22}")
            print("-" * 90)

        elif args.restore:
            backup_id = args.restore
            print(f"[!] WARNING: You are about to restore database from snapshot: {backup_id}")
            print("[*] Validating snapshot integrity and executing restore...")
            result = restore_backup(db=db, backup_id=backup_id, organization_id=org.id)
            print(f"[+] Success: {result['message']}")
            print(f"    Restored at: {result['restored_at']}")

        else:
            parser.print_help()

    except Exception as e:
        print(f"[-] Execution failed: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
