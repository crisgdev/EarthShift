import type {
  NasaEonetResponse,
  NasaGibsLayer,
  NasaPowerResponse,
  NasaStatusResponse,
} from '../types/climate';

export async function fetchNasaStatus(): Promise<NasaStatusResponse> {
  const res = await fetch('/api/nasa/status');
  if (!res.ok) {
    throw new Error(`Error al verificar NASA API: ${res.status}`);
  }
  return res.json();
}

export async function fetchNasaEonetEvents(
  days = 45,
  limit = 75,
  category = 'all'
): Promise<NasaEonetResponse> {
  const params = new URLSearchParams({
    days: String(days),
    limit: String(limit),
    category,
  });
  const res = await fetch(`/api/nasa/eonet?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Error al consultar NASA EONET: ${res.status}`);
  }
  return res.json();
}

export async function fetchNasaPowerClimate(
  lat: number,
  lon: number,
  days = 30
): Promise<NasaPowerResponse> {
  const params = new URLSearchParams({
    lat: lat.toFixed(4),
    lon: lon.toFixed(4),
    days: String(days),
  });
  const res = await fetch(`/api/nasa/power?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Error al consultar NASA POWER: ${res.status}`);
  }
  return res.json();
}

export async function fetchNasaGibsLayers(): Promise<{
  recommendedDate: string;
  layers: NasaGibsLayer[];
}> {
  const res = await fetch('/api/nasa/gibs-layers');
  if (!res.ok) {
    throw new Error(`Error al cargar capas NASA GIBS: ${res.status}`);
  }
  return res.json();
}

export function buildGibsTileUrl(layer: NasaGibsLayer, dateIso: string): string {
  const activeDate = dateIso || layer.defaultDate;
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer.id}/default/${activeDate}/${layer.tileMatrixSet}/{z}/{y}/{x}.${layer.format}`;
}

export function translateEonetCategory(categoryId: string, fallbackTitle: string): string {
  switch (categoryId) {
    case 'wildfires':
      return 'Incendios Forestales';
    case 'severeStorms':
      return 'Tormentas Severas';
    case 'volcanoes':
      return 'Actividad Volcánica';
    case 'floods':
      return 'Inundaciones';
    case 'drought':
      return 'Sequía Extrema';
    case 'seaLakeIce':
      return 'Hielo Marino / Glacial';
    case 'dustHaze':
      return 'Polvo / Calima';
    case 'landslides':
      return 'Deslizamientos';
    case 'tempExtremes':
      return 'Temperaturas Extremas';
    default:
      return fallbackTitle;
  }
}

export function getEonetCategoryColor(categoryId: string): string {
  switch (categoryId) {
    case 'wildfires':
      return '#F97316';
    case 'severeStorms':
      return '#06B6D4';
    case 'volcanoes':
      return '#EF4444';
    case 'floods':
      return '#3B82F6';
    case 'drought':
      return '#EAB308';
    case 'seaLakeIce':
      return '#BAE6FD';
    default:
      return '#A855F7';
  }
}
