"""One frozen recipe, exhaustive raw-frame and two fixed interpolation-order grids."""
from pathlib import Path
import collections,copy,gzip,importlib.util,json,math,struct
W=Path('/private/tmp/tube-descending-facet-profile-20261004')
spec=importlib.util.spec_from_file_location('descending_facet_trial',W/'prototype.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
ROOT=Path('/Users/regina/Desktop/Projects/surfing-game');CAPTURE=ROOT/'docs/research/tube-stability-2026-10-04/rejected-roof-thinning/inputs/captured-polylines.json.gz'
INDEX=Path('/private/tmp/tube-monotone-inner-profile-20261004/eligible-cases.json');SCALE=7
def blend(a,b,t):return [{'point':x['point'],'q':p.F32(x['q']+(y['q']-x['q'])*t),'y':p.F32(x['y']+(y['y']-x['y'])*t)} for x,y in zip(a,b)]
def finite(points):return all(math.isfinite(a[k]) for a in points for k in ('q','y'))
def air(points,height):
    a=p.corridor_metrics(points,height)['floorToInnerRoofAir'];return {'threshold':height,'maxGap':a['maxGap'],'continuousWidth':a['largestContinuousUsefulWidth'],'intervals':a['usefulIntervals'],'verticalRoofThicknessRange':a['verticalRoofSeparationWhereUseful']}
def thickness(points):
    ids={r['point']:r for r in points};out=[]
    for i in list(range(36,61))+list(range(71,84)):
        a,b=(64,88) if i<64 else (32,64);distance=min(p.point_segment_distance(ids[i],ids[j],ids[j+1]) for j in range(a,b));out.append({'point':i,'distance':distance})
    return {'range':[min(t['distance'] for t in out),max(t['distance'] for t in out)],'samples':out}
def facet_constraints(points):
    ids={r['point']:r for r in points};roof=[p.xy(ids[i]) for i in range(32,65)];v=[p.unit(p.sub(b,a)) for a,b in zip(roof,roof[1:])]
    if any(t is None for t in v):return {'validRoofFacets':False,'minimumInnerMargin':None,'outsideVertices':[]}
    normals=[[-t[1],t[0]] for t in v];margins=[{'point':i,'minimum':min(-p.dot(n,p.sub(p.xy(ids[i]),a)) for n,a in zip(normals,roof))} for i in range(71,89)]
    return {'validRoofFacets':True,'minimumInnerMargin':min(t['minimum'] for t in margins),'outsideVertices':[t for t in margins if t['minimum']<0]}
def sample(original,after,meta,metrics=False,scale=1,oldcross=None):
    oldcross=p.segment_intersections(original) if oldcross is None else oldcross
    r={'valid':after is not None,'recipe':meta,'beforeCrossings':oldcross,'afterCrossings':None,'crossingChange':None,'finiteBefore':finite(original),'finiteAfter':None,'newZeroEdges':None}
    if after is None:return r
    newcross=p.segment_intersections(after);oldzero={tuple(s) for s in p.zero_edges(original)};newzero={tuple(s) for s in p.zero_edges(after)}
    r.update({'afterCrossings':newcross,'crossingChange':p.crossing_changes(oldcross,newcross),'finiteAfter':finite(after),'newZeroEdges':[list(s) for s in sorted(newzero-oldzero)],
      'preservedAnchorsAndRestExactly':all(x==y for x,y in zip(original,after) if x['point']<=32 or x['point']>=88 or x['point']==64),
      'beforeTurns':p.turns(original),'afterTurns':p.turns(after),'beforeCapFloor':p.cap_floor(original),'afterCapFloor':p.cap_floor(after),'facetConstraints':facet_constraints(after),
      'maximumVertexDisplacement':max(p.norm(p.vec(a,b)) for a,b in zip(original,after))})
    if metrics:r.update({'beforeAir113':air(original,1.13/scale),'afterAir113':air(after,1.13/scale),'beforeAir160':air(original,1.6/scale),'afterAir160':air(after,1.6/scale),'afterThickness':thickness(after)})
    return r
def summary(rows):
    valid=[r for r in rows if r['valid']]
    return {'attempted':len(rows),'valid':len(valid),'invalid':len(rows)-len(valid),'activeDistinctTipThroat':sum(r['recipe'].get('originalReach',0)>0 for r in rows),
      'allValidFinite':all(r['finiteAfter'] for r in valid),'allValidAnchorsRestExact':all(r['preservedAnchorsAndRestExactly'] for r in valid),
      'beforeCrossedAmongValid':sum(bool(r['beforeCrossings']) for r in valid),'afterCrossedAmongValid':sum(bool(r['afterCrossings']) for r in valid),
      'newPairSamples':sum(bool(r['crossingChange']['newPairs']) for r in valid),'cleanBecomesCrossed':sum(r['crossingChange']['beforePairCount']==0 and r['crossingChange']['afterPairCount']>0 for r in valid),
      'pairCountIncrease':sum(r['crossingChange']['afterPairCount']>r['crossingChange']['beforePairCount'] for r in valid),'pairCountDecrease':sum(r['crossingChange']['afterPairCount']<r['crossingChange']['beforePairCount'] for r in valid),
      'newZeroEdgeSamples':sum(bool(r['newZeroEdges']) for r in valid),'newZeroEdges':sum(len(r['newZeroEdges']) for r in valid),
      'facetMarginOutsideSamples':sum(bool(r['facetConstraints']['outsideVertices']) for r in valid),
      'capFloorNonpositiveSamples':sum(bool(r['recipe'].get('capExists')) and r['afterCapFloor']['minimum'] is not None and r['afterCapFloor']['minimum']['gap']<=0 for r in valid),
      'newCapFloorContactFromClear':sum(bool(r['recipe'].get('capExists')) and r['afterCapFloor']['minimum'] is not None and r['beforeCapFloor']['minimum'] is not None and r['afterCapFloor']['minimum']['gap']<=0<r['beforeCapFloor']['minimum']['gap'] for r in valid)}
def ranges(rows):
    def rng(values):return [min(values),max(values)] if values else None
    valid=[r for r in rows if r['valid']];active=[r for r in valid if r['recipe'].get('capExists')]
    return {'sheetThickness':rng([r['recipe']['sheetThickness'] for r in active]),'minimumOffsetEdgeFraction':rng([r['recipe']['minimumOffsetEdgeFraction'] for r in active]),
      'minimumCapFloorGap':rng([r['afterCapFloor']['minimum']['gap'] for r in active if r['afterCapFloor']['minimum']]),
      'maximumTurn':max((r['afterTurns']['maximum']['absoluteTurnDegrees'] for r in valid if r['afterTurns']['maximum']),default=None),
      'maximumThroatJoinTurn':max((t['absoluteTurnDegrees'] for r in valid for t in r['afterTurns']['throat']),default=None),
      'maximumZeroReachSurfaceDisplacement':max((r['maximumVertexDisplacement'] for r in valid if r['recipe'].get('zeroReach')),default=None),
      'zeroReachChangedSurfaceCount':sum(r['recipe'].get('zeroReach') and r['maximumVertexDisplacement']>0 for r in valid),
      'zeroReachMaximumJoinTurn':max((t['absoluteTurnDegrees'] for r in valid if r['recipe'].get('zeroReach') for t in r['afterTurns']['throat']),default=None)}
def issues(rows):return [{k:r[k] for k in r if k not in ('beforeAir113','afterAir113','beforeAir160','afterAir160','afterThickness')} for r in rows if not r['valid'] or r['crossingChange']['newPairs'] or r['newZeroEdges'] or r['facetConstraints']['outsideVertices']]

def main():
    assert not (W/'report.json').exists(),'One frozen candidate result cannot be overwritten.'
    freeze={'recipe':p.receipt(W/'recipe.md'),'prototype':p.receipt(W/'prototype.py'),'evaluator':p.receipt(W/'evaluate.py'),'definedBeforeCandidateEvaluation':True}
    oldready=json.load(open('/private/tmp/tube-whole-curl-profile-20261004/descending-lip/production-readiness.json'));production=[p.receipt(Path(r['file'])) for r in oldready['sourceAndTestFiles']]
    (W/'evaluation-start.json').write_text(json.dumps({'freeze':freeze,'productionAtStart':production},indent=2)+'\n')
    sources=json.load(gzip.open(CAPTURE,'rt'));refs=json.load(open(INDEX));actual=[]
    for row in sources['selection']['initialCrossSections']:
        ray=p.unit(row['row']['ray']);raw=row['positions'];ox,_,oz=raw[:3]
        points=[{'point':row['firstProfilePoint']+i//3,'q':(raw[i]-ox)*ray[0]+(raw[i+2]-oz)*ray[1],'y':raw[i+1],'world':raw[i:i+3]} for i in range(0,len(raw),3)]
        after,meta=p.transform(points,ray);r=sample(points,after,meta,metrics=True);r.update({'row':row['row'],'beforePolyline':points,'afterPolyline':after})
        if after:r.update({'crouchedCorridorPass':r['afterAir113']['continuousWidth']>=1.25,'generousCorridorPass':r['afterAir160']['continuousWidth']>=1.25})
        actual.append(r)
    print(json.dumps({'captured':summary(actual),'capturedRanges':ranges(actual),'rows':[{'row':r['row']['row'],'valid':r['valid'],'failures':r['recipe']['failures'],'T':r['recipe'].get('sheetThickness'),'width113':r.get('afterAir113',{}).get('continuousWidth'),'width160':r.get('afterAir160',{}).get('continuousWidth'),'maxGap':r.get('afterAir113',{}).get('maxGap'),'maxTurn':r.get('afterTurns',{}).get('maximum')} for r in actual]}),flush=True)
    allframes=[];cases=[];paired=[];timing=[]
    for ref in refs['cases']:
        asset=Path(ref['asset']['file']);receipt=p.receipt(asset);assert receipt['sha256']==ref['asset']['sha256'];bytes_=asset.read_bytes();magic,size=struct.unpack_from('<II',bytes_);assert magic in (0x42524c31,0x42524c32);head=json.loads(bytes_[8:8+size]);start=8+((size+3)//4)*4;raw=struct.unpack('<'+str((len(bytes_)-start)//4)+'f',bytes_[start:]);count=len(raw)//(258 if magic==0x42524c32 else 256)
        rows=[];profiles=[];eligible={r['frame'] for r in ref['eligible']}
        for frame in range(count):
            original=[{'point':i,'q':raw[frame*256+2*i],'y':raw[frame*256+2*i+1]} for i in range(128)];after,meta=p.transform(original);tau=head['tauStart']+frame*head['tauStep'];phase='early' if tau<0 else 'postTD' if tau>head['touchdown'] else 'preTD';r=sample(original,after,meta,metrics=meta['originalReach']>0,scale=SCALE)
            r.update({'case':head['id'],'frame':frame,'tau':tau,'phase':phase,'originalHeldEligible':frame in eligible});rows.append(r);allframes.append(r);profiles.append((original,after))
        held_frame=round((ref['held']['tau']-head['tauStart'])/head['tauStep']);threshold=ref['source']['clearThreshold'];trace=[]
        for r in rows:
            if r['frame'] in range(max(0,held_frame-2),min(count,held_frame+3)) or abs(r['tau']-head['touchdown'])<=head['tauStep']*1.01:
                trace.append({k:r[k] for k in ('frame','tau','phase','valid','recipe','beforeCapFloor','afterCapFloor') if k in r})
        clear=[r for r in rows if r['valid'] and r['recipe'].get('capExists') and r['tau']<=head['touchdown'] and r['afterCapFloor']['minimum']]
        positive=[r for r in clear if r['afterCapFloor']['minimum']['gap']>0];at_threshold=[r for r in clear if r['afterCapFloor']['minimum']['gap']>=threshold]
        timeline={'case':head['id'],'authoredTD':head['touchdown'],'originalHeld':ref['held'],'originalHeldFrame':held_frame,'sourceClearThreshold':threshold,
          'lastCapStrictlyClearPreTD':{'frame':positive[-1]['frame'],'tau':positive[-1]['tau'],'gap':positive[-1]['afterCapFloor']['minimum']['gap']} if positive else None,
          'lastCapAtOriginalThresholdPreTD':{'frame':at_threshold[-1]['frame'],'tau':at_threshold[-1]['tau'],'gap':at_threshold[-1]['afterCapFloor']['minimum']['gap']} if at_threshold else None,
          'originalHeldAndTDNeighbors':trace}
        timing.append(timeline);cases.append({'id':head['id'],'asset':receipt,'source':head,'originalHeld':ref['held'],'summary':summary(rows),'ranges':ranges(rows),'frames':rows});paired.append({'id':head['id'],'profiles':profiles,'rows':rows,'dt':head['tauStep']})
        print(json.dumps({'case':head['id'],'summary':summary(rows),'ranges':ranges(rows),'lastCapStrictlyClearPreTD':timeline['lastCapStrictlyClearPreTD'],'lastCapAtOriginalThresholdPreTD':timeline['lastCapAtOriginalThresholdPreTD']}),flush=True)
    assert len(allframes)==1224
    post=[];pre=[];velocity=[]
    for case in paired:
        for i,((oa,na),(ob,nb)) in enumerate(zip(case['profiles'],case['profiles'][1:])):
            if na is not None and nb is not None:
                old=max(p.norm(p.vec(a,b))/case['dt'] for a,b in zip(oa,ob));new=max(p.norm(p.vec(a,b))/case['dt'] for a,b in zip(na,nb));velocity.append({'case':case['id'],'frames':[i,i+1],'sourceMaximumVertexSpeed':old,'candidateMaximumVertexSpeed':new,'ratio':new/old if old else None,'tipVelocityExactlyUnchanged':p.vec(oa[64],ob[64])==p.vec(na[64],nb[64])})
            for share in (.25,.5,.75):
                original=blend(oa,ob,share);oldcross=p.segment_intersections(original);after,meta=p.transform(original);r=sample(original,after,meta,oldcross=oldcross);r.update({'case':case['id'],'frames':[i,i+1],'share':share,'endpointPhases':[case['rows'][i]['phase'],case['rows'][i+1]['phase']]});post.append(r)
                earlier=blend(na,nb,share) if na is not None and nb is not None else None
                diagnosticmeta={'originalReach':meta['originalReach'],'zeroReach':meta['zeroReach'],'capExists':meta['originalReach']>0,'orderDiagnostic':True,'failures':['invalid_transformed_endpoint'] if earlier is None else []};d=sample(original,earlier,diagnosticmeta,oldcross=oldcross);d.update({'case':case['id'],'frames':[i,i+1],'share':share,'endpointPhases':r['endpointPhases']});pre.append(d)
        print(json.dumps({'interpolationCaseComplete':case['id'],'postRawInterpolationSamples':len(post),'pretransformSamples':len(pre)}),flush=True)
    assert len(post)==len(pre)==3648
    final_production=[p.receipt(Path(r['file'])) for r in production]
    outcome={'captured':summary(actual),'capturedRanges':ranges(actual),'allRawFrames':summary(allframes),'allRawFrameRanges':ranges(allframes),
      'jointAfterRawF32Interpolation':summary(post),'pretransformThenF32InterpolationDiagnostic':summary(pre),
      'allCapturedCrouchedTargetPass':all(r.get('crouchedCorridorPass',False) for r in actual),'allCapturedGenerousTargetPass':all(r.get('generousCorridorPass',False) for r in actual),
      'allCapturedAnalyticThicknessBandPass':all(r['valid'] and .10<=r['recipe']['sheetThickness']<=.35 for r in actual),'production12HashesUnchanged':production==final_production,
      'authoritativeOrder':'raw case/time/held-profile interpolation -> joint Hermite/facet construction -> F32 result','consumerReady':False,'nativeAdopted':False,
      'newPathologyInAuthoritativeOrder':any(summary(rows)[k] for rows in (allframes,post) for k in ('invalid','cleanBecomesCrossed','pairCountIncrease','newZeroEdgeSamples')),
      'velocity':{'samples':len(velocity),'materialTipVelocityAlwaysExactlyUnchanged':all(r['tipVelocityExactlyUnchanged'] for r in velocity),'maximumVertexSpeedRatio':max((r['ratio'] or 0 for r in velocity),default=None),'maximumRatioSample':max(velocity,key=lambda r:r['ratio'] or 0,default=None)}}
    report={'schema':'descending-hermite-discrete-facet/v1','complete':True,'freeze':freeze,'outcome':outcome,'actual':actual,'cases':cases,'timeTrace':timing,
      'authoritativeInterpolationIssues':issues(post),'authoritativeInterpolationInvalid':[r for r in post if not r['valid']],
      'pretransformInterpolationIssues':issues(pre),'original293EligibleSummary':summary([r for r in allframes if r['originalHeldEligible']]),'velocity':velocity,
      'sourceFiles':[p.receipt(CAPTURE),p.receipt(INDEX),p.receipt(p.PREVIOUS/'measurement_functions.py'),p.receipt(p.PREVIOUS/'air_metrics.py'),p.receipt(p.PREVIOUS/'prototype.py')],
      'productionAtStart':production,'productionAtEnd':final_production,
      'limits':['No production/consumer/native/body/board/path integration or acceptance.','Zero-reach outer non-curl geometry is deliberately reconstructed; this is measured rather than silently preserved.','The new cap can lie below original64 and hit the floor earlier; authoredTD cannot be treated as physical cap impact.','Tip64 material velocity is unchanged, but new cap/roof material flow and contact clocks require explicit consumer review.','Case scaling7m is illustrative, actual captured outlines are metres.','Incoming crest31 absent in captures; outgoing32->33 substituted and labeled.','Proper crossings omit endpoint/collinear/volume tests.','Fixed adjacent-time grids do not prove arbitrary cross-case/alongshore/3D continuity.','Per-query construction needs runtime cost assessment and matching fresh derived caches before any implementation.']}
    (W/'report.json').write_text(json.dumps(report,separators=(',',':'))+'\n');(W/'summary.json').write_text(json.dumps({'schema':report['schema'],'outcome':outcome,'capturedRows':[{k:r[k] for k in ('row','valid','recipe','crossingChange','afterAir113','afterAir160','afterTurns','afterThickness','afterCapFloor')} for r in actual],'caseSummaries':[{k:c[k] for k in ('id','summary','ranges')} for c in cases],'limits':report['limits']},indent=2)+'\n')
    print(json.dumps(outcome),flush=True)

if __name__=='__main__':main()
