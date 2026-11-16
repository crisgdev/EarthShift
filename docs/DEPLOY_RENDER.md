> Alternativa conservada del despliegue anterior. El flujo principal solicitado es Vercel + FastAPI en Render: ver [deployment.md](deployment.md). Para esta alternativa, seleccionar expresamente `deploy/render-fullstack.yaml` como Blueprint; no hace falta crear otra web en Render para usar Vercel.

# EarthShift en Render

Este repositorio despliega la aplicación completa en dos servicios del mismo Blueprint:

- `earthshift-web`: React en producción y servidor Express con conectores NASA POWER, EONET, GIBS y comparaciones.
- `earthshift-api`: FastAPI, datos procesados incluidos en Git, motores científicos e Intelligence.

La web consulta `/api` en su propio dominio. Express reenvía las rutas científicas a la URL pública del backend, configurada automáticamente mediante `EARTHSHIFT_BACKEND_URL`. El navegador no necesita localhost ni configuración manual de CORS.

## Primera publicación

1. Inicia sesión en https://dashboard.render.com con tu cuenta.
2. Selecciona **New → Blueprint**, conecta GitHub y autoriza el repositorio `crisgdev/EarthShift`.
3. Selecciona la rama `main` y el archivo `deploy/render-fullstack.yaml` de la raíz.
4. Revisa que los dos servicios tengan el plan **Free** y crea el Blueprint.
5. Espera a que ambos servicios indiquen **Live**. La URL pública para compartir es la de `earthshift-web`, asignada por Render. No se presupone que el nombre de servicio coincida con el dominio disponible.
6. Verifica `/healthz` en la web, `/api/health` a través de la web y la sección Intelligence.

## Actualizaciones automáticas

Cada push a `main` despliega los servicios afectados:

- Cambios en `frontend/`: web.
- Cambios en `backend/`, `data/` o `requirements.txt`: API.
- Cambios en `deploy/render-fullstack.yaml`: ambos.

Los filtros usan rutas relativas a la raíz del repositorio, incluso para la web, cuyo `rootDir` es `frontend`.

## Interpretación con IA opcional

Los motores científicos funcionan sin claves de IA. Para habilitar Advisor, añade `GROQ_API_KEY` en **earthshift-api → Environment**. Para la interpretación de Phenomena, añade `GEMINI_API_KEY` y `EARTHSHIFT_PHENOMENA_AI_ENABLED=true`. Guarda para redesplegar. Nunca pongas estas claves en variables `VITE_` ni las subas al repositorio. Puedes establecer también `GROQ_MODEL` o `GEMINI_MODEL` si hace falta.

## Límites del plan gratuito

Los servicios gratuitos se suspenden tras 15 minutos sin tráfico; la primera visita puede tardar en despertar ambos servicios. Render aplica límites de horas y recursos compartidos. Los CSV actuales se cargan desde Git; los archivos creados durante la ejecución no son almacenamiento persistente. No se crea una base de datos adicional porque esta versión utiliza los CSV versionados.

Documentación: https://render.com/docs/blueprint-spec y https://render.com/docs/free
