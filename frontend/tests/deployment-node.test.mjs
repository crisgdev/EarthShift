import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,copyFileSync,rmSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {transformSync} from 'esbuild';

test('compiled serverless entry imports in real Node ESM without the tsx resolver',()=>{
  const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
  const dir=mkdtempSync(join(root,'.test-build-'));
  if(!dir.startsWith(root+sep+'.test-build-'))throw new Error('Unexpected test build path');
  try {
    for(const file of ['app.ts','api/index.ts']){
      const target=join(dir,file.replace(/\.ts$/,'.js'));
      mkdirSync(resolve(target,'..'),{recursive:true});
      writeFileSync(target,transformSync(readFileSync(join(root,file),'utf8'),{loader:'ts',format:'esm',target:'es2022'}).code);
    }
    for(const file of ['src/research/comparison.mjs','src/research/backend-proxy.mjs','src/services/gibsTiles.mjs','src/services/deploymentConfig.mjs']){
      const target=join(dir,file);mkdirSync(resolve(target,'..'),{recursive:true});copyFileSync(join(root,file),target);
    }
    const code=`const entry=await import(${JSON.stringify(pathToFileURL(join(dir,'api/index.js')).href)});console.log(typeof entry.default);`;
    const result=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:root,env:{...process.env,VERCEL:'1',EARTHSHIFT_BACKEND_URL:'https://backend.example.invalid'},encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/function/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
