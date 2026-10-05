"""Direct accepted C build/diagnostic/reference and this input helper; no historical recursion."""
from pathlib import Path
import hashlib,json,base64
W=Path('/private/tmp/tube-c-line-steering-clock-20261005')
P=Path('/private/tmp/tube-c-formation-native-20261005')
S=Path('/private/tmp/tube-c-formation-trial-20261005/source')
BUILD_ID='tube-c-formation-20261005'
LIMITS={'wholeSeconds':660,'commandSeconds':648,'nativeSeconds':635,'startupMilliseconds':180000,'cleanupSeconds':7,'reportBytes':32*1024*1024,'traceBytes':24*1024*1024,'ownedPorts':[4301,9711],'protectedPorts':[4310,4311,4312,4313,4314]}
PREFIX_FIELDS=['input','seaTime','physicalSeconds','clocks','boardPose','riderPoints','riderWords','displayedBoard','displayedRiderPoints']
PHYSICAL_CLOCK_KEYS=['workerSeaTime','visualClock','waterTime']
def record(p):
 p=Path(p);b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def pin(q):
 p=Path(q['file']);assert p.is_file(),'Missing immutable input '+str(p)
 b=p.read_bytes();assert len(b)==q['bytes'] and hashlib.sha256(b).hexdigest()==q['sha256'],'Immutable input changed '+str(p)
 return b
def load(q):return json.loads(pin(q))
def direct_inputs(t):
 assert t['schema']=='c-line-steering-clock-preparation-inputs/v1' and t['sourceOnly'] is True
 for key,name in [('approvedCandidateSeal','seal.json'),('approvedApplicationBuild','root-complete-build-result.json'),('approvedDiagnosticBuild','root-diagnostic-build-result.json'),('diagnosticModule','diagnostic-autopilot.mjs'),('acceptedReferenceReport','candidate-first/report.json'),('acceptedReferenceTrace','candidate-first/steps.ndjson'),('acceptedReferenceOwner','candidate-first-owner.json'),('replayReference','replay-reference.json'),('observerFields','observer-fields.json'),('sourceReadiness','source-readiness.json'),('acceptedReferenceInitialLoft','candidate-first/loft-initial.json')]:
  assert t[key]['file']==str(P/name);pin(t[key])
 for q in t['borrowedHelperPins']+t['immediateHarnessPins']:pin(q)
 assert len(t['borrowedHelperPins'])==9 and len(t['immediateHarnessPins'])==5
 raw=load(t['approvedCandidateSeal']);assert raw['schema']=='c-formation-root-seal/v1' and raw['complete'] is True
 build=load(t['approvedApplicationBuild']);assert build['schema']=='c-formation-root-complete-build/v1' and build['terminal'] is True and build['exitCode']==0 and build['sourceUnchangedAfterBuild'] is True
 assert build['source']==str(S) and build['frozenDist']==str(P/'candidate-complete-dist') and build['buildId']==BUILD_ID
 arm=raw['arms']['candidate'];assert arm['rootAuthorized'] is True and arm['rootBuildManifest']==t['approvedApplicationBuild'] and arm['sourcePins']==build['sourcePins'] and arm['assetPins']==build['assetPins']
 assert len(build['sourcePins'])==587 and len(build['assetPins'])==49 and build['assetPins']==build['frozenAssetPins']
 for q in build['sourcePins']+build['assetPins']+build['builtAssetPins']+build['generatedOutputPins']:pin(q)
 assert {str(p)for p in (P/'candidate-complete-dist').rglob('*')if p.is_file()}=={q['file']for q in build['assetPins']}
 command=load(build['rootApplicationCommand']);assert command['complete'] is True and command['terminal'] is True and command['exitCode']==0 and command['sourceUnchanged'] is True
 assert [q['name']for q in command['checks']]==['consumers','build'] and all(q['exitCode']==0 and not q['timedOut']for q in command['checks'])
 for q in command['checks']:pin(q['log'])
 d=load(t['approvedDiagnosticBuild']);assert d['schema']=='c-formation-diagnostic-root-build/v1' and d['terminal'] is True and d['exitCode']==0 and d['source']==str(S)
 assert d['rootCompleteBuild']==t['approvedApplicationBuild'] and d['module']==t['diagnosticModule']==raw['diagnosticModule']
 assert len(d['inputs'])==74 and len(d['sourceInputs'])==71 and d['compilerWatchedInputCount']==75 and d['actualNewDiagnosticSourceCompiled'] is True and d['diagnosticModuleCopiedFromPrior'] is False
 assert sorted(d['moduleExports'])==['Autopilot','autopilotView','riderPartVolumes'] and d['diagnosticLexicalObserverFieldCount']==0
 for q in d['inputs']+d['compilerConfigurationInputs']+[d['module'],d['entry']]:pin(q)
 assert raw['sourceReadiness']==t['sourceReadiness'] and raw['replayReference']==t['replayReference']
 fields=load(t['observerFields']);assert len(fields['allFields'])==143 and fields['availabilityMarker']=='standingTrialAvailable'
 owner=load(t['acceptedReferenceOwner']);assert owner['schema']=='c-formation-finite-owner/v1' and owner['complete'] is True and owner['firstFailure'] is None and owner['exitCode']==0
 assert owner['independentClosureValid'] is True and owner['protectedPortsPreserved'] is True and owner['sourceBuildHelpersPostUnchanged'] is True
 assert owner['sealSha256']==t['approvedCandidateSeal']['sha256'] and owner['dist']==build['frozenDist']
 ref=load(t['acceptedReferenceReport']);assert t['acceptedReferenceReport']['bytes']<=LIMITS['reportBytes']
 assert ref['schema']=='c-formation-native/v1' and ref['complete'] is True and ref['firstFailure'] is None and ref['chromeClosed'] is True and ref['sealSha256']==owner['sealSha256']
 assert ref['source']==arm and ref['diagnosticModule']==t['diagnosticModule'] and ref['stepCount']==len(ref['steps'])==1516
 assert ref['initial']['config']['seed']==6238 and ref['overrides']=={'seed':6238,'componentCount':64,'dx':2,'fineSpacing':1}
 first=next(row['step']for row in ref['steps']if row['ride']['phase']=='standing');assert first==1372
 assert t['prefix']=={'lastRequiredStep':1372,'requiredFirstStandingStep':1372,'rows':PREFIX_FIELDS,'ridePhaseAlsoExact':True,'physicalClockKeys':PHYSICAL_CLOCK_KEYS,'surfaceRevisionPolicy':'Exact increments relative to each initial revision; absolute values retained, initial offset declared, no counter writes.','initialLoftArrayCount':37,'initialGeometryRequired':True}
 loft=load(t['acceptedReferenceInitialLoft']);assert loft['schema']=='bounded-C-complete-drawn-loft-words/v1' and loft['label']=='initial' and len(loft['arrays'])==37
 assert loft['epoch']['step']==0 and loft['epoch']['seaTime']==ref['initialBody']['seaTime'] and loft['epoch']['surfaceRevision']==ref['initialBody']['clocks']['surfaceRevision']
 assert all(loft['nonmutation'].values()) and loft['arrayIdentitiesAndWordsUnchanged'] is True
 stub=next(q for q in ref['loftSnapshots']if q['label']=='initial');assert stub['bytes']==t['acceptedReferenceInitialLoft']['bytes'] and stub['sha256']==t['acceptedReferenceInitialLoft']['sha256'] and stub['counts']==loft['counts']
 for a in loft['arrays'].values():assert len(base64.b64decode(a['data'],validate=True))==a['byteLength']
 assert t['cacheCounterSource']['file']==str(S/'src/scene/WaterSurface.ts') and t['cacheCounterSource'] in build['sourcePins'];pin(t['cacheCounterSource'])
 failed=load(t['previousFailedReport']);failed_owner=load(t['previousFailedOwner']);qualified=load(t['previousFailureRootQualification'])
 assert t['previousFailureRootQualification']['file']=='/private/tmp/tube-c-line-steering-initial-qualification-20261005/result.json'
 assert qualified['schema']=='c-line-steering-initial-root-qualification/v1' and qualified['complete'] is True and qualified['originalOwnerAccepted'] is False and qualified['nativeGameplayResultAvailable'] is False and qualified['inputsTaken']==0
 assert qualified['report']==t['previousFailedReport'] and qualified['owner']==t['previousFailedOwner'] and qualified['reference']==t['acceptedReferenceReport']
 assert qualified['initialConfigExact'] is True and all(qualified['initialPublishedBodyFieldsExact'].values()) and all(qualified['physicalAndVisualClockFieldsExact'].values())
 assert qualified['directSourceBuildHelpersPostUnchanged'] is True and qualified['independentResourcesClosed'] is True and qualified['humanPreviewsPreserved'] is True and qualified['tubeEntryOrImprovementClaim'] is False
 assert qualified['source']['bytes']==t['cacheCounterSource']['bytes'] and qualified['source']['sha256']==t['cacheCounterSource']['sha256']
 assert t['previousFailedReport']['file']=='/private/tmp/tube-c-line-steering-native-20261005/candidate-first/report.json' and t['previousFailedOwner']['file']=='/private/tmp/tube-c-line-steering-native-20261005/candidate-first-owner.json'
 assert failed['schema']=='c-line-steering-native/v1' and failed['complete'] is False and failed['stepCount']==0 and failed['steps']==[] and failed['chromeClosed'] is True
 assert 'Exact accepted C initial clocks' in failed['firstFailure'] and failed['initial']['config']==ref['initial']['config']
 assert all(failed['initialBody']['clocks'][k]==ref['initialBody']['clocks'][k]for k in PHYSICAL_CLOCK_KEYS) and failed['initialBody']['clocks']['surfaceRevision']==4 and ref['initialBody']['clocks']['surfaceRevision']==5
 assert all(failed['initialBody'][k]==ref['initialBody'][k]for k in ['boardPose','riderPoints','riderWords','displayedBoard','displayedRiderPoints'])
 assert failed_owner['schema']=='c-line-steering-finite-owner/v1' and failed_owner['complete'] is False and failed_owner['exitCode']==1 and failed_owner['independentClosureValid'] is True and failed_owner['protectedPortsPreserved'] is True
 assert [json.loads(line)for line in pin(t['acceptedReferenceTrace']).splitlines()]==ref['steps']
 assert raw['environment']['node']['file']=='/opt/homebrew/bin/node' and raw['environment']['chrome']['file']=='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
 for q in raw['environment'].values():pin(q)
 return raw,build,d,ref
def preparation():
 f=json.loads((W/'prep/freeze.json').read_text());assert f['schema']=='c-line-steering-clock-source-freeze/v1' and f['sourceOnly'] is True and f['rootExecutionPending'] is True
 assert f['files']==len(f['pins'])==len({q['file']for q in f['pins']})
 for q in f['pins']:assert Path(q['file']).is_relative_to(W);pin(q)
 return f
def sealed(arm):
 body=(W/'seal.json').read_bytes();assert len(body)<=1024*1024
 s=json.loads(body);assert s['schema']=='c-line-steering-clock-root-seal/v1' and s['complete'] is True and s['rootAuthorized'] is True and arm=='candidate' and s['limits']==LIMITS
 preparation();assert s['preparationFreeze']==record(W/'prep/freeze.json')
 t=load(s['preparationInputs']);assert s['preparationInputs']['file']==str(W/'inputs.json') and t['rootBound'] is True
 raw,build,d,ref=direct_inputs(t)
 for key in ('approvedCandidateSeal','approvedApplicationBuild','approvedDiagnosticBuild','diagnosticModule','acceptedReferenceReport','acceptedReferenceTrace','acceptedReferenceOwner','replayReference','observerFields','sourceReadiness','acceptedReferenceInitialLoft','previousFailedReport','previousFailedOwner','cacheCounterSource','previousFailureRootQualification'):assert s[key]==t[key]
 assert s['arms']['candidate']==raw['arms']['candidate'] and s['priorV4Report']==raw['priorV4Report'] and s['priorV6Report']==raw['priorV6Report'] and s['environment']==raw['environment']
 for q in s['helperPins']:assert Path(q['file']).is_relative_to(W);pin(q)
 assert s['helperPins']==json.loads((W/'prep/freeze.json').read_text())['pins']
 ready=load(s['helperReadiness']);assert ready['schema']=='c-line-steering-clock-root-readiness/v1' and ready['complete'] is True and ready['resourcesStarted'] is False and ready['portsProbed'] is False
 checks=load(s['rootHelperChecks']);assert checks['schema']=='c-line-steering-clock-root-helper-checks/v1' and checks['complete'] is True and checks['resourcesStarted'] is False and checks['portsProbed'] is False
 assert set(checks['checks'])=={'nativeSyntax','controlSyntax','sourceOnlyOwner'}
 for q in checks['checks'].values():assert q['run'] is True and q['exitCode']==0;pin(q['log'])
 assert s['applicationRebuilt'] is False and s['geometryOrPhysicsChanged'] is False and s['gameplayAcceptance'] is False and s['tubePassageAcceptance'] is False and s['productionAdoption'] is False
 for q in s['immutableInputsAndOutputs']:pin(q)
 return s,raw['arms']['candidate'],P/'candidate-complete-dist',hashlib.sha256(body).hexdigest()
