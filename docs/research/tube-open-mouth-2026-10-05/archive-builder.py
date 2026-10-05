#!/usr/bin/env python3
"""Root-run compact archive for completed open-mouth checks and native capture.

This is source preparation only until root runs it. Native paths/fields are direct,
and an incomplete owner is rejected before any report payload is read.
"""
from pathlib import Path
import gzip
import hashlib
import json

ROOT = Path('/Users/regina/Desktop/Projects/surfing-game')
TMP = Path('/private/tmp')
CHECKS = TMP / 'tube-open-mouth-crossing-20261005/root-checks.json'
FINAL_BUILD = TMP / 'tube-open-mouth-crossing-20261005/root-final-build.json'
W = TMP / 'tube-open-mouth-native-20261005'
OUT = ROOT / 'docs/research/tube-open-mouth-2026-10-05'
OWNER = W / 'owner.json'
REPORT = W / 'candidate-first/report.json'


def require(value, message):
    if not value:
        raise RuntimeError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def load(path):
    return json.loads(path.read_bytes())


def pin(path):
    data = path.read_bytes()
    return {'file': str(path), 'bytes': len(data), 'sha256': sha(data)}


def verify(record, base=None):
    path = Path(record['file'])
    if not path.is_absolute():
        require(base is not None, 'Relative direct pin requires its producer directory')
        path = base / path
    actual = pin(path)
    require((actual['bytes'], actual['sha256']) == (record['bytes'], record['sha256']),
            'Changed direct input: ' + str(path))
    return path


def complete(path):
    value = load(path)
    require(value.get('complete') is True, 'Required producer is incomplete: ' + str(path))
    return value


def prepare():
    require(not OUT.exists(), 'Refusing to overwrite an existing archive')
    # Check owner first. The builder must never turn a live report into archived evidence.
    owner = complete(OWNER)
    require(owner['schema'] == 'open-mouth-owner/v1'
            and owner['exitCode'] == 0 and owner['firstFailure'] is None
            and owner['preExecutionPinsVerified'] is True
            and owner['postExecutionPinsVerified'] is True
            and owner['copiedAndLiveSourcePinsPostVerified'] is True
            and owner['protectedPreserved'] is True
            and not owner['cleanupFailures'] and not owner['ownedMembersAfterCleanup']
            and all(owner['closedPorts'].values())
            and owner['protectedBefore'] == owner['protectedAfter']
            and owner['cleanupElapsedSeconds'] <= 7 and owner['elapsedSeconds'] <= 660,
            'Native owner is not complete, closed, unchanged and preview preserving')
    seal = complete(W / 'seal.json')
    require(seal['schema'] == 'open-mouth-capture/v1' and seal['rootAuthorized'] is True
            and owner['sealSha256'] == pin(W / 'seal.json')['sha256'],
            'Native owner does not bind the authorized seal')
    require(owner['observation']['currentFull37AndRawFrontEncodingVerified'] is True
            and owner['observation']['perViewPublicGuardsVerified'] is True
            and owner['observation']['geometryQualityOrExposedRunEndAcceptance'] is False,
            'Required current capture byte/restoration checks are missing')
    checks = complete(CHECKS)
    require(checks['schema'] == 'open-mouth-root-checks/v1'
            and checks['nativeExecutedByThisReceipt'] is False
            and checks['ordinaryRideAccepted'] is False,
            'Unexpected root checks/acceptance scope')
    require(len(checks['checks']) == 3 and all(row['exitCode'] == 0 for row in checks['checks']),
            'Actual terminal checks are incomplete')
    focused, barrel, build = checks['checks']
    require((focused['filesPassed'], focused['testsPassed']) == (3, 26)
            and (barrel['filesPassed'], barrel['testsPassed']) == (34, 340)
            and build['buildId'] == 'tube-open-mouth-20261005',
            'Unexpected tested scope or build identity')
    expected_sources = {'boundedCProfile.ts', 'sweptLoft.ts',
                        'boundedCConsumers.test.ts', 'boundedCOpenMouth.test.ts'}
    require({Path(row['file']).name for row in checks['sources']} == expected_sources,
            'Root tested-source receipt does not match this archive')
    plan = []

    def retain(path, name, compressed=False):
        destination = name + ('.gz' if compressed else '')
        require(destination not in {row['path'] for row in plan}, 'Duplicate archive destination')
        plan.append({'path': destination,
                     'original': pin(path), 'encoding': 'gzip' if compressed else 'identity'})

    retain(CHECKS, 'checks/root-checks.json')
    for row in checks['checks']:
        path = verify(row['log'])
        retain(path, 'checks/' + path.name)
    final_build = complete(FINAL_BUILD)
    require(final_build['schema'] == 'open-mouth-final-build/v1'
            and final_build['exitCode'] == 0 and final_build['buildId'] == 'tube-open-mouth-20261005'
            and final_build['coversHistoricalFixtureTestEdits'] is True
            and final_build['visualOrRideAcceptance'] is False,
            'The final production build receipt is incomplete or out of scope')
    retain(FINAL_BUILD, 'checks/root-final-build.json')
    final_log = verify(final_build['log'])
    retain(final_log, 'checks/' + final_log.name)
    for record in checks['sources']:
        path = verify(record)
        retain(path, 'source/' + path.name)

    # Native-specific binding is completed from its actual source-preparation schema.
    # Keep only its capture/owner producers and short direct receipts, not a helper tree.
    for name in ['prepare.py', 'run.py', 'native.mjs', 'mature-mouth.mjs',
                 'inspection-bridge.mjs', 'inputs.json', 'source-freeze.json',
                 'build.json', 'seal.json', 'prepare-result.json', 'root-helper-checks.json']:
        retain(W / name, 'native/' + name)
    readiness = complete(W / 'prepare-result.json')
    require(readiness['schema'] == 'open-mouth-preparation-result/v1',
            'Unexpected actual native preparation receipt')
    require(readiness['resourcesStarted'] is False and readiness['portsProbed'] is False
            and readiness['executedTestsOrBuilds'] is False and readiness['sources'] == 8,
            'Native preparation receipt claims an unexpected operation')
    for key in ['build', 'sourceFreeze', 'seal']:
        verify(readiness[key])
    for record in seal['helpers']:
        verify(record)
    helper_checks = complete(W / 'root-helper-checks.json')
    require(helper_checks['schema'] == 'open-mouth-root-helper-checks/v1'
            and helper_checks['nativeExecutedByReceipt'] is False
            and len(helper_checks['checks']) == 4
            and all(row['exitCode'] == 0 for row in helper_checks['checks']),
            'Actual helper syntax/preparation checks are incomplete')
    verify(helper_checks['preparation'])
    sealed_helpers = {row['file']: row for row in seal['helpers']}
    for record in helper_checks['helpers']:
        verify(record)
        require(sealed_helpers[record['file']] == record, 'Native helper differs from the checked source')
    freeze = complete(W / 'source-freeze.json')
    require(freeze['schema'] == 'open-mouth-source-freeze/v1'
            and freeze['buildId'] == 'tube-open-mouth-20261005' and len(freeze['files']) == 8,
            'Unexpected current source freeze')
    build = load(verify(seal['approvedApplicationBuild']))
    require(build['schema'] == 'open-mouth-build/v1' and build['build'] == 'tube-open-mouth-20261005'
            and len(build['sources']) == len(build['liveSources']) == 8,
            'Native does not use the selected current build')
    require(build['sourceFreeze'] == seal['sourceFreeze'] == owner['sourceFreeze']
            and owner['build'] == seal['approvedApplicationBuild'],
            'Native source/build authority binding differs')
    verify(build['sourceFreeze'])
    for record in build['assets'] + build['sources'] + build['liveSources']:
        verify(record)
    frozen_by_live = {}
    for record in freeze['files']:
        verify(record['live']); verify(record['frozen'])
        require((record['live']['bytes'], record['live']['sha256'])
                == (record['frozen']['bytes'], record['frozen']['sha256']),
                'Frozen current source differs from its root live source')
        frozen_by_live[record['live']['file']] = record['frozen']
    for record in checks['sources']:
        frozen = frozen_by_live.get(record['file'])
        require(frozen is not None and (frozen['bytes'], frozen['sha256'])
                == (record['bytes'], record['sha256']),
                'Native source does not match the exact tested geometry/regression source')

    report = complete(REPORT)
    require(report['schema'] == 'open-mouth-capture-native/v1'
            and report['firstFailure'] is None and report['ownedBrowserClose'] is True
            and report['sealSha256'] == owner['sealSha256']
            and not report['browserErrors']
            and 0 <= report['stepCount'] <= 360
            and len(report['steps']) == report['stepCount'] == report['stop']['step']
            and report['pngCount'] == 4
            and owner['observation']['stepCount'] == report['stepCount'],
            'Unexpected native terminal outcome or artifact count')
    require(report['policy']['geometryOnly'] is True
            and report['policy']['normalProductionGameplay'] is False
            and report['policy']['priorGeometryEpochOrSelectorEqualityClaim'] is False,
            'Native observation incorrectly claims normal gameplay or prior geometry equality')
    require(report['applicationBuildRequest']['build'] == 'tube-open-mouth-20261005'
            and report['applicationBuildRequest']['checkedBeforeReplayAndStepping'] is True
            and report['approvedApplicationBuild'] == seal['approvedApplicationBuild']
            and report['sourceFreeze'] == seal['sourceFreeze'],
            'Actual served build identity was not checked')
    comparison = report['fixedInteriorReferenceComparison']
    require(comparison['poseAndProjectionExact'] is True
            and comparison['currentFull37AndRawFrontWordsCaptured'] is True
            and comparison['pairedCloneCameraUnchanged'] is True
            and all(comparison[key] is False for key in ['geometryEqualityAsserted',
                    'epochEqualityAsserted', 'selectorEqualityAsserted', 'fullSolverOrPixelEqualityClaim']),
            'Fixed interior pose incorrectly claims old geometry/epoch equality')
    inspection = report['inspection']
    require(inspection['available'] is True and inspection['pairedCloneCameraWordsCompared'] is True,
            'Required current geometry inspection did not complete')
    for guard in [inspection['nonmutation'], inspection['interiorNonmutation'],
                  inspection['sideMouth']['nonmutation']]:
        require(guard['checked'] is True and guard['unchanged'] is True
                and guard['normalRenderRestored'] is True and guard['checkedLoftArrays'] == 37,
                'Per-view geometry/restoration guard is incomplete')
    mouth = inspection['sideMouth']
    require(mouth['complete'] is True and mouth['cloneCameraWordsCompared'] is True
            and mouth['exposedRunEndMouthAcceptance'] is False
            and mouth['visualAcceptance'] is False and mouth['passageClaim'] is False,
            'Side-mouth pose/capture scope changed')
    artifacts = {row['file']: row for row in report['artifacts']}
    require(set(artifacts) == {'normal.png', 'mature-core.png', 'mature-region.png',
                             'side-mouth.png', 'loft-terminal.json', 'steps.ndjson'},
            'Unexpected native artifact set')
    trace = verify(artifacts['steps.ndjson'], REPORT.parent)
    require(trace.stat().st_size == report['traceBytes'], 'Actual trace bytes differ')
    require(sum(bool(line) for line in trace.read_bytes().splitlines()) == report['stepCount'],
            'Actual trace row count differs')
    if report['stepCount']:
        retain(trace, 'capture/steps.ndjson', True)
    for name in ['normal.png', 'mature-core.png', 'mature-region.png', 'side-mouth.png']:
        retain(verify(artifacts[name], REPORT.parent), 'capture/' + name)
    retain(verify(artifacts['loft-terminal.json'], REPORT.parent), 'capture/loft-terminal.json', True)
    roster = load(W / 'clearance-roster.json')
    require(roster['schema'] == 'current-open-mouth-clearance-roster/v1'
            and roster['sourceSidecar'] == str(REPORT.parent / 'loft-terminal.json')
            and roster['epoch'] == report['sidecar']['epoch']
            and roster['matureRows'] == 15
            and roster['maximumMatureCapFloorGap'] == 0.922486424446106
            and roster['firstJoinedMatureGapOver1m'] is None,
            'Current mouth-clearance observation changed')
    retain(W / 'clearance-roster.json', 'capture/clearance-roster.json')
    retain(OWNER, 'native/owner.json')
    retain(REPORT, 'capture/report.json', True)
    retain(Path(__file__).resolve(), 'archive-builder.py')
    summary = {'schema': 'open-mouth-archive-summary/v1', 'complete': True,
        'checks': {'focusedTests': 26, 'barrelFiles': 34, 'barrelTests': 340,
                   'buildId': 'tube-open-mouth-20261005'},
        'native': {'steps': report['stepCount'], 'pngCount': 4,
                   'maximumMatureMouthGap': roster['maximumMatureCapFloorGap'],
                   'selectedMouthGap': mouth['cameraDerivation']['clearance'],
                   'ownerElapsedSeconds': owner['elapsedSeconds'],
                   'protectedListenerIdentitiesPreserved': True, 'sourcePostUnchanged': True,
                   'fixedInteriorReferenceComparison': comparison,
                   'sideMouthCameraDerivation': mouth['cameraDerivation']},
        'acceptance': {'controlledOneMetreBoxCorridor': True, 'sourceGeometryTests': True,
                       'nativeVisualQuality': False, 'ordinaryRide': False,
                       'referenceAxialMouth': False, 'performance': False}}
    return plan, summary


def main():
    plan, summary = prepare()
    # All producer gates and input byte pins pass before creating any primary archive path.
    OUT.mkdir(parents=True)
    for row in plan:
        raw = Path(row['original']['file']).read_bytes()
        require((len(raw), sha(raw)) == (row['original']['bytes'], row['original']['sha256']),
                'Input changed after preflight: ' + row['original']['file'])
        stored = gzip.compress(raw, mtime=0) if row['encoding'] == 'gzip' else raw
        target = OUT / row['path']
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(stored)
        reread = target.read_bytes()
        restored = gzip.decompress(reread) if row['encoding'] == 'gzip' else reread
        require(restored == raw, 'Archive does not restore exact input bytes')
        row['archivedBytes'] = len(reread); row['archivedSha256'] = sha(reread)
        row['decompressedBytesVerified'] = True
    (OUT / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    (OUT / 'manifest.json').write_text(json.dumps({'schema': 'open-mouth-curated-archive/v1',
        'complete': True, 'files': plan}, indent=2) + '\n')
    (OUT / 'README.md').write_text('''# Wider bounded-C side opening — 2026-10-05

The experimental profile raises the fully formed pre-fall lip from 0.12 to 0.45 of the actual crest-to-toe height. Its fall amplitude is 0.60 of that height, with impact still solved at actual cap-to-floor contact. The thickness bound uses the smaller roof drop. A near-impact floor station now shares the cap's XZ water datum while retaining its own floor height, preventing curved ordinary water from reversing a tiny positive air gap.

The actual root checks passed 26 focused renderer/consumer/mouth tests, all 340 barrel tests across 34 files, and the TypeScript/Vite build (`tube-open-mouth-20261005`). The source snapshots are the exact tested files pinned by the root receipt.

The controlled mouth test moves overlapping 1m-high, 0.4m-wide, 0.3m-deep boxes through a 0.9m connected shoreward corridor at the fully formed age of an actual shipped carrier scaled to 3m crest-to-toe height. Every active water triangle is checked independently for box intersection. Owned contact reports ordered interior air and then the open side. This tests one across-profile geometry corridor; it does not establish ordinary board/rider entry, an along-crest reference mouth, or sustained riding.

The completed native inspection records the current mouth shape at its first eligible capture, with the actual step count in `summary.json`. Its four views include the prior fixed interior pose/projection and a separately declared current-row cap64/floor104 side-mouth camera. The prior pose is retained without asserting prior geometry, epoch, selector or pixel equality. The new images and full loft payload support visual review; visual quality and ordinary ride acceptance remain open. Source/helper pins and owner closure bind the capture without copying runtime assets, dependencies or historical media. Historical clock test inputs and native fade values were retained, with current-provider retirement expectations stated separately.

Root viewed the images after the capture completed. The first selected mature row was nearly closed: its mouth gap was only 0.0368523m. Across all 15 fully weighted phase1 rows in the same current snapshot, the largest cap/floor gap was 0.9224864m; no joined mature pair had a gap above 1m. The exact clearance roster is retained. The side image therefore does not establish a usable body mouth, and the fixed interior remains visibly angular with a black strip. This is a recorded intermediate candidate. The next trial raises the lip further and selects the first joined pair with at least 1.20m of sampled mouth clearance.

Raw report and loft JSON are stored as gzip. The builder verifies the decompressed bytes and SHA-256 against each original input. PNGs are retained exactly. This compact archive has only direct receipts and producer snapshots; it is not a standalone runtime or an ancestry inventory.
''')
    print(json.dumps({'complete': True, 'out': str(OUT), 'retainedInputs': len(plan),
                      'manifest': pin(OUT / 'manifest.json')}))


if __name__ == '__main__':
    main()
