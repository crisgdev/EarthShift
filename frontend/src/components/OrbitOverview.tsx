import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Droplets,
  ExternalLink,
  Flame,
  Loader2,
  MapPin,
  Sun,
  Thermometer,
  Wind,
  X,
} from 'lucide-react';
import type {
  GeoCoordinates,
  NasaEonetEvent,
  NasaPowerResponse,
  PiuraStation,
} from '../types/climate';
import { EarthGlobe3D } from './EarthGlobe3D';
import { getEonetCategoryColor, translateEonetCategory } from '../services/nasaClient';

interface OrbitOverviewProps {
  stations: PiuraStation[];
  eonetEvents: NasaEonetEvent[];
  selectedLocation: GeoCoordinates;
  selectedStation: PiuraStation | null;
  selectedEvent: NasaEonetEvent | null;
  gibsDate: string;
  powerData: NasaPowerResponse | null;
  powerLoading: boolean;
  onSelectLocation: (coords: GeoCoordinates) => void;
  onSelectStation: (station: PiuraStation) => void;
  onSelectEvent: (ev: NasaEonetEvent) => void;
  onOpenInMap: () => void;
  onOpenParadox?: () => void;
  onTexturesReady: () => void;
}

type ChartVariable = 'temp' | 'precip' | 'solar' | 'wind';

const CHART_META: Record<
  ChartVariable,
  { label: string; unit: string; color: string; gradId: string }
> = {
  temp: { label: 'Temp', unit: '°C', color: '#22D3EE', gradId: 'hudTempGrad' },
  precip: { label: 'Lluvia', unit: 'mm', color: '#38BDF8', gradId: 'hudRainGrad' },
  solar: { label: 'Solar', unit: 'kWh', color: '#FBBF24', gradId: 'hudSolarGrad' },
  wind: { label: 'Viento', unit: 'm/s', color: '#34D399', gradId: 'hudWindGrad' },
};

export const OrbitOverview: React.FC<OrbitOverviewProps> = ({
  stations,
  eonetEvents,
  selectedLocation,
  selectedStation,
  selectedEvent,
  gibsDate,
  powerData,
  powerLoading,
  onSelectLocation,
  onSelectStation,
  onSelectEvent,
  onOpenInMap,
  onOpenParadox,
  onTexturesReady,
}) => {
  const [leftOpen, setLeftOpen] = useState(true);
  const [alertsDrawerOpen, setAlertsDrawerOpen] = useState(false);
  const [chartVar, setChartVar] = useState<ChartVariable>('temp');

  const regionalEonet = useMemo(() => {
    const nearby = eonetEvents.filter(
      (ev) => ev.lat >= -32 && ev.lat <= 14 && ev.lon >= -106 && ev.lon <= -52
    );
    return nearby.length > 0 ? nearby : eonetEvents.slice(0, 8);
  }, [eonetEvents]);

  const chartData = useMemo(() => {
    if (!powerData?.series) return [];
    return powerData.series.map((d) => ({
      date: d.date.slice(5),
      value:
        chartVar === 'temp'
          ? d.tempMean
          : chartVar === 'precip'
          ? d.precipitation
          : chartVar === 'solar'
          ? d.solarIrradiance
          : d.windSpeed,
    }));
  }, [powerData, chartVar]);

  const activeHeadlineValue = useMemo(() => {
    const sum = powerData?.summary;
    if (!sum) return '—';
    if (chartVar === 'temp') return sum.tempMean?.toFixed(1) ?? '—';
    if (chartVar === 'precip') return sum.totalPrecipMm?.toFixed(1) ?? '—';
    if (chartVar === 'solar') return sum.solarMeanKwh?.toFixed(2) ?? '—';
    return sum.windMeanMs?.toFixed(1) ?? '—';
  }, [powerData, chartVar]);

  const activeMeta = CHART_META[chartVar];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#03050A]">
      {/* Full-Viewport 3D Rotating NASA Globe Focused on Piura */}
      <div className="absolute inset-0">
        <EarthGlobe3D
          fullBleed
          stations={stations}
          eonetEvents={regionalEonet}
          selectedLocation={selectedLocation}
          selectedEventId={selectedEvent?.id ?? null}
          gibsDate={gibsDate}
          onSelectLocation={onSelectLocation}
          onSelectStation={onSelectStation}
          onSelectEvent={onSelectEvent}
          onOpenInMap={onOpenInMap}
          onTexturesReady={onTexturesReady}
        />
      </div>

      {/* Left Slim Piura Observatory Console (No backdrop-blur over WebGL) */}
      <div className="pointer-events-none absolute top-16 left-4 sm:left-5 z-20 flex items-start gap-2">
        <AnimatePresence initial={false}>
          {leftOpen && (
            <motion.aside
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto w-[300px] sm:w-[322px] max-h-[calc(100vh-9.5rem)] overflow-y-auto rounded-lg bg-[#050811]/95 border border-white/[0.11] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.8)] space-y-4"
            >
              {/* Active Piura Coordinate Header */}
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/[0.08]">
                <div className="min-w-0">
                  <span className="text-[11px] font-mono text-cyan-400 tabular-nums">
                    Piura · {selectedLocation.lat.toFixed(2)}°, {selectedLocation.lon.toFixed(2)}°
                  </span>
                  <h2 className="text-base font-display font-semibold text-white truncate mt-0.5">
                    {selectedLocation.label}
                  </h2>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {selectedLocation.subtitle ?? 'Telemetría NASA POWER'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenInMap}
                  title="Inspeccionar en Mapa NASA"
                  className="p-2 rounded-md bg-white/[0.06] text-cyan-300 hover:bg-cyan-400 hover:text-slate-950 transition-colors cursor-pointer shrink-0"
                >
                  <MapPin className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Live NASA POWER Telemetry + Variable Switcher */}
              {powerLoading ? (
                <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Consultando NASA POWER...</span>
                </div>
              ) : (
                <div className="pb-3 border-b border-white/[0.08] space-y-3">
                  <div className="grid grid-cols-4 gap-1 p-0.5 rounded-md bg-[#03050A] border border-white/[0.07]">
                    {(
                      [
                        { id: 'temp', label: 'Temp', icon: Thermometer },
                        { id: 'precip', label: 'Lluvia', icon: Droplets },
                        { id: 'solar', label: 'Solar', icon: Sun },
                        { id: 'wind', label: 'Viento', icon: Wind },
                      ] as const
                    ).map((tab) => {
                      const Icon = tab.icon;
                      const active = chartVar === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setChartVar(tab.id)}
                          className={`py-1 px-1 rounded text-[10px] font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                            active
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

                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-display font-light text-white tabular-nums tracking-tight">
                        {activeHeadlineValue}
                      </span>
                      <span className="text-xs font-mono text-slate-400 ml-1.5">
                        {activeMeta.unit}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      NASA POWER · {chartVar === 'precip' ? '30d acum.' : '30d prom.'}
                    </span>
                  </div>

                  {chartData.length > 0 && (
                    <div className="h-16 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                          <defs>
                            <linearGradient id={activeMeta.gradId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={activeMeta.color} stopOpacity={0.38} />
                              <stop offset="95%" stopColor={activeMeta.color} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" hide />
                          <YAxis domain={['auto', 'auto']} hide />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#050811',
                              border: '1px solid rgba(255,255,255,0.12)',
                              borderRadius: '6px',
                              fontSize: '11px',
                              color: '#F1F5F9',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            name={`${activeMeta.label} (${activeMeta.unit})`}
                            stroke={activeMeta.color}
                            strokeWidth={1.8}
                            fill={`url(#${activeMeta.gradId})`}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              {/* Active Piura Basin Diagnostic */}
              {selectedStation && (
                <div className="pb-3 border-b border-white/[0.08] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Balance satelital de cuenca</span>
                    <span
                      className={`text-[10px] font-mono ${
                        selectedStation.status === 'Crítico'
                          ? 'text-rose-400'
                          : selectedStation.status === 'Alerta temprana'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {selectedStation.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px] tabular-nums">
                    <div>
                      <span className="text-[10px] font-sans text-slate-500 block">NDVI / Base</span>
                      <span className="text-slate-100">
                        {selectedStation.ndviCurrent.toFixed(2)}/{selectedStation.ndviBaseline.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-sans text-slate-500 block">Dosel</span>
                      <span className="text-rose-400">{selectedStation.woodyLossPct}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-sans text-slate-500 block">Anomalía</span>
                      <span className="text-amber-300">
                        +{selectedStation.thermalAnomalyC.toFixed(1)} °C
                      </span>
                    </div>
                  </div>
                  {onOpenParadox && (
                    <button
                      type="button"
                      onClick={onOpenParadox}
                      className="w-full mt-1 py-1.5 px-2.5 rounded bg-white/[0.05] hover:bg-white/[0.09] text-[11px] text-cyan-300 font-medium flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>Ver paradoja en esta cuenca</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* 6 Piura Sub-basins Selector */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Subcuencas de Piura</span>
                  <span className="font-mono">NDVI</span>
                </div>
                {stations.map((st) => {
                  const active = selectedStation?.id === st.id;
                  const statusColor =
                    st.status === 'Crítico'
                      ? 'text-rose-400'
                      : st.status === 'Alerta temprana'
                      ? 'text-amber-400'
                      : 'text-emerald-400';

                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => onSelectStation(st)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded text-left text-xs transition-colors cursor-pointer ${
                        active
                          ? 'bg-cyan-500/18 text-white'
                          : 'text-slate-300 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{st.name}</div>
                        <div className={`text-[10px] ${statusColor}`}>
                          {st.province} · {st.status}
                        </div>
                      </div>
                      <span className="font-mono text-xs text-slate-200 tabular-nums shrink-0">
                        {st.ndviCurrent.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setLeftOpen((v) => !v)}
          aria-label="Alternar panel de Piura"
          className="pointer-events-auto p-2 rounded-lg bg-[#050811]/95 border border-white/[0.11] text-slate-300 hover:text-white cursor-pointer"
        >
          {leftOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Quiet Top-Right Regional EONET Popover Trigger (On-Demand Only, Zero Clutter) */}
      <div className="hidden md:flex flex-col items-end gap-2 absolute top-16 right-5 z-20">
        <button
          type="button"
          onClick={() => setAlertsDrawerOpen((v) => !v)}
          className="px-3 py-1.5 rounded-lg bg-[#050811]/94 border border-white/[0.11] text-xs font-medium text-slate-200 hover:border-amber-400/50 transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Alertas Pacífico / Andes</span>
          <span className="font-mono text-[11px] text-amber-300 tabular-nums">
            {regionalEonet.length}
          </span>
        </button>

        <AnimatePresence>
          {alertsDrawerOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="w-[290px] max-h-[340px] flex flex-col rounded-lg bg-[#050811]/96 border border-white/[0.12] p-3.5 shadow-[0_24px_60px_rgba(0,0,0,0.85)]"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
                <span className="text-xs font-semibold text-white">NASA EONET Regional</span>
                <button
                  type="button"
                  onClick={() => setAlertsDrawerOpen(false)}
                  aria-label="Cerrar alertas"
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-2 space-y-1 overflow-y-auto pr-1">
                {regionalEonet.length === 0 ? (
                  <p className="py-5 text-center text-xs text-slate-500">
                    Sin alertas regionales activas.
                  </p>
                ) : (
                  regionalEonet.map((ev) => {
                    const isSel = selectedEvent?.id === ev.id;
                    return (
                      <div
                        key={ev.id}
                        className={`rounded transition-colors ${
                          isSel ? 'bg-cyan-500/15' : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectEvent(ev)}
                          className="w-full text-left px-2 py-1.5 cursor-pointer"
                        >
                          <p className="text-xs font-medium text-slate-200 line-clamp-1">
                            {ev.title}
                          </p>
                          <div className="flex items-center justify-between text-[10px] mt-0.5">
                            <span style={{ color: getEonetCategoryColor(ev.categoryId) }}>
                              {translateEonetCategory(ev.categoryId, ev.categoryTitle)}
                            </span>
                            <span className="font-mono text-slate-500">{ev.date.slice(5, 10)}</span>
                          </div>
                        </button>
                        {isSel && (
                          <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-mono tabular-nums">
                              {ev.lat.toFixed(1)}°, {ev.lon.toFixed(1)}°
                            </span>
                            <a
                              href={ev.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-cyan-300 hover:underline"
                            >
                              NASA <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
