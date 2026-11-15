import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Droplets,
  ExternalLink,
  Globe2,
  Layers,
  Loader2,
  Maximize2,
  RefreshCw,
  SlidersHorizontal,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  GeoCoordinates,
  NasaEonetEvent,
  NasaGibsLayer,
  NasaPowerResponse,
  PiuraStation,
} from '../types/climate';
import {
  buildGibsTileUrl,
  getEonetCategoryColor,
  translateEonetCategory,
} from '../services/nasaClient';
import { EarthGlobe3D } from './EarthGlobe3D';

export interface NasaMapExplorerProps {
  stations: PiuraStation[];
  eonetEvents: NasaEonetEvent[];
  gibsLayers: NasaGibsLayer[];
  recommendedGibsDate: string;
  selectedLocation: GeoCoordinates;
  selectedStation: PiuraStation | null;
  selectedEvent: NasaEonetEvent | null;
  powerData: NasaPowerResponse | null;
  powerLoading: boolean;
  onSelectLocation: (coords: GeoCoordinates) => void;
  onSelectStation: (station: PiuraStation) => void;
  onSelectEvent: (ev: NasaEonetEvent) => void;
  onRefreshPower: () => void;
  onReturnToGlobe: () => void;
}

export const NasaMapExplorer: React.FC<NasaMapExplorerProps> = ({
  stations,
  eonetEvents,
  gibsLayers,
  recommendedGibsDate,
  selectedLocation,
  selectedStation,
  selectedEvent,
  powerData,
  powerLoading,
  onSelectLocation,
  onSelectStation,
  onSelectEvent,
  onRefreshPower,
  onReturnToGlobe,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const [baseMap, setBaseMap] = useState<'imagery' | 'dark'>('imagery');
  const [baseMapError, setBaseMapError] = useState(false);
  const gibsTileLayerRef = useRef<L.TileLayer | null>(null);
  const stationsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const eonetLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const probeMarkerRef = useRef<L.CircleMarker | null>(null);

  const [panelOpen, setPanelOpen] = useState(true);
  const [showMiniGlobe, setShowMiniGlobe] = useState(false);
  const [activeLayerId, setActiveLayerId] = useState<string>(
    gibsLayers[0]?.id ?? 'VIIRS_SNPP_CorrectedReflectance_TrueColor'
  );
  const [gibsDate, setGibsDate] = useState<string>(recommendedGibsDate || '2025-11-10');
  const [gibsOpacity, setGibsOpacity] = useState<number>(0.8);
  const [showGibsLayer, setShowGibsLayer] = useState<boolean>(false);
  const [showEonetPins, setShowEonetPins] = useState<boolean>(true);
  const [chartVar, setChartVar] = useState<'temp' | 'precip' | 'solar' | 'wind'>('temp');

  const callbacksRef = useRef({
    onSelectLocation,
    onSelectStation,
    onSelectEvent,
  });

  useEffect(() => {
    callbacksRef.current = {
      onSelectLocation,
      onSelectStation,
      onSelectEvent,
    };
  }, [onSelectLocation, onSelectStation, onSelectEvent]);

  useEffect(() => {
    if (recommendedGibsDate && !gibsDate) {
      setGibsDate(recommendedGibsDate);
    }
  }, [recommendedGibsDate, gibsDate]);

  useEffect(() => {
    if (gibsLayers.length > 0 && !gibsLayers.some((l) => l.id === activeLayerId)) {
      setActiveLayerId(gibsLayers[0].id);
    }
  }, [gibsLayers, activeLayerId]);

  const activeLayer = useMemo(
    () => gibsLayers.find((l) => l.id === activeLayerId) ?? gibsLayers[0] ?? null,
    [gibsLayers, activeLayerId]
  );

  useEffect(() => {
    if (activeLayer?.defaultDate && activeLayer.id === 'MODIS_Terra_NDVI_8Day') {
      setGibsDate(activeLayer.defaultDate);
    }
  }, [activeLayer]);

  // 1. Initialize Edge-to-Edge Leaflet Map
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el || mapInstanceRef.current) return;

    const map = L.map(el, {
      center: [selectedLocation.lat, selectedLocation.lon],
      zoom: 12,
      minZoom: 3,
      maxZoom: 15,
      zoomControl: false,
      worldCopyJump: true,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    const stationsGrp = L.layerGroup().addTo(map);
    const eonetGrp = L.layerGroup().addTo(map);

    const probe = L.circleMarker([selectedLocation.lat, selectedLocation.lon], {
      radius: 8,
      color: '#22D3EE',
      weight: 2,
      fillColor: '#06B6D4',
      fillOpacity: 0.35,
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = Number(e.latlng.lat.toFixed(4));
      const lon = Number(e.latlng.lng.toFixed(4));
      callbacksRef.current.onSelectLocation({
        lat,
        lon,
        label: `Sonda ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
        subtitle: 'Punto consultado en Mapa NASA',
      });
    });

    mapInstanceRef.current = map;
    stationsLayerGroupRef.current = stationsGrp;
    eonetLayerGroupRef.current = eonetGrp;
    probeMarkerRef.current = probe;

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      gibsTileLayerRef.current = null;
      baseTileLayerRef.current = null;
      stationsLayerGroupRef.current = null;
      eonetLayerGroupRef.current = null;
      probeMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // High resolution imagery stays independent of the dated NASA overlays.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (baseTileLayerRef.current) map.removeLayer(baseTileLayerRef.current);
    setBaseMapError(false);
    const key = import.meta.env.VITE_CARTO_API_KEY?.trim();
    const imagery = baseMap === 'imagery';
    const url = imagery
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png' + (key ? '?key=' + encodeURIComponent(key) : '');
    const layer = L.tileLayer(url, {
      maxZoom: 15,
      maxNativeZoom: 15,
      zIndex: 1,
      attribution: imagery
        ? 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    });
    layer.on('tileerror', () => setBaseMapError(true));
    layer.addTo(map);
    baseTileLayerRef.current = layer;
    return () => { map.removeLayer(layer); baseTileLayerRef.current = null; };
  }, [baseMap]);

  // 2. Update NASA GIBS Satellite Overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (gibsTileLayerRef.current) {
      map.removeLayer(gibsTileLayerRef.current);
      gibsTileLayerRef.current = null;
    }

    if (showGibsLayer && activeLayer) {
      const tileUrl = buildGibsTileUrl(activeLayer, gibsDate || activeLayer.defaultDate);
      const gibsLayer = L.tileLayer(tileUrl, {
        opacity: gibsOpacity,
        maxNativeZoom: activeLayer.maxNativeZoom,
        maxZoom: 15,
        zIndex: 2,
        tileSize: 256,
        attribution: `NASA GIBS (${activeLayer.shortName})`,
      });
      gibsLayer.addTo(map);
      gibsTileLayerRef.current = gibsLayer;
    }
  }, [activeLayer, gibsDate, gibsOpacity, showGibsLayer]);

  // 3. Update Piura Watch Stations
  useEffect(() => {
    const grp = stationsLayerGroupRef.current;
    if (!grp) return;
    grp.clearLayers();

    stations.forEach((st) => {
      const color =
        st.status === 'Crítico'
          ? '#FB7185'
          : st.status === 'Alerta temprana'
          ? '#F59E0B'
          : '#34D399';

      const circle = L.circle([st.lat, st.lon], {
        radius: st.radiusKm * 1000,
        color,
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.14,
      });

      const marker = L.circleMarker([st.lat, st.lon], {
        radius: 6,
        color: '#05080F',
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      });

      marker.bindTooltip(`${st.name} · NDVI ${st.ndviCurrent.toFixed(2)}`, {
        direction: 'top',
        offset: [0, -6],
      });

      const handleClick = () => {
        callbacksRef.current.onSelectStation(st);
      };

      circle.on('click', handleClick);
      marker.on('click', handleClick);

      grp.addLayer(circle);
      grp.addLayer(marker);
    });
  }, [stations]);

  const filteredEonetEvents = useMemo(
    () =>
      eonetEvents.filter(
        (ev) => ev.lat >= -32 && ev.lat <= 14 && ev.lon >= -106 && ev.lon <= -52
      ),
    [eonetEvents]
  );

  // 4. Update NASA EONET Pins
  useEffect(() => {
    const grp = eonetLayerGroupRef.current;
    if (!grp) return;
    grp.clearLayers();
    if (!showEonetPins) return;

    filteredEonetEvents.forEach((ev) => {
      const color = getEonetCategoryColor(ev.categoryId);
      const isSelected = selectedEvent?.id === ev.id;
      const marker = L.circleMarker([ev.lat, ev.lon], {
        radius: isSelected ? 9 : 6,
        color: isSelected ? '#FFFFFF' : '#05080F',
        weight: isSelected ? 2.5 : 1.5,
        fillColor: color,
        fillOpacity: 0.92,
      });

      marker.bindTooltip(
        `${ev.title} (${translateEonetCategory(ev.categoryId, ev.categoryTitle)})`,
        { direction: 'top', offset: [0, -6] }
      );

      marker.on('click', () => {
        callbacksRef.current.onSelectEvent(ev);
      });

      grp.addLayer(marker);
    });
  }, [filteredEonetEvents, showEonetPins, selectedEvent]);

  // 5. Sync Map FlyTo with 3D Globe / Station selection
  useEffect(() => {
    const map = mapInstanceRef.current;
    const probe = probeMarkerRef.current;
    if (!map || !probe) return;

    probe.setLatLng([selectedLocation.lat, selectedLocation.lon]);
    const currentCenter = map.getCenter();
    const dist = currentCenter.distanceTo([selectedLocation.lat, selectedLocation.lon]);
    if (dist > 4000) {
      map.flyTo([selectedLocation.lat, selectedLocation.lon], Math.max(map.getZoom(), 8), {
        duration: 0.85,
      });
    }
  }, [selectedLocation.lat, selectedLocation.lon]);

  const chartSeries = useMemo(() => {
    if (!powerData?.series) return [];
    return powerData.series.map((pt) => ({
      date: pt.date.slice(5),
      value:
        chartVar === 'temp'
          ? pt.tempMean
          : chartVar === 'precip'
          ? pt.precipitation
          : chartVar === 'solar'
          ? pt.solarIrradiance
          : pt.windSpeed,
    }));
  }, [powerData, chartVar]);

  const activeChartStroke =
    chartVar === 'temp'
      ? '#22D3EE'
      : chartVar === 'precip'
      ? '#38BDF8'
      : chartVar === 'solar'
      ? '#FBBF24'
      : '#34D399';

  const activeChartName =
    chartVar === 'temp'
      ? 'Temp °C'
      : chartVar === 'precip'
      ? 'Lluvia mm'
      : chartVar === 'solar'
      ? 'Solar kWh'
      : 'Viento m/s';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#04070D]">
      {/* Full-Viewport Edge-to-Edge Satellite Map */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* Left Floating Satellite Layer & Live NASA POWER Inspector */}
      <div className="pointer-events-none absolute top-16 left-4 sm:left-5 z-[450] flex items-start gap-2">
        <AnimatePresence initial={false}>
          {panelOpen && (
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto w-[300px] sm:w-[320px] max-h-[calc(100vh-8rem)] overflow-y-auto rounded-lg bg-[#050811]/95 border border-white/[0.11] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.8)] space-y-4"
            >
              <div className="space-y-3 pb-4 border-b border-white/[0.08]">
                <label htmlFor="nature-basemap" className="text-sm font-semibold text-white">Explorar naturaleza</label>
                <select id="nature-basemap" value={baseMap}
                  onChange={(e) => setBaseMap(e.target.value as 'imagery' | 'dark')}
                  className="w-full bg-[#03050A] border border-white/20 text-xs text-slate-100 rounded-lg px-2.5 py-2">
                  <option value="imagery">Imágenes Esri · Satélite de detalle</option>
                  <option value="dark">CARTO ? Mapa oscuro</option>
                </select>
                <p className="text-[11px] leading-relaxed text-slate-300">Acércate para explorar vegetación, ríos, manglares y cultivos. El detalle y la fecha de las imágenes varían según la zona; no son imágenes en vivo.</p>
                <button type="button" onClick={() => { setBaseMap('imagery'); setShowGibsLayer(false); const map = mapInstanceRef.current; if (map) map.flyTo(map.getCenter(), 15); }}
                  className="w-full rounded-lg bg-emerald-400/15 border border-emerald-400/30 px-3 py-2 text-xs font-semibold text-emerald-300">Ver detalle del ecosistema</button>
                {baseMapError && <p role="status" className="text-xs text-amber-300">Algunas imágenes no pudieron cargar. Comprueba tu conexión o prueba otro mapa base.</p>}
              </div>
              {/* Satellite Layer Controls */}
              <div className="space-y-3 pb-4 border-b border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-display font-semibold text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Análisis NASA GIBS
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGibsLayer((v) => !v)}
                    className={`text-[11px] font-mono cursor-pointer ${
                      showGibsLayer ? 'text-cyan-400' : 'text-slate-500'
                    }`}
                  >
                    {showGibsLayer ? 'Activa' : 'Oculta'}
                  </button>
                </div>

                <select
                  value={activeLayerId}
                  onChange={(e) => setActiveLayerId(e.target.value)}
                  aria-label="Seleccionar capa satelital NASA GIBS"
                  className="w-full bg-[#03050A] border border-white/[0.1] text-xs text-slate-100 rounded-lg px-2.5 py-2 outline-none focus:border-cyan-400 cursor-pointer"
                >
                  {gibsLayers.map((layer) => (
                    <option key={layer.id} value={layer.id}>
                      {layer.name}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex items-center gap-1.5 bg-[#03050A] border border-white/[0.1] rounded-lg px-2 py-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="date"
                      value={gibsDate}
                      onChange={(e) => setGibsDate(e.target.value)}
                      aria-label="Fecha satelital"
                      className="bg-transparent text-[11px] font-mono text-slate-200 outline-none w-full cursor-pointer"
                    />
                  </div>
                  <label className="flex items-center gap-2 bg-[#03050A] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300 cursor-pointer">
                    <SlidersHorizontal className="w-3 h-3 text-cyan-400 shrink-0" />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={gibsOpacity}
                      onChange={(e) => setGibsOpacity(Number(e.target.value))}
                      className="sci-range w-full"
                    />
                  </label>
                </div>

                {activeLayer && showGibsLayer && (
                  <div className="pt-1">
                    <div
                      className="h-1.5 w-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${activeLayer.legendGradient.join(', ')})`,
                      }}
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                      {activeLayer.legendLabels.map((lbl) => (
                        <span key={lbl}>{lbl}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Active Point NASA POWER Readout */}
              <div className="space-y-3 pb-4 border-b border-white/[0.08]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[11px] font-mono text-cyan-400 tabular-nums">
                      {selectedLocation.lat.toFixed(3)}°, {selectedLocation.lon.toFixed(3)}°
                    </span>
                    <h3 className="text-sm font-display font-semibold text-white truncate mt-0.5">
                      {selectedLocation.label}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={onRefreshPower}
                    disabled={powerLoading}
                    aria-label="Actualizar NASA POWER"
                    className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-cyan-300 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${powerLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {powerLoading ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>Consultando NASA POWER...</span>
                  </div>
                ) : powerData?.isLive ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Temp. 2m</span>
                        <span className="text-lg font-mono font-semibold text-white tabular-nums">
                          {powerData.summary.tempMean?.toFixed(1) ?? '—'} °C
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Lluvia 30d</span>
                        <span className="text-lg font-mono font-semibold text-cyan-300 tabular-nums">
                          {powerData.summary.totalPrecipMm?.toFixed(1) ?? '—'} mm
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Irradiancia</span>
                        <span className="text-sm font-mono font-semibold text-amber-300 tabular-nums">
                          {powerData.summary.solarMeanKwh?.toFixed(2) ?? '—'} kWh
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Humedad</span>
                        <span className="text-sm font-mono font-semibold text-emerald-300 tabular-nums">
                          {powerData.summary.humidityMean?.toFixed(0) ?? '—'} %
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-[#03050A] border border-white/[0.06]">
                      {(
                        [
                          { id: 'temp', label: 'Temp', icon: Thermometer },
                          { id: 'precip', label: 'Lluvia', icon: Droplets },
                          { id: 'solar', label: 'Solar', icon: Sun },
                          { id: 'wind', label: 'Viento', icon: Wind },
                        ] as const
                      ).map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setChartVar(tab.id)}
                            className={`py-1 rounded text-[10px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                              chartVar === tab.id
                                ? 'bg-white/[0.12] text-white'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="h-20 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartSeries} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                          <defs>
                            <linearGradient id="mapHudGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={activeChartStroke} stopOpacity={0.34} />
                              <stop offset="95%" stopColor={activeChartStroke} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" hide />
                          <YAxis domain={['auto', 'auto']} hide />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#070B14',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              fontSize: '11px',
                              color: '#F1F5F9',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            name={activeChartName}
                            stroke={activeChartStroke}
                            strokeWidth={1.8}
                            fill="url(#mapHudGrad)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400">
                    Haz clic sobre el mapa para leer parámetros climáticos de la NASA.
                  </p>
                )}
              </div>

              {/* Regional EONET Toggle & Selected Event */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">Eventos NASA regionales</span>
                  <button
                    type="button"
                    onClick={() => setShowEonetPins((v) => !v)}
                    className={`text-[11px] font-mono cursor-pointer ${
                      showEonetPins ? 'text-amber-400' : 'text-slate-500'
                    }`}
                  >
                    {showEonetPins ? `${filteredEonetEvents.length} en región` : 'Ocultos'}
                  </button>
                </div>

                {selectedEvent && (
                  <div className="p-2.5 rounded bg-white/[0.04] border border-white/[0.08] text-xs space-y-1">
                    <div className="font-medium text-white line-clamp-1">{selectedEvent.title}</div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span style={{ color: getEonetCategoryColor(selectedEvent.categoryId) }}>
                        {translateEonetCategory(
                          selectedEvent.categoryId,
                          selectedEvent.categoryTitle
                        )}
                      </span>
                      <a
                        href={selectedEvent.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-cyan-300 hover:underline"
                      >
                        Ver NASA <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          aria-label="Alternar panel de mapa NASA"
          className="pointer-events-auto p-2 rounded-lg bg-[#050811]/95 border border-white/[0.11] text-slate-300 hover:text-white cursor-pointer"
        >
          {panelOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom Sleek Single-Line Piura Sub-Basin Dock */}
      <div className="pointer-events-auto hidden md:flex items-center gap-1 absolute bottom-4 left-1/2 -translate-x-1/2 z-[450] px-2 py-1.5 rounded-lg bg-[#050811]/94 border border-white/[0.12] shadow-[0_18px_45px_rgba(0,0,0,0.85)]">
        {stations.map((st) => (
          <button
            key={st.id}
            type="button"
            onClick={() => onSelectStation(st)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              selectedStation?.id === st.id
                ? 'bg-cyan-400 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            {st.name.replace('Bosque Seco de ', '').replace('Cuenca Alta ', '').replace('Tablazo de ', '').split(' · ')[0]}
          </button>
        ))}
        <span className="h-4 w-[1px] bg-white/[0.12] mx-1" aria-hidden="true" />
        <button
          type="button"
          onClick={() => {
            mapInstanceRef.current?.flyTo([-5.1945, -80.6328], 8, { duration: 0.7 });
          }}
          className="px-2.5 py-1 rounded text-xs font-mono text-emerald-300 hover:bg-emerald-500/15 whitespace-nowrap cursor-pointer"
        >
          Piura
        </button>
      </div>

      {/* Bottom-Right On-Demand Synchronized PiP 3D Rotating Earth */}
      <div className="absolute bottom-4 right-4 z-[450] flex flex-col items-end gap-2">
        {showMiniGlobe ? (
          <div className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-lg overflow-hidden border border-white/[0.14] bg-[#04070D] shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
            <EarthGlobe3D
              minimal
              stations={stations}
              eonetEvents={filteredEonetEvents}
              selectedLocation={selectedLocation}
              selectedEventId={selectedEvent?.id ?? null}
              gibsDate={gibsDate}
              onSelectLocation={onSelectLocation}
              onSelectStation={onSelectStation}
              onSelectEvent={onSelectEvent}
            />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
              <span className="text-[10px] font-mono text-slate-300 bg-[#05080F]/90 px-2 py-0.5 rounded">
                Órbita 3D
              </span>
              <div className="pointer-events-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={onReturnToGlobe}
                  title="Expandir Globo 3D"
                  className="p-1.5 rounded bg-[#05080F]/90 border border-white/[0.1] text-cyan-300 hover:bg-cyan-400 hover:text-slate-950 transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowMiniGlobe(false)}
                  title="Minimizar Globo"
                  className="px-2 py-1 rounded bg-[#05080F]/90 border border-white/[0.1] text-[10px] text-slate-300 hover:text-white cursor-pointer"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowMiniGlobe(true)}
            className="px-3 py-1.5 rounded-lg bg-[#050811]/94 border border-white/[0.12] text-xs font-medium text-cyan-300 hover:border-cyan-400/50 shadow-xl inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Globe2 className="w-3.5 h-3.5" />
            Globo 3D
          </button>
        )}
      </div>
    </div>
  );
};
