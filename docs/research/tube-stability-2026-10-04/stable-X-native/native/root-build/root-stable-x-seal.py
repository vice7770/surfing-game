from pathlib import Path
import argparse, hashlib, importlib.util, json, sys
sys.dont_write_bytecode = True
W = Path('/private/tmp/tube-bounded-c-stable-x-native-20261005')
S = Path('/private/tmp/tube-bounded-c-stable-x-sampling-20261005')

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
assert ready['schema'] == 'bounded-C-stable-X-native-readiness/v1'
assert ready['complete'] and ready['frozen'] and not ready['resourcesStarted']
assert ready['portsProbed'] is False and ready['buildPerformed'] is False
verify(ready['helperPinsManifest'])
assert ready['helperPinsManifest']['sha256'] == args.helper_manifest_sha
assert json.loads((W/'helper-pins.json').read_text()) == ready['helperPins']
for p in ready['helperPins']: verify(p)
verify(ready['rootCompleteBuild'])
assert ready['rootCompleteBuild']['sha256'] == '0acc32d4a53ae9541a4df4d899621c0d502e006034fde7ee47f02468b460b6ba'
build = json.loads(Path(ready['rootCompleteBuild']['file']).read_text())
spec = importlib.util.spec_from_file_location('stable_x_native_owner', W/'run.py')
owner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(owner)
assert owner.verify_complete_build(build, owner.CANDIDATE_DIST)
assert len(build['sourcePins']) == 583 and len(build['assetPins']) == 49
for p in build['sourcePins'] + build['assetPins']: verify(p)
source_ready = pin(S/'readiness.json')
assert source_ready['sha256'] == '9d9c5058cf5213ee0e910cc92c648587588e46c078fc6ce4cf80470594c178a6'
contract = pin(S/'parent-public-history-contract.json')
assert contract['sha256'] == '9bc50ab4ca8218ad9a8cc746d5593ca7c0f54b706da1e228badb0b6f89be7b25'
references = {}
for name in ('priorAirSeal','priorFullsheetSeal','priorParallelSeal','priorMouthSeal',
             'physicalSourceReadiness','carrierSourceReadiness','priorPhysicalMouthSeal',
             'priorFailedAgeGate','sourceContractCheck','publicHistoryContract',
             'priorCarrierSupportSeal','parentHelperReadiness','stableXSourceReadiness',
             'sourcePinsManifest'):
    if name in ready:
        verify(ready[name])
        references[name] = ready[name]
for name in ('priorFailedParallel','priorFailedMouth'):
    for p in ready[name].values(): verify(p)
    references[name] = ready[name]
assert 'priorAirSeal' in references and 'priorFullsheetSeal' in references
review = pin('/private/tmp/tube-stable-x-source-review-20261005/README.md')
assert review['sha256'] == 'fe0050f07ec1910c54f26306c11ddfd86a50b517e7773fe65f0e7811017bbebb'
arm = {'rootAuthorized': True, 'source': build['source'], 'dist': build['frozenDist'],
       'buildId': build['buildId'], 'sourcePins': build['sourcePins'],
       'assetPins': build['assetPins'], 'rootBuildManifest': ready['rootCompleteBuild']}
seal = {'schema': 'bounded-C-stable-X-root-seal/v1', 'complete': True,
        'rootPurpose': 'Inspect stable-X C sampling in ordinary moving native geometry, with unchanged camera/selection/identity/history and exact loft snapshots. Preserve honest loss and all failures. No visual, mouth, body, FPS or production acceptance inferred.',
        **references, 'stableXSourceReadiness': source_ready,
        'carrierPublicHistoryContract': contract, 'stableXSourceReview': review,
        'continuityLimit': 'Controlled measured-return stresses remove the prior grid shift at the tested live columns; retirement, overlap, budget and end seals can still change geometry. No global or native continuity claim before actual observations.',
        'componentLineagePolicy': ready['componentLineagePolicy'],
        'cameraPolicy': ready['cameraPolicy'],
        'exteriorAnchorPolicy': ready['exteriorAnchorPolicy'],
        'directHistoryProbePolicy': ready['directHistoryProbePolicy'],
        'loftSnapshotPolicy': ready['loftSnapshotPolicy'],
        'samplingDiagnosticsPolicy': ready['samplingDiagnosticsPolicy'],
        'helperPins': ready['helperPins'] + [ready['helperPinsManifest'], ready_pin],
        'arms': {'candidate': arm}}
(W/'seal.json').write_text(json.dumps(seal, indent=2)+'\n')
print(json.dumps({'complete': True, 'seal': pin(W/'seal.json'),
                  'sourcePins': len(build['sourcePins']), 'assets': len(build['assetPins']),
                  'helpers': len(ready['helperPins']), 'resourcesStarted': False, 'portsProbed': False}))
