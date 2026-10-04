#!/usr/bin/env python3
"""One requested reviewed check; preserve command, inputs, logs and terminal without retry."""
import datetime
import hashlib
import json
import subprocess
import sys
from pathlib import Path

work = Path(__file__).resolve().parent.parent
checks = work / 'checks'
phase = sys.argv[1]
commands = {
    'tests': ['/Users/regina/Desktop/Projects/surfing-game/node_modules/.bin/vitest', 'run', '--config=/private/tmp/surf-sparse-upload-20261004/gpu-gate/vitest.config.ts', '--maxWorkers=1'],
    'strict': ['/Users/regina/Desktop/Projects/surfing-game/node_modules/.bin/tsc', '-p', '/private/tmp/surf-sparse-upload-20261004/gpu-gate/tsconfig.json'],
    'bundle': ['node', '/private/tmp/surf-sparse-upload-20261004/gpu-gate/build.mjs'],
    'prepare-launch': ['python3', '/private/tmp/surf-sparse-upload-20261004/gpu-gate/prepare-launch.py'],
    'launcher-syntax': ['node', '--check', '/private/tmp/surf-sparse-upload-20261004/gpu-gate/device-gate.mjs'],
    'launcher-dry': ['node', '/private/tmp/surf-sparse-upload-20261004/gpu-gate/device-gate.mjs'],
}
command = commands[phase]
def utc(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
sha = lambda b: hashlib.sha256(b).hexdigest()
ready = work / 'ready.json'
expected = 'bd36df908c340104d1bdd9469a42fdc2195bbce7f083acba634d790eed720829'
if sha(ready.read_bytes()) != expected: raise RuntimeError('Reviewed readiness changed')
paths = [ready] + [Path(x['path']) for x in json.loads(ready.read_bytes())['inputs']]
authority = json.loads((work.parent / 'source-authority.json').read_bytes())
for item in authority['files']:
    for arm in ['original', 'candidate']:
        if item[f'{arm}Sha256'] is not None: paths.append(work.parent / arm / item['path'])
def capture(label):
    records = []
    for path in paths:
        data = path.read_bytes()
        records.append({'path': str(path), 'bytes': len(data), 'sha256': sha(data)})
    (checks / f'{phase}-inputs-{label}.json').write_text(json.dumps(records, indent=2) + '\n')
    return records
for suffix in ['stdout.log', 'stderr.log', 'started.json', 'terminal.json', 'inputs-before.json', 'inputs-after.json']:
    if (checks / f'{phase}-{suffix}').exists(): raise RuntimeError('Refuse to overwrite check evidence: ' + phase)
before = capture('before')
started = {'phase': phase, 'command': command, 'cwd': str(work), 'startedUtc': utc(), 'readySha256': expected}
with (checks / f'{phase}-stdout.log').open('wb') as stdout, (checks / f'{phase}-stderr.log').open('wb') as stderr:
    proc = subprocess.Popen(command, cwd=work, stdout=stdout, stderr=stderr)
    started['pid'] = proc.pid
    (checks / f'{phase}-started.json').write_text(json.dumps(started, indent=2) + '\n')
    print(json.dumps(started), flush=True)
    code = proc.wait()
after = capture('after')
terminal = {**started, 'endedUtc': utc(), 'exitCode': code, 'sourceInputsUnchanged': before == after,
    'stdout': {'path': str(checks / f'{phase}-stdout.log'), 'bytes': (checks / f'{phase}-stdout.log').stat().st_size, 'sha256': sha((checks / f'{phase}-stdout.log').read_bytes())},
    'stderr': {'path': str(checks / f'{phase}-stderr.log'), 'bytes': (checks / f'{phase}-stderr.log').stat().st_size, 'sha256': sha((checks / f'{phase}-stderr.log').read_bytes())}}
(checks / f'{phase}-terminal.json').write_text(json.dumps(terminal, indent=2) + '\n')
print(json.dumps(terminal), flush=True)
sys.exit(code if code else 0 if before == after else 2)
