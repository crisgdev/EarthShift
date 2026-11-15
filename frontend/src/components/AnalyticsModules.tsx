import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Database,
  Globe2,
  MapPin,
  Satellite,
  Sliders,
  TrendingDown,
} from 'lucide-react';
import type {
  NasaPowerResponse,
  NasaStatusResponse,
  PiuraStation,
} from '../types/climate';
import {
  EARTH_PARADOX_CASES,
  HISTORICAL_TRENDS_PIURA,
  PIURA_STATIONS,
  SILENT_COLLAPSE_SERIES,
} from '../data/piuraData';

interface ZoneJumpProps {
  onLocateOnMap: (station: PiuraStation) => void;
  onLocateOnGlobe: (station: PiuraStation) => void;
}

/* -------------------------------------------------------------------------- */
/* 1. EARTH PARADOX VIEW (PIURA SPECTRAL DIVERGENCE LAB)                      */
/* -------------------------------------------------------------------------- */
export const EarthParadoxView: React.FC<ZoneJumpProps> = ({
  onLocateOnMap,
  onLocateOnGlobe,
}) => {
  const [selectedId, setSelectedId] = useState(EARTH_PARADOX_CASES[0].id);
  const [xrayDepth, setXrayDepth] = useState(52); // 0 = optical NDVI surface, 100 = structural reality

  const activeCase = useMemo(
    () => EARTH_PARADOX_CASES.find((c) => c.id === selectedId) ?? EARTH_PARADOX_CASES[0],
    [selectedId]
  );

  const matchedStation = useMemo(
    () =>
      PIURA_STATIONS.find((s) => s.name.includes(activeCase.zone.split('·')[0].trim())) ??
      PIURA_STATIONS[0],
    [activeCase]
  );

  const paradoxChartData = useMemo(
    () =>
      EARTH_PARADOX_CASES.map((c) => ({
        zone: c.zone.split('·')[0].trim(),
        picoNdvi: c.ndviSpikePct,
        perdidaLenosa: Math.abs(c.woodyCanopyDeltaPct),
        deficitHumedad: Math.abs(c.soilMoistureAnomalyPct),
      })),
    []
  );

  const revealFactor = xrayDepth / 100;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.09] pb-6">
        <div>
          <span className="text-xs font-mono text-amber-400">
            Piura · Diagnóstico de contradicción espectral
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight text-white mt-1.5 text-balance">
            Earth Paradox: el espejismo del reverdecimiento
          </h2>
          <p className="text-sm text-slate-400 mt-2.5 max-w-2xl leading-relaxed">
            En Piura, las lluvias convectivas disparan el verdor superficial (NDVI) durante semanas mientras el algarrobo centenario y la humedad profunda siguen retrocediendo.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onLocateOnGlobe(matchedStation)}
            className="px-3.5 py-2 rounded-md text-xs font-medium bg-[#080D17] text-slate-200 border border-white/[0.12] hover:border-cyan-400/60 transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
            Ver en Globo 3D
          </button>
          <button
            type="button"
            onClick={() => onLocateOnMap(matchedStation)}
            className="px-3.5 py-2 rounded-md text-xs font-semibold bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <MapPin className="w-3.5 h-3.5" />
            Mapa NASA
          </button>
        </div>
      </div>

      {/* Piura Paradox Zone Selector */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-[#080D17] border border-white/[0.08] rounded-md w-fit">
        {EARTH_PARADOX_CASES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedId(item.id)}
            className={`px-3.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeCase.id === item.id
                ? 'bg-white text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {item.zone}
          </button>
        ))}
      </div>

      {/* Interactive Spectral Divergence X-Ray Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border border-white/[0.09] divide-y lg:divide-y-0 lg:divide-x divide-white/[0.09] bg-[#060911]">
        {/* Left: Custom Interactive Optical vs Subsurface SVG X-Ray */}
        <div className="lg:col-span-6 p-6 sm:p-7 flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-display font-semibold text-white">
                Escáner espectral: superficie vs. dosel leñoso
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Desliza para revelar el estrés real debajo del pico NDVI
              </p>
            </div>
            <span className="font-mono text-xs text-cyan-300 tabular-nums shrink-0">
              {xrayDepth}% profundidad
            </span>
          </div>

          <div className="relative bg-[#03050A] border border-white/[0.07] p-4 rounded">
            <svg viewBox="0 0 420 190" className="w-full h-44" role="img" aria-label="Comparación espectral óptica frente a pérdida estructural en Piura">
              {/* Coordinate hairline grid */}
              <line x1="20" y1="95" x2="400" y2="95" stroke="rgba(148,163,184,0.18)" strokeDasharray="3 3" />
              <line x1="20" y1="35" x2="400" y2="35" stroke="rgba(52,211,153,0.12)" />
              <line x1="20" y1="155" x2="400" y2="155" stroke="rgba(251,113,133,0.12)" />

              {/* Optical NDVI Ephemeral Green Pulse (fades out as X-ray deepens) */}
              <path
                d={`M 20 95 Q 115 ${95 - activeCase.ndviSpikePct * 1.9}, 210 ${95 - activeCase.ndviSpikePct * 2.2} T 400 95`}
                fill="none"
                stroke="#34D399"
                strokeWidth={2.5}
                strokeOpacity={1 - revealFactor * 0.65}
              />
              <path
                d={`M 20 95 Q 115 ${95 - activeCase.ndviSpikePct * 1.9}, 210 ${95 - activeCase.ndviSpikePct * 2.2} T 400 95 L 400 95 L 20 95 Z`}
                fill="#34D399"
                fillOpacity={0.18 * (1 - revealFactor * 0.72)}
              />

              {/* Structural Woody Canopy & Moisture Deficit (intensifies with slider) */}
              <path
                d={`M 20 95 Q 130 ${95 + Math.abs(activeCase.woodyCanopyDeltaPct) * 2.1}, 235 ${95 + Math.abs(activeCase.soilMoistureAnomalyPct) * 2.1} T 400 ${95 + Math.abs(activeCase.woodyCanopyDeltaPct) * 1.8}`}
                fill="none"
                stroke="#FB7185"
                strokeWidth={2.6}
                strokeOpacity={0.25 + revealFactor * 0.75}
              />
              <path
                d={`M 20 95 Q 130 ${95 + Math.abs(activeCase.woodyCanopyDeltaPct) * 2.1}, 235 ${95 + Math.abs(activeCase.soilMoistureAnomalyPct) * 2.1} T 400 ${95 + Math.abs(activeCase.woodyCanopyDeltaPct) * 1.8} L 400 95 L 20 95 Z`}
                fill="#FB7185"
                fillOpacity={0.08 + revealFactor * 0.22}
              />

              {/* Thermal Stress Baseline Curve */}
              <path
                d={`M 20 95 C 120 ${95 + activeCase.lstDeltaC * 12}, 260 ${95 + activeCase.lstDeltaC * 18}, 400 ${95 + activeCase.lstDeltaC * 15}`}
                fill="none"
                stroke="#F59E0B"
                strokeWidth={1.8}
                strokeDasharray="4 4"
                strokeOpacity={0.35 + revealFactor * 0.65}
              />

              {/* Vertical Scanner Line */}
              <line
                x1={20 + revealFactor * 380}
                y1="12"
                x2={20 + revealFactor * 380}
                y2="178"
                stroke="#22D3EE"
                strokeWidth="1.5"
              />

              <text x="24" y="24" fill="#34D399" fontSize="10" fontFamily="JetBrains Mono, monospace">
                ÓPTICO NDVI +{activeCase.ndviSpikePct}%
              </text>
              <text x="24" y="176" fill="#FB7185" fontSize="10" fontFamily="JetBrains Mono, monospace">
                DOSEL LEÑOSO {activeCase.woodyCanopyDeltaPct}% · HUMEDAD {activeCase.soilMoistureAnomalyPct}%
              </text>
              <text x="396" y="24" textAnchor="end" fill="#F59E0B" fontSize="10" fontFamily="JetBrains Mono, monospace">
                LST +{activeCase.lstDeltaC.toFixed(1)} °C
              </text>
            </svg>
          </div>

          <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer">
            <span className="font-mono text-[11px] text-emerald-400 shrink-0">NDVI óptico</span>
            <input
              type="range"
              min={0}
              max={100}
              value={xrayDepth}
              onChange={(e) => setXrayDepth(Number(e.target.value))}
              aria-label="Profundidad de análisis espectral"
              className="sci-range w-full"
            />
            <span className="font-mono text-[11px] text-rose-400 shrink-0">Subsuelo + LST</span>
          </label>
        </div>

        {/* Right: Concise Scientific Diagnosis */}
        <motion.div
          key={activeCase.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="lg:col-span-6 p-6 sm:p-7 flex flex-col justify-between gap-6"
        >
          <div>
            <h3 className="text-xl font-display font-semibold text-white leading-snug">
              {activeCase.headline}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mt-3">
              {activeCase.explanation}
            </p>
          </div>

          <div className="divide-y divide-white/[0.07] border-t border-white/[0.08]">
            <div className="flex items-center justify-between gap-4 py-3">
              <span className="text-xs text-slate-400">Señal óptica aparente</span>
              <span className="text-xs font-mono font-medium text-emerald-400 text-right">
                {activeCase.apparentSignal}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <span className="text-xs text-slate-400">Realidad estructural</span>
              <span className="text-xs font-mono font-medium text-rose-400 text-right">
                {activeCase.satelliteReality}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-3">
              <span className="text-xs text-slate-400">Anomalía térmica LST</span>
              <span className="text-base font-mono font-semibold text-amber-400 tabular-nums">
                +{activeCase.lstDeltaC.toFixed(1)} °C
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Regional Piura Divergence Bar Comparison */}
      <div className="border border-white/[0.09] bg-[#060911] p-6">
        <div className="mb-4">
          <h3 className="text-sm font-display font-semibold text-white">
            Brecha entre verdor efímero y pérdida real por zona en Piura
          </h3>
        </div>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={paradoxChartData} margin={{ top: 8, right: 10, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#161F2E" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="zone" tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#050811',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#F1F5F9',
                }}
              />
              <Bar dataKey="picoNdvi" name="Pico NDVI (+%)" fill="#34D399" radius={[2, 2, 0, 0]} barSize={26} />
              <Bar dataKey="perdidaLenosa" name="Pérdida leñosa (-%)" fill="#FB7185" radius={[2, 2, 0, 0]} barSize={26} />
              <Line
                type="monotone"
                dataKey="deficitHumedad"
                name="Déficit humedad (%)"
                stroke="#F59E0B"
                strokeWidth={2.2}
                dot={{ r: 3.5, fill: '#F59E0B' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 2. SILENT COLLAPSE VIEW (PIURA TIPPING-POINT PHASE SPACE)                  */
/* -------------------------------------------------------------------------- */
export const SilentCollapseView: React.FC<ZoneJumpProps> = ({
  onLocateOnMap,
  onLocateOnGlobe,
}) => {
  const [focusedStationId, setFocusedStationId] = useState<string>(PIURA_STATIONS[0].id);

  const focusedStation = useMemo(
    () => PIURA_STATIONS.find((s) => s.id === focusedStationId) ?? PIURA_STATIONS[0],
    [focusedStationId]
  );

  return (
    <div className="space-y-8">
      <div className="border-b border-white/[0.09] pb-6">
        <span className="text-xs font-mono text-rose-400">
          Piura · Desaceleración crítica AR(1) antes del colapso
        </span>
        <h2 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight text-white mt-1.5 text-balance">
          Silent Collapse: resiliencia en tiempo real por subcuenca
        </h2>
        <p className="text-sm text-slate-400 mt-2.5 max-w-2xl leading-relaxed">
          Cuando un ecosistema pierde resiliencia, tarda cada vez más en recuperarse de sequías y olas de calor. Haz clic en cualquier subcuenca de Piura en el mapa de fases para inspeccionar su riesgo.
        </p>
      </div>

      {/* 3-Metric Hairline Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border border-white/[0.09] divide-y sm:divide-y-0 sm:divide-x divide-white/[0.09] bg-[#060911]">
        <div className="p-6">
          <span className="text-xs text-slate-400">Autocorrelación AR(1) Piura</span>
          <div className="mt-2 flex items-baseline">
            <span className="text-4xl font-display font-light text-rose-400 tabular-nums">
              0.88
            </span>
            <span className="text-xs font-mono text-slate-400 ml-2">umbral &gt; 0.75</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            ▲ Recuperación lenta en Sechura, Talara y Alto Piura
          </p>
        </div>

        <div className="p-6">
          <span className="text-xs text-slate-400">Varianza espectral NDVI</span>
          <div className="mt-2 flex items-baseline">
            <span className="text-4xl font-display font-light text-amber-400 tabular-nums">
              +278
            </span>
            <span className="text-xs font-mono text-slate-400 ml-1.5">% vs 2019</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Oscilaciones extremas entre sequías y pulsos El Niño
          </p>
        </div>

        <div className="p-6">
          <span className="text-xs text-slate-400">Subcuencas en alerta crítica</span>
          <div className="mt-2 flex items-baseline">
            <span className="text-4xl font-display font-light text-white tabular-nums">
              3 / 6
            </span>
            <span className="text-xs font-mono text-slate-400 ml-2">cuencas Piura</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Requieren restauración leñosa y recarga hídrica urgente
          </p>
        </div>
      </div>

      {/* Interactive Phase-Space Quadrant + AR(1) Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border border-white/[0.09] divide-y lg:divide-y-0 lg:divide-x divide-white/[0.09] bg-[#060911]">
        {/* Left: Custom Interactive SVG Phase-Space Quadrant */}
        <div className="lg:col-span-6 p-6 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-display font-semibold text-white">
                Mapa de bifurcación ecológica en Piura
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Resiliencia (horizontal) vs. pérdida de dosel y anomalía térmica (vertical)
              </p>
            </div>
          </div>

          <div className="bg-[#03050A] border border-white/[0.07] rounded p-3">
            <svg viewBox="0 0 420 230" className="w-full h-56" role="img" aria-label="Plano de resiliencia vs pérdida leñosa de las 6 subcuencas de Piura">
              {/* Critical bifurcation danger zone (low resilience + high woody loss) */}
              <rect x="20" y="16" width="185" height="115" fill="rgba(244,63,94,0.08)" stroke="rgba(244,63,94,0.28)" strokeDasharray="4 4" />
              <text x="28" y="32" fill="#FB7185" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                ZONA DE COLAPSO SILENCIOSO
              </text>

              {/* Axes */}
              <line x1="20" y1="200" x2="400" y2="200" stroke="rgba(148,163,184,0.25)" />
              <line x1="20" y1="16" x2="20" y2="200" stroke="rgba(148,163,184,0.25)" />

              {PIURA_STATIONS.map((st) => {
                const cx = 36 + ((st.resilienceScore - 20) / 70) * 340;
                const cy = 186 - (Math.abs(st.woodyLossPct) / 24) * 155;
                const isSel = st.id === focusedStation.id;
                const color =
                  st.status === 'Crítico'
                    ? '#FB7185'
                    : st.status === 'Alerta temprana'
                    ? '#F59E0B'
                    : '#34D399';
                const shortName = st.name
                  .replace('Bosque Seco de ', '')
                  .replace('Cuenca Alta ', '')
                  .replace('Tablazo de ', '')
                  .split(' · ')[0];

                return (
                  <g
                    key={st.id}
                    onClick={() => setFocusedStationId(st.id)}
                    className="cursor-pointer"
                  >
                    {isSel && (
                      <circle cx={cx} cy={cy} r={14} fill="none" stroke="#22D3EE" strokeWidth="1.5" />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSel ? 7 : 5.5}
                      fill={color}
                      stroke="#03050A"
                      strokeWidth="1.5"
                    />
                    <text
                      x={cx}
                      y={cy - 11}
                      textAnchor="middle"
                      fill={isSel ? '#FFFFFF' : '#CBD5E1'}
                      fontSize="10"
                      fontWeight={isSel ? '600' : '400'}
                    >
                      {shortName}
                    </text>
                  </g>
                );
              })}

              <text x="210" y="218" textAnchor="middle" fill="#64748B" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                ÍNDICE DE RESILIENCIA (0 → 100)
              </text>
            </svg>
          </div>

          {/* Selected Station Quick Action Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
            <div>
              <span className="font-semibold text-white">{focusedStation.name}</span>
              <span className="text-slate-400 ml-2 font-mono">
                Resiliencia {focusedStation.resilienceScore}/100 · Dosel {focusedStation.woodyLossPct}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onLocateOnGlobe(focusedStation)}
                className="px-2.5 py-1 rounded bg-[#03050A] border border-white/[0.12] text-slate-200 hover:text-cyan-300 cursor-pointer"
              >
                Globo 3D
              </button>
              <button
                type="button"
                onClick={() => onLocateOnMap(focusedStation)}
                className="px-2.5 py-1 rounded bg-cyan-400 text-slate-950 font-semibold hover:bg-cyan-300 cursor-pointer"
              >
                Mapa NASA
              </button>
            </div>
          </div>
        </div>

        {/* Right: 2019-2025 AR(1) vs NDVI Curve */}
        <div className="lg:col-span-6 p-6 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-display font-semibold text-white">
              Trayectoria de desaceleración crítica (2019–2025)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Mientras el NDVI medio oscila, el índice AR(1) y la varianza escalan de forma sostenida
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SILENT_COLLAPSE_SERIES} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="#161F2E" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} domain={[0, 1]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#050811',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#F1F5F9',
                  }}
                />
                <Line type="monotone" dataKey="ar1Autocorrelation" name="Autocorrelación AR(1)" stroke="#FB7185" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="varianceIndex" name="Varianza de resiliencia" stroke="#F59E0B" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="ndvi" name="NDVI medio" stroke="#34D399" strokeWidth={2} dot={{ r: 2.5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Compact Piura Basins Diagnostic Matrix */}
      <div className="border border-white/[0.09] bg-[#060911] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/[0.08] text-slate-400 font-mono">
              <th className="py-3 px-6 font-medium">Subcuenca Piura</th>
              <th className="py-3 px-4 font-medium">Estado</th>
              <th className="py-3 px-4 font-medium text-right">NDVI</th>
              <th className="py-3 px-4 font-medium text-right">Dosel</th>
              <th className="py-3 px-4 font-medium text-right">Resiliencia</th>
              <th className="py-3 px-6 font-medium text-right">Inspección</th>
            </tr>
          </thead>
          <tbody>
            {PIURA_STATIONS.map((st) => (
              <tr
                key={st.id}
                onClick={() => setFocusedStationId(st.id)}
                className={`border-b border-white/[0.05] last:border-b-0 transition-colors cursor-pointer ${
                  st.id === focusedStation.id ? 'bg-cyan-500/10' : 'hover:bg-white/[0.03]'
                }`}
              >
                <td className="py-3.5 px-6">
                  <div className="font-medium text-slate-100">{st.name}</div>
                  <div className="text-[11px] text-slate-400">{st.province}</div>
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`inline-flex items-center gap-1.5 font-medium ${
                      st.status === 'Crítico'
                        ? 'text-rose-400'
                        : st.status === 'Alerta temprana'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {st.status === 'Crítico' ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : st.status === 'Alerta temprana' ? (
                      <TrendingDown className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    {st.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-200">
                  {st.ndviCurrent.toFixed(2)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono tabular-nums text-rose-400">
                  {st.woodyLossPct.toFixed(1)}%
                </td>
                <td className="py-3.5 px-4 text-right font-mono tabular-nums text-cyan-400">
                  {st.resilienceScore}/100
                </td>
                <td className="py-3.5 px-6 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLocateOnGlobe(st);
                      }}
                      className="px-2.5 py-1 rounded bg-[#03050A] border border-white/[0.1] text-slate-300 hover:text-cyan-300 cursor-pointer whitespace-nowrap"
                    >
                      Globo
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLocateOnMap(st);
                      }}
                      className="px-2.5 py-1 rounded bg-cyan-500/15 border border-cyan-400/35 text-cyan-300 hover:bg-cyan-500/25 cursor-pointer whitespace-nowrap"
                    >
                      Mapa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. DECISION INVESTMENT VIEW (PIURA TERRITORIAL PRIORITY ENGINE)            */
/* -------------------------------------------------------------------------- */
const STRATEGY_PRESETS = [
  {
    id: 'balance',
    label: 'Balance Regional',
    weights: { waterSecurity: 35, biodiversity: 25, agroImpact: 20, degradationUrgency: 20 },
  },
  {
    id: 'water',
    label: 'Seguridad Hídrica',
    weights: { waterSecurity: 55, biodiversity: 15, agroImpact: 20, degradationUrgency: 10 },
  },
  {
    id: 'desert',
    label: 'Frenar Desertificación',
    weights: { waterSecurity: 15, biodiversity: 35, agroImpact: 10, degradationUrgency: 40 },
  },
];

export const DecisionInvestmentView: React.FC<ZoneJumpProps> = ({
  onLocateOnMap,
  onLocateOnGlobe,
}) => {
  const [weights, setWeights] = useState(STRATEGY_PRESETS[0].weights);

  const rankedStations = useMemo(() => {
    const totalWeight =
      weights.waterSecurity +
        weights.biodiversity +
        weights.agroImpact +
        weights.degradationUrgency || 1;

    return [...PIURA_STATIONS]
      .map((st) => {
        const score =
          (st.decisionMetrics.waterSecurity * weights.waterSecurity +
            st.decisionMetrics.biodiversity * weights.biodiversity +
            st.decisionMetrics.agroImpact * weights.agroImpact +
            st.decisionMetrics.degradationUrgency * weights.degradationUrgency) /
          totalWeight;
        return {
          station: st,
          priorityScore: Number(score.toFixed(1)),
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }, [weights]);

  const topThreeSummary = useMemo(() => {
    const top3 = rankedStations.slice(0, 3);
    const totalHa = top3.reduce((sum, item) => sum + item.station.decisionMetrics.hectaresTarget, 0);
    const totalCostK = top3.reduce(
      (sum, item) => sum + item.station.decisionMetrics.estimatedCostUsdK,
      0
    );
    return { totalHa, totalCostK, top3 };
  }, [rankedStations]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.09] pb-6">
        <div>
          <span className="text-xs font-mono text-emerald-400">
            Piura · Motor multicriterio de restauración territorial
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight text-white mt-1.5 text-balance">
            Inversión de Decisión: priorización satelital en Piura
          </h2>
          <p className="text-sm text-slate-400 mt-2.5 max-w-2xl leading-relaxed">
            Selecciona una estrategia climática o ajusta los pesos para calcular dónde invertir en restauración para proteger el agua, la agricultura y el bosque seco de Piura.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 p-1 bg-[#080D17] border border-white/[0.08] rounded-md shrink-0">
          {STRATEGY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setWeights(preset.weights)}
              className="px-3 py-1.5 rounded text-xs font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Top-3 Hectare Allocation Strip */}
      <div className="border border-white/[0.09] bg-[#060911] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-300 font-medium">
            Distribución prioritaria Top-3 subcuencas ({topThreeSummary.totalHa.toLocaleString()} ha)
          </span>
          <span className="font-mono text-emerald-400 tabular-nums">
            Inversión estimada: ${topThreeSummary.totalCostK}k USD
          </span>
        </div>
        <div className="h-2.5 w-full flex rounded-sm overflow-hidden gap-0.5 bg-[#03050A]">
          {topThreeSummary.top3.map((item, idx) => {
            const pct = (item.station.decisionMetrics.hectaresTarget / topThreeSummary.totalHa) * 100;
            const barColor =
              idx === 0 ? 'bg-cyan-400' : idx === 1 ? 'bg-emerald-400' : 'bg-amber-400';
            return (
              <div
                key={item.station.id}
                style={{ width: `${pct}%` }}
                className={`${barColor} h-full transition-all duration-300`}
                title={`${item.station.name}: ${item.station.decisionMetrics.hectaresTarget.toLocaleString()} ha`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-400">
          {topThreeSummary.top3.map((item, idx) => (
            <span key={item.station.id} className="inline-flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-xs ${
                  idx === 0 ? 'bg-cyan-400' : idx === 1 ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              {item.station.name} ({item.station.decisionMetrics.hectaresTarget.toLocaleString()} ha)
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 border border-white/[0.09] divide-y lg:divide-y-0 lg:divide-x divide-white/[0.09] bg-[#060911]">
        <div className="lg:col-span-4 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-display font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Pesos estratégicos
            </h3>
            <button
              type="button"
              onClick={() => setWeights(STRATEGY_PRESETS[0].weights)}
              className="text-xs text-cyan-400 hover:underline cursor-pointer"
            >
              Restablecer
            </button>
          </div>

          <div className="space-y-4">
            {(
              [
                { key: 'waterSecurity', label: 'Seguridad hídrica y recarga' },
                { key: 'biodiversity', label: 'Biodiversidad bosque seco' },
                { key: 'agroImpact', label: 'Resiliencia agroproductiva' },
                { key: 'degradationUrgency', label: 'Urgencia por degradación' },
              ] as const
            ).map((item) => (
              <div key={item.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">{item.label}</span>
                  <span className="font-mono text-cyan-400 tabular-nums">{weights[item.key]}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={weights[item.key]}
                  onChange={(e) =>
                    setWeights((prev) => ({ ...prev, [item.key]: Number(e.target.value) }))
                  }
                  className="sci-range w-full"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8 divide-y divide-white/[0.07]">
          {rankedStations.map(({ station, priorityScore }, index) => (
            <motion.div
              layout
              key={station.id}
              transition={{ duration: 0.25 }}
              className="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="font-mono font-semibold text-cyan-400">
                    0{index + 1}.
                  </span>
                  <span className="text-slate-400">
                    {station.province} · {station.decisionMetrics.hectaresTarget.toLocaleString()} ha
                  </span>
                </div>
                <h4 className="text-base font-display font-semibold text-white">
                  {station.name}
                </h4>
                <p className="text-xs text-slate-400 line-clamp-2">{station.summary}</p>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Prioridad</span>
                  <span className="text-2xl font-mono font-semibold text-emerald-400 tabular-nums">
                    {priorityScore.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onLocateOnGlobe(station)}
                    className="px-2.5 py-1 rounded text-xs bg-[#03050A] border border-white/[0.1] text-slate-300 hover:text-cyan-300 cursor-pointer whitespace-nowrap"
                  >
                    Globo 3D
                  </button>
                  <button
                    type="button"
                    onClick={() => onLocateOnMap(station)}
                    className="px-2.5 py-1 rounded text-xs bg-cyan-400 text-slate-950 font-semibold hover:bg-cyan-300 cursor-pointer whitespace-nowrap inline-flex items-center gap-1"
                  >
                    Mapa <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 4. HISTORICAL TRENDS & NASA PIPELINE VIEW (PIURA 2015–2025)                */
/* -------------------------------------------------------------------------- */
interface TrendsViewProps {
  powerData: NasaPowerResponse | null;
  nasaStatus: NasaStatusResponse | null;
}

export const TrendsMethodologyView: React.FC<TrendsViewProps> = ({
  powerData,
  nasaStatus,
}) => {
  const [compareYears, setCompareYears] = useState<[number, number]>([2017, 2025]);

  const yearA = useMemo(
    () => HISTORICAL_TRENDS_PIURA.find((y) => y.year === compareYears[0]) ?? HISTORICAL_TRENDS_PIURA[2],
    [compareYears]
  );
  const yearB = useMemo(
    () => HISTORICAL_TRENDS_PIURA.find((y) => y.year === compareYears[1]) ?? HISTORICAL_TRENDS_PIURA[10],
    [compareYears]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.09] pb-6">
        <div>
          <span className="text-xs font-mono text-cyan-400">
            Piura · Serie decadal 2015–2025 y telemetría NASA
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight text-white mt-1.5 text-balance">
            Tendencias históricas y arquitectura satelital
          </h2>
          <p className="text-sm text-slate-400 mt-2.5 max-w-2xl leading-relaxed">
            Impacto acumulado de El Niño Costero (2017) y el Ciclón Yaku (2023) sobre la cobertura boscosa de Piura, enlazado con los servicios reales de la NASA.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setCompareYears([2017, 2025])}
            className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors cursor-pointer whitespace-nowrap ${
              compareYears[0] === 2017
                ? 'bg-cyan-400/15 border-cyan-400/50 text-cyan-300'
                : 'bg-[#080D17] border-white/[0.1] text-slate-300 hover:text-white'
            }`}
          >
            El Niño Costero 2017
          </button>
          <button
            type="button"
            onClick={() => setCompareYears([2023, 2025])}
            className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors cursor-pointer whitespace-nowrap ${
              compareYears[0] === 2023
                ? 'bg-amber-400/15 border-amber-400/50 text-amber-300'
                : 'bg-[#080D17] border-white/[0.1] text-slate-300 hover:text-white'
            }`}
          >
            Ciclón Yaku 2023
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 border border-white/[0.09] divide-y lg:divide-y-0 lg:divide-x divide-white/[0.09] bg-[#060911]">
        <div className="lg:col-span-8 p-6">
          <div className="mb-5">
            <h3 className="text-sm font-display font-semibold text-white">
              Cobertura de bosque seco (ha) vs. precipitación anual (mm) en Piura
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Los picos extremos de lluvia (842 mm en 2017 · 715 mm en 2023) no revierten la tendencia descendente del bosque
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={HISTORICAL_TRENDS_PIURA} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="#161F2E" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  domain={[1150000, 1520000]}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  unit="mm"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#050811',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#F1F5F9',
                  }}
                />
                <Bar
                  yAxisId="right"
                  dataKey="precipMm"
                  name="Precipitación anual (mm)"
                  fill="#22D3EE"
                  opacity={0.45}
                  radius={[2, 2, 0, 0]}
                  barSize={24}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="forestCoverHa"
                  name="Cobertura bosque seco (ha)"
                  stroke="#34D399"
                  fill="#34D399"
                  fillOpacity={0.14}
                  strokeWidth={2.5}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 p-6 flex flex-col justify-between gap-5">
          <div>
            <h3 className="text-sm font-display font-semibold text-white">
              Comparador interanual Piura
            </h3>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Año base</label>
                <select
                  value={compareYears[0]}
                  onChange={(e) => setCompareYears([Number(e.target.value), compareYears[1]])}
                  className="w-full bg-[#03050A] border border-white/[0.12] rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 cursor-pointer"
                >
                  {HISTORICAL_TRENDS_PIURA.map((y) => (
                    <option key={y.year} value={y.year}>
                      {y.year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Año objetivo</label>
                <select
                  value={compareYears[1]}
                  onChange={(e) => setCompareYears([compareYears[0], Number(e.target.value)])}
                  className="w-full bg-[#03050A] border border-white/[0.12] rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 cursor-pointer"
                >
                  {HISTORICAL_TRENDS_PIURA.map((y) => (
                    <option key={y.year} value={y.year}>
                      {y.year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="divide-y divide-white/[0.07] border-t border-white/[0.08]">
            <div className="flex items-center justify-between text-xs py-3">
              <span className="text-slate-400">Delta bosque seco</span>
              <span className="font-mono font-semibold text-rose-400 tabular-nums">
                {(yearB.forestCoverHa - yearA.forestCoverHa).toLocaleString()} ha
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-3">
              <span className="text-slate-400">Delta temperatura media</span>
              <span className="font-mono font-semibold text-amber-400 tabular-nums">
                {yearB.tempMeanC - yearA.tempMeanC >= 0 ? '+' : ''}
                {(yearB.tempMeanC - yearA.tempMeanC).toFixed(1)} °C
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-3">
              <span className="text-slate-400">Delta NDVI medio</span>
              <span className="font-mono font-semibold text-cyan-400 tabular-nums">
                {yearB.ndviMean - yearA.ndviMean >= 0 ? '+' : ''}
                {(yearB.ndviMean - yearA.ndviMean).toFixed(2)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Última lectura NASA POWER ({powerData?.lat ?? -5.19}°, {powerData?.lon ?? -80.63}°):{' '}
            <span className="font-mono text-slate-300">
              {powerData?.summary.tempMean !== null && powerData?.summary.tempMean !== undefined
                ? `${powerData.summary.tempMean.toFixed(1)} °C`
                : 'Sincronizando'}
            </span>
          </p>
        </div>
      </div>

      {/* Live NASA API Connections */}
      <div className="border border-white/[0.09] bg-[#060911]">
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center gap-2">
          <Satellite className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-display font-semibold text-white">
            Servicios abiertos de la NASA conectados a Piura Watch
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
          <div className="p-6 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">NASA EONET v3</span>
              <span
                className={`font-mono ${
                  nasaStatus?.endpoints.eonet.online ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {nasaStatus?.endpoints.eonet.online ? '● Conectado' : '▲ Caché local'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Monitoreo en tiempo real de incendios, tormentas severas y anomalías en el corredor Pacífico–Andes cercano a Piura.
            </p>
            <code className="block text-[11px] font-mono text-cyan-400/90 truncate">
              /api/nasa/eonet
            </code>
          </div>

          <div className="p-6 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">NASA POWER v2</span>
              <span
                className={`font-mono ${
                  nasaStatus?.endpoints.power.online ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {nasaStatus?.endpoints.power.online ? '● Conectado' : '▲ En espera'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Series agroclimáticas MERRA-2 y CERES (temperatura, lluvia, humedad, irradiancia solar y viento) para cada subcuenca piurana.
            </p>
            <code className="block text-[11px] font-mono text-cyan-400/90 truncate">
              /api/nasa/power?lat=&lon=
            </code>
          </div>

          <div className="p-6 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">NASA GIBS WMTS</span>
              <span className="font-mono text-emerald-400">● Listo</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mosaicos satelitales directos MODIS Terra, VIIRS Suomi NPP, LST diurna, NDVI 8 días y tasa de precipitación GPM IMERG.
            </p>
            <code className="block text-[11px] font-mono text-cyan-400/90 truncate">
              gibs.earthdata.nasa.gov/wmts
            </code>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            Todos los endpoints oficiales de la NASA operan de forma pública y gratuita sin requerir clave secreta.
          </span>
          {nasaStatus?.gibsRecommendedDate && (
            <span className="font-mono text-slate-300">
              Fecha GIBS sincronizada: {nasaStatus.gibsRecommendedDate}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
