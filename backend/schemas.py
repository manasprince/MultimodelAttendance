from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime

# Auth Schemas
class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str
    full_name: str
    role: str

class LoginRequest(BaseModel):
    username: str
    password: str

# User Schemas
class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: Optional[str] = "teacher"

class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    is_active: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

# ClassRoom Schemas
class ClassRoomCreate(BaseModel):
    name: str
    code: str
    subject: Optional[str] = "General"
    description: Optional[str] = None

class ClassRoomOut(BaseModel):
    id: int
    name: str
    code: str
    subject: Optional[str]
    description: Optional[str]
    student_count: Optional[int] = 0
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

# Student Schemas
class StudentCreate(BaseModel):
    student_id: str
    full_name: str
    email: Optional[str] = None
    class_id: int
    status: Optional[str] = "active"
    consent_given: Optional[bool] = True
    face_encoding: Optional[str] = None

class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    class_id: Optional[int] = None
    status: Optional[str] = None
    consent_given: Optional[bool] = None
    face_encoding: Optional[str] = None

class StudentOut(BaseModel):
    id: int
    student_id: str
    full_name: str
    email: Optional[str]
    class_id: int
    class_name: Optional[str] = None
    status: str
    consent_given: bool
    has_face_profile: Optional[bool] = False
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

# Session Schemas
class SessionCreate(BaseModel):
    class_id: int
    title: str
    min_confidence_threshold: Optional[float] = 0.60
    min_presence_seconds: Optional[int] = 15
    auto_confirm: Optional[bool] = False

class SessionOut(BaseModel):
    id: int
    class_id: int
    class_name: Optional[str] = None
    class_code: Optional[str] = None
    title: str
    status: str
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    min_confidence_threshold: float
    min_presence_seconds: int
    auto_confirm: bool
    attendance_rate: Optional[float] = 0.0
    total_enrolled: Optional[int] = 0
    total_present: Optional[int] = 0
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

# Attendance Record Schemas
class AttendanceRecordOut(BaseModel):
    id: int
    session_id: int
    student_id: int
    student_name: Optional[str] = None
    student_code: Optional[str] = None
    first_detected_at: Optional[datetime]
    last_detected_at: Optional[datetime]
    total_presence_seconds: float
    detection_count: int
    confidence_score: float
    status: str
    is_confirmed: bool
    confirmed_by: Optional[str]
    confirmed_at: Optional[datetime]
    manual_review_note: Optional[str]

    class Config:
        from_attributes = True

class AttendanceUpdateStatus(BaseModel):
    status: str # 'present', 'absent', 'late', 'pending_review'
    is_confirmed: bool = True
    manual_review_note: Optional[str] = None

# Frame Processing & Telemetry
class FrameProcessRequest(BaseModel):
    session_id: int
    image_base64: str
    audio_energy: Optional[float] = 0.0
    audio_active: Optional[bool] = False
    blur_privacy: Optional[bool] = False

class DetectedPerson(BaseModel):
    box: List[int] # [x, y, w, h]
    confidence: float
    is_attentive: bool
    orientation: str # 'frontal', 'looking_away', 'looking_down'
    matched_student_id: Optional[int] = None
    matched_student_name: Optional[str] = None

class FrameProcessResponse(BaseModel):
    success: bool
    detected_count: int
    attentive_count: int
    distracted_count: int
    average_attention: float
    persons: List[DetectedPerson]
    teaching_suggestion: Optional[str] = None
    suggestion_rule_id: Optional[str] = None
    cv_engine_mode: str
    processed_image_base64: Optional[str] = None

# Audio Telemetry
class AudioTelemetryRequest(BaseModel):
    session_id: int
    energy_level: float # 0.0 - 1.0
    speech_active: bool
    peak_volume: Optional[float] = 0.0

# Settings
class SystemSettingItem(BaseModel):
    key: str
    value: str
    description: Optional[str]

# Dashboard Stats
class DashboardStats(BaseModel):
    total_students: int
    total_classes: int
    total_sessions: int
    active_sessions_count: int
    overall_attendance_rate: float
    pending_reviews_count: int
    average_engagement_score: float
    cv_status: str
    audio_status: str

