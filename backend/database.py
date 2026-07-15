import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Railway provides DATABASE_URL automatically when a PostgreSQL service is attached.
# Falls back to a local SQLite file for development.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mynetwork.db")

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
