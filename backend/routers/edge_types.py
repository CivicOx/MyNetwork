from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import EdgeType
from schemas import EdgeTypeCreate, EdgeTypeOut

router = APIRouter(prefix="/edge-types", tags=["edge-types"])


@router.get("/", response_model=list[EdgeTypeOut])
def list_edge_types(db: Session = Depends(get_db)):
    return db.query(EdgeType).order_by(EdgeType.name).all()


@router.post("/", response_model=EdgeTypeOut)
def create_edge_type(data: EdgeTypeCreate, db: Session = Depends(get_db)):
    existing = db.query(EdgeType).filter(EdgeType.name == data.name).first()
    if existing:
        raise HTTPException(400, f"Edge type '{data.name}' already exists")
    et = EdgeType(**data.model_dump())
    db.add(et)
    db.commit()
    db.refresh(et)
    return et


@router.patch("/{edge_type_id}", response_model=EdgeTypeOut)
def update_edge_type(edge_type_id: int, data: EdgeTypeCreate, db: Session = Depends(get_db)):
    et = db.get(EdgeType, edge_type_id)
    if not et:
        raise HTTPException(404, "Edge type not found")
    if et.is_default:
        raise HTTPException(400, "Cannot modify the default edge type")
    et.name = data.name
    et.color = data.color
    db.commit()
    db.refresh(et)
    return et


@router.delete("/{edge_type_id}")
def delete_edge_type(edge_type_id: int, db: Session = Depends(get_db)):
    et = db.get(EdgeType, edge_type_id)
    if not et:
        raise HTTPException(404, "Edge type not found")
    if et.is_default:
        raise HTTPException(400, "Cannot delete the default edge type")
    db.delete(et)
    db.commit()
    return {"ok": True}
