from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import OutreachTarget

router = APIRouter(prefix="/outreach", tags=["outreach"])


class OutreachCreate(BaseModel):
    name: str
    title: Optional[str] = None
    company: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None


class OutreachUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class OutreachOut(BaseModel):
    id: int
    name: str
    title: Optional[str]
    company: Optional[str]
    reason: Optional[str]
    notes: Optional[str]
    status: str
    created_at: str

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_custom(cls, obj: OutreachTarget):
        return cls(
            id=obj.id,
            name=obj.name,
            title=obj.title,
            company=obj.company,
            reason=obj.reason,
            notes=obj.notes,
            status=obj.status,
            created_at=obj.created_at.isoformat(),
        )


@router.get("/")
def list_outreach(db: Session = Depends(get_db)):
    targets = db.query(OutreachTarget).order_by(OutreachTarget.created_at.desc()).all()
    return [OutreachOut.from_orm_custom(t) for t in targets]


@router.post("/")
def add_outreach(data: OutreachCreate, db: Session = Depends(get_db)):
    target = OutreachTarget(**data.model_dump())
    db.add(target)
    db.commit()
    db.refresh(target)
    return OutreachOut.from_orm_custom(target)


@router.patch("/{target_id}")
def update_outreach(target_id: int, data: OutreachUpdate, db: Session = Depends(get_db)):
    target = db.get(OutreachTarget, target_id)
    if not target:
        raise HTTPException(404, "Outreach target not found")
    if data.status is not None:
        target.status = data.status
    if data.notes is not None:
        target.notes = data.notes
    db.commit()
    db.refresh(target)
    return OutreachOut.from_orm_custom(target)


@router.delete("/{target_id}")
def delete_outreach(target_id: int, db: Session = Depends(get_db)):
    target = db.get(OutreachTarget, target_id)
    if not target:
        raise HTTPException(404, "Outreach target not found")
    db.delete(target)
    db.commit()
    return {"ok": True}
