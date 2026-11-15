# EarthShift — Guía de ejecución para cinco integrantes

**Dos en desarrollo web · NASA Space Apps Challenge 2026**
Piloto: **Piura, Perú** · Actualización: **14 de noviembre de 2026**

Documento operativo para trabajo paralelo. Mantiene el alcance integral: análisis ambiental multivariable y los tres motores **Earth Paradox**, **Silent Collapse** y **Decision Reversal**.

---

## 1. Proyecto y alcance que NO se modifica

EarthShift integra observaciones históricas y espaciales de NASA para identificar tendencias cuantificables, anomalías, contradicciones entre indicadores, deterioros lentos y cambios en las conclusiones cuando se incorporan varias variables. Presenta evidencia, incertidumbre y zonas de atención en un mapa interactivo.

- **Earth Paradox:** diferencias o contradicciones relevantes entre indicadores ambientales; una contradicción no equivale por sí sola a un desastre.
- **Silent Collapse:** señales graduales, persistentes y acumulativas, con control de estacionalidad y calidad.
- **Decision Reversal:** comparar la conclusión con una sola variable frente a una evaluación multivariable y explicar el cambio.
- **Piloto Piura**; arquitectura reutilizable en otras regiones. La vegetación es una variable, **NO** el objetivo único.
- **Ampliaciones de segundo plano:** análisis especializado de El Niño/La Niña y adaptación metodológica a Marte.

## 2. Equipo: responsabilidades y límites

| Persona | Área | Responsabilidad principal |
| --- | --- | --- |
| 1 | Web — frontend | React/Vite, UX, mapa, gráficos, tres vistas de motores, filtros y detalle de hallazgos |
| 2 | Web — backend/API | FastAPI, endpoints, integración frontend, caché/consultas, validación y rendimiento |
| 3 | Datos NASA | Inventario de productos, autenticación, descarga por API y procedencia de fuentes |
| 4 | Procesamiento y estadística | QA, escalas, espacio/tiempo, tendencias, significancia, anomalías y calidad |
| 5 | Motores EarthShift | Earth Paradox, Silent Collapse, Decision Reversal, reglas de alerta, validación científica |

**Responsabilidad transversal:** TODOS prueban su módulo, documentan decisiones y participan en la demo.

**Coordinación:** la persona 2 coordina el contrato de API; la persona 5 la definición de hallazgos; la persona 3 es responsable de la procedencia; la persona 4 de la consistencia científica.

## 3. Fuentes y variables del proyecto

| Variable | Producto NASA candidato | Observación |
| --- | --- | --- |
| Vegetación | `MOD13Q1` v061 (Terra) | NDVI, EVI, QA; compuestos 16 días; desde 2000 |
| Precipitación | GPM `IMERG` | Revisar producto mensual y periodo de cobertura por versión |
| Temperatura superficial | MODIS LST (p. ej. `MOD11`) | No equivale a temperatura del aire |
| Humedad del suelo | SMAP | Cobertura temporal posterior a MODIS; resolución diferente |

Los productos y APIs son candidatos técnicos: comprobar documentación, versiones, licencias, límites, autenticación, disponibilidad y cobertura.

**AppEEARS** puede servir para subconjuntos MODIS; **Earthdata CMR** sirve para descubrir colecciones/gránulos. La API no realiza automáticamente la inferencia científica.

## 4. Acuerdos científicos y técnicos comunes

- **Piloto técnico inicial:** oeste `−81.3`, sur `−5.8`, este `−80.3`, norte `−4.8`. Es un rectángulo aproximado, **no** el límite administrativo de Piura.
- **GeoJSON:** `EPSG:4326` con orden `[longitud, latitud]`. Para interfaces que piden `latitud, longitud`, invertir el orden explícitamente.
- Mantener **originales sin alterar** y almacenar producto, versión, fecha, unidades, escala, QA, resolución, fuente y fecha de adquisición.
- Trabajar una **cuadrícula común** y **agregación mensual** para comparaciones; conservar datos originales y documentar remuestreo y cobertura.
- **No interpolar o inventar observaciones silenciosamente.** Distinguir *sin datos*, *baja calidad* y *ausencia de anomalía*.
- Las **alertas** significan prioridad de revisión basada en evidencia; no predicción comprobada de desastre ni causalidad.

## 5. Arquitectura y carpetas

```
NASA APIs → ingesta → originales/metadatos → limpieza y armonización →
series por celda → estadística → tres motores → FastAPI → React/Leaflet y gráficos
```

```
earthshift/
  frontend/                React + Vite
  backend/app/             FastAPI, rutas y esquemas
  backend/connectors/      clientes NASA (persona 3)
  backend/processing/      limpieza, QA, armonización (persona 4)
  backend/analysis/        tendencias y anomalías (persona 4)
  backend/engines/         tres motores y alertas (persona 5)
  tests/                   pruebas por módulo
  docs/                    catálogo, metodología, contrato y demo
  data/                    archivos locales ignorados por Git
```
