from pathlib import Path
import argparse, hashlib, json, shutil

B = Path('/private/tmp/tube-board-rhs-components-build-20261005')
W = Path('/private/tmp/tube-board-rhs-components-native-20261005')
S = Path('/private/tmp/tube-board-rhs-components-native-20261005/source')
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

parser = argparse.ArgumentParser()
parser.add_argument('--session', required=True, type=int)
args = parser.parse_args()
command_pin = pin(B/'root-command-result.json')
command = json.loads(Path(command_pin['file']).read_text())
assert command['schema'] == 'board-rhs-components-root-application-command/v1'
assert command['complete'] and command['terminal'] and command['exitCode'] == 0 and command['sourceUnchanged']
assert [q['name'] for q in command['checks']] == ['strict-build', 'application'] and all(q['exitCode'] == 0 for q in command['checks'])
for q in command['checks']: verify(q['log'])
pre = json.loads((B/'root-prebuild.json').read_text())
assert command['prebuild'] == pin(B/'root-prebuild.json')

assert pre['source'] == str(S)
for p in pre['sourcePins'] + [pre['readiness']]: verify(p)
assert len(pre['sourcePins']) == pre['preparationSourcePins'] - len(pre['excludedPreparationInputs'])
dist = S/'dist'
assert json.loads((dist/'build.json').read_text())['build'] == pre['buildId']
built = assets(dist)
assert len(built) == 21
original = dict(pre, schema='board-rhs-components-root-build/v1', buildStarted=True, terminal=True, exitCode=0, rootToolSession=args.session,
                sourceUnchangedAfterBuild=True, builtDist=str(dist), assetPins=built, rootApplicationCommand=command_pin,
                generatedOutputPins=[pin(S/'tsconfig.tsbuildinfo')],
                terminalOutput=(B/'root-build-output.txt').read_text(), rootBuildOutputPin=pin(B/'root-build-output.txt'))
save(B/'root-build-result.json', original)
W.mkdir(exist_ok=True)
partial = W/'candidate-dist'
assert not partial.exists()
shutil.copytree(dist, partial)
partialpins = assets(partial)
assert [(p['bytes'],p['sha256']) for p in partialpins] == [(p['bytes'],p['sha256']) for p in built]
partialresult = dict(original, frozenDist=str(partial), frozenAssetPins=partialpins,
                     rootOriginalBuildResult=pin(B/'root-build-result.json'))
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
fields = json.loads((W/'observer-fields.json').read_text())['allFields']
assert len(fields) == len(set(fields)) == 143
import re
observer_assets=[]
for q in completepins:
    path=Path(q['file'])
    if path.suffix not in ('.js','.mjs'): continue
    text=path.read_text(); names=[word for word in fields if re.search(r'\b'+re.escape(word)+r'\b',text)]
    observer_assets.append({'asset':q,'observerIdentifierCount':len(names)})
assert len([q for q in observer_assets if q['observerIdentifierCount']==143])==2

for p in pre['sourcePins'] + [pre['readiness'],oldseal]: verify(p)
result = dict(partialresult,
    schema='board-rhs-components-root-complete-build/v1',
    frozenDist=str(complete), assetPins=completepins, frozenAssetPins=completepins,
    partialFrozenDist=str(partial), builtAssetPins=built,
    rootPartialBuildResult=pin(W/'root-build-result.json'), priorStaticAssetsSeal=oldseal,
    applicationObserverIdentifierCounts=observer_assets,
    staticComposition={'newBuildAssets':21,'additionalStaticAssets':28,'identicalOverlap':2,
      'references':references,'overlap':overlaps,'sourceRuntimeCodeChanged':False,
      'rebuildPerformed':False,'partialBuildPreserved':True})
save(W/'root-complete-build-result.json', result)
print(json.dumps({'complete':True,'sourcePins':len(pre['sourcePins']),'builtAssetPins':21,
                  'completeAssets':49,'manifest':pin(W/'root-complete-build-result.json')}))
