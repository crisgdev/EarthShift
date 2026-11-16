// Presentation adapter only: no scientific calculations or generated events.
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const text = value => typeof value === 'string' && value.trim() ? value : null;
const iso = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
};
export const ENGINE_NAMES = {earth_paradox:'Earth Paradox',silent_collapse:'Silent Collapse',decision_reversal:'Decision Reversal'};
export function timelinePeriod(period) {
  const match = typeof period === 'string' && period.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
  if (!match || match[1] > match[2]) throw new Error('Invalid period');
  const start = iso(match[1] + '-01-01'), end = iso(match[2] + '-12-31');
  if (!start || !end) throw new Error('Invalid period');
  return {start,end};
}
export function buildEnvironmentalTimeline(context, phenomena = null) {
  if (!object(context) || context.source !== 'processed_real_data' || context.demo !== false || !text(context.region)) throw new Error('Real context required');
  const period = timelinePeriod(context.period);
  const overlaps = (start,end) => start && end && start <= end && start <= period.end && end >= period.start;
  const records = [];
  if (phenomena?.region === context.region && phenomena.period === context.period && Array.isArray(phenomena.phenomena)) {
    for (const [index,event] of phenomena.phenomena.entries()) {
      if (!object(event) || event.demo === true) continue;
      const start = iso(event.start_date), end = iso(event.end_date);
      if (!overlaps(start,end) || !text(event.phenomenon) || !text(event.source)) continue;
      records.push({id:'phenomenon-'+index,category:'phenomena',title:event.phenomenon,start,end,
        sortDate:end < period.end ? end : period.end,source:event.source,index:text(event.index),
        value:finite(event.peak_anomaly_c)?event.peak_anomaly_c:null,unit:'°C',
        overlaps:event.overlaps_requested_period === true, details:event,
        limitations:Array.isArray(phenomena.limitations)?phenomena.limitations.filter(text):[]});
    }
  }
  const fallback = context.engines?.silent_collapse?.evidence?.anomaly_accumulation?.anomalies;
  const anomalies = Array.isArray(context.anomalies) ? context.anomalies : Array.isArray(fallback) ? fallback : [];
  for (const [index,item] of anomalies.entries()) {
    if (!object(item) || item.demo === true || (item.region && item.region !== context.region)) continue;
    const year = Number.isInteger(item.year) && item.year >= 1 && item.year <= 9999 ? String(item.year).padStart(4,'0') : null;
    const start = iso(item.start_date) || (year && iso(year+'-01-01'));
    const end = iso(item.end_date) || (year && iso(year+'-12-31'));
    const value = item.value ?? item.anomaly;
    const variable = text(item.variable) || (anomalies === fallback ? 'ndvi' : null);
    const engine = text(item.engine) || (anomalies === fallback ? 'silent_collapse' : null);
    if (!overlaps(start,end) || !finite(value) || !variable || !ENGINE_NAMES[engine]) continue;
    records.push({id:'anomaly-'+index,category:'anomalies',title:variable.toUpperCase(),start,end,
      sortDate:end < period.end ? end : period.end,value,unit:text(item.unit) || (variable === 'ndvi'?'NDVI':null),
      variable,negative:item.negative_anomaly === true,source:'EarthShift · '+ENGINE_NAMES[engine],details:item});
  }
  for (const [engine,title] of Object.entries(ENGINE_NAMES)) {
    const finding = context.engines?.[engine];
    if (!object(finding) || finding.demo === true || (finding.region && finding.region !== context.region) || !text(finding.level) || !text(finding.explanation)) continue;
    records.push({id:'finding-'+engine,category:'findings',title,start:period.start,end:period.end,
      sortDate:period.end,source:'EarthShift · '+title,level:finding.level,description:finding.explanation,
      reversal:engine === 'decision_reversal' ? (finding.reversal_detected ?? finding.evidence?.reversal_detected) : undefined,
      details:finding.evidence,limitations:Array.isArray(finding.limitations)?finding.limitations.filter(text):[]});
  }
  return records.sort((a,b)=>b.sortDate.localeCompare(a.sortDate) || b.start.localeCompare(a.start) || a.id.localeCompare(b.id));
}
