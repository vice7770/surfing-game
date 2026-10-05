import { readBarrelCases } from './src/wave/barrel/nodeBarrelCases';
import { decodeCase } from './src/wave/barrel/profileFormat';
import { LANDMARK, PROFILE_POINTS, ProfileLibrary } from './src/wave/barrel/ProfileLibrary';
import { FRONT_STRIDE, FRONT_FIELD } from './src/wave/barrel/frontRecords';
import { SweptLoft as Before, LOFT_SAMPLES, LOFT } from './src/wave/barrel/sweptLoft.before';
import { SweptLoft as Trial } from './src/wave/barrel/sweptLoft';

const cases=readBarrelCases().map(decodeCase),library=new ProfileLibrary(cases,{geometry:'bounded-C'});
const c=cases.find(v=>v.id==='pad19-a30-l12')!,p=new Float32Array(2*PROFILE_POINTS);
const q0={slope:c.slope,footHeight:c.nonlinearity*7,footDepth:7};
library.profileAt({...q0,seconds:library.profileTimes(q0).clearSeconds},p);
const scale=3/(p[2*LANDMARK.crest+1]-p[2*LANDMARK.toe+1]);
const query={slope:q0.slope,footHeight:q0.footHeight*scale,footDepth:q0.footDepth*scale};
const times=library.profileTimes(query),authored=times.clearSeconds/.4,records=new Float32Array(9*FRONT_STRIDE);
for(let k=0;k<9;k++){const x=k+.5;records.set([x,-100,1,k,authored+(4.9-x)*(.3*authored/1.5),query.footHeight,query.footDepth,-100,0],k*FRONT_STRIDE);}
const tauAt=(x:number)=>records[FRONT_FIELD.tau]+(x-records[FRONT_FIELD.x])*(records[FRONT_STRIDE+FRONT_FIELD.tau]-records[FRONT_FIELD.tau]);
const eligible=(x:number)=>tauAt(x)>=times.clearSeconds&&tauAt(x)<=times.touchdownSeconds;
const vertex=(row:number,point:number)=>row*LOFT_SAMPLES+LOFT.extensionSamples+point;
const sub=(a:number[],b:number[])=>a.map((v,k)=>v-b[k]);
function turn(a:number[],b:number[],c:number[]){const u=sub(b,a),v=sub(c,b);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,k)=>s+x*v[k],0)/(Math.hypot(...u)*Math.hypot(...v)))))*180/Math.PI;}
function inspect(draw:ReturnType<Trial['build']>|ReturnType<Before['build']>){
 const rows=[];
 for(let row=0;row<draw.sliceCount;row++){
  const x=draw.positions[3*vertex(row,LANDMARK.crest)];
  if(x<3.5||x>5.5||draw.sliceWeight[row]!==1||draw.slicePhase[row]!==1||!eligible(x))continue;
  rows.push({row,x,tau:draw.sliceTau[row],cap:Array.from(draw.positions.subarray(3*vertex(row,LANDMARK.lip),3*vertex(row,LANDMARK.lip)+3)),bend:null as number|null});
 }
 for(let k=1;k+1<rows.length;k++)rows[k].bend=turn(rows[k-1].cap,rows[k].cap,rows[k+1].cap);
 return {counts:{slices:draw.sliceCount,vertices:draw.vertexCount,indices:draw.indexCount},cSampling:draw.cSampling,rows,maximum:Math.max(...rows.flatMap(v=>v.bend===null?[]:[v.bend]))};
}
const mandatory=Array.from({length:9},(_,k)=>3.5+k/4).filter(eligible).map(x=>{
 let k=0;while(k+1<8&&records[(k+1)*FRONT_STRIDE]<x)k++;
 const a=k*FRONT_STRIDE,b=(k+1)*FRONT_STRIDE,s=(x-records[a])/(records[b]-records[a]);
 const field=(offset:number)=>records[a+offset]+s*(records[b+offset]-records[a+offset]);
 library.profileAt({...query,footHeight:field(FRONT_FIELD.footHeight),footDepth:field(FRONT_FIELD.footDepth),seconds:field(FRONT_FIELD.tau)},p);
 return {x,cap:[x,.5+p[2*LANDMARK.lip+1],field(FRONT_FIELD.z)-p[2*LANDMARK.crest]+p[2*LANDMARK.lip]],bend:null as number|null};
});
for(let k=1;k+1<mandatory.length;k++)mandatory[k].bend=turn(mandatory[k-1].cap,mandatory[k].cap,mandatory[k+1].cap);
const before=inspect(new Before(library,query.slope,{sheet:false}).build(records,9,.5,()=>.5));
const trial=inspect(new Trial(library,query.slope,{sheet:false}).build(records,9,.5,()=>.5));
console.log(JSON.stringify({schema:'root-angular-fixture-decomposition/v1',fixture:'Existing cap test provider fixture; no native seed, camera or riding evidence',rawFrontPacket:Array.from(records),query,times,mandatory,before,trial,productionChanged:false},null,2));
