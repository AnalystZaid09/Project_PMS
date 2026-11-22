"""
Seed Demo Data Utility — Apex Health Diagnostics PMS
Seeds synthetic demo doctors, investigations, patients, cases, and reports for testing/evaluation.
"""

import os
import sys

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.db.session import SessionLocal
from app.db.seed import seed_database

if __name__ == "__main__":
    print("Seeding synthetic demo data into Apex Health PMS...")
    db = SessionLocal()
    try:
        seed_database(db, include_demo_data=True)
        print("✔ Synthetic demo data seeded successfully!")
    finally:
        db.close()
