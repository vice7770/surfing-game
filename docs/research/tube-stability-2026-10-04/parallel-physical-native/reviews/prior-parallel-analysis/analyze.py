"""Read-only independent audit. Writes only this new analysis directory."""
import hashlib, json, math, pathlib, struct
P = pathlib.Path('/private/tmp/tube-bounded-c-parallel-native-20261004')
OUT = pathlib.Path(__file__).parent
def read(p): return json.loads(pathlib.Path(p).read_text())
def digest(p):
    p=pathlib.Path(p); b=p.read_bytes()
    return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def verify(p):
    try:
        actual=digest(p['file']); ok=all(actual[k]==p[k] for k in ['bytes','sha256'])
        return {'file':p['file'],'matched':ok,**({} if ok else {'expected':p,'actual':actual})}
    except Exception as e: return {'file':p.get('file'),'matched':False,'error':str(e)}
report=read(P/'candidate-first/report.json'); owner=read(P/'candidate-first-owner.json')
launcher=read(P/'candidate-first/launcher.json')
seal=read(P/'seal.json'); build=read(P/'root-complete-build-result.json')
arm=seal['arms']['candidate']; obs=report['observations']; sel=report['selection']
checks=[]
def check(name,ok,scope=None):
    checks.append({'name':name,'passed':bool(ok),**({'scope':scope} if scope else {})})
groups={
 'sealedHelpers':seal['helperPins'],'sealedSource':arm['sourcePins'],
 'sealedCompleteAssets':arm['assetPins'],'buildSource':build['sourcePins'],
 'builtAssets':build['builtAssetPins'],'frozenBuildAssets':build['frozenAssetPins'],
 'buildReferences':[arm['rootBuildManifest'],build['rootOriginalBuildResult'],build['rootPartialBuildResult'],build['priorStaticAssetsSeal'],seal['priorAirSeal'],seal['priorFullsheetSeal']],
 'staticComposition':[p[k] for p in build['staticComposition']['references'] for k in ['source','frozenCopy']]+[p[k] for p in build['staticComposition']['overlap'] for k in ['source','sameBuiltAsset']],
 'servedAssets':[{'file':str(pathlib.Path(owner['dist'])/relative),**pin} for relative,pin in owner['served'].items()],
 'captureArtifacts':[{'file':str(P/'candidate-first'/pin['file']),**{k:v for k,v in pin.items() if k!='file'}} for pin in report['artifacts']],
}
partial=read(build['rootPartialBuildResult']['file']); groups['preservedPartialAssets']=partial['assetPins']
pinResults={name:{'count':len(pins),'allMatched':all(v['matched'] for v in result),'failures':[v for v in result if not v['matched']]} for name,pins in groups.items() for result in [[verify(p) for p in pins]]}
for name,result in pinResults.items(): check('pins:'+name,result['allMatched'])
sealDigest=digest(P/'seal.json')
check('owner seal hash',owner['sealSha256']==sealDigest['sha256'])
check('native sealed arm object',report['seal']==arm)
check('native prior seals',report['priorAirSeal']==seal['priorAirSeal'] and report['priorFullsheetSeal']==seal['priorFullsheetSeal'])
check('build seal source pins',build['sourcePins']==arm['sourcePins'])
check('frozen build and seal assets',build['frozenAssetPins']==arm['assetPins'])
check('build completed',build['terminal'] is True and build['exitCode']==0 and build['sourceUnchangedAfterBuild'] is True)
check('native completed',report['complete'] is True and report['firstFailure'] is None and owner['exitCode']==0)
check('owner remains rejected',owner['complete'] is False and owner['firstFailure']=="'materialPointIdentityClaim'" and 'sourceBuildHelpersPostUnchanged' not in owner)
check('closure recorded',owner['independentClosureValid'] is True and owner['protectedPortsPreserved'] is True and owner['protectedStatesInitially']==owner['protectedStatesFinally'] and owner['remainingOwnedPids']==[] and all(owner['closedPorts'].values()) and report['chromeClosed'] is True)
check('browser errors absent',report['browserErrors']==[])
check('artifact caps',2<=len(report['checkpoints'])<=4 and report['pngBytes']<=48*1024*1024 and report['video']['bytes']<=16*1024*1024 and (P/'candidate-first/report.json').stat().st_size<=32*1024*1024)
req=report['videoRequests']; video=report['video']
check('bounded moving request sequence',2<=len(req)<=241 and video['requestFrameCount']==len(req)==len(obs) and [o['movingStep'] for o in obs]==list(range(len(req))))
check('request timestamps and camera tie to observations',all(q['request']==i+1 and q['step']==o['step'] and abs(q['seaTime']-o['seaTime'])<1e-7 and q['cameraPosition']==o['camera']['position'] and q['cameraQuaternion']==o['camera']['quaternion'] for i,(q,o) in enumerate(zip(req,obs))) and all(req[i]['requestedWallMs']>=req[i-1]['requestedWallMs'] for i in range(1,len(req))))
check('ordinary physical clock',all(abs(obs[i]['seaTime']-obs[i-1]['seaTime']-1/60)<1e-7 for i in range(1,len(obs))) and video['physicsAdvances']==len(obs)-1 and abs(video['physicalSeconds']-(obs[-1]['seaTime']-obs[0]['seaTime']))<1e-7)
check('manual capture limitations',video['physicalPlaybackRateClaim'] is False and video['encodedFrameCountClaim'] is False and report['fpsClaim'] is False and video['tracksStopped'] is True)
check('detector/step limits',report['detectorMilliseconds']<=20000 and sel['step']<=300 and video['physicsAdvances']<=240)
last=obs[-1]
check('terminal camera held at last valid pose',last['cameraHeldAtLastValidPose'] is True and last['camera']==obs[-2]['camera'])
check('owned launcher closed normally',launcher['ownedChromeClosed'] is True and launcher['exit']['code']==0)
check('bounded final local join loss',report['stop']['reason']=='loft-join-absent' and last['missing'] is True and last['stopReason']==report['stop']['reason'] and last['retirementClaim'] is False and len(last['allFrontRowsOnLoss'])==last['counts']['slices'])
check('fixed station all epochs',all(o['locked']==sel['locked'] and isinstance(o['currentFront'],int) and o['locked']['stationIdentity']=='fixed-Eulerian-solver-column-crest-station' and o['locked']['materialTrajectoryClaim'] is False and o['retirementClaim'] is False for o in obs))
check('raw record counts',all(len(o['rawFrontRecords'])==o['counts']['front'] for o in obs))
check('initial export identity gates',all(o['initialPublicPointIdentity']['qualified'] is True and len(o['initialPublicPointIdentity']['pointIDs'])==2 and all(v is True for v in o['initialPublicPointIdentity']['gates'].values()) for o in obs),'Runtime global active-ID uniqueness gate is stored; only matching two exported points are retained offline.')
exportFlags=['snapshotClockStatusWordsUnchanged','normalActorPoseAndCameraUnchanged','surfaceWordsAndEpochUnchanged','drawGenerationUnchanged','exactLoftWordsUnchanged']
exports={e['step']:e for o in obs for e in o['publicExportEvidence']}
check('public export exact words/actors/epoch gates',all(all(e[k] is True for k in exportFlags) and e['solverArraysDecodedOrRetained'] is False and abs(e['seaTime']-e['exportedSeaTime'])<1e-7 for e in exports.values()),'Frozen helper compares all active position/index/slice bytes and snapshot/surface bytes at runtime; full byte arrays are not persisted for offline recomputation.')
check('current draw epoch gates',all(e['drawnWaterTimeMatchesCurrentSnapshot'] is True and e['snapshotIdentityUnchanged'] is True and e['physicsClockUnchanged'] is True and e['supportedOrder']==['water.update','mode.drawBarrel'] and abs(e['seaTime']-o['seaTime'])<1e-7 and e['diagnosticDrawnRevisionAvailable'] is True and e['drawnRevisionIsCurrentStatus'] is True and e['drawnFrontIsCurrentBuffer'] is True and e['drawnCount']==o['counts']['front'] and e['drawnSurfaceRevision']==e['surfaceRevisionAfter'] for o in obs for e in [o['drawEpoch']]))
check('render exact words/actors/draw gates',all(all(v is True for v in o['renderEvidence'].values()) for o in obs[1:]),'Records plus frozen byte-comparison implementation, not an offline full-mesh recomputation.')
check('PNG capture render gates',all(all(v is True for v in c['evidence'].values()) and c['normalMeshOpacityAndVisibility'] is True for c in report['checkpoints']))
check('positive measured ray diagnostics',all(d['rayInvalidIntervals']==0 and (d['joinedRowPairs']==0 or d['rayMinAdvance']>0 and d['rayMaxBlend']==1) for o in obs for d in [o['rayDiagnostics']]))
valid=[o for o in obs if not o['missing']]
check('current joined rows and air camera gates',all(o['rawMappingCorroboration']['usedToLocateLoftRows'] is False and o['loftStation']['bracket'] is not None and o['loftStation']['stationFrom']=='current-joined-loft-crest-world-X' and (not o['openingPresent'] or o['cameraColumns']['eye']['strictSameFrontAirBandContainsCameraHeight'] is True) and 'eye' in o['cameraColumns'] and 'target' in o['cameraColumns'] and 'firstHit' in o['cameraOcclusion'] and o['visibilityProven'] is False and o['retargeted'] is False for o in valid))
check('fixed shoreward local ray',all(o['ray']==[0,1] for o in valid))
check('no mouth/body/geometry appearance adoption claim',report['bodyEntryClaim'] is False and report['physicalGeometryEqualityClaim'] is False and report['nativeMovingAppearanceProven'] is False)
def f32(x): return struct.unpack('f',struct.pack('f',x))[0]
fp=['x','footHeight','footDepth','throwZ','jetPace','jetBase','jetAt','jetUntil']
initial=sel['initialPublicPointIdentity']['points']
def retainedIdentity(identity,raw):
    ps=identity['points']
    return len(ps)==2 and identity['matchCounts']==[1,1] and all(
      p['id']==initial[i]['id'] and p['column']==initial[i]['column'] and all(p[k]==initial[i][k] for k in fp)
      and all(f32(p[k])==raw[i][k] for k in ['x','z','front','sigma','tau','footHeight','footDepth','throwZ'])
      and p['tau']>=initial[i]['tau'] and 0<=p['tau']<p['jetUntil'] and f32(p['jetPace'])==raw[i]['pace']
      for i,p in enumerate(ps))
check('initial retained two-point F32/fingerprint parity',retainedIdentity(sel['initialPublicPointIdentity'],sel['mapping']['rawRows']))
events=[]
for o in obs:
 e=o['lineageDecision']
 if not e or not e.get('componentLineageEvent'): continue
 passing=[c for c in e['testedCandidates'] if c['qualified']]; c=passing[0]
 ok=(len(passing)==e['qualifiedCount']==1 and c['front']==o['currentFront'] and all(v is True for v in c['gates'].values()) and e['materialTrajectoryClaim'] is False and 'materialPointIdentityClaim' not in e and e['DTEqualityRequired'] is False and e['physicalDeathClaim'] is False and e['provenOrderedInternalPointIDs']==o['initialPublicPointIdentity']['pointIDs'] and retainedIdentity(c['publicPointIdentity'],c['afterRawColumns']) and all(a['passesMonotone'] is True and a['afterTau']>=a['beforeTau']>=0 for a in c['ages']))
 check('new lineage predicates at step '+str(o['step']),ok)
 events.append({'step':o['step'],'beforeFront':e['beforeFront'],'afterFront':e['afterFront'],'testedCount':len(e['testedCandidates']),'qualifiedCount':e['qualifiedCount'],'IDs':e['provenOrderedInternalPointIDs'],'allNewPredicatesPassed':ok,'ageDiagnostics':c['ages'],'crestZMotion':c['crestZMotion']})
def norm(v):return math.sqrt(sum(x*x for x in v))
def distance(a,b):return norm([x-y for x,y in zip(a,b)])
def angle(a,b):return math.degrees(math.acos(max(-1,min(1,sum(x*y for x,y in zip(a,b))/(norm(a)*norm(b))))))
deltas=[]
for i in range(1,len(valid)):
 a,b=valid[i-1],valid[i]
 deltas.append({'step':b['step'],'crestDistance':distance(a['crest'],b['crest']),'crestZDelta':b['crest'][2]-a['crest'][2],'eyeDistance':distance(a['eye'],b['eye']),'eyeYDelta':b['eye'][1]-a['eye'][1],'tangentAngleDegrees':angle(a['tangent'],b['tangent']),'openingBefore':a['openingPresent'],'openingAfter':b['openingPresent'],'frontRename':a['currentFront']!=b['currentFront']})
for e in events: e['localPoseDelta']=next(d for d in deltas if d['step']==e['step'])
def extrema(ds):
 return {k:max(ds,key=lambda d:d[k]) for k in ['crestDistance','eyeDistance','tangentAngleDegrees']}
geometry={
 'fixedStation':sel['locked'],'initialPointIDs':[p['id'] for p in initial],'publicExportEpochs':sorted(exports),
 'observations':len(obs),'validJoinedObservations':len(valid),'ordinaryAdvances':video['physicsAdvances'],'physicalSeconds':video['physicalSeconds'],
 'firstPhase2':report['firstObservedPhase2'],'openSteps':[o['step'] for o in valid if o['openingPresent']],
 'lostAirSteps':[o['step'] for o in valid if not o['openingPresent']],
 'eyeStrictAirSteps':[o['step'] for o in valid if o['cameraColumns']['eye']['strictSameFrontAirBandContainsCameraHeight']],
 'targetStrictAirSteps':[o['step'] for o in valid if o['cameraColumns']['target']['strictSameFrontAirBandContainsCameraHeight']],
 'indexedSegmentOcclusionSteps':[o['step'] for o in valid if o['cameraOcclusion']['indexedLoftOccluded']],
 'ordinaryUnmaskedWaterAboveEyeSteps':[o['step'] for o in valid if o['cameraColumns']['eye']['ordinaryDrawnWater']['height']>o['eye'][1]],
 'rayMinAdvanceRange':[min(o['rayDiagnostics']['rayMinAdvance'] for o in obs),max(o['rayDiagnostics']['rayMinAdvance'] for o in obs)],
 'globalJoinedPairRange':[min(o['rayDiagnostics']['joinedRowPairs'] for o in obs),max(o['rayDiagnostics']['joinedRowPairs'] for o in obs)],
 'localMappedResidualMaximum':{k:max(abs(o[k]) for o in valid) for k in ['mappedCrestXResidual','mappedCrestZResidual']},
 'allValidExtrema':extrema(deltas),'whileAirRemainsExtrema':extrema([d for d in deltas if d['openingBefore'] and d['openingAfter']]),
 'afterAirLossExtrema':extrema([d for d in deltas if not d['openingAfter']]),'renameEvents':events,
 'keyObservations':[{k:o.get(k) for k in ['step','seaTime','currentFront','missing','openingPresent','openingHeight','crest','eye','target','ray','tangent','cameraHeightPolicy','cameraHeldAtLastValidPose','loftStation','mapping','counts']} for o in [obs[i] for i in [0,30,47,48,55,56,63,64,66,67]]],
 'poseDeltas':deltas,
 'finalJoinedFrontRange':[last['lockedFrontRows'][0]['crest'][0],last['lockedFrontRows'][-1]['crest'][0]],
 'finalStationBeforeFirstRetainedRow':last['lockedFrontRows'][0]['crest'][0]-sel['locked']['stationX'],
 'lastJoinedFirstRows':[{k:row.get(k) for k in ['row','crest','sliceTau','slicePhase','sliceFade','sliceWeight','sliceJoined']} for row in last['lockedFrontRows'][:2]],
 'lastValidFirstRows':[{k:row.get(k) for k in ['row','crest','sliceTau','slicePhase','sliceFade','sliceWeight','sliceJoined']} for row in obs[-2]['lockedFrontRows'][:2]],
 'checkpointSteps':[{'label':c['label'],'step':c['step']} for c in report['checkpoints']],
}
# Remove full-profile raw mapping copies from key observations; retain local bracket and range.
for o in geometry['keyObservations']:
 if isinstance(o['mapping'],dict):o['mapping']={k:v for k,v in o['mapping'].items() if k!='points'}
result={
 'schema':'bounded-C-parallel-native-independent-analysis/v1','readOnlyAudit':True,'frozenOwnerAccepted':False,'frozenOwnerUnmodified':True,
 'ownerStatus':{k:owner[k] for k in ['complete','firstFailure','exitCode','sealSha256','elapsedSeconds','independentClosureValid','protectedPortsPreserved','protectedStatesInitially','protectedStatesFinally','remainingOwnedPids','closedPorts']},
 'independentRecordedGateAnalysisPassed':all(c['passed'] for c in checks),'checks':checks,'pinGroups':pinResults,
 'inputPins':[digest(P/f) for f in ['seal.json','candidate-first-owner.json','candidate-first/report.json','candidate-first/launcher.json','run.py','moving-shape.mjs','station-tools.mjs','root-complete-build-result.json']],
 'nativeCapture':{k:report[k] for k in ['schema','complete','firstFailure','video','stop','browserErrors','detectorMilliseconds','install','firstObservedPhase2']},
 'geometry':geometry,
 'scope':'Moving current local indexed air at one fixed Eulerian crest-X and along offset. No body entry, whole mouth, physical equality, material trajectory, visual adoption, death, FPS or encoded-frame acceptance.',
 'limits':['Stored runtime byte-comparison gates plus frozen helper implementation were reviewed; entire active mesh and snapshot words are not persisted offline.','Global uniqueness of all active exported IDs is a stored runtime gate; retained two-point IDs, exact fingerprints and F32 parity are independently recomputed.','Resource closure is the existing frozen owner/launcher evidence, not a new process or port probe.']}
(OUT/'analysis.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'passed':result['independentRecordedGateAnalysisPassed'],'failedChecks':[c for c in checks if not c['passed']],'pinGroups':pinResults,'geometrySummary':{k:geometry[k] for k in ['publicExportEpochs','firstPhase2','lostAirSteps','indexedSegmentOcclusionSteps','rayMinAdvanceRange','allValidExtrema','whileAirRemainsExtrema','finalJoinedFrontRange','finalStationBeforeFirstRetainedRow']}},indent=2))
