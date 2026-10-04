#!/usr/bin/env python3
"""Stored evidence bytes, recorded pin closure and JSON arithmetic only; no game imports/replay/build."""
import argparse, gzip, hashlib, json, math, pathlib, statistics

A = pathlib.Path(__file__).resolve().parent
sha = lambda b: hashlib.sha256(b).hexdigest()
def check(data, size, digest, label): assert len(data) == size and sha(data) == digest, label
def close(x, y, label): assert math.isclose(x, y, rel_tol=1e-10, abs_tol=1e-10), label
parser = argparse.ArgumentParser()
parser.add_argument('--originals', action='store_true', help='Additionally require original source, tools and bundles plus the dependency symlink target; read/hash only')
args = parser.parse_args()
manifest_raw = (A / 'manifest.json').read_bytes(); m = json.loads(manifest_raw)
known, decoded = {}, {}
stored_bytes = 0
for p in m['payloads']:
    packed = (A / p['storedPath']).read_bytes(); check(packed, p['storedBytes'], p['storedSha256'], p['storedPath']); stored_bytes += len(packed)
    assert p['encoding'] == 'gzip-mtime0' and packed[:3] == b'\x1f\x8b\x08' and packed[4:8] == bytes(4) and not packed[3] & 8
    data = gzip.decompress(packed); check(data, p['expandedBytes'], p['expandedSha256'], p['storedPath'] + ' expanded')
    for alias in p['originalAliases']:
        check(data, alias['bytes'], alias['sha256'], alias['path']); known[alias['path']] = (alias['bytes'], alias['sha256'])
    decoded[p['originalRelativePath']] = data
assert {str(p.relative_to(A)) for p in (A / 'evidence').rglob('*') if p.is_file()} == {p['storedPath'] for p in m['payloads']}
assert not any(p.suffix in {'.ts', '.mjs', '.js', '.py'} for p in (A / 'evidence').rglob('*'))
assert m['storedPayloadCount'] == len(m['payloads']) and m['storedPayloadBytes'] == stored_bytes
for p in m['generatedRecords']: check((A / p['path']).read_bytes(), p['bytes'], p['sha256'], p['path'])
for p in m['authorityLinks']: check((A / p['path']).read_bytes(), p['bytes'], p['sha256'], p['path'])
for p in m['reusedInputs']:
    packed = (A / p['storedPath']).read_bytes(); check(packed, p['storedBytes'], p['storedSha256'], p['storedPath'])
    assert p['aliasEncoding'] in {'identity', 'gzip-generated'}
    data = gzip.decompress(packed) if p['aliasEncoding'] == 'gzip-generated' else packed
    for alias in p['originalAliases']:
        check(data, alias['bytes'], alias['sha256'], alias['path']); known[alias['path']] = (alias['bytes'], alias['sha256'])
for p in m['identityReferences']:
    assert p['kind'] in {'committed-source-or-asset-identity', 'compiled-output-identity', 'dependency-or-repository-config-identity'}
    if p['kind'] == 'committed-source-or-asset-identity': assert p['commit'] == m['canonicalRuntimeCheckpoint']
    for alias in p['originalAliases']: known[alias['path']] = (alias['bytes'], alias['sha256'])
if args.originals:
    for path, (size, digest) in known.items(): check(pathlib.Path(path).read_bytes(), size, digest, path)
    link = m['dependencyLink']; assert pathlib.Path(link['path']).is_symlink() and str(pathlib.Path(link['path']).readlink()) == link['target'] and str(pathlib.Path(link['path']).resolve()) == link['realTarget']
closures = 0
def walk(value):
    global closures
    if isinstance(value, dict):
        if {'path', 'bytes', 'sha256'} <= value.keys() and value['path'].startswith('/') and not value.get('virtualOnly', False):
            assert known.get(value['path']) == (value['bytes'], value['sha256']), 'Unbound recorded identity: ' + value['path']; closures += 1
        for item in value.values(): walk(item)
    elif isinstance(value, list):
        for item in value: walk(item)
for name in m['closureAuthorities']: walk(json.loads(decoded[name]))
def record(version, relative): return json.loads(decoded[version + '/' + relative])
ready = {v: record(v, 'ready.json') for v in ['v1', 'v2']}
assert m['canonicalRuntimeCheckpoint'] == 'c6982456ca9f73bd19527f8032a6790f1d2b8b85'
assert m['readySha256'] == {'v1': 'b61acbe1b82904fef46e92c75ffae36ef96e94f85604a06405ef50b7f18a6b6d', 'v2': 'ffdf14abf1b455653678d77b084f1e605e77451a8ba44b98de07d829ce7e4df1'}
for version, count in [('v1', 590), ('v2', 596)]:
    assert sha(decoded[version + '/ready.json']) == m['readySha256'][version]
    assert ready[version]['canonicalRuntimeCheckpoint'] == m['canonicalRuntimeCheckpoint'] and len(ready[version]['inputs']) == count
    assert ready[version]['scope']['sourceOnly'] and not ready[version]['scope']['numericalImportsExecuted']
    compiled = record(version, 'compiled.json'); assert compiled['readySha256'] == m['readySha256'][version] and len(compiled['outputs']) == 4
assert ready['v1']['virtual'] == ready['v2']['virtual'] and ready['v2']['candidateSourceIdenticalToV1']
assert decoded['v1/patch-source.mjs'] == decoded['v2/patch-source.mjs']
for name in ['proof.ts', 'cost.ts', 'entry.ts']:
    assert decoded['v1/' + name].replace(m['scratchOriginalRoots']['v1'].encode(), b'WORK') == decoded['v2/' + name].replace(m['scratchOriginalRoots']['v2'].encode(), b'WORK'), name + ' candidate/proof unchanged'
assert ready['v2']['dependencyAuthority']['name'] == 'three' and ready['v2']['dependencyAuthority']['version'] == '0.186.1'
assert ready['v2']['dependencyLink'] == m['dependencyLink'] and m['dependencyLink']['target'] == '/Users/regina/Desktop/Projects/surfing-game/node_modules'
for version in ['v1', 'v2']:
    draft = record(version, 'source-freeze-first-failure.json')
    assert draft['exitCode'] == 1 and 'SyntaxError' in draft['error'] and not draft['readyWritten']
    assert all(draft[k] is False for k in ['numericalRuntimeImported', 'checksExecuted', 'bundlesExecuted', 'proofExecuted', 'costExecuted'])
v1 = record('v1', 'proof-first/report.json'); assert not v1['valid'] and v1['cases'] == [] and v1['strictStop'] and 'ERR_MODULE_NOT_FOUND' in v1['firstFailure'] and "package 'three'" in v1['firstFailure']
assert not any(name.startswith('v1/cost-first/') or name.startswith('v1/root-cost-first/') for name in decoded)
for version, mode, valid, code, pins in [('v1', 'checks', True, 0, 591), ('v1', 'proof', False, 1, 596), ('v2', 'checks', True, 0, 597), ('v2', 'proof', True, 0, 602), ('v2', 'cost', False, 1, 602)]:
    terminal = record(version, 'root-' + mode + '-first/terminal.json')
    assert terminal['valid'] is valid and terminal['pinsUnchanged'] and terminal['readySha256'] == m['readySha256'][version]
    assert len(record(version, 'root-' + mode + '-first/pins.json')) == pins
    assert len(terminal['commands']) == (6 if mode == 'checks' else 1) and all(c['exitCode'] == code for c in terminal['commands'])
proof = record('v2', 'proof-first/report.json'); cases = proof['cases']
assert proof['valid'] and len(cases) == 6 and proof['readySha256'] == m['readySha256']['v2']
for i, case in enumerate(cases[:3]):
    assert case['ticks'] == 8 and all(case[k] for k in ['allFiveMaterialArraysExact', 'hostWaterCrashLipSourcesListsSnapshotsAndCurrentPhysicalSamplesExact', 'encodedStateExact', 'defaultIdentitiesStable', 'originalMaterialDataDescriptors'])
    assert case['experimentalOwningPairsAlternateOnly'] is (i > 0)
assert all(cases[3][k] for k in ['allFiveExact', 'sourceAndListsExact', 'currentPhysicalSamplesExact', 'originalSharedStencilConsumedOnce'])
assert all(cases[4][k] for k in ['allFiveExact', 'owningPairsOnly'])
assert all(cases[5][k] for k in ['stateHeaderUnchanged', 'originalTkeResetRetained', 'allFiveAndCurrentPhysicalSamplesExact'])
cost = record('v2', 'cost-first/report.json'); rows = cost['rows']; stats = cost['statistics']; summary = json.loads((A / 'summary.json').read_text())
assert not cost['valid'] and cost['strictStop'] and 'Reject: no >0.1 ms' in cost['firstFailure'] and len(rows) == 32
assert cost['readySha256'] == proof['readySha256'] == m['readySha256']['v2']
savings = []
for i, row in enumerate(rows):
    assert row['pair'] == i and row['order'] == ['AB', 'BA', 'BA', 'AB'][i % 4]
    assert row['baseline']['ticks'] == row['candidate']['ticks'] == 8 and row['baseline']['substepsLastTick'] == row['candidate']['substepsLastTick'] == 1
    value = (row['baseline']['totalMs'] - row['candidate']['totalMs']) / 8; close(value, row['savingPerStepMs'], 'row saving'); savings.append(value)
computed = {'meanSavingPerStepMs': sum(savings) / 32, 'medianSavingPerStepMs': statistics.median(savings), 'minSavingPerStepMs': min(savings), 'maxSavingPerStepMs': max(savings), 'heuristicLower95Ms': sum(savings) / 32 - 1.96 * statistics.stdev(savings) / math.sqrt(32)}
for key, value in computed.items(): close(value, stats[key], 'report ' + key); close(value, summary[key], 'summary ' + key)
assert summary['positivePairs'] == stats['positivePairs'] == sum(v > 0 for v in savings) == 11
for order, stratum in zip(['AB', 'BA'], stats['orderStrata']):
    values = [row['savingPerStepMs'] for row in rows if row['order'] == order]; value = sum(values) / 16
    assert stratum['order'] == order and stratum['pairs'] == len(values) == 16
    close(value, stratum['meanSavingPerStepMs'], order + ' report'); close(value, summary['orderMeans'][order], order + ' summary')
assert summary['v2ProofCases'] == cases and summary['v1ProofCases'] == 0 and summary['decision'] == 'REJECT_NO_ADOPTION_NO_NATIVE'
assert summary['v1ProofFailure'] == v1['firstFailure']
for version, modes in [('v1', ['checks', 'proof']), ('v2', ['checks', 'proof', 'cost'])]:
    for mode in modes:
        terminal = record(version, 'root-' + mode + '-first/terminal.json')
        assert summary['outcomes'][version][mode] == {k: terminal[k] for k in ['valid', 'pinsUnchanged', 'startedAt', 'endedAt', 'elapsedSeconds']}
assert all(summary[k] is False for k in ['nativeExecuted', 'candidateAdopted', 'boardRiderTrajectoryParityClaimed', 'gpuFpsOrVisualParityClaimed'])
assert stats['thresholdMs'] == summary['thresholdMs'] == .1 and stats['thresholdPass'] is False and summary['thresholdPass'] is False
assert computed['heuristicLower95Ms'] <= .1 and all(v <= .1 for v in summary['orderMeans'].values())
assert cost['work']['warmPairs'] == 4 and cost['work']['measuredPairs'] == 32 and cost['work']['ticksPerBlock'] == 8 and cost['work']['completedTicksPerArm'] == summary['completedTicksPerArm'] == 288
assert cost['work']['cells'] == 116000 and cost['work']['components'] == 64 and cost['work']['dt'] == 1 / 60
for arm in ['baseline', 'candidate']: close(sum(r[arm]['totalMs'] for r in rows) / 256, summary[arm + 'MeanPerStepMs'], arm + ' complete per-step mean')
assert cost['inputAuthority']['captureIncomplete'] and cost['inputAuthority']['f32CommittedExport'] and proof['inputAuthority'] == cost['inputAuthority']
for version, name in [('v1', 'proof-first'), ('v2', 'proof-first'), ('v2', 'cost-first')]:
    terminal = record(version, name + '/terminal.json'); report = terminal['report']; assert known[report['path']] == (report['bytes'], report['sha256'])
if (A / 'SHA256SUMS').exists():
    entries = {}
    for line in (A / 'SHA256SUMS').read_text().splitlines():
        digest, name = line.split('  ', 1); assert name not in entries; entries[name] = digest; assert sha((A / name).read_bytes()) == digest, name
    assert set(entries) == {str(p.relative_to(A)) for p in A.rglob('*') if p.is_file() and p.name != 'SHA256SUMS'}
print(json.dumps({'valid': True, 'manifestSha256': sha(manifest_raw), 'storedPayloads': len(m['payloads']), 'storedPayloadBytes': stored_bytes, 'borrowedInputs': len(m['reusedInputs']), 'identityReferences': len(m['identityReferences']), 'closureChecks': closures, 'proofCasesChecked': 6, 'costRowsChecked': 32, 'originalPathsChecked': len(known) if args.originals else 0, 'numericalExperimentReexecuted': False}, indent=2))
