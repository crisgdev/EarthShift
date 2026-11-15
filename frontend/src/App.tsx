import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Map as MapIcon, Menu, X } from 'lucide-react';
import type {
  GeoCoordinates,
  NasaEonetEvent,
  NasaGibsLayer,
  NasaPowerResponse,
  NasaStatusResponse,
  NavSection,
  PiuraStation,
} from './types/climate';
import { PIURA_CENTER, PIURA_STATIONS } from './data/piuraData';
import {
  fetchNasaEonetEvents,
  fetchNasaGibsLayers,
  fetchNasaPowerClimate,
  fetchNasaStatus,
  translateEonetCategory,
} from './services/nasaClient';
import { loadNasaGibsEarthTexture } from './utils/earthTextureGenerator';
import { LoadingScreen, type LoadingStepState } from './components/LoadingScreen';
import { OrbitOverview } from './components/OrbitOverview';
import { NatureGlobe as NasaMapExplorer } from './components/NatureGlobe';
import {
  DecisionInvestmentView,
  EarthParadoxView,
  SilentCollapseView,
  TrendsMethodologyView,
} from './components/AnalyticsModules';

const NAV_ITEMS: Array<{ id: NavSection; label: string }> = [
  { id: 'orbit', label: 'Órbita 3D' },
  { id: 'paradox', label: 'Nuestra tierra' },
  { id: 'collapse', label: 'Ecosistemas en riesgo' },
  { id: 'decision', label: 'Inversión' },
  { id: 'trends', label: 'Tendencias' },
];

const MIN_INTRO_DURATION_MS = 6800;

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('orbit');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Intro & Real Telemetry Hydration State
  const [showLoader, setShowLoader] = useState(true);
  const [autoEnterPaused, setAutoEnterPaused] = useState(false);
  const [apisCompleted, setApisCompleted] = useState(false);
  const [minIntroElapsed, setMinIntroElapsed] = useState(false);
  const [loadProgress, setLoadProgress] = useState(5);
  const targetProgressRef = useRef(15);

  const [loadingSteps, setLoadingSteps] = useState<LoadingStepState[]>([
    {
      id: 'webgl',
      label: 'Satélite NASA Blue Marble 3D',
      detail: 'Cargando malla',
      status: 'loading',
    },
    {
      id: 'eonet',
      label: 'NASA EONET · Pacífico/Andes',
      detail: 'En cola',
      status: 'pending',
    },
    {
      id: 'power',
      label: 'NASA POWER · Piura',
      detail: 'En cola',
      status: 'pending',
    },
    {
      id: 'gibs',
      label: 'NASA GIBS · MODIS/VIIRS',
      detail: 'En cola',
      status: 'pending',
    },
  ]);

  const readyToEnter = apisCompleted && minIntroElapsed;

  // Shared Geospatial & NASA State
  const [selectedLocation, setSelectedLocation] = useState<GeoCoordinates>(PIURA_CENTER);
  const [selectedStation, setSelectedStation] = useState<PiuraStation | null>(PIURA_STATIONS[0]);
  const [selectedEvent, setSelectedEvent] = useState<NasaEonetEvent | null>(null);

  const [nasaStatus, setNasaStatus] = useState<NasaStatusResponse | null>(null);
  const [eonetEvents, setEonetEvents] = useState<NasaEonetEvent[]>([]);
  const [gibsLayers, setGibsLayers] = useState<NasaGibsLayer[]>([]);
  const [recommendedGibsDate, setRecommendedGibsDate] = useState<string>('2025-11-10');

  const [powerData, setPowerData] = useState<NasaPowerResponse | null>(null);
  const [powerLoading, setPowerLoading] = useState<boolean>(false);

  const updateStep = useCallback(
    (id: string, patch: Partial<LoadingStepState>) => {
      setLoadingSteps((prev) =>
        prev.map((step) => (step.id === id ? { ...step, ...patch } : step))
      );
    },
    []
  );

  // Smooth ~5-second deliberate calibration timer + progress pacing
  useEffect(() => {
    if (!showLoader) return;
    setMinIntroElapsed(false);
    setLoadProgress(5);

    const startTime = performance.now();
    const interval = window.setInterval(() => {
      const elapsed = performance.now() - startTime;
      const timeFraction = Math.min(1, elapsed / MIN_INTRO_DURATION_MS);
      const easedTimePct = Math.round((1 - Math.pow(1 - timeFraction, 2.2)) * 95);
      const cap = apisCompleted
        ? timeFraction >= 1
          ? 100
          : Math.max(easedTimePct, 82)
        : Math.min(easedTimePct, targetProgressRef.current);

      setLoadProgress((prev) => Math.max(prev, cap));

      if (elapsed >= MIN_INTRO_DURATION_MS) {
        setMinIntroElapsed(true);
        if (apisCompleted) {
          setLoadProgress(100);
          window.clearInterval(interval);
        }
      }
    }, 60);

    return () => window.clearInterval(interval);
  }, [showLoader, apisCompleted]);

  // Real Startup NASA Data + Blue Marble Preload
  useEffect(() => {
    let cancelled = false;

    async function bootstrapObservatory() {
      const blueMarblePromise = loadNasaGibsEarthTexture('bluemarble', '2025-11-10', 4)
        .then((tex) => {
          if (cancelled) return;
          updateStep('webgl', {
            status: tex ? 'done' : 'fallback',
            detail: tex ? 'Mosaico 2.5K listo' : 'Base vectorial',
          });
          targetProgressRef.current = Math.max(targetProgressRef.current, 35);
        })
        .catch(() => {
          if (!cancelled) {
            updateStep('webgl', { status: 'fallback', detail: 'Base vectorial' });
          }
        });

      updateStep('eonet', { status: 'loading', detail: 'Conectando...' });
      const statusPromise = fetchNasaStatus()
        .then((st) => {
          if (!cancelled) setNasaStatus(st);
          return st;
        })
        .catch(() => null);

      const eonetPromise = fetchNasaEonetEvents(45, 75, 'all')
        .then((res) => {
          if (cancelled) return;
          setEonetEvents(res.events);
          updateStep('eonet', {
            status: res.isLive ? 'done' : 'fallback',
            detail: res.isLive ? `${res.count} eventos en vivo` : 'Modo respaldo',
          });
          targetProgressRef.current = Math.max(targetProgressRef.current, 58);
        })
        .catch(() => {
          if (cancelled) return;
          updateStep('eonet', { status: 'fallback', detail: 'Sin conexión' });
          targetProgressRef.current = Math.max(targetProgressRef.current, 58);
        });

      updateStep('power', { status: 'loading', detail: 'Consultando MERRA-2...' });
      const powerPromise = fetchNasaPowerClimate(PIURA_CENTER.lat, PIURA_CENTER.lon, 30)
        .then((res) => {
          if (cancelled) return;
          setPowerData(res);
          updateStep('power', {
            status: res.isLive ? 'done' : 'fallback',
            detail: res.isLive
              ? `${res.series.length} días · ${res.summary.tempMean?.toFixed(1) ?? '--'} °C`
              : 'En espera',
          });
          targetProgressRef.current = Math.max(targetProgressRef.current, 82);
        })
        .catch(() => {
          if (cancelled) return;
          updateStep('power', { status: 'fallback', detail: 'Sin respuesta' });
          targetProgressRef.current = Math.max(targetProgressRef.current, 82);
        });

      updateStep('gibs', { status: 'loading', detail: 'Cargando WMTS...' });
      const gibsPromise = fetchNasaGibsLayers()
        .then((res) => {
          if (cancelled) return;
          setGibsLayers(res.layers);
          setRecommendedGibsDate(res.recommendedDate);
          updateStep('gibs', {
            status: 'done',
            detail: `${res.layers.length} capas listas`,
          });
          targetProgressRef.current = Math.max(targetProgressRef.current, 96);
        })
        .catch(() => {
          if (cancelled) return;
          updateStep('gibs', { status: 'fallback', detail: 'Catálogo local' });
          targetProgressRef.current = Math.max(targetProgressRef.current, 96);
        });

      await Promise.allSettled([
        blueMarblePromise,
        statusPromise,
        eonetPromise,
        powerPromise,
        gibsPromise,
      ]);

      if (!cancelled) {
        targetProgressRef.current = 100;
        setApisCompleted(true);
      }
    }

    bootstrapObservatory();

    return () => {
      cancelled = true;
    };
  }, [updateStep]);

  // Auto-enter 2.2s after full 3-act calibration completes unless paused by user interaction
  useEffect(() => {
    if (!readyToEnter || !showLoader || autoEnterPaused) return;
    const timer = window.setTimeout(() => {
      setShowLoader(false);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [readyToEnter, showLoader, autoEnterPaused]);

  const handleTexturesReady = useCallback(() => {
    updateStep('webgl', { status: 'done', detail: 'Mosaico 2.5K listo' });
    targetProgressRef.current = Math.max(targetProgressRef.current, 35);
  }, [updateStep]);

  const loadPowerForCoords = useCallback(async (lat: number, lon: number) => {
    setPowerLoading(true);
    try {
      const data = await fetchNasaPowerClimate(lat, lon, 30);
      setPowerData(data);
    } catch {
      // Keep prior state gracefully
    } finally {
      setPowerLoading(false);
    }
  }, []);

  const handleSelectLocation = useCallback(
    (coords: GeoCoordinates) => {
      setSelectedLocation(coords);
      setSelectedStation(null);
      setSelectedEvent(null);
      loadPowerForCoords(coords.lat, coords.lon);
    },
    [loadPowerForCoords]
  );

  const handleSelectStation = useCallback(
    (station: PiuraStation) => {
      setSelectedStation(station);
      setSelectedEvent(null);
      setSelectedLocation({
        lat: station.lat,
        lon: station.lon,
        label: station.name,
        subtitle: `${station.province} · ${station.ecosystem}`,
      });
      loadPowerForCoords(station.lat, station.lon);
    },
    [loadPowerForCoords]
  );

  const handleSelectEvent = useCallback(
    (ev: NasaEonetEvent) => {
      setSelectedEvent(ev);
      setSelectedStation(null);
      setSelectedLocation({
        lat: ev.lat,
        lon: ev.lon,
        label: ev.title,
        subtitle: `NASA EONET · ${translateEonetCategory(ev.categoryId, ev.categoryTitle)}`,
      });
      loadPowerForCoords(ev.lat, ev.lon);
    },
    [loadPowerForCoords]
  );

  const navigateToSection = useCallback((section: NavSection) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const isSpatialFullscreen = activeSection === 'orbit' || activeSection === 'map';

  return (
    <div className="min-h-screen bg-[#03050A] text-slate-100 flex flex-col">
      {/* Interactive Cinema Orbital Loading Intro */}
      <LoadingScreen
        visible={showLoader}
        progress={loadProgress}
        steps={loadingSteps}
        piuraLiveTemp={powerData?.summary.tempMean}
        piuraLiveRain={powerData?.summary.totalPrecipMm}
        readyToEnter={readyToEnter}
        autoEnterPaused={autoEnterPaused}
        onUserInteract={() => setAutoEnterPaused(true)}
        onTogglePauseAutoEnter={() => setAutoEnterPaused((v) => !v)}
        onEnter={() => setShowLoader(false)}
      />

      {/* Architectural Aerospace Command Bar (Strict 3-Zone Contract) */}
      <header className="fixed top-0 inset-x-0 z-[500] border-b border-white/[0.09] bg-[#04070E]/94">
        <div className="max-w-[1440px] mx-auto h-14 px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => navigateToSection('orbit')}
            className="brand-wordmark font-medium text-white hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Piura Watch
          </button>

          {/* Zone 2: 5 Concise Single-Line Nav Links */}
          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-7 text-xs font-medium"
          >
            {NAV_ITEMS.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateToSection(item.id)}
                  className={`relative h-14 inline-flex items-center whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active ? 'text-white' : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {item.label}
                  {active && (
                    <motion.span
                      layoutId="top-nav-indicator"
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute left-0 right-0 bottom-0 h-[2px] bg-cyan-400"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigateToSection('map')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                activeSection === 'map'
                  ? 'bg-white text-slate-950'
                  : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Explorar la Tierra
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Abrir menú"
              className="md:hidden p-1.5 rounded-md text-slate-200 hover:bg-white/[0.08] cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="md:hidden border-t border-white/[0.08] bg-[#04070E]/98 px-4 py-3 flex flex-wrap gap-1.5"
            >
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateToSection(item.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer ${
                    activeSection === item.id
                      ? 'bg-cyan-400 text-slate-950 font-semibold'
                      : 'bg-white/[0.05] text-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content Stage */}
      <main
        className={
          isSpatialFullscreen
            ? 'flex-1 w-full h-screen overflow-hidden'
            : 'flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16'
        }
      >
        <AnimatePresence mode="wait">
          <motion.section
            key={activeSection}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={isSpatialFullscreen ? 'w-full h-full' : ''}
          >
            {activeSection === 'orbit' && (
              <OrbitOverview
                stations={PIURA_STATIONS}
                eonetEvents={eonetEvents}
                selectedLocation={selectedLocation}
                selectedStation={selectedStation}
                selectedEvent={selectedEvent}
                gibsDate={recommendedGibsDate}
                powerData={powerData}
                powerLoading={powerLoading}
                onSelectLocation={handleSelectLocation}
                onSelectStation={handleSelectStation}
                onSelectEvent={handleSelectEvent}
                onOpenInMap={() => navigateToSection('map')}
                onOpenParadox={() => navigateToSection('paradox')}
                onTexturesReady={handleTexturesReady}
              />
            )}

            {activeSection === 'map' && (
              <NasaMapExplorer
                stations={PIURA_STATIONS}
                eonetEvents={eonetEvents}
                gibsLayers={gibsLayers}
                recommendedGibsDate={recommendedGibsDate}
                selectedLocation={selectedLocation}
                selectedStation={selectedStation}
                selectedEvent={selectedEvent}
                powerData={powerData}
                powerLoading={powerLoading}
                onSelectLocation={handleSelectLocation}
                onSelectStation={handleSelectStation}
                onSelectEvent={handleSelectEvent}
                onRefreshPower={() =>
                  loadPowerForCoords(selectedLocation.lat, selectedLocation.lon)
                }
                onReturnToGlobe={() => navigateToSection('orbit')}
              />
            )}

            {activeSection === 'paradox' && (
              <EarthParadoxView
                onLocateOnMap={(st) => {
                  handleSelectStation(st);
                  navigateToSection('map');
                }}
                onLocateOnGlobe={(st) => {
                  handleSelectStation(st);
                  navigateToSection('orbit');
                }}
              />
            )}

            {activeSection === 'collapse' && (
              <SilentCollapseView
                onLocateOnMap={(st) => {
                  handleSelectStation(st);
                  navigateToSection('map');
                }}
                onLocateOnGlobe={(st) => {
                  handleSelectStation(st);
                  navigateToSection('orbit');
                }}
              />
            )}

            {activeSection === 'decision' && (
              <DecisionInvestmentView
                onLocateOnMap={(st) => {
                  handleSelectStation(st);
                  navigateToSection('map');
                }}
                onLocateOnGlobe={(st) => {
                  handleSelectStation(st);
                  navigateToSection('orbit');
                }}
              />
            )}

            {activeSection === 'trends' && (
              <TrendsMethodologyView powerData={powerData} nasaStatus={nasaStatus} />
            )}
          </motion.section>
        </AnimatePresence>
      </main>

      {/* Quiet Editorial Footer on analytical pages only */}
      {!isSpatialFullscreen && (
        <footer className="border-t border-white/[0.06] py-5 px-4 sm:px-6 text-xs text-slate-500">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>Piura Watch · Observatorio Climático y Satelital</span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigateToSection('trends')}
                className="hover:text-slate-300 transition-colors cursor-pointer"
              >
                Fuentes NASA (EONET · POWER · GIBS)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAutoEnterPaused(false);
                  setShowLoader(true);
                }}
                className="hover:text-slate-300 transition-colors cursor-pointer"
              >
                Repetir intro orbital
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
