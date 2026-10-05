from pathlib import Path
import hashlib, json, shutil
W = Path(__file__).resolve().parent; S = W / 'source'
C = Path('/private/tmp/tube-board-rhs-components-observer-20261005')
P = Path('/private/tmp/tube-native-trial-balance-native-20261005')
B = Path('/private/tmp/tube-board-rhs-components-build-20261005')
def pin(p):
    p = Path(p); b = p.read_bytes()
    return {'file': str(p), 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}
def save(p, value):
    assert not p.exists(), p; p.write_text(json.dumps(value, indent=2) + '\n')
cpu = C / 'root-checks/result.json'; proof = json.loads(cpu.read_text())
assert proof['schema'] == 'board-rhs-components-root-cpu-checks/v1' and proof['complete'] and proof['sourcePostUnchanged']
assert len(proof['checks']) == 2 and all(q['exitCode'] == 0 for q in proof['checks'])
assert proof['checks'][1]['passed'] == proof['checks'][1]['total'] == 2 and proof['checks'][1]['wholeSteps'] == 552
for q in proof['sourceInputs'] + proof['oracleInputs'] + proof['checkInputs']: assert pin(q['file']) == q
prep = json.loads((C / 'readiness.json').read_text()); frozen = json.loads((C / 'freeze.json').read_text())
for q in frozen['artifacts']: assert pin(q['file']) == q
new = json.loads((C / 'source-pins.json').read_text()); old = json.loads((P / 'source-pins.json').read_text())
assert new['count'] == old['count'] == len(new['pins']) == len(old['pins']) == 588
old_map = {q['path']: q for q in old['pins']}
changed = [q['path'] for q in new['pins'] if q != old_map[q['path']]]
assert changed == ['src/physics/AttachedRider.ts', 'src/physics/BoardBody.ts']
assert not S.exists(); S.mkdir(); rows = []
for q in new['pins']:
    relative = q['path']; source = C / 'source' / relative
    assert (pin(source)['bytes'], pin(source)['sha256']) == (q['bytes'], q['sha256'])
    target = S / relative; target.parent.mkdir(parents=True, exist_ok=True); shutil.copyfile(source, target)
    actual = pin(target); assert (actual['bytes'], actual['sha256']) == (q['bytes'], q['sha256']); rows.append(q)
(S / 'node_modules').symlink_to('/Users/regina/Desktop/Projects/surfing-game/node_modules', target_is_directory=True)
save(W / 'root-base-copy.json', {'schema': 'board-rhs-components-root-base-copy/v1', 'complete': True,
     'source': str(S), 'sourceCount': 588, 'candidateManifest': pin(C / 'source-pins.json'), 'pins': rows,
     'candidateOverridesApplied': True, 'changedParentPaths': changed, 'generatedOutputsCopied': False})
save(W / 'source-pins.json', {'schema': 'board-rhs-components-source-pins/v1', 'count': 588, 'pins': rows})
save(W / 'source-delta.json', {'schema': 'board-rhs-components-source-delta/v1', 'source': str(S), 'sourceCount': 588,
     'unchangedParentInputs': 586, 'parentManifest': pin(P / 'source-pins.json'),
     'overrides': [{'path': q['path'], 'before': old_map[q['path']], 'after': q} for q in rows if q['path'] in changed],
     'onlyPhysicsDifference': '41 copies of existing aggregate RHS scalars; no physics arithmetic, query, control or solver changes.'})
fields = json.loads((C / 'observer-fields.json').read_text()); assert len(fields['allFields']) == 143
fields_pin = pin(C / 'observer-fields.json')
if (W / 'observer-fields.json').exists():
    assert (W / 'observer-fields.json').read_bytes() == (C / 'observer-fields.json').read_bytes()
    fields_pin = pin(W / 'observer-fields.json')
save(W / 'source-readiness.json', {'schema': 'board-rhs-components-source-readiness/v1', 'complete': True, 'frozen': True,
     'sourceDirectory': str(S), 'sourceCount': 588, 'applicationSourceCount': 587, 'unchangedParentInputs': 586,
     'runtimeChangedPaths': changed, 'parentManifest': pin(P / 'source-pins.json'),
     'sourcePinsManifest': pin(W / 'source-pins.json'), 'sourceDelta': pin(W / 'source-delta.json'),
     'candidatePreparation': pin(C / 'readiness.json'), 'candidateRuntimePins': [pin(S / r) for r in changed],
     'candidatePatch': pin(C / 'runtime.patch'), 'observerFields': fields_pin,
     'rootCPUResult': pin(cpu), 'rootObserverChecks': pin(cpu), 'rootBaseCopy': pin(W / 'root-base-copy.json'),
     'buildId': 'tube-board-rhs-components-20261005', 'resourcesStarted': False, 'applicationBuildPerformed': False,
     'diagnosticBuildPerformed': False, 'nativeRun': False, 'nativeCauseOrFixAccepted': False,
     'ordinaryStandingAccepted': False, 'bodyPassageAccepted': False, 'productionAdoption': False})
B.mkdir(exist_ok=True)
extra = 'docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json'
app = [pin(S / q['path']) for q in rows if q['path'] != extra]; assert len(app) == 587
save(B / 'root-prebuild.json', {'schema': 'board-rhs-components-root-prebuild/v1', 'source': str(S),
     'buildId': 'tube-board-rhs-components-20261005', 'preparationSourcePins': 588, 'excludedPreparationInputs': [extra],
     'sourcePins': app, 'readiness': pin(W / 'source-readiness.json'), 'actualRootCPU': pin(cpu)})
print(json.dumps({'complete': True, 'readiness': pin(W / 'source-readiness.json'), 'sourcePins': pin(W / 'source-pins.json'),
                  'sourceDelta': pin(W / 'source-delta.json'), 'prebuild': pin(B / 'root-prebuild.json')}))
