// First-only geometry observation. Only run.py may arm this source; no build/runtime changes.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { launch } from '/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/native-owned.mjs';
import { prepareMenu } from '/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/menu-startup.mjs';
import { createWitnessSampler } from '/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/body-witnesses.mjs';
import { createOrdinaryControl, nearestIndexedFormed } from '/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/control-policy.mjs';
import { installFollowerCamera } from '/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/follower-camera.mjs';
import { createLoftSnapshotTools } from '/private/tmp/tube-pop-up-contact-native-v6-20261005/loft-snapshot-tools.mjs';
import { installOrdinaryRider } from '/private/tmp/tube-pop-up-contact-native-v6-20261005/rider-driver.mjs';
import { retainContactDiagnostics } from '/private/tmp/tube-pop-up-contact-native-v6-20261005/contact-retention.mjs';
import { createMatureMouthInspection } from './mature-mouth.mjs';
import { installMatureCoreInspection, createRegionRenderPass } from './inspection-bridge.mjs';
const W='/private/tmp/tube-local-sheet-capture-v2-20261005', BUILD_ID='tube-local-sheet-20261005';
const args=Object.fromEntries(process.argv.slice(2).map(value=>{const i=value.indexOf('=');assert(value.startsWith('--')&&i>2);return[value.slice(2,i),value.slice(i+1)];}));
assert.equal(args.run,'true');assert.equal(args.arm,'candidate');assert.equal(args.url,'http://127.0.0.1:4301/?diagnostics');assert.equal(resolve(args.out),join(W,'candidate-first'));
const hash=b=>createHash('sha256').update(b).digest('hex'), sealBytes=readFileSync(join(W,'seal.json')), seal=JSON.parse(sealBytes), inputs=JSON.parse(readFileSync(join(W,'inputs.json')));
assert.equal(hash(sealBytes),process.env.MATURE_REGION_OWNER_SEAL_SHA);assert.equal(seal.schema,'local-sheet-capture/v1');assert(seal.rootAuthorized&&seal.complete);
const referenceBytes=readFileSync(inputs.knownCReport.file);assert.equal(referenceBytes.length,inputs.knownCReport.bytes);assert.equal(hash(referenceBytes),inputs.knownCReport.sha256);const reference=JSON.parse(referenceBytes);
const matureBytes=readFileSync(inputs.approvedMatureReport.file);assert.equal(matureBytes.length,inputs.approvedMatureReport.bytes);assert.equal(hash(matureBytes),inputs.approvedMatureReport.sha256);const matureReference=JSON.parse(matureBytes);
assert(matureReference.complete&&matureReference.inspection.available&&matureReference.stop.kind==='first-eligible-capture');
const matureSidecarBytes=readFileSync(inputs.approvedMatureSidecar.file);assert.equal(matureSidecarBytes.length,inputs.approvedMatureSidecar.bytes);assert.equal(hash(matureSidecarBytes),inputs.approvedMatureSidecar.sha256);const matureSidecar=JSON.parse(matureSidecarBytes);
const SETTINGS={spot:'padang',stage:2,compute:'auto',source:'buoy',significantHeight:3.8,peakPeriod:18,directionDegrees:0,spread:0,spreading:150,tide:0,windSpeed:0,stormWindSpeed:18,stormFetchKm:600,stormDurationHours:36,stormDistanceKm:3000};
const OVERRIDES={seed:6238,componentCount:64,dx:2,fineSpacing:1};
const GRAPHICS={preset:'custom',renderScale:1,nativePixelDensity:true,frameLimit:60,waterSimulation:'accurate',seaDetail:'rich',caustics:true,sprayMist:true,oceanView:'far',foam:'detailed',waterLook:'rich',particles:'high'};
const POLICY={style:'line',waitOutside:5,rise:1,lineDegrees:60,giveUp:30,stall:false};
assert.deepEqual(SETTINGS,reference.settings);assert.deepEqual(OVERRIDES,reference.overrides);assert.deepEqual(GRAPHICS,reference.graphics);for(const[key,value]of Object.entries(POLICY))assert.deepEqual(value,reference.policy[key]);
assert(!existsSync(args.out));mkdirSync(args.out);const OUT=resolve(args.out),started=performance.now();writeFileSync(join(OUT,'steps.ndjson'),'');
const report={schema:'local-sheet-capture-native/v1',complete:false,firstFailure:null,sealSha256:hash(sealBytes),approvedApplicationBuild:seal.approvedApplicationBuild,approvedDiagnosticBuild:seal.approvedDiagnosticBuild,diagnosticModule:seal.diagnosticModule,
 knownCReport:inputs.knownCReport,approvedMatureReport:inputs.approvedMatureReport,approvedMatureOwner:inputs.approvedMatureOwner,settings:SETTINGS,overrides:OVERRIDES,graphics:GRAPHICS,ordinaryPolicy:POLICY,
 policy:{geometryOnly:true,knownPublicSeedRestart:true,normalProductionGameplay:false,firstOnly:true,noPlacement:true,noRetry:true,noPilotGo:true,noActorMeshPlacementRequested:true,declaredLoftRegionColourPass:true,ordinaryKnownFailureOverlayUnchanged:true},
 schedule:{maximumSteps:360,physicalSeconds:6,fixedStepSeconds:1/60,inspectionCadence:30,initialInspection:true,nativeMilliseconds:635000,hudReadyWaitMilliseconds:180000,startupTimeoutScope:'180s HUD-ready wait; bounded launcher/reload/replay/readiness stages share the overall635s internal ceiling',stop:'First eligible capture/failure, or360steps; no later pose/epoch after eligible failure'},
 caps:seal.limits,steps:[],stepCount:0,attempts:[],normal:null,inspection:null,sidecar:null,artifacts:[],pngCount:0,pngBytes:0,traceBytes:0,browserErrors:[],
 limitations:['Stored Float32 weight1 phase1 core does not certify pre-round analytic formation/fade/end weights.','Mature interior image does not certify an exposed end mouth or actor passage.','Eye-to-target segment and four near-plane corners are checked; entire near plane and far frustum are unproved.','Borrowed known-failure input overlay is retained; this is a seeded geometry observation, not normal production gameplay.','Region colour identifies surviving loft ownership only; no geometry, shader-cause, aesthetic or adoption acceptance.','No FPS, aesthetic or adoption acceptance.']};
let page,exitCode=0;
function save(){report.stepCount=report.steps.length;const b=Buffer.from(JSON.stringify(report));assert(b.length<=33554432,'32MiB report cap');writeFileSync(join(OUT,'report.json'),b);}
function persist(row){const b=Buffer.from(JSON.stringify(row)+'\n');assert(b.length<=4096&&report.traceBytes+b.length<=25165824,'Compact row/24MiB trace cap');appendFileSync(join(OUT,'steps.ndjson'),b);report.traceBytes+=b.length;report.steps.push(row);}
function png(file,url){assert(typeof url==='string'&&url.startsWith('data:image/png;base64,'));assert(!existsSync(join(OUT,file)));
 const b=Buffer.from(url.slice(22),'base64');assert(b.length>8&&b.length<=12582912&&report.pngCount<3&&report.pngBytes+b.length<=37748736,'Three PNG bounded aggregate');assert(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
 writeFileSync(join(OUT,file),b);const p={file,bytes:b.length,sha256:hash(b)};report.artifacts.push(p);report.pngCount++;report.pngBytes+=b.length;return p;
}
function terminal(result){assert(result.stopped&&result.geometryOnly&&!result.passageClaim&&result.step===report.steps.length);report.attempts=result.attempts;
 const normal=result.normal,inspection=result.inspection;assert(normal.label==='terminal'&&normal.step===result.step);assert(normal.seaTime===report.initialSeaTime+result.step/60||Math.abs(normal.seaTime-report.initialSeaTime-result.step/60)<1e-6);
 const snap=normal.loftSnapshot;assert(snap.available&&Object.keys(snap.arrays).length===37&&snap.epoch.step===result.step&&snap.epoch.seaTime===normal.seaTime&&snap.rawBytes<=4194304);
 const b=Buffer.from(JSON.stringify(snap));assert(!report.sidecar&&b.length<=6291456);writeFileSync(join(OUT,'loft-terminal.json'),b);
 const sidecar={file:'loft-terminal.json',bytes:b.length,sha256:hash(b),schema:snap.schema,label:snap.label,epoch:snap.epoch,counts:snap.counts,rawBytes:snap.rawBytes,
  arrayManifest:Object.fromEntries(Object.entries(snap.arrays).map(([key,value])=>[key,Object.fromEntries(Object.entries(value).filter(([name])=>name!=='data'))]))};
 report.artifacts.push({file:sidecar.file,bytes:sidecar.bytes,sha256:sidecar.sha256});report.sidecar=sidecar;normal.loftSnapshot=sidecar;
 normal.artifact=png('normal.png',normal.png);delete normal.png;report.normal=normal;
 assert(inspection.nonmutation.checked&&inspection.nonmutation.unchanged&&inspection.nonmutation.normalRenderRestored&&inspection.nonmutation.checkedLoftArrays===37);
 if(inspection.available){
  assert(inspection.kind==='geometry-only-mature-core-interior-inspection'&&inspection.seaTime===normal.seaTime);
  assert.equal(result.step,matureReference.stop.step,'Exact approved mature inspection step');assert.equal(inspection.seaTime,matureReference.inspection.seaTime,'Exact approved mature inspection epoch');
  assert.deepEqual(inspection.selector,matureReference.inspection.selector,'Exact approved first mature selector');assert.deepEqual(inspection.cameraDerivation,matureReference.inspection.cameraDerivation,'Exact approved canonical mature camera');
  assert.deepEqual(snap.arrays,matureSidecar.arrays,'Exact approved mature active full37 geometry words');assert.deepEqual(snap.counts,matureSidecar.counts);assert.deepEqual(snap.rawFrontPacket,matureSidecar.rawFrontPacket,'Exact approved raw front words');
  const region=inspection.region;assert(region.complete&&region.kind==='fixed-canonical-camera-loft-region-colour-only'&&region.seaTime===normal.seaTime&&region.sameCanonicalCamera&&region.cloneCameraWordsCompared&&region.originalViewRestored&&!region.selectorRerun&&!region.cameraDerivedAgain&&!region.geometryOrQualityAcceptance);
  assert.deepEqual(region.camera.position,inspection.cameraDerivation.eye);assert.deepEqual(region.camera.quaternion,inspection.cameraDerivation.quaternion);assert.deepEqual(region.camera.projection,inspection.cameraDerivation.projection);assert.deepEqual(region.camera.up,inspection.cameraDerivation.inheritedUp);
  inspection.artifact=png('mature-core.png',inspection.pngDataUrl);delete inspection.pngDataUrl;
  region.artifact=png('mature-region.png',region.pngDataUrl);delete region.pngDataUrl;
  report.canonicalMatureReferenceMatch={selectorExact:true,epochAndStepExact:true,cameraDerivationExact:true,activeFull37AndRawFrontWordsExact:true,pairedCloneCameraUnchanged:true,fullSolverOrPixelEqualityClaim:false};
 }
 else assert(inspection.geometryFailure||result.step===360&&!inspection.eligibleAttempted,'Runtime/render/PNG callback failure cannot become an accepted geometry observation');
 report.inspection=inspection;report.stop={step:result.step,seaTime:normal.seaTime,kind:inspection.available?'first-eligible-capture':inspection.geometryFailure||inspection.firstEligibleAttemptFailed?'first-eligible-failure':'finite360-step-ceiling'};
 assert(Buffer.byteLength(JSON.stringify(normal))<=524288&&Buffer.byteLength(JSON.stringify(inspection))<=524288,'Bounded terminal metadata');save();
}
save();
const deadline=setTimeout(()=>{report.firstFailure??='635s internal deadline; no extension/retry';report.complete=false;try{save();}finally{process.exit(1);}},Math.max(1,635000-(performance.now()-started)));deadline.unref();
try{
 page=await launch({url:args.url,width:1708,height:966,port:9711,args:['--mute-audio']});
 page.on('Runtime.consoleAPICalled',e=>{if(e.type==='error'&&report.browserErrors.length<12)report.browserErrors.push((e.args??[]).map(a=>a.value??a.description??'').join(' ').slice(0,2048));});
 page.on('Runtime.exceptionThrown',e=>{if(report.browserErrors.length<12)report.browserErrors.push(String(e.exceptionDetails?.exception?.description??e.exceptionDetails?.text).slice(0,2048));});
 await page.eval(`localStorage.setItem('breakline.settings.v1',${JSON.stringify(JSON.stringify({graphics:GRAPHICS,detected:{preset:'high',water:'accurate',lowPerformance:false},seen:{rideHints:true,lowPerformanceNotice:true}}))})`);
 await page.send('Page.reload');await page.waitFor('window.breaklineDiagnostics && window.breaklineLab',20000);
 await page.waitFor("document.querySelector('.screen-menu') && !document.querySelector('.is-scene-pending')",45000);report.menuStartup=await page.eval(`(${prepareMenu.toString()})()`);
 await page.waitFor('document.querySelector("#app")?.dataset.screen==="pause" && document.querySelector("#app")?.dataset.base==="ride" && breaklineDiagnostics.mode.host?.snapshot.status.ride && !breaklineLab.active && breaklineLab.clock.paused',180000);
 report.applicationBuildRequest=await page.eval(`(async()=>{const r=await fetch('/build.json',{cache:'no-store'});if(!r.ok)throw Error('Build request HTTP '+r.status);const json=await r.json();if(json.build!=='${BUILD_ID}')throw Error('Unexpected selected build');return {url:'/build.json',cache:'no-store',ok:r.ok,status:r.status,json,build:json.build,checkedBeforeReplayAndStepping:true};})()`);assert.equal(report.applicationBuildRequest.build,BUILD_ID);
 report.normalMenuBeforeReplay=await page.eval(`({config:JSON.parse(JSON.stringify(breaklineDiagnostics.mode.config)),seaTime:breaklineDiagnostics.mode.host.snapshot.status.seaTime,boardPose:Array.from(breaklineDiagnostics.mode.host.snapshot.board.subarray(0,8)),riderWords:Array.from(breaklineDiagnostics.mode.host.snapshot.rider)})`);
 report.replayStartup=await page.eval(`(async()=>{const d=breaklineDiagnostics,lab=breaklineLab,root=document.querySelector('#app');if(root?.dataset.screen!=='pause'||root?.dataset.base!=='ride'||lab.active||!lab.clock.paused)throw Error('Actual menu/HUD hold required');const begin=performance.now();while(d.mode.host.outstandingSteps){if(performance.now()-begin>10000)throw Error('Menu drain timeout');await new Promise(r=>setTimeout(r,2));}await d.start(${JSON.stringify(SETTINGS)},${JSON.stringify(OVERRIDES)},{rider:true,lab:false});if(lab.active||!lab.clock.paused||root.dataset.screen!=='pause'||root.dataset.base!=='ride')throw Error('Public replay must preserve HUD hold');return {api:'breaklineDiagnostics.start',overrides:${JSON.stringify(OVERRIDES)},scene:{rider:true,lab:false},publicReplayStart:true,normalMenuStartupBeforeReplay:true,noActorPlacementOrPrivateMutation:true,publicStartCalls:1};})()`);
 report.initial=await page.eval(`(async()=>{const d=breaklineDiagnostics,lab=breaklineLab;if(lab.active||!lab.clock.paused)throw Error('Normal HUD hold required');const begin=performance.now();while(d.mode.host.outstandingSteps){if(performance.now()-begin>10000)throw Error('Replay drain timeout');await new Promise(r=>setTimeout(r,2));}await d.mode.sweptBarrel.ready;if(d.mode.sweptBarrel.holdsClearDrawing!==true)throw Error('Accepted held drawing required');d.resize(1708,879);d.mode.update(0);d.renderView(d.mode.camera.camera);return {menuEvidence:window.__ordinaryMenuEvidence,config:JSON.parse(JSON.stringify(d.mode.config)),seaTime:d.mode.host.snapshot.status.seaTime,compute:d.mode.host.snapshot.status.compute,viewport:{inner:[innerWidth,innerHeight],dpr:devicePixelRatio,canvas:[d.canvas.width,d.canvas.height]}};})()`);
 assert(report.initial.menuEvidence.actualDomStartup&&report.initial.menuEvidence.rideObserved&&report.initial.menuEvidence.popupNotForced&&report.initial.menuEvidence.normalHudPaused&&report.initial.menuEvidence.activeLabDisabled);assert.deepEqual(report.initial.menuEvidence.selectedChoices,['Padang Padang','Big','Mid','Calm','Midday']);
 assert.deepEqual(report.initial.config,reference.initial.config,'Exact complete known C replay config');assert.equal(report.initial.compute,'gpu');assert.deepEqual(report.initial.viewport.canvas,[1708,879]);
 await page.waitFor('!!breaklineDiagnostics.mode.surfer.skinned',10000);
 await page.eval(`(async()=>{const m=await import('/diagnostic-autopilot.mjs');(${installOrdinaryRider.toString()})(m.Autopilot,m.autopilotView,m.riderPartVolumes,(${createWitnessSampler.toString()}),(${createLoftSnapshotTools.toString()}),(${createOrdinaryControl.toString()}),(${nearestIndexedFormed.toString()}),(${installFollowerCamera.toString()}),${JSON.stringify(POLICY)},(ride => ride));(${installMatureCoreInspection.toString()})(${createMatureMouthInspection.toString()},${createRegionRenderPass.toString()});return true;})()`);
 const initialBody=await page.eval('__naturalEntry.current()');assert(Object.is(initialBody.seaTime,reference.initialBody.seaTime),'Exact known C replay initial seaTime');assert.equal(initialBody.ride.phase,'prone');
 report.initialSeaTime=initialBody.seaTime;report.initialBody={seaTime:initialBody.seaTime,boardPose:initialBody.boardPose,riderPoints:initialBody.riderPoints,riderWords:initialBody.riderWords,phase:initialBody.ride.phase};report.initialReferenceMatch={configExact:true,seaTimeExact:true,noAssignedClock:true,fullSolverEqualityClaim:false};report.startupElapsedMilliseconds=performance.now()-started;save();
 let result=await page.eval('__matureCoreInspection.attemptInitial()');if(!result.stopped)report.attempts.push(result.latest);
 for(let i=0;!result.stopped&&i<360;i++){
  assert(performance.now()-started<635000,'635s internal ceiling; no retry/extension');
  const next=await page.eval('__matureCoreInspection.advance()');persist(next.row);if(next.inspection){result=next.inspection;if(!result.stopped)report.attempts.push(result.latest);}
  if(next.row.step%30===0){save();console.log(JSON.stringify({step:next.row.step,phase:next.row.phase,inspectionStopped:result.stopped}));}
 }
 terminal(result);const trace=readFileSync(join(OUT,'steps.ndjson'));report.artifacts.push({file:'steps.ndjson',bytes:trace.length,sha256:hash(trace)});
 assert.deepEqual(report.browserErrors,[],'Runtime/shader errors retained');report.complete=true;
}catch(error){report.firstFailure=String(error?.stack??error).slice(0,16384);exitCode=1;if(page)try{report.failureState=await page.eval(`({screen:document.querySelector('#app')?.dataset.screen??null,base:document.querySelector('#app')?.dataset.base??null,menu:window.__ordinaryMenuEvidence??null,seaTime:window.breaklineDiagnostics?.mode.host?.snapshot.status.seaTime??null})`);}catch(e){report.failureStateReadFailure=String(e).slice(0,2048);}}
finally{
 clearTimeout(deadline);
 if(page)try{await page.close();report.ownedBrowserClose=true;}catch(error){report.ownedBrowserClose=false;report.closeFailure=String(error).slice(0,2048);report.complete=false;exitCode=1;}
 report.elapsedMilliseconds=performance.now()-started;save();
}
console.log(JSON.stringify({complete:report.complete,steps:report.steps.length,stop:report.stop,firstFailure:report.firstFailure}));process.exitCode=exitCode;
