# Git → Vercel + Render

## Arquitectura

```text
GitHub crisgdev/EarthShift
  main ────────────── Vercel Production → earth-shift.vercel.app
    └──────────────── Render → FastAPI público (HTTPS)
  otras ramas / PR ── Vercel Preview (URL por deployment)

Navegador → /api/* del mismo deployment → Express en Vercel
  ├─ /api/nasa/* y /api/research/compare: rutas Express existentes
  └─ /api/series, /regions, /cells, /variables, /intelligence/*
       → EARTHSHIFT_BACKEND_URL → FastAPI → motores/datos procesados
```

React se compila con Vite; Vercel sirve `dist` por CDN. `api/index.ts` reutiliza
`app.ts` sin abrir puertos ni cargar Vite. `server.ts` conserva el servidor local.
No se modifican motores ni cálculos científicos.

**Estado comprobado antes del cambio:** la página pública responde 200, pero
`/api/health` y `/api/regions` responden 404. No se ha confirmado una URL pública
existente de FastAPI. La configuración del repositorio no crea servicios ni
variables en las cuentas por sí sola: requiere conectarlas o realizar el alta.

## 1. FastAPI público en Render

Render ejecuta Python, pandas, SciPy y los CSV versionados sin adaptar los motores
a funciones serverless. El Blueprint declara plan Free; puede suspenderse por
inactividad y producir arranques lentos. Elegir un plan sin suspensión corresponde
al propietario de la cuenta.

1. Abrir [crear Blueprint](https://dashboard.render.com/select-repo?type=blueprint).
2. Autorizar GitHub y seleccionar `crisgdev/EarthShift`, rama `main`, archivo `render.yaml`.
3. Conservar la raíz del repositorio, **no** `backend`: las importaciones y los CSV
   necesitan los directorios `backend` y `data/processed`.
4. Revisar el servicio `earthshift-api`, Python 3.13.2, build y health check del Blueprint.
5. Añadir `GROQ_API_KEY` en Render si se usará Advisor. Los datos científicos no
   requieren Groq. No poner esta clave en Vercel ni en variables `VITE_*`.
6. Opcionalmente activar `EARTHSHIFT_PHENOMENA_AI_ENABLED=true` para interpretar
   Phenomena; los registros NOAA funcionan sin esta capa opcional.
7. Desplegar y copiar la URL HTTPS **real asignada por Render**; no asumir un subdominio.
8. Verificar `<URL>/api/health`, `<URL>/api/regions` y
   `<URL>/api/series?region=BajoPiura`.

Render redespliega al cambiar backend, dependencias o datos procesados en `main`.
Un cambio exclusivamente visual no reinicia Python.

## 2. Configurar el proyecto Vercel existente

En el proyecto que sirve **earth-shift.vercel.app**:

| Ajuste | Valor |
| --- | --- |
| Git Repository | `crisgdev/EarthShift` |
| Production Branch | `main` |
| Root Directory | `frontend` |
| Framework | Vite |
| Node.js | 24.x |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

`frontend/vercel.json` configura comandos, salida, rutas API antes de SPA y
`git.deploymentEnabled=true`. **Production Branch** es un ajuste de Vercel que
debe confirmarse en el dashboard; `vercel.json` no lo sustituye.

Guardar en **Production y Preview**:

| Variable | Valor |
| --- | --- |
| `EARTHSHIFT_BACKEND_URL` | URL HTTPS real de Render, sin `/api` ni credenciales |
| `VITE_EARTHSHIFT_API_URL` | Sin definir o vacía: usar proxy del mismo origen |

El proxy evita CORS desde el navegador también en URLs nuevas de Preview.
`EARTHSHIFT_BACKEND_URL` es privada del servidor, no una variable del bundle.
Si falta en Vercel, el build falla con un mensaje explícito. Localhost, IPs
privadas y HTTP se rechazan en producción.

Eliminar overrides antiguos que contradigan `vercel.json`, guardar las variables
y redesplegar `main`. Mantener un único proyecto conectado, sin otro workflow
que lance `vercel --prod` en paralelo.

## 3. Flujo diario y previews

- `git push origin main`: Vercel actualiza producción; Render actualiza FastAPI
  cuando cambia su código, dependencias o datos.
- `git push origin feature/nombre`: Vercel genera Preview cuando la integración
  Git y las previews estén habilitadas en la cuenta.
- Por defecto, las previews usan la misma API pública. Para aislarlas, configurar
  otra `EARTHSHIFT_BACKEND_URL` en Preview o en una rama concreta.
- `.github/workflows/ci.yml` valida PR y `main`: TypeScript, pruebas frontend,
  prueba de la función Vercel, build y pruebas backend. No usa claves de IA.
- Render no duplica el backend por cada rama frontend.

## 4. Desarrollo local

Copiar `.env.example` a `.env` desde la raíz, sin versionar el archivo resultante:

```powershell
py -m pip install -r requirements.txt
py -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

En otra terminal, copiar `frontend/.env.example` a `frontend/.env`:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Abrir `http://localhost:3000`. Express reenvía las rutas a FastAPI local.
Para probar el build con el mismo proxy: `npm.cmd run build` y `npm.cmd run preview`.
No establecer `NODE_ENV=production` con una URL localhost: ese modo exige API pública.

## 5. Comprobar el sitio publicado

```powershell
cd frontend
$env:EARTHSHIFT_TEST_URL='https://earth-shift.vercel.app'
node scripts/check-public-deployment.mjs
```

Repetir con una URL de Preview. Lee health, regiones y una serie real; no consulta IA.

| Síntoma | Revisar |
| --- | --- |
| `/api/*` devuelve 404 o HTML | Root Directory `frontend`, función y rewrites desplegados |
| Build indica falta de backend | Variable del entorno Vercel correspondiente |
| API devuelve 503 | Estado y health de Render, URL del proxy |
| Primera petición lenta | Arranque del servicio gratuito de Render |
| Production funciona y Preview falla | Variables también guardadas en Preview |
| Motores «sin datos» con series visibles | Cobertura científica; no es un error de despliegue |

Referencias: [Vite/funciones Vercel](https://vercel.com/docs/frameworks/frontend/vite),
[Git Vercel](https://vercel.com/docs/git),
[FastAPI Render](https://render.com/docs/deploy-fastapi),
[Blueprint](https://render.com/docs/blueprint-spec).
