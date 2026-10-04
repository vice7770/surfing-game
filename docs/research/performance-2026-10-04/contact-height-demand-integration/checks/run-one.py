#!/usr/bin/env python3
"""Execute one explicitly authorized verification phase; never retry or edit source."""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import time

WORK = Path('/private/tmp/contact-height-demand-integration-20261004')
CHECKS = WORK / 'checks'
COMMANDS = {
    'strict': ['./node_modules/.bin/tsc', '-p', 'tsconfig.integration.json', '--pretty', 'false'],
    'tests': ['./node_modules/.bin/vitest', 'run', '--config', 'vitest.integration.config.ts', '--maxWorkers=1'],
}

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def write(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')

def record(path):
    raw = path.read_bytes()
    return {'path': str(path), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}

def input_rows():
    source = json.loads((WORK / 'source-manifest.json').read_text())
    ready = json.loads((WORK / 'ready.json').read_text())
    prep = json.loads((WORK / 'preparation-manifest.json').read_text())
    pairs = [(WORK / row['path'], row['final']) for row in source['sourceFiles']]
    pairs += [(WORK / row['path'], row) for row in source['baselineConfig']]
    pairs += [(WORK / row['path'], row) for row in source['caseInputs']]
    pairs += [(Path(row['path']), row) for row in source['installedPackages']]
    pairs += [(Path(row['path']), row) for row in ready['artifacts']]
    pairs += [(Path(row['path']), row) for row in prep['reviewedInputAuthorities']]
    rows = []
    for path, expected in pairs:
        actual = record(path)
        if actual['bytes'] != expected['bytes'] or actual['sha256'] != expected['sha256']:
            raise RuntimeError(f'Frozen input mismatch: {path}')
        rows.append(actual)
    rows.append(record(WORK / 'ready.json'))
    return rows

phase = sys.argv[1]
if phase not in COMMANDS:
    raise RuntimeError('Unknown phase')
terminal = CHECKS / f'{phase}-terminal.json'
if terminal.exists() or (CHECKS / f'{phase}.log').exists():
    raise RuntimeError('Refusing automatic retry or replacement of original evidence')
if phase == 'tests':
    strict = json.loads((CHECKS / 'strict-terminal.json').read_text())
    if strict['exitCode'] != 0 or strict['inputHashesUnchanged'] is not True:
        raise RuntimeError('Tests require successful strict and unchanged inputs')
before = input_rows()
write(CHECKS / f'{phase}-inputs-before.json', before)
started = now()
clock = time.monotonic()
command = COMMANDS[phase]
with (CHECKS / f'{phase}.log').open('wb') as output:
    child = subprocess.Popen(command, cwd=WORK, stdout=output, stderr=subprocess.STDOUT)
    state = {'phase': phase, 'command': command, 'cwd': str(WORK), 'startedAt': started, 'pid': child.pid, 'stage': 'RUNNING'}
    write(CHECKS / f'{phase}-start.json', state)
    print(json.dumps(state), flush=True)
    code = child.wait()
ended = now()
after = input_rows()
write(CHECKS / f'{phase}-inputs-after.json', after)
state.update({'stage': 'TERMINAL', 'endedAt': ended, 'exitCode': code, 'durationSeconds': time.monotonic() - clock,
              'inputHashesUnchanged': before == after, 'inputRecordCount': len(before),
              'log': record(CHECKS / f'{phase}.log')})
if (CHECKS / 'integration-tests.json').exists():
    state['testJsonReport'] = record(CHECKS / 'integration-tests.json')
write(terminal, state)
print(json.dumps(state), flush=True)
sys.exit(code if code != 0 else (0 if before == after else 1))
