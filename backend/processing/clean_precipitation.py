import pandas as pd

# 1. Nombre exacto del archivo descargado
archivo_crudo = "g4.areaAvgTimeSeries.GPM_3IMERGM_07_precipitation.20000101-20260930.81W_6S_79W_4S.csv"

# 2. Leer el CSV saltando las primeras 8 filas de metadatos
df = pd.read_csv(archivo_crudo, skiprows=8)

# 3. Renombrar columnas al estándar de EarthShift
df.columns = ['fecha', 'precipitacion_mm']

# 4. Limpiar formato de fecha a YYYY-MM-DD (quitar '00:00:00')
df['fecha'] = pd.to_datetime(df['fecha']).dt.strftime('%Y-%m-%d')

# 5. Eliminar posibles valores nulos (-9999.9)
df = df[df['precipitacion_mm'] > -9000]

# 6. Agregar identificador de región y ordenar columnas
df['region_id'] = 'piura_general_01'
df = df[['region_id', 'fecha', 'precipitacion_mm']]

# 7. Guardar el archivo limpio listo para el equipo
df.to_csv('gpm_precipitacion_limpio.csv', index=False)
print("¡Listo! Filas procesadas:", len(df))
print(df.head())