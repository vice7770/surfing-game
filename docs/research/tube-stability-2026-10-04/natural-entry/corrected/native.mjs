// Prepared source only. Root launches once through run.py; no reset/placement/cue or pose search.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { launch } from './native-owned.mjs';
import { createWitnessSampler } from './body-witnesses.mjs';
const WORK='/private/tmp/tube-natural-entry-ready-20261004',PORT=4288,CDP=9698,DT=1/60;
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');assert(a.startsWith('--')&&i>2);return[a.slice(2,i),a.slice(i+1)];}));
assert.equal(args.run,'true','Only the bounded Python owner may arm');assert.equal(args.arm,'baseline');
assert.equal(args.url,`http://127.0.0.1:${PORT}/?diagnostics&physicsDx=1&physicsDz=1`);
const OUT=resolve(args.out??'');assert.equal(OUT,WORK+'/native-first');assert(!existsSync(OUT));mkdirSync(OUT);
process.env.FULL_WRITER_FPS_LAUNCHER_REPORT=join(OUT,'launcher.json');
const started=performance.now(),SETTINGS={spot:'padang',stage:2,compute:'auto',source:'buoy',significantHeight:4,
 peakPeriod:10,directionDegrees:10,spread:.4,tide:0,windSpeed:0,stormWindSpeed:18,stormFetchKm:600,stormDurationHours:36,stormDistanceKm:3000};
const OVERRIDES={seed:1,componentCount:24,spreading:11.720624206334085,dx:1,fineSpacing:1};
const GRAPHICS={preset:'custom',renderScale:1,nativePixelDensity:true,frameLimit:60,waterSimulation:'accurate',seaDetail:'standard',
 caustics:true,sprayMist:true,oceanView:'far',foam:'detailed',waterLook:'rich',particles:'high'};
const POLICY={style:'line',waitOutside:5,rise:1,lineDegrees:60,giveUp:8,stall:false};
const report={schema:'tube-natural-entry-native/v1',arm:args.arm,complete:false,firstFailure:null,settings:SETTINGS,overrides:OVERRIDES,
 graphics:GRAPHICS,policy:{...POLICY,standingInputOverlay:{crouch:1,compress:0},cue:'Production Autopilot.next: pop once on first ordinary cue while prone; no forced go()'},
 source:JSON.parse(readFileSync(join(WORK,'preparation.json'))),schedule:{maxSteps:1080,maxPhysicalSeconds:18,fixedStepSeconds:DT,
 stop:'First published fall/separation or pilot done; one ordinary fixed step and update(1/60) each iteration',noSettle:true,noPlacements:true,noReset:true,noRetries:true},
 detector:{maximumCumulativeMilliseconds:20000,scope:'Seven published air-column witnesses on one connected indexed mesh component plus reference trunk spheres; air-volume connectivity and full body/capsule clearance are not proved',elapsedMilliseconds:0},
 diagnosticOutput:{canvas:[1708,879],pixelRatio:1,resizeCalls:1,maximumPngs:3,maximumPngBytes:12*1024*1024,maximumReportBytes:32*1024*1024,
 fidelityPass:false,fpsClaim:false,renderer:'Immutable accepted957, older billboard renderer with foam balls'},
 browserErrors:[],steps:[],stepCount:0,checkpoints:[],artifacts:[],pngCount:0,pngBytes:0,
 entry:{observedStandingOutside:false,firstPartial:null,firstConnectedWitnessEntry:null,containmentWithoutObservedOutside:null,
 firstConnectedWitnessExit:null,maximumConsecutiveContainedSteps:0,residenceIntervals:[],fullBodyClearancePass:false},
 limitations:['No worker internals changed: published separation reason is retained; flightTime, support-limit history and postureError are unavailable.',
 'Five crossings, disconnected components, parity disagreements and detector bounds are retained without claiming entry.',
 'Visible skinned extents use the drawn/interpolated clock; trajectory body points use the current worker clock. PNGs use the older957 billboard renderer.',
 'No FPS, full-body collision, visual acceptance or adoption pass is inferred.']};
let ndjsonBytes=0,lastComponent=null,residence=null,consecutive=0,entryOccurred=false,wasContained=false;
const hash=b=>createHash('sha256').update(b).digest('hex');
function save(){report.stepCount=report.steps.length;const bytes=Buffer.from(JSON.stringify(report));assert(bytes.length<=32*1024*1024,'32MiB report cap');writeFileSync(join(OUT,'report.json'),bytes);}
function persistStep(row){const bytes=Buffer.from(JSON.stringify(row)+'\n');assert(ndjsonBytes+bytes.length<=24*1024*1024,'24MiB per-step evidence cap');appendFileSync(join(OUT,'steps.ndjson'),bytes);ndjsonBytes+=bytes.length;report.steps.push(row);}
function png(name,url){assert(url.startsWith('data:image/png;base64,'));const b=Buffer.from(url.slice(22),'base64');assert(b.length<=12*1024*1024&&b.length>8);
 assert(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));assert(report.pngCount<3&&report.pngBytes+b.length<=36*1024*1024);
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
// Serialized into the page; unchanged production pilot inputs, read-only actual snapshot/drawing queries.
function install(Autopilot,autopilotView,riderPartVolumes,createWitnessSampler,policy){
 const d=window.breaklineDiagnostics,lab=window.breaklineLab,mode=d.mode,DT=1/60;
 const must=(v,m)=>{if(!v)throw Error(m);},clone=v=>JSON.parse(JSON.stringify(v));
 const pilot=new Autopilot(policy),measure=createWitnessSampler(),radii=riderPartVolumes().map(v=>Math.cbrt(3*v/(4*Math.PI)));
 let detectorMs=0,detectorFailure=null,steps=0;
 function current(){const snap=mode.host.snapshot;must(snap.rider?.length>=33&&snap.board?.length>=8&&snap.status.ride,'Actual rider snapshot required');
  const points=Array.from(snap.rider.subarray(0,21));must(points.every(Number.isFinite),'Finite published body points');
  return{seaTime:snap.status.seaTime,riderPoints:points,riderWords:Array.from(snap.rider.subarray(21,33)),boardPose:Array.from(snap.board.subarray(0,8)),
   ride:clone(snap.status.ride),compute:snap.status.compute,workerStepMs:snap.status.stepMs,cue:snap.status.ride.cue,balance:snap.status.ride.balance,
   separation:snap.status.ride.separation??null,displayedBoard:{position:mode.board.position.toArray(),quaternion:mode.board.quaternion.toArray()},
   displayedRiderPoints:Array.from(mode.drawnRider.subarray(0,21)),clocks:{workerSeaTime:snap.status.seaTime,visualClock:mode.riderState.clock,
    waterTime:d.water.materialUniforms.waterTime.value,surfaceRevision:d.water.surfaceRevision},
   loft:mode.barrelLoft?{slices:mode.barrelLoft.sliceCount,vertices:mode.barrelLoft.vertexCount,indices:mode.barrelLoft.indexCount}:null,
   pilot:{state:pilot.state,outcome:pilot.outcome??null,attempts:pilot.attempts,rideTime:pilot.rideTime,phase:pilot.phase}};
 }
 async function step(){must(lab.clock.paused&&mode.host.outstandingSteps===0,'Paused drained ordinary step required');
  const before=mode.host.snapshot.status.seaTime,view=autopilotView(mode.host,mode.focus.z,0);must(view,'Actual production pilot view required');
  const input=pilot.next(view,DT);if(view.ride.phase==='standing')Object.assign(input,{crouch:1,compress:0});
  if(pilot.state==='done')return{noStep:true,pilot:{state:pilot.state,outcome:pilot.outcome??null},view:clone(view)};
  d.step(input);const waitStarted=performance.now();while(mode.host.outstandingSteps){must(performance.now()-waitStarted<10000,'Single worker step drain deadline');await new Promise(r=>setTimeout(r,2));}
  must(Math.abs(mode.host.snapshot.status.seaTime-before-DT)<1e-7,'One-step physical clock mismatch');
  mode.update(DT);d.renderView(mode.camera.camera);must(mode.sweptBarrel.holdsClearDrawing===true,'Accepted held drawing required');
  const row=current();row.step=++steps;row.input=clone(input);row.inputView=clone(view);row.physicalSeconds=steps*DT;
  row.witness=null;row.detector={elapsedMilliseconds:0,cumulativeMilliseconds:detectorMs,disabledReason:detectorFailure};
  if(row.ride.phase==='standing'&&!detectorFailure&&detectorMs<20000){const begin=performance.now();
   try{row.witness=measure(mode.barrelLoft,row.riderPoints,radii,mode.sweptBarrel.waterAt.bind(mode.sweptBarrel));}
   catch(error){detectorFailure=String(error?.stack??error);row.detector.disabledReason=detectorFailure;}
   row.detector.elapsedMilliseconds=performance.now()-begin;detectorMs+=row.detector.elapsedMilliseconds;row.detector.cumulativeMilliseconds=detectorMs;
  }else if(row.ride.phase==='standing'&&!detectorFailure)row.detector.disabledReason='20s cumulative detector budget; ordinary trajectory continues';
  return row;
 }
 function checkpoint(label){must(lab.clock.paused&&mode.host.outstandingSteps===0,'Paused/drained checkpoint required');
  const snap=mode.host.snapshot,clock=snap.status.seaTime;d.renderView(mode.camera.camera);
  const camera=mode.camera.camera,group=mode.surfer.skinned?.group,extents={available:!!group,vertices:0,meshes:[],min:null,max:null,extremalVertices:{},
   scope:'Visible vertices with >=.5 head-bone influence, including weighted hair/eyes; world extents only, not complete mesh/water clearance'};
  if(group){group.updateMatrixWorld(true);const point=camera.position.clone();group.traverse(mesh=>{
   if(!mesh.isSkinnedMesh||!mesh.visible)return;for(let parent=mesh.parent;parent;parent=parent.parent)if(!parent.visible)return;
   const indices=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');if(!indices||!weights)return;
   must(indices.count<=200000,'Bounded head mesh vertices');mesh.skeleton.update();let retained=0;
   for(let i=0;i<indices.count;i++){let influence=0;for(let k=0;k<4;k++){const bone=mesh.skeleton.bones[indices.getComponent(i,k)];
     if(bone&&bone.name.toLowerCase().endsWith('head'))influence+=weights.getComponent(i,k);}if(influence<.5)continue;
    mesh.getVertexPosition(i,point);point.applyMatrix4(mesh.matrixWorld);const world=point.toArray();must(world.every(Number.isFinite),'Finite visible skinned point');
    retained++;extents.vertices++;must(extents.vertices<=300000,'Total bounded head extent vertices');
    if(!extents.min){extents.min=world.slice();extents.max=world.slice();}
    for(let axis=0;axis<3;axis++){if(world[axis]<=extents.min[axis]){extents.min[axis]=world[axis];extents.extremalVertices['min'+axis]={world,mesh:mesh.name,vertex:i,headInfluence:influence};}
     if(world[axis]>=extents.max[axis]){extents.max[axis]=world[axis];extents.extremalVertices['max'+axis]={world,mesh:mesh.name,vertex:i,headInfluence:influence};}}
   }if(retained)extents.meshes.push({name:mesh.name,headVertices:retained});
  });}
  const result={label,step:steps,seaTime:clock,clocks:current().clocks,visibleHeadExtents:extents,
   camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.toArray(),fov:camera.fov,near:camera.near,far:camera.far},
   png:d.canvas.toDataURL('image/png')};must(mode.host.snapshot===snap&&snap.status.seaTime===clock,'Checkpoint changed physics snapshot');return result;
 }
 window.__naturalEntry={step,current,checkpoint,radii};
}
let page,exitCode=0;
save();
async function capture(label){const latest=report.steps.at(-1),existing=report.checkpoints.find(c=>c.step===(latest?.step??0));
 if(existing){existing.labels.push(label);return;}
 const c=await page.eval(`__naturalEntry.checkpoint(${JSON.stringify(label)})`),url=c.png;delete c.png;c.labels=[label];
 const file=`${String(report.pngCount).padStart(2,'0')}-${label}.png`;png(file,url);c.file=file;report.checkpoints.push(c);save();}
try{
 page=await launch({url:args.url,width:1708,height:966,port:CDP,args:['--mute-audio']});
 page.on('Runtime.consoleAPICalled',e=>{if(e.type==='error'&&report.browserErrors.length<12)report.browserErrors.push((e.args??[]).map(a=>a.value??a.description??'').join(' ').slice(0,2048));});
 page.on('Runtime.exceptionThrown',e=>{if(report.browserErrors.length<12)report.browserErrors.push(String(e.exceptionDetails?.exception?.description??e.exceptionDetails?.text).slice(0,2048));});
 await page.eval(`localStorage.setItem('breakline.settings.v1',${JSON.stringify(JSON.stringify({graphics:GRAPHICS,detected:{preset:'high',water:'accurate',lowPerformance:false},seen:{rideHints:true,lowPerformanceNotice:true}}))})`);
 await page.send('Page.reload');await page.waitFor('window.breaklineDiagnostics && window.breaklineLab',20000);
 report.initial=await page.eval(`(async()=>{const d=breaklineDiagnostics,lab=breaklineLab;lab.clock.paused=true;
  await d.start(${JSON.stringify(SETTINGS)},${JSON.stringify(OVERRIDES)},{rider:true,lab:true});lab.active=true;lab.clock.paused=true;
  while(d.mode.host.outstandingSteps)await new Promise(r=>setTimeout(r,2));await d.mode.sweptBarrel.ready;
  if(d.mode.sweptBarrel.holdsClearDrawing!==true)throw Error('Accepted held clear drawing required; no toggle');
  d.setWaterLook('rich');await d.setTimeOfDay('midday');d.resize(1708,879);d.mode.update(0);d.renderView(d.mode.camera.camera);
  const style=document.createElement('style');style.textContent='#ui,#touch-controls,#loading,#app::after{display:none!important}#scene{opacity:1!important;transition:none!important}';document.head.append(style);
  const c=d.canvas,gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');
  return{config:d.mode.config,status:d.mode.host.snapshot.status,viewport:{inner:[innerWidth,innerHeight],dpr:devicePixelRatio,canvas:[c.width,c.height]},
   browser:{userAgent:navigator.userAgent,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)}};})()`);
 for(const[k,v]of Object.entries(OVERRIDES))assert.equal(report.initial.config[k],v,'Actual config '+k);
 for(const k of ['spot','significantHeight','peakPeriod','directionDegrees','tide','windSpeed','stage'])assert.equal(report.initial.config[k],SETTINGS[k],'Actual sea '+k);
 assert.equal(report.initial.status.compute,'gpu');assert.deepEqual(report.initial.viewport.canvas,[1708,879]);
 await page.waitFor('!!breaklineDiagnostics.mode.surfer.skinned',10000);
 await page.eval(`(async()=>{const m=await import('/diagnostic-autopilot.mjs');(${install.toString()})(m.Autopilot,m.autopilotView,m.riderPartVolumes,(${createWitnessSampler.toString()}),${JSON.stringify(POLICY)});return true;})()`);
 report.initialBody=await page.eval('__naturalEntry.current()');report.referenceSphereRadii=await page.eval('__naturalEntry.radii');
 assert.equal(report.initialBody.ride.phase,'prone','Fresh ordinary prone initialization required');save();
 for(let i=0;i<1080;i++){
  assert(performance.now()-started<155000,'155s internal wall deadline; no continuation/retry');
  const row=await page.eval('__naturalEntry.step()');if(row.noStep){report.stop={kind:'pilot-done-before-step',...row};break;}
  persistStep(row);track(row);report.detector.elapsedMilliseconds=row.detector.cumulativeMilliseconds;
  if(row.ride.phase==='standing'&&!report.firstStanding){report.firstStanding={step:row.step,seaTime:row.seaTime,physicalSeconds:row.physicalSeconds};await capture('first-standing');}
  if(report.entry.firstConnectedWitnessEntry?.step===row.step)await capture('first-connected-witness-entry');
  if(row.ride.phase==='fallen'||row.ride.phase==='recover'||row.separation){report.stop={kind:'first-published-fall-or-separation',step:row.step,phase:row.ride.phase,separation:row.separation};break;}
  if(row.pilot.state==='done'){report.stop={kind:'pilot-done',step:row.step,outcome:row.pilot.outcome};break;}
  if((i+1)%120===0){save();console.log(JSON.stringify({progressSteps:row.step,phase:row.ride.phase,entry:!!report.entry.firstConnectedWitnessEntry,detectorMs:row.detector.cumulativeMilliseconds}));}
 }
 report.stop??={kind:'maximum-1080-steps',physicalSeconds:report.steps.length*DT};await capture('final');
 const lines=readFileSync(join(OUT,'steps.ndjson'));report.artifacts.push({file:'steps.ndjson',bytes:lines.length,sha256:hash(lines)});
 assert.deepEqual(report.browserErrors,[],'Runtime/shader console errors');
 report.complete=true;
}catch(error){report.firstFailure=String(error?.stack??error);exitCode=1;}
finally{
 if(page)try{await page.close();report.chromeClosed=true;}catch(error){report.cleanupFailure=String(error);report.complete=false;exitCode=1;}
 else if(existsSync(join(OUT,'launcher.json')))report.chromeClosed=JSON.parse(readFileSync(join(OUT,'launcher.json'))).ownedChromeClosed;
 report.elapsedSeconds=(performance.now()-started)/1000;
 try{save();}catch(error){console.error('Final report write failed:',String(error));exitCode=1;}
}
process.exit(exitCode);
