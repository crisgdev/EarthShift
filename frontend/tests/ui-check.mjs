import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
// API fixtures are restricted to this integration test.
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));let offline=false;
const context={region:'BajoPiura',period:'2020-2023',source:'processed_real_data',demo:false,engines:{earth_paradox:{engine:'earth_paradox',level:'normal',explanation:'No divergence'},silent_collapse:{engine:'silent_collapse',level:'normal',explanation:'No decline'},decision_reversal:{engine:'decision_reversal',level:'normal',explanation:'No reversal',evidence:{reversal_detected:false}}},quality:{variables:{ndvi:{valid_fraction:1}}},metadata:{spatial_match:'mixed'},limitations:['Spatial coverage differs']};
await page.route('**/api/**',route=>{
 const path=new URL(route.request().url()).pathname;
 if(offline&&!path.includes('/nasa/'))return route.fulfill({status:503,json:{detail:'INTERNAL_SECRET'}});
 const responses={'/api/regions':{regions:['BajoPiura']},'/api/cells':{cells:[{region:'BajoPiura',source:'processed_real_data'}]},'/api/variables':{variables:[{id:'ndvi',name:'NDVI',unit:'index',source:'MODIS',aggregation:'annual_mean'}]},'/api/series':{...context,series:[{year:2020,ndvi:0.2},{year:2021,ndvi:0.3}]},'/api/intelligence/context':context,'/api/intelligence/advisor':{...context,advisor:null,ai_status:'unavailable',ai_error:'INTERNAL_SECRET'},'/api/intelligence/phenomena':{region:'BajoPiura',period:'2020-2023',phenomena:[],temporal_comparisons:[],limitations:[],ai_interpretation:null,ai_status:'unavailable'},'/api/nasa/eonet':{isLive:false,events:[]}};
 return route.fulfill({json:responses[path]||{}});
});
try {
 await page.goto(process.env.EARTHSHIFT_TEST_URL || 'http://localhost:3000',{waitUntil:'domcontentloaded'});
 await page.getByRole('navigation').getByRole('button',{name:'Compare areas',exact:true}).click();
 await page.locator('.results .result-card').first().waitFor();
 assert.equal(await page.locator('.area-A select option').count(),1);
 assert.equal(await page.locator('.area-B select').isDisabled(),true);
 assert.equal(await page.getByRole('button',{name:'Synthetic demonstration',exact:true}).count(),0);
 assert.match(await page.locator('.filters').innerText(),/processed_real_data/);
 await page.screenshot({path:'../docs/integration-comparison.png',fullPage:true});
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'Download comparison JSON'}).click();
 const download=await downloadPromise;
 assert.equal(download.suggestedFilename(),'earthshift-processed.json');
 await page.getByRole('navigation').getByRole('button').last().click();
 await page.locator('.result-card:visible').first().waitFor();
 await page.locator('button.primary').filter({hasText:/Run analysis|Ejecutar/}).click();
 await page.getByText('Groq: unavailable',{exact:true}).waitFor();
 assert.equal(await page.getByText('INTERNAL_SECRET').count(),0);
 assert.equal(await page.locator('.result-card:visible').count(),3);
 await page.screenshot({path:'../docs/integration-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:'../docs/integration-mobile.png',fullPage:true});
 offline=true;await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('navigation').getByRole('button').last().click();
 await page.getByText('Datos no disponibles temporalmente.',{exact:false}).first().waitFor();
 assert.equal(await page.locator('.result-card:visible').count(),0);
 assert.equal(await page.locator('select option').count(),0);
 assert.deepEqual(errors,[]);console.log('UI integration passed.');
} finally {await browser.close();}
