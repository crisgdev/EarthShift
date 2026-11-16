# EarthShift

EarthShift es una aplicación para analizar series ambientales multivariables y detectar patrones que requieren revisión.

Proyecto desarrollado para NASA Space Apps Challenge 2026.

Piloto actual:

Piura, Perú.

---

## Arquitectura

EarthShift utiliza el siguiente flujo:

NASA / fuentes ambientales
→ adquisición
→ procesamiento
→ control de calidad
→ armonización
→ series temporales
→ análisis estadístico
→ motores EarthShift
→ FastAPI
→ frontend React

---

## Fuentes principales

### Vegetación

NASA Terra MODIS

Producto:

MOD13Q1.061

Variables:

- NDVI
- EVI
- QA

Resolución:

250 m

Resolución temporal:

16 días

El repositorio contiene scripts de procesamiento y manifiestos QA que permiten rastrear la procedencia del NDVI utilizado por los motores.

---

### Precipitación

NASA GPM IMERG

Producto:

GPM_3IMERGM

Versión:

07

Variable:

precipitación

El repositorio contiene scripts de descarga y procesamiento asociados a la serie utilizada.

La precipitación corresponde actualmente a una serie regional general de Piura.

Por ello:

spatial_match = approximate

No debe interpretarse como una observación exacta de cada zona MODIS.

---

## APIs NASA auxiliares

EarthShift también dispone de conectores reales y verificados para:

NASA POWER

NASA EONET

Endpoints:

/api/nasa/power

/api/nasa/eonet

Catálogo NASA:

/api/nasa/catalog

---

## Motores EarthShift

### Earth Paradox

Busca divergencias entre variables ambientales.

No demuestra causalidad.

### Silent Collapse

Analiza:

- tendencia
- persistencia
- cambio acumulado
- ventanas temporales
- anomalías
- déficit acumulado

### Decision Reversal

Compara una clasificación univariable contra una evaluación multivariable.

---

## Niveles

Los motores utilizan:

normal

observar

investigar

sin datos

normal significa que las reglas actuales no activaron una señal.

No significa que el ecosistema esté necesariamente sano.

sin datos nunca debe convertirse automáticamente en normal.

---

## Backend

Desde la raíz del proyecto:

```bash
py -m pip install -r requirements.txt
py -m uvicorn backend.app.main:app --reload --port 8000
```

En otra terminal:

```bash
cd frontend
npm ci
npm run dev
```

## Despliegue automático

El frontend se prepara para Vercel y FastAPI para Render, ambos conectados a GitHub.
`main` corresponde a producción; las otras ramas pueden generar previews del frontend.

La configuración de cuentas, variables, desarrollo local y verificación pública está
en [docs/deployment.md](docs/deployment.md). En Vercel, la raíz del proyecto es
`frontend` y `EARTHSHIFT_BACKEND_URL` debe contener la URL pública HTTPS de FastAPI
en los entornos Production y Preview. Las claves de Groq solo se configuran en el backend.
