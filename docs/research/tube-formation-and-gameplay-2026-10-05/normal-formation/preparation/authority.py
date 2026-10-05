"""Direct root-compiled formation trial build/module plus this harness only; no historical recursion."""
from pathlib import Path
import hashlib,json
W=Path('/private/tmp/tube-c-formation-autopilot-native-20261005')
NATIVE=Path('/private/tmp/tube-c-formation-native-20261005')
SOURCE=Path('/private/tmp/tube-c-formation-trial-20261005/source')
LIMITS={'wholeSeconds':1800,'commandSeconds':1788,'nativeSeconds':1775,'cleanupSeconds':7,'startupMilliseconds':180000,'steps':7200,'physicalSeconds':120,'reportBytes':33554432,'traceBytes':25165824,'pngCount':6,'pngBytesEach':12582912,'pngBytesTotal':50331648,'sidecarCount':4,'sidecarBytesEach':6291456,'sidecarBytesTotal':25165824,'movieBytes':16777216,'moviePhysicalSeconds':20,'movieRequestStride':3,'movieRequests':401,'ownedPorts':[4301,9711],'protectedPorts':[4310,4311,4312,4313]}
def pin(q):
 p=Path(q['file']);assert p.is_file(),'Missing sealed input '+str(p)
 b=p.read_bytes();assert len(b)==q['bytes'] and hashlib.sha256(b).hexdigest()==q['sha256'],'Sealed input changed '+str(p)
 return b
def load(q):return json.loads(pin(q))
def sealed(arm):
 body=(W/'seal.json').read_bytes();assert len(body)<=1048576
 s=json.loads(body);assert s['schema']=='c-formation-autopilot-root-seal/v1' and s['complete'] is True and s['rootAuthorized'] is True and arm=='candidate'
 assert s['limits']==LIMITS
 inputs=load(s['preparationInputs']);assert s['preparationInputs']['file']==str(W/'inputs.json') and inputs['schema']=='c-formation-autopilot-preparation-inputs/v1' and inputs['rootBound'] is True
 for key in ('approvedCandidateSeal','approvedApplicationBuild','approvedDiagnosticBuild','diagnosticModule'):
  assert s[key]==inputs[key];pin(s[key])
 raw=load(s['approvedCandidateSeal']);assert raw['schema']=='c-formation-root-seal/v1' and raw['complete'] is True
 build=load(s['approvedApplicationBuild']);assert build['schema']=='c-formation-root-complete-build/v1' and build['terminal'] is True and build['exitCode']==0 and build['sourceUnchangedAfterBuild'] is True
 assert build['source']==str(SOURCE) and build['frozenDist']==str(NATIVE/'candidate-complete-dist') and build['buildId']=='tube-c-formation-20261005'
 a=raw['arms']['candidate'];assert a['rootAuthorized'] is True and a['rootBuildManifest']==s['approvedApplicationBuild'] and a['assetPins']==build['assetPins'] and a['sourcePins']==build['sourcePins']
 assert len(build['sourcePins'])==587 and len(build['assetPins'])==49 and build['assetPins']==build['frozenAssetPins']
 for q in build['sourcePins']+build['assetPins']+build['builtAssetPins']+build['generatedOutputPins']:pin(q)
 assert {str(p)for p in (NATIVE/'candidate-complete-dist').rglob('*')if p.is_file()}=={q['file']for q in build['assetPins']}
 command=load(build['rootApplicationCommand']);assert command['complete'] is True and command['terminal'] is True and command['exitCode']==0 and command['sourceUnchanged'] is True
 assert {q['name']for q in command['checks']}=={'consumers','build'} and all(q['exitCode']==0 and not q['timedOut']for q in command['checks'])
 for q in command['checks']:pin(q['log'])
 d=load(s['approvedDiagnosticBuild']);assert d['schema']=='c-formation-diagnostic-root-build/v1' and d['terminal'] is True and d['exitCode']==0
 assert d['rootCompleteBuild']==s['approvedApplicationBuild'] and d['source']==build['source'] and d['module']==s['diagnosticModule']==raw['diagnosticModule']
 assert len(d['inputs'])==74 and len(d['sourceInputs'])==71 and d['compilerWatchedInputCount']==75 and d['actualNewDiagnosticSourceCompiled'] is True and d['diagnosticModuleCopiedFromPrior'] is False
 assert sorted(d['moduleExports'])==['Autopilot','autopilotView','riderPartVolumes'] and d['diagnosticLexicalObserverFieldCount']==0
 for q in d['inputs']+d['compilerConfigurationInputs']+[d['module'],d['entry']]:pin(q)
 for prefix in ('WorkerSurfZone-','surfZoneWorker-'):
  workers=[q for q in build['assetPins']if Path(q['file']).name.startswith(prefix)and q['file'].endswith('.js')];assert len(workers)==1
 assert s['borrowedHelperPins']==inputs['borrowedHelperPins']
 for q in s['borrowedHelperPins']:pin(q)
 needed={'authority.py','run.py','native.mjs','rider-driver.mjs','snapshot-tools.mjs','mouth-camera.mjs','evidence-projection.mjs','check-payload.mjs','bind-inputs.py','inputs.template.json','inputs.json','readiness.json','README.md'}
 own={Path(q['file']).name for q in s['helperPins']};assert needed<=own and len(s['helperPins'])==len({q['file']for q in s['helperPins']})
 for q in s['helperPins']:assert Path(q['file']).parent==W;pin(q)
 ready=load(s['helperReadiness']);assert s['helperReadiness']['file']==str(W/'readiness.json') and ready['schema']=='c-formation-autopilot-source-readiness/v1' and ready['sourceOnly'] is True and ready['rootExecutionPending'] is True and ready['checksRun'] is False
 checks=load(s['rootHelperChecks']);assert checks['schema']=='c-formation-autopilot-root-helper-checks/v1' and checks['complete'] is True and checks['resourcesStarted'] is False and checks['portsProbed'] is False
 assert {'syntax','payload','sourceOnlyOwner'}<=set(checks['checks'])
 for q in checks['checks'].values():assert q['exitCode']==0 and q['run'] is True;pin(q['log'])
 assert checks['payload']['nonmutationPassed'] is True and checks['payload']['budgetPassed'] is True
 for key in ('node','chrome'):assert s['environment'][key]==raw['environment'][key];pin(s['environment'][key])
 assert s['gameplayAcceptance'] is False and s['tubePassageAcceptance'] is False and s['productionAdoption'] is False
 return s,build,NATIVE/'candidate-complete-dist',hashlib.sha256(body).hexdigest()
