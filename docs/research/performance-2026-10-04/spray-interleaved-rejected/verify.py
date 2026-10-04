from pathlib import Path
from hashlib import sha256
import argparse
import gzip
import json
import math
import subprocess

BASE = Path(__file__).resolve().parent
REPO = BASE.parents[3]

def digest(raw):
    return sha256(raw).hexdigest()

def walk(value):
    if isinstance(value, dict):
        if all(k in value for k in ('path', 'bytes', 'sha256')):
            yield {k: value[k] for k in ('path', 'bytes', 'sha256')}
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)

def stats(values):
    ordered = sorted(values)
    n = len(ordered)
    return {'n': n, 'median': (ordered[n // 2 - 1] + ordered[n // 2]) / 2 if n % 2 == 0 else ordered[n // 2],
            'mean': sum(values) / n, 'p95': ordered[math.ceil(n * .95) - 1],
            'min': ordered[0], 'max': ordered[-1]}

def close(a, b):
    assert math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-15), (a, b)

parser = argparse.ArgumentParser(description='Hash frozen records and derive existing report statistics; executes no game, test, benchmark or native renderer.')
parser.add_argument('--external', action='store_true', help='Also hash exact committed canonical Git blobs and adjacent frozen archive references.')
parser.add_argument('--output', type=Path)
args = parser.parse_args()
manifest_raw = (BASE / 'manifest.json').read_bytes()
m = json.loads(manifest_raw)
assert m['schema'] == 'spray-interleaved-rejected-archive/v1'
aliases = {}
content = {}
for entry in m['payloads']:
    stored = (BASE / entry['storedPath']).read_bytes()
    assert len(stored) == entry['storedBytes'] and digest(stored) == entry['storedSha256']
    raw = gzip.decompress(stored) if entry['encoding'].startswith('gzip') else stored
    assert len(raw) == entry['expandedBytes'] and digest(raw) == entry['expandedSha256']
    for pin in entry['originalAliases']:
        key = (pin['path'], pin['bytes'], pin['sha256'])
        assert pin['bytes'] == len(raw) and pin['sha256'] == digest(raw)
        aliases[key] = entry
        content[key] = raw
for entry in m['generatedRecords']:
    raw = (BASE / entry['path']).read_bytes()
    assert len(raw) == entry['bytes'] and digest(raw) == entry['sha256']
external = {(e['originalPath'], e['bytes'], e['sha256']): e for e in m['externalReferences']}
assert len(external) == len(m['externalReferences'])
closure_pins = 0
for authority in m['closureAuthorities']:
    identity = (authority['path'], authority['bytes'], authority['sha256'])
    assert identity in content, authority
    for pin in walk(json.loads(content[identity])):
        key = (pin['path'], pin['bytes'], pin['sha256'])
        assert key in aliases or key in external, ('Unresolved pin', pin)
        closure_pins += 1

verified_external = 0
if args.external:
    git_entries = [e for e in external.values() if e['verification']['kind'] == 'git']
    if git_entries:
        queries = [e['verification']['commit'] + ':' + e['verification']['relativePath'] for e in git_entries]
        completed = subprocess.run(['git', '-C', str(REPO), 'cat-file', '--batch'],
                                   input=('\n'.join(queries) + '\n').encode(), capture_output=True, check=True)
        raw = completed.stdout
        offset = 0
        for entry in git_entries:
            end = raw.index(b'\n', offset)
            header = raw[offset:end].split()
            assert len(header) == 3 and header[1] == b'blob'
            size = int(header[2]); start = end + 1
            data = raw[start:start + size]
            assert len(data) == entry['bytes'] and digest(data) == entry['sha256']
            assert raw[start + size:start + size + 1] == b'\n'
            offset = start + size + 1
            verified_external += 1
        assert offset == len(raw)
    for entry in external.values():
        v = entry['verification']
        if v['kind'] == 'archive':
            raw = (REPO / v['repositoryRelativePath']).read_bytes()
            assert len(raw) == v['storedBytes'] and digest(raw) == v['storedSha256']
            expanded = gzip.decompress(raw) if v['encoding'].startswith('gzip') else raw
            assert len(expanded) == entry['bytes'] and digest(expanded) == entry['sha256']
            verified_external += 1
        else:
            assert v['kind'] == 'git'

def original(relative, sha=None):
    path = '/private/tmp/surf-spray-interleaved-20261004/' + relative
    matches = [raw for (p, _, s), raw in content.items() if p == path and (sha is None or sha == s)]
    assert len(matches) == 1, relative
    return matches[0]

ready0 = json.loads(original('source-v0/ready.json'))
ready1_raw = original('ready.json', '8b69b0c0c565ad7b9508bf34277d7757f249bb45d8d065e87f3bd718a87b81b1')
ready1 = json.loads(ready1_raw)
assert not ready0['executed'] and not ready1['executed']
assert not ready0['ordinaryCountKnown'] and not ready1['ordinaryCountKnown']
assert digest(original('source-v0/ready.json')) == 'b6704c3b1b9a3e62f3ffa52bbca9c233ff83f6e2b1f701d59715aa8fd362b892'
assert digest(ready1_raw) == '8b69b0c0c565ad7b9508bf34277d7757f249bb45d8d065e87f3bd718a87b81b1'
old_cost = original('source-v0/cost.ts')
new_cost = original('cost.ts', '95acfc7af84813e84b1a7fa20e0dafe1cefeb547d620bec3d1142003b9a7ef77')
old_line = b'  const rows = [];'
new_line = b'  const rows: Array<{ block: number; order: string; baselineMs: number; candidateMs: number; savingMs: number }> = [];'
assert old_cost.count(old_line) == 1 and new_cost.count(new_line) == 1
assert new_cost.replace(new_line, old_line) == old_cost
for relative in ['candidate/src/scene/SprayPoints.ts', 'qa/candidate.ts', 'qa/baseline.ts', 'test-helpers.ts']:
    assert original(relative) == original('source-v0/' + relative)
assert original('interleaved.test.ts') == original('source-v0/interleaved.test.ts.txt')
failed = json.loads(original('root-cpu/terminal.json'))
passed = json.loads(original('root-cpu-v1/terminal.json'))
cost_terminal = json.loads(original('root-cost-first/terminal.json'))
assert not failed['valid'] and failed['beforePins'] == 104 and len(failed['commands']) == 1
assert failed['commands'][0]['code'] == 2
assert original('root-cpu/terminal.json') == original('source-v0/root-cpu/terminal.json')
assert passed['valid'] and passed['beforePins'] == passed['afterPins'] == 125
assert [c['code'] for c in passed['commands']] == [0, 0, 0]
tests = json.loads(original('checks/vitest.json'))
assert tests['success'] and tests['numTotalTests'] == tests['numPassedTests'] == 9
assert tests['numFailedTests'] == 0
assert cost_terminal['valid'] and cost_terminal['code'] == 0
assert cost_terminal['beforePins'] == cost_terminal['afterPins'] == 126
assert cost_terminal['wholeProcessBoundSeconds'] == 20 and cost_terminal['pid'] == 41352
report_raw = original('cost-first.json')
assert len(report_raw) == 174272 and digest(report_raw) == '5bc66bc5f10336e11b9237db33957268cef8eaf6b8bfa818477e5ef8506c8048'
report = json.loads(report_raw)
assert report['valid'] and report['measuredPairs'] == 768 and len(report['results']) == 8
assert report['readySha256'] == digest(ready1_raw)
assert report['plan']['ordinaryPublishedParticleCount'] is None
assert report['plan']['warmPairsPerCondition'] == 12 and report['plan']['measuredABBABlocksPerCondition'] == 24
assert report['plan']['repetitions'] == 1 and report['elapsedMs'] < 20000
derived = []
for case in report['results']:
    rows = case['rows']
    assert len(rows) == 96
    assert [r['block'] for r in rows] == [b for b in range(24) for _ in range(4)]
    assert [r['order'] for r in rows] == ['AB', 'BA', 'BA', 'AB'] * 24
    for row in rows:
        close(row['savingMs'], row['baselineMs'] - row['candidateMs'])
    for name, field in [('baseline', 'baselineMs'), ('candidate', 'candidateMs'), ('pairedSaving', 'savingMs')]:
        computed = stats([r[field] for r in rows])
        for key, value in computed.items(): close(value, case[name][key])
    assert case['positivePairs'] == sum(r['savingMs'] > 0 for r in rows)
    for strata in case['orderStrata']:
        computed = stats([r['savingMs'] for r in rows if r['order'] == strata['order']])
        for key, value in computed.items(): close(value, strata['pairedSaving'][key])
    assert all(case[k] for k in ['allActiveAndInactiveOutputWordsExact', 'sourceImmutable', 'ownedBuffersPersistent', 'shaderBytesExact'])
    assert case['unchangedActiveUploadBytes'] == case['actualDrawnCount'] * 24
    assert case['pairedSaving']['median'] < .1
    derived.append({'count': case['syntheticSourceCount'], 'look': case['look'], 'pairedMedianSavingMs': case['pairedSaving']['median'], 'positivePairs': case['positivePairs']})
assert {(c['syntheticSourceCount'], c['look']) for c in report['results']} == {(n, look) for n in [64, 512, 4096, 5120] for look in ['rich', 'classic']}
summary = json.loads((BASE / 'results-summary.json').read_text())
assert summary['decision'] == 'REJECT_USEFULNESS' and not summary['adopted']
assert summary['conditions'] == [{k: v for k, v in c.items() if k != 'rows'} for c in report['results']]
assert summary['nativePixelGate'] == summary['fpsGate'] == 'NOT_RUN'
observed = json.loads((BASE / 'observed-count-supplement.json').read_text())
assert not observed['sourceCaptureValid'] and len(observed['frames']) == 3
assert all(f['drawnStatusSpray'] == 4096 for f in observed['frames'])
if args.external:
    ref = external[(observed['sourceReport']['path'], observed['sourceReport']['bytes'], observed['sourceReport']['sha256'])]
    native = json.loads(gzip.decompress((REPO / ref['verification']['repositoryRelativePath']).read_bytes()))
    assert not native['valid'] and len(native['capture']['frames']) == 3
    assert observed['frames'] == [{'index': f['index'], 'seaTime': f['seaTime'], 'surfaceRevision': f['surfaceRevision'], 'drawnStatusSpray': f['status']['spray']} for f in native['capture']['frames']]

result = {'schema': 'spray-interleaved-rejected-archive-verification/v1', 'valid': True,
          'manifestSha256': digest(manifest_raw), 'uniquePayloadsVerified': len(m['payloads']),
          'originalAliasesVerified': len(aliases), 'closurePinsResolved': closure_pins,
          'externalReferences': len(external), 'externalIdentitiesVerified': verified_external,
          'strictFirstFailPreserved': True, 'typeOnlyRepairVerified': True, 'portableTestsPassed': 9,
          'costConditionsDerived': 8, 'measuredPairsVerified': 768,
          'derived': derived, 'decision': 'REJECT_USEFULNESS',
          'scope': 'Archive hash/alias/closure and existing report arithmetic only; no game, module, test, benchmark, simulation or native execution.'}
raw = json.dumps(result, indent=2) + '\n'
if args.output:
    assert args.output.resolve().parent == BASE and not args.output.exists()
    args.output.write_text(raw)
print(raw)
