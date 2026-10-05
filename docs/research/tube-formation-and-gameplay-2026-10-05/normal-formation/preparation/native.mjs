// Root-armed first normal UI session. Production line controls are forwarded unchanged.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { launch } from '/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/native-owned.mjs';
import { prepareMenu } from '/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/menu-startup.mjs';
import { createWitnessSampler } from '/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/body-witnesses.mjs';
import { nearestIndexedFormed } from '/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/control-policy.mjs';
import { installFollowerCamera } from '/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/follower-camera.mjs';
import { createLoftSnapshotTools } from '/private/tmp/tube-pop-up-contact-native-v6-20261005/loft-snapshot-tools.mjs';
import { installProductionRider } from './rider-driver.mjs';
import { createProductionSnapshotTools } from './snapshot-tools.mjs';
import { createProductionEvidenceProjection } from './evidence-projection.mjs';
import { createMouthCameraInspection } from './mouth-camera.mjs';
const W='/private/tmp/tube-c-formation-autopilot-native-20261005', DT=1/60;
const args=Object.fromEntries(process.argv.slice(2).map(value=>{const [key,...rest]=value.replace(/^--/,'').split('=');return[key,rest.join('=')];}));
assert.equal(args.run,'true');assert.equal(args.arm,'candidate');assert.equal(args.url,'http://127.0.0.1:4301/?diagnostics');assert.equal(resolve(args.out),join(W,'candidate-first'));
const sealBytes=readFileSync(join(W,'seal.json')),seal=JSON.parse(sealBytes),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(sealBytes),process.env.PRODUCTION_OWNER_SEAL_SHA);assert.equal(seal.schema,'c-formation-autopilot-root-seal/v1');assert(seal.rootAuthorized&&seal.complete);
mkdirSync(args.out,{recursive:false});const OUT=resolve(args.out),started=performance.now();
const report={schema:'c-formation-autopilot-native/v1',complete:false,firstFailure:null,sealSha256:hash(sealBytes),approvedApplicationBuild:seal.approvedApplicationBuild,approvedDiagnosticBuild:seal.approvedDiagnosticBuild,applicationBuildRequest:null,
 diagnosticModule:seal.diagnosticModule,sourcePolicy:'Exact selected C formation trial with raw-normal Board and passive143 diagnostics; no runtime or shader change by this harness',
 policy:{startup:'First actual menu Padang Big/Mid/Calm/Midday session',seed:'One unsearched normal UI seed; no subsequent diagnostic.start',comparison:'Distinct unmatched normal UI seed gameplay observation; not a paired causal comparison',controller:'new Autopilot({style:line}); returned input unchanged; true config.tide',noPlacement:true,noRetry:true,noPilotGoOrReset:true,noOverlay:true},
 schedule:{maximumSteps:7200,maximumPhysicalSeconds:120,fixedStepSeconds:DT,nativeMilliseconds:1775000,startupMilliseconds:180000,stop:'First fall/recover/separation/resets increase, production pilot done, finite ceiling or failure'},
 detector:{samplingStride:6,maximumCumulativeMilliseconds:20000,limitedBodyWitnessOnly:true,fullBodyPassageClaim:false},
 videoContract:{start:'First actual standing output',maximumPhysicalSeconds:20,requestStride:3,maximumRequests:401,maximumBytes:16777216,maximumClips:1,wallTimeEncoding:true,fpsClaim:false},
 caps:seal.limits,steps:[],stepCount:0,checkpoints:[],loftSnapshots:[],snapshotBytes:0,pngCount:0,pngBytes:0,artifacts:[],browserErrors:[],
 firstPopUp:null,firstStanding:null,firstWitnessEntry:null,entry:{observedStandingOutside:false,firstPartial:null,containmentWithoutObservedOutside:null,samples:[],sampledResidenceIntervals:[],fullBodyPassageClaim:false},
 mouth:{attempts:0,captured:false,lastUnavailable:null,cadence:'Initial and every30 completed ordinary steps; first eligible at this cadence, not earliest physical epoch',geometryOnly:true,riderPassageClaim:false},video:null,videoTrigger:null,videoRequests:[],videoAbsentReason:null,
 evidenceProjection:'Exact active Float64 board/rider bytes; compact post-step status/wave/input/pilot/camera, no per-row contact graphs. Full contact retained only in bounded checkpoints.',
 limitations:['Distinct unmatched normal UI seed gameplay observation; not a paired causal comparison with previous captures.','Deterministic one-step control evaluation differs from UI RAF batching; not an uncontrolled real-time replay or FPS benchmark.','Production line aims toward the gauge open face, not a C cavity target.','Geometry-only cloned-camera mouth image is not actor approach/passage evidence.','Witness sampling is10Hz with finite detector budget; absent/ambiguous/exhausted samples are unknown.','First-only finite attempt, with no success filtering or relaunch.']};
let traceBytes=0,page,exitCode=0,videoStart=null,videoDone=false,residence=null;
function save(){report.stepCount=report.steps.length;const bytes=Buffer.from(JSON.stringify(report));assert(bytes.length<=33554432,'32MiB report cap');writeFileSync(join(OUT,'report.json'),bytes);}
function persist(row){const bytes=Buffer.from(JSON.stringify(row)+'\n');assert(traceBytes+bytes.length<=25165824,'24MiB trace cap');appendFileSync(join(OUT,'steps.ndjson'),bytes);traceBytes+=bytes.length;report.steps.push(row);}
function externalize(data,label){
 const snapshot=data.loftSnapshot;
 if(snapshot){const bytes=Buffer.from(JSON.stringify(snapshot));assert(report.loftSnapshots.length<4&&bytes.length<=6291456&&report.snapshotBytes+bytes.length<=25165824,'Four complete sidecar cap');
  const file='loft-'+label+'.json';writeFileSync(join(OUT,file),bytes);const stub={file,bytes:bytes.length,sha256:hash(bytes),schema:snapshot.schema,label,epoch:snapshot.epoch,counts:snapshot.counts,rawBytes:snapshot.rawBytes,nonmutation:snapshot.nonmutation,
   arrayManifest:Object.fromEntries(Object.entries(snapshot.arrays).map(([key,value])=>[key,Object.fromEntries(Object.entries(value).filter(([name])=>name!=='data'))]))};
  report.snapshotBytes+=bytes.length;report.loftSnapshots.push(stub);data.loftSnapshot=stub;
 }
 const url=data.pngDataUrl;delete data.pngDataUrl;assert(url?.startsWith('data:image/png;base64,'),'Actual PNG URL');
 const png=Buffer.from(url.slice(22),'base64');assert(png.length>8&&png.length<=12582912&&report.pngCount<6&&report.pngBytes+png.length<=50331648,'Six PNG count/existing48MiB total cap');
 assert(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));assert(Buffer.byteLength(JSON.stringify(data))<=524288,'512KiB checkpoint metadata cap');
 const file=`${String(report.pngCount).padStart(2,'0')}-${label}.png`;writeFileSync(join(OUT,file),png);report.artifacts.push({file,bytes:png.length,sha256:hash(png)});report.pngCount++;report.pngBytes+=png.length;
 data.file=file;data.labels=[label];report.checkpoints.push(data);save();return data;
}
async function capture(label,full=false){
 const step=report.steps.at(-1)?.step??0,existing=report.checkpoints.find(value=>value.step===step&&value.view==='normal-production-follower');
 if(existing){if(!existing.labels.includes(label))existing.labels.push(label);if(full&&!existing.loftSnapshot){const data=await page.eval(`__productionEntry.checkpoint(${JSON.stringify(label)},true)`);delete data.pngDataUrl;const q=data.loftSnapshot,b=Buffer.from(JSON.stringify(q));assert(report.loftSnapshots.length<4&&b.length<=6291456&&report.snapshotBytes+b.length<=25165824);const file='loft-'+label+'.json';writeFileSync(join(OUT,file),b);const stub={file,bytes:b.length,sha256:hash(b),schema:q.schema,label,epoch:q.epoch,counts:q.counts,rawBytes:q.rawBytes,nonmutation:q.nonmutation,arrayManifest:Object.fromEntries(Object.entries(q.arrays).map(([k,v])=>[k,Object.fromEntries(Object.entries(v).filter(([n])=>n!=='data'))]))};report.snapshotBytes+=b.length;report.loftSnapshots.push(stub);existing.loftSnapshot=stub;}save();return;}
 externalize(await page.eval(`__productionEntry.checkpoint(${JSON.stringify(label)},${full})`),label);
}
async function inspectMouth(){report.mouth.attempts++;const data=await page.eval('__productionEntry.inspectMouth()');if(data.nonmutation?.checked)assert(data.nonmutation.unchanged&&data.nonmutation.normalRenderRestored,'Mouth inspection mutated public state or failed normal restoration');if(data.available){externalize(data,'formed-mouth');report.mouth.captured=true;report.mouth.checkpoint={step:data.step,seaTime:data.seaTime,file:data.file,geometryOnly:true};}else{report.mouth.lastUnavailable={step:report.steps.at(-1)?.step??0,reason:data.reason??'unavailable',stage:data.stage??null,geometryFailure:data.geometryFailure??false,nonmutation:data.nonmutation??null};if(data.geometryFailure)report.mouth.firstEligibleFailed=true;}}
async function finishClip(){
 if(videoStart===null||videoDone)return;report.video=await page.eval('__productionEntry.finishVideo()');const chunks=[];
 for(let offset=0;offset<report.video.bytes;offset+=524288){const length=Math.min(524288,report.video.bytes-offset),bytes=Buffer.from(await page.eval(`__productionEntry.videoChunk(${offset},${length})`),'base64');assert.equal(bytes.length,length);chunks.push(bytes);}
 const bytes=Buffer.concat(chunks);assert(bytes.length===report.video.bytes&&bytes.length<=16777216);if(bytes.length){assert(bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])));const file='standing-motion.webm';writeFileSync(join(OUT,file),bytes);report.artifacts.push({file,bytes:bytes.length,sha256:hash(bytes)});report.video.file=file;report.video.sha256=hash(bytes);}videoDone=true;save();
}
function track(row){
 if(row.ride.phase!=='standing'){if(residence){residence.endStep=row.step;residence.endReason='left-standing';residence=null;}return false;}
 if(!row.detector.measured)return false;
 const witness=row.witness,brief={step:row.step,seaTime:row.seaTime,classification:witness?.classification??'unknown',component:witness?.component??null};
 assert(report.entry.samples.length<=1201,'Bounded10Hz witness sample count');report.entry.samples.push(brief);
 if(witness?.classification==='outside')report.entry.observedStandingOutside=true;
 if(witness?.classification==='partial'&&!report.entry.firstPartial)report.entry.firstPartial=brief;
 const contained=witness?.contained===true;
 if(contained){if(!report.firstWitnessEntry){if(report.entry.observedStandingOutside)report.firstWitnessEntry=brief;else report.entry.containmentWithoutObservedOutside??=brief;}
  const component=brief.component,same=residence&&component?.front!=null&&component?.front===residence.component?.front&&Math.max(component.sigma[0],residence.component.sigma[0])<=Math.min(component.sigma[1],residence.component.sigma[1]);
  if(!same){if(residence){residence.endStep=row.step;residence.endReason='component-lineage-unknown';}residence={startStep:row.step,lastSampleStep:row.step,component,samples:0,observedPhysicalSeconds:0,endStep:null};report.entry.sampledResidenceIntervals.push(residence);}
  residence.samples++;residence.lastSampleStep=row.step;residence.observedPhysicalSeconds=(row.step-residence.startStep)*DT;
 }else if(residence){residence.endStep=row.step;residence.endReason='outside-or-ambiguous-sample';residence=null;}
 return contained&&report.firstWitnessEntry?.step===row.step;
}
save();
try{
 page=await launch({url:args.url,width:1708,height:966,port:9711,args:['--mute-audio']});
 page.on('Runtime.consoleAPICalled',event=>{if(event.type==='error'&&report.browserErrors.length<12)report.browserErrors.push(JSON.stringify(event.args).slice(0,2048));});
 page.on('Runtime.exceptionThrown',event=>{if(report.browserErrors.length<12)report.browserErrors.push(String(event.exceptionDetails?.exception?.description??event.exceptionDetails?.text).slice(0,2048));});
 await page.waitFor('window.breaklineDiagnostics && window.breaklineLab',20000);
 await page.waitFor("document.querySelector('.screen-menu') && !document.querySelector('.is-scene-pending')",45000);
 report.menuStartup=await page.eval(`(${prepareMenu.toString()})()`);
 await page.waitFor('document.querySelector("#app")?.dataset.screen==="pause" && document.querySelector("#app")?.dataset.base==="ride" && breaklineDiagnostics.mode.host?.snapshot.status.ride && !breaklineLab.active && breaklineLab.clock.paused',180000);
 report.applicationBuildRequest=await page.eval(`(async()=>{const response=await fetch('/build.json',{cache:'no-store'});if(!response.ok)throw Error('Application build request failed: HTTP '+response.status);const json=await response.json();if(json.build!=='tube-c-formation-20261005')throw Error('Unexpected application build: '+String(json.build));return {url:'/build.json',cache:'no-store',ok:response.ok,status:response.status,json,build:json.build,checkedBeforeHarnessStepping:true};})()`);
 assert.equal(report.applicationBuildRequest.ok,true);assert.equal(report.applicationBuildRequest.build,'tube-c-formation-20261005');assert.equal(report.applicationBuildRequest.json.build,'tube-c-formation-20261005');
 report.initial=await page.eval(`(async()=>{const d=breaklineDiagnostics,lab=breaklineLab;const begin=performance.now();while(d.mode.host.outstandingSteps){if(performance.now()-begin>=10000)throw Error('Initial menu drain deadline');await new Promise(r=>setTimeout(r,2));}await d.mode.sweptBarrel.ready;d.resize(1708,879);d.mode.update(0);d.renderView(d.mode.camera.camera);return {menuEvidence:window.__ordinaryMenuEvidence,config:JSON.parse(JSON.stringify(d.mode.config)),compute:d.mode.host.snapshot.status.compute,seaTime:d.mode.host.snapshot.status.seaTime,focus:{...d.mode.focus},homeView:d.mode.homeView,viewport:{inner:[innerWidth,innerHeight],dpr:devicePixelRatio,canvas:[d.canvas.width,d.canvas.height]},ordinaryFirstSession:true,diagnosticStartCalled:false};})()`);
 assert(report.initial.menuEvidence.actualDomStartup&&report.initial.menuEvidence.rideObserved&&report.initial.menuEvidence.popupNotForced&&report.initial.menuEvidence.normalSpawnPreserved);
 const config=report.initial.config;assert(config.spot==='padang'&&config.significantHeight===3.8&&config.peakPeriod===18&&config.directionDegrees===0&&config.tide===0&&config.windSpeed===0&&config.stage===2);assert(Number.isSafeInteger(config.seed)&&config.seed>=1&&config.seed<=9999);assert.deepEqual(report.initial.viewport.canvas,[1708,879]);
 report.normalMenuSeed=config.seed;await page.waitFor('!!breaklineDiagnostics.mode.surfer.skinned',10000);
 await page.eval(`(async()=>{const m=await import('/diagnostic-autopilot.mjs');(${installProductionRider.toString()})(m.Autopilot,m.autopilotView,m.riderPartVolumes,(${createWitnessSampler.toString()}),(${createLoftSnapshotTools.toString()}),(${createProductionSnapshotTools.toString()}),(${nearestIndexedFormed.toString()}),(${installFollowerCamera.toString()}),(${createProductionEvidenceProjection.toString()}),(${createMouthCameraInspection.toString()}));return true;})()`);
 report.initialBody=await page.eval('__productionEntry.current()');assert.equal(report.initialBody.ride.phase,'prone');await capture('initial',true);await inspectMouth();
 for(let i=0;i<7200;i++){
  assert(performance.now()-started<1775000,'1775s internal deadline; no extension/retry');
  const row=await page.eval('__productionEntry.step()');persist(row);
  if(row.ride.phase==='push'&&!report.firstPopUp){report.firstPopUp={step:row.step,seaTime:row.seaTime};await capture('first-pop-up');}
  if(row.ride.phase==='standing'&&!report.firstStanding){report.firstStanding={step:row.step,seaTime:row.seaTime};await capture('first-standing');const video=await page.eval('__productionEntry.beginVideo()');report.videoRequests.push(video.initialRequest);delete video.initialRequest;report.video=video;videoStart=row.step;report.videoTrigger={step:row.step,seaTime:row.seaTime,phase:'standing'};}
  if(track(row))await capture('first-entry',true);
  if(!report.mouth.captured&&!report.mouth.firstEligibleFailed&&row.step%30===0)await inspectMouth();
  if(videoStart!==null&&!videoDone&&row.step>videoStart&&(row.step-videoStart)%3===0){const request=await page.eval('__productionEntry.videoFrame()');if(request.requested)report.videoRequests.push(request);if(!request.requested||row.step-videoStart>=1200)await finishClip();}
  const stopped=row.ride.phase==='fallen'||row.ride.phase==='recover'||row.ride.separation||row.ride.resets>report.initialBody.ride.resets||row.pilot.state==='done';
  if(stopped){report.stop={kind:row.ride.resets>report.initialBody.ride.resets?'automatic-production-reset':row.pilot.state==='done'?'production-pilot-done':'first-fall-or-separation',step:row.step,phase:row.ride.phase,separation:row.ride.separation,pilot:row.pilot};break;}
  if(row.step%120===0){save();console.log(JSON.stringify({progressSteps:row.step,phase:row.ride.phase,pilot:row.pilot.state,mouth:report.mouth.captured,witnessEntry:!!report.firstWitnessEntry}));}
 }
 report.stop??={kind:'finite7200-step-ceiling',step:report.steps.length};await capture('terminal',true);await finishClip();
 if(!report.mouth.captured)report.mouth.unavailableAtAttemptEnd=true;
 if(videoStart===null)report.videoAbsentReason='No actual standing output occurred; no manufactured movie';
 const trace=readFileSync(join(OUT,'steps.ndjson'));report.artifacts.push({file:'steps.ndjson',bytes:trace.length,sha256:hash(trace)});
 assert.deepEqual(report.browserErrors,[],'Actual runtime/shader errors');report.complete=true;
}catch(error){report.firstFailure=String(error?.stack??error).slice(0,16384);exitCode=1;if(page)try{report.startupFailureEvidence=await page.eval(`({screen:document.querySelector('#app')?.dataset.screen??null,base:document.querySelector('#app')?.dataset.base??null,loading:document.querySelector('#loading')?.className??null,menu:globalThis.__ordinaryMenuEvidence??null,seaTime:globalThis.breaklineDiagnostics?.mode.host?.snapshot.status.seaTime??null})`);}catch(secondary){report.startupReadFailure=String(secondary).slice(0,2048);}}
finally{
 if(page){try{report.videoAbort=await page.eval('globalThis.__productionEntry?.abortVideo?.()??{started:false}');}catch(error){report.videoAbortError=String(error).slice(0,2048);}try{await page.close();report.ownedBrowserClose=true;}catch(error){report.ownedBrowserClose=false;report.closeFailure=String(error).slice(0,2048);exitCode=1;}}
 report.elapsedMilliseconds=performance.now()-started;save();
}
console.log(JSON.stringify({complete:report.complete,steps:report.steps.length,stop:report.stop,firstFailure:report.firstFailure}));process.exitCode=exitCode;
