"""All raw frames and fixed F32 interpolation grid for the one frozen trial."""
from pathlib import Path
import copy, gzip, hashlib, importlib.util, json, math, struct, sys, time
WORK=Path('/private/tmp/tube-descending-tip-profile-20261004')
spec=importlib.util.spec_from_file_location('descending_tip_prototype',WORK/'prototype.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
ROOT=Path('/Users/regina/Desktop/Projects/surfing-game')
CAPTURE=ROOT/'docs/research/tube-stability-2026-10-04/rejected-roof-thinning/inputs/captured-polylines.json.gz'
INDEX=Path('/private/tmp/tube-monotone-inner-profile-20261004/eligible-cases.json')
SCALE=7
F32=lambda x:struct.unpack('<f',struct.pack('<f',x))[0]
def rounded(points):return [{'point':a['point'],'q':F32(a['q']),'y':F32(a['y'])} for a in points]
def lerp(a,b,t):return [{'point':x['point'],'q':F32(x['q']+(y['q']-x['q'])*t),'y':F32(x['y']+(y['y']-x['y'])*t)} for x,y in zip(a,b)]
def slim_air(points,threshold):
    result=p.corridor_metrics(points,threshold);r=result['floorToInnerRoofAir']
    return {'threshold':threshold,'maxGap':r['maxGap'],'usefulIntervals':r['usefulIntervals'],'continuousWidth':r['largestContinuousUsefulWidth'],'verticalRoofSeparationWhereUseful':r['verticalRoofSeparationWhereUseful'],'fiveOrMoreCrossingIntervals':r['fiveOrMoreCrossingEventIntervals']}
def finite(points):return all(math.isfinite(a[k]) for a in points for k in ('q','y'))
def sample(points,after,meta,scale=1,metrics=False):
    oldcross=p.segment_intersections(points)
    r={'valid':after is not None,'recipe':meta,'finiteBefore':finite(points),'beforeCrossings':oldcross,'afterCrossings':None,'crossingChange':None}
    if after is None:return r
    newcross=p.segment_intersections(after);r.update({'finiteAfter':finite(after),'afterCrossings':newcross,'crossingChange':p.crossing_changes(oldcross,newcross),
      'tipXYExactlyPreserved':points[64-min(a['point'] for a in points)]['q']==after[64-min(a['point'] for a in points)]['q'] and points[64-min(a['point'] for a in points)]['y']==after[64-min(a['point'] for a in points)]['y']})
    if metrics:
        r.update({'beforeAir113':slim_air(points,1.13/scale),'afterAir113':slim_air(after,1.13/scale),'beforeAir160':slim_air(points,1.6/scale),'afterAir160':slim_air(after,1.6/scale),
          'beforeTurns':p.turns(points),'afterTurns':p.turns(after),'beforeThickness':p.thickness(points),'afterThickness':p.thickness(after),'beforeRoofOrder':p.roof_order(points),'afterRoofOrder':p.roof_order(after)})
    return r
def summarize(rows):
    valid=[r for r in rows if r['valid']]
    return {'samples':len(rows),'valid':len(valid),'invalid':len(rows)-len(valid),'active':sum(r['recipe']['maturity']>0 for r in rows),
      'finiteBefore':all(r['finiteBefore'] for r in rows),'finiteAfter':all(r.get('finiteAfter',False) for r in valid),'tipXYExactForAllValid':all(r['tipXYExactlyPreserved'] for r in valid),
      'beforeCrossed':sum(bool(r['beforeCrossings']) for r in rows),'afterCrossed':sum(bool(r['afterCrossings']) for r in valid),
      'newPairSamples':sum(bool(r['crossingChange']['newPairs']) for r in valid),'cleanBecomesCrossed':sum(r['crossingChange']['beforePairCount']==0 and r['crossingChange']['afterPairCount']>0 for r in valid),
      'pairCountIncrease':sum(r['crossingChange']['afterPairCount']>r['crossingChange']['beforePairCount'] for r in valid),'pairCountDecrease':sum(r['crossingChange']['afterPairCount']<r['crossingChange']['beforePairCount'] for r in valid),
      'newPairCount':sum(len(r['crossingChange']['newPairs']) for r in valid),'removedPairCount':sum(len(r['crossingChange']['removedPairs']) for r in valid)}
def ranges(rows):
    def rng(v):return [min(v),max(v)] if v else None
    valid=[r for r in rows if r['valid'] and r['recipe']['maturity']>0]
    return {'nominalThickness':rng([r['recipe']['thicknessProof']['nominalThickness'] for r in valid]),'actualAnalyticThickness':rng([r['recipe']['sheetThickness'] for r in valid]),
      'maximumSampledOuterCurvature':rng([r['recipe']['maximumSampledOuterCurvature'] for r in valid]),'minimumSampledOffsetTangentFraction':rng([r['recipe']['minimumSampledOffsetTangentFraction'] for r in valid]),
      'lipDropOriginalAndCandidate':rng([r['recipe']['lipDropOriginalAndCandidate'] for r in valid]),
      'actualPolylineOppositeDistance':rng([x for r in valid if 'afterThickness' in r for x in r['afterThickness']['range']]),
      'maximumTurn':max([r['afterTurns']['maximum']['absoluteTurnDegrees'] for r in valid if 'afterTurns' in r],default=None),
      'newRoofInversionSamples':sum(bool(r['afterRoofOrder']['innerAboveOuterEventIntervals']) and not bool(r['beforeRoofOrder']['innerAboveOuterEventIntervals']) for r in valid if 'afterRoofOrder' in r),
      'newRoofMissingSamples':sum(bool(r['afterRoofOrder']['innerMissingOuterEventIntervals']) and not bool(r['beforeRoofOrder']['innerMissingOuterEventIntervals']) for r in valid if 'afterRoofOrder' in r)}

def main():
    assert not (WORK/'report.json').exists(),'One frozen trial; result may not be overwritten.'
    freeze={'recipe':p.receipt(WORK/'recipe.md'),'prototype':p.receipt(WORK/'prototype.py'),'evaluator':p.receipt(WORK/'evaluate.py'),'createdBeforeCandidateEvaluation':True}
    priorreadiness=json.load(open('/private/tmp/tube-whole-curl-profile-20261004/descending-lip/production-readiness.json'))
    files=priorreadiness.get('sourceAndTestFiles',priorreadiness.get('files',priorreadiness.get('sourceFiles',[])))
    # Receipt format is discovered as data; this script writes only under its scratch root.
    if not files:files=priorreadiness.get('productionFiles',[])
    preserved=[]
    for source in files:
        path=source.get('file',source.get('path'))
        if path:preserved.append(p.receipt(Path(path)))
    (WORK/'evaluation-start.json').write_text(json.dumps({'freeze':freeze,'productionAtStart':preserved},indent=2)+'\n')
    refs=json.load(open(INDEX));sources=json.load(gzip.open(CAPTURE,'rt'));actual=[]
    for r in sources['selection']['initialCrossSections']:
        rx,rz=p.unit(r['row']['ray']);raw=r['positions'];ox,_,oz=raw[:3]
        points=[{'point':r['firstProfilePoint']+i//3,'q':(raw[i]-ox)*rx+(raw[i+2]-oz)*rz,'y':raw[i+1],'world':raw[i:i+3]} for i in range(0,len(raw),3)]
        after,meta=p.transform(points,(rx,rz));row=sample(points,after,meta,metrics=True);row.update({'row':r['row'],'beforePolyline':points,'afterPolyline':after})
        if after:
            row['crouchedCorridorTarget']=row['afterAir113']['continuousWidth']>=1.25
            row['generousCorridorTarget']=row['afterAir160']['continuousWidth']>=1.25
            row['thinSheetBand']=.10<=meta['sheetThickness']<=.35
        actual.append(row)
    print(json.dumps({'captured':summarize(actual),'capturedRange':ranges(actual),'rows':[{'row':r['row']['row'],'valid':r['valid'],'thickness':r['recipe'].get('sheetThickness'),'maxGap':r.get('afterAir113',{}).get('maxGap'),'width113':r.get('afterAir113',{}).get('continuousWidth'),'width160':r.get('afterAir160',{}).get('continuousWidth')} for r in actual]}),flush=True)
    frames=[];case_reports=[];profiles=[];invalid=[]
    for ref in refs['cases']:
        asset=Path(ref['asset']['file']);receipt=p.receipt(asset);assert receipt['sha256']==ref['asset']['sha256'];rawbytes=asset.read_bytes();magic,size=struct.unpack_from('<II',rawbytes);assert magic in (0x42524c31,0x42524c32)
        header=json.loads(rawbytes[8:8+size]);start=8+((size+3)//4)*4;raw=struct.unpack('<'+str((len(rawbytes)-start)//4)+'f',rawbytes[start:]);count=len(raw)//(258 if magic==0x42524c32 else 256);rows=[];paired=[];eligible={e['frame'] for e in ref['eligible']}
        for f in range(count):
            points=[{'point':i,'q':raw[f*256+2*i],'y':raw[f*256+2*i+1]} for i in range(128)];after,meta=p.transform(points);after=rounded(after) if after else None
            tau=header['tauStart']+f*header['tauStep'];phase='postTD' if tau>header['touchdown'] else 'early' if tau<0 else 'preTD'
            row=sample(points,after,meta,SCALE,metrics=meta['maturity']>0);row.update({'case':header['id'],'frame':f,'tau':tau,'phase':phase,'originalHeldEligible':f in eligible});rows.append(row);frames.append(row);paired.append((points,after))
            if after is None:invalid.append({'case':header['id'],'frame':f,'tau':tau,'phase':phase,'recipe':meta})
        case_reports.append({'id':header['id'],'asset':receipt,'source':header,'originalHeld':ref['held'],'frames':rows,'summary':summarize(rows),'ranges':ranges(rows)})
        profiles.append({'id':header['id'],'pairs':paired,'dt':header['tauStep'],'frames':rows})
        print(json.dumps({'case':header['id'],'summary':summarize(rows),'ranges':ranges(rows)}),flush=True)
    interp=[];temporal=[]
    for c in profiles:
        for i,((oa,na),(ob,nb)) in enumerate(zip(c['pairs'],c['pairs'][1:])):
            if na is not None and nb is not None:
                oldmax=max(p.length(p.vec(a,b))/c['dt'] for a,b in zip(oa,ob));newmax=max(p.length(p.vec(a,b))/c['dt'] for a,b in zip(na,nb))
                temporal.append({'case':c['id'],'frames':[i,i+1],'originalMaximumVertexSpeed':oldmax,'candidateMaximumVertexSpeed':newmax,'ratio':newmax/oldmax if oldmax else None,'tipVelocityExactlyUnchanged':p.vec(oa[64],ob[64])==p.vec(na[64],nb[64])})
            for t in (.25,.5,.75):
                old=lerp(oa,ob,t);new=lerp(na,nb,t) if na is not None and nb is not None else None
                r=sample(old,new,{'maturity':max(c['frames'][i]['recipe']['maturity'],c['frames'][i+1]['recipe']['maturity'])},metrics=False)
                r.update({'case':c['id'],'frames':[i,i+1],'share':t,'endpointPhases':[c['frames'][i]['phase'],c['frames'][i+1]['phase']]})
                interp.append(r)
        print(json.dumps({'interpolationCaseComplete':c['id'],'cumulativeSamples':len(interp)}),flush=True)
    issues=[{'case':r['case'],'frame':r['frame'],'phase':r['phase'],'crossingChange':r['crossingChange']} for r in frames if r['valid'] and (r['crossingChange']['newPairs'] or r['crossingChange']['removedPairs'] or r['crossingChange']['retainedPairsMoved'])]
    interpissues=[{k:r[k] for k in ('case','frames','share','endpointPhases','valid','crossingChange')} for r in interp if not r['valid'] or r['crossingChange']['newPairs'] or r['crossingChange']['removedPairs'] or r['crossingChange']['retainedPairsMoved']]
    roofissues=[{'case':r['case'],'frame':r['frame'],'phase':r['phase'],'maturity':r['recipe']['maturity'],'before':r['beforeRoofOrder'],'after':r['afterRoofOrder']} for r in frames if r['valid'] and 'afterRoofOrder' in r and (r['afterRoofOrder']['innerAboveOuterEventIntervals'] or r['afterRoofOrder']['innerMissingOuterEventIntervals'])]
    production_end=[p.receipt(Path(r['file'])) for r in preserved]
    outcome={'captured':summarize(actual),'capturedRanges':ranges(actual),'allFrames':summarize(frames),'allFrameRanges':ranges(frames),'allAdjacentF32Interpolation':summarize(interp),
      'allCapturedCrouchedCorridorPass':all(r.get('crouchedCorridorTarget',False) for r in actual),'allCapturedGenerousCorridorPass':all(r.get('generousCorridorTarget',False) for r in actual),'allCapturedThinSheetBandPass':all(r.get('thinSheetBand',False) for r in actual),
      'productionHashesExactlyUnchanged':preserved==production_end,'productionFilesChecked':len(preserved),'newPathology':bool(invalid) or any(summarize(x)[k] for x in (frames,interp) for k in ('cleanBecomesCrossed','pairCountIncrease')),
      'temporal':{'samples':len(temporal),'tipVelocityAlwaysExactlyUnchanged':all(r['tipVelocityExactlyUnchanged'] for r in temporal),'largestSpeedRatio':max((r['ratio'] or 0 for r in temporal),default=None),'largestSpeedRatioRow':max(temporal,key=lambda r:r['ratio'] or 0,default=None)}}
    report={'schema':'descending-tip-paired-ellipse/v1','complete':True,'freeze':freeze,'sourceFiles':[p.receipt(CAPTURE),p.receipt(INDEX),p.receipt(p.PREVIOUS/'measurement_functions.py'),p.receipt(p.PREVIOUS/'air_metrics.py'),p.receipt(p.PREVIOUS/'prototype.py')],
      'nativeCounterevidence':[p.receipt(Path('/private/tmp/tube-whole-curl-native-review-20261004')/f'frame-{i:02}.png') for i in (3,7,10)],'units':{'captured':'actual metres','cases':'h0;7m conversion illustrative only'},
      'outcome':outcome,'actual':actual,'cases':case_reports,'invalidFrames':invalid,'crossingChanges':issues,'interpolationIssues':interpissues,'roofOrderIssues':roofissues,'temporal':temporal,
      'productionAtStart':preserved,'productionAtEnd':production_end,
      'limits':['No production/native/contact/body/board/path/adoption result.','C1 captured incoming crest tangent is unavailable; outgoing32->33 substituted explicitly.','3D alongshore/cross-case blend not covered by this fixed adjacent-time grid.','Proper crossings omit endpoint touches, collinear overlap and volume tests.','Nominal or analytic thin sheet does not prove sampled/blended surfaces remain thin.','Retained originaltip64 is the rounded-lip floor-tangent point; outermost X may move forward by a sheet-radius amount.','Original timing/tip velocity retained only because64 is exactly preserved; other geometry and future collapse/held/cache authorities would still require coherent fresh construction before production.','No hydrodynamics or water-volume conservation claim.']}
    (WORK/'report.json').write_text(json.dumps(report,separators=(',',':'))+'\n')
    (WORK/'summary.json').write_text(json.dumps({'schema':report['schema'],'outcome':outcome,'invalidFrames':invalid,'capturedRows':[{k:r[k] for k in ('row','valid','recipe','crossingChange','beforeAir113','afterAir113','beforeAir160','afterAir160','afterTurns','afterThickness','afterRoofOrder') if k in r} for r in actual],'limits':report['limits']},indent=2)+'\n')
    print(json.dumps(outcome),flush=True)

if __name__=='__main__':main()
