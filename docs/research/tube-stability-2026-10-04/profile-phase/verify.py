#!/usr/bin/env python3
"""Verify the immutable archive and its result ledgers, without rerunning numerical code."""
from pathlib import Path
import argparse
import gzip
import hashlib
import json
import math


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def exact(raw, count, digest, label):
    if len(raw) != count or sha(raw) != digest:
        raise ValueError('Byte/hash mismatch: ' + label)


def need(value, label):
    if not value:
        raise ValueError(label)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--external', action='store_true', help='Also check any explicitly retained external references; this archive has none.')
    args = parser.parse_args()
    base = Path(__file__).resolve().parent
    manifest_raw = (base / 'manifest.json').read_bytes()
    manifest = json.loads(manifest_raw)
    raw_by_stored = {}
    by_original = {}
    for row in manifest['records']:
        path = base / row['storedPath']
        need(path.resolve().is_relative_to(base), 'Archive path escapes directory')
        need(not path.name.endswith('.test.ts'), 'Live test filename')
        stored = path.read_bytes()
        exact(stored, row['storedBytes'], row['storedSha256'], row['storedPath'])
        if row['storage'] == 'gzip-mtime0':
            need(stored[:3] == b'\x1f\x8b\x08' and stored[3] == 0 and stored[4:8] == b'\0\0\0\0', 'Non-deterministic gzip header')
            raw = gzip.decompress(stored)
        elif row['storage'] == 'raw':
            raw = stored
        else:
            raise ValueError('Unknown storage type')
        exact(raw, row['expandedBytes'], row['expandedSha256'], row['storedPath'] + ' expanded')
        raw_by_stored[row['storedPath']] = raw
        for alias in row['originalAliases']:
            exact(raw, alias['bytes'], alias['sha256'], alias['path'])
            need(alias['path'] not in by_original, 'Duplicate original alias')
            by_original[alias['path']] = raw
    for row in manifest['generatedFiles']:
        exact((base / row['path']).read_bytes(), row['bytes'], row['sha256'], row['path'])
    ready_archive = json.loads((base / 'ready.json').read_bytes())
    need(ready_archive['manifestSha256'] == sha(manifest_raw), 'Archive ready manifest pin')
    need(ready_archive['storedPayloads'] == len(manifest['records']), 'Archive ready payload count')

    paths = manifest['artifactPaths']
    def data(name):
        return json.loads(raw_by_stored[paths[name]])
    ready = data('sourceReady')
    need(ready['schema'] == 'profile-phase-source-ready/v1' and ready['executed'] is False, 'Historical source-ready status changed')
    need(len(ready['inputs']) == 31, 'Expected 31 authority pins')
    for row in ready['inputs']:
        need(row['path'] in by_original, 'Authority input missing from archive')
        exact(by_original[row['path']], row['bytes'], row['sha256'], row['path'])
    before = data('checksBefore')
    after = data('checksAfter')
    need(before == after == ready['inputs'], 'Gate before/after authority pins differ')
    gates = data('checksTerminal')
    need(gates['status'] == 'passed' and gates['inputsUnchanged'] and len(gates['commands']) == 4, 'Four root CPU gates did not pass')
    need(gates['readySha256'] == sha(raw_by_stored[paths['sourceReady']]), 'Gate ready pin')
    for gate in gates['commands']:
        need(gate['exitCode'] == 0 and gate['pid'] > 0 and gate['startedAt'] <= gate['endedAt'], 'Invalid gate command terminal')
    tests = data('vitest')
    need(tests['success'] and tests['numTotalTests'] == tests['numPassedTests'] == 8 and tests['numFailedTests'] == 0, 'Eight geometry cases did not pass')
    compiled = data('compiled')
    need(compiled['readySha256'] == gates['readySha256'], 'Compiled ready pin')
    bundle = raw_by_stored[paths['compiledBundle']]
    exact(bundle, compiled['output']['bytes'], compiled['output']['sha256'], 'Compiled bundle')
    terminal = data('runTerminal')
    report_raw = raw_by_stored[paths['report']]
    exact(report_raw, terminal['report']['bytes'], terminal['report']['sha256'], 'Numerical report')
    report = json.loads(report_raw)
    need(terminal['valid'] and terminal['beforeAfterEqual'] and terminal['sampleCount'] == 120 and terminal['contributionSectionCount'] == 86, 'Numerical terminal counts')
    need(report['readySha256'] == gates['readySha256'], 'Numerical report ready pin')
    pins_before = report['inputsBefore']
    pins_after = report['inputsAfter']
    need(pins_before == pins_after and len(pins_before) == 31, 'Numerical input pins differ')
    for row, expected in zip(pins_before, ready['inputs']):
        need(row['observedSha256'] == expected['sha256'], 'Observed numerical pin mismatch')
        need({k: row[k] for k in ('path', 'bytes', 'sha256')} == expected, 'Numerical authority mismatch')
    samples = report['samples']
    components = report['contributionSections']
    need(len(samples) == 120 and len(components) == 86, 'Report sample counts')
    need(set(s['a0'] for s in samples) == {.20, .25, .30, .375, .45}, 'A0 control coverage')
    totals = {key: 0 for key in ('properIntersectionCount', 'collinearOverlapCount', 'raysWithUndersideBelowFace',
                               'nonAdjacentEndpointTouchCount', 'duplicatePointCount', 'zeroLengthSegmentCount')}
    placeholders = []
    post = []
    for sample in samples:
        need(sample['lookup']['phase'] == 'open' and sample['query']['seconds'] < sample['lookup']['touchdownSeconds'], 'Sample escaped declared pre-touchdown window')
        coordinates = sample['coordinates']
        need(len(coordinates) == 256 and all(math.isfinite(v) for v in coordinates), 'Invalid retained ordered section')
        for landmark in sample['landmarks'].values():
            i = 2 * landmark['point']
            need(landmark['x'] == coordinates[i] and landmark['y'] == coordinates[i + 1], 'Landmark/coordinate mismatch')
        geometry = sample['geometry']
        summary = geometry['summary']
        for key in totals:
            totals[key] += summary[key]
        need(summary['properIntersectionCount'] == len(geometry['properIntersections']) == 0, 'Strict crossing ledger changed')
        need(summary['collinearOverlapCount'] == len(geometry['collinearOverlaps']) == 0, 'Overlap ledger changed')
        negative_rays = sum(any(pair['signedGap'] < 0 for pair in ray['undersideFacePairs']) for ray in geometry['verticalRays'])
        need(negative_rays == summary['raysWithUndersideBelowFace'] == 0, 'Negative branch-gap ledger changed')
        need(summary['duplicatePointCount'] == len(geometry['duplicatePoints']), 'Duplicate-point ledger')
        need(summary['zeroLengthSegmentCount'] == len(geometry['zeroLengthSegments']), 'Zero-segment ledger')
        need(summary['nonAdjacentEndpointTouchCount'] == len(geometry['nonAdjacentEndpointTouches']), 'Endpoint-touch ledger')
        if summary['duplicatePointCount'] or summary['zeroLengthSegmentCount']:
            placeholders.append({'a0': sample['a0'], 'tau': sample['tau'], 'hold': sample['query']['hold'],
                'duplicatePointPairs': summary['duplicatePointCount'], 'zeroLengthSegments': summary['zeroLengthSegmentCount'],
                'endpointTouches': summary['nonAdjacentEndpointTouchCount']})
        contributors = [c for c in sample['contributingCases'] if c['weight'] > 0 and c['requestedShapeTau'] > c['touchdownTau']]
        for contributor in sample['contributingCases']:
            need(contributor['sectionKey'] in components, 'Missing contributor trace')
        if contributors:
            post.append({'a0': sample['a0'], 'tau': sample['tau'], 'hold': sample['query']['hold'], 'phase': sample['lookup']['phase'],
                'contributingCases': contributors, 'geometrySummary': summary})
            need(sample['query']['hold'] == 'drawing' and summary['duplicatePointCount'] == summary['zeroLengthSegmentCount'] == 0, 'Post-touchdown sample scope changed')
    need(len(placeholders) == 6 and all(s['tau'] == 0 and s['a0'] in (.30, .375, .45) and s['zeroLengthSegments'] == 24 and s['duplicatePointPairs'] == 300 and s['endpointTouches'] == 1 for s in placeholders), 'Placeholder ledger changed')
    need(len(post) == 6 and sum(s['a0'] == .25 for s in post) == 4 and sum(s['a0'] == .375 for s in post) == 2, 'Positive post-touchdown contribution counts changed')
    derived = json.loads((base / 'results-summary.json').read_bytes())
    need(derived['parentTotals'] == totals and derived['placeholderSamples'] == placeholders and derived['positivePostTouchdownContributors'] == post, 'Derived result summary differs from retained report')
    need(derived['candidate'] == 'none', 'Unexpected candidate claim')
    for component in components.values():
        need(len(component['coordinates']) == 256, 'Invalid contributor coordinate count')
        summary = component['geometry']['summary']
        need(summary['properIntersectionCount'] == summary['collinearOverlapCount'] == summary['raysWithUndersideBelowFace'] == 0, 'Contributor ledger changed')
    external_checked = 0
    if args.external:
        for row in manifest['externalReferences']:
            exact(Path(row['path']).read_bytes(), row['bytes'], row['sha256'], row['path'])
            external_checked += 1
    need(not list(base.rglob('*.test.ts')), 'Live test files in archive')
    print(json.dumps({'status': 'passed', 'manifestSha256': sha(manifest_raw), 'storedPayloads': len(manifest['records']),
        'originalAliases': len(by_original), 'authorityPins': len(ready['inputs']), 'geometryMetricTests': 8,
        'samples': len(samples), 'contributionSections': len(components), 'postTouchdownPositiveContributors': len(post),
        'placeholderSamples': len(placeholders), 'externalChecked': external_checked,
        'operation': 'archive byte/hash and retained ledger audit only; no numerical execution'}, indent=2))


if __name__ == '__main__':
    main()
