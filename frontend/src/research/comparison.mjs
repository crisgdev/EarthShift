const DAY = 86400000;
export const VARIABLE_IDS = ['precipitation', 'ndvi', 'soil_moisture', 'lst', 'air_temperature'];
export const CONTRACTS = {
  precipitation: { product: 'NASA POWER Daily API / PRECTOTCORR', unit: 'mm/day', spatialResolution: '0.5° latitude × 0.625° longitude (meteorological grid)', temporalResolution: 'daily', source: 'https://power.larc.nasa.gov/docs/services/api/temporal/daily/' },
  air_temperature: { product: 'NASA POWER Daily API / T2M', unit: '°C', spatialResolution: '0.5° latitude × 0.625° longitude (meteorological grid)', temporalResolution: 'daily', source: 'https://power.larc.nasa.gov/docs/services/' },
  ndvi: { product: 'MODIS / NDVI', unit: '1', spatialResolution: null, temporalResolution: null, source: 'https://www.earthdata.nasa.gov/topics/biosphere/vegetation/vegetation-index' },
  soil_moisture: { product: 'SMAP', unit: 'm³/m³', spatialResolution: null, temporalResolution: null, source: 'https://smap.jpl.nasa.gov/' },
  lst: { product: 'MODIS / LST', unit: 'K', spatialResolution: null, temporalResolution: null, source: 'https://www.earthdata.nasa.gov/topics/land-surface/land-surface-temperature' },
};
export function datesBetween(start, end) {
  const a = Date.parse(start + 'T00:00:00Z'), b = Date.parse(end + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '') || !/^\d{4}-\d{2}-\d{2}$/.test(end || '') || !Number.isFinite(a) || !Number.isFinite(b) || new Date(a).toISOString().slice(0,10) !== start || new Date(b).toISOString().slice(0,10) !== end || a>b || (b-a)/DAY>7304) throw new Error('invalid_period');
  return Array.from({ length: Math.round((b-a)/DAY)+1 }, (_,i) => new Date(a+i*DAY).toISOString().slice(0,10));
}
export function validateRequest(body) {
  if (!body || !Array.isArray(body.areas) || body.areas.length !== 2 || !Array.isArray(body.variables) || !body.variables.length || body.variables.some(v=>!VARIABLE_IDS.includes(v))) throw new Error('invalid_request');
  const areas = body.areas.map((a,i) => {
    if (!a || typeof a.lat !== 'number' || !Number.isFinite(a.lat) || Math.abs(a.lat)>90 || typeof a.lon !== 'number' || !Number.isFinite(a.lon) || Math.abs(a.lon)>180 || typeof a.radiusKm !== 'number' || !Number.isFinite(a.radiusKm) || a.radiusKm<1 || a.radiusKm>100) throw new Error('invalid_area');
    return { id: i===0?'A':'B', lat:a.lat, lon:a.lon, radiusKm:a.radiusKm, geometry:'user_defined_circle' };
  });
  const periodA = { start:body.period?.start, end:body.period?.end };
  datesBetween(periodA.start,periodA.end);
  const periodB = body.separatePeriods ? { start:body.periodB?.start,end:body.periodB?.end } : {...periodA};
  datesBetween(periodB.start,periodB.end);
  for (const p of [periodA,periodB]) if (p.start<'1981-01-01' || Date.parse(p.end+'T00:00:00Z')>Date.now()-7*DAY) throw new Error('period_outside_availability');
  return { areas, periods:[periodA,periodB], variables:[...new Set(body.variables)], separatePeriods:!!body.separatePeriods, mode:body.mode==='synthetic'?'synthetic':'real' };
}
export function cleanValue(v,fill=-999,variable='precipitation') {
  return typeof v==='number' && Number.isFinite(v) && v!==fill && v>-900 && (variable!=='precipitation'||v>=0)?v:null;
}
export function summarize(series, variable) {
  const valid=series.filter(p=>p.value!==null), sum=valid.reduce((s,p)=>s+p.value,0);
  const groups = {};
  for (const p of series) { const key=p.date.slice(0,7); (groups[key]??=[]).push(p); }
  const monthly = Object.entries(groups).map(([month,rows])=> {
    const values=rows.filter(r=>r.value!==null); const expectedInMonth=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).getUTCDate();
    const total=values.reduce((n,r)=>n+r.value,0);
    return {month, valid:values.length, expected:rows.length, fullCalendarMonth:rows.length===expectedInMonth, value:values.length===rows.length && rows.length===expectedInMonth ? (variable==='precipitation'?total:total/values.length):null};
  });
  const yearlyGroups={};
  for(const row of series) (yearlyGroups[row.date.slice(0,4)]??=[]).push(row);
  const annual=Object.entries(yearlyGroups).flatMap(([year,rows])=>{
    const expected=datesBetween(year+'-01-01',year+'-12-31').length;
    if(rows.length!==expected||rows.some(r=>r.value===null)) return [];
    const sum=rows.reduce((n,r)=>n+r.value,0);
    return [{year:Number(year),value:variable==='precipitation'?sum:sum/expected}];
  });
  let trend=null;
  if(annual.length>=5){
    const meanX=annual.reduce((n,r)=>n+r.year,0)/annual.length,meanY=annual.reduce((n,r)=>n+r.value,0)/annual.length;
    const slope=annual.reduce((n,r)=>n+(r.year-meanX)*(r.value-meanY),0)/annual.reduce((n,r)=>n+(r.year-meanX)**2,0);
    trend={annualSlope:slope,points:annual.length,start:annual[0].year,end:annual.at(-1).year,unit:variable==='precipitation'?'mm/year':'°C/year',method:'ols_annual_complete_years',significance:null,uncertainty:null};
  }
  return {trend,annual,valid:valid.length,expected:series.length,coverage:series.length?valid.length/series.length:0,mean:valid.length?sum/valid.length:null,total:variable==='precipitation'&&valid.length?sum:null,complete:valid.length===series.length, latestObservation:valid.at(-1)?.date??null,monthly};
}
export function pairedDifference(a,b) {
  const bMap=new Map(b.map(p=>[p.date,p.value]));
  const paired=a.filter(p=>p.value!==null && bMap.has(p.date)&&bMap.get(p.date)!==null);
  return {valid:paired.length,meanDifference:paired.length?paired.reduce((s,p)=>s+p.value-bMap.get(p.date),0)/paired.length:null};
}
export function selectionTransition(state,action) {
  if(action.type==='swap') return {...state,areas:[state.areas[1],state.areas[0]]};
  if(action.type==='edit') return {...state,editing:action.index};
  if(action.type==='clear') return {...state,areas:state.areas.map((a,i)=>i===action.index?null:a)};
  if(action.type==='select') return {...state,areas:state.areas.map((a,i)=>i===state.editing?action.area:a)};
  return state;
}
const cached=new Map(), inflight=new Map();
async function queryPower(area,period,fetcher) {
  const q=new URLSearchParams({parameters:'PRECTOTCORR,T2M',community:'AG',latitude:area.lat.toFixed(4),longitude:area.lon.toFixed(4),start:period.start.replaceAll('-',''),end:period.end.replaceAll('-',''),format:'JSON','time-standard':'UTC'});
  const url='https://power.larc.nasa.gov/api/temporal/daily/point?'+q;
  if(cached.get(url)?.expires>Date.now()) return cached.get(url).value;
  if(inflight.has(url)) return inflight.get(url);
  const pending=(async()=>{
    const response=await fetcher(url,{signal:AbortSignal.timeout(45000)});
    if(!response.ok) { const e=new Error(response.status===429?'rate_limit':'upstream_error'); throw e; }
    const raw=await response.json();
    if(!raw.properties?.parameter) throw new Error('empty_response');
    const value={raw,url,retrievedAt:new Date().toISOString()};
    if(cached.size>=100) cached.delete(cached.keys().next().value);
    cached.set(url,{value,expires:Date.now()+3600000}); return value;
  })();
  inflight.set(url,pending);
  try{return await pending;}finally{inflight.delete(url);}
}
export async function compare(body,{fetcher=fetch}={}) {
  const request=validateRequest(body);
  const samples=await Promise.all(request.areas.map(async(area,i)=>{
    const period=request.periods[i], dates=datesBetween(period.start,period.end);
    let upstream=null,error=null;
    if(request.mode==='real'&&request.variables.some(v=>v==='precipitation'||v==='air_temperature')) {
      try {upstream=await queryPower(area,period,fetcher);} catch(e){error=e.message==='rate_limit'?'rate_limit':'source_unavailable';}
    }
    const variables={};
    for(const id of request.variables) {
      const supported=id==='precipitation'||id==='air_temperature';
      const sourceData=upstream?.raw.properties.parameter[id==='precipitation'?'PRECTOTCORR':'T2M']??{};
      const series=supported?dates.map((date,di)=>({date,value:request.mode==='synthetic'?(id==='precipitation'? Math.max(0, 4+Math.sin(di/8+i)*3+i):20+Math.sin(di/13)+i):cleanValue(sourceData[date.replaceAll('-','')],upstream?.raw.header?.fill_value??-999,id)})):[];
      const stats=summarize(series,id);
      const status=!supported?'unavailable':request.mode==='synthetic'?'simulated':stats.valid?'derived':'unavailable';
      variables[id]={ status, reason:!supported?'integration_pending':error??(!stats.valid?'no_valid_observations':null),series,stats,evidence:{
        ...CONTRACTS[id],productVersion:supported?(upstream?.raw.header?.api?.version??null):null,upstreamTitle:supported?(upstream?.raw.header?.title??null):null,
        upstreamSources:supported?(upstream?.raw.header?.sources??[]):[], parameterMetadata:upstream?.raw.parameters?.[id==='precipitation'?'PRECTOTCORR':'T2M']??null,
        area,period,sourceUrl:request.mode==='synthetic'&&supported?null:supported?(upstream?.url??CONTRACTS[id].source):CONTRACTS[id].source,retrievedAt:supported?(upstream?.retrievedAt??null):null,latestObservation:stats.latestObservation,
        dataStatus:status,rawDataStatus:!supported?'unavailable':request.mode==='synthetic'?'simulated':upstream?'reanalysis':'unavailable',valid:stats.valid,expected:supported?dates.length:dates.length,
        sampleGeometry:supported?(upstream?.raw.geometry??null):null, method:supported?'center_cell_daily_v1':'not_implemented', qualityControls:!supported?[]:['fill_to_null','nonfinite_to_null','negative_rainfall_to_null','no_interpolation','complete_months_only'],
        limitations:['center_cell_not_area_average','coarse_grid','no_causal_or_hazard_inference','no_anomaly_baseline','no_significance_test','no_long_term_trend_claim'],
        integrationContract: supported?null:{required:['product_id','version','scale_offset','quality_mask','spatial_aggregation','temporal_aggregation','valid_coverage'],status:'not_implemented'},
      }};
    }
    return {area,period,variables};
  }));
  return {schemaVersion:'piura-watch.comparison.v1',request,samples,comparisons:request.variables.map(id=>({variable:id,paired:!request.separatePeriods?pairedDifference(samples[0].variables[id].series,samples[1].variables[id].series):null})),generatedAt:new Date().toISOString(),forecast:false};
}