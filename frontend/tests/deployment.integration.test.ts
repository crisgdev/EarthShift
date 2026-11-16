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
  const get=(path:string,body?:object)=>new Promise<{status:number;data:any}>((resolve,reject)=>{
    const payload=body?JSON.stringify(body):undefined;
    request({hostname:'127.0.0.1',port:address.port,path,method:body?'POST':'GET',headers:payload?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}:{}},response=>{
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
    const missing=await get('/api?__earthshift_path=unknown');
    assert.equal(missing.status,404);
  } finally {
    globalThis.fetch=realFetch;
    await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  }
});
