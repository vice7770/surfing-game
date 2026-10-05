from pathlib import Path
import base64, collections, hashlib, json, math, struct

W=Path('/private/tmp/tube-bounded-c-stable-x-native-20261005')
OUT=Path('/private/tmp/tube-stable-x-native-evidence-review-20261005')
OLD=Path('/private/tmp/tube-bounded-c-carrier-support-native-20261004/candidate-first')
def read(p): return json.loads(p.read_text())
def pin(p):
    b=p.read_bytes(); return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def checked(entries):
    bad=[]
    for e in entries:
        p=Path(e['file']); q=pin(p)
        if any(q[k]!=e[k] for k in ['bytes','sha256']):bad.append(str(p))
    return {'count':len(entries),'mismatches':bad}
def interpolate(o,key):
    b=o['loftStation'].get('bracket'); rows=o.get('rows')
    if not b or not rows:return None
    t=b['t']; return [a+t*(c-a) for a,c in zip(rows[0][key],rows[1][key])]
def transitions(o,key,vec=False):
    out=[]
    for a,b in zip(o,o[1:]):
        x=a.get(key);y=b.get(key)
        if x is None or y is None:continue
        if vec:
            d=[t-s for s,t in zip(x,y)]; value=math.sqrt(sum(v*v for v in d))
        else:d=y-x;value=abs(d)
        out.append({'beforeStep':a['step'],'afterStep':b['step'],'delta':d,'magnitude':value})
    return sorted(out,key=lambda a:a['magnitude'],reverse=True)
r=read(W/'candidate-first/report.json'); owner=read(W/'candidate-first-owner.json')
seal=read(W/'seal.json');ready=read(W/'readiness.json');build=read(W/'root-complete-build-result.json')
old=read(OLD/'report.json'); obs=r['observations'];live=[o for o in obs if not o.get('missing')]
geometry=[]
for o in live:
    geometry.append({'step':o['step'],'crest':o['crest'],'eye':o['eye'],'center':o['center'],
      'cap':interpolate(o,'cap'),'toe':interpolate(o,'toe'),'floorDatum':interpolate(o,'floorDatum'),
      'tau':o['loftStation']['bracket']['tau'],'weight':o['rows'][0]['sliceWeight']+o['loftStation']['bracket']['t']*(o['rows'][1]['sliceWeight']-o['rows'][0]['sliceWeight'])})
jumps={k:transitions(geometry,k,True)[:3] for k in ['crest','cap','toe','floorDatum','eye','center']}
jumps.update({k:transitions(geometry,k)[:3] for k in ['tau','weight']})
for key in ['crest','cap','toe','floorDatum','eye']:
    pairs=transitions(geometry,key,True)
    jumps[key+'MaxAbsoluteAxes']=[max(pairs,key=lambda q:abs(q['delta'][axis])) for axis in range(3)]
opening=[o['step'] for o in obs if o.get('openingPresent') is True]
noAir=[o['step'] for o in live if o.get('openingPresent') is False]
mouth=[o for o in obs if isinstance(o.get('mouth'),dict)]
diags=[o['rayDiagnostics'] for o in obs]; cs=[d['cSampling'] for d in diags]
diagSummary={k:{'min':min(c[k] for c in cs),'max':max(c[k] for c in cs)} for k in ['mandatoryRawKnots','plannedStations','omittedPrecisionStations','collapsedShoulders','omittedFronts','minimumStoredDeltaX','minimumStoredDeltaSigma']}
diagSummary.update({'allPolicyCorrect':all(c['policy']=='fixed-origin-stored-F32-X-and-raw-knots/v1' for c in cs),
  'budgetTruncatedSteps':[o['step'] for o in obs if o['rayDiagnostics']['cSampling']['budgetTruncated']],
  'allBlendOne':all(d['rayMaxBlend']==1 for d in diags),'invalidIntervalSum':sum(d['rayInvalidIntervals'] for d in diags),
  'rayMinAdvanceMin':min(d['rayMinAdvance'] for d in diags),'rayMinAdvanceMax':max(d['rayMinAdvance'] for d in diags)})
event=obs[-1]['carrierHistoryEvidence']
direct=[]
for e in event:
    direct.append({'step':e['step'],'triggerPointIDs':e['triggerPointIDs'],'qualified':e['qualified'],'gates':e['gates'],
      'materialTrajectoryClaim':e['materialTrajectoryClaim'],'leaseDurationOrDTGate':e['leaseDurationOrDTGate'],
      'points':[{'id':p['id'],'x':p['x'],'front':p['front'],'tau':p['tau'],'jetUntil':p['jetUntil'],
      'ownPocketAlive':p['carrierSupport']['ownPocketAlive'],'retainedForGeometry':p['carrierSupport']['retainedForGeometry'],
      'geometricPaceActive':p['carrierSupport']['geometricPaceActive'],'state':p['carrierSupport']['state'],
      'incidentBounds':[q['boundSeconds'] for q in p['carrierSupport']['incidents']]} for p in e['publicPointIdentity']['points']]})
raw=[]
for o in obs:
    for p in (o.get('mapping') or {}).get('rawRows',[]):raw.append({'step':o['step'],**p})
rawSummary={str(x):{'maximumZTransition':transitions([q for q in raw if q['x']==x],'z')[:1],
 'terminalRow':next((q for q in reversed(raw) if q['x']==x),None)} for x in [15,17]}
sidecars=[]
for entry in r['loftSnapshots']:
    p=W/'candidate-first'/entry['file'];d=read(p); arrays={};rawTotal=0
    for k,a in d['arrays'].items():
        b=base64.b64decode(a['data'],validate=True); rawTotal+=len(b)
        unit=1 if a['dtype']=='Uint8Array' else 4
        arrays[k]={'dtype':a['dtype'],'count':a['count'],'decodedBytes':len(b),'declaredBytes':a['byteLength'],
          'lengthValid':len(b)==a['byteLength']==unit*a['count'],'sha256':hashlib.sha256(b).hexdigest()}
    index=struct.unpack('<'+str(d['arrays']['indices']['count'])+'I',base64.b64decode(d['arrays']['indices']['data']))
    sidecars.append({'pin':pin(p),'reportedPinMatches':pin(p)['bytes']==entry['bytes'] and pin(p)['sha256']==entry['sha256'],
      'label':d['label'],'epoch':d['epoch'],'counts':d['counts'],'rawBytes':d['rawBytes'],'decodedRawBytes':rawTotal,
      'rawByteTotalMatches':rawTotal==d['rawBytes'],'allArrayLengthsValid':all(a['lengthValid'] for a in arrays.values()),
      'maximumIndex':max(index),'allIndicesInActiveRange':max(index)<d['counts']['vertices'],
      'capsSatisfied':p.stat().st_size<=ready['loftSnapshotPolicy']['maximumJsonBytesEach'] and rawTotal<=ready['loftSnapshotPolicy']['maximumRawBytesEach'],
      'nonmutation':d['nonmutation'],'arrayIdentitiesAndWordsUnchanged':d['arrayIdentitiesAndWordsUnchanged'],
      'unusedCapacityIncluded':d['unusedCapacityIncluded'],'arrays':arrays})
arm=seal['arms']['candidate'];pinChecks={'buildSources':checked(arm['sourcePins']),'distAssets':checked(arm['assetPins']),
 'helpers':checked(seal['helperPins']),'buildManifest':checked([arm['rootBuildManifest']]),
 'reportArmEqualsSealedArm':r['seal']==arm,'ownerSealPinMatches':pin(W/'seal.json')['sha256']==owner['sealSha256'],
 'served':{'count':len(owner['served']),'mismatches':[name for name,e in owner['served'].items() if any(pin(Path(arm['dist'])/name)[k]!=e[k] for k in ['bytes','sha256'])]},
 'artifacts':{'count':len(r['artifacts']),'mismatches':[e['file'] for e in r['artifacts'] if any(pin(W/'candidate-first'/e['file'])[k]!=e[k] for k in ['bytes','sha256'])]}}
initialEquality={k:obs[0].get(k)==old['observations'][0].get(k) for k in ['seaTime','rawFrontRecords','boardPose','counts','locked','crest','camera']}
initialEquality['publicOrderedPointObjectsExact']=obs[0]['initialPublicPointIdentity']['points']==old['observations'][0]['initialPublicPointIdentity']['points']
selectedFields=['step','currentFront','openingPresent','openingHeight','missing','stopReason','crest','eye','center']
local=[]
for step in [0,15,16,21,48,55,56,62,63,64,65,66,67]:
 o=obs[step];q={k:o.get(k) for k in selectedFields};q['loftBracket']=o['loftStation']['bracket'];
 q['rows']=[{k:p.get(k) for k in ['row','sliceTau','slicePhase','sliceWeight','sliceFade','sliceJoined','sliceSigma','crest','cap','toe']} for p in o.get('rows') or []];local.append(q)
summary={'complete':True,'scope':'read-only frozen actual capture metrics/pins; no native/tests/build/source/resources/Git or pixel inference',
 'pins':{name:pin(W/name) for name in ['candidate-first/report.json','candidate-first-owner.json','seal.json','readiness.json','root-complete-build-result.json','helper-pins.json']},
 'pinChecks':pinChecks,'ownerClosure':{k:owner[k] for k in ['complete','firstFailure','exitCode','elapsedSeconds','sourceBuildHelpersPostUnchanged','remainingOwnedPids','closedPorts','protectedStatesInitially','protectedStatesFinally','independentClosureValid','protectedPortsPreserved']},
 'build':{'sourceCount':len(arm['sourcePins']),'sourceReadinessCount':584,'exitCode':build['exitCode'],'terminal':build['terminal'],'excludedPreparationInputs':build['excludedPreparationInputs'],'assets':len(arm['assetPins']),'helpers':len(seal['helperPins'])},
 'selected':obs[0]['locked'],'initialPointIDs':obs[0]['initialPublicPointIdentity']['pointIDs'],
 'timeline':{'observations':len(obs),'steps':[obs[0]['step'],obs[-1]['step']],'physicsAdvances':r['video']['physicsAdvances'],'physicalSeconds':r['video']['physicalSeconds'],
 'openingSteps':opening,'noAirButJoinedSteps':noAir,'firstPhase2':r['firstObservedPhase2'],'firstBothPhase2':next(o['step'] for o in live if all(q['slicePhase']==2 for q in o['rows'])),
 'stop':r['stop'],'lineageEvents':obs[-1]['lineageEvents'],'selectedRayAlwaysZeroOne':all(o['ray']==[0,1] for o in live)},
 'mouth':{'observationCount':len(mouth),'totalColumnQueries':sum(len(o['mouth']['attempts']) for o in mouth),'maximumColumnQueries':max(len(o['mouth']['attempts']) for o in mouth),
 'clearInternalSightlines':sum(o['mouth']['clearNearMouthSightline'] is True for o in mouth),
 'externalIndexedOccluded':sum(o['mouth']['exterior']['fullSightline']['indexedLoftOccluded'] is True for o in mouth),
 'shorewardIndexedOccluded':sum(o['mouth']['shorewardContinuation']['fullSightline']['indexedLoftOccluded'] is True for o in mouth),
 'externalEntranceClaims':sum(o['mouth']['externalEntranceClaim'] is True for o in mouth),'bodyPassageClaims':sum(o['mouth']['bodyPassageClaim'] is True for o in mouth)},
 'diagnostics':diagSummary,'directPublicHistoryEvents':direct,'terminalCarrierHistoryProbe':obs[-1]['carrierHistoryProbe'],
 'publicExportEpochs':[{'step':e['step'],'reason':e['reason'],'nonmutationBooleans':{k:v for k,v in e.items() if isinstance(v,bool)}} for e in obs[-1]['publicExportEvidence']],
 'fixedXConsecutiveJumps':jumps,'rawEndpoints':rawSummary,'localSteps':local,
 'largestChangeRetirementAnchors':[{'step':step,'firstRetainedRow':{k:obs[step]['lockedFrontRows'][0].get(k) for k in ['row','sliceSigma','sliceTau','slicePhase','sliceWeight','sliceFade','sliceJoined','crest','cap']}} for step in [59,60]],
 'drawEpochAllValid':all(all(o['drawEpoch'].get(k) is True for k in ['drawnWaterTimeMatchesCurrentSnapshot','snapshotIdentityUnchanged','physicsClockUnchanged','drawnRevisionIsCurrentStatus','drawnFrontIsCurrentBuffer']) for o in obs),
 'checkpointEvidence':[{'label':c['label'],'step':c['step'],'evidence':c['evidence']} for c in r['checkpoints']],
 'sidecars':sidecars,'sidecarsTotalJsonBytes':sum(x['pin']['bytes'] for x in sidecars),'video':r['video'],'browserErrors':r['browserErrors'],
 'initialOldCarrierComparison':{'oldReportPin':pin(OLD/'report.json'),'oldSelected':old['observations'][0]['locked'],'initialFieldsExact':initialEquality,
 'oldInitialCounts':old['observations'][0]['counts'],'newInitialCounts':obs[0]['counts'],'oldStop':old['stop'],
 'geometryOrCameraEqualityClaim':False,'equalRawInputsDoNotMeanEqualDrawnGeometry':True},
 'rootPixelsSeparate':True,'bodyEntryClaim':r['bodyEntryClaim'],'physicalGeometryEqualityClaim':r['physicalGeometryEqualityClaim'],'fpsClaim':r['fpsClaim']}
(OUT/'analysis.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:summary[k] for k in ['pinChecks','ownerClosure','build','selected','initialPointIDs','mouth','diagnostics','directPublicHistoryEvents']},indent=2))
print('JUMPS',json.dumps({k:v[:1] if isinstance(v,list) else v for k,v in jumps.items() if 'Axes' not in k},indent=2))
print('SIDE',json.dumps([{k:v for k,v in x.items() if k not in ['arrays']} for x in sidecars],indent=2))
