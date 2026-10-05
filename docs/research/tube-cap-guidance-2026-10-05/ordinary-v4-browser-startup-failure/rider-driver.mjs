// Fresh browser-safe ordinary driver. No borrowed proneSteer0/popup/posture overlay.
export function installGuidedRider(Autopilot,autopilotView,createGuidedControl,createBodyMeshClassifier,createTrialCriteria,createLoftSnapshotTools,installFollowerCamera,policy,limits){
 const d=window.breaklineDiagnostics,lab=window.breaklineLab,mode=d.mode,DT=1/60;
 const must=(v,m)=>{if(!v)throw Error(m);},clone=v=>JSON.parse(JSON.stringify(v));
 const pilot=new Autopilot(policy),control=createGuidedControl(),mesh=createBodyMeshClassifier(),criteria=createTrialCriteria(mesh),snapshotTools=createLoftSnapshotTools();
 const follower=installFollowerCamera(d,lab,document.querySelector('#app'));
 let steps=0,detectorMs=0,lastAttempt=null;const initialResets=mode.host.snapshot.status.ride.resets;
 function rideCopy(ride){
  return clone({phase:ride.phase,speed:ride.speed,boardSpeed:ride.boardSpeed,cue:ride.cue,popUp:ride.popUp,separation:ride.separation??null,resets:ride.resets,
   balance:ride.balance,bank:ride.bank??0,wave:ride.wave,tubeApproach:ride.tubeApproach??null,tubeApproachObservation:ride.tubeApproachObservation??null,tubeBody:ride.tubeBody??null,breath:ride.breath});
 }
 function current(){const snap=mode.host.snapshot;must(snap.rider?.length>=33&&snap.board?.length>=8&&snap.status.ride,'Current actual rider required');
  const points=Array.from(snap.rider.subarray(0,21));must(points.every(Number.isFinite),'Finite actual render points');
  const visualPoseTime=mode.riderState.clock,interpolationLag=snap.status.seaTime-visualPoseTime,displayedRiderPhaseIndex=mode.drawnRider[21];
  return{step:steps,seaTime:snap.status.seaTime,visualPoseTime,interpolationLag,physicalSeconds:steps*DT,initialResets,riderPoints:points,riderWords:Array.from(snap.rider.subarray(21,33)),boardPose:Array.from(snap.board.subarray(0,8)),
   ride:rideCopy(snap.status.ride),compute:snap.status.compute,workerStepMs:snap.status.stepMs,
   displayedBoard:{position:mode.board.position.toArray(),quaternion:mode.board.quaternion.toArray()},displayedRiderPoints:Array.from(mode.drawnRider.subarray(0,21)),
   displayedRiderPhaseIndex,displayedRiderPhase:['prone','push','landing','standing','recover','fallen'][displayedRiderPhaseIndex]??null,displayedRiderPresent:mode.drawnRider[23],
   clocks:{workerSeaTime:snap.status.seaTime,visualClock:mode.riderState.clock,waterTime:d.water.materialUniforms.waterTime.value,surfaceRevision:d.water.surfaceRevision},
   loft:{slices:mode.barrelLoft.sliceCount,vertices:mode.barrelLoft.vertexCount,indices:mode.barrelLoft.indexCount},
   cameraFollower:follower.current(),pilot:{state:pilot.state,outcome:pilot.outcome??null,attempts:pilot.attempts,rideTime:pilot.rideTime,phase:pilot.phase}};
 }
 function publicGuard(){
  const l=mode.barrelLoft,snap=mode.host.snapshot,vertex={positions:3,normals:3,mask:1,lift:1,sheet:1,sheetWeight:1,sheetBack:1,throat:4};
  const keys=[...Object.keys(vertex),'indices',...Object.keys(l).filter(k=>/^slice[A-Z]/.test(k)&&ArrayBuffer.isView(l[k]))];must(keys.length===37,'Complete37 public loft contract required');
  const items=keys.map(k=>({key:k,a:l[k],count:k==='indices'?l.indexCount:vertex[k]?l.vertexCount*vertex[k]:l.sliceCount}));
  const grid=mode.host.init.grid,gridWords=JSON.stringify(grid);
  items.push({key:'board',a:snap.board,count:8},{key:'rider',a:snap.rider,count:33},{key:'front',a:snap.front,count:snap.frontCount*9},
   {key:'surface',a:snap.surface,count:grid.nx*grid.nz*2},{key:'tubes',a:snap.tubes,count:snap.tubeCount*12},
   {key:'drawnBoard',a:mode.drawnBoard,count:8},{key:'drawnRider',a:mode.drawnRider,count:33});
  let total=0;for(const item of items){must(ArrayBuffer.isView(item.a)&&item.count<=item.a.length,'Guard actual typed active words');item.bytes=new Uint8Array(item.a.buffer,item.a.byteOffset,item.count*item.a.BYTES_PER_ELEMENT).slice();total+=item.bytes.length;}
  must(total<=8*1024*1024,'Bounded complete public guard including current ordinary surface');
  const status=JSON.stringify(snap.status),clock=snap.status.seaTime,visualPoseTime=mode.riderState.clock,counts=[l.sliceCount,l.vertexCount,l.indexCount,snap.frontCount,snap.tubeCount],camera=JSON.stringify(follower.current());
  return()=>{
   must(mode.host.snapshot===snap&&mode.barrelLoft===l&&Object.is(snap.status.seaTime,clock)&&Object.is(mode.riderState.clock,visualPoseTime)&&mode.host.outstandingSteps===0&&JSON.stringify(snap.status)===status,'Read-only work changed public owner/worker or interpolation clock/status');
   must([l.sliceCount,l.vertexCount,l.indexCount,snap.frontCount,snap.tubeCount].every((v,i)=>Object.is(v,counts[i]))&&JSON.stringify(mode.host.init.grid)===gridWords&&JSON.stringify(follower.current())===camera,'Read-only work changed active counts, ordinary grid or camera');
   for(const item of items){const a=['drawnBoard','drawnRider'].includes(item.key)?mode[item.key]:['board','rider','front','surface','tubes'].includes(item.key)?snap[item.key]:l[item.key];must(a===item.a,'Public or normal drawn active array identity changed');const now=new Uint8Array(a.buffer,a.byteOffset,item.bytes.length);must(now.every((v,i)=>v===item.bytes[i]),'Public or drawn active array bytes changed: '+item.key);}
   return{unchanged:true,checkedLoftArrays:37,checkedBoardWords:8,checkedRiderWords:33,checkedRawFrontWords:snap.frontCount*9,
    checkedOrdinarySurfaceWords:grid.nx*grid.nz*2,checkedTubeWords:snap.tubeCount*12,checkedDrawnBoardWords:8,checkedDrawnRiderWords:33,
    ordinaryGridAndSurfaceChecked:true,normalDrawnArraysAndVisualClockChecked:true,exactActiveBytesCompared:true,normalFollowerChecked:true};
  };
 }
 async function step(){
  const browserStepStarted=performance.now(),timings={};
  follower.hold();must(steps<limits.steps&&mode.host.outstandingSteps===0,'Finite drained ordinary step required');
  const before=mode.host.snapshot.status.seaTime,view=autopilotView(mode.host,mode.focus.z,0);must(view&&Object.is(view.seaTime,before),'Current production pilot view required');
  const pilotStarted=performance.now();
  const requested=pilot.next(view,DT),inputPilot={state:pilot.state,phase:pilot.phase,attempts:pilot.attempts},applied=control(view,requested,steps+1);
  const inputView=clone({...view,ride:rideCopy(view.ride)});
  timings.pilotAndInputCopyMs=performance.now()-pilotStarted;
  d.step(applied.input);const started=performance.now();while(mode.host.outstandingSteps){must(performance.now()-started<10000,'Single worker step10s drain deadline');await new Promise(r=>setTimeout(r,2));}
  must(Math.abs(mode.host.snapshot.status.seaTime-before-DT)<1e-7,'Exactly one fixed physical step required');
  timings.workerDrainWallMs=performance.now()-started;
  const updateStarted=performance.now();mode.update(DT);timings.modeUpdateMs=performance.now()-updateStarted;
  const renderStarted=performance.now();follower.certifyRender();d.renderView(mode.camera.camera);follower.certifyRender();timings.normalRenderMs=performance.now()-renderStarted;
  must(mode.sweptBarrel.holdsClearDrawing===true,'Actual held drawing required');
  const rowCopyStarted=performance.now();steps++;const row=current();row.inputView=inputView;row.requestedInput=clone(requested);row.input=clone(applied.input);row.inputPilot=inputPilot;row.control=applied.control;row.witness=null;row.renderedWitness=null;row.unionWitness=null;
  timings.currentRowCopyMs=performance.now()-rowCopyStarted;
  lastAttempt=row;
  const clockEvidence=JSON.stringify({step:row.step,clocks:row.clocks,visualPoseTime:row.visualPoseTime,interpolationLag:row.interpolationLag,displayedRiderPhaseIndex:row.displayedRiderPhaseIndex});
  must([row.seaTime,row.visualPoseTime,row.interpolationLag].every(Number.isFinite)&&row.interpolationLag>=0&&row.interpolationLag<=DT+1e-7,'Authored finite0..one-step SnapshotTrack interpolation lag required; actual='+clockEvidence);
  must(Math.abs(row.clocks.waterTime-row.seaTime)<1e-7,'Water drawing must match the worker clock; actual='+clockEvidence);
  const guardStarted=performance.now(),verify=publicGuard();timings.guardCaptureMs=performance.now()-guardStarted;
  const begin=performance.now();
  try{
   if(row.ride.phase==='standing'){
    const body=row.ride.tubeBody;must(body&&Object.is(body.seaTime,row.seaTime),'Same-step opt-in detached body telemetry required');
    const observation=row.ride.tubeApproachObservation;
    must(observation?.schema==='tube-approach-observation/v1'&&Object.is(observation.seaTime,row.seaTime),'Same-query same-step passive tube telemetry required; never replace it with another query');
    must(body.renderPoints.length===7&&body.renderPoints.every((p,i)=>[p.x,p.y,p.z].every((v,k)=>Object.is(v,row.riderPoints[3*i+k]))),'Published body render witnesses must match rider snapshot words');
    must(detectorMs<limits.detectorMilliseconds,'Finite detector budget; never continue after losing the independent gate');
    const snap=mode.host.snapshot;
    const ordinary={grid:mode.host.init.grid,surface:snap.surface,seaTime:snap.status.seaTime,heightAt:mode.host.heightAt.bind(mode.host)};
    const currentClassifierStarted=performance.now();
    row.witness=mesh.measure(mode.barrelLoft,body,mode.sweptBarrel.waterAt.bind(mode.sweptBarrel),ordinary);
    timings.currentClassifierMs=performance.now()-currentClassifierStarted;
    must(row.displayedRiderPoints.length===21&&row.displayedRiderPoints.every(Number.isFinite),'Seven finite actual displayed SnapshotTrack points required');
    const renderedBody={seaTime:body.seaTime,renderPoints:Array.from({length:7},(_,i)=>({x:row.displayedRiderPoints[3*i],y:row.displayedRiderPoints[3*i+1],z:row.displayedRiderPoints[3*i+2],radius:0})),partSpheres:body.partSpheres};
    const renderedClassifierStarted=performance.now();
    row.renderedWitness=mesh.measure(mode.barrelLoft,renderedBody,mode.sweptBarrel.waterAt.bind(mode.sweptBarrel),ordinary);
    timings.renderedClassifierMs=performance.now()-renderedClassifierStarted;
    Object.assign(row.renderedWitness,{renderPointSource:'actual-drawnRider/SnapshotTrack-delayed-pose',visualPoseTime:row.visualPoseTime,
     currentPartSphereSeaTime:row.seaTime,drawnLoftSeaTime:row.seaTime,uniqueAdditionalWitnesses:7,duplicatedCurrentPartSpheres:7,
     scope:'Seven actual delayed drawnRider points plus duplicate current part spheres against current drawn loft. No post-inertia skin, capsule, limb-segment or historical-water claim.'});
    for(const point of row.renderedWitness.points.slice(0,7))point.kind='actual-displayed-SnapshotTrack-point';
    const current=row.witness,rendered=row.renderedWitness,phaseStanding=row.displayedRiderPhaseIndex===3&&row.displayedRiderPresent>0;
    const sameConnectedRun=!!current.component&&!!rendered.component&&current.component.front===rendered.component.front&&current.component.localId===rendered.component.localId;
    const contained=current.all14ModelWitnessesContained&&rendered.all14ModelWitnessesContained&&sameConnectedRun&&phaseStanding;
    const outside=current.classification==='outside'&&rendered.classification==='outside';
    const unclassified=current.outsideWaterUnclassified||rendered.outsideWaterUnclassified;
    const ambiguous=current.classification==='ambiguous'||rendered.classification==='ambiguous';
    row.unionWitness={uniqueWitnessCount:21,currentWitnessCount:14,additionalDisplayedPointCount:7,duplicatedCurrentPartSpheresInImplementation:7,
     visualPoseTime:row.visualPoseTime,interpolationLag:row.interpolationLag,drawnLoftSeaTime:row.seaTime,
     displayedStanding:phaseStanding,sameConnectedRun,current14Contained:current.all14ModelWitnessesContained,
     displayed7WithCurrentSpheresContained:rendered.all14ModelWitnessesContained,all21ModelWitnessesContained:contained,
     all21ActualPartSpheresClear:current.allActualPartSpheresClear&&rendered.allActualPartSpheresClear,
     all21WaterClear:current.allPointsWaterClear&&rendered.allPointsWaterClear,outsideWaterUnclassified:unclassified,
     classification:contained?'contained':unclassified?'outside-unclassified':ambiguous?'ambiguous':outside?'outside':'partial',
     completeSkinCapsuleOrLimbProof:false,normalInterpolationPreserved:true};
   }
   const criteriaStarted=performance.now();row.sequence=criteria.observe(row,mode.barrelLoft);timings.criteriaMs=performance.now()-criteriaStarted;
  }finally{
   detectorMs+=performance.now()-begin;row.detector={cumulativeMilliseconds:detectorMs,elapsedMilliseconds:performance.now()-begin,continuedWithoutWitness:false};const verificationStarted=performance.now();row.nonmutation=verify();timings.guardVerificationMs=performance.now()-verificationStarted;
  }
  must(detectorMs<=limits.detectorMilliseconds,'Finite detector budget exhausted; no unclassified continuation');
  timings.browserStepTotalMs=performance.now()-browserStepStarted;row.observerTiming=timings;
  return row;
 }
 function checkpoint(label){
  must(['initial','first-standing','first-guide','first-partial-entry','body-entry','intentional-exit','terminal'].includes(label),'Declared first-event ordinary checkpoint required');follower.hold();must(mode.host.outstandingSteps===0,'Drained checkpoint');
  follower.certifyRender();d.renderView(mode.camera.camera);follower.certifyRender();const verify=publicGuard(),snap=mode.host.snapshot;
  const loftSnapshot=snapshotTools.capture(mode.barrelLoft,label,{step:steps,seaTime:snap.status.seaTime,surfaceRevision:d.water.surfaceRevision,drawnWaterTime:d.water.materialUniforms.waterTime.value});
  must(loftSnapshot.available&&Object.keys(loftSnapshot.arrays).length===37,'All37 checkpoint arrays required');
  const bytes=new Uint8Array(snap.front.buffer,snap.front.byteOffset,snap.frontCount*9*4).slice();let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  loftSnapshot.rawFrontPacket={dtype:'Float32Array',littleEndian:new Uint8Array(new Uint16Array([0x0102]).buffer)[0]===2,recordCount:snap.frontCount,stride:9,count:snap.frontCount*9,byteLength:bytes.length,encoding:'base64-exact-active-typed-array-words',data:btoa(binary)};
  const result={label,step:steps,seaTime:snap.status.seaTime,current:current(),sequence:criteria.summary(),loftSnapshot,png:d.canvas.toDataURL('image/png')};
  result.nonmutation=verify();loftSnapshot.nonmutation=result.nonmutation;return result;
 }
 window.__guidedOrdinary={step,current,checkpoint,lastAttempt:()=>clone(lastAttempt),sequence:criteria.summary,finish:kind=>criteria.finish(current(),kind)};
}
