/** Experimental parameter-first C-profile. Coefficients mirror frozen offline geometry; precision-v4 retains separate current roof/floor controls. */
export type Vec2 = [number, number];
export interface BoundedCParameters { crest: Vec2; toe: Vec2; incoming: Vec2; outgoing: Vec2; authoredTD: number; tau: number }
export interface BoundedCEvent { seal: number; cap: Vec2; fraction: number }
export interface BoundedCMetadata {
  /** Isolated new polygon sampling experiment; current v4 controls are unchanged. */
  sharedUpperRoot?: import('./sharedUpperRoot').SharedUpperRoot;
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
const add=(a:Vec2,b:Vec2):Vec2=>[a[0]+b[0],a[1]+b[1]];
const sub=(a:Vec2,b:Vec2):Vec2=>[a[0]-b[0],a[1]-b[1]];
const mul=(a:Vec2,b:number):Vec2=>[a[0]*b,a[1]*b];
const dot=(a:Vec2,b:Vec2)=>a[0]*b[0]+a[1]*b[1];
const cross=(a:Vec2,b:Vec2)=>a[0]*b[1]-a[1]*b[0];
const norm=(a:Vec2)=>Math.hypot(...a);
const unit=(a:Vec2):Vec2=>{const n=norm(a);if(!n)throw Error('zero tangent');return mul(a,1/n);};
const mix=(a:Vec2,b:Vec2,t:number):Vec2=>add(mul(a,1-t),mul(b,t));
const round=(a:Vec2):Vec2=>[Math.fround(a[0]),Math.fround(a[1])];
const smooth=(x:number)=>{x=Math.min(1,Math.max(0,x));return x*x*(3-2*x);};
type Cubic=[Vec2,Vec2,Vec2,Vec2];
function bezier(c:Cubic,t:number):Vec2{const s=1-t;return add(add(mul(c[0],s*s*s),mul(c[1],3*s*s*t)),add(mul(c[2],3*s*t*t),mul(c[3],t*t*t)));}
function derivative(c:Cubic,t:number):Vec2{const s=1-t;return mul(add(add(mul(sub(c[1],c[0]),s*s),mul(sub(c[2],c[1]),2*s*t)),mul(sub(c[3],c[2]),t*t)),3);}
const at=(p:Float32Array,i:number):Vec2=>[p[2*i],p[2*i+1]];
export function boundedCParameters(profile:Float32Array,authoredTD:number,tau:number):BoundedCParameters{return {crest:at(profile,32),toe:at(profile,112),incoming:sub(at(profile,32),at(profile,31)),outgoing:sub(at(profile,113),at(profile,112)),authoredTD,tau};}
export function blendBoundedCParameters(a:BoundedCParameters,b:BoundedCParameters,w:number):BoundedCParameters{return {crest:round(mix(a.crest,b.crest,w)),toe:round(mix(a.toe,b.toe,w)),incoming:round(mix(a.incoming,b.incoming,w)),outgoing:round(mix(a.outgoing,b.outgoing,w)),authoredTD:a.authoredTD+w*(b.authoredTD-a.authoredTD),tau:a.tau+w*(b.tau-a.tau)};}
function ordinary(z:BoundedCParameters){
 const A=z.crest,Toe=z.toe,ct=unit(z.incoming),tt=unit(z.outgoing),W=Toe[0]-A[0],H=A[1]-Toe[1];
 if(W<=0||H<=0||ct[0]<=0||tt[0]<=0||z.authoredTD<=0)throw Error('invalid crest/toe domain');
 const chord=norm(sub(Toe,A)),ha=Math.min(chord/3,W/(3*ct[0])),ht=Math.min(chord/3,W/(3*tt[0]));
 const base:Cubic=[A,add(A,mul(ct,ha)),sub(Toe,mul(tt,ht)),Toe],K0=bezier(base,.5),d0=unit(derivative(base,.5));
 const B=Math.min(.06*H,W/16,.1*Math.min((.85*W)**2/(.88*H),(.88*H)**2/(.85*W)));
 return {A,Toe,ct,tt,W,H,base,K0,d0,ha0:ha/2,he0:norm(derivative(base,.5))/6,ht0:ht/2,B};
}
type Ordinary=ReturnType<typeof ordinary>;
function roof(o:Ordinary,g:number,s:number,T:number,post?:Vec2,remaining=1){
 const {A,Toe,W,H}=o,angle0=Math.atan2(o.d0[1],o.d0[0]),angle=post?-Math.PI/2*remaining:(1-g)*angle0-g*Math.PI/2,v:Vec2=[Math.cos(angle),Math.sin(angle)];
 const L:Vec2=[Toe[0]-2*o.B-.02*W,Toe[1]+.12*H-.18*H*s];let K=mix(o.K0,L,g);
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
 const key=[...o.A,...o.Toe,...o.ct,...o.tt].join(',');const cached=eventCache.get(key);if(cached)return cached;
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
function raySegment(O:Vec2,d:Vec2,P:Vec2,Q:Vec2):number{
 const e=sub(Q,P),den=cross(d,e);if(Math.abs(den)<1e-18)return Infinity;const a=sub(P,O),r=cross(a,e)/den,t=cross(a,d)/den;return r>0&&t>=0&&t<=1?r:Infinity;
}
function roots(a:number,b:number,c:number):number[]{
 if(Math.abs(a)<1e-18)return Math.abs(b)>1e-18&&-c/b>0?[-c/b]:[];const disc=b*b-4*a*c;if(disc<0)return [];const d=Math.sqrt(disc);return [(-b-d)/(2*a),(-b+d)/(2*a)].filter(r=>r>0);
}
function rotate(a:Vec2,t:number):Vec2{return [a[0]*Math.cos(t)-a[1]*Math.sin(t),a[0]*Math.sin(t)+a[1]*Math.cos(t)];}
function angleWithin(rad:Vec2,r0:Vec2,span:number):boolean{let a=Math.atan2(cross(r0,rad),dot(r0,rad));if(a<0)a+=2*Math.PI;return a<=span+1e-12||Math.abs(a-2*Math.PI)<1e-12;}
function arcBound(O:Vec2,c:Vec2,r0:Vec2,span:number,P:Vec2,Q:Vec2):number{
 if(!span)return Infinity;const candidates:number[]=[],e=sub(Q,P),ee=dot(e,e);
 for(const X of [P,Q]){const x=sub(X,O);for(const R of roots(dot(c,c)-1,-2*dot(c,x),dot(x,x)))if(angleWithin(sub(mul(x,1/R),c),r0,span))candidates.push(R);}
 if(ee>0){const n=mul([-e[1],e[0]],1/Math.sqrt(ee)),d=dot(n,sub(O,P)),nc=dot(n,c);for(const sign of [-1,1]){const den=nc-sign;if(Math.abs(den)>1e-18){const R=-d/den;if(R>0){const centre=add(O,mul(c,R)),X=sub(centre,mul(n,sign*R)),t=dot(sub(X,P),e)/ee;if(t>=0&&t<=1&&angleWithin(mul(sub(X,centre),1/R),r0,span))candidates.push(R);}}}}
 for(const rad of [r0,rotate(r0,span)])candidates.push(raySegment(O,add(c,rad),P,Q));return Math.min(Infinity,...candidates);
}
function faceBound(J:Vec2,O:Vec2,dU:Vec2,cV:Vec2,P:Vec2,Q:Vec2):number{
 const candidates=[raySegment(J,dU,P,Q),raySegment(O,cV,P,Q)];if(Math.abs(dU[0])>1e-18)for(const X of [P,Q]){const R=(X[0]-J[0])/dU[0];if(R>0){const U=add(J,mul(dU,R)),V=add(O,mul(cV,R));if(V[1]<=X[1]&&X[1]<=U[1])candidates.push(R);}}return Math.min(...candidates);
}
function root(J:Vec2,vr:Vec2,angle:number,qC:number,yC:number,T:number,P:Vec2[],V:Vec2[],bulk:Float32Array,sharedCrest?:number){
 const slope=Math.tan(angle),u=mul(vr,-1);let beta=Math.atan2(u[1],u[0]);if(beta<0)beta+=2*Math.PI;const spanU=3*Math.PI/2-beta,spanL=Math.PI/2+angle;
 if(spanU<0||spanL<0)throw Error('root turn domain');const dU:Vec2=[Math.sin(3*Math.PI/2)-Math.sin(beta),-Math.cos(3*Math.PI/2)+Math.cos(beta)],dL:Vec2=[Math.sin(2*Math.PI+angle)+1,-Math.cos(2*Math.PI+angle)],N=J[1]-yC-slope*(J[0]-qC),coef=dU[1]+dL[1]-slope*(dU[0]+dL[0]),O=add(J,[0,-N]),cU:Vec2=[-u[1],u[0]],cV=add(dU,[0,-coef]),cL=add(cV,[1,0]);
 if(N<=0)throw Error('nonpositive root depth');let R=Math.min(4*T,coef<0?N/-coef:Infinity);
 const domainReach=1+Math.sin(beta),domainRadius=sharedCrest!==undefined&&domainReach>0?(J[0]-sharedCrest)/domainReach:Infinity;
 R=Math.min(R,domainRadius);
 const guards:[Vec2,Vec2][]=[];for(let i=0;i<28;i++){const n:Vec2=[-V[i][1],V[i][0]];guards.push([sub(P[i],mul(n,T/2)),sub(P[i+1],mul(n,T/2))]);}
 for(let i=0;i<32;i++)guards.push([add(at(bulk,i),[0,-T/2]),add(at(bulk,i+1),[0,-T/2])]);
 for(const [a,b] of guards)R=Math.min(R,arcBound(J,cU,mul(cU,-1),spanU,a,b),arcBound(O,cL,[-1,0],spanL,a,b),faceBound(J,O,dU,cV,a,b));
 if(!Number.isFinite(R)||R<T/2)throw Error('root thickness domain');const D=N+R*coef;if(D< -1e-12)throw Error('negative root face');const U=add(J,mul(dU,R));
 // This is the exact endpoint of the selected circle/domain equality, not a post-hoc vertex clamp.
 if(sharedCrest!==undefined&&R===domainRadius)U[0]=sharedCrest;
 const V0=add(U,[0,-D]),E=add(V0,mul(dL,R)),points:Vec2[]=[J];
 for(let i=1;i<=8;i++)points.push(i===8&&sharedCrest!==undefined?U:add(J,mul([Math.sin(beta+spanU*i/8)-Math.sin(beta),-Math.cos(beta+spanU*i/8)+Math.cos(beta)],R)));
 for(let i=1;i<=4;i++)points.push(mix(U,V0,i/4));for(let i=1;i<=4;i++){const a=3*Math.PI/2+spanL*i/4;points.push(add(V0,mul([Math.sin(a)+1,-Math.cos(a)],R)));}return {points,E,R,D,domainRadius};
}
export function ulp32(v:number):number{const f=new Float32Array([v]),u=new Uint32Array(f.buffer);u[0]++;return f[0]-Math.fround(v);}
/** Writes only owned33..111. Domain failures throw; caller may explicitly choose raw library mode, never silently fall back. */
export function sampleBoundedC(z:BoundedCParameters,profile:Float32Array,velocity=true, lifecycle?:BoundedCEvent,sharedRootDomain=false):BoundedCMetadata{
 const o=ordinary(z),ev=lifecycle ?? event(o),TD=z.authoredTD,impact=TD+.3*TD*ev.fraction,retired=impact+.3*TD,post=z.tau>=impact;
 const g=smooth(z.tau/(.4*TD)),remaining=post?1-smooth((z.tau-impact)/(.3*TD)):1,s=post?ev.seal:smooth((z.tau-TD)/(.3*TD));
 const ulp=ulp32(Math.max(...z.crest.map(Math.abs),...z.toe.map(Math.abs))),requested=o.B*(post?remaining**2:g*g),loopScale=post?Math.min(remaining*o.W,remaining**2*o.H):Math.min(g*o.W,g*o.H),collapsed=requested<8*ulp||loopScale<=64*ulp,activeG=g,activeRemain=remaining,T=collapsed?0:Math.max(requested,8*ulp);
 const {P,c:currentRoof,last}=roof(o,post?1:activeG,s,T,post?ev.cap:undefined,activeRemain),target:Vec2[]=Array.from({length:113},()=>[0,0]);for(let i=0;i<=28;i++)target[32+i]=P[i];let R=0,D=0,envelopeBound=0,connectorLength=0,domainRadius:number|undefined;const envelopeBudget=.001*Math.max(o.W,o.H);
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
  const angle=post?0:(1-activeG)*Math.atan2(o.d0[1],o.d0[0]),pv:Vec2=[Math.cos(angle),Math.sin(angle)],slope=pv[1]/pv[0],qC=P[28][0]-T/2,yC=post?o.Toe[1]:(1-activeG)*o.K0[1]+activeG*o.Toe[1],rr=root(J,V[e],angle,qC,yC,T,P,V,profile,sharedRootDomain?o.A[0]:undefined);R=rr.R;D=rr.D;if(sharedRootDomain)domainRadius=rr.domainRadius;for(let i=0;i<=16;i++)target[80+i]=rr.points[i];
  const F0:Vec2=[qC-T,yC-slope*T],F1:Vec2=[qC+T,yC+slope*T];if(!(rr.E[0]<=F0[0]&&F0[0]<F1[0]&&F1[0]<o.Toe[0]))throw Error('floor plateau domain');const chord=norm(sub(o.Toe,F1)),h0=(1-activeG)*o.he0+activeG*chord/3,h1=(1-activeG)*o.ht0+activeG*chord/3,fc=tail(F1,o.Toe,pv,o.tt,h0,h1);
  for(let i=97;i<=102;i++)target[i]=mix(rr.E,F0,(i-96)/6);for(let i=103;i<=106;i++)target[i]=mix(F0,F1,(i-102)/4);for(let i=107;i<=112;i++)target[i]=bezier(fc,(i-106)/6);
 }
 for(let i=33;i<112;i++){profile[2*i]=target[i][0];profile[2*i+1]=target[i][1];if(!Number.isFinite(profile[2*i]+profile[2*i+1]))throw Error('nonfinite profile');}
 const cap=at(profile,64),flow=Math.sqrt(2*o.H),meta:BoundedCMetadata={model:'bounded-analytic-C/v4',impactEvent:ev,lengthScale:1,timeScale:1,formation:g,remaining,seal:s,authoredSealTau:TD,impactTau:impact,retiredTau:retired,fullyFormedTau:.4*TD,sheetExists:!collapsed,precisionCollapsed:collapsed&&requested>0,thickness:T,requestedThickness:requested,cap,impactCap:ev.cap,rootRadius:R,rootVerticalLeg:D,precisionEnvelopeBound:envelopeBound,precisionEnvelopeBudget:envelopeBudget,collapsedConnectorLength:connectorLength,capBoundaryVelocity:[0,0],fluidAlong:post?0:last[0]*flow,fluidUp:post?-flow:last[1]*flow,partRanges:{outer:[32,60],cap:[60,68],inner:[68,80],upperRoot:[80,88],face:[88,92],lowerRoot:[92,96],floor:[96,112]}};
 meta.rootRadiusMaximumFromSheetDomain=domainRadius;
 if(velocity){const dt=1e-5*TD,a=profile.slice(),b=profile.slice();sampleBoundedC({...z,tau:z.tau-dt},a,false,lifecycle,sharedRootDomain);sampleBoundedC({...z,tau:z.tau+dt},b,false,lifecycle,sharedRootDomain);meta.capBoundaryVelocity=[(b[128]-a[128])/(2*dt),(b[129]-a[129])/(2*dt)];}
 return meta;
}
