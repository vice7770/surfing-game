// Fresh browser-safe ordinary driver. No borrowed proneSteer0/popup/posture overlay.
export function installGuidedRider(Autopilot,autopilotView,createGuidedControl,createBodyMeshClassifier,createTrialCriteria,createLoftSnapshotTools,installFollowerCamera,policy,limits){
 const d=window.breaklineDiagnostics,lab=window.breaklineLab,mode=d.mode,DT=1/60;
 const must=(v,m)=>{if(!v)throw Error(m);},clone=v=>JSON.parse(JSON.stringify(v));
 const pilot=new Autopilot(policy),control=createGuidedControl(),mesh=createBodyMeshClassifier(),criteria=createTrialCriteria(mesh),snapshotTools=createLoftSnapshotTools();
 const follower=installFollowerCamera(d,lab,document.querySelector('#app'));
 let steps=0,detectorMs=0;const initialResets=mode.host.snapshot.status.ride.resets;
 function rideCopy(ride){
  return clone({phase:ride.phase,speed:ride.speed,boardSpeed:ride.boardSpeed,cue:ride.cue,popUp:ride.popUp,separation:ride.separation??null,resets:ride.resets,
   balance:ride.balance,bank:ride.bank??0,wave:ride.wave,tubeApproach:ride.tubeApproach??null,tubeBody:ride.tubeBody??null,breath:ride.breath});
 }
 function current(){const snap=mode.host.snapshot;must(snap.rider?.length>=33&&snap.board?.length>=8&&snap.status.ride,'Current actual rider required');
  const points=Array.from(snap.rider.subarray(0,21));must(points.every(Number.isFinite),'Finite actual render points');
  return{step:steps,seaTime:snap.status.seaTime,physicalSeconds:steps*DT,initialResets,riderPoints:points,riderWords:Array.from(snap.rider.subarray(21,33)),boardPose:Array.from(snap.board.subarray(0,8)),
   ride:rideCopy(snap.status.ride),compute:snap.status.compute,workerStepMs:snap.status.stepMs,
   displayedBoard:{position:mode.board.position.toArray(),quaternion:mode.board.quaternion.toArray()},displayedRiderPoints:Array.from(mode.drawnRider.subarray(0,21)),
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
   {key:'surface',a:snap.surface,count:grid.nx*grid.nz*2},{key:'tubes',a:snap.tubes,count:snap.tubeCount*12});
  let total=0;for(const item of items){must(ArrayBuffer.isView(item.a)&&item.count<=item.a.length,'Guard actual typed active words');item.bytes=new Uint8Array(item.a.buffer,item.a.byteOffset,item.count*item.a.BYTES_PER_ELEMENT).slice();total+=item.bytes.length;}
  must(total<=8*1024*1024,'Bounded complete public guard including current ordinary surface');
  const status=JSON.stringify(snap.status),clock=snap.status.seaTime,counts=[l.sliceCount,l.vertexCount,l.indexCount,snap.frontCount,snap.tubeCount],camera=JSON.stringify(follower.current());
  return()=>{
   must(mode.host.snapshot===snap&&mode.barrelLoft===l&&Object.is(snap.status.seaTime,clock)&&mode.host.outstandingSteps===0&&JSON.stringify(snap.status)===status,'Read-only work changed public owner/clock/status');
   must([l.sliceCount,l.vertexCount,l.indexCount,snap.frontCount,snap.tubeCount].every((v,i)=>Object.is(v,counts[i]))&&JSON.stringify(mode.host.init.grid)===gridWords&&JSON.stringify(follower.current())===camera,'Read-only work changed active counts, ordinary grid or camera');
   for(const item of items){const a=['board','rider','front','surface','tubes'].includes(item.key)?snap[item.key]:l[item.key];must(a===item.a,'Public active array identity changed');const now=new Uint8Array(a.buffer,a.byteOffset,item.bytes.length);must(now.every((v,i)=>v===item.bytes[i]),'Public active array bytes changed: '+item.key);}
   return{unchanged:true,checkedLoftArrays:37,checkedBoardWords:8,checkedRiderWords:33,checkedRawFrontWords:snap.frontCount*9,
    checkedOrdinarySurfaceWords:grid.nx*grid.nz*2,checkedTubeWords:snap.tubeCount*12,ordinaryGridAndSurfaceChecked:true,exactActiveBytesCompared:true,normalFollowerChecked:true};
  };
 }
 async function step(){
  follower.hold();must(steps<limits.steps&&mode.host.outstandingSteps===0,'Finite drained ordinary step required');
  const before=mode.host.snapshot.status.seaTime,view=autopilotView(mode.host,mode.focus.z,0);must(view&&Object.is(view.seaTime,before),'Current production pilot view required');
  const requested=pilot.next(view,DT),inputPilot={state:pilot.state,phase:pilot.phase,attempts:pilot.attempts},applied=control(view,requested,steps+1);
  const inputView=clone({...view,ride:rideCopy(view.ride)});
  d.step(applied.input);const started=performance.now();while(mode.host.outstandingSteps){must(performance.now()-started<10000,'Single worker step10s drain deadline');await new Promise(r=>setTimeout(r,2));}
  must(Math.abs(mode.host.snapshot.status.seaTime-before-DT)<1e-7,'Exactly one fixed physical step required');
  mode.update(DT);follower.certifyRender();d.renderView(mode.camera.camera);follower.certifyRender();must(mode.sweptBarrel.holdsClearDrawing===true,'Actual held drawing required');
  steps++;const row=current();row.inputView=inputView;row.requestedInput=clone(requested);row.input=clone(applied.input);row.inputPilot=inputPilot;row.control=applied.control;row.witness=null;
  must(Math.abs(row.clocks.visualClock-row.seaTime)<1e-7&&Math.abs(row.clocks.waterTime-row.seaTime)<1e-7,'Actor/water/worker clocks must match');
  const verify=publicGuard(),begin=performance.now();
  try{
   if(row.ride.phase==='standing'){
    const body=row.ride.tubeBody;must(body&&Object.is(body.seaTime,row.seaTime),'Same-step opt-in detached body telemetry required');
    must(body.renderPoints.length===7&&body.renderPoints.every((p,i)=>[p.x,p.y,p.z].every((v,k)=>Object.is(v,row.riderPoints[3*i+k]))),'Published body render witnesses must match rider snapshot words');
    must(detectorMs<limits.detectorMilliseconds,'Finite detector budget; never continue after losing the independent gate');
    const snap=mode.host.snapshot;
    row.witness=mesh.measure(mode.barrelLoft,body,mode.sweptBarrel.waterAt.bind(mode.sweptBarrel),
     {grid:mode.host.init.grid,surface:snap.surface,seaTime:snap.status.seaTime,heightAt:mode.host.heightAt.bind(mode.host)});
   }
   row.sequence=criteria.observe(row,mode.barrelLoft);
  }finally{
   detectorMs+=performance.now()-begin;row.detector={cumulativeMilliseconds:detectorMs,elapsedMilliseconds:performance.now()-begin,continuedWithoutWitness:false};row.nonmutation=verify();
  }
  must(detectorMs<=limits.detectorMilliseconds,'Finite detector budget exhausted; no unclassified continuation');
  return row;
 }
 function checkpoint(label){
  must(['initial','body-entry','intentional-exit','terminal'].includes(label),'Declared ordinary checkpoint required');follower.hold();must(mode.host.outstandingSteps===0,'Drained checkpoint');
  follower.certifyRender();d.renderView(mode.camera.camera);follower.certifyRender();const verify=publicGuard(),snap=mode.host.snapshot;
  const loftSnapshot=snapshotTools.capture(mode.barrelLoft,label,{step:steps,seaTime:snap.status.seaTime,surfaceRevision:d.water.surfaceRevision,drawnWaterTime:d.water.materialUniforms.waterTime.value});
  must(loftSnapshot.available&&Object.keys(loftSnapshot.arrays).length===37,'All37 checkpoint arrays required');
  const bytes=new Uint8Array(snap.front.buffer,snap.front.byteOffset,snap.frontCount*9*4).slice();let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  loftSnapshot.rawFrontPacket={dtype:'Float32Array',littleEndian:new Uint8Array(new Uint16Array([0x0102]).buffer)[0]===2,recordCount:snap.frontCount,stride:9,count:snap.frontCount*9,byteLength:bytes.length,encoding:'base64-exact-active-typed-array-words',data:btoa(binary)};
  const result={label,step:steps,seaTime:snap.status.seaTime,current:current(),sequence:criteria.summary(),loftSnapshot,png:d.canvas.toDataURL('image/png')};
  result.nonmutation=verify();loftSnapshot.nonmutation=result.nonmutation;return result;
 }
 window.__guidedOrdinary={step,current,checkpoint,sequence:criteria.summary,finish:kind=>criteria.finish(current(),kind)};
}
