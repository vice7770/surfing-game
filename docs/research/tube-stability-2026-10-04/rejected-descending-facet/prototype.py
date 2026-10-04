"""One frozen Hermite/discrete-facet representation. Offline only."""
from pathlib import Path
import copy, importlib.util, math, struct, sys
PREVIOUS=Path('/private/tmp/tube-whole-curl-profile-20261004/descending-lip')
sys.path.insert(0,str(PREVIOUS))
from measurement_functions import vertical_crossings,segment_intersections,at_q
spec=importlib.util.spec_from_file_location('prior_facet_measurements',PREVIOUS/'prototype.py');prior=importlib.util.module_from_spec(spec);spec.loader.exec_module(prior)
receipt,crossing_changes,corridor_metrics,point_segment_distance=(prior.receipt,prior.crossing_changes,prior.corridor_metrics,prior.point_segment_distance)

F32=lambda x:struct.unpack('<f',struct.pack('<f',x))[0]
def add(a,b):return [a[i]+b[i] for i in range(2)]
def sub(a,b):return [a[i]-b[i] for i in range(2)]
def mul(a,k):return [x*k for x in a]
def dot(a,b):return a[0]*b[0]+a[1]*b[1]
def cross(a,b):return a[0]*b[1]-a[1]*b[0]
def norm(a):return math.hypot(*a)
def unit(a):
    n=norm(a);return mul(a,1/n) if n else None
def xy(p):return [p['q'],p['y']]
def vec(a,b):return sub(xy(b),xy(a))
def smoothstep(t):
    t=max(0,min(1,t));return t*t*(3-2*t)
def clamp(t,a,b):return max(a,min(b,t))
def bezier(a,b,c,d,t):
    s=1-t;return [s**3*a[i]+3*s*s*t*b[i]+3*s*t*t*c[i]+t**3*d[i] for i in range(2)]
def ulp32(x):
    if not x:return 2**-149
    return max(2**-149,math.ldexp(1,math.frexp(abs(x))[1]-24))
def rounded(p):return [F32(x) for x in p]

def ray_handle(origin,direction,upper,roof,normals,margin):
    h=upper;limiter=None
    for i,(point,normal) in enumerate(zip(roof,normals)):
        advance=dot(normal,direction)
        if advance>0:
            available=-margin-dot(normal,sub(origin,point));limit=available/advance
            if limit<h:h=limit;limiter={'facet':32+i,'maximumHandle':limit}
    return h,limiter

def arc_sample(points,count):
    cleaned=[points[0]]
    for point in points[1:]:
        if norm(sub(point,cleaned[-1]))>0:cleaned.append(point)
    lengths=[0]
    for a,b in zip(cleaned,cleaned[1:]):lengths.append(lengths[-1]+norm(sub(a,b)))
    if lengths[-1]==0:return [list(cleaned[0]) for _ in range(count+1)],0
    out=[];edge=0
    for i in range(count+1):
        target=lengths[-1]*i/count
        while edge<len(cleaned)-2 and lengths[edge+1]<target:edge+=1
        s=(target-lengths[edge])/(lengths[edge+1]-lengths[edge]);out.append(add(cleaned[edge],mul(sub(cleaned[edge+1],cleaned[edge]),s)))
    out[0]=list(cleaned[0]);out[-1]=list(cleaned[-1]);return out,lengths[-1]

def transform(points,ray=None):
    ids={p['point']:p for p in points};A,L,B=xy(ids[32]),xy(ids[64]),xy(ids[88]);W=L[0]-A[0];D=A[1]-L[1];R=L[0]-B[0]
    m=smoothstep((R/W)/.6) if W>0 else 0
    meta={'maturity':m,'width':W,'crestToOriginalTipDrop':D,'originalReach':R,'reachRatio':R/W if W>0 else None,'zeroReach':R==0,
          'originalTip':L,'crestIncomingTangentAvailable':31 in ids,'failures':[],'constructionAlwaysReplacesOuterRoof':True,'vertexMorphUsed':False,'tipIsNotAssumedLowestOrImpact':True}
    def fail(reason,**data):meta['failures'].append(reason);meta.update(data);return None,meta
    if W<=0 or D<=0 or R<0:return fail('nonpositive_convex_width_or_drop_or_negative_reach')
    if R==0 and L!=B:return fail('zero_reach_with_distinct_vertical_tip_throat')
    ct=unit(vec(ids[31],ids[32]) if 31 in ids else vec(ids[32],ids[33]));bt=unit(vec(ids[88],ids[89]));meta.update({'crestTangent':ct,'throatTangent':bt})
    if not ct or ct[0]<=0 or not bt:return fail('invalid_retained_tangent')
    slope=ct[1]/ct[0];secant_drop=D+slope*W/3
    if secant_drop<=0:return fail('nonpositive_fixed_root_convex_secant_drop',convexSecantDrop=secant_drop)
    ordinary=math.atan2(bt[1],abs(bt[0]));convex=math.atan2(-secant_drop,2*W/3);base=min(ordinary,convex);angle=(1-m)*base-m*math.pi/2;e=[math.cos(angle),math.sin(angle)]
    h=D
    if e[0]>0:h=min(h,2*W/(3*e[0]))
    denominator=slope*e[0]-e[1]
    if denominator>0:h=min(h,(D+slope*W)/denominator)
    if h<=0:return fail('nonpositive_convex_tip_handle',tipHandle=h)
    P1=[A[0]+W/3,A[1]+slope*W/3];P2=sub(L,mul(e,h));roof=[A]+[rounded(bezier(A,P1,P2,L,i/32)) for i in range(1,32)]+[L]
    changed=copy.deepcopy(points);target={32+i:p for i,p in enumerate(roof)}
    meta.update({'outerBezier':[A,P1,P2,L],'ordinaryAngle':ordinary,'convexAngle':convex,'actualTipAngle':angle,'tipHandle':h,'ordinaryTangentReflection':bt[0]<0,'ordinaryTipAngleMismatch':abs(angle-ordinary) if R==0 else None})
    if R==0:
        for i in range(65,88):target[i]=L
        meta.update({'sheetThickness':0,'finiteThicknessFloor':0,'zeroReachInnerCollapsed':True,'capExists':False,'materialTipXYUnchanged':True})
    else:
        hits=vertical_crossings(points,L[0],88,max(ids))
        if not hits:return fail('missing_retained_floor_at_tip_x')
        floor=max(hits,key=lambda p:p['y']);H=A[1]-floor['y'];meta.update({'floorAtOriginalTip':floor,'H':H,'originalTipFloorGap':L[1]-floor['y']})
        if H<=0:return fail('nonpositive_crest_to_retained_floor_height')
        velocities=[unit(sub(b,a)) for a,b in zip(roof,roof[1:])]
        if any(v is None for v in velocities):return fail('zero_stored_roof_facet')
        normals=[[-v[1],v[0]] for v in velocities];miters=[mul(normals[0],-1)]
        for a,b in zip(normals,normals[1:]):
            denominator=1+dot(a,b)
            if denominator<=0:return fail('opposite_roof_facet_normals')
            miters.append(mul(add(a,b),-1/denominator))
        miters.append(mul(normals[-1],-1));edge_budgets=[]
        for i,(a,b,v) in enumerate(zip(roof,roof[1:],velocities)):
            length=norm(sub(b,a));coefficient=dot(sub(miters[i+1],miters[i]),v)
            if coefficient<0:edge_budgets.append({'facet':32+i,'budget':.25*length/(-coefficient),'length':length,'shrinkCoefficient':coefficient})
        physical_ceiling=min(W/8,R/4,min((r['budget'] for r in edge_budgets),default=math.inf));coordinate_scale=max(abs(p[k]) for p in points for k in ('q','y'));minimum=8*ulp32(coordinate_scale);desired=.1*H*m
        meta.update({'desiredThickness':desired,'finiteThicknessFloor':minimum,'physicalThicknessCeiling':physical_ceiling,'facetThicknessLimiter':min(edge_budgets,key=lambda x:x['budget']) if edge_budgets else None})
        if physical_ceiling<minimum:return fail('unrepresentable_fixed_anchor_sheet_thickness')
        T=min(physical_ceiling,max(desired,minimum));Q=[add(a,mul(d,T)) for a,d in zip(roof,miters)];margin=T/2
        clearances=[-dot(n,sub(q,p)) for q in Q for p,n in zip(roof,normals)]
        meta.update({'sheetThickness':T,'minimumOffsetToAnyRoofFacet':min(clearances),'minimumOffsetEdgeFraction':min(norm(sub(b,a))/norm(sub(roof[i+1],roof[i])) for i,(a,b) in enumerate(zip(Q,Q[1:]))),
                     'thicknessRaisedForRepresentability':T>desired,'capExists':True})
        if min(clearances)<margin:return fail('paired_offset_outside_shared_roof_halfplanes')
        if any(Q[i+1][0]<=Q[i][0] for i in range(32)):return fail('paired_offset_not_strictly_forward')
        lo,hi=Q[0][0]+T,Q[-1][0]-T
        if hi<=lo:return fail('no_distributed_root_width')
        qroot=clamp(max(B[0]+T,lo),lo,hi);root_edge=next(i for i in range(32) if Q[i][0]<=qroot<=Q[i+1][0]);fraction=(qroot-Q[root_edge][0])/(Q[root_edge+1][0]-Q[root_edge][0]);J=add(Q[root_edge],mul(sub(Q[root_edge+1],Q[root_edge]),fraction))
        bclear=[-dot(n,sub(B,p)) for p,n in zip(roof,normals)]
        if min(bclear)<margin:return fail('retained_throat_outside_shared_roof_margin',minimumThroatRoofMargin=min(bclear))
        start=mul(velocities[root_edge],-1);chord=norm(sub(J,B));hstart,limstart=ray_handle(J,start,chord/3,roof,normals,margin);enddirection=mul(bt,-1);hend,limend=ray_handle(B,enddirection,chord/3,roof,normals,margin)
        if enddirection[0]>0:hend=min(hend,(J[0]-T/2-B[0])/enddirection[0])
        if hstart<=0 or hend<=0:return fail('no_positive_C1_throat_handle',startHandle=hstart,endHandle=hend)
        control1=add(J,mul(start,hstart));control2=add(B,mul(enddirection,hend));returnpath=[Q[-1]]+[Q[i] for i in range(31,root_edge,-1)]+[J]
        returnpath +=[bezier(J,control1,control2,B,i/64) for i in range(1,65)]
        inner,total_length=arc_sample(returnpath,18);r=T/2;normal=normals[-1];last=velocities[-1];centre=sub(L,mul(normal,r))
        for i in range(65,70):
            phi=(i-64)*math.pi/6;target[i]=add(centre,mul(add(mul(normal,math.cos(phi)),mul(last,math.sin(phi))),r))
        target[70]=Q[-1]
        for i in range(71,88):target[i]=inner[i-70]
        meta.update({'rootQ':qroot,'rootFacet':32+root_edge,'innerAttachment':[J,control1,control2,B],'innerStartHandle':hstart,'innerEndHandle':hend,'innerStartHandleLimiter':limstart,'innerEndHandleLimiter':limend,
          'returnAndAttachmentLength':total_length,'rollRadius':r,'rollCentre':centre,'actualStoredLipFacetTangent':last,'minimumStoredRoofClockwiseCross':min(cross(a,b) for a,b in zip(velocities,velocities[1:])),
          'maximumStoredRoofCounterclockwiseCross':max(cross(a,b) for a,b in zip(velocities,velocities[1:]))})
    for old,p in zip(points,changed):
        i=p['point']
        if i<=32 or i>=88 or i==64:continue
        q,y=target[i];p['q'],p['y']=F32(q),F32(y)
        if 'world' in p:
            assert ray is not None;dq=p['q']-old['q'];p['world']=[old['world'][0]+ray[0]*dq,p['y'],old['world'][2]+ray[1]*dq]
    if not all(math.isfinite(p[k]) for p in changed for k in ('q','y')):return fail('nonfinite_output')
    assert all(a==b for a,b in zip(points,changed) if a['point']<=32 or a['point']>=88 or a['point']==64)
    meta.update({'maximumVertexDisplacement':max(norm(vec(a,b)) for a,b in zip(points,changed)),'materialTipXYUnchanged':True})
    return changed,meta

def turns(points):
    rows=[];reduced=[]
    for p in points:
        if not reduced or xy(p)!=xy(reduced[-1]['position']):reduced.append({'position':p,'indices':[p['point']]})
        else:reduced[-1]['indices'].append(p['point'])
    for a,b,c in zip(reduced,reduced[1:],reduced[2:]):
        u=vec(a['position'],b['position']);v=vec(b['position'],c['position']);angle=abs(math.degrees(math.atan2(cross(u,v),dot(u,v))))
        if any(32<=i<=88 for i in b['indices']):rows.append({'indices':b['indices'],'absoluteTurnDegrees':angle})
    return {'maximum':max(rows,key=lambda x:x['absoluteTurnDegrees'],default=None),'over90':[r for r in rows if r['absoluteTurnDegrees']>90],
      'crest':[r for r in rows if 32 in r['indices']],'lip':[r for r in rows if 64 in r['indices']],'throat':[r for r in rows if 88 in r['indices']]}

def zero_edges(points):return [[a['point'],b['point']] for a,b in zip(points,points[1:]) if xy(a)==xy(b)]
def cap_floor(points):
    ids={p['point']:p for p in points};floor_hi=max(ids);events=sorted(set(p['q'] for p in points if 64<=p['point']<=70 or p['point']>=88));rows=[];missing=[]
    for q in events:
        caps=vertical_crossings(points,q,64,70);floors=vertical_crossings(points,q,88,floor_hi)
        for point in points:
            if 64<=point['point']<=70 and point['q']==q:caps.append({'y':point['y'],'segment':[point['point'],point['point']]})
            if point['point']>=88 and point['q']==q:floors.append({'y':point['y'],'segment':[point['point'],point['point']]})
        if not caps:continue
        if not floors:missing.append(q);continue
        cap=min(caps,key=lambda x:x['y']);floor=max(floors,key=lambda x:x['y']);rows.append({'q':q,'gap':cap['y']-floor['y'],'capSegment':cap['segment'],'floorSegment':floor['segment'],'capY':cap['y'],'floorY':floor['y']})
    return {'minimum':min(rows,key=lambda r:r['gap'],default=None),'missingFloorQueries':missing,'scope':'Actual F32 cap64..70 polyline vs highest retained-floor branch88..127 (112 captures), exact vertex-event minima; zero-reach cap is absent.'}
