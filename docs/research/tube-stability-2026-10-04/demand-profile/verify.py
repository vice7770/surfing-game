#!/usr/bin/env python3
"""Read-only archive and recorded-result verification; never execute model/game/test/build code."""
from pathlib import Path
import argparse
import gzip
import hashlib
import json
import re


def digest(raw):
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def apply_patch(old, lines):
    """Apply already-recorded unified diff to memory, validating every context/deleted line."""
    result = []
    cursor = 0
    i = 0
    while i < len(lines):
        match = re.fullmatch(r'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@.*\n?', lines[i])
        assert match, 'invalid hunk header'
        start = max(0, int(match[1]) - 1)
        old_count = int(match[2]) if match[2] is not None else 1
        new_count = int(match[4]) if match[4] is not None else 1
        assert start >= cursor
        result.extend(old[cursor:start])
        cursor = start
        consumed = emitted = 0
        i += 1
        while i < len(lines) and not lines[i].startswith('@@ '):
            line = lines[i]
            assert line and line[0] in ' +-'
            if line[0] in ' -':
                assert cursor < len(old) and old[cursor] == line[1:], 'patch context mismatch'
                cursor += 1
                consumed += 1
            if line[0] in ' +':
                result.append(line[1:])
                emitted += 1
            i += 1
        assert (consumed, emitted) == (old_count, new_count), 'hunk count mismatch'
    result.extend(old[cursor:])
    return ''.join(result).encode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--original-scratch', action='store_true')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    manifest = json.loads((root / 'manifest.json').read_text())
    entries = {r['path']: r for r in manifest['files']}
    checks = {'payloads': 0, 'gzipPayloads': 0, 'priorReferences': 0,
              'originalPayloads': 0, 'originalBaselineSource': 0,
              'originalBuildSourcePins': 0, 'originalBuildAssets': 0,
              'patchFilesReconstructed': 0}

    def decoded(path):
        entry = entries[path]
        transport = (root / path).read_bytes()
        assert digest(transport) == entry['transport'], 'transport drift: ' + path
        raw = gzip.decompress(transport) if entry['encoding'] == 'gzip' else transport
        assert digest(raw) == entry['decoded'], 'decoded drift: ' + path
        return raw

    for entry in entries.values():
        raw = decoded(entry['path'])
        checks['payloads'] += 1
        checks['gzipPayloads'] += entry['encoding'] == 'gzip'
        if args.original_scratch and entry.get('originalPath'):
            assert digest(Path(entry['originalPath']).read_bytes()) == digest(raw), 'original drift: ' + entry['originalPath']
            checks['originalPayloads'] += 1

    refs = json.loads(decoded('input-references.json'))
    referenced = {}
    for entry in refs['priorArchive']:
        path = entry['archiveRelative']
        transport = (root / path).read_bytes()
        assert digest(transport) == entry['transport'], 'reference transport drift: ' + path
        raw = gzip.decompress(transport) if entry['encoding'] == 'gzip' else transport
        assert digest(raw) == entry['decoded'], 'reference decoded drift: ' + path
        referenced[path] = raw
        checks['priorReferences'] += 1
        if args.original_scratch and entry.get('originalPath'):
            assert digest(Path(entry['originalPath']).read_bytes()) == digest(raw)
            checks['originalPayloads'] += 1

    # Verify the large raw-input authority by its existing references; do not duplicate or evaluate it.
    prior_manifest = json.loads(referenced['../bounded-c-profile/manifest.json'])
    prior_refs = json.loads(referenced['../bounded-c-profile/input-references.json'])
    for entry in prior_refs['priorArchivedInputsAndHelpers']:
        transport = (root / '../bounded-c-profile' / entry['archiveRelative']).read_bytes()
        assert digest(transport) == entry['transport']
        raw = gzip.decompress(transport) if entry['encoding'] == 'gzip' else transport
        assert digest(raw) == entry['decoded']
        checks['priorReferences'] += 1
    assert prior_manifest['sourceAdopted'] is False

    # Reconstruct only JSON fixture serialization from the stored report; no geometry calculations/imports.
    report = json.loads(referenced[refs['derivedCompactFixtureNotDuplicated']['fromArchive']])
    compact = {key: [{k: row[k] for k in keys} for row in report[key]]
               for key, keys in [('actual', ['params', 'rawPolyline', 'afterPolyline']),
                                 ('phaseGrid', ['case', 'params']),
                                 ('crossCaseGridAll', ['cases', 'share', 'params'])]}
    compact_bytes = (json.dumps(compact, separators=(',', ':'), allow_nan=False) + '\n').encode()
    compact_receipt = refs['derivedCompactFixtureNotDuplicated']
    assert digest(compact_bytes) == {k: compact_receipt[k] for k in ['bytes', 'sha256']}
    assert len(compact['actual']) == 5 and len(compact['phaseGrid']) == 376 and len(compact['crossCaseGridAll']) == 672
    if args.original_scratch:
        assert Path(compact_receipt['originalPath']).read_bytes() == compact_bytes
        raw_case = refs['originalCaseDumpNotDuplicated']
        assert digest(Path(raw_case['originalPath']).read_bytes()) == {k: raw_case[k] for k in ['bytes', 'sha256']}
        checks['originalPayloads'] += 2

    readiness = json.loads(decoded('validation/readiness.json'))
    assert readiness['sourceReady'] and readiness['frozenAfterValidation']
    assert readiness['fullNumericalSamplerBodyByteIdentical']
    assert not readiness['shapeCoefficientsChanged'] and not readiness['precisionGateChanged'] and not readiness['cacheRewrite']
    assert readiness['noFurtherSourceWrites']
    for path, record in readiness['changed'].items():
        before = referenced['../bounded-c-profile/source/final/' + path]
        after = decoded('source/final/' + path)
        assert digest(before)['sha256'] == record['before']
        assert digest(after)['sha256'] == record['after']
    for path, sha in readiness['new'].items():
        assert digest(decoded('source/final/' + path))['sha256'] == sha

    # Confirm the complete recorded patch reconstructs exactly the three preserved files in memory.
    patch_lines = decoded('patches/demand-profile.patch').decode().splitlines(keepends=True)
    groups = []
    for line in patch_lines:
        if line.startswith('--- a/'):
            groups.append({'before': line.removeprefix('--- a/').strip(), 'lines': []})
        elif line.startswith('+++ b/'):
            assert groups and 'after' not in groups[-1]
            groups[-1]['after'] = line.removeprefix('+++ b/').strip()
        else:
            assert groups and 'after' in groups[-1]
            groups[-1]['lines'].append(line)
    assert {g['after'] for g in groups} == set(readiness['ownershipOnly'])
    for group in groups:
        assert group['before'] == group['after']
        before = referenced.get('../bounded-c-profile/source/final/' + group['before'], b'')
        reconstructed = apply_patch(before.decode().splitlines(keepends=True), group['lines'])
        assert reconstructed == decoded('source/final/' + group['after'])
        checks['patchFilesReconstructed'] += 1
    original_provider = referenced['../bounded-c-profile/source/final/src/wave/barrel/boundedCProfile.ts'].decode()
    new_provider = decoded('source/final/src/wave/barrel/boundedCProfile.ts').decode()
    assert original_provider.split('export function sampleBoundedC(', 1)[1] == new_provider.split('export function sampleBoundedC(', 1)[1]
    new_helpers = new_provider.split('/** Exact event arithmetic only:', 1)[0]
    new_helpers = re.sub(r'^export interface BoundedCLifecycle .*\n', '', new_helpers, flags=re.M)
    assert new_helpers == original_provider.split('/** Writes only owned33..111.', 1)[0]

    provider = json.loads(decoded('validation/provider-equivalence.json'))
    assert provider['counts'] == {'captured': 5, 'frames': 1224, 'adjacent': 3648, 'phase': 376, 'crossCase': 672, 'precision': 522}
    assert sum(provider['counts'].values()) == provider['total'] == 6447
    assert provider['capStencilQueries'] == 12894 and provider['capStencilsExact']
    assert provider['fullContourExact'] and provider['capExact'] and provider['clocksExact']
    library = json.loads(decoded('validation/library-equivalence.json'))
    assert library['queries'] == 4914 and library['fullLookupIncludingVelocityExact'] and library['contourExact'] and library['clocksExact']
    blended = json.loads(decoded('validation/library-blend-precision-equivalence.json'))
    assert (blended['blended'], blended['precisionQueries']) == (180, 522)
    assert blended['fullLookupAndF32ContourExact'] and blended['clockExact']
    costs = json.loads(decoded('validation/cpu-cost-evidence.json'))
    expected = {'cold-clock': (128, 0, 0, 32), 'warm-clock': (0, 0, 0, 0),
                'cold-profile': (128, 32, 64, 32), 'warm-clock-profile': (96, 32, 64, 0)}
    for row in costs['results']:
        counts = row['counts']
        assert row['rows'] == 32
        assert tuple(counts[k] for k in ['oldFullContours', 'newFullContours', 'newCapOnlyStencils', 'newLifecycleQueries']) == expected[row['scenario']]
        assert row['oldMilliseconds'] >= 0 and row['newMilliseconds'] >= 0
    warm = next(r for r in costs['results'] if r['scenario'] == 'warm-clock')
    assert warm['oldMilliseconds'] < warm['newMilliseconds'], 'retain faster baseline warm-clock result'
    assert not costs['geometryApproximation'] and not costs['cacheRewrite']
    assert '1 failed | 237 passed (238)' in decoded('validation/focused-final.log').decode()
    assert decoded('validation/strict-tsc-final-source.log') == b''
    assert readiness['focusedTests']['strictTSExit'] == 0
    canonical = referenced['../bounded-c-profile/consumers/history/tube-bounded-c-final-mesh-canonical-receipt-20261004.json.gz']
    failure = decoded('validation/consumer-known-failure-final.json.gz')
    assert failure == canonical
    f = json.loads(failure)
    assert len(f['failures']) == 1 and f['checkedAir'] == 75710
    assert f['failures'][0]['case'] == 'periodic-reef42-l12' and f['failures'][0]['penetration'] == 0.0003114571531508403
    assert decoded('history/library-blend-precision-equivalence-before-newline.json').endswith(b'\\n')
    history = json.loads(decoded('history/harness-history.json'))
    assert len(history['failures']) == 4 and not history['geometryOrAssertionTuning']
    assert history['failures'][0]['originalStdoutLogFile'] is None

    build = json.loads(decoded('build/build-result.json.gz'))
    assert build['terminal'] and build['exitCode'] == 0 and build['sourceUnchangedAfterBuild']
    assert len(build['sourcePins']) == 604 and len(build['assetPins']) == 49
    assert not build['productionAdopted'] and not build['nativeObserved']
    assert build['readiness'] == {'file': readiness['source'].rsplit('/source', 1)[0] + '/readiness.json', **digest(decoded('validation/readiness.json'))}
    for path in readiness['ownershipOnly']:
        record = next(r for r in build['sourcePins'] if r['file'] == build['source'] + '/' + path)
        assert digest(decoded('source/final/' + path)) == {k: record[k] for k in ['bytes', 'sha256']}
    evidence = json.loads(decoded('build/evidence.json'))
    assert evidence['rootToolSession'] == 97665 and evidence['terminalExitCode'] == 0
    assert not evidence['productionAdopted'] and not evidence['nativeObserved'] and not evidence['FPSBodyOrShapeAdoptionClaim']
    if args.original_scratch:
        baseline = json.loads(decoded('source/baseline-source-pins.json.gz'))
        assert len(baseline['files']) == 559
        for name, sha in baseline['files'].items():
            assert digest((Path(baseline['source']) / name).read_bytes())['sha256'] == sha, 'baseline source drift: ' + name
            checks['originalBaselineSource'] += 1
        for key, count_key in [('sourcePins', 'originalBuildSourcePins'), ('assetPins', 'originalBuildAssets')]:
            for record in build[key]:
                assert digest(Path(record['file']).read_bytes()) == {k: record[k] for k in ['bytes', 'sha256']}, 'build pin drift: ' + record['file']
                checks[count_key] += 1
    assert not manifest['sourceAdopted'] and not manifest['nativeFPSBodyOrShapeProof']
    actual = {str(p.relative_to(root)) for p in root.rglob('*') if p.is_file()}
    assert actual == set(entries) | {'manifest.json', 'verification.json'} or actual == set(entries) | {'manifest.json'}
    print(json.dumps({'verified': True, 'mode': 'original-scratch' if args.original_scratch else 'portable',
                      'checks': checks, 'manifest': digest((root / 'manifest.json').read_bytes()),
                      'recordedTests': '237 passed / 1 byte-identical known Reef failure',
                      'rootBuild': 'terminal exit0; 604 source/input pins and49 output assets',
                      'geometryOrTestOrBuildOrNativeRerun': False,
                      'nativeFPSBodyShapeOrAdoptionClaim': False}, indent=2))


if __name__ == '__main__':
    main()
