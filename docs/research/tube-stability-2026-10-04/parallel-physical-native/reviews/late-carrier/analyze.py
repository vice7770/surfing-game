"""Read-only narrow carrier-to-live-row audit; writes this analysis directory only."""
import json,hashlib,math
from pathlib import Path
OUT=Path(__file__).parent
CAP=Path('/private/tmp/tube-bounded-c-parallel-native-20261004')
OLD=Path('/private/tmp/tube-bounded-c-parallel-rays-20261004/source')
NEW=Path('/private/tmp/tube-bounded-c-parallel-physics-20261004/source')
report=json.loads((CAP/'candidate-first/report.json').read_text());obs=report['observations'];owner=json.loads((CAP/'candidate-first-owner.json').read_text())
def pin(p):
 b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
files=['src/wave/barrel/BreakingFront.ts','src/wave/barrel/frontRecords.ts','src/wave/barrel/sliceClock.ts','src/wave/barrel/sweptLoft.ts','src/wave/SurfZoneSimulation.ts','src/wave/barrel/ProfileLibrary.ts','src/wave/barrel/boundedCProfile.ts']
matching=[{'path':f,'old':pin(OLD/f),'new':pin(NEW/f),'byteEqual':(OLD/f).read_bytes()==(NEW/f).read_bytes()} for f in files]
keys=['row','sliceSigma','sliceTau','slicePhase','sliceFade','sliceWeight','sliceJoined','sliceRayX','sliceRayZ','crest','cap','toe','floorDatum']
def current_station(q):
 b=q['loftStation']['bracket'];t=b['t'];rows={r['row']:r for r in q['lockedFrontRows']};a=rows[b['a']];z=rows[b['b']]
 return {'bracket':{'a':b['a'],'b':b['b'],'fraction':t},'rowStates':[{k:r[k] for k in keys} for r in [a,z]],
  'landmarks':{name:[a[name][i]+t*(z[name][i]-a[name][i]) for i in range(3)] for name in ['crest','cap','toe','floorDatum']},
  'interpolatedWeight':a['sliceWeight']+t*(z['sliceWeight']-a['sliceWeight']),
  'interpolatedFade':a['sliceFade']+t*(z['sliceFade']-a['sliceFade'])}
stations={str(i):current_station(obs[i]) for i in [62,63,64,65,66]}
deltas={k:{'delta':[b-a for a,b in zip(stations['63']['landmarks'][k],stations['64']['landmarks'][k])],
 'distance':math.dist(stations['63']['landmarks'][k],stations['64']['landmarks'][k])} for k in ['crest','cap','toe','floorDatum']}
rows64=[{k:r[k] for k in keys} for r in obs[64]['lockedFrontRows'] if 15<=r['crest'][0]<=17.5]
raw63=obs[63]['mapping']['rawRows'];raw64=obs[64]['mapping']['rawRows'];sx=obs[64]['locked']['stationX'];t=(sx-15)/2
rawdelta=[b['z']-a['z'] for a,b in zip(raw63,raw64)]
result={'schema':'bounded-C-parallel-carrier-handoff-readonly-audit/v1','frozenOwnerRetainsRejection':owner['complete'] is False,'ownerFailure':owner['firstFailure'],
 'pins':[pin(CAP/'candidate-first/report.json'),pin(CAP/'candidate-first-owner.json'),pin(NEW/'src/wave/barrel/SweptCrash.ts'),pin(NEW/'src/wave/barrel/crashCurve.ts')],
 'matchingLifecycleDrawSources':matching,'allRelevantMatchingClockDrawSourcesByteEqual':all(x['byteEqual'] for x in matching),
 'raw63':raw63,'raw64':raw64,'rawZDelta':rawdelta,'fixedXInterpolationFraction':t,'predictedFixedXRawZDelta':rawdelta[0]+t*(rawdelta[1]-rawdelta[0]),
 'initialExportedLifetime':[{'id':p['id'],'x':p['x'],'jetUntil':p['jetUntil']} for p in report['selection']['initialPublicPointIdentity']['points']],
 'stationRows':stations,'fixedXLandmarkDeltas63to64':deltas,'localRows64':rows64,
 'localPositiveWeightJoinedRows64':[r['row'] for r in rows64 if r['sliceWeight']>0 and r['sliceJoined']==1],
 'front64':{'front':obs[64]['currentFront'],'retainedRows':len(obs[64]['lockedFrontRows']),'joinedPairs':obs[64]['loftStation']['joinedPairs'],'meshState':obs[64]['meshState'],'globalCounts':obs[64]['counts']},
 'localAirLostBeforeSnap':obs[56]['openingPresent'] is False and obs[63]['openingPresent'] is False and obs[64]['openingPresent'] is False,
 'conclusion':'Expired raw carrier remains an interpolation endpoint for live phase2 positive-weight indexed loft rows. Its Z handoff changes actual crest/cap/toe geometry and tangent, not only diagnostic camera. Raster visibility of the exact step64 displacement was not captured by a checkpoint.',
 'minimalFutureCorrectionPrinciple':'Keep geometric carrier ownership/established pace while a surviving loft/contact run depends on the endpoint; keep individual jet/air lifecycle expiry unchanged. Ordinary reacquisition belongs after support dependence is gone. The dependency includes interpolation/end extension and local clock/arc support, not merely own tau<jetUntil.',
 'boundedIncidentSupportCriterion':{
  'domain':'Each incident adjacent raw segment in the same component/order, including an endpoint extension using its repeated clock/profile query.',
  'exactSupport':'exists lambda in [0,1]: interpolated tau(lambda) < profileTimes(interpolated footHeight(lambda),footDepth(lambda)).touchdownSeconds+collapseSeconds',
  'sourceRetiredNDBound':'authoredTD + 0.3*authoredTD*fraction + 0.3*authoredTD <= 1.6*authoredTD; event fraction is in [0,1]',
  'finiteSegmentUpperBound':'B = 1.6 * max_segment(authoredTD) * sqrt(max_segment(actual ProfileLibrary bracket scale) / GRAVITY), rounded conservatively upward.',
  'certifiedIncidentRetirement':'min(endpoint tau) >= B. This is sufficient, not necessary, and protects nonlinear interior lifetimes.',
  'boundEvaluation':'Positive interpolated H,D make H/D monotone. Partition at crossed case/clamp nonlinearity knots; authoredTD extrema are at partition endpoints, and bracket scale is piecewise linear (D on blends, H/caseNonlinearity on a single clamped case). Use those exact branch values, not D alone.',
  'prohibitedShortcuts':['max of endpoint jetUntil only','fixed extra seconds','camera damping','re-extending individual pocket/air lifetime'],
  'sharedGates':['BreakingFront claimed/coasted carrier matching','SweptCrash placed carrier Z','frontRecords geometric pace serialization','new public-export lineage finite carrier-history predicates'],
  'scopeLimit':'Whole-front sigma sampling and local clock fitting can transmit effects beyond incident sections; bounded regressions must check those after retirement. Existing stalls must coherently retire dependent support before forcing reacquisition.'},
 'noRuntimeTestsBuildNativeResourcesOrGit':True}
(OUT/'analysis.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'matchingClockDrawSourcesByteEqual':result['allRelevantMatchingClockDrawSourcesByteEqual'],'rawZDelta':rawdelta,'fixedXPredictedZDelta':result['predictedFixedXRawZDelta'],'positiveJoinedRows64':result['localPositiveWeightJoinedRows64'],'stations':{k:{'bracket':s['bracket'],'weight':s['interpolatedWeight'],'fade':s['interpolatedFade']} for k,s in stations.items()},'landmarkDeltas':deltas},indent=2))
