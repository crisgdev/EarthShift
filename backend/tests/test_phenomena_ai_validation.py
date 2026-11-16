import pytest

from backend.app.services import phenomena_ai_service


def interpretation():
    return {
        "status": "completed",
        "summary": "Coincidencia temporal descriptiva.",
        "findings": ["Observacion"],
        "possible_relationships": [{
            "phenomenon": "El Nino",
            "observation": "Coincidencia temporal",
            "interpretation": "No demuestra causalidad",
            "causality_established": False,
        }],
        "limitations": ["Cobertura espacial distinta"],
        "research_questions": [],
    }


@pytest.mark.parametrize("field,value", [
    ("summary", 42),
    ("findings", "texto"),
    ("findings", [42]),
    ("possible_relationships", {}),
    ("limitations", None),
    ("research_questions", "texto"),
    ("status", "pending"),
])
def test_rejects_malformed_ai_fields(monkeypatch, field, value):
    import json
    result = interpretation()
    result[field] = value
    monkeypatch.setattr(phenomena_ai_service, "generate_groq_response", lambda _: json.dumps(result))
    with pytest.raises(RuntimeError):
        phenomena_ai_service.interpret_phenomena(investigation())


def investigation():
    return dict(region="BajoPiura", period="2000-2023", phenomena=[],
                temporal_comparisons=[], evidence=[], limitations=[], sources=[])


def test_accepts_typed_interpretation(monkeypatch):
    import json
    result = interpretation()
    monkeypatch.setattr(phenomena_ai_service, "generate_groq_response", lambda _: json.dumps(result))
    assert phenomena_ai_service.interpret_phenomena(investigation()) == result


def test_rejects_causal_claim_flag(monkeypatch):
    import json
    result = interpretation()
    result["possible_relationships"][0]["causality_established"] = True
    monkeypatch.setattr(phenomena_ai_service, "generate_groq_response", lambda _: json.dumps(result))
    with pytest.raises(RuntimeError):
        phenomena_ai_service.interpret_phenomena(investigation())
