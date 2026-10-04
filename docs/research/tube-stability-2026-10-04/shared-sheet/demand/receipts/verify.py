#!/usr/bin/env python3
"""Byte-only integrity/preservation check; never imports game or reruns numerical/native work."""
from pathlib import Path
import hashlib, json
W = Path(__file__).resolve().parent
def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
def check(p, row):
    assert p.stat().st_size == row['bytes'], str(p)
    assert sha(p) == row['sha256'], str(p)
r = json.loads((W / 'readiness.json').read_text())
for row in r['files']:
    check(W / row['path'], row)
before = json.loads((W / 'pre-validation-freeze.json').read_text())
for row in before['files']:
    check(W / 'source' / row['path'], row)
for row in before['originalInputs']:
    check(Path(row['path']), row)
original = json.loads((W / 'baseline-copy.json').read_text())
for row in original['files']:
    check(Path(row['originalPath']), row)
assert r['validation']['passed'] == 242 and r['validation']['failed'] == 0
assert r['validation']['providerQueries'] == 6447
assert r['validation']['capStencilQueries'] == 12894
assert r['validation']['libraryQueries'] == 5616
print(json.dumps({'ok': True, 'frozenCurrentInputs': len(before['files']),
                  'baselineOriginalFilesUnchanged': len(original['files']),
                  'numericOrNativeRerun': False}, indent=2))
