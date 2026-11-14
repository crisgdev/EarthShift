# EarthShift

**Detectando cambios ambientales que pasan desapercibidos.**

Plataforma web que integra datos históricos de observación satelital de la NASA y análisis estadístico para detectar tendencias, anomalías y comportamientos inesperados en el Cerrado brasileño.

> 🚧 **Proyecto en construcción** — NASA Space Apps Challenge 2026 · Reto *Be an Earth System Trend Detective!*

---

## El problema

Los cambios ambientales no siempre son evidentes. En el **Cerrado brasileño**, la vegetación puede presentar un deterioro progresivo incluso cuando otros indicadores —como las precipitaciones— no muestran una variación equivalente.

Esa **contradicción entre señales** oculta transformaciones de los ecosistemas y retrasa la identificación temprana de zonas vulnerables. Analizar cada variable por separado no permite verla; hay que leerlas en conjunto.

## Pregunta central de investigación

> ¿En qué medida la evolución de la vegetación en el Cerrado brasileño presenta comportamientos inesperados respecto a las tendencias de precipitación y humedad del suelo, y cómo pueden estos hallazgos contribuir a identificar zonas que requieren atención ambiental preventiva?

## Propuesta de solución

EarthShift convierte los datos históricos del Sistema Tierra en **evidencia comprensible** para responder qué está cambiando, dónde, cuánto y qué decisiones pueden tomarse.

La plataforma se organiza en tres módulos de análisis:

| Módulo | Pregunta que responde | Qué hace |
| --- | --- | --- |
| **Earth Paradox** | ¿Dónde se contradicen los indicadores? | Identifica divergencias entre vegetación, precipitación y humedad del suelo: zonas donde la vegetación cae sin una caída equivalente de las lluvias. |
| **Silent Collapse** | ¿Dónde se está agotando la capacidad de recuperación? | Busca señales progresivas de pérdida de resiliencia del ecosistema: deterioro lento, persistente y estadísticamente significativo. |
| **Decision Reversal** | ¿Esto cambia las prioridades? | Muestra cómo los hallazgos modifican el orden de intervención preventiva frente a un enfoque basado en un solo indicador. |

## Alcance del reto

| Dimensión | Definición |
| --- | --- |
| **¿Qué cambia?** | El comportamiento de la vegetación y su relación con las condiciones ambientales: tendencias de pérdida de vegetación, variaciones de humedad del suelo y precipitación, anomalías y señales de disminución de la resiliencia. |
| **¿Dónde?** | El bioma del **Cerrado brasileño**, mediante áreas geográficas delimitadas y comparables, usando observación satelital histórica y productos científicos de la NASA. |
| **¿Cuánto?** | Magnitud y velocidad del cambio, cuantificadas con indicadores y su significancia estadística (ver [Indicadores](#indicadores)). |
| **¿Para quién?** | Investigadores y científicos ambientales · autoridades y organismos de gestión ambiental · organizaciones de conservación · comunidades y sectores productivos que dependen del Cerrado. |
| **¿Para qué?** | Detectar tempranamente transformaciones que pasan desapercibidas al analizar cada variable por separado, comprender su evolución histórica y aportar evidencia para priorizar zonas de atención y orientar decisiones preventivas. |

## Indicadores

| Indicador | Qué mide |
| --- | --- |
| **Δ NDVI** | Cambios en la condición y productividad de la vegetación. |
| **Precipitación acumulada** | Variaciones de las lluvias a lo largo del tiempo. |
| **Humedad del suelo** | Disponibilidad de agua en el suelo y su tendencia. |
| **Anomalías ambientales** | Frecuencia e intensidad de eventos fuera de rango. |
| **Significancia estadística** | Robustez de las tendencias identificadas (p. ej. Mann–Kendall, Sen's slope). |

**Periodo de estudio propuesto:** 2010–2026, sujeto a la disponibilidad y compatibilidad de los datos.

## Datos

Fuentes candidatas de la NASA (a confirmar según cobertura, resolución y disponibilidad):

| Variable | Producto candidato | Resolución típica |
| --- | --- | --- |
| NDVI / EVI | MODIS `MOD13Q1` | 250 m · 16 días |
| Precipitación | GPM `IMERG` | ~10 km · mensual |
| Humedad del suelo | SMAP L4 | ~9 km · diaria |
| Apoyo / validación | Landsat, GRACE-FO, datos de fuego | variable |

## Metodología (propuesta)

1. **Definición de áreas de estudio** — polígonos comparables y estables dentro del Cerrado.
2. **Ingesta y armonización** — descarga, reproyección, recorte espacial y alineación temporal de las series.
3. **Control de calidad** — enmascarado de nubes, huecos, interpolación y normalización de anomalías.
4. **Análisis de tendencias** — regresión estacional, Mann–Kendall, pendiente de Sen.
5. **Detección de contradicciones** — correlación y desacople entre NDVI, precipitación y humedad del suelo (Earth Paradox).
6. **Resiliencia** — memoria temporal / autocorrelación y recuperación tras anomalías (Silent Collapse).
7. **Priorización** — ranking de zonas e interpretación para decisiones preventivas (Decision Reversal).

> Las conclusiones dependerán de los resultados obtenidos con datos reales. El proyecto no asume de antemano que exista una contradicción: la busca y la mide.

## Arquitectura (por definir)

El stack técnico aún no está decidido. La intención es una plataforma web con:

- **Backend** de análisis y API de datos.
- **Pipeline** reproducible de ingesta y procesamiento satelital.
- **Frontend** con visualizaciones interactivas (mapas, series temporales y rankings de zonas).

## Estructura del repositorio

```
EarthShift/
├── README.md
├── docs/        # planteamiento, metodología y referencias
├── backend/     # API y análisis estadístico
├── frontend/    # interfaz web y visualizaciones
└── data/        # scripts de ingesta y metadatos (sin datos crudos)
```

*Estructura tentativa; se ajustará al iniciar el desarrollo.*

## Hoja de ruta

- [x] Definición del reto y planteamiento del proyecto
- [ ] Selección y validación de fuentes de datos
- [ ] Pipeline de ingesta y armonización
- [ ] Implementación de los módulos Earth Paradox, Silent Collapse y Decision Reversal
- [ ] Interfaz web y visualizaciones
- [ ] Validación de resultados y documentación final

## Equipo

| Rol | GitHub |
| --- | --- |
| Mantenimiento | [@crisgdev](https://github.com/crisgdev) |
| Colaboración | [@tellosaldanalaly772-stack](https://github.com/tellosaldanalaly772-stack) |
| Colaboración | [@adrianatrujillo-tech](https://github.com/adrianatrujillo-tech) |

## Cómo contribuir

1. Crea una rama desde `main`: `git checkout -b feat/mi-aporte`.
2. Haz commits descriptivos (ver [Conventional Commits](https://www.conventionalcommits.org/es/)).
3. Abre un Pull Request hacia `main` y solicita revisión.

## Créditos

Datos e inspiración: **NASA Earth Science Data Systems** · Reto *Be an Earth System Trend Detective!* de **NASA Space Apps Challenge**.
