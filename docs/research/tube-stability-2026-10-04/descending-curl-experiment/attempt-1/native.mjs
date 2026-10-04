// Source-only preparation. The Python owner is the sole armed entry point.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { launch } from './native-owned.mjs';
import { inspectSweptRay } from './ray-faces.mjs';

const WORK = '/private/tmp/tube-whole-curl-native-20261004';
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const i = a.indexOf('='); assert(a.startsWith('--') && i > 2); return [a.slice(2, i), a.slice(i + 1)];
}));
assert.equal(args.run, 'true', 'Run only through the bounded Python owner');
assert(['baseline','candidate'].includes(args.arm),'Explicit independently initialized arm required');
const ARM=args.arm,PORT=4290,CDP=9700;
assert.equal(args.url, `http://127.0.0.1:${PORT}/?diagnostics&physicsDx=1&physicsDz=1`);
const OUT = resolve(args.out ?? ''); assert(OUT.startsWith(WORK + '/') && !existsSync(OUT));
mkdirSync(OUT); process.env.WHOLE_CURL_LAUNCHER_REPORT = join(OUT, 'launcher.json');
const SETTINGS = { spot:'padang', stage:2, compute:'auto', source:'buoy', significantHeight:4,
  peakPeriod:10, directionDegrees:10, spread:0.4, tide:0, windSpeed:0,
  stormWindSpeed:18, stormFetchKm:600, stormDurationHours:36, stormDistanceKm:3000 };
const OVERRIDES = { seed:1, componentCount:24, spreading:11.720624206334085, dx:1, fineSpacing:1 };
const GRAPHICS = { preset:'custom', renderScale:1, nativePixelDensity:true, frameLimit:60,
  waterSimulation:'accurate', seaDetail:'standard', caustics:true, sprayMist:true,
  oceanView:'far', foam:'detailed', waterLook:'rich', particles:'high' };
const report = { schema:'tube-whole-curl-native/v1',arm:ARM,complete:false,firstFailure:null,
  lineage:{baselineNoFoamBalls:'/private/tmp/tube-no-foam-balls-20261004/native-first/report.json',baselineOwner:'/private/tmp/tube-no-foam-balls-20261004/native-first-owner.json',firstRun:'/private/tmp/tube-clear-roof-ab-20261004/native-first/report.json',
    firstFailure:'96MiB PNG total cap after nine complete pairs and pair9 A; retained original19 PNGs unchanged',
    focusedRun:'/private/tmp/tube-clear-roof-focused-ab-20261004/native-first/report.json',
    focusedSources:'/private/tmp/tube-clear-roof-focused-ab-20261004',
    originalSources:'/private/tmp/tube-clear-roof-ab-20261004',
    dist:WORK+'/dist'},
  settings:SETTINGS, overrides:OVERRIDES, graphics:GRAPHICS,
  schedule:{ settleSteps:1047,fixedStepSeconds:1/60,settlePhysicalSeconds:17.45,heldFrames:3,pngAtStepIndices:[18,30,60],movingSingleSteps:60,
    offsetsPhysicalSeconds:[.3,.5,1],captureIncludesSettledFrame:true,
    nominalSeaTime:{initial:535.723,settled:553.173,qualification:'Nominal original trace clock, not a substituted exact capture clock'} },
  target:{front:48,sigma:32.379207311,maximumInitialSigmaDeltaMeters:.75,localRadiusMeters:2},
  diagnosticOutput:{canvas:[1708,879],pixelRatio:1,resizeCalls:1,fidelityPass:false,fpsClaim:false},
  cameraHypothesis:{eye:[155.32094597816467,4.819468761980533,-.038138747215270996],
    target:[150.3824691772461,.8194687619805336,-6.938243746757507],automaticPoseHunt:false,
    scope:'Predetermined exterior pose from the real-rider probe, fixed through the settled initial frame and 60 ordinary single steps (+1.0 physics seconds)'},
  newScene:true,videoReproduction:false,physicsFlagChanged:false,holdClearDrawing:true,physicalStateEqualityClaim:false,
  frames:[],motionFrames:[],artifacts:[],pngBytes:0,video:null,
  videoContract:{singleClip:true,maximumBytes:16*1024*1024,maximumPngBytes:48*1024*1024,maximumReportBytes:2*1024*1024,
    requestedFrames:61,ordinaryPhysicsSteps:60,canvasCaptureStreamRate:0,encodedPlaybackFpsClaim:false,
    wallTimestampsAreNotFixedPhysicsPlayback:true,opacityOrVisibilityToggles:false},
  visualReview:{ required:true, cavityOcclusion:'unreviewed', movingTubePass:false },
  limitations:['Projected vertices and geometric opening are support diagnostics, not visible fragments or seam attribution.',
    'Separate fresh seeded scenes do not establish physical-state equality; actual config/status/time/roof metrics are retained for comparison.',
    'The once-resized PR1 PNGs are diagnostic output, with no original pixel-fidelity or FPS claim.',
    'No FPS, physics, visual-quality, or adoption pass is inferred from this capture.'] };
function save() {
  const bytes = Buffer.from(JSON.stringify(report)); assert(bytes.length <= 2*1024*1024, '2MiB report cap');
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
    life:l.sliceLife[s],phase:l.slicePhase[s],collapseSeconds:l.sliceCollapse[s],formed:l.sliceFormed[s],weight:l.sliceWeight[s],
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
    if(best>.75)s=-1; // Fixed target missing; retain absence, never use a distant replacement row.
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
  function fixedTarget(l) {
    let selected=-1,best=Infinity;
    for(let k=0;k<l.sliceCount;k++)if(l.sliceFront[k]===locked.front){
      const delta=Math.abs(l.sliceSigma[k]-locked.sigma);
      if(delta<best){selected=k;best=delta;}
    }
    if(best>.75)selected=-1;
    return {selected,nearestSigmaDelta:Number.isFinite(best)?best:null};
  }
  function observe(physicalStepIndex) {
    const host=mode.host,l=mode.barrelLoft;
    must(lab.clock.paused&&host.outstandingSteps===0,'Moving observation requires drained paused host');
    must(JSON.stringify(view())===JSON.stringify(locked.camera),'Predetermined camera drifted; never retarget');
    const {selected:s,nearestSigmaDelta}=fixedTarget(l);
    let frontRows=0,frontJoinedPairs=0;
    for(let k=0;k<l.sliceCount;k++)if(l.sliceFront[k]===locked.front){frontRows++;if(l.sliceJoined[k]===1)frontJoinedPairs++;}
    const pair=s<0?-1:l.sliceJoined[s]===1?s:s>0&&l.sliceJoined[s-1]===1&&l.sliceFront[s-1]===locked.front?s-1:-1;
    const selected=row(l,s);
    const qualified=!!selected&&selected.formed>0&&selected.weight>0&&pair>=0&&(selected.phase===1||(selected.phase===2&&selected.fade>0));
    return {physicalStepIndex,offsetPhysicalSeconds:physicalStepIndex/60,seaTime:host.snapshot.status.seaTime,
      wallObservedAtIso:new Date().toISOString(),wallPerformanceMs:performance.now(),
      selectedStrip:{fixedFront:locked.front,fixedSigma:locked.sigma,requestedSigma:locked.targetSigma,
        nearestSigmaDelta,selected,qualified,withinInitialTolerance:s>=0,
        joinedPair:pair>=0?{from:row(l,pair),to:row(l,pair+1)}:null,
        missing:s<0,missingPolicy:'Keep camera and original target; record absence without replacement'},
      collapse:selected?{seconds:selected.collapseSeconds,phase:selected.phase,life:selected.life,fade:selected.fade,weight:selected.weight}:null,
      loft:{slices:l.sliceCount,vertices:l.vertexCount,indices:l.indexCount,
        meshVisible:mode.barrelMesh?.mesh.visible===true,meshDrawCount:mode.barrelMesh?.mesh.geometry.drawRange.count??null,
        selectedFrontRows:frontRows,selectedFrontJoinedPairs:frontJoinedPairs},
      snapshotCounts:{front:host.snapshot.frontCount,tubes:host.snapshot.tubeCount,lip:host.snapshot.lipCount},
      hostOutstandingSteps:host.outstandingSteps,cameraUnchanged:true,holdClearDrawing:mode.sweptBarrel.holdsClearDrawing};
  }
  function frame(index,physicalStepIndex) {
    must(lab.clock.paused&&mode.host.outstandingSteps===0&&mode.sweptBarrel.holdsClearDrawing===true,'Normal PNG requires drained paused host');
    const snap=mode.host.snapshot,status=snap.status,front=snap.front,surface=snap.surface,tubes=snap.tubes;
    const seaTime=status.seaTime,pose=JSON.stringify(view());
    const l=mode.barrelLoft,positions=l.positions.slice(0,3*l.vertexCount),indices=l.indices.slice(0,l.indexCount);
    const sprayGeometry=mode.spray.mesh.geometry,kinds=sprayGeometry.getAttribute('kind'),drawn=sprayGeometry.drawRange.count;
    must(kinds.itemSize===1&&Number.isFinite(drawn),'Actual normal spray attributes required');
    const sourceTally={},tally={};
    for(let k=0;k<snap.sprayCount;k++){const kind=snap.spray[6*k+5];sourceTally[kind]=(sourceTally[kind]??0)+1;}
    for(let k=0;k<drawn;k++){const kind=kinds.array[k];tally[kind]=(tally[kind]??0)+1;}
    const metrics=metric(),png=d.canvas.toDataURL('image/png'),exactTrace=trace();
    must(positions.length===3*mode.barrelLoft.vertexCount&&indices.length===mode.barrelLoft.indexCount&&
      positions.every((v,k)=>Object.is(v,mode.barrelLoft.positions[k]))&&indices.every((v,k)=>v===mode.barrelLoft.indices[k]),'Geometry changed during normal PNG capture');
    must(mode.host.snapshot===snap&&snap.status===status&&snap.front===front&&snap.surface===surface&&snap.tubes===tubes
      &&status.seaTime===seaTime&&mode.host.outstandingSteps===0&&JSON.stringify(view())===pose,'PNG snapshot/camera changed');
    must(pose===JSON.stringify(locked.camera),'Predetermined camera drifted');
    return {index,physicalStepIndex,offsetPhysicalSeconds:physicalStepIndex/60,seaTime,
      status:{compute:status.compute,cells:status.cells,stepMs:status.stepMs},snapshotUnchangedDuringCapture:true,cameraUnchanged:true,
      frontCount:snap.frontCount,tubeCount:snap.tubeCount,lipCount:snap.lipCount,metrics,trace:exactTrace,
      spray:{sourceCount:snap.sprayCount,sourceTally,drawn,tally,drawnKind2Count:tally[2]??0},png,
      geometryUnchangedDuringCapture:true,opacityOrVisibilityToggles:false,
      diagnosticScope:'Original normally rendered canvas PNG. No opacity, visibility, geometry, solver, source population or camera overrides during capture.'};
  }
  async function ordinaryStep(physicalStepIndex) {
    const host=mode.host,base=host.snapshot.status.seaTime;
    must(lab.clock.paused&&host.outstandingSteps===0,'Ordinary single step requires pause/drain');
    d.step({paddle:false,popUp:false,steer:0});
    while(host.outstandingSteps)await new Promise(resolve=>setTimeout(resolve,2));
    const seaTime=host.snapshot.status.seaTime;
    must(Math.abs(seaTime-base-1/60)<1e-7,'Single physics step clock mismatch');
    mode.update(1/60);
    d.renderView(camera);
    return {...observe(physicalStepIndex),advancement:{requestedSteps:1,baseSeaTime:base,seaTime,visualUpdateSeconds:1/60}};
  }
  const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));
  const MAX_VIDEO_BYTES=16*1024*1024;
  let recording;
  function videoCapabilities() {
    const candidates=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
    return {mediaRecorder:typeof MediaRecorder==='function',canvasCaptureStream:typeof d.canvas.captureStream==='function',
      supportedWebm:candidates.map(mimeType=>({mimeType,supported:typeof MediaRecorder==='function'&&MediaRecorder.isTypeSupported(mimeType)}))};
  }
  async function beginVideo() {
    must(!recording,'Exactly one recorder/clip is permitted');
    const capabilities=videoCapabilities();
    must(capabilities.mediaRecorder&&capabilities.canvasCaptureStream,'Native MediaRecorder or canvas.captureStream unavailable; no fallback');
    const mimeType=capabilities.supportedWebm.find(entry=>entry.supported)?.mimeType;
    must(mimeType,'No supported WebM MediaRecorder type; no alternate media capture');
    const stream=d.canvas.captureStream(0),track=stream.getVideoTracks()[0];
    if(!track||typeof track.requestFrame!=='function'){stream.getTracks().forEach(t=>t.stop());throw Error('Canvas captureStream(0) requestFrame unavailable; no fallback');}
    let recorder;try{recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:4_000_000});}
    catch(error){stream.getTracks().forEach(track=>track.stop());throw error;}
    recording={recorder,stream,track,chunks:[],bytes:0,error:null,requests:0,bytesOut:null,
      metadata:{mimeType,actualMimeType:recorder.mimeType,videoBitsPerSecondRequested:4_000_000,canvas:[d.canvas.width,d.canvas.height],
        streamFrameRateRequested:0,complete:false,startedAtIso:new Date().toISOString(),startedAtPerformanceMs:performance.now(),
        capture0MayIncludeAutomaticInitialFrame:true,encodedPlaybackFpsClaim:false,physicalPlaybackRateClaim:false,
        scope:'One native local canvas stream; actual normal pixels, wall-time encoding, manual frame requests after single drained physics steps'}};
    recorder.ondataavailable=event=>{
      if(!event.data.size)return;
      if(recording.bytes+event.data.size>MAX_VIDEO_BYTES){recording.error??='16MiB WebM cap exceeded';if(recorder.state==='recording')recorder.stop();return;}
      recording.chunks.push(event.data);recording.bytes+=event.data.size;
    };
    const retainRecorderError=event=>{
      recording.error??=String(event.error?.stack??event.error??'MediaRecorder error');
      return Error('Recorder failure: '+recording.error);
    };
    recorder.onerror=retainRecorderError;
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('MediaRecorder start timeout')),5000);
      recorder.onerror=event=>{clearTimeout(timer);reject(retainRecorderError(event));};
      recorder.onstart=()=>{clearTimeout(timer);recorder.onerror=retainRecorderError;resolve();};
      try{recorder.start(500);}catch(error){clearTimeout(timer);recording.error??=String(error?.stack??error);reject(error);}
    });
    must(recorder.state==='recording','MediaRecorder did not enter recording state');
    return {...recording.metadata,capabilities};
  }
  async function captureVideoFrame(observation) {
    must(recording&&recording.recorder.state==='recording','Recorder not actively recording');
    must(!recording.error,'Recorder failure: '+recording?.error);
    must(lab.clock.paused&&mode.host.outstandingSteps===0,'Video frame requires drained paused host');
    must(observation.seaTime===mode.host.snapshot.status.seaTime,'Video request clock differs from observed single step');
    must(JSON.stringify(view())===JSON.stringify(locked.camera),'Video camera drifted');
    const requestedAtPerformanceMs=performance.now(),requestedAtIso=new Date().toISOString();
    recording.track.requestFrame();recording.requests++;
    await nextPaint();await new Promise(resolve=>setTimeout(resolve,0));
    must(!recording.error,'Recorder failure: '+recording?.error);
    return {...observation,canvasFrameRequest:{number:recording.requests,requestedAtIso,requestedAtPerformanceMs,
      afterPaintPerformanceMs:performance.now(),seaTimeAtRequest:observation.seaTime,
      scope:'Requested encoded frame after render; not a decoded frame timestamp or measured playback FPS'}};
  }
  async function finishVideo() {
    must(recording,'No recorder');
    await nextPaint();await nextPaint();
    const {recorder,stream}=recording;
    if(recording.error)throw Error('Recorder failure: '+recording.error);
    must(recorder.state==='recording','Recorder stopped before requested completion');
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('MediaRecorder stop timeout')),8000);
      recorder.onstop=()=>{clearTimeout(timer);resolve();};
      try{recorder.requestData();recorder.stop();}catch(error){clearTimeout(timer);reject(error);}
    });
    stream.getTracks().forEach(track=>track.stop());
    must(!recording.error,'Recorder failure: '+recording.error);
    const blob=new Blob(recording.chunks,{type:recording.metadata.actualMimeType});
    must(blob.size>4&&blob.size<=MAX_VIDEO_BYTES,'Empty or oversized native WebM');
    recording.bytesOut=new Uint8Array(await blob.arrayBuffer());recording.chunks=[];
    must(recording.requests===61,'Exactly 61 manual frame requests required');
    return {...recording.metadata,complete:true,bytes:blob.size,requestFrameCount:recording.requests,
      endedAtIso:new Date().toISOString(),endedAtPerformanceMs:performance.now(),
      wallDurationMs:performance.now()-recording.metadata.startedAtPerformanceMs,
      physicalStepSeconds:1/60,physicsAdvances:60,physicalSeconds:1,
      tracksStopped:stream.getTracks().every(track=>track.readyState==='ended')};
  }
  function videoChunk(offset,length) {
    must(recording?.bytesOut&&Number.isInteger(offset)&&Number.isInteger(length)&&offset>=0&&length>0&&length<=512*1024,
      'Bounded complete local video chunk required');
    const bytes=recording.bytesOut.subarray(offset,Math.min(recording.bytesOut.length,offset+length));
    let binary='';for(let start=0;start<bytes.length;start+=32768)binary+=String.fromCharCode(...bytes.subarray(start,start+32768));
    return btoa(binary);
  }
  function abortVideo() {
    if(!recording)return {started:false};
    try{if(recording.recorder.state==='recording')recording.recorder.stop();}catch(error){recording.error??=String(error);}
    recording.stream.getTracks().forEach(track=>track.stop());
    return {started:true,error:recording.error,bytesRetained:recording.bytes,requestFrameCount:recording.requests,
      tracksStopped:recording.stream.getTracks().every(track=>track.readyState==='ended')};
  }
  async function steps(n) {
    const host=mode.host,base=host.snapshot.status.seaTime;must(lab.clock.paused&&host.outstandingSteps===0,'Step requires pause/drain');
    for(let done=0;done<n;){const count=Math.min(6,n-done);for(let k=0;k<count;k++)d.step({paddle:false,popUp:false,steer:0});
      while(host.outstandingSteps){await new Promise(r=>setTimeout(r,2));}done+=count;}
    const actual=host.snapshot.status.seaTime-base;must(Math.abs(actual-n/60)<1e-7,'Fixed step clock mismatch');
    mode.update(0);return{steps:n,baseSeaTime:base,seaTime:host.snapshot.status.seaTime};
  }
  window.__wholeCurl={choose,frame,steps,instrument,observe,ordinaryStep,videoCapabilities,beginVideo,captureVideoFrame,finishVideo,videoChunk,abortVideo};
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
  report.settle=await page.eval('__wholeCurl.steps(1047)');report.selection=await page.eval('__wholeCurl.choose()');report.instrumentation=await page.eval('__wholeCurl.instrument()');save();
  report.videoCapabilities=await page.eval('__wholeCurl.videoCapabilities()');save();
  report.video=await page.eval('__wholeCurl.beginVideo()');save();
  let observation=await page.eval('__wholeCurl.observe(0)');
  report.motionFrames.push(await page.eval(`__wholeCurl.captureVideoFrame(${JSON.stringify(observation)})`));save();
  const pngIndices=[18,30,60];
  for(let physicalStepIndex=1;physicalStepIndex<=60;physicalStepIndex++){
    observation=await page.eval(`__wholeCurl.ordinaryStep(${physicalStepIndex})`);
    if(pngIndices.includes(physicalStepIndex)){
      const index=pngIndices.indexOf(physicalStepIndex),frame=await page.eval(`__wholeCurl.frame(${index},${physicalStepIndex})`);
      assert.equal(frame.spray.drawnKind2Count,0,'Normal swept rendering must retain omission of kind2');
      const url=frame.png;delete frame.png;report.frames.push(frame);save();png(`normal-${index}.png`,url);
    }
    report.motionFrames.push(await page.eval(`__wholeCurl.captureVideoFrame(${JSON.stringify(observation)})`));save();
  }
  report.video=await page.eval('__wholeCurl.finishVideo()');
  assert.equal(report.video.requestFrameCount,61,'One settled plus 60 advanced frame requests');
  assert.equal(report.video.physicsAdvances,60);assert(report.video.tracksStopped,'Video tracks must stop');
  assert(report.video.bytes>4&&report.video.bytes<=16*1024*1024,'16MiB native WebM cap');save();
  const chunks=[];let received=0;
  for(let offset=0;offset<report.video.bytes;offset+=512*1024){
    const base64=await page.eval(`__wholeCurl.videoChunk(${offset},${Math.min(512*1024,report.video.bytes-offset)})`);
    const chunk=Buffer.from(base64,'base64');assert.equal(chunk.length,Math.min(512*1024,report.video.bytes-offset));
    received+=chunk.length;assert(received<=16*1024*1024);chunks.push(chunk);
  }
  const videoBytes=Buffer.concat(chunks);assert.equal(videoBytes.length,report.video.bytes);
  assert(videoBytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])),'Original native WebM EBML signature required');
  const videoName='moving-normal.webm';writeFileSync(join(OUT,videoName),videoBytes);
  const videoArtifact={file:videoName,kind:'native-local-canvas-webm',bytes:videoBytes.length,sha256:createHash('sha256').update(videoBytes).digest('hex')};
  report.artifacts.push(videoArtifact);report.video={...report.video,...videoArtifact};
  assert.equal(report.motionFrames.length,61);assert.equal(report.frames.length,3);assert.equal(report.artifacts.length,4);
  assert(Math.abs(report.motionFrames[60].seaTime-report.motionFrames[0].seaTime-1)<1e-7,'Complete one-second physics span required');
  report.firstMissingTargetStep=report.motionFrames.find(frame=>frame.selectedStrip.missing)?.physicalStepIndex??null;
  report.captureMissingTargetPolicy='Recorded absence only; no new choose(), reset, retarget, source replacement or camera hunt';
  assert.deepEqual(report.browserErrors,[],'Native runtime/shader console errors');report.complete=true;
} catch(error) { report.firstFailure=String(error?.stack??error);process.exitCode=1; }
finally { if(page)try{
    try{report.videoCleanup=await page.eval('typeof __wholeCurl!=="undefined"?__wholeCurl.abortVideo():({started:false})');}catch(error){report.videoCleanupFailure=String(error);}
    await page.close();report.chromeClosed=true;}catch(error){report.cleanupFailure=String(error);report.complete=false;process.exitCode=1;}
  else if(existsSync(join(OUT,'launcher.json')))report.chromeClosed=JSON.parse(readFileSync(join(OUT,'launcher.json'))).ownedChromeClosed;
  save(); }

process.exit(process.exitCode ?? 0);
