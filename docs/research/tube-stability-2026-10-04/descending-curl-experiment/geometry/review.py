"""Read the single immutable trial receipt; no new candidate generation or tuning."""
import json, math, hashlib, gzip
from pathlib import Path
W=Path('/private/tmp/tube-whole-curl-profile-20261004/descending-lip');p=W/'report.json';r=json.load(open(p))
frames=[(c['id'],s) for c in r['cases'] for s in c['frames']]
pathologies=[];newclean=0;migrated=[];turns=[]
for case,s in frames:
 ch=s['fullCrossingChange'];turns.append({'case':case,'frame':s['frame'],'maturity':s['recipe']['maturity'],'before':s['beforeTurns']['maximumTurn'],'after':s['afterTurns']['maximumTurn'],'delta':s['afterTurns']['maximumTurn']['absoluteTurnDegrees']-s['beforeTurns']['maximumTurn']['absoluteTurnDegrees']})
 if ch['newPairs'] or ch['retainedPairsMoved']:
  (pathologies if ch['afterPairCount']>ch['beforePairCount'] or ch['beforePairCount']==0 else migrated).append({'case':case,'frame':s['frame'],'maturity':s['recipe']['maturity'],'change':ch})
velocity=r['temporalVelocitySamples'];actual=[]
for a in r['actual']:
 air=a['after']['floorToInnerRoofAir'];tm=a['afterThickness'];middle=[q['nearestOppositeRunDistance'] for q in tm['outerMiddle40_56'] if q['point']>=47]+[q['nearestOppositeRunDistance'] for q in tm['innerRoof68_80'] if q['point']<=78]
 actual.append({'row':a['row']['row'],'maxSeparateAirGap':air['maxGap'],'continuousWidthAtGap1_6':air['largestContinuousUsefulWidth'],'centralThicknessRange47_56and68_78':[min(middle),max(middle)],'rootThicknessAt40':tm['outerMiddle40_56'][0]['nearestOppositeRunDistance'],'tipHeightChange':a['recipe']['tipYChange'],'junctions':a['afterTurns']['junctions'],'beforeAndAfterFullCrossings':[len(a['beforeFullCrossings']),a['fullCrossingChange']['afterPairCount']]})
out={'schema':'full-c-curl-reviewed-feasibility/v1','sourceReceipt':{'file':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size},
 'candidateClassification':'Promising bounded integration candidate, not completed or visually accepted.',
 'originalReceiptUnsafeMeaning':'The initial report uses a deliberately strict any changed crossing-pair gate. Paired review distinguishes inherited crossing migrations from creation or increase of crossings; no coefficients/source geometry are changed.',
 'cleanToCrossedFrames':0,'framesWithMoreCrossingPairs':len(pathologies),'inheritedCrossingMigrations':migrated,'actual':actual,
 'turnReview':{'frames':len(turns),'beforeMaxTurnOver90':sum(x['before']['absoluteTurnDegrees']>90 for x in turns),'afterMaxTurnOver90':sum(x['after']['absoluteTurnDegrees']>90 for x in turns),'largestIncrease':max(turns,key=lambda x:x['delta']),'remainingAfterOver90':[x for x in turns if x['after']['absoluteTurnDegrees']>90]},
 'adjacentFrameInterpolation':r['interpolation'],
 'continuityScope':{'tauInterpolationShares':[.25,.5,.75],'onlyContiguousOriginalEligibleFrames':True,'crossCaseInterpolationUntested':True,'actualAlongshoreFullLoftUntested':True,'float32RoundingUntested':True},
 'velocityReview':{'samples':len(velocity),'units':'h0 per sqrt(h0/g); finite differences of positions, not fitted tipVelocity or physical flow.', 'maximumRatioCandidateToOriginal':max((v['candidateMaxVertexSpeed']/v['originalMaxVertexSpeed'] for v in velocity if v['originalMaxVertexSpeed']>0),default=None),'maximumCandidate':max(velocity,key=lambda v:v['candidateMaxVertexSpeed']), 'maximumTipVelocityChange':max(velocity,key=lambda v:math.hypot(v['candidateTipVelocity'][0]-v['originalTipVelocity'][0],v['candidateTipVelocity'][1]-v['originalTipVelocity'][1]))},
 'timingProposal':{'chosenSemantic':'Retain authored touchdown as a breaking/whitewater event that initiates settling of the analytic curl; do not call it geometric tip-floor contact of the new representation.','settlingDuration':'Recompute modified held void height and retain collapseSeconds=sqrt(2*W/g), with existing shared draw/contact linear height fade. This is an authored game effect, not a validated ballistic freefall.','tipVelocity':'Refit from transformed positions using existing sustainedOverturn/refitTip before any ProfileLibrary/cache construction.','validationRequired':'All cases, all transformed frames including formerly ineligible/TD/post frames; transformed held selection, actual frame/case interpolation, native moving loft and real rider contact/body traversal.'},
 'noProductionNoNativeNoTuning':True}
(W/'review-summary.json').write_text(json.dumps(out,indent=2)+'\n')
with open(W/'report.json.gz','wb') as f:
 with gzip.GzipFile(filename='',fileobj=f,mode='wb',mtime=0) as g:g.write(p.read_bytes())
print(json.dumps({'classification':out['candidateClassification'],'changedInheritedCrossingFrames':len(migrated),'newCountPathologyFrames':len(pathologies),'turnsBeforeOver90':out['turnReview']['beforeMaxTurnOver90'],'turnsAfterOver90':out['turnReview']['afterMaxTurnOver90'],'maximumVelocityRatio':out['velocityReview']['maximumRatioCandidateToOriginal']}))
