import { writeFileSync } from 'node:fs';
import { FRONT_FIELD, FRONT_STRIDE } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/barrel/frontRecords';
import { readBarrelCases } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/barrel/nodeBarrelCases';
import { decodeCase } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/barrel/profileFormat';
import { LANDMARK, PROFILE_POINTS, ProfileLibrary } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/barrel/ProfileLibrary';
import { LOFT_SAMPLES, SweptLoft, type LoftResult } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/barrel/sweptLoft';
import { BarrelWater } from '/Users/regina/Desktop/Projects/surfing-game/src/scene/barrel/barrelWater';
import { rasterizeBarrelMask } from '/Users/regina/Desktop/Projects/surfing-game/src/scene/barrel/barrelMask';

const slope = 1 / 19, still = 0.5;
const library = new ProfileLibrary(readBarrelCases('padang').map(decodeCase));
const times = library.profileTimes({ slope, footHeight: Math.fround(2.1), footDepth: 7 });
const records = new Float32Array(21 * FRONT_STRIDE);
for (let k = 0; k < 21; k++) {
 const o=k*FRONT_STRIDE;
 records[o+FRONT_FIELD.x]=k; records[o+FRONT_FIELD.z]=-100; records[o+FRONT_FIELD.front]=1;
 records[o+FRONT_FIELD.sigma]=k; records[o+FRONT_FIELD.tau]=times.clearSeconds;
 records[o+FRONT_FIELD.footHeight]=2.1; records[o+FRONT_FIELD.footDepth]=7;
 records[o+FRONT_FIELD.throwZ]=-100; records[o+FRONT_FIELD.pace]=4;
}
const drawn = new SweptLoft(library, slope, {holdClearDrawing:true}).build(records,21,still,()=>still);
function layers(runs:{id:number;heights:number[];closed?:boolean}[]):LoftResult {
 const count=2*runs.length, p=new Float32Array(3*count*LOFT_SAMPLES), joined=new Uint8Array(count), ids=new Int32Array(count), ix:number[]=[];
 runs.forEach((run,r)=>{
  const row=2*r; ids[row]=ids[row+1]=run.id; joined[row]=1;
  for(let side=0;side<2;side++) for(let l=0;l<run.heights.length;l++) for(let across=0;across<2;across++){
   const v=(row+side)*LOFT_SAMPLES+2*l+across;
   p[3*v]=side; p[3*v+1]=run.heights[l]; p[3*v+2]=across;
  }
  run.heights.forEach((_,l)=>{const a=row*LOFT_SAMPLES+2*l,b=a+LOFT_SAMPLES; ix.push(a,b,a+1,a+1,b,b+1);});
  if(run.closed && run.heights.length===2){
   // Connect top and underside with the four vertical walls of an actual finite rectangular water solid.
   const quad=(a:number,b:number,c:number,d:number)=>ix.push(a,b,c,c,b,d);
   for(const across of [0,1]) {const a=row*LOFT_SAMPLES+across,b=a+LOFT_SAMPLES;quad(a,b,a+2,b+2);}
   for(const side of [0,1]) {const a=(row+side)*LOFT_SAMPLES;quad(a,a+1,a+2,a+3);}
  }
 });
 return {...drawn,positions:p,mask:new Float32Array(count*LOFT_SAMPLES).fill(1),indices:new Uint32Array(ix),sliceJoined:joined,sliceFront:ids,sliceCount:count,vertexCount:count*LOFT_SAMPLES,indexCount:ix.length};
}
function queried(loft:LoftResult, points:{x:number;y:number;z:number}[]){
 const water=new BarrelWater();water.prepare(loft,1);
 return points.map(p=>{const value=water.query(p.x,p.y,p.z);return {point:p,actual:value===undefined?'undefined':value};});
}
function components(loft:LoftResult){
 const parent=new Int32Array(loft.vertexCount);parent.forEach((_,i)=>parent[i]=i);
 const find=(v:number):number=>{while(parent[v]!==v){parent[v]=parent[parent[v]];v=parent[v];}return v;};
 const used=new Set<number>();
 for(let i=0;i<loft.indexCount;i+=3){const a=loft.indices[i],b=loft.indices[i+1],c=loft.indices[i+2];used.add(a);used.add(b);used.add(c);parent[find(b)]=find(a);parent[find(c)]=find(a);}
 return new Set([...used].map(find)).size;
}
const pts=[-1,1,2.5,3.5,5].map(y=>({x:.5,y,z:.5}));
const threeFloors=layers([{id:1,heights:[0]},{id:1,heights:[2]},{id:1,heights:[4]}]);
const threeFloorAnswers=queried(threeFloors,pts);
const expectedUnion=pts.map(p=>p.y<4);
if(threeFloorAnswers[1].actual!==false || expectedUnion[1]!==true)throw Error('Expected deterministic XOR counterexample absent');
const twoFloors=layers([{id:1,heights:[0]},{id:1,heights:[4]}]);
const finiteRoof=layers([{id:1,heights:[0]},{id:1,heights:[2,3],closed:true}]);
const finiteOnly=layers([{id:1,heights:[2,3],closed:true}]);
const maskOut=new Uint8Array(9);const maskNodes=rasterizeBarrelMask(threeFloors,{xMin:0,zMin:0,spacing:.5,nx:3,nz:3} as any,maskOut);
const profile=new Float32Array(2*PROFILE_POINTS);
library.profileAt({slope,footHeight:records[FRONT_FIELD.footHeight],footDepth:7,seconds:records[FRONT_FIELD.tau],hold:'contact'},profile);
const x=10.25,z=-100-profile[2*LANDMARK.crest]+(profile[2*LANDMARK.lip]+profile[2*LANDMARK.throat])/2;
function shifted(loft:LoftResult,dy:number):LoftResult { const p=new Float32Array(loft.positions);for(let v=0;v<loft.vertexCount;v++)p[3*v+1]+=dy;return {...loft,positions:p}; }
function copied(lofts:LoftResult[]):LoftResult {
 const sliceCount=lofts.reduce((s,l)=>s+l.sliceCount,0),vertexCount=sliceCount*LOFT_SAMPLES,indexCount=lofts.reduce((s,l)=>s+l.indexCount,0);
 const p=new Float32Array(3*vertexCount),indices=new Uint32Array(indexCount),joined=new Uint8Array(sliceCount),ids=new Int32Array(sliceCount).fill(1);
 let v=0,i=0,row=0;
 for(const l of lofts){p.set(l.positions.subarray(0,3*l.vertexCount),3*v);for(let j=0;j<l.indexCount;j++)indices[i+j]=l.indices[j]+v;joined.set(l.sliceJoined.subarray(0,l.sliceCount),row);v+=l.vertexCount;i+=l.indexCount;row+=l.sliceCount;}
 return {...drawn,positions:p,indices,sliceJoined:joined,sliceFront:ids,sliceCount,vertexCount,indexCount};
}
const copies=[drawn,shifted(drawn,4),shifted(drawn,8)],combined=copied(copies);
let highest=-Infinity;for(let v=0;v<drawn.vertexCount;v++)highest=Math.max(highest,drawn.positions[3*v+1]);
const copyPoint={x,y:highest+1,z},independent=copies.map(l=>queried(l,[copyPoint])[0].actual),combinedAnswer=queried(combined,[copyPoint])[0].actual;
if(independent[0]!==false || independent[1]!==true || independent[2]!==true || combinedAnswer!==false) throw Error('Real-profile copied counterexample absent');
const report={
 source:'Actual BarrelWater, actual indexed quad APIs. Synthetic input; not claimed native runtime occurrence.',
 threeSeaConnectedSheets:{components:components(threeFloors),columnCrossings:[0,2,4],actual:threeFloorAnswers,expectedWaterUnion:expectedUnion,independentSheets:[0,2,4].map(h=>queried(layers([{id:1,heights:[h]}]),pts))},
 twoSeaConnectedSheets:{components:components(twoFloors),columnCrossings:[0,4],actual:queried(twoFloors,pts),expectedWaterUnion:pts.map(p=>p.y<4)},
 validFloorAndFiniteRoof:{components:components(finiteRoof),columnCrossings:[0,2,3],actual:queried(finiteRoof,pts),expectedWaterUnion:pts.map(p=>p.y<0||(p.y>=2&&p.y<3)),finiteOnlyActual:queried(finiteOnly,pts),note:'The floor and finite roof are two actual indexed components; the roof has four vertical indexed walls. Connectivity split with the same odd-total guard rejects the even-crossing finite roof. A finite roof needs its own closed-solid parity.'},
 mask:{nodes:maskNodes,values:Array.from(maskOut),note:'Mask takes maximum triangle weight; disconnected same-front parity grouping does not alter its output.'},
 actualProfileTripleCopy:{components:components(combined),baseComponents:components(drawn),point:copyPoint,perComponent:independent,aggregate:combinedAnswer,expectedWaterUnion:true,dy:[0,4,8],base:{sliceCount:drawn.sliceCount,indexCount:drawn.indexCount,rayMinAdvance:drawn.rayMinAdvance,rayInvalidIntervals:drawn.rayInvalidIntervals},note:'Three overlapping vertically translated copies intentionally exceed one-front ray-plan input invariants. This isolates the classifier contract, not proof that transport creates this state.'}
};
writeFileSync('/private/tmp/tube-connected-air-audit-20261004/report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
