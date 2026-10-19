/** Experimental parameter-first C-profile with an enlarged across-profile mouth; precision-v4 retains separate current roof/floor controls. */
export type Vec2 = [number, number];
export interface BoundedCParameters {
 crest: Vec2; toe: Vec2; incoming: Vec2; outgoing: Vec2; authoredTD: number; tau: number;
 /** Optional ND leaf reach adjustment; the actual toe, carrier width and endpoint tangents remain authoritative. */
 leafWidthDelta?: number;
}
export interface BoundedCEvent { seal: number; cap: Vec2; fraction: number }
export interface BoundedCLifecycle { impactEvent: BoundedCEvent; impactTau: number; retiredTau: number; fullyFormedTau: number }
export interface BoundedCMetadata {
  /** Isolated new polygon sampling experiment; current v4 controls are unchanged. */
  sharedSheet?: import('./sharedUpperRoot').SharedSheet;
  /** New isolated geometric domain bound, separate from v4's original coefficients. */
  rootRadiusMaximumFromSheetDomain?: number;
  impactEvent: BoundedCEvent;
  model: 'bounded-analytic-C/v4';
  /** Nondimensional metadata units; profile arrays returned by library are already metric. */
  lengthScale: number; timeScale: number; formation: number; remaining: number; seal: number;
  authoredSealTau: number; impactTau: number; retiredTau: number; fullyFormedTau: number;
  sheetExists: boolean; precisionCollapsed: boolean; thickness: number; requestedThickness: number;
  cap: Vec2; impactCap: Vec2; rootRadius: number; rootVerticalLeg: number;
  /** ND Bezier control displacement for retained roof/tail only; not material-index movement. */
  precisionEnvelopeBound: number; precisionEnvelopeBudget: number; collapsedConnectorLength: number;
  /** Raw phase derivative at fixed parameters, not advective fluid motion. */
  capBoundaryVelocity: Vec2;
  /** Approximate advective water speed/direction, separate from the envelope. */
  fluidAlong: number; fluidUp: number;
  partRanges: { outer: [32,60]; cap: [60,68]; inner: [68,80]; upperRoot: [80,88]; face: [88,92]; lowerRoot: [92,96]; floor: [96,112] };
}
const KAPPA=4/3*Math.tan(Math.PI/8);
/** Fractions of the actual crest-to-toe height, not the input foot crest height. */
const LIP_OPEN_HEIGHT=.60,LIP_FALL_HEIGHT=.80;
const add=(a:Vec2,b:Vec2):Vec2=>[a[0]+b[0],a[1]+b[1]];
const sub=(a:Vec2,b:Vec2):Vec2=>[a[0]-b[0],a[1]-b[1]];
const mul=(a:Vec2,b:number):Vec2=>[a[0]*b,a[1]*b];
const dot=(a:Vec2,b:Vec2)=>a[0]*b[0]+a[1]*b[1];
// The helpers below build one array each, not one per operation (the M1 CPU study, 2026-10-19): the same operations
// in the same order as add/sub/mul composed.
const norm=(a:Vec2)=>Math.hypot(a[0],a[1]);
const unit=(a:Vec2):Vec2=>{const n=Math.hypot(a[0],a[1]);if(!n)throw Error('zero tangent');const inverse=1/n;return [a[0]*inverse,a[1]*inverse];};
const mix=(a:Vec2,b:Vec2,t:number):Vec2=>{const u=1-t;return [a[0]*u+b[0]*t,a[1]*u+b[1]*t];};
const round=(a:Vec2):Vec2=>[Math.fround(a[0]),Math.fround(a[1])];
const smooth=(x:number)=>{x=Math.min(1,Math.max(0,x));return x*x*(3-2*x);};
type Cubic=[Vec2,Vec2,Vec2,Vec2];
/** A contour point no part has placed (none in 33..111 today): (0, 0), as the contour's points started; never written. */
const ORIGIN:Readonly<Vec2>=[0,0];
function bezier(c:Cubic,t:number):Vec2{const s=1-t,a=s*s*s,b=3*s*s*t,d=3*s*t*t,e=t*t*t,p=c[0],q=c[1],r=c[2],w=c[3];return [(p[0]*a+q[0]*b)+(r[0]*d+w[0]*e),(p[1]*a+q[1]*b)+(r[1]*d+w[1]*e)];}
function derivative(c:Cubic,t:number):Vec2{const s=1-t,a=s*s,b=2*s*t,d=t*t,p=c[0],q=c[1],r=c[2],w=c[3];return [((q[0]-p[0])*a+(r[0]-q[0])*b+(w[0]-r[0])*d)*3,((q[1]-p[1])*a+(r[1]-q[1])*b+(w[1]-r[1])*d)*3];}
const at=(p:Float32Array,i:number):Vec2=>[p[2*i],p[2*i+1]];
export function boundedCParameters(profile:Float32Array,authoredTD:number,tau:number):BoundedCParameters{return {crest:at(profile,32),toe:at(profile,112),incoming:sub(at(profile,32),at(profile,31)),outgoing:sub(at(profile,113),at(profile,112)),authoredTD,tau};}
export function blendBoundedCParameters(a:BoundedCParameters,b:BoundedCParameters,w:number):BoundedCParameters{return {crest:round(mix(a.crest,b.crest,w)),toe:round(mix(a.toe,b.toe,w)),incoming:round(mix(a.incoming,b.incoming,w)),outgoing:round(mix(a.outgoing,b.outgoing,w)),authoredTD:a.authoredTD+w*(b.authoredTD-a.authoredTD),tau:a.tau+w*(b.tau-a.tau),leafWidthDelta:(a.leafWidthDelta??0)+w*((b.leafWidthDelta??0)-(a.leafWidthDelta??0))};}
/** Identity core with a C1 shoulder in the requested correction; the bound is the available leaf-reach room. */
export function boundedLeafWidthDelta(delta:number,budget:number):number{
 if(!Number.isFinite(delta)||!Number.isFinite(budget)||!(budget>0))throw Error('invalid leaf reach correction');
 const magnitude=Math.abs(delta),core=.6*budget;
 if(magnitude<=core)return delta;
 // Dimensional arithmetic avoids overflowing delta/budget for huge finite requests.
 // The shoulder joins with unit derivative and approaches the same budget; floating-point
 // rounding may reach that bound for extreme ratios. Guard its separately rounded terms
 // against an upward ULP overshoot. This scalar C1 map is not a C1 trajectory.
 const shoulder=.4*budget,excess=magnitude-core;
 return Math.sign(delta)*Math.min(budget,core+shoulder*(excess/(shoulder+excess)));
}
function ordinary(z:BoundedCParameters){
 const A=z.crest,Toe=z.toe,ct=unit(z.incoming),tt=unit(z.outgoing),W=Toe[0]-A[0],H=A[1]-Toe[1];
 if(W<=0||H<=0||ct[0]<=0||tt[0]<=0||z.authoredTD<=0)throw Error('invalid crest/toe domain');
 const chord=norm(sub(Toe,A)),ha=Math.min(chord/3,W/(3*ct[0])),ht=Math.min(chord/3,W/(3*tt[0]));
 const base:Cubic=[A,add(A,mul(ct,ha)),sub(Toe,mul(tt,ht)),Toe],K0=bezier(base,.5),d0=unit(derivative(base,.5));
 // A fully formed airborne leaf drops between minimumLeafHeight and H before its cap reaches the floor.
 // Use the maximum height in the width-squared bound and the minimum in the height-squared bound.
 const minimumLeafHeight=(1-LIP_OPEN_HEIGHT)*H;
 const B=Math.min(.06*H,W/16,.1*Math.min((.85*W)**2/H,minimumLeafHeight**2/(.85*W)));
 // The existing curvature budget assumes a leaf at least .85W from the crest. Its unadjusted reach
 // is .98W-2B; reserve that domain as well as the toe-side thickness room (B<=W/16 keeps this positive).
 const reachBudget=Math.min(B,(.98-.85)*W-2*B),leafWidthDelta=boundedLeafWidthDelta(z.leafWidthDelta??0,reachBudget);
 return {A,Toe,ct,tt,W,H,base,K0,d0,ha0:ha/2,he0:norm(derivative(base,.5))/6,ht0:ht/2,B,leafWidthDelta};
}
type Ordinary=ReturnType<typeof ordinary>;
function roof(o:Ordinary,g:number,s:number,T:number,post?:Vec2,remaining=1){
 const {A,Toe,W,H}=o,angle0=Math.atan2(o.d0[1],o.d0[0]),angle=post?-Math.PI/2*remaining:(1-g)*angle0-g*Math.PI/2,v:Vec2=[Math.cos(angle),Math.sin(angle)];
 // Only the leaf reach changes. The root and floor are rebuilt below and still end at the original physical Toe.
 // C1 saturation in delta is not a C1 cap trajectory: raw carrier width/tangents can retain derivative kinks.
 const L:Vec2=[Toe[0]-2*o.B-.02*W+o.leafWidthDelta,Toe[1]+LIP_OPEN_HEIGHT*H-LIP_FALL_HEIGHT*H*s];let K=mix(o.K0,L,g);
 function controls(K:Vec2):Cubic{
  const width=K[0]-A[0],height=A[1]-K[1];if(width<=0||height<=0)throw Error('nonpositive leaf domain');
  let hs=(1-g)*o.ha0+g*KAPPA*width,he=(1-g)*o.he0+g*KAPPA*height;const advance=hs*o.ct[0]+he*Math.max(0,v[0]);
  if(advance>.85*width){hs*=.85*width/advance;he*=.85*width/advance;}
  return [A,add(A,mul(o.ct,hs)),sub(K,mul(v,he)),K];
 }
 if(post){K=add(post,[T/2,T/2]);for(let i=0;i<16;i++){const c=controls(K),prev=round(bezier(c,27/28)),last=unit(sub(K,prev)),n:Vec2=[-last[1],last[0]];K=add(add(post,[0,T/2]),mul(n,T/2));}}
 const c=controls(K),P:Vec2[]=[A];for(let i=1;i<28;i++)P.push(round(bezier(c,i/28)));P.push(K);
 const last=unit(sub(P[28],P[27])),n:Vec2=[-last[1],last[0]];return {P,c,last,n};
}
const eventCache = new Map<string, { seal: number; cap: Vec2; fraction: number }>();
function event(o:Ordinary){
 const key=[...o.A,...o.Toe,...o.ct,...o.tt,o.leafWidthDelta].join(',');const cached=eventCache.get(key);if(cached)return cached;
 const gap=(s:number)=>{const {P,n}=roof(o,1,s,o.B);return P[28][1]-o.B/2*(1+n[1])-o.Toe[1];};
 if(gap(0)<=0||gap(1)>=0)throw Error('impact not bracketed');let lo=0,hi=1;
 for(let i=0;i<32;i++){const m=(lo+hi)/2;if(gap(m)>0)lo=m;else hi=m;}
 const seal=(lo+hi)/2,{P,n}=roof(o,1,seal,o.B),cap=round([P[28][0]-o.B/2*n[0],o.Toe[1]]);lo=0;hi=1;
 for(let i=0;i<32;i++){const m=(lo+hi)/2;if(smooth(m)<seal)lo=m;else hi=m;}
 const result={seal,cap,fraction:(lo+hi)/2};if(eventCache.size>=128)eventCache.delete(eventCache.keys().next().value!);eventCache.set(key,result);return result;
}
function tail(A:Vec2,B:Vec2,u:Vec2,v:Vec2,h0=norm(sub(B,A))/3,h1=norm(sub(B,A))/3):Cubic{
 const dx=B[0]-A[0];if(dx<0)throw Error('backward tail');if(u[0]>0)h0=Math.min(h0,dx/(3*u[0]));if(v[0]>0)h1=Math.min(h1,dx/(3*v[0]));return [A,add(A,mul(u,h0)),sub(B,mul(v,h1)),B];
}
function arcSample(points:Vec2[],count:number):Vec2[]{
 const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+norm(sub(points[i],points[i-1])));
 const total=lengths.at(-1)!;const out:Vec2[]=[];let j=0;
 for(let i=0;i<=count;i++){const d=total*i/count;while(j+1<lengths.length-1&&lengths[j+1]<d)j++;const span=lengths[j+1]-lengths[j];out.push(span?mix(points[j],points[j+1],(d-lengths[j])/span):points[j]);}return out;
}
/** Whether an arc from r0 turning through `span` holds the direction (rad0, rad1): its angle from r0 by atan2, in [0, 2π). */
function withinSpan(rad0:number,rad1:number,r0:Vec2,span:number):boolean{
 let a=Math.atan2(r0[0]*rad1-r0[1]*rad0,r0[0]*rad0+r0[1]*rad1);if(a<0)a+=2*Math.PI;return a<=span+1e-12||Math.abs(a-2*Math.PI)<1e-12;
}
/** The distance along the ray from O in direction (d0, d1) to segment PQ (Infinity if it misses), on scalars. */
function raySegmentAt(O:Vec2,d0:number,d1:number,P:Vec2,Q:Vec2):number{
 const e0=Q[0]-P[0],e1=Q[1]-P[1],den=d0*e1-d1*e0;if(Math.abs(den)<1e-18)return Infinity;const a0=P[0]-O[0],a1=P[1]-O[1],r=(a0*e1-a1*e0)/den,t=(a0*d1-a1*d0)/den;return r>0&&t>=0&&t<=1?r:Infinity;
}
/**
 * The smallest R at which the arc O + c·R + R·(r0 turned by up to `span`) touches segment PQ (Infinity if none): its
 * endpoints on the circle, the circle tangent to the segment's line, and the arc's two end rays. The same operations,
 * in the same order, as the vector form it replaces, on scalars (no arrays: the M1 CPU study, 2026-10-19). Exported for
 * its exactness test.
 */
export function arcBound(O:Vec2,c:Vec2,r0:Vec2,span:number,P:Vec2,Q:Vec2):number{
 if(!span)return Infinity;
 const c0=c[0],c1=c[1],e0=Q[0]-P[0],e1=Q[1]-P[1],ee=e0*e0+e1*e1,qa=c0*c0+c1*c1-1;let best=Infinity;
 for(let end=0;end<2;end++){
  const X=end===0?P:Q,x0=X[0]-O[0],x1=X[1]-O[1],qb=-2*(c0*x0+c1*x1),qc=x0*x0+x1*x1;
  // The circle's radii through X: qa·R² + qb·R + qc = 0's positive roots, (−qb − √disc)/2qa first.
  if(Math.abs(qa)<1e-18){
   if(Math.abs(qb)>1e-18&&-qc/qb>0){const R=-qc/qb,inv=1/R;if(withinSpan(x0*inv-c0,x1*inv-c1,r0,span))best=Math.min(best,R);}
  }else{
   const disc=qb*qb-4*qa*qc;
   if(!(disc<0)){
    const d=Math.sqrt(disc),first=(-qb-d)/(2*qa),second=(-qb+d)/(2*qa);
    if(first>0){const inv=1/first;if(withinSpan(x0*inv-c0,x1*inv-c1,r0,span))best=Math.min(best,first);}
    if(second>0){const inv=1/second;if(withinSpan(x0*inv-c0,x1*inv-c1,r0,span))best=Math.min(best,second);}
   }
  }
 }
 if(ee>0){
  const s=1/Math.sqrt(ee),n0=-e1*s,n1=e0*s,d=n0*(O[0]-P[0])+n1*(O[1]-P[1]),nc=n0*c0+n1*c1;
  for(let sign=-1;sign<=1;sign+=2){
   const den=nc-sign;
   if(Math.abs(den)>1e-18){
    const R=-d/den;
    if(R>0){
     const k0=O[0]+c0*R,k1=O[1]+c1*R,sR=sign*R,X0=k0-n0*sR,X1=k1-n1*sR,t=((X0-P[0])*e0+(X1-P[1])*e1)/ee;
     if(t>=0&&t<=1){const inv=1/R;if(withinSpan((X0-k0)*inv,(X1-k1)*inv,r0,span))best=Math.min(best,R);}
    }
   }
  }
 }
 best=Math.min(best,raySegmentAt(O,c0+r0[0],c1+r0[1],P,Q));
 const cs=Math.cos(span),sn=Math.sin(span),t0=r0[0]*cs-r0[1]*sn,t1=r0[0]*sn+r0[1]*cs;
 return Math.min(best,raySegmentAt(O,c0+t0,c1+t1,P,Q));
}
/** The smallest R at which the root's face, from J along dU and from O along cV, meets segment PQ; on scalars (the M1 CPU study). */
function faceBound(J:Vec2,O:Vec2,dU:Vec2,cV:Vec2,P:Vec2,Q:Vec2):number{
 let best=Math.min(raySegmentAt(J,dU[0],dU[1],P,Q),raySegmentAt(O,cV[0],cV[1],P,Q));
 if(Math.abs(dU[0])>1e-18)for(let end=0;end<2;end++){const X=end===0?P:Q,R=(X[0]-J[0])/dU[0];if(R>0){const up=J[1]+dU[1]*R,down=O[1]+cV[1]*R;if(down<=X[1]&&X[1]<=up)best=Math.min(best,R);}}
 return best;
}
function root(J:Vec2,vr:Vec2,angle:number,qC:number,yC:number,T:number,P:Vec2[],V:Vec2[],bulk:Float32Array,sharedCrest?:number,preservedCarrierStart=0){
 const slope=Math.tan(angle),u=mul(vr,-1);let beta=Math.atan2(u[1],u[0]);if(beta<0)beta+=2*Math.PI;const spanU=3*Math.PI/2-beta,spanL=Math.PI/2+angle;
 if(spanU<0||spanL<0)throw Error('root turn domain');const dU:Vec2=[Math.sin(3*Math.PI/2)-Math.sin(beta),-Math.cos(3*Math.PI/2)+Math.cos(beta)],dL:Vec2=[Math.sin(2*Math.PI+angle)+1,-Math.cos(2*Math.PI+angle)],N=J[1]-yC-slope*(J[0]-qC),coef=dU[1]+dL[1]-slope*(dU[0]+dL[0]),O=add(J,[0,-N]),cU:Vec2=[-u[1],u[0]],cV=add(dU,[0,-coef]),cL=add(cV,[1,0]);
 if(N<=0)throw Error('nonpositive root depth');let R=Math.min(4*T,coef<0?N/-coef:Infinity);
 const domainReach=1+Math.sin(beta),domainRadius=sharedCrest!==undefined&&domainReach>0?(J[0]-sharedCrest)/domainReach:Infinity;
 R=Math.min(R,domainRadius);
 // Each guard segment, the sheet's underside then the carrier's, in two reused ends (the bounds only read them), in order.
 const a:Vec2=[0,0],b:Vec2=[0,0],turnU=mul(cU,-1),turnL:Vec2=[-1,0],half=T/2;
 for(let i=0;i<28;i++){
  const n0=-V[i][1],n1=V[i][0];a[0]=P[i][0]-n0*half;a[1]=P[i][1]-n1*half;b[0]=P[i+1][0]-n0*half;b[1]=P[i+1][1]-n1*half;
  R=Math.min(R,arcBound(J,cU,turnU,spanU,a,b),arcBound(O,cL,turnL,spanL,a,b),faceBound(J,O,dU,cV,a,b));
 }
 for(let i=preservedCarrierStart;i<32;i++){
  a[0]=bulk[2*i]+0;a[1]=bulk[2*i+1]+(-T/2);b[0]=bulk[2*(i+1)]+0;b[1]=bulk[2*(i+1)+1]+(-T/2);
  R=Math.min(R,arcBound(J,cU,turnU,spanU,a,b),arcBound(O,cL,turnL,spanL,a,b),faceBound(J,O,dU,cV,a,b));
 }
 if(!Number.isFinite(R)||R<T/2)throw Error('root thickness domain');const D=N+R*coef;if(D< -1e-12)throw Error('negative root face');const U=add(J,mul(dU,R));
 // This is the exact endpoint of the selected circle/domain equality, not a post-hoc vertex clamp.
 if(sharedCrest!==undefined&&R===domainRadius)U[0]=sharedCrest;
 const V0=add(U,[0,-D]),E=add(V0,mul(dL,R)),points:Vec2[]=[J];
 for(let i=1;i<=8;i++)points.push(i===8&&sharedCrest!==undefined?U:add(J,mul([Math.sin(beta+spanU*i/8)-Math.sin(beta),-Math.cos(beta+spanU*i/8)+Math.cos(beta)],R)));
 for(let i=1;i<=4;i++)points.push(mix(U,V0,i/4));for(let i=1;i<=4;i++){const a=3*Math.PI/2+spanL*i/4;points.push(add(V0,mul([Math.sin(a)+1,-Math.cos(a)],R)));}return {points,E,R,D,domainRadius};
}
const ulpFloat=new Float32Array(1),ulpBits=new Uint32Array(ulpFloat.buffer);
/** The F32 step above fround(v), on shared scratch (the M1 CPU study, 2026-10-19: two typed arrays a call before). */
export function ulp32(v:number):number{ulpFloat[0]=v;ulpBits[0]++;return ulpFloat[0]-Math.fround(v);}
/** Exact event arithmetic only: clocks do not require the inner sheet, bounded root or floor contour. */
export function boundedCLifecycle(z:BoundedCParameters):BoundedCLifecycle{
 const ev=event(ordinary(z)),TD=z.authoredTD,impact=TD+.3*TD*ev.fraction;
 return {impactEvent:ev,impactTau:impact,retiredTau:impact+.3*TD,fullyFormedTau:.4*TD};
}
/** The same F32 cap64 as the full contour, without constructing its unrelated inner root/floor. */
export function boundedCCap(z:BoundedCParameters,lifecycle?:BoundedCEvent):Vec2{
 const o=ordinary(z),ev=lifecycle??event(o),TD=z.authoredTD,impact=TD+.3*TD*ev.fraction,post=z.tau>=impact;
 const g=smooth(z.tau/(.4*TD)),remaining=post?1-smooth((z.tau-impact)/(.3*TD)):1,s=post?ev.seal:smooth((z.tau-TD)/(.3*TD));
 const ulp=ulp32(Math.max(...z.crest.map(Math.abs),...z.toe.map(Math.abs))),requested=o.B*(post?remaining**2:g*g),loopScale=post?Math.min(remaining*o.W,remaining**2*o.H):Math.min(g*o.W,g*o.H),collapsed=requested<8*ulp||loopScale<=64*ulp,T=collapsed?0:Math.max(requested,8*ulp);
 const {P,last}=roof(o,post?1:g,s,T,post?ev.cap:undefined,remaining);
 if(collapsed)return round(P[28]);
 const n:Vec2=[-last[1],last[0]],centre=sub(P[28],mul(n,T/2));let phi=Math.atan2(-last[1],-n[1]);if(phi<0)phi+=2*Math.PI;if(!(phi>0&&phi<=Math.PI))throw Error('cap minimum domain');
 const a=phi*4/4,cap=add(centre,mul(add(mul(n,Math.cos(a)),mul(last,Math.sin(a))),T/2));
 return round(post?ev.cap:cap);
}
/** Writes only owned33..111. Domain failures throw; caller may explicitly choose raw library mode, never silently fall back. */
export function sampleBoundedC(z:BoundedCParameters,profile:Float32Array,velocity=true, lifecycle?:BoundedCEvent,sharedRootDomain=false,preservedCarrierStart=0):BoundedCMetadata{
 const o=ordinary(z),ev=lifecycle ?? event(o),TD=z.authoredTD,impact=TD+.3*TD*ev.fraction,retired=impact+.3*TD,post=z.tau>=impact;
 const g=smooth(z.tau/(.4*TD)),remaining=post?1-smooth((z.tau-impact)/(.3*TD)):1,s=post?ev.seal:smooth((z.tau-TD)/(.3*TD));
 const ulp=ulp32(Math.max(...z.crest.map(Math.abs),...z.toe.map(Math.abs))),requested=o.B*(post?remaining**2:g*g),loopScale=post?Math.min(remaining*o.W,remaining**2*o.H):Math.min(g*o.W,g*o.H),collapsed=requested<8*ulp||loopScale<=64*ulp,activeG=g,activeRemain=remaining,T=collapsed?0:Math.max(requested,8*ulp);
 const {P,c:currentRoof,last}=roof(o,post?1:activeG,s,T,post?ev.cap:undefined,activeRemain),target:Vec2[]=new Array(113);for(let i=0;i<=28;i++)target[32+i]=P[i];let R=0,D=0,envelopeBound=0,connectorLength=0,domainRadius:number|undefined;const envelopeBudget=.001*Math.max(o.W,o.H);
 if(collapsed){
  const K=P[28],angle=post?0:(1-g)*Math.atan2(o.d0[1],o.d0[0]),pv:Vec2=[Math.cos(angle),Math.sin(angle)],slope=Math.tan(angle),yC=post?o.Toe[1]:(1-g)*o.K0[1]+g*o.Toe[1],C:Vec2=[K[0],yC];
  if(C[1]>K[1])throw Error('zero sheet connector not descending');
  const chord=norm(sub(o.Toe,C)),h0=(1-g)*o.he0+g*chord/3,h1=(1-g)*o.ht0+g*chord/3,fc=tail(C,o.Toe,pv,o.tt,h0,h1);connectorLength=K[1]-C[1];
  for(let i=61;i<=68;i++)target[i]=K;
  // Literal commonX and scalar difference preserve exact collapsed limits at F32 ties.
  for(let i=69;i<=106;i++)target[i]=[K[0],K[1]+(C[1]-K[1])*(i-68)/38];
  for(let i=107;i<=112;i++)target[i]=bezier(fc,(i-106)/6);
  const referenceT=Math.max(requested,8*ulp),reference=post?roof(o,1,s,referenceT,ev.cap,remaining):{P,c:currentRoof},qC=reference.P[28][0]-referenceT/2,F1:Vec2=[qC+referenceT,yC+slope*referenceT],refChord=norm(sub(o.Toe,F1)),refFloor=tail(F1,o.Toe,pv,o.tt,(1-g)*o.he0+g*refChord/3,(1-g)*o.ht0+g*refChord/3);
  envelopeBound=Math.max(...currentRoof.map((p,i)=>norm(sub(p,reference.c[i]))),...fc.map((p,i)=>norm(sub(p,refFloor[i]))));
  if(requested>0&&envelopeBound>envelopeBudget)throw Error('precision collapse spatial budget');
 }else{
  const V=P.slice(1).map((b,i)=>unit(sub(b,P[i]))),N:Vec2[]=V.map(v=>[-v[1],v[0]]),offset:Vec2[]=[mul(N[0],-1)];for(let i=1;i<28;i++){const den=1+dot(N[i-1],N[i]);if(den<=0)throw Error('opposite normals');offset.push(mul(add(N[i-1],N[i]),-1/den));}offset.push(mul(N[27],-1));const Q=P.map((p,i)=>add(p,mul(offset[i],T)));
  for(let i=0;i<28;i++){if(norm(sub(Q[i+1],Q[i]))/norm(sub(P[i+1],P[i]))<.75)throw Error('offset curvature budget');if(Q[i+1][0]<=Q[i][0])throw Error('backward offset sheet');}
  const factor=post?activeRemain:activeG,qJ=(1-factor)*Q[28][0]+factor*(o.A[0]+.28*o.W);if(!(Q[0][0]<=qJ&&qJ<Q[28][0]))throw Error('root cut outside sheet');let e=0;while(!(Q[e][0]<=qJ&&qJ<=Q[e+1][0]))e++;
  const J=mix(Q[e],Q[e+1],(qJ-Q[e][0])/(Q[e+1][0]-Q[e][0])),chain=[Q[28]];for(let i=27;i>e;i--)chain.push(Q[i]);chain.push(J);const inner=arcSample(chain,12),centre=sub(P[28],mul(N[27],T/2));let phi=Math.atan2(-V[27][1],-N[27][1]);if(phi<0)phi+=2*Math.PI;if(!(phi>0&&phi<=Math.PI))throw Error('cap minimum domain');
  for(let i=61;i<=68;i++){const a=i<=64?phi*(i-60)/4:phi+(Math.PI-phi)*(i-64)/4;target[i]=add(centre,mul(add(mul(N[27],Math.cos(a)),mul(V[27],Math.sin(a))),T/2));}target[68]=Q[28];if(post)target[64]=ev.cap;for(let i=69;i<=80;i++)target[i]=inner[i-68];
  const angle=post?0:(1-activeG)*Math.atan2(o.d0[1],o.d0[0]),pv:Vec2=[Math.cos(angle),Math.sin(angle)],slope=pv[1]/pv[0],qC=P[28][0]-T/2,yC=post?o.Toe[1]:(1-activeG)*o.K0[1]+activeG*o.Toe[1],rr=root(J,V[e],angle,qC,yC,T,P,V,profile,sharedRootDomain?o.A[0]:undefined,preservedCarrierStart);R=rr.R;D=rr.D;if(sharedRootDomain)domainRadius=rr.domainRadius;for(let i=0;i<=16;i++)target[80+i]=rr.points[i];
  const F0:Vec2=[qC-T,yC-slope*T],F1:Vec2=[qC+T,yC+slope*T];if(!(rr.E[0]<=F0[0]&&F0[0]<F1[0]&&F1[0]<o.Toe[0]))throw Error('floor plateau domain');const chord=norm(sub(o.Toe,F1)),h0=(1-activeG)*o.he0+activeG*chord/3,h1=(1-activeG)*o.ht0+activeG*chord/3,fc=tail(F1,o.Toe,pv,o.tt,h0,h1);
  for(let i=97;i<=102;i++)target[i]=mix(rr.E,F0,(i-96)/6);for(let i=103;i<=106;i++)target[i]=mix(F0,F1,(i-102)/4);for(let i=107;i<=112;i++)target[i]=bezier(fc,(i-106)/6);
 }
 for(let i=33;i<112;i++){const point=target[i]??ORIGIN;profile[2*i]=point[0];profile[2*i+1]=point[1];if(!Number.isFinite(profile[2*i]+profile[2*i+1]))throw Error('nonfinite profile');}
 const cap=at(profile,64),flow=Math.sqrt(2*o.H),meta:BoundedCMetadata={model:'bounded-analytic-C/v4',impactEvent:ev,lengthScale:1,timeScale:1,formation:g,remaining,seal:s,authoredSealTau:TD,impactTau:impact,retiredTau:retired,fullyFormedTau:.4*TD,sheetExists:!collapsed,precisionCollapsed:collapsed&&requested>0,thickness:T,requestedThickness:requested,cap,impactCap:ev.cap,rootRadius:R,rootVerticalLeg:D,precisionEnvelopeBound:envelopeBound,precisionEnvelopeBudget:envelopeBudget,collapsedConnectorLength:connectorLength,capBoundaryVelocity:[0,0],fluidAlong:post?0:last[0]*flow,fluidUp:post?-flow:last[1]*flow,partRanges:{outer:[32,60],cap:[60,68],inner:[68,80],upperRoot:[80,88],face:[88,92],lowerRoot:[92,96],floor:[96,112]}};
 meta.rootRadiusMaximumFromSheetDomain=domainRadius;
 if(velocity){const dt=1e-5*TD,a=profile.slice(),b=profile.slice();sampleBoundedC({...z,tau:z.tau-dt},a,false,lifecycle,sharedRootDomain,preservedCarrierStart);sampleBoundedC({...z,tau:z.tau+dt},b,false,lifecycle,sharedRootDomain,preservedCarrierStart);meta.capBoundaryVelocity=[(b[128]-a[128])/(2*dt),(b[129]-a[129])/(2*dt)];}
 return meta;
}
