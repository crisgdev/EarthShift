import json

from groq import Groq

from backend.app.config import (
    GROQ_API_KEY,
    GROQ_MODEL,
)


def generate_groq_response(
    prompt: str,
) -> str:

    if not GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY no esta configurada."
        )

    client = Groq(
        api_key=GROQ_API_KEY
    )

    try:
        response = (
            client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Eres EarthShift Advisor. "
                            "Debes interpretar resultados "
                            "cientificos sin modificar, "
                            "recalcular ni inventar datos. "
                            "Responde siempre en espanol "
                            "y devuelve exclusivamente "
                            "JSON valido."
                        ),
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
                temperature=0.2,
                response_format={
                    "type": "json_object"
                },
            )
        )

    except Exception as error:
        raise RuntimeError(
            "No se pudo obtener respuesta "
            f"de Groq: {error}"
        ) from error

    if not response.choices:
        raise RuntimeError(
            "Groq no devolvio ninguna respuesta."
        )

    content = (
        response
        .choices[0]
        .message
        .content
    )

    if not content:
        raise RuntimeError(
            "Groq devolvio una respuesta vacia."
        )

    try:
        json.loads(content)

    except json.JSONDecodeError as error:
        raise RuntimeError(
            "Groq no devolvio JSON valido."
        ) from error

    return content