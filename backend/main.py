import os
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import io

from .database import engine, Base, get_db
from .models import User, ClassRoom, Student, Session as ClassSession, AttendanceRecord, EngagementLog, SystemSetting
from .auth import hash_password, verify_password, create_access_token, get_current_user
from .schemas import (
    LoginRequest, TokenResponse, UserOut,
    ClassRoomCreate, ClassRoomOut,
    StudentCreate, StudentUpdate, StudentOut,
    SessionCreate, SessionOut,
    AttendanceRecordOut, AttendanceUpdateStatus,
    FrameProcessRequest, FrameProcessResponse, DetectedPerson,
    AudioTelemetryRequest,
    SystemSettingItem, DashboardStats
)
from .cv_engine import cv_engine
from .audio_engine import audio_engine
from .suggestion_engine import suggestion_engine
from .export_csv import generate_session_attendance_csv

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MANAS - Multimodal Attendance & Engagement Agent",
    version="1.0.0",
    description="Intelligent multimodal classroom attendance and explainable engagement analytics engine."
)

# Enable CORS for local Vite development & production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def utcnow():
    return datetime.now(timezone.utc)

@app.on_event("startup")
def startup_seed_database():
    """Seed initial settings, default teacher account, and sample classroom data."""
    from .database import SessionLocal
    db = SessionLocal()
    try:
        # 1. Seed Settings
        defaults = [
            ("privacy_blur_faces", "false", "Blur face regions in live monitor and stored logs for privacy"),
            ("data_retention_days", "90", "Retention period in days for engagement telemetry"),
            ("default_confidence_threshold", "0.60", "Default confidence threshold for automated attendance"),
            ("default_presence_seconds", "15", "Minimum detected presence in seconds to qualify as present"),
            ("audio_monitoring_enabled", "true", "Enable audio energy and speech pacing telemetry")
        ]
        for key, val, desc in defaults:
            if not db.query(SystemSetting).filter(SystemSetting.key == key).first():
                db.add(SystemSetting(key=key, value=val, description=desc))

        # 2. Seed Default User (Teacher)
        admin_user = db.query(User).filter(User.username == "teacher").first()
        if not admin_user:
            admin_user = User(
                username="teacher",
                hashed_password=hash_password("admin123"),
                full_name="Prof. Sarah Jenkins",
                role="teacher"
            )
            db.add(admin_user)
            db.commit()

        # 3. Seed Sample Class and Students if empty
        if db.query(ClassRoom).count() == 0:
            sample_class = ClassRoom(
                name="AI & Computer Vision 101",
                code="CS-401",
                subject="Computer Science",
                description="Undergraduate course on multimodal systems and intelligent agents."
            )
            db.add(sample_class)
            db.commit()
            db.refresh(sample_class)

            students_data = [
                ("STU-101", "Aarav Sharma", "aarav.sharma@example.edu"),
                ("STU-102", "Diya Patel", "diya.patel@example.edu"),
                ("STU-103", "Rohan Mehta", "rohan.mehta@example.edu"),
                ("STU-104", "Ananya Iyer", "ananya.iyer@example.edu"),
                ("STU-105", "Kabir Verma", "kabir.verma@example.edu"),
                ("STU-106", "Sneha Kapoor", "sneha.kapoor@example.edu"),
            ]
            for stu_id, name, email in students_data:
                stu = Student(
                    student_id=stu_id,
                    full_name=name,
                    email=email,
                    class_id=sample_class.id,
                    status="active",
                    consent_given=True
                )
                db.add(stu)
            db.commit()

            # Seed an archived past session with realistic history
            past_session = ClassSession(
                class_id=sample_class.id,
                title="Lecture 1: Introduction to Multimodal Agents",
                status="ended",
                start_time=datetime(2026, 10, 28, 9, 0),
                end_time=datetime(2026, 10, 28, 10, 0),
                min_confidence_threshold=0.60,
                min_presence_seconds=15,
                auto_confirm=True
            )
            db.add(past_session)
            db.commit()
            db.refresh(past_session)

            all_students = db.query(Student).filter(Student.class_id == sample_class.id).all()
            for idx, st in enumerate(all_students):
                status_val = "present" if idx < 5 else "absent"
                rec = AttendanceRecord(
                    session_id=past_session.id,
                    student_id=st.id,
                    first_detected_at=past_session.start_time if status_val == "present" else None,
                    last_detected_at=past_session.end_time if status_val == "present" else None,
                    total_presence_seconds=3200.0 if status_val == "present" else 0.0,
                    detection_count=145 if status_val == "present" else 0,
                    confidence_score=0.92 if status_val == "present" else 0.0,
                    status=status_val,
                    is_confirmed=True,
                    confirmed_by="teacher",
                    manual_review_note="Automated verified attendance" if status_val == "present" else "Absent (No detection)"
                )
                db.add(rec)
            db.commit()

            print("Database initialized and seeded successfully.")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

# ----------------- Auth Endpoints -----------------

@app.post("/api/auth/login", response_model=TokenResponse)
def login(creds: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == creds.username).first()
    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled")

    token = create_access_token({"sub": user.username, "role": user.role, "id": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role
    }

@app.get("/api/auth/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return user

# ----------------- Dashboard & System Stats -----------------

@app.get("/api/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_students = db.query(Student).filter(Student.status == "active").count()
    total_classes = db.query(ClassRoom).count()
    total_sessions = db.query(ClassSession).count()
    active_sessions_count = db.query(ClassSession).filter(ClassSession.status == "active").count()
    
    # Calculate overall attendance rate
    all_records = db.query(AttendanceRecord).all()
    if all_records:
        present_count = sum(1 for r in all_records if r.status in ["present", "late"])
        overall_attendance_rate = round((present_count / len(all_records)) * 100.0, 1)
    else:
        overall_attendance_rate = 0.0

    pending_reviews_count = db.query(AttendanceRecord).filter(
        AttendanceRecord.is_confirmed == False,
        AttendanceRecord.status == "pending_review"
    ).count()

    # Engagement average
    logs = db.query(EngagementLog).all()
    if logs:
        avg_engagement = round(sum(l.avg_attention_score for l in logs) / len(logs), 1)
    else:
        avg_engagement = 82.5 # initial baseline

    cv_stat = cv_engine.get_status()
    audio_stat = audio_engine.get_status()

    return {
        "total_students": total_students,
        "total_classes": total_classes,
        "total_sessions": total_sessions,
        "active_sessions_count": active_sessions_count,
        "overall_attendance_rate": overall_attendance_rate,
        "pending_reviews_count": pending_reviews_count,
        "average_engagement_score": avg_engagement,
        "cv_status": f"{cv_stat['status']} ({cv_stat['mode']})",
        "audio_status": f"{audio_stat['status']} ({audio_stat['mode']})"
    }

@app.get("/api/system/status")
def get_system_status():
    return {
        "cv_engine": cv_engine.get_status(),
        "audio_engine": audio_engine.get_status(),
        "timestamp": utcnow().isoformat()
    }

# ----------------- Classroom CRUD -----------------

@app.get("/api/classes", response_model=List[ClassRoomOut])
def list_classes(db: Session = Depends(get_db)):
    classes = db.query(ClassRoom).order_by(ClassRoom.created_at.desc()).all()
    results = []
    for c in classes:
        st_count = db.query(Student).filter(Student.class_id == c.id).count()
        results.append({
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "subject": c.subject,
            "description": c.description,
            "student_count": st_count,
            "created_at": c.created_at
        })
    return results

@app.post("/api/classes", response_model=ClassRoomOut)
def create_class(payload: ClassRoomCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    existing = db.query(ClassRoom).filter(ClassRoom.code == payload.code.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Class with code {payload.code} already exists.")
    c = ClassRoom(
        name=payload.name.strip(),
        code=payload.code.strip().upper(),
        subject=payload.subject or "General",
        description=payload.description
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return {
        "id": c.id,
        "name": c.name,
        "code": c.code,
        "subject": c.subject,
        "description": c.description,
        "student_count": 0,
        "created_at": c.created_at
    }

@app.delete("/api/classes/{class_id}")
def delete_class(class_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Class not found")
    db.delete(c)
    db.commit()
    return {"message": "Class and associated data deleted successfully"}

# ----------------- Student CRUD & Enrollment -----------------

@app.get("/api/students", response_model=List[StudentOut])
def list_students(class_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Student)
    if class_id:
        query = query.filter(Student.class_id == class_id)
    students = query.order_by(Student.student_id).all()
    results = []
    for s in students:
        c = db.query(ClassRoom).filter(ClassRoom.id == s.class_id).first()
        results.append({
            "id": s.id,
            "student_id": s.student_id,
            "full_name": s.full_name,
            "email": s.email,
            "class_id": s.class_id,
            "class_name": c.name if c else "Unknown",
            "status": s.status,
            "consent_given": s.consent_given,
            "has_face_profile": bool(s.face_encoding and len(s.face_encoding) > 10),
            "created_at": s.created_at
        })
    return results

@app.post("/api/students", response_model=StudentOut)
def create_student(payload: StudentCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    existing = db.query(Student).filter(Student.student_id == payload.student_id.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Student ID {payload.student_id} already exists.")
    c = db.query(ClassRoom).filter(ClassRoom.id == payload.class_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Selected Class not found")
    
    st = Student(
        student_id=payload.student_id.strip().upper(),
        full_name=payload.full_name.strip(),
        email=payload.email,
        class_id=payload.class_id,
        status=payload.status or "active",
        consent_given=payload.consent_given if payload.consent_given is not None else True,
        face_encoding=payload.face_encoding
    )
    db.add(st)
    db.commit()
    db.refresh(st)
    return {
        "id": st.id,
        "student_id": st.student_id,
        "full_name": st.full_name,
        "email": st.email,
        "class_id": st.class_id,
        "class_name": c.name,
        "status": st.status,
        "consent_given": st.consent_given,
        "has_face_profile": bool(st.face_encoding and len(st.face_encoding) > 10),
        "created_at": st.created_at
    }

@app.put("/api/students/{student_id}", response_model=StudentOut)
def update_student(student_id: int, payload: StudentUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    st = db.query(Student).filter(Student.id == student_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Student not found")
    if payload.full_name is not None:
        st.full_name = payload.full_name.strip()
    if payload.email is not None:
        st.email = payload.email
    if payload.class_id is not None:
        st.class_id = payload.class_id
    if payload.status is not None:
        st.status = payload.status
    if payload.consent_given is not None:
        st.consent_given = payload.consent_given
    if payload.face_encoding is not None:
        st.face_encoding = payload.face_encoding
    db.commit()
    db.refresh(st)
    c = db.query(ClassRoom).filter(ClassRoom.id == st.class_id).first()
    return {
        "id": st.id,
        "student_id": st.student_id,
        "full_name": st.full_name,
        "email": st.email,
        "class_id": st.class_id,
        "class_name": c.name if c else "Unknown",
        "status": st.status,
        "consent_given": st.consent_given,
        "has_face_profile": bool(st.face_encoding and len(st.face_encoding) > 10),
        "created_at": st.created_at
    }

@app.post("/api/students/{student_id}/register-face")
def register_student_face(
    student_id: int,
    image_base64: str = Form(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Register face profile snapshot for a student."""
    st = db.query(Student).filter(Student.id == student_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Student not found")

    img = cv_engine.decode_image(image_base64)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image data provided")

    detected_faces, _ = cv_engine.process_frame(img)
    if not detected_faces:
        # Fallback to center-crop signature if no face detected
        h, w, _ = img.shape
        crop = img[int(h*0.2):int(h*0.8), int(w*0.2):int(w*0.8)]
        sig = cv_engine.extract_face_signature(crop)
    else:
        sig = detected_faces[0].get("face_signature", "")
        if not sig:
            box = detected_faces[0]["box"]
            x, y, bw, bh = box
            crop = img[y:y+bh, x:x+bw]
            sig = cv_engine.extract_face_signature(crop)

    st.face_encoding = sig
    db.commit()
    return {"message": "Face profile registered successfully", "has_face_profile": True}

@app.delete("/api/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    st = db.query(Student).filter(Student.id == student_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(st)
    db.commit()
    return {"message": "Student deleted successfully"}

# ----------------- Attendance Sessions -----------------

@app.get("/api/sessions", response_model=List[SessionOut])
def list_sessions(class_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(ClassSession)
    if class_id:
        query = query.filter(ClassSession.class_id == class_id)
    sessions = query.order_by(ClassSession.created_at.desc()).all()
    results = []
    for s in sessions:
        c = db.query(ClassRoom).filter(ClassRoom.id == s.class_id).first()
        records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == s.id).all()
        total_enrolled = len(records)
        present_count = sum(1 for r in records if r.status in ["present", "late"])
        rate = round((present_count / total_enrolled * 100.0), 1) if total_enrolled > 0 else 0.0

        results.append({
            "id": s.id,
            "class_id": s.class_id,
            "class_name": c.name if c else "Unknown",
            "class_code": c.code if c else "Unknown",
            "title": s.title,
            "status": s.status,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "min_confidence_threshold": s.min_confidence_threshold,
            "min_presence_seconds": s.min_presence_seconds,
            "auto_confirm": s.auto_confirm,
            "attendance_rate": rate,
            "total_enrolled": total_enrolled,
            "total_present": present_count,
            "created_at": s.created_at
        })
    return results

@app.post("/api/sessions", response_model=SessionOut)
def create_session(payload: SessionCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = db.query(ClassRoom).filter(ClassRoom.id == payload.class_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Class not found")

    s = ClassSession(
        class_id=payload.class_id,
        title=payload.title.strip(),
        status="scheduled",
        min_confidence_threshold=payload.min_confidence_threshold or 0.60,
        min_presence_seconds=payload.min_presence_seconds or 15,
        auto_confirm=payload.auto_confirm or False
    )
    db.add(s)
    db.commit()
    db.refresh(s)

    # Initialize attendance records for all active students in class
    students = db.query(Student).filter(Student.class_id == s.class_id, Student.status == "active").all()
    for st in students:
        rec = AttendanceRecord(
            session_id=s.id,
            student_id=st.id,
            status="pending_review",
            is_confirmed=False
        )
        db.add(rec)
    db.commit()

    return {
        "id": s.id,
        "class_id": s.class_id,
        "class_name": c.name,
        "class_code": c.code,
        "title": s.title,
        "status": s.status,
        "start_time": s.start_time,
        "end_time": s.end_time,
        "min_confidence_threshold": s.min_confidence_threshold,
        "min_presence_seconds": s.min_presence_seconds,
        "auto_confirm": s.auto_confirm,
        "attendance_rate": 0.0,
        "total_enrolled": len(students),
        "total_present": 0,
        "created_at": s.created_at
    }

@app.get("/api/sessions/{session_id}")
def get_session_details(session_id: int, db: Session = Depends(get_db)):
    s = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    c = db.query(ClassRoom).filter(ClassRoom.id == s.class_id).first()

    records = (
        db.query(AttendanceRecord, Student)
        .join(Student, AttendanceRecord.student_id == Student.id)
        .filter(AttendanceRecord.session_id == session_id)
        .all()
    )

    roster = []
    present_cnt = 0
    for r, st in records:
        if r.status in ["present", "late"]:
            present_cnt += 1
        roster.append({
            "id": r.id,
            "session_id": r.session_id,
            "student_id": st.id,
            "student_code": st.student_id,
            "student_name": st.full_name,
            "status": r.status,
            "total_presence_seconds": round(r.total_presence_seconds, 1),
            "detection_count": r.detection_count,
            "confidence_score": round(r.confidence_score, 2),
            "is_confirmed": r.is_confirmed,
            "confirmed_by": r.confirmed_by,
            "confirmed_at": r.confirmed_at,
            "manual_review_note": r.manual_review_note,
            "first_detected_at": r.first_detected_at,
            "last_detected_at": r.last_detected_at
        })

    rate = round((present_cnt / len(roster) * 100.0), 1) if roster else 0.0

    return {
        "session": {
            "id": s.id,
            "class_id": s.class_id,
            "class_name": c.name if c else "Unknown",
            "class_code": c.code if c else "Unknown",
            "title": s.title,
            "status": s.status,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "min_confidence_threshold": s.min_confidence_threshold,
            "min_presence_seconds": s.min_presence_seconds,
            "auto_confirm": s.auto_confirm,
            "attendance_rate": rate,
            "total_enrolled": len(roster),
            "total_present": present_cnt
        },
        "roster": roster
    }

@app.post("/api/sessions/{session_id}/start")
def start_session(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    s.status = "active"
    s.start_time = utcnow()
    db.commit()
    return {"message": "Session started", "status": "active", "start_time": s.start_time}

@app.post("/api/sessions/{session_id}/end")
def end_session(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    s.status = "ended"
    s.end_time = utcnow()

    # Re-evaluate all unconfirmed records based on session thresholds
    records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()
    for r in records:
        if not r.is_confirmed:
            if r.total_presence_seconds >= s.min_presence_seconds and r.confidence_score >= s.min_confidence_threshold:
                r.status = "present"
                if s.auto_confirm:
                    r.is_confirmed = True
                    r.confirmed_by = "auto_threshold"
                    r.confirmed_at = utcnow()
            elif r.detection_count > 0:
                # Some detection but below threshold
                r.status = "pending_review"
                r.manual_review_note = f"Insufficient presence: {int(r.total_presence_seconds)}s (req: {s.min_presence_seconds}s)"
            else:
                r.status = "absent"
                r.manual_review_note = "Zero detections logged"
                if s.auto_confirm:
                    r.is_confirmed = True
                    r.confirmed_by = "auto_threshold"

    db.commit()
    return {"message": "Session ended and attendance finalized", "status": "ended", "end_time": s.end_time}

# ----------------- Multimodal Frame Processing & Live Telemetry -----------------

@app.post("/api/sessions/{session_id}/process-frame", response_model=FrameProcessResponse)
def process_live_frame(
    session_id: int,
    payload: FrameProcessRequest,
    db: Session = Depends(get_db)
):
    session_obj = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    # Decode image
    img = cv_engine.decode_image(payload.image_base64)
    if img is None:
        raise HTTPException(status_code=400, detail="Unable to decode base64 frame")

    # Fetch registered students for this session's class
    students = db.query(Student).filter(Student.class_id == session_obj.class_id).all()
    student_dicts = [
        {"id": s.id, "full_name": s.full_name, "face_encoding": s.face_encoding}
        for s in students
    ]

    # Process CV frame
    detected_list, annotated_img = cv_engine.process_frame(
        img,
        registered_students=student_dicts,
        blur_privacy=payload.blur_privacy or False
    )

    detected_count = len(detected_list)
    attentive_count = sum(1 for p in detected_list if p.get("is_attentive"))
    distracted_count = detected_count - attentive_count
    avg_attention = round((attentive_count / detected_count * 100.0), 1) if detected_count > 0 else 0.0

    # Ingest audio telemetry
    audio_info = audio_engine.ingest_telemetry(
        energy=payload.audio_energy or 0.0,
        speech_active=payload.audio_active or False
    )

    # Evaluate explainable teaching suggestion
    suggestion_res = suggestion_engine.evaluate(
        detected_count=detected_count,
        attentive_count=attentive_count,
        distracted_count=distracted_count,
        audio_state=audio_info["audio_state"],
        rolling_avg_energy=audio_info["rolling_avg_energy"]
    )

    # Log engagement observation
    eng_log = EngagementLog(
        session_id=session_id,
        timestamp=utcnow(),
        detected_persons_count=detected_count,
        attentive_count=attentive_count,
        distracted_count=distracted_count,
        avg_attention_score=avg_attention,
        audio_energy_level=audio_info["current_energy"],
        audio_activity_detected=payload.audio_active or False,
        teaching_suggestion=f"{suggestion_res['title']}: {suggestion_res['observation']} -> {suggestion_res['suggestion']}",
        suggestion_rule_id=suggestion_res["rule_id"],
        notes=f"CV Mode: {cv_engine.mode}"
    )
    db.add(eng_log)

    # Update attendance accumulation for matched students or active attendees
    # If session is active, accumulate presence time (assuming ~1-2 sec per polling tick)
    now = utcnow()
    if session_obj.status == "active":
        for p in detected_list:
            matched_id = p.get("matched_student_id")
            # If no face signature match, but we have unassigned students, assign by sequence or active presence
            if not matched_id and len(students) == 1:
                matched_id = students[0].id

            if matched_id:
                record = db.query(AttendanceRecord).filter(
                    AttendanceRecord.session_id == session_id,
                    AttendanceRecord.student_id == matched_id
                ).first()
                if record:
                    if not record.first_detected_at:
                        record.first_detected_at = now
                    record.last_detected_at = now
                    record.detection_count += 1
                    record.total_presence_seconds += 1.5 # standard frame sample duration
                    record.confidence_score = max(record.confidence_score, p.get("confidence", 0.7))
                    
                    # Check if threshold reached
                    if record.total_presence_seconds >= session_obj.min_presence_seconds and record.confidence_score >= session_obj.min_confidence_threshold:
                        if not record.is_confirmed:
                            record.status = "present"
                            if session_obj.auto_confirm:
                                record.is_confirmed = True
                                record.confirmed_by = "auto_agent"
                                record.confirmed_at = now
    
    db.commit()

    processed_b64 = cv_engine.encode_image(annotated_img) if annotated_img is not None else None

    # Construct response
    person_objs = [
        DetectedPerson(
            box=p["box"],
            confidence=p["confidence"],
            is_attentive=p["is_attentive"],
            orientation=p["orientation"],
            matched_student_id=p.get("matched_student_id"),
            matched_student_name=p.get("matched_student_name")
        )
        for p in detected_list
    ]

    return FrameProcessResponse(
        success=True,
        detected_count=detected_count,
        attentive_count=attentive_count,
        distracted_count=distracted_count,
        average_attention=avg_attention,
        persons=person_objs,
        teaching_suggestion=f"{suggestion_res['title']}: {suggestion_res['observation']} -> {suggestion_res['suggestion']}",
        suggestion_rule_id=suggestion_res["rule_id"],
        cv_engine_mode=cv_engine.mode,
        processed_image_base64=processed_b64
    )

@app.post("/api/sessions/{session_id}/audio-telemetry")
def submit_audio_telemetry(session_id: int, payload: AudioTelemetryRequest, db: Session = Depends(get_db)):
    info = audio_engine.ingest_telemetry(
        energy=payload.energy_level,
        speech_active=payload.speech_active,
        peak=payload.peak_volume or 0.0
    )
    return {"success": True, "audio_summary": info}

# ----------------- Human Review Queue & Audit -----------------

@app.get("/api/reviews/pending", response_model=List[AttendanceRecordOut])
def list_pending_reviews(session_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = (
        db.query(AttendanceRecord, Student)
        .join(Student, AttendanceRecord.student_id == Student.id)
        .filter(AttendanceRecord.is_confirmed == False)
    )
    if session_id:
        query = query.filter(AttendanceRecord.session_id == session_id)
    
    records = query.order_by(AttendanceRecord.created_at.desc()).all()
    results = []
    for r, st in records:
        results.append({
            "id": r.id,
            "session_id": r.session_id,
            "student_id": st.id,
            "student_name": st.full_name,
            "student_code": st.student_id,
            "first_detected_at": r.first_detected_at,
            "last_detected_at": r.last_detected_at,
            "total_presence_seconds": r.total_presence_seconds,
            "detection_count": r.detection_count,
            "confidence_score": r.confidence_score,
            "status": r.status,
            "is_confirmed": r.is_confirmed,
            "confirmed_by": r.confirmed_by,
            "confirmed_at": r.confirmed_at,
            "manual_review_note": r.manual_review_note
        })
    return results

@app.put("/api/reviews/{record_id}")
def update_review_record(
    record_id: int,
    payload: AttendanceUpdateStatus,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    rec = db.query(AttendanceRecord).filter(AttendanceRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    rec.status = payload.status
    rec.is_confirmed = payload.is_confirmed
    rec.confirmed_by = user.username
    rec.confirmed_at = utcnow()
    if payload.manual_review_note:
        rec.manual_review_note = payload.manual_review_note
    db.commit()
    return {"message": "Attendance status verified and saved", "record_id": rec.id, "status": rec.status}

@app.post("/api/reviews/batch-confirm")
def batch_confirm_records(
    session_id: int,
    min_confidence: float = Query(0.60),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id,
        AttendanceRecord.is_confirmed == False,
        AttendanceRecord.confidence_score >= min_confidence
    ).all()
    count = 0
    now = utcnow()
    for r in records:
        r.is_confirmed = True
        r.confirmed_by = user.username
        r.confirmed_at = now
        r.status = "present"
        count += 1
    db.commit()
    return {"message": f"Successfully verified {count} records", "confirmed_count": count}

# ----------------- Attendance History & CSV Export -----------------

@app.get("/api/attendance/history")
def get_attendance_history(
    class_id: Optional[int] = None,
    session_id: Optional[int] = None,
    student_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = (
        db.query(AttendanceRecord, Student, ClassSession, ClassRoom)
        .join(Student, AttendanceRecord.student_id == Student.id)
        .join(ClassSession, AttendanceRecord.session_id == ClassSession.id)
        .join(ClassRoom, ClassSession.class_id == ClassRoom.id)
    )
    if class_id:
        query = query.filter(ClassRoom.id == class_id)
    if session_id:
        query = query.filter(ClassSession.id == session_id)
    if student_id:
        query = query.filter(Student.id == student_id)

    records = query.order_by(ClassSession.start_time.desc(), Student.student_id).all()
    results = []
    for r, st, sess, cls in records:
        results.append({
            "record_id": r.id,
            "session_id": sess.id,
            "session_title": sess.title,
            "class_name": cls.name,
            "class_code": cls.code,
            "student_id": st.id,
            "student_code": st.student_id,
            "student_name": st.full_name,
            "status": r.status,
            "presence_seconds": round(r.total_presence_seconds, 1),
            "detection_count": r.detection_count,
            "confidence_score": round(r.confidence_score, 2),
            "is_confirmed": r.is_confirmed,
            "confirmed_by": r.confirmed_by,
            "date": sess.start_time.strftime("%Y-%m-%d %H:%M") if sess.start_time else "N/A"
        })
    return results

@app.get("/api/sessions/{session_id}/export-csv")
def export_session_csv(session_id: int, db: Session = Depends(get_db)):
    csv_content = generate_session_attendance_csv(session_id, db)
    if not csv_content:
        raise HTTPException(status_code=404, detail="Session not found or has no records")
    
    filename = f"attendance_session_{session_id}.csv"
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ----------------- System Settings -----------------

@app.get("/api/settings", response_model=List[SystemSettingItem])
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(SystemSetting).all()
    return settings

@app.post("/api/settings")
def update_settings(items: List[SystemSettingItem], db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    for item in items:
        setting = db.query(SystemSetting).filter(SystemSetting.key == item.key).first()
        if setting:
            setting.value = item.value
            if item.description:
                setting.description = item.description
        else:
            db.add(SystemSetting(key=item.key, value=item.value, description=item.description))
    db.commit()
    return {"message": "Settings updated successfully"}

# ----------------- Serve Frontend Static Assets -----------------
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

@app.exception_handler(404)
async def custom_404_handler(request, exc):
    index_file = os.path.join(FRONTEND_DIST, "index.html")
    if not request.url.path.startswith("/api") and os.path.exists(index_file):
        return FileResponse(index_file)
    return JSONResponse(status_code=404, content={"detail": "Not Found"})

if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend_dist")


