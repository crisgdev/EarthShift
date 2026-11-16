import React, {useEffect, useState} from 'react';
import {earthshift, requireReal} from '../services/earthshiftClient';
import {buildEnvironmentalTimeline} from './environmentalTimeline.mjs';
import {useLanguage} from './i18n';
import {ContextSummary, SourcePill, StatePanel, SummaryCard} from './ResearchUI';

export default function Events() {
  const {language, number, date} = useLanguage();
  const es = language === 'es';
  const tr = (spanish:string, english:string) => es ? spanish : english;
  const [regions,setRegions] = useState<string[]>([]);
  const [region,setRegion] = useState('');
  const [context,setContext] = useState<any>(null);
  const [records,setRecords] = useState<any[]>([]);
  const [category,setCategory] = useState('all');
  const [pending,setPending] = useState(true);
  const [error,setError] = useState(false);
  const [noaaUnavailable,setNoaaUnavailable] = useState(false);
  const [revision,setRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    earthshift('/regions',{signal:abort.signal}).then(data => {
      if (abort.signal.aborted) return;
      const available = Array.isArray(data.regions) ? data.regions.filter((id:unknown)=>typeof id==='string' && id) : [];
      setRegions(available); setRegion(current=>available.includes(current)?current:available[0] || '');
      if (!available.length) {setPending(false);setError(true);}
    }).catch(()=>{if (!abort.signal.aborted) {setPending(false);setError(true);}});
    return ()=>abort.abort();
  },[revision]);
  useEffect(() => {
    setRecords([]);setContext(null);setNoaaUnavailable(false);
    if (!region) return;
    const abort = new AbortController();setPending(true);setError(false);
    // Context remains useful when the independent NOAA request is unavailable.
    const contextRequest = earthshift('/intelligence/context?region='+encodeURIComponent(region),{signal:abort.signal})
      .then(requireReal).then(data=>{
        if (data.region !== region) throw new Error('Region mismatch');
        const items = buildEnvironmentalTimeline(data);
        if (!abort.signal.aborted) {setContext(data);setRecords(items);}
        return data;
      });
    const phenomenaRequest = earthshift('/intelligence/phenomena',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({region}),signal:abort.signal});
    Promise.allSettled([contextRequest,phenomenaRequest]).then(([scientific,phenomena])=>{
      if (abort.signal.aborted) return;
      if (scientific.status !== 'fulfilled') {setRecords([]);setContext(null);setError(true);return;}
      const compatible = phenomena.status === 'fulfilled' && phenomena.value.demo !== true && Array.isArray(phenomena.value.phenomena) && phenomena.value.region === region && phenomena.value.period === scientific.value.period;
      setNoaaUnavailable(!compatible);
      setRecords(buildEnvironmentalTimeline(scientific.value,compatible ? phenomena.value : null));
    }).catch(()=>{if(!abort.signal.aborted)setError(true);})
      .finally(()=>{if(!abort.signal.aborted)setPending(false);});
    return ()=>abort.abort();
  },[region,revision]);
  const categories = [
    ['all',tr('Todos','All')],['phenomena',tr('Fenómenos','Phenomena')],
    ['anomalies',tr('Anomalías','Anomalies')],['findings',tr('Hallazgos','Findings')],
  ];
  const badges:Record<string,string> = {phenomena:tr('Fenómeno climático','Climate phenomenon'),anomalies:tr('Anomalía','Anomaly'),findings:tr('Hallazgo científico','Scientific finding')};
  const visible = records.filter(item=>category==='all' || item.category===category);
  function period(item:any) {
    if (item.start.endsWith('-01-01') && item.end.endsWith('-12-31')) {
      const start=item.start.slice(0,4),end=item.end.slice(0,4);
      return start===end ? start : start+'–'+end;
    }
    return date(item.start)+' – '+date(item.end);
  }
  function evidence(value:any, prefix=''):React.ReactNode {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const names:Record<string,string> = {trend:'Tendencia',p_value:'p-value',r_squared:'R²',observations:'Observaciones',relative_change_percent:'Cambio relativo (%)',decreasing_windows:'Ventanas decrecientes',total_windows:'Ventanas totales',negative_anomaly_fraction:'Fracción de anomalías negativas',cumulative_negative_deficit:'Déficit acumulado',persistent_decline:'Descenso persistente',level:'Nivel',reason:'Explicación',reversal_detected:'reversal_detected'};
    return Object.entries(value).filter(([key])=>!['demo','limitations','anomalies','windows','supporting_evidence','reference_type'].includes(key)).map(([key,v])=>{
      if (v && typeof v==='object' && !Array.isArray(v)) return <React.Fragment key={key}>{evidence(v,prefix+key.replaceAll('_',' ')+' · ')}</React.Fragment>;
      if (v==null || typeof v==='object' || (typeof v==='number' && !Number.isFinite(v))) return null;
      if (!['string','number','boolean'].includes(typeof v)) return null;
      return <p className="fine-print" key={key}>{prefix}{names[key] || key.replaceAll('_',' ')}: {typeof v==='number'?number(v,6):String(v)}</p>;
    });
  }
  return <div className="research-content narrow">
    <p className="section-kicker">EarthShift · {tr('Historia de la evidencia','Evidence history')}</p>
    <h1>{tr('Registro de eventos','Event records')}</h1>
    <h2>{tr('Cronología de evidencia ambiental','Environmental evidence timeline')}</h2>
    <p className="page-intro">{tr('Qué se observó, cuándo y con qué evidencia. Explora la historia ambiental de la región seleccionada.','What was observed, when, and with what evidence. Explore the environmental history of the selected region.')}</p>
    {context && <><ContextSummary region={context.region} period={context.period}/><div className="summary-grid">{categories.filter(([id])=>id!=='all').map(([id,label])=><SummaryCard key={id} label={label} value={id==='phenomena' && (pending || noaaUnavailable)?'—':records.filter(item=>item.category===id).length} detail={pending?tr('Consultando fuentes…','Checking sources…'):id==='phenomena' && noaaUnavailable?tr('Fuente no disponible','Source unavailable'):tr('Registros disponibles','Available records')}/>)}</div></>}
    <section className="paper">
      <div className="section-heading"><label>{tr('Región analizada','Analyzed region')}<select value={region} disabled={!regions.length} onChange={event=>{setRecords([]);setContext(null);setPending(true);setRegion(event.target.value);}}>{regions.map(id=><option key={id} value={id}>{id}</option>)}</select></label><button onClick={()=>setRevision(value=>value+1)} disabled={pending}>{tr('Actualizar registro','Refresh record')}</button></div>
      {context && <p className="fine-print">{tr('Periodo analizado','Analyzed period')}: {context.period} · {context.source} · {tr('Más reciente primero; los resúmenes abarcan todo el periodo.','Newest first; summaries cover the full period.')}</p>}
      <div className="button-row" role="group" aria-label={tr('Filtrar evidencia','Filter evidence')}>{categories.map(([id,label])=><button key={id} aria-pressed={category===id} className={category===id?'primary':undefined} onClick={()=>setCategory(id)}>{label}</button>)}</div>
      <details className="compact-details"><summary>{tr('Cómo leer esta cronología','How to read this timeline')}</summary><ul><li>{tr('RONI describe el Pacífico tropical; no establece impactos locales.','RONI describes the tropical Pacific; it does not establish local impacts.')}</li><li>{tr('Una anomalía no demuestra por sí sola deterioro ambiental.','An anomaly alone does not demonstrate environmental deterioration.')}</li><li>{tr('Los hallazgos de motores resumen todo el periodo, no un suceso en una fecha puntual.','Engine findings summarize the entire period, not an event on a specific date.')}</li></ul>{context?.limitations?.filter((item:unknown)=>typeof item==='string').map((item:string)=><p className="fine-print" key={item}>{item}</p>)}</details>
    </section>
    {pending && <StatePanel busy title={tr('Cargando evidencia científica…','Loading scientific evidence…')}/>}
    {error && <p className="notice" role="alert">{tr('El registro científico no está disponible temporalmente.','The scientific record is temporarily unavailable.')}</p>}
    {noaaUnavailable && <p className="notice" role="status">{tr('Los registros NOAA CPC / RONI no están disponibles temporalmente. Se conserva la evidencia disponible de EarthShift.','NOAA CPC / RONI records are temporarily unavailable. Available EarthShift evidence is preserved.')}</p>}
    {!pending && !error && !visible.length && <StatePanel title={tr('No se encontraron eventos con evidencia disponible para este periodo.','No events with available evidence were found for this period.')} description={tr('Prueba otro filtro o región. Solo se muestran registros respaldados por las fuentes disponibles.','Try another filter or region. Only records supported by available sources are shown.')}/>}
    <div className="evidence-timeline">{visible.map(item=><article className="paper" key={item.id}>
      <div className="section-heading"><p className="fine-print">{period(item)}</p><span className="status-badge">{badges[item.category]}</span></div>
      <h2>{item.category==='anomalies' ? item.title+' · '+tr('Referencia provisional','Provisional reference') : item.title}</h2>
      {typeof item.value==='number' && <p className="timeline-value">{number(item.value,6)} <small>{item.unit}</small></p>}
      {item.level && <p>{tr('Nivel','Level')}: <span className="status-badge" data-level={item.level}>{item.level}</span></p>}
      {item.category==='phenomena' && <><p>{tr('Evento identificado en el índice','Event identified in the index')} {item.index || '—'}. {tr('Coincidió temporalmente con el periodo analizado; no establece un impacto local.','It overlapped the analyzed period; it does not establish a local impact.')}</p><p className="fine-print">{tr('Anomalía máxima del índice','Peak index anomaly')} (°C) · causality_established = false</p></>}
      {item.category==='anomalies' && <><p>{item.negative && item.variable==='ndvi' ? tr('El NDVI se encontró por debajo de la referencia provisional utilizada por EarthShift durante este periodo.','NDVI was below the provisional reference used by EarthShift during this period.') : tr('Anomalía reportada por el motor respecto a su referencia provisional.','Anomaly reported by the engine relative to its provisional reference.')}</p><p className="fine-print">{tr('Variable','Variable')}: {item.variable} · {tr('No implica por sí sola deterioro ambiental.','It does not by itself imply environmental deterioration.')}</p></>}
      {item.category==='findings' && <><p>{item.description}</p>{item.reversal===false && <p>{tr('No se detectó reversión de decisión con las variables analizadas.','No decision reversal was detected with the analyzed variables.')}</p>}</>}
      <div className="source-row"><SourcePill>{item.source}{item.category==='phenomena'?' / '+(item.index || 'RONI'):''}</SourcePill></div>
      <details className="compact-details"><summary>{tr('Evidencia, metodología y limitaciones','Evidence, methodology and limitations')}</summary>
        {item.category==='findings' ? evidence(item.details) : item.category==='phenomena' ? <><p>{item.details.classification_rule}</p>{item.details.overlap_start_date && <p>{tr('Intervalo compartido','Shared interval')}: {item.details.overlap_start_date} – {item.details.overlap_end_date}</p>}</> : <p>{tr('Referencia provisional del motor; resolución temporal anual. Fuente de vegetación: MODIS.','Provisional engine reference; annual temporal resolution. Vegetation source: MODIS.')}</p>}
        {item.limitations?.map((limitation:string)=><p className="fine-print" key={limitation}>{limitation}</p>)}
        <p className="fine-print">{tr('Evidencia de datos y motores. No es una interpretación de IA ni una demostración de causalidad.','Evidence from data and engines. This is not an AI interpretation or proof of causality.')}</p>
      </details>
    </article>)}</div>
  </div>;
}
