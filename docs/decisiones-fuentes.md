# Decisiones sobre fuentes de datos — EarthShift

Piloto: Piura, Perú. Actualización: 15 de noviembre de 2026.

Este documento registra decisiones sobre productos NASA adoptadas o descartados
durante la limpieza y armonización, para mantener trazabilidad (ver acuerdos
científicos en `README.md` y `docs/guia-ejecucion.md`).

## Exclusión de Evapotranspiración MODIS (MOD16A2GF.061)

- **Variable candidata (5.ª):** Evapotranspiración (`ET_500m`).
- **Producto:** MOD16A2GF v061 (NASA Terra/MODIS).
- **Estado:** Descartada para el análisis regional y por microzonas en Piura.

### Justificación técnica

1. **Limitación intrínseca del algoritmo en zonas áridas.** El algoritmo
   Penman-Monteith utilizado por MOD16A2GF.061 requiere cobertura vegetal
   densa y parámetros meteorológicos de superficie específicos para calcular
   flujos latentes de calor. En ecosistemas hiperáridos, desérticos o de
   matorral escaso (Desierto de Sechura y zonas costeras de Piura), el modelo
   no converge y asigna el valor de relleno (Fill Value) `32762`, clasificado
   oficialmente en la guía del producto como *"Barren or sparsely vegetated"*.

2. **Pérdida crítica de cobertura espacial.** Al extraer series temporales sobre
   las áreas de interés (DesiertoSechura, BajoPiura, ValleChira y
   piura_general_01), la gran mayoría de los píxeles arrojan el código `32762`
   de forma sistemática, generando vacíos de datos (NaN) que impiden construir
   series históricas continuas entre 2000 y 2026.

3. **Mitigación metodológica en EarthShift.** Para evitar sesgos estadísticos o
   falsas anomalías por falta de datos, se sustituyó la evapotranspiración
   directa por la combinación de:
   - Temperatura Superficial Terrestre — MOD11A2.061 (LST),
   - Humedad Superficial del Suelo — GLDAS_NOAH025_M v2.1,
   - Índices de Vegetación — MOD13Q1.061 (NDVI/EVI).

   Estas tres variables, en conjunto, capturan de forma continua y sin pérdida
   de cobertura el balance hídrico, el estrés térmico y la respuesta biofísica
   de toda la región de Piura.

### Implicaciones para el análisis

- No se interpola ni inventa ET (acuerdo científico: no inventar observaciones).
- Se distingue *sin datos*, *baja calidad* y *ausencia de anomalía*.
- ET no se reporta como variable directa; el balance hídrico se infiere
  indirectamente a partir de la combinación LST + humedad del suelo + NDVI/EVI.
- La exclusión se mantiene documentada para justificar la matriz de variables
  usada por Earth Paradox, Silent Collapse y Decision Reversal.

### Referencias

- Guía del producto MOD16A2GF v061 (Fill Value `32762`).
- Áreas de interés: DesiertoSechura, BajoPiura, ValleChira, piura_general_01.
