import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
// Controlled fixtures exercise presentation only; no fixture data ship in the app.
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let lowCoverage=false;
await page.route('**/api/**',route=>{
  const url=new URL(route.request().url()),path=url.pathname;
  if(path.includes('/nasa/'))return route.fulfill({json:{isLive:false,events:[]}});
  if(path==='/api/regions')return route.fulfill({json:{regions:['Fixture-A','Fixture-B']}});
  if(path==='/api/cells')return route.fulfill({json:{cells:['Fixture-A','Fixture-B'].map(region=>({region,source:'processed_real_data'}))}});
  if(path==='/api/variables')return route.fulfill({json:{variables:[{id:'ndvi',name:'NDVI',unit:'index',source:'MODIS',aggregation:'annual_mean'},{id:'soil_moisture',name:'Soil moisture',unit:'dataset unit',source:'GLDAS',aggregation:'annual_mean'}]}});
  const region=url.searchParams.get('region') || (route.request().method()==='POST'?route.request().postDataJSON().region:'Fixture-A');
  const data={region,period:'2021-2023',source:'processed_real_data',demo:false,quality:{variables:{ndvi:{valid_fraction:.75},soil_moisture:{valid_fraction:.5}}},metadata:{spatial_match:'mixed'},limitations:['Fixture spatial limitation'],anomalies:[],engines:{earth_paradox:{engine:'earth_paradox',level:'normal',explanation:'No divergence defined by the backend rules.',evidence:{ndvi_trend:{trend:-.01,p_value:.1}}},silent_collapse:{engine:'silent_collapse',level:'observar',explanation:'A preliminary signal requiring investigation.',evidence:{trend_analysis:{trend:-.01,p_value:.1},summary:{decreasing_windows:2,total_windows:4}}},decision_reversal:{engine:'decision_reversal',level:'normal',explanation:'No reversal.',evidence:{reversal_detected:false,univariable:{level:'normal'},multivariable:{level:'normal'}}}}};
  if(lowCoverage){data.quality.variables.ndvi.valid_fraction=.5333;data.analysis_readiness={minimum_valid_fraction:.8,evaluated_engines:0,total_engines:3};for(const engine of Object.values(data.engines)){engine.level='sin datos';engine.explanation='Insufficient coverage';engine.evidence={};engine.quality={valid:false,missing:['ndvi']};}}
  if(path==='/api/series')return route.fulfill({json:{...data,series:region==='Fixture-A'?[{year:2021,ndvi:.2,soil_moisture:null},{year:2022,ndvi:.3,soil_moisture:null}]:[{year:2022,ndvi:.4,soil_moisture:null},{year:2023,ndvi:.5,soil_moisture:null}]}});
  if(path==='/api/intelligence/context')return route.fulfill({json:data});
  return route.fulfill({json:{...data,ai_status:'completed',advisor:{resumen:'Fixture interpretation',hallazgos:['Finding from fixture'],puntos_atencion:['Attention from fixture'],recomendaciones:['Recommendation from fixture'],siguientes_pasos:['Next step from fixture'],limitaciones:['Limitation from fixture']}}});
});
try {
  await page.goto(process.env.EARTHSHIFT_TEST_URL || 'http://localhost:3010',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.journey-card').count(),3);
  await page.getByRole('navigation').getByRole('button',{name:'Compare areas',exact:true}).click();
  await page.locator('.results-grid .result-card').first().waitFor();
  assert.equal(await page.locator('[role=meter]').count(),4);
  assert.equal(await page.getByText('No observations are available for this variable.',{exact:true}).count(),1);
  await page.getByText('A / B comparison by year',{exact:false}).first().click();
  const table=page.locator('.results-grid article').first().locator('table').first();
  assert.match(await table.innerText(),/2023/);
  assert.equal(await table.locator('tbody tr').count(),3);
  assert.match(await table.locator('tbody tr').last().innerText(),/2023\s+—\s+0.5/);
  await page.getByLabel('Region A',{exact:true}).selectOption('Fixture-B');
  assert.equal(await page.getByLabel('Region B',{exact:true}).inputValue(),'Fixture-A');
  await page.screenshot({path:'../docs/ux-comparison-desktop.png',fullPage:true});
  await page.getByRole('navigation').getByRole('button').last().click();
  await page.locator('.engine-grid .result-card').first().waitFor();
  assert.equal(await page.locator('.engine-grid .result-card').count(),3);
  await page.getByRole('button',{name:'Run analysis',exact:true}).click();
  await page.getByText('Fixture interpretation',{exact:true}).waitFor();
  assert.equal(await page.locator('.results .parallel-grid section').count(),2);
  await page.screenshot({path:'../docs/ux-intelligence-desktop.png',fullPage:true});
  for(const width of [768,390]){
    await page.setViewportSize({width,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Intelligence overflows at '+width);
  }
  await page.screenshot({path:'../docs/ux-intelligence-mobile.png',fullPage:true});
  await page.getByRole('navigation').getByRole('button',{name:'Compare areas',exact:true}).click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Comparison overflows');
  await page.getByRole('navigation').getByRole('button',{name:'Evidence & methods',exact:true}).click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Methods overflows');
  assert.doesNotMatch(await page.locator('main').innerText(),/undefined|NaN/);
  lowCoverage=true;
  await page.getByRole('navigation').getByRole('button').last().click();
  await page.getByText('Series available · engines not evaluated',{exact:true}).waitFor();
  assert.equal(await page.locator('.engine-grid .parallel-grid').count(),0,'No empty reversal panels');
  assert.equal(await page.locator('.engine-grid details').count(),0,'No empty engine evidence');
  assert.equal(await page.getByText('Required minimum: 80%',{exact:true}).count(),3);
  assert.match(await page.locator('.engine-grid').innerText(),/53.3%/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:'../docs/coverage-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('UX browser checks passed: A/B alignment, coverage, missing values, duplicate region prevention, AI cards, navigation and mobile.');
} finally {await browser.close();}
