#!/usr/bin/env python3
"""Only record prepared source bytes; no tests, compiler, numerical work or runtime execution."""
import difflib
import hashlib
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
original = OUT / 'original'
candidate = OUT / 'candidate'
authority = json.loads((OUT / 'source-authority.json').read_text())
def sha(data: bytes) -> str: return hashlib.sha256(data).hexdigest()
diff = []
for item in authority['files']:
    a = original / item['path']; b = candidate / item['path']
    old = a.read_bytes() if a.exists() else b''
    new = b.read_bytes() if b.exists() else b''
    if a.exists() and sha(old) != item['originalSha256']:
        raise RuntimeError('Original source changed: ' + item['path'])
    item.update(candidateSha256=sha(new), candidateBytes=len(new), changed=old != new)
    if old != new:
        diff.extend(difflib.unified_diff(old.decode().splitlines(True), new.decode().splitlines(True),
            fromfile='a/' + item['path'] if a.exists() else '/dev/null', tofile='b/' + item['path']))
(OUT / 'candidate.patch').write_text(''.join(diff))
(OUT / 'source-authority.json').write_text(json.dumps(authority, indent=2) + '\n')
prepared = {'baseline': authority['baseline'], 'patchSha256': sha((OUT / 'candidate.patch').read_bytes()),
    'sourceAuthoritySha256': sha((OUT / 'source-authority.json').read_bytes()),
    'changed': [x['path'] for x in authority['files'] if x['changed']],
    'originalFiles': sum(x['originalSha256'] is not None for x in authority['files']), 'candidateFiles': len(authority['files']),
    'preparedFocusedTests': 15, 'executedChecks': [], 'hardwareRun': False,
    'scope': 'Isolated source prototype only; no GPU parity or speed result',
    'symlinks': [{'path': str(p), 'target': str(p.readlink())} for p in [OUT / 'node_modules',
        original / 'node_modules', original / 'public', candidate / 'node_modules', candidate / 'public']]}
(OUT / 'prepared.json').write_text(json.dumps(prepared, indent=2) + '\n')
records = []
for name in ['candidate.patch', 'source-authority.json', 'prepared.json', 'proposal.md', 'parity.test.ts',
    'memoryGpu.ts', 'vitest.config.ts', 'tsconfig.qa.json', 'prepare.py', 'freeze-prepared.py']:
    data = (OUT / name).read_bytes()
    records.append({'path': str(OUT / name), 'bytes': len(data), 'sha256': sha(data)})
ready = {'baseline': authority['baseline'], 'records': records, 'executed': False,
    'firstProposedOperation': '15 focused maxWorkers1 tests, then strict TS sequentially, only after root review and lease',
    'laterCostGate': 'Includes WeakMap marks, row/range work, full NaN eligibility scan and complete fixed-step worker work, not bytes only'}
(OUT / 'ready.json').write_text(json.dumps(ready, indent=2) + '\n')
print(json.dumps({'ready': sha((OUT / 'ready.json').read_bytes()), 'patch': prepared['patchSha256'],
    'sourceAuthority': prepared['sourceAuthoritySha256'], 'tests': records[4]['sha256'],
    'originalFiles': prepared['originalFiles'], 'changed': len(prepared['changed']), 'executed': False}))
