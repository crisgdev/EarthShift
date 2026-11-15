import pandas as pd

# 1. Cambia este nombre por el nombre exacto de tu archivo descargado
archivo_crudo = "g4.areaAvgTimeSeries.GLDAS_NOAH025_M_2_1_SoilMoi0_10cm_inst.20000101-20261130.81W_6S_79W_4S.csv"

# 2. Leer el CSV saltando las primeras 8 filas de metadatos
df = pd.read_csv(archivo_crudo, skiprows=8)

# 3. Renombrar columnas al estándar de EarthShift
df.columns = ['fecha', 'humedad_suelo']

# 4. Limpiar formato de fecha a YYYY-MM-DD (quitar '00:00:00')
df['fecha'] = pd.to_datetime(df['fecha']).dt.strftime('%Y-%m-%d')

# 5. Eliminar posibles valores nulos (-9999)
df = df[df['humedad_suelo'] > -9000]

# 6. Agregar identificador de región y ordenar columnas
df['region_id'] = 'piura_general_01'
df = df[['region_id', 'fecha', 'humedad_suelo']]

# 7. Guardar el archivo limpio listo para el equipo
df.to_csv('gldas_humedad_limpio.csv', index=False)
print("¡Listo! Filas procesadas:", len(df))
print(df.head())
