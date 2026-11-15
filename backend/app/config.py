import os


APP_NAME = "EarthShift API"

APP_VERSION = "0.3.0"


CACHE_TTL_SECONDS = int(
    os.getenv(
        "EARTHSHIFT_CACHE_TTL_SECONDS",
        "300",
    )
)


NASA_TIMEOUT_SECONDS = int(
    os.getenv(
        "EARTHSHIFT_NASA_TIMEOUT_SECONDS",
        "15",
    )
)


FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "EARTHSHIFT_FRONTEND_ORIGINS",
        (
            "http://localhost:3000,"
            "http://127.0.0.1:3000,"
            "http://localhost:5173,"
            "http://127.0.0.1:5173"
        ),
    ).split(",")
    if origin.strip()
]

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
EARTHSHIFT_DEMO_MODE = os.getenv("EARTHSHIFT_DEMO_MODE", "false").lower() == "true"
EARTHSHIFT_PHENOMENA_AI_ENABLED = os.getenv("EARTHSHIFT_PHENOMENA_AI_ENABLED", "false").lower() == "true"
