from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class EdgeTypeCreate(BaseModel):
    name: str
    color: str = "#94a3b8"


class EdgeTypeOut(BaseModel):
    id: int
    name: str
    color: str
    is_default: bool

    model_config = {"from_attributes": True}


class PersonCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None
    photo_url: Optional[str] = None
    ai_bio: Optional[str] = None
    notes: Optional[str] = None
    node_x: Optional[int] = 0
    node_y: Optional[int] = 0


class PersonUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None
    photo_url: Optional[str] = None
    ai_bio: Optional[str] = None
    notes: Optional[str] = None
    node_x: Optional[int] = None
    node_y: Optional[int] = None


class PersonOut(BaseModel):
    id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    linkedin_url: Optional[str]
    company: Optional[str]
    title: Optional[str]
    location: Optional[str]
    photo_url: Optional[str]
    photo_path: Optional[str]
    ai_bio: Optional[str]
    notes: Optional[str]
    node_x: int
    node_y: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConnectionCreate(BaseModel):
    person_a_id: int
    person_b_id: int
    edge_type_id: int
    notes: Optional[str] = None


class PersonName(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


class ConnectionOut(BaseModel):
    id: int
    person_a_id: int
    person_b_id: int
    person_a: Optional[PersonName] = None
    person_b: Optional[PersonName] = None
    edge_type: EdgeTypeOut
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class EnrichRequest(BaseModel):
    name: str
    hints: Optional[str] = None  # e.g. "works at Google, based in NYC"


class EnrichResult(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None
    photo_url: Optional[str] = None
    ai_bio: Optional[str] = None
    confidence: str = "low"  # low | medium | high
    sources: list[str] = []
