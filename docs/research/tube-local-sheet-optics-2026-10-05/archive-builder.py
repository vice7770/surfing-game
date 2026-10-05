#!/usr/bin/env python3
"""Prepared only; root creates this lean archive after source review. Runs no producers."""
from pathlib import Path
import gzip
import hashlib
import json
import os

ROOT = Path('/Users/regina/Desktop/Projects/surfing-game')
TMP = Path('/private/tmp')
OUT = ROOT / 'docs/research/tube-local-sheet-optics-2026-10-05'
MATURE = ROOT / 'docs/research/tube-mature-interior-and-steering-2026-10-05'
REGION = ROOT / 'docs/research/tube-mature-sheet-ownership-2026-10-05'
RAY = TMP / 'tube-c-mature-sheet-ray-audit-20261005'
REFRACTION = TMP / 'tube-c-sheet-refraction-audit-20261005'
DEFAULTS = TMP / 'tube-c-default-stance-native-20261005'
FAILED = TMP / 'tube-local-sheet-capture-20261005'
V2 = TMP / 'tube-local-sheet-capture-v2-20261005'
MAX_FILES = 34
MAX_RAW_BYTES = 24 * 1024 * 1024
MAX_REFERENCES = 5
PINS = {'broadGeometryLog': {'bytes': 2833,
                      'file': '/private/tmp/tube-local-sheet-capture-v2-20261005/barrel-tests.log',
                      'sha256': '02942c28422ded7901dea5b16be0446a0227d5e88d258657b9d3b272d709e38b'},
 'defaultsOwner': {'bytes': 3608,
                   'file': '/private/tmp/tube-c-default-stance-native-20261005/candidate-first-owner.json',
                   'sha256': 'f3b0d132c96753312bc649be429e05f2a45fd873bfbfda72a232d9a359b2cd1f'},
 'defaultsReport': {'bytes': 16607197,
                    'file': '/private/tmp/tube-c-default-stance-native-20261005/candidate-first/report.json',
                    'sha256': '296917c7334c4552ea477b224def7eb9b4881ed5b995ab6994846e6a441990fb'},
 'defaultsTerminal': {'bytes': 2139527,
                      'file': '/private/tmp/tube-c-default-stance-native-20261005/candidate-first/03-terminal.png',
                      'sha256': '869352b12fb9be83b7dd281cc4a01f1052678ddb0eb175b37b11ac3445d05e3e'},
 'failedLog': {'bytes': 409,
               'file': '/private/tmp/tube-local-sheet-capture-20261005/native.log',
               'sha256': 'c0c7fab5bcb1f83716f36978856d77ab298a600f67dc38bf4a2164bd5fdfa937'},
 'failedOwner': {'bytes': 1670,
                 'file': '/private/tmp/tube-local-sheet-capture-20261005/owner.json',
                 'sha256': '32d73fe12f82a07a59e672ab127951c66df0b12b5485d59df17a335d0f8fd76c'},
 'failedReport': {'bytes': 22080,
                  'file': '/private/tmp/tube-local-sheet-capture-20261005/candidate-first/report.json',
                  'sha256': '4b174a141e3e4ff570e9b1a3521a3a75109888e1d1320040f96be533fe884b65'},
 'matureCore': {'bytes': 1583143,
                'file': '/private/tmp/tube-c-mature-mouth-inspection-native-20261005/candidate-first/mature-core.png',
                'sha256': '92f15efc11cfe98bdf961f44721dd24ee6f0261cb9019dc8cc520ce59518a479'},
 'matureNormal': {'bytes': 2444798,
                  'file': '/private/tmp/tube-c-mature-mouth-inspection-native-20261005/candidate-first/normal.png',
                  'sha256': '1af4aaf18248eb89395d6dc3a8de71efe5ef44fe9596c381cbf2148ebd913fe5'},
 'matureReport': {'bytes': 41583,
                  'file': '/private/tmp/tube-c-mature-mouth-inspection-native-20261005/candidate-first/report.json',
                  'sha256': '47c4c82ba86de60adede064625d34a0ef109b81b6c897324eaa00f7e9f548685'},
 'opticalBuildLog': {'bytes': 1328,
                     'file': '/private/tmp/tube-local-sheet-capture-20261005/build.log',
                     'sha256': 'dc86b2754b74cd2c439ec55a1d4e99a9f3b3128eb4e290e47591ad4cb0a63605'},
 'rayAnalysis': {'bytes': 190888,
                 'file': '/private/tmp/tube-c-mature-sheet-ray-audit-20261005/analysis-first.json',
                 'sha256': 'cb5ca1262e5d57c2f03fc9eea42e27731d9d3e1917aef72fbb0ed0f62d801dd6'},
 'rayFreeze': {'bytes': 1047,
               'file': '/private/tmp/tube-c-mature-sheet-ray-audit-20261005/source-freeze.json',
               'sha256': 'e831da6fadd812ef70da6a26ed18993dde16d8d6c77a48273f8623d3d7d91c51'},
 'rayInputs': {'bytes': 31544,
               'file': '/private/tmp/tube-c-mature-sheet-ray-audit-20261005/inputs.json',
               'sha256': '10a3cea7cd5a51c626b16c2b6c4b10e5194c47bc93b6073a6d2db5230d4aea38'},
 'rayProducer': {'bytes': 29493,
                 'file': '/private/tmp/tube-c-mature-sheet-ray-audit-20261005/ray-audit.py',
                 'sha256': '03526ce68bf95fab1d97dfec03f6a021ad583d1ebc9bfee2842eac86bcdbb4c4'},
 'refractionAnalysis': {'bytes': 195253,
                        'file': '/private/tmp/tube-c-sheet-refraction-audit-20261005/analysis-first.json',
                        'sha256': 'a78f0f21a6f27f368839c7ab8c7806a46399f72912b361ba7ef2cd3df8312e22'},
 'refractionFreeze': {'bytes': 1072,
                      'file': '/private/tmp/tube-c-sheet-refraction-audit-20261005/source-freeze.json',
                      'sha256': '47562262d10e2a6f9704cc8dcd01b2fffe64af3d03ac751f65c512de0d4bad93'},
 'refractionInputs': {'bytes': 17216,
                      'file': '/private/tmp/tube-c-sheet-refraction-audit-20261005/inputs.json',
                      'sha256': '4d6261f17693047c90436e19efec72df98d1e220999c2f4aebf3eaf19a211417'},
 'refractionProducer': {'bytes': 30027,
                        'file': '/private/tmp/tube-c-sheet-refraction-audit-20261005/refraction-audit.py',
                        'sha256': '56f9033b1fc3f3e8067304c40793390c27dc24fbf28f5669f63f02047278e3c5'},
 'refractionReadme': {'bytes': 4444,
                      'file': '/private/tmp/tube-c-sheet-refraction-audit-20261005/README.txt',
                      'sha256': '7cd64a10be9c89664ed17acf2630c7dc01f0a09f53fccfa3f18cfabe6e313a71'},
 'regionPng': {'bytes': 492898,
               'file': '/private/tmp/tube-c-mature-region-native-20261005/candidate-first/mature-region.png',
               'sha256': '0133e27251ae5a57549b59f96b3120024f92f3b002c3052cc8db803594a676ac'},
 'v2Bridge': {'bytes': 6320,
              'file': '/private/tmp/tube-local-sheet-capture-v2-20261005/inspection-bridge.mjs',
              'sha256': '868f566ac68b4ed18286d7940bda34f44f2db0a4a500b73a19599da6862bfe40'},
 'v2Build': {'bytes': 12292,
             'file': '/private/tmp/tube-local-sheet-capture-v2-20261005/build.json',
             'sha256': 'f4e4c7592bad8ba21244006192eb5ad4e676ec217446105caf428ce1d8c6d966'},
 'v2Core': {'bytes': 1783695,
            'file': '/private/tmp/tube-local-sheet-capture-v2-20261005/candidate-first/mature-core.png',
            'sha256': 'a849849a5a840faec80d49b292456b86f31e8ed8e915f6a3cbe306d5ab311588'},
 'v2Inputs': {'bytes': 5443,
              'file': '/private/tmp/tube-local-sheet-capture-v2-20261005/inputs.json',
              'sha256': '2d75bcebe23d7826c75e2cc4cc05306d3304e9eeb880b912b9956e8e686d2ed4'},
 'v2LipSheet': {'bytes': 19136,
                'file': '/private/tmp/tube-local-sheet-capture-v2-20261005/source/src/wave/barrel/lipSheet.ts',
                'sha256': 'a0e7b35563ffba056658550d9b892df46b4990259551268825dbeb6ce10e6a7b'},
 'v2MatureHelper': {'bytes': 22397,
                    'file': '/private/tmp/tube-local-sheet-capture-v2-20261005/mature-mouth.mjs',
                    'sha256': '445008ae495e54bb370400f46ccaf6975446d3f1f6efcd39365fe7b0343ecb44'},
 'v2Native': {'bytes': 18449,
              'file': '/private/tmp/tube-local-sheet-capture-v2-20261005/native.mjs',
              'sha256': 'd2f672f1dd42f833f7649d4ace399340436f7470e7e1a303721dca9c6f00da12'},
 'v2NativeLog': {'bytes': 126,
                 'file': '/private/tmp/tube-local-sheet-capture-v2-20261005/native.log',
                 'sha256': '1fa2116e575a343563273cef48fccdb7462e0ba46c2ae4f919ae0b2adc4a9c81'},
 'v2Owner': {'bytes': 1675,
             'file': '/private/tmp/tube-local-sheet-capture-v2-20261005/owner.json',
             'sha256': '9ad374bcec79b263a5f2ab167488ecbdc8b8640a466b453ae2dd3a8c7cdca4fc'},
 'v2Prepare': {'bytes': 2452,
               'file': '/private/tmp/tube-local-sheet-capture-v2-20261005/prepare.py',
               'sha256': 'd093c6e0a9fe17949fd5fee362c302bc4fc384483d94d7c9abd792bcd10770c8'},
 'v2Renderer': {'bytes': 32142,
                'file': '/private/tmp/tube-local-sheet-capture-v2-20261005/source/src/scene/barrel/SweptBarrelMesh.ts',
                'sha256': 'd6390abedac07df4fbac5435dba82e2a5d67fd34943ce3d8a00e714e05981915'},
 'v2RendererTests': {'bytes': 26095,
                     'file': '/private/tmp/tube-local-sheet-capture-v2-20261005/source/src/scene/barrel/SweptBarrelMesh.test.ts',
                     'sha256': '0c99d965030a5aa752c9bc9f518a042f4dfaf82fe816242530674a95bdd69c5d'},
 'v2Report': {'bytes': 43553,
              'file': '/private/tmp/tube-local-sheet-capture-v2-20261005/candidate-first/report.json',
              'sha256': '9b73e41f796b628772cf33a0a7cac689d2b8c6c1a8b31a285ef5d5d95aea1323'},
 'v2Run': {'bytes': 4398,
           'file': '/private/tmp/tube-local-sheet-capture-v2-20261005/run.py',
           'sha256': '88957cb144ff61f6d9bf77c32347806b2a91d561b82c744c70560a4288cddca7'},
 'v2Seal': {'bytes': 4233,
            'file': '/private/tmp/tube-local-sheet-capture-v2-20261005/seal.json',
            'sha256': 'ba6f6c51c1505939127517bc19686c9205f6455cf375a68d5fb73f0fb9da7640'},
 'v2SheetTests': {'bytes': 6599,
                  'file': '/private/tmp/tube-local-sheet-capture-v2-20261005/source/src/wave/barrel/sheetExitNormals.test.ts',
                  'sha256': 'c684e9fd1ba8af0d90899b4e9472a72b2d7a55337c144801d4e6cff0a7d8d978'}}
PLAN = {}
REFERENCES = []


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def pin(path):
    raw = Path(path).read_bytes()
    return {'file': str(path), 'bytes': len(raw), 'sha256': sha(raw)}


def exact(key):
    record = PINS[key]
    p = Path(record['file'])
    require(p.is_file() and p.stat().st_size == record['bytes'], 'Pinned input size changed: ' + key)
    raw = p.read_bytes()
    require(sha(raw) == record['sha256'], 'Pinned input bytes changed: ' + key)
    return raw


def parsed(key):
    return json.loads(exact(key))


def retain(key, destination, compressed=False):
    require(destination not in PLAN, 'Duplicate archive path')
    require(not Path(destination).is_absolute() and '..' not in Path(destination).parts, 'Unsafe archive path')
    PLAN[destination] = {'original': PINS[key], 'encoding': 'gzip' if compressed else 'identity'}


def reference(record, archive):
    # Read only this directly named archive/member; never traverse its references.
    manifest = json.loads((archive/'manifest.json').read_bytes())
    require(manifest['complete'] is True, 'Prior curated archive incomplete')
    rows = [r for r in manifest['files'] if r['original']['file'] == record['file']]
    require(len(rows) == 1, 'Direct archived member missing or ambiguous')
    row = rows[0]
    require(row['original'] == record, 'Direct original pin mismatch')
    stored = (archive/row['path']).read_bytes()
    require(len(stored) == row['archivedBytes'] and sha(stored) == row['archivedSha256'], 'Direct archived bytes changed')
    raw = gzip.decompress(stored) if row['encoding'] == 'gzip' else stored
    require(len(raw) == record['bytes'] and sha(raw) == record['sha256'], 'Direct archived original bytes changed')
    REFERENCES.append({'original': record, 'archive': '../'+archive.name+'/'+row['path'],
                       'encoding': row['encoding'], 'archivedBytes': len(stored),
                       'archivedSha256': sha(stored), 'decompressedBytesVerified': True})
    return raw


def prepare():
    require(not OUT.exists(), 'Archive exists; refusing overwrite')
    ray = parsed('rayAnalysis')
    optical = parsed('refractionAnalysis')
    require(ray['schema'] == 'c-mature-fixed-sheet-ray-analysis/v1' and ray['complete'] is True and
            optical['schema'] == 'c-fixed-sheet-refraction-analysis/v1' and optical['complete'] is True and
            ray['firstFailure'] is None and optical['firstFailure'] is None and
            optical['parentRayAnalysis'] == PINS['rayAnalysis'], 'Offline result authority incomplete')
    for result in (ray, optical):
        require(result['resourcesStarted'] is False and result['portsProbed'] is False and
                result['cameraEpochOrModelChanged'] is False and len(result['rays']) == 5, 'Offline bounds changed')
    require(ray['epoch'] == optical['epoch'] and ray['fixedCamera'] == optical['fixedCamera'] and
            ray['counts'] == optical['counts'], 'Offline camera/epoch geometry disagreement')
    optical_by_name = {r['location']['name']: r for r in optical['rays']}
    require(list(optical_by_name) == ['center', 'right-center', 'lower-right', 'top-right', 'left-center'], 'Fixed ray order changed')
    ray_summary = []
    for name, row in optical_by_name.items():
        mean = row['currentMeanChordApproximation']['twoInterfaceExitFromBaseInputs']
        local = row['localOppositeRunComparison']['exitUsingPairedUnitNormalSourceOrientation']
        candidate = row['indexedRefractedRay'].get('nearestCandidate')
        candidate_exit = candidate['sourceStyleExitUsingCandidateBaseNormal'] if candidate else None
        if name in ('center', 'right-center', 'lower-right'):
            require(mean['totalInternalReflection'] is True and mean['sourceTransmissionGateFromBaseInputs'] is False and
                    local['sourceTransmissionGateFromBaseInputs'] is True and
                    candidate_exit['sourceTransmissionGateFromBaseInputs'] is True,
                    'Expected completed three-ray base-normal discrepancy changed')
        ray_summary.append({'name': name, 'pixel': row['pixel'], 'entryTriangleOrdinal': row['entryTriangleOrdinal'],
                            'entryRows': row['entryRows'], 'entryFronts': row['entryFronts'],
                            'sheetWeight': row['entryInterpolatedAttributes']['sheetWeight'],
                            'baseViewCosine': row['baseWaterViewCosine'],
                            'meanChordTir': mean['totalInternalReflection'] if mean else None,
                            'meanBaseTransmission': mean['sourceTransmissionGateFromBaseInputs'] if mean else None,
                            'localBaseTransmission': local['sourceTransmissionGateFromBaseInputs'] if local else None,
                            'nearestCandidateBaseTransmission': candidate_exit['sourceTransmissionGateFromBaseInputs'] if candidate_exit else None,
                            'actualShaderCauseAccepted': False})
    for prefix, directory, producer in [('ray', RAY, 'ray-audit.py'), ('refraction', REFRACTION, 'refraction-audit.py')]:
        freeze = parsed(prefix+'Freeze')
        require(freeze['unexecutedAtPreparation'] is True and freeze['analysisExecuted'] is False,
                'Original preparation receipt was rewritten as an execution outcome')
        by_name = {Path(r['file']).name: r for r in freeze['files']}
        require(by_name['inputs.json'] == PINS[prefix+'Inputs'] and by_name[producer] == PINS[prefix+'Producer'],
                'Producer/input source freeze mismatch')
        retain(prefix+'Analysis', prefix+'/analysis-first.json.gz', True)
        retain(prefix+'Producer', prefix+'/'+producer)
        retain(prefix+'Inputs', prefix+'/inputs.json.gz', True)
        retain(prefix+'Freeze', prefix+'/source-freeze.json')
    retain('refractionReadme', 'refraction/README.txt')
    require(parsed('rayInputs')['schema'] == 'c-mature-fixed-sheet-ray-inputs/v1' and
            parsed('refractionInputs')['schema'] == 'c-fixed-sheet-refraction-inputs/v1', 'Input schema changed')
    prior = parsed('rayInputs')
    mature_report = json.loads(reference(PINS['matureReport'], MATURE))
    loft = json.loads(reference(prior['expected']['parentSidecar'], MATURE))
    require(mature_report['inspection']['cameraDerivation'] == ray['fixedCamera'] and
            loft['epoch'] == ray['epoch'] and loft['counts'] == ray['counts'] and len(loft['arrays']) == 37,
            'Direct mature camera/full37 reference changed')
    reference(PINS['matureNormal'], MATURE)
    reference(PINS['matureCore'], MATURE)
    reference(PINS['regionPng'], REGION)

    defaults = parsed('defaultsReport')
    default_owner = parsed('defaultsOwner')
    require(defaults['schema'] == 'c-default-stance-native/v1' and defaults['complete'] is True and
            defaults['firstFailure'] is None and defaults['stepCount'] == len(defaults['steps']) == 1457 and
            defaults['chromeClosed'] is True and default_owner['complete'] is True and default_owner['exitCode'] == 0 and
            default_owner['firstFailure'] is None and default_owner['independentClosureValid'] is True and
            default_owner['protectedPortsPreserved'] is True and not default_owner['remainingOwnedPids'] and
            all(default_owner['closedPorts'].values()) and defaults['sealSha256'] == default_owner['sealSha256'],
            'Default-stance producer is not completed and closed')
    standing = sum(row['ride']['phase'] == 'standing' for row in defaults['steps'])
    require(standing == 85 and defaults['entry']['firstPartial'] is None and
            defaults['entry']['firstConnectedWitnessEntry'] is None and
            defaults['entry']['maximumConsecutiveContainedSteps'] == 0 and
            defaults['entry']['residenceIntervals'] == [] and defaults['entry']['fullBodyClearancePass'] is False,
            'Default-stance outcome changed')
    terminal = next(a for a in defaults['artifacts'] if a['file'] == '03-terminal.png')
    require((terminal['bytes'], terminal['sha256']) == (PINS['defaultsTerminal']['bytes'], PINS['defaultsTerminal']['sha256']),
            'Default-stance terminal image pin mismatch')
    retain('defaultsReport', 'default-stance/report.json.gz', True)
    retain('defaultsOwner', 'default-stance/owner.json')
    retain('defaultsTerminal', 'default-stance/terminal.png')

    failed = parsed('failedReport')
    failed_owner = parsed('failedOwner')
    require(failed['complete'] is False and failed_owner['complete'] is False and failed_owner['exitCode'] == 1 and
            'Published bounded contact diagnostics required' in failed['firstFailure'] and
            failed['stepCount'] == 0 and failed['pngCount'] == 0 and failed['artifacts'] == [] and
            failed['ownedBrowserClose'] is True and all(failed_owner['closedPorts'].values()) and
            failed_owner['protectedPreserved'] is True and
            failed_owner['protectedBefore'] == failed_owner['protectedAfter'], 'Failed capture classification changed')
    retain('failedOwner', 'first-shader-capture-failed/owner.json')
    retain('failedReport', 'first-shader-capture-failed/report.json.gz', True)
    retain('failedLog', 'first-shader-capture-failed/native.log')

    corrected = parsed('v2Report')
    corrected_owner = parsed('v2Owner')
    corrected_build = parsed('v2Build')
    corrected_seal = parsed('v2Seal')
    require(corrected['schema'] == 'local-sheet-capture-native/v1' and corrected['complete'] is True and
            corrected['firstFailure'] is None and corrected['ownedBrowserClose'] is True and
            corrected['stepCount'] == 0 and corrected['steps'] == [] and corrected['browserErrors'] == [] and
            corrected_owner['complete'] is True and corrected_owner['exitCode'] == 0 and corrected_owner['firstFailure'] is None and
            corrected_owner['protectedPreserved'] is True and corrected_owner['protectedBefore'] == corrected_owner['protectedAfter'] and
            all(corrected_owner['closedPorts'].values()), 'Corrected fixed native capture is not complete and closed')
    require(corrected_seal['complete'] is True and corrected_seal['rootAuthorized'] is True and
            corrected_owner['sealSha256'] == corrected['sealSha256'] == PINS['v2Seal']['sha256'] and
            corrected_owner['build'] == corrected_seal['approvedApplicationBuild'] == PINS['v2Build'] and
            corrected_build['schema'] == 'local-sheet-build/v1' and corrected_build['build'] == 'tube-local-sheet-20261005',
            'Corrected capture build/seal binding changed')
    match = corrected['canonicalMatureReferenceMatch']
    require(all(match[k] is True for k in ('selectorExact', 'epochAndStepExact', 'cameraDerivationExact',
            'activeFull37AndRawFrontWordsExact', 'pairedCloneCameraUnchanged')) and
            match['fullSolverOrPixelEqualityClaim'] is False and
            corrected['inspection']['cameraDerivation'] == ray['fixedCamera'] and
            corrected['inspection']['selector'] == mature_report['inspection']['selector'] and
            corrected['sidecar']['epoch'] == ray['epoch'], 'Corrected canonical comparison changed')
    guard = corrected['inspection']['nonmutation']
    require(guard['unchanged'] is True and guard['normalRenderRestored'] is True and
            guard['checkedLoftArrays'] == 37 and guard['exactActiveByteComparison'] is True,
            'Corrected capture restoration incomplete')
    artifacts = {r['file']: r for r in corrected['artifacts']}
    require(set(artifacts) == {'normal.png', 'mature-core.png', 'mature-region.png', 'loft-terminal.json', 'steps.ndjson'} and
            artifacts['steps.ndjson']['bytes'] == 0 and corrected['traceBytes'] == 0,
            'Corrected capture artifact set changed')
    for name, key in [('normal.png', 'matureNormal'), ('mature-region.png', 'regionPng')]:
        require((artifacts[name]['bytes'], artifacts[name]['sha256']) == (PINS[key]['bytes'], PINS[key]['sha256']),
                'Expected unchanged corrected image differs: '+name)
    parent_loft_pin = prior['expected']['parentSidecar']
    require((artifacts['loft-terminal.json']['bytes'], artifacts['loft-terminal.json']['sha256']) ==
            (parent_loft_pin['bytes'], parent_loft_pin['sha256']), 'Corrected full37/rawfront payload differs')
    require((artifacts['mature-core.png']['bytes'], artifacts['mature-core.png']['sha256']) ==
            (PINS['v2Core']['bytes'], PINS['v2Core']['sha256']) and
            artifacts['mature-core.png']['sha256'] != PINS['matureCore']['sha256'], 'Corrected new core image binding changed')
    for key, destination, compressed in [
        ('v2Owner', 'corrected-native/owner.json', False),
        ('v2Report', 'corrected-native/report.json.gz', True),
        ('v2Native', 'corrected-native/producer/native.mjs', False),
        ('v2NativeLog', 'corrected-native/native.log', False),
        ('v2Prepare', 'corrected-native/producer/prepare.py', False),
        ('v2Run', 'corrected-native/producer/run.py', False),
        ('v2Inputs', 'corrected-native/producer/inputs.json.gz', True),
        ('v2MatureHelper', 'corrected-native/producer/mature-mouth.mjs', False),
        ('v2Bridge', 'corrected-native/producer/inspection-bridge.mjs', False),
        ('v2Build', 'corrected-native/build.json', False),
        ('v2Seal', 'corrected-native/seal.json', False),
        ('v2Core', 'corrected-native/mature-core.png', False),
        ('v2LipSheet', 'corrected-native/source/src/wave/barrel/lipSheet.ts', False),
        ('v2SheetTests', 'corrected-native/source/src/wave/barrel/sheetExitNormals.test.ts', False),
        ('v2Renderer', 'corrected-native/source/src/scene/barrel/SweptBarrelMesh.ts', False),
        ('v2RendererTests', 'corrected-native/source/src/scene/barrel/SweptBarrelMesh.test.ts', False),
        ('opticalBuildLog', 'root-checks/optical-build.log', False),
        ('broadGeometryLog', 'root-checks/broad-geometry-336-of-339.log', False),
    ]:
        exact(key)
        retain(key, destination, compressed)
    source_records = {r['file']: r for r in corrected_build['sources']}
    for key in ('v2LipSheet', 'v2SheetTests', 'v2Renderer', 'v2RendererTests'):
        require(source_records[PINS[key]['file']] == PINS[key], 'Frozen optical source/build binding changed')
    helper_records = {r['file']: r for r in corrected_seal['helpers']}
    for key in ('v2Native', 'v2Inputs', 'v2MatureHelper', 'v2Bridge'):
        require(helper_records[PINS[key]['file']] == PINS[key], 'Corrected producer/seal binding changed')
    captured_geometry = next(r for r in corrected_build['sources'] if r['file'].endswith('/boundedCProfile.ts'))
    require(captured_geometry['sha256'] == '0dba650afc9844df79c1beb61319bddbc257562c0f93ff083fe3838e0cebbd98',
            'Captured old boundedCProfile differs from the declared geometry checkpoint')
    require(b'336 passed' in exact('broadGeometryLog') and b'3 failed' in exact('broadGeometryLog') and
            b'built in' in exact('opticalBuildLog'), 'Retained actual build/broad-test log classification changed')
    PLAN['archive-builder.py'] = {'original': pin(Path(__file__).resolve()), 'encoding': 'identity'}
    require(len(PLAN) == MAX_FILES and len(REFERENCES) == MAX_REFERENCES and
            sum(e['original']['bytes'] for e in PLAN.values()) <= MAX_RAW_BYTES, 'Lean archive record/byte cap')
    return {'schema': 'local-sheet-optics-checkpoint-summary/v1', 'complete': True,
            'offlineRays': ray_summary, 'offlineRayProducerElapsedSeconds': ray['elapsedSeconds'],
            'offlineRefractionProducerElapsedSeconds': optical['elapsedSeconds'],
            'defaultStance': {'steps': defaults['stepCount'], 'standingSteps': standing, 'entry': defaults['entry'],
                              'stop': defaults['stop'], 'standingInputOverlay': defaults['policy']['standingInputOverlay'],
                              'ownerElapsedSeconds': default_owner['elapsedSeconds'], 'tubeEntryAccepted': False},
            'firstShaderCaptureFailure': {'exitCode': 1, 'firstFailure': failed['firstFailure'], 'stepCount': 0,
                                          'pngCount': 0, 'ownerElapsedSeconds': failed_owner['elapsedSeconds'],
                                          'ownedPortsClosed': failed_owner['closedPorts'],
                                          'previewListenerIdentitiesPreserved': True,
                                          'passiveTelemetryMissing': True, 'shaderResultAccepted': False},
            'correctedNative': {'complete': True, 'exitCode': 0, 'steps': 0, 'ownerElapsedSeconds': corrected_owner['elapsedSeconds'],
                                'canonicalComparison': match, 'capturedGeometrySourcePin': captured_geometry,
                                'currentWorktreeGeometryCandidateIncluded': False,
                                'newCoreImage': artifacts['mature-core.png'], 'normalRegionFull37PayloadsDuplicated': False,
                                'rootVisualObservation': 'Large black wedge replaced by directional cloud/sky transmission on the water sheet; a narrow black strip remains at bottom right.',
                                'exposedMouthReferenceQualityOrRideAccepted': False},
            'rootChecks': {'focusedOpticalTests': {'source': 'Root tool observation: exec session69297 terminal0',
                                                   'testFilesPassed': 3, 'testsPassed': 23, 'durationSeconds': 2.12,
                                                   'rawTestStdoutRetained': False, 'shaderQualityAcceptance': False},
                           'buildLogRetained': True,
                           'broadGeometryTests': {'passed': 336, 'total': 339, 'failed': 3, 'logRetained': True,
                                                   'allGreen': False, 'opticsOrPendingGeometryAcceptance': False}},
            'checkpointPending': {'correctedNativeCaptureRetained': True, 'correctedNativeFixedPoseComparisonComplete': True,
                                  'geometryCandidateOutcomeAccepted': False},
            'acceptance': {'baseNormalThreeRayMeanChordDiscrepancyRecorded': True, 'actualShaderCause': False,
                           'fixedPoseLocalOpticalEffectObserved': True,
                           'waterVolumeOrRasterSurvival': False, 'visualQuality': False, 'tubeEntry': False,
                           'bodyPassage': False, 'performance': False, 'geometryCandidate': False},
            'retainedOriginalFiles': len(PLAN), 'directExternalReferences': len(REFERENCES),
            'runtimeOrDepsOrAssetsCopied': False, 'oldMediaCopied': False, 'unfinishedCaptureReadOrArchived': False}


def readme(summary):
    return '''# Local sheet optics checkpoint — 2026-10-05

Two completed offline producers examine the same five fixed rays at the accepted
mature camera and exact 37-array epoch. For center, right-center and lower-right,
the current row-wide chord approximation predicts total internal reflection;
local nearest opposite-run normals and the nearest indexed refracted-ray roof
candidates predict transmission with the same pre-chop/ripple entry normal.
This records a bounded discrepancy in the mean-chord approximation. The
accepted fixed-pose native comparison below shows the local optical effect;
exact per-fragment shader cause, final perturbed normals, raster survival,
closed water volume, sky visibility, radiance and reference quality remain unproved.

The [ray result](ray/analysis-first.json.gz) and [refraction result](refraction/analysis-first.json.gz)
retain exact producer, inputs and preparation freezes. Those original freezes
still say unexecuted at preparation; separate completed results record execution.
The [refraction README](refraction/README.txt) records source pairing/chord and
base-normal limitations. Reports and inputs use gzip with exact decompression
byte/SHA-256 verification; manifest.json pins every retained original and stored file.

The completed default-stance trial ran 1457 steps, including 85 standing steps,
then fell with balance separation. No partial or connected witness entry was
observed, and maximum contained residence was zero. It used public default
standing crouch/compress0/0 after the controlled first-standing prefix.
Only its [exact report](default-stance/report.json.gz), owner and
[terminal image](default-stance/terminal.png) are retained here; no movie or older
checkpoint media is copied. This outcome does not demonstrate tube entry or
body passage, or establish a causal improvement over other controls.

The first shader capture ended exit1 after missing published passive contact
telemetry, before any physics steps or PNG artifacts. Its owner, exact report
and native log are retained only as a failure. It closed4301/9711 and preserved
4312/4313/4314 listener identities. It yields no shader or geometry acceptance.
The corrected v2 capture then completed exit0 in165.609s with0steps, no browser
errors, resources closed and exact protected preview identities. Its camera,
selector, epoch, all37active loft arrays and raw front match the accepted parent.
Normal/region images and full37payload are byte-identical and directly referenced.
Only the new [core image](corrected-native/mature-core.png) is copied. Root viewed
it: the large black wedge is replaced by directional cloud/sky transmission on
the water sheet; a narrow black strip remains at bottom right. This is a bounded
fixed-camera optical improvement, not an exposed mouth, reference-quality tube,
rideability or rider-passage acceptance.

The corrected capture's owner/report, producer/preparation files, build/seal
and four frozen optical source/test files are retained. It uses the compiled
old boundedCProfile state, not the current worktree open-mouth candidate.
Root actually observed3focused files/23tests passing in2.12s (exec session69297,
terminal0). No raw test stdout file exists or is invented here. The actual
optical build log is retained. The broad shape test log separately records
336/339passed with3failures; it is not an optics or pending-geometry green gate.
The current geometry candidate remains under development and is excluded.

The exact [mature camera report](../tube-mature-interior-and-steering-2026-10-05/mature-interior/capture/report.json.gz),
[37-array sidecar](../tube-mature-interior-and-steering-2026-10-05/mature-interior/capture/loft-terminal.json.gz),
[ordinary image](../tube-mature-interior-and-steering-2026-10-05/mature-interior/capture/normal.png),
[core image](../tube-mature-interior-and-steering-2026-10-05/mature-interior/capture/mature-core.png)
and [region image](../tube-mature-sheet-ownership-2026-10-05/capture/mature-region.png)
use directly verified members of prior curated archives, without copying those
payloads or traversing ancestor/helper inventories. Temporary paths in receipts
record producer provenance rather than a standalone runtime checkout.

This lean builder launches no code/test/native producers or ports and copies
no runtime, dependencies, assets, old media or unfinished capture. Reference
quality, gameplay, geometry-candidate, mouth/body passage and FPS acceptance remain unproved.
'''


def main():
    summary = prepare()
    stage = OUT.with_name('.'+OUT.name+'.building')
    require(not stage.exists(), 'Prior staging exists; refusing overwrite')
    stage.mkdir(parents=True)
    records = []
    for destination, entry in PLAN.items():
        original = entry['original']
        raw = Path(original['file']).read_bytes()
        require(len(raw) == original['bytes'] and sha(raw) == original['sha256'], 'Input changed after preflight')
        stored = gzip.compress(raw, compresslevel=9, mtime=0) if entry['encoding'] == 'gzip' else raw
        target = stage/destination
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(stored)
        actual = target.read_bytes()
        decoded = gzip.decompress(actual) if entry['encoding'] == 'gzip' else actual
        require(decoded == raw and sha(decoded) == original['sha256'], 'Exact archive verification failed')
        records.append({'path': destination, 'encoding': entry['encoding'], 'original': original,
                        'archivedBytes': len(actual), 'archivedSha256': sha(actual), 'decompressedBytesVerified': True})
    derived = {}
    for name, raw in [('README.md', readme(summary).encode()),
                      ('summary.json', (json.dumps(summary, indent=2)+'\n').encode())]:
        (stage/name).write_bytes(raw)
        derived[name] = {'bytes': len(raw), 'sha256': sha(raw)}
    manifest = {'schema': 'local-sheet-optics-curated-archive/v1', 'complete': True, 'output': str(OUT),
                'files': records, 'derived': derived, 'externalReferences': REFERENCES,
                'directArchiveManifests': [pin(MATURE/'manifest.json'), pin(REGION/'manifest.json')],
                'runtimeCopied': False, 'dependenciesCopied': False, 'assetsCopied': False,
                'oldMediaDuplicated': False, 'unfinishedCaptureRetained': False,
                'shaderCauseAccepted': False, 'geometryCandidateAccepted': False}
    (stage/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    require(not OUT.exists(), 'Archive appeared during preflight; refusing overwrite')
    os.rename(stage, OUT)
    print(json.dumps({'complete': True, 'output': str(OUT), 'retainedOriginalFiles': len(records),
                      'directExternalReferences': len(REFERENCES), 'newPngs': 2,
                      'resourcesStarted': False, 'portsProbed': False}, indent=2))


if __name__ == '__main__':
    main()
