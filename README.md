# EarthShift

**Detectando cambios ambientales que pasan desapercibidos.**

Plataforma web que integra observaciones históricas y espaciales de la NASA para identificar tendencias cuantificables, anomalías, contradicciones entre indicadores, deterioros lentos y cambios en las conclusiones cuando se incorporan varias variables. Presenta evidencia, incertidumbre y zonas de atención en un mapa interactivo.

> 🚧 **Proyecto en construcción** — NASA Space Apps Challenge 2026 · Reto *Be an Earth System Trend Detective!*
> **Piloto:** Piura, Perú · **Actualización:** 14 de noviembre de 2026

---

## El problema

Los cambios ambientales no siempre son evidentes. En el **piloto de Piura**, un indicador puede deteriorarse de forma progresiva mientras otros no muestran una variación equivalente.

Esa **contradicción entre señales** oculta transformaciones del ecosistema y retrasa la identificación temprana de zonas vulnerables. Analizar cada variable por separado no permite verla; hay que leerlas en conjunto.

## Pregunta central de investigación

> ¿En qué medida la evolución de los indicadores ambientales en Piura presenta comportamientos inesperados —tendencias, anomalías o contradicciones entre variables— y cómo pueden estos hallazgos contribuir a identificar zonas que requieren atención ambiental preventiva?

## Propuesta de solución

EarthShift convierte los datos históricos del Sistema Tierra en **evidencia comprensible** para responder qué está cambiando, dónde, cuánto y qué decisiones pueden tomarse.

La plataforma se organiza en tres motores de análisis:

| Motor | Pregunta que responde | Qué hace |
| --- | --- | --- |
| **Earth Paradox** | ¿Dónde se contradicen los indicadores? | Identifica diferencias o contradicciones relevantes entre indicadores ambientales. Una contradicción no equivale por sí sola a un desastre. |
| **Silent Collapse** | ¿Dónde se está agotando la capacidad de recuperación? | Busca señales graduales, persistentes y acumulativas de deterioro, con control de estacionalidad y calidad de datos. |
| **Decision Reversal** | ¿Esto cambia las prioridades? | Compara la conclusión con una sola variable frente a una evaluación multivariable y explica por qué cambia. |

**La vegetación es una variable, no el objetivo único.** El alcance se mantiene integral: análisis ambiental multivariable con evidencia, incertidumbre y priorización de zonas.

## Alcance

| Dimensión | Definición |
| --- | --- |
| **¿Qué cambia?** | Tendencias, anomalías, contradicciones entre indicadores y señales de deterioro lento en el sistema ambiental. |
| **¿Dónde?** | **Piloto Piura, Perú**, con arquitectura reutilizable en otras regiones. |
| **¿Cuánto?** | Magnitud y velocidad del cambio, con significancia estadística y control de calidad (ver [Indicadores](#indicadores)). |
| **¿Para quién?** | Investigadores y científicos ambientales · autoridades y organismos de gestión ambiental · organizaciones de conservación · comunidades y sectores productivos de la región. |
| **¿Para qué?** | Detectar tempranamente transformaciones que pasan desapercibidas al analizar cada variable por separado, y aportar evidencia para priorizar zonas de atención y orientar decisiones preventivas. |

> **Ampliaciones de segundo plano:** análisis especializado de El Niño/La Niña y adaptación metodológica a Marte.

## Variables y fuentes de datos

Productos candidatos de la NASA. Hay que comprobar documentación, versiones, licencias, límites, autenticación, disponibilidad y cobertura antes de usarlos.

| Variable | Producto NASA | Observación |
| --- | --- | --- |
| Vegetación | `MOD13Q1` v061 (Terra) | NDVI, EVI y QA; compuestos de 16 días; desde 2000. |
| Precipitación | GPM `IMERG` | Revisar producto mensual y periodo de cobertura por versión. |
| Temperatura superficial | MODIS LST (`MOD11A2`) | **No** equivale a temperatura del aire. |
| Humedad del suelo | GLDAS / SMAP | Cobertura temporal posterior a MODIS; resolución diferente. |

Los productos y APIs son candidatos técnicos. **AppEEARS** sirve para subconjuntos MODIS y **Earthdata CMR** para descubrir colecciones/gránulos. La API no realiza automáticamente la inferencia científica.

## Indicadores

| Indicador | Qué mide |
| --- | --- |
| **Δ NDVI / EVI** | Cambios en la condición y productividad de la vegetación. |
| **Precipitación acumulada** | Variaciones de las lluvias a lo largo del tiempo. |
| **Humedad del suelo** | Disponibilidad de agua en el suelo y su tendencia. |
| **Temperatura superficial** | Condición térmica de la superficie (no temperatura del aire). |
| **Anomalías ambientales** | Frecuencia e intensidad de eventos fuera de rango. |
| **Significancia estadística** | Robustez de las tendencias identificadas (p. ej. Mann–Kendall, pendiente de Sen). |

**Periodo de estudio:** 2000–2026, sujeto a la disponibilidad y compatibilidad de cada producto.

## Acuerdos científicos y técnicos

- **Área piloto:** oeste `−81.3`, sur `−5.8`, este `−80.3`, norte `−4.8`. Es un rectángulo aproximado, **no** el límite administrativo de Piura.
- **GeoJSON:** `EPSG:4326` con orden `[longitud, latitud]`. Si una interfaz pide `latitud, longitud`, invertir el orden explícitamente.
- **Trazabilidad:** conservar los originales sin alterar y registrar producto, versión, fecha, unidades, escala, QA, resolución, fuente y fecha de adquisición.
- **Comparabilidad:** trabajo sobre una cuadrícula común y agregación mensual; conservar los datos originales y documentar remuestreo y cobertura.
- **Sin invención de datos:** no interpolar ni inventar observaciones silenciosamente. Distinguir *sin datos*, *baja calidad* y *ausencia de anomalía*.
- **Alertas:** significan prioridad de revisión basada en evidencia; no son predicción comprobada de desastre ni causalidad.

## Metodología

```
NASA APIs → ingesta → originales/metadatos → limpieza y armonización →
series por celda → estadística → tres motores → FastAPI → React/Leaflet y gráficos
```

1. **Definición de áreas de estudio** — zonas comparables y estables dentro del área piloto.
2. **Ingesta y armonización** — descarga, recorte espacial y alineación temporal de las series.
3. **Control de calidad** — enmascarado según QA, tratamiento de huecos y normalización de anomalías.
4. **Análisis de tendencias** — regresión estacional, Mann–Kendall, pendiente de Sen.
5. **Detección de contradicciones** — correlación y desacople entre indicadores (Earth Paradox).
6. **Resiliencia** — memoria temporal / autocorrelación y recuperación tras anomalías (Silent Collapse).
7. **Priorización** — ranking de zonas e interpretación para decisiones preventivas (Decision Reversal).

> Las conclusiones dependen de los resultados con datos reales. El proyecto no asume de antemano que exista una contradicción: la busca y la mide.

## Arquitectura y estructura del repositorio

```
EarthShift/
├── README.md
├── frontend/                # React + Vite
├── backend/
│   ├── app/                 # FastAPI, rutas y esquemas
│   ├── connectors/          # clientes NASA
│   ├── processing/          # limpieza, QA y armonización
│   ├── analysis/            # tendencias y anomalías
│   └── engines/             # tres motores y reglas de alerta
├── tests/                   # pruebas por módulo
├── docs/                    # catálogo, metodología, contrato de API y demo
└── data/                    # archivos locales (ignorados por Git)
```

## Equipo y roles

Cinco integrantes, trabajo paralelo. Responsabilidad transversal: **todos** prueban su módulo, documentan decisiones y participan en la demo.

| # | Área | Responsabilidad principal |
| --- | --- | --- |
| 1 | Web — frontend | React/Vite, UX, mapa, gráficos, vistas de los tres motores, filtros y detalle de hallazgos. |
| 2 | Web — backend/API | FastAPI, endpoints, integración frontend, caché/consultas, validación y rendimiento. Coordina el contrato de API. |
| 3 | Datos NASA | Inventario de productos, autenticación, descarga por API y procedencia de fuentes. |
| 4 | Procesamiento y estadística | QA, escalas, espacio/tiempo, tendencias, significancia, anomalías y calidad. |
| 5 | Motores EarthShift | Earth Paradox, Silent Collapse, Decision Reversal, reglas de alerta y validación científica. Coordina la definición de hallazgos. |

### Colaboradores

| GitHub |
| --- |
| [@crisgdev](https://github.com/crisgdev) |
| [@tellosaldanalaly772-stack](https://github.com/tellosaldanalaly772-stack) |
| [@adrianatrujillo-tech](https://github.com/adrianatrujillo-tech) |
| [@Talkify-arh](https://github.com/Talkify-arh) |

## Estado del desarrollo

- [x] Definición del reto y planteamiento del proyecto
- [x] Selección inicial de fuentes y variables (MODIS, GPM IMERG, GLDAS)
- [x] Limpieza inicial de las cuatro variables (scripts en `backend/processing/`)
- [ ] Validación de cobertura, QA y procedencia de cada producto
- [ ] Pipeline de ingesta y armonización sobre cuadrícula común
- [ ] Implementación de Earth Paradox, Silent Collapse y Decision Reversal
- [ ] API FastAPI e integración con el frontend
- [ ] Interfaz web y visualizaciones
- [ ] Validación de resultados y documentación final

## Cómo contribuir

1. Crea una rama desde `main`: `git switch -c feat/mi-aporte`.
2. Haz commits descriptivos (ver [Conventional Commits](https://www.conventionalcommits.org/es/)).
3. Abre un Pull Request hacia `main` y solicita revisión.

> Los datos locales (`data/`) y las descargas crudas de NASA **no** se versionan. Para compartir un CSV limpio con el equipo, usa un almacenamiento externo o agrégalo de forma explícita con `git add -f`.

## Documentación

- [Guía de ejecución para cinco integrantes](docs/guia-ejecucion.md) — alcance, responsabilidades, fuentes y acuerdos del equipo.

## Créditos

Datos e inspiración: **NASA Earth Science Data Systems** · Reto *Be an Earth System Trend Detective!* de **NASA Space Apps Challenge 2026**.
