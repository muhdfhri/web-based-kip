import unittest
from datetime import datetime, timezone

from core.decision_engine import MajorityDecisionEngine


CONFIG = {
    "decision": {
        "window_seconds": 60,
        "minimum_detections": 3,
        "tie_break_priority": ["ripe", "unripe", "overripe"],
    },
    "recipes": {
        "ripe": {"recipe_code": "R", "recipe_name": "Ripe", "parameters": {}},
        "unripe": {"recipe_code": "U", "recipe_name": "Unripe", "parameters": {}},
        "overripe": {"recipe_code": "O", "recipe_name": "Overripe", "parameters": {}},
    },
}


class MajorityDecisionEngineTest(unittest.TestCase):
    def test_majority_selects_recipe(self):
        engine = MajorityDecisionEngine()
        now = datetime.now(timezone.utc)
        engine.add(1, [{"category": "ripe"}, {"category": "ripe"}, {"category": "unripe"}], now)
        result = engine.decide(1, "CAM-L1", CONFIG, "test-model", now)
        self.assertEqual(result["majority_category"], "RIPE")
        self.assertEqual(result["recommended_recipe_code"], "R")
        self.assertEqual(result["decision_status"], "READY")

    def test_insufficient_data_has_no_recipe(self):
        engine = MajorityDecisionEngine()
        now = datetime.now(timezone.utc)
        engine.add(1, [{"category": "overripe"}], now)
        result = engine.decide(1, "CAM-L1", CONFIG, "test-model", now)
        self.assertEqual(result["majority_category"], "INSUFFICIENT_DATA")
        self.assertIsNone(result["recommended_recipe_code"])


if __name__ == "__main__":
    unittest.main()

