import assert from 'node:assert/strict';
import test from 'node:test';
import {createMouthTools} from './mouth-tools.mjs';
import {createWitnessSampler} from '/private/tmp/tube-directed-entry-20261004/body-witnesses.mjs';
import {createStationTools} from '/private/tmp/tube-bounded-c-parallel-native-20261004/station-tools.mjs';

function fixture(reverse=false,barrier=false,n=8,boundary=6,airThrough=Infinity){
 const S=134,l={sliceCount:n,vertexCount:n*S,indexCount:(n-1)*(S-1)*6,
 positions:new Float32Array(n*S*3),indices:new Uint32Array((n-1)*(S-1)*6),
 sliceFront:new Int32Array(n).fill(7),sliceJoined:new Uint8Array(n).fill(1),
 sliceSigma:Float32Array.from({length:n},(_,i)=>i),sliceRayX:new Float32Array(n),
 sliceRayZ:new Float32Array(n).fill(1),sliceFormed:new Float32Array(n)};
 l.sliceJoined[n-1]=0;
 const anchors=[[0,-2,0],[32,0,3],[64,4,2.2],[68,4,2],[88,0,2],[104,0,0],[112,5,0],[127,7,0]];
 for(let row=0;row<n;row++){
  const age=reverse?n-1-row:row,formed=age<boundary-1?1:age===boundary-1?.5:0;
  l.sliceFormed[row]=formed;
  for(let j=0;j<S;j++){
   const q=Math.min(127,Math.max(0,j-3));let k=0;
   while(k+1<anchors.length&&q>anchors[k+1][0])k++;
   const a=anchors[k],b=anchors[Math.min(k+1,anchors.length-1)],t=a[0]===b[0]?0:(q-a[0])/(b[0]-a[0]);
   const z=age>airThrough?-2+9*q/127:a[1]+t*(b[1]-a[1]),h=(a[2]+t*(b[2]-a[2]))*formed;
   const floor=barrier&&age>=4?1.4:0;
   l.positions.set([row,h+floor,z],3*(row*S+j));
  }
 }
 let o=0;
 for(let row=0;row+1<n;row++)for(let j=0;j+1<S;j++){
  const a=row*S+j,b=a+1,c=a+S,d=c+1;l.indices.set([a,c,b,b,c,d],o);o+=6;
 }
 return l;
}
function run(l,sign,eye,crestStation={a:2,b:3,t:.5}){
 const tools=createMouthTools(),sampler=createWitnessSampler(),station=createStationTools();
 const eyeComponent=sampler.columns(l,[{x:eye[0],z:eye[2]}])[0].covering[0]?.component.localId;
 return tools.choose(l,crestStation,7,1,sign,(g,p)=>sampler.columns(g,p),station.firstHit,eye,eyeComponent);
}

test('uses actual indexed air at directed young boundary; checks complete rising sightline',()=>{
 const l=fixture(),r=run(l,1,[2.5,1,1]);
 assert.equal(r.boundaryRow,6);assert.equal(r.boundaryReason,'first-unformed-underside');
 assert.equal(r.attempts.length,24);assert.equal(r.candidate.covering.length,1);
 assert.equal(r.candidate.covering[0].crossings.length,3);
 assert(r.candidate.point[0]>5&&r.candidate.point[0]<6);
 assert(r.candidate.point[1]<1);assert.equal(r.fullSightline.indexedLoftOccluded,false);
 assert.deepEqual(r.target,r.candidate.point);assert.equal(r.externalEntranceClaim,false);
 assert(r.fullSightline.trianglesTested>0);
});
test('immutable negative younger direction selects same run opposite boundary',()=>{
 const l=fixture(true),r=run(l,-1,[2.5,1,1]);
 assert.equal(r.boundaryRow,1);assert(r.candidate.point[0]>1&&r.candidate.point[0]<2);
 assert.equal(r.immutableYoungerSign,-1);assert.equal(r.continuousAirCorridorClaim,false);
});
test('local air endpoints do not hide intervening raised floor obstruction',()=>{
 const l=fixture(false,true),r=run(l,1,[2.5,1,1]);
 assert(r.candidate?.qualified);assert.equal(r.fullSightline.indexedLoftOccluded,true);
 assert.equal(r.target,null);assert.equal(r.failure,'full-selected-eye-to-candidate-segment-obstructed');
 assert(r.fullSightline.firstHit.distance>0);assert.deepEqual(r.run,[0,7]);
});
test('joined run boundary and foreign front prevent a viewpoint search',()=>{
 const l=fixture();l.sliceJoined[3]=0;
 const r=run(l,1,[2.5,1,1]);
 assert.deepEqual(r.run,[0,3]);assert.equal(r.boundaryRow,3);assert.equal(r.boundaryReason,'joined-run-end');
 assert(r.attempts.every(c=>c.rows.every(row=>row<=3)));
 l.sliceFront.fill(8);const lost=run(l,1,[2.5,1,1]);
 assert.equal(lost.candidate,null);assert.equal(lost.target,null);
});
test('single exterior pose and width are finite, with no extra height or pose retries',()=>{
 const l=fixture(),tools=createMouthTools(),W=tools.width(l,2,3,.5),r=run(l,1,[2.5,1,1]);
 assert.equal(W,9);
 const p=tools.exterior(r.candidate,W,[1,0,0],()=>4);
 assert.equal(p.eye[0],r.candidate.point[0]+18);assert.equal(p.eye[2],r.candidate.point[2]+9);
 assert.equal(p.eye[1],4.1);assert.deepEqual(p.target,r.candidate.point);
 assert.throws(()=>tools.exterior(r.candidate,W,[1,0,0],()=>NaN));
 l.positions.fill(NaN);assert.throws(()=>tools.width(l,2,3,.5));
});
test('short interval beside run end stays strictly youngerward of fractional eye',()=>{
 const l=fixture();l.sliceJoined[3]=0;
 const sampler=createWitnessSampler(),station=createStationTools(),tools=createMouthTools();
 const id=sampler.columns(l,[{x:2.999,z:1}])[0].covering[0].component.localId;
 const r=tools.choose(l,{a:2,b:3,t:.999},7,1,1,(g,p)=>sampler.columns(g,p),station.firstHit,[2.999,1,1],id);
 assert(r.candidate);assert(r.attempts.every(c=>c.directedProgress>0&&c.rowCoordinate>2.999&&c.rowCoordinate<3));
});
test('same front label cannot substitute for the eye sheet component',()=>{
 const l=fixture(),sampler=createWitnessSampler(),station=createStationTools(),tools=createMouthTools();
 const r=tools.choose(l,{a:2,b:3,t:.5},7,1,1,(g,p)=>sampler.columns(g,p),station.firstHit,[2.5,1,1],987654);
 assert.equal(r.candidate,null);assert(r.attempts.every(c=>!c.sameEyeSheetComponent));
});
for(const sign of [1,-1])test(`whole interval finds actual same-component air more than three cells from boundary, younger sign=${sign}`,()=>{
 const l=fixture(sign<0,false,32,25,10),eyeX=sign>0?2.5:28.5,a=Math.floor(eyeX);
 const r=run(l,sign,[eyeX,1,1],{a,b:a+1,t:.5});
 assert.equal(r.attempts.length,24);assert(r.candidate?.qualified);
 assert(sign*(r.boundaryRow-r.candidate.rowCoordinate)>3);
 assert(r.attempts.every(c=>c.directedProgress>0&&c.directedProgress<r.interval.directedLength));
 assert(r.attempts.every((c,i)=>i===0||c.directedProgress<r.attempts[i-1].directedProgress));
 assert(r.candidate.sameEyeSheetComponent);assert.equal(r.candidate.covering[0].component.front,7);
 assert.equal(r.candidate,r.attempts.find(c=>c.qualified));assert(r.fullSightline.trianglesTested>0);
});
test('absent mouth candidate retains a single declared exterior anchored at current selected air eye',()=>{
 const l=fixture(),tools=createMouthTools(),sampler=createWitnessSampler(),station=createStationTools(),eye=[2.5,1,1];
 const r=tools.choose(l,{a:2,b:3,t:.5},7,1,1,(g,p)=>sampler.columns(g,p),station.firstHit,eye,987654);
 assert.equal(r.candidate,null);assert.equal(r.target,null);assert.equal(r.failure,'no-strict-air-column-in-declared-whole-directed-interval');
 const p=tools.exterior(r.candidate,9,[1,0,0],()=>4,{point:eye,ray:[0,1]});
 assert.deepEqual(p.anchorPoint,eye);assert.deepEqual(p.target,eye);assert.deepEqual(p.eye,[20.5,4.1,10]);
 assert.equal(p.anchorPolicy,'current-selected-strict-air-eye-no-mouth-candidate');assert.equal(p.poseRetries,0);assert.equal(p.externalEntranceClaim,false);
 assert.throws(()=>tools.exterior(null,9,[1,0,0],()=>0,{point:eye,ray:[NaN,1]}));
});
test('blocked full sightline retains failure while the single exterior remains a diagnostic pose',()=>{
 const l=fixture(false,true),tools=createMouthTools(),r=run(l,1,[2.5,1,1]);
 assert.equal(r.fullSightline.indexedLoftOccluded,true);assert.equal(r.target,null);
 const p=tools.exterior(r.candidate,tools.width(l,2,3,.5),[1,0,0],()=>0,{point:[2.5,1,1],ray:[0,1]});
 assert.equal(p.anchorPolicy,'current-strict-air-mouth-candidate');assert.equal(p.poseRetries,0);assert(p.eye.every(Number.isFinite));assert.equal(p.externalEntranceClaim,false);
});
