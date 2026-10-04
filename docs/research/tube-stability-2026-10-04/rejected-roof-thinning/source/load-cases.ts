import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLEAR, LANDMARK, PROFILE_POINTS, heldFrame, type BarrelCase } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/barrel/ProfileLibrary';
import { decodeCase } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/barrel/profileFormat';
const ROOT='/Users/regina/Desktop/Projects/surfing-game';
const WORK='/private/tmp/tube-thinner-roof-20261004';
const FLOATS=2*PROFILE_POINTS;
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
assert(!existsSync(join(WORK,'eligible-cases.json')));
function beneath(c:BarrelCase,f:number,x:number,y:number):number {
 const o=f*FLOATS;let best=Number.NaN;
 for(let i=LANDMARK.throat;i<LANDMARK.front;i++){
  const x0=c.frames[o+2*i],x1=c.frames[o+2*i+2];
  if(x0===x1||(x0-x)*(x1-x)>0)continue;
  const y0=c.frames[o+2*i+1];
  const under=y0+((x-x0)/(x1-x0))*(c.frames[o+2*i+3]-y0);
  if(under<y&&!(under<=best))best=under;
 }return best;
}
const ownerPath='/private/tmp/tube-lip-attribution-20261004/native-first-owner.json';
const owner=JSON.parse(readFileSync(ownerPath,'utf8'));
const files=readdirSync(join(ROOT,'public/barrels')).filter(p=>p.endsWith('.bin')).sort();
assert.equal(files.length,8);
const cases=files.map(file=>{
 const path=join(ROOT,'public/barrels',file),b=new Uint8Array(readFileSync(path));
 const hash=sha(b),runtime=owner.served['barrels/'+file];
 if(runtime){assert.equal(runtime.sha256,hash);assert.equal(runtime.bytes,b.length);}
 const c=decodeCase(b);assert(c.frames.every(Number.isFinite));
 const count=c.frames.length/FLOATS;assert(Number.isInteger(count));
 const last=Math.min(count-1,Math.floor((c.touchdown-c.tauStart)/c.tauStep+1e-6)-1);
 const eligible=[];
 for(let f=0;f<=last;f++){
  const o=f*FLOATS,x=c.frames[o+2*LANDMARK.lip],y=c.frames[o+2*LANDMARK.lip+1];
  const reach=x-c.frames[o+2*LANDMARK.throat],clear=y-beneath(c,f,x,y);
  if(!(reach>=CLEAR.gap&&clear>=CLEAR.gap))continue;
  const raw=c.frames.slice(o,o+FLOATS);
  eligible.push({frame:f,tau:c.tauStart+f*c.tauStep,lipThroatReach:reach,lipFloorClearance:clear,profile:Array.from(raw)});
 }
 const held=heldFrame(c);
 assert(held.clear);
 assert.equal(eligible.at(-1)?.tau,held.tau);
 return {id:c.id,asset:{file:path,bytes:b.length,sha256:hash,matchedNativeReceipt:!!runtime},
  source:{slope:c.slope,nonlinearity:c.nonlinearity,tauStart:c.tauStart,tauStep:c.tauStep,touchdown:c.touchdown,frameCount:count,lastSearchFrame:last,clearThreshold:CLEAR.gap},held,eligible};
});
const sourceFiles=['src/wave/barrel/ProfileLibrary.ts','src/wave/barrel/profileFormat.ts'].map(file=>{
 const path=join(ROOT,file),b=readFileSync(path);return {file:path,bytes:b.length,sha256:sha(b)};
});
writeFileSync(join(WORK,'eligible-cases.json'),JSON.stringify({schema:'thin-roof-eligible/v1',complete:true,sourceFiles,sourceOwner:ownerPath,eligibility:'Exact heldFrame bounds, lip-throat reach and lip-floor clearance; all passing frames before touchdown',cases}));
console.log(JSON.stringify({complete:true,cases:cases.map(c=>({id:c.id,eligible:c.eligible.length,heldTau:c.held.tau})),source:join(WORK,'eligible-cases.json')}));
