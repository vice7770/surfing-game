#!/usr/bin/env python3
"""Byte verification only; no geometry, tests, build, game import or native run."""
from pathlib import Path
import hashlib, json
B = Path(__file__).resolve().parent
def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
def check(p, row):
    assert p.stat().st_size == row['bytes'], str(p)
    assert sha(p) == row['sha256'], str(p)
r = json.loads((B / 'readiness.json').read_text())
for row in r['files']:
    check(B / row['path'], row)
result = json.loads((B / 'complete-sheet-result.json').read_text())
for row in result['source']:
    check(B / 'source' / row['path'], row)
for row in result['receipts']:
    check(B / row['path'], row)
original = json.loads((B / 'copy-baseline.json').read_text())
for row in original['files']:
    check(Path(row['originalPath']), row)
freeze = json.loads((B / 'complete-sheet-pre-evaluation-freeze.json').read_text())
for row in freeze['files']:
    check(B / row['file'], row)
assert result['validation']['passed'] == 238 and result['validation']['failed'] == 0
assert sum(x['attempted'] for x in result['fixedQueries'].values()) == 6447
assert all(x['failed'] == 0 for x in result['fixedQueries'].values())
print(json.dumps({'ok': True, 'frozenSourceFiles': len(result['source']),
                  'originalFilesUnchanged': len(original['files']),
                  'numericalOrNativeRerun': False}, indent=2))
