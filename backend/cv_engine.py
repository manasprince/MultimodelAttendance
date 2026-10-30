import os
import cv2
import numpy as np
import base64
import json
from typing import List, Dict, Any, Tuple, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
YUNET_PATH = os.path.join(BASE_DIR, "models", "face_detection_yunet.onnx")

class CVEngine:
    def __init__(self):
        self.mode = "unavailable"
        self.detector = None
        self.yunet_available = False
        self.bg_subtractor = None
        self._initialize_detector()

    def _initialize_detector(self):
        # 1. Try modern OpenCV YuNet Face Detector
        if os.path.exists(YUNET_PATH) and os.path.getsize(YUNET_PATH) > 10000:
            try:
                # Default input size 320x320; will be set dynamically per frame
                self.detector = cv2.FaceDetectorYN.create(
                    model=YUNET_PATH,
                    config="",
                    input_size=(320, 320),
                    score_threshold=0.55,
                    nms_threshold=0.3,
                    top_k=50
                )
                self.yunet_available = True
                self.mode = "opencv_yunet"
                print("CV Engine initialized with OpenCV YuNet DNN face detector.")
                return
            except Exception as e:
                print(f"Failed to initialize YuNet detector: {e}")
        
        # 2. Fallback to BackgroundSubtractor and Contour/Skin analysis
        try:
            self.bg_subtractor = cv2.createBackgroundSubtractorMOG2(history=500, varThreshold=16, detectShadows=True)
            self.mode = "opencv_contour_motion"
            print("CV Engine initialized with OpenCV Contour/Motion detector fallback.")
        except Exception as e:
            self.mode = "unavailable"
            print(f"OpenCV detection unavailable: {e}")

    def get_status(self) -> Dict[str, Any]:
        return {
            "status": "operational" if self.mode != "unavailable" else "unavailable",
            "mode": self.mode,
            "yunet_active": self.yunet_available,
            "description": "YuNet 5-landmark face & gaze estimation" if self.yunet_available else (
                "OpenCV skin & motion contour analysis" if self.mode == "opencv_contour_motion" else "Computer Vision module unavailable"
            )
        }

    def decode_image(self, b64_str: str) -> Optional[np.ndarray]:
        """Decode a base64 encoded image string to OpenCV BGR numpy array."""
        try:
            if "," in b64_str:
                b64_str = b64_str.split(",")[1]
            img_data = base64.b64decode(b64_str)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return img
        except Exception as e:
            print(f"Error decoding image: {e}")
            return None

    def encode_image(self, img: np.ndarray) -> str:
        """Encode OpenCV BGR image to base64 JPEG string."""
        try:
            _, buffer = cv2.imencode('.jpg', img, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            b64_str = base64.b64encode(buffer).decode('utf-8')
            return f"data:image/jpeg;base64,{b64_str}"
        except Exception as e:
            print(f"Error encoding image: {e}")
            return ""

    def extract_face_signature(self, face_crop: np.ndarray) -> str:
        """
        Create a compact normalized color & gradient feature signature for face matching.
        Returns a JSON string of 64 normalized descriptor values.
        """
        try:
            if face_crop is None or face_crop.size == 0:
                return ""
            resized = cv2.resize(face_crop, (32, 32))
            # Color histogram in HSV
            hsv = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)
            h_hist = cv2.calcHist([hsv], [0], None, [16], [0, 180])
            s_hist = cv2.calcHist([hsv], [1], None, [16], [0, 256])
            v_hist = cv2.calcHist([hsv], [2], None, [16], [0, 256])
            # Grayscale spatial distribution
            gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
            blocks = [cv2.resize(gray, (4, 4)).flatten() / 255.0]
            
            h_norm = (h_hist / (np.sum(h_hist) + 1e-5)).flatten()
            s_norm = (s_hist / (np.sum(s_hist) + 1e-5)).flatten()
            v_norm = (v_hist / (np.sum(v_hist) + 1e-5)).flatten()
            
            sig = np.concatenate([h_norm, s_norm, v_norm, blocks[0]])
            return json.dumps(np.round(sig, 4).tolist())
        except Exception as e:
            print(f"Error extracting face signature: {e}")
            return ""

    def compare_signatures(self, sig1_str: str, sig2_str: str) -> float:
        """Compute similarity score [0.0 - 1.0] between two face signatures."""
        try:
            if not sig1_str or not sig2_str:
                return 0.0
            vec1 = np.array(json.loads(sig1_str), dtype=float)
            vec2 = np.array(json.loads(sig2_str), dtype=float)
            if len(vec1) != len(vec2) or len(vec1) == 0:
                return 0.0
            # Cosine similarity
            dot = np.dot(vec1, vec2)
            norm = (np.linalg.norm(vec1) * np.linalg.norm(vec2)) + 1e-6
            sim = float(dot / norm)
            return max(0.0, min(1.0, sim))
        except Exception:
            return 0.0

    def process_frame(
        self,
        img: np.ndarray,
        registered_students: Optional[List[Dict[str, Any]]] = None,
        blur_privacy: bool = False
    ) -> Tuple[List[Dict[str, Any]], np.ndarray]:
        """
        Process a single video frame:
        1. Detect persons / faces using YuNet (or fallback).
        2. Estimate attention (orientation/gaze proxy).
        3. Match against registered student signatures if provided.
        4. Apply privacy blur if requested.
        5. Return structured detection list and annotated image.
        """
        if img is None:
            return [], None

        h, w, _ = img.shape
        annotated_img = img.copy()
        detected_persons = []

        if self.yunet_available and self.detector is not None:
            detected_persons, annotated_img = self._detect_yunet(
                img, annotated_img, w, h, registered_students, blur_privacy
            )
        elif self.mode == "opencv_contour_motion":
            detected_persons, annotated_img = self._detect_fallback(
                img, annotated_img, w, h, registered_students, blur_privacy
            )

        return detected_persons, annotated_img

    def _detect_yunet(
        self, img, annotated_img, w, h, registered_students, blur_privacy
    ):
        results = []
        try:
            self.detector.setInputSize((w, h))
            _, faces = self.detector.detect(img)
            
            if faces is not None:
                for face in faces:
                    # YuNet output format:
                    # [x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rcm, y_rcm, x_lcm, y_lcm, score]
                    box = [int(face[0]), int(face[1]), int(face[2]), int(face[3])]
                    score = float(face[-1])
                    
                    # Bound coords inside image
                    x = max(0, box[0])
                    y = max(0, box[1])
                    bw = min(w - x, max(1, box[2]))
                    bh = min(h - y, max(1, box[3]))
                    box = [x, y, bw, bh]

                    # Facial landmarks
                    re = (float(face[4]), float(face[5])) # right eye
                    le = (float(face[6]), float(face[7])) # left eye
                    nt = (float(face[8]), float(face[9])) # nose tip
                    rcm = (float(face[10]), float(face[11])) # right mouth
                    lcm = (float(face[12]), float(face[13])) # left mouth

                    # Estimate head pose / attention from nose-to-eye horizontal asymmetry
                    d_right_eye = abs(nt[0] - re[0])
                    d_left_eye = abs(le[0] - nt[0])
                    min_d = min(d_right_eye, d_left_eye) + 1e-4
                    max_d = max(d_right_eye, d_left_eye)
                    asymmetry = max_d / min_d

                    # Vertical pitch: eyes relative to nose
                    eye_y_avg = (re[1] + le[1]) / 2.0
                    mouth_y_avg = (rcm[1] + lcm[1]) / 2.0
                    face_h_span = max(1.0, mouth_y_avg - eye_y_avg)
                    nose_rel_pos = (nt[1] - eye_y_avg) / face_h_span

                    orientation = "frontal"
                    is_attentive = True

                    if asymmetry > 2.2:
                        orientation = "looking_away"
                        is_attentive = False
                    elif nose_rel_pos > 0.85:
                        orientation = "looking_down"
                        is_attentive = False

                    # Extract face crop for signature matching
                    face_crop = img[y:y+bh, x:x+bw]
                    face_sig = self.extract_face_signature(face_crop)
                    
                    matched_id = None
                    matched_name = None
                    best_match_sim = 0.0

                    if registered_students:
                        for student in registered_students:
                            st_sig = student.get("face_encoding")
                            if st_sig:
                                sim = self.compare_signatures(face_sig, st_sig)
                                if sim > 0.65 and sim > best_match_sim:
                                    best_match_sim = sim
                                    matched_id = student.get("id")
                                    matched_name = student.get("full_name")

                    # Draw visualization
                    box_color = (0, 200, 0) if is_attentive else (0, 140, 255) # Green / Amber
                    label_text = f"{matched_name or 'Person'} | {'Attentive' if is_attentive else orientation} ({int(score*100)}%)"

                    # Privacy blur
                    if blur_privacy and bw > 10 and bh > 10:
                        kernel_w = (bw // 7) * 2 + 1
                        kernel_h = (bh // 7) * 2 + 1
                        face_roi = annotated_img[y:y+bh, x:x+bw]
                        blurred = cv2.GaussianBlur(face_roi, (max(3, kernel_w), max(3, kernel_h)), 30)
                        annotated_img[y:y+bh, x:x+bw] = blurred

                    # Draw bounding box and label
                    cv2.rectangle(annotated_img, (x, y), (x + bw, y + bh), box_color, 2)
                    cv2.putText(
                        annotated_img, label_text, (x, max(20, y - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, box_color, 1, cv2.LINE_AA
                    )
                    
                    # Draw landmarks if not blurred
                    if not blur_privacy:
                        for pt in [re, le, nt, rcm, lcm]:
                            px, py = int(pt[0]), int(pt[1])
                            if 0 <= px < w and 0 <= py < h:
                                cv2.circle(annotated_img, (px, py), 2, (255, 255, 0), -1)

                    results.append({
                        "box": box,
                        "confidence": round(score, 2),
                        "is_attentive": is_attentive,
                        "orientation": orientation,
                        "matched_student_id": matched_id,
                        "matched_student_name": matched_name,
                        "face_signature": face_sig
                    })
        except Exception as e:
            print(f"Error in YuNet detection: {e}")

        return results, annotated_img

    def _detect_fallback(
        self, img, annotated_img, w, h, registered_students, blur_privacy
    ):
        results = []
        try:
            # Color segmentation in HSV for skin-like tones + upper body contour
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            lower_skin = np.array([0, 20, 70], dtype=np.uint8)
            upper_skin = np.array([25, 255, 255], dtype=np.uint8)
            mask = cv2.inRange(hsv, lower_skin, upper_skin)
            
            # Morphological smoothing
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
            
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            min_area = (w * h) * 0.015 # At least 1.5% of frame
            
            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area > min_area:
                    x, y, bw, bh = cv2.boundingRect(cnt)
                    aspect = bh / float(bw)
                    # Plausible face/head aspect ratio
                    if 0.8 < aspect < 2.5:
                        box = [x, y, bw, bh]
                        is_attentive = True # Default in fallback mode
                        
                        if blur_privacy and bw > 10 and bh > 10:
                            face_roi = annotated_img[y:y+bh, x:x+bw]
                            blurred = cv2.GaussianBlur(face_roi, (21, 21), 20)
                            annotated_img[y:y+bh, x:x+bw] = blurred
                        
                        cv2.rectangle(annotated_img, (x, y), (x + bw, y + bh), (0, 200, 100), 2)
                        cv2.putText(
                            annotated_img, "Detected Person (CV Fallback)", (x, max(20, y - 8)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 200, 100), 1
                        )

                        results.append({
                            "box": box,
                            "confidence": 0.65,
                            "is_attentive": is_attentive,
                            "orientation": "frontal",
                            "matched_student_id": None,
                            "matched_student_name": None,
                            "face_signature": ""
                        })
        except Exception as e:
            print(f"Error in CV fallback detection: {e}")

        return results, annotated_img

cv_engine = CVEngine()

