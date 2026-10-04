#!/usr/bin/env python3
"""Execute the six reviewed source checks once, sequentially; no retry or source writes."""
from pathlib import Path
import datetime
import hashlib
import json
import os
import subprocess
import time

WORK = Path('/private/tmp/contact-height-demand-fps-20261004')
CHECKS = WORK / 'checks'

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def record(path):
    raw = path.read_bytes()
    return {'path': str(path), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}

def write(path, data):
    path.write_text(json.dumps(data, indent=2) + '\n')

def inputs():
    ready = json.loads((WORK / 'ready.json').read_text())
    bindings = json.loads((WORK / 'bindings.json').read_text())
    expected = [(Path(row['path']), row) for row in ready['artifacts'] + ready['borrowedSourceAuthorities']]
    for key in ['buildReady', 'sourceManifest', 'buildTerminal', 'manifestSchema', 'publicAssets']:
        row = bindings[key]
        expected.append((Path(row['path']), row))
    source = json.loads(Path(bindings['sourceManifest']['path']).read_text())
    for arm in source['arms']:
        expected += [(Path(arm['root']) / row['path'], row) for row in arm['files']]
        row = bindings['arms'][arm['arm']]
        expected.append((Path(row['path']), row))
        built = json.loads(Path(row['path']).read_text())
        expected += [(Path(built['outputRoot']) / row['path'], row) for row in built['outputRecords']]
    assets = json.loads(Path(bindings['publicAssets']['path']).read_text())
    expected += [(Path(assets['root']) / row['path'], row) for row in assets['files']]
    rows = []
    for path, pin in expected:
        actual = record(path)
        if actual['bytes'] != pin['bytes'] or actual['sha256'] != pin['sha256']:
            raise RuntimeError(f'Frozen input mismatch: {path}')
        rows.append(actual)
    rows.append(record(WORK / 'ready.json'))
    return rows

if (CHECKS / 'terminal.json').exists() or (CHECKS / 'start.json').exists():
    raise RuntimeError('Refusing overwrite or automatic retry')
prep = json.loads((WORK / 'preparation-manifest.json').read_text())
steps = prep['proposedCheckCommands']
if len(steps) != 6 or [row['argv'][1] for row in steps[:4]] != ['--check'] * 4:
    raise RuntimeError('Approved command set changed')
before = inputs()
write(CHECKS / 'inputs-before.json', before)
state = {'schema': 'contact-height-fps-source-check-terminal/v1', 'startedAt': now(), 'stage': 'RUNNING', 'steps': [], 'firstFailure': None,
         'inputRecords': len(before), 'readyBefore': record(WORK / 'ready.json'), 'noRetry': True}
write(CHECKS / 'start.json', state)
print(json.dumps({'stage': 'START', 'steps': 6, 'startedAt': state['startedAt'], 'inputRecords': len(before)}), flush=True)
for index, step in enumerate(steps):
    log = WORK / step['log']
    if log.exists():
        raise RuntimeError('Refusing replacement of original log: ' + str(log))
    row = {'index': index + 1, 'cwd': step['cwd'], 'argv': step['argv'], 'envOverride': step.get('env', {}), 'startedAt': now()}
    clock = time.monotonic()
    with log.open('wb') as output:
        child = subprocess.Popen(step['argv'], cwd=step['cwd'], env={**os.environ, **step.get('env', {})}, stdout=output, stderr=subprocess.STDOUT)
        row['pid'] = child.pid
        print(json.dumps({'stage': 'STEP_START', **row}), flush=True)
        row['exitCode'] = child.wait()
    row['endedAt'] = now(); row['durationSeconds'] = time.monotonic() - clock; row['log'] = record(log)
    state['steps'].append(row)
    print(json.dumps({'stage': 'STEP_TERMINAL', **row}), flush=True)
    if row['exitCode'] != 0:
        state['firstFailure'] = {'index': index + 1, 'argv': step['argv'], 'log': row['log'], 'exitCode': row['exitCode']}
        break
after = inputs()
write(CHECKS / 'inputs-after.json', after)
state.update({'stage': 'TERMINAL', 'endedAt': now(), 'inputHashesUnchanged': before == after,
              'allSixPassed': len(state['steps']) == 6 and all(row['exitCode'] == 0 for row in state['steps']),
              'networkServerBrowserGpuFpsStarted': False, 'sourceEdits': False, 'productionEdits': False})
write(CHECKS / 'terminal.json', state)
print(json.dumps({'stage': 'TERMINAL', 'allSixPassed': state['allSixPassed'], 'inputHashesUnchanged': before == after, 'firstFailure': state['firstFailure'], 'endedAt': state['endedAt']}), flush=True)
raise SystemExit(0 if state['allSixPassed'] and before == after else 1)
