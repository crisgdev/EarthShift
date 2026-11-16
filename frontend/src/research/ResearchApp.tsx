import React, { useEffect, useRef, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EarthGlobe3D } from '../components/EarthGlobe3D';
import { LanguageProvider, useLanguage, type Key } from './i18n';
import { StudyGlobe, type StudyArea } from './StudyGlobe';
import Intelligence from './Intelligence';
import Events from './EnvironmentalEvents';
import {ContextSummary, CoverageMeter, Journey, SourcePill, StatePanel} from './ResearchUI';
import {buildAnnualChart, SERIES_FIELDS, validateAnnualSeries} from './annualSeries.mjs';
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
  const {t,number,language}=useLanguage();
  const es=language==='es';
  const [regions,setRegions]=useState<string[]>([]),[region,setRegion]=useState(''),[second,setSecond]=useState('');
  const [catalog,setCatalog]=useState<any[]>([]),[variables,setVariables]=useState<string[]>([]);
  const [data,setData]=useState<any[]>([]),[pending,setPending]=useState(true),[error,setError]=useState('');
  const [refresh,setRefresh]=useState(0);
  const [areas,setAreas]=useState<(StudyArea|null)[]>([INITIAL_AREAS[0],null]);
  useEffect(()=>{const abort=new AbortController();Promise.all([earthshift('/regions',{signal:abort.signal}),earthshift('/cells',{signal:abort.signal}),earthshift('/variables',{signal:abort.signal})]).then(([r,c,v])=>{
    if(abort.signal.aborted)return;
    const available=r.regions.filter((id:string)=>c.cells.some((cell:any)=>cell.region===id && cell.source==='processed_real_data'));
    setRegions(available);setRegion(available[0]||'');setSecond(available[1]||'');setCatalog(v.variables);setVariables(v.variables.map((item:any)=>item.id));
    if(!available.length){setError('Datos no disponibles temporalmente.');setPending(false);}
  }).catch(()=>{if(!abort.signal.aborted){setError('Datos no disponibles temporalmente.');setPending(false);}});return()=>abort.abort();},[refresh]);
  useEffect(()=>{if(!region)return;const abort=new AbortController();setPending(true);setError('');setData([]);
    const selected=[region,...(second && second!==region?[second]:[])];
    Promise.all(selected.map(id=>earthshift('/series?region='+encodeURIComponent(id),{signal:abort.signal}).then(result=>validateAnnualSeries(result,id)))).then(result=>{if(!abort.signal.aborted)setData(result);}).catch(()=>{if(!abort.signal.aborted)setError('Datos no disponibles temporalmente.');}).finally(()=>{if(!abort.signal.aborted)setPending(false);});return()=>abort.abort();
  },[region,second,refresh]);
  const keys:Record<string,string>=SERIES_FIELDS;
  const chart:Array<Record<string,any> & {year:number}>=buildAnnualChart(data);
  return <div className="research-content">
    <div className="section-heading"><div><p className="section-kicker">EarthShift · {es?'Explorar datos':'Explore data'}</p><h1>{t('compare')}</h1><p className="page-intro">{es?'Vegetación, agua y temperatura. Explora las regiones estudiadas y observa sus series lado a lado.':'Vegetation, water and temperature. Explore studied regions and view their series side by side.'}</p></div><div className="button-row"><ProcessedDownload data={data}/><ProcessedDownload data={data} csv/></div></div>
    {!!data.length && <ContextSummary region={data.map(item=>item.region).join(' / ')} period={[...new Set(data.map(item=>item.period))].join(' / ')} count={catalog.length}/>}
    <div className="study-layout"><div className="area-controls paper"><h2>{t('choose')}</h2>
      <fieldset className="area-form area-A"><legend><span className="area-letter">A</span> {es?'Región':'Region'}</legend><select aria-label={es?'Región A':'Region A'} value={region} disabled={!regions.length} onChange={e=>{if(e.target.value===region)return;setData([]);setPending(true);setRegion(e.target.value);if(second===e.target.value)setSecond(regions.find(id=>id!==e.target.value)||'');}}>{regions.map(id=><option key={id}>{id}</option>)}</select></fieldset>
      <fieldset className="area-form area-B" disabled={regions.length<2}><legend><span className="area-letter">B</span> {es?'Región':'Region'}</legend><select aria-label={es?'Región B':'Region B'} value={second} onChange={e=>{if(e.target.value===second)return;setData([]);setPending(true);setSecond(e.target.value);}}><option value="">{es?'Sin comparación':'No comparison'}</option>{regions.filter(id=>id!==region).map(id=><option key={id}>{id}</option>)}</select></fieldset>
      {regions.length<2 && <p className="fine-print">Se requieren al menos dos regiones con datos procesados para realizar una comparación regional.</p>}
    </div><div><StudyGlobe areas={areas} editing={0} onPick={area=>setAreas([area,null])}/><p className="fine-print">{es?'Mapa global = contexto visual. Los análisis se limitan a las regiones procesadas; seleccionar el globo no cambia la región estudiada.':'Global map = visual context. Analyses are limited to processed regions; picking the globe does not change the study region.'}</p></div></div>
    <section className="paper filters"><h2>{t('variablesStep')}</h2><div className="button-row variable-chips">{catalog.map(v=><label className="checkbox" key={v.id}><input type="checkbox" checked={variables.includes(v.id)} onChange={e=>setVariables(current=>e.target.checked?[...current,v.id]:current.filter(id=>id!==v.id))}/>{v.name} <small>{v.unit}</small></label>)}</div><p className="fine-print">{data.map(item=>item.region+' · '+item.period+' · '+item.source).join(' / ')}</p>{pending && <StatePanel busy title={es?'Consultando series procesadas…':'Loading processed series…'}/ >}{error && <StatePanel title="Datos no disponibles temporalmente." description={es?'Comprueba que el backend esté activo. No se muestran valores de sustitución.':'Check that the backend is running. No substitute values are displayed.'}/>}</section>
    {error && <button onClick={()=>setRefresh(value=>value+1)}>{es?'Reintentar conexión':'Retry connection'}</button>}
    {!pending && !error && !variables.length && <StatePanel title={es?'Elige una variable para explorar':'Choose a variable to explore'} description={es?'Activa una o varias opciones para ver sus gráficas y cobertura.':'Select one or more options to view charts and coverage.'}/>}
    <section className="results results-grid">{!pending && !error && !data.length && <StatePanel title={es?'Datos no disponibles temporalmente.':'Data temporarily unavailable.'}/ >}{!!data.length && catalog.filter(v=>variables.includes(v.id)).map(v=><article className="result-card" key={v.id}><div className="section-heading"><h3>{v.name}</h3><SourcePill>{v.source}</SourcePill></div>
      <div className="coverage-grid">{data.map((item,i)=>{const last=[...item.series].reverse().find((row:any)=>typeof row[keys[v.id]]==='number' && Number.isFinite(row[keys[v.id]]));return <div className={'coverage-panel area-'+(i?'B':'A')} key={item.region}><h4><span className="area-letter">{i?'B':'A'}</span> {item.region}</h4><div className="engine-metric"><span>{es?'Última observación anual':'Latest annual observation'}{last?' · '+last.year:''}</span><strong>{last?number(last[keys[v.id]]):'—'} <small>{v.unit}</small></strong></div><CoverageMeter label={es?'Cobertura de datos':'Data coverage'} value={item.quality?.variables?.[v.id]?.valid_fraction}/></div>;})}</div>
      {data.length>1 && ['precipitation','soil_moisture'].includes(v.id) && <p className="fine-print">{es?'Serie regional compartida: las líneas A/B pueden coincidir.':'Shared regional series: A/B lines may overlap.'}</p>}
      <div className="comparison-legend">{data.map((item,i)=><span key={item.region}><i style={{background:COLORS[i]}}/>{item.region}</span>)}</div>
      {data.length>0 && active && chart.some(row=>typeof row[keys[v.id]]==='number'||typeof row[v.id+'_B']==='number') ? <div className="comparison-chart" role="img" aria-label={v.name}><ResponsiveContainer width="100%" height="100%"><LineChart data={chart} margin={{top:20,right:18,bottom:12,left:4}}><CartesianGrid stroke="#203649" strokeDasharray="3 5"/><XAxis dataKey="year" type="number" domain={['dataMin','dataMax']} allowDecimals={false} minTickGap={24} stroke="#a8bac7"/><YAxis stroke="#a8bac7"/><Tooltip contentStyle={{background:'#102434',border:'1px solid #345264',borderRadius:10}} formatter={(value:any,name:any)=>[number(value)+' '+v.unit,name]}/><Line dataKey={keys[v.id]} name={data[0].region} isAnimationActive={false} stroke={COLORS[0]} dot={false} connectNulls={false}/>{data.length>1 && <Line dataKey={v.id+'_B'} name={data[1].region} isAnimationActive={false} strokeDasharray="5 4" stroke={COLORS[1]} dot={false} connectNulls={false}/>}</LineChart></ResponsiveContainer></div> : <p className="fine-print">{es?'No hay observaciones disponibles para esta variable.':'No observations are available for this variable.'}</p>}
      {data.length>1 && <details><summary>{es?'Comparación A / B por año':'A / B comparison by year'} · {v.unit}</summary><div className="table-scroll"><table><caption>{v.name} · {es?'Valores reportados, sin interpolación':'Reported values, without interpolation'}</caption><thead><tr><th>{es?'Año':'Year'}</th><th>A · {data[0].region}</th><th>B · {data[1].region}</th></tr></thead><tbody>{chart.map(row=><tr key={row.year}><td>{row.year}</td><td>{number(row[keys[v.id]])}</td><td>{number(row[v.id+'_B'])}</td></tr>)}</tbody></table></div></details>}
      <p className="fine-print">{v.source} · {v.aggregation}</p><details><summary>Cobertura de datos y observaciones</summary>{data.map(item=><div key={item.region}><p>{item.region} · valid_fraction: {typeof item.quality?.variables?.[v.id]?.valid_fraction==='number'?number(item.quality.variables[v.id].valid_fraction*100)+'%':'—'}</p><div className="table-scroll"><table><thead><tr><th>Año</th><th>{v.name} ({v.unit})</th></tr></thead><tbody>{item.series.map((point:any)=><tr key={point.year}><td>{point.year}</td><td>{number(point[keys[v.id]])}</td></tr>)}</tbody></table></div></div>)}</details>
    </article>)}</section>
    {!!data.length && <aside className="paper"><h3>{es?'Qué puedes comparar':'What you can compare'}</h3><div className="parallel-grid"><section><h3>MODIS · {es?'Zona seleccionada':'Selected zone'}</h3><ul><li>NDVI</li><li>{es?'Temperatura superficial':'Surface temperature'}</li></ul></section><section><h3>GPM / GLDAS · {es?'Piura regional':'Regional Piura'}</h3><ul><li>{es?'Precipitación':'Precipitation'}</li><li>{es?'Humedad del suelo':'Soil moisture'}</li></ul></section></div><p className="fine-print">{es?'Las coberturas espaciales son distintas. Precipitación y humedad del suelo comparten la serie regional; no son mediciones independientes para cada zona MODIS.':'Spatial coverage differs. Precipitation and soil moisture share the regional series; they are not independent measurements for each MODIS zone.'}</p><SourcePill>processed_real_data · spatial_match: mixed</SourcePill></aside>}
  </div>;
}
function Methods(){const {t,language}=useLanguage(),es=language==='es';return <div className="research-content narrow"><p className="section-kicker">EarthShift · {es?'Datos con contexto':'Data with context'}</p><h1>{t('methodTitle')}</h1><p className="page-intro">{es?'Cada hallazgo tiene una fuente, un periodo y límites que puedes revisar.':'Every finding has a source, a period and limits you can inspect.'}</p>
  <div className="summary-grid">{[[es?'01 · Datos':'01 · Data','MODIS / GPM / GLDAS'],[es?'02 · Evidencia':'02 · Evidence','EarthShift'],[es?'03 · Interpretación':'03 · Interpretation','Groq']].map(([label,value])=><div className="summary-card" key={label}><div><span className="summary-label">{label}</span><strong>{value}</strong></div></div>)}</div>
  <section className="paper"><h2>{es?'De dónde vienen las observaciones':'Where observations come from'}</h2><div className="table-scroll"><table><thead><tr><th>{es?'Fuente':'Source'}</th><th>{es?'Variable':'Variable'}</th><th>{es?'Cobertura espacial':'Spatial coverage'}</th></tr></thead><tbody><tr><td>MODIS</td><td>NDVI · {es?'temperatura superficial':'surface temperature'}</td><td>{es?'Zona seleccionada':'Selected zone'}</td></tr><tr><td>GPM</td><td>{es?'Precipitación':'Precipitation'}</td><td>{es?'Serie regional de Piura':'Regional Piura series'}</td></tr><tr><td>GLDAS</td><td>{es?'Humedad del suelo':'Soil moisture'}</td><td>{es?'Serie regional de Piura':'Regional Piura series'}</td></tr><tr><td>NOAA CPC / RONI</td><td>{es?'Episodios ENSO':'ENSO episodes'}</td><td>{es?'Pacífico tropical':'Tropical Pacific'}</td></tr></tbody></table></div><p className="fine-print">{es?'Las series procesadas se muestran por año. El mapa es contexto visual; los cálculos permanecen en el backend.':'Processed series are displayed by year. The map is visual context; calculations remain in the backend.'}</p></section>
  <section className="paper"><h2>{es?'Qué significa un resultado':'What a result means'}</h2><div className="parallel-grid"><section><h3>{es?'Puedes observar':'You can observe'}</h3><ul><li>{es?'Valores y cobertura reportados.':'Reported values and coverage.'}</li><li>{es?'Tendencias y niveles de los motores.':'Engine trends and levels.'}</li><li>{es?'Coincidencias en el tiempo.':'Temporal coincidences.'}</li></ul></section><section><h3>{es?'Necesita más evidencia':'Needs more evidence'}</h3><ul><li>{es?'Causalidad entre fenómenos y cambios locales.':'Causality between phenomena and local changes.'}</li><li>{es?'Deterioro ambiental o riesgos operativos.':'Environmental deterioration or operational risks.'}</li><li>{es?'Comparaciones entre coberturas espaciales distintas.':'Comparisons across different spatial coverage.'}</li></ul></section></div><details className="compact-details"><summary>{t('limitations')}</summary><p>{t('seasonalNote')}</p><p>{t('airVsSurface')}</p><p>{t('auditText')}</p></details></section>
</div>;}
function Lab(){return <Intelligence/>;}
function Shell(){const {t,language}=useLanguage();const [page,setPage]=useState('home'),[visitedCompare,setVisitedCompare]=useState(false),[demoSignal,setDemoSignal]=useState(0),[intro,setIntro]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches),[homeEvents,setHomeEvents]=useState<any[]>([]),[location,setLocation]=useState({lat:-5.1945,lon:-80.6328,label:'Piura'});useEffect(()=>{let cancelled=false;fetch('/api/nasa/eonet?days=45&limit=75').then(r=>r.json()).then(data=>{if(!cancelled&&data.isLive)setHomeEvents(data.events);}).catch(()=>{});return()=>{cancelled=true;};},[]);useEffect(()=>{const timer=setTimeout(()=>setIntro(false),2400);return()=>clearTimeout(timer);},[]);
  function navigate(next:string){if(next==='compare')setVisitedCompare(true);setPage(next);setIntro(false);}
  function demo(){navigate('compare');setDemoSignal(v=>v+1);}
  useEffect(()=>{document.title=(page==='lab'?'EarthShift Intelligence':'EarthShift · '+t(page as Key));},[page,language]);
  return <div className="research-app"><a className="skip-link" href="#research-main">{language==='es'?'Ir al contenido':'Skip to content'}</a><header className="research-header"><button className="brand-wordmark" onClick={()=>navigate('home')}><img className="earthshift-logo" src="/earthshift-logo.svg" alt="" /><span className="earthshift-wordmark">EarthShift<span>{language==='en'?'Peru · Earth & evidence':'Perú · Tierra y evidencia'}</span></span></button><nav aria-label={t('home')}>{(['home','compare','methods','events','lab'] as const).map(key=><button aria-current={page===key?'page':undefined} key={key} onClick={()=>navigate(key)}>{t(key)}</button>)}</nav><LanguageSwitch/></header>
    <main id="research-main" tabIndex={-1}>
      <div hidden={page!=='home'}><section className="home-hero"><div className="hero-copy"><h1>{t('headline')}</h1><p>{t('intro')}</p><div className="button-row"><button className="primary" onClick={()=>navigate('compare')}>{t('start')} →</button></div></div><div className="home-earth"><EarthGlobe3D stations={[]} eonetEvents={homeEvents} selectedLocation={location} selectedEventId={null} gibsDate="2023-03-15" onSelectLocation={coords=>setLocation({...coords,label:t('newSelection')})} onSelectStation={noOp} onSelectEvent={noOp} onOpenInMap={()=>navigate('compare')}/></div></section><div className="research-content home-explain"><section><h2>{t('why')}</h2><p>{t('whyText')}</p></section><section><h2>{t('supports')}</h2><p>{t('supportsText')}</p></section></div></div>
      {page==='home' && <Journey onCompare={()=>navigate('compare')} onEvidence={()=>navigate('events')} onIntelligence={()=>navigate('lab')}/>}
      {visitedCompare&&<div hidden={page!=='compare'}><Comparison demoSignal={demoSignal} active={page==='compare'}/></div>}
      {page==='methods'&&<Methods/>}{page==='events'&&<Events/>}{page==='lab'&&<Lab/>}
    </main><footer className="research-footer">EarthShift · NASA Space Apps Challenge </footer>
    {intro&&<div className="project-intro" role="dialog" aria-modal="false" aria-label="EarthShift"><h2>{t('introTitle')}</h2><p>{t('introNote')}</p><button autoFocus onClick={()=>setIntro(false)}>{t('skip')} →</button></div>}
  </div>;
}
export default function ResearchApp(){return <LanguageProvider><Shell/></LanguageProvider>;}
