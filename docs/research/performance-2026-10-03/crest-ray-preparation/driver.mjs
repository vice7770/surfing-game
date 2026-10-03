import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';
import { sha, requireTrue, configGuard, countGuard, readGuarded, expectedAssets, discoverRuns } from './guard.mjs';
const processStarted=Date.now();
const dir='/private/tmp/crest-ray-prepare-cost-20261003';
const self=fileURLToPath(import.meta.url);
const args=Object.fromEntries(process.argv.slice(2).map(arg=>{requireTrue(/^--[a-z-]+=/.test(arg),'Unsupported argument '+arg);const k=arg.indexOf('=');return[arg.slice(2,k),arg.slice(k+1)];}));
for(const key of Object.keys(args))requireTrue(['plan','validate','run','manifest-sha','out','internal-child'].includes(key),'Unexpected option '+key);
const manifestBytes=readFileSync(dir+'/guard-manifest.json');
const manifest=JSON.parse(manifestBytes);
const manifestSha256=sha(manifestBytes);
function authorityGuard(){
  requireTrue(manifest.schema===1 && manifest.timingExecuted===false && manifest.canonicalRef==='1bcc7c0c9','Unexpected manifest');
  for(const record of [...Object.values(manifest.authority),manifest.sourceAuthorityManifest,...manifest.artifacts,...manifest.cases,...manifest.modules,...manifest.compiled,...manifest.retainedSources,manifest.compiler,...manifest.generated])readGuarded(record);
  requireTrue(manifest.params.slope===1/19 && manifest.params.spacing===.5 && manifest.params.extension===1.5 && manifest.params.maxSlices===298 && manifest.params.samples===134,'Parameter manifest mismatch');
  requireTrue(JSON.stringify(manifest.cases.map(c=>c.file))===JSON.stringify(expectedAssets),'Immutable case order mismatch');
  requireTrue(manifest.front.type==='Float32Array' && manifest.front.bytes===manifest.front.length*4,'Front type/byte length mismatch');
  countGuard(manifest.front.count,manifest.front.length);configGuard(manifest.fixture.config);
  requireTrue(Number.isFinite(manifest.fixture.seaTime) && manifest.fixture.compute==='gpu' && manifest.fixture.cells===116000,'Retained ordinary solver/clock mismatch');
  requireTrue(manifest.fixture.renderGrid.spacing===2 && manifest.fixture.maskGrid.spacing===1,'Retained ordinary grids mismatch');
  requireTrue(manifest.schedule.warm===5 && manifest.schedule.measured===30 && manifest.schedule.finalDiagnosticPass===1 && manifest.schedule.operationDeadlineMs===10000 && manifest.schedule.processDeadlineMs===30000,'Predeclared schedule mismatch');
  return readGuarded(manifest.front);
}
function save(path,report){writeFileSync(path,JSON.stringify(report,null,2)+'\n');}
function summarise(values){const sorted=[...values].sort((a,b)=>a-b);const quantile=q=>sorted[Math.max(0,Math.ceil(q*sorted.length)-1)];return{samples:values.length,mean:values.reduce((a,b)=>a+b,0)/values.length,p50:quantile(.5),p95:quantile(.95),max:sorted.at(-1)};}
async function child(){
  const startedAt=new Date().toISOString();const deadline=Date.now()+manifest.schedule.operationDeadlineMs;
  const within=()=>requireTrue(Date.now()<=deadline,'Operation deadline exceeded');
  const report={schema:1,kind:'CPU-only CrestRayPlan.prepareRecords isolated cost',startedAt,status:'incomplete',phase:'authority',manifestSha256,authority:manifest.authority,fixture:manifest.fixture,front:manifest.front,cases:manifest.cases,modules:manifest.modules,schedule:manifest.schedule,selector:manifest.rangeSelector,limitations:manifest.limitations,rawElapsedMs:[]};
  try{
    const frontBytes=authorityGuard();within();
    const front=new Float32Array(Uint8Array.from(frontBytes).buffer);const count=manifest.front.count;
    const original=createRequire(import.meta.url)(dir+'/original-module.cjs');within();
    const {CrestRayPlan,SweptLoft,libraryFromBytes,barrelCasesFor,BARREL_SLOPE,LOFT,LOFT_SAMPLES,FRONT_FIELD,FRONT_STRIDE,minimumCrestRaySpacing}=original;
    requireTrue(FRONT_STRIDE===9 && LOFT_SAMPLES===134 && LOFT.spacing===.5 && LOFT.extension===1.5 && BARREL_SLOPE.padang===1/19,'Original constructor constants mismatch');
    const minSpacing=minimumCrestRaySpacing(LOFT.extension,LOFT.spacing);requireTrue(minSpacing===manifest.params.minSpacing,'Original minimum spacing mismatch');
    const entries=barrelCasesFor('padang');requireTrue(JSON.stringify(entries.map(e=>e.asset))===JSON.stringify(expectedAssets),'Original loader/index asset order mismatch');
    const library=libraryFromBytes(manifest.cases.map(record=>new Uint8Array(readGuarded(record))));
    requireTrue(library.cases.length===4,'Decoded library case count mismatch');
    report.decodedLibrary=library.cases.map(c=>({id:c.id,slope:c.slope,nonlinearity:c.nonlinearity,framesLength:c.frames.length,framesSha256:sha(new Uint8Array(c.frames.buffer,c.frames.byteOffset,c.frames.byteLength)),tipVelocitySha256:c.tipVelocity?sha(new Uint8Array(c.tipVelocity.buffer,c.tipVelocity.byteOffset,c.tipVelocity.byteLength)):null}));
    within();report.phase='untimed-original-contact-range-selector';save(args.out,report);
    const discovered=discoverRuns(front,count,FRONT_FIELD,FRONT_STRIDE);
    const visited=[];const originalPrepare=CrestRayPlan.prototype.prepareRecords;
    const selectedLoft=new SweptLoft(library,BARREL_SLOPE.padang,{contact:true});
    const actualDiscovered=selectedLoft.fronts(front,count);
    requireTrue(JSON.stringify(actualDiscovered)===JSON.stringify(discovered),'Contiguous range guard differs from original discovery');
    const wrapper=function(records,start,end){
      requireTrue(records===front,'Selector changed packed front object');
      const result=originalPrepare.call(this,records,start,end);
      visited.push({start,end,diagnostics:{...this.diagnostics}});
      return result;
    };
    CrestRayPlan.prototype.prepareRecords=wrapper;
    try { selectedLoft.build(front,count,manifest.fixture.config.tide,()=>manifest.fixture.config.tide); }
    finally { CrestRayPlan.prototype.prepareRecords=originalPrepare; }
    requireTrue(CrestRayPlan.prototype.prepareRecords===originalPrepare,'Selector method restoration failed');
    requireTrue(visited.length>0 && visited.length<=discovered.length,'No measurable visited contact runs');
    for(let i=0;i<visited.length;i++)requireTrue(visited[i].start===discovered[i].start && visited[i].end===discovered[i].end,'Visited ranges are not original budgeted source-order prefix');
    const ranges=visited.map((scope,i)=>({...discovered[i],diagnostics:scope.diagnostics,recordsSha256:sha(new Uint8Array(front.buffer,scope.start*FRONT_STRIDE*4,(scope.end-scope.start)*FRONT_STRIDE*4))}));
    report.rangeSelection={kind:'original contact build scopes',heightAt:'constant retained tide; range selection only, geometry discarded',heightDependentGeometryIsNotRetained:true,discovered,visited:ranges,visitedControls:ranges.reduce((a,r)=>a+r.end-r.start,0),skippedByBudget:discovered.length-visited.length,transportPrefixAtCapacity:count===front.length/FRONT_STRIDE};
    within();report.phase='warmup';save(args.out,report);
    const plan=new CrestRayPlan(library,BARREL_SLOPE.padang,LOFT.extension,minSpacing);
    const warmStart=performance.now();
    for(let pass=0;pass<manifest.schedule.warm;pass++){within();for(let i=0;i<ranges.length;i++)plan.prepareRecords(front,ranges[i].start,ranges[i].end);}
    report.warmupElapsedMs=performance.now()-warmStart;
    within();report.phase='timing';save(args.out,report);
    const elapsed=new Float64Array(manifest.schedule.measured);
    for(let pass=0;pass<elapsed.length;pass++){
      within();const begin=performance.now();
      for(let i=0;i<ranges.length;i++)plan.prepareRecords(front,ranges[i].start,ranges[i].end);
      const end=performance.now();elapsed[pass]=end-begin;
      report.rawElapsedMs.push(elapsed[pass]);
    }
    within();report.phase='untimed-final-diagnostics';
    const final=[];
    for(const r of ranges){plan.prepareRecords(front,r.start,r.end);final.push({...plan.diagnostics});}
    requireTrue(JSON.stringify(final)===JSON.stringify(ranges.map(r=>r.diagnostics)),'Repeat preparation diagnostics changed');
    requireTrue(sha(new Uint8Array(front.buffer))===manifest.front.sha256,'Original packed bytes mutated');
    report.finalDiagnostics=final;report.inputByteIdentity=true;
    report.totalPrepareMsPerOriginalContactRangeSequence=summarise(report.rawElapsedMs);
    report.exclusions=['Library/case decoding and authored-envelope construction','Plan constructor and first capacity growth','One untimed neutral-height original contact scope selector','Per-range timers, logging/hashing, rayAt/profile lookup/water interpolation outside source preparation','One final untimed diagnostic pass'];
    report.inference='Preparation-only cost of one retained native ordinary F32 front fixture; no state-sharing implementation, original contact geometry replay, numerical quality, chronology or FPS inference.';
    report.phase='complete';report.status='complete';report.finishedAt=new Date().toISOString();within();save(args.out,report);
  }catch(error){report.error=String(error?.stack??error);report.finishedAt=new Date().toISOString();save(args.out,report);process.exitCode=1;}
  console.log(JSON.stringify({status:report.status,phase:report.phase,out:args.out,measuredSamples:report.rawElapsedMs.length,summary:report.totalPrepareMsPerOriginalContactRangeSequence,error:report.error?.split('\n')[0]}));
}
if(args['internal-child']==='true'){
  requireTrue(args.run==='true' && args['manifest-sha']===manifestSha256 && args.out,'Internal child authority missing');await child();
}else if(args.run==='true'){
  requireTrue(args['manifest-sha']===manifestSha256,'Explicit reviewed manifest hash is required');
  requireTrue(args.out && args.out.startsWith(dir+'/') && !existsSync(args.out),'Require a fresh owned output path');
  try { authorityGuard(); requireTrue(Date.now()-processStarted<manifest.schedule.processDeadlineMs,'Process deadline exceeded during authority checks'); }
  catch(error){save(args.out,{schema:1,status:'incomplete',phase:'parent-authority',manifestSha256,error:String(error?.stack??error)});throw error;}
  const remaining=Math.max(1,manifest.schedule.processDeadlineMs-(Date.now()-processStarted));
  const result=spawnSync(process.execPath,[self,'--internal-child=true','--run=true','--manifest-sha='+manifestSha256,'--out='+args.out],{cwd:manifest.root,encoding:'utf8',timeout:remaining,maxBuffer:1024*1024});
  if(result.error || result.signal){const retained=existsSync(args.out)?JSON.parse(readFileSync(args.out)):{};save(args.out,{...retained,status:'incomplete',processFailure:{error:String(result.error??''),signal:result.signal,status:result.status,stdout:result.stdout,stderr:result.stderr},manifestSha256});}
  process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');process.exitCode=result.status===0 && !result.error && !result.signal?0:1;
}else if(args.validate==='true'){
  const front=authorityGuard();console.log(JSON.stringify({valid:true,timingExecuted:false,numericalSelectorExecuted:false,manifestSha256,source:manifest.authority.source,front:manifest.front,assets:manifest.cases.length,originalSourceModules:manifest.modules.length,frontBytesVerified:front.length}));
}else{
  requireTrue(args.plan===undefined || args.plan==='true','Unsupported nonexecution mode');
  console.log(JSON.stringify({planOnly:true,timingExecuted:false,numericalSelectorExecuted:false,manifestSha256,source:manifest.authority.source,front:manifest.front,rangeSelector:manifest.rangeSelector,schedule:manifest.schedule,command:'node '+self+' --run=true --manifest-sha='+manifestSha256+' --out='+dir+'/measurement.json'}));
}
