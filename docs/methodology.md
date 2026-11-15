# EarthShift — Metodología

## Objetivo

EarthShift analiza series ambientales multivariables para identificar patrones que requieren revisión.

No constituye un sistema de predicción de desastres.

No demuestra causalidad.

## Flujo general

NASA / fuentes ambientales
→ ingesta
→ control de calidad
→ armonización
→ series temporales
→ análisis estadístico
→ motores EarthShift
→ findings
→ API FastAPI
→ frontend

## Variables principales

Actualmente los motores utilizan principalmente:

NDVI

precipitación

## Earth Paradox

Earth Paradox busca divergencias entre variables ambientales.

Analiza principalmente:

- tendencia de NDVI
- tendencia de precipitación
- evidencia
- contraevidencia
- calidad de datos

Una divergencia entre variables no demuestra causalidad.

## Silent Collapse

Silent Collapse analiza señales persistentes de deterioro gradual.

Utiliza:

- tendencia negativa
- persistencia
- cambio acumulado
- ventanas temporales
- anomalías negativas
- déficit acumulado

Una anomalía negativa no significa automáticamente deterioro ambiental.

## Decision Reversal

Decision Reversal compara:

clasificación univariable

contra

clasificación multivariable

El objetivo es detectar si la conclusión cambia al incluir más de una variable.

El resultado puede incluir:

reversal_detected

univariable_level

multivariable_level

## Niveles

Los motores utilizan los niveles:

normal

observar

investigar

sin datos

## Significado de normal

normal significa que las reglas actuales no activaron una alerta.

No significa que el ambiente esté necesariamente sano.

## Significado de sin datos

sin datos significa que la información disponible no tiene cobertura o calidad suficiente.

Nunca debe convertirse automáticamente en normal.

## Calidad

Antes de interpretar un resultado se verifica la cobertura de las variables.

Ejemplo:

NDVI valid_fraction

precipitation valid_fraction

Si la cobertura es insuficiente, el resultado debe quedar como:

sin datos

## Tendencias

Las tendencias pueden incluir:

- pendiente
- dirección
- p-value
- R²
- número de observaciones
- método utilizado

Actualmente se utiliza regresión lineal para algunos análisis de tendencia.

## Anomalías

Las anomalías NDVI actuales utilizan una referencia provisional:

mean_available_ndvi_provisional

Esta referencia corresponde a la media de los valores disponibles.

No constituye una climatología histórica oficial.

## Persistencia

La persistencia evalúa disminuciones consecutivas.

Las reglas actuales son preliminares.

No demuestran deterioro ambiental real por sí solas.

## Ventanas temporales

EarthShift utiliza ventanas temporales móviles para observar cambios dentro de distintos períodos.

Las ventanas pueden superponerse.

Por ello no deben tratarse como observaciones completamente independientes.

## Cambio acumulado

El cambio entre el valor inicial y final ayuda a describir la evolución de una serie.

No representa directamente pérdida de superficie vegetal.

## Limitaciones estadísticas

Según el análisis pueden permanecer sin resolver:

- autocorrelación
- estacionalidad
- pruebas múltiples
- diferencias espaciales
- diferencias temporales
- variables ambientales no incluidas

Estas limitaciones deben permanecer visibles.

## Coincidencia espacial

El NDVI actual corresponde a zonas MODIS específicas.

La precipitación utilizada actualmente corresponde a una serie regional general de Piura.

Por eso:

spatial_match = approximate

Los resultados multivariables deben interpretarse considerando esta diferencia espacial.

## Datos reales y sintéticos

Datos reales procesados:

source = processed_real_data

demo = false

Datos sintéticos:

demo = true

o

mode = synthetic

Los datos sintéticos nunca deben presentarse como observaciones reales.

## Interpretación científica

Los findings de EarthShift sirven para priorizar revisión.

No son:

- una demostración causal
- una predicción de desastre
- una certificación de salud ambiental
- una recomendación operativa definitiva

Son resultados transparentes basados en reglas, evidencia, calidad y limitaciones conocidas.