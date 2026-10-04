#!/usr/bin/env python3
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import sys

OUT = Path('/private/tmp/surf-sparse-upload-20261004')
CHECKS = OUT / 'checks-v2'
kind = sys.argv[1]
commands = {
    'tests': ['/Users/regina/Desktop/Projects/surfing-game/node_modules/.bin/vitest', 'run', '--config=/private/tmp/surf-sparse-upload-20261004/vitest.config.ts', '--maxWorkers=1'],
    'strict': ['/Users/regina/Desktop/Projects/surfing-game/node_modules/.bin/tsc', '-p', '/private/tmp/surf-sparse-upload-20261004/tsconfig.qa.json'],
}
if kind not in commands: raise RuntimeError('Unknown reviewed command')
if (CHECKS / (kind + '-terminal.json')).exists(): raise RuntimeError('Never repeat/overwrite a terminal operation')
def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def inputs():
    ready = json.loads((OUT / 'ready.json').read_text())
    authority = json.loads((OUT / 'source-authority.json').read_text())
    records = [{'path': str(OUT / 'ready.json'), 'sha256': sha(OUT / 'ready.json')}]
    records.extend({'path': x['path'], 'sha256': sha(Path(x['path']))} for x in ready['records'])
    for x in authority['files']:
        for arm in ['original', 'candidate']:
            path = OUT / arm / x['path']
            if path.exists(): records.append({'path': str(path), 'sha256': sha(path)})
    return records
before = inputs()
(CHECKS / (kind + '-inputs-before.json')).write_text(json.dumps(before, indent=2) + '\n')
command = commands[kind]
start = now()
with (CHECKS / (kind + '.stdout.log')).open('wb') as stdout, (CHECKS / (kind + '.stderr.log')).open('wb') as stderr:
    process = subprocess.Popen(command, cwd=OUT, stdout=stdout, stderr=stderr)
    state = {'kind': kind, 'command': command, 'cwd': str(OUT), 'startedUTC': start, 'pid': process.pid}
    (CHECKS / (kind + '-started.json')).write_text(json.dumps(state, indent=2) + '\n')
    print(json.dumps(state), flush=True)
    code = process.wait()
end = now()
after = inputs()
(CHECKS / (kind + '-inputs-after.json')).write_text(json.dumps(after, indent=2) + '\n')
terminal = {**state, 'endedUTC': end, 'exitCode': code, 'sourceInputsUnchanged': before == after,
    'stdoutSha256': sha(CHECKS / (kind + '.stdout.log')), 'stderrSha256': sha(CHECKS / (kind + '.stderr.log'))}
(CHECKS / (kind + '-terminal.json')).write_text(json.dumps(terminal, indent=2) + '\n')
print(json.dumps(terminal), flush=True)
sys.exit(code if code else 0 if before == after else 2)
