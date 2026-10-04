// Finite offline detector checks only; no scene, solver, browser, server or worker starts.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createWitnessSampler } from './body-witnesses.mjs';
import { Autopilot, autopilotView, riderPartVolumes } from './dist/diagnostic-autopilot.mjs';
const outcomes=[];
function fixture(extra=[]){
 const p=[],ix=[];
 for(const y of[0,3,4])for(const[x,z]of[[0,0],[1,0],[1,1],[0,1]])p.push(x,y,z);
 for(let level=0;level<3;level++){const o=4*level;ix.push(o,o+1,o+2,o,o+2,o+3);}
 for(let level=0;level<2;level++)for(let side=0;side<4;side++){
  const a=4*level+side,b=4*level+(side+1)%4,c=a+4,d=b+4;ix.push(a,b,d,a,d,c);
 }
 if(extra.length){const n=p.length/3;p.push(...extra);ix.push(n,n+1,n+2);}
 return{positions:Float32Array.from(p),indices:Uint32Array.from(ix),vertexCount:p.length/3,indexCount:ix.length,sliceCount:1,
  sliceFront:Int32Array.of(7),sliceSigma:Float32Array.of(0)};
}
const words=Array.from({length:7},()=>[.4,1,.5]).flat(),radii=Array(7).fill(.1);
const measure=(mesh,water)=>createWitnessSampler()(mesh,words,radii,()=>water);
const ordinary=measure(fixture(),false);assert.equal(ordinary.classification,'contained');outcomes.push('three ordered component crossings with clear reference spheres');
const water=measure(fixture(),true);assert.equal(water.classification,'ambiguous');assert.equal(water.sevenPublishedWitnessesAndReferenceTrunkSpheresContained,false);outcomes.push('production water parity blocks apparent cavity');
for(const extra of[[.3,1,.5,.4,1,.5,.5,1,.5],[.4,1,.5,.4,1,.5,.4,1,.5]]){
 const row=measure(fixture(extra),false);assert.equal(row.sevenPublishedWitnessesAndReferenceTrunkSpheresContained,false);
 assert.equal(row.headSphere.intersectsOrTouches,true);
}outcomes.push('collinear and coincident triangles retain actual segment contact');
assert.throws(()=>createWitnessSampler()(fixture(),words,Array(7).fill(-.1),()=>false),/positive reference radii/);
assert.equal(typeof autopilotView,'function');assert.equal(new Autopilot({style:'line',stall:false}).state,'position');
assert.equal(riderPartVolumes().length,7);outcomes.push('unchanged input module exports and positive-radius guard');
writeFileSync('/private/tmp/tube-gauge-natural-entry-20261004/source-check.json',JSON.stringify({schema:'tube-natural-entry-source-check/v1',complete:true,resourcesStarted:false,
 scope:'Finite offline synthetic detector/source checks; no runtime or trajectory claim',outcomes},null,2)+'\n');
console.log(JSON.stringify({complete:true,resourcesStarted:false,checks:outcomes.length}));
