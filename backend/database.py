import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mynetwork.db")

# Warn loudly in logs if running without PostgreSQL in a non-local environment.
# On Railway/Render/Heroku, DATABASE_URL must be set or data will be lost on restart.
if not DATABASE_URL.startswith("sqlite") and DATABASE_URL.startswith("postgres://"):
    # SQLAlchemy requires postgresql:// not postgres://
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    print("WARNING: Using SQLite — data will be lost on server restart. "
          "Set DATABASE_URL to a PostgreSQL URL for persistent storage.", file=sys.stderr)

# SQLite needs check_same_thread=False; PostgreSQL does not accept that arg
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
