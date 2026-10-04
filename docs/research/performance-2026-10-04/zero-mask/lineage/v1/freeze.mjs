// Future ROOT-only source freeze / original compiled-output binding; never builds or launches.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
const WORK='/private/tmp/surf-wavelab-passive-original-20261004', REPO='/Users/regina/Desktop/Projects/surfing-game';
const names=['README.md','plan.json','freeze.mjs','native-owned.mjs','page-prelude.js','capture.mjs','native-driver.py'];
const hash=b=>createHash('sha256').update(b).digest('hex');
function record(path) { const p=resolve(path); assert(lstatSync(p).isFile()&&!lstatSync(p).isSymbolicLink()); assert.equal(realpathSync(p),p); const b=readFileSync(p); return {path:p,bytes:b.length,sha256:hash(b)}; }
function verify(r) { assert.deepEqual(record(r.path),r); }
function walk(root) { assert(lstatSync(root).isDirectory()&&!lstatSync(root).isSymbolicLink()); const out=[]; for(const n of readdirSync(root).sort()) { const p=join(root,n),s=lstatSync(p); assert(!s.isSymbolicLink(),p); if(s.isDirectory())out.push(...walk(p));else {assert(s.isFile());out.push(p);} } return out; }
function save(name,value) { writeFileSync(join(WORK,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'}); }
const bind=process.argv.slice(2); assert(bind.length===0||JSON.stringify(bind)===JSON.stringify(['--bind-runtime=true']));
const readyPath=join(WORK,'ready.json');
if(bind.length===0) {
  assert.equal(process.env.ROOT_PASSIVE_SOURCE_REVIEWED,'true'); assert(!existsSync(readyPath)); assert(!existsSync(join(WORK,'source')));
  const helpers=names.map(n=>record(join(WORK,n))), plan=JSON.parse(readFileSync(join(WORK,'plan.json'),'utf8'));
  assert.equal(plan.rawTypedBytes,96*1024*1024);assert.equal(plan.allOutputBytes,384*1024*1024);assert.equal(plan.logBytes,1024*1024);
  assert.equal(plan.nativeLogBytes,512*1024);assert.equal(plan.driverLogBytes,512*1024);assert.equal(plan.driverReceiptBytes,128*1024);
  assert(readFileSync(join(REPO,'src/wave/SurfZoneSimulation.ts'),'utf8').includes('export const SEA_COMPONENTS = 24;'),'Frozen source default24 required');
  assert.deepEqual(plan.targetsSeconds,[0,5,10,15,20,25,30,35,40]);assert.deepEqual(plan.allowedOwnedPorts,[4259,9669]);assert.equal(plan.commandSeconds,175);assert.equal(plan.wholeSeconds,180);
  const inputs=[...walk(join(REPO,'src')), ...['index.html','package.json','package-lock.json','tsconfig.json','vite.config.ts'].map(n=>join(REPO,n)), ...walk(join(REPO,'public'))];
  const sourceFiles=inputs.map(record);for(const r of sourceFiles) { const rel=relative(REPO,r.path);assert(rel&&!rel.startsWith('..'));const dst=join(WORK,'source',rel);mkdirSync(dirname(dst),{recursive:true});copyFileSync(r.path,dst);assert.equal(hash(readFileSync(dst)),r.sha256); }
  const cdp=record(join(REPO,'scripts/browser/cdp.mjs'));copyFileSync(cdp.path,join(WORK,'borrowed-cdp.mjs'));const borrowed=record(join(WORK,'borrowed-cdp.mjs'));assert.equal(cdp.sha256,borrowed.sha256);
  save('ready.json',{schema:'wavelab-passive-original-ready/v1',createdAt:new Date().toISOString(),helpers,sourceFiles,cdp,borrowed,sourceTree:join(WORK,'source'),scope:'Unchanged original source/public/build inputs; no virtual replacement, import, build or native launch by freeze'});
  console.log(JSON.stringify({sourceFrozen:true,ready:readyPath,files:sourceFiles.length,hash:hash(readFileSync(readyPath))}));
} else {
  assert.equal(process.env.ROOT_PASSIVE_BUILD_REVIEWED,'true');assert(!existsSync(join(WORK,'bindings.json')));
  const ready=JSON.parse(readFileSync(readyPath,'utf8')),readyPin=record(readyPath);for(const r of [...ready.helpers,ready.borrowed,ready.cdp,...ready.sourceFiles])verify(r);
  for(const r of ready.sourceFiles) { const copied=record(join(WORK,'source',relative(REPO,r.path)));assert.equal(copied.bytes,r.bytes);assert.equal(copied.sha256,r.sha256); }
  const receipts=['syntax-receipt.json','build-receipt.json'].map(n=>record(join(WORK,n)));
  for(const pin of receipts) { const r=JSON.parse(readFileSync(pin.path,'utf8'));assert.equal(r.valid,true);assert.equal(r.readySha256,readyPin.sha256);assert(typeof r.command==='string'&&r.command.length>0);assert(r.startedAt&&r.endedAt); }
  const dist=join(WORK,'dist');const compiledFiles=walk(dist).map(p=>({...record(p),relativePath:relative(dist,p)}));assert(compiledFiles.length>0);assert(compiledFiles.some(r=>r.relativePath==='index.html'));
  const workers=compiledFiles.filter(r=>/^assets\/surfZoneWorker-[^/]+\.js$/.test(r.relativePath));assert.equal(workers.length,1,'Sole original compiled worker required');
  save('bindings.json',{schema:'wavelab-passive-original-bindings/v1',valid:true,originalSource:true,ready:readyPin,receipts,compiledFiles,worker:workers[0].relativePath,createdAt:new Date().toISOString()});
  console.log(JSON.stringify({runtimeBound:true,files:compiledFiles.length,worker:workers[0].relativePath,hash:hash(readFileSync(join(WORK,'bindings.json')))}));
}
