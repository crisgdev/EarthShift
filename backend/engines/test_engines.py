from backend.app.services.engine_adapter import (
    build_engine_payload,
)

from backend.engines.paradox import (
    detect_paradox,
)

from backend.engines.collapse import (
    detect_collapse,
)

from backend.engines.reversal import (
    detect_reversal,
)


VALID_LEVELS = {
    "normal",
    "observar",
    "investigar",
    "sin datos",
}


def test_earth_paradox_with_real_payload():
    payload = build_engine_payload(
        "BajoPiura"
    )

    result = detect_paradox(
        payload
    )

    assert isinstance(
        result,
        dict,
    )

    assert (
        result["level"]
        in VALID_LEVELS
    )

    assert "evidence" in result
    assert "explanation" in result
    assert "limitations" in result


def test_silent_collapse_with_real_payload():
    payload = build_engine_payload(
        "BajoPiura"
    )

    result = detect_collapse(
        payload
    )

    assert isinstance(
        result,
        dict,
    )

    assert (
        result["level"]
        in VALID_LEVELS
    )

    assert "evidence" in result
    assert "explanation" in result
    assert "limitations" in result


def test_decision_reversal_with_real_payload():
    payload = build_engine_payload(
        "BajoPiura"
    )

    result = detect_reversal(
        payload
    )

    assert isinstance(
        result,
        dict,
    )

    assert (
        result["level"]
        in VALID_LEVELS
    )

    assert "evidence" in result
    assert "explanation" in result
    assert "limitations" in result

    assert "reversal_detected" in result
    assert "univariable_level" in result
    assert "multivariable_level" in result


def test_real_payload_does_not_return_missing_data():
    payload = build_engine_payload(
        "BajoPiura"
    )

    results = [
        detect_paradox(
            payload
        ),
        detect_collapse(
            payload
        ),
        detect_reversal(
            payload
        ),
    ]

    for result in results:
        assert (
            result["level"]
            != "sin datos"
        )


def test_real_payload_has_evidence():
    payload = build_engine_payload(
        "BajoPiura"
    )

    results = [
        detect_paradox(
            payload
        ),
        detect_collapse(
            payload
        ),
        detect_reversal(
            payload
        ),
    ]

    for result in results:
        assert isinstance(
            result["evidence"],
            dict,
        )

        assert len(
            result["evidence"]
        ) > 0