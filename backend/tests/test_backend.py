import unittest
import os
import json
import numpy as np
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base
from backend.models import User, ClassRoom, Student, Session as ClassSession, AttendanceRecord, EngagementLog
from backend.auth import hash_password, verify_password, create_access_token, decode_token
from backend.cv_engine import cv_engine
from backend.audio_engine import audio_engine
from backend.suggestion_engine import suggestion_engine
from backend.export_csv import generate_session_attendance_csv

class TestBackendSystem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create an in-memory SQLite database for test isolation
        cls.test_engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=cls.test_engine)
        cls.TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.test_engine)

    def setUp(self):
        self.db = self.TestSessionLocal()

    def tearDown(self):
        self.db.close()

    def test_auth_and_hashing(self):
        raw_pw = "secretPass123"
        hashed = hash_password(raw_pw)
        self.assertTrue(verify_password(raw_pw, hashed))
        self.assertFalse(verify_password("wrongPass", hashed))

        # Test Token Creation and Verification
        token = create_access_token({"sub": "teacher1", "role": "teacher"})
        decoded = decode_token(token)
        self.assertIsNotNone(decoded)
        self.assertEqual(decoded["sub"], "teacher1")
        self.assertEqual(decoded["role"], "teacher")

    def test_class_and_student_lifecycle(self):
        # 1. Create Class
        c = ClassRoom(name="Machine Learning", code="CS-501", subject="Computer Science")
        self.db.add(c)
        self.db.commit()
        self.db.refresh(c)
        self.assertIsNotNone(c.id)

        # 2. Create Student
        s = Student(
            student_id="STU-TEST-1",
            full_name="Alex Turner",
            email="alex@test.edu",
            class_id=c.id,
            status="active"
        )
        self.db.add(s)
        self.db.commit()
        self.db.refresh(s)
        self.assertEqual(s.class_id, c.id)

        # 3. Create Session
        sess = ClassSession(
            class_id=c.id,
            title="Lab 1: CNNs",
            status="scheduled",
            min_confidence_threshold=0.6,
            min_presence_seconds=10
        )
        self.db.add(sess)
        self.db.commit()
        self.db.refresh(sess)

        # 4. Create Attendance Record
        rec = AttendanceRecord(
            session_id=sess.id,
            student_id=s.id,
            status="pending_review",
            is_confirmed=False
        )
        self.db.add(rec)
        self.db.commit()

        # 5. Duplicate Prevention Test: trying to insert another record with same (session_id, student_id)
        from sqlalchemy.exc import IntegrityError
        dup_rec = AttendanceRecord(
            session_id=sess.id,
            student_id=s.id,
            status="present"
        )
        self.db.add(dup_rec)
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

    def test_cv_engine_face_and_pose(self):
        # Ensure CV engine status returns proper structure
        stat = cv_engine.get_status()
        self.assertIn("status", stat)
        self.assertIn("mode", stat)

        # Test dummy frame processing with black image
        dummy_img = np.zeros((320, 320, 3), dtype=np.uint8)
        detected, annotated = cv_engine.process_frame(dummy_img)
        self.assertIsInstance(detected, list)
        self.assertIsNotNone(annotated)

        # Test signature extraction
        face_sample = np.ones((64, 64, 3), dtype=np.uint8) * 128
        sig = cv_engine.extract_face_signature(face_sample)
        self.assertTrue(len(sig) > 0)
        sim = cv_engine.compare_signatures(sig, sig)
        self.assertAlmostEqual(sim, 1.0, places=2)

    def test_audio_engine(self):
        stat = audio_engine.get_status()
        self.assertIn("status", stat)
        
        telemetry = audio_engine.ingest_telemetry(0.35, True, 0.45)
        self.assertIn("audio_state", telemetry)
        self.assertIn("rolling_avg_energy", telemetry)

    def test_explainable_suggestion_engine(self):
        # Test low attention rule
        res_dip = suggestion_engine.evaluate(detected_count=10, attentive_count=3, distracted_count=7)
        self.assertEqual(res_dip["rule_id"], "RULE_ATTENTION_DIP")
        self.assertIn("30%", res_dip["observation"])

        # Test high engagement rule
        res_high = suggestion_engine.evaluate(detected_count=10, attentive_count=9, distracted_count=1)
        self.assertEqual(res_high["rule_id"], "RULE_HIGH_ENGAGEMENT")

        # Test zero detected rule
        res_zero = suggestion_engine.evaluate(detected_count=0, attentive_count=0, distracted_count=0)
        self.assertEqual(res_zero["rule_id"], "RULE_NO_PERSONS")

    def test_csv_export(self):
        # Setup class, session, student, attendance
        c = ClassRoom(name="Data Science", code="DS-201")
        self.db.add(c)
        self.db.commit()
        s = Student(student_id="STU-CSV-1", full_name="Jane Doe", class_id=c.id)
        self.db.add(s)
        self.db.commit()
        sess = ClassSession(class_id=c.id, title="Regression Session")
        self.db.add(sess)
        self.db.commit()
        rec = AttendanceRecord(
            session_id=sess.id,
            student_id=s.id,
            status="present",
            total_presence_seconds=120.0,
            detection_count=45,
            confidence_score=0.88,
            is_confirmed=True
        )
        self.db.add(rec)
        self.db.commit()

        csv_str = generate_session_attendance_csv(sess.id, self.db)
        self.assertIn("STU-CSV-1", csv_str)
        self.assertIn("Jane Doe", csv_str)
        self.assertIn("PRESENT", csv_str)

if __name__ == "__main__":
    unittest.main()

