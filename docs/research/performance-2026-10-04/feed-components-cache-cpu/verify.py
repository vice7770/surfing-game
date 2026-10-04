#!/usr/bin/env python3
"""Archive bytes and stored-row arithmetic only; no game imports or replay."""
import argparse, gzip, hashlib, json, math, statistics, struct, subprocess, zlib
from pathlib import Path

A = Path(__file__).resolve().parent
REPO = A.parents[3]
sha = lambda b: hashlib.sha256(b).hexdigest()

def check(b, n, h, label):
    assert len(b) == n, f'{label}: byte length differs'
    assert sha(b) == h, f'{label}: SHA256 differs'

def bounded_deflate(b, cap):
    decoder = zlib.decompressobj()
    raw = decoder.decompress(b, cap + 1)
    assert len(raw) <= cap and not decoder.unconsumed_tail and decoder.eof
    assert not decoder.unused_data
    return raw

p = argparse.ArgumentParser()
p.add_argument('--originals', action='store_true')
args = p.parse_args()
manifest_raw = (A / 'manifest.json').read_bytes()
m = json.loads(manifest_raw)
known, originals = {}, {}
stored_bytes = 0
for r in m['payloads']:
    b = (A / r['storedPath']).read_bytes()
    check(b, r['storedBytes'], r['storedSha256'], r['storedPath'])
    assert r['encoding'] == 'identity'
    stored_bytes += len(b)
    for alias in r['originalAliases']:
        check(b, alias['bytes'], alias['sha256'], alias['path'])
        key = (alias['bytes'], alias['sha256'])
        known[alias['path']] = key
        originals[alias['path']] = b
for r in m['generatedRecords']:
    check((A / r['path']).read_bytes(), r['bytes'], r['sha256'], r['path'])
expected = {r['storedPath'] for r in m['payloads']}
assert {str(p.relative_to(A)) for p in (A / 'evidence').rglob('*') if p.is_file()} == expected
assert not any(p.suffix in {'.mjs', '.js', '.ts', '.py'} for p in (A / 'evidence').rglob('*'))

for r in m['reusedInputs']:
    b = (A / r['storedPath']).read_bytes()
    check(b, r['storedBytes'], r['storedSha256'], r['storedPath'])
    if r['encoding'] == 'gzip-generated-mtime0':
        assert struct.unpack_from('<I', b, 4)[0] == 0
        alias_bytes = gzip.decompress(b)
        check(alias_bytes, r['expandedBytes'], r['expandedSha256'], 'capture expanded')
    else:
        assert r['encoding'] == 'deflate-original'
        alias_bytes = b
        raw = bounded_deflate(b, m['decodedExportCapBytes'])
        check(raw, r['expandedBytes'], r['expandedSha256'], 'SET1 expanded')
    for alias in r['originalAliases']:
        check(alias_bytes, alias['bytes'], alias['sha256'], alias['path'])
        known[alias['path']] = (alias['bytes'], alias['sha256'])
        originals[alias['path']] = alias_bytes

# Read the committed blobs, never the current working-tree runtime.
proc = subprocess.Popen(['git', 'cat-file', '--batch'], cwd=REPO,
                        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
try:
    for r in m['gitReferences']:
        expr = r['commit'] + ':' + r['relativePath']
        proc.stdin.write((expr + '\n').encode())
        proc.stdin.flush()
        header = proc.stdout.readline().rstrip(b'\n').split()
        assert len(header) == 3 and header[1] == b'blob', expr
        assert header[0].decode() == r['blob'], expr + ': Git blob differs'
        b = proc.stdout.read(int(header[2]))
        assert proc.stdout.read(1) == b'\n'
        check(b, r['bytes'], r['sha256'], expr)
        known[r['originalPath']] = (r['bytes'], r['sha256'])
    proc.stdin.close()
    assert proc.wait() == 0
finally:
    if proc.poll() is None:
        proc.kill()
        proc.wait()
for r in m['externalIdentityReferences']:
    known[r['path']] = (r['bytes'], r['sha256'])
closure = 0
def walk(value):
    global closure
    if isinstance(value, dict):
        if isinstance(value.get('path'), str) and value['path'].startswith('/') and isinstance(value.get('bytes'), int) and isinstance(value.get('sha256'), str):
            assert known.get(value['path']) == (value['bytes'], value['sha256']), value['path'] + ': unbound identity'
            closure += 1
        for item in value.values():
            walk(item)
    elif isinstance(value, list):
        for item in value:
            walk(item)
for name in m['closureAuthorities']:
    walk(json.loads(originals[name]))

def original_json(relative):
    return json.loads(originals[m['scratchOriginalRoot'] + '/' + relative])
ready = original_json('ready.json')
ready_raw = originals[m['scratchOriginalRoot'] + '/ready.json']
assert sha(ready_raw) == m['readySha256'] == 'a090e34a3addf2502d8df652228a90aa96d35ab10229222d704e111279e32519'
assert ready['sourceCheckpoint'] == m['canonicalRuntimeCommit']
assert len(ready['inputs']) == 61
compiled = original_json('compiled.json')
assert compiled['readySha256'] == sha(ready_raw) and len(compiled['outputs']) == 4
assert compiled['outputs'] == [{k:r[k] for k in ['path','bytes','sha256']} for r in m['externalIdentityReferences'] if r.get('kind') == 'compiled-output']
proof = original_json('proof-first/report.json')
cost = original_json('cost-first/report.json')
assert proof['valid'] and cost['valid'] and cost['localCpuOnly']
assert proof['readySha256'] == cost['readySha256'] == sha(ready_raw)
assert len(proof['cases']) == 9
for row in proof['cases']:
    assert all(row[k] is True for k in ['queueBytesOrderAndLengthExact','allDeviceBuffersAndNineDestinationsExact','identitiesClocksCflAndPlungeExact'])
for name, count in [('root-checks',62),('root-proof-first',67),('root-cost-first',69)]:
    terminal = original_json(name + '/terminal.json')
    pins = original_json(name + '/pins.json')
    assert terminal['pins'] == len(pins) == count and terminal['pinsUnchanged']
    if name == 'root-checks':
        assert terminal['valid'] and len(terminal['commands']) == 6
        assert all(c['exitCode'] == 0 for c in terminal['commands'])
    else:
        assert terminal['exitCode'] == 0 and terminal['outerTimeoutSeconds'] == 20

rows = cost['rows']
assert len(rows) == 32
assert [r['pair'] for r in rows] == list(range(32))
assert [r['order'] for r in rows] == ['AB','BA','BA','AB'] * 8
assert all(r['substeps'] == r['baselineDiagnostics']['substeps'] == r['candidateDiagnostics']['substeps'] == 1 for r in rows)
savings = [r['baselineMs'] - r['candidateMs'] for r in rows]
assert all(a == r['savingMs'] and a > 0 for a, r in zip(savings, rows))
mean = sum(savings) / 32
median = statistics.median(savings)
lower = mean - 1.96 * math.sqrt(sum((x-mean)**2 for x in savings) / 31 / 32)
order_rows = [{'order':o,'pairs':16,'meanSavingMs':sum(r['savingMs'] for r in rows if r['order']==o)/16} for o in ['AB','BA']]
def near(a, b):
    assert math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12), (a, b)
stats = cost['statistics']
for key, value in [('meanSavingMs',mean),('medianSavingMs',median),('pairedMeanLower95Ms',lower)]:
    near(value, stats[key])
for actual, stated in zip(order_rows, stats['orderStrata']):
    assert actual['order'] == stated['order'] and stated['pairs'] == 16
    near(actual['meanSavingMs'], stated['meanSavingMs'])
assert stats['thresholdPass'] and lower > stats['thresholdMs'] == .1
assert all(s['meanSavingMs'] > .1 for s in order_rows)
summary = json.loads((A / 'summary.json').read_text())
for k,v in [('meanSavingMs',mean),('medianSavingMs',median),('heuristicLower95Ms',lower),('minSavingMs',min(savings)),('maxSavingMs',max(savings))]:
    near(v, summary['recomputed'][k])
assert summary['recomputed']['positivePairs'] == 32 and summary['recomputed']['orderStrata'] == order_rows
for arm in ['baseline','candidate']:
    near(sum(r[arm+'Ms'] for r in rows)/32, summary['recomputed'][arm+'MeanMs'])
for stage in ['pack','cfl','encode','map','unpack']:
    near(sum(r['baselineDiagnostics'][stage]-r['candidateDiagnostics'][stage] for r in rows)/32, summary['recomputed']['meanStageSavingMs'][stage])
inputs = original_json('inputs.json')
assert len(inputs['canonicalRuntimeClosure']) == 39
assert len([r for r in m['gitReferences'] if r['kind'] == 'canonical-runtime']) == 39
assert inputs['heldMetadata']['ratehNuOmittedConstructorDefaultsPreserved']
assert inputs['heldMetadata']['originalFiveDrawCaptureValid'] is False
assert inputs['heldMetadata']['committedExportAtDistinctPausedClock']
authority = cost['inputAuthority']
for key in ['captureSha256','compressedSha256','rawSha256','pausedSeaTime','solverTime','seaTimeOffset']:
    assert authority[key] == proof['actualHeld'][key]
capture = json.loads(originals[inputs['capture']['path']])
assert capture['valid'] is False and len(capture['capture']['frames']) == 3
export = capture['export']
assert export['snapshotUnchanged'] and export['outstandingSteps'] == 0
assert export['pausedSeaTime'] == inputs['heldMetadata']['pausedSeaTime'] == authority['pausedSeaTime']
assert inputs['heldMetadata']['solverTime'] + inputs['heldMetadata']['seaTimeOffset'] == authority['pausedSeaTime']
assert cost['work']['completedStepCallsPerArm'] == 40
assert summary['claims'] == {'sourceAndCpuOnly':True,'native':False,'fps':False,'adopted':False}

original_checks = 0
if args.originals:
    for path,(n,h) in known.items():
        check(Path(path).read_bytes(), n, h, path)
        original_checks += 1
print(json.dumps({'schema':'feed-components-archive-byte-arithmetic-verification/v1','pass':True,
 'manifestSha256':sha(manifest_raw),'storedPayloads':len(m['payloads']),'storedPayloadBytes':stored_bytes,
 'runtimeGitBlobs':39,'packageGitBlobs':sum(r['kind']=='package-input' for r in m['gitReferences']),
 'typeInputGitBlobs':sum(r['kind']=='type-input' for r in m['gitReferences']),'reusedInputs':len(m['reusedInputs']),
 'compiledOutputIdentities':4,'externalIdentities':len(m['externalIdentityReferences']),
 'closureReferenceChecks':closure,'proofCases':9,'pairs':32,'positivePairs':32,
 'meanSavingMs':mean,'medianSavingMs':median,'heuristicLower95Ms':lower,'orderStrata':order_rows,
 'originalsRequested':args.originals,'originalFilesChecked':original_checks,
 'scope':'Bytes, Git blobs, record outcomes and stored-row arithmetic only; no game imports, experiments, numerical replay or FPS.'},indent=2))
