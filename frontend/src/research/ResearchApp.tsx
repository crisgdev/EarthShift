import React, { useEffect, useRef, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EarthGlobe3D } from '../components/EarthGlobe3D';
import { PIURA_STATIONS, HISTORICAL_TRENDS_PIURA } from '../data/piuraData';
import { LanguageProvider, useLanguage, type Key } from './i18n';
import { StudyGlobe, type StudyArea } from './StudyGlobe';
import Intelligence from './Intelligence';
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
function Comparison({demoSignal,active}:{demoSignal:number;active:boolean}) {
  const {t,number}=useLanguage();
  const [selection,setSelection]=useState<{areas:(StudyArea|null)[];editing:number}>({areas:INITIAL_AREAS,editing:0});
  const [period,setPeriod]=useState(getDefaultPeriod),[periodB,setPeriodB]=useState(getDefaultPeriod),[separate,setSeparate]=useState(false);
  const [variables,setVariables]=useState<string[]>(['precipitation','ndvi','soil_moisture','lst']);
  const [result,setResult]=useState<any>(null),[pending,setPending]=useState(false),[error,setError]=useState(''),[mode,setMode]=useState('real');
  const requestId=useRef(0),controller=useRef<AbortController|null>(null);
  function transition(action:any){setSelection(s=>selectionTransition(s,action));}
  const body={areas:selection.areas,period,periodB:separate?periodB:undefined,separatePeriods:separate,variables,mode};
  const signature=JSON.stringify(body),[completedSignature,setCompletedSignature]=useState('');
  async function run(override?:any,synthetic=false){
    const payload=override??{...body,mode:synthetic?'synthetic':'real'};setMode(payload.mode);
    try{validateRequest(payload);}catch{setError('inputError');return;}
    controller.current?.abort();const abort=new AbortController();controller.current=abort;const rid=++requestId.current;setPending(true);setError('');
    try {const response=await fetch('/api/research/compare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:abort.signal});if(!response.ok)throw Error('request');const data=await response.json();if(rid===requestId.current){setResult(data);setCompletedSignature(JSON.stringify(payload));}}
    catch(e){if(!abort.signal.aborted&&rid===requestId.current)setError('requestError');}
    finally{if(rid===requestId.current)setPending(false);}
  }
  useEffect(()=>{if(!demoSignal)return;const demo={areas:INITIAL_AREAS,period:getDefaultPeriod(),separatePeriods:false,variables:['precipitation','ndvi','soil_moisture','lst'],mode:'real'};setSelection({areas:INITIAL_AREAS,editing:0});setPeriod(getDefaultPeriod());setSeparate(false);setVariables(demo.variables);setMode('real');run(demo);},[demoSignal]);
  useEffect(()=>()=>controller.current?.abort(),[]);
  async function loadArchive() {
    controller.current?.abort(); requestId.current++; setPending(true); setError('');
    try { const response=await fetch('/cases/piura-2023.json');if(!response.ok)throw Error('archive');const data=await response.json();
      if(data.schemaVersion!=='piura-watch.comparison.v1'||data.request.mode!=='real')throw Error('archive');
      const archiveAreas=data.request.areas.map(({lat,lon,radiusKm}:StudyArea)=>({lat,lon,radiusKm}));setSelection({areas:archiveAreas,editing:0});setPeriod(data.request.periods[0]);setSeparate(false);setVariables(data.request.variables);setMode('real');setResult(data);
      setCompletedSignature(JSON.stringify({areas:archiveAreas,period:data.request.periods[0],separatePeriods:false,variables:data.request.variables,mode:'real'}));
    } catch {setError('requestError');}finally{setPending(false);}
  }
  function updateArea(i:number,patch:Partial<StudyArea>) {setSelection(s=>({...s,areas:s.areas.map((a,j)=>j===i?{...(a??{lat:0,lon:0,radiusKm:10}),...patch}:a)}));}
  return <div className="research-content">
    <div className="section-heading"><div><h1>{t('compare')}</h1><p>{t('question')}</p></div></div>
    <div className="study-layout"><div className="area-controls paper"><div className="section-heading"><h2>{t('choose')}</h2><button onClick={()=>transition({type:'swap'})}>{t('swap')}</button></div>
      {selection.areas.map((a,i)=><fieldset key={i} className={'area-form area-'+(i===0?'A':'B')}><legend><span className="area-letter">{i===0?'A':'B'}</span> {t('area')} {i===0?'A':'B'} {selection.editing===i&&<span className="status-badge">{t('editing')}</span>}</legend>
        <div className="button-row"><button aria-pressed={selection.editing===i} onClick={()=>transition({type:'edit',index:i})}>{t('edit')}</button><button onClick={()=>transition({type:'clear',index:i})}>{t('clear')}</button></div>
        {!a&&<p>{t('emptyArea')}</p>}
        <div className="two-columns"><label>{t('latitude')}<input type="number" min="-90" max="90" step="0.001" value={a&&Number.isFinite(a.lat)?a.lat:''} onChange={e=>updateArea(i,{lat:e.target.value===''?NaN:Number(e.target.value)})}/></label><label>{t('longitude')}<input type="number" min="-180" max="180" step="0.001" value={a&&Number.isFinite(a.lon)?a.lon:''} onChange={e=>updateArea(i,{lon:e.target.value===''?NaN:Number(e.target.value)})}/></label></div>
        <label>{t('radius')}<input type="number" min="1" max="100" value={a&&Number.isFinite(a.radiusKm)?a.radiusKm:''} onChange={e=>updateArea(i,{radiusKm:Number(e.target.value)})}/></label>
      </fieldset>)}</div>
      <div><StudyGlobe areas={selection.areas} editing={selection.editing} onPick={area=>transition({type:'select',area})}/></div>
    </div>
    <section className="paper filters"><h2>{t('variablesStep')}</h2><div className="two-columns"><fieldset><legend>{t('period')} · A {separate?'':'/ B'}</legend><div className="two-columns"><label>{t('startDate')}<input type="date" value={period.start} onChange={e=>setPeriod(p=>({...p,start:e.target.value}))}/></label><label>{t('endDate')}<input type="date" value={period.end} onChange={e=>setPeriod(p=>({...p,end:e.target.value}))}/></label></div><label className="checkbox"><input type="checkbox" checked={separate} onChange={e=>setSeparate(e.target.checked)}/>{t('separate')}</label>{separate&&<><div className="two-columns"><label>B · {t('startDate')}<input type="date" value={periodB.start} onChange={e=>setPeriodB(p=>({...p,start:e.target.value}))}/></label><label>B · {t('endDate')}<input type="date" value={periodB.end} onChange={e=>setPeriodB(p=>({...p,end:e.target.value}))}/></label></div><p className="notice">{t('separateWarning')}</p></>}</fieldset>
      <fieldset><legend>{t('variablesStep')}</legend>{VARIABLES.map(id=><label className="checkbox" key={id}><input type="checkbox" checked={variables.includes(id)} onChange={e=>setVariables(v=>e.target.checked?[...v,id]:v.filter(x=>x!==id))}/>{t(id)} {id!=='precipitation'&&id!=='air_temperature'&&<small>{t('unavailable')}</small>}</label>)}</fieldset></div>
      <div className="button-row"><button className="primary" disabled={pending} onClick={()=>run()}>{pending?t('running'):t('run')}</button><button disabled={pending} onClick={()=>run(undefined,true)}>{t('synthetic')}</button></div>
      {error&&<p role="alert" className="notice">{t(error as Key)}</p>}{pending&&<p role="status">{t('running')}</p>}
      <button disabled={pending} onClick={loadArchive}>{t('archived')}</button>
    </section>
    <Results result={result} stale={!!result&&signature!==completedSignature} active={active}/>
  </div>;
}
function Events(){const {t,date,number}=useLanguage();const [data,setData]=useState<any>(null),[pending,setPending]=useState(false);async function load(){setPending(true);try{const r=await fetch('/api/nasa/eonet?days=180&limit=150');setData(r.ok?await r.json():{isLive:false});}catch{setData({isLive:false});}finally{setPending(false);}}useEffect(()=>{load();},[]);const regional=data?.events?.filter((e:any)=>e.lat>=-18&&e.lat<=0&&e.lon>=-84&&e.lon<=-68)??[];return <div className="research-content narrow"><h1>{t('events')}</h1><p>{t('eventIntro')}</p><p className="paper">{t('eventMethod')}</p><button disabled={pending} onClick={load}>{pending?t('running'):t('eventRefresh')}</button>{data?.isLive===false&&<p role="status" className="notice">{t('eventUnavailable')}</p>}{data?.isLive&&!regional.length&&<p>{t('eventEmpty')}</p>}{regional.map((e:any)=><article className="paper" key={e.id}><h2>{e.title}</h2><p>{date(e.date)} · {number(e.lat,3)}°, {number(e.lon,3)}°</p><p>{t('eventVerification')}</p><a href={e.sourceUrl} rel="noreferrer" target="_blank">{t('source')} ↗</a></article>)}</div>;}
function Methods(){const {t}=useLanguage();return <div className="research-content narrow"><h1>{t('methodTitle')}</h1><p>{t('methodIntro')}</p><section className="paper"><h2>{t('processing')}</h2><p>{t('center_cell_daily_v1')}</p><p>{t('geometry')}</p><p>{t('coarse_grid')}</p><a href="https://power.larc.nasa.gov/docs/services/" target="_blank" rel="noreferrer">NASA POWER · {t('source')} ↗</a></section><section className="paper"><h2>{t('limitations')}</h2><p>{t('seasonalNote')}</p><p>{t('airVsSurface')}</p></section><section className="paper"><h2>{t('audit')}</h2><p>{t('auditText')}</p></section><section className="paper"><h2>{t('demo')}</h2><p>{t('demoQuestion')}</p></section></div>;}
function Lab(){return <Intelligence/>;}
function Shell(){const {t,language}=useLanguage();const [page,setPage]=useState('home'),[visitedCompare,setVisitedCompare]=useState(false),[demoSignal,setDemoSignal]=useState(0),[intro,setIntro]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches),[homeEvents,setHomeEvents]=useState<any[]>([]),[location,setLocation]=useState({lat:-5.1945,lon:-80.6328,label:'Piura'});useEffect(()=>{let cancelled=false;fetch('/api/nasa/eonet?days=45&limit=75').then(r=>r.json()).then(data=>{if(!cancelled&&data.isLive)setHomeEvents(data.events);}).catch(()=>{});return()=>{cancelled=true;};},[]);useEffect(()=>{const timer=setTimeout(()=>setIntro(false),2400);return()=>clearTimeout(timer);},[]);
  function navigate(next:string){if(next==='compare')setVisitedCompare(true);setPage(next);setIntro(false);}
  function demo(){navigate('compare');setDemoSignal(v=>v+1);}
  useEffect(()=>{document.title=(page==='lab'?'EarthShift Intelligence':'EarthShift · '+t(page as Key));},[page,language]);
  return <div className="research-app"><a className="skip-link" href="#research-main">{t('skip')}</a><header className="research-header"><button className="brand-wordmark" onClick={()=>navigate('home')}><img className="earthshift-logo" src="/earthshift-logo.svg" alt="" /><span className="earthshift-wordmark">EarthShift<span>{language==='en'?'Peru · Earth & evidence':'Perú · Tierra y evidencia'}</span></span></button><nav aria-label={t('home')}>{(['home','compare','methods','events','lab'] as const).map(key=><button aria-current={page===key?'page':undefined} key={key} onClick={()=>navigate(key)}>{t(key)}</button>)}</nav><LanguageSwitch/></header>
    <main id="research-main" tabIndex={-1}>
      <div hidden={page!=='home'}><section className="home-hero"><div className="hero-copy"><h1>{t('headline')}</h1><p>{t('intro')}</p><div className="button-row"><button className="primary" onClick={()=>navigate('compare')}>{t('start')} →</button><button onClick={demo}>{t('demo')}</button></div></div><div className="home-earth"><EarthGlobe3D stations={[]} eonetEvents={homeEvents} selectedLocation={location} selectedEventId={null} gibsDate="2023-03-15" onSelectLocation={coords=>setLocation({...coords,label:t('newSelection')})} onSelectStation={noOp} onSelectEvent={noOp} onOpenInMap={()=>navigate('compare')}/></div></section><div className="research-content home-explain"><section><h2>{t('why')}</h2><p>{t('whyText')}</p></section><section><h2>{t('supports')}</h2><p>{t('supportsText')}</p></section></div></div>
      {visitedCompare&&<div hidden={page!=='compare'}><Comparison demoSignal={demoSignal} active={page==='compare'}/></div>}
      {page==='methods'&&<Methods/>}{page==='events'&&<Events/>}{page==='lab'&&<Lab/>}
    </main><footer className="research-footer">EarthShift · NASA Space Apps Challenge </footer>
    {intro&&<div className="project-intro" role="dialog" aria-modal="false" aria-label="EarthShift"><h2>{t('introTitle')}</h2><p>{t('introNote')}</p><button autoFocus onClick={()=>setIntro(false)}>{t('skip')} →</button></div>}
  </div>;
}
export default function ResearchApp(){return <LanguageProvider><Shell/></LanguageProvider>;}