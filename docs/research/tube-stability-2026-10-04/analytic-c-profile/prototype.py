"""Frozen low-dimensional analytic C-profile, offline only."""
from pathlib import Path
import copy,importlib.util,math,struct,sys
PREV=Path('/private/tmp/tube-descending-facet-profile-20261004')
sp=importlib.util.spec_from_file_location('frozen_measurements',PREV/'prototype.py');old=importlib.util.module_from_spec(sp);sp.loader.exec_module(old)
F32=old.F32;xy=old.xy;add=old.add;sub=old.sub;mul=old.mul;dot=old.dot;cross=old.cross;norm=old.norm;unit=old.unit;bezier=old.bezier;smoothstep=old.smoothstep;arc_sample=old.arc_sample
receipt=old.receipt;segment_intersections=old.segment_intersections;crossing_changes=old.crossing_changes;turns=old.turns;zero_edges=old.zero_edges;corridor_metrics=old.corridor_metrics;point_segment_distance=old.point_segment_distance
KAPPA=4/3*math.tan(math.pi/8)
def rounded(a):return [F32(v) for v in a]
def mix(a,b,t):return add(mul(a,1-t),mul(b,t))
def derivative(c,t):
 s=1-t;return mul(add(add(mul(sub(c[1],c[0]),s*s),mul(sub(c[2],c[1]),2*s*t)),mul(sub(c[3],c[2]),t*t)),3)
def params(points,td,tau):
 d={p['point']:p for p in points};ct=sub(xy(d[32]),xy(d[31])) if 31 in d else sub(xy(d[33]),xy(d[32]));tt=sub(xy(d[113]),xy(d[112])) if 113 in d else sub(xy(d[112]),xy(d[111]))
 return {'A':xy(d[32]),'T':xy(d[112]),'ct':ct,'tt':tt,'TD':td,'tau':tau,'captureMissingIncoming':31 not in d,'captureMissingOutgoing':113 not in d}
def blend_params(a,b,t):
 return {**a,**{k:rounded(mix(a[k],b[k],t)) for k in ('A','T','ct','tt')},'TD':a['TD']+(b['TD']-a['TD'])*t,'tau':a['tau']+(b['tau']-a['tau'])*t}
def ordinary(z):
 A,T=z['A'],z['T'];ct,tt=unit(z['ct']),unit(z['tt']);W=T[0]-A[0];H=A[1]-T[1]
 if not ct or not tt or W<=0 or H<=0 or ct[0]<=0 or tt[0]<=0 or z['TD']<=0:raise ValueError('invalid_crest_toe_domain_or_forward_tangent')
 chord=norm(sub(T,A));ha=min(chord/3,W/(3*ct[0]));ht=min(chord/3,W/(3*tt[0]));c=[A,add(A,mul(ct,ha)),sub(T,mul(tt,ht)),T];K=bezier(*c,.5);d=unit(derivative(c,.5));B=min(.06*H,W/16,.1*min((.85*W)**2/(.88*H),(.88*H)**2/(.85*W)))
 return {'A':A,'T':T,'ct':ct,'tt':tt,'W':W,'H':H,'base':c,'K0':K,'d0':d,'ha0':ha/2,'he0':norm(derivative(c,.5))/6,'ht0':ht/2,'B':B}
def roof(o,g,s,T,post=None):
 A,Toe=o['A'],o['T'];W,H=o['W'],o['H'];angle0=math.atan2(o['d0'][1],o['d0'][0]);angle=(1-g)*angle0-g*math.pi/2;v=[math.cos(angle),math.sin(angle)]
 L=[Toe[0]-2*o['B']-.02*W,Toe[1]+.12*H-.18*H*s];K=mix(o['K0'],L,g)
 if post is not None:
  C=post;K=[C[0]+T/2,C[1]+T/2]
  for _ in range(16):
   width=K[0]-A[0];height=A[1]-K[1];cs=[A,add(A,mul(o['ct'],KAPPA*width)),add(K,[0,KAPPA*height]),K];prev=bezier(*cs,27/28);last=unit(sub(K,prev));n=[-last[1],last[0]];K=add(add(C,[0,T/2]),mul(n,T/2))
 width=K[0]-A[0];height=A[1]-K[1]
 if width<=0 or height<=0:raise ValueError('nonpositive_analytic_leaf_width_or_drop')
 hs=(1-g)*o['ha0']+g*KAPPA*width;he=(1-g)*o['he0']+g*KAPPA*height
 hs=min(hs,2*width/(3*o['ct'][0]))
 if v[0]>0:he=min(he,2*width/(3*v[0]))
 c=[A,add(A,mul(o['ct'],hs)),sub(K,mul(v,he)),K]
 P=[A]+[rounded(bezier(*c,i/28)) for i in range(1,28)]+[K];last=unit(sub(P[-1],P[-2]));n=[-last[1],last[0]]
 return P,c,last,n
def event(o):
 B=o['B'];Toe=o['T']
 def gap(s):
  P,c,v,n=roof(o,1,s,B);return P[-1][1]-B/2*(1+n[1])-Toe[1]
 g0,g1=gap(0),gap(1)
 if g0<=0 or g1>=0:raise ValueError('actual_impact_not_bracketed_after_clear_open_phase')
 lo,hi=0.,1.
 for _ in range(32):
  mid=(lo+hi)/2
  if gap(mid)>0:lo=mid
  else:hi=mid
 s=(lo+hi)/2;P,c,v,n=roof(o,1,s,B);C=[P[-1][0]-B/2*n[0],Toe[1]]
 lo,hi=0.,1.
 for _ in range(32):
  m=(lo+hi)/2
  if smoothstep(m)<s:lo=m
  else:hi=m
 return s,C,(lo+hi)/2
def forward_cubic(A,B,u,v,h0=None,h1=None):
 dx=B[0]-A[0];chord=norm(sub(B,A))
 if dx<0:raise ValueError('backward_analytic_floor_bridge')
 h0=chord/3 if h0 is None else h0;h1=chord/3 if h1 is None else h1
 if u[0]>0:h0=min(h0,dx/(3*u[0]))
 if v[0]>0:h1=min(h1,dx/(3*v[0]))
 return [A,add(A,mul(u,h0)),sub(B,mul(v,h1)),B]
def geometry(z,with_velocity=False):
 meta={'failures':[],'partRanges':{'outer':[32,60],'cap':[60,68],'inner':[68,80],'root':[80,96],'bridge':[96,102],'plateau':[102,106],'tail':[106,112]},'materialAgeTau':z['tau'],'model':'analytic-C/v1'}
 try:
  o=ordinary(z);TD=z['TD'];tau=z['tau'];sImpact,C,eFrac=event(o);impact=TD+.3*TD*eFrac;retiredAt=impact+.3*TD;post=tau>=impact
  g=smoothstep(tau/(.4*TD));remain=1-smoothstep((tau-impact)/(.3*TD)) if post else 1;s=smoothstep((tau-TD)/(.3*TD)) if not post else sImpact
  T=o['B']*(remain**2 if post else g*g);P,rc,v,n=roof(o,1 if post else g,s,T,C if post else None);A,Toe=o['A'],o['T'];target={32+i:p for i,p in enumerate(P)}
  meta.update({'W':o['W'],'H':o['H'],'baseThickness':o['B'],'thickness':T,'formation':g,'remaining':remain,'seal':s,'impactTau':impact,'retiredTau':retiredAt,'impactCap':C,'impactSealParameter':sImpact,'phase':'retired' if remain==0 else 'retiring' if post else 'sealing' if tau>TD else 'open' if g==1 else 'forming' if g>0 else 'ordinary','authoredTDStartsSealing':TD,'ordinaryBase':o['base'],'outerCubic':rc})
  if T==0:
   K=P[-1];u=[0,-1] if post else o['d0'];floor=forward_cubic(K,Toe,u,o['tt'],o['he0'] if not post else None,o['ht0'] if not post else None)
   for i in range(61,107):target[i]=K
   for i in range(107,113):target[i]=bezier(*floor,(i-106)/6)
   meta.update({'sheetExists':False,'rootRadius':0,'capMinimum':None,'capFloorGap':None,'floorCubic':floor,'covered':False,'voidActive':False})
  else:
   floorMin=8*old.ulp32(max(abs(a) for k in ('A','T') for a in z[k]));meta['minimumRepresentableThickness']=floorMin
   if T<floorMin:raise ValueError('active_sheet_below_F32_representability_floor')
   V=[unit(sub(b,a)) for a,b in zip(P,P[1:])]
   if any(v is None for v in V):raise ValueError('zero_stored_outer_facet')
   N=[[-v[1],v[0]] for v in V];D=[mul(N[0],-1)]
   for a,b in zip(N,N[1:]):
    den=1+dot(a,b)
    if den<=0:raise ValueError('opposite_sheet_facet_normals')
    D.append(mul(add(a,b),-1/den))
   D.append(mul(N[-1],-1));Q=[add(a,mul(d,T)) for a,d in zip(P,D)]
   fractions=[norm(sub(Q[i+1],Q[i]))/norm(sub(P[i+1],P[i])) for i in range(28)];meta['minimumOffsetEdgeFraction']=min(fractions)
   if min(fractions)<.75:raise ValueError('sheet_offset_curvature_thickness_budget')
   if any(Q[i+1][0]<=Q[i][0] for i in range(28)):raise ValueError('paired_sheet_not_forward')
   qJ=(1-remain)*Q[-1][0]+remain*(A[0]+.28*o['W']) if post else (1-g)*Q[-1][0]+g*(A[0]+.28*o['W'])
   if not Q[0][0]<=qJ<Q[-1][0]:raise ValueError('inner_root_outside_actual_sheet_facets')
   e=next(i for i in range(28) if Q[i][0]<=qJ<=Q[i+1][0]);J=add(Q[e],mul(sub(Q[e+1],Q[e]),(qJ-Q[e][0])/(Q[e+1][0]-Q[e][0])));vr=V[e];u=mul(vr,-1)
   inner,length=arc_sample([Q[-1]]+[Q[i] for i in range(27,e,-1)]+[J],12)
   centre=sub(P[-1],mul(N[-1],T/2));phi=math.atan2(-V[-1][1],-N[-1][1]);phi=phi if phi>=0 else phi+2*math.pi
   if not 0<phi<math.pi:raise ValueError('cap_minimum_outside_half_roll')
   for i in range(61,69):
    angle=phi*(i-60)/4 if i<=64 else phi+(math.pi-phi)*(i-64)/4
    target[i]=add(centre,mul(add(mul(N[-1],math.cos(angle)),mul(V[-1],math.sin(angle))),T/2))
   target[68]=Q[-1]
   for i in range(69,81):target[i]=inner[i-68]
   angle0=math.atan2(o['d0'][1],o['d0'][0]);planeAngle=0 if post else (1-g)*angle0;pv=[math.cos(planeAngle),math.sin(planeAngle)];slope=pv[1]/pv[0];qC=P[-1][0]-T/2;yC=Toe[1] if post else (1-g)*o['K0'][1]+g*Toe[1]
   den=2*(vr[0]+slope*vr[1]);radius=(J[1]-yC-slope*(J[0]-qC))/den if den>0 else -1
   if radius<T/2:raise ValueError('root_radius_thickness_or_floor_plane_domain')
   centreRoot=add(J,mul([u[1]*-1,u[0]],radius))
   for i in range(81,97):
    angle=(i-80)*math.pi/16;target[i]=add(centreRoot,mul(add(mul(sub(J,centreRoot),math.cos(angle)),mul(u,radius*math.sin(angle))),1))
   E=target[96];F0=[qC-T,yC-slope*T];F1=[qC+T,yC+slope*T]
   if not E[0]<=F0[0]<F1[0]<Toe[0]:raise ValueError('floor_plateau_outside_forward_domain')
   bridge=forward_cubic(E,F0,vr,pv);tail=forward_cubic(F1,Toe,pv,o['tt'])
   for i in range(97,103):target[i]=bezier(*bridge,(i-96)/6)
   for i in range(103,107):target[i]=mix(F0,F1,(i-102)/4)
   for i in range(107,113):target[i]=bezier(*tail,(i-106)/6)
   meta.update({'sheetExists':True,'rootRadius':radius,'rootJ':J,'floorEndE':E,'plateau':[F0,F1],'rootFacet':32+e,'innerLength':length,'capMinimum':rounded(target[64]),'covered':True,'voidActive':remain>0,'fluidFlow':{'roofDirection':V[-1],'speed':math.sqrt(2*o['H']),'afterImpactDirection':[0,-1],'approximation':True}})
  out=[{'point':i,'q':F32(target[i][0]),'y':F32(target[i][1])} for i in range(32,113)];out[0]={'point':32,'q':z['A'][0],'y':z['A'][1]};out[-1]={'point':112,'q':z['T'][0],'y':z['T'][1]}
  meta['finite']=all(math.isfinite(a[k]) for a in out for k in ('q','y'))
  if not meta['finite']:raise ValueError('nonfinite_geometry')
  if with_velocity:
   dt=1e-5*TD;lo,ml=geometry({**z,'tau':tau-dt});hi,mh=geometry({**z,'tau':tau+dt})
   meta['phaseEnvelopeDerivative']=[{'point':a['point'],'dq':(b['q']-a['q'])/(2*dt),'dy':(b['y']-a['y'])/(2*dt)} for a,b in zip(lo,hi)] if lo is not None and hi is not None else None
  return out,meta
 except (ValueError,ZeroDivisionError,StopIteration) as ex:
  meta['failures'].append(str(ex));return None,meta
def transform(points,z,with_velocity=False):
 shape,meta=geometry(z,with_velocity)
 if shape is None:return None,meta
 ids={a['point']:a for a in shape};out=copy.deepcopy(points)
 for a in out:
  if 32<a['point']<112:a['q'],a['y']=ids[a['point']]['q'],ids[a['point']]['y']
 return out,meta
