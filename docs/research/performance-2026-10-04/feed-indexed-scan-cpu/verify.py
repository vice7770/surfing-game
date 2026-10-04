#!/usr/bin/env python3
"""Verify archive bytes and stored-row arithmetic. Never import or run game code."""
import gzip, hashlib, json, math, statistics, sys
from pathlib import Path

A = Path(__file__).resolve().parent
sha = lambda b: hashlib.sha256(b).hexdigest()

def check(b, n, h, label):
    assert len(b) == n and sha(b) == h, label

def expanded(record):
    b = (A / record['storedPath']).read_bytes()
    check(b, record['storedBytes'], record['storedSha256'], record['storedPath'])
    if record['encoding'] == 'identity':
        return b
    assert record['encoding'] == 'gzip-mtime0'
    assert b[4:8] == bytes(4), 'gzip timestamp'
    raw = gzip.decompress(b)
    check(raw, record['expandedBytes'], record['expandedSha256'], record['storedPath'] + ' expanded')
    return raw

assert len(sys.argv) == 1, 'Byte/arithmetic verification only'
manifest_raw = (A / 'manifest.json').read_bytes()
m = json.loads(manifest_raw)
known, original = {}, {}
for record in m['payloads'] + m['reusedPayloads']:
    b = expanded(record)
    for alias in record['originalAliases']:
        check(b, alias['bytes'], alias['sha256'], alias['path'])
        known[alias['path']] = (alias['bytes'], alias['sha256'])
        original[alias['path']] = b
expected = {r['storedPath'] for r in m['payloads']}
assert {str(p.relative_to(A)) for p in (A / 'evidence').rglob('*') if p.is_file()} == expected
assert not any(p.suffix in {'.js', '.mjs', '.ts', '.py'} for p in (A / 'evidence').rglob('*'))
for record in m['generatedRecords']:
    check((A / record['path']).read_bytes(), record['bytes'], record['sha256'], record['path'])

# Reuse the parent's hash-bound source/input/baseline identities without copying its closure.
parent_record = m['parentArchiveManifest']
parent_raw = (A / parent_record['path']).read_bytes()
check(parent_raw, parent_record['bytes'], parent_record['sha256'], parent_record['path'])
parent = json.loads(parent_raw)
assert parent['canonicalRuntimeCommit'] == m['canonicalRuntimeCommit']
capture = None
for reference, parent_reference in zip(m['reusedInputByteReferences'], parent['reusedInputs']):
    assert reference == parent_reference, 'Unchanged parent capture alias'
    b = (A / reference['storedPath']).read_bytes()
    check(b, reference['storedBytes'], reference['storedSha256'], reference['storedPath'])
    if reference['encoding'] == 'gzip-generated-mtime0':
        assert b[4:8] == bytes(4)
        raw = gzip.decompress(b)
        check(raw, reference['expandedBytes'], reference['expandedSha256'], 'capture report expanded')
        capture = json.loads(raw)
    else:
        assert reference['encoding'] == 'deflate-original'
        # Hash the existing transport bytes only; do not decode or replay its numerical arrays.
assert len(m['reusedInputByteReferences']) == 2 and capture is not None
for record in parent['payloads']:
    for alias in record['originalAliases']:
        known[alias['path']] = (alias['bytes'], alias['sha256'])
for record in parent['gitReferences']:
    known[record['originalPath']] = (record['bytes'], record['sha256'])
for record in parent['externalIdentityReferences']:
    known[record['path']] = (record['bytes'], record['sha256'])
for record in parent['reusedInputs']:
    for alias in record['originalAliases']:
        known[alias['path']] = (alias['bytes'], alias['sha256'])
for record in m['compiledIdentityReferences']:
    known[record['path']] = (record['bytes'], record['sha256'])
assert len(m['compiledIdentityReferences']) == 3

closure = 0
def walk(value):
    global closure
    if isinstance(value, dict):
        if isinstance(value.get('path'), str) and value['path'].startswith('/') and isinstance(value.get('bytes'), int) and isinstance(value.get('sha256'), str):
            assert known.get(value['path']) == (value['bytes'], value['sha256']), 'Unbound recorded input: ' + value['path']
            closure += 1
        for v in value.values():
            walk(v)
    elif isinstance(value, list):
        for v in value:
            walk(v)
for name in m['closureAuthorities']:
    walk(json.loads(original[name]))

def record(relative):
    return json.loads(original[m['scratchOriginalRoot'] + '/' + relative])

ready = record('ready.json')
assert sha(original[m['scratchOriginalRoot'] + '/ready.json']) == m['readySha256'] == 'dff888a1445e61edf7c96af1148a67c48b07cbde62bcb3b7c5d7c613e6d40d4d'
assert ready['sourceCheckpoint'] == m['canonicalRuntimeCommit'] == 'b0e003b8670c9d0be83bc9bb24c30b5382a54499'
assert len(ready['inputs']) == 66 and ready['priorComponentCacheUnadoptedAndExcluded']
assert ready['sourceOnly'] and ready['noChecksExecuted'] and ready['noNumericalRunExecuted']
compiled = record('compiled.json')
assert compiled['readySha256'] == m['readySha256']
assert compiled['outputs'] == m['compiledIdentityReferences']
assert compiled['reusedBaseline'] == ready['baseline']
assert ready['candidateSource']['sha256'] == 'ac2b896d945ebdaf8b0530bd3ed515a7701d16c078991d93ca3a5870b3687dd2'
assert ready['candidateSource']['baseline']['sha256'] == 'ebdfb6924197f5ae59ed0f56bff1121622bf687fd28d0985b9fd2f26980efabd'
for name, count, commands in [('root-checks', 67, 6), ('root-proof-first', 71, 1), ('root-cost-first', 73, 1)]:
    terminal = record(name + '/terminal.json')
    assert terminal['valid'] and terminal['pinsUnchanged'] and terminal['readySha256'] == m['readySha256']
    assert terminal['pins'] == len(record(name + '/pins.json')) == count
    assert len(terminal['commands']) == commands and all(c['exitCode'] == 0 for c in terminal['commands'])
    assert terminal['elapsedSeconds'] < terminal['outerTimeoutSeconds']
    assert terminal['outerTimeoutSeconds'] == (30 if name == 'root-checks' else 20)
proof, cost = record('proof-first/report.json'), record('cost-first/report.json')
assert proof['valid'] and cost['valid'] and cost['localCpuOnly']
assert proof['readySha256'] == cost['readySha256'] == m['readySha256']
assert len(proof['cases']) == 10
for case in proof['cases']:
    assert all(case[k] is True for k in ['queueBytesOrderAndLengthExact', 'allDeviceBuffersAndNineDestinationsExact', 'identitiesClocksCflAndPlungeExact'])
for name in ['proof-first', 'cost-first']:
    terminal = record(name + '/terminal.json')
    assert terminal['valid'] and terminal['inputPinsUnchanged'] and terminal['readySha256'] == m['readySha256']
    assert known[terminal['report']['path']] == (terminal['report']['bytes'], terminal['report']['sha256'])

rows = cost['rows']
assert len(rows) == 32 and [r['pair'] for r in rows] == list(range(32))
assert [r['order'] for r in rows] == ['AB', 'BA', 'BA', 'AB'] * 8
assert all(r['substeps'] == r['baselineDiagnostics']['substeps'] == r['candidateDiagnostics']['substeps'] == 1 for r in rows)
savings = [r['baselineMs'] - r['candidateMs'] for r in rows]
assert all(x == r['savingMs'] and x > 0 for x, r in zip(savings, rows))
mean = sum(savings) / 32
median = statistics.median(savings)
lower = mean - 1.96 * math.sqrt(sum((x - mean) ** 2 for x in savings) / 31 / 32)
orders = [{'order': o, 'pairs': 16, 'meanSavingMs': sum(r['savingMs'] for r in rows if r['order'] == o) / 16} for o in ['AB', 'BA']]
near = lambda a, b: math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
for key, value in [('meanSavingMs', mean), ('medianSavingMs', median), ('pairedMeanLower95Ms', lower)]:
    assert near(value, cost['statistics'][key]), key
for a, b in zip(orders, cost['statistics']['orderStrata']):
    assert a['order'] == b['order'] and b['pairs'] == 16 and near(a['meanSavingMs'], b['meanSavingMs'])
assert cost['statistics']['thresholdPass'] and lower > cost['statistics']['thresholdMs'] == .1
assert all(x['meanSavingMs'] > .1 for x in orders)
summary = json.loads((A / 'summary.json').read_text())
actual = {'meanSavingMs': mean, 'medianSavingMs': median, 'heuristicLower95Ms': lower, 'minSavingMs': min(savings), 'maxSavingMs': max(savings), 'firstHalfMeanMs': sum(savings[:16]) / 16, 'lastHalfMeanMs': sum(savings[16:]) / 16}
for k, v in actual.items():
    assert near(v, summary['recomputed'][k]), k
assert summary['recomputed']['positivePairs'] == 32 and summary['recomputed']['orderStrata'] == orders
for arm in ['baseline', 'candidate']:
    assert near(sum(r[arm + 'Ms'] for r in rows) / 32, summary['recomputed'][arm + 'MeanMs'])
for stage in ['pack', 'cfl', 'encode', 'map', 'unpack']:
    assert near(sum(r['baselineDiagnostics'][stage] - r['candidateDiagnostics'][stage] for r in rows) / 32, summary['recomputed']['meanStageSavingMs'][stage])
authority = cost['inputAuthority']
assert authority['captureIncomplete'] and authority['f32CommittedExport'] and proof['actualHeld']['noWgslExecution']
for k in ['captureSha256', 'compressedSha256', 'rawSha256', 'pausedSeaTime', 'solverTime', 'seaTimeOffset']:
    assert authority[k] == proof['actualHeld'][k]
assert authority['solverTime'] + authority['seaTimeOffset'] == authority['pausedSeaTime'] == 328.04104655763683
assert capture['valid'] is False and len(capture['capture']['frames']) == 3
assert capture['export']['snapshotUnchanged'] and capture['export']['outstandingSteps'] == 0
assert capture['export']['pausedSeaTime'] == authority['pausedSeaTime']
assert cost['work']['cells'] == 116000 and cost['work']['components'] == 64
assert cost['work']['completedStepCallsPerArm'] == 40 and cost['work']['readbackFields'] == 9
assert cost['work']['candidateRetainsEveryDynamicWeightsScan'] and cost['work']['indexedLoopOnly']
assert cost['elapsedMs'] < 15000
assert summary['claims'] == {'sourceAndCpuOnly': True, 'native': False, 'fps': False, 'adopted': False}
print(json.dumps({'schema': 'feed-indexed-archive-byte-arithmetic-verification/v1', 'pass': True,
 'manifestSha256': sha(manifest_raw), 'storedPayloads': len(m['payloads']), 'reusedPayloads': len(m['reusedPayloads']),
 'originalAliases': sum(len(r['originalAliases']) for r in m['payloads'] + m['reusedPayloads']),
 'storedPayloadBytes': sum(r['storedBytes'] for r in m['payloads']), 'parentDeclaredIdentities': len(known),
 'closureReferenceChecks': closure, 'newCompiledIdentityReferences': 3, 'proofCases': 10, 'pairs': 32, 'positivePairs': 32,
 'reusedCaptureByteReferencesChecked': 2,
 'meanSavingMs': mean, 'medianSavingMs': median, 'heuristicLower95Ms': lower, 'orderStrata': orders,
 'scope': 'Archived bytes, parent hash-bound input identity declarations, recorded gate outcomes and stored-row arithmetic only. No imports, replay, build, benchmark, native, FPS or current external bundle/tool hashing.'}, indent=2))
