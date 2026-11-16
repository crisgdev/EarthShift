# Correcciones de carga y gráficas

Problemas reproducidos y corregidos:

- Seleccionar de nuevo la misma región vaciaba las gráficas sin iniciar otra petición.
  Los selectores conservan los datos cuando el valor no cambia.
- El proxy GIBS enviaba las matrices geográficas del globo a EPSG:3857.
  Ahora elige EPSG:4326 o EPSG:3857 según la matriz solicitada y valida la ruta.
- El mapa pedía NDVI para una fecha histórica sin cobertura en la capa actual.
  Usa la fecha recomendada de `/api/nasa/gibs-layers`; fechas sin imágenes mantienen
  el aviso de indisponibilidad, sin sustituirlas por otra fecha silenciosamente.
- Las series omitían huecos cuando ambas regiones carecían del mismo año.
  La rejilla temporal conserva esos años con valores nulos y no interpola.
- El cliente aceptaba HTML con HTTP 200 como si fuera una respuesta de la API.
  Valida el tipo de contenido, JSON, identidad regional y años duplicados.
- `npm run preview` usaba un servidor estático sin las rutas Express.
  Ahora sirve el build mediante el mismo servidor y proxy que la aplicación.
- El reloj obsoleto de Three.js se sustituyó por `Timer`; HMR usa un puerto
  derivado del puerto del servidor y respeta `DISABLE_HMR`.

Verificación realizada:

- 50 pruebas backend mediante Python 3.13.
- 27 pruebas frontend, TypeScript y build correctos.
- Tres pruebas existentes de navegador (integración, UX y cronología) correctas.
- `node tests/live-backend.mjs`: cuatro regiones y cuatro variables de FastAPI,
  valores de las gráficas cotejados contra las respuestas reales, regreso a la vista
  de comparación, selección repetida y adaptación móvil. No utiliza datos simulados.
- Dos imágenes solicitadas al proxy corregido devolvieron HTTP 200: VIIRS geográfico
  y NDVI Web Mercator con la fecha recomendada.
- Phenomena respondió con registros NOAA e interpretación completada.
- Advisor presentó inicialmente indisponibilidad; la llamada de diagnóstico posterior,
  autorizada por el usuario, completó correctamente sus seis campos de respuesta.

Para cargar los cambios de `server.ts`, reiniciar el proceso frontend existente:

```bash
# Desde frontend, después de detener el proceso anterior con Ctrl+C:
npm run dev
```

FastAPI debe seguir activo en `http://127.0.0.1:8000`, o configurarse
`EARTHSHIFT_BACKEND_URL` con su dirección. No se modificaron las reglas de los motores.
