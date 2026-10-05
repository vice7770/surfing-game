"""Read-only actual appearance comparison; no resources, probes, tests or reruns."""
from pathlib import Path
import base64,copy,hashlib,importlib.util,json,sys
sys.dont_write_bytecode=True
W=Path(__file__).resolve().parent; N=Path('/private/tmp/tube-C-diffuse-interior-native-20261005'); B=Path('/private/tmp/tube-bounded-c-retirement-boundary-native-20261005'); S=Path('/private/tmp/tube-C-diffuse-interior-20261005')
def pin(p):
 p=Path(p).resolve();b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def check(q):assert pin(q['file'])==q,q['file']
def save(name,j):
 p=W/name;assert not p.exists(),p;p.write_text(json.dumps(j,indent=2,allow_nan=False)+'\n')
def load(root,name):return json.loads((root/name).read_text())
def imported(path,name):
 spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
n=load(N,'candidate-first/report.json');b=load(B,'candidate-first/report.json');assert n['complete'] and b['complete'] and n['firstFailure'] is b['firstFailure'] is None
no={o['movingStep']:o for o in n['observations']};bo={o['movingStep']:o for o in b['observations']};assert set(no)==set(bo)==set(range(71))
def without_export_time(value):
 value=copy.deepcopy(value)
 if isinstance(value,list):
  for q in value:q.pop('wallMilliseconds')
 else:value.pop('wallMilliseconds')
 return value
fields={}; keys=sorted(set().union(*(o.keys()for o in no.values()),*(o.keys()for o in bo.values())))
for k in keys:
 absent=[i for i in range(71)if (k in no[i])!=(k in bo[i])];assert not absent,k
 present=[i for i in range(71)if k in no[i]]; unequal=[i for i in present if no[i][k]!=bo[i][k]]
 if k=='detectorMilliseconds':
  fields[k]={'presentAtObservations':len(present),'literalEqualCount':len(present)-len(unequal),'excludedTimingOnly':True}
 elif k in ('latestPublicExport','publicExportEvidence'):
  normalized=[i for i in present if without_export_time(no[i][k])!=without_export_time(bo[i][k])];assert not normalized,k
  fields[k]={'presentAtObservations':len(present),'literalEqualCount':len(present)-len(unequal),'physicalAndNonmutationFieldsExactCount':len(present),'onlyExcludedNestedField':'wallMilliseconds'}
 else:
  assert not unequal,(k,unequal);fields[k]={'presentAtObservations':len(present),'exactCount':len(present),'absentAtSameTerminalEpochs':len(present)!=71}
initialTimingKeys=[k for k in n['initial']['status']if n['initial']['status'][k]!=b['initial']['status'][k]];assert set(initialTimingKeys)=={'stepMs','pipelineMs'}
assert {k:v for k,v in n['initial']['status'].items()if k not in initialTimingKeys}=={k:v for k,v in b['initial']['status'].items()if k not in initialTimingKeys}
for k in ('config','viewport','browser'):assert n['initial'][k]==b['initial'][k],k
for k in ('settings','expectedConfig','graphics','overrides','stop','firstObservedPhase2'):assert n[k]==b[k],k
sidecars={};formats={'Float32Array':4,'Int32Array':4,'Uint32Array':4,'Uint8Array':1}
for label in ('initial','first-phase2'):
 np=N/'candidate-first'/('loft-'+label+'.json');bp=B/'candidate-first'/('loft-'+label+'.json');ns=json.loads(np.read_text());bs=json.loads(bp.read_text());assert ns==bs and np.read_bytes()==bp.read_bytes()
 assert ns['arrayIdentitiesAndWordsUnchanged'] and all(ns['nonmutation'].values()) and not ns['unusedCapacityIncluded']; words={};total=0
 for name,record in ns['arrays'].items():
  base=bs['arrays'][name];nb=base64.b64decode(record['data'],validate=True);bb=base64.b64decode(base['data'],validate=True);assert nb==bb
  assert record['littleEndian'] and len(nb)==record['byteLength']==record['count']*formats[record['dtype']]
  words[name]={'dtype':record['dtype'],'count':record['count'],'byteLength':len(nb),'sha256':hashlib.sha256(nb).hexdigest(),'exactToBaseline':True};total+=len(nb)
 assert len(words)==37
 sidecars[label]={'completeJSONAndFileBytesExact':True,'epoch':ns['epoch'],'counts':ns['counts'],'arrayCount':len(words),'activeArrayBytes':total,'activeArrays':words,'epochFrontIndicesAttributesNormalsAndAllExportedSidecarWordsExact':True,'unusedCapacityOrWholeSolverStateEqualityClaim':False}
readOnly={};inputs=[]
for root,name in ((N,'candidate'),(B,'baseline')):
 owner=load(root,'candidate-first-owner.json');seal=load(root,'seal.json');build=load(root,'root-complete-build-result.json');r=n if root==N else b
 for key in ('sourceReadiness','helperReadiness','helperPinsManifest','rootCompleteBuild','sourceDelta'):
  if key in seal:check(seal[key])
 declaredHelpers={q['file']:q for q in load(root,'helper-pins.json')};sealedHelpers={q['file']:q for q in seal['helperPins']}
 assert set(declaredHelpers)<=set(sealedHelpers) and all(sealedHelpers[k]==q for k,q in declaredHelpers.items())
 extra=set(sealedHelpers)-set(declaredHelpers);assert extra<={seal['helperReadiness']['file'],seal['helperPinsManifest']['file']}
 assert owner['complete'] and owner['firstFailure'] is None and owner['exitCode']==0 and owner['sourceBuildHelpersPostUnchanged']
 assert owner['sealSha256']==pin(root/'seal.json')['sha256'] and owner['remainingOwnedPids']==[] and owner['closedPorts']=={'4299':True,'9709':True}
 expected={'4310':True,'4311':True,'4312':False,'4313':False}if root==N else{'4310':True,'4311':True,'4312':False}
 assert owner['protectedStatesInitially']==owner['protectedStatesFinally']==expected and owner['independentClosureValid'] and owner['protectedPortsPreserved'] and owner['elapsedSeconds']<=180 and owner['cleanupElapsedSeconds']<=7
 arm=seal['arms']['candidate'];assert arm['sourcePins']==build['sourcePins'] and arm['assetPins']==build['assetPins'] and arm['rootBuildManifest']==pin(root/'root-complete-build-result.json')
 for q in arm['sourcePins']+arm['assetPins']+seal['helperPins']:check(q)
 ownerModule=imported(root/'run.py','actual_'+name+'_owner');_,_,_,sealsha=ownerModule.sealed('candidate');assert sealsha==owner['sealSha256']
 assets={str(Path(q['file']).relative_to(root/'candidate-complete-dist')):q for q in arm['assetPins']}
 for path,served in owner['served'].items():q=assets[path];assert (served['bytes'],served['sha256'])==(q['bytes'],q['sha256'])
 assert len(owner['served'])==15 and len(arm['sourcePins'])==587 and len(arm['assetPins'])==49
 media=[]
 for q in r['artifacts']:
  p=root/'candidate-first'/q['file'];qpin=pin(p);assert (qpin['bytes'],qpin['sha256'])==(q['bytes'],q['sha256']);media.append(qpin)
  if q['file'].endswith('.png'):assert p.read_bytes()[:8]==bytes([137,80,78,71,13,10,26,10])
  else:assert q['file']=='moving-C.webm' and p.read_bytes()[:4]==bytes([0x1a,0x45,0xdf,0xa3])
 assert len(media)==7 and len(r['checkpoints'])==6 and len(r['loftSnapshots'])==2
 for q in r['loftSnapshots']:
  p=root/'candidate-first'/q['file'];qpin=pin(p);assert (qpin['bytes'],qpin['sha256'])==(q['bytes'],q['sha256'])
 assert r['browserErrors']==[]
 readOnly[name]={'sourceBuildInputs':len(arm['sourcePins']),'completeAssets':len(arm['assetPins']),'sealedHelperPins':len(seal['helperPins']),'servedResponsePins':len(owner['served']),'media':media,'sidecarPins':[pin(root/'candidate-first'/q['file'])for q in r['loftSnapshots']],'recordedClosure':{'exitCode':owner['exitCode'],'elapsedSeconds':owner['elapsedSeconds'],'cleanupElapsedSeconds':owner['cleanupElapsedSeconds'],'closedPorts':owner['closedPorts'],'protectedStatesInitially':owner['protectedStatesInitially'],'protectedStatesFinally':owner['protectedStatesFinally'],'remainingOwnedPids':owner['remainingOwnedPids']},'liveProcessOrPortProbesPerformed':False,'actualRootBuildCompositionAndSealVerified':True}
 inputs.extend(pin(root/p)for p in ('candidate-first-owner.json','candidate-first/report.json','seal.json','root-complete-build-result.json','readiness.json','helper-pins.json','run.py'))
 inputs.extend(readOnly[name]['sidecarPins'])
sourceResult=imported(S/'verify.py','actual_diffuse_source').verify();assert sourceResult['effectiveSourceInputs']==588 and sourceResult['unchangedParentInputs']==586
parent=Path('/private/tmp/tube-bounded-c-retirement-boundary-20261005/cap-prefix-v2');m=load(parent,'source-pins.json');assert m['count']==588
for q in m['pins']:
 current=pin(parent/'source'/q['path']);assert (current['bytes'],current['sha256'])==(q['bytes'],q['sha256'])
inputs.extend(pin(S/p)for p in ('readiness.json','source-delta.json','runtime.patch','tests.patch','verify.py'));inputs.append(pin(parent/'source-pins.json'))
helper=Path('/private/tmp/tube-stable-x-object-attribution-native-20261005/moving-shape.mjs');assert "d.step({paddle:false,popUp:false,steer:0})" in helper.read_text();assert str(helper) in (N/'native.mjs').read_text() and str(helper) in (B/'native.mjs').read_text();inputs.append(pin(helper))
counts={'observations':71,'ordinaryAdvances':n['video']['physicsAdvances'],'physicalSeconds':n['video']['physicalSeconds'],'initialSeaTime':no[0]['seaTime'],'lockedStation':no[0]['locked'],'phase2':n['firstObservedPhase2'],'firstLocalAirLoss':next(o['movingStep']for o in n['observations']if not o['missing'] and not o['openingPresent']),'stop':n['stop'],'neutralInput':{'paddle':False,'popUp':False,'steer':0}}
assert counts['ordinaryAdvances']==70 and counts['firstLocalAirLoss']==56 and counts['stop']['movingStep']==70
summary={'schema':'bounded-C-diffuse-interior-actual-comparison/v1','complete':True,'inputPins':inputs,'initialRecordedMatching':{'configurationViewportBrowserExact':True,'physicalStatusExactExcept':initialTimingKeys,'requestedSettingsExpectedGraphicsOverridesExact':True,'initialControlObjectWordsNotRetained':True},'all71RecordedObservationFields':fields,'matchedCapture':counts,'actualCompleteWordSidecars':sidecars,'readOnlySourceBuildHelperMediaAndClosureChecks':readOnly,'sourceEffectiveDeltaVerification':sourceResult,'sourceParent588InputsAlsoVerified':True,'appearanceObservationScope':{'pixelsViewedByThisAnalyzer':False,'rootReportedCreaseWeakened':True,'rootReportedRecognizableCloudPictureRemoved':True,'rootReportedBroadFlatGrayRightSheetRemains':True,'rootMessageProvenanceOnlyUntilPixelReceiptPinned':True},'limits':{'fullPrivateSolverOrGPUStateEqualityClaim':False,'rawFrontScalarJSONCannotProveUnretainedNaNPayloadBits':True,'initialActorControlWholeObjectWordsEqualityClaim':False,'unusedLoftCapacityEqualityClaim':False,'encodedFPSOrContinuousPlaybackClaim':False,'aestheticAccepted':False,'mouthEntranceAccepted':False,'bodyPassageAccepted':False,'productionAdopted':False,'candidateRemainsIsolated':True},'resourcesProbedOrStarted':False,'sourceBuildHelperGitPreviewChanges':False}
save('analysis.json',summary)
print(json.dumps({'analysis':pin(W/'analysis.json'),'observationsExactExceptTiming':71,'sidecarsWholeFileExact':2,'arraysExactPerSidecar':37,'preparedSourceInputs':588,'buildSourceInputs':587,'assets':49,'candidateSealedHelperPins':readOnly['candidate']['sealedHelperPins'],'candidateRecordedHumanPortsPreserved':[4312,4313],'ownedDiagnosticPortsRecordedClosed':[4299,9709]}))
