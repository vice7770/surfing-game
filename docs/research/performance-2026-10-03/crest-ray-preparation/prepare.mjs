import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { resolve, relative, dirname } from 'node:path';
import { sha, requireTrue, configGuard, countGuard, expectedAssets } from './guard.mjs';
const dir='/private/tmp/crest-ray-prepare-cost-20261003';
const repo='/Users/regina/Desktop/Projects/surfing-game';
const root='/private/tmp/rich-patch-quality-v2-20261003';
const frozen='/private/tmp/surf-tube-stability-current-20261003';
const target=dir+'/guard-manifest.json';
requireTrue(!existsSync(target),'Refuse to overwrite prepared manifest');
const fixed={
 source:{path:root+'/baseline-held/source.json.gz',sha256:'10b2651ef6b7f2a6a701ec98f0e266fe411a3c2e2e3ada8190ddd1fea1ca2783'},
 held:{path:root+'/baseline-held/report.json',sha256:'b4ebf747f023c7f3790747bd059fef179f31b1c71cf4ce6253c4e630d76413dd'},
 fps:{path:root+'/baseline-fps.json',sha256:'528df2bb48ec60f8362c5c8e77c54e4110081b3b456a2f7091bfc5ed81d205fc'},
 meta:{path:root+'/baseline-adapter-meta.json',sha256:'f70dc637e04618042d8719340a37ee56f7a75171ae673afa89c0225a72aba3c9'},
 captureHelper:{path:'/private/tmp/rich-patch-held-helper-v2.mjs',sha256:'be839453b1555d33b5fd81f17ddf00ab15c327cc70caf0654a09af2823cffabc'}
};
const authority={};const bytes={};
for(const [name,record] of Object.entries(fixed)){const b=readFileSync(record.path);requireTrue(sha(b)===record.sha256,'Input hash mismatch: '+name);authority[name]={...record,bytes:b.length};bytes[name]=b;}
const raw=gunzipSync(bytes.source);requireTrue(sha(raw)==='c4e6987fdeb7a53aad9316efe299aa56b0118d297390ee3981c727bec04c0d4c','Raw source mismatch');
const source=JSON.parse(raw),held=JSON.parse(bytes.held),fps=JSON.parse(bytes.fps),meta=JSON.parse(bytes.meta);
requireTrue(held.valid===true && held.sourceCompressedSha256===authority.source.sha256 && held.sourceJsonSha256===sha(raw),'Held/source authority mismatch');
requireTrue(meta.variant==='baseline' && meta.productionEdited===false && meta.heldHelperSha256===authority.captureHelper.sha256,'Adapter authority mismatch');
requireTrue(fps.results.length===1,'Unexpected ordinary rows');const row=fps.results[0];
requireTrue(row.ordinaryConfigMatches===true && row.baselineComparable===true && row.comparisonFailures.length===0,'Ordinary guards failed');
configGuard(row.config);configGuard(row.observed.workerStart.config);configGuard(source.scalars.config);
requireTrue(row.observed.workerStart.rider===true && row.observed.workerStart.barrelCaseCount===4,'Contact/default-case construction mismatch');
requireTrue(row.observed.workerStart.renderSpacingValueIsUndefined===true && row.observed.workerStart.renderSpacingHasOwn===true,'Canonical undefined spacing request missing');
requireTrue(row.observed.renderSpacing===2 && row.observed.independentMaskSpacing===1 && row.observed.maxBatchSteps===1,'Observed ordinary spacing/batch mismatch');
requireTrue(source.scalars.waterGrid.spacing===2 && source.scalars.maskGrid.spacing===1,'Held grid mismatch');
const pack=source.arrays['snapshot.front'];requireTrue(pack.type==='Float32Array' && pack.byteLength===pack.length*4,'Missing exact F32 front pack');
const count=source.scalars.snapshotScalars.frontCount;countGuard(count,pack.length);
const front=Buffer.from(pack.base64,'base64');requireTrue(front.length===pack.byteLength && sha(front)===pack.sha256,'Packed front byte hash mismatch');
if(existsSync(dir+'/front.bin')) requireTrue(readFileSync(dir+'/front.bin').equals(front),'Retained front extraction changed'); else writeFileSync(dir+'/front.bin',front,{flag:'wx'});
const artifacts=[];for(const record of fps.artifact.files){const path=resolve(frozen,record.file);requireTrue(path.startsWith(frozen+'/'),'Artifact path escape');const b=readFileSync(path);requireTrue(sha(b)===record.sha256,'Frozen artifact mismatch: '+record.file);artifacts.push({path,bytes:b.length,sha256:record.sha256});}
requireTrue(fps.artifact.root===frozen && meta.dir===frozen,'Frozen root mismatch');
const sourceManifest=readFileSync(meta.sourceAuthority.manifestPath);requireTrue(sha(sourceManifest)===meta.sourceAuthority.manifestSha256,'552-file source manifest mismatch');
const cases=expectedAssets.map(file=>{const path=resolve(frozen,file),b=readFileSync(path);const reference=execFileSync('git',['show','1bcc7c0c9:public/'+file],{cwd:repo,maxBuffer:8*1024*1024});requireTrue(b.equals(reference),'Immutable default asset differs from source ref: '+file);return{file,path,bytes:b.length,sha256:sha(b),sameAsCanonicalPublic:true};});
const require=createRequire(repo+'/package.json');
const compilerPath=require.resolve('typescript'),ts=require('typescript');
const compilerOptions={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,moduleResolution:ts.ModuleResolutionKind.Node10,useDefineForClassFields:true,sourceMap:false,declaration:false,removeComments:false};
const modules=[],compiled=[],retainedSources=[],seen=new Set();
function compile(path,isEntry=false){
  path=resolve(path);if(seen.has(path))return;seen.add(path);
  const b=readFileSync(path);let rel;
  if(!isEntry){
    requireTrue(path.startsWith(repo+'/src/'),'Unexpected runtime dependency outside pure original source: '+path);
    rel=relative(repo,path);
    const reference=execFileSync('git',['show','1bcc7c0c9:'+rel],{cwd:repo,maxBuffer:8*1024*1024});
    requireTrue(b.equals(reference),'Original pure source differs from 1bcc: '+rel);
    modules.push({path,file:rel,bytes:b.length,sha256:sha(b),sameAsCanonical:true});
    const retained=dir+'/retained-original/'+rel;mkdirSync(dirname(retained),{recursive:true});writeFileSync(retained,b);
    retainedSources.push({path:retained,bytes:b.length,sha256:sha(b)});
  }
  const result=ts.transpileModule(b.toString('utf8'),{fileName:path,compilerOptions,reportDiagnostics:true});
  const errors=result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error)??[];
  requireTrue(errors.length===0,'Type-erasure syntax errors: '+path);
  let code=result.outputText;
  const requests=[...code.matchAll(/require\(["']([^"']+)["']\)/g)].map(m=>m[1]);
  for(const request of requests){
    const resolved=ts.resolveModuleName(request,path,compilerOptions,ts.sys).resolvedModule;
    requireTrue(resolved?.resolvedFileName,'Unresolved original import: '+request);
    requireTrue(resolved.resolvedFileName.startsWith(repo+'/src/'),'Runtime import outside original pure graph: '+request);
    compile(resolved.resolvedFileName);
    if(isEntry){const output='./oracle/'+relative(repo,resolved.resolvedFileName).replace(/\.ts$/,'.js');code=code.replaceAll('require('+JSON.stringify(request)+')','require('+JSON.stringify(output)+')');}
  }
  const out=isEntry?dir+'/original-module.cjs':dir+'/oracle/'+rel.replace(/\.ts$/,'.js');
  mkdirSync(dirname(out),{recursive:true});writeFileSync(out,code);
  compiled.push({path:out,bytes:Buffer.byteLength(code),sha256:sha(Buffer.from(code)),sourcePath:path,arithmeticChanges:false,transformation:'TypeScript type erasure, ES2022/CommonJS; original methods unmodified'});
}
compile(dir+'/entry.ts',true);
const generated=['entry.ts','original-module.cjs','guard.mjs','driver.mjs','prepare.mjs','guard.test.mjs','range-selector-proof.md'].map(file=>{const path=dir+'/'+file,b=readFileSync(path);return{path,bytes:b.length,sha256:sha(b)};});
const manifest={schema:1,preparedOnly:true,numericalExecution:false,timingExecuted:false,canonicalRef:'1bcc7c0c9',root:repo,frozenRoot:frozen,authority,rawSource:{bytes:raw.length,sha256:sha(raw)},sourceAuthorityManifest:{path:meta.sourceAuthority.manifestPath,bytes:sourceManifest.length,sha256:sha(sourceManifest)},artifactSummarySha256:fps.artifact.sha256,artifacts,cases,modules,compiled,retainedSources,compiler:{path:compilerPath,bytes:readFileSync(compilerPath).length,sha256:sha(readFileSync(compilerPath)),version:ts.version,options:compilerOptions},generated,front:{path:dir+'/front.bin',bytes:front.length,sha256:sha(front),type:pack.type,length:pack.length,count,activeBytes:count*9*4},fixture:{config:source.scalars.config,seaTime:source.scalars.status.seaTime,compute:source.scalars.status.compute,cells:source.scalars.status.cells,renderGrid:source.scalars.waterGrid,maskGrid:source.scalars.maskGrid,retainedContactMs:source.scalars.status.pipelineMs.contact},ordinary:{edition:fps.ordinary.edition,renderedFps:row.renderedFps,freshSnapshotsPerSecond:row.freshSnapshotsPerSecond},params:{slope:1/19,extension:1.5,spacing:.5,minSpacing:(.5*.5*(2*1.5))/(2*1.5+.5),samples:134,maxSlices:298},schedule:{warm:5,measured:30,finalDiagnosticPass:1,operationDeadlineMs:10000,processDeadlineMs:30000},rangeSelector:{kind:'untimed original contact build with neutral still-level callback',heightOutputIsGeometryAuthority:false,proofPath:dir+'/range-selector-proof.md'},limitations:['Actual start observer captured barrelCaseCount4 but not original request asset bytes/hashes. Library uses frozen immutable default assets byte-equal to canonical public assets, under original guarded loader/index contract.','One held fixture only. No borrowed-plan implementation, correctness replay, source chronology, contact geometry quality, renderer measurement or FPS saving is inferred.']};
writeFileSync(target,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({preparedOnly:true,timingExecuted:false,manifest:target,manifestSha256:sha(readFileSync(target)),front:manifest.front,modules:modules.length,assets:cases.length}));
