#!/usr/bin/env python3
"""Root-run direct archive of the completed larger mouth/body-envelope trial."""
from pathlib import Path
import gzip
import hashlib
import json

ROOT = Path('/Users/regina/Desktop/Projects/surfing-game')
TMP = Path('/private/tmp')
CHECKS = TMP / 'tube-open-mouth-crossing-20261005/body-mouth-root-checks.json'
W = TMP / 'tube-open-mouth-body-clearance-native-20261005'
OUT = ROOT / 'docs/research/tube-body-mouth-2026-10-05'
PRIOR = ROOT / 'docs/research/tube-open-mouth-2026-10-05/manifest.json'
BUILD_ID = 'tube-open-mouth-body-clearance-20261005'


def require(value, message):
    if not value:
        raise RuntimeError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def load(path):
    return json.loads(path.read_bytes())


def pin(path):
    raw = path.read_bytes()
    return {'file': str(path), 'bytes': len(raw), 'sha256': sha(raw)}


def verify(record, base=None):
    path = Path(record['file'])
    if not path.is_absolute():
        require(base is not None, 'Relative artifact requires its producer directory')
        path = base / path
    actual = pin(path)
    require((actual['bytes'], actual['sha256']) == (record['bytes'], record['sha256']),
            'Changed direct input: ' + str(path))
    return path


def complete(path):
    value = load(path)
    require(value.get('complete') is True, 'Incomplete required producer: ' + str(path))
    return value


def prepare():
    require(not OUT.exists(), 'Refusing to overwrite an existing archive')
    # No live report is read: its finite owner must first prove terminal success and closure.
    owner = complete(W / 'owner.json')
    require(owner['schema'] == 'open-mouth-owner-body-clearance/v1'
            and owner['exitCode'] == 0 and owner['firstFailure'] is None
            and owner['preExecutionPinsVerified'] is True
            and owner['postExecutionPinsVerified'] is True
            and owner['copiedAndLiveSourcePinsPostVerified'] is True
            and owner['protectedPreserved'] is True
            and owner['protectedBefore'] == owner['protectedAfter']
            and not owner['cleanupFailures'] and not owner['ownedMembersAfterCleanup']
            and set(owner['closedPorts']) == {'4301', '9711'}
            and all(owner['closedPorts'].values())
            and owner['cleanupElapsedSeconds'] <= 7 and owner['elapsedSeconds'] <= 660,
            'Native owner is not complete, closed, unchanged and preview preserving')
    observation = owner['observation']
    require(observation['currentFull37AndRawFrontEncodingVerified'] is True
            and observation['perViewPublicGuardsVerified'] is True
            and observation['bothRowSampledMouthGapsAtLeast1p20Verified'] is True
            and observation['geometryQualityOrExposedRunEndAcceptance'] is False,
            'Native byte/restoration/two-row mouth checks are incomplete')
    seal = complete(W / 'seal.json')
    require(seal['schema'] == 'open-mouth-capture-body-clearance/v1'
            and seal['rootAuthorized'] is True
            and owner['sealSha256'] == pin(W / 'seal.json')['sha256'],
            'Native owner does not bind the authorized current seal')

    checks = complete(CHECKS)
    require(checks['schema'] == 'body-mouth-root-checks/v1'
            and checks['checks'] and all(row['exitCode'] == 0 for row in checks['checks']),
            'Actual root terminal checks are incomplete')
    # Read actual test counts; this trial does not inherit the first trial's 26-test scope.
    tests = [row for row in checks['checks'] if 'testsPassed' in row]
    builds = [row for row in checks['checks'] if row.get('buildId') == BUILD_ID]
    require(tests and builds and all(row['testsPassed'] > 0 for row in tests),
            'Current tests/build identity are not recorded')
    expected = {'boundedCProfile.ts', 'sweptLoft.ts',
                'boundedCConsumers.test.ts', 'boundedCOpenMouth.test.ts'}
    require(len(checks['sources']) == 4
            and {Path(row['file']).name for row in checks['sources']} == expected,
            'Root tested-source receipt has unexpected files')
    prior = complete(PRIOR)
    require(prior['schema'] == 'open-mouth-curated-archive/v1', 'Unexpected preceding archive')
    prior_reference = {'manifest': pin(PRIOR),
                       'link': '../tube-open-mouth-2026-10-05/manifest.json',
                       'copyOrRecursiveTraversal': False}
    plan = []

    def retain(path, relative, compressed=False):
        destination = relative + ('.gz' if compressed else '')
        require(destination not in {row['path'] for row in plan}, 'Duplicate archive destination')
        plan.append({'path': destination, 'original': pin(path),
                     'encoding': 'gzip' if compressed else 'identity'})

    retain(CHECKS, 'checks/root-checks.json')
    for row in checks['checks']:
        path = verify(row['log'])
        retain(path, 'checks/' + path.name)
    renderer_receipt = TMP / 'tube-open-mouth-crossing-20261005/body-renderer-root-checks.json'
    renderer = complete(renderer_receipt)
    require(renderer['schema'] == 'body-mouth-renderer-root-checks/v1'
            and renderer['exitCode'] == 0 and renderer['filesPassed'] == 1 and renderer['testsPassed'] == 14,
            'Actual final geometry/renderer check is incomplete')
    retain(renderer_receipt, 'checks/renderer-root-checks.json')
    retain(verify(renderer['log']), 'checks/body-clearance-renderer-tests.log')
    for record in checks['sources']:
        retain(verify(record), 'source/' + Path(record['file']).name)
    for name in ['prepare.py', 'run.py', 'native.mjs', 'mature-mouth.mjs',
                 'inspection-bridge.mjs', 'inputs.json', 'README.md', 'source-freeze.json',
                 'build.json', 'seal.json', 'prepare-result.json', 'root-helper-checks.json']:
        retain(W / name, 'native/' + name)
    preparation = complete(W / 'prepare-result.json')
    require(preparation['schema'] == 'open-mouth-preparation-result-body-clearance/v1'
            and preparation['sources'] == 8
            and preparation['resourcesStarted'] is False and preparation['portsProbed'] is False
            and preparation['executedTestsOrBuilds'] is False,
            'Unexpected current native preparation scope')
    for key in ['build', 'sourceFreeze', 'seal']:
        verify(preparation[key])
    for record in seal['helpers']:
        verify(record)
    helper_checks = complete(W / 'root-helper-checks.json')
    require(helper_checks['schema'] == 'open-mouth-root-helper-checks/v1'
            and helper_checks['checks'] and all(row['exitCode'] == 0 for row in helper_checks['checks'])
            and helper_checks['nativeExecutedByReceipt'] is False,
            'Actual current helper checks are incomplete')
    verify(helper_checks['preparation'])
    sealed_helpers = {row['file']: row for row in seal['helpers']}
    for record in helper_checks['helpers']:
        verify(record)
        require(sealed_helpers[record['file']] == record, 'Current helper differs from checked source')

    freeze = complete(W / 'source-freeze.json')
    require(freeze['schema'] == 'open-mouth-source-freeze-body-clearance/v1'
            and freeze['buildId'] == BUILD_ID and len(freeze['files']) == 8,
            'Unexpected current source freeze')
    build = load(verify(seal['approvedApplicationBuild']))
    require(build['schema'] == 'open-mouth-build-body-clearance/v1' and build['build'] == BUILD_ID
            and len(build['sources']) == len(build['liveSources']) == 8
            and build['sourceFreeze'] == seal['sourceFreeze'] == owner['sourceFreeze']
            and owner['build'] == seal['approvedApplicationBuild'],
            'Native current source/build binding differs')
    verify(build['sourceFreeze'])
    for record in build['assets'] + build['sources'] + build['liveSources']:
        verify(record)
    frozen_by_live = {}
    for record in freeze['files']:
        verify(record['live']); verify(record['frozen'])
        require((record['live']['bytes'], record['live']['sha256'])
                == (record['frozen']['bytes'], record['frozen']['sha256']),
                'Current source freeze differs from the live source')
        frozen_by_live[record['live']['file']] = record['frozen']
    for record in checks['sources']:
        frozen = frozen_by_live.get(record['file'])
        require(frozen is not None and (frozen['bytes'], frozen['sha256'])
                == (record['bytes'], record['sha256']),
                'Native source does not match the exact tested current geometry/regression')

    report_path = W / 'candidate-first/report.json'
    report = complete(report_path)
    require(report['schema'] == 'open-mouth-capture-native-body-clearance/v1'
            and report['firstFailure'] is None and report['ownedBrowserClose'] is True
            and report['sealSha256'] == owner['sealSha256'] and not report['browserErrors']
            and 0 <= report['stepCount'] <= 360
            and len(report['steps']) == report['stepCount'] == report['stop']['step']
            and observation['stepCount'] == report['stepCount'] and report['pngCount'] == 4,
            'Unexpected actual native terminal outcome')
    require(report['policy']['geometryOnly'] is True
            and report['policy']['normalProductionGameplay'] is False
            and report['policy']['priorGeometryEpochOrSelectorEqualityClaim'] is False
            and report['policy']['minimumBothRowMouthGap'] == 1.20
            and report['policy']['fullBodyContainmentCertification'] is False,
            'Native observation scope claims unproved gameplay/body certification')
    require(report['applicationBuildRequest']['build'] == BUILD_ID
            and report['applicationBuildRequest']['checkedBeforeReplayAndStepping'] is True
            and report['approvedApplicationBuild'] == seal['approvedApplicationBuild']
            and report['sourceFreeze'] == seal['sourceFreeze'], 'Actual served build binding differs')
    comparison = report['fixedInteriorReferenceComparison']
    require(comparison['poseAndProjectionExact'] is True
            and comparison['currentFull37AndRawFrontWordsCaptured'] is True
            and comparison['pairedCloneCameraUnchanged'] is True
            and all(comparison[key] is False for key in ['geometryEqualityAsserted',
                    'epochEqualityAsserted', 'selectorEqualityAsserted', 'fullSolverOrPixelEqualityClaim']),
            'Prior interior pose comparison incorrectly asserts old geometry equality')
    inspection = report['inspection']
    require(inspection['available'] is True and inspection['primaryView'] == 'side-mouth'
            and inspection['secondaryView'] == 'fixed-prior-interior'
            and inspection['bodyClearanceCertification'] is False
            and inspection['pairedCloneCameraWordsCompared'] is True,
            'Required current primary/secondary inspection did not complete')
    selector = inspection['selector']
    gaps = [selector['mouth']['clearance'], selector['inwardMouth']['clearance']]
    require(selector['minimumMouthClearance'] == 1.20 and min(gaps) >= 1.20
            and selector['bodyClearanceCertification'] is False,
            'Both selected sampled mouth gaps do not meet the declared threshold')
    mouth = inspection['sideMouth']
    for guard in [inspection['nonmutation'], inspection['interiorNonmutation'], mouth['nonmutation']]:
        require(guard['checked'] is True and guard['unchanged'] is True
                and guard['normalRenderRestored'] is True and guard['checkedLoftArrays'] == 37,
                'Per-view current geometry/restoration guard is incomplete')
    require(mouth['complete'] is True and mouth['cloneCameraWordsCompared'] is True
            and mouth['exposedRunEndMouthAcceptance'] is False
            and mouth['visualAcceptance'] is False and mouth['passageClaim'] is False
            and mouth['cameraDerivation']['primaryInspection'] is True
            and mouth['cameraDerivation']['fullBodyContainmentCertification'] is False,
            'Primary camera/capture scope changed')
    artifacts = {row['file']: row for row in report['artifacts']}
    require(set(artifacts) == {'normal.png', 'mature-core.png', 'mature-region.png',
                             'side-mouth.png', 'loft-terminal.json', 'steps.ndjson'},
            'Unexpected current native artifact set')
    pngs = [artifacts[name] for name in ['normal.png', 'side-mouth.png',
                                        'mature-core.png', 'mature-region.png']]
    require(sum(row['bytes'] for row in pngs) == report['pngBytes'] == observation['pngBytes']
            and all(0 < row['bytes'] <= 12582912 for row in pngs)
            and report['pngBytes'] <= 50331648,
            'Actual PNG aggregate exceeds the declared capture budget')
    trace = verify(artifacts['steps.ndjson'], report_path.parent)
    require(trace.stat().st_size == report['traceBytes']
            and sum(bool(line) for line in trace.read_bytes().splitlines()) == report['stepCount'],
            'Actual trace byte/row count differs')
    if report['stepCount']:
        retain(trace, 'capture/steps.ndjson', True)
    for name in ['normal.png', 'side-mouth.png', 'mature-core.png', 'mature-region.png']:
        retain(verify(artifacts[name], report_path.parent), 'capture/' + name)
    retain(verify(artifacts['loft-terminal.json'], report_path.parent), 'capture/loft-terminal.json', True)
    retain(W / 'owner.json', 'native/owner.json')
    retain(W / 'launcher.json', 'native/launcher.json')
    retain(report_path, 'capture/report.json', True)
    retain(Path(__file__).resolve(), 'archive-builder.py')
    summary = {'schema': 'body-mouth-archive-summary/v1', 'complete': True,
        'checks': [{'command': row['command'], 'filesPassed': row.get('filesPassed'),
                    'testsPassed': row.get('testsPassed'), 'exitCode': row['exitCode']}
                   for row in checks['checks'] + [renderer]], 'buildId': BUILD_ID,
        'priorArchive': prior_reference,
        'native': {'steps': report['stepCount'], 'pngCount': 4,
                   'sampledMouthGaps': gaps, 'minimumDeclaredGap': 1.20,
                   'ownerElapsedSeconds': owner['elapsedSeconds'],
                   'sourcePostUnchanged': True, 'protectedListenerIdentitiesPreserved': True,
                   'fixedInteriorReferenceComparison': comparison,
                   'sideMouthCameraDerivation': mouth['cameraDerivation']},
        'acceptance': {'controlledStaticBodyEnvelope': True, 'sourceGeometryTests': True,
                       'nativeTwoSampledMouthGapsAtLeast1p20': True,
                       'actualRiderPostureContainment': False, 'ordinaryRide': False,
                       'nativeVisualQuality': False, 'referenceAxialMouth': False, 'performance': False}}
    summary['visualObservation'] = {
        'reviewedByRoot': ['side-mouth.png', 'mature-core.png'],
        'sideMouth': 'Larger exposed cavity; angular lip corner and white/dithered roof cuts remain.',
        'fixedInterior': 'Cloud transmission is visible; a prominent diagonal black strip and angular sheet cuts remain.',
        'referenceQualityAchieved': False,
    }
    return plan, summary


def main():
    plan, summary = prepare()
    # Every actual producer/input gate passes before creating any primary output directory.
    OUT.mkdir(parents=True)
    for row in plan:
        raw = Path(row['original']['file']).read_bytes()
        require((len(raw), sha(raw)) == (row['original']['bytes'], row['original']['sha256']),
                'Input changed after preflight: ' + row['original']['file'])
        stored = gzip.compress(raw, mtime=0) if row['encoding'] == 'gzip' else raw
        target = OUT / row['path']; target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(stored)
        reread = target.read_bytes()
        restored = gzip.decompress(reread) if row['encoding'] == 'gzip' else reread
        require(restored == raw, 'Archive does not restore exact original bytes')
        row['archivedBytes'] = len(reread); row['archivedSha256'] = sha(reread)
        row['decompressedBytesVerified'] = True
    (OUT / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    (OUT / 'manifest.json').write_text(json.dumps({'schema': 'body-mouth-curated-archive/v1',
        'complete': True, 'priorArchive': summary['priorArchive'], 'files': plan}, indent=2) + '\n')
    tests = ', '.join(str(row['testsPassed']) + ' tests across ' + str(row['filesPassed']) + ' files'
                      for row in summary['checks'] if row['testsPassed'] is not None)
    gaps = summary['native']['sampledMouthGaps']
    (OUT / 'README.md').write_text(f'''# Larger bounded-C side mouth — 2026-10-05

This trial raises the pre-fall lip to 0.60 of the actual crest-to-toe height and its fall amplitude to 0.80. Actual cap-to-floor contact still determines impact; curvature/thickness and the common near-impact floor/cap water datum remain guarded by the current provider and loft tests.

The root's actual terminal checks passed {tests} and the TypeScript/Vite build (`{BUILD_ID}`). The four archived geometry/regression snapshots are byte-identical to the tested source and the new native source freeze. The static mesh/contact test checks an overlapping 1.2m-high, 0.6m-wide, 1.6m-deep envelope along the controlled shoreward route of an actual carrier scaled to 3m crest-to-toe height. It independently rejects intersections with every active water triangle. This does not certify the actual rider posture or an ordinary ride.

The completed native capture uses a threshold declared before running: the first joined mature pair, in stored row order, must have positive measured row air and at least 1.20m at both sampled cap64/floor104 gaps. The actual captured gaps are {gaps[0]:.7f}m and {gaps[1]:.7f}m, at step {summary['native']['steps']}. The declared oblique side-mouth view is primary. The fixed prior interior pose/projection and paired region view are secondary. Prior geometry, epoch, selector and pixel equality are not asserted.

Two sampled vertical gaps and static images do not prove horizontal or between-row body clearance, a connected route in the native geometry, actual board/rider entry, sustained riding, an exposed along-crest mouth, visual quality or FPS. Those remain open. The original 0.45/0.60 trial and its smaller native gaps remain in the [preceding archive manifest](../tube-open-mouth-2026-10-05/manifest.json), referenced by its direct SHA-256 without copying its media or traversing its ancestors.

The root reviewed the side-mouth and fixed-interior images. The larger cavity is visible, but the lip remains angular, white/dithered roof cuts persist, and the fixed interior still contains a prominent diagonal black strip. This capture does not satisfy the requested reference quality.

Only new checks, source snapshots, capture/camera producers, direct preparation/build/seal/owner receipts, and new media are retained. PNG bytes are unchanged. Raw report and full loft JSON are gzip-compressed and verified after decompression against each original byte count and SHA-256. This is a compact evidence archive, not a standalone runtime or dependency snapshot.
''')
    print(json.dumps({'complete': True, 'out': str(OUT), 'retainedInputs': len(plan),
                      'manifest': pin(OUT / 'manifest.json')}))


if __name__ == '__main__':
    main()
