import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { boundedCParameters, blendBoundedCParameters, sampleBoundedC, type BoundedCParameters } from './boundedCProfile';
import { decodeCase } from './profileFormat';
import { readBarrelCases } from './nodeBarrelCases';
import { libraryFromBytes } from './barrelLibrary';
import { ProfileLibrary } from './ProfileLibrary';
import { GRAVITY } from '../dispersion';
import { toyCase } from './toyCase';

/** Same proper-crossing convention as frozen Python: no endpoint/collinear intersections. */
function crossings(p:Float32Array):Set<string>{
 const result=new Set<string>();
 for(let i=0;i<127;i++)for(let j=i+2;j<127;j++){
  const ax=p[2*i],ay=p[2*i+1],dx=p[2*i+2]-ax,dy=p[2*i+3]-ay,bx=p[2*j],by=p[2*j+1],ex=p[2*j+2]-bx,ey=p[2*j+3]-by;
  const den=dx*ey-dy*ex;if(Math.abs(den)<1e-12)continue;const t=((bx-ax)*ey-(by-ay)*ex)/den,u=((bx-ax)*dy-(by-ay)*dx)/den;
  if(t>1e-9&&t<1-1e-9&&u>1e-9&&u<1-1e-9)result.add(`${i}/${j}`);
 }return result;
}
const cases=readBarrelCases().map(decodeCase);
const frame=(c:typeof cases[number],f:number)=>c.frames.slice(256*f,256*(f+1));
const blend=(a:Float32Array,b:Float32Array,t:number)=>Float32Array.from(a,(v,i)=>v+t*(b[i]-v));

describe('frozen bounded C provider port',()=>{
 it('matches39 frozen Python reference profiles, including tiny formation caps',()=>{
  const refs=JSON.parse(readFileSync('../port-reference.json','utf8')) as {raw:number[];expected:number[];params:BoundedCParameters;impactTau:number;thickness:number}[];
  for(const r of refs){const out=new Float32Array(r.raw),m=sampleBoundedC(r.params,out,false);expect(Math.max(...out.map((v,i)=>Math.abs(v-r.expected[i])))).toBeLessThan(2e-7);expect(m.impactTau).toBeCloseTo(r.impactTau,9);expect(m.thickness).toBeCloseTo(r.thickness,10);}
 });
 it('retains global finite/no-new-crossing invariants on1224frames and3648F32 parameter interpolations',()=>{
  let frames=0,adjacent=0;
  function check(raw:Float32Array,z:BoundedCParameters){const original=crossings(raw),out=raw.slice();sampleBoundedC(z,out,false);expect(out.every(Number.isFinite)).toBe(true);for(let i=0;i<128;i++)if(i<=32||i>=112){expect(out[2*i]).toBe(raw[2*i]);expect(out[2*i+1]).toBe(raw[2*i+1]);}for(const key of crossings(out))expect(original.has(key)).toBe(true);}
  for(const c of cases){const count=c.frames.length/256;for(let f=0;f<count;f++){const a=frame(c,f),za=boundedCParameters(a,c.touchdown,c.tauStart+f*c.tauStep);check(a,za);frames++;if(f+1<count){const b=frame(c,f+1),zb=boundedCParameters(b,c.touchdown,c.tauStart+(f+1)*c.tauStep);for(const w of [.25,.5,.75]){check(blend(a,b,w),blendBoundedCParameters(za,zb,w));adjacent++;}}}}
  expect(frames).toBe(1224);expect(adjacent).toBe(3648);
 },30000);
 it('shares one F32 cap-floor contact datum and reaches exact zero-loop limits',()=>{
  for(const c of cases){const raw=frame(c,c.frames.length/256-2),z=boundedCParameters(raw,c.touchdown,c.touchdown),first=sampleBoundedC(z,raw.slice(),false);
   for(const tau of [first.impactTau,first.impactTau+.05*c.touchdown,first.retiredTau]){const out=raw.slice(),m=sampleBoundedC({...z,tau},out,false);if(m.sheetExists){expect(out[129]).toBe(z.toe[1]);expect(out[209]).toBe(out[129]);}else{expect(m.thickness).toBe(0);for(let i=61;i<=106;i++){expect(out[2*i]).toBe(out[120]);expect(out[2*i+1]).toBe(out[121]);}}}
   const a=raw.slice(),b=raw.slice();sampleBoundedC({...z,tau:0},a,false);sampleBoundedC({...z,tau:1e-13},b,false);expect(Array.from(a)).toEqual(Array.from(b));
  }
 });
});

describe('parameter-first shared library authority',()=>{
 const library=libraryFromBytes(readBarrelCases());
 it('opts shipped factory cases in, preserves raw bytes and direct fixture semantics',()=>{
  expect(library.options.geometry).toBe('bounded-C');expect(new ProfileLibrary(cases).options.geometry).toBeUndefined();
  const raw=readBarrelCases();const snapshots=raw.map(b=>b.slice());libraryFromBytes(raw);raw.forEach((b,i)=>expect(b).toEqual(snapshots[i]));
  expect(()=>new ProfileLibrary([toyCase(.3,0)],{geometry:'bounded-C'}).profileAt({slope:.05,footHeight:2.1,footDepth:7,seconds:0},new Float32Array(256))).toThrow(/domain/);
 });
 it('pointAt, drawing, contact and table metadata all share final metric contour and actual clocks',()=>{
  for(const c of cases){const q={slope:c.slope,footHeight:c.nonlinearity*7,footDepth:7},unit=Math.sqrt(7/GRAVITY),times=library.profileTimes(q),out=new Float32Array(256),point=new Float64Array(2);
   expect(times.touchdownSeconds).toBeGreaterThan(c.touchdown*unit);expect(times.collapseSeconds).toBeCloseTo(.3*c.touchdown*unit,9);
   for(const seconds of [0,.4*c.touchdown*unit,c.touchdown*unit,times.touchdownSeconds,times.touchdownSeconds+times.collapseSeconds]){
    const lookup=library.profileAt({...q,seconds,hold:'drawing'},out),contact=new Float32Array(256);library.profileAt({...q,seconds,hold:'contact'},contact);expect(contact).toEqual(out);expect(lookup.touchdownSeconds).toBe(times.touchdownSeconds);expect(lookup.collapseSeconds).toBe(times.collapseSeconds);
    for(const i of [32,64,88,112]){library.pointAt({...q,seconds},i,point);expect(point[0]).toBe(out[2*i]);expect(point[1]).toBe(out[2*i+1]);}
    const into={lower:c,upper:c,weight:0,scale:1,lowerFrame:0,lowerNext:0,lowerShare:0,upperFrame:0,upperNext:0,upperShare:0};const tables=library.frameBlend({...q,seconds,hold:'contact'},into);expect(tables.analyticProfile).toEqual(out);expect(tables.analytic?.model).toBe('bounded-analytic-C/v1');
   }
  }
 });
 it('retains the known v1 full-contour precision-budget failure without hiding it behind raw fallback',()=>{
  const point=new Float64Array(2),out=new Float32Array(256);
  for(const query of [{slope:.0526316,footHeight:1.4000000000000001,footDepth:7,seconds:.8498481232858845},{slope:.0526316,footHeight:Math.fround(1.4),footDepth:7,seconds:.8498481438477785}]){
   expect(()=>library.profileAt(query,out)).toThrow(/precision collapse spatial budget/);
   expect(()=>library.pointAt(query,32,point)).not.toThrow();expect(point.every(Number.isFinite)).toBe(true);
  }
 });
 it('preserved-anchor queries use exact carrier without constructing retirement loops',()=>{
  const c=cases[0],q={slope:c.slope,footHeight:Math.fround(1.4),footDepth:7},times=library.profileTimes(q),point=new Float64Array(2),raw=new ProfileLibrary(cases),carrier=new Float32Array(256),unit=Math.sqrt((q.footHeight/c.nonlinearity)/GRAVITY);
  for(const seconds of [.7247345447540283,.7487345402771224,times.touchdownSeconds+times.collapseSeconds-1e-4]){
   raw.profileAt({...q,seconds:c.touchdown*unit},carrier);
   for(const i of [0,31,32,112,113,127]){library.pointAt({...q,seconds},i,point);expect(point[0]).toBe(carrier[2*i]);expect(point[1]).toBe(carrier[2*i+1]);}
  }
 });
 it('uses query boundary motion separately from advective water and remains continuous across authored/actual events',()=>{
  const c=cases[1],q={slope:c.slope,footHeight:c.nonlinearity*7,footDepth:7},times=library.profileTimes(q),unit=Math.sqrt(7/GRAVITY),a=new Float32Array(256),b=new Float32Array(256);
  for(const seconds of [c.touchdown*unit,times.touchdownSeconds,times.touchdownSeconds+times.collapseSeconds]){library.profileAt({...q,seconds:seconds-1e-6},a);library.profileAt({...q,seconds:seconds+1e-6},b);expect(Math.max(...a.map((v,i)=>Math.abs(v-b[i])))).toBeLessThan(.001);}
  const settled=library.profileAt({...q,seconds:times.touchdownSeconds+.05},a);expect(settled.tipUp).toBe(0);expect(settled.analytic!.fluidUp).toBeLessThan(0);
 });
 it('actual factory queries remain clean across adjacent case weights and declared lifecycle ages',()=>{
  const slopes=[...new Set(cases.map(c=>c.slope))];let count=0;
  for(const slope of slopes){const group=cases.filter(c=>c.slope===slope).sort((a,b)=>a.nonlinearity-b.nonlinearity);
   for(let i=0;i+1<group.length;i++)for(const weight of [.25,.5,.75]){
    const a=group[i],b=group[i+1],q={slope,footHeight:(a.nonlinearity+weight*(b.nonlinearity-a.nonlinearity))*7,footDepth:7},raw=new ProfileLibrary(cases),unit=Math.sqrt(7/GRAVITY),TD=a.touchdown+weight*(b.touchdown-a.touchdown),times=library.profileTimes(q);
    const ages=[0,.1,.25,.4,.8,1,1.15,1.5];
    for(const age of ages){const seconds=age*TD*unit,before=new Float32Array(256),after=new Float32Array(256);raw.profileAt({...q,seconds:Math.min(seconds,TD*unit)},before);const lookup=library.profileAt({...q,seconds},after);expect(after.every(Number.isFinite)).toBe(true);if(crossings(before).size===0)expect(crossings(after).size).toBe(0);expect(lookup.touchdownSeconds).toBe(times.touchdownSeconds);count++;}
   }
  }expect(count).toBe(120);
 });
 it('provider bounds enclose actual profiles through formation, impact and retirement including case blends',()=>{
  for(const c of cases){const bound=library.crestReachBounds(c.slope),q={slope:c.slope,footHeight:c.nonlinearity*7,footDepth:7},times=library.profileTimes(q),out=new Float32Array(256);
   for(const age of [-.1,0,.1,.4,.8,1,1.15,1.5,1.9]){const lookup=library.profileAt({...q,seconds:age*c.touchdown*Math.sqrt(7/GRAVITY)},out);for(let i=0;i<128;i++){const x=(out[2*i]-out[64])/lookup.scale;expect(x).toBeGreaterThanOrEqual(bound[0]-1e-6);expect(x).toBeLessThanOrEqual(bound[1]+1e-6);}expect(times.collapseSeconds).toBeGreaterThan(0);}
  }
 });
});
