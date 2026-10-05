// Root-owned known-failure replay once through run.py; no placement/forced cue or pose search.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { launch } from '/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/native-owned.mjs';
import { createWitnessSampler } from '/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/body-witnesses.mjs';
import { createLoftSnapshotTools } from '/private/tmp/tube-pop-up-contact-native-v6-20261005/loft-snapshot-tools.mjs';
import { createOrdinaryControl,nearestIndexedFormed } from '/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/control-policy.mjs';
import { installOrdinaryRider } from '/private/tmp/tube-pop-up-contact-native-v6-20261005/rider-driver.mjs';
import { prepareMenu } from '/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/menu-startup.mjs';
import { retainContactDiagnostics } from '/private/tmp/tube-pop-up-contact-native-v6-20261005/contact-retention.mjs';
import { installFollowerCamera } from '/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/follower-camera.mjs';
const OPERAND_METADATA=JSON.parse(readFileSync('/private/tmp/tube-native-trial-balance-native-20261005/observer-fields.json'));const OPERAND_FIELDS=OPERAND_METADATA.allFields;
assert.equal(OPERAND_FIELDS.length,102);assert.equal(OPERAND_METADATA.originalFields.length,38);assert.equal(OPERAND_METADATA.newFields.length,63);assert.equal(OPERAND_METADATA.availabilityMarker,'standingTrialAvailable');
const WORK='/private/tmp/tube-native-trial-balance-native-20261005',PORT=4301,CDP=9711,DT=1/60;
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');assert(a.startsWith('--')&&i>2);return[a.slice(2,i),a.slice(i+1)];}));
assert.equal(args.run,'true','Only the bounded Python owner may arm');assert.equal(args.arm,'candidate');assert.equal(process.env.BOUNDED_C_OWNER_ARM,'candidate');const seal=JSON.parse(readFileSync(WORK+'/seal.json'));assert.equal(process.env.BOUNDED_C_OWNER_SEAL_SHA,createHash('sha256').update(readFileSync(WORK+'/seal.json')).digest('hex')); 
assert.equal(args.url,`http://127.0.0.1:${PORT}/?diagnostics`);
const OUT=resolve(args.out??'');assert.equal(OUT,WORK+'/candidate-first');assert(!existsSync(OUT));mkdirSync(OUT);
process.env.FULL_WRITER_FPS_LAUNCHER_REPORT=join(OUT,'launcher.json');
const started=performance.now(),SETTINGS={spot:'padang',stage:2,compute:'auto',source:'buoy',significantHeight:3.8,
 peakPeriod:18,directionDegrees:0,spread:0,spreading:150,tide:0,windSpeed:0,stormWindSpeed:18,stormFetchKm:600,stormDurationHours:36,stormDistanceKm:3000};
const PRIOR_V6=JSON.parse(readFileSync(seal.priorV6Report.file)),PRIOR=JSON.parse(readFileSync(seal.priorV4Report.file)),REPLAY_OVERRIDES=Object.fromEntries(['seed','componentCount','dx','fineSpacing'].map(k=>[k,PRIOR.initial.config[k]]));
assert.deepEqual(REPLAY_OVERRIDES,{seed:6238,componentCount:64,dx:2,fineSpacing:1});
const EXPECTED_CONFIG={componentCount:64,dx:2,fineSpacing:1,spreading:150};
const GRAPHICS={preset:'custom',renderScale:1,nativePixelDensity:true,frameLimit:60,waterSimulation:'accurate',seaDetail:'rich',
 caustics:true,sprayMist:true,oceanView:'far',foam:'detailed',waterLook:'rich',particles:'high'};
const POLICY={style:'line',waitOutside:5,rise:1,lineDegrees:60,giveUp:30,stall:false};
const report={schema:'trial-balance-native/v1',priorFailedMenuReport:seal.priorFailedReport,priorV2FailedMenuReport:seal.priorV2FailedReport,menuRepair:'Unchanged V4 actual menu/HUD startup followed by explicitly declared public seeded restart for diagnostic comparison',priorV4Report:seal.priorV4Report,priorV6Report:seal.priorV6Report,normalFollowerCameraContract:'Passive public authored follower mirror after normal HUD pause; no manual pose/fly ownership; mirror repeats ordinary height reads',sealSha256:process.env.BOUNDED_C_OWNER_SEAL_SHA,arm:args.arm,complete:false,firstFailure:null,settings:SETTINGS,overrides:REPLAY_OVERRIDES,knownFailureReplay:true,normalMenuAcceptance:false,expectedConfig:EXPECTED_CONFIG,seedPolicy:'One predeclared public replay of observed V4 seed6238 with explicit component64/dx2/fine1 overrides from pinned V4 config; no seed search or exact startup claim',
 graphics:GRAPHICS,policy:{...POLICY,trial:'Declared observer-only trial-balance capture on successful V11 controls; original solver and control policy retained, causal explanation unproved',standingSteering:{maximumAbsolute:.2,slewRatePerSecond:.4,initialInput:0},standingInputOverlay:{crouch:1,compress:1},cue:'One ordinary pulse on first actual positive cue while prone; no fixed83/manual telemetry/pilot-go gate',proneInput:'paddle true, steer zero'},
 source:seal.arms.candidate,diagnosticModule:seal.diagnosticModule,rootCompleteBuild:seal.arms.candidate.rootBuildManifest,helperReadiness:seal.helperReadiness,schedule:{maxSteps:2160,maxPhysicalSeconds:2160/60,fixedStepSeconds:DT,
 stop:'First published fall/separation/reset increase, or finite2160step cap; one ordinary fixed step and update(1/60) each iteration',noSettle:true,noPlacements:true,noReset:true,noRetries:true},videoContract:{start:'First actual output push phase (ordinary first-cue pop-up), with no tube-proximity requirement',initialRequestBeforeAwaitStart:true,maximumMovingSteps:240,maximumBytes:16*1024*1024,maximumRequests:241,ordinaryStepsOnly:true,fpsClaim:false,wallTimeEncoding:true},
 detector:{maximumCumulativeMilliseconds:20000,scope:'Seven published air-column witnesses on one connected indexed mesh component plus reference trunk spheres; air-volume connectivity and full body/capsule clearance are not proved',elapsedMilliseconds:0},
 diagnosticOutput:{canvas:[1708,879],pixelRatio:1,resizeCalls:1,maximumPngs:4,maximumPngBytes:12*1024*1024,maximumTotalPngBytes:48*1024*1024,maximumReportBytes:32*1024*1024,
 fidelityPass:false,fpsClaim:false,renderer:'Root-frozen original stable-X C drawing and V8/V11 solver with observer-only scalar copies; fresh app and reachable diagnostic compilation receipts required before launch'},
 checkpointPolicy:{maximum:4,priority:['initial','first-pop-up','first-landing','terminal'],maximumFullSnapshots:4,maximumFullSnapshotBytesEach:6*1024*1024,maximumTotalFullSnapshotBytes:24*1024*1024},
 loftSnapshots:[],snapshotBytes:0,browserErrors:[],steps:[],stepCount:0,checkpoints:[],artifacts:[],pngCount:0,pngBytes:0,
 entry:{observedStandingOutside:false,firstPartial:null,firstConnectedWitnessEntry:null,containmentWithoutObservedOutside:null,
 firstConnectedWitnessExit:null,maximumConsecutiveContainedSteps:0,residenceIntervals:[],fullBodyClearancePass:false},
 limitations:['Read-only published contactDiagnostics is descriptive. Complete non-prone and separation/loss rows are retained; prone diagnostics retain declared counters/flight/support summaries only. No private worker access.',
 'Five crossings, disconnected components, parity disagreements and detector bounds are retained without claiming entry.',
 'Visible skinned extents use the drawn/interpolated clock; trajectory body points use the current worker clock. PNGs use the root-frozen stable-X C loft and coherent startup candidate; no experimental curl geometry is injected.',
 'Initial warmed snapshot/PNG and trace counters are evidence, not causal proof of the prior missing-front failure.',
 'No FPS, full-body collision, visual acceptance or adoption pass is inferred.']};
report.operandObservation={fields:OPERAND_FIELDS,originalFields:OPERAND_METADATA.originalFields,newFields:OPERAND_METADATA.newFields,availabilityMarker:OPERAND_METADATA.availabilityMarker,availabilitySemantics:OPERAND_METADATA.availabilitySemantics,assemblyAttribution:OPERAND_METADATA.assemblyAttribution,sourceOnlyObserver:true,allFullSamplesChecked:true,compactProneSummaryUnchanged:true,causalClaim:false};
report.startupPolicy={ridePauseWaitMilliseconds:180000,priorRidePauseWaitMilliseconds:90000,actualFailureSnapshot:true,failureSnapshotMilliseconds:3500,failureScreenshotMilliseconds:4000,noMenuControlChange:true,noMenuPhysicsChange:true};
report.priorV8StartupAttempt={readiness:seal.priorV8Readiness,owner:seal.priorV8Owner,report:seal.priorV8Report,noStepEvidence:true};
report.priorV9BudgetAttempt={readiness:seal.priorV9Readiness,owner:seal.priorV9Owner,report:seal.priorV9Report,startupSucceeded:true,capturedPronePrefixSteps:1213,landingForceEvidence:false};
report.priorV10StartupAttempt={readiness:seal.priorV10Readiness,owner:seal.priorV10Owner,report:seal.priorV10Report,capturedSteps:0,landingForceEvidence:false,lateUiStatusRetained:true};
report.priorV11SuccessfulBaseline={readiness:seal.priorV11Readiness,owner:seal.priorV11Owner,report:seal.priorV11Report,ordinarySteps:1366,exitCode:0,causalFixEvidence:false};
report.trialBalanceObserver={sourceReadiness:seal.sourceReadiness,observerOnly:true,originalFields:38,newScalarCopies:63,availabilityMarker:'standingTrialAvailable',markerZeroInvalidatesStaleWords:true,markerOneOnlyMeansCoupledTrialCaptured:true,trialMayBeRejectedAndDifferFromRealizedMotion:true,separateHydrodynamicAttributionAvailable:false,causalExplanationAccepted:false,oneRuntimeChanged:'src/physics/AttachedRider.ts'};
report.movieCapBehavior={movingAdvances:240,requests:241,movieStopsAtCap:true,ordinaryPhysicsContinues:true,replayStopUnchanged:true};
report.firstContactLoss=null;
let ndjsonBytes=0,lastComponent=null,residence=null,consecutive=0,entryOccurred=false,wasContained=false;
const hash=b=>createHash('sha256').update(b).digest('hex');
function save(){report.stepCount=report.steps.length;const bytes=Buffer.from(JSON.stringify(report));assert(bytes.length<=32*1024*1024,'32MiB report cap');writeFileSync(join(OUT,'report.json'),bytes);}
function persistStep(row){const bytes=Buffer.from(JSON.stringify(row)+'\n');assert(ndjsonBytes+bytes.length<=24*1024*1024,'24MiB per-step evidence cap');appendFileSync(join(OUT,'steps.ndjson'),bytes);ndjsonBytes+=bytes.length;report.steps.push(row);}
function png(name,url){assert(url.startsWith('data:image/png;base64,'));const b=Buffer.from(url.slice(22),'base64');assert(b.length<=12*1024*1024&&b.length>8);
 assert(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));assert(report.pngCount<4&&report.pngBytes+b.length<=48*1024*1024);
 writeFileSync(join(OUT,name),b);report.artifacts.push({file:name,bytes:b.length,sha256:hash(b)});report.pngCount++;report.pngBytes+=b.length;}
function lineage(a,b){return a&&b&&a.front!==null&&a.front===b.front&&Math.max(a.sigmaMin,b.sigmaMin)<=Math.min(a.sigmaMax,b.sigmaMax);}
function track(row){const w=row.witness,standing=row.ride.phase==='standing',contained=standing&&w?.sevenPublishedWitnessesAndReferenceTrunkSpheresContained===true;
 const brief={step:row.step,physicalSeconds:row.physicalSeconds,seaTime:row.seaTime,classification:w?.classification??'not-measured',component:w?.component??null};
 if(standing&&w?.classification==='outside'&&!entryOccurred)report.entry.observedStandingOutside=true;
 if(standing&&w?.classification==='partial'&&!report.entry.firstPartial)report.entry.firstPartial=brief;
 if(contained){if(!entryOccurred){if(report.entry.observedStandingOutside)report.entry.firstConnectedWitnessEntry=brief;
   else report.entry.containmentWithoutObservedOutside??=brief;entryOccurred=true;}
  if(!wasContained||!lineage(lastComponent,w.component)){if(residence){residence.end=brief;residence.endReason='component-lineage-not-established';}
   residence={start:brief,end:null,endReason:null,steps:0,physicalSeconds:0};report.entry.residenceIntervals.push(residence);consecutive=0;}
  consecutive++;residence.steps++;residence.physicalSeconds=Math.max(0,(residence.steps-1)*DT);
  report.entry.maximumConsecutiveContainedSteps=Math.max(report.entry.maximumConsecutiveContainedSteps,consecutive);
 }else{if(wasContained){const reason=!standing?'ride-left-standing':w?.classification==='outside'?'observed-outside':'witness-clearance-lost-or-ambiguous';
   if(residence){residence.end=brief;residence.endReason=reason;}if(!report.entry.firstConnectedWitnessExit)report.entry.firstConnectedWitnessExit={...brief,reason};}
  consecutive=0;residence=null;}
 wasContained=contained;lastComponent=contained?w.component:null;return contained;
}
// Ordinary controls are a declared overlay; production pilot supplies only requested line steering.

let page,exitCode=0,videoStartStep=null,videoDone=false;report.video=null;report.videoRequests=[];report.videoTrigger=null;
save();
async function captureData(label){
 const c=await page.eval(`__naturalEntry.checkpoint(${JSON.stringify(label)})`),url=c.png;delete c.png;
 if(c.loftSnapshot){const q=c.loftSnapshot,b=Buffer.from(JSON.stringify(q)),file='loft-'+label+'.json';assert(report.loftSnapshots.length<4&&b.length<=6*1024*1024&&report.snapshotBytes+b.length<=24*1024*1024);writeFileSync(join(OUT,file),b);const stub={file,bytes:b.length,sha256:hash(b),schema:q.schema,label,epoch:q.epoch,counts:q.counts,rawFrontRecordCount:q.rawFrontPacket.recordCount,rawBytes:q.rawBytes,nonmutation:q.nonmutation,arrayManifest:Object.fromEntries(Object.entries(q.arrays).map(([k,v])=>[k,Object.fromEntries(Object.entries(v).filter(([n])=>n!=='data'))]))};report.snapshotBytes+=b.length;report.loftSnapshots.push(stub);c.loftSnapshot=stub;}
 assert(url.startsWith('data:image/png;base64,')&&Buffer.from(url.slice(22),'base64').length<=12*1024*1024,'Bounded checkpoint candidate PNG');
 return {checkpoint:c,url};
}
function commitCapture(data,label){
 const c=data.checkpoint,existing=report.checkpoints.find(entry=>entry.step===c.step);
 if(existing){if(!existing.labels.includes(label))existing.labels.push(label);save();return;}
 c.labels=[label];const file=`${String(report.pngCount).padStart(2,'0')}-${label}.png`;png(file,data.url);c.file=file;report.checkpoints.push(c);save();
}
async function capture(label){
 const latest=report.steps.at(-1),existing=report.checkpoints.find(c=>c.step===(latest?.step??0));
 if(existing){if(!existing.labels.includes(label))existing.labels.push(label);save();return;}
 commitCapture(await captureData(label),label);
}
async function finishClip(){
 if(videoStartStep===null||videoDone)return;
 report.video=await page.eval('__naturalEntry.finishVideo()');const chunks=[];
 for(let o=0;o<report.video.bytes;o+=512*1024){const n=Math.min(512*1024,report.video.bytes-o),b=Buffer.from(await page.eval(`__naturalEntry.videoChunk(${o},${n})`),'base64');assert.equal(b.length,n);chunks.push(b);}
 const b=Buffer.concat(chunks);assert.equal(b.length,report.video.bytes);assert(b.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])));
 const file='pop-up-motion.webm';writeFileSync(join(OUT,file),b);report.artifacts.push({file,bytes:b.length,sha256:hash(b)});report.video.file=file;report.video.sha256=hash(b);videoDone=true;save();
}
async function startupDiagnosticBound(label,milliseconds,task){
 let timer;try{return await Promise.race([task(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' diagnostic deadline')),milliseconds);})]);}finally{clearTimeout(timer);}
}
async function captureStartupFailure(error){
 report.startupFailure={stage:'normal-menu-ride-HUD-pause',waitMilliseconds:180000,error:String(error?.stack??error),observedAfterTimeout:true,statusRead:null,screenshot:null};save();
 try{
  report.startupFailure.statusRead=await startupDiagnosticBound('Startup public status',3500,()=>page.eval(`(()=>{
   const d=globalThis.breaklineDiagnostics,lab=globalThis.breaklineLab,root=document.querySelector('#app'),mode=d?.mode,host=mode?.host,snapshot=host?.snapshot,status=snapshot?.status,loading=document.querySelector('#loading'),text=document.querySelector('#loading-text');
   const brief=b=>({text:(b.textContent??'').trim().slice(0,200),disabled:!!b.disabled,ariaLabel:b.getAttribute('aria-label')});
   const pauses=[...document.querySelectorAll('.ride-hud button.hud-pause')],alerts=[...document.querySelectorAll('[role="alert"]')];
   return {observedAtPerformanceMilliseconds:performance.now(),location:location.href,documentReadyState:document.readyState,app:{present:!!root,screen:root?.dataset.screen??null,base:root?.dataset.base??null,className:root?.className??null,pending:!!root?.classList.contains('is-scene-pending')},loading:{present:!!loading,hidden:loading?.classList.contains('is-hidden')??null,className:loading?.className??null,text:(text?.textContent??'').slice(0,4096)},screenMenuPresent:!!document.querySelector('.screen-menu'),screenText:(root?.innerText??'').slice(0,8192),alerts:alerts.slice(0,16).map(a=>(a.textContent??'').slice(0,1024)),alertsTruncated:alerts.length>16,pauseButtons:{count:pauses.length,items:pauses.slice(0,16).map(brief)},menuEvidence:globalThis.__ordinaryMenuEvidence??null,publicHost:{present:!!host,type:host?.constructor?.name??null,outstandingSteps:host?.outstandingSteps??null,status:status?{seaTime:status.seaTime,timeToSet:status.timeToSet,compute:status.compute,cells:status.cells,stepMs:status.stepMs,board:status.board??null,ride:status.ride?{phase:status.ride.phase,cue:status.ride.cue,speed:status.ride.speed,boardSpeed:status.ride.boardSpeed,separation:status.ride.separation??null,resets:status.ride.resets}:null}:null,boardPose:snapshot?.board?Array.from(snapshot.board.subarray(0,8)):null,riderWords:snapshot?.rider?Array.from(snapshot.rider):null},publicClock:{labPresent:!!lab,active:lab?.active??null,paused:lab?.clock?.paused??null,scale:lab?.clock?.scale??null},exactWaitConditionObserved:!!(document.querySelector("#app")?.dataset.screen === "pause" && document.querySelector("#app")?.dataset.base === "ride" && globalThis.breaklineDiagnostics?.mode.host?.snapshot.status.ride && !globalThis.breaklineLab?.active && globalThis.breaklineLab?.clock.paused),readOnly:true,noPublicAdvanceOrRenderOrInputCalls:true};
  })()`));
 }catch(snapshotError){report.startupFailure.statusReadFailure=String(snapshotError);}
 save();
 try{
  const shot=await startupDiagnosticBound('Startup screenshot',4000,()=>page.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false}));
  const file='startup-timeout.png';png(file,'data:image/png;base64,'+shot.data);report.startupFailure.screenshot=report.artifacts.find(a=>a.file===file);report.startupFailure.screenshotConsumesExistingPngBudget=true;
 }catch(screenshotError){report.startupFailure.screenshotFailure=String(screenshotError);}
 save();
}
try{
 page=await launch({url:args.url,width:1708,height:966,port:CDP,args:['--mute-audio']});
 page.on('Runtime.consoleAPICalled',e=>{if(e.type==='error'&&report.browserErrors.length<12)report.browserErrors.push((e.args??[]).map(a=>a.value??a.description??'').join(' ').slice(0,2048));});
 page.on('Runtime.exceptionThrown',e=>{if(report.browserErrors.length<12)report.browserErrors.push(String(e.exceptionDetails?.exception?.description??e.exceptionDetails?.text).slice(0,2048));});
 await page.eval(`localStorage.setItem('breakline.settings.v1',${JSON.stringify(JSON.stringify({graphics:GRAPHICS,detected:{preset:'high',water:'accurate',lowPerformance:false},seen:{rideHints:true,lowPerformanceNotice:true}}))})`);
 await page.send('Page.reload');await page.waitFor('window.breaklineDiagnostics && window.breaklineLab',20000);
 await page.waitFor("document.querySelector('.screen-menu') && !document.querySelector('.is-scene-pending')",45000);
 report.menuStartup=await page.eval(`(${prepareMenu.toString()})()`);
 try{
  await page.waitFor('document.querySelector("#app")?.dataset.screen === "pause" && document.querySelector("#app")?.dataset.base === "ride" && breaklineDiagnostics.mode.host?.snapshot.status.ride && !breaklineLab.active && breaklineLab.clock.paused',180000);
 }catch(error){
  await captureStartupFailure(error);
  throw error;
 }
 report.normalMenuBeforeReplay=await page.eval(`({config:JSON.parse(JSON.stringify(breaklineDiagnostics.mode.config)),status:JSON.parse(JSON.stringify(breaklineDiagnostics.mode.host.snapshot.status)),boardPose:Array.from(breaklineDiagnostics.mode.host.snapshot.board.subarray(0,8)),riderWords:Array.from(breaklineDiagnostics.mode.host.snapshot.rider)})`);
 report.replayStartup=await page.eval(`(async()=>{const d=breaklineDiagnostics,lab=breaklineLab,root=document.querySelector('#app');if(root?.dataset.screen!=='pause'||root?.dataset.base!=='ride'||lab.active||!lab.clock.paused)throw Error('Actual normal menu/HUD pause required before declared replay');const begin=performance.now();while(d.mode.host.outstandingSteps){if(performance.now()-begin>10000)throw Error('Menu drain timeout');await new Promise(r=>setTimeout(r,2));}await d.start(${JSON.stringify(SETTINGS)},${JSON.stringify(REPLAY_OVERRIDES)},{rider:true,lab:false});if(lab.active||!lab.clock.paused||root.dataset.screen!=='pause'||root.dataset.base!=='ride')throw Error('Public replay must preserve ordinary HUD hold');return {api:'breaklineDiagnostics.start',overrides:${JSON.stringify(REPLAY_OVERRIDES)},scene:{rider:true,lab:false},publicReplayStart:true,normalMenuStartupBeforeReplay:true,noActorPlacementOrPrivateMutation:true,exactInitialReplayClaim:false};})()`);
 report.initial=await page.eval(`(async()=>{const d=breaklineDiagnostics,lab=breaklineLab;if(lab.active||!lab.clock.paused||document.querySelector('#app')?.dataset.screen!=='pause')throw Error('Normal HUD hold required');
  const begin=performance.now();while(d.mode.host.outstandingSteps){if(performance.now()-begin>10000)throw Error('Menu drain timeout');await new Promise(r=>setTimeout(r,2));}await d.mode.sweptBarrel.ready;
  if(d.mode.sweptBarrel.holdsClearDrawing!==true)throw Error('Accepted held drawing required; no toggle');
  d.resize(1708,879);d.mode.update(0);d.renderView(d.mode.camera.camera);
  const c=d.canvas,gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');
  return{menuEvidence:window.__ordinaryMenuEvidence,config:d.mode.config,status:d.mode.host.snapshot.status,viewport:{inner:[innerWidth,innerHeight],dpr:devicePixelRatio,canvas:[c.width,c.height]},
   browser:{userAgent:navigator.userAgent,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)}};})()`);
 assert(report.initial.menuEvidence.actualDomStartup&&report.initial.menuEvidence.rideObserved&&report.initial.menuEvidence.popupNotForced);

 report.normalMenuSeed=report.normalMenuBeforeReplay.config.seed;assert(Number.isSafeInteger(report.normalMenuSeed)&&report.normalMenuSeed>=1&&report.normalMenuSeed<=9999);assert.equal(report.initial.config.seed,6238);
 report.replayConfigComparison={differences:Object.fromEntries([...new Set([...Object.keys(PRIOR.initial.config),...Object.keys(report.initial.config)])].filter(k=>JSON.stringify(PRIOR.initial.config[k])!==JSON.stringify(report.initial.config[k])).map(k=>[k,{prior:PRIOR.initial.config[k]??null,actual:report.initial.config[k]??null}])),allFieldsCompared:true};assert.deepEqual(report.replayConfigComparison.differences,{},'All actual replay config fields must match pinned V4 config');
 for(const[k,v]of Object.entries(EXPECTED_CONFIG))assert.equal(report.initial.config[k],v,'Actual config '+k);
 for(const k of ['spot','significantHeight','peakPeriod','directionDegrees','tide','windSpeed','stage'])assert.equal(report.initial.config[k],SETTINGS[k],'Actual sea '+k);
 assert.equal(report.initial.status.compute,'gpu');assert.deepEqual(report.initial.viewport.canvas,[1708,879]);
 await page.waitFor('!!breaklineDiagnostics.mode.surfer.skinned',10000);
 await page.eval(`(async()=>{const m=await import('/diagnostic-autopilot.mjs');(${installOrdinaryRider.toString()})(m.Autopilot,m.autopilotView,m.riderPartVolumes,(${createWitnessSampler.toString()}),(${createLoftSnapshotTools.toString()}),(${createOrdinaryControl.toString()}),(${nearestIndexedFormed.toString()}),(${installFollowerCamera.toString()}),${JSON.stringify(POLICY)},(${retainContactDiagnostics.toString()}));return true;})()`);
 report.initialBody=await page.eval('__naturalEntry.current()');report.replayBodyComparison={seaTime:{prior:PRIOR.initialBody.seaTime,actual:report.initialBody.seaTime,equal:Object.is(PRIOR.initialBody.seaTime,report.initialBody.seaTime)},fields:Object.fromEntries(['boardPose','riderPoints','riderWords','displayedBoard','displayedRiderPoints','clocks'].map(k=>[k,{equal:JSON.stringify(PRIOR.initialBody[k])===JSON.stringify(report.initialBody[k]),prior:PRIOR.initialBody[k],actual:report.initialBody[k]}])),exactInitialReplayClaim:false};report.replayV6InitialComparison={priorReport:seal.priorV6Report,configFields:Object.fromEntries([...new Set([...Object.keys(PRIOR_V6.initial.config),...Object.keys(report.initial.config)])].map(k=>[k,{equal:JSON.stringify(PRIOR_V6.initial.config[k])===JSON.stringify(report.initial.config[k])}])),seaTime:{prior:PRIOR_V6.initialBody.seaTime,actual:report.initialBody.seaTime,equal:Object.is(PRIOR_V6.initialBody.seaTime,report.initialBody.seaTime)},initialBodyFields:Object.fromEntries([...new Set([...Object.keys(PRIOR_V6.initialBody),...Object.keys(report.initialBody)])].filter(k=>k!=='workerStepMs').map(k=>[k,{equal:JSON.stringify(PRIOR_V6.initialBody[k])===JSON.stringify(report.initialBody[k])}])),excludedBodyTimingFields:['workerStepMs'],exactInitialReplayClaim:false,descriptiveOnly:true};report.referenceSphereRadii=await page.eval('__naturalEntry.radii');
 assert.equal(report.initialBody.ride.phase,'prone','Fresh ordinary prone initialization required');save();
 await capture('initial');
 for(let i=0;i<2160;i++){
  assert(performance.now()-started<635000,'635s internal wall deadline; no continuation/retry');
  const row=await page.eval('__naturalEntry.step()');assert(!row.noStep,'Ordinary controller must not silently stop at production pilot state');
  for(const ride of [row.ride,row.inputView.ride])if(ride.contactDiagnosticRetention==='full'){
   const cd=ride.contactDiagnostics;for(const sample of [cd.last,cd.firstLimited,cd.firstNonContact,cd.loss?.sample])if(sample)for(const key of OPERAND_FIELDS)assert(typeof sample[key]==='number'&&Number.isFinite(sample[key]),'Missing/nonfinite published operand '+key);
  }
  persistStep(row);track(row);report.detector.elapsedMilliseconds=row.detector.cumulativeMilliseconds;
  if(row.ride.phase==='push'&&!report.firstPopUp){report.firstPopUp={step:row.step,seaTime:row.seaTime,physicalSeconds:row.physicalSeconds};await capture('first-pop-up');}
  if(row.ride.phase==='landing'&&!report.firstLanding){report.firstLanding={step:row.step,seaTime:row.seaTime,physicalSeconds:row.physicalSeconds};await capture('first-landing');}
  if(videoStartStep===null&&row.ride.phase==='push'){
    report.videoTrigger={triggered:true,step:row.step,seaTime:row.seaTime,physicalSeconds:row.physicalSeconds,phase:row.ride.phase};
    const videoStart=await page.eval('__naturalEntry.beginVideo()');const initialVideoFrame=videoStart.initialVideoFrame;delete videoStart.initialVideoFrame;
    report.video=videoStart;report.videoRequests.push(initialVideoFrame);videoStartStep=row.step;save();}
  const cd=row.ride.contactDiagnostics;if(cd?.loss&&!report.firstContactLoss)report.firstContactLoss={step:row.step,seaTime:row.seaTime,physicalSeconds:row.physicalSeconds,ridePhase:row.ride.phase,separation:row.separation,diagnostics:cd};
  if(videoStartStep!==null&&!videoDone&&row.step>videoStartStep){report.videoRequests.push(await page.eval('__naturalEntry.videoFrame()'));if(row.step-videoStartStep>=240)await finishClip();}
  if(row.ride.phase==='fallen'||row.ride.phase==='recover'||row.separation||row.ride.resets>report.initialBody.ride.resets){report.stop={kind:'first-published-fall-or-separation',step:row.step,phase:row.ride.phase,separation:row.separation,resets:row.ride.resets};break;}
  if((i+1)%120===0){save();console.log(JSON.stringify({progressSteps:row.step,phase:row.ride.phase,entry:!!report.entry.firstConnectedWitnessEntry,detectorMs:row.detector.cumulativeMilliseconds}));}
 }
 report.stop??={kind:'maximum-2160-steps',physicalSeconds:report.steps.length*DT};
 await capture('terminal');await finishClip();
 report.contactDiagnosticRetention={prone:'compact counters, force/peak and flight/support sample summaries; all other ride/body/input fields intact',allNonProneOrSeparationOrLoss:'complete unaltered detached contactDiagnostics JSON',inputView:'same retention applied after ordinary pilot reads original published view; never steers inputs',descriptiveOnly:true};
 report.videoLimitation=report.videoTrigger?'Triggered bounded normal movie; no tube-entry/quality/FPS pass inferred':'No actual push phase observed; no movie trigger, clip or success claim';
 const lines=readFileSync(join(OUT,'steps.ndjson'));report.artifacts.push({file:'steps.ndjson',bytes:lines.length,sha256:hash(lines)});
 assert.deepEqual(report.browserErrors,[],'Runtime/shader console errors');
 report.complete=true;
}catch(error){report.firstFailure=String(error?.stack??error);exitCode=1;if(page)try{report.menuFailureEvidence=await page.eval('window.__ordinaryMenuEvidence??null');}catch(e){report.menuFailureEvidenceUnavailable=String(e);}}
finally{
 if(page)try{try{report.videoCleanup=await page.eval('typeof __naturalEntry!=="undefined"?__naturalEntry.abortVideo():({started:false})');}catch(e){report.videoCleanupFailure=String(e);}await page.close();report.chromeClosed=true;}catch(error){report.cleanupFailure=String(error);report.complete=false;exitCode=1;}
 else if(existsSync(join(OUT,'launcher.json')))report.chromeClosed=JSON.parse(readFileSync(join(OUT,'launcher.json'))).ownedChromeClosed;
 report.elapsedSeconds=(performance.now()-started)/1000;
 try{save();}catch(error){console.error('Final report write failed:',String(error));exitCode=1;}
}
process.exit(exitCode);
