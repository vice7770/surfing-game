"""Root-run acceptance of fresh builds/helpers; never accepts physical success or adoption."""
from pathlib import Path
import argparse,json
from authority import W,C,record,load,pin,complete_build,diagnostic,BUILD_ID
parser=argparse.ArgumentParser();parser.add_argument('--root-accept-preparation',action='store_true',required=True);args=parser.parse_args()
assert not (W/'readiness.json').exists()and not (W/'seal.json').exists()
build,a,rows,inputs,fields=complete_build();d=diagnostic(build,a,rows,inputs,fields)
checks_pin=record(W/'root-helper-checks.json');checks=load(checks_pin)
assert checks['schema']=='c-formation-root-helper-checks/v1'and checks['complete']and checks['resourcesStarted']is False and checks['portsProbed']is False
assert set(checks['checks'])=={'nativeSyntax','diagnosticWrapperSyntax','sourceOnlyOwner'}
for q in checks['checks'].values():assert q['run']and q['exitCode']==0;pin(q['log'])
ready={'schema':'c-formation-root-readiness/v1','complete':True,'frozen':True,'resourcesStarted':False,'actualAppBuildAccepted':True,'actualDiagnosticBuildAccepted':True,'controlledCPUAccepted':True,'helperAcceptance':True,'sourceReadiness':record(W/'source-readiness.json'),'rootHelperChecks':checks_pin,'physicalDifferenceIntentional':True,'exactNativeParityClaim':False,'nativeCauseOrFixAccepted':False,'productionAdoption':False,'authorityDelta':'Direct immediate raw-normal inputs/build/graph and frozen helper closure; exact immediate-parent replay-reference copy; actual completed trial build reused without source copy or second build.'}
(W/'readiness.json').write_text(json.dumps(ready,indent=2)+'\n')
replay=load(a['replayReference']);environment={'node':record('/opt/homebrew/bin/node'),'chrome':record('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')}
immutable=[record(W/n)for n in ('readiness.json','root-helper-checks.json','source-readiness.json','source-pins.json','source-delta.json','root-source-binding.json','replay-reference.json','root-build-result.json','root-complete-build-result.json','root-diagnostic-build-result.json')]
immutable += [a['rootCPUResult'],record(C/'inputs.json'),record(C/'freeze.json')]+list(environment.values())
immutable += d['inputs']+d['compilerConfigurationInputs']+[d['compilerEntry']]
immutable += inputs['compilerToolInputs']+inputs['controlledCheckPins']+inputs['actualBuildCheckPins']
immutable += [q['log']for q in checks['checks'].values()]
unique={q['file']:q for q in immutable};assert all(unique[q['file']]==q for q in immutable)
seal={'schema':'c-formation-root-seal/v1','complete':True,'physicalDifferenceIntentional':True,'nativeCauseOrFixAccepted':False,'productionAdoption':False,'preparationFreeze':record(C/'freeze.json'),'sourceReadiness':record(W/'source-readiness.json'),'helperReadiness':record(W/'readiness.json'),'helperPins':inputs['helpers'],'rootDiagnosticBuild':record(W/'root-diagnostic-build-result.json'),'diagnosticModule':d['module'],'replayReference':a['replayReference'],'priorV4Report':replay['references']['v4']['priorReport'],'priorV6Report':replay['references']['v6']['priorReport'],'environment':environment,'immutableInputsAndOutputs':list(unique.values()),'limits':{'wholeSeconds':660,'commandSeconds':648,'nativeSeconds':635,'startupMilliseconds':180000,'cleanupSeconds':7,'reportBytes':32*1024*1024,'traceBytes':24*1024*1024,'ownedPorts':[4301,9711],'protectedPorts':[4310,4311,4312,4313]},'arms':{'candidate':{'rootAuthorized':True,'dist':str(W/'candidate-complete-dist'),'buildId':BUILD_ID,'rootBuildManifest':record(W/'root-complete-build-result.json'),'sourcePins':build['sourcePins'],'assetPins':build['assetPins']}}}
assert len(json.dumps(seal).encode())<=1024*1024
(W/'seal.json').write_text(json.dumps(seal,indent=2)+'\n');print(json.dumps({'complete':True,'seal':record(W/'seal.json'),'readiness':record(W/'readiness.json'),'nativeRun':False,'productionAdoption':False}))
