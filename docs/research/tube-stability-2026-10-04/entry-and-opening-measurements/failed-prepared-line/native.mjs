// SOURCE ONLY: root reviews before invoking run.py --run. Existing production dist, no game source imports.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { launch } from './native-owned.mjs';

const WORK='/private/tmp/tube-prepared-line-20261004';
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');assert(a.startsWith('--')&&i>2);return[a.slice(2,i),a.slice(i+1)];}));
assert.equal(args.run,'true','Bounded Python owner required');
assert(['baseline','candidate'].includes(args.arm));
const ARM=args.arm,PORT=4284,CDP=9694;
const DIST='/private/tmp/tube-no-splash-ribbons-20261004/dist';
assert.equal(args.url,`http://127.0.0.1:${PORT}/?diagnostics&physicsDx=1&physicsDz=1`);
const OUT=resolve(args.out??'');assert(OUT.startsWith(WORK+'/')&&!existsSync(OUT));mkdirSync(OUT);
process.env.FULL_WRITER_FPS_LAUNCHER_REPORT=join(OUT,'launcher.json');
const SETTINGS={spot:'padang',stage:2,compute:'auto',source:'buoy',significantHeight:4,peakPeriod:10,directionDegrees:10,spread:.4,tide:0,windSpeed:0,stormWindSpeed:18,stormFetchKm:600,stormDurationHours:36,stormDistanceKm:3000};
const OVERRIDES={seed:1,componentCount:24,spreading:11.720624206334085,dx:1,fineSpacing:1};
const GRAPHICS={preset:'custom',renderScale:1,nativePixelDensity:true,frameLimit:60,waterSimulation:'accurate',seaDetail:'standard',caustics:true,sprayMist:true,oceanView:'far',foam:'detailed',waterLook:'rich',particles:'high'};
const report={schema:'tube-prepared-line/v1',arm:ARM,complete:false,firstFailure:null,bodyPass:null,dist:DIST,settings:SETTINGS,overrides:OVERRIDES,graphics:GRAPHICS,
  schedule:{settleSteps:987,preparationSteps:60,riderSteps:60,stepSeconds:1/60,retainedSteps:[0,1,6,12,18,24,30,36,42,48,54,60],pngSteps:[0,30,60]},
  target:{front:48,sigma:32.379207311,maxInitialSigmaDelta:.75},controls:{crouch:1,compress:0,steer:0,paddle:false,popUp:false},
  preparationSamples:[],samples:[],artifacts:[],pngBytes:0,browserErrors:[],limits:[
    'A completed script is not a body, physics, visual-quality or adoption pass.',
    'One normal world placement occurs one second before the existing-cavity target clock; preparation and subsequent motion are unforced. Retained column transitions do not alone prove complete body entry or passage.',
    'Exact worker placement state before its first integration is not published; step1 is the first observable placed snapshot.',
    'Rider snapshot words0..20 are RideSession.renderPoint: trunk centres with drawn swing and hand/foot tips; they are not private worker partPosition arrays.',
    'Published head point vertical-radius gaps are diagnostics at its XZ, not full 3D sphere/contact-force proof.',
    'Drawn loft crossings and waterAt are independent of worker contact flow and shader displacement; no worker query/flow is projected or replaced.',
    'PNG0 is after sixty normal preparation steps. PhysicalMode.update advances the ordinary drawing clock by 1/60 after each published worker step; current drawn rider still uses normal one-step interpolation and pose smoothing. Worker and displayed words are retained separately.',
    'Fixed diagnostic camera/PR1 output supplies no FPS or original pixel-fidelity claim.']};
function save(){const b=Buffer.from(JSON.stringify(report));assert(b.length<=262144,'Compact report256KiB cap');writeFileSync(join(OUT,'report.json'),b);}
function png(name,url){assert(url.startsWith('data:image/png;base64,'));const b=Buffer.from(url.slice(22),'base64');assert(b.length>8&&b.length<=8*1024*1024);assert(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));assert(report.pngBytes+b.length<=24*1024*1024);writeFileSync(join(OUT,name),b);report.pngBytes+=b.length;report.artifacts.push({file:name,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});save();}

function install(){
  const d=window.breaklineDiagnostics,lab=window.breaklineLab,mode=d.mode, S=134,EXT=3;
  const must=(v,m)=>{if(!v)throw Error(m);},clone=v=>JSON.parse(JSON.stringify(v));
  const names=['pelvis','torso','head','leftHandTip','rightHandTip','leftFootTip','rightFootTip'];
  // Default AttachedRider head volume, as previously measured from riderPartVolumes: unchanged source-derived witness.
  const headRadius=.10790773993352842;
  let locked,placementCalls=0;
  let camera=mode.camera.camera.clone();
  camera.position.set(155.32094597816467,4.819468761980533,-.038138747215270996);
  camera.lookAt(mode.camera.camera.position.clone().fromArray([150.3824691772461,.8194687619805336,-6.938243746757507]));camera.updateMatrixWorld(true);
  const point=(l,s,j)=>Array.from(l.positions.subarray(3*(s*S+EXT+j),3*(s*S+EXT+j)+3));
  const row=(l,s)=>s<0?null:{row:s,front:l.sliceFront[s],sigma:l.sliceSigma[s],tau:l.sliceTau[s],phase:l.slicePhase[s],life:l.sliceLife[s],formed:l.sliceFormed[s],weight:l.sliceWeight[s],fade:l.sliceFade[s],ray:[l.sliceRayX[s],l.sliceRayZ[s]]};
  function edge(p,u,v,x,z){const lo=Math.min(u,v),hi=Math.max(u,v),value=(p[3*hi]-p[3*lo])*(z-p[3*lo+2])-(p[3*hi+2]-p[3*lo+2])*(x-p[3*lo]);return u<v?value:-value;}
  const inside=(v,u,w,sign)=>v*sign>0||(v===0&&(sign>0)===(u<w));
  // Actual active indexed triangles, same half-open shared-edge rule as BarrelWater. First covering front wins.
  function column(l,x,y,z,support=false){
    const p=l.positions,ys=[],supportingTriangles=[];let front=null;
    for(let i=0;i<l.indexCount;i+=3){
      const a=l.indices[i],b=l.indices[i+1],c=l.indices[i+2];
      must(a<l.vertexCount&&b<l.vertexCount&&c<l.vertexCount,'Active index out of bounds');
      const first=Math.floor(Math.min(a,b,c)/S),last=Math.floor(Math.max(a,b,c)/S);
      if(last!==first+1||l.sliceJoined[first]!==1)continue;
      const f=l.sliceFront[first];if(front!==null&&f!==front)break;
      const area=edge(p,a,b,p[3*c],p[3*c+2]);if(area===0)continue;const sign=area>0?1:-1;
      const wa=edge(p,b,c,x,z);if(!inside(wa,b,c,sign))continue;
      const wb=edge(p,c,a,x,z);if(!inside(wb,c,a,sign))continue;
      const wc=edge(p,a,b,x,z);if(!inside(wc,a,b,sign))continue;
      const crossing=(wa*p[3*a+1]+wb*p[3*b+1]+wc*p[3*c+1])/area;
      must(Number.isFinite(crossing),'Nonfinite actual triangle crossing');if(front===null)front=f;ys.push(crossing);must(ys.length<=31,'Column crossing retention cap');
      if(support)supportingTriangles.push({y:crossing,front:f,indexOffset:i,indices:[a,b,c],vertices:[a,b,c].map(v=>Array.from(p.subarray(3*v,3*v+3)))});
    }
    ys.sort((a,b)=>a-b);const closed=ys.length>0&&(ys.length&1)===1;
    const below=ys.filter(v=>v<=y),above=ys.filter(v=>v>y);
    const drawnWater=mode.sweptBarrel.waterAt(x,y,z,0);
    const reconstructedWater=closed?(above.length&1)===1:null;
    must((drawnWater??null)===reconstructedWater,'Independent actual-index crossing versus waterAt mismatch');
    return{front,closed,crossings:ys,supportingTriangles:support?supportingTriangles.sort((a,b)=>a.y-b.y):null,lowestFloor:closed?ys[0]:null,firstRoof:closed&&ys.length>=3?ys[1]:null,
      firstRoofTop:closed&&ys.length>=3?ys[2]:null,nearestBelow:below.length?below[below.length-1]:null,nearestAbove:above.length?above[0]:null,
      drawnWater:drawnWater??null,reconstructedWater};
  }
  async function steps(n,input){
    const host=mode.host,base=host.snapshot.status.seaTime;must(lab.clock.paused&&host.outstandingSteps===0,'Fixed advance requires pause/drain');
    // One-at-a-time publication: no speculative queue, pose replacement, or extra physics ticks.
    for(let k=0;k<n;k++){d.step(input);while(host.outstandingSteps)await new Promise(r=>setTimeout(r,2));mode.update(1/60);}
    must(Math.abs(host.snapshot.status.seaTime-base-n/60)<1e-7,'Fixed worker clock mismatch');
    mode.update(0);return{steps:n,baseSeaTime:base,seaTime:host.snapshot.status.seaTime};
  }
  function choose(){
    mode.update(0);d.renderView(mode.camera.camera);const l=mode.barrelLoft;
    must(l&&l.indexCount>0&&typeof mode.sweptBarrel.waterAt==='function','Actual drawn loft/water missing');
    must(mode.sweptBarrel.holdsClearDrawing===true,'Production clear drawing hold required; no toggle');
    let s=-1,best=Infinity;
    for(let k=0;k<l.sliceCount;k++)if(l.sliceFront[k]===48&&l.sliceFormed[k]>0&&l.sliceWeight[k]>0&&(l.sliceJoined[k]===1||(k>0&&l.sliceJoined[k-1]===1))){const delta=Math.abs(l.sliceSigma[k]-32.379207311);if(delta<best){s=k;best=delta;}}
    must(s>=0&&best<=.75,'Fixed front/sigma not present; no fallback or time search');
    const lip=point(l,s,64),throat=point(l,s,88),toe=point(l,s,112),crest=point(l,s,32);
    const mouth=lip.map((v,i)=>(v+throat[i])/2),eye=throat.map((v,i)=>.7*(v+toe[i])/2+.3*mouth[i]);
    const rx=l.sliceRayX[s],rz=l.sliceRayZ[s],heading=Math.atan2(-rz,rx);
    const placement={x:eye[0],z:eye[2],heading,speed:8,phase:'standing',followSurface:true};
    const geometry=column(l,eye[0],eye[1],eye[2],true);
    must(geometry.closed&&geometry.firstRoof!==null,'Selected curl XZ has no actual closed roof column; retain failure, no placement hunt');
    // One fixed external view for optional stills; its camera never follows or corrects the rider.
    camera=mode.camera.camera.clone();camera.position.set(eye[0]+6*rx+6*rz,eye[1]+4,eye[2]+6*rz-6*rx);
    camera.lookAt(mode.camera.camera.position.clone().fromArray(eye));camera.updateMatrixWorld(true);
    locked={front:48,sigma:l.sliceSigma[s],sourceRow:row(l,s),nearestSigmaDelta:best,landmarks:{crest,lip,throat,toe},eye,placement,geometry,
      rawHostHeight:mode.host.heightAt(eye[0],eye[2]),camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.toArray(),matrixWorld:camera.matrixWorld.toArray()}};
    d.renderView(camera);return locked;
  }
  function preparePlacement(){
    must(placementCalls===0,'Only one normal placement');
    const placement={"x":155.7670218727103,"z":-13.288456570117285,"heading":-1.7350022771514813,"speed":8,"phase":"standing","followSurface":true};
    mode.place(placement);placementCalls++;return{placement,queued:true,placementCalls,appliedOnNextNormalStep:true};
  }
  function visibleHeadExtent(){
    const group=mode.surfer.skinned?.group;
    must(group,'Actual skinned surfer group missing');
    const point=mode.camera.camera.position.clone(),out={vertices:0,meshes:[],highest:null,lowestY:null};
    group.updateMatrixWorld(true);
    group.traverse(mesh=>{
      if(!mesh.isSkinnedMesh||!mesh.visible)return;
      for(let parent=mesh.parent;parent;parent=parent.parent)if(!parent.visible)return;
      const indices=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');
      if(!indices||!weights)return;
      mesh.skeleton.update();let retained=0;
      for(let i=0;i<indices.count;i++){
        let influence=0;
        for(let c=0;c<4;c++){
          const bone=mesh.skeleton.bones[indices.getComponent(i,c)];
          if(bone&&bone.name.toLowerCase().endsWith('head'))influence+=weights.getComponent(i,c);
        }
        if(influence<.5)continue;
        mesh.getVertexPosition(i,point);point.applyMatrix4(mesh.matrixWorld);retained++;out.vertices++;
        if(!out.highest||point.y>out.highest.world[1])out.highest={world:point.toArray(),mesh:mesh.name,vertex:i,headInfluence:influence};
        out.lowestY=out.lowestY===null?point.y:Math.min(out.lowestY,point.y);
      }
      if(retained)out.meshes.push({name:mesh.name,headVertices:retained});
    });
    must(out.vertices>0&&out.highest,'No actual visible head-influenced skinned vertices');
    out.highest.column=column(mode.barrelLoft,...out.highest.world);
    out.highest.verticalRoofGap=out.highest.column.firstRoof===null?null:out.highest.column.firstRoof-out.highest.world[1];
    out.scope='Visible vertices with at least 0.5 head-bone influence, including hair/eyes when weighted; one highest-world-Y witness, not a complete mesh/water collision proof.';
    return out;
  }
  function sample(step,png){
    must(lab.clock.paused&&mode.host.outstandingSteps===0,'Sample requires paused/drained worker');mode.update(0);d.renderView(camera);
    const snap=mode.host.snapshot,l=mode.barrelLoft;must(snap.rider?.length>=33&&snap.board?.length>=8&&snap.status.ride,'Actual rider/board/ride missing');
    const words=Array.from(snap.rider.subarray(0,21));must(words.every(Number.isFinite),'Nonfinite published body point');
    const parts=names.map((name,index)=>{const xyz=words.slice(index*3,index*3+3),c=column(l,...xyz,index===2);
      return{name,index,xyz,column:c,rawHostHeight:mode.host.heightAt(xyz[0],xyz[2]),
        centreAboveFloor:c.lowestFloor===null?null:xyz[1]-c.lowestFloor,
        centreBelowFirstRoof:c.firstRoof===null?null:c.firstRoof-xyz[1]};});
    const h=parts[2],head={...h,radius:headRadius,verticalFloorGap:h.column.lowestFloor===null?null:h.xyz[1]-headRadius-h.column.lowestFloor,
      verticalRoofGap:h.column.firstRoof===null?null:h.column.firstRoof-h.xyz[1]-headRadius};
    const headFits=head.column.closed&&head.column.drawnWater===false&&head.verticalFloorGap>0&&head.verticalRoofGap>0;
    const torsoCentresClear=parts.slice(0,3).every(p=>p.column.closed&&p.column.drawnWater===false&&p.centreAboveFloor>0&&p.centreBelowFirstRoof>0);
    const result={step,secondsAfterQueuedPlacement:(step+60)/60,secondsRelativeToTarget:step/60,seaTime:snap.status.seaTime,placementCalls,present:snap.rider[23],phaseWord:snap.rider[21],
      riderPoints:words,boardPose:Array.from(snap.board.subarray(0,8)),ride:clone(snap.status.ride),parts,head,headFits,torsoCentresClear,
      displayedBoard:{position:mode.board.position.toArray(),quaternion:mode.board.quaternion.toArray()},
      displayedRiderPoints:mode.drawnRider?Array.from(mode.drawnRider.subarray(0,21)):null,
      loft:{sliceCount:l.sliceCount,vertexCount:l.vertexCount,indexCount:l.indexCount,holdClearDrawing:mode.sweptBarrel.holdsClearDrawing},
      selectedGeometry:locked?{sourceRow:locked.sourceRow,landmarks:locked.landmarks,placementColumn:locked.geometry}:null,
      camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray()},
      snapshotIdentity:{workerSeaTime:snap.status.seaTime,visualClock:mode.riderState.clock,waterTime:d.water.materialUniforms.waterTime.value,surfaceRevision:d.water.surfaceRevision}};
    result.visibleHead=step>=0?visibleHeadExtent():null;
    if(png)result.png=d.canvas.toDataURL('image/png');return result;
  }
  window.__nativeRider={steps,choose,preparePlacement,sample};
}

let page;
save();
try{
  page=await launch({url:args.url,width:1708,height:966,port:CDP,args:['--mute-audio']});
  page.on('Runtime.consoleAPICalled',e=>{if(e.type==='error'&&report.browserErrors.length<12)report.browserErrors.push((e.args??[]).map(a=>a.value??a.description??'').join(' ').slice(0,2048));});
  page.on('Runtime.exceptionThrown',e=>{if(report.browserErrors.length<12)report.browserErrors.push(String(e.exceptionDetails?.exception?.description??e.exceptionDetails?.text).slice(0,2048));});
  await page.eval(`localStorage.setItem('breakline.settings.v1',${JSON.stringify(JSON.stringify({graphics:GRAPHICS,detected:{preset:'high',water:'accurate',lowPerformance:false},seen:{rideHints:true,lowPerformanceNotice:true}}))})`);
  await page.send('Page.reload');await page.waitFor('window.breaklineDiagnostics && window.breaklineLab',20000);
  report.initial=await page.eval(`(async()=>{const d=breaklineDiagnostics,lab=breaklineLab;lab.clock.paused=true;
    await d.start(${JSON.stringify(SETTINGS)},${JSON.stringify(OVERRIDES)},{rider:true,lab:true});lab.active=true;lab.clock.paused=true;
    while(d.mode.host.outstandingSteps)await new Promise(r=>setTimeout(r,2));await d.mode.sweptBarrel.ready;
    d.setWaterLook('rich');await d.setTimeOfDay('midday');d.resize(1708,879);
    const style=document.createElement('style');style.textContent='#ui,#touch-controls,#loading,#app::after{display:none!important}#scene{opacity:1!important;transition:none!important}';document.head.append(style);
    return{config:d.mode.config,status:d.mode.host.snapshot.status,canvas:[d.canvas.width,d.canvas.height],riderPresent:d.mode.host.snapshot.rider[23],
      environment:{userAgent:navigator.userAgent,dpr:devicePixelRatio}};})()`);
  for(const [k,v]of Object.entries(OVERRIDES))assert.equal(report.initial.config[k],v,'Actual config '+k);
  for(const k of ['spot','significantHeight','peakPeriod','directionDegrees','tide','windSpeed','stage'])assert.equal(report.initial.config[k],SETTINGS[k]);
  assert.equal(report.initial.status.compute,'gpu');assert.equal(report.initial.status.cells,203200);assert.equal(report.initial.riderPresent,1);assert.deepEqual(report.initial.canvas,[1708,879]);save();
  await page.eval(`(${install.toString()})()`);
  report.settle=await page.eval('__nativeRider.steps(987,{paddle:false,popUp:false,steer:0})');
  report.placement=await page.eval('__nativeRider.preparePlacement()');save();
  for(let k=1;k<=60;k++){await page.eval(`__nativeRider.steps(1,${JSON.stringify(report.controls)})`);if(k===1||k%6===0){const sample=await page.eval(`__nativeRider.sample(${k-60},false)`);report.preparationSamples.push(sample);save();}}
  report.selection=await page.eval('__nativeRider.choose()');save();
  const retain=async(step,wantPng)=>{const sample=await page.eval(`__nativeRider.sample(${step},${wantPng})`),url=sample.png;delete sample.png;report.samples.push(sample);save();if(url)png(`step-${String(step).padStart(2,'0')}.png`,url);};
  await retain(0,true);save();
  await page.eval(`__nativeRider.steps(1,${JSON.stringify(report.controls)})`);await retain(1,false);
  await page.eval(`__nativeRider.steps(5,${JSON.stringify(report.controls)})`);await retain(6,false);
  for(let step=12;step<=60;step+=6){await page.eval(`__nativeRider.steps(6,${JSON.stringify(report.controls)})`);await retain(step,step===30||step===60);}
  const placed=report.samples.filter(s=>s.step>0),initial=placed[0];
  report.bodyOutcome={initialObservableStep:1,initialHeadFits:initial.headFits,initialTorsoCentresClear:initial.torsoCentresClear,
    firstRetainedHeadFailure:placed.find(s=>!s.headFits)?.step??null,firstRetainedSeparation:placed.find(s=>s.ride.phase==='fallen'||s.ride.separation)?.step??null,
    retainedStandingThroughout:placed.every(s=>s.ride.phase==='standing'&&!s.ride.separation),retainedHeadFitsThroughout:placed.every(s=>s.headFits),
    retainedTorsoCentresClearThroughout:placed.every(s=>s.torsoCentresClear),fullUnobservedSubstepsClearanceUnknown:true,actualOutsideEntryProven:false};
  report.bodyPass=report.bodyOutcome.retainedStandingThroughout&&report.bodyOutcome.retainedHeadFitsThroughout&&report.bodyOutcome.retainedTorsoCentresClearThroughout;
  report.preparationOutcome={retainedSteps:report.preparationSamples.length,retainedStanding:report.preparationSamples.every(s=>s.ride.phase==='standing'&&!s.ride.separation),firstRetainedHeadFit:report.preparationSamples.find(s=>s.headFits)?.secondsRelativeToTarget??null,firstRetainedSeparation:report.preparationSamples.find(s=>s.ride.phase==='fallen'||s.ride.separation)?.secondsRelativeToTarget??null,actualOutsideEntryProven:false};
  report.bodyPassScope='Retained standing/trunk-point/vertical-head-radius checks only; sparse retained steps do not prove all intervening body/sphere contacts. Actual visible skinned head-influenced vertex extent is recorded separately.';
  assert.equal(report.samples.length,12);assert.equal(report.artifacts.length,3);assert.equal(report.placement.placementCalls,1);assert.deepEqual(report.browserErrors,[]);
  const launchEvidence=JSON.parse(readFileSync(join(OUT,'launcher.json')));assert.deepEqual(launchEvidence.blockedPageRequests,[]);assert(!launchEvidence.requestGuardFailure&&!launchEvidence.evidenceWriteFailure);
  report.complete=true;
}catch(error){report.firstFailure=String(error?.stack??error);process.exitCode=1;}
finally{if(page)try{await page.close();report.chromeClosed=true;}catch(error){report.cleanupFailure=String(error);report.complete=false;process.exitCode=1;}
  else if(existsSync(join(OUT,'launcher.json')))report.chromeClosed=JSON.parse(readFileSync(join(OUT,'launcher.json'))).ownedChromeClosed;save();}

// Final report and owned Chrome closure are synchronous/completed above.
// Terminate the finite CLI explicitly; the independent Python owner audits and clears any owned child group.
process.exit(process.exitCode ?? 0);
