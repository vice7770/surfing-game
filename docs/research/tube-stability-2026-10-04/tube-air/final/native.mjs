// Source-only preparation. The Python owner is the sole armed entry point.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { launch } from '/private/tmp/surf-full-writer-fps-20261004/native-owned.mjs';

const WORK = '/private/tmp/tube-air-final-20261004';
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const i = a.indexOf('='); assert(a.startsWith('--') && i > 2); return [a.slice(2, i), a.slice(i + 1)];
}));
assert.equal(args.run, 'true', 'Run only through the bounded Python owner');
assert.equal(args.url, 'http://127.0.0.1:4268/?diagnostics&physicsDx=1&physicsDz=1');
const OUT = resolve(args.out ?? ''); assert(OUT.startsWith(WORK + '/') && !existsSync(OUT));
mkdirSync(OUT); process.env.FULL_WRITER_FPS_LAUNCHER_REPORT = join(OUT, 'launcher.json');
const SETTINGS = { spot:'padang', stage:2, compute:'auto', source:'buoy', significantHeight:4,
  peakPeriod:10, directionDegrees:10, spread:0.4, tide:0, windSpeed:0,
  stormWindSpeed:18, stormFetchKm:600, stormDurationHours:36, stormDistanceKm:3000 };
const OVERRIDES = { seed:1, componentCount:24, spreading:11.720624206334085, dx:1, fineSpacing:1 };
const GRAPHICS = { preset:'custom', renderScale:1, nativePixelDensity:true, frameLimit:60,
  waterSimulation:'accurate', seaDetail:'standard', caustics:true, sprayMist:true,
  oceanView:'far', foam:'detailed', waterLook:'rich', particles:'high' };
const report = { schema:'tube-air-final/v1', complete:false, firstFailure:null,
  lineage:{firstRun:'/private/tmp/tube-clear-roof-ab-20261004/native-first/report.json',
    firstFailure:'96MiB PNG total cap after nine complete pairs and pair9 A; retained original19 PNGs unchanged',
    focusedRun:'/private/tmp/tube-clear-roof-focused-ab-20261004/native-first/report.json',
    focusedSources:'/private/tmp/tube-clear-roof-focused-ab-20261004',
    originalSources:'/private/tmp/tube-clear-roof-ab-20261004',dist:'/private/tmp/tube-air-final-20261004/dist'},
  settings:SETTINGS, overrides:OVERRIDES, graphics:GRAPHICS,
  schedule:{ settleSteps:1047, fixedStepSeconds:1/60, settlePhysicalSeconds:17.45,pairs:12,stepsBetweenPairs:3,
    nominalSeaTime:{initial:535.723,settled:553.173,qualification:'Nominal original trace clock, not a substituted exact capture clock'} },
  target:{front:48,sigma:32.379207311,maximumInitialSigmaDeltaMeters:.75,localRadiusMeters:2},
  diagnosticOutput:{canvas:[1708,879],pixelRatio:1,resizeCalls:1,fidelityPass:false,fpsClaim:false},
  cameraHypothesis:{onlySceneChange:'Inside-void camera looking toward younger shoulder',recipe:'Existing curl-inside eye from throat/toe midpoint lerped 0.3 toward lip/throat midpoint',
    eyeWaterClearance:null,tangentOffset:0,targetTangentOffset:8,
    automaticPoseHunt:false,scope:'Camera hypothesis from exact retained cross-section; host height-field hump may incorrectly classify cavity as underwater; inspect original pixels and classification'},
  newScene:true, videoReproduction:false, physicsFlagChanged:false, pairs:[], artifacts:[], pngBytes:0,
  visualReview:{ required:true, cavityOcclusion:'unreviewed', movingTubePass:false },
  limitations:['Projected vertices and geometric opening are support diagnostics, not visible fragments or seam attribution.',
    'Same-snapshot identity checks do not export or prove full physical F64 state equality.',
    'One loaded worker is shared by A/B; compiled worker bytes may differ from the earlier baseline.',
    'The once-resized PR1 PNGs are diagnostic output, with no original pixel-fidelity or FPS claim.',
    'No FPS, physics, visual-quality, or adoption pass is inferred from this capture.'] };
function save() {
  const bytes = Buffer.from(JSON.stringify(report)); assert(bytes.length <= 131072, 'Compact report cap');
  writeFileSync(join(OUT,'report.json'), bytes);
}
function png(name, url) {
  assert(url.startsWith('data:image/png;base64,'), 'Original canvas PNG required');
  const bytes = Buffer.from(url.slice(22),'base64');
  assert(bytes.length > 8 && bytes.length <= 8*1024*1024, 'PNG file cap');
  assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])), 'PNG signature');
  assert(report.pngBytes + bytes.length <= 96*1024*1024, 'PNG total cap');
  writeFileSync(join(OUT,name),bytes); report.pngBytes += bytes.length;
  report.artifacts.push({file:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}); save();
}

// Serialized into the page; no simulation imports or solver replacement.
function install() {
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
  let locked,outside;
  function choose() {
    mode.sweptBarrel.setHoldClearDrawing(false); mode.update(0); d.renderView(camera);
    const l=mode.barrelLoft; must(l&&l.indexCount>0,'No drawn joined loft after the fixed settle');
    const candidates=[],targetSigma=32.379207311;
    for(let s=0;s<l.sliceCount;s++)if(l.sliceFront[s]===48&&l.sliceFormed[s]>0&&l.sliceWeight[s]>0
      &&(l.slicePhase[s]===1||(l.slicePhase[s]===2&&l.sliceFade[s]>0))
      &&(l.sliceJoined[s]===1||(s>0&&l.sliceJoined[s-1]===1)))candidates.push(s);
    must(candidates.length,'No qualifying formed weighted joined front48 row at fixed settle; no fallback/time search');
    candidates.sort((a,b)=>Math.abs(l.sliceSigma[a]-targetSigma)-Math.abs(l.sliceSigma[b]-targetSigma)||a-b);
    const s=candidates[0], neighbor=l.sliceJoined[s]===1?s+1:s-1;
    must(Math.abs(l.sliceSigma[s]-targetSigma)<=.75,'Nearest qualified front48 row outside fixed sigma match');
    const shoulder=l.sliceTau[Math.min(s,neighbor)]<l.sliceTau[Math.max(s,neighbor)]?-1:1;
    const crest=point(l,s,CREST), rx=l.sliceRayX[s],rz=l.sliceRayZ[s],sx=rz*shoulder,sz=-rx*shoulder;
    const tip=point(l,s,LIP),throat=point(l,s,THROAT),toe=point(l,s,TOE);
    const mouth=tip.map((v,i)=>(v+throat[i])/2);
    const eye=throat.map((v,i)=>.7*(v+toe[i])/2+.3*mouth[i]),unclampedEyeY=eye[1];
    const waterEye=mode.host.heightAt(eye[0],eye[2]); must(Number.isFinite(waterEye),'Eye water height unavailable');
    // Do not clamp onto the uncarved host hump: this eye targets the loft cavity.
    eye[1]=unclampedEyeY;
    const target=[eye[0]+8*sx,eye[1],eye[2]+8*sz];
    const outsideEye=[crest[0]+10*sx+3*rx,crest[1]-1.4,crest[2]+10*sz+3*rz];
    outsideEye[1]=Math.max(outsideEye[1],mode.host.heightAt(outsideEye[0],outsideEye[2])+.4);
    outside={eye:outsideEye,target:[crest[0]+1.5*rx,crest[1]-1.4,crest[2]+1.5*rz]};
    mode.idleView='free'; mode.camera.setView('free'); lab.following=false;
    lab.fly.lookAt(vec(eye),vec(target)); lab.fly.applyTo(camera); camera.updateMatrixWorld(true);
    locked={front:l.sliceFront[s],sigma:l.sliceSigma[s],targetSigma,initialSigmaDelta:Math.abs(l.sliceSigma[s]-targetSigma),
      sourceRow:row(l,s),sourceNeighbor:row(l,neighbor),
      eye,target,unclampedEyeY,eyeWasClamped:eye[1]!==unclampedEyeY,eyeWaterHeight:waterEye,shoulder,camera:view()};
    d.renderView(camera); return locked;
  }
  function forwardObstruction(l) {
    const origin=camera.position, direction=camera.getWorldDirection(camera.position.clone());
    const p=l.positions;let best=null;
    for(let t=0;t<l.indexCount;t+=3){
      const ids=[l.indices[t],l.indices[t+1],l.indices[t+2]];
      const a=ids[0]*3,b=ids[1]*3,c=ids[2]*3;
      const e1=[p[b]-p[a],p[b+1]-p[a+1],p[b+2]-p[a+2]],e2=[p[c]-p[a],p[c+1]-p[a+1],p[c+2]-p[a+2]];
      const pv=[direction.y*e2[2]-direction.z*e2[1],direction.z*e2[0]-direction.x*e2[2],direction.x*e2[1]-direction.y*e2[0]];
      const det=e1[0]*pv[0]+e1[1]*pv[1]+e1[2]*pv[2];if(Math.abs(det)<1e-9)continue;
      const tv=[origin.x-p[a],origin.y-p[a+1],origin.z-p[a+2]],u=(tv[0]*pv[0]+tv[1]*pv[1]+tv[2]*pv[2])/det;if(u<0||u>1)continue;
      const qv=[tv[1]*e1[2]-tv[2]*e1[1],tv[2]*e1[0]-tv[0]*e1[2],tv[0]*e1[1]-tv[1]*e1[0]];
      const v=(direction.x*qv[0]+direction.y*qv[1]+direction.z*qv[2])/det;if(v<0||u+v>1)continue;
      const distance=(e2[0]*qv[0]+e2[1]*qv[1]+e2[2]*qv[2])/det;
      if(distance<=camera.near||(best&&distance>=best.distance))continue;
      const row=Math.floor(ids[0]/S);
      best={distance,front:l.sliceFront[row],row,sigma:l.sliceSigma[row],profilePoints:ids.map(i=>i%S-EXT),
        averageLift:ids.reduce((sum,i)=>sum+l.lift[i],0)/3,point:[origin.x+direction.x*distance,origin.y+direction.y*distance,origin.z+direction.z*distance]};
    }
    return best;
  }
  function metric() {
    const l=mode.barrelLoft,mesh=mode.barrelMesh?.mesh; must(l,'Missing actual drawn loft');
    let s=-1,best=Infinity;
    for(let k=0;k<l.sliceCount;k++)if(l.sliceFront[k]===locked.front&&Math.abs(l.sliceSigma[k]-locked.sigma)<best){s=k;best=Math.abs(l.sliceSigma[k]-locked.sigma);}
    const bounds={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity};
    let inFrustum=0,projected=0,nonfinite=0,joinedPairs=0,minAdvance=null,worstRoof=null;
    let localJoinedPairs=0,localMinAdvance=null,localWorstRoof=null,localInFrustum=0,localProjected=0;
    const localBounds={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity};
    const p=camera.position.clone();
    for(let k=0;k<l.sliceCount;k++)if(l.sliceFront[k]===locked.front){
      const used=l.sliceJoined[k]===1||(k>0&&l.sliceJoined[k-1]===1);
      const localRow=Math.abs(l.sliceSigma[k]-locked.sigma)<=2;
      const localPair=localRow&&k+1<l.sliceCount&&Math.abs(l.sliceSigma[k+1]-locked.sigma)<=2;
      for(let j=CREST;j<=THROAT;j++){
        const o=3*(k*S+EXT+j),x=l.positions[o],y=l.positions[o+1],z=l.positions[o+2];
        if(!Number.isFinite(x+y+z)){nonfinite++;continue;}
        if(used&&l.sliceWeight[k]>0){p.set(x,y,z).project(camera);
          if(p.z>=-1&&p.z<=1){projected++;const px=(p.x+1)*d.canvas.width/2,py=(1-p.y)*d.canvas.height/2;
            bounds.minX=Math.min(bounds.minX,px);bounds.maxX=Math.max(bounds.maxX,px);bounds.minY=Math.min(bounds.minY,py);bounds.maxY=Math.max(bounds.maxY,py);
            if(localRow){localProjected++;localBounds.minX=Math.min(localBounds.minX,px);localBounds.maxX=Math.max(localBounds.maxX,px);localBounds.minY=Math.min(localBounds.minY,py);localBounds.maxY=Math.max(localBounds.maxY,py);}
            if(Math.abs(p.x)<=1&&Math.abs(p.y)<=1){inFrustum++;if(localRow)localInFrustum++;}}}
        if(k+1<l.sliceCount&&l.sliceJoined[k]===1&&l.sliceFront[k+1]===locked.front){
          const q=o+3*S,dx=l.positions[q]-x,dy=l.positions[q+1]-y,dz=l.positions[q+2]-z;
          const advance=Math.min(dx*l.sliceRayZ[k]-dz*l.sliceRayX[k],dx*l.sliceRayZ[k+1]-dz*l.sliceRayX[k+1]);
          minAdvance=minAdvance===null?advance:Math.min(minAdvance,advance);
          if(!worstRoof||Math.abs(dy)>worstRoof.absDy)worstRoof={rows:[k,k+1],profilePoint:j,
            absDy:Math.abs(dy),length:Math.hypot(dx,dy,dz),from:row(l,k),to:row(l,k+1)};
          if(localPair){localMinAdvance=localMinAdvance===null?advance:Math.min(localMinAdvance,advance);
            if(!localWorstRoof||Math.abs(dy)>localWorstRoof.absDy)localWorstRoof={rows:[k,k+1],profilePoint:j,
              absDy:Math.abs(dy),length:Math.hypot(dx,dy,dz),from:row(l,k),to:row(l,k+1)};}
        }
      }
      if(l.sliceJoined[k]===1)joinedPairs++;
      if(l.sliceJoined[k]===1&&localPair)localJoinedPairs++;
    }
    const landmarks=s<0?null:Object.fromEntries([['crest',CREST],['lip',LIP],['throat',THROAT],['toe',TOE]].map(([name,j])=>{
      const world=point(l,s,j);p.fromArray(world).project(camera);
      return[name,{world,pixel:[(p.x+1)*d.canvas.width/2,(1-p.y)*d.canvas.height/2],ndcZ:p.z}];}));
    const a=landmarks?.lip.world,b=landmarks?.throat.world;
    const selectedPairStart=s<0?-1:l.sliceJoined[s]===1?s:s>0&&l.sliceJoined[s-1]===1?s-1:-1;
    let selectedPairPoint83=null;
    if(selectedPairStart>=0&&l.sliceFront[selectedPairStart]===locked.front&&l.sliceFront[selectedPairStart+1]===locked.front){
      const from=point(l,selectedPairStart,83),to=point(l,selectedPairStart+1,83);
      const delta=to.map((v,i)=>v-from[i]);selectedPairPoint83={profilePoint:83,from:row(l,selectedPairStart),to:row(l,selectedPairStart+1),
        signedDy:delta[1],absDy:Math.abs(delta[1]),edgeLength:Math.hypot(...delta)};}
    const rawEyeHeight=mode.host.heightAt(camera.position.x,camera.position.z),eyeY=camera.position.y;
    must(Number.isFinite(rawEyeHeight),'Current raw eye height unavailable');
    return{forwardObstruction:forwardObstruction(l),selected:row(l,s),nearestSigmaDelta:s<0?null:best,selectedFrontPresent:s>=0,loft:{slices:l.sliceCount,
      vertices:l.vertexCount,indices:l.indexCount},mesh:{visible:mesh?.visible===true,drawCount:mesh?.geometry.drawRange.count??null},
      roof:{joinedPairs,minAdvance,worstRoof,nonfinite},projection:{selectedFrontCoreInFrustum:inFrustum,
      selectedFrontCoreDepthSupported:projected,bounds:projected?bounds:null},landmarks,
      localWorstRoof:{radiusMeters:2,anchorSigma:locked.sigma,joinedPairs:localJoinedPairs,minAdvance:localMinAdvance,
        worstRoof:localWorstRoof,selectedPairPoint83,coreInFrustum:localInFrustum,
        coreDepthSupported:localProjected,bounds:localProjected?localBounds:null},
      openingLipThroatMeters:a?Math.hypot(...a.map((v,i)=>v-b[i])):null,
      cameraWaterClassification:{eyeY,rawHostHeight:rawEyeHeight,eyeMinusRawHeight:eyeY-rawEyeHeight,
        belowRawSurface:eyeY<rawEyeHeight,legacyRawUnderwater:eyeY<rawEyeHeight-.1,renderViewBelowSurface:mode.cameraBelowSurface(.1,camera.position),
        modeCameraBelowSurface:typeof mode.cameraBelowSurface==='function'?mode.cameraBelowSurface():null,drawnWater:mode.sweptBarrel.waterAt(camera.position.x,camera.position.y,camera.position.z,.1)??null,
        scope:'Legacy raw host versus current drawn-triangle camera classification; no shader displacement or fragment classification'},
      surfaceRevision:d.water.surfaceRevision,waterTime:d.water.materialUniforms.waterTime.value,
      waterTubeCount:d.water.materialUniforms.waterTubeCount.value,holdClearDrawing:mode.sweptBarrel.holdsClearDrawing};
  }
  function pair(index) {
    must(lab.clock.paused&&mode.host.outstandingSteps===0,'Pair requires drained paused host');
    const snap=mode.host.snapshot,status=snap.status,front=snap.front,surface=snap.surface,tubes=snap.tubes;
    const seaTime=status.seaTime,pose=JSON.stringify(view()); const order=index%2?['B','A']:['A','B'];
    const variants={};
    // No await/yield in this transaction: worker publications/RAF cannot arrive between A and B.
    for(const label of order){mode.sweptBarrel.setHoldClearDrawing(label==='B');d.renderView(camera);
      variants[label]={metrics:metric(),png:d.canvas.toDataURL('image/png')};
      must(mode.host.snapshot===snap&&snap.status===status&&snap.front===front&&snap.surface===surface&&snap.tubes===tubes
        &&status.seaTime===seaTime&&mode.host.outstandingSteps===0&&JSON.stringify(view())===pose,'A/B snapshot/camera changed');}
    mode.sweptBarrel.setHoldClearDrawing(false);d.renderView(camera);
    return{index,seaTime,order,snapshotUnchanged:true,cameraUnchanged:true,frontCount:snap.frontCount,
      tubeCount:snap.tubeCount,lipCount:snap.lipCount,variants};
  }
  async function steps(n) {
    const host=mode.host,base=host.snapshot.status.seaTime;must(lab.clock.paused&&host.outstandingSteps===0,'Step requires pause/drain');
    for(let done=0;done<n;){const count=Math.min(6,n-done);for(let k=0;k<count;k++)d.step({paddle:false,popUp:false,steer:0});
      while(host.outstandingSteps){await new Promise(r=>setTimeout(r,2));}done+=count;}
    const actual=host.snapshot.status.seaTime-base;must(Math.abs(actual-n/60)<1e-7,'Fixed step clock mismatch');
    mode.update(0);return{steps:n,baseSeaTime:base,seaTime:host.snapshot.status.seaTime};
  }
  function exterior() {
    const c=camera.clone();c.position.fromArray(outside.eye);c.lookAt(vec(outside.target));c.updateMatrixWorld(true);
    mode.sweptBarrel.setHoldClearDrawing(true);d.renderView(c);
    const shot={seaTime:mode.host.snapshot.status.seaTime,camera:{position:c.position.toArray(),quaternion:c.quaternion.toArray(),projection:c.projectionMatrix.toArray(),matrixWorld:c.matrixWorld.toArray()},png:d.canvas.toDataURL('image/png')};
    d.renderView(camera);return shot;
  }
  window.__clearRoofAB={choose,pair,steps,exterior};
}

let page;
save();
try {
  page=await launch({url:args.url,width:1708,height:966,port:9678,args:['--mute-audio']});
  report.browserErrors=[];
  page.on('Runtime.consoleAPICalled',e=>{if(e.type==='error'&&report.browserErrors.length<12)report.browserErrors.push((e.args??[]).map(a=>a.value??a.description??'').join(' ').slice(0,2048));});
  page.on('Runtime.exceptionThrown',e=>{if(report.browserErrors.length<12)report.browserErrors.push(String(e.exceptionDetails?.exception?.description??e.exceptionDetails?.text).slice(0,2048));});
  await page.eval(`localStorage.setItem('breakline.settings.v1',${JSON.stringify(JSON.stringify({graphics:GRAPHICS,detected:{preset:'high',water:'accurate',lowPerformance:false},seen:{rideHints:true,lowPerformanceNotice:true}}))})`);
  await page.send('Page.reload'); await page.waitFor('window.breaklineDiagnostics && window.breaklineLab',20000);
  report.initial=await page.eval(`(async()=>{const d=breaklineDiagnostics,lab=breaklineLab;
    lab.clock.paused=true;await d.start(${JSON.stringify(SETTINGS)},${JSON.stringify(OVERRIDES)},{rider:false,lab:true});
    lab.active=true;lab.clock.paused=true;while(d.mode.host.outstandingSteps)await new Promise(r=>setTimeout(r,2));
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
  await page.eval(`(${install.toString()})()`);
  report.settle=await page.eval('__clearRoofAB.steps(1047)');report.selection=await page.eval('__clearRoofAB.choose()');save();
  const outside=await page.eval('__clearRoofAB.exterior()'),outsidePng=outside.png;delete outside.png;report.exterior=outside;png('outside-B-held.png',outsidePng);
  for(let i=0;i<12;i++){
    const advancement=i?await page.eval('__clearRoofAB.steps(3)'):null;
    const pair=await page.eval(`__clearRoofAB.pair(${i})`);
    const a=pair.variants.A.png,b=pair.variants.B.png;delete pair.variants.A.png;delete pair.variants.B.png;
    pair.advancement=advancement;report.pairs.push(pair);save();
    png(`pair-${String(i).padStart(2,'0')}-A-default.png`,a);png(`pair-${String(i).padStart(2,'0')}-B-clear-hold.png`,b);
  }
  assert.deepEqual(report.browserErrors,[],'Native runtime/shader console errors');report.complete=true;
} catch(error) { report.firstFailure=String(error?.stack??error);process.exitCode=1; }
finally { if(page)try{await page.close();report.chromeClosed=true;}catch(error){report.cleanupFailure=String(error);report.complete=false;process.exitCode=1;}
  else if(existsSync(join(OUT,'launcher.json')))report.chromeClosed=JSON.parse(readFileSync(join(OUT,'launcher.json'))).ownedChromeClosed;
  save(); }
