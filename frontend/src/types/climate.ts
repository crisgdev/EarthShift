export type NavSection =
  | 'orbit'
  | 'map'
  | 'paradox'
  | 'collapse'
  | 'decision'
  | 'trends';

export interface GeoCoordinates {
  lat: number;
  lon: number;
  label: string;
  subtitle?: string;
}

export interface NasaEonetEvent {
  id: string;
  title: string;
  categoryId: string;
  categoryTitle: string;
  lat: number;
  lon: number;
  date: string;
  sourceUrl: string;
  magnitudeValue: number | null;
  magnitudeUnit: string | null;
}

export interface NasaEonetResponse {
  isLive: boolean;
  source: string;
  fetchedAt: string;
  nasaServerUtc: string;
  count: number;
  events: NasaEonetEvent[];
  error?: string;
}

export interface NasaPowerPoint {
  date: string;
  tempMean: number | null;
  tempMax: number | null;
  tempMin: number | null;
  precipitation: number | null;
  humidity: number | null;
  solarIrradiance: number | null;
  windSpeed: number | null;
}

export interface NasaPowerSummary {
  tempMean: number | null;
  tempMaxPeak: number | null;
  totalPrecipMm: number | null;
  humidityMean: number | null;
  solarMeanKwh: number | null;
  windMeanMs: number | null;
}

export interface NasaPowerResponse {
  isLive: boolean;
  source: string;
  lat: number;
  lon: number;
  fetchedAt: string;
  summary: NasaPowerSummary;
  series: NasaPowerPoint[];
  error?: string;
}

export interface NasaGibsLayer {
  id: string;
  name: string;
  shortName: string;
  description: string;
  format: 'jpg' | 'png';
  tileMatrixSet: string;
  maxNativeZoom: number;
  defaultDate: string;
  supportsDate: boolean;
  legendGradient: string[];
  legendLabels: string[];
}

export interface NasaStatusResponse {
  status: string;
  nasaServerUtc: string;
  gibsRecommendedDate: string;
  endpoints: {
    eonet: { online: boolean; label: string };
    power: { online: boolean; label: string };
    gibs: { online: boolean; label: string };
  };
  hasCustomNasaKey: boolean;
  hasFirmsKey: boolean;
}

export interface PiuraStation {
  id: string;
  name: string;
  province: string;
  ecosystem: string;
  lat: number;
  lon: number;
  radiusKm: number;
  ndviCurrent: number;
  ndviBaseline: number;
  woodyLossPct: number;
  resilienceScore: number;
  thermalAnomalyC: number;
  status: 'Estable' | 'Alerta temprana' | 'Crítico';
  summary: string;
  decisionMetrics: {
    waterSecurity: number;
    biodiversity: number;
    agroImpact: number;
    degradationUrgency: number;
    estimatedCostUsdK: number;
    hectaresTarget: number;
  };
}

export interface ParadoxCase {
  id: string;
  zone: string;
  headline: string;
  apparentSignal: string;
  satelliteReality: string;
  ndviSpikePct: number;
  woodyCanopyDeltaPct: number;
  lstDeltaC: number;
  soilMoistureAnomalyPct: number;
  explanation: string;
}

export interface CollapseSignalPoint {
  period: string;
  ndvi: number;
  ar1Autocorrelation: number;
  varianceIndex: number;
  moistureDeficit: number;
}

export interface HistoricalYearPoint {
  year: number;
  ndviMean: number;
  precipMm: number;
  tempMeanC: number;
  forestCoverHa: number;
  eventNote?: string;
}
