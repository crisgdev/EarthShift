# EarthShift — Catálogo de datos

## Resumen

| Variable | Fuente | Estado | Unidad | Uso |
|---|---|---|---|---|
| NDVI | MODIS procesado | Operativo | índice | Motores EarthShift |
| EVI | MODIS procesado | Disponible | índice | Análisis complementario |
| Temperatura superficial | MODIS LST procesado | Parcial | °C | Análisis complementario |
| Precipitación | Serie procesada Piura | Operativo | mm | Motores EarthShift |
| NASA POWER | NASA POWER API | Operativo auxiliar | depende del parámetro | Comparador |
| EONET | NASA EONET | Operativo auxiliar | eventos | Contexto |
| GIBS | NASA GIBS | Operativo auxiliar | capas | Visualización |
| GPM IMERG | NASA GPM | Pendiente de verificación directa | mm | Precipitación objetivo |

## NDVI

Fuente:

MODIS

Producto recomendado por la guía:

MOD13Q1 v061

Variables principales:

NDVI
EVI
QA

Resolución temporal del producto candidato:

16 días

Cobertura aproximada:

desde 2000

Uso actual en los motores:

annual_mean

Estado:

Operativo mediante datos procesados.

Pendiente:

Confirmar mediante scripts o metadatos que los archivos actuales provienen exactamente de MOD13Q1 v061.

## EVI

Fuente:

MODIS

Estado:

Disponible en datos procesados.

Uso:

Análisis complementario.

## Temperatura superficial

Fuente:

MODIS LST procesado.

Estado:

Parcial.

Uso:

Análisis complementario.

## Precipitación

Archivo procesado:

data/processed/earthshift_general_mensual.csv

Variable:

precipitacion_mm

Región usada:

piura_general_01

Agregación utilizada por los motores:

annual_sum

Estado:

Operativo.

Limitación:

La precipitación corresponde a una serie regional general de Piura y no coincide exactamente con cada zona MODIS.

Por eso:

spatial_match = approximate

## GPM IMERG

Fuente:

NASA GPM IMERG

Versión objetivo:

V07

Uso esperado:

Precipitación.

Estado actual:

Pendiente de verificar como fuente exacta de los CSV utilizados por los motores.

No se debe afirmar que la serie actual es IMERG sin evidencia reproducible.

## NASA POWER

Tipo:

NASA API

Uso:

Fuente auxiliar y comparador.

Parámetros posibles:

precipitación
temperatura del aire

Importante:

NASA POWER no es GPM IMERG.

## NASA EONET

Uso:

Eventos naturales.

Estado:

Servicio auxiliar del frontend.

No es una fuente principal de los motores EarthShift.

## NASA GIBS

Uso:

Capas visuales.

Estado:

Servicio auxiliar.

No sustituye los datos estadísticos utilizados por los motores.

## Metadatos obligatorios

Para cada fuente se deben conservar, cuando estén disponibles:

- producto
- versión
- banda
- parámetro
- unidad
- escala
- fill value
- QA
- resolución espacial
- resolución temporal
- cobertura
- método de acceso
- fecha de adquisición
- archivo original
- archivo procesado

## Calidad

Los datos deben distinguir claramente entre:

- válido
- faltante
- baja calidad
- sin cobertura

No deben rellenarse silenciosamente datos ausentes.

## Estado general

Actualmente EarthShift dispone de datos suficientes para ejecutar la demo y los motores.

Pendiente principal de trazabilidad:

Confirmar documentalmente el producto, versión y método exacto de adquisición de los datos NASA procesados actuales.