import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from './i18n';
import { earthshift, requireReal } from '../services/earthshiftClient';


type EngineFinding = { engine: string; level?: string; explanation?: string; evidence?: Record<string, any>; reversal_detected?: boolean; univariable_level?: string; multivariable_level?: string; quality?: { valid?: boolean; explanation?: string } };
type ContextResponse = { region: string; period: string; source: string; demo: boolean; engines: Record<string, EngineFinding | null>; anomalies: Array<Record<string, unknown>>; limitations: string[]; quality?: {variables?: Record<string, {valid_fraction?: number}>}; metadata?: Record<string, any> };
const ENGINE_LABELS: Record<string, string> = { earth_paradox: 'Earth Paradox', silent_collapse: 'Silent Collapse', decision_reversal: 'Decision Reversal' };

export default function Intelligence() {
  const { language } = useLanguage();
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
    <p className="fine-print">EARTHSHIFT INTELLIGENCE</p>
    <h1>EarthShift Intelligence</h1>
    <p>{es ? 'Integra los tres motores científicos de EarthShift con investigación temporal NOAA y una capa opcional de interpretación con Groq. Los cálculos científicos permanecen separados de la IA.' : 'Combines the three EarthShift scientific engines with NOAA temporal research and an optional Groq interpretation layer. Scientific calculations remain separate from AI.'}</p>

    <section className="paper">
      <div className="section-heading"><div><h2>{es ? 'Contexto científico' : 'Scientific context'}</h2><p className="fine-print">{context ? `${context.region} · ${context.period} · ${context.source}` : (error || (es ? 'Cargando contexto…' : 'Loading context…'))}</p></div>
        <label>{es ? 'Región' : 'Region'}<select disabled={!regions.length || loading} value={region} onChange={e => setRegion(e.target.value)}>{regions.map(item => <option key={item}>{item}</option>)}</select></label></div>
      <div className="two-columns">{engineEntries.map(([id, finding]) => <article className="result-card" key={id}><div className="section-heading"><h3>{ENGINE_LABELS[id] || id}</h3><span className="status-badge">{finding?.level || '—'}</span></div><p>{finding?.explanation || (es ? 'Sin hallazgo.' : 'No finding.')}</p><EngineEvidence finding={finding}/><p className="fine-print">{finding?.quality?.explanation || '—'}</p></article>)}</div>
      {context && <details><summary>Cobertura de datos · {context.source}</summary><dl>{Object.entries(context.quality?.variables || {}).map(([id, value]) => <React.Fragment key={id}><dt>{id}</dt><dd>{typeof value.valid_fraction === 'number' ? (value.valid_fraction * 100).toFixed(1) + '%' : '—'}</dd></React.Fragment>)}</dl><p>MODIS · GPM · GLDAS · NOAA CPC / RONI</p><p className="fine-print">spatial_match: {context.metadata?.spatial_match || 'mixed'}</p></details>}
      {context?.limitations?.map(item => <p className="notice" key={item}>{item}</p>)}
    </section>

    <div className="button-row" role="tablist" aria-label="EarthShift Intelligence">
      <button role="tab" disabled={loading} aria-selected={tab === 'advisor'} className={tab === 'advisor' ? 'primary' : undefined} onClick={() => { setTab('advisor'); setResult(null); }}>EarthShift Advisor</button>
      <button role="tab" aria-selected={tab === 'phenomena'} className={tab === 'phenomena' ? 'primary' : undefined} onClick={() => { setTab('phenomena'); setResult(null); }}>EarthShift Phenomena</button>
    </div>

    <section className="paper"><h2>{tab === 'advisor' ? 'EarthShift Advisor' : 'EarthShift Phenomena'}</h2><p>{tab === 'advisor' ? (es ? 'Interpreta los resultados reales de Earth Paradox, Silent Collapse y Decision Reversal. Groq no modifica ni recalcula los motores.' : 'Interprets real engine results without changing calculations.') : (es ? 'Compara anomalías anuales ya calculadas por EarthShift con episodios NOAA RONI. Coincidencia temporal no significa causalidad.' : 'Compares annual EarthShift anomalies with NOAA RONI episodes. Temporal overlap does not imply causality.')}</p><>{tab === 'advisor' && <label>Pregunta opcional<input maxLength={1200} value={question} onChange={e=>setQuestion(e.target.value)} disabled={loading}/></label>}</><button className="primary" disabled={loading || !context} onClick={run}>{loading ? (es ? 'Analizando…' : 'Analyzing…') : (es ? 'Ejecutar análisis' : 'Run analysis')}</button>{error && <p role="alert" className="notice">{error}</p>}</section>

    {result && tab === 'advisor' && <section className="results"><article className="paper"><div className="section-heading"><h2>Advisor</h2><span className="status-badge">Groq: {result.ai_status}</span></div>{result.ai_status === 'completed' && result.advisor ? <><p>{result.advisor.resumen}</p><h3>{es ? 'Hallazgos' : 'Findings'}</h3><ul>{result.advisor.hallazgos?.map((x:string)=><li key={x}>{x}</li>)}</ul><h3>{es ? 'Puntos de atención' : 'Attention points'}</h3><ul>{result.advisor.puntos_atencion?.map((x:string)=><li key={x}>{x}</li>)}</ul><h3>{es ? 'Recomendaciones' : 'Recommendations'}</h3><ul>{result.advisor.recomendaciones?.map((x:string)=><li key={x}>{x}</li>)}</ul><h3>{es ? 'Siguientes pasos' : 'Next steps'}</h3><ul>{result.advisor.siguientes_pasos?.map((x:string)=><li key={x}>{x}</li>)}</ul><h3>{es ? 'Limitaciones' : 'Limitations'}</h3><ul>{result.advisor.limitaciones?.map((x:string)=><li key={x}>{x}</li>)}</ul></> : <p className="notice">{es ? 'El servicio de interpretación no está disponible temporalmente. Los resultados científicos se conservan arriba.' : 'Groq is unavailable or not configured. Scientific engine results remain available above.'}</p>}</article></section>}

    {result && tab === 'phenomena' && <section className="results"><article className="paper"><div className="section-heading"><h2>NOAA RONI</h2><span className="status-badge">Groq: {result.ai_status}</span></div><p>{es ? 'Episodios NOAA:' : 'NOAA episodes:'} {result.phenomena?.length ?? 0} · {es ? 'coincidencias temporales:' : 'temporal overlaps:'} {result.temporal_comparisons?.length ?? 0}</p><p className="notice">{es ? 'Coincidencia temporal ≠ causalidad. RONI describe el Pacífico tropical y no prueba por sí solo un impacto local en Piura.' : 'Temporal overlap ≠ causality. RONI describes the tropical Pacific and does not by itself prove local impact in Piura.'}</p><div className="table-scroll"><table><thead><tr><th>{es ? 'Fenómeno' : 'Phenomenon'}</th><th>{es ? 'Inicio' : 'Start'}</th><th>{es ? 'Fin' : 'End'}</th><th>{es ? 'Pico RONI' : 'RONI peak'}</th></tr></thead><tbody>{(result.phenomena || []).map((event:any,index:number)=><tr key={`${event.phenomenon}-${event.start_date}-${index}`}><td>{event.phenomenon}</td><td>{event.start_date}</td><td>{event.end_date}</td><td>{event.peak_anomaly_c} °C</td></tr>)}</tbody></table></div>{result.ai_status === 'unavailable' && <p className="notice">El servicio de interpretación no está disponible temporalmente.</p>}
      {!!result.temporal_comparisons?.length && <details><summary>Coincidencias temporales · causality_established = false</summary>{result.temporal_comparisons.map((item:any,index:number)=><p key={index}>{item.variable}: {item.anomaly_value} {item.unit} · {item.anomaly_start} · {item.anomaly_end} · coincidió temporalmente con {item.phenomenon} ({item.event_start} · {item.event_end}).</p>)}</details>}
      {result.ai_interpretation && <><p>{result.ai_interpretation.summary}</p>{['findings','limitations','research_questions'].map(field=><details key={field}><summary>{({findings:'Hallazgos',limitations:'Limitaciones',research_questions:'Preguntas de investigación'} as Record<string,string>)[field]}</summary><ul>{result.ai_interpretation[field].map((text:string)=><li key={text}>{text}</li>)}</ul></details>)}<details><summary>Relaciones posibles · sin causalidad establecida</summary>{result.ai_interpretation.possible_relationships.map((item:any,index:number)=><p key={index}>{item.phenomenon}: {item.observation} · {item.interpretation}</p>)}</details></>}
      <details><summary>Fuentes y limitaciones</summary><p>NOAA CPC / RONI</p>{result.limitations?.map((item:string)=><p key={item}>{item}</p>)}</details></article></section>}
  </div>;
}

function EngineEvidence({finding}:{finding:EngineFinding|null}) {
  const e = finding?.evidence;
  if (!e) return null;
  const labels:Record<string,string> = {ndvi_trend:'Tendencia NDVI',precipitation_trend:'Tendencia precipitación',trend_analysis:'Tendencia NDVI',persistence_analysis:'Persistencia',cumulative_change:'Cambio relativo',temporal_windows:'Ventanas temporales',anomaly_accumulation:'Anomalías y déficit',summary:'Resumen',univariable:'Evaluación univariable',multivariable:'Evaluación multivariable',trend:'Pendiente',p_value:'p-value',r_squared:'R²',observations:'Observaciones',relative_change_percent:'Cambio relativo (%)',decreasing_windows:'Ventanas decrecientes',negative_anomaly_fraction:'Fracción de anomalías negativas',cumulative_negative_deficit:'Déficit acumulado'};
  function fields(value:Record<string,any>):React.ReactNode {return <dl>{Object.entries(value).filter(([key,v])=>v!==null && typeof v!=='object' && !['demo','reference_type'].includes(key)).map(([key,v])=><React.Fragment key={key}><dt>{labels[key] || key.replaceAll('_',' ')}</dt><dd>{typeof v==='boolean' ? (v?'Sí':'No') : String(v)}</dd></React.Fragment>)}</dl>;}
  return <>{finding?.engine==='decision_reversal' && <p>{(finding.reversal_detected ?? e.reversal_detected)===false ? 'No se detectó reversión de decisión.' : 'Consultar la evidencia de clasificación.'}</p>}<details><summary>Evidencia del motor</summary>{fields(e)}{Object.entries(e).filter(([,v])=>v && typeof v==='object' && !Array.isArray(v)).map(([key,v])=><div key={key}><h4>{labels[key] || key}</h4>{fields(v)}</div>)}<p className="fine-print">Resultados descriptivos preliminares. No demuestran causalidad ni deterioro ambiental real.</p></details></>;
}
