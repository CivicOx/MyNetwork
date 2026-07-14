from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import Connection, Person, EdgeType
from schemas import ConnectionCreate, ConnectionOut

router = APIRouter(prefix="/connections", tags=["connections"])


class ConnectionUpdate(BaseModel):
    edge_type_id: Optional[int] = None
    notes: Optional[str] = None


def _serialize(conn: Connection, user_name: str) -> dict:
    out = ConnectionOut.model_validate(conn).model_dump()
    if conn.person_a_id == 0:
        out["person_a"] = {"id": 0, "name": user_name}
    if conn.person_b_id == 0:
        out["person_b"] = {"id": 0, "name": user_name}
    return out


@router.get("/")
def list_connections(db: Session = Depends(get_db)):
    from models import UserProfile
    user = db.get(UserProfile, 1)
    user_name = (user.name or "You") if user else "You"
    conns = db.query(Connection).all()
    return [_serialize(c, user_name) for c in conns]


@router.post("/", response_model=ConnectionOut)
def create_connection(data: ConnectionCreate, db: Session = Depends(get_db)):
    # person_id 0 is the sentinel for "the user" — skip person lookup
    if data.person_a_id != 0 and not db.get(Person, data.person_a_id):
        raise HTTPException(404, "person_a not found")
    if data.person_b_id != 0 and not db.get(Person, data.person_b_id):
        raise HTTPException(404, "person_b not found")
    if not db.get(EdgeType, data.edge_type_id):
        raise HTTPException(404, "Edge type not found")

    conn = Connection(**data.model_dump())
    db.add(conn)
    db.commit()
    db.refresh(conn)
    from models import UserProfile
    user = db.get(UserProfile, 1)
    return _serialize(conn, (user.name or "You") if user else "You")


@router.patch("/{connection_id}", response_model=ConnectionOut)
def update_connection(connection_id: int, data: ConnectionUpdate, db: Session = Depends(get_db)):
    conn = db.get(Connection, connection_id)
    if not conn:
        raise HTTPException(404, "Connection not found")
    if data.edge_type_id is not None:
        if not db.get(EdgeType, data.edge_type_id):
            raise HTTPException(404, "Edge type not found")
        conn.edge_type_id = data.edge_type_id
    if data.notes is not None:
        conn.notes = data.notes
    db.commit()
    db.refresh(conn)
    from models import UserProfile
    user = db.get(UserProfile, 1)
    return _serialize(conn, (user.name or "You") if user else "You")


@router.delete("/{connection_id}")
def delete_connection(connection_id: int, db: Session = Depends(get_db)):
    conn = db.get(Connection, connection_id)
    if not conn:
        raise HTTPException(404, "Connection not found")
    db.delete(conn)
    db.commit()
    return {"ok": True}
