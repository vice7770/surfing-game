#!/usr/bin/env python3
"""Root-run archive of finished mature capture and steering trials; runs no producers."""
from pathlib import Path
from collections import Counter
import argparse
import gzip
import hashlib
import json
import os

ROOT = Path('/Users/regina/Desktop/Projects/surfing-game')
TMP = Path('/private/tmp')
OUT = ROOT / 'docs/research/tube-mature-interior-and-steering-2026-10-05'
PRIOR = ROOT / 'docs/research/tube-formation-and-gameplay-2026-10-05'
M = TMP / 'tube-c-mature-mouth-inspection-native-20261005'
F = TMP / 'tube-c-line-steering-native-20261005'
C = TMP / 'tube-c-line-steering-clock-20261005'
Q = TMP / 'tube-c-line-steering-initial-qualification-20261005'
R = TMP / 'tube-reference-refresh-20261005'
ORIGINAL_MOV = Path('/Users/regina/Desktop/Screen Recording 2026-10-03 at 17.52.10.mov')
PLAN = {}
REFERENCES = {}
PRIOR_FILES = None


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def load(path):
    return json.loads(Path(path).read_bytes())


def pin(path):
    path = Path(path)
    data = path.read_bytes()
    return {'file': str(path), 'bytes': len(data), 'sha256': sha(data)}


def verify(record, base=None):
    path = Path(record['file'])
    if not path.is_absolute():
        require(base is not None, 'Relative direct pin has no explicit base')
        path = base / path
    actual = pin(path)
    require(actual['bytes'] == record['bytes'] and actual['sha256'] == record['sha256'],
            'Direct input changed: ' + str(path))
    return path


def retain(path, relative, compressed=False):
    relative = str(relative) + ('.gz' if compressed else '')
    require(relative not in PLAN, 'Duplicate archive destination: ' + relative)
    PLAN[relative] = {'original': pin(path), 'encoding': 'gzip' if compressed else 'identity'}


def complete(path):
    result = load(path)
    require(result.get('complete') is True, 'Incomplete required producer: ' + str(path))
    return result


def prior_reference(record):
    """One direct lookup in the preceding curated archive, without ancestor traversal."""
    global PRIOR_FILES
    if PRIOR_FILES is None:
        manifest = complete(PRIOR / 'manifest.json')
        PRIOR_FILES = {row['original']['file']: row for row in manifest['files']}
    require(record['file'] in PRIOR_FILES, 'Direct reference missing from preceding archive: ' + record['file'])
    item = PRIOR_FILES[record['file']]
    original = item['original']
    require(original['bytes'] == record['bytes'] and original['sha256'] == record['sha256'],
            'Direct reference does not match preceding archive')
    archived = PRIOR / item['path']
    stored = archived.read_bytes()
    require(len(stored) == item['archivedBytes'] and sha(stored) == item['archivedSha256'],
            'Preceding archived bytes changed: ' + str(archived))
    raw = gzip.decompress(stored) if item['encoding'] == 'gzip' else stored
    require(len(raw) == original['bytes'] and sha(raw) == original['sha256'],
            'Preceding archive original bytes changed')
    REFERENCES[record['file']] = {'original': original,
        'archive': '../' + PRIOR.name + '/' + item['path'],
        'archivedBytes': item['archivedBytes'], 'archivedSha256': item['archivedSha256'],
        'encoding': item['encoding'], 'decompressedBytesVerified': True}
    return raw


def checks(path, destination):
    result = complete(path)
    require(result.get('resourcesStarted') is False and result.get('portsProbed') is False,
            'Helper receipt unexpectedly started resources')
    if 'sourcePostUnchanged' in result:
        require(result['sourcePostUnchanged'] is True, 'Helper source changed')
    rows = result['checks']
    if isinstance(rows, dict):
        rows = list(rows.values())
    require(rows, 'No actual checks in completed helper receipt')
    for row in rows:
        require(row['run'] is True and row['exitCode'] == 0, 'Helper check did not pass')
        source = verify(row['log'])
        retain(source, destination + '/logs/' + source.name)
    retain(path, destination + '/' + Path(path).name)
    return result


def preparation(base, destination, mature=False):
    seal = complete(base / 'seal.json')
    require(seal['rootAuthorized'] is True, 'Preparation seal is not root authorized')
    for key in ['preparationInputs', 'preparationFreeze', 'helperReadiness', 'rootHelperChecks']:
        verify(seal[key])
    for record in seal['helperPins']:
        source = verify(record)
        require(source.is_relative_to(base), 'Unexpected external local preparation source')
        retain(source, destination + '/preparation/' + str(source.relative_to(base)))
    # Steering seals bind the eleven source files separately from their actual binder/readiness.
    if not mature:
        for name in ['inputs.json', 'prep/freeze.json', 'root-readiness.json']:
            retain(base / name, destination + '/preparation/' + name)
        complete(base / 'root-readiness.json')
    retain(base / 'seal.json', destination + '/preparation/seal.json')
    checks(base / 'root-helper-checks.json', destination + '/root-checks')
    if mature:
        checks(base / 'root-camera-syntax-checks.json', destination + '/root-checks')
        verify(seal['rootCameraSyntaxChecks'])
    inputs = load(base / 'inputs.json')
    require(inputs['resourcesStarted'] is False and inputs['portsProbed'] is False,
            'Source preparation declaration changed')
    for record in inputs['borrowedHelperPins']:
        prior_reference(record)
    for key in ['approvedCandidateSeal', 'approvedApplicationBuild', 'approvedDiagnosticBuild',
                'diagnosticModule', 'sourceReadiness', 'replayReference', 'observerFields',
                'knownCReport', 'knownCOwner', 'acceptedReferenceReport', 'acceptedReferenceTrace',
                'acceptedReferenceOwner', 'acceptedReferenceInitialLoft']:
        if key in inputs:
            prior_reference(inputs[key])
    return seal


def closure(owner, label):
    require(owner.get('independentClosureValid') is True and owner.get('protectedPortsPreserved') is True
            and not owner.get('remainingOwnedPids') and all(owner['closedPorts'].values()),
            'Native resources or protected previews not closed/preserved: ' + label)


def owner_files(base, destination, mature=False):
    retain(base / 'candidate-first-owner.json', destination + '/owner.json')
    retain(base / 'candidate-first-owner.log', destination + '/owner.log')
    launcher = base / 'candidate-first-launcher.json' if mature else base / 'candidate-first/launcher.json'
    retain(launcher, destination + '/capture/launcher.json')


def capture(base, destination, report):
    retain(base / 'candidate-first/report.json', destination + '/capture/report.json', True)
    artifacts = {record['file']: record for record in report['artifacts']}
    for record in report.get('loftSnapshots', []):
        previous = artifacts.get(record['file'])
        require(previous is None or (previous['bytes'], previous['sha256'])
                == (record['bytes'], record['sha256']), 'Conflicting artifact/loft pin')
        artifacts[record['file']] = record
    for record in artifacts.values():
        source = verify(record, base / 'candidate-first')
        require(source.parent == base / 'candidate-first', 'Unexpected nested capture artifact')
        retain(source, destination + '/capture/' + source.name,
               source.suffix == '.ndjson' or source.name.startswith('loft-'))
    return artifacts


def standing_intervals(rows):
    intervals = []
    for row in rows:
        if row['ride']['phase'] != 'standing':
            continue
        step = row['step']
        if intervals and step == intervals[-1]['lastStep'] + 1:
            intervals[-1]['lastStep'] = step
            intervals[-1]['steps'] += 1
        else:
            intervals.append({'firstStep': step, 'lastStep': step, 'steps': 1})
    return intervals


def reference_review():
    manifest = load(R / 'manifest.json')
    require(manifest['schema'] == 'tube-visual-reference-refresh/v1'
            and manifest['localSource']['path'] == str(ORIGINAL_MOV)
            and ORIGINAL_MOV.stat().st_size == manifest['localSource']['bytes'],
            'Reference manifest does not bind the original October3 recording')
    remote = manifest['remoteSource']
    require(remote['url'] == 'https://www.youtube.com/watch?v=N1XOaxIuVT0'
            and remote['requestedStartSeconds'] == 120 and remote['requestedEndSeconds'] == 150
            and remote['actualRetainedScreenshotsSeconds'] == [124, 149, 154]
            and remote['extraViewExplicitlyOutsideInterval'] == [154]
            and remote['remoteMediaDownloaded'] is False,
            'Reference interval or supplementary-frame qualification changed')
    names = ['oct3-contact-sheet.jpg', 'oct3-13s.jpg', 'oct3-18s.jpg', 'oct3-27s.jpg',
             'youtube-2m04s.jpg', 'youtube-2m29s.jpg', 'youtube-2m34s-extra.jpg']
    require({row['name'] for row in manifest['files']} == set(names)
            and len(manifest['files']) == 7, 'Reference image set is incomplete')
    for row in manifest['files']:
        source = verify({'file': row['name'], 'bytes': row['bytes'], 'sha256': row['sha256']}, R)
        retain(source, 'reference-review/' + source.name)
    retain(R / 'visual-acceptance.md', 'reference-review/visual-acceptance.md')
    retain(R / 'manifest.json', 'reference-review/manifest.json')
    return {'review': pin(R / 'visual-acceptance.md'), 'manifest': pin(R / 'manifest.json'),
        'originalMov': manifest['localSource'], 'originalMovCopied': False,
        'remoteSource': remote, 'supplementaryFrameSeconds': 154,
        'supplementaryFrameOutsideRequestedInterval': True, 'visualReferenceOnly': True}


def prepare(corrected_terminal):
    require(corrected_terminal, 'Root must confirm the corrected run is terminal before --corrected-terminal')
    require(not OUT.exists(), 'Archive already exists; refusing overwrite')
    # This guard is deliberately before opening any corrected native report.
    corrected_owner = complete(C / 'candidate-first-owner.json')
    require(corrected_owner['exitCode'] == 0 and corrected_owner['firstFailure'] is None
            and corrected_owner['sourceBuildHelpersPostUnchanged'] is True,
            'Corrected steering owner has not finished successfully')
    closure(corrected_owner, 'corrected steering')
    require(corrected_owner['applicationAndDiagnosticBytesUnchanged'] is True
            and corrected_owner['geometryOrPhysicsChanged'] is False,
            'Corrected steering changed runtime bytes')

    mature_seal = preparation(M, 'mature-interior', True)
    mature_owner = complete(M / 'candidate-first-owner.json')
    require(mature_owner['exitCode'] == 0 and mature_owner['firstFailure'] is None
            and mature_owner['sourceBuildHelpersPostUnchanged'] is True,
            'Mature capture owner incomplete')
    closure(mature_owner, 'mature interior')
    require(mature_owner['protectedListenersInitially'] == mature_owner['protectedListenersFinally'],
            'Mature capture changed protected listener identities')
    mature = complete(M / 'candidate-first/report.json')
    require(mature['firstFailure'] is None and mature['ownedBrowserClose'] is True
            and mature['stepCount'] == 0 and mature['steps'] == []
            and mature['stop']['step'] == 0 and mature['traceBytes'] == 0
            and mature['pngCount'] == 2, 'Mature capture is not the accepted zero-step observation')
    inspection = mature['inspection']
    selector = inspection['selector']
    require(inspection['available'] is True and inspection['openingOrBodyPassageClaim'] is False
            and inspection['nonmutation']['unchanged'] is True
            and inspection['nonmutation']['checkedLoftArrays'] == 37
            and selector['row'] == 37 and selector['inwardRow'] == 38 and selector['front'] == 41
            and selector['phase'] == selector['inwardPhase'] == 1
            and selector['weight'] == selector['inwardWeight'] == 1,
            'Mature stored geometry observation changed')
    mature_artifacts = capture(M, 'mature-interior', mature)
    sidecar_path = verify(mature['sidecar'], M / 'candidate-first')
    sidecar = load(sidecar_path)
    require(len(sidecar['arrays']) == 37, 'Mature sidecar does not contain full37 arrays')
    require(len(mature_artifacts) == 4 and mature_artifacts['steps.ndjson']['bytes'] == 0,
            'Mature zero-row trace/artifact set changed')
    owner_files(M, 'mature-interior', True)

    preparation(F, 'steering-initial-failure')
    qualification = complete(Q / 'result.json')
    require(qualification['originalOwnerAccepted'] is False
            and qualification['nativeGameplayResultAvailable'] is False
            and qualification['inputsTaken'] == 0
            and qualification['initialConfigExact'] is True
            and all(qualification['initialPublishedBodyFieldsExact'].values())
            and all(qualification['physicalAndVisualClockFieldsExact'].values())
            and qualification['cacheRevision']['actual'] == 4
            and qualification['cacheRevision']['reference'] == 5
            and qualification['directSourceBuildHelpersPostUnchanged'] is True
            and qualification['independentResourcesClosed'] is True
            and qualification['humanPreviewsPreserved'] is True
            and qualification['tubeEntryOrImprovementClaim'] is False,
            'Failed steering attempt lacks its complete metadata-only qualification')
    verify(qualification['report'])
    verify(qualification['owner'])
    verify(qualification['source'])
    prior_reference(qualification['reference'])
    failed_owner = load(F / 'candidate-first-owner.json')
    require(failed_owner['complete'] is False and failed_owner['exitCode'] == 1,
            'Original failed steering owner was changed')
    closure(failed_owner, 'failed steering')
    failed = load(F / 'candidate-first/report.json')
    require(failed['complete'] is False and failed['stepCount'] == 0 and failed['steps'] == []
            and failed['chromeClosed'] is True and failed['firstFailure'] == qualification['originalFailure'],
            'Original zero-input steering failure changed')
    capture(F, 'steering-initial-failure', failed)
    owner_files(F, 'steering-initial-failure')
    retain(Q / 'result.json', 'steering-initial-failure/root-qualification.json')

    corrected_seal = preparation(C, 'steering-corrected')
    corrected = complete(C / 'candidate-first/report.json')
    require(corrected['firstFailure'] is None and corrected['chromeClosed'] is True
            and corrected['sealSha256'] == pin(C / 'seal.json')['sha256']
            and corrected['stepCount'] == len(corrected['steps']), 'Corrected native report is incomplete')
    prefix = corrected['prefixComparison']
    initial_loft = corrected['initialLoftComparison']
    require(prefix['complete'] is True and prefix['exactPhysicalAndActorPrefixClaim'] is True
            and prefix['initialMatched'] is True and prefix['configMatched'] is True
            and prefix['requiredThrough'] == prefix['comparedSteps']
            == prefix['firstStandingStep'] == prefix['revisionRelativeCheckedThrough'] == 1372
            and prefix['physicalClockKeys'] == ['workerSeaTime', 'visualClock', 'waterTime'],
            'Corrected physical-clock/actor prefix is not accepted through1372')
    require(initial_loft['complete'] is True and initial_loft['arrayCount'] == 37
            and initial_loft['countsMatched'] is True and initial_loft['rawArraysMatched'] is True
            and len(initial_loft['arrayRecords']) == 37,
            'Corrected initial37 raw array comparison is incomplete')
    require(corrected['entry']['fullBodyClearancePass'] is False,
            'Unexpected tube acceptance; root must review the archive wording')
    capture(C, 'steering-corrected', corrected)
    owner_files(C, 'steering-corrected')
    for record in [corrected_seal['previousFailedReport'], corrected_seal['previousFailedOwner'],
                   corrected_seal['previousFailureRootQualification']]:
        verify(record)
    reference = json.loads(prior_reference(corrected_seal['acceptedReferenceReport']))
    reviewed_reference = reference_review()
    rows = corrected['steps']
    phases = dict(Counter(row['ride']['phase'] for row in rows))
    interventions = [row for row in rows if row['inputView']['ride']['phase'] == 'standing']
    nonzero = [row['step'] for row in interventions if row['input']['steer'] != 0]
    summary = {'schema': 'mature-interior-and-steering-archive-summary/v1', 'complete': True,
        'mature': {'steps': 0, 'pngs': 2, 'full37Sidecars': 1, 'traceRows': 0,
            'ownerElapsedSeconds': mature_owner['elapsedSeconds'], 'selectedStoredRow': selector['row'],
            'inwardStoredRow': selector['inwardRow'], 'front': selector['front'],
            'phase': selector['phase'], 'storedWeight': selector['weight'],
            'eyeClearance': inspection['cameraDerivation']['eyeAnchor']['air']['clearance'],
            'nonmutation': inspection['nonmutation'], 'exposedMouthAccepted': False,
            'visualQualityAccepted': False, 'playabilityAccepted': False},
        'initialFailure': {'inputs': 0, 'gameplayResult': False,
            'cacheRevision': qualification['cacheRevision'], 'qualifiedOwnerAccepted': False},
        'corrected': {'stepCount': corrected['stepCount'], 'phaseCounts': phases,
            'standingIntervals': standing_intervals(rows), 'stop': corrected['stop'],
            'prefixComparison': prefix, 'initialLoftComparison': initial_loft,
            'firstStandingInputStep': interventions[0]['step'] if interventions else None,
            'firstNonzeroSteeringStep': nonzero[0] if nonzero else None,
            'nonzeroStandingSteeringSteps': len(nonzero), 'entry': corrected['entry'],
            'video': corrected.get('video'), 'normalMenuAcceptance': corrected['normalMenuAcceptance'],
            'tubePassageAccepted': False, 'gameplayImprovementClaim': False},
        'formationReference': {'stepCount': reference['stepCount'],
            'phaseCounts': dict(Counter(row['ride']['phase'] for row in reference['steps'])),
            'standingIntervals': standing_intervals(reference['steps']), 'stop': reference['stop']},
        'visualReferenceReview': reviewed_reference,
        'runtimeChanged': False, 'performanceAccepted': False}
    retain(Path(__file__).resolve(), 'archive-builder.py')
    return summary


def readme(summary):
    mature = summary['mature']
    corrected = summary['corrected']
    intervals = ', '.join(str(row['firstStep']) + '–' + str(row['lastStep'])
                          + ' (' + str(row['steps']) + ' steps)'
                          for row in corrected['standingIntervals']) or 'none'
    return f"""# Mature interior and steering — 2026-10-05

The mature interior capture completed at the initial replay epoch, before any
physics advance: 0 input rows, 2 PNGs and one complete 37-array drawn loft sidecar.
It selected stored row 37 toward row 38 on front 41, both phase 1 and stored weight 1.
The floor-to-inner-roof gap at the eye anchor is {mature['eyeClearance']:.6f}m. The camera nonmutation
checks passed and the original renderer/camera state was restored. The finite
owner took {mature['ownerElapsedSeconds']:.3f}s including startup and cleanup,
closed its owned resources and preserved the 4312/4313/4314 listener identities.

The actual PNG shows a rounded hollow on the left alongside a dark wedge,
rough sheet and dithering. It is a geometry-only interior inspection. It does
not establish an exposed mouth, acceptable visual quality, playable tubes,
rider clearance or a tube passage. These visual observations are the root
agent's capture review; raw images and exact sidecar words are retained.
Stored weight 1 certifies the selected local row, rather than every screen pixel.
The dark wedge's ownership by the loft or another surface/background is unproved.

The first steering attempt failed before any input at step 0 because the absolute
drawn-surface cache revision was 4 rather than reference 5. Initial configuration,
published body fields and all three physical/visual clock fields matched. The
original failed owner/report remain unchanged with the root qualification.
This is a startup metadata failure and provides no gameplay result.

The finished [visual reference review](reference-review/visual-acceptance.md),
its source manifest, October 3 contact sheet and frames at 13, 18 and 27 seconds,
and YouTube screenshots are preserved exactly. The 2:04 and 2:29 screenshots
are within the requested 2:00–2:30 segment. **The 2:34 screenshot is supplementary and outside
the requested interval.** The full original
[October 3 MOV](</Users/regina/Desktop/Screen Recording 2026-10-03 at 17.52.10.mov>)
is linked without copying its 343,985,118 bytes. These references define visual
acceptance criteria; they do not establish geometry, physics, FPS or gameplay
acceptance for the current runtime.

The corrected trial keeps all three physical clocks exact, compares surface
revision increments relative to each initial value, and verifies all 37 initial
loft arrays by raw bytes, hashes, counts and metadata. Its accepted inputs,
actor outputs and clock prefix match through step 1372, the first standing
output. After that output, only the standing steering input changes to the
production pilot's full requested steer; crouch 1/compress 1 and other declared
controls remain. Runtime, app/diagnostic bytes, geometry and physics are reused.

The completed corrected trial contains {corrected['stepCount']} steps. Published
phase counts are {json.dumps(corrected['phaseCounts'], sort_keys=True)}. Its
standing intervals are {intervals}. Its recorded stop is
{json.dumps(corrected['stop'], sort_keys=True)}. The first nonzero steering
step is {corrected['firstNonzeroSteeringStep']}. summary.json records the actual
entry detector, bounded movie metadata and the preceding formation control's
separate result. No gameplay improvement, sustained riding, tube passage or
performance acceptance is inferred from completion of the capture contract.

All corrected outcome statements above are extracted from the final report
only after root confirms the run is terminal. The builder refuses to open that
report until its finite owner is complete, closed and unchanged. It runs no
tests, builds, simulations, browser/native sessions, ports or Git operations.

The archive preserves direct new source/preparation/binding/check/seal receipts,
owners, launchers, exact reports/traces/complete lofts and original PNG/WEBM.
Direct shared helpers and approved C build/reference evidence are linked through
the single preceding ../tube-formation-and-gameplay-2026-10-05 archive; neither
ancestry inventories nor runtime/dependency/dist trees are copied. Original
temporary paths in retained receipts describe their original environment, so
this evidence is not a standalone runnable checkout. Preparation receipts retain
their original pending outcome fields; final producers are separate evidence.

Raw JSON reports, NDJSON and loft sidecars are stored as .gz files. manifest.json
records original and archived byte/SHA-256 pins, with exact decompression
verification. PNG and WEBM remain byte-for-byte originals. The zero-row mature
trace is preserved as an exact empty payload. No input or old output is rewritten.
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--corrected-terminal', action='store_true',
                        help='Root confirms corrected native invocation and owner are terminal')
    args = parser.parse_args()
    summary = prepare(args.corrected_terminal)
    stage = OUT.with_name('.' + OUT.name + '.building')
    require(not stage.exists(), 'Prior archive staging exists; inspect before retrying')
    stage.mkdir(parents=True)
    records = []
    for relative, entry in PLAN.items():
        original = entry['original']
        raw = Path(original['file']).read_bytes()
        require(len(raw) == original['bytes'] and sha(raw) == original['sha256'],
                'Input changed after preflight: ' + original['file'])
        stored = gzip.compress(raw, compresslevel=9, mtime=0) if entry['encoding'] == 'gzip' else raw
        target = stage / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(stored)
        actual = target.read_bytes()
        decoded = gzip.decompress(actual) if entry['encoding'] == 'gzip' else actual
        require(decoded == raw and sha(decoded) == original['sha256'], 'Archive byte verification failed')
        records.append({'path': relative, 'encoding': entry['encoding'], 'original': original,
            'archivedBytes': len(actual), 'archivedSha256': sha(actual), 'decompressedBytesVerified': True})
    derived = {}
    for name, raw in [('README.md', readme(summary).encode('utf-8')),
                      ('summary.json', (json.dumps(summary, indent=2) + '\n').encode('utf-8'))]:
        (stage / name).write_bytes(raw)
        derived[name] = {'bytes': len(raw), 'sha256': sha(raw)}
    manifest = {'schema': 'mature-interior-and-steering-curated-archive/v1', 'complete': True,
        'output': str(OUT), 'files': records, 'derived': derived,
        'directPrecedingArchiveManifest': pin(PRIOR / 'manifest.json'),
        'externalReferences': list(REFERENCES.values()), 'correctedTerminalConfirmedByRoot': True,
        'initialFailedSteeringOwnerAccepted': False, 'tubePassageAccepted': False,
        'visualQualityAccepted': False, 'performanceAccepted': False,
        'originalOctober3MovCopied': False, 'reference2m34SupplementaryOutsideRequestedInterval': True,
        'runtimeTreeCopied': False, 'dependenciesCopied': False, 'distCopied': False}
    (stage / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    require(not OUT.exists(), 'Archive appeared during preflight; refusing overwrite')
    os.rename(stage, OUT)
    print(json.dumps({'complete': True, 'output': str(OUT), 'files': len(records),
        'directExternalReferences': len(REFERENCES), 'correctedSteps': summary['corrected']['stepCount']}, indent=2))


if __name__ == '__main__':
    main()
