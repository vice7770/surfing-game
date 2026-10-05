// Ordinary documented input overlay; no placement, reset, physical state mutation or geometry targeting.
export function createOrdinaryControl() {
 let popupIssued=false,popupTrigger=null,standingSteerStarted=false,gentleSteer=0;
 return function(view,pilotInput,step,dt=1/60) {
  if(!(dt===1/60&&Number.isSafeInteger(step)&&step>=1))throw Error('Finite one-step ordinary control');
  const phase=view.ride.phase,standing=phase==='standing',prone=phase==='prone';
  if(!Number.isFinite(pilotInput.steer))throw Error('Finite requested line steer');
  const input={paddle:prone,popUp:false,steer:0,trim:0,crouch:standing?1:0,compress:standing?1:0,pocketReflex:false};
  const firstStandingInput=standing&&!standingSteerStarted;
  const targetLimitedSteer=standing?Math.max(-.2,Math.min(.2,pilotInput.steer)):0;
  if(standing){if(firstStandingInput)gentleSteer=0;else gentleSteer+=Math.max(-.4*dt,Math.min(.4*dt,targetLimitedSteer-gentleSteer));input.steer=gentleSteer;standingSteerStarted=true;}
  else standingSteerStarted=false;
  if(prone&&!popupIssued&&view.ride.cue===true){input.popUp=true;popupIssued=true;popupTrigger={step,kind:'first-actual-positive-cue',cue:true,phase,wave:JSON.parse(JSON.stringify(view.ride.wave))};}
  return {input,steeringControl:{requestedPilotSteer:pilotInput.steer,actualInputSteer:input.steer,targetLimitedSteer,maximumAbsolute:.2,slewRatePerSecond:.4,standing,firstStandingInput,proneSteering:0},popupControl:{issued:popupIssued,trigger:popupTrigger}};
 };
}

// Exact projected triangle distance, using indexed inter-slice bands on a positive formed, weighted joined front.
export function nearestIndexedFormed(l,board) {
 if(!l||!l.indexCount)return {available:false,reason:'no-active-indexed-loft',qualifies:false};
 if(l.sliceCount>300||l.vertexCount>40200||l.indexCount>240000||l.indexCount%3!==0||board.length<3||!board.slice(0,3).every(Number.isFinite))throw Error('Bounded actual loft/board');
 const p=l.positions,x=board[0],z=board[2],S=134;let best=null,eligibleTriangles=0;
 function segment(a,b){const ax=p[3*a],az=p[3*a+2],dx=p[3*b]-ax,dz=p[3*b+2]-az,n=dx*dx+dz*dz,t=n>0?Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/n)):0;return (x-ax-t*dx)**2+(z-az-t*dz)**2;}
 function distance(a,b,c){const cross=(u,v)=>(p[3*v]-p[3*u])*(z-p[3*u+2])-(p[3*v+2]-p[3*u+2])*(x-p[3*u]);const area=(p[3*b]-p[3*a])*(p[3*c+2]-p[3*a+2])-(p[3*b+2]-p[3*a+2])*(p[3*c]-p[3*a]);if(area!==0){const s=Math.sign(area);if(cross(a,b)*s>=0&&cross(b,c)*s>=0&&cross(c,a)*s>=0)return 0;}return Math.min(segment(a,b),segment(b,c),segment(c,a));}
 for(let o=0;o<l.indexCount;o+=3){const a=l.indices[o],b=l.indices[o+1],c=l.indices[o+2];if(!(a<l.vertexCount&&b<l.vertexCount&&c<l.vertexCount))throw Error('Active index outside vertex range');const rows=[Math.floor(a/S),Math.floor(b/S),Math.floor(c/S)],lo=Math.min(...rows),hi=Math.max(...rows);if(hi!==lo+1||hi>=l.sliceCount||l.sliceJoined[lo]!==1||l.sliceFront[lo]!==l.sliceFront[hi]||!(l.sliceWeight[lo]>0&&l.sliceWeight[hi]>0)||!(l.sliceFormed[lo]>0||l.sliceFormed[hi]>0))continue;
  eligibleTriangles++;const d=distance(a,b,c);if(!Number.isFinite(d))throw Error('Nonfinite indexed formed distance');if(!best||d<best.distanceSquared)best={front:l.sliceFront[lo],triangleIndexOffset:o,indices:[a,b,c],rows:[lo,hi],distanceSquared:d};}
 if(!best)return {available:true,qualifies:false,reason:'no-positive-formed-weighted-joined-indexed-band',eligibleTriangles};
 return {...best,available:true,horizontalDistance:Math.sqrt(best.distanceSquared),maximumHorizontalDistance:15,qualifies:best.distanceSquared<=225,eligibleTriangles,scope:'Board XZ distance to actual indexed formed joined loft bands; tails may be included; no cavity, contact, mouth or body proof'};
}
