from pydantic import ValidationError
from backend.app.schemas.phenomena import PhenomenaInterpretation
import json
from collections import Counter

from backend.app.services.groq_service import (
    generate_groq_response,
)


def _summarize_phenomena(
    phenomena: list,
) -> dict:
    valid = [
        item
        for item in phenomena
        if isinstance(item, dict)
    ]

    counts = Counter(
        item.get("phenomenon", "desconocido")
        for item in valid
    )

    strongest = sorted(
        valid,
        key=lambda item: abs(
            item.get("peak_anomaly_c") or 0
        ),
        reverse=True,
    )[:6]

    return {
        "total_events": len(valid),
        "events_by_type": dict(counts),
        "strongest_events": [
            {
                "phenomenon":
                    item.get("phenomenon"),
                "start_date":
                    item.get("start_date"),
                "end_date":
                    item.get("end_date"),
                "peak_anomaly_c":
                    item.get("peak_anomaly_c"),
                "index":
                    item.get("index"),
                "source":
                    item.get("source"),
            }
            for item in strongest
        ],
    }


def _summarize_comparisons(
    comparisons: list,
) -> dict:
    valid = [
        item
        for item in comparisons
        if isinstance(item, dict)
    ]

    by_phenomenon = Counter(
        item.get(
            "phenomenon",
            "desconocido",
        )
        for item in valid
    )

    negative = [
        item
        for item in valid
        if isinstance(
            item.get("anomaly_value"),
            (int, float),
        )
        and item["anomaly_value"] < 0
    ]

    positive = [
        item
        for item in valid
        if isinstance(
            item.get("anomaly_value"),
            (int, float),
        )
        and item["anomaly_value"] > 0
    ]

    ordered = sorted(
        valid,
        key=lambda item: abs(
            item.get("anomaly_value") or 0
        ),
        reverse=True,
    )

    representative = ordered[:8]

    return {
        "total_comparisons":
            len(valid),

        "comparisons_by_phenomenon":
            dict(by_phenomenon),

        "negative_anomalies":
            len(negative),

        "positive_anomalies":
            len(positive),

        "all_causality_established_false":
            all(
                item.get(
                    "causality_established"
                ) is False
                for item in valid
            ),

        "representative_comparisons": [
            {
                "anomaly_start":
                    item.get("anomaly_start"),

                "anomaly_end":
                    item.get("anomaly_end"),

                "variable":
                    item.get("variable"),

                "anomaly_value":
                    item.get("anomaly_value"),

                "unit":
                    item.get("unit"),

                "phenomenon":
                    item.get("phenomenon"),

                "event_start":
                    item.get("event_start"),

                "event_end":
                    item.get("event_end"),

                "temporal_overlap":
                    item.get(
                        "temporal_overlap"
                    ),

                "causality_established":
                    False,
            }
            for item in representative
        ],
    }


def interpret_phenomena(
    investigation: dict,
) -> dict:
    """
    Interpreta EarthShift Phenomena con Groq.

    La IA recibe un resumen compacto de los
    resultados ya calculados. No modifica,
    recalcula ni reemplaza los datos cientificos.
    """

    if not isinstance(
        investigation,
        dict,
    ):
        raise ValueError(
            "La investigacion debe ser un objeto."
        )

    required_fields = [
        "region",
        "period",
        "phenomena",
        "temporal_comparisons",
        "evidence",
        "limitations",
        "sources",
    ]

    for field in required_fields:
        if field not in investigation:
            raise ValueError(
                f"Falta el campo requerido: {field}"
            )

    phenomena = investigation.get(
        "phenomena",
        [],
    )

    comparisons = investigation.get(
        "temporal_comparisons",
        [],
    )

    context = {
        "region":
            investigation["region"],

        "period":
            investigation["period"],

        "phenomena_summary":
            _summarize_phenomena(
                phenomena
                if isinstance(
                    phenomena,
                    list,
                )
                else []
            ),

        "temporal_summary":
            _summarize_comparisons(
                comparisons
                if isinstance(
                    comparisons,
                    list,
                )
                else []
            ),

        "evidence":
            investigation.get(
                "evidence",
                [],
            ),

        "limitations":
            investigation.get(
                "limitations",
                [],
            ),

        "sources":
            investigation.get(
                "sources",
                [],
            ),
    }

    prompt = f"""
Eres EarthShift Phenomena.

Interpreta exclusivamente los datos cientificos
ya calculados que aparecen abajo.

REGLAS OBLIGATORIAS:

- No inventes datos.
- No recalcules valores.
- No cambies valores.
- No afirmes causalidad.
- Coincidencia temporal no significa causalidad.
- RONI describe condiciones oceanicas del
  Pacifico tropical.
- No atribuyas automaticamente impactos
  locales a Piura.
- Distingue observaciones de hipotesis.
- Reconoce las limitaciones.
- Responde en espanol.
- Devuelve solamente JSON valido.

CONTEXTO:

{json.dumps(
    context,
    ensure_ascii=False,
    separators=(",", ":"),
)}

FORMATO:

{{
  "status": "completed",
  "summary": "Resumen prudente",
  "findings": [
    "Hallazgo respaldado por los datos"
  ],
  "possible_relationships": [
    {{
      "phenomenon": "Nombre",
      "observation": "Coincidencia observada",
      "interpretation": "Interpretacion prudente",
      "causality_established": false
    }}
  ],
  "limitations": [
    "Limitacion"
  ],
  "research_questions": [
    "Pregunta futura"
  ]
}}
"""

    raw_response = generate_groq_response(
        prompt
    )

    try:
        result = json.loads(
            raw_response
        )

    except json.JSONDecodeError as error:
        raise RuntimeError(
            "Groq no devolvio JSON valido."
        ) from error

    try:
        return PhenomenaInterpretation.model_validate(result).model_dump()
    except ValidationError as error:
        raise RuntimeError("Groq devolvio una interpretacion con estructura invalida.") from error
