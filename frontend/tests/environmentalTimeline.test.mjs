import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEnvironmentalTimeline} from '../src/research/environmentalTimeline.mjs';

const context = () => ({region:'test-region',period:'2020-2023',source:'processed_real_data',demo:false,
  anomalies:[{year:2022,variable:'ndvi',value:-0.123456,unit:'NDVI',engine:'silent_collapse',negative_anomaly:true}],
  engines:{decision_reversal:{level:'normal',explanation:'Backend explanation',evidence:{reversal_detected:false}}}});
const phenomena = () => ({region:'test-region',period:'2020-2023',phenomena:[{phenomenon:'Episode from backend',index:'RONI',start_date:'2019-10-01',end_date:'2020-05-01',peak_anomaly_c:0.7,source:'NOAA CPC',overlaps_requested_period:true}]});

test('timeline preserves backend numbers, dates, provenance and false reversal',()=>{
  const rows=buildEnvironmentalTimeline(context(),phenomena());
  assert.deepEqual(rows.map(row=>row.category),['findings','anomalies','phenomena']);
  assert.equal(rows[0].reversal,false);
  assert.equal(rows[1].value,-0.123456);
  assert.equal(rows[2].value,0.7);
  assert.equal(rows[2].start,'2019-10-01');
  assert.equal(rows[2].source,'NOAA CPC');
});
test('timeline rejects synthetic context and invalid periods',()=>{
  assert.throws(()=>buildEnvironmentalTimeline({...context(),demo:true}));
  assert.throws(()=>buildEnvironmentalTimeline({...context(),period:'2023-2020'}));
  assert.throws(()=>buildEnvironmentalTimeline({...context(),source:'mock'}));
});
test('phenomena from a different region or period are never mixed',()=>{
  for(const patch of [{region:'other-region'},{period:'2010-2015'}]) {
    assert.equal(buildEnvironmentalTimeline(context(),{...phenomena(),...patch}).filter(row=>row.category==='phenomena').length,0);
  }
});
test('invalid dates, nonfinite values and events outside the period are omitted',()=>{
  const data=context();data.anomalies.push({year:2021,variable:'ndvi',value:NaN,engine:'silent_collapse'},{year:2010,variable:'ndvi',value:-1,engine:'silent_collapse'});
  const climate=phenomena();climate.phenomena.push({...climate.phenomena[0],start_date:'2023-02-30'},{...climate.phenomena[0],start_date:'2010-01-01',end_date:'2010-12-01'});
  assert.equal(buildEnvironmentalTimeline(data,climate).length,3);
});
test('fallback uses existing Silent Collapse annual anomalies when context omits anomalies',()=>{
  const data=context();delete data.anomalies;
  data.engines.silent_collapse={evidence:{anomaly_accumulation:{anomalies:[{year:2021,anomaly:0,negative_anomaly:false}]}}};
  const anomaly=buildEnvironmentalTimeline(data).find(row=>row.category==='anomalies');
  assert.equal(anomaly.value,0);
  assert.equal(anomaly.variable,'ndvi');
});
test('an empty backend result stays empty; no fallback events are generated',()=>{
  assert.deepEqual(buildEnvironmentalTimeline({...context(),anomalies:[],engines:{}}),[]);
});
test('anomaly and finding region markers and demo markers are respected',()=>{
  const data=context();data.anomalies[0].region='other-region';data.engines.decision_reversal.demo=true;
  assert.deepEqual(buildEnvironmentalTimeline(data),[]);
});
