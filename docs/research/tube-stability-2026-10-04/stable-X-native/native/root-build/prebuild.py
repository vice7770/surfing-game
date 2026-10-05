from pathlib import Path
import hashlib, json

B = Path(__file__).resolve().parent
S = Path('/private/tmp/tube-bounded-c-stable-x-sampling-20261005/source')
R = S.parent / 'readiness.json'

def pin(path):
    path = Path(path).resolve()
    data = path.read_bytes()
    return {'file': str(path), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

ready_pin = pin(R)
assert ready_pin['sha256'] == '9d9c5058cf5213ee0e910cc92c648587588e46c078fc6ce4cf80470594c178a6'
ready = json.loads(R.read_text())
assert ready['complete'] and ready['frozen'] and ready['sourceRoot'] == str(S)
manifest = ready['sourcePinsManifest']
manifest_pin = pin(S.parent / manifest['path'])
assert (manifest_pin['bytes'], manifest_pin['sha256']) == (manifest['bytes'], manifest['sha256'])
rows = json.loads(Path(manifest_pin['file']).read_text())
assert rows['count'] == len(rows['pins']) == ready['sourceCount']
headers = {'index.html', 'package-lock.json', 'package.json', 'tsconfig.json', 'vite.config.ts'}
selected, excluded = [], []
for row in rows['pins']:
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
result = {'schema': 'bounded-C-stable-X-root-prebuild/v1', 'source': str(S),
          'buildId': 'tube-bounded-c-stable-x-20261005', 'readiness': ready_pin,
          'sourcePinsManifest': manifest_pin, 'sourcePins': selected,
          'preparationSourcePins': len(rows['pins']),
          'excludedPreparationInputs': excluded, 'rootHeaders': sorted(headers),
          'buildStarted': False, 'resourcesStarted': False, 'portsProbed': False}
target = B / 'prebuild.json'
assert not target.exists(), 'Preserve first prebuild record'
target.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'complete': True, 'sourcePins': len(selected),
                  'preparationSourcePins': len(rows['pins']), 'prebuild': pin(target),
                  'buildStarted': False, 'resourcesStarted': False}))
