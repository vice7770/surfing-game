"""Frozen descending-tip paired-ellipse trial. Scratch only; no production imports."""
from pathlib import Path
import copy, math, sys, importlib.util

PREVIOUS=Path('/private/tmp/tube-whole-curl-profile-20261004/descending-lip')
sys.path.insert(0,str(PREVIOUS))
from measurement_functions import vertical_crossings, segment_intersections, at_q
_spec=importlib.util.spec_from_file_location('prior_measurement_tools',PREVIOUS/'prototype.py')
_prior=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(_prior)
receipt, crossing_changes, corridor_metrics, point_segment_distance=(_prior.receipt,_prior.crossing_changes,_prior.corridor_metrics,_prior.point_segment_distance)

K=math.pi/2
def vec(a,b):return [b['q']-a['q'],b['y']-a['y']]
def dot(a,b):return a[0]*b[0]+a[1]*b[1]
def length(a):return math.hypot(*a)
def unit(a):
    n=length(a);return [v/n for v in a] if n else None
def add(a,b):return [a[i]+b[i] for i in range(2)]
def scale(a,s):return [v*s for v in a]
def smoothstep(x):
    x=max(0,min(1,x));return x*x*(3-2*x)
def clamp(x,a,b):return max(a,min(b,x))
def bezier(a,b,c,d,t):
    s=1-t;return [s**3*a[i]+3*s*s*t*b[i]+3*s*t*t*c[i]+t**3*d[i] for i in range(2)]
def f(u):return u*(1-u)**3
def df(u):return 1-6*u+9*u*u-4*u**3
def ddf(u):return -6+18*u-12*u*u

def ivadd(a,b):return [a[0]+b[0],a[1]+b[1]]
def ivmul(a,b):
    v=[x*y for x in a for y in b];return [min(v),max(v)]
def ivscale(a,s):return sorted([a[0]*s,a[1]*s])
def ivrange(fn,a,b,critical=()):
    v=[fn(u) for u in (a,b,*[u for u in critical if a<=u<=b])];return [min(v),max(v)]
def ivdistance(a):return 0 if a[0]<=0<=a[1] else min(abs(x) for x in a)
def ivabs(a):return max(abs(x) for x in a)

def thickness_bound(H,w0,d0,c):
    rmax=min(.05*H,w0/8,d0/8)
    w=[w0,w0+rmax];d=[d0-rmax,d0];corr=ivscale(w,K*c)
    bounds=[]
    for i in range(128):
        a,b=i/128,(i+1)/128
        sn=[math.sin(K*a),math.sin(K*b)];co=[math.cos(K*b),math.cos(K*a)]
        fp=ivrange(df,a,b,(.5,));fpp=ivrange(ddf,a,b,(.75,))
        xp=ivscale(ivmul(w,co),K)
        yp=ivadd(ivscale(ivmul(d,sn),-K),ivmul(corr,fp))
        xpp=ivscale(ivmul(w,sn),-K*K)
        ypp=ivadd(ivscale(ivmul(d,co),-K*K),ivmul(corr,fpp))
        slow=math.hypot(ivdistance(xp),ivdistance(yp))
        second=math.hypot(ivabs(xpp),ivabs(ypp))
        if slow<=0:return None,{'failure':'zero_conservative_tangent_lower_bound','interval':[a,b],'xp':xp,'yp':yp}
        bounds.append({'interval':[a,b],'speedLower':slow,'secondUpper':second,'curvatureUpper':second/(slow*slow)})
    worst=max(bounds,key=lambda b:b['curvatureUpper']);T=min(2*rmax,.25/worst['curvatureUpper'])
    return T,{'nominalThickness':.1*H,'radiusRange':[0,rmax],'conservativeCurvatureUpper':worst['curvatureUpper'],'worstInterval':worst,'offsetTangentFractionLower':1-T*worst['curvatureUpper'],'thicknessLimitedByBend':T<.1*H}

def transform(points,ray=None):
    ids={p['point']:p for p in points};A,L,B=ids[32],ids[64],ids[88]
    width=L['q']-A['q'];reach=L['q']-B['q'];ratio=reach/width if width>0 else None
    reach_m=smoothstep((ratio-.15)/.45) if ratio is not None else 0
    bt=unit(vec(B,ids[89]));v=max(0,min(1,-bt[1])) if bt else 0
    face_m=smoothstep(v);m=reach_m*face_m
    meta={'maturity':m,'reachMaturity':reach_m,'descendingFaceFormation':face_m,'normalizedDescent':v,'originalReachRatio':ratio,'originalTip':[L['q'],L['y']],
          'crestIncomingTangentAvailable':31 in ids,'failures':[],'tipXYExactlyPreserved':True,'crestThroatAndOtherIndicesPreserved':True}
    if m==0:return copy.deepcopy(points),meta
    floor=vertical_crossings(points,L['q'],88,max(ids))
    if not floor:meta['failures'].append('missing_retained_floor_at_tip_x');return None,meta
    F=max(floor,key=lambda x:x['y']);fp=unit(vec(ids[F['segment'][0]],ids[F['segment'][1]]))
    if not fp or fp[0]==0:meta['failures'].append('invalid_floor_tangent');return None,meta
    if fp[0]<0:fp=scale(fp,-1)
    n=[-fp[1],fp[0]];H=A['y']-F['y'];ct=unit(vec(ids[31],A) if 31 in ids else vec(A,ids[33]))
    delta=[L['q']-A['q'],L['y']-A['y']];w0=dot(delta,fp);d0=-dot(delta,n)
    meta.update({'floorAtTip':F,'floorTangent':fp,'floorUpperNormal':n,'H':H,'w0':w0,'d0':d0,'crestTangent':ct,'throatTangent':bt})
    if H<=0 or w0<=0 or d0<=0 or A['y']<=B['y'] or not ct or ct[0]<=0 or dot(ct,fp)<=0 or not bt or bt[1]>=0:
        meta['failures'].append('invalid_anchor_height_or_floor_basis_or_tangent_domain');return None,meta
    c=dot(ct,n)/dot(ct,fp);T,bound=thickness_bound(H,w0,d0,c)
    meta['thicknessProof']=bound
    if T is None or T<=0:meta['failures'].append('invalid_conservative_offset_regularity_proof');return None,meta
    r=T/2;Lxy=[L['q'],L['y']];C=add(Lxy,scale(add(n,fp),r));O=add(Lxy,scale(n,r));D=add(Lxy,scale(add(n,scale(fp,-1)),r));w=w0+r;d=d0-r;corr=K*w*c
    def curve(u):
        p=add(add(C,scale(fp,-w*(1-math.sin(K*u)))),scale(n,d*math.cos(K*u)+corr*f(u)))
        derivative=add(scale(fp,K*w*math.cos(K*u)),scale(n,-K*d*math.sin(K*u)+corr*df(u)))
        second=add(scale(fp,-K*K*w*math.sin(K*u)),scale(n,-K*K*d*math.cos(K*u)+corr*ddf(u)))
        return p,derivative,second
    def offset(u):
        p,pv,pvv=curve(u);s=length(pv);normal=[-pv[1]/s,pv[0]/s]
        normal_prime=add(scale([-pvv[1],pvv[0]],1/s),scale(normal,-dot(pv,pvv)/(s*s)))
        return add(p,scale(normal,-T)),add(pv,scale(normal_prime,-T))
    bT=dot([B['q']-A['q'],B['y']-A['y']],fp)
    uroot=math.asin(clamp((max(0,bT)+T)/w,T/w,1-T/w))/K
    J,jv=offset(uroot);start=scale(unit(jv),-1);Bxy=[B['q'],B['y']];chord=length([J[i]-Bxy[i] for i in range(2)])
    hstart=min(chord/3,T/2);hend=chord/3;budget=A['y']-T-B['y']
    if budget<=0:meta['failures'].append('nonpositive_bounded_throat_handle_ceiling');return None,meta
    if v*hend>budget:hend=budget/v
    control1=add(J,scale(start,hstart));control2=add(Bxy,scale(bt,-hend))
    target=[];changed=copy.deepcopy(points)
    for old,p in zip(points,changed):
        i=p['point']
        if i<=32 or i>=88 or i==64:continue
        if i<=60:q,y=curve((i-32)/28)[0]
        elif i<=68:
            theta=-(i-60)*math.pi/8;q,y=add(O,scale(add(scale(fp,math.cos(theta)),scale(n,math.sin(theta))),r))
        elif i<=82:q,y=offset(1-(i-68)/14*(1-uroot))[0]
        else:q,y=bezier(J,control1,control2,Bxy,(i-82)/6)
        p['q']=old['q']+m*(q-old['q']);p['y']=old['y']+m*(y-old['y'])
        if 'world' in p:
            assert ray is not None;dq=p['q']-old['q'];p['world']=[old['world'][0]+ray[0]*dq,p['y'],old['world'][2]+ray[1]*dq]
    if not all(math.isfinite(p[k]) for p in changed for k in ('q','y')):
        meta['failures'].append('nonfinite_transformed_coordinate');return None,meta
    assert changed[points.index(L)]==L
    sample=[]
    for i in range(257):
        u=i/256;p,pv,pvv=curve(u);q,qv=offset(u);s=length(pv);signed=(pv[0]*pvv[1]-pv[1]*pvv[0])/s**3
        sample.append({'u':u,'curvature':abs(signed),'offsetTangentFraction':length(qv)/s,'sheetNormalDistance':length([q[j]-p[j] for j in range(2)])})
    meta.update({'sheetThickness':T,'rollRadius':r,'rollCenter':O,'outerEnd':C,'innerEnd':D,'w':w,'d':d,'rootCorrection':corr,'uRoot':uroot,'innerAttachment':[J,control1,control2,Bxy],
                 'maximumSampledOuterCurvature':max(s['curvature'] for s in sample),'minimumSampledOffsetTangentFraction':min(s['offsetTangentFraction'] for s in sample),
                 'analyticNormalDistanceRange':[min(s['sheetNormalDistance'] for s in sample),max(s['sheetNormalDistance'] for s in sample)],
                 'lipDropOriginalAndCandidate':A['y']-L['y'],'tipYChange':0,'tipXChange':0,'maximumVertexDisplacement':max(length(vec(a,b)) for a,b in zip(points,changed))})
    return changed,meta

def turns(points):
    ids={p['point']:p for p in points};out=[]
    for i in range(32,89):
        if i-1 not in ids or i+1 not in ids:continue
        a,b=vec(ids[i-1],ids[i]),vec(ids[i],ids[i+1]);angle=abs(math.degrees(math.atan2(a[0]*b[1]-a[1]*b[0],dot(a,b)))) if length(a) and length(b) else None
        out.append({'point':i,'absoluteTurnDegrees':angle})
    return {'maximum':max(out,key=lambda x:x['absoluteTurnDegrees'] or 0),'junctions':[x for x in out if x['point'] in (32,60,64,68,82,88)],'over90':[x for x in out if (x['absoluteTurnDegrees'] or 0)>90]}

def thickness(points):
    by={p['point']:p for p in points};rows=[]
    for i in list(range(36,57))+list(range(70,81)):
        lo,hi=(64,88) if i<64 else (32,64)
        distance=min(point_segment_distance(by[i],by[j],by[j+1]) for j in range(lo,hi))
        rows.append({'point':i,'nearestOppositeRunDistance':distance})
    return {'range':[min(p['nearestOppositeRunDistance'] for p in rows),max(p['nearestOppositeRunDistance'] for p in rows)],'outer36_56':[p for p in rows if p['point']<64],'inner70_80':[p for p in rows if p['point']>64]}

def roof_order(points):
    ids={p['point']:p for p in points};events=sorted(set(p['q'] for p in points if p['point']<=88));queries=[(a+b)/2 for a,b in zip(events,events[1:])]
    bad=[];missing=[];lowest_outer=min(ids)
    for q in queries:
        inner=vertical_crossings(points,q,64,88)
        if not inner:continue
        outer=vertical_crossings(points,q,lowest_outer,64)
        if not outer:missing.append({'q':q,'innerY':max(h['y'] for h in inner)});continue
        iy=max(h['y'] for h in inner);oy=max(h['y'] for h in outer)
        if iy>oy+1e-8:bad.append({'q':q,'innerY':iy,'outerY':oy,'inversion':iy-oy})
    return {'innerAboveOuterEventIntervals':bad,'innerMissingOuterEventIntervals':missing,'scope':'Highest retained/changed outer0..64 vs inner64..88 at vertex-event midpoints; captures only retain32..112. Proper crossings independently measured.'}
