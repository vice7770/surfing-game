import { afterAll, describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { LANDMARK, ProfileLibrary } from './ProfileLibrary';
import { CrestRayPlan } from './crestRays';
import { LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from './sweptLoft';
import { SweptLoft as ParentLoft } from '/private/tmp/tube-bounded-c-carrier-support-20261004/source/src/wave/barrel/sweptLoft';
import { ProfileLibrary as ParentLibrary } from '/private/tmp/tube-bounded-c-carrier-support-20261004/source/src/wave/barrel/ProfileLibrary';
const cases=readBarrelCases().map(decodeCase), c=cases.find(c=>c.id==='pad19-a30-l12')!;
const lib=new ProfileLibrary(cases,{geometry:'bounded-C'}), metrics:Record<string,unknown>={};
afterAll(()=>{ if (process.env.SAMPLING_METRICS) writeFileSync(process.env.SAMPLING_METRICS,JSON.stringify(metrics,null,2)+'\n'); });
function packet(xs:number[],taus=xs.map(()=>.4),zs=xs.map(()=>40),front=1,sigma0=0){
 const r=new Float32Array(xs.length*FRONT_STRIDE);let sigma=sigma0;
 xs.forEach((x,k)=>{if(k)sigma+=Math.hypot(x-xs[k-1],zs[k]-zs[k-1]);r.set([x,zs[k],front,sigma,taus[k],c.nonlinearity*7,7,35,4],k*FRONT_STRIDE);});return r;
}
const xAt=(l:LoftResult,row:number)=>l.positions[3*(row*LOFT_SAMPLES+LOFT.extensionSamples+LANDMARK.crest)];
const xs=(l:LoftResult)=>Array.from({length:l.sliceCount},(_,k)=>xAt(l,k));
const build=(r:Float32Array,options={})=>new SweptLoft(lib,c.slope,{sheet:false,...options}).build(r,r.length/FRONT_STRIDE,0,()=>0);
function checkColumns(l:LoftResult){expect(l.rayInvalidIntervals).toBe(0);expect(l.rayMinAdvance).toBeGreaterThan(0);for(let k=0;k+1<l.sliceCount;k++)if(l.sliceJoined[k]){expect(xAt(l,k+1)).toBeGreaterThan(xAt(l,k));expect(l.sliceSigma[k+1]).toBeGreaterThan(l.sliceSigma[k]);expect(l.sliceRayX[k]).toBe(0);expect(l.sliceRayZ[k]).toBe(1);}}
function checkSealedLast(l:LoftResult){expect(l.sliceJoined[l.sliceCount-1]).toBe(0);expect(l.sliceWeight[l.sliceCount-1]).toBe(0);for(let j=0;j<LOFT_SAMPLES;j++)expect(l.positions[3*((l.sliceCount-1)*LOFT_SAMPLES+j)+1]).toBe(0);}
describe('C fixed stored-X sampling with mandatory raw parameter knots',()=>{
 it('keeps off-lattice parameter knots exactly and the original arc shoulders on an oblique front',()=>{
  const x=[.1,2.75,4.125,8.2],r=packet(x,[.2,.65,.25,.4],x.map(v=>.6*v+40));const l=build(r),roster=xs(l);
  for(let i=0;i<x.length;i++){const row=roster.indexOf(r[i*FRONT_STRIDE]);expect(row).toBeGreaterThanOrEqual(0);expect(l.sliceTau[row]).toBe(r[i*FRONT_STRIDE+FRONT_FIELD.tau]);expect(l.sliceSigma[row]).toBe(r[i*FRONT_STRIDE+FRONT_FIELD.sigma]);}
  const dx=r[9]-r[0],dz=r[10]-r[1],length=Math.hypot(dx,dz);expect(roster[0]).toBe(Math.fround(r[0]-1.5*dx/length));expect(l.positions[3*(LOFT.extensionSamples+LANDMARK.crest)+2]).toBe(Math.fround(r[1]-1.5*dz/length));
  checkColumns(l);metrics.oblique={rawX:x,roster,diagnostics:l.cSampling};
 });
 it('keeps a raw knot one F32X word from the regular lattice, proves the actual positive stored advance and deduplicates exact collisions',()=>{
  const near=Math.fround(1+2**-23),r=packet([.1,near,2.4,6.2]),l=build(r),roster=xs(l);expect(roster).toContain(1);expect(roster).toContain(near);checkColumns(l);expect(l.cSampling!.minimumStoredDeltaX).toBe(near-1);
  const equal=build(packet([.1,1,2.4,6.2]));expect(xs(equal).filter(x=>x===1)).toHaveLength(1);checkColumns(equal);metrics.nearColumns={near,minimumActualDeltaX:l.cSampling!.minimumStoredDeltaX,diagnostics:l.cSampling};
 });
 it('explicitly omits regular sigma-word collisions while preserving every distinct mandatory raw knot',()=>{
  const near=Math.fround(1+2**-23),r=packet([.1,near,2.4,6.2],undefined,undefined,1,10000),l=build(r),roster=xs(l);expect(roster).toContain(near);expect(roster).not.toContain(1);for(let k=0;k<4;k++)expect(roster).toContain(r[k*9]);expect(l.cSampling!.omittedPrecisionStations).toBeGreaterThan(0);checkColumns(l);metrics.sigmaCollision=l.cSampling;
 });
 it('refines in X at the exact rounded midpoint and interpolates its clock directly in X',()=>{
  const r=packet([.1,4.1,8.1],[.1,.9,.9]),l=build(r),roster=xs(l),mid=Math.fround((r[0]+.5)/2),row=roster.indexOf(mid);
  expect(row).toBeGreaterThanOrEqual(0);const share=(mid-r[0])/(r[9]-r[0]);expect(l.sliceTau[row]).toBe(Math.fround(r[4]+share*(r[13]-r[4])));checkColumns(l);metrics.midpoint={x:mid,tau:l.sliceTau[row],directXFraction:share};
 });
 it('reports shoulders collapsed by F32 precision while preserving distinct raw columns and their stored proof',()=>{
  const r=packet([100_000_000,100_000_008]),l=build(r),roster=xs(l);expect(roster).toEqual([r[0],r[9]]);expect(l.cSampling!.collapsedShoulders).toBe(2);expect(l.cSampling!.minimumStoredDeltaX).toBe(8);expect(l.cSampling!.omittedPrecisionStations).toBeGreaterThan(0);checkColumns(l);metrics.collapsedShoulders={roster,diagnostics:l.cSampling};
 });
 it('rejects unsupported C packet and scratch domains before a degenerate strip is produced',()=>{
  for(const modify of [(r:Float32Array)=>r[9]=r[0],(r:Float32Array)=>r[9]=-1,(r:Float32Array)=>r[12]=r[3],(r:Float32Array)=>r[0]=NaN,(r:Float32Array)=>r[4]=Infinity,(r:Float32Array)=>r[5]=0,(r:Float32Array)=>r[8]=Infinity]){const r=packet([0,2,4,8]);modify(r);expect(()=>build(r)).toThrow(RangeError);}
  expect(()=>build(packet([0,1_000_000]))).toThrow('lattice/survey domain');
  const raw=new ProfileLibrary(cases),plan=new CrestRayPlan(raw,c.slope);expect(()=>plan.prepareStoredColumns(packet([0,1]),0,2,new Float64Array([0,1]),new Float64Array([0,1]),2)).toThrow('C-only');
 });
 it('surveys a long mostly-dead front completely and preserves its live-end mandatory knots without reviving dead C samples',()=>{
  const x=Array.from({length:601},(_,i)=>i+.03),r=packet(x,x.map((_,i)=>i<560?10:.3)),l=build(r),roster=xs(l);expect(l.vertexCount).toBeLessThanOrEqual(LOFT.budget);expect(roster.at(-1)).toBe(Math.fround(r[600*9]+1.5));for(let i=560;i<=600;i++)expect(roster).toContain(r[i*9]);expect(roster.every(x=>x>559)).toBe(true);checkColumns(l);metrics.longMostlyDead={slices:l.sliceCount,minimumX:roster[0],maximumX:roster.at(-1),diagnostics:l.cSampling};
 });
 it('uses a sealed retained prefix when mandatory live knots alone overrun the hard cap, never skipping an interior raw knot',()=>{
  const x=Array.from({length:401},(_,i)=>.03+i*.1),r=packet(x),l=build(r),roster=xs(l),last=roster.at(-1)!;expect(l.vertexCount).toBeLessThanOrEqual(LOFT.budget);expect(l.cSampling!.budgetTruncated).toBe(true);expect(l.cSampling!.firstOmittedPlannedX).toBeGreaterThan(last);
  for(let k=0;k<x.length;k++)if(r[9*k]<=last)expect(roster).toContain(r[9*k]);checkColumns(l);checkSealedLast(l);metrics.mandatoryOverflow={slices:l.sliceCount,lastX:last,rawKnotsRetained:roster.filter(x=>Array.from(r).some((v,k)=>k%9===0&&v===x)).length,diagnostics:l.cSampling};
 });
 it('retains the global multi-front budget decision and explicitly reports omitted later fronts',()=>{
  const n=221,a=packet(Array.from({length:n},(_,i)=>i*.1)),b=packet(Array.from({length:n},(_,i)=>30+i*.1),undefined,undefined,2),d=packet(Array.from({length:n},(_,i)=>60+i*.1),undefined,undefined,3),r=new Float32Array(a.length+b.length+d.length);r.set(a);r.set(b,a.length);r.set(d,a.length+b.length);const l=build(r);expect(l.vertexCount).toBeLessThanOrEqual(LOFT.budget);expect(l.cSampling!.budgetTruncated).toBe(true);expect(l.cSampling!.omittedFronts).toBeGreaterThan(0);checkSealedLast(l);checkColumns(l);metrics.multiFront=l.cSampling;
 });
 it('shares the same C drawing/contact/normal-demand station and metadata plan; lazy materialization reproduces ordinary contact words',()=>{
  const r=packet([.1,2.75,4.125,8.2,12.125],[.2,.5,.35,.4,.3]),height=(x:number,z:number)=>.03*x+.02*z;
  const drawing=new SweptLoft(lib,c.slope,{sheet:false,holdClearDrawing:true}).build(r,5,0,height),contact=new SweptLoft(lib,c.slope,{contact:true}).build(r,5,0,height),query=SweptLoft.forContactQueries(lib,c.slope),lazy=query.build(r,5,0,height);
  expect(xs(drawing)).toEqual(xs(contact));expect(xs(lazy)).toEqual(xs(contact));for(const key of ['sliceSigma','sliceTau','sliceJoined','sliceWeight','slicePhase','sliceRayX','sliceRayZ'] as const){expect(drawing[key]).toEqual(contact[key]);expect(lazy[key]).toEqual(contact[key]);}
  for(let row=0;row<lazy.sliceCount;row++)query.prepareRow(row);for(let v=0;v<lazy.vertexCount;v++)query.prepareNormal(v);
  expect(lazy.positions).toEqual(contact.positions);expect(lazy.indices).toEqual(contact.indices);expect(lazy.normals).toEqual(contact.normals);checkColumns(drawing);checkColumns(contact);metrics.sharedPlan={slices:lazy.sliceCount,positionsAndNormalsExact:true,diagnostics:lazy.cSampling};
 });
 it('preserves complete RAW words, metadata and control input against the frozen parent, including budgeted/dead/kink fixtures',()=>{
  const parentLib=new ParentLibrary(cases),rawLib=new ProfileLibrary(cases);const rs=[packet([.1,2.75,4.125,8.2],[.2,.65,.25,.4],[40,40,42,40]),packet(Array.from({length:401},(_,i)=>i+.5),Array.from({length:401},(_,i)=>i%2?.5:.1)),packet(Array.from({length:401},(_,i)=>i+.5),Array.from({length:401},(_,i)=>i<360?10:.3))];
  for(const r of rs)for(const contact of [false,true]){const before=r.slice(),next=new SweptLoft(rawLib,c.slope,{contact}).build(r,r.length/9,.5,()=>.5),old=new ParentLoft(parentLib,c.slope,{contact}).build(r,r.length/9,.5,()=>.5);expect(next).toEqual(old);expect(r).toEqual(before);expect(Object.keys(next)).not.toContain('cSampling');}
  metrics.rawParity={fixtures:3,modes:2,allResultWordsAndMetadataExact:true,controlsUnchanged:true};
 });
});
