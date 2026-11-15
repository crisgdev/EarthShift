# EarthShift — Decisiones técnicas y científicas

## Área piloto

EarthShift utiliza Piura, Perú como área piloto.

Bounding box aproximado:

west = -81.3
south = -5.8
east = -80.3
north = -4.8

Este rectángulo es una referencia técnica y no representa el límite administrativo oficial de Piura.

## Sistema de coordenadas

EarthShift utiliza:

EPSG:4326

Orden de coordenadas:

[longitud, latitud]

## Regiones actuales

BajoPiura

BosqueSecoMorropon

DesiertoSechura

ValleChira

## Coincidencia espacial

El NDVI utilizado por los motores corresponde a zonas MODIS específicas.

La precipitación corresponde actualmente a una serie regional general de Piura.

Por ello:

spatial_match = approximate

No se debe interpretar la precipitación regional como una observación exacta de cada zona MODIS.

## Agregación temporal

NDVI:

annual_mean

Precipitación:

annual_sum

## Referencia NDVI

La referencia actual es:

mean_available_ndvi_provisional

Esta referencia es provisional.

No constituye una climatología histórica oficial.

## Datos faltantes

EarthShift distingue entre:

sin datos

baja calidad

ausencia de anomalía

Un dato faltante no debe convertirse automáticamente en un resultado normal.

## Niveles

Los motores utilizan:

normal

observar

investigar

sin datos

normal significa que las reglas actuales no activaron una señal.

No significa que el ecosistema esté necesariamente sano.

## Earth Paradox

Busca divergencias entre variables ambientales.

Una divergencia no demuestra causalidad.

## Silent Collapse

Evalúa señales como:

- tendencia
- persistencia
- cambio acumulado
- ventanas temporales
- anomalías
- déficit acumulado

Estas señales no demuestran por sí solas deterioro ambiental real.

## Decision Reversal

Compara una conclusión basada en una sola variable contra una conclusión multivariable.

Un cambio de clasificación no demuestra causalidad.

## Causalidad

EarthShift no demuestra causalidad.

EarthShift no predice desastres.

EarthShift genera hallazgos que ayudan a priorizar revisión.

## Caché

La API utiliza caché TTL en memoria.

Valor por defecto:

300 segundos

Variable de configuración:

EARTHSHIFT_CACHE_TTL_SECONDS

El caché mejora el rendimiento durante la demo.

No reemplaza almacenamiento persistente.

## CORS

Los orígenes permitidos se configuran mediante:

EARTHSHIFT_FRONTEND_ORIGINS

No se utiliza CORS abierto con "*".

## Secretos

No deben guardarse tokens ni credenciales en Git.

El archivo .env debe permanecer local.

El archivo .env.example contiene solamente valores de ejemplo.

## Datos reales

Las respuestas reales utilizan:

source = processed_real_data

demo = false

## Datos sintéticos

Los datos sintéticos deben aparecer claramente como:

demo = true

o:

mode = synthetic

Nunca deben presentarse como observaciones reales.