# Integración EarthShift

ResearchApp mantiene la navegación, estilos, tarjetas y globos existentes.
El módulo de comparación utiliza regiones procesadas y series anuales del backend.
Las coordenadas elegidas en el globo son contexto visual; no seleccionan nuevos datos científicos.

## Ejecución

Desde la raíz:

```powershell
py -m pip install -r requirements.txt
py -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

En otra terminal:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Express sirve la interfaz y reenvía las rutas EarthShift a FastAPI.
`EARTHSHIFT_BACKEND_URL` configura el destino del proxy, por defecto `http://127.0.0.1:8000`.
`VITE_EARTHSHIFT_API_URL` permite un origen público distinto y se aplica al compilar Vite.
Si se configura un origen distinto, debe estar permitido en `EARTHSHIFT_FRONTEND_ORIGINS`.
En producción se ejecuta el servidor Express con `NODE_ENV=production` después de `npm.cmd run build`.
El hosting estático requiere configurar `VITE_EARTHSHIFT_API_URL` y resolver las rutas NASA de Express.

Advisor y Phenomena usan `GROQ_API_KEY` y `GROQ_MODEL` del backend.
Phenomena requiere `EARTHSHIFT_PHENOMENA_AI_ENABLED=true` para interpretar con IA.
La interfaz real bloquea las interpretaciones simuladas de Advisor cuando está activo `EARTHSHIFT_DEMO_MODE`.
Una caída del proveedor conserva el contexto científico y muestra un mensaje público sencillo.

## Datos

El catálogo y las regiones proceden de `/api/variables`, `/api/regions` y `/api/cells`.
Las gráficas muestran `/api/series`; no calculan tendencias ni clasificaciones en el navegador.
Los motores permanecen en el backend y sus reglas no se modificaron.
La interfaz principal no ofrece respuestas sintéticas ni carga casos JSON estáticos.
Las utilidades y pruebas sintéticas siguen disponibles para desarrollo.

NDVI y temperatura superficial usan la zona MODIS; precipitación y humedad del suelo,
la serie general de Piura (`spatial_match=mixed`). La cobertura no equivale a calidad científica absoluta.

## Verificación

```powershell
cd frontend
npm.cmd run lint
npm.cmd test
npm.cmd run build
# Con npm.cmd run dev en otra terminal y Chrome instalado:
node tests/ui-check.mjs
cd ..
py -m pytest backend/tests -q
```

La prueba de navegador usa respuestas controladas exclusivamente dentro del test.
Comprueba una sola región, errores de backend, indisponibilidad de IA y ancho móvil.
No prueba la disponibilidad real de NOAA, NASA o Groq ni sustituye pytest.
