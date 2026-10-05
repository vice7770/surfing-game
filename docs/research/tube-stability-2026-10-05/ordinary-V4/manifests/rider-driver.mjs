export function installOrdinaryRider(Autopilot,autopilotView,riderPartVolumes,createWitnessSampler,createLoftSnapshotTools,createOrdinaryControl,nearestIndexedFormed,installFollowerCamera,policy){
 const d=window.breaklineDiagnostics,lab=window.breaklineLab,mode=d.mode,DT=1/60;
 const must=(v,m)=>{if(!v)throw Error(m);},clone=v=>JSON.parse(JSON.stringify(v));
 const pilot=new Autopilot(policy),measure=createWitnessSampler(),snapshotTools=createLoftSnapshotTools(),control=createOrdinaryControl(),radii=riderPartVolumes().map(v=>Math.cbrt(3*v/(4*Math.PI)));
 let detectorMs=0,detectorFailure=null,steps=0;
 const follower=installFollowerCamera(d,lab,document.querySelector('#app'));
 function seaCounters(){
  const snap=mode.host.snapshot,status=snap.status;
  must(Number.isInteger(snap.frontCount)&&snap.frontCount>=0,'Published raw front record count required');
  const result={rawFrontCount:snap.frontCount};
  for(const name of ['lipLaunches','lipVolume','lipJets','lipRollers','lipAirborne']){
   must(Number.isFinite(status[name])&&status[name]>=0,'Finite nonnegative published sea counter '+name);
   result[name]=status[name];
  }
  return result;
 }
 function current(){const snap=mode.host.snapshot;must(snap.rider?.length>=33&&snap.board?.length>=8&&snap.status.ride,'Actual rider snapshot required');
  const points=Array.from(snap.rider.subarray(0,21));must(points.every(Number.isFinite),'Finite published body points');
  return{seaTime:snap.status.seaTime,seaCounters:seaCounters(),riderPoints:points,riderWords:Array.from(snap.rider.subarray(21,33)),boardPose:Array.from(snap.board.subarray(0,8)),
   ride:clone(snap.status.ride),compute:snap.status.compute,workerStepMs:snap.status.stepMs,cue:snap.status.ride.cue,balance:snap.status.ride.balance,
   separation:snap.status.ride.separation??null,displayedBoard:{position:mode.board.position.toArray(),quaternion:mode.board.quaternion.toArray()},
   displayedRiderPoints:Array.from(mode.drawnRider.subarray(0,21)),clocks:{workerSeaTime:snap.status.seaTime,visualClock:mode.riderState.clock,
    waterTime:d.water.materialUniforms.waterTime.value,surfaceRevision:d.water.surfaceRevision},
   loft:mode.barrelLoft?{slices:mode.barrelLoft.sliceCount,vertices:mode.barrelLoft.vertexCount,indices:mode.barrelLoft.indexCount}:null,
   cameraFollower:follower.current(),pilot:{state:pilot.state,outcome:pilot.outcome??null,attempts:pilot.attempts,rideTime:pilot.rideTime,phase:pilot.phase}};
 }
 async function step(){follower.hold();must(mode.host.outstandingSteps===0,'Normal paused/drained ordinary step required');
  const before=mode.host.snapshot.status.seaTime,view=autopilotView(mode.host,mode.focus.z,0);must(view,'Actual production pilot view required');
  const requested=pilot.next(view,DT),overlay=control(view,requested,steps+1,DT),input=overlay.input;
  const steeringControl=overlay.steeringControl,popupControl=overlay.popupControl;
  d.step(input);const waitStarted=performance.now();while(mode.host.outstandingSteps){must(performance.now()-waitStarted<10000,'Single worker step drain deadline');await new Promise(r=>setTimeout(r,2));}
  must(Math.abs(mode.host.snapshot.status.seaTime-before-DT)<1e-7,'One-step physical clock mismatch');
  mode.update(DT);follower.certifyRender();d.renderView(mode.camera.camera);follower.certifyRender();must(mode.sweptBarrel.holdsClearDrawing===true,'Accepted held drawing required');
  const row=current();row.step=++steps;row.input=clone(input);row.inputView=clone(view);row.physicalSeconds=steps*DT;
  row.steeringControl=steeringControl;row.popupControl=popupControl;row.witness=null;row.detector={elapsedMilliseconds:0,cumulativeMilliseconds:detectorMs,disabledReason:detectorFailure};
  if(row.ride.phase==='standing'&&!detectorFailure&&detectorMs<20000){const begin=performance.now();
   try{row.witness=measure(mode.barrelLoft,row.riderPoints,radii,mode.sweptBarrel.waterAt.bind(mode.sweptBarrel));}
   catch(error){detectorFailure=String(error?.stack??error);row.detector.disabledReason=detectorFailure;}
   row.detector.elapsedMilliseconds=performance.now()-begin;detectorMs+=row.detector.elapsedMilliseconds;row.detector.cumulativeMilliseconds=detectorMs;
  }else if(row.ride.phase==='standing'&&!detectorFailure)row.detector.disabledReason='20s cumulative detector budget; ordinary trajectory continues';
  const nearStart=performance.now();
  if(!detectorFailure&&detectorMs<20000){try{row.nearFormed=nearestIndexedFormed(mode.barrelLoft,row.boardPose);}catch(e){detectorFailure=String(e?.stack??e);row.nearFormed={available:false,qualifies:false,reason:detectorFailure};}detectorMs+=performance.now()-nearStart;}
  else row.nearFormed={available:false,qualifies:false,reason:'20s combined detector budget or prior failure'};
  row.detector.cumulativeMilliseconds=detectorMs;row.detector.disabledReason=detectorFailure;
  row.frontInventory=frontInventory();return row;
 }
 function frontInventory(){
  const snap=mode.host.snapshot,records=snap.front,count=snap.frontCount,stride=9;
  must(Number.isInteger(count)&&count>=0&&count*stride<=records.length,'Raw frontCount is a bounded record count');
  const rawGroups=new Map();
  for(let k=0;k<count;k++){
   const base=k*stride,id=records[base+2],sigma=records[base+3],tau=records[base+4];
   must(Number.isFinite(id)&&Number.isFinite(sigma)&&Number.isFinite(tau),'Finite raw front id/sigma/tau');
   let g=rawGroups.get(id);if(!g){g={front:id,recordCount:0,sigmaMin:Infinity,sigmaMax:-Infinity,tauMin:Infinity,tauMax:-Infinity};rawGroups.set(id,g);}
   g.recordCount++;g.sigmaMin=Math.min(g.sigmaMin,sigma);g.sigmaMax=Math.max(g.sigmaMax,sigma);g.tauMin=Math.min(g.tauMin,tau);g.tauMax=Math.max(g.tauMax,tau);
  }
  const l=mode.barrelLoft,drawnGroups=new Map();
  if(l)for(let k=0;k<l.sliceCount;k++){
   const id=l.sliceFront[k];let g=drawnGroups.get(id);
   if(!g){g={front:id,sliceCount:0,positiveWeightCount:0,formedCount:0,joinedToNextCount:0,sigmaMin:Infinity,sigmaMax:-Infinity,tauMin:Infinity,tauMax:-Infinity};drawnGroups.set(id,g);}
   g.sliceCount++;if(l.sliceWeight[k]>0)g.positiveWeightCount++;if(l.sliceFormed[k]>0)g.formedCount++;if(l.sliceJoined[k]===1)g.joinedToNextCount++;
   g.sigmaMin=Math.min(g.sigmaMin,l.sliceSigma[k]);g.sigmaMax=Math.max(g.sigmaMax,l.sliceSigma[k]);g.tauMin=Math.min(g.tauMin,l.sliceTau[k]);g.tauMax=Math.max(g.tauMax,l.sliceTau[k]);
  }
  return {seaTime:snap.status.seaTime,raw:{recordCount:count,stride,fieldOffsets:{id:2,sigma:3,tau:4},groups:Array.from(rawGroups.values()).sort((a,b)=>a.front-b.front)},
   drawn:{sliceCount:l?.sliceCount??0,vertexCount:l?.vertexCount??0,indexCount:l?.indexCount??0,groups:Array.from(drawnGroups.values()).sort((a,b)=>a.front-b.front)},
   scope:'Read-only raw snapshot front records grouped separately from actual drawn loft rows; no geometry/source replacement or target selection'};
 }
 function checkpoint(label){must(['initial','first-standing','near-formed','terminal'].includes(label),'Declared checkpoint only');follower.hold();must(mode.host.outstandingSteps===0,'Normal paused/drained checkpoint required');
  const snap=mode.host.snapshot,clock=snap.status.seaTime;follower.certifyRender();d.renderView(mode.camera.camera);follower.certifyRender();
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
  const guard=()=>JSON.stringify({current:current(),camera:[camera.position.toArray(),camera.quaternion.toArray(),camera.projectionMatrix.toArray()],surfaceRevision:d.water.surfaceRevision,waterTime:d.water.materialUniforms.waterTime.value});
  const beforeGuard=guard(),front=snap.front,frontWords=new Uint8Array(front.buffer,front.byteOffset,snap.frontCount*9*4).slice();
  const loftSnapshot=snapshotTools.capture(mode.barrelLoft,label,{step:steps,seaTime:clock,surfaceRevision:d.water.surfaceRevision,drawnWaterTime:d.water.materialUniforms.waterTime.value});
  let binary='';for(let i=0;i<frontWords.length;i+=32768)binary+=String.fromCharCode(...frontWords.subarray(i,i+32768));
  loftSnapshot.rawFrontPacket={dtype:'Float32Array',littleEndian:new Uint8Array(new Uint16Array([0x0102]).buffer)[0]===2,recordCount:snap.frontCount,stride:9,fieldOffsets:{x:0,z:1,front:2,sigma:3,tau:4,height:5,depth:6,throwZ:7,pace:8},encoding:'base64-exact-active-typed-array-words',count:snap.frontCount*9,byteLength:frontWords.length,data:btoa(binary)};
  must(mode.host.snapshot===snap&&guard()===beforeGuard&&snap.front===front&&new Uint8Array(front.buffer,front.byteOffset,frontWords.length).every((v,i)=>v===frontWords[i]),'Full loft/front snapshot changed public physics, drawing or actor state');
  loftSnapshot.nonmutation={snapshotClockStatusWordsUnchanged:true,normalActorCameraAndPoseUnchanged:true,drawnSurfaceWordsAndEpochUnchanged:true,allActiveLoftWordsUnchanged:loftSnapshot.arrayIdentitiesAndWordsUnchanged===true,activeRawFrontWordsUnchanged:true};
  const result={cameraFollower:follower.current(),loftSnapshot,label,step:steps,seaTime:clock,clocks:current().clocks,seaCounters:seaCounters(),frontInventory:frontInventory(),visibleHeadExtents:extents,
   camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.toArray(),fov:camera.fov,near:camera.near,far:camera.far},
   png:d.canvas.toDataURL('image/png')};must(mode.host.snapshot===snap&&snap.status.seaTime===clock,'Checkpoint changed physics snapshot');return result;
 }
 let video;
 async function beginVideo(){
  must(!video,'One recorder only');
  must(typeof MediaRecorder==='function'&&typeof d.canvas.captureStream==='function','Native MediaRecorder/canvas stream unavailable; no fallback');
  const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
  must(mime,'Native WebM unavailable; no alternate capture');
  const stream=d.canvas.captureStream(0),track=stream.getVideoTracks()[0];
  if(!track||typeof track.requestFrame!=='function'){stream.getTracks().forEach(t=>t.stop());throw Error('Manual native frame request unavailable');}
  let recorder;try{recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4000000});}
  catch(error){stream.getTracks().forEach(t=>t.stop());throw error;}
  video={stream,track,recorder,chunks:[],bytes:0,error:null,requests:0,out:null,start:current(),startStep:steps,startWall:performance.now(),mime:recorder.mimeType};
  recorder.ondataavailable=e=>{if(!e.data.size)return;if(video.bytes+e.data.size>16*1024*1024){video.error??='16MiB video cap';if(recorder.state==='recording')recorder.stop();return;}video.chunks.push(e.data);video.bytes+=e.data.size;};
  const retainError=e=>{video.error??=String(e.error?.stack??e.error??'Recorder error');return Error('Recorder failure: '+video.error);};
  recorder.onerror=retainError;let initialVideoFrame;
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('5s recorder start timeout')),5000);
   recorder.onerror=e=>{clearTimeout(timer);reject(retainError(e));};
   recorder.onstart=()=>{clearTimeout(timer);recorder.onerror=retainError;resolve();};
   try{
    recorder.start(500);
    // Start the zero-rate stream with the actual triggering standing canvas before awaiting async onstart.
    follower.certifyRender();d.renderView(mode.camera.camera);follower.certifyRender();
    const requestedWallMs=performance.now(),requestedAtIso=new Date().toISOString();
    video.track.requestFrame();video.requests++;
    initialVideoFrame={request:video.requests,step:steps,seaTime:video.start.seaTime,requestedWallMs,requestedAtIso,
     cameraPosition:mode.camera.camera.position.toArray(),cameraQuaternion:mode.camera.camera.quaternion.toArray(),requestedBeforeRecorderStartEvent:true};
   }catch(error){clearTimeout(timer);video.error??=String(error?.stack??error);reject(error);}
  });
  must(recorder.state==='recording'&&!video.error&&initialVideoFrame&&video.requests===1,'Triggering standing canvas must be initial request 1');
  return {mimeType:video.mime,canvas:[d.canvas.width,d.canvas.height],startStep:steps,startSeaTime:video.start.seaTime,complete:false,initialVideoFrame};
 }
 async function videoFrame(){
  must(video&&video.recorder.state==='recording'&&!video.error,'Recorder active and healthy');must(lab.clock.paused&&mode.host.outstandingSteps===0,'Drained video clock');
  const seaTime=mode.host.snapshot.status.seaTime;must(video.requests<241,'241 request cap');follower.certifyRender();d.renderView(mode.camera.camera);follower.certifyRender();
  const requestedWallMs=performance.now(),requestedAtIso=new Date().toISOString(),cameraPosition=mode.camera.camera.position.toArray(),cameraQuaternion=mode.camera.camera.quaternion.toArray();
  video.track.requestFrame();video.requests++;await new Promise(r=>requestAnimationFrame(r));
  return {request:video.requests,step:steps,seaTime,requestedWallMs,requestedAtIso,cameraPosition,cameraQuaternion};
 }
 async function finishVideo(){
  must(video&&!video.error&&video.recorder.state==='recording','Recorder finish healthy');
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('8s recorder stop timeout')),8000);video.recorder.onstop=()=>{clearTimeout(timer);resolve();};try{video.recorder.requestData();video.recorder.stop();}catch(e){clearTimeout(timer);reject(e);}});
  video.stream.getTracks().forEach(t=>t.stop());must(!video.error,'Video error');const b=new Blob(video.chunks,{type:video.mime});must(b.size>4&&b.size<=16*1024*1024,'Video byte cap');video.out=new Uint8Array(await b.arrayBuffer());video.chunks=[];
  return {complete:true,bytes:b.size,mimeType:video.mime,requestCount:video.requests,requestFrameCount:video.requests,startStep:video.startStep,endStep:steps,physicsAdvances:steps-video.startStep,physicalSeconds:mode.host.snapshot.status.seaTime-video.start.seaTime,startSeaTime:video.start.seaTime,endSeaTime:mode.host.snapshot.status.seaTime,wallMilliseconds:performance.now()-video.startWall,tracksStopped:video.stream.getTracks().every(t=>t.readyState==='ended'),physicalPlaybackRateClaim:false,encodedFrameCountClaim:false};
 }
 function videoChunk(offset,length){must(video?.out&&Number.isInteger(offset)&&Number.isInteger(length)&&offset>=0&&length>0&&length<=512*1024,'Bounded video chunk');const bytes=video.out.subarray(offset,offset+length);let b='';for(let i=0;i<bytes.length;i+=32768)b+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(b);}
 function abortVideo(){if(!video)return{started:false};try{if(video.recorder.state==='recording')video.recorder.stop();}catch(e){video.error??=String(e);}video.stream.getTracks().forEach(t=>t.stop());return{started:true,error:video.error,requests:video.requests,tracksStopped:video.stream.getTracks().every(t=>t.readyState==='ended')};}
 window.__naturalEntry={step,current,checkpoint,radii,beginVideo,videoFrame,finishVideo,videoChunk,abortVideo};
}
