import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { LANDMARK, ProfileLibrary } from './ProfileLibrary';
import { LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from './sweptLoft';
const cases=readBarrelCases().map(decodeCase), c=cases.find(c=>c.id==='pad19-a30-l12')!, library=new ProfileLibrary(cases,{geometry:'bounded-C'});
const foot=Math.fround(c.nonlinearity*7), times=library.profileTimes({slope:c.slope,footHeight:foot,footDepth:7}), retired=times.touchdownSeconds+times.collapseSeconds;
type PacketRow={x:number;z:number;front:number;sigma:number;tau:number;footHeight:number;footDepth:number;throwZ:number|null;pace:number|null};
type NativeRow={sliceTau:number;sliceFade:number;sliceWeight:number;crest:number[]};
const fixture=JSON.parse(readFileSync(new URL('./retirementBoundary.fixture.json',import.meta.url),'utf8')) as {epochs:{movingStep:number;front:number;locked:{stationX:number};packetRows:PacketRow[];selectedNativeRows:NativeRow[]}[]};
function packet(xs:number[],ages=xs.map(()=>times.touchdownSeconds),front=1, heights=xs.map(()=>foot),depths=xs.map(()=>7)){
 const r=new Float32Array(xs.length*FRONT_STRIDE);xs.forEach((x,k)=>r.set([x,40,front,k?x-xs[0]:0,ages[k],heights[k],depths[k],35,4],k*FRONT_STRIDE));return r;
}
function measured(rows:PacketRow[]){const r=new Float32Array(rows.length*FRONT_STRIDE);rows.forEach((p,k)=>r.set([p.x,p.z,p.front,p.sigma,p.tau,p.footHeight,p.footDepth,p.throwZ??NaN,p.pace??NaN],k*FRONT_STRIDE));return r;}
const xAt=(l:{positions:Float32Array},s:number)=>l.positions[3*(s*LOFT_SAMPLES+LOFT.extensionSamples+LANDMARK.crest)];
const roster=(l:{sliceCount:number;positions:Float32Array})=>Array.from({length:l.sliceCount},(_,s)=>xAt(l,s));
const build=(r:Float32Array,heightAt:(x:number,z:number)=>number=()=>0,options={})=>new SweptLoft(library,c.slope,{sheet:false,...options}).build(r,r.length/FRONT_STRIDE,0,heightAt);
function rowAt(l:LoftResult,x:number){const row=roster(l).indexOf(x);expect(row,`required original X${x}`).toBeGreaterThanOrEqual(0);return row;}
function flatSupport(l:LoftResult,s:number,heightAt:(x:number,z:number)=>number){
 expect(l.sliceFade[s]).toBe(0);expect(l.sliceWeight[s]).toBe(0);expect(l.sliceFormed[s]).toBe(0);
 for(let j=0;j<LOFT_SAMPLES;j++){const v=s*LOFT_SAMPLES+j;expect(l.positions[3*v+1]).toBe(Math.fround(heightAt(l.positions[3*v],l.positions[3*v+2])));expect(l.lift[v]).toBe(0);expect(l.mask[v]).toBe(0);expect(l.sheetWeight[v]).toBe(0);expect(l.throat[4*v+3]).toBe(0);}
}
function honestTopology(l:LoftResult){expect(l.vertexCount).toBeLessThanOrEqual(LOFT.budget);expect(l.rayInvalidIntervals).toBe(0);expect(l.positions.subarray(0,3*l.vertexCount).every(Number.isFinite)).toBe(true);for(let s=0;s+1<l.sliceCount;s++)if(l.sliceJoined[s]){expect(xAt(l,s+1)).toBeGreaterThan(xAt(l,s));expect(l.sliceFade[s]>0||l.sliceFade[s+1]>0,'no intrinsically dead-to-dead strip').toBe(true);}}
function nextWord(value:number,direction:1|-1){const f=new Float32Array([value]),u=new Uint32Array(f.buffer);u[0]+=direction;return f[0];}
function normalizedNormal(l:LoftResult,s:number,j:number,back:{positions:Float32Array;row:number},ahead:number){
 const p=l.positions,a0=3*(s*LOFT_SAMPLES+Math.max(0,j-1)),a1=3*(s*LOFT_SAMPLES+Math.min(LOFT_SAMPLES-1,j+1)),b0=3*(back.row*LOFT_SAMPLES+j),b1=3*(ahead*LOFT_SAMPLES+j);
 const ax=p[a1]-p[a0],ay=p[a1+1]-p[a0+1],az=p[a1+2]-p[a0+2],bx=p[b1]-back.positions[b0],by=p[b1+1]-back.positions[b0+1],bz=p[b1+2]-back.positions[b0+2];
 const n=[ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx],length=Math.hypot(...n);return length>1e-12?n.map(v=>Math.fround(v/length)):[0,1,0];
}
describe('sampled C intrinsic retirement closure on ordinary water',()=>{
 it('keeps the original X16.25 bracket on intrinsic phase2 fade without changing captured packet words',()=>{
  const results=[];
  for(const epoch of fixture.epochs){const r=measured(epoch.packetRows),before=r.slice(),l=build(r);expect(r).toEqual(before);expect(epoch.locked.stationX).toBe(16.25);
   const rows=[16,16.5].map(x=>{const s=rowAt(l,x),native=epoch.selectedNativeRows.find(q=>q.crest[0]===x)!;expect(l.sliceJoined[s]).toBe(1);expect(l.slicePhase[s]).toBe(2);expect(l.sliceOverturned[s]).toBe(1);expect(l.sliceFade[s]).toBe(native.sliceFade);expect(l.sliceTau[s]).toBe(native.sliceTau);expect(l.sliceWeight[s]).toBe(native.sliceFade);expect(l.sliceWeight[s]).toBeGreaterThan(native.sliceWeight);return{x,tau:l.sliceTau[s],intrinsicWeight:l.sliceWeight[s],capturedSealWeight:native.sliceWeight,crestY:l.positions[3*(s*LOFT_SAMPLES+LOFT.extensionSamples+LANDMARK.crest)+1]};});
   const first=Array.from(l.sliceJoined.subarray(0,l.sliceCount)).findIndex(Boolean);flatSupport(l,first,()=>0);expect(l.sliceFade[first+1]).toBeGreaterThan(0);honestTopology(l);results.push({movingStep:epoch.movingStep,firstSupportX:xAt(l,first),nextLiveX:xAt(l,first+1),rows,fixedX16_25Weight:(rows[0].intrinsicWeight+rows[1].intrinsicWeight)/2,diagnostics:l.cSampling});
  }
  expect(results[1].rows[0].intrinsicWeight-results[0].rows[0].intrinsicWeight).toBe(-0.05141317844390869);expect(results[1].rows[1].intrinsicWeight-results[0].rows[1].intrinsicWeight).toBe(-0.05139702558517456);

 });
 it('keeps a dying raw knot at its original F32 X and preserves the next live row and one-sided normal',()=>{
  let above=Math.fround(retired);if(above<retired)above=nextWord(above,1);const below=nextWord(above,-1);expect(below).toBeLessThan(retired);expect(above).toBeGreaterThanOrEqual(retired);
  const x=[0,4,8,10,10.5,11,16,20],ages=[retired+.2,retired+.2,retired+.2,below,retired-.05,retired-.1,retired-.1,retired-.1],r=packet(x,ages),q=r.slice();q[3*FRONT_STRIDE+FRONT_FIELD.tau]=above;
  const old=build(r),now=build(q),oldRow=rowAt(old,10),nowRow=rowAt(now,10),nextOld=rowAt(old,10.5),nextNow=rowAt(now,10.5);expect(old.sliceFade[oldRow]).toBeGreaterThan(0);expect(old.mask[oldRow*LOFT_SAMPLES+LOFT.extensionSamples+LANDMARK.crest]).toBe(old.sliceFade[oldRow]);flatSupport(now,nowRow,()=>0);expect(now.sliceJoined[nowRow]).toBe(1);expect(now.sliceWeight[nextNow]).toBe(old.sliceWeight[nextOld]);expect(now.sliceWeight[nextNow]).toBe(now.sliceFade[nextNow]);
  expect(xAt(old,oldRow-1)).toBeLessThan(10);expect(nowRow).toBe(0);const ahead=nowRow+1,j=LOFT.extensionSamples+LANDMARK.crest;
  const centralCounterfactual=normalizedNormal(now,nowRow,j,{positions:old.positions,row:oldRow-1},ahead),oneSided=normalizedNormal(now,nowRow,j,{positions:now.positions,row:nowRow},ahead),normal=Array.from(now.normals.subarray(3*(nowRow*LOFT_SAMPLES+j),3*(nowRow*LOFT_SAMPLES+j)+3));expect(normal).toEqual(oneSided);const stencilResidual=oneSided.map((v,i)=>v-centralCounterfactual[i]);expect(stencilResidual.some(v=>v!==0)).toBe(true);
  honestTopology(old);honestTopology(now);
 });
 it('keeps only immediate supports at left/right retirements, one dead shared node or wider dead islands, and drops the last fully retired component',()=>{
  const x=Array.from({length:21},(_,k)=>k),near=retired-.02,dead=retired+.005;
  const patterns=[x.map(v=>v<5?dead:near),x.map(v=>v>15?dead:near),x.map(v=>v===10?dead:near),x.map(v=>v>=8&&v<=12?dead:near),x.map(()=>dead)];
  patterns.forEach((ages,k)=>{const l=build(packet(x,ages));honestTopology(l);const supports=roster(l).flatMap((x,s)=>l.sliceFade[s]===0?[{x,row:s}]:[]);for(const {row}of supports)flatSupport(l,row,()=>0);if(k===4){expect(l.sliceCount).toBe(0);expect(l.indexCount).toBe(0);expect(l.cSampling!.retirement.plannedSupports).toBe(0);}else{expect(l.cSampling!.retirement.retainedSupports).toBeGreaterThan(0);expect(l.cSampling!.retirement.retainedSupports).toBeLessThanOrEqual(2);}
   if(k===2){const s=rowAt(l,10);expect(l.sliceJoined[s-1]).toBe(1);expect(l.sliceJoined[s]).toBe(1);}if(k===3)expect(roster(l)).not.toContain(10);return{pattern:k,supports,roster:roster(l),diagnostics:l.cSampling};});
 });
 it('retains the original physical end and overlap seals while retirement masks use the existing intrinsic fade',()=>{
  const x=Array.from({length:21},(_,k)=>k),ages=x.map(()=>times.touchdownSeconds+times.collapseSeconds/2),r=packet(x,ages),l=build(r);honestTopology(l);
  const firstRaw=rowAt(l,0),nearEnd=rowAt(l,1),middle=rowAt(l,10);expect(l.sliceWeight[firstRaw]).toBe(0);expect(l.sliceWeight[nearEnd]).toBeLessThan(l.sliceFade[nearEnd]);expect(l.sliceWeight[middle]).toBe(l.sliceFade[middle]);expect(l.mask[middle*LOFT_SAMPLES+LOFT.extensionSamples+LANDMARK.crest]).toBe(l.sliceFade[middle]);expect(l.mask[nearEnd*LOFT_SAMPLES+LOFT.extensionSamples+LANDMARK.crest]).toBe(l.sliceFade[nearEnd]);
  const b=packet(x.map(v=>v+10),ages,2),both=new Float32Array(r.length+b.length);both.set(r);both.set(b,r.length);const overlap=build(both);expect(overlap.overlaps).toBeGreaterThan(0);const start=Array.from(overlap.sliceJoined.subarray(0,overlap.sliceCount)).findIndex((v,s)=>v===1&&overlap.sliceFront[s]===2);expect(start).toBeGreaterThan(0);expect(overlap.sliceFade[start]).toBeGreaterThan(0);expect(overlap.sliceWeight[start]).toBe(0);expect(overlap.sliceWeight[start+1]).toBeGreaterThan(0);for(let j=0;j<LOFT_SAMPLES;j++)expect(overlap.mask[start*LOFT_SAMPLES+j]).toBe(0);

 });
 it('counts closure rows against the same mandatory-knot cap and seals a truncated prefix if its closing support cannot fit',()=>{
  const x=Array.from({length:401},(_,k)=>.03+.1*k),ages=x.map((_,k)=>k<400?times.touchdownSeconds:retired+.01),r=packet(x,ages),l=build(r),xx=roster(l);honestTopology(l);expect(l.cSampling!.budgetTruncated).toBe(true);expect(l.cSampling!.retirement.budgetOmittedSupports).toBeGreaterThan(0);expect(l.cSampling!.firstOmittedPlannedX).toBeGreaterThan(xx.at(-1)!);
  for(let k=0;k<x.length;k++)if(r[FRONT_STRIDE*k]<=xx.at(-1)!)expect(xx).toContain(r[FRONT_STRIDE*k]);const last=l.sliceCount-1;expect(l.sliceFade[last]).toBeGreaterThan(0);expect(l.sliceWeight[last]).toBe(0);expect(l.sliceJoined[last]).toBe(0);for(let j=0;j<LOFT_SAMPLES;j++)expect(l.positions[3*(last*LOFT_SAMPLES+j)+1]).toBe(0);
 });
 it('keeps variable scales, near-coincident mandatory knots and phase1/phase2 neighbors finite, with drawing/eager/lazy exact active recipes and normals',()=>{
  const x=[0,4,8,10,Math.fround(10+2**-20),10.5,11,16,20],heights=x.map((_,k)=>foot*(.9+.01*k)),depths=x.map((_,k)=>6+.1*k),ages=x.map((_,k)=>{const t=library.profileTimes({slope:c.slope,footHeight:heights[k],footDepth:depths[k]});return k<3?t.touchdownSeconds+t.collapseSeconds+.02:k===3?t.touchdownSeconds+t.collapseSeconds+.001:k===4?t.touchdownSeconds-.01:t.touchdownSeconds+.1*t.collapseSeconds;});const r=packet(x,ages,1,heights,depths),water=(x:number,z:number)=>.03*x+.02*z;
  const drawing=build(r,water,{holdClearDrawing:true}),eager=build(r,water,{contact:true}),query=SweptLoft.forContactQueries(library,c.slope),lazy=query.build(r,r.length/FRONT_STRIDE,0,water);expect(roster(drawing)).toEqual(roster(eager));expect(roster(lazy)).toEqual(roster(eager));
  for(const key of ['sliceSigma','sliceTau','sliceJoined','sliceWeight','sliceFade','slicePhase']as const){expect(drawing[key].subarray(0,drawing.sliceCount)).toEqual(eager[key].subarray(0,eager.sliceCount));expect(lazy[key].subarray(0,lazy.sliceCount)).toEqual(eager[key].subarray(0,eager.sliceCount));}
  for(let s=0;s<lazy.sliceCount;s++)query.prepareRow(s);for(let s=0;s<lazy.sliceCount;s++)if(lazy.sliceJoined[s]||s>0&&lazy.sliceJoined[s-1])for(let j=0;j<LOFT_SAMPLES;j++)query.prepareNormal(s*LOFT_SAMPLES+j);
  expect(lazy.positions.subarray(0,3*lazy.vertexCount)).toEqual(eager.positions.subarray(0,3*eager.vertexCount));expect(lazy.normals.subarray(0,3*lazy.vertexCount)).toEqual(eager.normals.subarray(0,3*eager.vertexCount));expect(lazy.indices.subarray(0,lazy.indexCount)).toEqual(eager.indices.subarray(0,eager.indexCount));expect(drawing.positions.subarray(0,3*drawing.vertexCount)).toEqual(eager.positions.subarray(0,3*eager.vertexCount));honestTopology(drawing);honestTopology(eager);expect(eager.slicePhase.subarray(0,eager.sliceCount).includes(1)).toBe(true);expect(eager.slicePhase.subarray(0,eager.sliceCount).includes(2)).toBe(true);
 });
 it('keeps RAW result keys, active eager/lazy geometry and packet words stable',()=>{
  const raw=new ProfileLibrary(cases),fixtures=[packet([0,4,8,10,16,20],[.3,.4,.5,4,.7,.8]),packet(Array.from({length:401},(_,k)=>.03+.1*k))];
  for(const r of fixtures){
   const original=r.slice(),drawing=new SweptLoft(raw,c.slope,{sheet:false}).build(r,r.length/FRONT_STRIDE,.5,()=>.5);
   const eager=new SweptLoft(raw,c.slope,{contact:true}).build(r,r.length/FRONT_STRIDE,.5,()=>.5);
   const query=SweptLoft.forContactQueries(raw,c.slope),lazy=query.build(r,r.length/FRONT_STRIDE,.5,()=>.5);
   expect(r).toEqual(original);expect(Object.keys(drawing)).not.toContain('cSampling');expect(Object.keys(eager)).not.toContain('cSampling');
   expect(Object.keys(lazy)).toEqual(Object.keys(eager));expect(lazy.sliceCount).toBe(eager.sliceCount);expect(drawing.sliceCount).toBe(eager.sliceCount);
   for(const key of ['sliceSigma','sliceTau','sliceJoined','sliceWeight','sliceFade','slicePhase']as const){
    expect(lazy[key].subarray(0,lazy.sliceCount)).toEqual(eager[key].subarray(0,eager.sliceCount));
    expect(drawing[key].subarray(0,drawing.sliceCount)).toEqual(eager[key].subarray(0,eager.sliceCount));
   }
   for(let s=0;s<lazy.sliceCount;s++)query.prepareRow(s);
   for(let s=0;s<lazy.sliceCount;s++)if(lazy.sliceJoined[s]||s>0&&lazy.sliceJoined[s-1])for(let j=0;j<LOFT_SAMPLES;j++)query.prepareNormal(s*LOFT_SAMPLES+j);
   expect(lazy.positions.subarray(0,3*lazy.vertexCount)).toEqual(eager.positions.subarray(0,3*eager.vertexCount));
   expect(lazy.normals.subarray(0,3*lazy.vertexCount)).toEqual(eager.normals.subarray(0,3*eager.vertexCount));
   expect(lazy.indices.subarray(0,lazy.indexCount)).toEqual(eager.indices.subarray(0,eager.indexCount));
   for(const loft of [drawing,eager]){expect(loft.vertexCount).toBeLessThanOrEqual(LOFT.budget);expect(loft.rayInvalidIntervals).toBe(0);expect(loft.positions.subarray(0,3*loft.vertexCount).every(Number.isFinite)).toBe(true);}
  }
 });
});
