import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const base=process.env.EARTHSHIFT_TEST_URL || 'http://localhost:3010';
const api=async path=>{const response=await fetch(base+'/api'+path,{signal:AbortSignal.timeout(15000)});assert.equal(response.status,200,path);return response.json();};
const regions=(await api('/regions')).regions;
assert.ok(regions.length);
const fields={ndvi:'ndvi',precipitation:'precipitation_mm',surface_temperature:'surface_temperature_c',soil_moisture:'soil_moisture'};
const catalog=(await api('/variables')).variables;
for(const region of regions){
  const series=await api('/series?region='+encodeURIComponent(region));
  assert.equal(series.source,'processed_real_data');assert.equal(series.demo,false);assert.equal(series.region,region);
  assert.ok(series.series.length>0);
  for(const row of series.series)for(const key of Object.values(fields))assert.ok(row[key]===null || (typeof row[key]==='number' && Number.isFinite(row[key])));
  const context=await api('/intelligence/context?region='+encodeURIComponent(region));
  assert.equal(context.region,region);assert.equal(context.demo,false);assert.equal(Object.keys(context.engines).length,3);
}
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors=[],warnings=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='warning' && /Recharts|width|height|Clock|WebSocket/i.test(message.text()))warnings.push(message.text());});
// No AI calls: this live regression test reads local scientific data only.
await page.route('**/api/intelligence/{advisor,chat,phenomena}',route=>route.abort());
try {
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.getByRole('navigation').getByRole('button',{name:'Compare areas',exact:true}).click();
  await page.locator('.results-grid article').first().waitFor();
  for(const region of regions){
    const response=await api('/series?region='+encodeURIComponent(region));
    await page.getByLabel('Region A',{exact:true}).selectOption(region);
    await page.waitForFunction(region=>document.querySelector('.results-grid article .coverage-panel h4')?.textContent?.trim()==='A '+region,region);
    assert.equal(await page.locator('.results-grid article').count(),catalog.length);
    for(const variable of catalog){
      const article=page.locator('.results-grid article').filter({has:page.getByRole('heading',{name:variable.name,exact:true})});
      const last=[...response.series].reverse().find(row=>typeof row[fields[variable.id]]==='number');
      const displayed=await article.locator('.coverage-panel').first().locator('.engine-metric strong').innerText();
      assert.match(displayed,new RegExp(new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(last[fields[variable.id]]).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
      assert.ok(await article.locator('.recharts-line-curve').count()>=1,variable.id+' must render actual line data');
    }
  }
  // Charts must still render after leaving and returning to the retained comparison view.
  await page.getByRole('navigation').getByRole('button').last().click();
  await page.locator('.engine-grid .result-card').first().waitFor();
  await page.getByRole('navigation').getByRole('button',{name:'Compare areas',exact:true}).click();
  assert.equal(await page.locator('.comparison-chart').count(),catalog.length);
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:'../docs/live-after.png',fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);
  console.log(`Live backend passed: ${regions.length} regions, ${catalog.length} variables, actual chart values, context engines, navigation and mobile; no AI requests.`);
} finally {await browser.close();}
