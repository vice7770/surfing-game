// Source-only preparation. The Python owner is the sole armed entry point.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { launch } from './native-owned.mjs';

const WORK = '/private/tmp/tube-splash-edges-20261004';
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const i = a.indexOf('='); assert(a.startsWith('--') && i > 2); return [a.slice(2, i), a.slice(i + 1)];
}));
assert.equal(args.run, 'true', 'Run only through the bounded Python owner');
assert(['baseline','candidate'].includes(args.arm),'Explicit independently initialized arm required');
const ARM=args.arm,PORT=4282,CDP=9692;
assert.equal(args.url, `http://127.0.0.1:${PORT}/?diagnostics&physicsDx=1&physicsDz=1`);
const OUT = resolve(args.out ?? ''); assert(OUT.startsWith(WORK + '/') && !existsSync(OUT));
mkdirSync(OUT); process.env.FULL_WRITER_FPS_LAUNCHER_REPORT = join(OUT, 'launcher.json');
const SETTINGS = { spot:'padang', stage:2, compute:'auto', source:'buoy', significantHeight:4,
  peakPeriod:10, directionDegrees:10, spread:0.4, tide:0, windSpeed:0,
  stormWindSpeed:18, stormFetchKm:600, stormDurationHours:36, stormDistanceKm:3000 };
const OVERRIDES = { seed:1, componentCount:24, spreading:11.720624206334085, dx:1, fineSpacing:1 };
const GRAPHICS = { preset:'custom', renderScale:1, nativePixelDensity:true, frameLimit:60,
  waterSimulation:'accurate', seaDetail:'standard', caustics:true, sprayMist:true,
  oceanView:'far', foam:'detailed', waterLook:'rich', particles:'high' };
const report={schema:'tube-splash-edges-native/v1',arm:ARM,complete:false,firstFailure:null,
 lineage:{sourceScaffold:'/private/tmp/tube-lip-attribution-20261004',dist:'/private/tmp/tube-deep-rider-native-20261004/dist'},
 settings:SETTINGS,overrides:OVERRIDES,graphics:GRAPHICS,
 schedule:{settleSteps:1047,fixedStepSeconds:1/60,heldFrames:2,stepsBeforeFrames:[18,12],offsetsPhysicalSeconds:[.3,.5]},
 target:{front:48,sigma:32.379207311,maximumInitialSigmaDeltaMeters:.75},
 telemetryOnly:true,noScreenshots:true,newScene:true,videoReproduction:false,physicalStateEqualityClaim:false,
 frames:[],artifacts:[],limits:{reportBytes:262144,rawBytesPerFile:1048576,rawFiles:2,topEdgesPerCategory:5},
 limitations:['Actual last-built filtered inputs; raw-node edge measurements do not identify individual pixels or Catmull-Rom overshoot.',
 'Fresh seeded scene does not establish physical-state equality with prior capture.',
 'No FPS, physics or visual adoption claim; no production source/dist or user4310 mutation.']};
function save(){const b=Buffer.from(JSON.stringify(report));assert(b.length<=262144,'Compact report cap');writeFileSync(join(OUT,'report.json'),b);}
function rawInput(name,base64){
 assert(typeof base64==='string'&&base64.length<=1398104,'Bounded raw base64');
 const b=Buffer.from(base64,'base64');assert(b.length<=1048576&&b.length%36===0,'Raw stride9 file cap');
 const floats=new Float32Array(b.buffer,b.byteOffset,b.length/4);assert(floats.every(Number.isFinite),'Finite actual raw input');
 writeFileSync(join(OUT,name),b);report.artifacts.push({file:name,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),
  format:'Float32 native little-endian; byte-exact packed actual last-built filtered records',stride:9,records:b.length/36,
  fields:['x','y','z','column','index','stripLaunchTime','age','volume','kind']});save();
}
function measureSplashEdges(p,count,width,time){
 const strips=new Map();let splashRecords=0;
 for(let i=0;i<count;i++){
  const o=9*i;if(p[o+8]!==1)continue;splashRecords++;
  const column=p[o+3],launch=p[o+5],key=`${column}|${launch}|1`;let s=strips.get(key);
  if(!s)strips.set(key,s={column,launch,nodes:[]});
  s.nodes[p[o+4]]={xyz:[p[o],p[o+1],p[o+2]],age:p[o+6]};
 }
 const columns=new Map(),right=new Map(),hasLeft=new Set();
 for(const s of strips.values()){if(!columns.has(s.column))columns.set(s.column,[]);columns.get(s.column).push(s);}
 for(const s of [...strips.values()].sort((a,b)=>a.column-b.column)){
  let best;for(const t of columns.get(s.column+1)||[]){
   if(hasLeft.has(t)||Math.abs(t.launch-s.launch)>=1)continue;
   if(!best||Math.abs(t.launch-s.launch)<Math.abs(best.launch-s.launch))best=t;
  }
  if(best){right.set(s,best);hasLeft.add(best);}
 }
 const bin=(v,bounds)=>{let k=0;while(k<bounds.length&&v>=bounds[k])k++;return k;};
 const distanceBounds=[1,2,4,8,16,32,64],birthBounds=[1/60,.05,.1,.25,.5,1,2];
 const stats=()=>({count:0,minMeters:Infinity,maxMeters:-Infinity,minBirthDeltaSeconds:Infinity,maxBirthDeltaSeconds:-Infinity,
  distanceOverWidthCounts:Array(distanceBounds.length+1).fill(0),absoluteBirthDeltaCounts:Array(birthBounds.length+1).fill(0),top5:[]});
 const cross=stats(),along=stats();
 const endpoint=(s,k)=>({column:s.column,index:k,stripLaunchTime:s.launch,age:s.nodes[k].age,
  birthTimeFromAge:time-s.nodes[k].age,xyz:s.nodes[k].xyz});
 const edge=(stats,a,b)=>{
  const distance=Math.hypot(a.xyz[0]-b.xyz[0],a.xyz[1]-b.xyz[1],a.xyz[2]-b.xyz[2]);
  const birthDelta=a.age-b.age;stats.count++;stats.minMeters=Math.min(stats.minMeters,distance);stats.maxMeters=Math.max(stats.maxMeters,distance);
  stats.minBirthDeltaSeconds=Math.min(stats.minBirthDeltaSeconds,birthDelta);stats.maxBirthDeltaSeconds=Math.max(stats.maxBirthDeltaSeconds,birthDelta);
  stats.distanceOverWidthCounts[bin(distance/width,distanceBounds)]++;stats.absoluteBirthDeltaCounts[bin(Math.abs(birthDelta),birthBounds)]++;
  stats.top5.push({distanceMeters:distance,columnWidths:distance/width,birthDeltaSeconds:birthDelta,a,b});
  stats.top5.sort((a,b)=>b.distanceMeters-a.distanceMeters);if(stats.top5.length>5)stats.top5.length=5;
 };
 let completeCrossCells=0,chains=0,longestChainStrips=0;
 for(const s of strips.values()){
  for(let k=0;k+1<s.nodes.length;k++)if(s.nodes[k]&&s.nodes[k+1])edge(along,endpoint(s,k),endpoint(s,k+1));
  if(!hasLeft.has(s)){chains++;let length=1;for(let t=right.get(s);t;t=right.get(t))length++;longestChainStrips=Math.max(longestChainStrips,length);}
 }
 for(const [s,t]of right){const seen=new Set(),length=Math.max(s.nodes.length,t.nodes.length);
  for(let k=0;k+1<length;k++){
   if(!s.nodes[k]||!t.nodes[k]||!s.nodes[k+1]||!t.nodes[k+1])continue;completeCrossCells++;
   for(const j of[k,k+1])if(!seen.has(j)){seen.add(j);edge(cross,endpoint(s,j),endpoint(t,j));}
  }
 }
 const clean=s=>{if(!s.count)for(const k of['minMeters','maxMeters','minBirthDeltaSeconds','maxBirthDeltaSeconds'])s[k]=null;return s;};
 return{splashRecords,stripCount:strips.size,matchedStripPairs:right.size,completeCrossCells,chains,longestChainStrips,
  histogramConvention:'Intervals [0,b0), [b0,b1), ...; last interval unbounded',distanceOverWidthBounds:distanceBounds,
  absoluteBirthDeltaSecondsBounds:birthBounds,crossColumn:clean(cross),alongAdjacentIndex:clean(along)};
}
function install(measureSplashEdges) {
  const d=window.breaklineDiagnostics, lab=window.breaklineLab, mode=d.mode;
  const S=134, EXT=3, CREST=32, LIP=64, THROAT=88, TOE=112;
  const must=(v,m)=>{if(!v)throw Error(m);};
  must(typeof mode.sweptBarrel?.setHoldClearDrawing==='function','Missing drawing-only toggle');
  const point=(l,s,j)=>Array.from(l.positions.subarray(3*(s*S+EXT+j),3*(s*S+EXT+j)+3));
  const vec=a=>mode.camera.camera.position.clone().fromArray(a);
  const view=()=>{const c=mode.camera.camera;return{position:c.position.toArray(),quaternion:c.quaternion.toArray(),
    projection:c.projectionMatrix.toArray(),matrixWorld:c.matrixWorld.toArray(),near:c.near,far:c.far,fov:c.fov,aspect:c.aspect};};
  const row=(l,s)=>s<0?null:({row:s,front:l.sliceFront[s],sigma:l.sliceSigma[s],tau:l.sliceTau[s],
    life:l.sliceLife[s],phase:l.slicePhase[s],formed:l.sliceFormed[s],weight:l.sliceWeight[s],
    fade:l.sliceFade[s],overturned:l.sliceOverturned[s],ray:[l.sliceRayX[s],l.sliceRayZ[s]]});
  const camera=mode.camera.camera;
  let locked;
  function choose() {
    must(mode.sweptBarrel.holdsClearDrawing===true,'Held drawing must remain enabled');mode.update(0);d.renderView(camera);
    const l=mode.barrelLoft; must(l&&l.indexCount>0,'No drawn joined loft after the fixed settle');
    const candidates=[],targetSigma=32.379207311;
    for(let s=0;s<l.sliceCount;s++)if(l.sliceFront[s]===48&&l.sliceFormed[s]>0&&l.sliceWeight[s]>0
      &&(l.slicePhase[s]===1||(l.slicePhase[s]===2&&l.sliceFade[s]>0))
      &&(l.sliceJoined[s]===1||(s>0&&l.sliceJoined[s-1]===1)))candidates.push(s);
    must(candidates.length,'No qualifying formed weighted joined front48 row at fixed settle; no fallback/time search');
    candidates.sort((a,b)=>Math.abs(l.sliceSigma[a]-targetSigma)-Math.abs(l.sliceSigma[b]-targetSigma)||a-b);
    const s=candidates[0], neighbor=l.sliceJoined[s]===1?s+1:s-1;
    must(Math.abs(l.sliceSigma[s]-targetSigma)<=.75,'Nearest qualified front48 row outside fixed sigma match');
    const eye=[155.32094597816467,4.819468761980533,-.038138747215270996];
    const target=[150.3824691772461,.8194687619805336,-6.938243746757507];
    const waterEye=mode.host.heightAt(eye[0],eye[2]); must(Number.isFinite(waterEye),'Eye water height unavailable');
    mode.idleView='free'; mode.camera.setView('free'); lab.following=false;
    lab.fly.lookAt(vec(eye),vec(target)); lab.fly.applyTo(camera); camera.updateMatrixWorld(true);
    locked={front:l.sliceFront[s],sigma:l.sliceSigma[s],targetSigma,initialSigmaDelta:Math.abs(l.sliceSigma[s]-targetSigma),
      sourceRow:row(l,s),sourceNeighbor:row(l,neighbor),
      eye,target,eyeWasClamped:false,eyeWaterHeight:waterEye,camera:view(),
      materialSide:mode.barrelMesh?.mesh.material.side??null,
      initialCrossSections:Array.from({length:5},(_,k)=>s+k-2).filter(k=>k>=0&&k<l.sliceCount&&l.sliceFront[k]===l.sliceFront[s]).map(k=>({row:row(l,k),joinedToNext:l.sliceJoined[k]===1,firstProfilePoint:CREST,lastProfilePoint:TOE,positions:Array.from(l.positions.subarray(3*(k*S+EXT+CREST),3*(k*S+EXT+TOE+1)))}))};
    d.renderView(camera); return locked;
  }
  function frame(index){
    must(lab.clock.paused&&mode.host.outstandingSteps===0&&mode.sweptBarrel.holdsClearDrawing===true,'Pause/drain/hold required');
    const snap=mode.host.snapshot,status=snap.status,pose=JSON.stringify(view()),time=status.seaTime;
    mode.update(0);d.renderView(camera);
    const built=mode.lipSheet.built,mesh=mode.lipSheet.mesh;
    must(mode.lipSheet.look==='rich'&&mode.swept===true,'Actual Rich swept mode required');
    must(built&&built.parcels instanceof Float32Array&&Number.isInteger(built.count)&&built.count>=0,'Actual last-built input required');
    const count=built.count,length=count*9;
    must(length<=built.parcels.length&&length*4<=1048576,'Raw input1MiB bound');
    const raw=built.parcels.slice(0,length);let kept=0;
    for(let i=0;i<snap.lipCount;i++)if(snap.lip[9*i+8]===1){
      for(let j=0;j<9;j++)must(Object.is(raw[9*kept+j],snap.lip[9*i+j]),'Actual drawn filtered input differs from current snapshot');kept++;
    }
    must(count===kept,'Filtered count mismatch');
    const edges=measureSplashEdges(raw,count,mode.host.init.dx,time);
    must(mode.host.snapshot===snap&&snap.status===status&&status.seaTime===time&&mode.host.outstandingSteps===0,'Held telemetry snapshot drift');
    must(JSON.stringify(view())===pose&&pose===JSON.stringify(locked.camera),'Fixed camera drift');
    must(built===mode.lipSheet.built&&built.parcels.subarray(0,length).every((v,k)=>Object.is(v,raw[k])),'Last-built input mutated');
    const bytes=new Uint8Array(raw.buffer);let binary='';
    for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return{index,seaTime:time,status:{compute:status.compute,cells:status.cells,stepMs:status.stepMs},
      snapshotUnchanged:true,cameraUnchanged:true,rawSource:'mode.lipSheet.built.parcels[0:9*built.count]',
      rawMatchesCurrentSnapshotKind1:true,snapshotLipCount:snap.lipCount,builtSplashCount:count,widthMeters:mode.host.init.dx,
      mesh:{visible:mesh.visible,vertices:mesh.geometry.getAttribute('position')?.count??null,indices:mesh.geometry.index?.count??null},
      edges,rawBase64:btoa(binary)};
  }
  async function steps(n) {
    const host=mode.host,base=host.snapshot.status.seaTime;must(lab.clock.paused&&host.outstandingSteps===0,'Step requires pause/drain');
    for(let done=0;done<n;){const count=Math.min(6,n-done);for(let k=0;k<count;k++)d.step({paddle:false,popUp:false,steer:0});
      while(host.outstandingSteps){await new Promise(r=>setTimeout(r,2));}done+=count;}
    const actual=host.snapshot.status.seaTime-base;must(Math.abs(actual-n/60)<1e-7,'Fixed step clock mismatch');
    mode.update(0);return{steps:n,baseSeaTime:base,seaTime:host.snapshot.status.seaTime};
  }
  window.__splashEdges={choose,frame,steps};
}
let page;
save();
try {
  page=await launch({url:args.url,width:1708,height:966,port:CDP,args:['--mute-audio']});
  report.browserErrors=[];
  page.on('Runtime.consoleAPICalled',e=>{if(e.type==='error'&&report.browserErrors.length<12)report.browserErrors.push((e.args??[]).map(a=>a.value??a.description??'').join(' ').slice(0,2048));});
  page.on('Runtime.exceptionThrown',e=>{if(report.browserErrors.length<12)report.browserErrors.push(String(e.exceptionDetails?.exception?.description??e.exceptionDetails?.text).slice(0,2048));});
  await page.eval(`localStorage.setItem('breakline.settings.v1',${JSON.stringify(JSON.stringify({graphics:GRAPHICS,detected:{preset:'high',water:'accurate',lowPerformance:false},seen:{rideHints:true,lowPerformanceNotice:true}}))})`);
  await page.send('Page.reload'); await page.waitFor('window.breaklineDiagnostics && window.breaklineLab',20000);
  report.initial=await page.eval(`(async()=>{const d=breaklineDiagnostics,lab=breaklineLab;
    lab.clock.paused=true;await d.start(${JSON.stringify(SETTINGS)},${JSON.stringify(OVERRIDES)},{rider:false,lab:true});
    lab.active=true;lab.clock.paused=true;while(d.mode.host.outstandingSteps)await new Promise(r=>setTimeout(r,2));
    d.mode.sweptBarrel.setHoldClearDrawing(true);
    await d.mode.sweptBarrel.ready;d.setWaterLook('rich');await d.setTimeOfDay('midday');
    d.resize(1708,879);
    const style=document.createElement('style');style.textContent='#ui,#touch-controls,#loading,#app::after{display:none!important}#scene{opacity:1!important;transition:none!important}';document.head.append(style);
    const c=d.canvas,gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');
    return{config:d.mode.config,status:d.mode.host.snapshot.status,viewport:{inner:[innerWidth,innerHeight],dpr:devicePixelRatio,canvas:[c.width,c.height]},
      browser:{userAgent:navigator.userAgent,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)}};})()`);
  for(const [key,value]of Object.entries(OVERRIDES))assert.equal(report.initial.config[key],value,'Actual config '+key);
  for(const key of ['spot','significantHeight','peakPeriod','directionDegrees','tide','windSpeed','stage'])assert.equal(report.initial.config[key],SETTINGS[key],'Actual sea '+key);
  assert.equal(report.initial.status.compute,'gpu','GPU required');
  assert.deepEqual(report.initial.viewport.canvas,[1708,879],'Actual diagnostic PR1 output');save();
  await page.eval(`(${install.toString()})(${measureSplashEdges.toString()})`);
  report.settle=await page.eval('__splashEdges.steps(1047)');report.selection=await page.eval('__splashEdges.choose()');save();
  for(let i=0;i<2;i++){
    const advancement=await page.eval(`__splashEdges.steps(${[18,12][i]})`);
    const frame=await page.eval(`__splashEdges.frame(${i})`);const raw=frame.rawBase64;delete frame.rawBase64;
    frame.advancement=advancement;frame.rawFile=`splash-input-${i}.f32`;report.frames.push(frame);
    rawInput(frame.rawFile,raw);
  }
  assert.deepEqual(report.browserErrors,[],'Native runtime/shader console errors');report.complete=true;
} catch(error){report.firstFailure=String(error?.stack??error);process.exitCode=1;}
finally{
 if(page)try{await page.close();report.chromeClosed=true;}catch(error){report.cleanupFailure=String(error);report.complete=false;process.exitCode=1;}
 else if(existsSync(join(OUT,'launcher.json')))report.chromeClosed=JSON.parse(readFileSync(join(OUT,'launcher.json'))).ownedChromeClosed;
 save();
}
process.exit(process.exitCode??0);
