
import json

from backend.app.services.gemini_service import generate_gemini_response


def interpret_phenomena(
    investigation: dict,
) -> dict:
    """
    Interpreta las evidencias obtenidas por EarthShift Phenomena.

    Gemini no calcula índices, no modifica los datos NOAA
    y no establece causalidad a partir de coincidencias temporales.
    """

    if not isinstance(investigation, dict):
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

    context = {
        "region": investigation["region"],
        "period": investigation["period"],
        "phenomena": investigation["phenomena"],
        "temporal_comparisons": investigation["temporal_comparisons"],
        "evidence": investigation["evidence"],
        "limitations": investigation["limitations"],
        "sources": investigation["sources"],
    }

    prompt = f"""
Eres el modulo de interpretacion cientifica de EarthShift Phenomena.

Tu tarea es interpretar evidencias ambientales y posibles relaciones
temporales entre fenomenos climaticos y anomalías detectadas por EarthShift.

REGLAS CIENTIFICAS OBLIGATORIAS:

1. No inventes datos, fechas, valores ni fuentes.
2. No modifiques ni recalcules los valores proporcionados.
3. No afirmes causalidad a partir de coincidencias temporales.
4. Distingue hechos observados, coincidencias e hipotesis.
5. RONI es un indice oceanico del Pacifico tropical.
6. No atribuyas automaticamente impactos locales a Piura.
7. Si no existen comparaciones temporales, indicalo expresamente.
8. Reconoce las limitaciones de los datos.
9. Utiliza un lenguaje cientifico claro y comprensible.
10. No presentes una hipotesis como un hecho demostrado.

DATOS DE LA INVESTIGACION:

{json.dumps(context, ensure_ascii=False, indent=2)}

RESPONDE EXCLUSIVAMENTE CON UN OBJETO JSON VALIDO
Y UTILIZA ESTA ESTRUCTURA:

{{
    "status": "completed",
    "summary": "Interpretacion general de las evidencias",
    "findings": [
        "Hallazgo respaldado por los datos"
    ],
    "possible_relationships": [
        {{
            "phenomenon": "Nombre del fenomeno",
            "observation": "Coincidencia observada",
            "interpretation": "Interpretacion prudente",
            "causality_established": false
        }}
    ],
    "limitations": [
        "Limitacion cientifica"
    ],
    "research_questions": [
        "Pregunta para futuras investigaciones"
    ]
}}
"""

    raw_response = generate_gemini_response(prompt)

    try:
        result = json.loads(raw_response)
    except json.JSONDecodeError as error:
        raise RuntimeError(
            "Gemini devolvio una respuesta que no contiene JSON valido."
        ) from error

    if not isinstance(result, dict):
        raise RuntimeError(
            "La respuesta de Gemini no tiene el formato esperado."
        )

    expected_fields = [
        "status",
        "summary",
        "findings",
        "possible_relationships",
        "limitations",
        "research_questions",
    ]

    for field in expected_fields:
        if field not in result:
            raise RuntimeError(
                f"Gemini no devolvio el campo requerido: {field}"
            )

    return result
