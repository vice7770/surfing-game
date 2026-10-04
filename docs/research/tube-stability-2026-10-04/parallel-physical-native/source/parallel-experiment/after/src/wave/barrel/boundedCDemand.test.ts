import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import * as provider from './boundedCProfile';
import { pairInnerSheet } from './sharedUpperRoot';
import { pairInnerSheet as originalPair } from '/private/tmp/tube-bounded-c-shared-seam-20261004/source/src/wave/barrel/sharedUpperRoot';
import { ProfileLibrary, type BarrelCase } from './ProfileLibrary';
import { decodeCase } from './profileFormat';
import { readBarrelCases } from './nodeBarrelCases';
import { GRAVITY } from '../dispersion';
import * as originalProvider from '/private/tmp/tube-bounded-c-shared-seam-20261004/source/src/wave/barrel/boundedCProfile';
import { ProfileLibrary as OriginalLibrary } from '/private/tmp/tube-bounded-c-shared-seam-20261004/source/src/wave/barrel/ProfileLibrary';

type P = provider.BoundedCParameters;
type Z = { A:number[]; T:number[]; ct:number[]; tt:number[]; TD:number; tau:number };
const W='/private/tmp/tube-bounded-c-parallel-rays-20261004';
const frozen='/private/tmp/tube-bounded-c-precision-v4-fixed-20261004';
const cases=readBarrelCases().map(decodeCase);
const report=JSON.parse(readFileSync(W+'/validation-domain.json','utf8')) as {
 actual:{params:Z;rawPolyline:{point:number;q:number;y:number}[];afterPolyline:{point:number;q:number;y:number}[]}[];
 phaseGrid:{case:string;params:Z}[];crossCaseGridAll:{cases:string[];share:number;params:Z}[];
};
const refs=JSON.parse(readFileSync('/private/tmp/tube-monotone-inner-profile-20261004/eligible-cases.json','utf8')) as {cases:{id:string;held:{tau:number}}[]};
const precision=JSON.parse(readFileSync(frozen+'/port-reference.json','utf8')) as {rawBlocks:Record<string,number[]>;precision522:{block:string;params:P}[]};
const asParams=(z:Z):P=>({crest:z.A as provider.Vec2,toe:z.T as provider.Vec2,incoming:z.ct as provider.Vec2,outgoing:z.tt as provider.Vec2,authoredTD:z.TD,tau:z.tau});
const frame=(c:BarrelCase,f:number)=>c.frames.slice(256*f,256*(f+1));
const blend=(a:Float32Array,b:Float32Array,w:number)=>Float32Array.from(a,(v,i)=>v+w*(b[i]-v));
const held=new Map<string,Float32Array>();
for(let i=0;i<cases.length;i++) {const c=cases[i],ref=refs.cases.find(r=>r.id===c.id)!;held.set(c.id,frame(c,Math.round((ref.held.tau-c.tauStart)/c.tauStep)));}
function equalArray(a:Float32Array,b:Float32Array,label:string){for(let i=0;i<a.length;i++)if(!Object.is(a[i],b[i]))throw Error(`${label}: F32 ${i}: ${a[i]} != ${b[i]}`);}

describe('exact lifecycle and demand cap evaluation',()=>{
 it('matches original contour, cap and clocks on all6447 frozen queries without changing shape coefficients',()=>{
  const counts={captured:0,frames:0,adjacent:0,phase:0,crossCase:0,precision:0};
  function check(raw:Float32Array,z:P,label:string,preservedCarrierStart=0){
   const before=raw.slice(),a=raw.slice(),b=raw.slice(),old=originalProvider.sampleBoundedC(z,a,false,undefined,true,preservedCarrierStart),now=provider.sampleBoundedC(z,b,false,undefined,true,preservedCarrierStart);
   old.sharedSheet=originalPair(a,old);now.sharedSheet=pairInnerSheet(b,now);
   equalArray(a,b,label);expect(now).toEqual(old);
   const clock=provider.boundedCLifecycle(z);expect(clock.impactEvent).toEqual(old.impactEvent);expect(clock.impactTau).toBe(old.impactTau);expect(clock.retiredTau).toBe(old.retiredTau);expect(clock.fullyFormedTau).toBe(old.fullyFormedTau);
   expect(provider.boundedCCap(z,clock.impactEvent),label).toEqual([a[128],a[129]]);
   const dt=1e-5*z.authoredTD;for(const tau of [z.tau-dt,z.tau+dt]){const exact=raw.slice();const meta=originalProvider.sampleBoundedC({...z,tau},exact,false,clock.impactEvent,true,preservedCarrierStart);originalPair(exact,meta);expect(provider.boundedCCap({...z,tau},clock.impactEvent),label+' stencil').toEqual([exact[128],exact[129]]);}
   equalArray(raw,before,'input readonly');
  }
  for(const [k,r] of report.actual.entries()){
   // Captures only observe32..112. Duplicate endpoint padding is not observed outside geometry; omit unavailable upstream guards (start32) in BOTH compared fullsheet providers. Compare the real cap separately.
   const raw=new Float32Array(256);for(let i=0;i<128;i++){const end=i<32?r.params.A:r.params.T;raw[2*i]=end[0];raw[2*i+1]=end[1];}for(const p of r.rawPolyline){raw[2*p.point]=p.q;raw[2*p.point+1]=p.y;}
   check(raw,asParams(r.params),`capture${k}`,32);const cap=r.afterPolyline.find(p=>p.point===64)!;
   expect(provider.boundedCCap(asParams(r.params))).toEqual([Math.fround(cap.q),Math.fround(cap.y)]);counts.captured++;
  }
  for(const c of cases){const n=c.frames.length/256;for(let f=0;f<n;f++){const a=frame(c,f),za=provider.boundedCParameters(a,c.touchdown,c.tauStart+f*c.tauStep);check(a,za,c.id+'/'+f);counts.frames++;if(f+1<n){const b=frame(c,f+1),zb=provider.boundedCParameters(b,c.touchdown,c.tauStart+(f+1)*c.tauStep);for(const w of [.25,.5,.75]){check(blend(a,b,w),provider.blendBoundedCParameters(za,zb,w),c.id+'/'+f+'@'+w);counts.adjacent++;}}}}
  for(const r of report.phaseGrid){check(held.get(r.case)!,asParams(r.params),'phase '+r.case);counts.phase++;}
  for(const r of report.crossCaseGridAll){check(blend(held.get(r.cases[0])!,held.get(r.cases[1])!,r.share),asParams(r.params),'case blend '+r.cases.join('/'));counts.crossCase++;}
  for(const r of precision.precision522){check(new Float32Array(precision.rawBlocks[r.block]),r.params,'precision '+r.block);counts.precision++;}
  expect(counts).toEqual({captured:5,frames:1224,adjacent:3648,phase:376,crossCase:672,precision:522});
  writeFileSync(W+'/provider-equivalence.json',JSON.stringify({complete:true,counts,total:Object.values(counts).reduce((a,b)=>a+b,0),fullContourExact:true,capExact:true,clocksExact:true,capStencilQueries:12894,capStencilsExact:true,baseline:'frozen FULLSHEET source',capturedPadding:'Only32..112 observed; duplicated crest/toe padding is not evidence of bulk/outside. Both providers omit unavailable upstream guards. Full shipped/provider inputs retain all128 points. Real cap separately matches frozen Python.'},null,2)+'\n');
 },60000);
 it('matches moving-carrier F32 contour, velocity and clock queries through every asset age plus frozen precision queries',()=>{
  const old=new OriginalLibrary(cases,{geometry:'bounded-C'}),now=new ProfileLibrary(cases,{geometry:'bounded-C'}),a=new Float32Array(256),b=new Float32Array(256);let queries=0;
  for(const c of cases){const q={slope:c.slope,footHeight:c.nonlinearity*7,footDepth:7},unit=Math.sqrt(7/GRAVITY),times=old.profileTimes(q);expect(now.profileTimes(q)).toEqual(times);
   const ages=Array.from({length:c.frames.length/256},(_,f)=>(c.tauStart+f*c.tauStep)*unit);
   for(let f=0;f+1<c.frames.length/256;f++)for(const t of [.25,.5,.75])ages.push((c.tauStart+(f+t)*c.tauStep)*unit);
   ages.push(0,.4*c.touchdown*unit,c.touchdown*unit,times.touchdownSeconds,times.touchdownSeconds+times.collapseSeconds);
   for(const seconds of ages){const query={...q,seconds,hold:'drawing' as const},lo=old.profileAt(query,a),ln=now.profileAt(query,b);equalArray(a,b,c.id);expect(ln).toEqual(lo);queries++;}
  }
  // Exact retained factory failure queries, including held and final retirement stencils.
  for(const q of [{slope:.0526316,footHeight:1.4000000000000001,footDepth:7,seconds:.8498481232858845},{slope:.0526316,footHeight:Math.fround(1.4),footDepth:7,seconds:.8498481438477785}]){const lo=old.profileAt(q,a),ln=now.profileAt(q,b);equalArray(a,b,'retirement');expect(ln).toEqual(lo);expect(now.profileTimes(q)).toEqual(old.profileTimes(q));queries++;}
  for(const c of cases){const q={slope:c.slope,footHeight:c.nonlinearity*7,footDepth:7},times=old.profileTimes(q);for(const t of [0,.1,.4,1]){const seconds=times.touchdownSeconds+t*times.collapseSeconds,query={...q,seconds},point=new Float64Array(2),other=new Float64Array(2);for(const i of [32,64,88,112]){old.pointAt(query,i,point);now.pointAt(query,i,other);expect(other).toEqual(point);}const target={lower:c,upper:c,weight:0,scale:1,lowerFrame:0,lowerNext:0,lowerShare:0,upperFrame:0,upperNext:0,upperShare:0};expect(now.frameBlend(query,{...target})).toEqual(old.frameBlend(query,{...target}));}}
  writeFileSync(W+'/library-equivalence.json',JSON.stringify({complete:true,queries,contourExact:true,fullLookupIncludingVelocityExact:true,clocksExact:true,pointAndSheetMetadataExact:true},null,2)+'\n');
 },60000);
 it('preserves actual adjacent-case blends and all precision-query library clocks/cap transport',()=>{
  const old=new OriginalLibrary(cases,{geometry:'bounded-C'}),now=new ProfileLibrary(cases,{geometry:'bounded-C'}),a=new Float32Array(256),b=new Float32Array(256);let blended=0,precisionQueries=0;
  function check(q:{slope:number;footHeight:number;footDepth:number;seconds:number}){const lo=old.profileAt(q,a),ln=now.profileAt(q,b);equalArray(a,b,'additional library query');expect(ln).toEqual(lo);expect(now.profileTimes(q)).toEqual(old.profileTimes(q));}
  const groups=new Map<number,BarrelCase[]>();for(const c of cases){const g=groups.get(c.slope)??[];g.push(c);groups.set(c.slope,g);}
  for(const group of groups.values()){group.sort((a,b)=>a.nonlinearity-b.nonlinearity);for(let i=0;i+1<group.length;i++)for(const w of [.25,.5,.75]){
   const q={slope:group[i].slope,footHeight:7*(group[i].nonlinearity+w*(group[i+1].nonlinearity-group[i].nonlinearity)),footDepth:7},TD=group[i].touchdown+w*(group[i+1].touchdown-group[i].touchdown),times=old.profileTimes(q),unit=Math.sqrt(times.scale/GRAVITY);
   for(const age of [0,.1,.25,.4,.8,1,1.15,1.5]){check({...q,seconds:age*TD*unit});blended++;}
   for(const seconds of [times.touchdownSeconds-1e-6*unit,times.touchdownSeconds,times.touchdownSeconds+1e-6*unit,times.touchdownSeconds+times.collapseSeconds]){check({...q,seconds});blended++;}
  }}
  for(const r of precision.precision522){let q:{slope:number;footHeight:number;footDepth:number};if(r.block.startsWith('exact-factory-'))q={slope:.0526316,footHeight:Number(r.block.slice('exact-factory-'.length)),footDepth:7};else {const c=cases.find(c=>c.id===r.block)!;q={slope:c.slope,footHeight:7*c.nonlinearity,footDepth:7};}const unit=Math.sqrt(old.profileTimes(q).scale/GRAVITY);check({...q,seconds:r.params.tau*unit});precisionQueries++;}
  expect(blended).toBe(180);expect(precisionQueries).toBe(522);
  writeFileSync(W+'/library-blend-precision-equivalence.json',JSON.stringify({complete:true,blended,precisionQueries,fullLookupAndF32ContourExact:true,clockExact:true},null,2)+'\n');
 },60000);
 it('removes full contour work from scalar clocks and both cap derivative stencils, with bounded CPU evidence',()=>{
  const full=vi.spyOn(provider,'sampleBoundedC'),caps=vi.spyOn(provider,'boundedCCap'),clocks=vi.spyOn(provider,'boundedCLifecycle'),oldFull=vi.spyOn(originalProvider,'sampleBoundedC');
  const rows=Array.from({length:32},(_,i)=>({slope:cases[0].slope,footHeight:1.45+.6*i/31,footDepth:7}));const results:unknown[]=[];
  try{for(const scenario of ['cold-clock','warm-clock','cold-profile','warm-clock-profile']){
   const old=new OriginalLibrary(cases,{geometry:'bounded-C'}),now=new ProfileLibrary(cases,{geometry:'bounded-C'}),a=new Float32Array(256),b=new Float32Array(256);
   if(scenario.startsWith('warm'))for(const q of rows){old.profileTimes(q);now.profileTimes(q);}
   full.mockClear();caps.mockClear();clocks.mockClear();oldFull.mockClear();
   const startOld=performance.now();for(const q of rows)if(scenario.endsWith('clock'))old.profileTimes(q);else old.profileAt({...q,seconds:.4},a);const oldMs=performance.now()-startOld;
   const startNow=performance.now();for(const q of rows)if(scenario.endsWith('clock'))now.profileTimes(q);else now.profileAt({...q,seconds:.4},b);const nowMs=performance.now()-startNow;
   const count={oldFullContours:oldFull.mock.calls.length,newFullContours:full.mock.calls.length,newCapOnlyStencils:caps.mock.calls.length,newLifecycleQueries:clocks.mock.calls.length};
   if(scenario.endsWith('clock')){expect(count.newFullContours).toBe(0);expect(count.newCapOnlyStencils).toBe(0);}else {expect(count.newFullContours).toBe(32);expect(count.newCapOnlyStencils).toBe(64);expect(count.oldFullContours).toBe(scenario==='cold-profile'?128:96);}
   results.push({scenario,rows:32,counts:count,oldMilliseconds:oldMs,newMilliseconds:nowMs,timingClaim:'One bounded CPU batch, not native/browserFPS; no timing threshold'});
  }}finally{vi.restoreAllMocks();}
  writeFileSync(W+'/cpu-cost-evidence.json',JSON.stringify({complete:true,results,geometryApproximation:false,cacheRewrite:false},null,2)+'\n');
 });
});
