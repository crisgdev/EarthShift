from fastapi import FastAPI
from fastapi.middleware.cors import (
    CORSMiddleware,
)

from backend.app.routes.findings import (
    router as findings_router,
)

from backend.app.routes.data import (
    router as data_router,
)


app = FastAPI(
    title="EarthShift API",
    description=(
        "Backend API para EarthShift"
    ),
    version="0.2.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
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


@app.get("/")
def root():
    return {
        "project": "EarthShift",
        "status": "ok",
        "version": "0.2.0",
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "EarthShift API",
        "version": "0.2.0",
    }