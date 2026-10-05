/** SOURCE-ONLY proposal. Root must review, bundle and execute; this file has not run. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ProfileLibrary as OriginalLibrary, LANDMARK, PROFILE_POINTS } from './baseline/src/wave/barrel/ProfileLibrary';
import { ProfileLibrary as ObservedLibrary } from './candidate/src/wave/barrel/ProfileLibrary';
import { decodeCase } from './baseline/src/wave/barrel/profileFormat';
import { FRONT_FIELD, FRONT_STRIDE } from './front-format';

const W='/private/tmp/tube-cap-reach-hold-analysis-proposal-20261005';
const INPUT=W+'/input-pins.json', OUTPUT=W+'/reach-decomposition.json';
type Pin={file:string;bytes:number;sha256:string};
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
function pinned(pin:Pin):Buffer{const b=readFileSync(pin.file);assert.equal(b.length,pin.bytes,pin.file);assert.equal(sha(b),pin.sha256,pin.file);return b;}
function finite(value:unknown,path='report'):void{
  if(typeof value==='number')assert(Number.isFinite(value),'Nonfinite '+path);
  else if(Array.isArray(value))value.forEach((v,k)=>finite(v,path+'['+k+']'));
  else if(value!==null&&typeof value==='object')Object.entries(value).forEach(([k,v])=>finite(v,path+'.'+k));
}
const inputs=JSON.parse(readFileSync(INPUT,'utf8'));
const report:Record<string,any>={schema:'bounded-cap-reach-hold-decomposition/v1',complete:false,firstFailure:null,
  scope:'Fixed generic fixture; literal provider trace and equal-span finite differences only. No native/body/globalC1 inference.',
  executionAuthority:'Executing tool/agent must be attributed by a separate root receipt.',inputs:[],limits:inputs.limits,rows:[],secants:null,hold:null};
assert(!existsSync(OUTPUT),'First-only analysis output');

const wordBuffer=new ArrayBuffer(4),wordView=new DataView(wordBuffer);
function word(value:number):number{assert(Number.isFinite(value));wordView.setFloat32(0,value,true);return wordView.getUint32(0,true);}
function ordered(value:number):number{const bits=word(value);return bits&0x80000000?0x80000000-(bits&0x7fffffff):0x80000000+bits;}
function wordComparison(a:number[],b:number[]){
  assert.equal(a.length,b.length);return a.map((v,k)=>({a:v,b:b[k],aWord:word(v),bWord:word(b[k]),
    wordExact:word(v)===word(b[k]),absoluteError:Math.abs(v-b[k]),ulpDistance:Math.abs(ordered(v)-ordered(b[k]))}));
}
const profileBytes=(v:Float32Array)=>new Uint8Array(v.buffer,v.byteOffset,v.byteLength);
const scaleTerms=(v:Record<string,number>,scale:number)=>Object.fromEntries(Object.entries(v).map(([k,x])=>[k,x*scale]));
const sum=(v:Record<string,number>)=>Object.values(v).reduce((s,x)=>s+x,0);
const differences=(a:Record<string,number>,b:Record<string,number>,span:number)=>Object.fromEntries(
  Object.keys(a).map(k=>[k,{left:a[k],right:b[k],difference:b[k]-a[k],secant:(b[k]-a[k])/span}]));
const ulp64=(x:number)=>{assert(x>0&&Number.isFinite(x));const b=new ArrayBuffer(8),d=new DataView(b);d.setFloat64(0,x,true);
  d.setBigUint64(0,d.getBigUint64(0,true)+1n,true);return d.getFloat64(0,true)-x;};

try{
  const readiness=JSON.parse(readFileSync(W+'/readiness.json','utf8'));
  for(const p of readiness.files)pinned(p);
  for(const m of inputs.copiedExactProviderModules)pinned(m.original);
  for(const p of inputs.evidence)pinned(p);
  pinned(inputs.barrelIndex);
  report.inputs=[{file:INPUT,bytes:readFileSync(INPUT).length,sha256:sha(readFileSync(INPUT))},...inputs.evidence,
    ...inputs.copiedExactProviderModules.map((m:any)=>m.original),inputs.barrelIndex,...inputs.assets];
  const saved=JSON.parse(readFileSync(W+'/evidence/fixture-decomposition.json','utf8'));
  assert.equal(saved.schema,'root-angular-fixture-decomposition/v1');assert.equal(saved.productionChanged,false);
  const records=new Float32Array(saved.rawFrontPacket);assert.deepEqual(Array.from(records),saved.rawFrontPacket);
  assert.equal(records.length,9*FRONT_STRIDE);assert(records.every(Number.isFinite));
  const cases=inputs.assets.map((p:Pin)=>decodeCase(new Uint8Array(pinned(p))));
  assert.equal(cases.length,8);
  const original=new OriginalLibrary(cases,{geometry:'bounded-C'}),observed=new ObservedLibrary(cases,{geometry:'bounded-C'});
  const slope=saved.query.slope,level=0.5,start=4.75,end=5.25,h=1/64;
  assert.equal(inputs.limits.gridStart,start);assert.equal(inputs.limits.gridEnd,end);
  assert.equal(inputs.limits.gridStep,h);assert.equal(inputs.limits.gridCount,33);
  // This fixed fixture has one constant scale/control pair. Do not silently make a nonlinear hold inverse.
  for(let k=1;k<9;k++)for(const field of ['front','footHeight','footDepth'] as const)
    assert.equal(records[k*FRONT_STRIDE+FRONT_FIELD[field]],records[FRONT_FIELD[field]],'Constant actual packet '+field);
  const sample=(x:number)=>{
    assert(x>=start&&x<=end,'No domain expansion');
    let k=0;while(k+1<8&&records[(k+1)*FRONT_STRIDE+FRONT_FIELD.x]<x)k++;
    const a=k*FRONT_STRIDE,b=(k+1)*FRONT_STRIDE,share=(x-records[a])/(records[b]-records[a]);
    assert(share>=0&&share<=1,'Declared interval only');
    const field=(offset:number)=>records[a+offset]+share*(records[b+offset]-records[a+offset]);
    return {x,z:field(FRONT_FIELD.z),sigma:field(FRONT_FIELD.sigma),tau:field(FRONT_FIELD.tau),
      footHeight:field(FRONT_FIELD.footHeight),footDepth:field(FRONT_FIELD.footDepth),packetLeft:k,share};
  };
  const first=sample(start),last=sample(end);assert.equal(first.packetLeft,last.packetLeft,'One affine packet segment');
  const initialQuery={slope,footHeight:first.footHeight,footDepth:first.footDepth,seconds:first.tau,hold:'drawing' as const};
  const initial=observed.inspectCapReach(initialQuery),holdSeconds=initial.bracket.authoredHoldSeconds;
  const a=first.packetLeft*FRONT_STRIDE,b=a+FRONT_STRIDE;
  const holdX=records[a]+(holdSeconds-records[a+FRONT_FIELD.tau])/(records[b+FRONT_FIELD.tau]-records[a+FRONT_FIELD.tau])*(records[b]-records[a]);
  assert(holdX>=start&&holdX<=end,'Exact hold must already lie in fixed range');
  const holdPacket=sample(holdX),inverseResidual=holdPacket.tau-holdSeconds;
  assert(Math.abs(inverseResidual)<=8*ulp64(holdSeconds),'Hold inversion exceeds declared 8 binary64 ULPs');
  report.fixture={rawFrontPacket:saved.rawFrontPacket,recordedOriginalQuery:saved.query,recordedOriginalTimes:saved.times,
    actualInterpolatedControls:{slope,footHeight:first.footHeight,footDepth:first.footDepth},flatWaterLevel:level};
  report.hold={x:holdX,storedXIfMeshed:Math.fround(holdX),authoredHoldTau:initial.bracket.authoredHoldTau,
    unit:initial.bracket.unit,authoredHoldSeconds:holdSeconds,packetSegment:[first.packetLeft,first.packetLeft+1],
    inversePacketAge:holdPacket.tau,inverseResidualSeconds:inverseResidual,inverseResidualULPs:inverseResidual/ulp64(holdSeconds),
    queryConvention:'Exact published authoredHoldTau*unit clock used for the hold-only sample; inversion residual is explicit. No simulation clock assignment.',
    equalSpanConvention:'Grid intervals of identical 1/64m span immediately before/after hold. Not invented centred hold±h provider samples.'};

  function inspect(x:number,exactHold=false){
    const raw=sample(x),query={slope,footHeight:raw.footHeight,footDepth:raw.footDepth,seconds:exactHold?holdSeconds:raw.tau,hold:'drawing' as const};
    const op=new Float32Array(2*PROFILE_POINTS),cp=new Float32Array(2*PROFILE_POINTS);
    const originalLookup=original.profileAt(query,op),candidateLookup=observed.profileAt(query,cp);
    assert.deepEqual(profileBytes(cp),profileBytes(op),'Instrumented complete profile changed');
    const cap=new Float64Array(2),crest=new Float64Array(2),toe=new Float64Array(2);
    original.pointAt(query,LANDMARK.lip,cap);original.pointAt(query,LANDMARK.crest,crest);original.pointAt(query,LANDMARK.toe,toe);
    const observation=observed.inspectCapReach(query),t=observation.trace,o=t.ordinary;
    assert(o&&t.normal&&t.last&&t.unroundedCap&&t.capWords&&t.phi!==null&&t.phi!==undefined);
    assert.equal(t.formation,1,'Only mature branch; no fallback');assert.equal(t.post,false,'Pre-impact fixed domain only');
    assert.equal(t.collapsed,false,'Resolved branch only');assert.equal(t.thickness,o.B,'Actual mature thickness');
    const staged=observation.metricCapWords,capCheck=wordComparison(staged,Array.from(cap));
    const capFullCheck=wordComparison(Array.from(cap),Array.from(op.subarray(2*LANDMARK.lip,2*LANDMARK.lip+2)));
    const crestFullCheck=wordComparison(Array.from(crest),Array.from(op.subarray(2*LANDMARK.crest,2*LANDMARK.crest+2)));
    assert(capCheck.every(v=>v.wordExact)&&capFullCheck.every(v=>v.wordExact)&&crestFullCheck.every(v=>v.wordExact),'Literal reconstruction/public point/full words differ');
    assert.equal(originalLookup.touchdownSeconds,candidateLookup.touchdownSeconds);
    assert.equal(originalLookup.clearSeconds,candidateLookup.clearSeconds);
    const scale=observation.bracket.scale,T=t.thickness!,n=t.normal,lastDirection=t.last,phi=t.phi;
    // Terms explain the actual unrounded result; the original cap arithmetic above remains the authority.
    const zND:Record<string,number>={carrierWidth:.98*o.W,thicknessRetreat:-2*o.B,boundedCorrection:o.leafWidthDelta,
      normalXOffset:-T/2*n[0],actualArcXTerm:T/2*(n[0]*Math.cos(phi)+lastDirection[0]*Math.sin(phi))};
    zND.endpointAssemblyRemainder=t.unroundedCap[0]-o.A[0]-sum(zND);
    const yND:Record<string,number>={toeY:o.Toe[1],openHeight:.60*o.H,fallingHeight:-.80*o.H*t.seal!,
      normalYOffset:-T/2*n[1],actualArcYTerm:T/2*(n[1]*Math.cos(phi)+lastDirection[1]*Math.sin(phi))};
    yND.endpointAssemblyRemainder=t.unroundedCap[1]-sum(yND);
    const unroundedWorld=[x,level+t.unroundedCap[1]*scale,raw.z-o.A[0]*scale+t.unroundedCap[0]*scale];
    const ordinaryWorldUnstored=[x,level+cap[1],raw.z-crest[0]+cap[0]],world=ordinaryWorldUnstored.map(Math.fround);
    const termsZ:Record<string,number>={rawCrestZ:raw.z,...scaleTerms(zND,scale),
      crestMetricStage:o.A[0]*scale-crest[0],capNDWordStage:(t.capWords[0]-t.unroundedCap[0])*scale,
      capMetricWordStage:cap[0]-t.capWords[0]*scale,worldF32Stage:world[2]-ordinaryWorldUnstored[2]};
    const termsY:Record<string,number>={waterLevel:level,...scaleTerms(yND,scale),
      capNDWordStage:(t.capWords[1]-t.unroundedCap[1])*scale,capMetricWordStage:cap[1]-t.capWords[1]*scale,
      worldF32Stage:world[1]-ordinaryWorldUnstored[1]};
    termsZ.finalAssemblyRemainder=world[2]-sum(termsZ);termsY.finalAssemblyRemainder=world[1]-sum(termsY);
    const scalars={rawWidthND:o.W,rawHeightND:o.H,B_ND:o.B,reachBudgetND:Math.min(o.B,(.98-.85)*o.W-2*o.B),
      meanRequestedDeltaBeforeHoldND:observation.carrier.meanRequestedDeltaBeforeHold,
      requestedDeltaAfterHoldND:observation.carrier.exactBlendedRequestedDelta,boundedCorrectionND:o.leafWidthDelta,
      normalX:n[0],normalXOffsetND:-T/2*n[0],holdTaper:observation.carrier.holdTaper,
      rawWidthMetric:o.W*scale,rawHeightMetric:o.H*scale,B_Metric:o.B*scale,
      meanRequestedDeltaBeforeHoldMetric:observation.carrier.meanRequestedDeltaBeforeHold*scale,
      requestedDeltaAfterHoldMetric:observation.carrier.exactBlendedRequestedDelta*scale,boundedCorrectionMetric:o.leafWidthDelta*scale,
      normalXOffsetMetric:-T/2*n[0]*scale};
    const row={x,kind:exactHold?'exact-published-hold':'fixed-grid',rawSample:raw,query,
      bracket:observation.bracket,carrier:observation.carrier,clocks:observation.clocks,scalars,
      trace:observation.trace,preservedNDWords:observation.preservedNDWords,
      reconstructed:{ndCapWords:t.capWords,metricCapWords:staged,unroundedWorldCap:unroundedWorld,ordinaryUnstoredWorldCap:ordinaryWorldUnstored,
        storedWorldCap:world},ordinaryProvider:{metricCapWords:Array.from(cap),metricCrestWords:Array.from(crest),metricToeWords:Array.from(toe),
        profileSHA256:sha(profileBytes(op)),lookup:{phase:originalLookup.phase,clearSeconds:originalLookup.clearSeconds,
          impactSeconds:originalLookup.touchdownSeconds,collapseSeconds:originalLookup.collapseSeconds}},
      verification:{completeInstrumentedProfileWordsExact:true,capCheck,capFullCheck,crestFullCheck},
      terms:{zND,yND,zMetric:scaleTerms(zND,scale),yMetric:scaleTerms(yND,scale),storedWorldZ:termsZ,storedWorldY:termsY}};
    finite(row);return row;
  }
  const grid=Array.from({length:33},(_,k)=>inspect(start+k*h));report.rows.push(...grid);
  const holdRow=inspect(holdX,true);report.rows.push(holdRow);assert.equal(report.rows.length,34);
  function interval(left:typeof holdRow,right:typeof holdRow){
    const span=right.x-left.x;assert.equal(span,h,'Equal declared span');
    return {x:[left.x,right.x],span,scalars:differences(left.scalars,right.scalars,span),
      worldY:differences(left.terms.storedWorldY,right.terms.storedWorldY,span),
      worldZ:differences(left.terms.storedWorldZ,right.terms.storedWorldZ,span),
      observedStoredCapSecant:left.reconstructed.storedWorldCap.map((v:number,axis:number)=>(right.reconstructed.storedWorldCap[axis]-v)/span)};
  }
  function pair(left:ReturnType<typeof interval>,right:ReturnType<typeof interval>){
    assert.equal(left.span,right.span);return {left,right,
      storedCapSecantDifference:right.observedStoredCapSecant.map((v:number,k:number)=>v-left.observedStoredCapSecant[k]),
      scalarSecantDifferences:Object.fromEntries(Object.keys(left.scalars).map(k=>[k,right.scalars[k].secant-left.scalars[k].secant])),
      worldZSecantDifferences:Object.fromEntries(Object.keys(left.worldZ).map(k=>[k,right.worldZ[k].secant-left.worldZ[k].secant])),
      worldYSecantDifferences:Object.fromEntries(Object.keys(left.worldY).map(k=>[k,right.worldY[k].secant-left.worldY[k].secant]))};
  }
  const centre=16;assert.equal(grid[centre].x,5);
  const lower=Math.floor((holdX-start)/h),upper=Math.ceil((holdX-start)/h);
  assert(lower>=1&&upper+1<grid.length,'Hold equal-span bracket inside fixed grid');
  report.secants={span:h,x5:pair(interval(grid[centre-1],grid[centre]),interval(grid[centre],grid[centre+1])),
    authoredHold:pair(interval(grid[lower-1],grid[lower]),interval(grid[upper],grid[upper+1])),
    authoredHoldGridBracket:[grid[lower].x,grid[upper].x],exactHold:holdRow.x,
    interpretation:'Equal-span finite differences at one fixed resolution. Hold-side intervals bracket, rather than invent, centred hold±h samples. No derivative discontinuity proof.'};
  report.complete=true;
}catch(error){report.firstFailure=error instanceof Error?error.name+': '+error.message:String(error);report.complete=false;}
finite(report);const bytes=Buffer.from(JSON.stringify(report,null,2)+'\n');assert(bytes.length<=inputs.limits.reportBytes,'Finite JSON report cap');
writeFileSync(OUTPUT,bytes);console.log(JSON.stringify({complete:report.complete,firstFailure:report.firstFailure,rows:report.rows.length,
  output:{file:OUTPUT,bytes:bytes.length,sha256:sha(bytes)},noNativeOrDerivativeKinkClaim:true}));
if(!report.complete)process.exitCode=1;
