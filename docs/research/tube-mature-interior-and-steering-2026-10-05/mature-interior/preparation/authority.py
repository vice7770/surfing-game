"""Direct compiled C inputs and fresh helper pins. Every route here is resource-free."""
from pathlib import Path
import hashlib,json
W=Path('/private/tmp/tube-c-mature-mouth-inspection-native-20261005')
N=Path('/private/tmp/tube-c-formation-native-20261005')
S=Path('/private/tmp/tube-c-formation-trial-20261005/source')
BUILD_ID='tube-c-formation-20261005'
LIMITS={'wholeSeconds':660,'commandSeconds':648,'nativeSeconds':635,'cleanupSeconds':7,'hudReadyWaitMilliseconds':180000,'steps':360,'physicalSeconds':6,'inspectionCadence':30,'reportBytes':33554432,'traceBytes':25165824,'pngCount':2,'pngBytesEach':12582912,'pngBytesTotal':25165824,'sidecarCount':1,'sidecarBytesEach':6291456,'sidecarRawBytes':4194304,'movieCount':0,'ownedPorts':[4301,9711],'protectedOpenPorts':[4312,4313,4314]}
def record(p):
 p=Path(p);b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def pin(q):
 p=Path(q['file']);assert p.is_file(),'Missing sealed input '+str(p)
 b=p.read_bytes();assert len(b)==q['bytes'] and hashlib.sha256(b).hexdigest()==q['sha256'],'Sealed input changed '+str(p)
 return b
def load(q):return json.loads(pin(q))
def preparation():
 f=json.loads((W/'source-freeze.json').read_text());assert f['schema']=='c-mature-core-native-source-freeze/v1' and f['sourceOnly'] is True and f['rootExecutionPending'] is True
 expected={'inputs.json','authority.py','native.mjs','run.py','readiness.json','README.txt','mature-mouth.mjs','inspection-bridge.mjs'}
 assert len(f['pins'])==len(expected) and {Path(q['file']).name for q in f['pins']}==expected and all(Path(q['file']).parent==W for q in f['pins'])
 for q in f['pins']:pin(q)
 i=json.loads((W/'inputs.json').read_text());assert i['schema']=='c-mature-core-native-inputs/v1' and i['buildId']==BUILD_ID and i['compiledSource']==str(S) and i['dist']==str(N/'candidate-complete-dist')
 for key in ('approvedCandidateSeal','approvedApplicationBuild','approvedDiagnosticBuild','diagnosticModule','knownCReport','knownCOwner'):pin(i[key])
 assert len(i['borrowedHelperPins'])==len({q['file']for q in i['borrowedHelperPins']})==9
 for q in i['borrowedHelperPins']:pin(q)
 assert len(i['helperParentPins'])==2
 for q in i['helperParentPins']:pin(q)
 return f,i
def sealed(arm):
 f,i=preparation();body=(W/'seal.json').read_bytes();assert len(body)<=1048576
 seal=json.loads(body);assert seal['schema']=='c-mature-core-root-seal/v1' and seal['complete'] is True and seal['rootAuthorized'] is True and arm=='candidate'
 assert seal['limits']==LIMITS and seal['preparationInputs']==record(W/'inputs.json') and seal['preparationFreeze']==record(W/'source-freeze.json')
 for key in ('approvedCandidateSeal','approvedApplicationBuild','approvedDiagnosticBuild','diagnosticModule','knownCReport','knownCOwner'):assert seal[key]==i[key]
 assert seal['borrowedHelperPins']==i['borrowedHelperPins']
 assert seal['helperPins']==f['pins']+[record(W/'source-freeze.json')]
 for q in seal['helperPins']:pin(q)
 ready=load(seal['helperReadiness']);assert seal['helperReadiness']==record(W/'readiness.json') and ready['schema']=='c-mature-core-native-source-readiness/v1' and ready['sourceOnly'] is True and ready['checksRun'] is False and ready['rootExecutionPending'] is True
 raw=load(i['approvedCandidateSeal']);assert raw['schema']=='c-formation-root-seal/v1' and raw['complete'] is True
 build=load(i['approvedApplicationBuild']);assert build['schema']=='c-formation-root-complete-build/v1' and build['terminal'] is True and build['exitCode']==0 and build['sourceUnchangedAfterBuild'] is True
 assert build['source']==str(S) and build['frozenDist']==str(N/'candidate-complete-dist') and build['buildId']==BUILD_ID
 a=raw['arms']['candidate'];assert a['rootAuthorized'] is True and a['rootBuildManifest']==i['approvedApplicationBuild'] and a['assetPins']==build['assetPins'] and a['sourcePins']==build['sourcePins']
 assert len(build['sourcePins'])==587 and len(build['assetPins'])==49 and build['assetPins']==build['frozenAssetPins'] and len(build['builtAssetPins'])==21 and len(build['generatedOutputPins'])==1
 for q in build['sourcePins']+build['assetPins']+build['builtAssetPins']+build['generatedOutputPins']:pin(q)
 assert {str(p)for p in (N/'candidate-complete-dist').rglob('*')if p.is_file()}=={q['file']for q in build['assetPins']}
 command=load(build['rootApplicationCommand']);assert command['complete'] is True and command['terminal'] is True and command['exitCode']==0 and command['sourceUnchanged'] is True
 assert {q['name']for q in command['checks']}=={'consumers','build'} and all(q['exitCode']==0 and not q['timedOut']for q in command['checks'])
 for q in command['checks']:pin(q['log'])
 diagnostic=load(i['approvedDiagnosticBuild']);assert diagnostic['schema']=='c-formation-diagnostic-root-build/v1' and diagnostic['terminal'] is True and diagnostic['exitCode']==0
 assert diagnostic['rootCompleteBuild']==i['approvedApplicationBuild'] and diagnostic['source']==build['source'] and diagnostic['module']==i['diagnosticModule']==raw['diagnosticModule']
 assert len(diagnostic['inputs'])==74 and len(diagnostic['sourceInputs'])==71 and diagnostic['compilerWatchedInputCount']==75 and diagnostic['actualNewDiagnosticSourceCompiled'] is True and diagnostic['diagnosticModuleCopiedFromPrior'] is False
 assert sorted(diagnostic['moduleExports'])==['Autopilot','autopilotView','riderPartVolumes'] and diagnostic['diagnosticLexicalObserverFieldCount']==0
 for q in diagnostic['inputs']+diagnostic['compilerConfigurationInputs']+[diagnostic['module'],diagnostic['entry']]:pin(q)
 prior=load(i['knownCReport']);owner=load(i['knownCOwner'])
 assert prior['schema']=='c-formation-native/v1' and prior['complete'] is True and prior['firstFailure'] is None and prior['chromeClosed'] is True
 assert owner['schema']=='c-formation-finite-owner/v1' and owner['complete'] is True and owner['exitCode']==0 and owner['independentClosureValid'] is True and owner['sourceBuildHelpersPostUnchanged'] is True
 assert owner['sealSha256']==prior['sealSha256']==i['approvedCandidateSeal']['sha256']
 assert {k:prior['initial']['config'][k]for k in ('seed','componentCount','dx','fineSpacing')}=={'seed':6238,'componentCount':64,'dx':2,'fineSpacing':1}
 syntax=load(seal['rootCameraSyntaxChecks']);assert syntax['schema']=='c-mature-core-root-syntax-checks/v1' and syntax['complete'] is True and syntax['resourcesStarted'] is False and syntax['portsProbed'] is False and syntax['sourcePostUnchanged'] is True
 assert syntax['inputs']==[record(W/'mature-mouth.mjs'),record(W/'inspection-bridge.mjs')]
 assert [q['name']for q in syntax['checks']]==['mature-mouth.mjs','inspection-bridge.mjs']
 for q in syntax['checks']:assert q['exitCode']==0;pin(q['log'])
 checks=load(seal['rootHelperChecks']);assert checks['schema']=='c-mature-core-native-root-helper-checks/v1' and checks['complete'] is True and checks['resourcesStarted'] is False and checks['portsProbed'] is False
 assert {'nativeSyntax','sourceOnlyOwner'}<=set(checks['checks'])
 for q in checks['checks'].values():assert q['run'] is True and q['exitCode']==0;pin(q['log'])
 for key in ('node','chrome'):assert seal['environment'][key]==raw['environment'][key];pin(seal['environment'][key])
 assert seal['gameplayAcceptance'] is False and seal['tubePassageAcceptance'] is False and seal['visualAcceptance'] is False
 return seal,build,N/'candidate-complete-dist',hashlib.sha256(body).hexdigest()
