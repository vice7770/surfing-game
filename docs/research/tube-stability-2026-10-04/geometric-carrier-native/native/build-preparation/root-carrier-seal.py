from pathlib import Path
import argparse, hashlib, importlib.util, json, sys
sys.dont_write_bytecode = True
W = Path('/private/tmp/tube-bounded-c-carrier-support-native-20261004')
S = Path('/private/tmp/tube-bounded-c-carrier-support-20261004')

def pin(path):
    p = Path(path).resolve()
    b = p.read_bytes()
    return {'file': str(p), 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}

def verify(p):
    assert pin(p['file']) == p, p['file']

parser = argparse.ArgumentParser()
parser.add_argument('--readiness-sha', required=True)
parser.add_argument('--helper-manifest-sha', required=True)
args = parser.parse_args()
assert not (W/'seal.json').exists(), 'Preserve the first root seal'
ready_pin = pin(W/'readiness.json')
assert ready_pin['sha256'] == args.readiness_sha
ready = json.loads((W/'readiness.json').read_text())
assert ready['schema'] == 'bounded-C-carrier-support-native-readiness/v1'
assert ready['complete'] and ready['frozen'] and not ready['resourcesStarted']
assert ready['portsProbed'] is False and ready['buildPerformed'] is False
verify(ready['helperPinsManifest'])
assert ready['helperPinsManifest']['sha256'] == args.helper_manifest_sha
assert json.loads((W/'helper-pins.json').read_text()) == ready['helperPins']
for p in ready['helperPins']: verify(p)
verify(ready['rootCompleteBuild'])
assert ready['rootCompleteBuild']['sha256'] == '0476e7e2fa189165cba5b6bb6f2393d9964f93ab4e31074cac2dab770df2b417'
build = json.loads(Path(ready['rootCompleteBuild']['file']).read_text())
spec = importlib.util.spec_from_file_location('carrier_native_owner', W/'run.py')
owner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(owner)
assert owner.verify_complete_build(build, owner.CANDIDATE_DIST)
assert len(build['sourcePins']) == 581 and len(build['assetPins']) == 49
for p in build['sourcePins'] + build['assetPins']: verify(p)
source_ready = pin(S/'readiness.json')
assert source_ready['sha256'] == 'be2073b25d70ca69db3b2362a18bcb618163a2ca4af42493f32b0090751d2cb0'
contract = pin(S/'public-history-contract.json')
assert contract['sha256'] == '9bc50ab4ca8218ad9a8cc746d5593ca7c0f54b706da1e228badb0b6f89be7b25'
stress = pin('/private/tmp/tube-carrier-release-stress-20261004/readiness.json')
assert stress['sha256'] == 'e70248b97415e50638ca8825c693a7c3cc2d902d15dc59d6a08224bce5ecf59b'
references = {}
for name in ('priorAirSeal','priorFullsheetSeal','priorParallelSeal','priorMouthSeal',
             'physicalSourceReadiness','carrierSourceReadiness','priorPhysicalMouthSeal',
             'priorFailedAgeGate','sourceContractCheck','publicHistoryContract'):
    if name in ready:
        verify(ready[name])
        references[name] = ready[name]
for name in ('priorFailedParallel','priorFailedMouth'):
    for p in ready[name].values(): verify(p)
    references[name] = ready[name]
assert 'priorAirSeal' in references and 'priorFullsheetSeal' in references
arm = {'rootAuthorized': True, 'source': build['source'], 'dist': build['frozenDist'],
       'buildId': build['buildId'], 'sourcePins': build['sourcePins'],
       'assetPins': build['assetPins'], 'rootBuildManifest': ready['rootCompleteBuild']}
seal = {'schema': 'bounded-C-carrier-support-root-seal/v1', 'complete': True,
        'rootPurpose': 'Inspect the bounded C incident geometric-carrier candidate with unchanged fixed-station camera policy, direct public carrier histories and two bounded exact drawn-loft word snapshots. Preserve all losses and failures. No shape, entrance, body, FPS or production acceptance.',
        **references, 'carrierSourceReadiness': source_ready,
        'carrierPublicHistoryContract': contract, 'releaseStressReadiness': stress,
        'releaseStressLimit': 'Controlled measured-distance trials preserve the tested phase-2 roof and topology but show up to39.025mm crest residual near the newly cut boundary; no broad numerical or native continuity claim.',
        'componentLineagePolicy': ready['componentLineagePolicy'],
        'cameraPolicy': ready['cameraPolicy'],
        'exteriorAnchorPolicy': ready['exteriorAnchorPolicy'],
        'directHistoryProbePolicy': ready['directHistoryProbePolicy'],
        'loftSnapshotPolicy': ready['loftSnapshotPolicy'],
        'helperPins': ready['helperPins'] + [ready['helperPinsManifest'], ready_pin],
        'arms': {'candidate': arm}}
(W/'seal.json').write_text(json.dumps(seal, indent=2)+'\n')
print(json.dumps({'complete': True, 'seal': pin(W/'seal.json'),
                  'sourcePins': len(build['sourcePins']), 'assets': len(build['assetPins']),
                  'helpers': len(ready['helperPins']), 'resourcesStarted': False, 'portsProbed': False}))
