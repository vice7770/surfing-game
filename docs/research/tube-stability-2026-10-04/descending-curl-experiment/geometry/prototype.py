"""One fixed full C-curl candidate. Scratch-only bounded geometry evidence."""
from pathlib import Path
import copy, gzip, hashlib, json, math
from measurement_functions import vertical_crossings, at_q, segment_intersections
from air_metrics import measure, merge_intervals, line_y
WORK=Path('/private/tmp/tube-whole-curl-profile-20261004/descending-lip')
ROOT=Path('/Users/regina/Desktop/Projects/surfing-game')
CAPTURE=ROOT/'docs/research/tube-stability-2026-10-04/rejected-roof-thinning/inputs/captured-polylines.json.gz'
CASES=Path('/private/tmp/tube-monotone-inner-profile-20261004/eligible-cases.json')
SCALE=7

def receipt(p):
    b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def vec(a,b):return [b['q']-a['q'],b['y']-a['y']]
def unit(v):
    n=math.hypot(*v);return [v[0]/n,v[1]/n] if n else None
def bezier(a,b,c,d,t):
    s=1-t;return [s*s*s*a[k]+3*s*s*t*b[k]+3*s*t*t*c[k]+t*t*t*d[k] for k in range(2)]
def smoothstep(t):
    t=min(1,max(0,t));return t*t*(3-2*t)
def transform(points,ray=None):
    ids={p['point']:p for p in points};A,B,L=ids[32],ids[88],ids[64]
    width=L['q']-A['q'];reach=L['q']-B['q']
    ratio=reach/width if width>0 else None
    reach_m=smoothstep((ratio-.15)/.45) if ratio is not None else 0
    bt=unit(vec(B,ids[89]));descent=min(1,max(0,-bt[1])) if bt else 0
    face_m=smoothstep(descent);m=reach_m*face_m
    meta={'maturity':m,'reachMaturity':reach_m,'descendingFaceFormation':face_m,'normalizedDescent':descent,'originalReachRatio':ratio,'originalTip':[L['q'],L['y']], 'failures':[],
          'crestIncomingTangentAvailable':31 in ids,'tipXPreserved':True,'crestThroatAndOtherIndicesPreserved':True}
    if m==0:return copy.deepcopy(points),meta
    floorhits=vertical_crossings(points,L['q'],88,max(ids))
    if not floorhits:meta['failures'].append('missing_floor_at_original_tip_x');return None,meta
    F=max(floorhits,key=lambda p:p['y']);H=A['y']-F['y']
    ct=unit(vec(ids[31],A) if 31 in ids else vec(A,ids[33]))
    if H<=0 or width<=0 or reach<=0 or A['y']<=B['y'] or not ct or ct[0]<=0 or not bt or bt[1]>=0:
        meta['failures'].append('invalid_anchor_height_or_forward_crest_or_descending_throat');meta.update({'H':H,'crestTangent':ct,'throatTangent':bt});return None,meta
    r=.05*H;C=[L['q']-r,A['y']-.25*H];center=[C[0],C[1]-r];D=[C[0],C[1]-2*r]
    ow=C[0]-A['q'];iw=D[0]-B['q'];weighted_h=.85*(A['y']-B['y'])*reach_m*descent*(3-2*descent)
    OA=[A['q'],A['y']];IB=[B['q'],B['y']]
    OP1=[OA[k]+ow/3*ct[k] for k in range(2)];OP2=[C[0]-ow/3,C[1]]
    IP1=[D[0]-iw/3,D[1]];weighted_IP2=[m*IB[k]-weighted_h*bt[k] for k in range(2)]
    if ow<=0 or iw<=0 or not all(math.isfinite(v) for p in [C,D,OP1,OP2,IP1,weighted_IP2] for v in p):
        meta['failures'].append('invalid_control_width_or_nonfinite');return None,meta
    changed=copy.deepcopy(points)
    for old,p in zip(points,changed):
        i=p['point']
        if i<=32 or i>=88:assert old==p;continue
        if i<=60:q,y=bezier(OA,OP1,OP2,C,(i-32)/28)
        elif i<=68:
            theta=math.pi/2-(i-60)*math.pi/8
            q,y=center[0]+r*math.cos(theta),center[1]+r*math.sin(theta)
        else:
            t=(i-68)/20;ss=1-t
            # Evaluate m*P2 directly; m*h is finite as descent→0. No h=rise/descent division.
            weighted=[m*(ss*ss*ss*D[k]+3*ss*ss*t*IP1[k]+t*t*t*IB[k])+3*ss*t*t*weighted_IP2[k] for k in range(2)]
            q,y=weighted
            p['q']=(1-m)*old['q']+q;p['y']=(1-m)*old['y']+y
        if i<=68:
            p['q']=old['q']+m*(q-old['q']);p['y']=old['y']+m*(y-old['y'])
        if 'world' in p:
            assert ray is not None;dq=p['q']-old['q'];p['world']=[old['world'][0]+ray[0]*dq,p['y'],old['world'][2]+ray[1]*dq]
    tip=next(p for p in changed if p['point']==64)
    assert abs(tip['q']-L['q'])<1e-12
    meta.update({'H':H,'sheetThickness':2*r,'rollRadius':r,'floorAtTip':F,'crestTangent':ct,'throatTangent':bt,
                 'outerBezier':[OA,OP1,OP2,C],'innerWeightedBezier':[[m*v for v in D],[m*v for v in IP1],weighted_IP2,[m*v for v in IB]],'weightedThroatHandleLength':weighted_h,'rollCenter':center,
                 'changedTip':[tip['q'],tip['y']],'tipYChange':tip['y']-L['y'],
                 'maximumVertexDisplacement':max(math.hypot(p['q']-q['q'],p['y']-q['y']) for p,q in zip(changed,points)),
                 'targetControlBehindCrest':weighted_IP2[0]<m*A['q']})
    return changed,meta

def turns(points):
    ids={p['point']:p for p in points};rows=[]
    for i in range(32,89):
        if i-1 not in ids or i+1 not in ids:continue
        u,v=vec(ids[i-1],ids[i]),vec(ids[i],ids[i+1]);lu,lv=math.hypot(*u),math.hypot(*v)
        ang=math.degrees(math.atan2(u[0]*v[1]-u[1]*v[0],u[0]*v[0]+u[1]*v[1])) if lu and lv else None
        rows.append({'point':i,'turnDegrees':ang,'absoluteTurnDegrees':abs(ang) if ang is not None else None,'incomingLength':lu,'outgoingLength':lv})
    return {'junctions':[r for r in rows if r['point'] in (32,60,64,68,88)],'maximumTurn':max(rows,key=lambda r:r['absoluteTurnDegrees'] or 0),'maximumInteriorTurn':max((r for r in rows if 33<=r['point']<=87),key=lambda r:r['absoluteTurnDegrees'] or 0)}
def point_segment_distance(p,a,b):
    vx,vy=b['q']-a['q'],b['y']-a['y'];den=vx*vx+vy*vy
    t=min(1,max(0,((p['q']-a['q'])*vx+(p['y']-a['y'])*vy)/den)) if den else 0
    return math.hypot(p['q']-(a['q']+t*vx),p['y']-(a['y']+t*vy))
def thickness(points):
    by={p['point']:p for p in points};rows=[]
    for i in list(range(36,61))+list(range(68,85)):
        lo,hi=(64,88) if i<64 else (32,64)
        d=min(point_segment_distance(by[i],by[j],by[j+1]) for j in range(lo,hi))
        rows.append({'point':i,'nearestOppositeRunDistance':d})
    return {'definition':'Nearest Euclidean opposite-run segment distance; root/tip vicinity excluded at36..60 and68..84.', 'minimum':min(r['nearestOppositeRunDistance'] for r in rows),'maximum':max(r['nearestOppositeRunDistance'] for r in rows),'outerMiddle40_56': [r for r in rows if 40<=r['point']<=56],'innerRoof68_80':[r for r in rows if 68<=r['point']<=80]}
def crossing_changes(old,new):
    key=lambda x:tuple(tuple(p) for p in x['segments']);a={key(x):x for x in old};b={key(x):x for x in new}
    return {'beforePairCount':len(a),'afterPairCount':len(b),'newPairs':[b[k] for k in sorted(b.keys()-a.keys())],
            'removedPairs':[a[k] for k in sorted(a.keys()-b.keys())],
            'retainedPairsMoved':[{'before':a[k],'after':b[k]} for k in sorted(a.keys()&b.keys()) if math.hypot(a[k]['q']-b[k]['q'],a[k]['y']-b[k]['y'])>1e-9]}
def corridor_metrics(points,threshold):
    core=[p for p in points if 32<=p['point']<=112];m=measure(core,threshold);m['largestContinuousUsefulWidth']=max((b-a for a,b in m['usefulWidthIntervals']),default=0)
    events=sorted(set([p['q'] for p in core]+[x['q'] for x in m['properNonadjacentPolylineCrossings']]+m['cavityRangeQ']))
    by={p['point']:p for p in core};useful=[];roof=[];largest=None;ambiguous=0
    for x0,x1 in zip(events,events[1:]):
        a,b=max(x0,m['cavityRangeQ'][0]),min(x1,m['cavityRangeQ'][1])
        if b<=a:continue
        q=(a+b)/2;z=at_q(core,q);hits=z['crossings'];ambiguous+=len(hits)>=5
        if len(hits)<3 or len(hits)%2==0:continue
        for j in range(0,len(hits)-1,2):
            bottom,top=hits[j]['segment'],hits[j+1]['segment']
            if not (88<=min(bottom) and max(bottom)<=112 and 64<=min(top) and max(top)<=88):continue
            ga=line_y(by,top,a)-line_y(by,bottom,a);gb=line_y(by,top,b)-line_y(by,bottom,b)
            gap=max(ga,gb)
            if largest is None or gap>largest['gap']:largest={'gap':gap,'q':a if ga>=gb else b,'floorSegment':bottom,'roofSegment':top,'verticalIntervalPreserved':True}
            if ga>=threshold and gb>=threshold:useful.append([a,b])
            elif ga>=threshold or gb>=threshold:
                cross=a+(threshold-ga)*(b-a)/(gb-ga);useful.append([a,cross] if ga>=threshold else [cross,b])
            if max(ga,gb)>=threshold:
                for query in (a+min(1e-8,(b-a)/1000),q,b-min(1e-8,(b-a)/1000)):
                    zz=at_q(core,query)
                    if zz['largestAirGap'] is not None and zz['largestAirGap']>=threshold and zz['verticalRoofThickness'] is not None:
                        roof.append({'q':query,'thickness':zz['verticalRoofThickness']})
    useful=merge_intervals(useful)
    m['floorToInnerRoofAir']={'maxGap':largest,'usefulIntervals':useful,'largestContinuousUsefulWidth':max((b-a for a,b in useful),default=0),
                            'verticalRoofSeparationWhereUseful':[min((r['thickness'] for r in roof),default=None),max((r['thickness'] for r in roof),default=None)],'fiveOrMoreCrossingEventIntervals':ambiguous,
                            'scope':'Each separate parity-air interval, requiring floor88..112 and roof64..88; never sums vertically disjoint air gaps.'}
    return m

def compare(points,threshold,ray=None,retain=False):
    after,meta=transform(points,ray);before=corridor_metrics(points,threshold);fullold=segment_intersections(points)
    result={'valid':after is not None,'recipe':meta,'before':before,'beforeTurns':turns(points),'beforeThickness':thickness(points),'beforeFullCrossings':fullold,'after':None,'afterTurns':None,'afterThickness':None,'fullCrossingChange':None}
    if after:
        result.update({'after':corridor_metrics(after,threshold),'afterTurns':turns(after),'afterThickness':thickness(after),'fullCrossingChange':crossing_changes(fullold,segment_intersections(after))})
    if retain:result.update({'beforePolyline':points,'afterPolyline':after})
    return result,after

def aggregate(rows):
    val=[r for r in rows if r['valid']];new=[r for r in val if r['fullCrossingChange']['newPairs']]
    def rng(v):return [min(v),max(v)] if v else None
    return {'total':len(rows),'valid':len(val),'invalid':len(rows)-len(val),'newCrossedFrames':len(new),
            'previouslyCleanBecomesCrossed':sum(r['fullCrossingChange']['beforePairCount']==0 for r in new),
            'newPairs':sum(len(r['fullCrossingChange']['newPairs']) for r in val),'removedPairs':sum(len(r['fullCrossingChange']['removedPairs']) for r in val),
            'retainedPairsMoved':sum(len(r['fullCrossingChange']['retainedPairsMoved']) for r in val),
            'beforeCrossed':sum(bool(r['beforeFullCrossings']) for r in rows),'afterCrossed':sum(r['fullCrossingChange']['afterPairCount']>0 for r in val),
            'maturityRange':rng([r['recipe']['maturity'] for r in rows]),'tipYChangeRange':rng([r['recipe'].get('tipYChange',0) for r in val]),
            'maxGapAfterRange':rng([r['after']['maxGap'] for r in val if r['after']['maxGap'] is not None]),
            'maxContinuousUsefulWidthAfterRange':rng([r['after']['floorToInnerRoofAir']['largestContinuousUsefulWidth'] for r in val]),
            'maximumTurnAfter':max((r['afterTurns']['maximumTurn']['absoluteTurnDegrees'] or 0 for r in val),default=None),
            'maximumThroatJoinAfter':max((abs(j['turnDegrees'] or 0) for r in val for j in r['afterTurns']['junctions'] if j['point']==88),default=None)}
def lerp_profile(a,b,w):return [{'point':p['point'],'q':p['q']+w*(q['q']-p['q']),'y':p['y']+w*(q['y']-p['y'])} for p,q in zip(a,b)]

def main():
    assert not (WORK/'report.json').exists(),'Single trial may not overwrite its result.'
    source=json.load(gzip.open(CAPTURE,'rt'));cases=json.load(open(CASES));assert len(cases['cases'])==8;assert sum(len(c['eligible']) for c in cases['cases'])==293
    actual=[]
    for row in source['selection']['initialCrossSections']:
        rx,rz=unit(row['row']['ray']);raw=row['positions'];ox,oy,oz=raw[:3];nx,nz=rz,-rx
        points=[{'point':row['firstProfilePoint']+i//3,'q':(raw[i]-ox)*rx+(raw[i+2]-oz)*rz,'y':raw[i+1],'world':raw[i:i+3],'lateral':(raw[i]-ox)*nx+(raw[i+2]-oz)*nz} for i in range(0,len(raw),3)]
        record,after=compare(points,1.6,(rx,rz),True);record.update({'row':row['row'],'joinedToNext':row['joinedToNext']});actual.append(record)
    allframes=[];case_results=[];interp=[];temporal=[]
    for c in cases['cases']:
        assert receipt(Path(c['asset']['file']))['sha256']==c['asset']['sha256']
        rows=[];profiles={};originals={}
        for f in c['eligible']:
            p=f['profile'];points=[{'point':i,'q':p[2*i],'y':p[2*i+1]} for i in range(128)]
            r,after=compare(points,1.6/SCALE,retain=True);r.update({'frame':f['frame'],'tau':f['tau']});rows.append(r);allframes.append(r);profiles[f['frame']]=after;originals[f['frame']]=points
        for left,right in zip(rows,rows[1:]):
            if right['frame']!=left['frame']+1:continue
            f,g=left['frame'],right['frame'];oa,ob=originals[f],originals[g];pa,pb=profiles[f],profiles[g]
            if pa is None or pb is None:continue
            dt=right['tau']-left['tau'];temporal.append({'case':c['id'],'frames':[f,g],'tauStep':dt,
                'originalMaxVertexSpeed':max(math.hypot(q['q']-p['q'],q['y']-p['y'])/dt for p,q in zip(oa,ob)),
                'candidateMaxVertexSpeed':max(math.hypot(q['q']-p['q'],q['y']-p['y'])/dt for p,q in zip(pa,pb)),
                'originalTipVelocity':[(ob[64][k]-oa[64][k])/dt for k in ('q','y')],
                'candidateTipVelocity':[(pb[64][k]-pa[64][k])/dt for k in ('q','y')]})
            for share in (.25,.5,.75):
                old=lerp_profile(oa,ob,share);new=lerp_profile(pa,pb,share);change=crossing_changes(segment_intersections(old),segment_intersections(new));interp.append({'case':c['id'],'frames':[f,g],'share':share,'change':change})
        case_results.append({'id':c['id'],'asset':c['asset'],'source':c['source'],'held':c['held'],'aggregate':aggregate(rows),'frames':rows})
    actualpass=all(r['valid'] and not r['fullCrossingChange']['newPairs'] and r['after']['floorToInnerRoofAir']['maxGap'] and r['after']['floorToInnerRoofAir']['maxGap']['gap']>=1.6 and r['after']['floorToInnerRoofAir']['largestContinuousUsefulWidth']>=.6 for r in actual)
    agg=aggregate(allframes);interpfails=[r for r in interp if r['change']['newPairs'] or r['change']['retainedPairsMoved']]
    unsafe=not actualpass or agg['invalid']>0 or agg['newPairs']>0 or bool(interpfails)
    report={'schema':'full-c-curl-offline/v1','complete':True,'recipeFrozenBeforeEvaluation':receipt(WORK/'recipe.md'),'sourceFiles':[receipt(p) for p in (CAPTURE,CASES,WORK/'prototype.py',WORK/'measurement_functions.py',WORK/'air_metrics.py')],
            'units':{'actual':'meters','cases':'h0','caseConversionMetersIllustrativeOnly':SCALE},'scope':'Five native-source retained initial32..112 Float32 projected sections; all293 original eligible full128-point frames of8 cases. Adjacent eligible frames and their.25/.5/.75 linear interpolation are paired against originals.',
            'actual':actual,'actualAggregate':aggregate(actual),'actualOpeningTargetPass':actualpass,'cases':case_results,'aggregate':agg,
            'interpolation':{'sampleCount':len(interp),'newPairSamples':sum(bool(r['change']['newPairs']) for r in interp),'movedRetainedPairSamples':sum(bool(r['change']['retainedPairsMoved']) for r in interp),'failures':interpfails},'temporalVelocitySamples':temporal,
            'unsafe':unsafe,'stopped':unsafe,'limitations':['No native/drawing/contact/body/optical proof.','No actual incoming crest31 is retained in captured profiles; outgoing33 tangent substituted and labeled.','Case scales remain nondimensional;7m threshold does not prove actual scene scale.','Proper crossings omit collinear/endpoint touches.','Held-frame eligibility is original, not recomputed for changed tip.','Original authored touchdown and tip-velocity tables are not valid physical authorities for the changed tip.','No mass conservation or hydrodynamic claim.']}
    text=json.dumps(report,separators=(',',':'))+'\n';assert len(text.encode())<20*1024*1024;(WORK/'report.json').write_text(text)
    (WORK/'summary.json').write_text(json.dumps({k:report[k] for k in ('schema','complete','actualAggregate','actualOpeningTargetPass','aggregate','interpolation','unsafe','limitations')},indent=2)+'\n')
    lines=['scope\tid\tmaturity\toldMaxGap\tnewMaxGap\tnewContinuousWidth1.6\tnewRoofVerticalMin\tnewRoofVerticalMax\ttipYChange\tnewCrossings']
    for r in actual:
        after=r['after'];air=after['floorToInnerRoofAir'] if after else None
        lines.append('\t'.join(map(str,['meters',r['row']['row'],r['recipe']['maturity'],r['before']['maxGap'],after['maxGap'] if after else None,air['largestContinuousUsefulWidth'] if air else None,*(air['verticalRoofSeparationWhereUseful'] if air else [None,None]),r['recipe'].get('tipYChange'),len(r['fullCrossingChange']['newPairs']) if after else None])))
    for c in case_results:
        r=c['frames'][-1];after=r['after'];air=after['floorToInnerRoofAir'] if after else None
        lines.append('\t'.join(map(str,['h0',c['id']+'@'+str(r['frame']),r['recipe']['maturity'],r['before']['maxGap'],after['maxGap'] if after else None,air['largestContinuousUsefulWidth'] if air else None,*(air['verticalRoofSeparationWhereUseful'] if air else [None,None]),r['recipe'].get('tipYChange'),len(r['fullCrossingChange']['newPairs']) if after else None])))
    (WORK/'table.tsv').write_text('\n'.join(lines)+'\n');print(json.dumps({'reportBytes':len(text.encode()),'actualAggregate':report['actualAggregate'],'actualOpeningTargetPass':actualpass,'aggregate':agg,'interpolationSamples':len(interp),'interpolationFailures':len(interpfails),'unsafe':unsafe}))

if __name__=='__main__':main()
