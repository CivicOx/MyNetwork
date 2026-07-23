from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from database import engine, Base
from models import EdgeType
from database import SessionLocal
from routers import people, connections, edge_types, ai, profile, annotations, outreach

Base.metadata.create_all(bind=engine)

# seed default edge types on first run
def seed_defaults():
    db = SessionLocal()
    try:
        if db.query(EdgeType).count() == 0:
            defaults = [
                EdgeType(name="Generic", color="#94a3b8", is_default=True),
                EdgeType(name="Friend", color="#22c55e", is_default=False),
                EdgeType(name="Professional", color="#3b82f6", is_default=False),
                EdgeType(name="Mentor", color="#a855f7", is_default=False),
                EdgeType(name="Colleague", color="#f59e0b", is_default=False),
            ]
            db.add_all(defaults)
            db.commit()
    finally:
        db.close()

seed_defaults()

def migrate():
    """Add columns that may be missing from older databases."""
    from sqlalchemy import text
    with engine.connect() as conn:
        for col, definition in [("x2", "INTEGER"), ("y2", "INTEGER")]:
            try:
                conn.execute(text(f"ALTER TABLE annotations ADD COLUMN {col} {definition}"))
                conn.commit()
            except Exception:
                pass  # column already exists

migrate()

app = FastAPI(title="MyNetwork API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# serve uploaded photos
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(people.router)
app.include_router(connections.router)
app.include_router(edge_types.router)
app.include_router(ai.router)
app.include_router(profile.router)
app.include_router(annotations.router)
app.include_router(outreach.router)


@app.get("/health")
def health():
    from database import DATABASE_URL
    db_type = "postgresql" if DATABASE_URL.startswith("postgresql") else "sqlite"
    return {"status": "ok", "db": db_type, "url": DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL}
