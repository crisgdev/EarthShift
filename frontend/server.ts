import { compare } from './src/research/comparison.mjs';
import {resolveGibsTile} from './src/services/gibsTiles.mjs';
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '32kb' }));
// Same-origin access to FastAPI in development and production.
const EARTHSHIFT_BACKEND_URL = (process.env.EARTHSHIFT_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const EARTHSHIFT_PATHS = ['/api/health', '/api/variables', '/api/regions', '/api/cells', '/api/series', '/api/intelligence'];
app.use(EARTHSHIFT_PATHS, async (req, res) => {
  try {
    const upstream = await fetch(EARTHSHIFT_BACKEND_URL + req.originalUrl, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
      signal: AbortSignal.timeout(90000),
    });
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'Datos no disponibles temporalmente.' });
    return res.status(upstream.status).json(await upstream.json());
  } catch (error) {
    console.error('EarthShift backend unavailable', error);
    return res.status(503).json({ error: 'Datos no disponibles temporalmente.' });
  }
});
app.post('/api/research/compare', async (req, res) => {
  try {
    if (req.body?.mode === 'synthetic') return res.status(400).json({error:'synthetic_mode_disabled'});
    res.json(await compare(req.body));
  }
  catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'invalid_request' }); }
});

// Simple in-memory TTL cache for NASA API responses
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// Track real-world NASA server clock from upstream HTTP Date headers
// (Protects POWER/GIBS date queries if container system clock differs from real UTC)
let lastKnownNasaDateMs: number | null = null;

function updateNasaClock(res: Response) {
  const dateHeader = res.headers.get('date');
  if (dateHeader) {
    const parsed = Date.parse(dateHeader);
    if (!Number.isNaN(parsed)) {
      lastKnownNasaDateMs = parsed;
    }
  }
}

function getReferenceUtcDate(): Date {
  // Prefer NASA server Date header if available; otherwise fallback to current date clamped reasonably
  if (lastKnownNasaDateMs !== null) {
    return new Date(lastKnownNasaDateMs);
  }
  return new Date();
}

function formatYyyymmdd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function formatIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PiuraWatch-NASA-Observatory/1.0',
        Accept: 'application/json',
      },
    });
    updateNasaClock(res);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// 1. Health & NASA Connectivity Status
app.get('/api/nasa/status', async (_req, res) => {
  const cached = getCached<Record<string, unknown>>('nasa_status');
  if (cached) {
    return res.json(cached);
  }

  let eonetOnline = false;
  let powerOnline = false;
  let gibsOnline = false;

  try {
    const eonetProbe = await fetchWithTimeout(
      'https://eonet.gsfc.nasa.gov/api/v3/categories',
      5000
    );
    eonetOnline = eonetProbe.ok;
  } catch {
    eonetOnline = false;
  }

  try {
    const powerProbe = await fetchWithTimeout(
      'https://power.larc.nasa.gov/api/system/manager/status',
      5000
    );
    powerOnline = powerProbe.ok;
  } catch {
    // Some POWER environments may not expose /system/manager/status; treat as reachable if Date header came back
    powerOnline = false;
  }

  try {
    const probe = await fetchWithTimeout('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetCapabilities', 5000);
    gibsOnline = probe.ok;
  } catch { gibsOnline = false; }
  const refDate = getReferenceUtcDate();
  const gibsRecommended = new Date(refDate.getTime() - 2 * 86400_000);

  const payload = {
    status: 'ok',
    nasaServerUtc: refDate.toISOString(),
    gibsRecommendedDate: formatIsoDate(gibsRecommended),
    endpoints: {
      eonet: { online: eonetOnline, label: 'NASA EONET v3' },
      power: { online: powerOnline, label: 'NASA POWER v2' },
      gibs: { online: gibsOnline, label: 'NASA GIBS WMTS' },
    },
    hasCustomNasaKey: Boolean(
      process.env.NASA_API_KEY && process.env.NASA_API_KEY !== 'DEMO_KEY'
    ),
    hasFirmsKey: Boolean(process.env.FIRMS_MAP_KEY),
  };

  setCached('nasa_status', payload, 120_000);
  res.json(payload);
});

// 2. NASA EONET v3 Real-Time Natural Events
app.get('/api/nasa/eonet', async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 45, 1), 180);
  const limit = Math.min(Math.max(Number(req.query.limit) || 60, 5), 150);
  const category = typeof req.query.category === 'string' ? req.query.category : '';

  const cacheKey = `eonet_${days}_${limit}_${category}`;
  const cached = getCached<Record<string, unknown>>(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const params = new URLSearchParams({
    status: 'open',
    days: String(days),
    limit: String(limit),
  });
  if (category && category !== 'all') {
    params.set('category', category);
  }

  const url = `https://eonet.gsfc.nasa.gov/api/v3/events?${params.toString()}`;

  try {
    const upstream = await fetchWithTimeout(url, 10000);
    if (!upstream.ok) {
      throw new Error(`EONET HTTP ${upstream.status}`);
    }
    const raw = (await upstream.json()) as {
      events?: Array<{
        id: string;
        title: string;
        link?: string;
        categories?: Array<{ id: string; title: string }>;
        sources?: Array<{ id: string; url: string }>;
        geometry?: Array<{
          date: string;
          type: string;
          coordinates: number[] | number[][] | number[][][];
          magnitudeValue?: number;
          magnitudeUnit?: string;
        }>;
      }>;
    };

    const normalized = (raw.events ?? [])
      .map((ev) => {
        const latestGeo = ev.geometry?.[ev.geometry.length - 1];
        if (!latestGeo) return null;

        let lon = 0;
        let lat = 0;
        if (latestGeo.type === 'Point' && Array.isArray(latestGeo.coordinates)) {
          lon = Number(latestGeo.coordinates[0]);
          lat = Number(latestGeo.coordinates[1]);
        } else if (
          latestGeo.type === 'Polygon' &&
          Array.isArray(latestGeo.coordinates) &&
          Array.isArray(latestGeo.coordinates[0])
        ) {
          const ring = latestGeo.coordinates[0] as number[][];
          if (ring.length > 0) {
            lon = ring.reduce((acc, p) => acc + Number(p[0]), 0) / ring.length;
            lat = ring.reduce((acc, p) => acc + Number(p[1]), 0) / ring.length;
          }
        } else {
          return null;
        }

        if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

        const cat = ev.categories?.[0];
        return {
          id: ev.id,
          title: ev.title,
          categoryId: cat?.id ?? 'other',
          categoryTitle: cat?.title ?? 'Natural Event',
          lat,
          lon,
          date: latestGeo.date,
          sourceUrl: ev.sources?.[0]?.url ?? ev.link ?? 'https://eonet.gsfc.nasa.gov/',
          magnitudeValue: latestGeo.magnitudeValue ?? null,
          magnitudeUnit: latestGeo.magnitudeUnit ?? null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const payload = {
      isLive: true,
      source: 'NASA EONET v3',
      fetchedAt: new Date().toISOString(),
      nasaServerUtc: getReferenceUtcDate().toISOString(),
      count: normalized.length,
      events: normalized,
    };

    setCached(cacheKey, payload, 300_000); // 5-minute cache
    res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'EONET fetch failed';
    res.status(200).json({
      isLive: false,
      source: 'NASA EONET v3 (unavailable)',
      error: message,
      fetchedAt: new Date().toISOString(),
      nasaServerUtc: getReferenceUtcDate().toISOString(),
      count: 0,
      events: [],
    });
  }
});

// 3. NASA POWER v2 Daily Agro-Climate Telemetry for ANY (lat, lon)
app.get('/api/nasa/power', async (req, res) => {
  const lat = Number(req.query.lat ?? -5.1945);
  const lon = Number(req.query.lon ?? -80.6328);
  const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);

  if (
    Number.isNaN(lat) ||
    Number.isNaN(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return res.status(400).json({ error: 'Invalid latitude or longitude' });
  }

  const roundedLat = lat.toFixed(3);
  const roundedLon = lon.toFixed(3);
  const cacheKey = `power_${roundedLat}_${roundedLon}_${days}`;
  const cached = getCached<Record<string, unknown>>(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  // Ensure we know real-world NASA UTC clock before asking POWER for daily dates
  if (lastKnownNasaDateMs === null) {
    try {
      await fetchWithTimeout('https://eonet.gsfc.nasa.gov/api/v3/categories', 3500);
    } catch {
      // Ignore probe error
    }
  }

  const refUtc = getReferenceUtcDate();
  // NASA POWER daily satellite parameters have ~4-6 day processing lag
  const endDate = new Date(refUtc.getTime() - 6 * 86400_000);
  const startDate = new Date(endDate.getTime() - (days - 1) * 86400_000);

  const parameters = 'T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,ALLSKY_SFC_SW_DWN,WS2M';

  const queryPower = async (startStr: string, endStr: string) => {
    const url =
      `https://power.larc.nasa.gov/api/temporal/daily/point` +
      `?parameters=${parameters}` +
      `&community=AG` +
      `&longitude=${roundedLon}` +
      `&latitude=${roundedLat}` +
      `&start=${startStr}` +
      `&end=${endStr}` +
      `&format=JSON`;
    const upstream = await fetchWithTimeout(url, 12000);
    if (!upstream.ok) {
      throw new Error(`NASA POWER HTTP ${upstream.status}`);
    }
    return (await upstream.json()) as {
      properties?: {
        parameter?: Record<string, Record<string, number>>;
      };
      geometry?: { coordinates?: number[] };
    };
  };

  try {
    let data = await queryPower(formatYyyymmdd(startDate), formatYyyymmdd(endDate));

    const params = data.properties?.parameter ?? {};
    const dateKeys = Array.from({length: days}, (_, index) => formatYyyymmdd(new Date(startDate.getTime() + index * 86400000)));

    const cleanVal = (v: number | undefined): number | null =>
      v === undefined || v === null || !Number.isFinite(v) || v <= -900 ? null : Number(v.toFixed(2));

    const series = dateKeys
      .map((dk) => {
        const formatted = `${dk.slice(0, 4)}-${dk.slice(4, 6)}-${dk.slice(6, 8)}`;
        return {
          date: formatted,
          tempMean: cleanVal(params.T2M?.[dk]),
          tempMax: cleanVal(params.T2M_MAX?.[dk]),
          tempMin: cleanVal(params.T2M_MIN?.[dk]),
          precipitation: cleanVal(params.PRECTOTCORR?.[dk]),
          humidity: cleanVal(params.RH2M?.[dk]),
          solarIrradiance: cleanVal(params.ALLSKY_SFC_SW_DWN?.[dk]),
          windSpeed: cleanVal(params.WS2M?.[dk]),
        };
      });

    const avg = (arr: Array<number | null>): number | null => {
      const valid = arr.filter((x): x is number => x !== null);
      if (valid.length === 0) return null;
      return Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2));
    };

    const sum = (arr: Array<number | null>): number | null => {
      const valid = arr.filter((x): x is number => x !== null);
      if (valid.length === 0) return null;
      return Number(valid.reduce((a, b) => a + b, 0).toFixed(2));
    };

    const maxVal = (arr: Array<number | null>): number | null => {
      const valid = arr.filter((x): x is number => x !== null);
      if (valid.length === 0) return null;
      return Number(Math.max(...valid).toFixed(2));
    };

    const payload = {
      isLive: series.some(point => Object.entries(point).some(([key,value]) => key !== 'date' && typeof value === 'number' && Number.isFinite(value))),
      source: 'NASA POWER v2 (MERRA-2 / CERES)',
      lat: Number(roundedLat),
      lon: Number(roundedLon),
      fetchedAt: new Date().toISOString(),
      summary: {
        tempMean: avg(series.map((s) => s.tempMean)),
        tempMaxPeak: maxVal(series.map((s) => s.tempMax)),
        totalPrecipMm: sum(series.map((s) => s.precipitation)),
        humidityMean: avg(series.map((s) => s.humidity)),
        solarMeanKwh: avg(series.map((s) => s.solarIrradiance)),
        windMeanMs: avg(series.map((s) => s.windSpeed)),
      },
      series,
    };

    setCached(cacheKey, payload, 600_000); // 10-minute cache
    res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'NASA POWER fetch failed';
    res.status(200).json({
      isLive: false,
      source: 'NASA POWER v2 (Offline Fallback)',
      error: message,
      lat: Number(roundedLat),
      lon: Number(roundedLon),
      fetchedAt: new Date().toISOString(),
      summary: {
        tempMean: null,
        tempMaxPeak: null,
        totalPrecipMm: null,
        humidityMean: null,
        solarMeanKwh: null,
        windMeanMs: null,
      },
      series: [],
    });
  }
});

// NASA GIBS same-origin tile proxy.
// Browsers request tiles from this Express server; the server fetches NASA GIBS.
// This avoids browser-side image/CORS/connection issues while preserving NASA data.
app.get('/api/nasa/gibs-tile', async (req, res) => {
  const rawPath = typeof req.query.path === 'string' ? req.query.path : '';

  if (!rawPath) {
    return res.status(400).json({ error: 'missing_gibs_path' });
  }

  let upstreamUrl: string;
  try {
    upstreamUrl = resolveGibsTile(rawPath);
  } catch {
    return res.status(400).json({ error: 'invalid_gibs_path' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const upstream = await fetch(upstreamUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PiuraWatch-NASA-Observatory/1.0',
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*',
      },
    });

    updateNasaClock(upstream);

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: 'gibs_upstream_error',
        status: upstream.status,
      });
    }

    const body = Buffer.from(await upstream.arrayBuffer());
    const contentType = upstream.headers.get('content-type') ??
      (rawPath.endsWith('.png') ? 'image/png' : 'image/jpeg');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Data-Source', 'NASA GIBS');
    return res.send(body);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return res.status(504).json({ error: 'gibs_timeout' });
    }
    return res.status(502).json({ error: 'gibs_unavailable' });
  } finally {
    clearTimeout(timer);
  }
});

// 4. NASA GIBS WMTS Layer Definitions
app.get('/api/nasa/gibs-layers', (_req, res) => {
  const refUtc = getReferenceUtcDate();
  const recommendedDate = formatIsoDate(new Date(refUtc.getTime() - 2 * 86400_000));
  const terra8DayDate = formatIsoDate(new Date(refUtc.getTime() - 10 * 86400_000));

  res.json({
    recommendedDate,
    layers: [
      {
        id: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
        name: 'VIIRS Suomi NPP · Color Real',
        shortName: 'VIIRS Color Real',
        description: 'Reflectancia corregida diaria (375m) — cobertura nubosa, costas y bosques.',
        format: 'jpg',
        tileMatrixSet: 'GoogleMapsCompatible_Level9',
        maxNativeZoom: 9,
        defaultDate: recommendedDate,
        supportsDate: true,
        legendGradient: ['#1E3A5F', '#3A6B4C', '#C2A878', '#F8FAFC'],
        legendLabels: ['Océano', 'Bosque / Valle', 'Árido', 'Nubes'],
      },
      {
        id: 'MODIS_Terra_CorrectedReflectance_TrueColor',
        name: 'MODIS Terra · Color Real',
        shortName: 'MODIS True Color',
        description: 'Observación óptica matutina MODIS Terra (250m) para Piura y Sudamérica.',
        format: 'jpg',
        tileMatrixSet: 'GoogleMapsCompatible_Level9',
        maxNativeZoom: 9,
        defaultDate: recommendedDate,
        supportsDate: true,
        legendGradient: ['#1B365D', '#2F6F4E', '#B89F74', '#FFFFFF'],
        legendLabels: ['Agua', 'Cobertura vegetal', 'Suelo seco', 'Nubosidad'],
      },
      {
        id: 'MODIS_Terra_Land_Surface_Temp_Day',
        name: 'MODIS Terra · Temperatura Superficial (LST)',
        shortName: 'Temp. Superficial',
        description: 'Temperatura radiométrica diurna del suelo (1km) — islas de calor y estrés térmico.',
        format: 'png',
        tileMatrixSet: 'GoogleMapsCompatible_Level7',
        maxNativeZoom: 7,
        defaultDate: recommendedDate,
        supportsDate: true,
        legendGradient: ['#2563EB', '#06B6D4', '#FACC15', '#EF4444'],
        legendLabels: ['< 10°C', '20°C', '32°C', '> 42°C'],
      },
      {
        id: 'IMERG_Precipitation_Rate',
        name: 'GPM IMERG · Tasa de Precipitación',
        shortName: 'Precipitación GPM',
        description: 'Estimación satelital global de lluvias (mm/h) para detección de anomalías El Niño.',
        format: 'png',
        tileMatrixSet: 'GoogleMapsCompatible_Level6',
        maxNativeZoom: 6,
        defaultDate: recommendedDate,
        supportsDate: true,
        legendGradient: ['#0EA5E9', '#22C55E', '#EAB308', '#EF4444'],
        legendLabels: ['0.1 mm/h', '2 mm/h', '10 mm/h', '> 25 mm/h'],
      },
      {
        id: 'MODIS_Terra_Thermal_Anomalies_All',
        name: 'MODIS Terra · Anomalías Térmicas / Focos',
        shortName: 'Focos Térmicos',
        description: 'Detección activa de incendios forestales y quemas agrícolas en tiempo casi real.',
        format: 'png',
        tileMatrixSet: 'GoogleMapsCompatible_Level8',
        maxNativeZoom: 8,
        defaultDate: recommendedDate,
        supportsDate: true,
        legendGradient: ['#F59E0B', '#EF4444'],
        legendLabels: ['Anomalía media', 'Foco activo'],
      },
      {
        id: 'MODIS_Terra_NDVI_8Day',
        name: 'MODIS Terra · Índice Vegetal NDVI (8 días)',
        shortName: 'NDVI Vegetación',
        description: 'Vigor fotosintético de vegetación (8 días) para seguimiento de bosque seco y valles.',
        format: 'png',
        tileMatrixSet: 'GoogleMapsCompatible_Level9',
        maxNativeZoom: 9,
        defaultDate: terra8DayDate,
        supportsDate: true,
        legendGradient: ['#92400E', '#D97706', '#84CC16', '#15803D'],
        legendLabels: ['Suelo árido', 'Escasa', 'Moderada', 'Densa'],
      },
    ],
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--preview');

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : {
          port: Number(process.env.EARTHSHIFT_HMR_PORT) || PORT + 21678,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Piura Watch NASA Observatory server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
