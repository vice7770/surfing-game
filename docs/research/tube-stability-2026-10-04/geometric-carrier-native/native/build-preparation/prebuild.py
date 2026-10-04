from pathlib import Path
import hashlib, json

B = Path(__file__).resolve().parent
S = Path('/private/tmp/tube-bounded-c-carrier-support-20261004/source')
R = S.parent / 'readiness.json'

def pin(path):
    path = Path(path).resolve()
    data = path.read_bytes()
    return {'file': str(path), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

ready_pin = pin(R)
assert ready_pin['sha256'] == 'be2073b25d70ca69db3b2362a18bcb618163a2ca4af42493f32b0090751d2cb0'
ready = json.loads(R.read_text())
assert ready['complete'] and ready['sourceRoot'] == str(S)
assert len(ready['sourcePins']) == 582
headers = {'index.html', 'package-lock.json', 'package.json', 'tsconfig.json', 'vite.config.ts'}
selected, excluded = [], []
for row in ready['sourcePins']:
    actual = pin(S / row['path'])
    assert (actual['bytes'], actual['sha256']) == (row['bytes'], row['sha256']), row['path']
    path = Path(row['path'])
    if path.parts[0] in ('src', 'public') or row['path'] in headers:
        selected.append(actual)
    else:
        excluded.append(row['path'])
assert excluded == ['docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json']
inventory = {str(p.resolve()) for folder in ('src', 'public') for p in (S / folder).rglob('*') if p.is_file()}
inventory |= {str((S / name).resolve()) for name in headers}
assert inventory == {p['file'] for p in selected}
assert len(selected) == 581
result = {'schema': 'bounded-C-carrier-support-root-prebuild/v1', 'source': str(S),
          'buildId': 'tube-bounded-c-carrier-support-20261004', 'readiness': ready_pin,
          'sourcePins': selected, 'preparationSourcePins': 582,
          'excludedPreparationInputs': excluded, 'rootHeaders': sorted(headers),
          'buildStarted': False, 'resourcesStarted': False, 'portsProbed': False}
target = B / 'prebuild.json'
assert not target.exists(), 'Preserve first prebuild record'
target.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'complete': True, 'sourcePins': len(selected), 'preparationSourcePins': 582,
                  'prebuild': pin(target), 'buildStarted': False, 'resourcesStarted': False}))
