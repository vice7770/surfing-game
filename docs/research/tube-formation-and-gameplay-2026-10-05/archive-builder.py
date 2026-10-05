#!/usr/bin/env python3
"""Root-run, one-shot curated archive. Reads finished receipts; runs no producers."""
from pathlib import Path
import gzip
import hashlib
import json
import os

ROOT = Path('/Users/regina/Desktop/Projects/surfing-game')
TMP = Path('/private/tmp')
OUT = ROOT / 'docs/research/tube-formation-and-gameplay-2026-10-05'
T = TMP / 'tube-c-formation-trial-20261005'
K = TMP / 'tube-c-formation-native-20261005'
B = TMP / 'tube-c-formation-build-20261005'
D = TMP / 'tube-c-formation-production-tests-20261005'
M = TMP / 'tube-production-formation-checks-20261005'
X = TMP / 'tube-c-formation-comparison-20261005'
O = TMP / 'tube-production-autopilot-native-20261005'
OR = TMP / 'tube-production-autopilot-root-20261005'
N = TMP / 'tube-c-formation-autopilot-native-20261005'
NR = TMP / 'tube-c-formation-autopilot-root-20261005'
RAW = TMP / 'tube-board-raw-normal-native-20261005'
BUILD_ID = 'tube-c-formation-20261005'
PLAN = {}


def require(value, reason):
    if not value:
        raise RuntimeError(reason)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def pin(path):
    path = Path(path)
    data = path.read_bytes()
    return {'file': str(path), 'bytes': len(data), 'sha256': sha(data)}


def verify(record, base=None):
    path = Path(record['file'])
    if not path.is_absolute():
        require(base is not None, 'Relative pin without an explicit base')
        path = base / path
    actual = pin(path)
    require(actual['bytes'] == record['bytes'] and actual['sha256'] == record['sha256'],
            'Direct pin changed: ' + str(path))
    return path


def load(path):
    return json.loads(Path(path).read_bytes())


def retain(path, relative, compressed=False):
    relative = str(relative) + ('.gz' if compressed else '')
    require(relative not in PLAN, 'Duplicate archive destination: ' + relative)
    PLAN[relative] = {'source': pin(path), 'encoding': 'gzip' if compressed else 'identity'}


def retain_files(base, destination, names):
    for name in names:
        retain(base / name, Path(destination) / name,
               name.endswith('.ndjson') or Path(name).name in ('report.json', 'tests.json')
               or Path(name).name.startswith('loft-'))


def complete(path):
    result = load(path)
    require(result.get('complete') is True, 'Incomplete required producer: ' + str(path))
    return result


def command_checks(path, expected_names):
    result = complete(path)
    require(result.get('sourcePostUnchanged') is True, 'Source changed during checks: ' + str(path))
    checks = result['checks']
    require([row['name'] for row in checks] == expected_names, 'Wrong actual command checks: ' + str(path))
    for row in checks:
        require(row['exitCode'] == 0 and row['timedOut'] is False, 'Unsuccessful command: ' + row['name'])
        verify(row['log'])
    return result


def tests(path, total, passed, failed):
    result = load(path)
    require((result['numTotalTests'], result['numPassedTests'], result['numFailedTests'])
            == (total, passed, failed), 'Unexpected test counts: ' + str(path))
    require(result['success'] is (failed == 0), 'Unexpected test result: ' + str(path))


def helper_checks(path):
    result = complete(path)
    if 'sourcePostUnchanged' in result:
        require(result['sourcePostUnchanged'] is True, 'Helper inputs changed: ' + str(path))
    for name, row in result['checks'].items():
        require(row['run'] is True and row['exitCode'] == 0, 'Incomplete helper check: ' + name)
        verify(row['log'])
    return result


def native(base, destination, steps, pngs, lofts, owner_accepted):
    owner = load(base / 'candidate-first-owner.json')
    require(owner.get('complete') is owner_accepted and owner['exitCode'] == 0,
            'Unexpected finite owner status: ' + str(base))
    require(owner.get('independentClosureValid') is True
            and owner.get('protectedPortsPreserved') is True
            and all(owner['closedPorts'].values()), 'Native closure failed: ' + str(base))
    if owner_accepted:
        require(owner.get('firstFailure') is None and owner.get('sourceBuildHelpersPostUnchanged') is True,
                'Accepted owner has a failure or changed inputs: ' + str(base))
    report = complete(base / 'candidate-first/report.json')
    require(report.get('firstFailure') is None and report['stepCount'] == steps
            and len(report['steps']) == steps, 'Native report incomplete: ' + str(base))
    require(report.get('chromeClosed') is True or report.get('ownedBrowserClose') is True,
            'Native browser close unconfirmed: ' + str(base))
    artifacts = report['artifacts']
    snapshots = report['loftSnapshots']
    require(sum(row['file'].endswith('.png') for row in artifacts) == pngs
            and len(snapshots) == lofts, 'Wrong native artifact count: ' + str(base))
    for record in artifacts + snapshots:
        source = verify(record, base / 'candidate-first')
        retain(source, destination + '/capture/' + record['file'],
               source.suffix == '.ndjson' or source.name.startswith('loft-'))
    retain(base / 'candidate-first/report.json', destination + '/capture/report.json', True)
    retain_files(base, destination, ['candidate-first-owner.json', 'candidate-first-owner.log'])
    return owner, report


def completed_payload(path, report_path, rows):
    result = load(path)
    require(result['passed'] is True, 'Completed payload check failed: ' + str(path))
    manifest = result['manifestCheck']
    require(manifest['requested'] is True and manifest['complete'] is True
            and manifest['rows'] == rows, 'Incomplete completed payload check: ' + str(path))
    actual = pin(report_path)
    require(manifest['file'] == str(report_path) and manifest['reportBytes'] == actual['bytes']
            and manifest['reportSha256'] == actual['sha256'], 'Completed payload bound to another report')


def prepare():
    require(not OUT.exists(), 'Archive already exists; this builder never overwrites it')
    cpu = command_checks(T / 'root-checks/result.json', ['strict', 'formation'])
    require(cpu['sourceFiles'] == 588 and len(cpu['runtimeDelta']) == 1,
            'Focused source authority must have one delta among 588 inputs')
    tests(T / 'root-checks/tests.json', 5, 5, 0)
    metrics = load(T / 'root-checks/formation-metrics.json')
    require(not metrics['failures'] and metrics['zeroFormationFixtures'] == 48
            and metrics['zeroFormationQueries'] == 2592 and metrics['ordinaryWaterSamples'] == 90
            and metrics['exactParentLofts'] == 162 and metrics['exactParentArrays'] == 5994
            and metrics['rawProviderLofts'] == 18 and len(metrics['partialFormation']) == 72
            and sum(row['airColumns'] for row in metrics['partialFormation']) == 34617
            and all(row['minClearance'] > 0 and row['minThickness'] > 0
                    for row in metrics['partialFormation']), 'Focused fixture metrics incomplete')
    consumers = command_checks(T / 'root-consumers-build/result.json', ['consumers', 'build'])
    require(consumers['sourceFiles'] == 588 and consumers['buildId'] == BUILD_ID,
            'Wrong actual consumers/build authority')
    tests(T / 'root-consumers-build/tests.json', 5, 5, 0)
    retain_files(T, 'formation-cpu', ['README.md', 'readiness.json', 'runtime.patch',
        'tsconfig.fixture.json', 'vitest.config.ts', 'tests/formationWeight.test.ts',
        'root-checks/result.json', 'root-checks/tests.json', 'root-checks/formation-metrics.json',
        'root-checks/strict.log', 'root-checks/formation.log'])
    retain_files(T / 'root-consumers-build', 'formation-consumers-build',
                 ['result.json', 'tests.json', 'consumers.log', 'build.log'])

    retain_files(D, 'production-regression', ['README.md', 'readiness.json',
                 'BoundedCFormationWater.test.ts', 'root-check.py'])
    for phase, passed, failed, exit_code in [('before', 0, 4, 1), ('after', 4, 0, 0)]:
        result = load(D / phase / 'result.json')
        require(result['acceptedExpectedResult'] is True and result['sourcePostUnchanged'] is True
                and result['exitCode'] == exit_code and result['timedOut'] is False
                and result['phase'] == phase, 'Incomplete durable regression: ' + phase)
        require(result['actual'] == result['expected']
                and result['actual']['total'] == 4 and result['actual']['passed'] == passed
                and result['actual']['failed'] == failed, 'Wrong before/after regression result')
        # Historical before-source pins refer to primary files subsequently changed by adoption.
        # Bind its preserved fixture/log/report, not those old primary paths to current files.
        for key in ['template', 'relocatedFixture', 'log', 'testReport']:
            verify(result[key])
        tests(D / phase / 'tests.json', 4, passed, failed)
        retain_files(D / phase, 'production-regression/' + phase,
                     ['result.json', 'regression.test.ts', 'vitest.config.ts', 'run.log', 'tests.json'])

    main = command_checks(M / 'result.json', ['tests', 'build'])
    tests(M / 'tests.json', 116, 116, 0)
    require(len(main['inputs']) == 2 and main['tests']['numPassedTests'] == 116,
            'Wrong adopted production input/result count')
    for record in main['inputs']:
        source = verify(record)
        retain(source, 'production-checks/adopted-source/' + source.name)
    verify(main['testReport'])
    retain_files(M, 'production-checks', ['result.json', 'tests.json', 'tests.log', 'build.log'])

    source = complete(K / 'source-readiness.json')
    require(source['sourceCount'] == 588 and source['unchangedParentInputs'] == 587
            and source['sourceDirectory'] == str(T / 'source'), 'Wrong candidate source binding')
    verify(source['candidateOverride'])
    app = load(K / 'root-complete-build-result.json')
    diag = load(K / 'root-diagnostic-build-result.json')
    require(app['terminal'] is True and app['exitCode'] == 0 and app['sourceUnchangedAfterBuild'] is True
            and app['buildId'] == BUILD_ID and app['source'] == str(T / 'source')
            and app['existingRootApplicationBuildReused'] is True
            and app['applicationBuildPerformedByComposer'] is False,
            'Candidate app receipt is not the actual reused completed root build')
    for key in ['actualRootCPU', 'actualRootConsumersBuild', 'rootApplicationCommand', 'rootBuildOutputPin']:
        verify(app[key])
    require(diag['terminal'] is True and diag['exitCode'] == 0
            and diag['actualNewDiagnosticSourceCompiled'] is True
            and diag['sourceOrCompleteDistModified'] is False, 'Fresh diagnostic producer incomplete')
    verify(diag['module'])
    helper_checks(K / 'root-helper-checks.json')
    seal = complete(K / 'seal.json')
    for key in ['preparationFreeze', 'sourceReadiness', 'helperReadiness',
                'rootDiagnosticBuild', 'diagnosticModule', 'replayReference']:
        verify(seal[key])
    retain_files(K, 'known-failure/preparation', ['authority.py', 'run.py', 'native.mjs',
        'autopilot-entry.ts', 'build-diagnostic.mjs', 'observer-fields.json', 'root-source.py',
        'root-helper-checks.py', 'root-seal.py', 'source-pins.json', 'source-delta.json',
        'source-readiness.json', 'root-source-binding.json', 'replay-reference.json',
        'root-build-result.json', 'root-complete-build-result.json',
        'root-diagnostic-build-result.json', 'root-helper-checks.json', 'readiness.json',
        'seal.json', 'diagnostic-autopilot.mjs', 'prep/README.md', 'prep/inputs.json',
        'prep/pending-readiness.json', 'prep/freeze.json', 'root-helper-logs/nativeSyntax.log',
        'root-helper-logs/diagnosticWrapperSyntax.log', 'root-helper-logs/sourceOnlyOwner.log'])
    retain_files(B, 'known-failure/build-composer', ['root-complete-build.py', 'root-prebuild.json',
        'root-command-result.json', 'root-build-result.json', 'root-build-output.txt'])
    ko, kr = native(K, 'known-failure', 1516, 4, 4, True)
    retain(K / 'candidate-first/launcher.json', 'known-failure/capture/launcher.json')

    observation = complete(OR / 'observation.json')
    require(observation['originalFiniteOwnerAccepted'] is False and observation['servedBuildJson'] is False
            and 'build.json' in observation['originalOwnerFailure']
            and observation['nativeComplete'] is True and observation['nativeFailure'] is None
            and observation['servedRuntimeAssetsBoundToApprovedBuild'] is True
            and observation['currentRawSourceBuildHelpersUnchanged'] is True,
            'Original failed owner lacks the required independent qualification')
    for key in ['report', 'trace', 'owner', 'nativeLauncher']:
        verify(observation[key])
    oo, old_normal = native(O, 'normal-baseline', 485, 3, 3, False)
    require(old_normal['normalMenuSeed'] == 7035 and old_normal['firstPopUp'] is None
            and old_normal['firstStanding'] is None and old_normal['stop']['step'] == 485,
            'Original normal observation mismatch')
    require(not any(str(key).endswith('build.json') for key in oo['served']),
            'Original owner unexpectedly requested build.json')
    no, new_normal = native(N, 'normal-formation', 1118, 3, 3, True)
    require(new_normal['normalMenuSeed'] == 2430 and new_normal['firstPopUp'] is None
            and new_normal['firstStanding'] is None
            and new_normal['stop']['pilot']['outcome'] == 'missed the wave',
            'New normal observation mismatch')
    require(any(str(key).endswith('build.json') for key in no['served']),
            'New normal owner has no served build.json binding')
    retain(OR / 'observation.json', 'normal-baseline/root-checks/observation.json')
    for base, root_checks, dest, report, rows in [
        (O, OR, 'normal-baseline', old_normal, 485),
        (N, NR, 'normal-formation', new_normal, 1118),
    ]:
        normal_seal = complete(base / 'seal.json')
        require(normal_seal['rootAuthorized'] is True, 'Normal seal is not root authorized')
        for key in ['approvedApplicationBuild', 'approvedDiagnosticBuild', 'diagnosticModule',
                    'helperReadiness', 'rootHelperChecks']:
            verify(normal_seal[key])
        helper_checks(root_checks / 'helper-checks.json')
        completed_payload(root_checks / 'completed-payload.log', base / 'candidate-first/report.json', rows)
        # These are only the directly sealed local source/preparation files, not nested inventories.
        for record in normal_seal['helperPins']:
            path = verify(record)
            require(path.parent == base, 'Unexpected nonlocal normal preparation input')
            retain(path, dest + '/preparation/' + path.name)
        retain(base / 'seal.json', dest + '/preparation/seal.json')
        retain(base / 'candidate-first-launcher.json', dest + '/capture/launcher.json')
        retain_files(root_checks, dest + '/root-checks',
            ['helper-checks.json', 'syntax.log', 'payload.log', 'sourceOnlyOwner.log', 'completed-payload.log'])

    # Preserve only direct borrowed helper code and immediate raw app/diagnostic receipts.
    # No ancestor reports, environment binaries, dependencies, runtime tree or dist assets.
    borrowed = {record['file']: record for record in seal['helperPins']}
    for base in [O, N]:
        for record in load(base / 'seal.json')['borrowedHelperPins']:
            borrowed[record['file']] = record
    for record in borrowed.values():
        path = verify(record)
        retain(path, 'direct-borrowed-helpers/' + path.parent.name + '/' + path.name)
    complete(RAW / 'source-readiness.json')
    complete(RAW / 'seal.json')
    helper_checks(RAW / 'root-helper-checks.json')
    for name in ['root-complete-build-result.json', 'root-diagnostic-build-result.json']:
        raw_producer = load(RAW / name)
        require(raw_producer['terminal'] is True and raw_producer['exitCode'] == 0,
                'Incomplete immediate raw build/diagnostic producer')
    retain_files(RAW, 'normal-baseline/direct-approved-build',
                 ['source-readiness.json', 'source-delta.json', 'root-complete-build-result.json',
                  'root-diagnostic-build-result.json', 'root-helper-checks.json', 'seal.json'])

    comparison = complete(X / 'result.json')
    for key in ['baselineReport', 'candidateReport', 'candidateOwner']:
        verify(comparison[key])
    require(comparison['sameInitialConfig'] is True and comparison['sameInitialPhysicalClock'] is True
            and comparison['sameInitialBoardPose'] is True and comparison['sameCommonInputCount'] == 1366
            and comparison['allCommonInputsExact'] is True
            and comparison['allCommonPhysicalClocksExact'] is True
            and comparison['firstChangedBoardPoseStep'] == 1341
            and comparison['baselineStepCount'] == 1366 and comparison['candidateStepCount'] == 1516
            and comparison['candidateStanding'] == {'firstStep': 1372, 'lastStep': 1515,
                                                    'steps': 144, 'physicalSeconds': 2.4}
            and comparison['tubePassageAcceptance'] is False
            and comparison['mouthQualityAcceptance'] is False,
            'Comparison differs from the reviewed actual outcome')
    retain(X / 'result.json', 'comparison/result.json')
    retain(Path(__file__).resolve(), 'archive-builder.py')
    return comparison, main


README = """# Bounded-C formation and gameplay — 2026-10-05

True bounded-C formation now weights the loft deformation and mask once. Before
throw and at exact throw, ordinary water retains drawing and contact ownership.
The profile provider and physical clocks are unchanged. Non-C profiles retain
their previous default weight. The accepted raw-normal BoardBody change remains.

The focused CPU fixture passed 5 tests: 48 zero-formation cases, 2,592 queries,
90 complete real PhysicalSurfWater samples, 162 fully formed parent comparisons
covering 5,994 byte arrays, 72 intermediate cases with 34,617 air columns, and
18 non-C controls. These are limited geometry/contact observations. Existing
boundedCConsumers passed 5 tests. The durable four regression tests all failed
against the old primary runtime and all passed after the formation update.
Primary adoption followed 116 passing production tests and a successful build.
The fix and four durable tests were committed to `claude/wave-pool` as
`a951368e7`. The exact adopted two source files and command receipts are retained
here. The commit identity is the root agent's execution report.

The known-failure comparison matches all 1,366 common inputs and physical clocks,
the initial configuration, and initial board pose. The first body difference is
step 1,341. The old run fell at step 1,366. The candidate stood at steps
1,372–1,515: 144 steps, or 2.4 physical seconds, then fell at step 1,516 outside
any tube. This improves landing and brief standing in one seeded controlled
trial. Sustained riding and a connected tube passage remain unproven. The clip
records 216 physics advances (3.6 physical seconds); it makes no FPS, encoded
frame-count, or physical playback-rate claim. The unchanged raw-normal control
report is pinned in comparison/result.json and retained in the earlier
../tube-water-entry-and-normal-2026-10-05 archive rather than duplicated here.

The normal UI pilots use unmatched seeds. The original seed 7,035 fell at
step 485 while prone. Candidate seed 2,430 remained prone through step 1,118
and missed the wave. Neither stood or produced a standing video. These are
observations of two different starts and do not establish a causal improvement.
The original finite owner failed because native never requested the mandatory
served build.json metadata. Its owner output is preserved unchanged. The
independent root supplement binds the actual served runtime assets and records
that qualification; it does not turn the failed owner into an accepted owner.
The candidate startup fetched and checked build.json and its owner completed.

The first eligible “formed-mouth” cameras are geometry-only early partial wall
or underwater views. They do not establish a convincing mouth or rideable tube.
Usable convincing tubes and rider passage remain unverified. No new performance
acceptance is claimed by these stepped diagnostic captures.

The archive keeps direct code, preparation, build/source/diagnostic/helper/seal
receipts, finished owner outputs, reports, traces, complete loft sidecars and
original media. It includes no full 588-input runtime, dependency tree or dist.
Absolute temporary paths inside exact original receipts document their source
environment; the curated archive is evidence, not a standalone runnable checkout.
Preparation receipts retain their original pending acceptance fields: later
finished root checks and comparison outcomes are separate evidence.

Raw reports, test reports, NDJSON traces and loft JSON are stored as .gz files.
manifest.json records both original and archived byte counts and SHA-256 values.
The builder verifies decompressed bytes against the exact original. PNG and WEBM
media remain byte-for-byte originals. It reads only finished outputs and runs no
tests, builds, browser sessions, physics, ports or Git operations.
"""


def main():
    comparison, checks = prepare()
    stage = OUT.with_name('.' + OUT.name + '.building')
    require(not stage.exists(), 'Prior archive staging directory exists; inspect before retrying')
    stage.mkdir(parents=True)
    records = []
    for relative, entry in PLAN.items():
        source = entry['source']
        raw = Path(source['file']).read_bytes()
        require(len(raw) == source['bytes'] and sha(raw) == source['sha256'],
                'Input changed after preflight: ' + source['file'])
        stored = gzip.compress(raw, compresslevel=9, mtime=0) if entry['encoding'] == 'gzip' else raw
        target = stage / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(stored)
        actual_stored = target.read_bytes()
        decoded = gzip.decompress(actual_stored) if entry['encoding'] == 'gzip' else actual_stored
        require(decoded == raw and sha(decoded) == source['sha256'], 'Archive byte verification failed')
        records.append({'path': relative, 'encoding': entry['encoding'], 'original': source,
                        'archivedBytes': len(actual_stored), 'archivedSha256': sha(actual_stored),
                        'decompressedBytesVerified': True})
    readme = README.encode('utf-8')
    (stage / 'README.md').write_bytes(readme)
    manifest = {'schema': 'tube-formation-curated-archive/v1', 'complete': True,
        'output': str(OUT), 'files': records,
        'readme': {'bytes': len(readme), 'sha256': sha(readme)},
        'productionAdoptedAfterChecks': True, 'productionPassedTests': checks['tests']['numPassedTests'],
        'rootReportedProductionCommit': 'a951368e7', 'productionBranch': 'claude/wave-pool',
        'knownFailureComparison': comparison,
        'originalNormalOwnerAccepted': False, 'normalSeedsMatched': False,
        'tubePassageAccepted': False, 'mouthQualityAccepted': False,
        'runtimeTreeCopied': False, 'dependenciesCopied': False, 'distCopied': False}
    (stage / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    require(not OUT.exists(), 'Archive appeared during preparation; refusing overwrite')
    os.rename(stage, OUT)
    print(json.dumps({'complete': True, 'output': str(OUT), 'files': len(records),
                      'originalBytes': sum(r['original']['bytes'] for r in records),
                      'archivedBytes': sum(r['archivedBytes'] for r in records)}, indent=2))


if __name__ == '__main__':
    main()
