import csv
import io
from sqlalchemy.orm import Session
from .models import AttendanceRecord, Student, Session as ClassSession, ClassRoom

def generate_session_attendance_csv(session_id: int, db: Session) -> str:
    """Generate CSV string of attendance for a given session."""
    session_obj = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session_obj:
        return ""

    class_obj = db.query(ClassRoom).filter(ClassRoom.id == session_obj.class_id).first()
    records = (
        db.query(AttendanceRecord, Student)
        .join(Student, AttendanceRecord.student_id == Student.id)
        .filter(AttendanceRecord.session_id == session_id)
        .order_by(Student.student_id)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)

    # Header metadata
    writer.writerow(["# MANAS Multimodal Attendance Report"])
    writer.writerow(["# Session Title", session_obj.title])
    writer.writerow(["# Class", f"{class_obj.name} ({class_obj.code})" if class_obj else "N/A"])
    writer.writerow(["# Date", session_obj.start_time.strftime("%Y-%m-%d %H:%M:%S") if session_obj.start_time else "N/A"])
    writer.writerow([])

    # Table headers
    writer.writerow([
        "Student ID",
        "Student Name",
        "Status",
        "Presence Seconds",
        "Detections",
        "Confidence %",
        "Human Confirmed",
        "Confirmed By",
        "First Detected",
        "Last Detected",
        "Review Notes"
    ])

    for record, student in records:
        writer.writerow([
            student.student_id,
            student.full_name,
            record.status.upper(),
            round(record.total_presence_seconds, 1),
            record.detection_count,
            f"{int(record.confidence_score * 100)}%",
            "YES" if record.is_confirmed else "PENDING",
            record.confirmed_by or "",
            record.first_detected_at.strftime("%H:%M:%S") if record.first_detected_at else "",
            record.last_detected_at.strftime("%H:%M:%S") if record.last_detected_at else "",
            record.manual_review_note or ""
        ])

    return output.getvalue()

