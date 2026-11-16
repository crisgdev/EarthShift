import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {backendOrigin,publicOrigin} from '../src/services/deploymentConfig.mjs';

test('local development is the only environment with a loopback fallback',()=>{
  assert.equal(backendOrigin({}),'http://127.0.0.1:8000');
  assert.equal(backendOrigin({VERCEL:'1'}),null);
  assert.equal(backendOrigin({NODE_ENV:'production'}),null);
});
test('production and branch previews require public HTTPS backend origins',()=>{
  for(const value of ['http://localhost:8000','https://127.0.0.1','https://[::1]','https://192.168.1.2','https://10.1.2.3','https://172.16.0.1','http://api.example.com','https://user:secret@api.example.com','https://api.example.com/api']){
    assert.throws(()=>backendOrigin({VERCEL:'1',EARTHSHIFT_BACKEND_URL:value}));
    assert.throws(()=>publicOrigin(value,'VITE_EARTHSHIFT_API_URL'));
  }
  assert.equal(backendOrigin({VERCEL:'1',EARTHSHIFT_BACKEND_URL:'https://api.example.com/'}),'https://api.example.com');
});
test('Vercel routes API before SPA and enables automatic branch deployments',()=>{
  const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
  assert.equal(config.git.deploymentEnabled,true);
  assert.equal(config.framework,'vite');assert.equal(config.outputDirectory,'dist');
  assert.equal(config.rewrites[0].source,'/api/:path*');
  assert.equal(config.rewrites[0].destination,'/api?__earthshift_path=:path*');
  const spa=new RegExp('^'+config.rewrites[1].source+'$');
  assert.equal(spa.test('/api/series'),false);assert.equal(spa.test('/api'),false);assert.equal(spa.test('/research'),true);
});
test('cloud build guard fails before deploying when backend is missing or local',()=>{
  for(const origin of ['', 'http://127.0.0.1:8000']) {
    const result=spawnSync(process.execPath,['scripts/check-deployment.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,VERCEL:'1',EARTHSHIFT_BACKEND_URL:origin},encoding:'utf8'});
    assert.notEqual(result.status,0);assert.match(result.stderr,/EARTHSHIFT_BACKEND_URL/);
  }
});
