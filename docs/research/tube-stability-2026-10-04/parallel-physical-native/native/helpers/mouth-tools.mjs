// Diagnostic geometry only. Preserve the selected eye, along-offset and younger direction.
export function createMouthTools() {
 const STRIDE=134,EXT=3,CREST=32;
 const world=(l,row,j)=>Array.from(l.positions.subarray(3*(row*STRIDE+EXT+j),3*(row*STRIDE+EXT+j)+3));
 function width(l,a,b,t) {
  let low=Infinity,high=-Infinity;
  const nx=l.sliceRayX[a]+t*(l.sliceRayX[b]-l.sliceRayX[a]),nz=l.sliceRayZ[a]+t*(l.sliceRayZ[b]-l.sliceRayZ[a]);
  const norm=Math.hypot(nx,nz);if(!(norm>0))throw Error('Initial mouth ray invalid');
  for(let j=0;j<128;j++){const p=world(l,a,j),q=world(l,b,j),x=p[0]+t*(q[0]-p[0]),z=p[2]+t*(q[2]-p[2]),s=(x*nx+z*nz)/norm;low=Math.min(low,s);high=Math.max(high,s);}
  if(!(high>low)||!Number.isFinite(high-low))throw Error('Initial mouth contour width invalid');
  return high-low;
 }
 function choose(l,station,front,along,sign,columns,firstHit,eye,eyeComponentId) {
  if(l.sliceCount>300||![-1,1].includes(sign))throw Error('Bounded mouth rows/direction');
  const {a,b}=station;let start=a,end=b;
  while(start>0&&l.sliceFront[start-1]===front&&l.sliceJoined[start-1]===1)start--;
  while(end+1<l.sliceCount&&l.sliceFront[end+1]===front&&l.sliceJoined[end]===1)end++;
  let previous=sign>0?b:a,boundary=previous,unformed=false;
  for(let row=previous;row>=start&&row<=end;row+=sign){
   boundary=row;
   if(!(l.sliceFormed[row]>0)){unformed=true;break;}
   previous=row;
  }
  const boundaryReason=unformed?'first-unformed-underside':'joined-run-end';
  // Twenty-four deterministic interior stations span the ENTIRE eye-to-directed-boundary interval.
  // Boundary-nearest first: the first qualifying station is the furthest sampled strict air.
  // Keep the same epoch/component, original along offset and immutable younger direction.
  const candidates=[];
  const eyeRow=station.a+station.t,directedLength=sign*(boundary-eyeRow);
  if(directedLength>0)for(let sample=0;sample<24;sample++){
    const intervalFraction=(sample+.5)/24,rowCoordinate=boundary-sign*directedLength*intervalFraction;
    const lo=Math.floor(rowCoordinate),hi=lo+1,t=rowCoordinate-lo;
    if(lo<start||hi>end||l.sliceJoined[lo]!==1)throw Error('Whole directed mouth interval lost its declared joined run');
    const p=world(l,lo,CREST),q=world(l,hi,CREST);
    let nx=l.sliceRayX[lo]+t*(l.sliceRayX[hi]-l.sliceRayX[lo]),nz=l.sliceRayZ[lo]+t*(l.sliceRayZ[hi]-l.sliceRayZ[lo]);
    const n=Math.hypot(nx,nz);if(!(n>0))throw Error('Mouth candidate ray invalid');nx/=n;nz/=n;
    const crest=p.map((v,k)=>v+t*(q[k]-v));
    candidates.push({rows:[lo,hi],fraction:t,rowCoordinate,sample,intervalFraction,x:crest[0]+along*nx,z:crest[2]+along*nz,ray:[nx,nz],crest});
  }
  const result=columns(l,candidates);
  const attempts=candidates.map((candidate,i)=>{
   const covering=result[i].covering.map(c=>({component:c.component,crossings:c.crossings,strictlyOrdered:c.strictlyOrdered}));
   const directedProgress=sign*(candidate.rowCoordinate-eyeRow);
   const c=covering[0],sameEyeSheetComponent=covering.length===1&&c.component.localId===eyeComponentId;
   const qualified=directedProgress>0&&sameEyeSheetComponent&&c.component.front===front&&c.crossings.length===3&&c.strictlyOrdered&&c.crossings[1]>c.crossings[0];
   return {...candidate,directedProgress,sameEyeSheetComponent,covering,qualified,point:qualified?[candidate.x,(c.crossings[0]+c.crossings[1])/2,candidate.z]:null};
  });
  const candidate=attempts.find(c=>c.qualified)??null,occlusion=candidate?firstHit(l,eye,candidate.point):null;
  return {policy:'same-eye-entire-directed-younger-interval-24-uniform-interior-stations',run:[start,end],boundaryRow:boundary,boundaryReason,interval:{eyeRow,boundaryRow:boundary,directedLength,closestBoundaryFirst:true,strictlyYoungerward:true},immutableYoungerSign:sign,maximumColumnQueries:24,attempts,candidate,fullSightline:occlusion,
   clearNearMouthSightline:!!candidate&&!occlusion.indexedLoftOccluded,
   target:candidate&&!occlusion.indexedLoftOccluded?candidate.point:null,
   failure:!candidate?'no-strict-air-column-in-declared-whole-directed-interval':occlusion.indexedLoftOccluded?'full-selected-eye-to-candidate-segment-obstructed':null,
   externalEntranceClaim:false,continuousAirCorridorClaim:false,bodyPassageClaim:false};
 }
 function exterior(candidate,width,younger,waterHeight,fallback=null) {
  const anchor=candidate??fallback;
  if(!anchor||!(width>0)||!Number.isFinite(width))return null;
  const p=anchor.point,ray=anchor.ray;
  if(!p?.every(Number.isFinite)||!ray?.every(Number.isFinite)||!younger.every(Number.isFinite)||!(Math.hypot(...ray)>0)||!(Math.hypot(...younger)>0))throw Error('Nonfinite or degenerate declared exterior anchor');
  const eye=[p[0]+2*width*younger[0]+width*ray[0],p[1],p[2]+2*width*younger[2]+width*ray[1]];
  eye[1]=Math.max(p[1],waterHeight(eye[0],eye[2])+.1);
  if(!eye.every(Number.isFinite)||!p.every(Number.isFinite))throw Error('Nonfinite declared exterior pose');
  return {eye,target:p.slice(),anchorPoint:p.slice(),anchorRay:ray.slice(),mouthCandidateAvailable:!!candidate,
   anchorPolicy:candidate?'current-strict-air-mouth-candidate':'current-selected-strict-air-eye-no-mouth-candidate',
   initialContourWidth:width,policy:'one-fixed-channel-pose-no-search',poseRetries:0,externalEntranceClaim:false};
 }
 return {width,choose,exterior};
}
