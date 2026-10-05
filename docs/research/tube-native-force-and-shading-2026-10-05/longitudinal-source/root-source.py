from pathlib import Path
import hashlib, json, shutil

W=Path(__file__).resolve().parent
S=W/'source'
P=Path('/private/tmp/tube-pop-up-contact-operands-native-v8-20261005')
C=Path('/private/tmp/tube-landing-longitudinal-compliance-20261005')
def pin(path):
    p=Path(path).resolve();b=p.read_bytes()
    return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def check(q):assert pin(q['file'])==q,q['file']
def relativePin(path,relative):
    q=pin(path);return {'path':relative,'bytes':q['bytes'],'sha256':q['sha256']}
def save(path,value):
    assert not path.exists(),path
    path.write_text(json.dumps(value,indent=2)+'\n')
parentManifest=P/'root-complete-build-result.json'
parent=json.loads(parentManifest.read_text())
assert parent['terminal'] and parent['exitCode']==0 and parent['sourceUnchangedAfterBuild']
assert len(parent['sourcePins'])==587 and len(parent['assetPins'])==49
ready=json.loads((C/'readiness.json').read_text());check(ready['parent']);check(ready['candidate'])
assert ready['runtimeChangedPaths']==['src/physics/AttachedRider.ts']
cpu=C/'root-fixture-discovery-checks/result.json';proof=json.loads(cpu.read_text())
assert proof['complete'] and proof['sourcePostUnchanged']
assert all(q['exitCode']==0 for q in proof['checks'])
assert proof['checks'][1]['success'] and proof['checks'][1]['passed']==proof['checks'][1]['total']==5
assert not S.exists();S.mkdir()
rows=[];parentrows=[]
for q in parent['sourcePins']:
    check(q);path=Path(q['file'])
    if path.is_relative_to(P/'source'):
        relative=str(path.relative_to(P/'source'))
    elif '/public/' in str(path):
        relative='public/'+str(path).split('/public/',1)[1]
    else:raise AssertionError('Unexpected parent logical source '+str(path))
    actual=P/'source'/relative
    assert actual.read_bytes()==path.read_bytes(),relative
    assert relative not in {r['path'] for r in rows}
    target=S/relative;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(actual,target)
    parentrows.append(relativePin(actual,relative));rows.append(relativePin(target,relative))
extra='docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json'
target=S/extra;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(P/'source'/extra,target)
parentrows.append(relativePin(P/'source'/extra,extra));rows.append(relativePin(target,extra))
assert len(rows)==588
runtime='src/physics/AttachedRider.ts';before=relativePin(S/runtime,runtime)
assert before['sha256']==ready['parent']['sha256']
shutil.copyfile(ready['candidate']['file'],S/runtime)
after=relativePin(S/runtime,runtime)
assert after['sha256']==ready['candidate']['sha256']
rows=[after if q['path']==runtime else q for q in rows]
assert sum(a!=b for a,b in zip(parentrows,rows))==1
(S/'node_modules').symlink_to((P/'source/node_modules').resolve(),target_is_directory=True)
save(W/'source-pins.json',{'schema':'landing-longitudinal-source-pins/v1','count':588,'pins':sorted(rows,key=lambda q:q['path'])})
delta={'schema':'landing-longitudinal-source-delta/v1','parentSource':str(P/'source'),
 'source':str(S),'sourceCount':588,'unchangedParentInputs':587,'parentManifest':pin(parentManifest),
 'overrides':[{'path':runtime,'before':before,'after':after}],
 'onlyPhysicsDifference':'Landing-only coherent fore/aft impedance in the unused eighth solve slot; exact38 passive operands and all other source remain unchanged.'}
save(W/'source-delta.json',delta)
result={'schema':'landing-longitudinal-source-readiness/v1','complete':True,'frozen':True,
 'meaning':'Frozen source preparation with actual controlled fixture passes; ordinary native benefit and adoption remain unproved.',
 'sourceDirectory':str(S),'sourceCount':588,'applicationSourceCount':587,'unchangedParentInputs':587,
 'runtimeChangedPaths':[runtime],'parentManifest':pin(parentManifest),'sourcePinsManifest':pin(W/'source-pins.json'),
 'sourceDelta':pin(W/'source-delta.json'),'candidatePreparation':pin(C/'readiness.json'),
 'candidateRuntime':ready['candidate'],'candidatePatch':pin(C/'candidate.patch'),
 'controlledCPUResult':pin(cpu),'controlledProof':pin(C/'controlled-proof.json'),
 'fixtureTypeRepair':pin(C/'fixture-types-repair.json'),'fixtureRunnerConfig':pin(C/'vitest.fixture-types.config.ts'),
 'parentV11ActualOwner':pin(Path('/private/tmp/tube-pop-up-contact-operands-native-v11-20261005/candidate-first-owner.json')),
 'actualV11ForceReview':pin(Path('/private/tmp/tube-pop-up-contact-operands-v11-actual-review-20261005/analysis.json')),
 'buildId':'tube-landing-longitudinal-20261005','resourcesStarted':False,'portsProbed':False,
 'applicationBuildPerformed':False,'diagnosticBuildPerformed':False,'nativeRun':False,
 'nativeCauseOrFixAccepted':False,'ordinaryStandingAccepted':False,'bodyPassageAccepted':False,'productionAdoption':False}
save(W/'source-readiness.json',result)
print(json.dumps({'complete':True,'sourceInputs':588,'unchangedParentInputs':587,
 'readiness':pin(W/'source-readiness.json'),'sourcePins':pin(W/'source-pins.json'),'runtime':after}))
