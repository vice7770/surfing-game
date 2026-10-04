#!/usr/bin/env python3
"""Read-only payload/reference/recorded-result and patch byte verification; no numerical/game execution."""
from pathlib import Path
import argparse, gzip, hashlib, json, re

def pin(data):
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

def apply_hunks(old, lines):
    output, cursor, i = [], 0, 0
    while i < len(lines):
        m = re.fullmatch(r'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@.*\n?', lines[i])
        assert m, 'invalid hunk header'
        start = max(0, int(m[1]) - 1)
        assert start >= cursor
        output.extend(old[cursor:start]); cursor = start
        used = emitted = 0; i += 1
        while i < len(lines) and not lines[i].startswith('@@ '):
            line = lines[i]; assert line and line[0] in ' +-'
            if line[0] in ' -':
                assert cursor < len(old) and old[cursor] == line[1:], 'patch context mismatch'
                cursor += 1; used += 1
            if line[0] in ' +':
                output.append(line[1:]); emitted += 1
            i += 1
        assert (used, emitted) == (int(m[2] or 1), int(m[4] or 1)), 'patch hunk count mismatch'
    output.extend(old[cursor:])
    return ''.join(output).encode()

def reconstruct(raw, bases):
    groups = []
    for line in raw.decode().splitlines(keepends=True):
        if line.startswith('--- '):
            groups.append({'before': line[4:].strip(), 'lines': []})
        elif line.startswith('+++ '):
            assert groups; groups[-1]['after'] = line[4:].strip()
        else:
            assert groups and 'after' in groups[-1]; groups[-1]['lines'].append(line)
    result = {}
    for g in groups:
        name = g['after'].removeprefix('b/')
        before = b'' if g['before'] == '/dev/null' else bases[g['before'].removeprefix('a/')]
        result[name] = apply_hunks(before.decode().splitlines(keepends=True), g['lines'])
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--original-scratch', action='store_true'); args = parser.parse_args()
    root = Path(__file__).resolve().parent
    manifest = json.loads((root / 'manifest.json').read_text())
    entries = {r['path']: r for r in manifest['files']}
    decoded, originals, references = {}, {}, {}
    checks = {'payloads': 0, 'gzipPayloads': 0, 'relativeReferences': 0, 'aliases': 0,
              'patchFilesReconstructed': 0, 'originalPayloads': 0, 'originalInventoryPins': 0,
              'originalBuildAssetPins': 0, 'repoStaticAssetReferences': 0}
    def original_check(path, expected):
        assert pin(Path(path).read_bytes()) == expected, 'original drift: ' + path
    for r in manifest['files']:
        transport = (root / r['path']).read_bytes(); assert pin(transport) == r['transport'], r['path']
        raw = gzip.decompress(transport) if r['encoding'] == 'gzip' else transport
        assert pin(raw) == r['decoded'], r['path']; decoded[r['path']] = raw
        checks['payloads'] += 1; checks['gzipPayloads'] += r['encoding'] == 'gzip'
        if r.get('originalPath'):
            originals[r['originalPath']] = raw
            if args.original_scratch:
                original_check(r['originalPath'], r['decoded']); checks['originalPayloads'] += 1
    inputs = json.loads(decoded['input-references.json'])
    for r in inputs['references']:
        transport = (root / r['archiveRelative']).read_bytes(); assert pin(transport) == r['transport'], r['archiveRelative']
        raw = gzip.decompress(transport) if r['encoding'] == 'gzip' else transport
        assert pin(raw) == r['decoded'], r['archiveRelative']; references[r['archiveRelative']] = raw
        checks['relativeReferences'] += 1
        if r.get('originalPath'):
            originals[r['originalPath']] = raw
            if args.original_scratch:
                original_check(r['originalPath'], r['decoded']); checks['originalPayloads'] += 1
    for r in inputs['aliases']:
        raw = decoded[r['archivePath']]; assert pin(raw) == r['decoded']; originals[r['originalPath']] = raw
        checks['aliases'] += 1
        if args.original_scratch:
            original_check(r['originalPath'], r['decoded']); checks['originalPayloads'] += 1
    # Verify older actual-input/helper references without importing parsers or duplicating their reports/assets.
    prior_inputs = json.loads(references['../bounded-c-profile/input-references.json'])
    for r in prior_inputs['priorArchivedInputsAndHelpers']:
        transport = (root / '../bounded-c-profile' / r['archiveRelative']).read_bytes(); assert pin(transport) == r['transport']
        raw = gzip.decompress(transport) if r['encoding'] == 'gzip' else transport; assert pin(raw) == r['decoded']
        checks['relativeReferences'] += 1

    S = '/private/tmp/tube-bounded-c-shared-seam-20261004/'
    D = '/private/tmp/tube-bounded-c-fullsheet-demand-20261004/'
    get = lambda path: originals[path]
    parse = lambda path: json.loads(get(path))
    full = parse(S + 'complete-sheet-result.json'); demand = parse(D + 'readiness.json')
    assert full['validation']['passed'] == 238 and full['validation']['failed'] == 0
    assert full['validation']['actualTestFiles'] == 15 and full['validation']['strictTSExitCode'] == 0
    assert demand['validation']['passed'] == 242 and demand['validation']['failed'] == 0 and demand['validation']['testFiles'] == 16
    assert demand['validation']['strictTSExitCode'] == 0
    rejected = parse(S + 'root-only-all6447-receipt.json')
    assert len(rejected['failures']) == 96 and sum(g['attempted'] for g in rejected['groups'].values()) == 6447
    assert all('59/68' in r['error'] or '59/69' in r['error'] for r in rejected['failures'])
    current = parse(S + 'complete-sheet-final-query-receipt.json')
    assert sum(g['attempted'] for g in current['groups'].values()) == 6447 and all(g['failed'] == 0 for g in current['groups'].values())
    assert current['groups']['captured5-partial32to112']['attempted'] == 5
    exact = parse(S + 'complete-sheet-final-exact-receipt.json')
    assert exact['originalPenetration'] == 0.0003114571531508403 and exact['signedGap'] > 0
    switches = parse(S + 'complete-sheet-final-switch-receipt.json')
    assert switches['measuredSwitches'] == 40 and len(switches['switches']) == 40 and switches['activeCollapsedSwitches'] == 20
    assert switches['maximumPairedRoofSwitch'] == 0.0024344948211570336
    for a, b in [('complete-sheet-final-query-receipt.json', 'fullsheet-query-receipt.json'),
                 ('complete-sheet-final-exact-receipt.json', 'fullsheet-exact-receipt.json'),
                 ('complete-sheet-final-switch-receipt.json', 'fullsheet-switch-receipt.json')]:
        assert get(S + a) == get(D + b), 'immutable geometry receipt drift'
    provider = parse(D + 'provider-equivalence.json'); library = parse(D + 'library-equivalence.json'); blended = parse(D + 'library-blend-precision-equivalence.json')
    assert provider['total'] == 6447 and provider['capStencilQueries'] == 12894 and provider['fullContourExact'] and provider['capStencilsExact']
    assert library['queries'] + blended['blended'] + blended['precisionQueries'] == 5616
    assert library['fullLookupIncludingVelocityExact'] and blended['fullLookupAndF32ContourExact']

    # Every recorded patch is reconstructed in memory and compared with the exact retained target source bytes.
    source_names = ['src/wave/barrel/boundedCProfile.ts', 'src/wave/barrel/ProfileLibrary.ts', 'src/wave/barrel/sweptLoft.ts', 'src/wave/barrel/boundedCConsumers.test.ts']
    base = {n: references['../bounded-c-profile/source/final/' + n] for n in source_names}
    full_source = reconstruct(get(S + 'complete-sheet.patch'), base)
    assert len(full_source) == 5
    for n, raw in full_source.items():
        assert raw == get(S + 'source/' + n); checks['patchFilesReconstructed'] += 1
    full_source['src/wave/barrel/boundedCConsumers.test.ts'] = base['src/wave/barrel/boundedCConsumers.test.ts']
    for patch, count in [('fullsheet-demand-runtime.patch', 2), ('fullsheet-demand.patch', 5)]:
        targets = reconstruct(get(D + patch), full_source); assert len(targets) == count
        for n, raw in targets.items():
            assert raw == get(D + 'source/' + n); checks['patchFilesReconstructed'] += 1
    before = get(S + 'source/src/wave/barrel/boundedCProfile.ts').decode()
    after = get(D + 'source/src/wave/barrel/boundedCProfile.ts').decode()
    marker = '/** Writes only owned33..111.'
    assert before[before.index(marker):] == after[after.index(marker):]
    marker, end = 'function root(', 'export function ulp32'
    assert before[before.index(marker):before.index(end)] == after[after.index(marker):after.index(end)]
    for n, expected in full_source.items():
        if n in ('src/wave/barrel/sharedUpperRoot.ts', 'src/wave/barrel/sweptLoft.ts'):
            # Unchanged combined files are recorded by the pre/post source inventories rather than duplicated.
            post = parse(D + 'post-validation-freeze.json'); row = next(r for r in post['sourcePins'] if r['path'] == n)
            assert pin(expected) == {k: row[k] for k in ('bytes', 'sha256')}

    complete = json.loads(decoded['build/root-complete-build-result.json.gz'])
    assert complete['terminal'] and complete['exitCode'] == 0 and complete['rootToolSession'] == 56250
    assert complete['sourceUnchangedAfterBuild'] and len(complete['sourcePins']) == 577
    assert len(complete['builtAssetPins']) == 21 and len(complete['frozenAssetPins']) == 49
    declared = {r['path']: {k: r[k] for k in ('bytes', 'sha256')} for r in parse(D + 'pre-validation-freeze.json')['files']}
    for r in complete['sourcePins']:
        rel = str(Path(r['file']).relative_to(complete['source']))
        assert declared[rel] == {k: r[k] for k in ('bytes', 'sha256')}, 'root source pin differs from frozen validation input'
    frozen = {str(Path(r['file']).relative_to(complete['frozenDist'])): {k: r[k] for k in ('bytes', 'sha256')} for r in complete['frozenAssetPins']}
    for r in complete['builtAssetPins']:
        rel = str(Path(r['file']).relative_to(complete['builtDist']))
        assert frozen[rel] == {k: r[k] for k in ('bytes', 'sha256')}, 'built asset differs from composed frozen asset'
    composition = complete['staticComposition']
    assert (composition['newBuildAssets'], composition['additionalStaticAssets'], composition['identicalOverlap']) == (21, 28, 2)
    assert not composition['sourceRuntimeCodeChanged'] and not composition['rebuildPerformed']
    assert complete['productionAdopted'] is False and complete['nativeObserved'] is False
    for name in ('rootOriginalBuildResult', 'rootPartialBuildResult', 'priorStaticAssetsSeal'):
        r = complete[name]; assert pin(get(r['file'])) == {k: r[k] for k in ('bytes', 'sha256')}
    for r in composition['references'] + composition['overlap']:
        copied = r.get('frozenCopy', r.get('sameBuiltAsset'))
        assert {k: r['source'][k] for k in ('bytes', 'sha256')} == {k: copied[k] for k in ('bytes', 'sha256')}
    media = json.loads(decoded['build/media-input-references.json']); assert len(media['references']) == 28 and not media['mediaBytesArchived']
    for r in media['references']:
        if 'repoReference' in r:
            q = r['repoReference']; assert pin((root / q['archiveRelative']).read_bytes()) == q['decoded'] == q['transport']; checks['repoStaticAssetReferences'] += 1
    for name in ('preparation-failure.json', 'postbuild-preparation-failure.json'):
        r = json.loads(decoded['build/' + name]); assert r['rootInvocationExit'] == 1
    assert json.loads(decoded['build/postbuild-preparation-failure.json'])['buildTerminalExit'] == 0
    if args.original_scratch:
        # Verify original whole-tree inventories, without enforcing that build output directories must be absent.
        for prefix, names in [(S, ['copy-baseline.json']), (D, ['baseline-copy.json'])]:
            for name in names:
                for r in parse(prefix + name)['files']:
                    original_check(r['originalPath'], {k: r[k] for k in ('bytes', 'sha256')}); checks['originalInventoryPins'] += 1
        freeze = parse(D + 'pre-validation-freeze.json')
        for r in freeze['files']:
            original_check(D + 'source/' + r['path'], {k: r[k] for k in ('bytes', 'sha256')}); checks['originalInventoryPins'] += 1
        for r in freeze['originalInputs']:
            original_check(r['path'], {k: r[k] for k in ('bytes', 'sha256')}); checks['originalInventoryPins'] += 1
        for r in complete['sourcePins']:
            original_check(r['file'], {k: r[k] for k in ('bytes', 'sha256')}); checks['originalInventoryPins'] += 1
        for field in ('builtAssetPins', 'frozenAssetPins'):
            for r in complete[field]:
                original_check(r['file'], {k: r[k] for k in ('bytes', 'sha256')}); checks['originalBuildAssetPins'] += 1
        for r in composition['references'] + composition['overlap']:
            for q in (r['source'], r.get('frozenCopy', r.get('sameBuiltAsset'))):
                original_check(q['file'], {k: q[k] for k in ('bytes', 'sha256')}); checks['originalBuildAssetPins'] += 1
    assert not manifest['sourceAdopted'] and not manifest['nativeEvidenceIncluded']
    actual = {str(p.relative_to(root)) for p in root.rglob('*') if p.is_file()}
    assert set(entries) <= actual <= set(entries) | {'manifest.json', 'verification.json'}, 'untracked archive payload'
    print(json.dumps({'verified': True, 'mode': 'original-scratch' if args.original_scratch else 'portable',
                      'checks': checks, 'manifest': pin((root / 'manifest.json').read_bytes()),
                      'recordedChecks': '238 seam / 242 combined assertions; 6447 provider,12894 stencil,5616 Library queries',
                      'build': 'terminal exit0,21 built +28 static =49; preparation failures retained',
                      'numericNativeBuildOrSourceAdoptionRerun': False, 'continuityFPSBodyEntryAcceptance': False}, indent=2))

if __name__ == '__main__':
    main()
