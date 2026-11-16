import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request} from 'node:http';
import type {Request,Response} from 'express';

test('Vercel function serves Express API without listening, keeps API path and strips internal query',async()=>{
  process.env.VERCEL='1';
  process.env.EARTHSHIFT_BACKEND_URL='https://backend.example.invalid';
  const realFetch=globalThis.fetch;
  globalThis.fetch=async(input,init)=>new globalThis.Response(JSON.stringify({upstream:String(input),method:init?.method,body:init?.body?JSON.parse(String(init.body)):null}),{status:new URL(String(input)).pathname==='/api/unknown'?404:200,headers:{'Content-Type':'application/json'}});
  const {default:handler}=await import('../api/index');
  const server=createServer((req,res)=>handler(req as Request,res as Response));
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();if(!address || typeof address==='string')throw new Error('Missing listener');
  const get=(path:string,body?:object,extraHeaders?:Record<string,string>)=>new Promise<{status:number;data:any}>((resolve,reject)=>{
    const payload=body?JSON.stringify(body):undefined;
    const headers:Record<string,string|number>=payload?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}:{};
    Object.assign(headers,extraHeaders??{});
    request({hostname:'127.0.0.1',port:address.port,path,method:body?'POST':'GET',headers},response=>{
      let body='';response.on('data',chunk=>body+=chunk);response.on('end',()=>{try{resolve({status:response.statusCode!,data:JSON.parse(body)});}catch(error){reject(error);}});
    }).on('error',reject).end(payload);
  });
  try {
    const result=await get('/api?__earthshift_path=series&region=BosqueSecoMorropon&variables=ndvi%2Csoil_moisture');
    assert.equal(result.status,200);
    const upstream=new URL(result.data.upstream);
    assert.equal(upstream.origin,'https://backend.example.invalid');
    assert.equal(upstream.pathname,'/api/series');
    assert.equal(upstream.searchParams.get('region'),'BosqueSecoMorropon');
    assert.equal(upstream.searchParams.has('__earthshift_path'),false);
    const posted=await get('/api?__earthshift_path=intelligence%2Fadvisor',{region:'BajoPiura'});
    assert.equal(posted.status,200);assert.equal(posted.data.method,'POST');
    assert.equal(new URL(posted.data.upstream).pathname,'/api/intelligence/advisor');
    assert.deepEqual(posted.data.body,{region:'BajoPiura'});
    const nasa=await get('/api?__earthshift_path=nasa%2Fgibs-layers');
    assert.equal(nasa.status,200);assert.ok(nasa.data.layers.length);
    const gibsExpected='https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/2023-03-15/250m/2/0/0.jpg';
    const gibsOnce=await get('/api?__earthshift_path=nasa%2Fgibs-tile&path=VIIRS_SNPP_CorrectedReflectance_TrueColor%2Fdefault%2F2023-03-15%2F250m%2F2%2F0%2F0.jpg');
    assert.equal(gibsOnce.status,200);assert.equal(new URL(gibsOnce.data.upstream).href,gibsExpected);
    const gibsTwice=await get('/api?__earthshift_path=nasa%2Fgibs-tile&path=VIIRS_SNPP_CorrectedReflectance_TrueColor%252Fdefault%252F2023-03-15%252F250m%252F2%252F0%252F0.jpg');
    assert.equal(gibsTwice.status,200);assert.equal(new URL(gibsTwice.data.upstream).href,gibsExpected);
    // Vercel used to inject its route capture as an extra `path` value.
    const gibsCollided=await get('/api?__earthshift_path=nasa%2Fgibs-tile&path=nasa%2Fgibs-tile&path=VIIRS_SNPP_CorrectedReflectance_TrueColor%2Fdefault%2F2023-03-15%2F250m%2F2%2F0%2F0.jpg');
    assert.equal(gibsCollided.status,200);assert.equal(new URL(gibsCollided.data.upstream).href,gibsExpected);
    const routeHeader=Buffer.from(JSON.stringify({earthshiftApi:'nasa/gibs-layers'})).toString('base64');
    const fromHeader=await get('/api',undefined,{'x-now-route-matches':routeHeader});
    assert.equal(fromHeader.status,200);assert.ok(fromHeader.data.layers.length);
    const missing=await get('/api?__earthshift_path=unknown');
    assert.equal(missing.status,404);
  } finally {
    globalThis.fetch=realFetch;
    await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  }
});
