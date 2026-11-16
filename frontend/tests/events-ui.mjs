import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
// Isolated API fixtures: these values never enter the production application.
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
let noaaDown=false,backendDown=false;
await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.includes('/nasa/'))return route.fulfill({json:{isLive:false,events:[]}});
  if(backendDown || (noaaDown && url.pathname.endsWith('/phenomena')))return route.fulfill({status:503,json:{detail:'INTERNAL_PROVIDER_ERROR'}});
  if(url.pathname==='/api/regions')return route.fulfill({json:{regions:['Fixture-A','Fixture-B']}});
  const region=url.searchParams.get('region') || route.request().postDataJSON()?.region;
  const context={region,period:'2020-2023',source:'processed_real_data',demo:false,anomalies:[{year:2022,variable:'ndvi',engine:'silent_collapse',value:region==='Fixture-A'?-0.123456:0.654321,unit:'NDVI',negative_anomaly:region==='Fixture-A'}],engines:{decision_reversal:{level:'normal',explanation:'Backend engine summary',evidence:{reversal_detected:false}}},limitations:['Fixture spatial limitation']};
  return route.fulfill({json:url.pathname.endsWith('/context')?context:{region,period:context.period,phenomena:[{phenomenon:'Fixture RONI episode',index:'RONI',source:'NOAA CPC',start_date:'2020-01-01',end_date:'2020-06-01',peak_anomaly_c:0.8,overlaps_requested_period:true}],limitations:['Fixture NOAA limitation']}});
});
try {
  await page.goto('http://localhost:3010',{waitUntil:'domcontentloaded'});
  await page.getByRole('navigation').getByRole('button',{name:'Event records',exact:true}).click();
  await page.getByText('Fixture RONI episode',{exact:true}).waitFor();
  assert.equal(await page.locator('article.paper').count(),3);
  assert.match(await page.locator('main').innerText(),/-0.123456/);
  await page.getByRole('button',{name:'Anomalies',exact:true}).click();
  assert.equal(await page.locator('article.paper').count(),1);
  await page.locator('select').selectOption('Fixture-B');
  await page.getByText(/0.654321/).waitFor();
  assert.doesNotMatch(await page.locator('main').innerText(),/-0.123456/);
  await page.getByRole('button',{name:'Findings',exact:true}).click();
  await page.getByText('No decision reversal was detected with the analyzed variables.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'All',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.doesNotMatch(await page.locator('main').innerText(),/undefined|NaN|INTERNAL_PROVIDER_ERROR/);
  await page.screenshot({path:'../docs/events-mobile.png',fullPage:true});
  noaaDown=true;
  await page.getByRole('button',{name:'Refresh record',exact:true}).click();
  await page.getByText(/NOAA CPC \/ RONI records are temporarily unavailable/).waitFor();
  assert.equal(await page.locator('article.paper').count(),2);
  await page.getByRole('button',{name:'Phenomena',exact:true}).click();
  await page.getByText('No events with available evidence were found for this period.',{exact:true}).waitFor();
  backendDown=true;
  await page.getByRole('button',{name:'Refresh record',exact:true}).click();
  await page.getByText('The scientific record is temporarily unavailable.',{exact:true}).waitFor();
  assert.equal(await page.locator('article.paper').count(),0);
  assert.deepEqual(errors,[]);
  console.log('Events UI passed: categories, region change, exact values, empty/error/partial states and mobile.');
} finally {await browser.close();}
