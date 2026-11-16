import assert from 'node:assert/strict';
import {publicOrigin} from '../src/services/deploymentConfig.mjs';
const base=publicOrigin(process.env.EARTHSHIFT_TEST_URL || 'https://earth-shift.vercel.app','EARTHSHIFT_TEST_URL');
async function get(path){
  const response=await fetch(base+'/api'+path,{signal:AbortSignal.timeout(90000)});
  assert.equal(response.status,200,`GET /api${path} returned ${response.status}`);
  assert.match(response.headers.get('content-type') || '',/application\/json/,`API returned non-JSON: ${path}`);
  return response.json();
}
const health=await get('/health');assert.equal(health.status,'ok');
const regions=await get('/regions');assert.ok(regions.regions?.length,'No processed regions available');
const region=regions.regions[0];
const series=await get('/series?region='+encodeURIComponent(region));
assert.equal(series.source,'processed_real_data');assert.equal(series.demo,false);assert.equal(series.region,region);assert.ok(series.series.length);
console.log(`Public deployment OK: ${base}; health, ${regions.regions.length} regions and ${series.series.length} real annual observations for ${region}.`);
