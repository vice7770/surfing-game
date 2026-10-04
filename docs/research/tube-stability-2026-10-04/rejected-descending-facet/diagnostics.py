"""Causal diagnostics/illustrations only; the frozen candidate is unchanged."""
from pathlib import Path
import gzip, importlib.util, json, math, struct
W=Path('/private/tmp/tube-descending-facet-profile-20261004')
ROOT=Path('/Users/regina/Desktop/Projects/surfing-game')
ARCHIVE=Path('/private/tmp/tube-rejected-live-source-verification-20261004')
spec=importlib.util.spec_from_file_location('frozen_descending_facet',W/'prototype.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
r=json.load(open(W/'report.json'))
allframes=[f for c in r['cases'] for f in c['frames']]
refs=json.load(open('/private/tmp/tube-monotone-inner-profile-20261004/eligible-cases.json'))

def archived_baseline():
    start=json.load(open(W/'evaluation-start.json'))
    rows=[]
    for expected in start['productionAtStart']:
        relative=Path(expected['file']).relative_to(ROOT)
        actual=p.receipt(ARCHIVE/relative)
        rows.append({'relativeFile':str(relative),'expected':expected,'immutableArchive':actual,
                     'sameBytesAndSha256':expected['sha256']==actual['sha256'] and expected['bytes']==actual['bytes']})
    receipt={'all12Match':all(x['sameBytesAndSha256'] for x in rows),'files':rows,
       'parentArchiveReceipt':p.receipt(ARCHIVE/'receipt.json'),
       'parentIntentionalRestorationReceipt':p.receipt(ARCHIVE/'restoration.json'),
       'originalEvaluationFinishedWithMatchingLiveStartAndEnd':r['outcome']['production12HashesUnchanged'],
       'baselineForSubsequentWork':'immutable reconstructed sources; root intentionally restored rejected live WIP after evaluation',
       'frozenCandidateCodeStillMatches':p.receipt(W/'prototype.py')==r['freeze']['prototype'],
       'frozenRecipeStillMatches':p.receipt(W/'recipe.md')==r['freeze']['recipe'],
       'frozenEvaluatorStillMatches':p.receipt(W/'evaluate.py')==r['freeze']['evaluator']}
    assert receipt['all12Match'] and all(receipt[k] for k in ('frozenCandidateCodeStillMatches','frozenRecipeStillMatches','frozenEvaluatorStillMatches'))
    (W/'immutable-source-baseline.json').write_text(json.dumps(receipt,indent=2)+'\n')
    return receipt

def rawframes(caseid):
    ref=next(c for c in refs['cases'] if c['id']==caseid)
    b=Path(ref['asset']['file']).read_bytes();_,size=struct.unpack_from('<II',b)
    header=json.loads(b[8:8+size]);start=8+((size+3)//4)*4
    values=struct.unpack('<'+str((len(b)-start)//4)+'f',b[start:])
    count=len(values)//258
    return [[{'point':i,'q':values[f*256+2*i],'y':values[f*256+2*i+1]} for i in range(128)] for f in range(count)],header

def blend(a,b,t):
    return [{'point':x['point'],'q':p.F32(x['q']+(y['q']-x['q'])*t),'y':p.F32(x['y']+(y['y']-x['y'])*t)} for x,y in zip(a,b)]

def curvature(control):
    A,B,C,D=control;rows=[]
    for i in range(4097):
        t=i/4096;s=1-t
        v=p.mul(p.add(p.add(p.mul(p.sub(B,A),s*s),p.mul(p.sub(C,B),2*s*t)),p.mul(p.sub(D,C),t*t)),3)
        a=p.mul(p.add(p.mul(p.add(p.sub(C,p.mul(B,2)),A),s),p.mul(p.add(p.sub(D,p.mul(C,2)),B),t)),6)
        speed=p.norm(v);k=abs(p.cross(v,a))/(speed**3) if speed else math.inf
        rows.append({'t':t,'curvature':k,'radius':1/k if k else None,'point':p.bezier(*control,t)})
    high=max(rows,key=lambda x:x['curvature'])
    return {'minimumRadius':high['radius'],'atT':high['t'],'point':high['point'],'sampleCount':len(rows),'scope':'continuous analytic cubic sampled uniformly in parameter; diagnostic, not candidate modification'}

def slim(f):
    return {k:f[k] for k in ('case','frame','tau','phase','frames','share','recipe','afterTurns','beforeTurns','crossingChange','beforeCapFloor','afterCapFloor') if k in f}

def facet_classification(rows):
    bad=[f for f in rows if f['valid'] and f['facetConstraints']['outsideVertices']]
    active=[f for f in bad if f['recipe'].get('originalReach',0)>0]
    zero=[f for f in bad if f['recipe'].get('zeroReach')]
    return {'outsideCountRecordedByFrozenEvaluator':len(bad),'active':len(active),'zeroReach':len(zero),
       'minimumRecordedMargin':min((f['facetConstraints']['minimumInnerMargin'] for f in bad),default=None),
       'causeForAuthoritativeOrder':'All negative margins occur at a collapsed zero-reach L=B endpoint on its final roof plane and are <=3.5e-18 h0 rounding residuals. Frozen counts retained.' if not active else 'Actual positive-reach outside points exist.',
       'activeSamples':[slim(f) for f in active]}

def main():
    baseline=archived_baseline()
    captured=[]
    for f in r['actual']:
        curved=curvature(f['recipe']['innerAttachment'])
        captured.append({'row':f['row']['row'],'width113':f['afterAir113']['continuousWidth'],
          'width160':f['afterAir160']['continuousWidth'],'maxGap':f['afterAir113']['maxGap']['gap'],
          'lipDrop':f['recipe']['crestToOriginalTipDrop'],'nominalSheetThickness':f['recipe']['sheetThickness'],
          'actualNearestOpposingBoundaryRange':f['afterThickness']['range'],
          'useful113VerticalRoofSeparationRange':f['afterAir113']['verticalRoofThicknessRange'],
          'maximumSampledTurn':f['afterTurns']['maximum'],'continuousAttachmentCurvature':curved,
          'oneReturnEdgeArcLength':f['recipe']['returnAndAttachmentLength']/18})
    newsharp=[f for f in allframes if f['afterTurns']['over90'] and not f['beforeTurns']['over90']]
    zeros=[f for f in allframes if f['recipe'].get('zeroReach')]
    active=[f for f in allframes if f['recipe'].get('capExists')]
    worstzero=max(zeros,key=lambda f:f['maximumVertexDisplacement'])
    worstactive=max(active,key=lambda f:f['afterTurns']['maximum']['absoluteTurnDegrees'])
    diagnostics={'immutableBaseline':{'all12Match':baseline['all12Match']},'captured':captured,
      'nonpositiveWidthDomains':sum(f['recipe']['width']<=0 for f in allframes),
      'nonpositiveDropDomains':sum(f['recipe']['crestToOriginalTipDrop']<=0 for f in allframes),
      'zeroReachCount':len(zeros),'allZeroReachOuterSurfacesChanged':all(f['maximumVertexDisplacement']>0 for f in zeros),
      'worstZeroReach':slim(worstzero)|{'maximumDisplacement':worstzero['maximumVertexDisplacement']},
      'worstPositiveReachTurn':slim(worstactive),
      'rawFramesWithNewOver90Turn':len(newsharp),'newOver90Samples':[slim(f) for f in newsharp],
      'finiteThicknessFloorActiveCount':sum(bool(f['recipe'].get('thicknessRaisedForRepresentability')) for f in active),
      'facetChecks':{'raw':facet_classification(allframes),'afterRawInterpolation':facet_classification(r['authoritativeInterpolationIssues']),
                     'pretransformDiagnostic':facet_classification(r['pretransformInterpolationIssues'])},
      'crossingFailures':[slim(f) for f in allframes if f['crossingChange']['newPairs']],
      'afterInterpolationCrossingFailures':[slim(f) for f in r['authoritativeInterpolationIssues'] if f['crossingChange']['newPairs']],
      'eventTiming':[{k:t[k] for k in ('case','authoredTD','originalHeldFrame','lastCapStrictlyClearPreTD','lastCapAtOriginalThresholdPreTD')} for t in r['timeTrace']],
      'timingCaveat':'tau accumulation can place the nominal TD frame just above/below authoredTD by ~1e-13; last-positive indices distinguish collapsed zero reach from physical collision.'}
    fixtures=[]
    selected=[('periodic-reef42-l12',77,None,'Inherited floor hump intersects new convex roof'),
              ('periodic-reef42-l12',128,None,'Fixed throat + sparse return: 145.46 degree bend'),
              ('periodic-reef42-l12',4,None,'Zero-reach ordinary surface moves 0.4224 h0'),
              ('periodic-point21-a30-l12',166,.75,'Pre-TD cap contacts retained floor'),
              ('pad19-a30-l12',155,.75,'After-query clean; pretransform blend crosses'),
              ('periodic-point21-a30-l12',123,None,'Formation return bend 122.77 degrees')]
    for case,frame,t,title in selected:
        frames,head=rawframes(case);raw=frames[frame] if t is None else blend(frames[frame],frames[frame+1],t)
        after,meta=p.transform(raw);assert after is not None
        before_blend=None
        if t is not None:
            a,_=p.transform(frames[frame]);b,_=p.transform(frames[frame+1]);before_blend=blend(a,b,t)
        fixtures.append({'case':case,'frame':frame,'share':t,'title':title,'raw':raw,'after':after,'recipe':meta,
                         'pretransformedBlend':before_blend,'header':head})
    (W/'causal-diagnostics.json').write_text(json.dumps(diagnostics,indent=2)+'\n')
    (W/'failure-profiles.json').write_text(json.dumps(fixtures,indent=2)+'\n')
    print(json.dumps({'capturedAttachmentRadius':[(f['row'],f['continuousAttachmentCurvature']['minimumRadius']) for f in captured],
                      'rawNewOver90Turns':len(newsharp),'finiteThicknessFloorCount':diagnostics['finiteThicknessFloorActiveCount'],
                      'immutable12':baseline['all12Match']}))

if __name__=='__main__':main()
