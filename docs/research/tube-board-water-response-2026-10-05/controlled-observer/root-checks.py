from pathlib import Path
import hashlib, json, os, signal, subprocess, time

C = Path(__file__).resolve().parent
S = C / 'source'
BASE = Path('/private/tmp/tube-native-trial-balance-native-20261005/source')
R = C / 'root-checks'
assert not R.exists()
R.mkdir()
MOD = Path('/Users/regina/Desktop/Projects/surfing-game/node_modules')
NODE = Path('/opt/homebrew/bin/node')
def pin(p):
    p = Path(p); b = p.read_bytes()
    return {'file': str(p), 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}
def matches(p, q):
    actual = pin(p)
    return (actual['bytes'], actual['sha256']) == (q['bytes'], q['sha256'])
ready = json.loads((C / 'readiness.json').read_text())
frozen = json.loads((C / 'freeze.json').read_text())
assert ready['complete'] and ready['frozen'] and frozen['sourceOnly'] and frozen['frozen']
assert ready['fieldCounts'] == {'old': 102, 'added': 41, 'total': 143, 'newAvailabilityMarkers': 0}
assert (ready['sourceInputCount'], ready['applicationSourceInputCount'], ready['unchangedParentInputs']) == (588, 587, 586)
assert frozen['artifactCount'] == len(frozen['artifacts']) == 16
for q in frozen['artifacts'] + ready['candidateRuntimePins']: assert pin(q['file']) == q
parent = json.loads((C / 'parent-source-pins.json').read_text())
candidate = json.loads((C / 'source-pins.json').read_text())
assert parent['count'] == candidate['count'] == len(parent['pins']) == len(candidate['pins']) == 588
old = {q['path']: q for q in parent['pins']}; new = {q['path']: q for q in candidate['pins']}
assert len(old) == len(new) == 588 and old.keys() == new.keys()
changed = [key for key in sorted(new) if old[key] != new[key]]
assert changed == ready['runtimeChangedPaths'] == ['src/physics/AttachedRider.ts', 'src/physics/BoardBody.ts']
for key in new:
    assert matches(S / key, new[key]) and matches(BASE / key, old[key]), key
actual_files = {str(p.relative_to(S)) for p in S.rglob('*') if p.is_file()}
assert actual_files == set(new)
aliases = []
for root in (S, C):
    link = root / 'node_modules'
    if not link.is_symlink():
        assert not link.exists(); link.symlink_to(MOD, target_is_directory=True)
        aliases.append(str(link))
    assert link.resolve() == MOD.resolve()
sources = [pin(S / key) for key in sorted(new)]
oracle = [pin(BASE / key) for key in sorted(old)]
inputs = [pin(C / n) for n in ('readiness.json', 'freeze.json', 'source-pins.json', 'source-delta.json',
          'parent-source-pins.json', 'observer-fields.json', 'runtime.patch', 'tests/trialBalance.components-parity.test.ts',
          'tsconfig.observer.json', 'vitest.config.mts', 'root-checks.py')]
inputs += [pin(NODE), pin(MOD / 'typescript/bin/tsc'), pin(MOD / 'vitest/vitest.mjs')]
material = {'schema': 'board-rhs-components-root-materialization/v1', 'sourceCount': 588,
            'unchangedParentInputs': 586, 'changedPaths': changed, 'sourceInputs': sources, 'oracleInputs': oracle,
            'frozenPreparation': pin(C / 'freeze.json'), 'rootCreatedDependencyAliases': aliases,
            'importsRewritten': False, 'generatedOutputsCopied': False}
(R / 'materialization.json').write_text(json.dumps(material, indent=2) + '\n')
checks = []
commands = [('strict', [str(NODE), str(MOD / 'typescript/bin/tsc'), '--noEmit', '--incremental', 'false', '-p', str(C / 'tsconfig.observer.json')], 120),
            ('parity', [str(NODE), str(MOD / 'vitest/vitest.mjs'), 'run', '--config', str(C / 'vitest.config.mts'), '--reporter=json', '--outputFile', str(R / 'parity.json')], 270)]
for name, args, budget in commands:
    start = time.monotonic(); timeout = False; log = R / (name + '.log')
    env = os.environ.copy(); env['TRIAL_BALANCE_COMPONENT_FAILURE_DIR'] = str(R / 'mismatch-artifacts')
    with log.open('wb') as out:
        process = subprocess.Popen(args, cwd=C, env=env, stdout=out, stderr=subprocess.STDOUT, start_new_session=True)
        try: code = process.wait(timeout=budget)
        except subprocess.TimeoutExpired:
            timeout = True; os.killpg(process.pid, signal.SIGTERM)
            try: process.wait(timeout=5)
            except subprocess.TimeoutExpired: os.killpg(process.pid, signal.SIGKILL); process.wait()
            code = None
    row = {'name': name, 'argv': args, 'timeoutSeconds': budget, 'exitCode': code, 'timedOut': timeout,
           'elapsedSeconds': time.monotonic() - start, 'log': pin(log)}
    if name == 'parity' and (R / 'parity.json').exists():
        report = json.loads((R / 'parity.json').read_text())
        row.update(report=pin(R / 'parity.json'), success=report['success'], passed=report['numPassedTests'],
                   failed=report['numFailedTests'], total=report['numTotalTests'], wholeSteps=552)
    checks.append(row); print(json.dumps(row), flush=True)
    if code != 0: break
unchanged = all(pin(q['file']) == q for q in sources + oracle + inputs + frozen['artifacts'])
complete = len(checks) == 2 and all(q['exitCode'] == 0 for q in checks) and checks[-1].get('success') is True and checks[-1].get('passed') == checks[-1].get('total') == 2 and checks[-1].get('failed') == 0 and unchanged
result = {'schema': 'board-rhs-components-root-cpu-checks/v1', 'complete': complete, 'materialization': pin(R / 'materialization.json'),
          'sourceCount': 588, 'sourceInputs': sources, 'oracleInputs': oracle, 'checkInputs': inputs, 'checks': checks,
          'sourcePostUnchanged': unchanged, 'scope': 'Exact old102 own-graph, stage, ordered water and detached143-copy parity for two552-step witnesses; not native gameplay/standing/tube passage or component causation.'}
(R / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'complete': complete, 'result': pin(R / 'result.json')}), flush=True)
raise SystemExit(0 if complete else 1)
