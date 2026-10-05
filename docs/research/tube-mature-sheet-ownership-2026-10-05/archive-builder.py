#!/usr/bin/env python3
"""Root-run lean archive for the finished fixed-camera region diagnostic only."""
from pathlib import Path
import gzip
import hashlib
import json
import os

ROOT = Path('/Users/regina/Desktop/Projects/surfing-game')
TMP = Path('/private/tmp')
W = TMP / 'tube-c-mature-region-native-20261005'
R = TMP / 'tube-c-mature-region-root-20261005'
PARENT = TMP / 'tube-c-mature-mouth-inspection-native-20261005'
MATURE = ROOT / 'docs/research/tube-mature-interior-and-steering-2026-10-05'
FORMATION = ROOT / 'docs/research/tube-formation-and-gameplay-2026-10-05'
OUT = ROOT / 'docs/research/tube-mature-sheet-ownership-2026-10-05'
COLOUR_SOURCE = TMP / 'tube-c-formation-trial-20261005/source/src/scene/barrel/SweptBarrelMesh.ts'
PLAN = {}
REFERENCES = {}
ARCHIVE_FILES = {}


def require(value, message):
    if not value:
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
        require(base is not None, 'Relative direct pin requires a base')
        path = base / path
    actual = pin(path)
    require(actual['bytes'] == record['bytes'] and actual['sha256'] == record['sha256'],
            'Changed direct pin: ' + str(path))
    return path


def complete(path):
    result = load(path)
    require(result.get('complete') is True, 'Incomplete required producer: ' + str(path))
    return result


def retain(path, relative, compressed=False):
    relative = str(relative) + ('.gz' if compressed else '')
    require(relative not in PLAN, 'Duplicate archive destination: ' + relative)
    PLAN[relative] = {'original': pin(path), 'encoding': 'gzip' if compressed else 'identity'}


def reference(record, archive):
    """Read a directly named curated archive member; do not follow its references."""
    if archive not in ARCHIVE_FILES:
        manifest = complete(archive / 'manifest.json')
        ARCHIVE_FILES[archive] = {row['original']['file']: row for row in manifest['files']}
    require(record['file'] in ARCHIVE_FILES[archive], 'Direct archived reference not found: ' + record['file'])
    row = ARCHIVE_FILES[archive][record['file']]
    require(row['original']['bytes'] == record['bytes'] and row['original']['sha256'] == record['sha256'],
            'Reference does not match its preceding archive')
    stored = (archive / row['path']).read_bytes()
    require(len(stored) == row['archivedBytes'] and sha(stored) == row['archivedSha256'],
            'Archived reference bytes changed')
    raw = gzip.decompress(stored) if row['encoding'] == 'gzip' else stored
    require(len(raw) == record['bytes'] and sha(raw) == record['sha256'],
            'Archived reference does not decompress to the original bytes')
    REFERENCES[record['file']] = {'original': record, 'archive': '../' + archive.name + '/' + row['path'],
        'encoding': row['encoding'], 'archivedBytes': row['archivedBytes'],
        'archivedSha256': row['archivedSha256'], 'decompressedBytesVerified': True}
    return raw


def checks(name):
    result = complete(W / name)
    require(result['resourcesStarted'] is False and result['portsProbed'] is False
            and result['sourcePostUnchanged'] is True, 'Unexpected helper receipt state')
    rows = result['checks']
    if isinstance(rows, dict):
        rows = list(rows.values())
    require(rows, 'Completed helper receipt contains no actual checks')
    for row in rows:
        require(row['run'] is True and row['exitCode'] == 0, 'Helper check unsuccessful')
        source = verify(row['log'])
        retain(source, 'root-checks/logs/' + source.name)
    retain(W / name, 'root-checks/' + name)


def prepare():
    require(not OUT.exists(), 'Archive already exists; refusing overwrite')
    owner = complete(W / 'candidate-first-owner.json')
    require(owner['schema'] == 'c-mature-region-finite-owner/v1'
            and owner['exitCode'] == 0 and owner['firstFailure'] is None
            and owner['sourceBuildHelpersPostUnchanged'] is True
            and owner['independentClosureValid'] is True and owner['protectedPortsPreserved'] is True
            and not owner['remainingOwnedPids'] and all(owner['closedPorts'].values())
            and owner['protectedListenersInitially'] == owner['protectedListenersFinally'],
            'Region owner is not terminal, closed, unchanged and preview preserving')
    seal = complete(W / 'seal.json')
    require(seal['rootAuthorized'] is True and owner['sealSha256'] == pin(W / 'seal.json')['sha256'],
            'Owner is not bound to the completed root seal')
    for key in ['preparationInputs', 'preparationFreeze', 'helperReadiness',
                'rootCameraSyntaxChecks', 'rootHelperChecks']:
        verify(seal[key])
    freeze = load(W / 'source-freeze.json')
    require(len(freeze['pins']) == 8, 'Source preparation is not the eight-file region variant')
    for record in freeze['pins']:
        verify(record)
    for record in seal['helperPins']:
        source = verify(record)
        require(source.parent == W, 'Unexpected external local source')
        retain(source, 'preparation/' + source.name)
    retain(W / 'seal.json', 'preparation/seal.json')
    checks('root-camera-syntax-checks.json')
    checks('root-helper-checks.json')
    retain(R / 'check-and-seal.py', 'root-checks/check-and-seal.py')

    inputs = load(W / 'inputs.json')
    for key in ['approvedMatureSeal', 'approvedMatureReport', 'approvedMatureOwner',
                'approvedMatureSidecar', 'matureParentSourceFreeze']:
        reference(inputs[key], MATURE)
    for key in ['approvedCandidateSeal', 'approvedApplicationBuild', 'approvedDiagnosticBuild',
                'diagnosticModule', 'knownCReport', 'knownCOwner']:
        reference(inputs[key], FORMATION)
    for record in inputs['borrowedHelperPins']:
        reference(record, FORMATION)
    # The local inspection copies are retained above; their two immediately named
    # parents already exist in the mature archive and do not require a helper inventory.
    for record in inputs['helperParentPins']:
        reference(record, MATURE)

    report = complete(W / 'candidate-first/report.json')
    require(report['schema'] == 'c-mature-region-native/v1' and report['firstFailure'] is None
            and report['ownedBrowserClose'] is True and report['sealSha256'] == owner['sealSha256']
            and report['steps'] == [] and report['stepCount'] == 0 and report['traceBytes'] == 0
            and report['pngCount'] == 3, 'Unexpected region native completion or artifact counts')
    match = report['canonicalMatureReferenceMatch']
    require(all(match[key] is True for key in ['selectorExact', 'epochAndStepExact',
            'cameraDerivationExact', 'activeFull37AndRawFrontWordsExact', 'pairedCloneCameraUnchanged'])
            and match['fullSolverOrPixelEqualityClaim'] is False,
            'Canonical region/mature geometry and camera comparison is incomplete')
    inspection = report['inspection']
    region = inspection['region']
    require(region['complete'] is True and region['sameCanonicalCamera'] is True
            and region['cloneCameraWordsCompared'] is True and region['originalViewRestored'] is True
            and region['selectorRerun'] is False and region['cameraDerivedAgain'] is False
            and region['geometryOrQualityAcceptance'] is False
            and inspection['openingOrBodyPassageClaim'] is False
            and inspection['nonmutation']['unchanged'] is True
            and inspection['nonmutation']['checkedLoftArrays'] == 37
            and inspection['nonmutation']['originalBarrelViewSheetAndWindingChecked'] is True,
            'Fixed camera, region restoration or nonmutation receipt changed')
    parent = json.loads(reference(inputs['approvedMatureReport'], MATURE))
    artifacts = {row['file']: row for row in report['artifacts']}
    previous = {row['file']: row for row in parent['artifacts']}
    require(set(artifacts) == {'normal.png', 'mature-core.png', 'mature-region.png',
                             'loft-terminal.json', 'steps.ndjson'}, 'Unexpected region artifact set')
    for name in ['normal.png', 'mature-core.png', 'loft-terminal.json']:
        record = artifacts[name]
        require((record['bytes'], record['sha256']) == (previous[name]['bytes'], previous[name]['sha256']),
                'Expected unchanged mature artifact differs: ' + name)
        verify(record, W / 'candidate-first')
        reference({'file': str(PARENT / 'candidate-first' / name),
                   'bytes': record['bytes'], 'sha256': record['sha256']}, MATURE)
    require(artifacts['mature-region.png'] == region['artifact']
            and artifacts['steps.ndjson']['bytes'] == 0, 'Region image or empty trace binding mismatch')
    new_png = verify(artifacts['mature-region.png'], W / 'candidate-first')
    trace = verify(artifacts['steps.ndjson'], W / 'candidate-first')
    retain(new_png, 'capture/mature-region.png')
    retain(trace, 'capture/steps.ndjson', True)
    retain(W / 'candidate-first/report.json', 'capture/report.json', True)
    retain(W / 'candidate-first-owner.json', 'owner.json')
    retain(W / 'candidate-first-owner.log', 'owner.log')
    retain(W / 'candidate-first-launcher.json', 'capture/launcher.json')
    retain(Path(__file__).resolve(), 'archive-builder.py')
    summary = {'schema': 'mature-sheet-ownership-summary/v1', 'complete': True,
        'stepCount': 0, 'traceRows': 0, 'capturedPngCount': 3, 'newArchivedPngCount': 1,
        'ownerElapsedSeconds': owner['elapsedSeconds'], 'protectedListenerIdentitiesPreserved': True,
        'canonicalMatureReferenceMatch': match, 'region': region,
        'nonmutation': inspection['nonmutation'], 'newImage': artifacts['mature-region.png'],
        'colourMappingSource': pin(COLOUR_SOURCE),
        'rootVisualObservation': 'The dark right wedge and apparent sky/reflection above it turn red; '
            'the left wall/floor are blue, with green transitions. Red identifies surviving loft-sheet pixels.',
        'acceptance': {'survivingLoftSheetPixelOwnership': True, 'exactTriangleOrProvenance': False,
            'geometryCorrectness': False, 'physicalBlockage': False, 'shaderCause': False,
            'visualQuality': False, 'tubePassage': False, 'performance': False},
        'pendingRayAuditRetained': False, 'runtimeChanged': False,
        'duplicatedMaturePngOrLoftPayloads': False}
    return summary


def readme(summary):
    return f"""# Mature sheet ownership — 2026-10-05

The completed diagnostic changes the loft's final region colour at the single
accepted mature camera and epoch. It advances no physics and takes no input:
0 steps, an exact empty trace, and 3 PNGs. The finite owner completed in
{summary['ownerElapsedSeconds']:.3f}s including startup and cleanup, closed its
resources, preserved the 4312/4313/4314 listener identities and left source,
build and helpers unchanged. The selector, epoch, canonical camera, all 37
active loft arrays and raw front words match the accepted mature capture.

Root viewed the paired images. The dark right wedge and the area that appears
to be sky/reflection above it become red in the region image. The left wall and
floor become blue, with green transitions. This identifies surviving
loft-sheet pixels in those areas. The ordinary colour's apparent sky above the
wedge therefore cannot be treated as confirmed background from appearance alone.

The region view assigns red to lip vertices with sheetWeight >= 0.5, blue to
the eligible open inner wall/floor, yellow to the eligible pre-open steep face,
and green to the remainder. Vertex colours interpolate across triangles. The
region shader outputs those colours unshaded after the ordinary fragment path;
the observation concerns surviving drawn fragments. It does not identify a
precise triangle, row, front or provenance, prove correct geometry or physical
blockage, isolate the ordinary shader's darkening cause, or establish visual
quality, usable tubes, rider passage or performance. The pending ray audit is
excluded. No conclusion from an unexecuted diagnostic is included.

Only the new [region image](capture/mature-region.png) is copied here. The exact
unchanged [ordinary view](../tube-mature-interior-and-steering-2026-10-05/mature-interior/capture/normal.png),
[mature colour view](../tube-mature-interior-and-steering-2026-10-05/mature-interior/capture/mature-core.png)
and [full 37-array loft](../tube-mature-interior-and-steering-2026-10-05/mature-interior/capture/loft-terminal.json.gz)
are byte-identical to the accepted originals and referenced in that archive.
Their original and archived pins are verified directly, without copying them.

The new eight source/preparation files, freeze, actual root check-and-seal script,
check receipts/logs, seal, owner, launcher, exact final report and zero-row trace
are retained. Shared helpers and approved C/mature evidence use directly named
members of the two preceding curated archives. No reference traversal, full
runtime/dependency/dist copy, test/build/native execution, ports or Git is added.
Original preparation receipts keep their pending outcome fields; finished root
producers separately document the actual result. Temporary absolute paths in
raw receipts describe the source environment, rather than a standalone checkout.

Reports and NDJSON are stored as .gz with exact decompression byte/SHA-256
verification. The new PNG is byte-for-byte original. manifest.json records all
retained and direct external pins; summary.json records the bounded finding.
"""


def main():
    summary = prepare()
    stage = OUT.with_name('.' + OUT.name + '.building')
    require(not stage.exists(), 'Prior staging exists; inspect before retrying')
    stage.mkdir(parents=True)
    records = []
    for relative, entry in PLAN.items():
        original = entry['original']
        raw = Path(original['file']).read_bytes()
        require(len(raw) == original['bytes'] and sha(raw) == original['sha256'],
                'Input changed after preflight')
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
    manifest = {'schema': 'mature-sheet-ownership-curated-archive/v1', 'complete': True,
        'output': str(OUT), 'files': records, 'derived': derived,
        'directArchiveManifests': [pin(MATURE / 'manifest.json'), pin(FORMATION / 'manifest.json')],
        'externalReferences': list(REFERENCES.values()), 'runtimeTreeCopied': False,
        'dependenciesCopied': False, 'distCopied': False, 'priorMaturePayloadsDuplicated': False,
        'pendingRayAuditRetained': False, 'geometryQualityAccepted': False, 'tubePassageAccepted': False}
    (stage / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    require(not OUT.exists(), 'Archive appeared during preflight; refusing overwrite')
    os.rename(stage, OUT)
    print(json.dumps({'complete': True, 'output': str(OUT), 'files': len(records),
        'directExternalReferences': len(REFERENCES), 'newPngs': 1, 'steps': 0}, indent=2))


if __name__ == '__main__':
    main()
