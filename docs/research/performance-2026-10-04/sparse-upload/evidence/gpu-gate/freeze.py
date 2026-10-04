#!/usr/bin/env python3
"""Freeze small prepared inputs only; no imports, tests, compiler or runtime calculation."""
import hashlib
import json
from pathlib import Path

work = Path(__file__).resolve().parent
parent = work.parent
sha = lambda b: hashlib.sha256(b).hexdigest()
def pin(path):
    data = path.read_bytes()
    return {'path': str(path), 'bytes': len(data), 'sha256': sha(data)}
runtime = {'baseline': '6f321d704269f9f1afc73750ab2b1f4a86f61122',
    'candidatePatchSha256': '63e8c90c5c651fa684fccbd994087b8682bb438a98e6bb8ba3c2e5b42650acbe',
    'sourceAuthoritySha256': '11f1aab08c64d7ab09a5119bf47ef53b7af73f96c2cf72f02aa1b72f8ae1ba66',
    'protocolReadySha256': '2fc3de7524760b3b7e03fea27f43fd294c24ace17317b19f85f2d53d7cfe743b'}
for name, expected in [('candidate.patch', runtime['candidatePatchSha256']), ('source-authority.json', runtime['sourceAuthoritySha256']), ('ready.json', runtime['protocolReadySha256'])]:
    if sha((parent / name).read_bytes()) != expected: raise RuntimeError('Earlier authority changed: ' + name)
inputs = [pin(work / name) for name in ['worker-entry.ts', 'page-entry.ts', 'numeric.ts', 'numeric.test.ts', 'vitest.config.ts', 'tsconfig.json',
    'index.html', 'build.mjs', 'device-gate.mjs', 'plan.md', 'fixture-authority.json', 'freeze.py', 'prepare-launch.py', 'proposal.md']]
inputs += [pin(parent / name) for name in ['candidate.patch', 'source-authority.json', 'ready.json', 'checks-v2/completion.json']]
inputs += [pin(work / name) for name in ['source-review-correction.patch', 'source-review-v1/ready.json', 'source-review-v1/worker-entry.ts', 'source-review-v1/proposal.md', 'source-review-v1/manifest.json']]
ready = {**runtime, 'schema': 'sparse-upload-real-gpu-prepared/v2', 'executed': False, 'inputs': inputs,
    'priorUnexecutedReadySha256': 'b11a330ef9ddb61f67c179d69b371a98ad71acc1846fe4c0b6ca07260bffcf92',
    'sourceReviewCorrection': 'Skip finishedDevices in terminal popErrorScope validation. One-line QA runtime change; production sparse patch unchanged.',
    'operation': 'Source review first; four pure helper tests, strict, bundle only after CPU lease; one separate bounded GPU parity/cost lease after compiled review.',
    'fixtureServedBytesMustBeCheckedBeforeChrome': True, 'runtimeFilesBoundBySourceAuthority': 295,
    'bounds': {'operationMs': 90000, 'deviceMs': 10000, 'costMs': 20000, 'fixtures': 2, 'parityStepsEach': 180, 'ordinaryParitySteps': 2, 'warmupPairedSteps': 4, 'costPairedRows': 24, 'AB': 12, 'BA': 12, 'dt': 1/60}}
(work / 'ready.json').write_text(json.dumps(ready, indent=2) + '\n')
print(json.dumps({'ready': sha((work / 'ready.json').read_bytes()), 'inputs': len(inputs), 'executed': False, 'runtimePatchUnchanged': True}))
