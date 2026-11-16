import React from 'react';
import {ArrowRight, CalendarDays, Database, Info, Layers3, MapPin} from 'lucide-react';
import {useLanguage} from './i18n';

export function SummaryCard({label,value,detail,icon:Icon=Database}:{label:string;value:React.ReactNode;detail?:React.ReactNode;icon?:typeof Database}) {
  return <div className="summary-card"><span className="summary-icon"><Icon size={18} aria-hidden="true"/></span><div><span className="summary-label">{label}</span><strong>{value}</strong>{detail && <span className="summary-detail">{detail}</span>}</div></div>;
}
export function ContextSummary({region,period,count}:{region:string;period?:string;count?:number}) {
  const {language}=useLanguage(),es=language==='es';
  return <div className="summary-grid" aria-label={es?'Resumen del análisis':'Analysis overview'}>
    <SummaryCard icon={MapPin} label={es?'Región estudiada':'Study region'} value={region}/>
    <SummaryCard icon={CalendarDays} label={es?'Periodo disponible':'Available period'} value={period || (es?'Dato no disponible':'Data unavailable')}/>
    {typeof count==='number' && <SummaryCard icon={Layers3} label={es?'Variables disponibles':'Available variables'} value={count}/>}
  </div>;
}
export function CoverageMeter({value,label}:{value?:number;label:string}) {
  const {language,number}=useLanguage(),es=language==='es';
  const valid=typeof value==='number' && Number.isFinite(value) && value>=0 && value<=1;
  return <div className="coverage-item"><div><span>{label}</span><strong>{valid?number(value*100,1)+'%':(es?'Sin cobertura reportada':'Coverage not reported')}</strong></div>
    {valid && <div className="coverage-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value*100}><span style={{width:value*100+'%'}}/></div>}
  </div>;
}
export function StatePanel({title,description,busy=false}:{title:string;description?:string;busy?:boolean}) {
  return <div className={'state-panel'+(busy?' is-loading':'')} role="status"><span className="summary-icon"><Info size={20} aria-hidden="true"/></span><div><strong>{title}</strong>{description && <p>{description}</p>}</div></div>;
}
export function SourcePill({children}:{children:React.ReactNode}) {return <span className="source-pill"><Database size={12} aria-hidden="true"/>{children}</span>;}
export function Journey({onCompare,onEvidence,onIntelligence}:{onCompare:()=>void;onEvidence:()=>void;onIntelligence:()=>void}) {
  const {language}=useLanguage(),es=language==='es';
  return <div className="journey-grid">{[
    {icon:MapPin,title:es?'Explora y compara':'Explore & compare',copy:es?'Regiones estudiadas y variables ambientales, lado a lado.':'Studied regions and environmental variables, side by side.',action:onCompare},
    {icon:CalendarDays,title:es?'Sigue la evidencia':'Follow the evidence',copy:es?'Una cronología con anomalías, fenómenos y fuentes.':'A timeline of anomalies, phenomena and sources.',action:onEvidence},
    {icon:Layers3,title:es?'Entiende los hallazgos':'Understand the findings',copy:es?'Tres motores científicos y una interpretación opcional con IA.':'Three scientific engines and optional AI interpretation.',action:onIntelligence},
  ].map(({icon:Icon,title,copy,action},i)=><button className="journey-card" key={title} onClick={action}><span className="journey-step">0{i+1}</span><Icon size={23} aria-hidden="true"/><h3>{title}</h3><p>{copy}</p><ArrowRight size={18} aria-hidden="true"/></button>)}</div>;
}
