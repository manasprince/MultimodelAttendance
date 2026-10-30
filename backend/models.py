from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from .database import Base

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    full_name = Column(String(128), nullable=False)
    role = Column(String(32), default="teacher", nullable=False) # 'teacher', 'admin', 'auditor'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)

class ClassRoom(Base):
    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    code = Column(String(32), unique=True, index=True, nullable=False) # e.g. CS101-A
    subject = Column(String(128), default="General")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    students = relationship("Student", back_populates="classroom", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="classroom", cascade="all, delete-orphan")

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(64), unique=True, index=True, nullable=False) # Roll number e.g. STU-001
    full_name = Column(String(128), nullable=False)
    email = Column(String(128), nullable=True)
    class_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    status = Column(String(32), default="active") # 'active', 'inactive'
    # Stored face reference encoding (JSON array or signature) for identification
    face_encoding = Column(Text, nullable=True)
    photo_path = Column(String(256), nullable=True)
    consent_given = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)

    classroom = relationship("ClassRoom", back_populates="students")
    attendance_records = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    title = Column(String(128), nullable=False)
    status = Column(String(32), default="scheduled") # 'scheduled', 'active', 'ended'
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    
    # Configurable detection thresholds for this session
    min_confidence_threshold = Column(Float, default=0.60) # 0.0 - 1.0
    min_presence_seconds = Column(Integer, default=15) # seconds needed to qualify as 'present'
    auto_confirm = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=utcnow)

    classroom = relationship("ClassRoom", back_populates="sessions")
    attendance_records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")
    engagement_logs = relationship("EngagementLog", back_populates="session", cascade="all, delete-orphan")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    
    # Tracking fields
    first_detected_at = Column(DateTime, nullable=True)
    last_detected_at = Column(DateTime, nullable=True)
    total_presence_seconds = Column(Float, default=0.0)
    detection_count = Column(Integer, default=0)
    confidence_score = Column(Float, default=0.0) # 0.0 - 1.0
    
    # Status: 'present', 'absent', 'late', 'pending_review'
    status = Column(String(32), default="pending_review", nullable=False)
    
    # Human Review & Auditing
    is_confirmed = Column(Boolean, default=False)
    confirmed_by = Column(String(64), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    manual_review_note = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    session = relationship("Session", back_populates="attendance_records")
    student = relationship("Student", back_populates="attendance_records")

    # Prevent duplicate records for the same student in the same session
    __table_args__ = (
        UniqueConstraint('session_id', 'student_id', name='uq_session_student'),
    )

class EngagementLog(Base):
    __tablename__ = "engagement_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    timestamp = Column(DateTime, default=utcnow)
    
    detected_persons_count = Column(Integer, default=0)
    attentive_count = Column(Integer, default=0)
    distracted_count = Column(Integer, default=0)
    avg_attention_score = Column(Float, default=0.0) # 0.0 - 100.0%
    
    audio_energy_level = Column(Float, default=0.0) # 0.0 - 1.0 RMS / relative volume
    audio_activity_detected = Column(Boolean, default=False)
    
    teaching_suggestion = Column(Text, nullable=True)
    suggestion_rule_id = Column(String(64), nullable=True)
    notes = Column(Text, nullable=True)

    session = relationship("Session", back_populates="engagement_logs")

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(64), primary_key=True)
    value = Column(Text, nullable=False)
    description = Column(String(256), nullable=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

