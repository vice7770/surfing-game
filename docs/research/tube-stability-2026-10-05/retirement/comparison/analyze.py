"""Read-only bounded comparison of completed native reports/sidecars. No resources or reruns."""
from pathlib import Path
import base64,hashlib,json,math,struct
W=Path(__file__).resolve().parent
N=Path('/private/tmp/tube-bounded-c-retirement-boundary-native-20261005')
B=Path('/private/tmp/tube-stable-x-object-attribution-native-20261005')
def pin(p):
 b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def save(name,j):
 p=W/name;assert not p.exists(),p;p.write_text(json.dumps(j,indent=2,allow_nan=False)+'\n')
n=json.loads((N/'candidate-first/report.json').read_text());b=json.loads((B/'candidate-first/report.json').read_text())
assert n['complete'] and b['complete'] and n['firstFailure'] is None and b['firstFailure'] is None
no={o['movingStep']:o for o in n['observations']};bo={o['movingStep']:o for o in b['observations']};common=sorted(set(no)&set(bo));assert common==list(range(68))
inputs=[pin(p) for root in (N,B) for p in (root/'candidate-first-owner.json',root/'candidate-first/report.json',root/'seal.json',root/'candidate-first/loft-initial.json',root/'candidate-first/loft-first-phase2.json')]
stepHelper=B/'moving-shape.mjs';inputs.append(pin(stepHelper));helper=stepHelper.read_text();assert "d.step({paddle:false,popUp:false,steer:0})" in helper
assert str(stepHelper) in (N/'native.mjs').read_text();inputs.append(pin(N/'native.mjs'))
configKeys=['settings','expectedConfig','graphics','overrides']
statusPhysical={k:v for k,v in n['initial']['status'].items() if k not in ('stepMs','pipelineMs')};basePhysical={k:v for k,v in b['initial']['status'].items() if k not in ('stepMs','pipelineMs')}
matched={'initialConfigExact':n['initial']['config']==b['initial']['config'],'requestedConfigExact':{k:n[k]==b[k] for k in configKeys},'initialPhysicalStatusExactExceptExplicitTimings':statusPhysical==basePhysical,'excludedInitialStatusTimingKeys':[k for k in n['initial']['status'] if n['initial']['status'][k]!=b['initial']['status'][k]],'initialViewportExact':n['initial']['viewport']==b['initial']['viewport'],'initialBrowserDescriptorExact':n['initial']['browser']==b['initial']['browser'],'initialPublicOrderedPointsExact':no[0]['initialPublicPointIdentity']==bo[0]['initialPublicPointIdentity'],'initialLockedStationExact':no[0]['locked']==bo[0]['locked'],'initialDiagnosticCameraExact':no[0]['camera']==bo[0]['camera'],'commonObservedSteps':len(common),'commonStepRange':[common[0],common[-1]],'recordedFields':{},'controls':{'ordinaryStepInput':{'paddle':False,'popUp':False,'steer':0},'sameFrozenHelperImportedByCandidate':True,'sourceLine':103,'actualInitialControlObjectWordsRetained':False,'withinCaptureControlNonmutationRecorded':all(s['nonmutation']['normalActorControlsAndMeshUnchanged']for s in n['loftSnapshots']) and n['objectAttribution']['normalActorControlsUnchanged'],'crossCaptureInitialControlWordsEqualityClaim':False},'fullSolverArraysOrFullGPUStateEqualityClaim':False}
for key in ['seaTime','compute','locked','currentFront','rawFrontRecords','boardPose','riderPoints','ride','meshState','originalFollowCamera','initialPublicPointIdentity']:
 unequal=[step for step in common if no[step][key]!=bo[step][key]];matched['recordedFields'][key]={'equalSteps':len(common)-len(unequal),'comparedSteps':len(common),'firstDifferentStep':unequal[0] if unequal else None}
assert matched['initialConfigExact'] and matched['initialPhysicalStatusExactExceptExplicitTimings'] and matched['initialPublicOrderedPointsExact'] and matched['initialLockedStationExact']
assert all(q['firstDifferentStep'] is None for q in matched['recordedFields'].values())
def lm(o,name):
 if o['missing']:return None
 a,z=o['rows'];t=o['loftStation']['bracket']['t'];return [a[name][k]+t*(z[name][k]-a[name][k]) for k in range(3)]
def metrics(j):
 observations=j['observations'];valid=[o for o in observations if not o['missing']];deltas={}
 for name in ('crest','cap','toe'):
  pairs=[]
  for previous,current in zip(observations,observations[1:]):
   if previous['missing'] or current['missing']:continue
   a=lm(previous,name);z=lm(current,name);delta=[z[k]-a[k] for k in range(3)];pairs.append({'beforeStep':previous['movingStep'],'afterStep':current['movingStep'],'deltaXYZ':delta,'beforeXYZ':a,'afterXYZ':z})
  deltas[name]={'greatestAbsoluteY':max(pairs,key=lambda p:abs(p['deltaXYZ'][1])),'greatestAbsoluteZ':max(pairs,key=lambda p:abs(p['deltaXYZ'][2])),'greatestVectorLength':dict(max(pairs,key=lambda p:math.dist(p['beforeXYZ'],p['afterXYZ'])))}
  deltas[name]['greatestVectorLength']['length']=math.dist(deltas[name]['greatestVectorLength']['beforeXYZ'],deltas[name]['greatestVectorLength']['afterXYZ'])
 diag=[o['rayDiagnostics'] for o in observations];samples=[d['cSampling']for d in diag]
 retirekeys=('plannedSupports','retainedSupports','omittedDeadStations','budgetOmittedSupports','budgetClampedDeadStations','detachedSupports')
 retirement={k:{'min':min(s['retirement'][k]for s in samples),'max':max(s['retirement'][k]for s in samples),'initial':samples[0]['retirement'][k],'terminal':samples[-1]['retirement'][k]}for k in retirekeys} if 'retirement'in samples[0] else None
 return {'observationCount':len(observations),'physicsAdvances':j['video']['physicsAdvances'],'physicalSeconds':j['video']['physicalSeconds'],'firstPhase2':j['firstObservedPhase2'],'firstLocalAirLoss':next((o['movingStep']for o in valid if not o['openingPresent']),None),'lastJoinedObservation':valid[-1]['movingStep'],'stop':j['stop'],'locked':valid[0]['locked'],'lineageEvents':observations[-1]['lineageEvents'],'directHistoryProbe':observations[-1]['carrierHistoryProbe'],'maxSameStationDeltas':deltas,'rayInvalidIntervals':{'min':min(d['rayInvalidIntervals']for d in diag),'max':max(d['rayInvalidIntervals']for d in diag)},'positiveMeasuredMinAdvanceRange':[min(d['rayMinAdvance']for d in diag),max(d['rayMinAdvance']for d in diag)],'budgetTruncatedObservedSteps':[o['movingStep']for o in observations if o['rayDiagnostics']['cSampling']['budgetTruncated']],'omittedFrontsRange':[min(s['omittedFronts']for s in samples),max(s['omittedFronts']for s in samples)],'retirement':retirement,'totalLoftClockClampsNotRetainedInReportOrSidecars':True,'rayCorrectionsAreNotClockClampCount':True,'bodyPhases':sorted(set(o['ride']['phase']for o in observations)),'localAirClearSegments':sum(o['openingPresent'] and not o['cameraOcclusion']['indexedLoftOccluded'] for o in valid),'allVisibleMouthBodyFpsOrNormalsAcceptance':False}
nmetrics=metrics(n);bmetrics=metrics(b)
def epochDetails(j,step):
 o=j['observations'][step];return {'step':step,'rawPacketExactlyMatchesOtherCandidate':o['rawFrontRecords']==(bo[step]if j is n else no[step])['rawFrontRecords'],'firstRetainedX':o['lockedFrontRows'][0]['crest'][0],'firstRetainedFade':o['lockedFrontRows'][0]['sliceFade'],'firstLiveX':next(r['crest'][0]for r in o['lockedFrontRows']if r['sliceFade']>0),'selectedRowsX':[r['crest'][0]for r in o['rows']],'weights':[r['sliceWeight']for r in o['rows']],'intrinsicFades':[r['sliceFade']for r in o['rows']],'fixedStationMeanWeight':sum(r['sliceWeight']for r in o['rows'])/2,'landmarksAtFixedX':{k:lm(o,k)for k in ('crest','cap','toe')}}
seal={name:[epochDetails(j,step)for step in (59,60)]for name,j in [('baseline',b),('candidate',n)]}
for name in seal:
 a,z=seal[name];seal[name]={'epochs':[a,z],'weightDeltas':[z['weights'][k]-a['weights'][k]for k in (0,1)],'fixedStationWeightDelta':z['fixedStationMeanWeight']-a['fixedStationMeanWeight'],'landmarkDeltaXYZ':{k:[z['landmarksAtFixedX'][k][axis]-a['landmarksAtFixedX'][k][axis]for axis in range(3)]for k in ('crest','cap','toe')}}
assert all(e['weights']==e['intrinsicFades']for e in seal['candidate']['epochs'])
# Direct actual expired-own history; dynamic proof does not become an immutable fingerprint.
proof=no[max(no)]['carrierHistoryEvidence'];assert len(proof)==1
proof=proof[0];points=proof['publicPointIdentity']['points'];initial=no[0]['initialPublicPointIdentity']['points'];immutable=('id','column','x','footHeight','footDepth','throwZ','jetPace','jetBase','jetAt','jetUntil')
assert proof['qualified'] and points[0]['id']==158 and points[1]['id']==159
assert all(p[k]==a[k]for p,a in zip(points,initial)for k in immutable)
p=points[0];h=p['carrierSupport'];own=p['tau']<p['jetUntil'];assert not own and h['atTau']==p['tau'] and h['ownPocketAlive']==own and h['retainedForGeometry'] and h['geometricPaceActive'] and any(i['minimumPacketAge']<i['boundSeconds'] and i['potentiallyLive']for i in h['incidents'])
direct={'step':proof['movingStep'],'triggerID':158,'orderedIDs':[p['id']for p in points],'orderedColumns':[p['column']for p in points],'exactX':[p['x']for p in points],'immutableFingerprintFieldsExact':list(immutable),'sourceTau':p['tau'],'sourceOwnUntil':p['jetUntil'],'historyAtTauExact':h['atTau']==p['tau'],'ownPocketAlive':own,'retainedForGeometry':h['retainedForGeometry'],'geometricPaceActive':h['geometricPaceActive'],'state':h['state'],'incidents':h['incidents'],'solverTime':h['solverTime'],'reportedSeaTime':proof['seaTime'],'solverTimeEqualsSeaTimeRequired':False,'secondIDDirectExpiryProofExercised':False,'noDTOrLeaseExtensionTolerance':True,'allPublicExportNonmutationFlagsTrue':all(all(e[k]for k in ('snapshotClockStatusWordsUnchanged','normalActorPoseAndCameraUnchanged','surfaceWordsAndEpochUnchanged','drawGenerationUnchanged','exactLoftWordsUnchanged'))for e in no[max(no)]['publicExportEvidence'])}
# Decode exact active sidecar words and match real columns by (front, stored crestX), not array row index.
formats={'Float32Array':('f',4),'Int32Array':('i',4),'Uint32Array':('I',4),'Uint8Array':('B',1)}
def snapshot(root,label):
 j=json.loads((root/'candidate-first'/('loft-'+label+'.json')).read_text());a={};bytesByName={}
 for name,r in j['arrays'].items():
  f,size=formats[r['dtype']];buf=base64.b64decode(r['data'],validate=True);assert r['littleEndian'] and len(buf)==r['byteLength']==r['count']*size;a[name]=struct.unpack('<'+f*r['count'],buf);bytesByName[name]=buf
 assert all(j['nonmutation'].values()) and j['arrayIdentitiesAndWordsUnchanged'] and not j['unusedCapacityIncluded']
 rows={}
 for row,front in enumerate(a['sliceFront']):
  key=(front,a['positions'][3*(row*134+35)]);assert key not in rows;rows[key]=row
 return j,a,bytesByName,rows
sidecars={}
for label in ('initial','first-phase2'):
 ns,na,nb,nr=snapshot(N,label);bs,ba,bb,br=snapshot(B,label);shared=sorted(set(nr)&set(br));added=sorted(set(nr)-set(br));dropped=sorted(set(br)-set(nr));comparisons={}
 for name in na:
  if name=='indices':continue
  width=(len(na[name])//ns['counts']['slices']);assert width==len(ba[name])//bs['counts']['slices'];size=formats[ns['arrays'][name]['dtype']][1];changedRows=0;changedWords=0;maximumFinite=0
  for key in shared:
   i,j=nr[key],br[key];ab=nb[name][i*width*size:(i+1)*width*size];cb=bb[name][j*width*size:(j+1)*width*size];changedRows+=ab!=cb
   for k in range(width):
    if ab[k*size:(k+1)*size]!=cb[k*size:(k+1)*size]:changedWords+=1
    x,y=na[name][i*width+k],ba[name][j*width+k]
    if math.isfinite(x)and math.isfinite(y):maximumFinite=max(maximumFinite,abs(x-y))
  comparisons[name]={'commonRowsWordDifferent':changedRows,'commonWordsDifferent':changedWords,'maximumFiniteAbsoluteWordValueDelta':maximumFinite}
 sidecars[label]={'epochExact':ns['epoch']==bs['epoch'],'epoch':ns['epoch'],'counts':{'baseline':bs['counts'],'candidate':ns['counts']},'commonColumnCount':len(shared),'candidateAdditionalColumns':added,'candidateMissingColumns':dropped,'commonColumnWordComparison':comparisons,'indicesStoredRowOffsetsDifferAndAreNotComparedAsSamePhysicalVertices':True,'drawVertexNormalQualityOrFragmentOwnershipClaim':False}
assert sidecars['initial']['epochExact'] and sidecars['first-phase2']['epochExact']
summary={'schema':'bounded-C-retirement-boundary-actual-comparison/v1','complete':True,'inputs':inputs,'initialAndCommonTrajectoryEqualityScope':matched,'candidate':nmetrics,'baseline':bmetrics,'actual59_60RetirementSealComparison':seal,'actualExpiredOwnCarrierHistoryProof':direct,'sidecarActualColumnComparisons':sidecars,'nextNumericalPhysicalIssue':{'localAirLossStillStep56':nmetrics['firstLocalAirLoss']==bmetrics['firstLocalAirLoss']==56,'candidateStep56Weights':[r['sliceWeight']for r in no[56]['rows']],'candidateStep56IntrinsicFades':[r['sliceFade']for r in no[56]['rows']],'candidateStep56CurrentJoined':not no[56]['missing'],'candidateStep56IndexedAirAbsent':not no[56]['openingPresent'],'candidateStep56HeadingRayHit':no[56]['cameraOcclusion']['firstHit'],'extendedJoinIsZeroLiftClosureNotExtendedTubeLifetime':True},'acceptance':{'causalScope':'Recorded matched configuration/status/raw packet/body trajectory plus identical neutral stepping helper, at this fixed station; full hidden solver state was not retained.','pixelsViewedByThisAnalysis':False,'normalContinuity':False,'mouthVisibility':False,'bodyPassage':False,'FPS':False,'productionAdoption':False},'resourcesOrTestsRerun':False}
save('analysis.json',summary)
print(json.dumps({'matchedRawAndBodyObservedSteps':len(common),'initialStatusExcludedDifferences':matched['excludedInitialStatusTimingKeys'],'candidateAdvances':nmetrics['physicsAdvances'],'baselineAdvances':bmetrics['physicsAdvances'],'airLoss':[bmetrics['firstLocalAirLoss'],nmetrics['firstLocalAirLoss']],'joinLoss':[bmetrics['stop']['movingStep'],nmetrics['stop']['movingStep']],'weightDeltas':{k:v['fixedStationWeightDelta']for k,v in seal.items()},'greatestZ':{k:v['greatestAbsoluteZ']['deltaXYZ'][2]for k,v in nmetrics['maxSameStationDeltas'].items()},'sidecarCounts':{k:v['counts']for k,v in sidecars.items()},'analysisPin':pin(W/'analysis.json')}))
