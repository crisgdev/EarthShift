import React, { useEffect, useRef, useState } from 'react';
import { NasaMapExplorer, type NasaMapExplorerProps } from './NasaMapExplorer';

const ROOT = 'https://cesium.com/downloads/cesiumjs/releases/1.131/Build/Cesium/';
let enginePromise: Promise<any> | undefined;
function loadEngine(): Promise<any> {
  if (enginePromise) return enginePromise;
  enginePromise = new Promise((resolve, reject) => {
    const w = window as any;
    if (w.Cesium) { resolve(w.Cesium); return; }
    w.CESIUM_BASE_URL = ROOT;
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = ROOT + 'Widgets/widgets.css';
    document.head.appendChild(css);
    const script = document.createElement('script');
    script.src = ROOT + 'Cesium.js';
    script.onload = () => resolve(w.Cesium);
    script.onerror = () => { enginePromise = undefined; script.remove(); reject(new Error('No se pudo cargar el globo. Comprueba tu conexión y vuelve a intentarlo.')); };
    document.head.appendChild(script);
  });
  return enginePromise;
}

export function NatureGlobe(props: NasaMapExplorerProps) {
  const mount = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const propsRef = useRef(props); propsRef.current = props;
  const [flat, setFlat] = useState(false);
  const [status, setStatus] = useState('Preparando tu viaje…');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (flat || !mount.current) return;
    let cancelled = false;
    let viewer: any;
    let handler: any;
    setError(''); setStatus('Preparando tu viaje…');
    (async () => {
      const C = await loadEngine();
      if (cancelled) return;
      viewer = new C.Viewer(mount.current, {
        baseLayer: false, baseLayerPicker: false, geocoder: false,
        timeline: false, animation: false, homeButton: false,
        sceneModePicker: false, navigationHelpButton: false,
        fullscreenButton: false, infoBox: false, selectionIndicator: false,
        terrainProvider: new C.EllipsoidTerrainProvider(),
        requestRenderMode: true, maximumRenderTimeChange: Infinity,
      });
      viewerRef.current = viewer;
      viewer.scene.globe.enableLighting = false;
      viewer.scene.screenSpaceCameraController.minimumZoomDistance = 6000;
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = 30000000;
      viewer.scene.globe.maximumScreenSpaceError = 1.5;
      viewer.scene.globe.loadingDescendantLimit = 0;
      viewer.camera.setView({ destination: C.Cartesian3.fromDegrees(-80.63, -5.19, 18000000) });
      // A continuous world image remains under local high resolution imagery.
      const world = await C.TileMapServiceImageryProvider.fromUrl(ROOT + 'Assets/Textures/NaturalEarthII');
      if (cancelled) return;
      viewer.imageryLayers.addImageryProvider(world);
      const service = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
      const discard = new C.DiscardMissingTileImagePolicy({
        missingImageUrl: service + '/tile/23/0/0',
        pixelsToCheck: [new C.Cartesian2(0, 0), new C.Cartesian2(200, 20), new C.Cartesian2(20, 200), new C.Cartesian2(80, 110), new C.Cartesian2(160, 130)],
        disableCheckIfAllPixelsAreTransparent: true,
      });
      const imagery = await C.ArcGisMapServerImageryProvider.fromUrl(service, {
        maximumLevel: 15, enablePickFeatures: false, tileDiscardPolicy: discard,
      });
      if (cancelled) return;
      viewer.imageryLayers.addImageryProvider(imagery);
      imagery.errorEvent.addEventListener(() => {
        if (!cancelled) setStatus('Cobertura limitada: se conserva la imagen de menor detalle.');
      });
      for (const station of propsRef.current.stations) {
        viewer.entities.add({ id: station.id,
          position: C.Cartesian3.fromDegrees(station.lon, station.lat),
          point: { pixelSize: 6, color: C.Color.CYAN, outlineColor: C.Color.BLACK, outlineWidth: 1, disableDepthTestDistance: Number.POSITIVE_INFINITY },
        });
      }
      handler = new C.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((click: any) => {
        const picked = viewer.scene.pick(click.position);
        const station = propsRef.current.stations.find(s => s.id === picked?.id?.id);
        if (station) { propsRef.current.onSelectStation(station); return; }
        const point = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
        if (!point) return;
        const cart = C.Cartographic.fromCartesian(point);
        const lat = C.Math.toDegrees(cart.latitude), lon = C.Math.toDegrees(cart.longitude);
        propsRef.current.onSelectLocation({ lat, lon, label: `Sonda ${lat.toFixed(3)}°, ${lon.toFixed(3)}°` });
      }, C.ScreenSpaceEventType.LEFT_CLICK);
      setStatus('Gira la Tierra arrastrando. Acércate con la rueda y elige un lugar para conocerlo.');
      viewer.scene.requestRender();
    })().catch(e => { if (!cancelled) { setError(e.message || 'No se pudo cargar el globo.'); setStatus(''); } });
    return () => { cancelled = true; viewerRef.current = null; if (handler) handler.destroy(); if (viewer && !viewer.isDestroyed()) viewer.destroy(); };
  }, [flat, attempt]);

  function focus(lat: number, lon: number, height: number) {
    const C = (window as any).Cesium;
    if (C && viewerRef.current) viewerRef.current.camera.flyTo({ destination: C.Cartesian3.fromDegrees(lon, lat, Math.max(height, 6000)), duration: 1.6 });
  }
  const summary = props.powerData?.summary;
  return <div className="relative w-full h-screen overflow-hidden bg-[#02060d]">
    {flat ? <NasaMapExplorer {...props} /> : <div ref={mount} className="absolute inset-0" />}
    <div className="absolute top-20 right-16 z-[600] flex gap-2">
      <button type="button" onClick={() => setFlat(v => !v)} className="rounded-lg bg-[#07111e]/95 border border-white/20 px-4 py-2 text-xs text-cyan-200">{flat ? 'Volver al globo 3D' : 'Ver datos de la NASA'}</button>
    </div>
    {!flat && <>
      <aside className="absolute top-20 left-4 z-20 nature-panel w-80 max-w-[80vw] rounded-2xl border border-white/15 bg-[#07111e]/95 p-4 text-white shadow-2xl space-y-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-200">Piura y el mundo</p>
        <h2>La tierra, de cerca.</h2>
        <p className="text-xs leading-relaxed text-slate-300">Sigue el curso de un río, recorre un valle o descubre dónde empieza el bosque. Elige un lugar y mira lo que lo hace único.</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => focus(props.selectedLocation.lat, props.selectedLocation.lon, 12000)} className="flex-1 rounded-lg bg-emerald-400/15 border border-emerald-400/30 px-3 py-2 text-xs text-emerald-200">Acercarme aquí</button>
          <button type="button" onClick={() => focus(-5.19, -80.63, 18000000)} className="rounded-lg border border-white/20 px-3 py-2 text-xs">Ver el planeta</button>
        </div>
        <p className="text-xs text-cyan-200">{props.selectedLocation.label}</p>
        {summary && <div className="grid grid-cols-2 gap-2 text-xs text-slate-300"><span>Temperatura {summary.tempMean?.toFixed(1) ?? '—'} °C</span><span>Lluvia acumulada {summary.totalPrecipMm?.toFixed(1) ?? '—'} mm</span></div>}
        <p className="text-[11px] text-slate-400">Cada paisaje tiene su tiempo: estas imágenes se tomaron en distintas fechas. El detalle disponible cambia de un lugar a otro.</p>
        {error && <div role="alert" className="text-xs text-amber-200">{error}<button type="button" className="block underline mt-2" onClick={() => setAttempt(v => v + 1)}>Reintentar</button></div>}
      </aside>
      <div role="status" className="absolute bottom-12 left-4 z-20 max-w-[80vw] rounded-lg bg-[#07111e]/90 px-3 py-2 text-[11px] text-slate-300">{status}</div>
      <div className="absolute bottom-20 sm:bottom-12 right-4 z-20 flex flex-wrap justify-end gap-1 max-w-[50vw]">
        {props.stations.map(st => <button type="button" key={st.id} onClick={() => { props.onSelectStation(st); focus(st.lat, st.lon, 25000); }} className="rounded bg-[#07111e]/95 border border-white/15 px-2 py-1 text-[11px] text-emerald-200">{st.name}</button>)}
      </div>
    </>}
  </div>;
}