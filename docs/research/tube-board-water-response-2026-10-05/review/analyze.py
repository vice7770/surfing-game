#!/usr/bin/env python3
"""Root-run offline comparison of terminal 143-field capture versus successful 102-field parent."""
from pathlib import Path
import argparse, base64, collections, hashlib, json, math, sys
sys.dont_write_bytecode = True
from authority import CANDIDATE, BASELINE, check, closure, load, pin, verify, verify_baseline
from balance import analyze_balance

PREP = Path(__file__).resolve().parent
MISSING = object()
APPROVED_SUFFIXES = (
    '.workerStepMs', '.detector.elapsedMilliseconds', '.detector.cumulativeMilliseconds',
    '.cameraFollower.calls', '.cameraFollower.zeroDtCalls', '.cameraFollower.positiveDtCalls', '.clocks.surfaceRevision')
ARRAY_NAMES = frozenset(('positions', 'normals', 'mask', 'lift', 'sheet', 'sheetWeight', 'sheetBack', 'throat', 'indices',
    'sliceFront', 'sliceSigma', 'sliceTau', 'slicePhase', 'sliceLife', 'sliceCollapse', 'sliceFade', 'sliceTipGap',
    'sliceRestHold', 'sliceRestEnd', 'sliceRestClimb', 'sliceToeClimb', 'sliceJoined', 'sliceRayX', 'sliceRayZ',
    'sliceWeight', 'sliceOverturned', 'sliceTipAlong', 'sliceTipUp', 'sliceTipTransportAlong', 'sliceTipTransportUp',
    'sliceAnchorVX', 'sliceAnchorVZ', 'sliceFormed', 'sliceTipX', 'sliceTipY', 'sliceTipZ', 'sliceMouth'))

def scalar_equal(a, b):
    if a is MISSING and b is MISSING: return True
    if type(a) is not type(b): return False
    if isinstance(a, float):
        if math.isnan(a) or math.isnan(b): return math.isnan(a) and math.isnan(b)
        if a == b == 0: return math.copysign(1, a) == math.copysign(1, b)
    return a == b

def differences(a, b, path='$', observer_parent=False, new=frozenset(), old=frozenset()):
    if isinstance(a, dict) and isinstance(b, dict):
        full = (old | new) <= set(a) or (old | new) <= set(b)
        for key in sorted(set(a) | set(b)):
            yield from differences(a.get(key, MISSING), b.get(key, MISSING), path + '.' + key, full and key in new, new, old)
    elif isinstance(a, list) and isinstance(b, list):
        for index in range(max(len(a), len(b))):
            yield from differences(a[index] if index < len(a) else MISSING, b[index] if index < len(b) else MISSING,
                                   path + '[' + str(index) + ']', False, new, old)
    elif not scalar_equal(a, b):
        yield {'path': path, 'candidatePresent': a is not MISSING, 'baseline102Present': b is not MISSING,
            'candidate': None if a is MISSING else a, 'baseline102': None if b is MISSING else b,
            'fullObserverNewWord': observer_parent}

def category(diff, scope):
    if diff['fullObserverNewWord']: return 'newObserverWordRetainedRaw'
    if scope in ('trace', 'initialBody') and any(diff['path'].endswith(s) for s in APPROVED_SUFFIXES):
        return 'priorRecordedTimingFollowerOrRedrawCategory'
    return 'nonapprovedRecordedDifference'

def normalize(value, path, scope, old, new):
    if isinstance(value, dict):
        full = (old | new) <= set(value)
        return {key: normalize(item, path + '.' + key, scope, old, new) for key, item in value.items()
            if not (full and key in new)
            and not (scope in ('trace', 'initialBody') and any((path + '.' + key).endswith(s) for s in APPROVED_SUFFIXES))}
    if isinstance(value, list):
        return [normalize(item, path + '[' + str(i) + ']', scope, old, new) for i, item in enumerate(value)]
    return value

def exact(a, b):
    return next(differences(a, b), None) is None

def metadata(sidecar):
    result = {k: v for k, v in sidecar.items() if k not in ('arrays', 'rawFrontPacket')}
    result['arrays'] = {key: {k: v for k, v in value.items() if k != 'data'} for key, value in sidecar['arrays'].items()}
    result['rawFrontPacket'] = {k: v for k, v in sidecar['rawFrontPacket'].items() if k != 'data'}
    return result

def packet_words(packet):
    raw = base64.b64decode(packet['data'], validate=True)
    widths = {'Float32Array': 4, 'Uint32Array': 4, 'Int32Array': 4, 'Uint8Array': 1}
    width = widths[packet.get('dtype', 'Float32Array')]
    assert len(raw) == packet['byteLength'] == packet['count'] * width
    return raw, width

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root-authorized-terminal', action='store_true')
    parser.add_argument('--expected-seal-sha256', required=True)
    parser.add_argument('--expected-report-sha256', required=True)
    parser.add_argument('--expected-wrapper-sha256', required=True)
    parser.add_argument('--expected-wrapper-file', type=Path, required=True)
    parser.add_argument('--expected-rider-mass', type=float, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not args.root_authorized_terminal:
        parser.error('Explicit root terminal authorization is required.')
    for value in (args.expected_seal_sha256, args.expected_report_sha256, args.expected_wrapper_sha256):
        assert len(value) == 64 and all(c in '0123456789abcdef' for c in value), 'Root must provide actual SHA-256 values.'
    assert math.isfinite(args.expected_rider_mass) and args.expected_rider_mass > 0
    out = args.output.resolve()
    assert out != PREP and out.is_relative_to(PREP) and not out.exists(), 'Use a fresh root-owned output subdirectory.'
    # Gate before reading the candidate report, trace, sidecars or media. No owner polling/retry is implemented.
    owner_path = CANDIDATE / 'candidate-first-owner.json'
    owner = load(owner_path)
    closure(owner, 'board-rhs-components-finite-owner/v1')
    assert owner['sealSha256'] == args.expected_seal_sha256
    assert pin(CANDIDATE / 'seal.json')['sha256'] == args.expected_seal_sha256
    terminal_seal = load(CANDIDATE / 'seal.json')
    assert terminal_seal['schema'] == 'board-rhs-components-root-seal/v1' and terminal_seal['complete'] is True
    assert terminal_seal['arms']['candidate']['rootAuthorized'] is True
    assert pin(CANDIDATE / 'candidate-first/report.json')['sha256'] == args.expected_report_sha256
    report = load(CANDIDATE / 'candidate-first/report.json')
    authority = verify(owner, report, args.expected_seal_sha256, args.expected_wrapper_file, args.expected_wrapper_sha256)
    prior_owner = load(BASELINE / 'candidate-first-owner.json')
    assert prior_owner['complete'] is True and prior_owner['exitCode'] == 0 and prior_owner['firstFailure'] is None
    assert prior_owner['sourceBuildHelpersPostUnchanged'] is True and prior_owner['independentClosureValid'] is True and prior_owner['protectedPortsPreserved'] is True
    assert prior_owner['remainingOwnedPids'] == [] and all(v is True for v in prior_owner['closedPorts'].values())
    prior = load(BASELINE / 'candidate-first/report.json')
    baseline_authority = verify_baseline(prior_owner, prior)
    assert prior['complete'] is True and prior['firstFailure'] is None and prior['browserErrors'] == []
    baseline_seal = pin(BASELINE / 'seal.json')
    assert prior_owner['sealSha256'] == prior['sealSha256'] == baseline_seal['sha256']
    candidate_rows = [json.loads(line) for line in (CANDIDATE / 'candidate-first/steps.ndjson').read_text().splitlines()]
    baseline_rows = [json.loads(line) for line in (BASELINE / 'candidate-first/steps.ndjson').read_text().splitlines()]
    assert exact(candidate_rows, report['steps']) and exact(baseline_rows, prior['steps'])
    assert len(candidate_rows) == report['stepCount'] <= 2160 and len(baseline_rows) == prior['stepCount'] == 1366
    for rows in (candidate_rows, baseline_rows): assert [r['step'] for r in rows] == list(range(1, len(rows) + 1))
    fields = load(PREP / 'observer-fields.json')
    assert pin(PREP / 'observer-fields.json')['sha256'] == 'e015b21641a592888aea8c160687edb0e4005d6c3e0ab8c0e011b2b739799fc8'
    assert load(CANDIDATE / 'observer-fields.json') == fields
    assert load(BASELINE / 'observer-fields.json')['allFields'] == fields['oldFields']
    old, new = frozenset(fields['oldFields']), frozenset(fields['newFields'])
    assert len(old) == 102 and len(new) == 41 and len(fields['allFields']) == 143 and not old & new
    assert fields['allFields'] == fields['oldFields'] + fields['newFields'] and fields['availabilityMarker'] in old
    assert report['operandObservation']['fields'] == fields['allFields'] and prior['operandObservation']['fields'] == fields['oldFields']
    inputs = [pin(base / name) for base in (CANDIDATE, BASELINE) for name in
        ('candidate-first-owner.json', 'candidate-first/report.json', 'candidate-first/steps.ndjson', 'seal.json', 'readiness.json', 'observer-fields.json')]
    inputs += [pin(PREP / name) for name in ('analyze.py', 'authority.py', 'balance.py', 'observer-fields.json', 'audit-contract.json', 'README.md', 'readiness.json', 'freeze.json')]
    media, capture_inventories = [], []
    for base, capture in ((CANDIDATE, report), (BASELINE, prior)):
        for q in capture['artifacts']:
            assert not Path(q['file']).is_absolute() and '..' not in Path(q['file']).parts
            p = {'file': str(base / 'candidate-first' / q['file']), 'bytes': q['bytes'], 'sha256': q['sha256']}
            check(p); media.append(p)
        for q in capture['loftSnapshots']:
            check({'file': str(base / 'candidate-first' / q['file']), 'bytes': q['bytes'], 'sha256': q['sha256']})
        declared = {q['file'] for q in capture['artifacts']} | {q['file'] for q in capture['loftSnapshots']} | {'report.json', 'steps.ndjson'}
        actual_files = {str(p.relative_to(base / 'candidate-first')): pin(p) for p in (base / 'candidate-first').rglob('*') if p.is_file()}
        assert declared <= actual_files.keys()
        capture_inventories.append({'work': str(base), 'declaredCoreFiles': len(declared), 'actualFiles': len(actual_files),
            'additionalFilesNotInArtifactOrSidecarDeclarations': sorted(actual_files.keys() - declared), 'allActualFilePins': list(actual_files.values()),
            'pngDeclared': capture['pngCount'], 'pngActual': sum(name.endswith('.png') for name in actual_files),
            'sidecarsDeclared': len(capture['loftSnapshots']), 'sidecarsActual': sum(name.startswith('loft-') and name.endswith('.json') for name in actual_files)})
        assert capture_inventories[-1]['pngDeclared'] == capture_inventories[-1]['pngActual']
        assert capture_inventories[-1]['sidecarsDeclared'] == capture_inventories[-1]['sidecarsActual']
    out.mkdir()
    def save(name, value):
        path = out / name
        with path.open('x') as stream: json.dump(value, stream, indent=2, allow_nan=False); stream.write('\n')
        return pin(path)
    counts = collections.Counter()
    with (out / 'all-raw-differences.ndjson').open('x') as stream:
        comparisons = [('trace', candidate_rows, baseline_rows)]
        comparisons += [('reportOther', {k: v for k, v in report.items() if k != 'steps'}, {k: v for k, v in prior.items() if k != 'steps'}), ('owner', owner, prior_owner)]
        for scope, a, b in comparisons:
            for diff in differences(a, b, '$.' + scope, new=new, old=old):
                diff.update(scope=scope, category=category(diff, scope)); counts[scope + ':' + diff['category']] += 1
                stream.write(json.dumps(diff, allow_nan=False) + '\n')
    row_results, field_counts = [], collections.Counter()
    for index in range(max(len(candidate_rows), len(baseline_rows))):
        if index >= min(len(candidate_rows), len(baseline_rows)):
            row_results.append({'step': index + 1, 'candidatePresent': index < len(candidate_rows), 'baseline102Present': index < len(baseline_rows), 'originalPublishedRowEqual': False}); continue
        a, b = candidate_rows[index], baseline_rows[index]
        aa, bb = normalize(a, '$.trace', 'trace', old, new), normalize(b, '$.trace', 'trace', old, new)
        diffs = list(differences(aa, bb))
        for key in set(a) | set(b):
            if not exact(aa.get(key, MISSING), bb.get(key, MISSING)): field_counts[key] += 1
        row_results.append({'step': index + 1, 'originalPublishedRowEqual': not diffs, 'nonapprovedDifferences': diffs})
    initial_results = {}
    for key in ('initial', 'initialBody', 'settings', 'overrides', 'expectedConfig', 'schedule'):
        scope = 'initialBody' if key == 'initialBody' else 'recordedReportValue'
        a, b = report.get(key, MISSING), prior.get(key, MISSING)
        diffs = list(differences(normalize(a, '$.' + key, scope, old, new), normalize(b, '$.' + key, scope, old, new)))
        initial_results[key] = {'originalPublishedValueEqual': not diffs, 'nonapprovedDifferences': diffs}
    checkpoints = []
    for label in sorted({c['label'] for r in (report, prior) for c in r['checkpoints']}):
        a = next((c for c in report['checkpoints'] if c['label'] == label), MISSING)
        b = next((c for c in prior['checkpoints'] if c['label'] == label), MISSING)
        checkpoints.append({'label': label, 'candidate': None if a is MISSING else a, 'baseline102': None if b is MISSING else b,
            'cameraExact': a is not MISSING and b is not MISSING and exact(a['camera'], b['camera']),
            'stepExact': a is not MISSING and b is not MISSING and a['step'] == b['step'],
            'noCheckpointObjectNormalization': True})
    sidecars, revisions = [], []
    with (out / 'sidecar-word-differences.ndjson').open('x') as words, (out / 'sidecar-all-raw-differences.ndjson').open('x') as raw_stream:
        a_stubs = {q['label']: q for q in report['loftSnapshots']}; b_stubs = {q['label']: q for q in prior['loftSnapshots']}
        for label in sorted(a_stubs.keys() | b_stubs.keys()):
            name = 'loft-' + label + '.json'
            if label not in a_stubs or label not in b_stubs:
                sidecars.append({'label': label, 'compared': False, 'candidatePresent': label in a_stubs, 'baseline102Present': label in b_stubs,
                    'reason': 'No paired same-label sidecar; no equivalence inference.'}); continue
            a, b = load(CANDIDATE / 'candidate-first' / name), load(BASELINE / 'candidate-first' / name)
            assert a['schema'] == b['schema'] == 'bounded-C-complete-drawn-loft-words/v1'
            assert set(a['arrays']) == set(b['arrays']) == ARRAY_NAMES and len(ARRAY_NAMES) == 37
            for diff in differences(a, b, '$.' + name): raw_stream.write(json.dumps(diff, allow_nan=False) + '\n')
            results = []
            for key in sorted(ARRAY_NAMES | {'rawFrontPacket'}):
                x, y = (a['rawFrontPacket'], b['rawFrontPacket']) if key == 'rawFrontPacket' else (a['arrays'][key], b['arrays'][key])
                ra, wa = packet_words(x); rb, wb = packet_words(y)
                assert wa == wb
                changed = 0
                for i in range(max(x['count'], y['count'])):
                    ax = ra[i * wa:(i + 1) * wa] if i < x['count'] else None
                    bx = rb[i * wb:(i + 1) * wb] if i < y['count'] else None
                    if ax != bx:
                        changed += 1; words.write(json.dumps({'sidecar': name, 'array': key, 'word': i, 'bytesPerWord': wa,
                            'candidateHex': None if ax is None else ax.hex(), 'baseline102Hex': None if bx is None else bx.hex()}) + '\n')
                results.append({'array': key, 'candidateCount': x['count'], 'baseline102Count': y['count'], 'changedWords': changed,
                    'descriptorDifferences': list(differences({k: v for k, v in x.items() if k != 'data'}, {k: v for k, v in y.items() if k != 'data'})),
                    'candidateWordSha256': hashlib.sha256(ra).hexdigest(), 'baseline102WordSha256': hashlib.sha256(rb).hexdigest()})
            meta_diffs = list(differences(metadata(a), metadata(b), '$.' + name))
            revision_path = '$.' + name + '.epoch.surfaceRevision'
            revision_diffs = [q for q in meta_diffs if q['path'] == revision_path]
            revisions.append({'label': label, 'candidateEpoch': a['epoch'], 'baseline102Epoch': b['epoch'], 'revisionDifferences': revision_diffs,
                'signedRevisionDelta': a['epoch']['surfaceRevision'] - b['epoch']['surfaceRevision']})
            sidecars.append({'label': label, 'compared': True, 'candidate': pin(CANDIDATE / 'candidate-first' / name), 'baseline102': pin(BASELINE / 'candidate-first' / name),
                'arrayCountExpected': 37, 'arrayCountCandidateActual': len(a['arrays']), 'arrayCountBaseline102Actual': len(b['arrays']), 'arraysAndFrontPacket': results,
                'allActiveArrayAndFrontPacketWordsEqual': all(q['changedWords'] == 0 for q in results),
                'allDescriptorsEqual': all(not q['descriptorDifferences'] for q in results), 'metadataDifferences': meta_diffs,
                'metadataExceptExactSurfaceRevisionEqual': not [q for q in meta_diffs if q['path'] != revision_path]})
    samples = []
    def scan(value, path):
        if isinstance(value, dict):
            if old <= set(value):
                assert set(fields['allFields']) <= set(value), ('Incomplete full observer', path)
                assert all(type(value[k]) in (int, float) and math.isfinite(value[k]) for k in fields['allFields'])
                assert value['standingTrialAvailable'] in (0, 1)
                samples.append({'path': path, 'sample': value, 'newWordsValid': value['standingTrialAvailable'] == 1})
            for k, v in value.items(): scan(v, path + '.' + k)
        elif isinstance(value, list):
            for i, v in enumerate(value): scan(v, path + '[' + str(i) + ']')
    scan(report, '$.report')
    artifacts = {}
    artifacts['rows'] = save('original-published-row-comparison.json', {'rows': row_results, 'topLevelFieldDifferenceRows': dict(field_counts), 'initialAndConfig': initial_results, 'checkpoints': checkpoints})
    artifacts['sidecars'] = save('full-sidecar-comparison.json', {'sidecars': sidecars, 'signedEpochRevisionDifferences': revisions})
    artifacts['samples'] = save('all-full-observer-records.json', {'fields': fields['allFields'], 'records': samples, 'allRetainedRepresentationsIncluded': True,
        'marker0InvalidatesAllNewWords': True, 'marker1MeansTrialCapturedOnly': True, 'everyInternalSubstepCaptured': False})
    artifacts['authority'] = save('postcapture-authority.json', authority)
    artifacts['baselineAuthority'] = save('baseline102-postcapture-authority.json', baseline_authority)
    numerical = analyze_balance(report, samples, fields, args.expected_rider_mass, save, exact)
    artifacts['numerical'] = numerical['artifacts']
    summary = {'schema': 'board-rhs-components-actual-readonly-review/v1', 'complete': True, 'numericExecution': True,
        'rootExplicitTerminalAuthorization': True, 'candidate': str(CANDIDATE), 'baseline': str(BASELINE), 'inputs': inputs, 'mediaPins': media, 'captureInventories': capture_inventories,
        'rawDifferenceCounts': dict(counts), 'candidateRows': len(candidate_rows), 'baseline102Rows': len(baseline_rows),
        'allOriginalPublishedRowsEqualAfterOnlyApprovedExclusions': len(candidate_rows) == len(baseline_rows) and all(q['originalPublishedRowEqual'] for q in row_results),
        'allOld102AndMarkerRetained': True, 'new41ExcludedOnlyInFull143ObserverRecords': True, 'wholeReportOrContactDiagnosticsExcluded': False,
        'rawDifferenceArchive': pin(out / 'all-raw-differences.ndjson'), 'sidecarRawDifferenceArchive': pin(out / 'sidecar-all-raw-differences.ndjson'),
        'sidecarWordDifferenceArchive': pin(out / 'sidecar-word-differences.ndjson'), 'artifacts': artifacts,
        'limits': ['Recorded public equality does not establish private whole-solver equality.', 'Only retained observer records are available; intermediate trial states may be unpublished.',
            'Board RHS aggregates separate eight assembly terms; combined water still mixes radiation and entrainment, and the board matrix remains a combined assembly.', 'Movie recording stops at240 moving advances; ordinary physics continues under the unchanged replay stop policy.'],
        'claims': {k: False for k in ('nativeBenefit', 'causalFix', 'hiddenHydrodynamicCause', 'visualQuality', 'tubePassage', 'FPS', 'adoption')},
        'resourcesStarted': False, 'portsOrPidsProbed': False, 'testsOrBuildsRun': False}
    for q in inputs + media: check(q)
    for inventory in capture_inventories:
        for q in inventory['allActualFilePins']: check(q)
    # Recheck the entire source/build/helper/served graph after comparison; no stale acceptance is carried forward.
    verify(owner, report, args.expected_seal_sha256, args.expected_wrapper_file, args.expected_wrapper_sha256)
    verify_baseline(prior_owner, prior)
    save('analysis.json', summary)
    print(json.dumps({'complete': True, 'analysis': pin(out / 'analysis.json'), 'rootOwnedNumericOutputs': str(out)}))

if __name__ == '__main__': main()
