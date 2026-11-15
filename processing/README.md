# EarthShift - Pipeline científico v3

## Metadatos incorporados

### GPM IMERG V07
- Variable: precipitación combinada satélite-pluviómetro
- Frecuencia: mensual
- Unidad: mm/mes
- Resolución espacial nativa: 0.1°
- Periodo disponible en la descarga: enero de 2000 a septiembre de 2025
- Región: Piura, Perú
- La serie del CSV es un promedio de área sobre la caja regional acordada.

### GLDAS
- Producto: GLDAS_NOAH025_M v2.1
- Variable: SoilMoi0_10cm_inst
- Descripción: humedad del suelo de 0 a 10 cm
- Unidad: kg/m²
- Frecuencia: mensual
- Agregación: promedio de área sobre la misma caja regional.

## Caja geográfica
Oeste=-81.35, Sur=-6.40, Este=-79.15, Norte=-4.05 (EPSG:4326).

## Ejecución
1. Copiar los CSV a `input/`:
   - `gpm_precipitacion_limpio.csv`
   - `gldas_humedad_limpio.csv`
2. Instalar: `python -m pip install pandas`
3. Ejecutar: `python pipeline_cientifico.py`

## Salidas
- `output/reporte_calidad.json`
- `output/series_periodo_comun.csv`
- `output/series_consolidadas_outer.csv`

## Limitaciones
Los CSV son series regionales promediadas, no matrices de píxeles. No se pueden
usar para reconstruir mapas de calor por píxel. Los cuatro puntos de AppEEARS
se deben documentar y procesar como fuente espacial independiente.

La precipitación (mm/mes) y el almacenamiento de humedad del suelo (kg/m²)
no son variables intercambiables. La equivalencia de unidades de profundidad
de agua no implica equivalencia física de los procesos.

El pipeline realiza QA y armonización temporal, no causalidad ni inferencias
estadísticas definitivas.
