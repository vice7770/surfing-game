import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CLEAR, LANDMARK, PROFILE_POINTS, heldFrame, type BarrelCase } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/barrel/ProfileLibrary';
import { decodeCase } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/barrel/profileFormat';
import { overturnAt } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/barrel/heldOverturn';
import { sheetAcross, THROAT } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/barrel/lipSheet';
import { GRAVITY } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/dispersion';

const WORK='/private/tmp/tube-hold-area-20261004';
const OWNER='/private/tmp/tube-lip-attribution-20261004/native-first-owner.json';
const receipt=JSON.parse(readFileSync(OWNER,'utf8'));
const EXPECTED_DIST='/private/tmp/tube-deep-rider-native-20261004/dist';
assert.equal(receipt.dist,EXPECTED_DIST);
assert(!existsSync(join(WORK,'report.json')),'Finite offline report may run only once in this scratch directory');
const files=['pad19-a20-l12','pad19-a30-l12','pad19-a45-l12','periodic-padang19s-l12'];
const FLOATS=2*PROFILE_POINTS,referenceScale=7;
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');

// Exact source-equivalent eligibility and max-gap arithmetic from ProfileLibrary.ts.
// Exported heldFrame below independently checks the last passing selection and max gap.
function surfaceBeneath(frames:Float32Array,f:number,x:number,y:number):number {
 const o=f*FLOATS;let best=Number.NaN;
 for(let i=LANDMARK.throat;i<LANDMARK.front;i++){
  const x0=frames[o+2*i],x1=frames[o+2*i+2];
  if(x0===x1||(x0-x)*(x1-x)>0)continue;
  const y0=frames[o+2*i+1];
  const under=y0+((x-x0)/(x1-x0))*(frames[o+2*i+3]-y0);
  if(under<y&&!(under<=best))best=under;
 }return best;
}
function maxGap(c:BarrelCase,f:number):number {
 const o=f*FLOATS;let height=0;
 for(let i=LANDMARK.lip;i<=LANDMARK.throat;i++){
  const y=c.frames[o+2*i+1];
  const gap=y-surfaceBeneath(c.frames,f,c.frames[o+2*i],y);
  if(gap>height)height=gap;
 }return height;
}
function metric(c:BarrelCase,f:number){
 const o=f*FLOATS,tipX=c.frames[o+2*LANDMARK.lip],tipY=c.frames[o+2*LANDMARK.lip+1];
 const reach=tipX-c.frames[o+2*LANDMARK.throat];
 const clearance=tipY-surfaceBeneath(c.frames,f,tipX,tipY);
 return{frame:f,tau:c.tauStart+f*c.tauStep,eligible:reach>=CLEAR.gap&&clearance>=CLEAR.gap,
  voidArea:overturnAt(c.frames,f).voidArea,maxGap:maxGap(c,f),
  lipFloorClearance:Number.isFinite(clearance)?clearance:null,lipThroatReach:reach};
}
function detail(c:BarrelCase,m:ReturnType<typeof metric>){
 const profile=c.frames.slice(m.frame*FLOATS,(m.frame+1)*FLOATS);
 const across=new Float32Array(PROFILE_POINTS),back=new Float32Array(PROFILE_POINTS);
 const formed=sheetAcross(profile,1,across,back);let mean=0,min=Infinity,max=0;
 for(let i=THROAT.thicknessFrom;i<=THROAT.thicknessTo;i++){
  mean+=across[i];min=Math.min(min,across[i]);max=Math.max(max,across[i]);
 }mean/=THROAT.thicknessTo-THROAT.thicknessFrom+1;
 const overturn=overturnAt(c.frames,m.frame);
 return{...m,...overturn,roofThickness:{measurement:'actual sheetAcross nearest opposite lip-run distance, points40..60',
  units:'h0',formed,mean,min,max,values40Through60:Array.from(across.subarray(40,61))},
  profile:Array.from(profile)};
}
const cases=files.map((id,index)=>{
 const asset=`barrels/${id}.bin`,bytes=new Uint8Array(readFileSync(join(EXPECTED_DIST,asset)));
 assert.equal(bytes.byteLength,receipt.served[asset].bytes,'Actual fetched asset size');
 assert.equal(sha(bytes),receipt.served[asset].sha256,'Actual fetched asset hash');
 const c=decodeCase(bytes);assert.equal(c.id,id);assert(c.frames.every(Number.isFinite));
 const count=c.frames.length/FLOATS;assert(Number.isInteger(count));
 const last=Math.min(count-1,Math.floor((c.touchdown-c.tauStart)/c.tauStep+1e-6)-1);
 const eligible=[];for(let f=0;f<=last;f++){const m=metric(c,f);if(m.eligible)eligible.push(m);}
 assert(eligible.length>0,'Shipped case has clear eligible frames');
 const current=eligible.at(-1)!;const authoritative=heldFrame(c);
 assert.equal(authoritative.clear,true);assert.equal(current.tau,authoritative.tau);
 assert.equal(current.maxGap,authoritative.voidHeight,'Exact copied arithmetic vs exported baseline');
 let best=current,highest=current;
 for(const m of eligible){
  if(m.voidArea>best.voidArea||(m.voidArea===best.voidArea&&m.frame>best.frame))best=m;
  if(m.maxGap>highest.maxGap||(m.maxGap===highest.maxGap&&m.frame>highest.frame))highest=m;
 }
 const original=detail(c,current),maximum=detail(c,best),highestDetail=detail(c,highest),unit=Math.sqrt(referenceScale/GRAVITY);
 return{id,scope:index<3?'requested-three-pad19-cases':'additional-periodic-asset-present-in-runtime-owner-receipt',
  asset:{file:join(EXPECTED_DIST,asset),bytes:bytes.length,sha256:sha(bytes)},
  source:{nonlinearity:c.nonlinearity,tauStart:c.tauStart,tauStep:c.tauStep,touchdown:c.touchdown,
   frameCount:count,lastEligibleSearchFrame:last,clearThreshold:CLEAR.gap,eligibleCount:eligible.length},
  current:original,maxVoidArea:maximum,maxVoidHeight:highestDetail,
  change:{framesEarlier:current.frame-best.frame,tauEarlier:current.tau-best.tau,
   areaFactor:best.voidArea/current.voidArea,maxGapFactor:best.maxGap/current.maxGap,
   roofThicknessMeanFactor:maximum.roofThickness.mean/original.roofThickness.mean,
   naiveCollapseDurationFactor:Math.sqrt(best.maxGap/current.maxGap)},
  maxHeightChange:{framesEarlier:current.frame-highest.frame,tauEarlier:current.tau-highest.tau,
   areaFactor:highest.voidArea/current.voidArea,maxGapFactor:highest.maxGap/current.maxGap,
   roofThicknessMeanFactor:highestDetail.roofThickness.mean/original.roofThickness.mean,
   naiveCollapseDurationFactor:Math.sqrt(highest.maxGap/current.maxGap)},
  illustrativeAtH0SevenMeters:{physicalSceneScaleClaim:false,
   secondsEarlier:(current.tau-best.tau)*unit,touchdownSeconds:c.touchdown*unit,
   current:{areaSquareMeters:original.voidArea*referenceScale*referenceScale,maxGapMeters:original.maxGap*referenceScale,
    meanRoofThicknessMeters:original.roofThickness.mean*referenceScale,collapseSeconds:Math.sqrt(2*original.maxGap*referenceScale/GRAVITY)},
   maxVoidArea:{areaSquareMeters:maximum.voidArea*referenceScale*referenceScale,maxGapMeters:maximum.maxGap*referenceScale,
    meanRoofThicknessMeters:maximum.roofThickness.mean*referenceScale,collapseSeconds:Math.sqrt(2*maximum.maxGap*referenceScale/GRAVITY)},
   maxVoidHeight:{areaSquareMeters:highestDetail.voidArea*referenceScale*referenceScale,maxGapMeters:highestDetail.maxGap*referenceScale,
    meanRoofThicknessMeters:highestDetail.roofThickness.mean*referenceScale,collapseSeconds:Math.sqrt(2*highestDetail.maxGap*referenceScale/GRAVITY)}},
  eligibleFrames:eligible};
});
const sourceFiles=['ProfileLibrary.ts','profileFormat.ts','heldOverturn.ts','lipSheet.ts'].map(name=>{
 const file=`/Users/regina/Desktop/Projects/surfing-game/src/wave/barrel/${name}`,b=readFileSync(file);
 return{file,bytes:b.length,sha256:sha(b)};
});
const report={schema:'tube-hold-area-offline/v1',complete:true,sourceOwner:OWNER,sourceDist:EXPECTED_DIST,
 sourceFiles,actualFetchedPadangAssets:files.length,requestedPrimaryCases:3,
 eligibility:'Exact original heldFrame bounds/tip-floor clearance/tip-throat reach; no relaxation',
 selection:'Maximum existing overturnAt voidArea AND maximum existing voidHeight arithmetic over eligible frames; ties use latest frame',
 units:{coordinates:'h0',area:'h0 squared',tau:'sqrt(h0/g)',gravity:GRAVITY,
  illustrativeScaleMeters:referenceScale,actualCurrentNativeSceneScaleClaim:false},
 constraints:{productionEdits:false,servedDistMutation:false,browser:false,solverRuns:false,offlineOnly:true},
 limitations:['Cavity area is the actual heldOverturn polygon measure; it does not prove roominess at every ray or contour validity.',
 'Roof thickness is existing sheetAcross distance, not a newly invented extrusion or a visual-acceptance measure.',
 'Runtime receipt establishes fetched assets, not which case contributes at the retained target cross-section.'],cases};
const encoded=JSON.stringify(report,null,2);assert(Buffer.byteLength(encoded)<=524288,'Bounded512KiB JSON');
writeFileSync(join(WORK,'report.json'),encoded);
const fmt=(n:number)=>n.toFixed(6);
const rows=['case\tselection\tframe\ttau\tvoidArea(h0²)\tmaxGap(h0)\ttipFloor(h0)\ttipThroat(h0)\tmeanRoof40..60(h0)'];
for(const c of cases)for(const [name,m]of[['last-clear',c.current],['max-area',c.maxVoidArea],['max-height',c.maxVoidHeight]] as const)
 rows.push([c.id,name,m.frame,fmt(m.tau),fmt(m.voidArea),fmt(m.maxGap),fmt(m.lipFloorClearance!),fmt(m.lipThroatReach),fmt(m.roofThickness.mean)].join('\t'));
writeFileSync(join(WORK,'table.txt'),rows.join('\n')+'\n');
console.log(JSON.stringify({complete:true,report:join(WORK,'report.json'),table:join(WORK,'table.txt'),
 cases:cases.map(c=>({id:c.id,currentFrame:c.current.frame,maxAreaFrame:c.maxVoidArea.frame,...c.change,
  maxHeightFrame:c.maxVoidHeight.frame,maxHeightChange:c.maxHeightChange,
  h0SevenMeters:c.illustrativeAtH0SevenMeters}))}));
