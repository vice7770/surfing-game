"""Read-only current-pin/media integrity and recorded finite-owner closure review."""
from pathlib import Path
import base64, hashlib, json, struct, zlib

W = Path('/private/tmp/tube-bounded-c-retirement-boundary-native-20261005')
B = Path('/private/tmp/tube-stable-x-object-attribution-native-20261005')
OUT = Path('/private/tmp/tube-retirement-boundary-actual-comparison-20261005/owner-review')
cache = {}
def current(path):
    path = Path(path)
    if str(path) not in cache:
        body = path.read_bytes()
        cache[str(path)] = {'file': str(path), 'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest()}
    return cache[str(path)]
def verify(p, root=None):
    path = Path(p['file'])
    if root is not None:
        assert not path.is_absolute() and '..' not in path.parts
        path = root / path
    got = current(path)
    assert (got['bytes'], got['sha256']) == (p['bytes'], p['sha256']), str(path)
    return got
def pinwalk(obj):
    if isinstance(obj, dict):
        if {'file', 'bytes', 'sha256'} <= obj.keys():
            yield obj
        else:
            for value in obj.values(): yield from pinwalk(value)
    elif isinstance(obj, list):
        for value in obj: yield from pinwalk(value)
def read(path): return json.loads(Path(path).read_text())
def closure(owner):
    assert owner['complete'] is True and owner['firstFailure'] is None and owner['exitCode'] == 0
    assert owner['ports'] == [4299, 9709] and owner['protectedPorts'] == [4310, 4311, 4312]
    assert owner['ownedPortsInitiallyClosed'] == owner['closedPorts'] == {'4299': True, '9709': True}
    assert owner['remainingOwnedPids'] == [] and owner['independentClosureValid'] is True
    assert owner['protectedStatesInitially'] == owner['protectedStatesFinally'] == {'4310': True, '4311': True, '4312': False}
    assert owner['protectedPortsInitiallyOpen'] == owner['protectedPortsStillOpen'] == {'4310': False, '4311': False, '4312': True}
    assert owner['protectedPortsPreserved'] is True and owner['sourceBuildHelpersPostUnchanged'] is True
    assert owner['elapsedSeconds'] <= owner['wholeSeconds'] == 180
    assert owner['cleanupElapsedSeconds'] <= owner['cleanupSeconds'] == 7
    return {'complete': True, 'exitCode': 0, 'ownedPortsClosed': [4299, 9709], 'remainingOwnedPids': [],
            'protected4312OpenBeforeAndAfter': True, 'protected4310And4311ClosedBeforeAndAfter': True,
            'elapsedSeconds': owner['elapsedSeconds'], 'cleanupElapsedSeconds': owner['cleanupElapsedSeconds'],
            'recordedIndependentClosureValid': True, 'livePortsOrProcessesProbedByReviewer': False}

owner = read(W/'candidate-first-owner.json')
baseline = read(B/'candidate-first-owner.json')
report = read(W/'candidate-first/report.json')
seal = read(W/'seal.json')
build = read(W/'root-complete-build-result.json')
helpers = read(W/'helper-pins.json')
assert current(W/'seal.json')['sha256'] == owner['sealSha256']
assert current(B/'seal.json')['sha256'] == baseline['sealSha256']
assert seal['complete'] is True and build['terminal'] is True and build['exitCode'] == 0
assert report['complete'] is True and report['firstFailure'] is None and report['chromeClosed'] is True
assert report['browserErrors'] == [] and report['videoCleanup']['tracksStopped'] is True
arm = seal['arms']['candidate']
assert report['seal'] == arm and arm['sourcePins'] == build['sourcePins'] and arm['assetPins'] == build['assetPins']
assert arm['buildId'] == build['buildId'] == 'tube-bounded-c-retirement-boundary-cap-prefix-v2-20261005'
assert arm['dist'] == owner['dist'] == build['frozenDist'] == str(W/'candidate-complete-dist')
assert build['assetPins'] == build['frozenAssetPins'] and build['sourceUnchangedAfterBuild'] is True
seal_pins = list(pinwalk(seal)); build_pins = list(pinwalk(build))
for p in seal_pins + build_pins: verify(p)
for p in helpers: verify(p)
assert {p['file'] for p in seal['helperPins']} == {p['file'] for p in helpers} | {str(W/'helper-pins.json'), str(W/'readiness.json')}
preparation = read(seal['sourcePinsManifest']['file'])
source_root = Path(preparation['sourceRoot'])
if not source_root.is_absolute(): source_root = Path(seal['sourcePinsManifest']['file']).parent/source_root
assert str(source_root) == arm['source'] and preparation['count'] == len(preparation['pins']) == 588
prep = {}
for p in preparation['pins']:
    q = {**p, 'file': str(source_root/p['path'])}; verify(q); prep[q['file']] = q
excluded = {str(source_root/p) for p in build['excludedPreparationInputs']}
assert len(excluded) == 1 and {p['file'] for p in arm['sourcePins']} == set(prep) - excluded
for p in arm['sourcePins']: assert (p['bytes'], p['sha256']) == (prep[p['file']]['bytes'], prep[p['file']]['sha256'])
assert len(arm['sourcePins']) == 587 and len(arm['assetPins']) == 49 and len(seal['helperPins']) == 44 and len(helpers) == 42
dist_files = {str(p) for p in Path(arm['dist']).rglob('*') if p.is_file()}
assert dist_files == {p['file'] for p in arm['assetPins']}
partial = read(build['rootPartialBuildResult']['file'])
assert partial['terminal'] is True and partial['exitCode'] == 0 and partial['sourcePins'] == build['sourcePins']
assert partial['buildId'] == build['buildId'] and len(partial['frozenAssetPins']) == len(build['builtAssetPins']) == 21
comp = build['staticComposition']; assert comp['additionalStaticAssets'] == len(comp['references']) == 28
assert comp['identicalOverlap'] == len(comp['overlap']) == 2
assert comp['sourceRuntimeCodeChanged'] is False and comp['rebuildPerformed'] is False and comp['partialBuildPreserved'] is True
assets = {str(Path(p['file']).relative_to(arm['dist'])): p for p in arm['assetPins']}
fresh = set()
for p in build['builtAssetPins']:
    relative = str(Path(p['file']).relative_to(build['builtDist'])); fresh.add(relative)
    assert (p['bytes'], p['sha256']) == (assets[relative]['bytes'], assets[relative]['sha256'])
additional = set()
for relation in comp['references'] + comp['overlap']:
    src = relation['source']; dst = relation.get('frozenCopy', relation.get('sameBuiltAsset'))
    assert dst == assets[relation['relative']] and (src['bytes'], src['sha256']) == (dst['bytes'], dst['sha256'])
    if 'frozenCopy' in relation: additional.add(relation['relative']); assert relation['relative'] not in fresh
assert set(assets) == fresh | additional
for relative, p in owner['served'].items():
    verify({'file': relative, **p}, Path(arm['dist']))
    assert (p['bytes'], p['sha256']) == (assets[relative]['bytes'], assets[relative]['sha256'])

media = report['artifacts']; labels = [c['label'] for c in report['checkpoints']]
assert labels == ['initial', 'initial-exterior', 'first-phase2', 'first-phase2-water-hidden', 'first-phase2-barrel-hidden', 'terminal']
expected_media = [f'{i}-{label}.png' for i, label in enumerate(labels)] + ['moving-C.webm']
assert len(media) == 7 and len({p['file'] for p in media}) == 7 and [p['file'] for p in media] == expected_media
media_pins = []; png_total = 0
for p in media:
    got = verify(p, W/'candidate-first'); media_pins.append(got)
    body = (W/'candidate-first'/p['file']).read_bytes()
    if p['file'].endswith('.png'):
        assert body[:8] == b'\x89PNG\r\n\x1a\n' and len(body) <= 12*1024*1024
        at = 8; kinds = []
        while at < len(body):
            n = struct.unpack('>I', body[at:at+4])[0]; kind = body[at+4:at+8]
            data = body[at+8:at+8+n]; crc = struct.unpack('>I', body[at+8+n:at+12+n])[0]
            assert zlib.crc32(kind+data) & 0xffffffff == crc
            kinds.append(kind); at += 12+n
        assert at == len(body) and kinds[0] == b'IHDR' and kinds[-1] == b'IEND'
        png_total += len(body)
    else: assert body[:4] == b'\x1aE\xdf\xa3'
assert png_total == report['pngBytes'] <= 48*1024*1024
video = report['video']; assert video['complete'] is True and video['tracksStopped'] is True
assert video['file'] == media[-1]['file'] and (video['bytes'], video['sha256']) == (media[-1]['bytes'], media[-1]['sha256'])
assert video['requestFrameCount'] == video['requestCount'] == len(report['videoRequests'])
assert video['encodedFrameCountClaim'] is False and video['physicalPlaybackRateClaim'] is False

snapshot_summaries = []; json_total = 0; raw_total = 0
assert [s['label'] for s in report['loftSnapshots']] == ['initial', 'first-phase2']
for s in report['loftSnapshots']:
    got = verify(s, W/'candidate-first'); full = read(got['file'])
    assert s['file'] == 'loft-'+s['label']+'.json' and s['bytes'] <= 6*1024*1024
    assert full['schema'] == s['schema'] == 'bounded-C-complete-drawn-loft-words/v1'
    assert full['available'] is True and full['label'] == s['label']
    assert full['counts'] == s['counts'] and full['epoch'] == s['epoch'] and full['rawBytes'] == s['rawBytes'] <= 4*1024*1024
    cp = next(c for c in report['checkpoints'] if c['label'] == s['label'])
    assert cp['loftSnapshot'] == s and cp['step'] == full['epoch']['step']
    assert full['epoch']['movingStep'] == cp['observation']['movingStep']
    assert full['epoch']['seaTime'] == cp['observation']['seaTime']
    assert full['epoch']['surfaceRevision'] == cp['observation']['drawEpoch']['surfaceRevisionAfter']
    assert set(full['arrays']) == set(s['arrayManifest']) and len(full['arrays']) == 37
    assert full['arrayIdentitiesAndWordsUnchanged'] is True and full['unusedCapacityIncluded'] is False
    assert full['perFragmentOwnershipOrVisibilityClaim'] is False and full['openingOrBodyPassageClaim'] is False and full['geometryOrCameraSearch'] is False
    assert full['nonmutation'] == s['nonmutation'] and all(v is True for v in full['nonmutation'].values())
    raw = 0
    for key, a in full['arrays'].items():
        assert {k:v for k,v in a.items() if k != 'data'} == s['arrayManifest'][key]
        multiplier = {'positions':3, 'normals':3, 'mask':1, 'lift':1, 'sheet':1, 'sheetWeight':1, 'sheetBack':1, 'throat':4}
        count = multiplier[key]*full['counts']['vertices'] if key in multiplier else full['counts']['indices'] if key == 'indices' else full['counts']['slices']
        assert key in multiplier or key == 'indices' or key.startswith('slice')
        assert a['count'] == count and a['encoding'] == 'base64-exact-active-typed-array-words' and a['littleEndian'] is True
        assert a['byteLength'] == a['count']*{'Float32Array':4, 'Int32Array':4, 'Uint32Array':4, 'Uint8Array':1}[a['dtype']]
        if key in multiplier: assert a['dtype'] == 'Float32Array'
        decoded = base64.b64decode(a['data'], validate=True); assert len(decoded) == a['byteLength']; raw += len(decoded)
    assert raw == full['rawBytes']; json_total += got['bytes']; raw_total += raw
    snapshot_summaries.append({**got, 'label': s['label'], 'arrayCount':37, 'rawBytes':raw, 'exactActiveCountMetadataValid':True, 'epochMatchesCheckpoint':True})
assert json_total == report['snapshotBytes'] <= 12*1024*1024
assert {s['file'] for s in report['loftSnapshots']}.isdisjoint({p['file'] for p in media})
pair = report['objectAttribution']
assert pair['available'] is True and pair['renderObjectFlagsBefore'] == pair['renderObjectFlagsAfterRestore']
for key in ['normalObjectsRestored','normalRerenderedBeforeAdvance','derivedMaterialStateRestored','sourceClockStatusWordsUnchanged','normalAndDiagnosticCameraUnchanged','normalActorControlsUnchanged','allActiveLoftWordsAndDiagnosticsUnchanged','drawnSurfaceWordsAndEpochUnchanged','drawGenerationUnchanged','noPhysicsAdvanceOrMovieFrameRequest']:
    assert pair[key] is True
assert pair['primaryWaterObjectOnly'] is True and pair['allHeightfieldExcludedClaim'] is False and pair['perFragmentOwnershipClaim'] is False
for c, visibility in zip(report['checkpoints'][3:5],[{'waterVisible':False,'barrelVisible':True},{'waterVisible':True,'barrelVisible':False}]):
    assert c['temporaryVisibility'] == visibility and c['samePausedEpoch'] is True and c['sameCamera'] is True and c['step'] == report['checkpoints'][2]['step']
assert report['nativeMovingAppearanceProven'] is False and report['physicalGeometryEqualityClaim'] is False and report['bodyEntryClaim'] is False and report['fpsClaim'] is False

inputs = [current(p) for p in [W/'candidate-first-owner.json', W/'candidate-first-owner.log', W/'candidate-first/report.json', W/'seal.json', W/'root-complete-build-result.json', W/'helper-pins.json', B/'candidate-first-owner.json', B/'seal.json']]
result = {'schema':'bounded-C-retirement-boundary-actual-owner-integrity-review/v1','complete':True,'scope':'Read-only integrity and recorded owner closure; no live probes, reruns, geometry/body/appearance/native-quality/FPS/adoption acceptance.',
          'inputs':inputs,'candidateClosure':closure(owner),'baselineClosure':closure(baseline),
          'postPins':{'preparationSource':588,'buildSource':587,'completeDistAssets':49,'helperPayloadManifest':42,'sealedHelpersIncludingTwoMetadataFiles':44,'freshBuiltAssets':21,'additionalStaticAssets':28,'identicalStaticOverlaps':2,'servedResponses':len(owner['served']),'allVerifiedCurrent':True,'uniquePinnedFilesHashed':len(cache),'excludedPreparationInputs':build['excludedPreparationInputs']},
          'media':{'pngCount':6,'normalPNGCount':4,'diagnosticPNGCount':2,'pngBytes':png_total,'movieCount':1,'movieBytes':video['bytes'],'PNGChunkCRCsValid':True,'movieEBMLSignatureValid':True,'artifactPins':media_pins,'snapshots':snapshot_summaries,'snapshotJsonBytes':json_total,'snapshotRawBytes':raw_total,'arrayPayloadsVerified':74,'inventoriesSeparate':True,'objectFlagsAndMaterialRestoreEvidenceValid':True},
          'runtimeLaunchedByReviewer':False,'livePortsOrProcessesProbedByReviewer':False,'geometryOrInitialRawBodyEqualityComparedByReviewer':False,'inputFilesModified':False,'acceptanceClaims':{'shape':False,'physical':False,'body':False,'FPS':False,'production':False}}
(OUT/'result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'complete':True,'postPins':result['postPins'],'PNG':6,'movie':1,'snapshots':2,'arrayPayloadsVerified':74,'snapshotRawBytes':raw_total,'candidateProtected4312':True,'baselineProtected4312':True},indent=2))
