import unittest
import base64
import time
import numpy as np
import cv2
from fastapi.testclient import TestClient
from backend.main import app

class TestAPIIntegration(unittest.TestCase):
    def test_e2e_flow(self):
        with TestClient(app) as client:
            # 1. Login with seeded instructor credentials
            login_res = client.post("/api/auth/login", json={
                "username": "teacher",
                "password": "admin123"
            })
            self.assertEqual(login_res.status_code, 200)
            data = login_res.json()
            self.assertIn("access_token", data)
            token = data["access_token"]
            auth_headers = {"Authorization": f"Bearer {token}"}

            # 2. Check Dashboard Stats
            stats_res = client.get("/api/dashboard/stats")
            self.assertEqual(stats_res.status_code, 200)
            stats = stats_res.json()
            self.assertGreaterEqual(stats["total_students"], 1)
            self.assertGreaterEqual(stats["total_classes"], 1)

            # 3. Create Class with unique code
            unique_suffix = int(time.time() * 1000) % 1000000
            c_code = f"T-{unique_suffix}"
            create_cls_res = client.post("/api/classes", headers=auth_headers, json={
                "name": "Integration Test Class",
                "code": c_code,
                "subject": "Testing"
            })
            self.assertEqual(create_cls_res.status_code, 200)
            cls_id = create_cls_res.json()["id"]

            # 4. Create Student
            stu_res = client.post("/api/students", headers=auth_headers, json={
                "student_id": f"STU-{unique_suffix}",
                "full_name": "Integration Tester",
                "email": "test@e2e.edu",
                "class_id": cls_id,
                "consent_given": True
            })
            self.assertEqual(stu_res.status_code, 200)
            stu_id = stu_res.json()["id"]

            # 5. Create Session
            sess_res = client.post("/api/sessions", headers=auth_headers, json={
                "class_id": cls_id,
                "title": "E2E Automated Session",
                "min_confidence_threshold": 0.50,
                "min_presence_seconds": 1,
                "auto_confirm": True
            })
            self.assertEqual(sess_res.status_code, 200)
            sess_id = sess_res.json()["id"]

            # 6. Start Session
            start_res = client.post(f"/api/sessions/{sess_id}/start", headers=auth_headers)
            self.assertEqual(start_res.status_code, 200)

            # 7. Ingest Live Frame
            dummy_img = np.zeros((320, 320, 3), dtype=np.uint8)
            cv2.circle(dummy_img, (160, 160), 60, (200, 200, 200), -1)
            _, buf = cv2.imencode(".jpg", dummy_img)
            b64_img = base64.b64encode(buf).decode("utf-8")

            frame_res = client.post(f"/api/sessions/{sess_id}/process-frame", json={
                "session_id": sess_id,
                "image_base64": b64_img,
                "audio_energy": 0.25,
                "audio_active": True,
                "blur_privacy": False
            })
            self.assertEqual(frame_res.status_code, 200)
            frame_data = frame_res.json()
            self.assertTrue(frame_data["success"])
            self.assertIn("teaching_suggestion", frame_data)

            # 8. End Session
            end_res = client.post(f"/api/sessions/{sess_id}/end", headers=auth_headers)
            self.assertEqual(end_res.status_code, 200)

            # 9. Export Attendance CSV
            csv_res = client.get(f"/api/sessions/{sess_id}/export-csv")
            self.assertEqual(csv_res.status_code, 200)
            self.assertIn("text/csv", csv_res.headers.get("content-type", ""))
            self.assertIn(f"STU-{unique_suffix}", csv_res.text)

            # 10. Check Attendance History
            hist_res = client.get(f"/api/attendance/history?session_id={sess_id}")
            self.assertEqual(hist_res.status_code, 200)
            records = hist_res.json()
            self.assertGreaterEqual(len(records), 1)

if __name__ == "__main__":
    unittest.main()
