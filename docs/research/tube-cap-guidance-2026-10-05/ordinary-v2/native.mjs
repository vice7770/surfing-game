// Root-owned finite native observation. No private actor placement or geometry camera.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { launch } from '/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/native-owned.mjs';
import { prepareMenu } from '/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/menu-startup.mjs';
import { installFollowerCamera } from '/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/follower-camera.mjs';
import { createGuidedControl } from './control-policy.mjs';
import { createBodyMeshClassifier } from './body-mesh.mjs';
import { createTrialCriteria } from './criteria.mjs';
import { createLoftSnapshotTools } from './loft-snapshot-tools.mjs';
import { installGuidedRider } from './rider-driver.mjs';
const W='/private/tmp/tube-guided-ordinary-v2-native-20261005',inputs=JSON.parse(readFileSync(W+'/inputs.json'));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const args=Object.fromEntries(process.argv.slice(2).map(value=>{const i=value.indexOf('=');assert(value.startsWith('--')&&i>2);return[value.slice(2,i),value.slice(i+1)];}));
assert.equal(args.run,'true');assert.equal(args.url,'http://127.0.0.1:4301/?diagnostics');assert.equal(resolve(args.out),W+'/candidate-first');
const sealBytes=readFileSync(W+'/seal.json'),seal=JSON.parse(sealBytes);assert.equal(hash(sealBytes),process.env.GUIDED_OWNER_SEAL_SHA);assert.equal(seal.schema,'guided-ordinary-seal/v2');assert(seal.rootAuthorized&&seal.complete);
assert.equal(inputs.pilot.style,'tube');assert.equal(inputs.overrides.seed,6238);assert.equal(inputs.limits.steps,1800);assert.equal(inputs.limits.wallSeconds,660);
assert(!existsSync(args.out));mkdirSync(args.out);const OUT=join(W,'candidate-first'),started=performance.now();let page,exitCode=0,traceBytes=0,pngBytes=0,loftBytes=0,last=null;
writeFileSync(join(OUT,'steps.ndjson'),'');
const report={schema:'guided-ordinary-native/v2',complete:false,firstFailure:null,sealSha256:hash(sealBytes),applicationBuild:seal.applicationBuild,sourceFreeze:seal.sourceFreeze,diagnosticBuild:seal.diagnosticBuild,
 settings:inputs.settings,overrides:inputs.overrides,graphics:inputs.graphics,pilot:inputs.pilot,limits:inputs.limits,criteria:inputs.criteria,
 policy:{ordinaryPublicInputs:true,publicMenuStartup:true,diagnosticSeedRestart:true,normalMenuSeedReachabilityClaim:false,noPlacement:true,noRetry:true,noPilotGo:true,noPrivateCueClock:true,
  noProneSteerZeroOverlay:true,noPostureCompressionTrimOverlay:true,tubeGuideForwarded:true,normalFollowerOnly:true,singleAttempt:true,noSeedOrCameraSearch:true,
  ordinaryWaterFallbackOnlyUndefinedOutsideAllIndexedCrossings:true,ordinaryWaterWholeRadiusFootprintRawNodeBound:true,cavityStillRequiresDefinedLoftAir:true,
  authoredSnapshotTrackDelayPreserved:true,maximumVisualInterpolationLagSeconds:1/60+1e-7,displayedPointsAdditionallyClassified:true,uniqueAcceptanceWitnessCount:21},
 menuSeedReachability:{evaluated:false,reason:'One predeclared seed6238 public diagnostic restart after ordinary menu/HUD startup; no menu-seed trajectory search or actor placement.'},
 stepCount:0,traceBytes:0,checkpoints:[],artifacts:[],browserErrors:[],pngCount:0,pngBytes:0,loftBytes:0,sequence:null,stop:null,
 limitations:['Acceptance covers seven current published render witnesses, seven current equivalent-volume physics spheres, and seven actual delayed displayed points against current indexed drawing geometry. The second classifier repeats the current spheres; the unique union is21. It does not enclose complete skin or limb segments.',
 'Connected mesh component and unambiguous columns do not prove connected air volume, shader displacement, rendered visibility, or worker contact-force correctness.',
 'Cues are recorded controller inputs; their bodyInCavity/fit/progress values are not independent acceptance.',
 'Fixed-sigma mouth transport and mature1.20m pair are independent geometry observations; no finite full-board swept route proof or FPS/reference-quality acceptance.']};
report.limitations.push('Outside indexed coverage only, the normal host bilinear/carved water field is bounded over each full radius footprint by current raw snapshot nodes. This does not certify the distinct Rich cubic/displaced shader surface or skin/limb segments.');
report.limitations.push('SnapshotTrack preserves its authored up-to-one-step delay. Displayed points use recorded visualPoseTime; current part spheres and drawn loft use worker seaTime. This conservative joint check is not a historical-water or post-inertia skin reconstruction.');
function save(){const raw=JSON.stringify(report,null,2)+'\n';assert(Buffer.byteLength(raw)<=inputs.limits.reportBytes);writeFileSync(join(OUT,'report.json'),raw);}
function artifact(file,raw){assert(!existsSync(join(OUT,file)));writeFileSync(join(OUT,file),raw);const result={file,bytes:raw.length,sha256:hash(raw)};report.artifacts.push(result);return result;}
async function checkpoint(label){
 assert(report.checkpoints.length<4&&!report.checkpoints.some(c=>c.label===label));
 const result=await page.eval(`__guidedOrdinary.checkpoint(${JSON.stringify(label)})`);
 assert(result.nonmutation.unchanged&&result.nonmutation.checkedLoftArrays===37&&Object.keys(result.loftSnapshot.arrays).length===37);
 const raw=Buffer.from(result.png.split(',')[1],'base64');assert(raw.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&raw.length<=inputs.limits.pngBytesEach);
 pngBytes+=raw.length;assert(pngBytes<=inputs.limits.pngBytesTotal);report.pngCount++;report.pngBytes=pngBytes;
 const index=String(report.checkpoints.length).padStart(2,'0');const png=artifact(index+'-'+label+'.png',raw);
 const loftRaw=Buffer.from(JSON.stringify(result.loftSnapshot)+'\n');assert(loftRaw.length<=inputs.limits.loftBytesEach);loftBytes+=loftRaw.length;assert(loftBytes<=inputs.limits.loftBytesTotal);report.loftBytes=loftBytes;
 const loft=artifact('loft-'+label+'.json',loftRaw);delete result.png;delete result.loftSnapshot;
 report.checkpoints.push({...result,png,loft});save();
}
function persist(row){const raw=JSON.stringify(row)+'\n';traceBytes+=Buffer.byteLength(raw);assert(traceBytes<=inputs.limits.traceBytes);appendFileSync(join(OUT,'steps.ndjson'),raw);report.stepCount=row.step;report.traceBytes=traceBytes;report.sequence=row.sequence;last=row;}
save();const deadline=setTimeout(()=>{report.firstFailure??='640s native deadline; no extension or retry';report.complete=false;try{save();}finally{process.exit(1);}},inputs.limits.nativeSeconds*1000);deadline.unref();
try{
 page=await launch({url:args.url,width:1708,height:966,port:9711,args:['--mute-audio']});
 page.on('Runtime.consoleAPICalled',event=>{if(event.type==='error'&&report.browserErrors.length<12)report.browserErrors.push((event.args??[]).map(a=>a.value??a.description??'').join(' ').slice(0,2048));});
 page.on('Runtime.exceptionThrown',event=>{if(report.browserErrors.length<12)report.browserErrors.push(String(event.exceptionDetails?.exception?.description??event.exceptionDetails?.text).slice(0,2048));});
 await page.eval(`localStorage.setItem('breakline.settings.v1',${JSON.stringify(JSON.stringify({graphics:inputs.graphics,detected:{preset:'high',water:'accurate',lowPerformance:false},seen:{rideHints:true,lowPerformanceNotice:true}}))})`);
 await page.send('Page.reload');await page.waitFor('window.breaklineDiagnostics && window.breaklineLab',20000);
 await page.waitFor("document.querySelector('.screen-menu') && !document.querySelector('.is-scene-pending')",45000);
 report.menuStartup=await page.eval(`(${prepareMenu.toString()})()`);
 await page.waitFor('document.querySelector("#app")?.dataset.screen==="pause" && document.querySelector("#app")?.dataset.base==="ride" && breaklineDiagnostics.mode.host?.snapshot.status.ride && !breaklineLab.active && breaklineLab.clock.paused',180000);
 report.applicationBuildRequest=await page.eval(`(async()=>{const r=await fetch('/build.json',{cache:'no-store'});if(!r.ok)throw Error('Build request HTTP '+r.status);const json=await r.json();if(json.build!==${JSON.stringify(inputs.buildId)})throw Error('Unexpected application build');return {build:json.build,status:r.status,checkedBeforeReplayAndStepping:true};})()`);
 report.normalMenuBeforeReplay=await page.eval(`({config:JSON.parse(JSON.stringify(breaklineDiagnostics.mode.config)),seaTime:breaklineDiagnostics.mode.host.snapshot.status.seaTime,boardPose:Array.from(breaklineDiagnostics.mode.host.snapshot.board.subarray(0,8)),riderWords:Array.from(breaklineDiagnostics.mode.host.snapshot.rider.subarray(0,33))})`);
 report.replayStartup=await page.eval(`(async()=>{const d=breaklineDiagnostics,lab=breaklineLab,root=document.querySelector('#app');if(root.dataset.screen!=='pause'||root.dataset.base!=='ride'||lab.active||!lab.clock.paused)throw Error('Actual menu/HUD hold required');const begin=performance.now();while(d.mode.host.outstandingSteps){if(performance.now()-begin>10000)throw Error('Menu drain timeout');await new Promise(r=>setTimeout(r,2));}await d.start(${JSON.stringify(inputs.settings)},${JSON.stringify(inputs.overrides)},{rider:true,lab:false});if(lab.active||!lab.clock.paused||root.dataset.screen!=='pause'||root.dataset.base!=='ride')throw Error('Public replay must preserve HUD hold');return {api:'breaklineDiagnostics.start',publicStartCalls:1,overrides:${JSON.stringify(inputs.overrides)},diagnosticOnly:true,noPlacementOrPrivateClockAssignment:true};})()`);
 report.initial=await page.eval(`(async()=>{const d=breaklineDiagnostics,lab=breaklineLab;const begin=performance.now();while(d.mode.host.outstandingSteps){if(performance.now()-begin>10000)throw Error('Replay drain timeout');await new Promise(r=>setTimeout(r,2));}await d.mode.sweptBarrel.ready;if(lab.active||!lab.clock.paused||d.mode.sweptBarrel.holdsClearDrawing!==true)throw Error('Actual held normal drawing required');d.resize(1708,879);d.mode.update(0);d.renderView(d.mode.camera.camera);return {menu:window.__ordinaryMenuEvidence,config:JSON.parse(JSON.stringify(d.mode.config)),seaTime:d.mode.host.snapshot.status.seaTime,compute:d.mode.host.snapshot.status.compute,canvas:[d.canvas.width,d.canvas.height]};})()`);
 assert(report.initial.menu.actualDomStartup&&report.initial.menu.rideObserved&&report.initial.menu.popupNotForced&&report.initial.menu.normalHudPaused&&report.initial.menu.activeLabDisabled);
 assert.deepEqual(report.initial.menu.selectedChoices,['Padang Padang','Big','Mid','Calm','Midday']);
 for(const[key,value]of Object.entries(inputs.overrides))assert.deepEqual(report.initial.config[key],value);assert.equal(report.initial.compute,'gpu');assert.deepEqual(report.initial.canvas,[1708,879]);
 await page.waitFor('!!breaklineDiagnostics.mode.surfer.skinned',10000);
 await page.eval(`(async()=>{const m=await import('/diagnostic-autopilot.mjs');(${installGuidedRider.toString()})(m.Autopilot,m.autopilotView,(${createGuidedControl.toString()}),(${createBodyMeshClassifier.toString()}),(${createTrialCriteria.toString()}),(${createLoftSnapshotTools.toString()}),(${installFollowerCamera.toString()}),${JSON.stringify(inputs.pilot)},${JSON.stringify(inputs.limits)});return true;})()`);
 report.initialBody=await page.eval('__guidedOrdinary.current()');assert.equal(report.initialBody.ride.phase,'prone');assert.equal(report.initialBody.pilot.attempts,0);await checkpoint('initial');
 for(let i=0;i<inputs.limits.steps;i++){
  assert(performance.now()-started<inputs.limits.nativeSeconds*1000,'Finite native ceiling');
  const row=await page.eval('__guidedOrdinary.step()');persist(row);
  assert(row.control.actualInputEqualsPilotOutput&&row.control.tubeGuideForwarded&&row.nonmutation.unchanged);
  if(row.sequence.entry&&!report.checkpoints.some(c=>c.label==='body-entry'))await checkpoint('body-entry');
  if(row.sequence.exit&&!report.checkpoints.some(c=>c.label==='intentional-exit'))await checkpoint('intentional-exit');
  if(row.step%60===0){save();console.log(JSON.stringify({step:row.step,phase:row.ride.phase,displayedPhase:row.displayedRiderPhase,interpolationLag:row.interpolationLag,pilot:row.pilot.phase,cue:row.ride.cue,guide:!!row.ride.tubeApproach,witness:row.witness?.classification??null,rendered:row.renderedWitness?.classification??null,union:row.unionWitness?.classification??null,sequenceStop:row.sequence.stop?.kind??null}));}
  if(row.sequence.stop)break;
 }
 report.sequence=await page.eval(`__guidedOrdinary.finish('finite1800-step-ceiling')`);report.stop=report.sequence.stop;
 await checkpoint('terminal');report.terminalBody=await page.eval('__guidedOrdinary.current()');assert.equal(report.terminalBody.step,report.stepCount);assert.deepEqual(report.browserErrors,[]);
 const trace=readFileSync(join(OUT,'steps.ndjson'));assert.equal(trace.length,traceBytes);report.artifacts.push({file:'steps.ndjson',bytes:trace.length,sha256:hash(trace)});
 report.acceptedModelWitnessRide=report.sequence.accepted;report.complete=true;
}catch(error){report.firstFailure=String(error?.stack??error).slice(0,16384);report.complete=false;exitCode=1;
 if(page)try{report.failureDiagnosticState=await page.eval(`(()=>{const observer=window.__guidedOrdinary;if(!observer)return{available:false};return{available:true,current:observer.current(),lastAttempt:observer.lastAttempt(),sequence:observer.sequence()};})()`);report.actualDriverAdvancesAtFailure=report.failureDiagnosticState.current?.step??null;}
 catch(e){report.failureDiagnosticStateReadFailure=String(e).slice(0,2048);}
 if(page)try{report.failureState=await page.eval(`({screen:document.querySelector('#app')?.dataset.screen??null,base:document.querySelector('#app')?.dataset.base??null,menu:window.__ordinaryMenuEvidence??null,seaTime:breaklineDiagnostics?.mode.host?.snapshot.status.seaTime??null})`);}catch(e){report.failureStateReadFailure=String(e).slice(0,2048);}
}finally{
 clearTimeout(deadline);if(page)try{await page.close();report.ownedBrowserClose=true;}catch(error){report.ownedBrowserClose=false;report.closeFailure=String(error).slice(0,2048);report.complete=false;exitCode=1;}
 report.elapsedMilliseconds=performance.now()-started;save();
}
console.log(JSON.stringify({complete:report.complete,steps:report.stepCount,stop:report.stop,acceptedModelWitnessRide:report.acceptedModelWitnessRide??false,firstFailure:report.firstFailure}));process.exitCode=exitCode;
