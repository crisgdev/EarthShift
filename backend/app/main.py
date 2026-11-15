import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import (
    APP_NAME,
    APP_VERSION,
    FRONTEND_ORIGINS,
)

from backend.app.routes.data import (
    router as data_router,
)

from backend.app.routes.findings import (
    router as findings_router,
)

from backend.app.routes.nasa import (
    router as nasa_router,
)

from backend.app.routes.intelligence import (
    router as intelligence_router,
)

from backend.app.routes.phenomena import (
    router as phenomena_router,
)


logging.basicConfig(
    level=logging.INFO,
    format=(
        "%(asctime)s | "
        "%(levelname)s | "
        "%(name)s | "
        "%(message)s"
    ),
)


logger = logging.getLogger(
    "earthshift"
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "EarthShift API iniciada"
    )

    yield

    logger.info(
        "EarthShift API detenida"
    )


app = FastAPI(
    title=APP_NAME,
    description="Backend API para EarthShift",
    version=APP_VERSION,
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    findings_router,
    prefix="/api",
)

app.include_router(
    data_router,
    prefix="/api",
)

app.include_router(
    nasa_router,
    prefix="/api",
)

app.include_router(
    intelligence_router,
)

app.include_router(
    phenomena_router,
)


@app.get("/")
def root():
    return {
        "project": "EarthShift",
        "status": "ok",
        "version": APP_VERSION,
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": APP_NAME,
        "version": APP_VERSION,
    }