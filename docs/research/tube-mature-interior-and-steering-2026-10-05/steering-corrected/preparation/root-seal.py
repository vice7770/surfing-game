"""Root-run acceptance of reused direct build receipts and actual helper checks; no gameplay claim."""
from pathlib import Path
import argparse,json
from authority import W,record,load,pin,direct_inputs,preparation,LIMITS
parser=argparse.ArgumentParser();parser.add_argument('--root-accept-preparation',action='store_true',required=True);args=parser.parse_args()
assert not (W/'root-readiness.json').exists() and not (W/'seal.json').exists(),'First-only seal preserves prior result'
freeze=preparation();inputs=load(record(W/'inputs.json'));assert inputs['rootBound'] is True
raw,build,d,ref=direct_inputs(inputs)
checks_pin=record(W/'root-helper-checks.json');checks=load(checks_pin)
assert checks['schema']=='c-line-steering-clock-root-helper-checks/v1' and checks['complete'] is True and checks['resourcesStarted'] is False and checks['portsProbed'] is False
assert set(checks['checks'])=={'nativeSyntax','controlSyntax','sourceOnlyOwner'}
for q in checks['checks'].values():assert q['run'] is True and q['exitCode']==0;pin(q['log'])
ready={'schema':'c-line-steering-clock-root-readiness/v1','complete':True,'frozen':True,'resourcesStarted':False,'portsProbed':False,'actualAcceptedCBuildReused':True,'actualAcceptedCDiagnosticReused':True,'referencePrefixThrough':1372,'physicalClocksExact':True,'surfaceRevisionRelativeIncrementRequired':True,'initialLoft37ArraysRawEqualityRequired':True,'previousAttemptQualifiedAsMetadataFailureBeforeInput':True,'helperAcceptance':True,'rootHelperChecks':checks_pin,'gameplayAcceptance':False,'tubePassageAcceptance':False,'productionAdoption':False}
(W/'root-readiness.json').write_text(json.dumps(ready,indent=2)+'\n')
immutable=[record(W/n)for n in ['inputs.json','root-readiness.json','root-helper-checks.json','prep/freeze.json']]+[q['log']for q in checks['checks'].values()]
immutable+=inputs['borrowedHelperPins']+inputs['immediateHarnessPins']
keys=['approvedCandidateSeal','approvedApplicationBuild','approvedDiagnosticBuild','diagnosticModule','acceptedReferenceReport','acceptedReferenceTrace','acceptedReferenceOwner','replayReference','observerFields','sourceReadiness','acceptedReferenceInitialLoft','previousFailedReport','previousFailedOwner','cacheCounterSource','previousFailureRootQualification']
immutable+=[inputs[k]for k in keys]
unique={q['file']:q for q in immutable};assert all(unique[q['file']]==q for q in immutable)
s={'schema':'c-line-steering-clock-root-seal/v1','complete':True,'rootAuthorized':True,'preparationInputs':record(W/'inputs.json'),'preparationFreeze':record(W/'prep/freeze.json'),'helperReadiness':record(W/'root-readiness.json'),'helperPins':freeze['pins'],'rootHelperChecks':checks_pin,'immutableInputsAndOutputs':list(unique.values()),'environment':raw['environment'],'limits':LIMITS,'arms':{'candidate':raw['arms']['candidate']},'priorV4Report':raw['priorV4Report'],'priorV6Report':raw['priorV6Report'],'applicationRebuilt':False,'geometryOrPhysicsChanged':False,'gameplayAcceptance':False,'tubePassageAcceptance':False,'productionAdoption':False,**{k:inputs[k]for k in keys}}
assert len(json.dumps(s).encode())<=1024*1024
(W/'seal.json').write_text(json.dumps(s,indent=2)+'\n');print(json.dumps({'complete':True,'seal':record(W/'seal.json'),'readiness':record(W/'root-readiness.json'),'nativeRun':False}))
