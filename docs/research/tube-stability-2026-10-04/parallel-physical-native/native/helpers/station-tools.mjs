// Pure read-only helpers. A fixed X is a solver-column crest station, not a material trajectory.
export function createStationTools() {
 const S=134,E=3,finite=v=>Number.isFinite(v)?v:null;
 const world=(l,r,j)=>Array.from(l.positions.subarray(3*(r*S+E+j),3*(r*S+E+j)+3));
 function raw(snap) {
  if(snap.frontCount>2048)throw Error('Raw front bound');
  const names=['x','z','front','sigma','tau','footHeight','footDepth','throwZ','pace'],result=[];
  for(let i=0;i<snap.frontCount;i++){const r={record:i};for(let k=0;k<9;k++)r[names[k]]=finite(snap.front[9*i+k]);result.push(r);}
  return result;
 }
 function map(raw,front,x) {
  const points=raw.filter(p=>p.front===front);
  if(!points.length)return {reason:'raw-front-absent',points};
  if(points.some(p=>![p.x,p.z,p.sigma,p.tau].every(Number.isFinite)))throw Error('Invalid raw station coordinates');
  for(let i=1;i<points.length;i++)if(!(points[i].x>points[i-1].x&&points[i].sigma>points[i-1].sigma))throw Error('Raw front X/sigma not strictly increasing');
  const range=[points[0].x,points.at(-1).x];
  if(x<range[0]||x>range[1])return {reason:'station-outside-raw-range',range,points};
  if(points.length<2)return {reason:'loft-join-absent',range,points,detail:'One raw station has no two-point run'};
  // Internal exact ties use the following interval; the terminal tie uses the preceding one. No extrapolation.
  let a=points.findIndex((p,i)=>i+1<points.length&&x>=p.x&&(x<points[i+1].x||i+2===points.length&&x===points[i+1].x));
  if(a<0)throw Error('Bounded station bracket missing');
  const p=points[a],q=points[a+1],t=(x-p.x)/(q.x-p.x);
  return {reason:null,range,rawBracket:[p.record,q.record],rawRows:[p,q],fraction:t,x,
   z:p.z+t*(q.z-p.z),sigma:p.sigma+t*(q.sigma-p.sigma),tau:p.tau+t*(q.tau-p.tau),points};
 }
 function bracket(l,front,sigma) {
  const matches=[];
  for(let a=0;a+1<l.sliceCount;a++){const b=a+1,lo=l.sliceSigma[a],hi=l.sliceSigma[b];
   if(l.sliceFront[a]!==front||l.sliceFront[b]!==front||l.sliceJoined[a]!==1||!(hi>lo))continue;
   if(sigma>=lo&&(sigma<hi||sigma===hi&&(b+1===l.sliceCount||l.sliceJoined[b]!==1||l.sliceFront[b+1]!==front)))matches.push({a,b,t:(sigma-lo)/(hi-lo)});
  }
  if(matches.length>1)throw Error('Ambiguous joined station bracket');
  return matches[0]??null;
 }
 function fromCurrentLoft(l,front,x) {
  const matches=[];let joinedPairs=0,invalidPairs=0;
  for(let a=0;a+1<l.sliceCount;a++){
   const b=a+1;if(l.sliceFront[a]!==front||l.sliceFront[b]!==front||l.sliceJoined[a]!==1)continue;
   joinedPairs++;const ca=world(l,a,32),cb=world(l,b,32);if(!(cb[0]>ca[0])){invalidPairs++;continue;}
   const last=b+1===l.sliceCount||l.sliceJoined[b]!==1||l.sliceFront[b+1]!==front;
   if(!(x>=ca[0]&&(x<cb[0]||last&&x===cb[0])))continue;
   const t=(x-ca[0])/(cb[0]-ca[0]);matches.push({a,b,t,x,crest:ca.map((v,k)=>v+t*(cb[k]-v)),sigma:l.sliceSigma[a]+t*(l.sliceSigma[b]-l.sliceSigma[a]),tau:l.sliceTau[a]+t*(l.sliceTau[b]-l.sliceTau[a])});
  }
  if(matches.length>1)throw Error('Ambiguous actual joined crest-X station');
  return {bracket:matches[0]??null,joinedPairs,invalidPairs,stationFrom:'current-joined-loft-crest-world-X'};
 }
 // Public sea handover exposes exact stable FrontPoint IDs; solver arrays are not decoded or retained.
 async function decodePublicExport(payload) {
  if(!payload||!(payload.bytes instanceof Uint8Array)||typeof payload.deflated!=='boolean'||payload.bytes.length>128*1024*1024)throw Error('Invalid/bounded public export packet');
  const bytes=payload.deflated?new Uint8Array(await new Response(new Blob([payload.bytes]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer()):payload.bytes;
  if(bytes.length<8||bytes.length>128*1024*1024)throw Error('Public decoded export byte bound');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),length=view.getUint32(4,true);
  if(view.getUint32(0,true)!==0x53455431||length>16*1024*1024||8+length>bytes.length)throw Error('Public SET1 header bound/magic');
  const h=JSON.parse(new TextDecoder().decode(bytes.subarray(8,8+length))),start=8+Math.ceil(length/4)*4;
  if(!Array.isArray(h.arrays)||h.arrays.some(r=>!Array.isArray(r)||r.length!==2||typeof r[0]!=='string'||!Number.isSafeInteger(r[1])||r[1]<0)||start+4*h.arrays.reduce((n,r)=>n+r[1],0)!==bytes.length)throw Error('Public SET1 arrays length contract');
  if(![h.solverTime,h.seaTimeOffset].every(Number.isFinite)||!h.front||!Array.isArray(h.front.points)||h.front.points.length>2048)throw Error('Public active front state unavailable/bounded');
  const keys=['id','front','column','x','z','sigma','tau','footHeight','footDepth','throwZ','jetPace','jetUntil','jetBase','jetAt','joined','broke','thrown','seen'];
  const points=h.front.points.map(p=>Object.fromEntries(keys.map(k=>[k,finite(p[k])])));
  return {format:'public-SurfZoneHost-exportState-SET1-header',encodedBytes:payload.bytes.length,decodedBytes:bytes.length,deflated:payload.deflated,solverTime:h.solverTime,seaTimeOffset:h.seaTimeOffset,seaTime:h.solverTime+h.seaTimeOffset,activePointCount:points.length,points,solverArraysDecodedOrRetained:false};
 }
 const fingerprint=['x','footHeight','footDepth','throwZ','jetPace','jetBase','jetAt','jetUntil'];
 function activeHistory(points) {
  return Array.isArray(points)&&points.length===2&&points.every(p=>[p.x,p.z,p.tau,p.footHeight,p.footDepth,p.throwZ,p.pace].every(Number.isFinite)&&p.tau>=0&&p.pace>0);
 }
 function pointIdentity(exported,mapping,x) {
  const rawRows=mapping?.rawRows??[],matches=rawRows.map(r=>exported?.points?.filter(p=>p.front===r.front&&Math.fround(p.x)===r.x)??[]),points=matches.map(p=>p.length===1?p[0]:null);
  const gates={publicExportPresent:!!exported,exactlyTwoRawBracketRows:rawRows.length===2,uniqueTwoExportedPoints:points.length===2&&points.every(Boolean),uniqueGlobalActivePointIDs:!!exported&&exported.points.every(p=>Number.isSafeInteger(p.id)&&p.id>=0)&&new Set(exported.points.map(p=>p.id)).size===exported.points.length};
  gates.rawF32RecordsMatchExportedPoints=gates.uniqueTwoExportedPoints&&points.every((p,i)=>['x','z','front','sigma','tau','footHeight','footDepth','throwZ'].every(k=>Math.fround(p[k])===rawRows[i][k])&&Math.fround(p.jetPace!==null&&p.jetUntil!==null&&p.tau<p.jetUntil?p.jetPace:NaN)===rawRows[i].pace);
  gates.finiteActiveExportedHistory=gates.uniqueTwoExportedPoints&&points.every(p=>Number.isSafeInteger(p.column)&&p.column>=0&&[...fingerprint,'z','tau','jetUntil'].every(k=>Number.isFinite(p[k]))&&p.tau>=0&&p.jetPace>0&&p.tau<p.jetUntil);
  gates.orderedSolverColumnsBracketStation=gates.uniqueTwoExportedPoints&&points[0].x<points[1].x&&points[0].column<points[1].column&&x>=Math.fround(points[0].x)&&x<=Math.fround(points[1].x);
  return {qualified:Object.values(gates).every(v=>v===true),gates,failedGates:Object.keys(gates).filter(k=>gates[k]!==true),points,matchCounts:matches.map(p=>p.length),matchingPointRecords:matches,pointIDs:points.map(p=>p?.id??null),stationX:x,front:mapping?.rawRows?.[0]?.front??null,stableIDsViaPublicExport:true,materialTrajectoryClaim:false};
 }
 function needsIdentityExport(raw,currentFront,x) {
  const mapping=map(raw,currentFront,x);
  return ['raw-front-absent','station-outside-raw-range'].includes(mapping.reason);
 }
 function lineage(l,raw,currentFront,x,previous,seaTime,initialIdentity,exported=null) {
  const mapping=map(raw,currentFront,x),loftStation=fromCurrentLoft(l,currentFront,x);
  if(!mapping.reason)return {currentFront,mapping,loftStation,reason:loftStation.bracket?null:'loft-join-absent',decision:{attempted:false,mode:'current-component-first',currentFront,pointIDsVerifiedOnlyAtPublicExportEpochs:true}};
  if(!['raw-front-absent','station-outside-raw-range'].includes(mapping.reason))return {currentFront,mapping,loftStation,reason:mapping.reason,decision:{attempted:false,mode:'current-component-raw-join-loss',currentFront}};
  const dt=previous?seaTime-previous.seaTime:null,tested=[];
  for(const front of [...new Set(raw.map(p=>p.front))].filter(f=>Number.isFinite(f)&&f!==currentFront).sort((a,b)=>a-b)){
   let next,joined,error=null;try{next=map(raw,front,x);joined=fromCurrentLoft(l,front,x);}catch(e){error=String(e);}
   const before=previous?.rawRows??null,after=next?.rawRows??null,identity=pointIdentity(exported,next,x),expected=initialIdentity?.points??null;
   const ages=after?.map((p,i)=>{const a=before?.[i]?.tau,b=p.tau,valid=Number.isFinite(a)&&Number.isFinite(b)&&Number.isFinite(dt);return {columnX:p.x,beforeTau:Number.isFinite(a)?a:null,afterTau:b,physicalDelta:dt,tauAdvance:valid?b-a:null,observedRefitAgeResidual:valid?b-a-dt:null,passesMonotone:valid&&b>=a,DTEqualityRequired:false};})??[];
   const gates={rawBracketPresent:!error&&next?.reason===null,previousHistorySameCurrentID:previous?.front===currentFront,physicalDeltaFinitePositive:Number.isFinite(dt)&&dt>0,previousActiveHistory:activeHistory(before),candidateActiveHistory:activeHistory(after),sameBracketX:!!before&&!!after&&before.every((p,i)=>p.x===after[i].x),sameFootHeightDepthThrowPace:!!before&&!!after&&before.every((p,i)=>['footHeight','footDepth','throwZ','pace'].every(k=>p[k]===after[i][k])),rawAgesFiniteNonnegativeMonotone:ages.length===2&&ages.every(a=>a.passesMonotone),publicPointIdentityQualified:identity.qualified,initialPublicPointIdentityQualified:initialIdentity?.qualified===true,sameOrderedTwoInternalPointIDs:!!expected&&identity.points.length===2&&identity.points.every((p,i)=>p&&p.id===expected[i].id),sameInternalColumnsAndExactX:!!expected&&identity.points.length===2&&identity.points.every((p,i)=>p&&p.column===expected[i].column&&p.x===expected[i].x),sameExactExportedFootHeightDepthThrowPace:!!expected&&identity.points.length===2&&identity.points.every((p,i)=>p&&fingerprint.every(k=>p[k]===expected[i][k])),exportedAgesFiniteNonnegativeMonotone:!!expected&&identity.points.length===2&&identity.points.every((p,i)=>p&&Number.isFinite(p.tau)&&p.tau>=0&&p.tau>=expected[i].tau),currentSameFrontJoinedCrestX:!error&&!!joined?.bracket};
   const qualified=Object.values(gates).every(v=>v===true),bracket=joined?.bracket;
   tested.push({front,qualified,gates,failedGates:Object.keys(gates).filter(k=>gates[k]!==true),error,mapping:next??null,loftStation:joined??null,beforeRawColumns:before,afterRawColumns:after,publicPointIdentity:identity,ages,crestZMotion:after?.map((p,i)=>({columnX:p.x,zBefore:before?.[i]?.z??null,zAfter:p.z,zDelta:before?p.z-before[i].z:null,pacePrediction:before&&Number.isFinite(dt)?p.pace*dt:null,paceDisplacementResidual:before&&Number.isFinite(dt)?p.z-before[i].z-p.pace*dt:null,paceTimesObservedTauAdvance:before?p.pace*(p.tau-before[i].tau):null,paceRefitDisplacementResidual:before?p.z-before[i].z-p.pace*(p.tau-before[i].tau):null,DTEqualityRequired:false}))??[],actualJoinedRows:bracket?rows(l,front).filter(r=>r.row===bracket.a||r.row===bracket.b):[]});
  }
  const accepted=tested.filter(c=>c.qualified),decision={attempted:true,mode:'public-stable-point-IDs-at-fixed-Eulerian-X',beforeFront:currentFront,stationX:x,previousSeaTime:previous?.seaTime??null,seaTime,physicalDelta:dt,agePolicy:'finite nonnegative monotone; advanceClocks max(previousTau,time-fittedThrow(current component sigma)); refit/crest residuals descriptive only',DTEqualityRequired:false,initialPublicPointIdentity:initialIdentity,testedCandidates:tested,qualifiedCount:accepted.length,materialTrajectoryClaim:false,physicalDeathClaim:false};
  if(accepted.length!==1)return {currentFront,mapping,loftStation,reason:accepted.length?'component-lineage-ambiguous':'component-lineage-zero',decision};
  const chosen=accepted[0];decision.afterFront=chosen.front;decision.componentLineageEvent=true;decision.provenOrderedInternalPointIDs=chosen.publicPointIdentity.pointIDs;
  return {currentFront:chosen.front,mapping:chosen.mapping,loftStation:chosen.loftStation,reason:null,decision};
 }
 function rows(l,front=null) {
  if(l.sliceCount>300)throw Error('Loft row bound');
  const keys=Object.keys(l).filter(k=>/^slice[A-Z]/.test(k)&&ArrayBuffer.isView(l[k])),out=[];
  for(let row=0;row<l.sliceCount;row++){if(front!==null&&l.sliceFront[row]!==front)continue;const r={row};for(const k of keys)r[k]=finite(l[k][row]);r.crest=world(l,row,32);r.cap=world(l,row,64);r.toe=world(l,row,112);r.floorDatum=world(l,row,104);out.push(r);}
  return out;
 }
 function firstHit(l,eye,target) {
  if(l.indexCount>240000)throw Error('Indexed camera ray bound');
  const p=l.positions,ids=l.indices,d=target.map((v,k)=>v-eye[k]);let best=null,count=0;
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  for(let i=0;i<l.indexCount;i+=3){const vs=[ids[i],ids[i+1],ids[i+2]],a=vs.map(v=>[p[3*v],p[3*v+1],p[3*v+2]]),e1=a[1].map((v,k)=>v-a[0][k]),e2=a[2].map((v,k)=>v-a[0][k]),h=cross(d,e2),det=dot(e1,h);count++;
   if(Math.abs(det)<1e-12)continue;const inv=1/det,s=eye.map((v,k)=>v-a[0][k]),u=inv*dot(s,h);if(u<0||u>1)continue;const q=cross(s,e1),v=inv*dot(d,q);if(v<0||u+v>1)continue;const t=inv*dot(e2,q);if(!(t>1e-6&&t<1-1e-6)||best&&t>=best.fraction)continue;
   const rows=vs.map(v=>Math.floor(v/S));best={triangle:i/3,vertices:vs,rows,fronts:rows.map(r=>l.sliceFront[r]),fraction:t,distance:t*Math.hypot(...d),point:eye.map((v,k)=>v+t*d[k]),doubleSided:true};
  }
  return {trianglesTested:count,firstHit:best,indexedLoftOccluded:!!best,ordinaryWaterOrParticlesOcclusionClaim:false};
 }
 function water(data,grid,look,x,z) {
  const gx=(x-grid.xMin)/grid.spacing,gz=(z-grid.zMin)/grid.spacing,i0=Math.floor(gx),j0=Math.floor(gz),outside=gx<0||gz<0||gx>=grid.nx-1||gz>=grid.nz-1;
  if(look!=='rich'){if(outside)return {height:0,outside,method:'ordinary-bilinear'};const tx=gx-i0,tz=gz-j0,i=2*(j0*grid.nx+i0),row=grid.nx*2;return {height:(data[i]*(1-tx)+data[i+2]*tx)*(1-tz)+(data[i+row]*(1-tx)+data[i+row+2]*tx)*tz,outside,method:'ordinary-bilinear'};}
  const weights=t=>{const t2=t*t,t3=t2*t;return[(-t3+2*t2-t)/2,(3*t3-5*t2+2)/2,(-3*t3+4*t2+t)/2,(t3-t2)/2];},wx=weights(gx-i0),wz=weights(gz-j0);let height=0;
  for(let j=0;j<4;j++){const row=Math.min(grid.nz-1,Math.max(0,j0+j-1));for(let i=0;i<4;i++){const col=Math.min(grid.nx-1,Math.max(0,i0+i-1));height+=wz[j]*wx[i]*data[2*(row*grid.nx+col)];}}
  return {height,outside,method:'ordinary-rich-Catmull-Rom',barrelMaskNotApplied:true};
 }
 return {world,raw,map,bracket,fromCurrentLoft,decodePublicExport,pointIdentity,needsIdentityExport,activeHistory,lineage,rows,firstHit,water};
}
