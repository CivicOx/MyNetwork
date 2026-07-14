import os
import uuid
import httpx
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models import Person
from schemas import PersonCreate, PersonUpdate, PersonOut

router = APIRouter(prefix="/people", tags=["people"])

UPLOAD_DIR = Path("uploads/photos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Mimic a browser so LinkedIn/Google don't block the request
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
}


def _download_photo(url: str) -> Path | None:
    """Download a photo from a URL and save locally. Returns the path or None on failure."""
    try:
        with httpx.Client(follow_redirects=True, timeout=8, headers=_HEADERS) as client:
            r = client.get(url)
            if r.status_code != 200:
                return None
            content_type = r.headers.get("content-type", "")
            if "image" not in content_type:
                return None
            ext = ".jpg"
            if "png" in content_type:
                ext = ".png"
            elif "webp" in content_type:
                ext = ".webp"
            dest = UPLOAD_DIR / f"{uuid.uuid4()}{ext}"
            dest.write_bytes(r.content)
            return dest
    except Exception:
        return None


@router.get("/", response_model=list[PersonOut])
def list_people(db: Session = Depends(get_db)):
    return db.query(Person).order_by(Person.name).all()


@router.post("/", response_model=PersonOut)
def create_person(data: PersonCreate, db: Session = Depends(get_db)):
    person = Person(**data.model_dump())
    db.add(person)
    db.commit()
    db.refresh(person)

    # try to download photo_url at creation time so it's stored locally
    if person.photo_url:
        path = _download_photo(person.photo_url)
        if path:
            person.photo_path = str(path)
            db.commit()
            db.refresh(person)

    return person


@router.get("/{person_id}", response_model=PersonOut)
def get_person(person_id: int, db: Session = Depends(get_db)):
    person = db.get(Person, person_id)
    if not person:
        raise HTTPException(404, "Person not found")
    return person


@router.patch("/{person_id}", response_model=PersonOut)
def update_person(person_id: int, data: PersonUpdate, db: Session = Depends(get_db)):
    person = db.get(Person, person_id)
    if not person:
        raise HTTPException(404, "Person not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(person, field, value)
    db.commit()
    db.refresh(person)
    return person


@router.delete("/{person_id}")
def delete_person(person_id: int, db: Session = Depends(get_db)):
    person = db.get(Person, person_id)
    if not person:
        raise HTTPException(404, "Person not found")
    db.delete(person)
    db.commit()
    return {"ok": True}


@router.post("/{person_id}/photo", response_model=PersonOut)
async def upload_photo(person_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    person = db.get(Person, person_id)
    if not person:
        raise HTTPException(404, "Person not found")

    ext = Path(file.filename).suffix.lower() if file.filename else ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    dest = UPLOAD_DIR / filename

    contents = await file.read()
    dest.write_bytes(contents)

    if person.photo_path:
        old = Path(person.photo_path)
        if old.exists():
            old.unlink()

    person.photo_path = str(dest)
    db.commit()
    db.refresh(person)
    return person
