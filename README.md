# MANAS: Multimodal Classroom Attendance & Engagement Agent

**MANAS** is an intelligent, privacy-conscious classroom assistant that pairs real-time computer vision and Web Audio telemetry with local deterministic rule evaluation. It provides verified attendance tracking, gaze-based attention analytics, duplicate prevention, and explainable teaching suggestions—all running 100% locally on Windows without cloud dependencies or paid APIs.

---

## 🌟 Key Features

1. **Live Dashboard & Real Database KPIs**:
   - Computes live statistics directly from SQLite: total students, active classes, session attendance percentages, pending verification queues, and average visual attention.
2. **Student & Classroom Management**:
   - Manage classes, rosters, and enroll students with unique roll numbers (`STU-XXX`).
   - Register reference face profiles for biometric recognition.
3. **Session Lifecycle & Automated Tracking**:
   - Create, start, and end attendance sessions.
   - Automatically tracks cumulative presence duration and peak confidence scores.
4. **OpenCV 5.0 YuNet Computer Vision**:
   - Powered by official modern OpenCV YuNet DNN face detection (`face_detection_yunet_2023mar.onnx`) with 5 facial landmarks (eyes, nose, mouth corners).
   - Estimates head pose and yaw/pitch gaze asymmetry (attentive frontal vs looking away vs looking down).
   - Graceful fallback to skin-tone/motion contour analysis if DNN models are unavailable.
5. **Configurable Thresholds & Human Verification Queue**:
   - Customizable confidence thresholds (e.g. 60%) and minimum presence durations (e.g. 15s).
   - Dedicated verification queue to review flagged or low-confidence records with instructor audit notes.
6. **Duplicate Prevention & CSV Export**:
   - Database-level unique constraint `(session_id, student_id)` prevents double-counting.
   - 1-click compliant CSV report generation for university administrative records.
7. **Explainable Teaching Suggestions**:
   - Deterministic, local rule engine that evaluates actual classroom observations:
     - `RULE_ATTENTION_DIP`: Fires when attention falls below 50%, suggesting interactive checks or quick polls.
     - `RULE_ROOM_COMMOTION`: Detects elevated ambient chatter combined with multiple distracted students.
     - `RULE_MONOLOGUE_PACING`: Detects continuous one-way talking and recommends "Think-Pair-Share" breaks.
     - `RULE_HIGH_ENGAGEMENT`: Recognizes high-focus windows for complex concepts.
8. **Web Audio Activity Analysis**:
   - Non-invasive client-side Web Audio API telemetry measuring RMS volume energy and speech pacing. Audio is processed transiently and never recorded to disk.
9. **Privacy Protection & Security**:
   - Real-time facial privacy blurring toggle for both live monitoring and visual feeds.
   - Secure token-based authentication (HMAC-SHA256 with salt) and configurable data retention limits.

---

## 🚀 Quick Start on Windows

### Prerequisites
- **Python 3.10+** (Tested on Python 3.14)
- **Node.js v18+** & **npm**

### 1. Backend Setup
From the project root folder:
```powershell
# Optional: create a virtual environment if desired
# python -m venv venv
# .\venv\Scripts\Activate.ps1

# Run the FastAPI server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
*The database (`backend/database.db`) is automatically initialized and seeded with sample classes, students, and instructor credentials on first launch.*

### 2. Frontend Launch (Development Mode)
In a second PowerShell terminal:
```powershell
cd frontend
npm install
npm run dev
```
Open your browser at: **`http://localhost:5173`**

### Alternative: All-in-One Production Mode
Because the production frontend is pre-built into `frontend/dist`, running just the FastAPI backend:
```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
Allows you to directly navigate to **`http://127.0.0.1:8000`** in any web browser without needing a separate frontend dev server!

---

## 🔑 Default Instructor Credentials
- **Username:** `teacher`
- **Password:** `admin123`
*(Auto-fill button available on the sign-in screen)*

---

## 🧪 Running Automated Tests

Run the full suite of backend unit and integration tests:
```powershell
python -m unittest discover backend/tests
```
Expected output:
```text
Ran 7 tests in ~0.16s
OK
```

---

## 📊 Genuine Capabilities vs MVP Boundaries

| Capability | Status | Implementation Details |
| :--- | :---: | :--- |
| **OpenCV YuNet Face Detector** | ✅ **Genuinely Working** | Real DNN inference using OpenCV 5 `FaceDetectorYN` with 5 facial landmarks. |
| **Visual Gaze & Attention Estimation** | ✅ **Genuinely Working** | Derived from eye-to-nose horizontal asymmetry ratio and vertical pitch span. |
| **Persistent Storage & Schema** | ✅ **Genuinely Working** | SQLite with SQLAlchemy models; enforce `uq_session_student` duplicate constraint. |
| **Attendance Verification Queue** | ✅ **Genuinely Working** | Instructor can override status (`present`, `absent`, `late`) with audit notes. |
| **CSV Report Export** | ✅ **Genuinely Working** | Generates standard CSV reports with date, presence seconds, confidence %, and audit stamps. |
| **Local Rule-Based Suggestions** | ✅ **Genuinely Working** | Deterministic engine citing exact observed metrics (`attentive_count`, `energy_level`). |
| **Audio Activity Analysis** | ✅ **Genuinely Working** | Real-time Web Audio API RMS energy meter & speech pacing telemetry. |
| **Privacy Face Blurring** | ✅ **Genuinely Working** | Real-time client and server Gaussian blur toggle. |
| **Multi-Camera RTMP Ingestion** | ⏳ *Future Scope* | Current MVP uses browser `navigator.mediaDevices.getUserMedia` for single or multi-device webcams. Multi-RTSP security camera network feeds can be plugged into `cv_engine.py` in v2. |
| **High-Dimensional Face Embeddings** | ⏳ *Future Scope* | Current face matching uses 64-descriptor color/gradient spatial histograms; deep embedding networks (e.g. SFace 128-dim vector) can be toggled without architecture changes. |

