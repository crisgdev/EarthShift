import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from './i18n';
export type StudyArea={lat:number;lon:number;radiusKm:number};
const ROOT='https://cesium.com/downloads/cesiumjs/releases/1.131/Build/Cesium/';
let enginePromise:Promise<any>|undefined;
export function loadEngine():Promise<any> {
  if(enginePromise)return enginePromise;
  enginePromise=new Promise((resolve,reject)=>{
    const w=window as any;if(w.Cesium){resolve(w.Cesium);return;}
    w.CESIUM_BASE_URL=ROOT;
    if(!document.querySelector('[data-piura-cesium-css]')) { const css=document.createElement('link');css.rel='stylesheet';css.href=ROOT+'Widgets/widgets.css';css.dataset.piuraCesiumCss='true';document.head.appendChild(css); }
    const script=document.createElement('script');script.src=ROOT+'Cesium.js';const timer=setTimeout(()=>{enginePromise=undefined;script.remove();reject(Error('globe_load'));},20000);script.onload=()=>{clearTimeout(timer);resolve(w.Cesium);};script.onerror=()=>{clearTimeout(timer);enginePromise=undefined;script.remove();reject(Error('globe_load'));};document.head.appendChild(script);
  });return enginePromise;
}
const colors=['#6ee7b7','#fbbf24'];
export function StudyGlobe({areas,editing,onPick}:{areas:(StudyArea|null)[];editing:number;onPick:(area:StudyArea)=>void}) {
  const {t}=useLanguage();const ref=useRef<HTMLDivElement>(null),viewer=useRef<any>(null),current=useRef({areas,editing,onPick});current.current={areas,editing,onPick};
  const [ready,setReady]=useState(false),[error,setError]=useState(false),[attempt,setAttempt]=useState(0),[layerUnavailable,setLayerUnavailable]=useState(false),[layer,setLayer]=useState('natural'),[date,setDate]=useState('2023-03-15');
  const overlay=useRef<any>(null);
  function fly(kind:string) {const C=(window as any).Cesium,v=viewer.current;if(!v||!C)return;
    const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:1.2;
    if(kind==='world')v.camera.flyTo({destination:C.Cartesian3.fromDegrees(-80,-5,20000000),duration});
    else if(kind==='left')v.camera.rotateLeft(.2);
    else if(kind==='right')v.camera.rotateRight(.2);
    else if(kind==='in')v.camera.zoomIn(v.camera.positionCartographic.height*.4);
    else if(kind==='out')v.camera.zoomOut(v.camera.positionCartographic.height*.5);
    else { const points=current.current.areas.filter(a=>a&&Number.isFinite(a.lat)&&Number.isFinite(a.lon)&&Number.isFinite(a.radiusKm));if(points.length) {const sphere=C.BoundingSphere.fromPoints(points.map(a=>C.Cartesian3.fromDegrees(a!.lon,a!.lat)));sphere.radius=Math.max(sphere.radius, ...points.map(a=>a!.radiusKm*1000),20000);v.camera.flyToBoundingSphere(sphere,{duration,offset:new C.HeadingPitchRange(0,-Math.PI/2,Math.max(sphere.radius*3,80000))});}}
    v.scene.requestRender();
  }
  useEffect(()=>{
    let cancelled=false,v:any,handler:any;setReady(false);setError(false);
    (async()=>{const C=await loadEngine();if(cancelled||!ref.current)return;
      v=new C.Viewer(ref.current,{baseLayer:false,baseLayerPicker:false,geocoder:false,animation:false,timeline:false,homeButton:false,sceneModePicker:false,navigationHelpButton:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,terrainProvider:new C.EllipsoidTerrainProvider(),requestRenderMode:true,maximumRenderTimeChange:Infinity});
      viewer.current=v;v.scene.globe.enableLighting=false;v.scene.screenSpaceCameraController.minimumZoomDistance=6000;v.scene.screenSpaceCameraController.maximumZoomDistance=30000000;
      v.scene.globe.loadingDescendantLimit=0;
      v.camera.setView({destination:C.Cartesian3.fromDegrees(-80,-5,1000000)});
      const world=await C.TileMapServiceImageryProvider.fromUrl(ROOT+'Assets/Textures/NaturalEarthII');if(cancelled)return;v.imageryLayers.addImageryProvider(world);
      const url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
      const discard=new C.DiscardMissingTileImagePolicy({missingImageUrl:url+'/tile/23/0/0',pixelsToCheck:[new C.Cartesian2(0,0),new C.Cartesian2(200,20),new C.Cartesian2(20,200),new C.Cartesian2(80,110),new C.Cartesian2(160,130)],disableCheckIfAllPixelsAreTransparent:true});
      const provider=await C.ArcGisMapServerImageryProvider.fromUrl(url,{maximumLevel:15,enablePickFeatures:false,tileDiscardPolicy:discard});if(cancelled)return;
      v.imageryLayers.addImageryProvider(provider);
      handler=new C.ScreenSpaceEventHandler(v.scene.canvas);
      handler.setInputAction((click:any)=>{const point=v.camera.pickEllipsoid(click.position,v.scene.globe.ellipsoid);if(!point)return;const coord=C.Cartographic.fromCartesian(point);const existing=current.current.areas[current.current.editing];current.current.onPick({lat:Number(C.Math.toDegrees(coord.latitude).toFixed(4)),lon:Number(C.Math.toDegrees(coord.longitude).toFixed(4)),radiusKm:existing?.radiusKm??10});},C.ScreenSpaceEventType.LEFT_CLICK);
      setReady(true);v.scene.requestRender();
    })().catch(()=>{if(!cancelled)setError(true);});
    return()=>{cancelled=true;setReady(false);viewer.current=null;overlay.current=null;handler?.destroy();if(v&&!v.isDestroyed())v.destroy();};
  },[attempt]);
  useEffect(()=>{const v=viewer.current,C=(window as any).Cesium;if(!v||!ready)return;v.entities.removeAll();areas.forEach((a,i)=>{if(!a||!Number.isFinite(a.lat)||!Number.isFinite(a.lon)||!Number.isFinite(a.radiusKm)||a.radiusKm<1)return;v.entities.add({id:i===0?'A':'B',position:C.Cartesian3.fromDegrees(a.lon,a.lat),ellipse:{semiMajorAxis:a.radiusKm*1000,semiMinorAxis:a.radiusKm*1000,material:C.Color.fromCssColorString(colors[i]).withAlpha(.22),outline:true,outlineColor:C.Color.fromCssColorString(colors[i])},label:{text:i===0?'A':'B',font:'bold 18px Arial',fillColor:C.Color.fromCssColorString(colors[i]),outlineColor:C.Color.BLACK,outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,disableDepthTestDistance:Infinity,pixelOffset:new C.Cartesian2(0,-18)}});});v.scene.requestRender();},[areas,ready]);
  useEffect(()=>{const v=viewer.current,C=(window as any).Cesium;if(!v||!ready)return;setLayerUnavailable(false);let removeError:(()=>void)|undefined;if(overlay.current){v.imageryLayers.remove(overlay.current);overlay.current=null;}if(layer!=='natural') {
    const id=layer==='ndvi'?'MODIS_Terra_NDVI_8Day':layer==='lst'?'MODIS_Terra_Land_Surface_Temp_Day':'IMERG_Precipitation_Rate';
    const level=layer==='ndvi'?9:layer==='lst'?7:6;
    const matrix='GoogleMapsCompatible_Level'+level;
    const provider=new C.UrlTemplateImageryProvider({url:`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${id}/default/${date}/${matrix}/{z}/{y}/{x}.png`,maximumLevel:level,credit:'NASA EOSDIS GIBS'});
    removeError=provider.errorEvent.addEventListener(()=>setLayerUnavailable(true));
    overlay.current=v.imageryLayers.addImageryProvider(provider);overlay.current.alpha=.65;
  }v.scene.requestRender();return()=>removeError?.();},[layer,date,ready]);
  return <section className="study-map" aria-label={t('globe')}>
    <div ref={ref} className="globe-mount" />
    {!ready&&!error&&<p role="status" className="map-status">{t('loadingGlobe')}</p>}
    {error&&<div role="alert" className="map-status">{t('globeError')} <button onClick={()=>setAttempt(v=>v+1)}>{t('retry')}</button></div>}
    <div className="map-controls">
      <button onClick={()=>fly('world')}>{t('world')}</button><button onClick={()=>fly('both')}>{t('focus')}</button>
      <button aria-label={t('rotateLeft')} onClick={()=>fly('left')}>↶</button><button aria-label={t('rotateRight')} onClick={()=>fly('right')}>↷</button><button aria-label={t('zoomIn')} onClick={()=>fly('in')}>+</button><button aria-label={t('zoomOut')} onClick={()=>fly('out')}>−</button>
    </div>
    <div className="map-layers"><label>{t('layer')}<select value={layer} onChange={e=>setLayer(e.target.value)}><option value="natural">{t('imagery')}</option><option value="ndvi">NASA GIBS · NDVI</option><option value="lst">NASA GIBS · {t('lst')}</option><option value="precipitation">NASA GIBS · {t('precipitation')}</option></select></label>{layer!=='natural'&&<label>{t('gibsDate')}<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>}</div>
    <p className="map-hint">{layerUnavailable&&<span role="status">{t('layerUnavailable')} </span>}{t('editing')} {editing===0?'A':'B'} · {t('mapHint')}</p>
  </section>;
}