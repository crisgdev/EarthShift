# Piura Watch

Inteligencia de pérdida y recuperación de vegetación para **Piura, Perú**.

React + Vite + TypeScript + Tailwind + Leaflet + Recharts.

---

## Cómo abrirlo en Windows (importante)

El error `Cannot find module 'is-number'` ocurre porque `node_modules` vino incompleto desde Drive.

### Pasos correctos

1. Abre la carpeta del proyecto en el Explorador de Windows.
2. **Borra la carpeta `node_modules`** completa (si existe).
3. Abre una terminal **dentro** de la carpeta del proyecto:

```powershell
# En PowerShell o CMD, dentro de la carpeta piura-watch:
npm install
npm run dev
```

4. Abre el enlace que aparezca (normalmente `http://localhost:5173`).

### Si sigue fallando

```powershell
# Borra e instala de nuevo desde cero
rmdir /s /q node_modules
del package-lock.json
npm cache clean --force
npm install
npm run dev
```

Necesitas tener **Node.js 18 o superior** instalado: https://nodejs.org

---

## Generar un solo HTML

```powershell
npm install
npm run build
```

El archivo queda en `dist/index.html` (toda la app en un solo archivo).

---

## Módulos

| Módulo | Descripción |
|--------|-------------|
| **Inicio** | Presentación + Tierra + KPIs |
| **Explorador geográfico** | Mapa interactivo + capas |
| **Earth Paradox** | Detector de contradicciones ambientales |
| **Silent Collapse** | Señales progresivas de pérdida de resiliencia |
| **Inversión de decisión** | Prioridades con recuperación y ambiente |
| **Tendencias históricas** | Gráficos y comparación de años |
| **Datos y metodología** | Fuentes NASA + limitaciones |

Los sitios sin etiqueta “en vivo” usan datos **DEMO**.
