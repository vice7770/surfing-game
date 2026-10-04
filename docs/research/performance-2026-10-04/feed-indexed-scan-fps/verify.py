#!/usr/bin/env python3
"""Draft byte/record arithmetic verifier; never imports or executes game code."""
import argparse, gzip, hashlib, json, math
from pathlib import Path

A = Path(__file__).resolve().parent
sha = lambda b: hashlib.sha256(b).hexdigest()
def check(b, n, digest, label):
    assert len(b) == n and sha(b) == digest, label + ': byte identity differs'
def decoded(record):
    b = (A / record['storedPath']).read_bytes()
    check(b, record['storedBytes'], record['storedSha256'], record['storedPath'])
    if record['encoding'] == 'identity':
        raw = b
    else:
        assert record['encoding'].startswith('gzip') and b[4:8] == bytes(4)
        raw = gzip.decompress(b)
    check(raw, record['expandedBytes'], record['expandedSha256'], record['storedPath'] + ' expanded')
    return raw

parser = argparse.ArgumentParser()
parser.add_argument('--originals', action='store_true')
args = parser.parse_args()
manifest_raw = (A / 'manifest.json').read_bytes()
m = json.loads(manifest_raw)
assert m['canonicalRuntimeCommit'] == 'b0e003b8670c9d0be83bc9bb24c30b5382a54499'
known, originals, parents = {}, {}, {}
def add(pin):
    p = pin['path']
    value = (pin['bytes'], pin['sha256'])
    assert p not in known or known[p] == value, p
    known[p] = value

for row in m['parentArchives']:
    b = (A / row['storedPath']).read_bytes()
    check(b, row['bytes'], row['sha256'], row['storedPath'])
    parent = json.loads(b)
    assert parent['canonicalRuntimeCommit'] == m['canonicalRuntimeCommit']
    parents[row['name']] = parent
    for group in ['payloads', 'reusedInputs', 'reusedPayloads']:
        for payload in parent.get(group, []):
            for alias in payload.get('originalAliases', []):
                add(alias)
    for pin in parent.get('gitReferences', []):
        if 'originalPath' in pin:
            add({**pin, 'path': pin['originalPath']})
        for alias in pin.get('originalAliases', []):
            add(alias)
    for group in ['externalIdentityReferences', 'compiledIdentityReferences']:
        for pin in parent.get(group, []):
            add(pin)

for row in m['payloads'] + m['reusedInputs']:
    raw = decoded(row)
    for alias in row['originalAliases']:
        check(raw, alias['bytes'], alias['sha256'], alias['path'])
        add(alias)
        originals[alias['path']] = raw
    if 'parentArchive' in row:
        parent = parents[row['parentArchive']]
        matches = [p for key in ['payloads','reusedInputs','reusedPayloads'] for p in parent.get(key,[]) if p['storedPath'] == row['parentStoredPath']]
        assert len(matches) == 1
        p = matches[0]
        assert (p['storedBytes'],p['storedSha256'],p['encoding']) == (row['storedBytes'],row['storedSha256'],row['encoding'])
for row in m['externalIdentityReferences']:
    add(row)
for row in m['generatedRecords']:
    check((A / row['path']).read_bytes(), row['bytes'], row['sha256'], row['path'])
assert {str(p.relative_to(A)) for p in (A / 'evidence').rglob('*') if p.is_file()} == {r['storedPath'] for r in m['payloads']}
assert not any(p.suffix in {'.ts', '.js', '.mjs', '.py'} for p in (A / 'evidence').rglob('*'))

closure = 0
def walk(value):
    global closure
    if isinstance(value, dict):
        if isinstance(value.get('path'), str) and value['path'].startswith('/') and isinstance(value.get('bytes'), int) and isinstance(value.get('sha256'), str):
            assert known.get(value['path']) == (value['bytes'], value['sha256']), 'Unbound recorded identity: ' + value['path']
            closure += 1
        for child in value.values():
            walk(child)
    elif isinstance(value, list):
        for child in value:
            walk(child)
for name in m['closureAuthorities']:
    walk(json.loads(originals[name]))
def original(relative):
    return json.loads(originals[m['scratchOriginalRoot'] + '/' + relative])

ready, bindings = original('ready.json'), original('bindings.json')
source, build, checks = original('source-manifest.json'), original('build-terminal.json'), original('checks/terminal.json')
strict = original('strict-terminal.json')
assert ready['runtimeBaseline'] == source['baseline'] == build['runtimeBaseline'] == m['canonicalRuntimeCommit']
assert sha(originals[m['scratchOriginalRoot'] + '/ready.json']) == bindings['buildReady']['sha256'] == build['readySha256']
assert sha(originals[m['scratchOriginalRoot'] + '/source-manifest.json']) == bindings['sourceManifest']['sha256'] == build['sourceManifestSha256']
assert sha(originals[m['scratchOriginalRoot'] + '/build-terminal.json']) == bindings['buildTerminal']['sha256']
assert not bindings['pending'] and build['status'] == 'passed' and strict['valid']
assert strict['sourceBefore'] == strict['sourceAfter'] and build['sourceBefore'] == build['sourceAfter']
assert checks['status'] == 'passed' and checks['sourceUnchanged'] and checks['sourcePinCount'] == 668 and checks['linkCount'] == 0
assert len(checks['commands']) == 8 and all(c['exitCode'] == 0 for c in checks['commands'])
assert original('checks/source-before.json') == original('checks/source-after.json')
assert source['arms'][0]['files'] == source['arms'][1]['files'] and all(a['fileCount'] == len(a['files']) == 554 for a in source['arms'])
for pin in source['arms'][0]['files']:
    assert known[source['arms'][0]['root'] + '/' + pin['path']] == (pin['bytes'],pin['sha256'])
target = source['onlyRuntimeDifference']
assert target['relativePath'] == 'src/wave/SideFeed.ts' and target['editCount'] == 1 and target['componentCacheExcluded']
assert target['virtualCandidate'] == {'bytes': 10085, 'sha256': 'ac2b896d945ebdaf8b0530bd3ed515a7701d16c078991d93ca3a5870b3687dd2'}
assert target['canonicalGpuUnchanged']['sha256'] == '41e212604f0d7b889445edb17a05f38edf5044f66dceaa9eddaee4ebf69d8094'
for arm in ['baseline', 'candidate']:
    bm = original(arm + '/build-manifest.json')
    assert bm['status'] == 'passed' and bm['buildId'] == '306258296' and bm['runtimeBaseline'] == m['canonicalRuntimeCommit']
    assert len(bm['outputRecords']) == 11 and bm['literalSourceFiles'] == 554
    assert not bm['publicAssetCopies'] and not bm['taskPublicAssetCopies']
    assert bm['readySha256'] == build['readySha256'] and bm['sourceManifest'] == bindings['sourceManifest']
    if arm == 'baseline':
        assert bm['reusedCanonicalCompilation']
    else:
        assert bm['workerPluginFactory'] and not bm['reusedCanonicalCompilation']
        loads = bm['sourceTransform']['loads']
        assert loads and any(p['realm'] == 'worker' for p in loads)
        assert all(p['canonicalPath'] == target['path'] and p['virtualSha256'] == target['virtualCandidate']['sha256'] for p in loads)
    for pin in bm['outputRecords']:
        assert known[bm['outputRoot'] + '/' + pin['path']] == (pin['bytes'], pin['sha256'])

summary = json.loads((A / 'summary.json').read_text())
assert summary['decision'] in ['HOLD', 'PROVISIONAL_ADOPT']
assert summary['nativeOrderComparisonPooled'] is False and summary['quantilesPooled'] is False
assert summary['temperatureOrMechanismCausalClaim'] is False and summary['sustained60PhysicsClaim'] is False
assert summary['decision'] == 'HOLD' and not summary['adopted'] and not summary['canonicalRuntimeChanged'] and not summary['productionChecksClaimed']
reversed_ready, reversed_checks = original('reversed-ready.json'), original('reversed-checks/terminal.json')
assert reversed_checks['valid'] and len(reversed_checks['commands']) == 2 and all(c['exitCode'] == 0 for c in reversed_checks['commands'])
assert reversed_ready['parentReady'] == bindings['buildReady']
assert reversed_ready['parentBindings']['sha256'] == sha(originals[m['scratchOriginalRoot'] + '/bindings.json'])
assert reversed_ready['armOrder'] == ['candidate','baseline'] and reversed_ready['nativePorts'] == [4245,9655,4246,9656]
assert original('root-run-reversed/report.json')['reversedReady']['sha256'] == sha(originals[m['scratchOriginalRoot'] + '/reversed-ready.json'])
for path, ports in [('independent-closure.json',[4243,9653,4244,9654,4200]), ('independent-reversed-closure.json',[4245,9655,4246,9656,4200])]:
    closure_record = original(path)
    assert closure_record['valid'] and closure_record['rows'] == [{'port':p,'closed':True,'reason':'ECONNREFUSED'} for p in ports]
pair_count, arm_count = 0, 0
for label, root, order in [('AB', 'root-run', ['baseline', 'candidate']), ('BA', 'root-run-reversed', ['candidate', 'baseline'])]:
    report = original(root + '/report.json')
    assert report['valid'] and not report['incomplete'] and [r['arm'] for r in report['arms']] == order
    assert report['arms'][0]['endedAt'] <= report['arms'][1]['startedAt']
    assert summary['pairs'][label]['order'] == order
    assert summary['pairs'][label]['startedAt'] == report['startedAt'] and summary['pairs'][label]['endedAt'] == report['endedAt']
    for row in report['arms']:
        arm = row['arm']
        bm = original(arm + '/build-manifest.json')
        fps = original(root + '/' + arm + '/fps.json')
        audit = original(root + '/' + arm + '/native-audit.json')
        launcher = original(root + '/' + arm + '/launcher.json')
        assert row['valid'] and row['terminal']['code'] == 0 and row['authorityUnchangedAfter']
        assert row['manifest'] == bindings['arms'][arm] and row['compiledServed'] == bm['outputRecords']
        assert fps['valid'] and fps['commit'] == m['canonicalRuntimeCommit'] and str(fps['build']) == '306258296'
        artifact = fps['artifact']
        assert artifact['root'] == bm['outputRoot'] and artifact['entry'] == bm['clientEntry'] and artifact['worker'] == bm['surfZoneWorker']
        assert artifact['files'] == artifact['verified'] and len(artifact['files']) == 10
        assert {p['file']:p['sha256'] for p in artifact['files']} == {p['path']:p['sha256'] for p in bm['outputRecords'] if p['path'] != 'build.json'}
        assert fps['gpuTiming'] == 'disabled (passive counters)' and fps['rideSeconds'] == 90 and len(fps['results']) == 1
        r = fps['results'][0]
        assert r['ordinaryConfigMatches'] and r['baselineComparable'] and not r['comparisonFailures']
        assert r['config'] == report['plan']['expectedConfig'] and r['canvas'] == '2989 × 1538'
        observed = r['observed']
        assert observed['viewport'] == '1708 × 879' and observed['browserDpr'] == 2 and observed['renderPixelRatio'] == 1.75
        assert observed['maxBatchSteps'] == 1 and observed['compute'] == 'gpu' and observed['renderSpacing'] == 2 and not observed['vertexNormals']
        assert audit == fps['nativeAudit'] and audit['valid'] and not audit['workerRngOverride'] and not audit['resizeOverrides']
        for v in audit['observations']:
            actual = v['actual']
            assert actual['inner'] == [1708,879] and actual['dpr'] == 2 and actual['canvas'] == [2989,1538] and actual['resizeEvents'] == 0
            if v['phase'] in ['sample-start', 'sample-end']:
                worker = actual['actualWorker']
                assert actual['cells'] == 116000 and actual['maxBatchSteps'] == 1 and actual['maskSpacing'] == 1
                assert worker['badAdvances'] == 0 and not worker['interventions'] and worker['lastSteps'] == 1
                assert worker['url'].endswith('/' + bm['surfZoneWorker']) and worker['starts'][0]['soloOneStep']['value'] is True
        assert launcher['initialRequest']['size'] == [1708,966] and launcher['ownedChromeClosed'] and not launcher['resizeOverrides']
        assert launcher['portProof'] == {'closed': True, 'reason': 'ECONNREFUSED'}
        for key in ['serverClosure','cdpClosure','port4200','port4200End']:
            assert row[key] == {'closed': True, 'reason': 'ECONNREFUSED'}
        timeline = r['simulationTimeline']
        assert sum(t['snapshots'] for t in timeline) == r['publicationEvents'] == r['freshSnapshots']
        for t in [r] + timeline:
            assert t['duplicatePublicationEvents'] == t['backwardsPublicationEvents'] == t['nonIntegralPhysicsStepDeltas'] == 0
            assert t['advancingPublications'] == max(0, t['freshSnapshots'] - 1)
            assert t['physicsStepDeltaDistribution'] == ({'1': t['advancingPublications']} if t['advancingPublications'] else {})
            assert abs(t['physicsAdvanceSeconds'] - t['advancingPublications']/60) < .000001
            assert t['fixedPhysicsStepSeconds'] == 1/60
        arm_summary = summary['pairs'][label]['arms'][arm]
        assert arm_summary['reported'] == {k: r[k] for k in arm_summary['reported']}
        assert arm_summary['lastComplete88sBin'] == next(t for t in timeline if t['from'] == 88)
        arm_count += 1
    pair_count += 1
assert pair_count == 2 and arm_count == 4
for pair in summary['pairs'].values():
    assert pair['candidateMinusBaselineFreshHz'] == round(pair['arms']['candidate']['reported']['freshSnapshotsPerSecond'] - pair['arms']['baseline']['reported']['freshSnapshotsPerSecond'],2)
for arm in ['baseline','candidate']:
    assert summary['descriptiveEqualWeightMeanOfRoundedFreshHz'][arm] == round(sum(summary['pairs'][p]['arms'][arm]['reported']['freshSnapshotsPerSecond'] for p in ['AB','BA'])/2,2)
assert summary['descriptiveAverageIsNotPooledRateOrConfidence'] is True
checked = 0
if args.originals:
    for pin in m['originalVerificationReferences']:
        check(Path(pin.get('verifyPath', pin['path'])).read_bytes(), pin['bytes'], pin['sha256'], pin['path'])
        checked += 1
print(json.dumps({'schema': 'feed-indexed-native-archive-byte-arithmetic-verification/v1', 'pass': True,
                  'manifestSha256': sha(manifest_raw), 'storedPayloads': len(m['payloads']),
                  'reusedPayloads': len(m['reusedInputs']), 'closureReferenceChecks': closure,
                  'completedNativePairs': pair_count, 'completedNativeArms': arm_count,
                  'decision': summary['decision'], 'originalsRequested': args.originals, 'originalFilesChecked': checked,
                  'scope': 'Bytes, declared identities, recorded guards and available count/summary arithmetic only; no quantile reconstruction, game import/execution, physics replay, network or FPS rerun.'}, indent=2))
