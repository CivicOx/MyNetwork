from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class UserProfile(Base):
    """Single-row table representing the app owner — always ID=1."""
    __tablename__ = "user_profile"

    id = Column(Integer, primary_key=True, default=1)
    name = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    linkedin_url = Column(String(500))
    company = Column(String(255))
    title = Column(String(255))
    location = Column(String(255))
    bio = Column(Text)
    skills = Column(Text)             # comma-separated
    # education: [{"school": str, "degree": str, "field": str, "graduation_year": str}]
    education = Column(JSON, default=list)
    # work history: [{"company": str, "title": str, "start": str, "end": str, "description": str}]
    work_history = Column(JSON, default=list)
    resume_text = Column(Text)        # pasted or extracted resume content
    photo_path = Column(String(500))
    node_x = Column(Integer, default=0)
    node_y = Column(Integer, default=0)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))


class EdgeType(Base):
    __tablename__ = "edge_types"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    color = Column(String(7), nullable=False, default="#94a3b8")  # hex color
    is_default = Column(Boolean, default=False)

    connections = relationship("Connection", back_populates="edge_type")


class Person(Base):
    __tablename__ = "people"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(50))
    linkedin_url = Column(String(500))
    company = Column(String(255))
    title = Column(String(255))
    location = Column(String(255))
    photo_url = Column(String(500))       # external URL from search
    photo_path = Column(String(500))      # local uploaded file path
    ai_bio = Column(Text)                 # AI-generated summary
    notes = Column(Text)                  # user-written notes
    # position in the node graph (persisted so layout is remembered)
    node_x = Column(Integer, default=0)
    node_y = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    connections_from = relationship("Connection", foreign_keys="Connection.person_a_id",
                                    back_populates="person_a", cascade="all, delete-orphan")
    connections_to = relationship("Connection", foreign_keys="Connection.person_b_id",
                                  back_populates="person_b", cascade="all, delete-orphan")


class Annotation(Base):
    """Freeform canvas annotations: text boxes and lines."""
    __tablename__ = "annotations"

    id = Column(Integer, primary_key=True)
    kind = Column(String(20), nullable=False)   # 'text' | 'hline' | 'vline'
    label = Column(String(255), default="")
    color = Column(String(7), default="#334155")
    x = Column(Integer, default=100)
    y = Column(Integer, default=100)
    width = Column(Integer, default=200)
    height = Column(Integer, default=80)
    x2 = Column(Integer, nullable=True)   # line endpoint (line kind only)
    y2 = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class OutreachTarget(Base):
    """AI-suggested or manually added people to reach out to."""
    __tablename__ = "outreach_targets"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    title = Column(String(255))
    company = Column(String(255))
    reason = Column(Text)               # why the AI suggested them
    notes = Column(Text)                # user's own notes
    status = Column(String(50), default="pending")  # pending | contacted | connected | archived
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Connection(Base):
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True)
    person_a_id = Column(Integer, ForeignKey("people.id"), nullable=False)
    person_b_id = Column(Integer, ForeignKey("people.id"), nullable=False)
    edge_type_id = Column(Integer, ForeignKey("edge_types.id"), nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    person_a = relationship("Person", foreign_keys=[person_a_id], back_populates="connections_from")
    person_b = relationship("Person", foreign_keys=[person_b_id], back_populates="connections_to")
    edge_type = relationship("EdgeType", back_populates="connections")
