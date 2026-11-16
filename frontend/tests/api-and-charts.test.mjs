import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveGibsTile} from '../src/services/gibsTiles.mjs';
import {requestJson,EarthshiftApiError} from '../src/services/apiRequest.mjs';
import {buildAnnualChart,validateAnnualSeries} from '../src/research/annualSeries.mjs';

test('globe geographic matrices and map Mercator matrices use different GIBS projections',()=>{
  assert.match(resolveGibsTile('VIIRS_SNPP_CorrectedReflectance_TrueColor/default/2023-03-15/250m/2/0/1.jpg'),/epsg4326/);
  assert.match(resolveGibsTile('MODIS_Terra_NDVI_8Day/default/2023-03-15/GoogleMapsCompatible_Level9/2/0/1.png'),/epsg3857/);
});
test('tile resolver blocks traversal, external URLs, unsupported layers and matrices',()=>{
  for(const path of ['../anything','https://example.org/image','bad/default/2023-03-15/250m/2/0/1.jpg','VIIRS_Black_Marble/default/2023-03-15/other/2/0/1.png'])assert.throws(()=>resolveGibsTile(path));
});
test('API client rejects HTML fallback and malformed JSON despite HTTP 200',async()=>{
  for(const response of [new Response('<html/>',{headers:{'content-type':'text/html'}}),new Response('{bad',{headers:{'content-type':'application/json'}})]) {
    await assert.rejects(requestJson('/api/series',{},async()=>response),error=>error instanceof EarthshiftApiError && error.code==='invalid_api_response');
  }
});
test('API client preserves cancellation and reports offline backend without leaking provider detail',async()=>{
  await assert.rejects(requestJson('/api/series',{},async()=>new Response('INTERNAL_SECRET',{status:503})),error=>error.status===503 && !error.message.includes('INTERNAL_SECRET'));
  const controller=new AbortController();controller.abort();
  await assert.rejects(requestJson('/api/series',{signal:controller.signal},async(url,init)=>{assert.equal(init.signal.aborted,true);throw init.signal.reason;}),error=>error.name==='AbortError');
});
const payload=(region,series)=>({region,series,source:'processed_real_data',demo:false});
test('series adapter rejects region mismatch, duplicate dates and demo data',()=>{
  assert.throws(()=>validateAnnualSeries(payload('B',[]),'A'));
  assert.throws(()=>validateAnnualSeries(payload('A',[{year:2020},{year:2020}]),'A'));
  assert.throws(()=>validateAnnualSeries({...payload('A',[]),demo:true},'A'));
});
test('chart preserves zero, sorts real values, and leaves missing or nonfinite values null',()=>{
  const data=validateAnnualSeries(payload('A',[{year:2022,ndvi:.2,precipitation_mm:Infinity},{year:2020,ndvi:0}]),'A');
  const chart=buildAnnualChart([data]);
  assert.deepEqual(chart.map(row=>row.year),[2020,2021,2022]);
  assert.equal(chart[0].ndvi,0);assert.equal(chart[1].ndvi,null);assert.equal(chart[2].ndvi,.2);assert.equal(chart[2].precipitation_mm,null);
});
test('calendar gaps remain gaps even if both regions omit the same year',()=>{
  const data=['A','B'].map(region=>validateAnnualSeries(payload(region,[{year:2020,ndvi:.1},{year:2022,ndvi:.3}]),region));
  const chart=buildAnnualChart(data);
  assert.equal(chart[1].year,2021);assert.equal(chart[1].ndvi,null);assert.equal(chart[1].ndvi_B,null);
});
