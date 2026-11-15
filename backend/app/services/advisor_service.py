import json

from backend.app.config import EARTHSHIFT_DEMO_MODE
from backend.app.schemas.intelligence import AdvisorRequest, AdvisorResponse
from backend.app.services.gemini_service import generate_gemini_response


def generate_demo_response(data: AdvisorRequest) -> AdvisorResponse:
    return AdvisorResponse(
        resumen=(
            "MODO DEMOSTRACION: esta respuesta es simulada. "
            "No constituye un analisis ambiental de Piura ni "
            "una interpretacion de datos cientificos reales."
        ),
        hallazgos=[
            "La solicitud fue recibida correctamente por EarthShift Advisor.",
            "La region indicada es: " + data.region,
            "El periodo indicado es: " + data.period,
            "No se evaluaron resultados ambientales reales."
        ],
        puntos_atencion=[
            "Los resultados recibidos corresponden a una prueba de demostracion.",
            "No se deben utilizar estos resultados para tomar decisiones ambientales."
        ],
        recomendaciones=[
            "Conectar los resultados reales de los motores cientificos de EarthShift.",
            "Verificar la calidad y cobertura temporal de los datos antes de interpretarlos."
        ],
        siguientes_pasos=[
            "Integrar los resultados de los motores cientificos.",
            "Desactivar el modo demostracion para utilizar Gemini."
        ],
        limitaciones=[
            "Respuesta generada por el modo demostracion.",
            "No se realizaron calculos estadisticos ni inferencias ambientales.",
            "No se consulto Google Gemini."
        ]
    )


def analyze_with_advisor(data: AdvisorRequest) -> AdvisorResponse:
    """
    Interpreta resultados cientificos mediante EarthShift Advisor.
    """

    if EARTHSHIFT_DEMO_MODE:
        return generate_demo_response(data)

    scientific_context = {
        "region": data.region,
        "period": data.period,
        "engine_results": data.engine_results,
        "statistics": data.statistics,
    }

    prompt = f"""
Eres EarthShift Advisor, un asistente especializado en
interpretacion de datos ambientales y analisis cientifico.

Tu funcion es interpretar los resultados proporcionados por
los motores cientificos de EarthShift.

CONTEXTO CIENTIFICO:
{json.dumps(scientific_context, ensure_ascii=False, indent=2)}

REGLAS OBLIGATORIAS:

1. No inventes valores, estadisticas, fechas ni observaciones.
2. No modifiques ni recalcules los resultados de los motores.
3. Diferencia los datos observados de las interpretaciones.
4. No afirmes causalidad basandote solo en correlaciones
   o coincidencias temporales.
5. Si faltan datos, indicalo expresamente.
6. No presentes hipotesis como hechos comprobados.
7. Formula recomendaciones relacionadas con la evidencia.
8. Identifica limitaciones e incertidumbres.
9. Utiliza lenguaje cientifico, claro y comprensible.
10. Responde exclusivamente en espanol.
11. Devuelve unicamente un JSON valido.

Estructura requerida:

{{
    "resumen": "Interpretacion general de los resultados",
    "hallazgos": [],
    "puntos_atencion": [],
    "recomendaciones": [],
    "siguientes_pasos": [],
    "limitaciones": []
}}
"""

    response_text = generate_gemini_response(prompt)

    try:
        result = json.loads(response_text)
        return AdvisorResponse(**result)
    except (json.JSONDecodeError, ValueError) as error:
        raise RuntimeError(
            f"No se pudo interpretar correctamente la respuesta de Gemini: {error}"
        ) from error

