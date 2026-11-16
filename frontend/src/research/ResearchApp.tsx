import React, { useEffect, useRef, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EarthGlobe3D } from '../components/EarthGlobe3D';
import { LanguageProvider, useLanguage, type Key } from './i18n';
import { StudyGlobe, type StudyArea } from './StudyGlobe';
import Intelligence from './Intelligence';
import Events from './EnvironmentalEvents';
import { earthshift, requireReal } from '../services/earthshiftClient';
import { selectionTransition, validateRequest } from './comparison.mjs';
import './research.css';
const COLORS=['#6ee7b7','#fbbf24'];
const INITIAL_AREAS:StudyArea[]=[{lat:-5.557,lon:-80.822,radiusKm:10},{lat:-5.238,lon:-79.451,radiusKm:10}];
const VARIABLES=['precipitation','ndvi','soil_moisture','lst','air_temperature'] as const;
const getDefaultPeriod=()=>({start:'2023-01-01',end:'2023-12-31'});
const noOp=()=>{};
function LanguageSwitch() {
  const {language,setLanguage,t}=useLanguage();
  return <div className="language-switch" role="group" aria-label={t('language')}><button aria-label="Switch to English" aria-pressed={language==='en'} onClick={()=>setLanguage('en')}>EN</button><button aria-label="Cambiar a español" aria-pressed={language==='es'} onClick={()=>setLanguage('es')}>ES</button></div>;
}
function DownloadButton({result,csv=false}:{result:any;csv?:boolean}) {
  const {t,language,date}=useLanguage();
  function save() {
    const content=csv?['area_id,variable_id,month,value,valid_days,expected_days,data_status',...result.samples.flatMap((s:any)=>Object.entries(s.variables).flatMap(([id,v]:[string,any])=>v.stats.monthly.map((m:any)=>[s.area.id,id,m.month,m.value??'',m.valid,m.expected,v.status].join(','))))].join('\r\n'):JSON.stringify({title:t('exportTitle'),language,headings:{areas:t('area'),period:t('period'),evidence:t('evidence'),findings:t('findings')},notes:[t('geometry'),t('noCause'),t('reportNote')],humanReadableEvidence:result.samples.flatMap((s:any)=>Object.entries(s.variables).map(([id,v]:[string,any])=>({area:s.area.id,variable:t(id as Key),status:t(v.status as Key),period:date(s.period.start)+' – '+date(s.period.end),unit:v.evidence.unit,method:t(v.evidence.method==='not_implemented'?'integration_pending':'center_cell_daily_v1'),limitations:v.evidence.limitations.map((x:Key)=>t(x)),qualityControls:v.evidence.qualityControls.map((x:Key)=>t(x))}))),...result},null,2);
    const url=URL.createObjectURL(new Blob([content],{type:csv?'text/csv;charset=utf-8':'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`earthshift-${result.request.mode}-${language}.${csv?'csv':'json'}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <button onClick={save}>{t(csv?'csv':'export')}</button>;
}
function Evidence({value,area}:{value:any;area:string}) {
  const {t,date,number}=useLanguage(),e=value.evidence;
  return <details className="evidence"><summary>{t('evidence')} · {t('area')} {area}</summary><dl>
    <dt>{t('area')}</dt><dd>{area} · {number(e.area.lat,4)}°, {number(e.area.lon,4)}° · {number(e.area.radiusKm)} km</dd>
    <dt>{t('period')}</dt><dd>{date(e.period.start)} – {date(e.period.end)}</dd>
    <dt>{t('product')}</dt><dd>{value.status==='simulated'?t('synthetic'):e.product}{e.upstreamSources?.length?' · '+e.upstreamSources.join(', '):''}</dd><dt>{t('version')}</dt><dd>{e.productVersion??t('notReported')}</dd>
    <dt>{t('source')}</dt><dd>{e.sourceUrl?<a href={e.sourceUrl} target="_blank" rel="noreferrer">{e.product.split('/')[0]} ↗</a>:t('synthetic')}</dd>
    <dt>{t('unit')}</dt><dd>{e.unit}</dd><dt>{t('spatial')}</dt><dd>{e.spatialResolution ? '0.5° × 0.625°' : t('notReported')}</dd>
    <dt>{t('temporal')}</dt><dd>{e.temporalResolution?t('daily'):t('notReported')}</dd>
    <dt>{t('latest')}</dt><dd>{date(e.latestObservation)}</dd><dt>{t('retrieved')}</dt><dd>{e.retrievedAt?new Date(e.retrievedAt).toLocaleString(languageLocale()):'—'}</dd>
    <dt>{t('coverage')}</dt><dd>{number(e.valid,0)} / {number(e.expected,0)}</dd>
    <dt>{t('status')}</dt><dd>{t(value.status as Key)} · {e.rawDataStatus==='reanalysis'?t('reanalysis'):t(value.status as Key)}</dd>
    <dt>{t('processing')}</dt><dd>{t(e.method==='not_implemented'?'integration_pending':'center_cell_daily_v1')}{value.stats.trend&&<p>{t('trendMethod')}</p>}</dd>
    <dt>{t('quality')}</dt><dd><ul>{e.qualityControls.map((x:Key)=><li key={x}>{t(x)}</li>)}</ul></dd>
    <dt>{t('limitations')}</dt><dd><ul>{e.limitations.map((x:Key)=><li key={x}>{t(x)}</li>)}</ul></dd>
  </dl></details>;
}
function languageLocale(){return document.documentElement.lang==='es'?'es-PE':'en-US';}
function Results({result,stale,active}:{result:any;stale:boolean;active:boolean}) {
  const {t,date,number,locale}=useLanguage();
  if(!result)return <p className="empty-state">{t('initial')}</p>;
  return <section className="results" aria-label={t('findings')}>
    {stale&&<p role="status" className="notice">{t('stale')}</p>}
    <div className="section-heading"><div><h2>{t('findings')}</h2></div><div className="button-row"><DownloadButton result={result}/><DownloadButton result={result} csv/></div></div>
    <p className={result.request.mode==='synthetic'?'notice synthetic':'fine-print'}>{result.request.mode==='synthetic'?t('syntheticInfo'):t('geometry')}</p>
    {result.request.variables.map((id:Key)=>{
      const a=result.samples[0].variables[id],b=result.samples[1].variables[id];
      const comparison=result.comparisons.find((c:any)=>c.variable===id),paired=comparison.paired;
      const months=[...new Set([...a.stats.monthly.map((p:any)=>p.month),...b.stats.monthly.map((p:any)=>p.month)])].sort() as string[];
      const chart=months.map(month=>({month,A:a.stats.monthly.find((m:any)=>m.month===month)?.value??null,B:b.stats.monthly.find((m:any)=>m.month===month)?.value??null}));
      const hasChart=chart.some(m=>m.A!==null||m.B!==null);
      const enough=paired?.valid>=30&&a.stats.coverage>=.9&&b.stats.coverage>=.9;
      return <article key={id} className="result-card"><div className="section-heading"><h3>{t(id)}</h3><span>{a.evidence.unit}</span></div>
        <div className="two-columns">{result.samples.map((sample:any,i:number)=>{const v=sample.variables[id];return <section key={sample.area.id} className={'metric area-'+sample.area.id}>
          <h4><span className="area-letter">{sample.area.id}</span> {t('area')} {sample.area.id}</h4>
          <p className="fine-print">{number(sample.area.lat,4)}°, {number(sample.area.lon,4)}° · {date(sample.period.start)} – {date(sample.period.end)}</p>
          {v.status==='unavailable'?<><strong>{t('unavailable')}</strong><p>{t((v.reason??'no_valid_observations') as Key)}</p></>:<>
            <span className={'status-badge '+v.status}>{t(v.status as Key)}</span>
            <p>{t(id==='precipitation'?'total':'mean')}</p><strong className="metric-value">{number(id==='precipitation'?v.stats.total:v.stats.mean)} <small>{id==='precipitation'?'mm':v.evidence.unit}</small></strong>
            <p>{t('trend')}: {v.stats.trend ? number(v.stats.trend.annualSlope,3)+' '+v.stats.trend.unit : t('trendUnavailable')}</p>{v.stats.trend&&<p className="fine-print">{t('trendMethod')} · {v.stats.trend.start}–{v.stats.trend.end}</p>}
            <p>{t('coverage')}: {number(v.stats.valid,0)} / {number(v.stats.expected,0)} ({number(v.stats.coverage*100,1)}%)</p>
            {!v.stats.complete&&<p className="notice">{t('incomplete')}</p>}
          </>}
          <Evidence value={v} area={sample.area.id}/>
        </section>;})}</div>
        <div className="finding"><strong>{enough?t('paired'):t('insufficient')}</strong>{enough&&<p>A {t(paired.meanDifference<0?'less':paired.meanDifference>0?'more':'same')}: {number(Math.abs(paired.meanDifference),3)} {a.evidence.unit} · {t('matched')}: {number(paired.valid,0)}</p>}<p>{result.request.separatePeriods?t('separateWarning'):t('noCause')}</p></div>
        {hasChart&&active?<><h4>{t('chart')} · {id==='precipitation'?'mm':'°C'}</h4>
          <div className="comparison-chart" role="img" aria-label={t('chart')+' A / B · '+t(id)}><ResponsiveContainer width="100%" height="100%"><LineChart data={chart} margin={{top:20,right:18,bottom:12,left:4}}><CartesianGrid stroke="#203649" strokeDasharray="3 5"/><XAxis dataKey="month" tickFormatter={m=>new Intl.DateTimeFormat(locale,{month:'short',year:'2-digit',timeZone:'UTC'}).format(new Date(m+'-01T00:00:00Z'))} stroke="#a8bac7"/><YAxis stroke="#a8bac7" tickFormatter={n=>number(n,1)}/><Tooltip contentStyle={{background:'#102434',border:'1px solid #345264',borderRadius:10}} labelFormatter={m=>date(String(m)+'-01')} formatter={(v:any,name:any)=>[number(v),`${t('area')} ${name}`]}/><Line dataKey="A" name="A" stroke={COLORS[0]} dot={false} strokeWidth={2} connectNulls={false} isAnimationActive={false}/><Line dataKey="B" name="B" stroke={COLORS[1]} dot={false} strokeWidth={2} connectNulls={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></div>
          <details><summary>{t('chart')} · {t('coverage')}</summary><div className="table-scroll"><table><caption>{t(id)} · A / B</caption><thead><tr><th>{t('period')}</th><th>A</th><th>B</th></tr></thead><tbody>{chart.map(m=><tr key={m.month}><td>{date(m.month+'-01')}</td><td>{number(m.A)}</td><td>{number(m.B)}</td></tr>)}</tbody></table></div></details>
        </>:<p className="fine-print">{t('noChart')}</p>}
      </article>;
    })}
    <aside className="paper"><h3>{t('seasonal')}</h3><p>{t('seasonalNote')}</p><p>{t('airVsSurface')}</p></aside>
  </section>;
}
function ProcessedDownload({data,csv=false}:{data:any[];csv?:boolean}) {
  const {t,language}=useLanguage();
  function save(){
    const content=csv?['region,year,ndvi,precipitation_mm,surface_temperature_c,soil_moisture',...data.flatMap(item=>item.series.map((row:any)=>[item.region,row.year,row.ndvi??'',row.precipitation_mm??'',row.surface_temperature_c??'',row.soil_moisture??''].map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')))].join('\r\n'):JSON.stringify(data,null,2);
    const url=URL.createObjectURL(new Blob([content],{type:csv?'text/csv;charset=utf-8':'application/json;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='earthshift-processed.'+(csv?'csv':'json');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <button disabled={!data.length} onClick={save}>{csv ? (language==='es'?'Descargar CSV anual':'Download annual CSV') : t('export')}</button>;
}
function Comparison({demoSignal,active}:{demoSignal:number;active:boolean}) {
  const {t,number}=useLanguage();
  const [regions,setRegions]=useState<string[]>([]),[region,setRegion]=useState(''),[second,setSecond]=useState('');
  const [catalog,setCatalog]=useState<any[]>([]),[variables,setVariables]=useState<string[]>([]);
  const [data,setData]=useState<any[]>([]),[pending,setPending]=useState(false),[error,setError]=useState('');
  const [areas,setAreas]=useState<(StudyArea|null)[]>([INITIAL_AREAS[0],null]);
  useEffect(()=>{const abort=new AbortController();Promise.all([earthshift('/regions',{signal:abort.signal}),earthshift('/cells',{signal:abort.signal}),earthshift('/variables',{signal:abort.signal})]).then(([r,c,v])=>{
    if(abort.signal.aborted)return;
    const available=r.regions.filter((id:string)=>c.cells.some((cell:any)=>cell.region===id && cell.source==='processed_real_data'));
    setRegions(available);setRegion(available[0]||'');setSecond(available[1]||'');setCatalog(v.variables);setVariables(v.variables.map((item:any)=>item.id));
    if(!available.length)setError('Datos no disponibles temporalmente.');
  }).catch(()=>{if(!abort.signal.aborted)setError('Datos no disponibles temporalmente.');});return()=>abort.abort();},[]);
  useEffect(()=>{if(!region)return;const abort=new AbortController();setPending(true);setError('');setData([]);
    const selected=[region,...(second && second!==region?[second]:[])];
    Promise.all(selected.map(id=>earthshift('/series?region='+encodeURIComponent(id),{signal:abort.signal}).then(requireReal))).then(result=>{if(!abort.signal.aborted)setData(result);}).catch(()=>{if(!abort.signal.aborted)setError('Datos no disponibles temporalmente.');}).finally(()=>{if(!abort.signal.aborted)setPending(false);});return()=>abort.abort();
  },[region,second]);
  const keys:Record<string,string>={ndvi:'ndvi',precipitation:'precipitation_mm',surface_temperature:'surface_temperature_c',soil_moisture:'soil_moisture'};
  const chart=data[0]?.series.map((point:any)=>{const other=data[1]?.series.find((row:any)=>row.year===point.year);return {...point,...Object.fromEntries(catalog.map(v=>[v.id+'_B',other?.[keys[v.id]]??null]))};}) || [];
  return <div className="research-content">
    <div className="section-heading"><div><h1>{t('compare')}</h1><p>Regiones con datos procesados EarthShift</p></div><div className="button-row"><ProcessedDownload data={data}/><ProcessedDownload data={data} csv/></div></div>
    <div className="study-layout"><div className="area-controls paper"><h2>{t('choose')}</h2>
      <fieldset className="area-form area-A"><legend><span className="area-letter">A</span> Región</legend><select value={region} disabled={!regions.length} onChange={e=>setRegion(e.target.value)}>{regions.map(id=><option key={id}>{id}</option>)}</select></fieldset>
      <fieldset className="area-form area-B" disabled={regions.length<2}><legend><span className="area-letter">B</span> Región</legend><select value={second} onChange={e=>setSecond(e.target.value)}><option value="">—</option>{regions.filter(id=>id!==region).map(id=><option key={id}>{id}</option>)}</select></fieldset>
      {regions.length<2 && <p className="fine-print">Se requieren al menos dos regiones con datos procesados para realizar una comparación regional.</p>}
    </div><div><StudyGlobe areas={areas} editing={0} onPick={area=>setAreas([area,null])}/><p className="fine-print">El mapa puede mostrar contexto satelital global, pero los análisis EarthShift están disponibles únicamente para regiones con datos procesados. Seleccionar el globo no cambia la región estudiada.</p></div></div>
    <section className="paper filters"><h2>{t('variablesStep')}</h2><div className="button-row">{catalog.map(v=><label className="checkbox" key={v.id}><input type="checkbox" checked={variables.includes(v.id)} onChange={e=>setVariables(current=>e.target.checked?[...current,v.id]:current.filter(id=>id!==v.id))}/>{v.name} · {v.unit}</label>)}</div><p className="fine-print">{data.map(item=>item.region+' · '+item.period+' · '+item.source).join(' / ')}</p>{pending && <p role="status">{t('running')}</p>}{error && <p role="alert" className="notice">{error}</p>}</section>
    <section className="results">{!pending && !error && !data.length && <p>Datos no disponibles temporalmente.</p>}{catalog.filter(v=>variables.includes(v.id)).map(v=><article className="result-card" key={v.id}><div className="section-heading"><h3>{v.name}</h3><span>{v.unit}</span></div>
      {data.length>0 && active && <div className="comparison-chart" role="img" aria-label={v.name}><ResponsiveContainer width="100%" height="100%"><LineChart data={chart} margin={{top:20,right:18,bottom:12,left:4}}><CartesianGrid stroke="#203649" strokeDasharray="3 5"/><XAxis dataKey="year" stroke="#a8bac7"/><YAxis stroke="#a8bac7"/><Tooltip contentStyle={{background:'#102434',border:'1px solid #345264',borderRadius:10}} formatter={(value:any)=>[number(value)+' '+v.unit,v.name]}/><Line dataKey={keys[v.id]} name={region} stroke={COLORS[0]} dot={false} connectNulls={false}/>{data.length>1 && <Line dataKey={v.id+'_B'} name={second} stroke={COLORS[1]} dot={false} connectNulls={false}/>}</LineChart></ResponsiveContainer></div>}
      <p className="fine-print">{v.source} · {v.aggregation}</p><details><summary>Cobertura de datos y observaciones</summary>{data.map(item=><div key={item.region}><p>{item.region} · valid_fraction: {typeof item.quality?.variables?.[v.id]?.valid_fraction==='number'?number(item.quality.variables[v.id].valid_fraction*100)+'%':'—'}</p><div className="table-scroll"><table><thead><tr><th>Año</th><th>{v.name} ({v.unit})</th></tr></thead><tbody>{item.series.map((point:any)=><tr key={point.year}><td>{point.year}</td><td>{number(point[keys[v.id]])}</td></tr>)}</tbody></table></div></div>)}</details>
    </article>)}</section>
    {!!data.length && <aside className="paper"><h3>Cobertura espacial y fuentes</h3><p className="fine-print">Las variables utilizan coberturas espaciales distintas. NDVI y temperatura superficial corresponden a la zona MODIS seleccionada; precipitación y humedad del suelo representan la serie regional general de Piura.</p><p className="fine-print">spatial_match: mixed · MODIS · GPM · GLDAS · processed_real_data</p></aside>}
  </div>;
}
function Methods(){const {t}=useLanguage();return <div className="research-content narrow"><h1>{t('methodTitle')}</h1><p>{t('methodIntro')}</p><section className="paper"><h2>{t('processing')}</h2><p>Series anuales procesadas: NDVI y temperatura superficial MODIS; precipitación GPM y humedad del suelo GLDAS de la serie general de Piura.</p><p>spatial_match: mixed. Las gráficas muestran los datos de la API; los motores se ejecutan en el backend.</p><a href="https://modis.gsfc.nasa.gov/" target="_blank" rel="noreferrer">MODIS · {t('source')} ↗</a></section><section className="paper"><h2>{t('limitations')}</h2><p>{t('seasonalNote')}</p><p>{t('airVsSurface')}</p></section><section className="paper"><h2>{t('audit')}</h2><p>{t('auditText')}</p></section></div>;}
function Lab(){return <Intelligence/>;}
function Shell(){const {t,language}=useLanguage();const [page,setPage]=useState('home'),[visitedCompare,setVisitedCompare]=useState(false),[demoSignal,setDemoSignal]=useState(0),[intro,setIntro]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches),[homeEvents,setHomeEvents]=useState<any[]>([]),[location,setLocation]=useState({lat:-5.1945,lon:-80.6328,label:'Piura'});useEffect(()=>{let cancelled=false;fetch('/api/nasa/eonet?days=45&limit=75').then(r=>r.json()).then(data=>{if(!cancelled&&data.isLive)setHomeEvents(data.events);}).catch(()=>{});return()=>{cancelled=true;};},[]);useEffect(()=>{const timer=setTimeout(()=>setIntro(false),2400);return()=>clearTimeout(timer);},[]);
  function navigate(next:string){if(next==='compare')setVisitedCompare(true);setPage(next);setIntro(false);}
  function demo(){navigate('compare');setDemoSignal(v=>v+1);}
  useEffect(()=>{document.title=(page==='lab'?'EarthShift Intelligence':'EarthShift · '+t(page as Key));},[page,language]);
  return <div className="research-app"><a className="skip-link" href="#research-main">{t('skip')}</a><header className="research-header"><button className="brand-wordmark" onClick={()=>navigate('home')}><img className="earthshift-logo" src="/earthshift-logo.svg" alt="" /><span className="earthshift-wordmark">EarthShift<span>{language==='en'?'Peru · Earth & evidence':'Perú · Tierra y evidencia'}</span></span></button><nav aria-label={t('home')}>{(['home','compare','methods','events','lab'] as const).map(key=><button aria-current={page===key?'page':undefined} key={key} onClick={()=>navigate(key)}>{t(key)}</button>)}</nav><LanguageSwitch/></header>
    <main id="research-main" tabIndex={-1}>
      <div hidden={page!=='home'}><section className="home-hero"><div className="hero-copy"><h1>{t('headline')}</h1><p>{t('intro')}</p><div className="button-row"><button className="primary" onClick={()=>navigate('compare')}>{t('start')} →</button></div></div><div className="home-earth"><EarthGlobe3D stations={[]} eonetEvents={homeEvents} selectedLocation={location} selectedEventId={null} gibsDate="2023-03-15" onSelectLocation={coords=>setLocation({...coords,label:t('newSelection')})} onSelectStation={noOp} onSelectEvent={noOp} onOpenInMap={()=>navigate('compare')}/></div></section><div className="research-content home-explain"><section><h2>{t('why')}</h2><p>{t('whyText')}</p></section><section><h2>{t('supports')}</h2><p>{t('supportsText')}</p></section></div></div>
      {visitedCompare&&<div hidden={page!=='compare'}><Comparison demoSignal={demoSignal} active={page==='compare'}/></div>}
      {page==='methods'&&<Methods/>}{page==='events'&&<Events/>}{page==='lab'&&<Lab/>}
    </main><footer className="research-footer">EarthShift · NASA Space Apps Challenge </footer>
    {intro&&<div className="project-intro" role="dialog" aria-modal="false" aria-label="EarthShift"><h2>{t('introTitle')}</h2><p>{t('introNote')}</p><button autoFocus onClick={()=>setIntro(false)}>{t('skip')} →</button></div>}
  </div>;
}
export default function ResearchApp(){return <LanguageProvider><Shell/></LanguageProvider>;}
