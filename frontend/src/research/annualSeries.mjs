export const SERIES_FIELDS={ndvi:'ndvi',precipitation:'precipitation_mm',surface_temperature:'surface_temperature_c',soil_moisture:'soil_moisture'};
export function validateAnnualSeries(data,region) {
  if(!data || data.source!=='processed_real_data' || data.demo!==false || data.region!==region || !Array.isArray(data.series))throw new Error('Invalid regional series response');
  const seen=new Set();
  const series=data.series.map(row=>{
    if(!row || !Number.isInteger(row.year) || row.year<1 || row.year>9999 || seen.has(row.year))throw new Error('Invalid or duplicate series year');
    seen.add(row.year);
    return {year:row.year,...Object.fromEntries(Object.values(SERIES_FIELDS).map(key=>[key,typeof row[key]==='number' && Number.isFinite(row[key])?row[key]:null]))};
  }).sort((a,b)=>a.year-b.year);
  if(series.length && series[series.length-1].year-series[0].year>1000)throw new Error('Unsupported series range');
  return {...data,series};
}
export function buildAnnualChart(data) {
  const years=data.flatMap(item=>item.series.map(row=>row.year));
  if(!years.length)return [];
  const start=Math.min(...years),end=Math.max(...years);
  if(end-start>1000)throw new Error('Unsupported series range');
  const lookup=data.map(item=>new Map(item.series.map(row=>[row.year,row])));
  // A missing year remains an explicit gap, including when BOTH regions miss it.
  return Array.from({length:end-start+1},(_,index)=>{
    const year=start+index,a=lookup[0]?.get(year),b=lookup[1]?.get(year);
    return {year,...Object.fromEntries(Object.entries(SERIES_FIELDS).flatMap(([id,key])=>[[key,a?.[key]??null],[id+'_B',b?.[key]??null]]))};
  });
}
