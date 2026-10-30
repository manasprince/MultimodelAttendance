from typing import Dict, Any, Optional

class SuggestionEngine:
    def __init__(self):
        pass

    def evaluate(
        self,
        detected_count: int,
        attentive_count: int,
        distracted_count: int,
        audio_state: str = "moderate_interaction",
        rolling_avg_energy: float = 0.0
    ) -> Dict[str, Any]:
        """
        Evaluate local deterministic rules based strictly on observable data.
        Returns explainable rationale and recommended teacher intervention.
        """
        if detected_count == 0:
            return {
                "rule_id": "RULE_NO_PERSONS",
                "title": "Camera Visibility Notice",
                "observation": "Zero students currently detected in the video frame.",
                "suggestion": "Adjust camera angle or verify students are seated within frame boundary.",
                "urgency": "low",
                "category": "setup"
            }

        attentive_pct = (attentive_count / detected_count) * 100.0

        # Rule 1: Restlessness or elevated commotion
        if rolling_avg_energy > 0.55 and distracted_count >= 2:
            return {
                "rule_id": "RULE_ROOM_COMMOTION",
                "title": "Restlessness / High Commotion",
                "observation": f"Elevated audio energy ({int(rolling_avg_energy * 100)}%) detected alongside {distracted_count} student(s) turning away.",
                "suggestion": "Room focus is scattering. Re-center the class with a quick call-and-response prompt or transition to a quiet focused task.",
                "urgency": "high",
                "category": "classroom_management"
            }

        # Rule 2: Attention dip (< 50% attentive)
        if attentive_pct < 50.0:
            return {
                "rule_id": "RULE_ATTENTION_DIP",
                "title": "Attention Dip Alert",
                "observation": f"Only {int(attentive_pct)}% of detected students ({attentive_count}/{detected_count}) have forward visual gaze.",
                "suggestion": "Attention has fallen below 50%. Ask an interactive question, run a show-of-hands vote, or switch to a multimedia slide.",
                "urgency": "medium",
                "category": "pacing"
            }

        # Rule 3: Monologue / Lecture Fatigue
        if audio_state == "continuous_speech" and attentive_pct < 70.0:
            return {
                "rule_id": "RULE_MONOLOGUE_PACING",
                "title": "Lecture Pacing Suggestion",
                "observation": "Sustained one-way audio detected while student eye-contact has dropped below 70%.",
                "suggestion": "Pause the lecture for a 60-second peer discussion ('Think-Pair-Share') to let students process the material.",
                "urgency": "medium",
                "category": "instruction"
            }

        # Rule 4: High focus momentum
        if attentive_pct >= 80.0:
            return {
                "rule_id": "RULE_HIGH_ENGAGEMENT",
                "title": "High Engagement Momentum",
                "observation": f"Strong visual focus: {int(attentive_pct)}% of students ({attentive_count}/{detected_count}) actively facing the presentation.",
                "suggestion": "Excellent focus detected. This is a prime window to introduce the most challenging core concept or problem set.",
                "urgency": "low",
                "category": "pedagogy"
            }

        # Default steady state
        return {
            "rule_id": "RULE_STEADY_ENGAGEMENT",
            "title": "Engagement Stable",
            "observation": f"Engagement is moderate ({int(attentive_pct)}% attentive, audio in normal conversational range).",
            "suggestion": "Keep up the current teaching pace. Monitor periodically for topic transition cues.",
            "urgency": "low",
            "category": "general"
        }

suggestion_engine = SuggestionEngine()

