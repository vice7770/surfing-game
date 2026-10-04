// Source-only preparation. The Python owner is the sole armed entry point.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { launch } from './native-owned.mjs';
import { inspectSweptRay } from './ray-faces.mjs';

const WORK = '/private/tmp/tube-roller-attribution-20261004';
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const i = a.indexOf('='); assert(a.startsWith('--') && i > 2); return [a.slice(2, i), a.slice(i + 1)];
}));
assert.equal(args.run, 'true', 'Run only through the bounded Python owner');
assert(['baseline','candidate'].includes(args.arm),'Explicit independently initialized arm required');
const ARM=args.arm,PORT=4285,CDP=9695;
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
const report = { schema:'tube-roller-attribution-native/v1',arm:ARM,complete:false,firstFailure:null,
  lineage:{firstRun:'/private/tmp/tube-clear-roof-ab-20261004/native-first/report.json',
    firstFailure:'96MiB PNG total cap after nine complete pairs and pair9 A; retained original19 PNGs unchanged',
    focusedRun:'/private/tmp/tube-clear-roof-focused-ab-20261004/native-first/report.json',
    focusedSources:'/private/tmp/tube-clear-roof-focused-ab-20261004',
    originalSources:'/private/tmp/tube-clear-roof-ab-20261004',
    dist:'/private/tmp/tube-no-splash-ribbons-20261004/dist'},
  settings:SETTINGS, overrides:OVERRIDES, graphics:GRAPHICS,
  schedule:{ settleSteps:1047,fixedStepSeconds:1/60,settlePhysicalSeconds:17.45,heldFrames:2,stepsBeforeFrames:[18,12],
    offsetsPhysicalSeconds:[.3,.5],
    nominalSeaTime:{initial:535.723,settled:553.173,qualification:'Nominal original trace clock, not a substituted exact capture clock'} },
  target:{front:48,sigma:32.379207311,maximumInitialSigmaDeltaMeters:.75,localRadiusMeters:2},
  diagnosticOutput:{canvas:[1708,879],pixelRatio:1,resizeCalls:1,fidelityPass:false,fpsClaim:false},
  cameraHypothesis:{eye:[155.32094597816467,4.819468761980533,-.038138747215270996],
    target:[150.3824691772461,.8194687619805336,-6.938243746757507],automaticPoseHunt:false,
    scope:'Predetermined exterior pose from the real-rider probe, fixed across independent arms over 0.5 seconds'},
  newScene:true,videoReproduction:false,physicsFlagChanged:false,holdClearDrawing:true,physicalStateEqualityClaim:false,
  frames:[],artifacts:[],pngBytes:0,
  visualReview:{ required:true, cavityOcclusion:'unreviewed', movingTubePass:false },
  limitations:['Projected vertices and geometric opening are support diagnostics, not visible fragments or seam attribution.',
    'Separate fresh seeded scenes do not establish physical-state equality; actual config/status/time/roof metrics are retained for comparison.',
    'The once-resized PR1 PNGs are diagnostic output, with no original pixel-fidelity or FPS claim.',
    'No FPS, physics, visual-quality, or adoption pass is inferred from this capture.'] };
function save() {
  const bytes = Buffer.from(JSON.stringify(report)); assert(bytes.length <= 262144, 'Compact report cap');
  writeFileSync(join(OUT,'report.json'), bytes);
}
function png(name, url) {
  assert(url.startsWith('data:image/png;base64,'), 'Original canvas PNG required');
  const bytes = Buffer.from(url.slice(22),'base64');
  assert(bytes.length > 8 && bytes.length <= 8*1024*1024, 'PNG file cap');
  assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])), 'PNG signature');
  assert(report.pngBytes + bytes.length <= 48*1024*1024, 'PNG total cap');
  writeFileSync(join(OUT,name),bytes); report.pngBytes += bytes.length;
  report.artifacts.push({file:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}); save();
}

// Serialized into the page; no simulation imports or solver replacement.
function install(inspectSweptRay) {
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
  const rayDirection=(eye,target)=>{const delta=target.map((v,i)=>v-eye[i]),length=Math.hypot(...delta);
    must(length>0,'Nonzero predetermined ray required');return delta.map(v=>v/length);};
  const rayOptions=()=>({near:camera.near,far:camera.far,hitLimit:3});
  let locked, latestTrace;
  function instrument() {
    const builder=mode.sweptBarrel.loft;
    must(builder&&typeof builder.dropOverlaps==='function'&&typeof builder.sealRuns==='function','Actual loft builder unavailable');
    const drop=builder.dropOverlaps,seal=builder.sealRuns;
    builder.dropOverlaps=function(...args){
      const r=this.result;
      latestTrace={beforeOverlap:Array.from(r.sliceJoined.subarray(0,r.sliceCount))};
      const result=drop.apply(this,args);
      latestTrace.afterOverlap=Array.from(r.sliceJoined.subarray(0,r.sliceCount));
      return result;
    };
    builder.sealRuns=function(...args){
      const r=this.result;
      latestTrace.beforeSeal=Array.from(r.sliceWeight.subarray(0,r.sliceCount));
      return seal.apply(this,args);
    };
    return {wrapsActualMethods:true,callsEachOriginalOnce:true,sourceArraysWritten:false,simulationChanged:false};
  }
  function trace() {
    const l=mode.barrelLoft;
    must(latestTrace&&latestTrace.beforeSeal.length===l.sliceCount,'Latest exact-build trace missing');
    const entries=[];
    for(let s=0;s<l.sliceCount;s++)if(l.sliceFront[s]===locked.front)entries.push({
      ...row(l,s),joinedBeforeOverlap:latestTrace.beforeOverlap[s],joinedAfterOverlap:latestTrace.afterOverlap[s],
      overlapRemoved:latestTrace.beforeOverlap[s]===1&&latestTrace.afterOverlap[s]===0,
      beforeSealWeight:latestTrace.beforeSeal[s],sealReduced:l.sliceWeight[s]<latestTrace.beforeSeal[s]});
    const runs=[];
    for(let first=0;first+1<l.sliceCount;){
      if(l.sliceJoined[first]!==1){first++;continue;}
      let last=first+1;while(last+1<l.sliceCount&&l.sliceJoined[last]===1)last++;
      if(l.sliceFront[first]===locked.front)runs.push({first,last,firstRow:row(l,first),lastRow:row(l,last),
        endpoints:[first,last].map(s=>({row:s,landmarks:Object.fromEntries([['crest',CREST],['lip',LIP],['throat',THROAT],['toe',TOE]].map(([name,j])=>{
          const world=point(l,s,j),p=vec(world).project(camera);return[name,{world,pixel:[(p.x+1)*d.canvas.width/2,(1-p.y)*d.canvas.height/2],ndcZ:p.z}];
        }))}))});
      first=last+1;
    }
    return {scope:'Observed pre/post overlap joins and pre/final seal weights for the actual drawn front; original gaps are not attributed to a cause',rows:entries,runs};
  }
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
  function forwardObstruction(l) {
    const eye=camera.position.toArray(),direction=camera.getWorldDirection(camera.position.clone()).toArray();
    return inspectSweptRay(l,mode.barrelMesh.mesh,eye,rayDirection(eye,eye.map((v,i)=>v+direction[i])),rayOptions());
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
    return{selected:row(l,s),selectedWithinInitialTolerance:s>=0&&best<=.75,nearestSigmaDelta:s<0?null:best,selectedFrontPresent:s>=0,loft:{slices:l.sliceCount,
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
  function frame(index) {
    must(lab.clock.paused&&mode.host.outstandingSteps===0&&mode.sweptBarrel.holdsClearDrawing===true,'Held frame requires drained paused host');
    const snap=mode.host.snapshot,status=snap.status,front=snap.front,surface=snap.surface,tubes=snap.tubes;
    const seaTime=status.seaTime,pose=JSON.stringify(view());
    d.renderView(camera);const metrics=metric(),png=d.canvas.toDataURL('image/png');
    const exactTrace=trace(),l=mode.barrelLoft;
    const positions=l.positions.slice(0,3*l.vertexCount),indices=l.indices.slice(0,l.indexCount);
    const spray=mode.spray.mesh,geometry=spray.geometry;
    const looks=geometry.getAttribute('look'),kinds=geometry.getAttribute('kind'),drawn=geometry.drawRange.count;
    must(looks.itemSize===2&&kinds.itemSize===1&&Number.isFinite(drawn),'Actual renderable spray attributes required');
    const originalLooks=looks.array.slice(),originalKinds=kinds.array.slice();
    const sprayPosition=geometry.getAttribute('position'),originalSprayPosition=sprayPosition.array.slice();
    const tally={};let suppressed=0,opacitySum=0;const rollerBounds={minX:Infinity,minY:Infinity,minZ:Infinity,maxX:-Infinity,maxY:-Infinity,maxZ:-Infinity};
    for(let k=0;k<drawn;k++){
      const kind=kinds.array[k];tally[kind]=(tally[kind]??0)+1;
      if(kind===2){suppressed++;opacitySum+=looks.array[2*k+1];for(let j=0;j<3;j++){const v=sprayPosition.array[3*k+j],name=['X','Y','Z'][j];rollerBounds['min'+name]=Math.min(rollerBounds['min'+name],v);rollerBounds['max'+name]=Math.max(rollerBounds['max'+name],v);}}
    }
    const hidden=[mode.spray.mesh,mode.bubbles.mesh],visibility=hidden.map(mesh=>mesh.visible);
    let noRollersPng,inspectionPng,restoredPng;
    try{
      for(let k=0;k<drawn;k++)if(kinds.array[k]===2)looks.array[2*k+1]=0;
      looks.clearUpdateRanges();looks.addUpdateRange(0,2*drawn);looks.needsUpdate=true;
      d.renderView(camera);noRollersPng=d.canvas.toDataURL('image/png');
      looks.array.set(originalLooks);looks.clearUpdateRanges();looks.addUpdateRange(0,2*drawn);looks.needsUpdate=true;
      hidden.forEach(mesh=>{mesh.visible=false;});d.renderView(camera);inspectionPng=d.canvas.toDataURL('image/png');
    }
    finally{
      looks.array.set(originalLooks);looks.clearUpdateRanges();looks.addUpdateRange(0,2*drawn);looks.needsUpdate=true;
      hidden.forEach((mesh,k)=>{mesh.visible=visibility[k];});d.renderView(camera);restoredPng=d.canvas.toDataURL('image/png');
    }
    must(hidden.every((mesh,k)=>mesh.visible===visibility[k]),'Visibility restoration failed');
    must(originalLooks.every((v,k)=>Object.is(v,looks.array[k]))&&originalKinds.every((v,k)=>Object.is(v,kinds.array[k]))&&originalSprayPosition.every((v,k)=>Object.is(v,sprayPosition.array[k]))&&geometry.drawRange.count===drawn,'Spray render data not restored exactly');
    must(png===restoredPng,'Normal canvas did not restore byte-exactly');
    must(positions.length===3*mode.barrelLoft.vertexCount&&indices.length===mode.barrelLoft.indexCount&&
      positions.every((v,k)=>Object.is(v,mode.barrelLoft.positions[k]))&&indices.every((v,k)=>v===mode.barrelLoft.indices[k]),'Draw geometry changed during view capture');
    must(mode.host.snapshot===snap&&snap.status===status&&snap.front===front&&snap.surface===surface&&snap.tubes===tubes
      &&status.seaTime===seaTime&&mode.host.outstandingSteps===0&&JSON.stringify(view())===pose,'Capture snapshot/camera changed');
    must(pose===JSON.stringify(locked.camera),'Predetermined camera drifted');
    return{index,seaTime,status:{compute:status.compute,cells:status.cells,stepMs:status.stepMs},
      snapshotUnchangedDuringCapture:true,cameraUnchanged:true,frontCount:snap.frontCount,tubeCount:snap.tubeCount,lipCount:snap.lipCount,metrics,trace:exactTrace,
      spray:{drawn,tally,suppressedKind:2,suppressedCount:suppressed,originalOpacitySum:opacitySum,bounds:suppressed?rollerBounds:null,allAttributesRestored:true,normalCanvasRestoredByteExactly:true},
      png,noRollersPng,inspectionPng,geometryUnchangedDuringCapture:true,allVisibilityRestored:true,
      diagnosticScope:'Same paused snapshot/camera, only kind2 foam-ball render opacity set to zero and exactly restored. Inspection also hides all spray/bubbles. Water foam and barrel geometry remain drawn. No solver input, physics, foam texture, particle population or camera changes.'};
  }
  async function steps(n) {
    const host=mode.host,base=host.snapshot.status.seaTime;must(lab.clock.paused&&host.outstandingSteps===0,'Step requires pause/drain');
    for(let done=0;done<n;){const count=Math.min(6,n-done);for(let k=0;k<count;k++)d.step({paddle:false,popUp:false,steer:0});
      while(host.outstandingSteps){await new Promise(r=>setTimeout(r,2));}done+=count;}
    const actual=host.snapshot.status.seaTime-base;must(Math.abs(actual-n/60)<1e-7,'Fixed step clock mismatch');
    mode.update(0);return{steps:n,baseSeaTime:base,seaTime:host.snapshot.status.seaTime};
  }
  window.__clearRoofAB={choose,frame,steps,instrument};
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
  await page.eval(`(${install.toString()})(${inspectSweptRay.toString()})`);
  report.settle=await page.eval('__clearRoofAB.steps(1047)');report.selection=await page.eval('__clearRoofAB.choose()');report.instrumentation=await page.eval('__clearRoofAB.instrument()');save();
  for(let i=0;i<2;i++){
    const advancement=await page.eval(`__clearRoofAB.steps(${[18,12][i]})`);
    const frame=await page.eval(`__clearRoofAB.frame(${i})`);
    const names={png:'normal',noRollersPng:'no-rollers',inspectionPng:'inspection'};
    const images=Object.fromEntries(Object.keys(names).map(key=>[key,frame[key]]));
    for(const key of Object.keys(names))delete frame[key];
    frame.advancement=advancement;report.frames.push(frame);save();
    for(const [key,name]of Object.entries(names))png(`${name}-${i}.png`,images[key]);
  }
  assert.deepEqual(report.browserErrors,[],'Native runtime/shader console errors');report.complete=true;
} catch(error) { report.firstFailure=String(error?.stack??error);process.exitCode=1; }
finally { if(page)try{await page.close();report.chromeClosed=true;}catch(error){report.cleanupFailure=String(error);report.complete=false;process.exitCode=1;}
  else if(existsSync(join(OUT,'launcher.json')))report.chromeClosed=JSON.parse(readFileSync(join(OUT,'launcher.json'))).ownedChromeClosed;
  save(); }

process.exit(process.exitCode ?? 0);
