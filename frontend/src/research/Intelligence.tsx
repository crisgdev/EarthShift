import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from './i18n';
import { earthshift, requireReal } from '../services/earthshiftClient';
import {ContextSummary, CoverageMeter, SourcePill, StatePanel, SummaryCard} from './ResearchUI';


type EngineFinding = { engine: string; level?: string; explanation?: string; evidence?: Record<string, any>; reversal_detected?: boolean; univariable_level?: string; multivariable_level?: string; quality?: { valid?: boolean; explanation?: string; missing?: string[] } };
type ContextResponse = { region: string; period: string; source: string; demo: boolean; engines: Record<string, EngineFinding | null>; anomalies: Array<Record<string, unknown>>; limitations: string[]; quality?: {variables?: Record<string, {valid_fraction?: number}>}; metadata?: Record<string, any>; analysis_readiness?: {minimum_valid_fraction:number; evaluated_engines:number; total_engines:number} };
const ENGINE_LABELS: Record<string, string> = { earth_paradox: 'Earth Paradox', silent_collapse: 'Silent Collapse', decision_reversal: 'Decision Reversal' };

export default function Intelligence() {
  const { language, number } = useLanguage();
  const es = language === 'es';
  const [tab, setTab] = useState<'advisor' | 'phenomena'>('advisor');
  const [regions, setRegions] = useState<string[]>([]);
  const [region, setRegion] = useState('');
  const [context, setContext] = useState<ContextResponse | null>(null);
  const [result, setResult] = useState<any>(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    earthshift('/regions').then(data => {
      if (!cancelled) { const available = Array.isArray(data.regions) ? data.regions : []; setRegions(available); setRegion(available[0] || ''); if (!available.length) setError('Datos no disponibles temporalmente.'); }
    }).catch(() => { if (!cancelled) setError('Datos no disponibles temporalmente.'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setResult(null); setContext(null);
    if (!region) return;
    const abort = new AbortController(); setError('');
    earthshift('/intelligence/context?region=' + encodeURIComponent(region), {signal: abort.signal})
      .then(requireReal).then(data => {if (!abort.signal.aborted) setContext(data);})
      .catch(() => {if (!abort.signal.aborted) setError('Datos no disponibles temporalmente.');});
    return () => abort.abort();
  }, [region]);

  const engineEntries = useMemo(() => Object.entries(context?.engines ?? {}), [context]);

  async function run() {
    setLoading(true); setError(''); setResult(null);
    try {
      const endpoint = tab === 'advisor' ? (question.trim() ? 'chat' : 'advisor') : 'phenomena';
      const data = await earthshift(`/intelligence/${endpoint}`,  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ region, question }) });
      if (tab === 'advisor') requireReal(data);
      setResult(data);
    } catch (e) {
      setError('El servicio de inteligencia no está disponible temporalmente.');
    } finally { setLoading(false); }
  }

  return <div className="research-content narrow">
    <p className="section-kicker">EARTHSHIFT INTELLIGENCE</p>
    <h1>EarthShift Intelligence</h1>
    <p className="page-intro">{es ? 'Primero la evidencia. Después, una interpretación que te ayude a explorarla.' : 'Evidence first. Then, interpretation to help you explore it.'}</p>
    {context && <ContextSummary region={context.region} period={context.period} count={Object.keys(context.quality?.variables || {}).length}/>}

    <section className="paper">
      <div className="section-heading"><div><h2>{es ? 'Contexto científico' : 'Scientific context'}</h2><p className="fine-print">{context ? `${context.region} · ${context.period} · ${context.source}` : (error || (es ? 'Cargando contexto…' : 'Loading context…'))}</p></div>
        <label>{es ? 'Región' : 'Region'}<select disabled={!regions.length || loading} value={region} onChange={e => setRegion(e.target.value)}>{regions.map(item => <option key={item}>{item}</option>)}</select></label></div>
      {!context && <StatePanel busy={!error} title={error || (es?'Cargando evidencia…':'Loading evidence…')} description={es?'Los hallazgos aparecerán cuando el backend entregue el contexto científico.':'Findings appear when the backend returns the scientific context.'}/>}
      {context && engineEntries.length>0 && engineEntries.every(([,finding])=>finding?.level==='sin datos') && <StatePanel title={es?'Series disponibles · motores sin evaluar':'Series available · engines not evaluated'} description={es?'La cobertura de las variables requeridas no alcanza el mínimo del motor. Puedes consultar las series en Comparar áreas.':'Coverage of required variables falls below the engine minimum. You can still explore the series in Compare areas.'}/>}
      <div className="engine-grid">{engineEntries.map(([id, finding]) => <article className="result-card" key={id}><div className="section-heading"><h3>{ENGINE_LABELS[id] || id}</h3><span className="status-badge" data-level={finding?.level}>{finding?.level || '—'}</span></div><p className="fine-print">{({earth_paradox:es?'Variables que divergen':'Diverging variables',silent_collapse:es?'Persistencia de señales':'Persistent signals',decision_reversal:es?'Una variable vs. varias':'One variable vs. multiple'} as Record<string,string>)[id]}</p><p className="engine-description">{finding?.explanation || (es ? 'Sin hallazgo.' : 'No finding.')}</p><EngineSnapshot finding={finding}/>{finding?.level==='sin datos' && <CoverageRequirement finding={finding} context={context}/>}<EngineEvidence finding={finding}/></article>)}</div>
      {context && <><p className="fine-print">{es?'«Normal» indica que las reglas actuales no activaron una señal; no garantiza salud ambiental.':'“Normal” means current rules did not trigger a signal; it does not guarantee environmental health.'}</p><details className="compact-details"><summary>{es?'Comparar los tres motores':'Compare the three engines'}</summary><div className="table-scroll"><table><thead><tr><th>{es?'Motor':'Engine'}</th><th>{es?'Nivel':'Level'}</th><th>{es?'Tendencia NDVI':'NDVI trend'}</th><th>{es?'Reversión':'Reversal'}</th></tr></thead><tbody>{engineEntries.map(([id,f])=>{const trend=f?.evidence?.ndvi_trend || f?.evidence?.trend_analysis;return <tr key={id}><td>{ENGINE_LABELS[id]}</td><td>{f?.level || '—'}</td><td>{typeof trend?.trend==='number'?number(trend.trend,6)+' NDVI/'+(es?'año':'year'):'—'}</td><td>{id==='decision_reversal' ? ((f?.reversal_detected ?? f?.evidence?.reversal_detected)===false?'false':(f?.reversal_detected ?? f?.evidence?.reversal_detected)===true?'true':'—'):'—'}</td></tr>;})}</tbody></table></div></details>
      <h3 style={{marginTop:'1.5rem',fontSize:'1.1rem'}}>{es?'Cobertura de datos':'Data coverage'}</h3><div className="coverage-grid">{Object.entries(context.quality?.variables || {}).map(([id,value])=><CoverageMeter key={id} label={({ndvi:'NDVI',precipitation:es?'Precipitación':'Precipitation',surface_temperature:es?'Temperatura superficial':'Surface temperature',soil_moisture:es?'Humedad del suelo':'Soil moisture'} as Record<string,string>)[id] || id} value={value.valid_fraction}/>)}</div><div className="source-row">{['MODIS','GPM','GLDAS'].map(source=><SourcePill key={source}>{source}</SourcePill>)}</div><details className="compact-details"><summary>{es?'Cobertura espacial y limitaciones':'Spatial coverage and limitations'}</summary>{context.limitations?.map(item=><p key={item}>{item}</p>)}<p className="fine-print">{context.source} · spatial_match: {context.metadata?.spatial_match || '—'}</p></details></>}
    </section>

    <div className="button-row" role="tablist" aria-label="EarthShift Intelligence">
      <button role="tab" disabled={loading} aria-selected={tab === 'advisor'} className={tab === 'advisor' ? 'primary' : undefined} onClick={() => { setTab('advisor'); setResult(null); }}>EarthShift Advisor</button>
      <button role="tab" disabled={loading} aria-selected={tab === 'phenomena'} className={tab === 'phenomena' ? 'primary' : undefined} onClick={() => { setTab('phenomena'); setResult(null); }}>EarthShift Phenomena</button>
    </div>

    <section className="paper"><h2>{tab === 'advisor' ? 'EarthShift Advisor' : 'EarthShift Phenomena'}</h2><p>{tab === 'advisor' ? (es ? 'Interpreta los resultados reales de Earth Paradox, Silent Collapse y Decision Reversal. Groq no modifica ni recalcula los motores.' : 'Interprets real engine results without changing calculations.') : (es ? 'Compara anomalías anuales ya calculadas por EarthShift con episodios NOAA RONI. Coincidencia temporal no significa causalidad.' : 'Compares annual EarthShift anomalies with NOAA RONI episodes. Temporal overlap does not imply causality.')}</p><>{tab === 'advisor' && <label>{es?'Pregunta opcional':'Optional question'}<input maxLength={1200} value={question} onChange={e=>setQuestion(e.target.value)} disabled={loading}/></label>}</><button className="primary" disabled={loading || !context} onClick={run}>{loading ? (es ? 'Analizando…' : 'Analyzing…') : (es ? 'Ejecutar análisis' : 'Run analysis')}</button>{error && <p role="alert" className="notice">{error}</p>}</section>

    {result && tab === 'advisor' && <AdvisorResult result={result}/>}

    {result && tab === 'phenomena' && <section className="results"><article className="paper"><div className="section-heading"><h2>NOAA RONI</h2><span className="status-badge">Groq: {result.ai_status}</span></div><div className="summary-grid"><SummaryCard label={es?'Episodios NOAA':'NOAA episodes'} value={result.phenomena?.length ?? 0}/><SummaryCard label={es?'Coincidencias temporales':'Temporal overlaps'} value={result.temporal_comparisons?.length ?? 0}/></div><p className="notice">{es ? 'Coincidencia temporal ≠ causalidad. RONI describe el Pacífico tropical y no prueba por sí solo un impacto local en Piura.' : 'Temporal overlap ≠ causality. RONI describes the tropical Pacific and does not by itself prove local impact in Piura.'}</p><div className="table-scroll"><table><thead><tr><th>{es ? 'Fenómeno' : 'Phenomenon'}</th><th>{es ? 'Inicio' : 'Start'}</th><th>{es ? 'Fin' : 'End'}</th><th>{es ? 'Pico RONI' : 'RONI peak'}</th></tr></thead><tbody>{(result.phenomena || []).map((event:any,index:number)=><tr key={`${event.phenomenon}-${event.start_date}-${index}`}><td>{event.phenomenon}</td><td>{event.start_date}</td><td>{event.end_date}</td><td>{event.peak_anomaly_c} °C</td></tr>)}</tbody></table></div>{result.ai_status === 'unavailable' && <p className="notice">El servicio de interpretación no está disponible temporalmente.</p>}
      {!!result.temporal_comparisons?.length && <details><summary>Coincidencias temporales · causality_established = false</summary>{result.temporal_comparisons.map((item:any,index:number)=><p key={index}>{item.variable}: {item.anomaly_value} {item.unit} · {item.anomaly_start} · {item.anomaly_end} · coincidió temporalmente con {item.phenomenon} ({item.event_start} · {item.event_end}).</p>)}</details>}
      {result.ai_interpretation && <><p>{result.ai_interpretation.summary}</p>{['findings','limitations','research_questions'].map(field=><details key={field}><summary>{({findings:'Hallazgos',limitations:'Limitaciones',research_questions:'Preguntas de investigación'} as Record<string,string>)[field]}</summary><ul>{result.ai_interpretation[field].map((text:string)=><li key={text}>{text}</li>)}</ul></details>)}<details><summary>Relaciones posibles · sin causalidad establecida</summary>{result.ai_interpretation.possible_relationships.map((item:any,index:number)=><p key={index}>{item.phenomenon}: {item.observation} · {item.interpretation}</p>)}</details></>}
      <details><summary>Fuentes y limitaciones</summary><p>NOAA CPC / RONI</p>{result.limitations?.map((item:string)=><p key={item}>{item}</p>)}</details></article></section>}
  </div>;
}

function AdvisorResult({result}:{result:any}) {
  const {language}=useLanguage(),es=language==='es';
  const advisor=result.ai_status==='completed' ? result.advisor : null;
  const groups=[['hallazgos',es?'Hallazgos':'Findings'],['puntos_atencion',es?'Puntos de atención':'Attention points'],['recomendaciones',es?'Recomendaciones':'Recommendations'],['siguientes_pasos',es?'Siguientes pasos':'Next steps'],['limitaciones',es?'Limitaciones':'Limitations']];
  function list(field:string) {return <ul>{Array.isArray(advisor?.[field]) && advisor[field].map((item:string,index:number)=><li key={index}>{item}</li>)}</ul>;}
  return <section className="results"><article className="paper"><div className="section-heading"><div><p className="section-kicker">{es?'Interpretación · IA':'Interpretation · AI'}</p><h2>EarthShift Advisor</h2></div><span className="status-badge">Groq: {result.ai_status}</span></div>
    {advisor ? <><p>{advisor.resumen}</p><div className="parallel-grid">{groups.slice(0,2).map(([field,title])=><section key={field}><h3>{title}</h3>{list(field)}</section>)}</div>{groups.slice(2).map(([field,title])=><details className="compact-details" key={field}><summary>{title}{Array.isArray(advisor[field])?' · '+advisor[field].length:''}</summary>{list(field)}</details>)}<p className="fine-print">{es?'Interpretación de resultados; la evidencia científica se conserva en los motores de arriba.':'Interpretation of results; scientific evidence remains in the engines above.'}</p></> : <StatePanel title={es?'El servicio de interpretación no está disponible temporalmente.':'The interpretation service is temporarily unavailable.'} description={es?'Los resultados científicos siguen disponibles arriba. Puedes volver a intentarlo.':'Scientific results remain available above. You can try again.'}/>}
  </article></section>;
}
function CoverageRequirement({finding,context}:{finding:EngineFinding;context:ContextResponse|null}) {
  const {language,number}=useLanguage(),es=language==='es';
  const minimum=context?.analysis_readiness?.minimum_valid_fraction;
  const variables=finding.quality?.missing || [];
  const labels:Record<string,string>={ndvi:'NDVI',precipitation:es?'Precipitación':'Precipitation'};
  return <div className="engine-metric">
    {variables.map(id=><CoverageMeter key={id} label={labels[id] || id} value={context?.quality?.variables?.[id]?.valid_fraction}/>)}
    <p className="fine-print">{typeof minimum==='number' ? (es?'Mínimo requerido: ':'Required minimum: ')+number(minimum*100,1)+'%' : (es?'El backend no reportó el umbral de cobertura.':'The backend did not report a coverage threshold.')}</p>
    <p className="fine-print">{es?'Clasificación no calculada. No indica ausencia de datos ni un estado ambiental normal.':'Classification not calculated. This does not mean no data exist or that environmental conditions are normal.'}</p>
  </div>;
}
function EngineSnapshot({finding}:{finding:EngineFinding|null}) {
  const {language,number}=useLanguage(),es=language==='es';
  const e=finding?.evidence;
  if (!e || !Object.keys(e).length || finding?.level==='sin datos') return null;
  if (finding?.engine==='decision_reversal') return <div className="parallel-grid"><section><h3>{es?'Una variable':'One variable'}</h3><span className="status-badge">{finding.univariable_level || e.univariable?.level || '—'}</span></section><section><h3>{es?'Varias variables':'Multiple variables'}</h3><span className="status-badge">{finding.multivariable_level || e.multivariable?.level || '—'}</span></section></div>;
  const trend=e.ndvi_trend || e.trend_analysis;
  return <>{typeof trend?.trend==='number' && Number.isFinite(trend.trend) && <div className="engine-metric"><span>{es?'Tendencia NDVI':'NDVI trend'}</span><strong>{number(trend.trend,6)}</strong><span>NDVI/{es?'año':'year'} · p-value: {typeof trend.p_value==='number'?number(trend.p_value,6):'—'}</span></div>}{typeof e.summary?.decreasing_windows==='number' && <div className="engine-metric"><span>{es?'Ventanas decrecientes':'Declining windows'}</span><strong>{e.summary.decreasing_windows} / {e.summary.total_windows ?? '—'}</strong></div>}</>;
}
function EngineEvidence({finding}:{finding:EngineFinding|null}) {
  const e = finding?.evidence;
  if (!e || !Object.keys(e).length || finding?.level==='sin datos') return null;
  const labels:Record<string,string> = {ndvi_trend:'Tendencia NDVI',precipitation_trend:'Tendencia precipitación',trend_analysis:'Tendencia NDVI',persistence_analysis:'Persistencia',cumulative_change:'Cambio relativo',temporal_windows:'Ventanas temporales',anomaly_accumulation:'Anomalías y déficit',summary:'Resumen',univariable:'Evaluación univariable',multivariable:'Evaluación multivariable',trend:'Pendiente',p_value:'p-value',r_squared:'R²',observations:'Observaciones',relative_change_percent:'Cambio relativo (%)',decreasing_windows:'Ventanas decrecientes',negative_anomaly_fraction:'Fracción de anomalías negativas',cumulative_negative_deficit:'Déficit acumulado'};
  function fields(value:Record<string,any>):React.ReactNode {return <dl>{Object.entries(value).filter(([key,v])=>v!==null && typeof v!=='object' && !['demo','reference_type'].includes(key)).map(([key,v])=><React.Fragment key={key}><dt>{labels[key] || key.replaceAll('_',' ')}</dt><dd>{typeof v==='boolean' ? (v?'Sí':'No') : String(v)}</dd></React.Fragment>)}</dl>;}
  return <>{finding?.engine==='decision_reversal' && <p className="fine-print">{(finding.reversal_detected ?? e.reversal_detected)===false ? 'No se detectó reversión de decisión.' : 'Consultar la evidencia de clasificación.'}</p>}<details className="compact-details"><summary>Evidencia del motor</summary><p>{finding?.explanation}</p>{fields(e)}{Object.entries(e).filter(([,v])=>v && typeof v==='object' && !Array.isArray(v)).map(([key,v])=><div key={key}><h4>{labels[key] || key}</h4>{fields(v)}</div>)}<p className="fine-print">Resultados descriptivos preliminares. No demuestran causalidad ni deterioro ambiental real.</p></details></>;
}
