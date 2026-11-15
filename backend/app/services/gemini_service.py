from backend.app.config import GEMINI_API_KEY, GEMINI_MODEL


def generate_gemini_response(prompt: str) -> str:
    """Send a prompt to Gemini without making Gemini a startup dependency."""
    if not GEMINI_API_KEY:
        raise RuntimeError("No se ha configurado GEMINI_API_KEY en el archivo .env")

    try:
        from google import genai
    except ImportError as error:
        raise RuntimeError(
            "La dependencia google-genai no esta instalada. Los resultados cientificos siguen disponibles."
        ) from error

    client = genai.Client(api_key=GEMINI_API_KEY)
    response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
    if not response.text:
        raise RuntimeError("Gemini no devolvio una respuesta.")
    return response.text
