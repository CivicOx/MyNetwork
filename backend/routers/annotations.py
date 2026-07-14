from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import Annotation

router = APIRouter(prefix="/annotations", tags=["annotations"])


class AnnotationCreate(BaseModel):
    kind: Literal["text", "hline", "vline", "line"]
    label: Optional[str] = ""
    color: Optional[str] = "#334155"
    x: Optional[int] = 100
    y: Optional[int] = 100
    width: Optional[int] = 200
    height: Optional[int] = 80
    x2: Optional[int] = None
    y2: Optional[int] = None


class AnnotationUpdate(BaseModel):
    label: Optional[str] = None
    color: Optional[str] = None
    x: Optional[int] = None
    y: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    x2: Optional[int] = None
    y2: Optional[int] = None


class AnnotationOut(BaseModel):
    id: int
    kind: str
    label: Optional[str]
    color: Optional[str]
    x: int
    y: int
    width: int
    height: int
    x2: Optional[int] = None
    y2: Optional[int] = None

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[AnnotationOut])
def list_annotations(db: Session = Depends(get_db)):
    return db.query(Annotation).all()


@router.post("/", response_model=AnnotationOut)
def create_annotation(data: AnnotationCreate, db: Session = Depends(get_db)):
    ann = Annotation(**data.model_dump())
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return ann


@router.patch("/{annotation_id}", response_model=AnnotationOut)
def update_annotation(annotation_id: int, data: AnnotationUpdate, db: Session = Depends(get_db)):
    ann = db.get(Annotation, annotation_id)
    if not ann:
        raise HTTPException(404, "Annotation not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(ann, field, value)
    db.commit()
    db.refresh(ann)
    return ann


@router.delete("/{annotation_id}")
def delete_annotation(annotation_id: int, db: Session = Depends(get_db)):
    ann = db.get(Annotation, annotation_id)
    if not ann:
        raise HTTPException(404, "Annotation not found")
    db.delete(ann)
    db.commit()
    return {"ok": True}
