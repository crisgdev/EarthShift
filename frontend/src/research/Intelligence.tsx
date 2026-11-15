import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from './i18n';

const API_BASE = (import.meta.env.VITE_EARTHSHIFT_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

type EngineFinding = { engine: string; level?: string; explanation?: string; quality?: { valid?: boolean; explanation?: string } };
type ContextResponse = { region: string; period: string; source: string; demo: boolean; engines: Record<string, EngineFinding | null>; anomalies: Array<Record<string, unknown>>; limitations: string[] };
const ENGINE_LABELS: Record<string, string> = { earth_paradox: 'Earth Paradox', silent_collapse: 'Silent Collapse', decision_reversal: 'Decision Reversal' };

export default function Intelligence() {
  const { language } = useLanguage();
  const es = language === 'es';
  const [tab, setTab] = useState<'advisor' | 'phenomena'>('advisor');
  const [regions, setRegions] = useState<string[]>(['BajoPiura']);
  const [region, setRegion] = useState('BajoPiura');
  const [context, setContext] = useState<ContextResponse | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/regions`).then(r => r.ok ? r.json() : Promise.reject()).then(data => {
      if (Array.isArray(data.regions) && data.regions.length) setRegions(data.regions);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setResult(null); setError('');
    fetch(`${API_BASE}/api/intelligence/context?region=${encodeURIComponent(region)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setContext)
      .catch(() => setContext(null));
  }, [region]);

  const engineEntries = useMemo(() => Object.entries(context?.engines ?? {}), [context]);

  async function run() {
    setLoading(true); setError(''); setResult(null);
    try {
      const endpoint = tab === 'advisor' ? 'advisor' : 'phenomena';
      const response = await fetch(`${API_BASE}/api/intelligence/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ region }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || 'request_failed');
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request_failed');
    } finally { setLoading(false); }
  }

  return <div className="research-content narrow">
    <p className="fine-print">EARTHSHIFT INTELLIGENCE</p>
    <h1>EarthShift Intelligence</h1>
    <p>{es ? 'Integra los tres motores científicos de EarthShift con investigación temporal NOAA y una capa opcional de interpretación con Gemini. Los cálculos científicos permanecen separados de la IA.' : 'Combines the three EarthShift scientific engines with NOAA temporal research and an optional Gemini interpretation layer. Scientific calculations remain separate from AI.'}</p>

    <section className="paper">
      <div className="section-heading"><div><h2>{es ? 'Contexto científico' : 'Scientific context'}</h2><p className="fine-print">{context ? `${context.region} · ${context.period} · ${context.source}` : (es ? 'Cargando contexto…' : 'Loading context…')}</p></div>
        <label>{es ? 'Región' : 'Region'}<select value={region} onChange={e => setRegion(e.target.value)}>{regions.map(item => <option key={item}>{item}</option>)}</select></label></div>
      <div className="two-columns">{engineEntries.map(([id, finding]) => <article className="result-card" key={id}><div className="section-heading"><h3>{ENGINE_LABELS[id] || id}</h3><span className="status-badge">{finding?.level || '—'}</span></div><p>{finding?.explanation || (es ? 'Sin hallazgo.' : 'No finding.')}</p><p className="fine-print">{finding?.quality?.explanation || '—'}</p></article>)}</div>
      {context?.limitations?.map(item => <p className="notice" key={item}>{item}</p>)}
    </section>

    <div className="button-row" role="tablist" aria-label="EarthShift Intelligence">
      <button role="tab" aria-selected={tab === 'advisor'} className={tab === 'advisor' ? 'primary' : undefined} onClick={() => { setTab('advisor'); setResult(null); }}>EarthShift Advisor</button>
      <button role="tab" aria-selected={tab === 'phenomena'} className={tab === 'phenomena' ? 'primary' : undefined} onClick={() => { setTab('phenomena'); setResult(null); }}>EarthShift Phenomena</button>
    </div>

    <section className="paper"><h2>{tab === 'advisor' ? 'EarthShift Advisor' : 'EarthShift Phenomena'}</h2><p>{tab === 'advisor' ? (es ? 'Interpreta los resultados reales de Earth Paradox, Silent Collapse y Decision Reversal. Gemini no modifica ni recalcula los motores.' : 'Interprets real engine results without changing calculations.') : (es ? 'Compara anomalías anuales ya calculadas por EarthShift con episodios NOAA RONI. Coincidencia temporal no significa causalidad.' : 'Compares annual EarthShift anomalies with NOAA RONI episodes. Temporal overlap does not imply causality.')}</p><button className="primary" disabled={loading || !context} onClick={run}>{loading ? (es ? 'Analizando…' : 'Analyzing…') : (es ? 'Ejecutar análisis' : 'Run analysis')}</button>{error && <p role="alert" className="notice">{error}</p>}</section>

    {result && tab === 'advisor' && <section className="results"><article className="paper"><div className="section-heading"><h2>Advisor</h2><span className="status-badge">Gemini: {result.ai_status}</span></div>{result.advisor ? <><p>{result.advisor.resumen}</p><h3>{es ? 'Hallazgos' : 'Findings'}</h3><ul>{result.advisor.hallazgos?.map((x:string)=><li key={x}>{x}</li>)}</ul><h3>{es ? 'Puntos de atención' : 'Attention points'}</h3><ul>{result.advisor.puntos_atencion?.map((x:string)=><li key={x}>{x}</li>)}</ul><h3>{es ? 'Recomendaciones' : 'Recommendations'}</h3><ul>{result.advisor.recomendaciones?.map((x:string)=><li key={x}>{x}</li>)}</ul><h3>{es ? 'Limitaciones' : 'Limitations'}</h3><ul>{result.advisor.limitaciones?.map((x:string)=><li key={x}>{x}</li>)}</ul></> : <p className="notice">{es ? 'Gemini no está disponible o no está configurado. Los resultados científicos de los tres motores se conservan arriba.' : 'Gemini is unavailable or not configured. Scientific engine results remain available above.'}</p>}</article></section>}

    {result && tab === 'phenomena' && <section className="results"><article className="paper"><div className="section-heading"><h2>NOAA RONI</h2><span className="status-badge">Gemini: {result.ai_status}</span></div><p>{es ? 'Episodios NOAA:' : 'NOAA episodes:'} {result.phenomena?.length ?? 0} · {es ? 'coincidencias temporales:' : 'temporal overlaps:'} {result.temporal_comparisons?.length ?? 0}</p><p className="notice">{es ? 'Coincidencia temporal ≠ causalidad. RONI describe el Pacífico tropical y no prueba por sí solo un impacto local en Piura.' : 'Temporal overlap ≠ causality. RONI describes the tropical Pacific and does not by itself prove local impact in Piura.'}</p><div className="table-scroll"><table><thead><tr><th>{es ? 'Fenómeno' : 'Phenomenon'}</th><th>{es ? 'Inicio' : 'Start'}</th><th>{es ? 'Fin' : 'End'}</th><th>{es ? 'Pico RONI' : 'RONI peak'}</th></tr></thead><tbody>{(result.phenomena || []).map((event:any,index:number)=><tr key={`${event.phenomenon}-${event.start_date}-${index}`}><td>{event.phenomenon}</td><td>{event.start_date}</td><td>{event.end_date}</td><td>{event.peak_anomaly_c} °C</td></tr>)}</tbody></table></div>{result.ai_interpretation && <p>{result.ai_interpretation.summary}</p>}</article></section>}
  </div>;
}
