import * as THREE from 'three';

export type EarthSkinMode = 'bluemarble' | 'viirs' | 'lst' | 'imerg' | 'ndvi' | 'night';

const FALLBACK_CONTINENTS: Array<Array<[number, number]>> = [
  [
    [-79.5, 9.2], [-71.8, 12.2], [-62.0, 10.7], [-49.8, 0.2], [-34.8, -8.5],
    [-41.0, -22.2], [-52.0, -32.2], [-65.5, -45.0], [-68.5, -54.8], [-74.5, -52.5],
    [-73.5, -41.5], [-70.4, -18.5], [-77.2, -12.0], [-81.3, -4.7], [-78.2, 3.8],
  ],
  [
    [-168, 65.5], [-141, 69.8], [-95, 69.5], [-64, 60.2], [-55.5, 52],
    [-74, 40.5], [-80.2, 25.4], [-97.2, 26], [-87, 21.4], [-79.5, 9.2],
    [-92.2, 14.5], [-114.5, 31.5], [-124.5, 43], [-138, 59.5], [-166, 60],
  ],
  [
    [-5.8, 35.8], [10.5, 37.2], [32.5, 31.2], [43.3, 12.6], [51.2, 11.8],
    [40.5, -10.5], [28, -33], [18.3, -34], [12, -17], [8.5, 4.5],
    [-7.5, 4.5], [-17.4, 14.7], [-13.2, 27.8],
  ],
  [
    [-9.3, 38.7], [-4.5, 48.4], [10.5, 57.7], [25, 71], [72, 72.5],
    [135, 73], [179, 66.5], [156.5, 51], [129, 35.2], [114.2, 22.3],
    [103.8, 1.3], [77.5, 8.1], [56.5, 26.8], [32.5, 31.2], [18.5, 40.2],
  ],
  [
    [113.5, -22], [136.8, -12.2], [153.5, -28], [144.8, -38.4], [115, -34.3],
  ],
  [
    [-180, -72], [0, -70], [180, -72], [180, -90], [-180, -90],
  ],
];

export function createImmediateEarthBaseTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Deep ocean bathymetric gradient
  const ocean = ctx.createLinearGradient(0, 0, 0, h);
  ocean.addColorStop(0, '#10243C');
  ocean.addColorStop(0.25, '#07172C');
  ocean.addColorStop(0.5, '#041225');
  ocean.addColorStop(0.75, '#07172C');
  ocean.addColorStop(1, '#11263F');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, w, h);

  // Subtle orbital coordinate graticule
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 0.75;
  for (let lon = -150; lon <= 150; lon += 30) {
    const x = ((lon + 180) / 360) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Shaded continental shelves & landmasses
  for (const ring of FALLBACK_CONTINENTS) {
    ctx.save();
    ctx.beginPath();
    ring.forEach(([lon, lat], idx) => {
      const x = ((lon + 180) / 360) * w;
      const y = ((90 - lat) / 180) * h;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();

    ctx.shadowColor = 'rgba(14, 165, 233, 0.45)';
    ctx.shadowBlur = 14;
    const landGrad = ctx.createLinearGradient(0, 0, w, h);
    landGrad.addColorStop(0, '#1C3F37');
    landGrad.addColorStop(0.5, '#254C3F');
    landGrad.addColorStop(1, '#1A342E');
    ctx.fillStyle = landGrad;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.35)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createCloudLayerTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  const hash = (a: number, b: number) => {
    const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };

  for (let i = 0; i < 560; i++) {
    const x = hash(i, 1.7) * w;
    const y = (0.08 + hash(i, 3.9) * 0.84) * h;
    const rw = 16 + hash(i, 7.1) * 72;
    const rh = 4 + hash(i, 9.4) * 14;
    const alpha = 0.03 + hash(i, 13.2) * 0.11;
    ctx.fillStyle = `rgba(226, 242, 255, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rw, rh, (hash(i, 17.5) - 0.5) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

const textureCache = new Map<string, THREE.CanvasTexture>();
const rawCanvasCache = new Map<string, HTMLCanvasElement>();

function loadTileImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 15000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = url;
  });
}

async function fetchStitchedGridCanvas(
  cacheId: string,
  urlBuilder: (r: number, c: number) => string,
  transparentBg = false
): Promise<HTMLCanvasElement | null> {
  const existing = rawCanvasCache.get(cacheId);
  if (existing) return existing;

  // NASA GIBS EPSG:4326 at z=2: exact 5 columns (72 deg each = 360 deg) x 3 rows (top 2.5 tiles = 180 deg)
  const cols = 5;
  const rows = 3;
  const tileSize = 512; // 2560 x 1280 crisp global mosaic

  const jobs: Array<Promise<{ r: number; c: number; img: HTMLImageElement | null }>> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      jobs.push(loadTileImage(urlBuilder(r, c)).then((img) => ({ r, c, img })));
    }
  }

  const results = await Promise.all(jobs);
  const loadedCount = results.filter((x) => x.img !== null).length;
  if (loadedCount < 6) return null;

  const canvas = document.createElement('canvas');
  canvas.width = cols * tileSize; // 2560
  canvas.height = (rows - 0.5) * tileSize; // 1280
  const ctx = canvas.getContext('2d')!;

  if (!transparentBg) {
    ctx.fillStyle = '#040B16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  for (const item of results) {
    if (item.img) {
      ctx.drawImage(
        item.img,
        item.c * tileSize,
        item.r * tileSize,
        tileSize,
        tileSize
      );
    }
  }

  rawCanvasCache.set(cacheId, canvas);
  return canvas;
}

/**
 * Loads real NASA GIBS global satellite textures mapped 1:1 to equirectangular SphereGeometry UVs.
 * Scientific data overlays (LST, IMERG, NDVI) are composited cleanly over Blue Marble.
 */
export async function loadNasaGibsEarthTexture(
  mode: EarthSkinMode,
  dateIso: string,
  maxAnisotropy = 4
): Promise<THREE.CanvasTexture | null> {
  const safeDate = dateIso || '2025-11-10';
  const staticMode = mode === 'bluemarble' || mode === 'night';
  const cacheKey = `${mode}_${staticMode ? 'static' : safeDate}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  let finalCanvas: HTMLCanvasElement | null = null;

  if (mode === 'bluemarble') {
    finalCanvas = await fetchStitchedGridCanvas(
      'bluemarble_base',
      (r, c) =>
        `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_NextGeneration/default/500m/2/${r}/${c}.jpg`
    );
  } else if (mode === 'night') {
    finalCanvas = await fetchStitchedGridCanvas(
      'night_blackmarble',
      (r, c) =>
        `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/VIIRS_Black_Marble/default/2016-01-01/500m/2/${r}/${c}.png`
    );
  } else if (mode === 'viirs') {
    finalCanvas = await fetchStitchedGridCanvas(
      `viirs_${safeDate}`,
      (r, c) =>
        `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${safeDate}/250m/2/${r}/${c}.jpg`
    );
  } else {
    // Composite scientific NASA data layer (LST, GPM IMERG, or MODIS NDVI) over Blue Marble
    const basePromise = fetchStitchedGridCanvas(
      'bluemarble_base',
      (r, c) =>
        `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_NextGeneration/default/500m/2/${r}/${c}.jpg`
    );

    // 8-day NDVI uses slightly earlier 8-day composite date for guaranteed availability
    const dObj = new Date(safeDate + 'T00:00:00Z');
    const ndviDate = Number.isNaN(dObj.getTime())
      ? '2025-11-01'
      : new Date(dObj.getTime() - 9 * 86400_000).toISOString().slice(0, 10);

    const overlayPromise = fetchStitchedGridCanvas(
      `${mode}_${mode === 'ndvi' ? ndviDate : safeDate}`,
      (r, c) => {
        if (mode === 'lst') {
          return `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/MODIS_Terra_Land_Surface_Temp_Day/default/${safeDate}/1km/2/${r}/${c}.png`;
        }
        if (mode === 'imerg') {
          return `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/IMERG_Precipitation_Rate/default/${safeDate}/2km/2/${r}/${c}.png`;
        }
        return `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/MODIS_Terra_NDVI_8Day/default/${ndviDate}/250m/2/${r}/${c}.png`;
      },
      true
    );

    const [baseCanvas, overlayCanvas] = await Promise.all([basePromise, overlayPromise]);
    if (baseCanvas) {
      const comp = document.createElement('canvas');
      comp.width = baseCanvas.width;
      comp.height = baseCanvas.height;
      const ctx = comp.getContext('2d')!;
      ctx.drawImage(baseCanvas, 0, 0);
      if (overlayCanvas) {
        ctx.save();
        ctx.globalAlpha = mode === 'imerg' ? 0.92 : 0.78;
        ctx.drawImage(overlayCanvas, 0, 0);
        ctx.restore();
      }
      finalCanvas = comp;
    }
  }

  if (!finalCanvas) return null;

  const tex = new THREE.CanvasTexture(finalCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;

  textureCache.set(cacheKey, tex);
  return tex;
}
