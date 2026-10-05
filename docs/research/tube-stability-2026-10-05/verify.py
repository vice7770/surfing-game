#!/usr/bin/env python3
"""Verify this evidence archive without executing archived code or opening resources."""
from pathlib import Path
import argparse, collections, gzip, hashlib, json, math, struct

HERE = Path(__file__).resolve().parent
PRIOR = HERE.parent / 'tube-stability-2026-10-04'

def fp(data):
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

def require(condition, message):
    if not condition:
        raise ValueError(message)

def read_json(path):
    data = path.read_bytes()
    return json.loads(gzip.decompress(data) if path.suffix == '.gz' else data)

def verify_record(record, external=False, originals=False):
    path = (HERE / record['path']).resolve()
    require(path.is_relative_to(PRIOR if external else HERE), 'Path escapes declared archive: ' + str(path))
    require(record['encoding'] in ('identity', 'gzip'), 'Unknown encoding')
    data = path.read_bytes()
    require(fp(data) == record['stored'], 'Stored mismatch: ' + str(path))
    decoded = gzip.decompress(data) if record['encoding'] == 'gzip' else data
    require(fp(decoded) == record['decoded'], 'Decoded mismatch: ' + str(path))
    if record['encoding'] == 'gzip' and not external:
        require(data[:3] == b'\x1f\x8b\x08' and not data[3] & 8 and struct.unpack('<I', data[4:8])[0] == 0,
                'Non-deterministic gzip metadata: ' + str(path))
    if external:
        pin = record['priorManifest']
        prior_manifest = (HERE / pin['path']).resolve()
        require(prior_manifest.is_relative_to(PRIOR), 'Prior manifest escapes sibling archive')
        require(fp(prior_manifest.read_bytes()) == {k: pin[k] for k in ('bytes', 'sha256')}, 'Prior manifest mismatch')
    if originals and 'originalPath' in record:
        require(fp(Path(record['originalPath']).read_bytes()) == record['decoded'], 'Original mismatch: ' + record['originalPath'])
    return decoded

def check_capture_pin(artifact, directory, records):
    local = records[directory + artifact['file'] + ('.gz' if artifact['file'].endswith('.json') else '')]
    require(local['decoded'] == {k: artifact[k] for k in ('bytes', 'sha256')}, 'Capture inventory mismatch: ' + artifact['file'])

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--originals', action='store_true', help='Also require selected original paths and mapped source pins')
    ap.add_argument('--output', type=Path, help='Save summary inside this archive directory')
    args = ap.parse_args()
    manifest_path = HERE / 'manifest.json'
    manifest = read_json(manifest_path)
    require(manifest['schema'] == 'tube-retirement-and-ordinary-V4-archive/v1', 'Schema mismatch')
    files = manifest['files']
    refs = manifest['exactPriorArchiveReferences']
    records = {q['path']: q for q in files}
    require(len(records) == len(files), 'Duplicate local paths')
    for q in files:
        verify_record(q, originals=args.originals)
    for q in refs:
        verify_record(q, external=True, originals=args.originals)
    prior_pin = manifest['priorStableXArchiveManifest']
    require(fp((HERE / prior_pin['path']).read_bytes()) == {k: prior_pin[k] for k in ('bytes', 'sha256')}, 'Stable-X manifest mismatch')
    inventory = {str(p.relative_to(HERE)) for p in HERE.rglob('*') if p.is_file()}
    allowed = set(records) | {'manifest.json', 'verification.json'}
    if args.output:
        output = args.output.resolve()
        require(output.is_relative_to(HERE), 'Verification output must be inside owned archive')
        allowed.add(str(output.relative_to(HERE)))
    require(inventory <= allowed and set(records) <= inventory, 'Unexpected or missing archive payloads')
    stored = sum(p.stat().st_size for p in HERE.rglob('*') if p.is_file())
    require(stored < manifest['storedByteCap'] == 30 * 1024 * 1024, 'Stored archive exceeds cap')
    require(sum(q['stored']['bytes'] for q in files) == manifest['bytes']['storedPayload'], 'Stored total mismatch')
    require(sum(q['decoded']['bytes'] for q in files) == manifest['bytes']['decodedLocalPayload'], 'Decoded total mismatch')
    require(manifest['counts']['localPayloadFiles'] == len(files) and manifest['counts']['priorExactReferences'] == len(refs), 'Manifest count mismatch')

    retirement = read_json(HERE / 'retirement/capture/report.json.gz')
    owner = read_json(HERE / 'retirement/manifests/candidate-first-owner.json.gz')
    require(retirement['complete'] and owner['complete'] and owner['exitCode'] == 0, 'Retirement completion mismatch')
    require(len(retirement['observations']) == len(retirement['videoRequests']) == 71, 'Retirement observation/frame count')
    require([q['movingStep'] for q in retirement['observations']] == list(range(71)), 'Retirement chronology mismatch')
    require(retirement['firstObservedPhase2']['movingStep'] == 48 and retirement['stop']['movingStep'] == 70, 'Retirement event mismatch')
    require(sum(q['file'].endswith('.png') for q in retirement['artifacts']) == 6 and sum(q['file'].endswith('.webm') for q in retirement['artifacts']) == 1, 'Retirement media count mismatch')
    require(len(retirement['loftSnapshots']) == 2, 'Retirement sidecar count mismatch')
    for q in retirement['artifacts'] + retirement['loftSnapshots']:
        check_capture_pin(q, 'retirement/capture/', records)

    comparison = read_json(HERE / 'retirement/comparison/analysis.json.gz')
    change = comparison['actual59_60RetirementSealComparison']
    acceptance = comparison['acceptance']
    require(comparison['complete'] and all(acceptance[k] is False for k in
            ('pixelsViewedByThisAnalysis', 'normalContinuity', 'mouthVisibility', 'bodyPassage', 'FPS', 'productionAdoption')),
            'Comparison acceptance mismatch')
    require(math.isclose(change['baseline']['landmarkDeltaXYZ']['cap'][1], 0.2595614790916443, abs_tol=1e-15) and
            math.isclose(change['candidate']['landmarkDeltaXYZ']['cap'][1], 0.08221185207366943, abs_tol=1e-15), 'Roof measurement mismatch')

    v4 = read_json(HERE / 'ordinary-V4/capture/report.json.gz')
    owner4 = read_json(HERE / 'ordinary-V4/manifests/candidate-first-owner.json.gz')
    require(v4['complete'] and owner4['complete'] and owner4['exitCode'] == 0, 'V4 completion mismatch')
    require(v4['stepCount'] == len(v4['steps']) == 1366 and v4['normalMenuSeed'] == 6238, 'V4 seed/step mismatch')
    ndjson = gzip.decompress((HERE / 'ordinary-V4/capture/steps.ndjson.gz').read_bytes())
    rows = [json.loads(line) for line in ndjson.splitlines() if line]
    # Canonical serialization preserves equality even for identically published JSON NaNs.
    require(json.dumps(rows, sort_keys=True) == json.dumps(v4['steps'], sort_keys=True), 'V4 NDJSON/report disagreement')
    require([q['step'] for q in rows] == list(range(1, 1367)), 'V4 step chronology mismatch')
    require(all(math.isclose(q['physicalSeconds'], q['step'] / 60, abs_tol=1e-7) for q in rows), 'V4 physical clock mismatch')
    phases = collections.Counter(q['ride']['phase'] for q in rows)
    require(dict(phases) == {'prone': 1299, 'push': 43, 'landing': 23, 'fallen': 1}, 'V4 phase sequence mismatch')
    require(v4['stop'] == {'kind': 'first-published-fall-or-separation', 'step': 1366, 'phase': 'fallen', 'separation': 'lost board', 'resets': 0}, 'V4 terminal mismatch')
    require(v4['video'] is None and v4['videoRequests'] == [] and not v4['entry']['fullBodyClearancePass'], 'V4 movie/entry mismatch')
    require(len(v4['loftSnapshots']) == 2 and sum(q['file'].endswith('.png') for q in v4['artifacts']) == 2, 'V4 media/sidecar mismatch')
    for q in v4['artifacts'] + v4['loftSnapshots']:
        if q['file'] == 'steps.ndjson':
            require(records['ordinary-V4/capture/steps.ndjson.gz']['decoded'] == {k: q[k] for k in ('bytes', 'sha256')}, 'V4 NDJSON pin mismatch')
        else:
            check_capture_pin(q, 'ordinary-V4/capture/', records)

    adoption = read_json(HERE / 'adoption/comparison.json.gz')
    require(len(adoption['runtime']) == 15 and len(adoption['testsAndFixtures']) == 15 and len(manifest['sourceBundle']) == 30, 'Source bundle count mismatch')
    require(sum(q['status'] == 'changed' for q in adoption['runtime']) == 12 and sum(q['status'] == 'new-candidate' for q in adoption['runtime']) == 3, 'Runtime delta mismatch')
    for q in adoption['runtime'] + adoption['testsAndFixtures']:
        selected = manifest['sourceBundle'][q['path']]
        require(selected['candidate']['decoded'] == {k: q['candidate'][k] for k in ('bytes', 'sha256')} and
                selected['candidate'] in files + refs, 'Source postimage mapping mismatch: ' + q['path'])
        if args.originals:
            for pin in [q['candidate'], q['current']]:
                if pin:
                    require(fp(Path(pin['file']).read_bytes()) == {k: pin[k] for k in ('bytes', 'sha256')}, 'Mapped original source changed: ' + pin['file'])
    require(manifest['currentProductionGeometry'] == 'RAW' and manifest['coordinatedRuntimeBundleRequired'] == 15 and
            not any(manifest['acceptance'].values()) and not manifest['fullSourceDependenciesOrBuildReconstructionClaim'], 'Declared scope mismatch')
    result = {'schema': 'tube-retirement-and-ordinary-V4-archive-verification/v1', 'complete': True,
              'manifest': fp(manifest_path.read_bytes()), 'mode': 'stored-decoded-and-originals' if args.originals else 'stored-and-decoded',
              'localPayloadFiles': len(files), 'exactPriorReferences': len(refs), 'storedTreeBytesBeforeOutput': stored,
              'storedPayloadBytes': manifest['bytes']['storedPayload'], 'decodedLocalPayloadBytes': manifest['bytes']['decodedLocalPayload'],
              'storedByteCap': manifest['storedByteCap'], 'runtimePostimages': 15, 'focusedTests': 14, 'fixture': 1,
              'retirement': {'observations': 71, 'advances': 70, 'actualPNGs': 6, 'actualMovies': 1, 'wordSidecars': 2},
              'ordinaryV4': {'seed': 6238, 'steps': 1366, 'actualPNGs': 2, 'actualMovies': 0, 'wordSidecars': 2, 'phases': dict(phases), 'stop': v4['stop']},
              'resourcesBuildTestsOrArchivedCodeExecuted': False, 'qualityFPSOrAdoptionAcceptance': False}
    text = json.dumps(result, indent=2) + '\n'
    if args.output:
        output.write_text(text)
        require(sum(p.stat().st_size for p in HERE.rglob('*') if p.is_file()) < manifest['storedByteCap'], 'Output exceeds archive cap')
    print(text, end='')

if __name__ == '__main__':
    main()
