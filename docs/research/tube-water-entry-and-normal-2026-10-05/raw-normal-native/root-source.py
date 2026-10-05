"""Root-run once: materialize exactly the immediate143 parent's 588 source inputs."""
from pathlib import Path
import hashlib, json, shutil
W=Path(__file__).resolve().parent; S=W/'source'
C=Path('/private/tmp/tube-board-raw-normal-native-prep-20261005')
B=Path('/private/tmp/tube-board-raw-normal-build-20261005')
P=Path('/private/tmp/tube-board-rhs-components-native-20261005')
BUILD_ID='tube-board-raw-normal-20261005'; CHANGED=['src/physics/BoardBody.ts']
def pin(p):
 p=Path(p); b=p.read_bytes(); return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def verify(q):
 assert pin(q['file'])==q, q['file']
def save(p,v):
 assert not p.exists(),p; p.write_text(json.dumps(v,indent=2)+'\n')
freeze=json.loads((C/'freeze.json').read_text())
assert freeze['schema']=='board-raw-normal-source-preparation-freeze/v1' and freeze['sourceOnly'] and freeze['rootExecutionPending']
for q in freeze['pins']: verify(q)
inputs=json.loads((C/'inputs.json').read_text())
assert inputs['schema']=='board-raw-normal-preparation-inputs/v1' and inputs['immediateParent']==str(P)
for name in ('parentManifest','parentCompleteBuild','parentDiagnosticBuild','parentNative','parentOwner','observerFields','candidateOverride','parentAliasWrapper'): verify(inputs[name])
for q in inputs['helpers']+inputs['parentBuildScripts']: verify(q)
for q in inputs['compilerToolInputs']: verify(q)
assert inputs['candidateOverride']['file']=='/private/tmp/tube-board-raw-normal-trial-20261005/source/src/physics/BoardBody.ts'
old=json.loads(Path(inputs['parentManifest']['file']).read_text())
assert old['schema']=='board-rhs-components-source-pins/v1' and old['count']==len(old['pins'])==588
prior={q['path']:q for q in old['pins']}; assert len(prior)==588
cpu_pin=pin(inputs['controlledCPUPath']); cpu=json.loads(Path(cpu_pin['file']).read_text())
assert cpu['schema']=='board-raw-normal-root-controlled-checks/v1' and cpu['complete'] and cpu['sourcePostUnchanged']
assert cpu['sourceCount']==588 and cpu['unchangedParentInputs']==587 and cpu['runtimeChangedPaths']==CHANGED
checks={q['name']:q for q in cpu['checks']}
assert set(checks)=={'strict','targeted'} and all(q['exitCode']==0 and not q['timedOut'] for q in checks.values())
assert checks['targeted']['success'] and checks['targeted']['passed']==checks['targeted']['total']==7 and checks['targeted']['failed']==0
for q in cpu['checkInputs']:
 verify(q)
for q in cpu['checks']:
 verify(q['log'])
 if 'report' in q: verify(q['report'])
for key,root in [('sourceInputs',Path('/private/tmp/tube-board-raw-normal-trial-20261005/source')),('oracleInputs',P/'source')]:
 assert len(cpu[key])==len({q['file'] for q in cpu[key]})==588
 expected={str(root/path):q for path,q in prior.items()}
 for q in cpu[key]:
  verify(q); assert q['file'] in expected
  wanted=inputs['candidateOverride'] if key=='sourceInputs' and q['file']==str(root/CHANGED[0]) else expected[q['file']]
  assert (q['bytes'],q['sha256'])==(wanted['bytes'],wanted['sha256'])
assert not S.exists() and not (B/'root-prebuild.json').exists()
S.mkdir(); rows=[]
for relative,q in sorted(prior.items()):
 assert not Path(relative).is_absolute() and '..' not in Path(relative).parts
 before=pin(P/'source'/relative); assert (before['bytes'],before['sha256'])==(q['bytes'],q['sha256'])
 source=Path(inputs['candidateOverride']['file']) if relative in CHANGED else P/'source'/relative
 target=S/relative; target.parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(source,target)
 actual=pin(target); rows.append({'path':relative,'bytes':actual['bytes'],'sha256':actual['sha256']})
assert [q['path'] for q in rows if q!=prior[q['path']]]==CHANGED
(S/'node_modules').symlink_to('/Users/regina/Desktop/Projects/surfing-game/node_modules',target_is_directory=True)
save(W/'source-pins.json',{'schema':'board-raw-normal-source-pins/v1','count':588,'pins':rows})
save(W/'source-delta.json',{'schema':'board-raw-normal-source-delta/v1','source':str(S),'sourceCount':588,'unchangedParentInputs':587,'parentManifest':inputs['parentManifest'],'overrides':[{'path':q['path'],'before':prior[q['path']],'after':q}for q in rows if q['path'] in CHANGED],'physicalDifferenceIntentional':True,'onlyPhysicsDifference':'Water-inertia direction uses existing raw unit WaterSample.normalXYZ; all143 observer words and all other inputs remain unchanged.'})
save(W/'root-base-copy.json',{'schema':'board-raw-normal-root-base-copy/v1','complete':True,'source':str(S),'sourceCount':588,'parentManifest':inputs['parentManifest'],'candidateOverride':inputs['candidateOverride'],'generatedOutputsCopied':False})
# Extract the two exact existing descriptive references once; the owner/native do not load historical report inventories.
references={}
for key,file in [('v4','/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/candidate-first/report.json'),('v6','/private/tmp/tube-pop-up-contact-native-v6-20261005/candidate-first/report.json')]:
 p=Path(file); original_pin=pin(p); report=json.loads(p.read_text())
 assert report['complete'] is True and report['firstFailure'] is None
 references[key]={'priorReport':original_pin,'initial':{'config':report['initial']['config']},'initialBody':report['initialBody']}
assert {k:references['v4']['initial']['config'][k]for k in ('seed','componentCount','dx','fineSpacing')}=={'seed':6238,'componentCount':64,'dx':2,'fineSpacing':1}
replay={'schema':'board-raw-normal-replay-reference/v1','references':references,'rootExtractedFromDirectReports':True,'noHistoricalHelperInventories':True}
assert len(json.dumps(replay).encode())<=1024*1024
save(W/'replay-reference.json',replay)
save(W/'source-readiness.json',{'schema':'board-raw-normal-source-readiness/v1','complete':True,'frozen':True,'sourceDirectory':str(S),'sourceCount':588,'applicationSourceCount':587,'unchangedParentInputs':587,'runtimeChangedPaths':CHANGED,'parentManifest':inputs['parentManifest'],'sourcePinsManifest':pin(W/'source-pins.json'),'sourceDelta':pin(W/'source-delta.json'),'candidateRuntimePins':[pin(S/CHANGED[0])],'candidateOverride':inputs['candidateOverride'],'observerFields':pin(W/'observer-fields.json'),'rootCPUResult':cpu_pin,'rootBaseCopy':pin(W/'root-base-copy.json'),'preparationInputs':pin(C/'inputs.json'),'preparationFreeze':pin(C/'freeze.json'),'replayReference':pin(W/'replay-reference.json'),'buildId':BUILD_ID,'resourcesStarted':False,'applicationBuildPerformed':False,'diagnosticBuildPerformed':False,'nativeRun':False,'physicalDifferenceIntentional':True,'nativeCauseOrFixAccepted':False,'productionAdoption':False})
extra='docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json'
app=[pin(S/q['path'])for q in rows if q['path']!=extra]; assert len(app)==587
save(B/'root-prebuild.json',{'schema':'board-raw-normal-root-prebuild/v1','source':str(S),'buildId':BUILD_ID,'preparationSourcePins':588,'excludedPreparationInputs':[extra],'sourcePins':app,'readiness':pin(W/'source-readiness.json'),'actualRootCPU':cpu_pin,'preparationInputs':pin(C/'inputs.json')})
print(json.dumps({'complete':True,'readiness':pin(W/'source-readiness.json'),'prebuild':pin(B/'root-prebuild.json'),'sourceCount':588,'changedPaths':CHANGED}))
