"""Root-run once: bind the exact trial source root actually compiled; never copy or rebuild it."""
from pathlib import Path
import hashlib, json
W=Path(__file__).resolve().parent; S=Path('/private/tmp/tube-c-formation-trial-20261005/source')
C=Path('/private/tmp/tube-c-formation-native-20261005/prep')
B=Path('/private/tmp/tube-c-formation-build-20261005')
P=Path('/private/tmp/tube-board-raw-normal-native-20261005')
BUILD_ID='tube-c-formation-20261005'; CHANGED=['src/wave/barrel/sweptLoft.ts']
def pin(p):
 p=Path(p); b=p.read_bytes(); return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def verify(q):
 assert pin(q['file'])==q, q['file']
def save(p,v):
 assert not p.exists(),p; p.write_text(json.dumps(v,indent=2)+'\n')
freeze=json.loads((C/'freeze.json').read_text())
assert freeze['schema']=='c-formation-source-preparation-freeze/v1' and freeze['sourceOnly'] and freeze['rootExecutionPending']
for q in freeze['pins']: verify(q)
inputs=json.loads((C/'inputs.json').read_text())
assert inputs['schema']=='c-formation-preparation-inputs/v1' and inputs['immediateParent']==str(P)
for name in ('parentManifest','parentCompleteBuild','parentDiagnosticBuild','parentNative','parentOwner','observerFields','candidateOverride','parentAliasWrapper'): verify(inputs[name])
for q in inputs['helpers']+inputs['parentBuildScripts']: verify(q)
for q in inputs['compilerToolInputs']: verify(q)
assert inputs['candidateOverride']['file']=='/private/tmp/tube-c-formation-trial-20261005/source/src/wave/barrel/sweptLoft.ts'
old=json.loads(Path(inputs['parentManifest']['file']).read_text())
assert old['schema']=='board-raw-normal-source-pins/v1' and old['count']==len(old['pins'])==588
prior={q['path']:q for q in old['pins']}; assert len(prior)==588
cpu_pin=pin(inputs['controlledCPUPath']); cpu=json.loads(Path(cpu_pin['file']).read_text())
assert cpu['complete'] and cpu['sourcePostUnchanged'] and cpu['sourceFiles']==588
assert len(cpu['runtimeDelta'])==1 and cpu['runtimeDelta'][0]['path']==CHANGED[0]
assert cpu['runtimeDelta'][0]['before']==prior[CHANGED[0]]
assert (cpu['runtimeDelta'][0]['after']['bytes'],cpu['runtimeDelta'][0]['after']['sha256'])==(inputs['candidateOverride']['bytes'],inputs['candidateOverride']['sha256'])
checks={q['name']:q for q in cpu['checks']}
assert set(checks)=={'strict','formation'} and all(q['exitCode']==0 and not q['timedOut'] for q in checks.values())
for q in inputs['controlledCheckPins']:verify(q)
for q in cpu['checks']:verify(q['log'])
tested=json.loads(Path(inputs['controlledTestReport']['file']).read_text())
assert tested['success'] and tested['numTotalTests']==tested['numPassedTests']==5 and tested['numFailedTests']==0
assert S.is_dir() and not (B/'root-prebuild.json').exists()
assert not (W/'source').exists(), 'Use the exact actually compiled trial source; no source clone or second build'
rows=[]
for relative,q in sorted(prior.items()):
 assert not Path(relative).is_absolute() and '..' not in Path(relative).parts
 before=pin(P/'source'/relative); assert (before['bytes'],before['sha256'])==(q['bytes'],q['sha256'])
 actual=pin(S/relative)
 wanted=inputs['candidateOverride'] if relative in CHANGED else before
 assert (actual['bytes'],actual['sha256'])==(wanted['bytes'],wanted['sha256'])
 rows.append({'path':relative,'bytes':actual['bytes'],'sha256':actual['sha256']})
assert [q['path'] for q in rows if q!=prior[q['path']]]==CHANGED
verify(inputs['actualRootConsumersBuild'])
actual_build=json.loads(Path(inputs['actualRootConsumersBuild']['file']).read_text())
assert actual_build['complete'] and actual_build['sourcePostUnchanged'] and actual_build['sourceFiles']==588
assert actual_build['buildId']==BUILD_ID and actual_build['builtDist']==str(S/'dist')
assert [q['name']for q in actual_build['checks']]==['consumers','build'] and all(q['exitCode']==0 and not q['timedOut']for q in actual_build['checks'])
for q in inputs['actualBuildCheckPins']:verify(q)
for q in actual_build['checks']:verify(q['log'])
consumer_tests=json.loads(Path(inputs['actualConsumersReport']['file']).read_text());assert consumer_tests['success'] and consumer_tests['numTotalTests']==consumer_tests['numPassedTests']==5 and consumer_tests['numFailedTests']==0
assert json.loads((S/'dist/build.json').read_text())['build']==BUILD_ID
save(W/'source-pins.json',{'schema':'c-formation-source-pins/v1','count':588,'pins':rows})
save(W/'source-delta.json',{'schema':'c-formation-source-delta/v1','source':str(S),'sourceCount':588,'unchangedParentInputs':587,'parentManifest':inputs['parentManifest'],'overrides':[{'path':q['path'],'before':prior[q['path']],'after':q}for q in rows if q['path'] in CHANGED],'physicalDifferenceIntentional':True,'onlyPhysicsDifference':'The true existing analytic C formation scales the shared loft deformation and C mask once; all143 observer words, raw-normal BoardBody, clocks and all other inputs remain unchanged.'})
save(W/'root-source-binding.json',{'schema':'c-formation-root-source-binding/v1','complete':True,'source':str(S),'sourceCount':588,'parentManifest':inputs['parentManifest'],'candidateOverride':inputs['candidateOverride'],'generatedOutputsCopied':False,'sourceCopied':False,'compiledTrialSourceReused':True,'actualRootConsumersBuild':inputs['actualRootConsumersBuild']})
# Exact direct replay reference already extracted by the immediate parent; no ancestral reports are reopened.
verify(inputs['parentReplayReference'])
replay=json.loads(Path(inputs['parentReplayReference']['file']).read_text())
assert replay['schema']=='board-raw-normal-replay-reference/v1' and replay['noHistoricalHelperInventories']
assert {k:replay['references']['v4']['initial']['config'][k]for k in ('seed','componentCount','dx','fineSpacing')}=={'seed':6238,'componentCount':64,'dx':2,'fineSpacing':1}
assert inputs['parentReplayReference']['bytes']<=1024*1024
(W/'replay-reference.json').write_bytes(Path(inputs['parentReplayReference']['file']).read_bytes())
save(W/'source-readiness.json',{'schema':'c-formation-source-readiness/v1','complete':True,'frozen':True,'sourceDirectory':str(S),'sourceCount':588,'applicationSourceCount':587,'unchangedParentInputs':587,'runtimeChangedPaths':CHANGED,'parentManifest':inputs['parentManifest'],'sourcePinsManifest':pin(W/'source-pins.json'),'sourceDelta':pin(W/'source-delta.json'),'candidateRuntimePins':[pin(S/CHANGED[0])],'candidateOverride':inputs['candidateOverride'],'observerFields':pin(W/'observer-fields.json'),'rootCPUResult':cpu_pin,'rootSourceBinding':pin(W/'root-source-binding.json'),'preparationInputs':pin(C/'inputs.json'),'preparationFreeze':pin(C/'freeze.json'),'replayReference':pin(W/'replay-reference.json'),'buildId':BUILD_ID,'resourcesStarted':False,'applicationBuildPerformed':True,'applicationBuildReused':True,'actualRootConsumersBuild':inputs['actualRootConsumersBuild'],'diagnosticBuildPerformed':False,'nativeRun':False,'physicalDifferenceIntentional':True,'nativeCauseOrFixAccepted':False,'productionAdoption':False})
extra='docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json'
app=[pin(S/q['path'])for q in rows if q['path']!=extra]; assert len(app)==587
save(B/'root-prebuild.json',{'schema':'c-formation-root-prebuild/v1','source':str(S),'buildId':BUILD_ID,'preparationSourcePins':588,'excludedPreparationInputs':[extra],'sourcePins':app,'readiness':pin(W/'source-readiness.json'),'actualRootCPU':cpu_pin,'preparationInputs':pin(C/'inputs.json')})
# Receipt adapter preserves the actual completed commands, names, logs and source path. No command runs here.
command={'schema':'c-formation-root-application-command/v1','complete':True,'terminal':True,'exitCode':0,'sourceUnchanged':True,'source':str(S),'buildId':BUILD_ID,'builtDist':str(S/'dist'),'prebuild':pin(B/'root-prebuild.json'),'checks':actual_build['checks'],'actualRootConsumersBuild':inputs['actualRootConsumersBuild'],'receiptAdapterOnly':True,'applicationBuildPerformedByThisScript':False,'actualBuildCommand':['/opt/homebrew/bin/npm','run','build']}
save(B/'root-command-result.json',command)
(B/'root-build-output.txt').write_text('Actual completed root consumers/build receipt; this adapter ran no commands.\n'+Path(actual_build['checks'][0]['log']['file']).read_text()+Path(actual_build['checks'][1]['log']['file']).read_text()+json.dumps(actual_build,indent=2)+'\n')
print(json.dumps({'complete':True,'readiness':pin(W/'source-readiness.json'),'prebuild':pin(B/'root-prebuild.json'),'sourceCount':588,'changedPaths':CHANGED}))
