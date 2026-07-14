import uuid
import io
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import UserProfile

router = APIRouter(prefix="/profile", tags=["profile"])

UPLOAD_DIR = Path("uploads/photos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class EducationEntry(BaseModel):
    school: str
    degree: Optional[str] = ""
    field: Optional[str] = ""
    graduation_year: Optional[str] = ""


class WorkEntry(BaseModel):
    company: str
    title: Optional[str] = ""
    start: Optional[str] = ""
    end: Optional[str] = ""
    description: Optional[str] = ""


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[str] = None
    education: Optional[list[EducationEntry]] = None
    work_history: Optional[list[WorkEntry]] = None
    resume_text: Optional[str] = None
    node_x: Optional[int] = None
    node_y: Optional[int] = None


class ProfileOut(BaseModel):
    id: int
    name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    linkedin_url: Optional[str]
    company: Optional[str]
    title: Optional[str]
    location: Optional[str]
    bio: Optional[str]
    skills: Optional[str]
    education: list
    work_history: list
    resume_text: Optional[str]
    photo_path: Optional[str]
    node_x: int
    node_y: int

    model_config = {"from_attributes": True}


def _get_or_create(db: Session) -> UserProfile:
    profile = db.get(UserProfile, 1)
    if not profile:
        profile = UserProfile(id=1, education=[], work_history=[])
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("/", response_model=ProfileOut)
def get_profile(db: Session = Depends(get_db)):
    return _get_or_create(db)


@router.patch("/", response_model=ProfileOut)
def update_profile(data: ProfileUpdate, db: Session = Depends(get_db)):
    profile = _get_or_create(db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/photo", response_model=ProfileOut)
async def upload_photo(file: UploadFile = File(...), db: Session = Depends(get_db)):
    profile = _get_or_create(db)
    ext = Path(file.filename).suffix.lower() if file.filename else ".jpg"
    filename = f"profile_{uuid.uuid4()}{ext}"
    dest = UPLOAD_DIR / filename
    dest.write_bytes(await file.read())

    if profile.photo_path:
        old = Path(profile.photo_path)
        if old.exists():
            old.unlink()

    profile.photo_path = str(dest)
    db.commit()
    db.refresh(profile)
    return profile


def _extract_text(content: bytes, suffix: str) -> str:
    if suffix == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    elif suffix in (".docx",):
        from docx import Document
        doc = Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)
    elif suffix == ".doc":
        raise HTTPException(400, ".doc format is not supported — please save as .docx or .pdf")
    else:
        raise HTTPException(400, f"Unsupported file type: {suffix}")


@router.post("/resume", response_model=ProfileOut)
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    suffix = Path(file.filename).suffix.lower() if file.filename else ""
    if suffix not in (".pdf", ".docx"):
        raise HTTPException(400, "Only .pdf and .docx files are supported")

    content = await file.read()
    try:
        text = _extract_text(content, suffix)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(422, f"Could not read file: {e}")

    text = text.strip()
    if not text:
        raise HTTPException(422, "No text could be extracted from this file")

    profile = _get_or_create(db)
    profile.resume_text = text
    db.commit()
    db.refresh(profile)
    return profile
