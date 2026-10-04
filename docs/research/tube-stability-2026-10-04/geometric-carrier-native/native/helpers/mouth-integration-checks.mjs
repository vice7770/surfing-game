// CPU-only fixtures. No native page, network, port, server, renderer, or production simulation launch.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createStationTools} from './station-tools.mjs';
import {installMovingShape} from './moving-shape.mjs';
import {createMouthTools} from './mouth-tools.mjs';
import {createLoftSnapshotTools} from './loft-snapshot-tools.mjs';
const W='/private/tmp/tube-bounded-c-carrier-support-native-20261004',tools=createStationTools(),groups=[];
function test(name,fn){fn();groups.push(name);}
const raw=[0,1,2].map((x,i)=>({record:i,x,z:10+i,front:69,sigma:20+i,tau:.7-i*.1}));
test('fixed-X mapping follows rebased sigma and moving raw Z',()=>{const first=tools.map(raw,69,.5),later=tools.map(raw.map(p=>({...p,sigma:p.sigma-20,z:p.z+3})),69,.5);assert.equal(first.sigma,20.5);assert.equal(later.sigma,.5);assert.equal(later.z,13.5);assert.equal(later.x,.5);});
test('raw exact internal/end ties are deterministic and never extrapolate',()=>{assert.deepEqual(tools.map(raw,69,1).rawBracket,[1,2]);assert.deepEqual(tools.map(raw,69,2).rawBracket,[1,2]);assert.equal(tools.map(raw,69,0).fraction,0);assert.equal(tools.map(raw,69,-Number.EPSILON).reason,'station-outside-raw-range');assert.equal(tools.map(raw,69,2.01).reason,'station-outside-raw-range');});
test('front absence is distinct from bounds and one-point join loss',()=>{assert.equal(tools.map(raw,70,1).reason,'raw-front-absent');assert.equal(tools.map([raw[0]],69,0).reason,'loft-join-absent');});
test('duplicate/nonmonotone X or sigma is an invariant failure',()=>{assert.throws(()=>tools.map([{...raw[0]}, {...raw[1],x:0}],69,0),/strictly/);assert.throws(()=>tools.map([{...raw[0]}, {...raw[1],sigma:19}],69,0),/strictly/);});
const S=134,E=3,positions=new Float32Array(2*S*3);function setPositions(z=0){for(let r=0;r<2;r++)for(let j=0;j<S;j++){const i=3*(r*S+j);positions[i]=r;positions[i+1]=2-j/S;positions[i+2]=z+(j-E-32)/80;}}
setPositions();
const loft={rayCorrections:2,rayMaxBlend:1,rayMinAdvance:1,rayInvalidIntervals:0,sliceCount:2,vertexCount:2*S,indexCount:3,positions,indices:new Uint32Array([0,1,S]),sliceFront:new Int32Array([69,69]),sliceSigma:new Float32Array([20,21]),sliceJoined:new Uint8Array([1,0]),sliceRayX:new Float32Array([0,0]),sliceRayZ:new Float32Array([1,1]),sliceTau:new Float32Array([.6,.4]),sliceLife:new Float32Array([.5,.5]),slicePhase:new Uint8Array([1,1]),sliceCollapse:new Float32Array([.3,.3]),sliceFormed:new Float32Array([1,1]),sliceWeight:new Float32Array([1,1]),sliceFade:new Float32Array([1,1]),sliceMouth:new Float32Array([2,3])};
for(const [key,m] of Object.entries({normals:3,mask:1,lift:1,sheet:1,sheetWeight:1,sheetBack:1,throat:4}))loft[key]=new Float32Array(m*loft.vertexCount).fill(.25);
test('loft join bracket tracks mapped sigma and fails honestly when cut',()=>{assert.deepEqual(tools.bracket(loft,69,20.5),{a:0,b:1,t:.5});assert.equal(tools.bracket(loft,69,19.5),null);loft.sliceJoined[0]=0;assert.equal(tools.bracket(loft,69,20.5),null);loft.sliceJoined[0]=1;});
test('actual crest-X bracket is independent of raw sigma and deterministic at joins',()=>{const a=tools.fromCurrentLoft(loft,69,.5);assert.equal(a.bracket.t,.5);assert.equal(a.bracket.sigma,20.5);assert.equal(tools.fromCurrentLoft(loft,69,1).bracket.t,1);assert.equal(tools.fromCurrentLoft(loft,69,2).bracket,null);loft.sliceJoined[0]=0;assert.equal(tools.fromCurrentLoft(loft,69,.5).bracket,null);loft.sliceJoined[0]=1;});
test('full row metadata includes all slice arrays and actual crest/cap/toe',()=>{const r=tools.rows(loft);assert.equal(r.length,2);assert.equal(r[0].sliceMouth,2);assert.equal(r[0].sliceJoined,1);assert.deepEqual(r[0].crest,tools.world(loft,0,32));});
test('rich cubic height reproduces constant and interior affine nodes',()=>{const grid={xMin:0,zMin:0,nx:6,nz:6,spacing:1},data=new Float32Array(72);for(let j=0;j<6;j++)for(let i=0;i<6;i++)data[2*(j*6+i)]=2*i+3*j+4;assert(Math.abs(tools.water(data,grid,'rich',2.2,2.3).height-15.3)<1e-12);data.fill(7);assert(Math.abs(tools.water(data,grid,'rich',-1,-1).height-7)<1e-12);assert.equal(tools.water(data,grid,'rich',-1,-1).outside,true);assert.equal(tools.water(data,grid,'classic',-1,-1).height,0);});
test('exact indexed segment hit is double-sided and excludes out-of-segment hits',()=>{const l={positions:new Float32Array([-1,-1,1,1,-1,1,0,1,1]),indices:new Uint32Array([0,1,2]),indexCount:3,sliceFront:new Int32Array([69])};const hit=tools.firstHit(l,[0,0,0],[0,0,2]);assert.equal(hit.firstHit.fraction,.5);assert.equal(hit.firstHit.fronts[0],69);assert.equal(tools.firstHit(l,[0,0,0],[0,0,.5]).indexedLoftOccluded,false);assert.equal(tools.firstHit(l,[0,0,2],[0,0,0]).indexedLoftOccluded,true);});
class V {constructor(a=[0,0,0]){this.a=[...a];}clone(){return new V(this.a);}fromArray(a){this.a=[...a];return this;}toArray(){return [...this.a];}}
class Camera {constructor(){this.position=new V([10,3,20]);this.quaternion=new V([0,0,0,1]);this.projectionMatrix=new V([1,0,0,1]);}clone(){const c=new Camera();c.position=this.position.clone();c.quaternion=this.quaternion.clone();return c;}lookAt(v){this.quaternion.fromArray([...v.toArray(),1]);}updateMatrixWorld(){}}
const follow=new Camera(),calls=[],inputs=[],events=[],drawEvents=[];let updates=0;
const snapshot={status:{seaTime:100,compute:'gpu',ride:{phase:'prone'}},frontCount:2,front:new Float32Array([0,0,69,20,.6,2,7,0,5,1,0,69,21,.4,2,7,0,5]),tubeCount:1,lipCount:1,board:new Float64Array(8),rider:new Float64Array(21)};
const mode={barrelLoft:loft,camera:{camera:follow},host:{outstandingSteps:0,snapshot,heightAt(){return .2;}},barrelMesh:{mesh:{visible:true,material:{opacity:1}}},update(dt){assert.equal(dt,1/60);updates++;for(let i=0;i<2;i++){snapshot.front[9*i+3]=i;snapshot.front[9*i+1]=updates*.1;} /* Source-faithful: no loft refresh in mode.update. */},sweptBarrel:{},drawBarrel(){assert.equal(d.water.causticSource.waterTime.value,snapshot.status.seaTime);drawEvents.push('loft');if(updates){loft.sliceSigma.set([0,1]);setPositions(updates*.1);}if(updates===2)loft.slicePhase.fill(2);if(updates===3)loft.sliceJoined[0]=0;this.sweptBarrel.drawn={revision:snapshot.status,front:snapshot.front,count:snapshot.frontCount,surfaceRevision:d.water.surfaceRevision};}};
let exportCalls=0,changePointIDs=false;
function encodeHeader(h){const header=new TextEncoder().encode(JSON.stringify(h)),start=8+Math.ceil(header.length/4)*4,bytes=new Uint8Array(start),v=new DataView(bytes.buffer);v.setUint32(0,0x53455431,true);v.setUint32(4,header.length,true);bytes.set(header,8);return bytes;}
mode.host.exportState=async()=>{exportCalls++;const points=[0,1].map(i=>{const b=9*i;return {id:(changePointIDs?500:101)+i,column:i,x:snapshot.front[b],z:snapshot.front[b+1],front:snapshot.front[b+2],sigma:snapshot.front[b+3],tau:snapshot.front[b+4],footHeight:snapshot.front[b+5],footDepth:snapshot.front[b+6],throwZ:snapshot.front[b+7],jetPace:snapshot.front[b+8],jetUntil:20,jetBase:0,jetAt:0,joined:90,broke:90,thrown:90,seen:snapshot.status.seaTime,carrierSupport:{policy:'bounded-C-incident-support/v1',atTau:snapshot.front[b+4],solverTime:snapshot.status.seaTime,ownPocketAlive:true,retainedForGeometry:false,geometricPaceActive:true,state:'own-pocket',incidents:[]}};});return {bytes:encodeHeader({solverTime:snapshot.status.seaTime,seaTimeOffset:0,arrays:[],front:{points}}),deflated:false};};
const actor={name:'board',type:'Object3D',visible:true,position:new V([1,2,3]),quaternion:new V([0,0,0,1]),scale:new V([1,1,1]),traverse(fn){fn(this);}};mode.board=actor;mode.surfer={group:{...actor,name:'surfer'}};
const png='data:image/png;base64,'+Buffer.from([137,80,78,71,13,10,26,10,0]).toString('base64'),track={readyState:'live',requestFrame(){events.push('request');},stop(){this.readyState='ended';}},stream={getVideoTracks:()=>[track],getTracks:()=>[track]};
const d={mode,water:{surfaceRevision:0,causticSource:{waterTime:{value:100}},update(){drawEvents.push('water');if(this.causticSource.waterTime.value!==snapshot.status.seaTime)this.surfaceRevision++;this.causticSource.waterTime.value=snapshot.status.seaTime;},surfaceData:new Float32Array(32),grid:{xMin:-10,zMin:-10,nx:4,nz:4,spacing:10},drawnLook:'rich',mesh:{visible:true,material:{opacity:1}}},step(input){assert.deepEqual(input,{paddle:false,popUp:false,steer:0});inputs.push(input);snapshot.status.seaTime+=1/60;},renderView(camera){assert.notEqual(camera,follow);d.water.update();mode.drawBarrel();calls.push(camera.position.toArray());},canvas:{width:1708,height:879,toDataURL:()=>png,captureStream(rate){assert.equal(rate,0);return stream;}}};
globalThis.window={breaklineDiagnostics:d,breaklineLab:{clock:{paused:true}}};globalThis.requestAnimationFrame=cb=>queueMicrotask(()=>cb());
class Recorder {static isTypeSupported(){return true;}constructor(s,o){assert.equal(s,stream);assert.equal(o.videoBitsPerSecond,4000000);this.mimeType=o.mimeType;this.state='inactive';}start(ms){assert.equal(ms,500);this.state='recording';events.push('start');queueMicrotask(()=>{events.push('onstart');this.onstart();});}requestData(){this.ondataavailable({data:new Blob([new Uint8Array([0x1a,0x45,0xdf,0xa3,1])])});}stop(){this.state='inactive';queueMicrotask(()=>this.onstop?.());}}
globalThis.MediaRecorder=Recorder;
const columns=(l,qs)=>qs.map(()=>({covering:[{component:{front:l.sliceFront[0]},crossings:updates===2?[0]:[0,1.5,1.8],strictlyOrdered:true}]}));

let noMouthCandidate=false,classificationBelow=false;
const mouthColumns=(l,qs)=>columns(l,qs).map(q=>({...q,covering:q.covering.map(c=>({...c,crossings:noMouthCandidate&&qs.length===24?[0]:c.crossings,component:{...c.component,localId:0}}))}));
mode.cameraBelowSurface=(margin,v)=>{assert.equal(margin,.1);assert(v.toArray().every(Number.isFinite));return classificationBelow;};
const followBefore=JSON.stringify([follow.position.toArray(),follow.quaternion.toArray()]);
const install=installMovingShape(()=>({columns:mouthColumns}),()=>()=>({target:null}),createStationTools,createMouthTools,createLoftSnapshotTools);
assert.equal(install.cameraPolicy,'whole-directed-interval-full-sightline-and-declared-exterior-fallback');
const api=window.__boundedShape,locked=await api.lock({qualified:true,front:69,sigma:20.5,along:.5,crest:{x:.5,z:0}});
assert(locked.mouth.candidate.qualified&&locked.mouth.targetUsed);
assert(locked.mouth.candidate.directedProgress>0&&locked.mouth.candidate.sameEyeSheetComponent);
const initialWordsFrame=await api.png({captureLoftSnapshot:true,label:'initial'});assert(initialWordsFrame.loftSnapshot.available);assert.equal(initialWordsFrame.loftSnapshot.epoch.movingStep,0);assert(initialWordsFrame.loftSnapshot.nonmutation.normalAndDiagnosticCameraUnchanged);assert.deepEqual(Buffer.from(initialWordsFrame.loftSnapshot.arrays.normals.data,'base64'),Buffer.from(loft.normals.buffer));await assert.rejects(()=>api.png({captureLoftSnapshot:true,label:'initial'}),/At most two/);
assert.deepEqual(locked.target,locked.mouth.target);assert.equal(locked.mouth.eyeBelowSurface,false);
const words=Buffer.from(new Uint8Array(loft.positions.buffer)),external=await api.externalPng();
assert.equal(external.observation.diagnosticView,'one-fixed-exterior-companion');assert.equal(external.poseRetries,0);
assert.equal(external.belowSurface,false);assert.deepEqual(Buffer.from(new Uint8Array(loft.positions.buffer)),words);
const restored=await api.observe();assert.deepEqual(restored.camera,locked.camera);
assert.equal(JSON.stringify([follow.position.toArray(),follow.quaternion.toArray()]),followBefore);assert.equal(inputs.length,0);
noMouthCandidate=true;classificationBelow=true;
const noCandidate=await api.observe();assert.equal(noCandidate.mouth.candidate,null);assert(noCandidate.mouth.localHeadingRetainedOnFailure);
assert.deepEqual(noCandidate.target,noCandidate.eye.map((v,i)=>v+2*noCandidate.younger[i]));
assert.deepEqual(noCandidate.mouth.exterior.anchorPoint,noCandidate.eye);assert.deepEqual(noCandidate.mouth.exterior.anchorRay,noCandidate.ray);
const fallback=await api.externalPng();assert.equal(fallback.anchorPolicy,'current-selected-strict-air-eye-no-mouth-candidate');assert.equal(fallback.belowSurface,true);
assert.equal(fallback.externalEntranceClaim,false);assert.equal(fallback.interiorMouthFailure,'no-strict-air-column-in-declared-whole-directed-interval');
assert.deepEqual((await api.observe()).camera,noCandidate.camera);assert.deepEqual(Buffer.from(new Uint8Array(loft.positions.buffer)),words);
noMouthCandidate=false;classificationBelow=false;
const savedPositions=loft.positions.slice(),savedIndices=loft.indices.slice();
loft.positions.set([.75,0,0,.75,1.5,0,.75,0,1.5],12);loft.indices.set([4,5,6]);
const obstructed=await api.observe();assert(obstructed.mouth.candidate);assert.equal(obstructed.mouth.fullSightline.indexedLoftOccluded,true);
assert(obstructed.mouth.localHeadingRetainedOnFailure);assert.equal(obstructed.mouth.target,null);
const obstructionWords=Buffer.from(new Uint8Array(loft.positions.buffer));
const blockedFrame=await api.externalPng();assert.equal(blockedFrame.interiorMouthFailure,'full-selected-eye-to-candidate-segment-obstructed');assert.equal(blockedFrame.poseRetries,0);
assert.deepEqual((await api.observe()).camera,obstructed.camera);assert.deepEqual(Buffer.from(new Uint8Array(loft.positions.buffer)),obstructionWords);
loft.positions.set(savedPositions);loft.indices.set(savedIndices);const inner=await api.observe();
const start=await api.beginVideo();assert.deepEqual(start.initialVideoFrame.cameraPosition,inner.eye);assert.deepEqual(start.initialVideoFrame.cameraQuaternion,inner.camera.quaternion);await api.finishVideo();
assert.equal(JSON.stringify([follow.position.toArray(),follow.quaternion.toArray()]),followBefore);assert.equal(inputs.length,0);await api.step();const actualPhase2=await api.step();assert(actualPhase2.rows.some(r=>r.slicePhase===2));const phaseWords=await api.png({captureLoftSnapshot:true,label:'first-phase2'});assert(phaseWords.loftSnapshot.available);assert.equal(phaseWords.loftSnapshot.epoch.movingStep,2);assert(phaseWords.loftSnapshot.nonmutation.allActiveLoftWordsUnchanged);await assert.rejects(()=>api.png({captureLoftSnapshot:true,label:'first-phase2'}),/At most two/);
const report={complete:true,mouthPolicyIntegration:true,initialDirectedSameComponentCandidate:true,fullSightlineAndWaterClassifications:true,absentCandidateExteriorFallbackRecordedEvenBelowSurface:true,blockedSightlineFailureAndLocalHeadingRetained:true,exteriorCloneRestoredInAllThreePolicies:true,originalFollowAndControlsUntouched:true,loftWordsAndDrawEpochUnchanged:true,initialMovieFrameUsesInnerCameraPositionAndQuaternion:true,exactOptionalInitialAndObservedPhase2Words:true,duplicateSnapshotEpochRejected:true,fullSnapshotNormalAndAuxWordsNonmutating:true,mockOnly:true,resourcesStarted:false,portsProbed:false};
fs.writeFileSync(W+'/mouth-integration-checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
