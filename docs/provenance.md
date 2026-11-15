# EarthShift — Procedencia de datos

## Vegetación

Variable principal:

NDVI

Fuente científica:

MODIS

Archivo procesado usado por EarthShift:

data/processed/earthshift_modis_zonal_ampliado.csv

Los motores usan principalmente NDVI procesado por zona.

## Precipitación

Archivo procesado:

data/processed/earthshift_general_mensual.csv

Variable:

precipitacion_mm

Región usada:

piura_general_01

La precipitación es una serie regional general de Piura.

Por eso:

spatial_match = approximate

No coincide exactamente con cada zona MODIS.

## Adaptador

Archivo:

backend/app/services/engine_adapter.py

Agregaciones:

NDVI = annual_mean
precipitation = annual_sum

## Datos reales

La API usa:

source = processed_real_data
demo = false

## Referencia NDVI

La referencia actual es:

mean_available_ndvi_provisional

No es una climatología histórica oficial.

## NASA POWER

NASA POWER se usa como fuente auxiliar.

No debe confundirse con GPM IMERG.

## GPM IMERG

La guía recomienda GPM IMERG para precipitación.

No se debe afirmar que la precipitación actual es IMERG hasta verificar su origen exacto.

## MODIS

La guía recomienda como candidato:

MOD13Q1 v061

Antes de afirmar que los CSV actuales provienen exactamente de ese producto, debe verificarse con scripts o metadatos.

## Importante

processed_real_data

no significa automáticamente:

NASA API verified

La procedencia exacta debe conservarse mediante:

- producto
- versión
- fecha
- fuente
- método de descarga
- archivo original
- archivo procesado
- unidad
- QA
- resolución
- cobertura temporal