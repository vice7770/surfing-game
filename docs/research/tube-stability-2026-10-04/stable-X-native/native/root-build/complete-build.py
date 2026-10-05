from pathlib import Path
import hashlib, json, shutil

B = Path('/private/tmp/tube-bounded-c-stable-x-build-20261005')
W = Path('/private/tmp/tube-bounded-c-stable-x-native-20261005')
S = Path('/private/tmp/tube-bounded-c-stable-x-sampling-20261005/source')
OLD = Path('/private/tmp/tube-bounded-c-native-20261004')

def pin(path):
    p = Path(path).resolve()
    data = p.read_bytes()
    return {'file': str(p), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

def verify(p):
    assert pin(p['file']) == p, p['file']

def assets(path):
    return [pin(p) for p in sorted(path.rglob('*')) if p.is_file()]

def save(path, value):
    assert not path.exists(), path
    path.write_text(json.dumps(value, indent=2) + '\n')

pre = json.loads((B/'prebuild.json').read_text())
assert pre['source'] == str(S)
for p in pre['sourcePins'] + [pre['readiness']]: verify(p)
assert len(pre['sourcePins']) == 583
dist = S/'dist'
assert json.loads((dist/'build.json').read_text())['build'] == pre['buildId']
built = assets(dist)
assert len(built) == 21
original = dict(pre, terminal=True, exitCode=0, rootToolSession=15806,
                sourceUnchangedAfterBuild=True, builtDist=str(dist), assetPins=built,
                terminalOutput='tsc -b passed; Vite v8.3.1, 255 modules, built in 293ms. Recorded tool output; no stdout file.')
save(B/'build-result.json', original)
W.mkdir(exist_ok=True)
partial = W/'candidate-dist'
assert not partial.exists()
shutil.copytree(dist, partial)
partialpins = assets(partial)
assert [(p['bytes'],p['sha256']) for p in partialpins] == [(p['bytes'],p['sha256']) for p in built]
partialresult = dict(original, frozenDist=str(partial), frozenAssetPins=partialpins,
                     rootOriginalBuildResult=pin(B/'build-result.json'))
save(W/'root-build-result.json', partialresult)
complete = W/'candidate-complete-dist'
assert not complete.exists()
shutil.copytree(partial, complete)
oldseal = pin(OLD/'seal.json')
prior = json.loads((OLD/'seal.json').read_text())
sealed = {p['file']: p for p in prior['arms']['candidate']['assetPins']}
references, overlaps = [], []
for directory in ('assets/audio','assets/skies','assets/surfers','lessons'):
    for source in sorted((OLD/'candidate-dist'/directory).rglob('*')):
        if not source.is_file(): continue
        sourcepin = pin(source)
        assert sealed[str(source.resolve())] == sourcepin
        relative = str(source.relative_to(OLD/'candidate-dist'))
        dest = complete/relative
        if dest.exists():
            assert dest.read_bytes() == source.read_bytes(), relative
            overlaps.append({'relative':relative,'source':sourcepin,'sameBuiltAsset':pin(dest)})
        else:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source,dest)
            references.append({'relative':relative,'source':sourcepin,'frozenCopy':pin(dest)})
assert len(references) == 28 and len(overlaps) == 2
completepins = assets(complete)
assert len(completepins) == 49
for p in pre['sourcePins'] + [pre['readiness'],oldseal]: verify(p)
result = dict(partialresult,
    schema='bounded-C-stable-X-root-complete-build/v1',
    frozenDist=str(complete), assetPins=completepins, frozenAssetPins=completepins,
    partialFrozenDist=str(partial), builtAssetPins=built,
    rootPartialBuildResult=pin(W/'root-build-result.json'), priorStaticAssetsSeal=oldseal,
    staticComposition={'newBuildAssets':21,'additionalStaticAssets':28,'identicalOverlap':2,
      'references':references,'overlap':overlaps,'sourceRuntimeCodeChanged':False,
      'rebuildPerformed':False,'partialBuildPreserved':True})
save(W/'root-complete-build-result.json', result)
print(json.dumps({'complete':True,'sourcePins':len(pre['sourcePins']),'builtAssetPins':21,
                  'completeAssets':49,'manifest':pin(W/'root-complete-build-result.json')}))
