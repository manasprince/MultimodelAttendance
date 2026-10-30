import time
from typing import Dict, Any, List

class AudioEngine:
    def __init__(self):
        self.history = []
        self.max_history = 60
        self.hardware_available = False
        self._check_hardware()

    def _check_hardware(self):
        try:
            import sounddevice as sd
            devices = sd.query_devices()
            if len(devices) > 0:
                self.hardware_available = True
        except Exception:
            self.hardware_available = False

    def get_status(self) -> Dict[str, Any]:
        return {
            "status": "operational",
            "telemetry_stream": "ready",
            "hardware_mic_direct": self.hardware_available,
            "mode": "web_audio_telemetry_live" if not self.hardware_available else "hardware_and_web_telemetry",
            "description": "Real-time client Web Audio API telemetry + moving energy window analysis"
        }

    def ingest_telemetry(self, energy: float, speech_active: bool, peak: float = 0.0) -> Dict[str, Any]:
        """
        Record audio telemetry data point and compute moving average metrics.
        """
        now = time.time()
        point = {
            "time": now,
            "energy": max(0.0, min(1.0, float(energy))),
            "speech_active": bool(speech_active),
            "peak": max(0.0, min(1.0, float(peak)))
        }
        self.history.append(point)
        if len(self.history) > self.max_history:
            self.history.pop(0)

        # Calculate rolling stats
        energies = [p["energy"] for p in self.history]
        avg_energy = sum(energies) / len(energies) if energies else 0.0
        active_ratio = sum(1 for p in self.history if p["speech_active"]) / len(self.history) if self.history else 0.0

        # Classification
        if avg_energy < 0.08:
            audio_state = "quiet"
        elif active_ratio > 0.65:
            audio_state = "continuous_speech"
        elif avg_energy > 0.6:
            audio_state = "high_noise_or_chatter"
        else:
            audio_state = "moderate_interaction"

        return {
            "current_energy": point["energy"],
            "rolling_avg_energy": round(avg_energy, 3),
            "speech_ratio": round(active_ratio, 2),
            "audio_state": audio_state
        }

audio_engine = AudioEngine()

