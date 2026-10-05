from pathlib import Path
import gzip, hashlib, json

REPO = Path('/Users/regina/Desktop/Projects/surfing-game')
OUT = REPO / 'docs/research/tube-board-impulse-and-contour-2026-10-05'
assert not OUT.exists()
selected = []

def add(source, relative):
    source = Path(source)
    assert source.is_file() and not source.is_symlink(), source
    selected.append((source, relative))

def top(directory, group):
    directory = Path(directory)
    for p in sorted(directory.iterdir()):
        if p.is_file() and not p.is_symlink(): add(p, group + '/' + p.name)

def tree(directory, group):
    directory = Path(directory)
    for p in sorted(directory.rglob('*')):
        if p.is_file() and not p.is_symlink(): add(p, group + '/' + str(p.relative_to(directory)))

C = Path('/private/tmp/tube-native-trial-balance-observer-20261005')
W = Path('/private/tmp/tube-native-trial-balance-native-20261005')
R = Path('/private/tmp/tube-native-trial-balance-actual-review-20261005')
top(C, 'controlled-observer')
tree(C / 'tests', 'controlled-observer/tests')
for name in ('root-checks', 'root-boundary-checks', 'root-word-checks', 'root-graph-diff', 'root-bounded-graph-checks'):
    tree(C / name, 'controlled-observer/' + name)
add(C / 'source/src/physics/AttachedRider.ts', 'controlled-observer/source/src/physics/AttachedRider.ts')
top(W, 'native')
tree(W / 'candidate-first', 'native/candidate-first')
add(W / 'source/src/physics/BoardBody.ts', 'native/source/src/physics/BoardBody.ts')
top(R, 'review')
tree(R / 'root-balance', 'review/root-balance')
tree(R / 'root-audit-v2', 'review/root-audit-v2')
tree(R / 'root-audit-v3', 'review/root-audit-v3')
for folder, group in (('tube-C-two-branch-inner-contour-20261005', 'rejected-contour-v1'),
                      ('tube-C-two-branch-inner-contour-v2-20261005', 'rejected-contour-v2')):
    d = Path('/private/tmp') / folder
    top(d, group)
    tree(d / 'root-checks', group + '/root-checks')
    delta = json.loads((d / 'source-delta.json').read_text())
    for q in delta['overrides']: add(d / 'source' / q['path'], group + '/source/' + q['path'])
top('/private/tmp/tube-C-offset-prefix-return-design-20261005', 'pending-offset-return-design')
add(Path(__file__), 'build-archive.py')
assert len({relative for _, relative in selected}) == len(selected)

def words(b): return {'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}

OUT.mkdir()
files, seen, actual_bytes = [], {}, 0
for source, relative in selected:
    raw = source.read_bytes()
    original = words(raw)
    key = original['sha256'], original['bytes']
    if key in seen:
        stored = seen[key]
    else:
        compressed = source.suffix in ('.json', '.ndjson') and len(raw) >= 32768
        encoded = gzip.compress(raw, compresslevel=9, mtime=0) if compressed else raw
        relative += '.gz' if compressed else ''
        target = OUT / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(encoded)
        stored = {'file': relative, **words(encoded), 'encoding': 'gzip' if compressed else 'identity'}
        seen[key] = stored
        actual_bytes += len(encoded)
    files.append({'original': {'file': str(source), **original}, 'archived': stored})

assert actual_bytes <= 40 * 1024 * 1024
summary = {
    'schema': 'tube-board-impulse-and-contour-evidence/v1',
    'complete': True,
    'goalComplete': False,
    'productionRuntimeChanged': False,
    'observerAdopted': False,
    'contourDraftsAdopted': False,
    'native': {'rootSession': 79647, 'terminal': True, 'exitCode': 0, 'steps': 1366,
               'cueStep': 1300, 'landingStep': 1343, 'fallStep': 1366, 'standingReached': False,
               'tubeEntryOrPassageEstablished': False, 'ownedPortsClosed': [4301, 9711],
               'humanPreviewPortsPreserved': [4312, 4313]},
    'observer': {'fields': 102, 'originalFields': 38, 'newScalarFields': 63, 'availabilityMarkers': 1,
                 'controlledStrictPassed': True, 'controlledParityCasesPassed': 2,
                 'controlledSteps': 552, 'earlierTimeoutsAndWordGraphFailuresRetained': True,
                 'nativePublishedRowsEqualToV11': 1366, 'allOriginalFieldsRetainedInComparison': True,
                 'approvedComparisonExclusions': 'exact64 observer additions in complete records plus seven prior timing/follower/redraw categories; all raw differences retained',
                 'fullRetainedRepresentations': 202, 'uniqueAvailableLandingSamples': 46,
                 'availableTrialDoesNotMeanAppliedOrFeasibleMotion': True,
                 'diagnosticCompiledGraphInputCount': 74, 'diagnosticObserverIdentifiersRetained': 0,
                 'diagnosticGraphReachabilityIsNotClassRetention': True,
                 'sealedApplicationWorkersWithAll102Identifiers': 2,
                 'loftComparison': 'all four checkpoints:37 arrays plus raw front packets/descriptors/optical data exact; signed surfaceRevision delta -1 retained',
                 'sourceInputs': 588, 'applicationInputs': 587, 'completeAssets': 49, 'helperPins': 79,
                 'auditPrepFailuresAndBothRootRepairsRetained': True},
    'balance': {'availableSamples': 46, 'inferredRiderMassKg': 73,
                'fullSevenUnknownMaximumSolutionResidual': 2.02e-14,
                'fullBoardImpulseTorqueMaximumResidual': 8.35e-14,
                'transition': [1356, 32, 1357, 1],
                'actualLegRateAfterIncrease': 0.8621348653,
                'chosenInverseAllocationLegDeltaFromCombinedBoardRhs': 0.8338514759,
                'chosenInverseAllocationMaximumResidual': 1.11e-15,
                'boardRhsYBefore': 0.18873031945, 'boardRhsYAfter': -16.953996276542,
                'componentCauseIdentified': False,
                'nextWork': 'Separate the board explicit forces, gyro and radiation/entrainment impulses before changing physics.',
                'scope': 'Captured combined assembly; exact algebraic allocation is not a unique causal intervention. No unpublished substep claim.'},
    'rejectedGeometry': {
        'v1': {'strictPassed': True, 'testsPassed': 14, 'testsTotal': 15, 'queriesAttempted': 6447, 'phase376Failures': 6, 'minimumStoredClearanceOverThickness': 0.1977444083},
        'v2': {'strictPassed': True, 'testsPassed': 14, 'testsTotal': 15, 'queriesAttempted': 6447, 'phase376Failures': 10, 'minimumStoredClearanceOverThickness': 0.1365299672},
        'retirementCasesRemainRequired': True, 'fullFailureGeometryAndParametersRetained': True,
        'newOffsetPrefixReturn': 'Source design only. Positive-handle, paired-roof, Float32 clearance, self-intersection and downward-wall feasibility remain pending.'},
    'archive': {'selectedReferences': len(files), 'uniquePayloads': len(seen), 'uniquePayloadBytes': actual_bytes,
                'allCopiedAndDecodedBytesVerified': True,
                'scope': 'Selected evidence and changed postimages, not a complete runnable588-file dependency snapshot. Original temporary absolute paths remain provenance.'},
    'files': files,
}
(OUT / 'result.json').write_text(json.dumps(summary, indent=2, allow_nan=False) + '\n')
for row in files:
    original, stored = row['original'], row['archived']
    assert words(Path(original['file']).read_bytes()) == {k: original[k] for k in ('bytes', 'sha256')}
    payload = (OUT / stored['file']).read_bytes()
    assert words(payload) == {k: stored[k] for k in ('bytes', 'sha256')}
    restored = gzip.decompress(payload) if stored['encoding'] == 'gzip' else payload
    assert words(restored) == {k: original[k] for k in ('bytes', 'sha256')}
actual = {str(p.relative_to(OUT)) for p in OUT.rglob('*') if p.is_file()}
assert actual == {q['archived']['file'] for q in files} | {'result.json'}
print(json.dumps({'complete': True, 'directory': str(OUT), 'selectedReferences': len(files), 'uniquePayloads': len(seen),
                  'actualFiles': len(actual), 'totalBytes': sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file()),
                  'result': words((OUT / 'result.json').read_bytes())}))
