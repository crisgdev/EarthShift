# Verificación de la actualización visual

Los cambios conservan React, FastAPI, ResearchApp, navegación, globos y contratos de API.
Se añadieron componentes compartidos en `ResearchUI.tsx` para resúmenes, cobertura,
fuentes y estados sin datos. No se modificaron motores ni datos del backend.

## Comprobaciones

- TypeScript: `npm.cmd run lint`.
- Pruebas frontend: `npm.cmd test` (20 pruebas).
- Build: `npm.cmd run build`.
- Integración existente: `node tests/ui-check.mjs`.
- Cronología: `node tests/events-ui.mjs`.
- Nuevas vistas: `node tests/ux-ui.mjs`.

Las tres pruebas de navegador pasaron contra el build de producción servido en el puerto 3010.
`ui-check.mjs` acepta `EARTHSHIFT_TEST_URL=http://localhost:3010`.
Se verificaron navegación, un solo territorio disponible, cambio de región, prevención
de A=B, alineación anual A/B sin interpolar, valores ausentes, cobertura, errores,
resultados de IA separados de la evidencia y adaptación a 390 y 768 píxeles.

Las capturas `ux-*.png` contienen respuestas controladas **exclusivamente de pruebas**.
No representan observaciones ambientales y no son utilizadas por la interfaz de producción.
Las pruebas comprueban presentación y contratos; no certifican la disponibilidad en vivo
de FastAPI, NASA, NOAA o Groq. La interfaz obtiene sus datos de las APIs existentes.

El build conserva la advertencia previa por el tamaño del JavaScript principal.
