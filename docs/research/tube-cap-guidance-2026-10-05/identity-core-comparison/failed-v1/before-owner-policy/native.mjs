// Root-only finite matched renderer diagnostic. This preparation has not executed it.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { launch } from '/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/native-owned.mjs';
import { prepareMenu } from '/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/menu-startup.mjs';
import { installLeafIdentityCoreInspection } from './geometry-inspection.mjs';
const W='/private/tmp/tube-leaf-identity-core-native-20261005', inputs=JSON.parse(readFileSync(W+'/inputs.json'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const i=arg.indexOf('=');assert(arg.startsWith('--')&&i>2);return[arg.slice(2,i),arg.slice(i+1)];}));
assert.equal(args.run,'true');assert.equal(args.url,'http://127.0.0.1:4301/?diagnostics');assert.equal(resolve(args.out),W+'/candidate-first');
const sealBytes=readFileSync(W+'/seal.json'), seal=JSON.parse(sealBytes);
assert.equal(hash(sealBytes),process.env.LEAF_IDENTITY_CORE_OWNER_SEAL_SHA);assert.equal(seal.schema,'leaf-identity-core-seal/v1');assert(seal.rootAuthorized&&seal.complete);
const readPinned=spec=>{const bytes=readFileSync(spec.file);assert.equal(bytes.length,spec.bytes);assert.equal(hash(bytes),spec.sha256);return bytes;};
const reference=JSON.parse(readPinned(inputs.scenePoseReferenceReport)), expected=JSON.parse(readPinned(inputs.referenceLoft)), baselineDrawInputs=JSON.parse(readPinned(inputs.baselineAuthority.drawInputs));
assert(reference.complete&&reference.firstFailure===null&&reference.stepCount===0&&reference.stop.kind==='first-eligible-capture');
assert.equal(expected.epoch.seaTime,reference.stop.seaTime);assert.equal(expected.epoch.step,0);assert.equal(Object.keys(expected.arrays).length,37);
assert.deepEqual(inputs.referenceCounts,expected.counts); // Baseline only; candidate roster may differ.
assert.deepEqual(inputs.overrides,{seed:6238,componentCount:64,dx:2,fineSpacing:1});
assert(!existsSync(args.out));mkdirSync(args.out);const OUT=resolve(args.out),started=performance.now();let page,exitCode=0;
const report={schema:'leaf-identity-core-native/v1',complete:false,firstFailure:null,sealSha256:hash(sealBytes),applicationBuild:seal.applicationBuild,
 scenePoseReferenceReport:inputs.scenePoseReferenceReport,referenceLoft:inputs.referenceLoft,baselineAuthority:inputs.baselineAuthority,rootCurrentApplicationReceipt:inputs.rootCurrentApplicationReceipt,opticalAuthority:inputs.opticalAuthority,authoredAuthority:inputs.authoredAuthority,settings:inputs.settings,overrides:inputs.overrides,graphics:inputs.graphics,
 policy:inputs.comparison,limits:inputs.limits,stepCount:0,pairs:[],artifacts:[],pngCount:0,pngBytes:0,browserErrors:[],acceptance:{visualCause:null,playability:false,productionAdoptionByThisObserver:false,identityCoreApplicationIsExternalToCapture:true}};
function save(){const bytes=Buffer.from(JSON.stringify(report,null,2)+'\n');assert(bytes.length<=inputs.limits.reportBytes);writeFileSync(join(OUT,'report.json'),bytes);}
function png(file,url){assert.equal(typeof url,'string');assert(url.startsWith('data:image/png;base64,')&&!existsSync(join(OUT,file)));
 const bytes=Buffer.from(url.slice(22),'base64');assert(bytes.length>8&&bytes.length<=inputs.limits.pngBytesEach&&report.pngCount<inputs.limits.pngCount);
 assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));assert(report.pngBytes+bytes.length<=inputs.limits.pngBytesTotal);
 writeFileSync(join(OUT,file),bytes);const item={file,bytes:bytes.length,sha256:hash(bytes)};report.artifacts.push(item);report.pngCount++;report.pngBytes+=bytes.length;return item;}
save();const deadline=setTimeout(()=>{report.firstFailure??='635s native ceiling; no retry or extension';report.complete=false;try{save();}finally{process.exit(1);}},inputs.limits.nativeSeconds*1000);deadline.unref();
try {
 page=await launch({url:args.url,width:1708,height:966,port:9711,args:['--mute-audio']});
 page.on('Runtime.consoleAPICalled',event=>{if(event.type==='error'&&report.browserErrors.length<12)report.browserErrors.push((event.args??[]).map(a=>a.value??a.description??'').join(' ').slice(0,2048));});
 page.on('Runtime.exceptionThrown',event=>{if(report.browserErrors.length<12)report.browserErrors.push(String(event.exceptionDetails?.exception?.description??event.exceptionDetails?.text).slice(0,2048));});
 await page.eval(`localStorage.setItem('breakline.settings.v1',${JSON.stringify(JSON.stringify({graphics:inputs.graphics,detected:{preset:'high',water:'accurate',lowPerformance:false},seen:{rideHints:true,lowPerformanceNotice:true}}))})`);
 await page.send('Page.reload');await page.waitFor('window.breaklineDiagnostics && window.breaklineLab',20000);
 await page.waitFor("document.querySelector('.screen-menu') && !document.querySelector('.is-scene-pending')",45000);
 report.menuStartup=await page.eval(`(${prepareMenu.toString()})()`);
 await page.waitFor('document.querySelector("#app")?.dataset.screen==="pause" && document.querySelector("#app")?.dataset.base==="ride" && breaklineDiagnostics.mode.host?.snapshot.status.ride && !breaklineLab.active && breaklineLab.clock.paused',180000);
 report.applicationBuildRequest=await page.eval(`(async()=>{const r=await fetch('/build.json',{cache:'no-store'});if(!r.ok)throw Error('Build HTTP '+r.status);const json=await r.json();if(json.build!==${JSON.stringify(inputs.applicationBuildId)})throw Error('Unexpected root-built identity-core application');return{build:json.build,status:r.status,checkedBeforeReplay:true};})()`);
 report.normalMenuBeforeReplay=await page.eval(`({config:JSON.parse(JSON.stringify(breaklineDiagnostics.mode.config)),seaTime:breaklineDiagnostics.mode.host.snapshot.status.seaTime,board8:Array.from(breaklineDiagnostics.mode.host.snapshot.board.subarray(0,8)),rider33:Array.from(breaklineDiagnostics.mode.host.snapshot.rider.subarray(0,33))})`);
 report.replayStartup=await page.eval(`(async()=>{const d=breaklineDiagnostics,lab=breaklineLab,root=document.querySelector('#app');if(root.dataset.screen!=='pause'||root.dataset.base!=='ride'||lab.active||!lab.clock.paused)throw Error('Actual menu/HUD hold required');const begin=performance.now();while(d.mode.host.outstandingSteps){if(performance.now()-begin>10000)throw Error('Menu drain timeout');await new Promise(r=>setTimeout(r,2));}await d.start(${JSON.stringify(inputs.settings)},${JSON.stringify(inputs.overrides)},{rider:true,lab:false});if(lab.active||!lab.clock.paused||root.dataset.screen!=='pause'||root.dataset.base!=='ride')throw Error('Public seeded restart must preserve HUD hold');return{api:'breaklineDiagnostics.start',publicStartCalls:1,noPlacement:true,noClockAssignment:true,diagnosticSeedRestart:true};})()`);
 report.initial=await page.eval(`(async()=>{const d=breaklineDiagnostics,lab=breaklineLab;const begin=performance.now();while(d.mode.host.outstandingSteps){if(performance.now()-begin>10000)throw Error('Replay drain timeout');await new Promise(r=>setTimeout(r,2));}await d.mode.sweptBarrel.ready;if(lab.active||!lab.clock.paused||d.mode.sweptBarrel.holdsClearDrawing!==true)throw Error('Held ordinary drawing required');d.resize(1708,879);d.mode.update(0);d.renderView(d.mode.camera.camera);return{menu:window.__ordinaryMenuEvidence,config:JSON.parse(JSON.stringify(d.mode.config)),seaTime:d.mode.host.snapshot.status.seaTime,compute:d.mode.host.snapshot.status.compute,canvas:[d.canvas.width,d.canvas.height]};})()`);
 assert(report.initial.menu.actualDomStartup&&report.initial.menu.rideObserved&&report.initial.menu.popupNotForced&&report.initial.menu.normalHudPaused&&report.initial.menu.activeLabDisabled);
 assert.deepEqual(report.initial.menu.selectedChoices,['Padang Padang','Big','Mid','Calm','Midday']);assert.deepEqual(report.initial.config,reference.initial.config);
 assert.equal(report.initial.seaTime,expected.epoch.seaTime);assert.equal(report.initial.compute,'gpu');assert.deepEqual(report.initial.canvas,[1708,879]);
 await page.waitFor('!!breaklineDiagnostics.mode.surfer.skinned',10000);
 const installed=await page.eval(`(${installLeafIdentityCoreInspection.toString()})(${JSON.stringify(expected)},${JSON.stringify(inputs.fixedCameras)},${JSON.stringify(reference.initialBody)},${JSON.stringify(reference.normal.camera)},${JSON.stringify(inputs.comparison.pairs)})`);
 const commonDrawFields=['seaTime','step','config','look','holdClearDrawing','slope','stillLevel','surfaceRevision','surfaceGrid','surface','rawFrontPacket','board8','rider33','normalCameraWords'];
 for(const field of commonDrawFields)assert.deepEqual(installed.drawInputs[field],baselineDrawInputs[field],'Exact prior ordinary/query field differs '+field);
 report.priorOrdinaryDrawInputsComparison={fieldsExact:commonDrawFields,oldMaskEqualityRequired:false,currentMaskHeldCommonWithinEachPair:true,actualAtXQueriesSavedForBothUploadedRosters:true};
 const writeJSON=(name,value,cap)=>{const bytes=Buffer.from(JSON.stringify(value));assert(bytes.length<=cap);writeFileSync(join(OUT,name),bytes);const item={file:name,bytes:bytes.length,sha256:hash(bytes)};report.artifacts.push(item);return item;};
 report.sidecar=writeJSON('loft-candidate.json',installed.candidateSnapshot,inputs.limits.sidecarBytes);
 report.drawInputs=writeJSON('draw-inputs.json',installed.drawInputs,inputs.limits.drawInputsBytes);
 delete installed.candidateSnapshot;delete installed.drawInputs;report.installation=installed;save();
 for(const {camera:name,view} of inputs.comparison.pairs){
  assert(performance.now()-started<inputs.limits.nativeSeconds*1000);
  const pair=await page.eval(`__leafIdentityCore.capture(${JSON.stringify(name)},${JSON.stringify(view)})`);
  assert(pair.complete&&pair.stepCount===0&&pair.seaTime===expected.epoch.seaTime&&pair.baselineRepeatPixelsIdentical);
  assert(Object.values(pair.guards).every(value=>value===true));assert.deepEqual(pair.fixedPose,inputs.fixedCameras[name]);
  const prefix=name+'-'+view;const baseline=png(prefix+'-preserved-shared-leaf.png',pair.baselinePNG),candidate=png(prefix+'-identity-core.png',pair.candidatePNG);
  delete pair.baselinePNG;delete pair.candidatePNG;report.pairs.push({...pair,baseline,candidate});save();
 }
 report.restoration=await page.eval('__leafIdentityCore.finish()');assert(report.restoration.complete&&Object.values(report.restoration.guards).every(Boolean));
 assert.equal(report.pngCount,8);assert.deepEqual(report.browserErrors,[]);report.complete=true;
} catch(error) {report.firstFailure=String(error?.stack??error).slice(0,16384);report.complete=false;exitCode=1;}
finally {clearTimeout(deadline);if(page)try{await page.close();report.ownedBrowserClose=true;}catch(error){report.ownedBrowserClose=false;report.closeFailure=String(error).slice(0,2048);report.complete=false;exitCode=1;}
 report.elapsedMilliseconds=performance.now()-started;save();}
console.log(JSON.stringify({complete:report.complete,steps:0,pngCount:report.pngCount,firstFailure:report.firstFailure}));process.exitCode=exitCode;
