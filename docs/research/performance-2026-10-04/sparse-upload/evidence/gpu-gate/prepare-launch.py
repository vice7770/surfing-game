#!/usr/bin/env python3
"""Only after successful compiled review preparation; bind existing bytes, never execute the gate."""
import hashlib
import json
from pathlib import Path
work = Path(__file__).resolve().parent
sha = lambda b: hashlib.sha256(b).hexdigest()
def pin(path):
    data = path.read_bytes()
    return {'path': str(path), 'bytes': len(data), 'sha256': sha(data)}
ready_bytes = (work / 'ready.json').read_bytes()
compiled_bytes = (work / 'compiled.json').read_bytes()
compiled = json.loads(compiled_bytes)
if compiled['status'] != 'passed' or compiled['readySha256'] != sha(ready_bytes): raise RuntimeError('Exact matching compiled success required')
authority = json.loads((work.parent / 'source-authority.json').read_bytes())
inputs = [pin(work / name) for name in ['ready.json', 'compiled.json', 'device-gate.mjs', 'prepare-launch.py']]
for item in authority['files']:
    for arm in ['original', 'candidate']:
        if item[f'{arm}Sha256'] is None: continue
        record = pin(work.parent / arm / item['path'])
        if record['sha256'] != item[f'{arm}Sha256'] or record['bytes'] != item[f'{arm}Bytes']: raise RuntimeError('Arm source changed: ' + record['path'])
        inputs.append(record)
fixture = json.loads((work / 'fixture-authority.json').read_bytes())
served = [{'url': '/fixture.json.gz', **{k: fixture['source'][k] for k in ['path', 'bytes', 'sha256']}}] + fixture['cases']
inputs += fixture['sourceMetadata']
inputs.append(pin(Path('/Users/regina/Desktop/Projects/surfing-game/scripts/browser/cdp.mjs')))
result = {'schema': 'sparse-upload-owned-launch/v1', 'programReadySha256': sha(ready_bytes), 'compiledSha256': sha(compiled_bytes),
    'inputs': inputs, 'served': served, 'sourceOnlyPreparation': True, 'operationNotExecuted': True,
    'bounds': {'hardMs': 90000, 'costMs': 20000, 'ports': [4219, 9629], 'requiredClosed': 4200}}
(work / 'launch-ready.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'launchReadySha256': sha((work / 'launch-ready.json').read_bytes()), 'inputs': len(inputs), 'served': len(served), 'executed': False}))
