#!/usr/bin/env python3
"""Source-only relative-import closure export. Does not run TS, tests or builds."""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess

ROOT = Path('/Users/regina/Desktop/Projects/surfing-game')
WORK = Path('/private/tmp/contact-height-demand-integration-20261004')
NORMAL = Path('/private/tmp/contact-normal-demand-prototype-20261004')
HEIGHT = Path('/private/tmp/contact-height-demand-prototype-20261004')
BASE = 'ef60d3cee120d6b157fe94386d923b6b4392205b'
TESTS = ['src/wave/SurfZoneRunner.test.ts', 'src/game/WorkerSurfZone.test.ts', 'src/game/SurfZoneHost.test.ts']
NORMAL_PATHS = [
    'src/wave/barrel/sweptLoft.ts', 'src/wave/barrel/sweptContact.ts',
    'src/physics/PhysicalSurfWater.ts', 'src/wave/SurfZoneRunner.ts',
    'src/game/SurfZoneWorkerCore.ts',
]
HEIGHT_PATHS = NORMAL_PATHS[:3]
PINNED_NORMAL = [
    '45f827aa2dbaae335396d41e3f1f6f757e4a1da95ac9576c82dadc9a8c3680a6',
    '2e4cc356b2a970b5fb545703996dfb9b63129b538ba1c41bd63aefbb888aff3b',
    '0968979485f03ed7df681203a081b1be417bcf3d7b4ebd11bd649377bda27a57',
    '48892eea1be50a39708376662908511900ad02ef8d24f3fc361e69260372130f',
    '284675cc587b9f12c70ae518d1a8c4f128396482883f549989fc69b327437a69',
]
PINNED_HEIGHT = [
    'b67be715acd5b325347f04a226cb484c6bbda223ffee28f8bb55124397e4932e',
    '45ea76c0e8fe4219b633e5ee65042ed0b578bf4b164329c834725041547e42ba',
    '5f0857dbca9c0e7b2e6af215b60bc72101f89d8081687602983f441af054d0cb',
]

def digest(raw):
    return hashlib.sha256(raw).hexdigest()

def record(path, raw):
    return {'path': str(path), 'bytes': len(raw), 'sha256': digest(raw)}

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def store(path, raw):
    destination = WORK / path
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        raise RuntimeError(f'Refusing to replace existing preparation: {destination}')
    destination.write_bytes(raw)

known = set(git('ls-tree', '-r', '--name-only', BASE).decode().splitlines())
blob_cache = {}
def original(path):
    if path not in blob_cache:
        blob_cache[path] = git('show', f'{BASE}:{path}')
    return blob_cache[path]

overlays = {}
normal_records = []
height_records = []
for source, paths, pins, rows in [(NORMAL, NORMAL_PATHS, PINNED_NORMAL, normal_records), (HEIGHT, HEIGHT_PATHS, PINNED_HEIGHT, height_records)]:
    for path, pin in zip(paths, pins):
        raw = (source / path).read_bytes()
        if digest(raw) != pin:
            raise RuntimeError(f'Reviewed source changed: {source / path}')
        rows.append({**record(path, raw), 'originalPath': str(source / path)})
        overlays[path] = raw

# All literal relative TS module edges, including type imports, reexports and worker URL entry.
module_patterns = [
    r'\bfrom\s*[\'\"]([^\'\"]+)[\'\"]',
    r'\bimport\s*[\'\"]([^\'\"]+)[\'\"]',
    r'\b(?:import|require)\s*\(\s*[\'\"]([^\'\"]+)[\'\"]',
    r'\bnew\s+URL\s*\(\s*[\'\"]([^\'\"]+)[\'\"]\s*,\s*import\.meta\.url',
]

def resolve(owner, spec):
    clean = spec.split('?', 1)[0]
    stem = os.path.normpath(str(PurePosixPath(owner).parent / clean))
    alternatives = [stem, stem + '.ts', stem + '.tsx', stem + '.d.ts', stem + '/index.ts']
    if stem.endswith('.js'):
        alternatives += [stem[:-3] + '.ts']
    for candidate in alternatives:
        if candidate in known:
            return candidate
    raise RuntimeError(f'Unresolved literal relative edge: {owner} -> {spec}')

pending = list(TESTS)
closure = set()
edges = []
external = set()
while pending:
    path = pending.pop()
    if path in closure:
        continue
    closure.add(path)
    raw = overlays.get(path, original(path))
    text = raw.decode()
    specs = sorted({spec for pattern in module_patterns for spec in re.findall(pattern, text)})
    for spec in specs:
        if spec.startswith('.'):
            dependency = resolve(path, spec)
            edges.append({'from': path, 'specifier': spec, 'to': dependency})
            pending.append(dependency)
        else:
            external.add(spec)

closure_rows = []
for path in sorted(closure):
    base = original(path)
    final = overlays.get(path, base)
    blob_sha1 = hashlib.sha1(b'blob ' + str(len(base)).encode() + b'\0' + base).hexdigest()
    closure_rows.append({
        'path': path, 'baseline': {**record(path, base), 'gitBlobSha1': blob_sha1},
        'final': record(path, final),
        'stage': 'reviewed-height' if path in HEIGHT_PATHS else ('reviewed-normal' if path in NORMAL_PATHS else 'ef60-exact'),
    })
    store(path, final)

config_rows = []
for path in ['package.json', 'tsconfig.json']:
    raw = original(path)
    store(path, raw)
    config_rows.append(record(path, raw))

# Existing tests call readBarrelCases() without a spot: all eight literal index assets are required.
index = original('src/wave/barrel/barrelLibraryIndex.ts').decode()
assets = re.findall(r'"asset"\s*:\s*"([^"]+)"', index)
asset_rows = []
for asset in assets:
    source = NORMAL / 'public' / asset
    target = source.resolve(strict=True)
    path = WORK / 'public' / asset
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() or path.is_symlink():
        raise RuntimeError(f'Refusing to overwrite asset link: {path}')
    path.symlink_to(target)
    raw = target.read_bytes()
    asset_rows.append({**record('public/' + asset, raw), 'originalPath': str(source), 'resolvedPath': str(target), 'mode': 'read-only input use; narrow symlink, no asset copy'})

link = WORK / 'node_modules'
if link.exists() or link.is_symlink():
    raise RuntimeError('Refusing to replace node_modules link')
link.symlink_to(ROOT / 'node_modules', target_is_directory=True)
package_rows = []
for package in ['typescript', 'vitest', 'vite', 'three', '@types/node', '@types/three', '@webgpu/types']:
    path = ROOT / 'node_modules' / package / 'package.json'
    raw = path.read_bytes()
    data = json.loads(raw)
    package_rows.append({**record(path, raw), 'package': package, 'version': data['version']})

# Metadata-only source inventory; test expansion is NOT executed or collected.
test_rows = []
for path in TESTS:
    text = original(path).decode()
    single = len(re.findall(r'\bit\s*\(', text))
    each = len(re.findall(r'\bit\.each\s*\(', text))
    test_rows.append({**record(path, original(path)), 'literalItCalls': single, 'itEachDeclarations': each})

manifest = {
    'schema': 'contact-height-integration-source/v1',
    'baseCommit': BASE,
    'sourceDirectory': str(WORK),
    'scope': 'Three existing integration suites and their literal relative-import closure only; source preparation, no execution',
    'closureMethod': 'Literal static import/from/reexport, dynamic literal import/require and worker new URL; includes type edges; each baseline file obtained using readonly git show',
    'closureFileCount': len(closure_rows),
    'closureBytes': sum(row['final']['bytes'] for row in closure_rows),
    'sourceFiles': closure_rows,
    'relativeEdges': sorted(edges, key=lambda row: (row['from'], row['specifier'])),
    'externalImports': sorted(external),
    'normalOverlaysAppliedFirst': normal_records,
    'heightOverlaysAppliedSecond': height_records,
    'baselineConfig': config_rows,
    'selectedTests': test_rows,
    'caseInputs': asset_rows,
    'dependencyLink': {'path': str(link), 'target': str(ROOT / 'node_modules'), 'usage': 'read-only; no install or package mutations'},
    'installedPackages': package_rows,
    'checks': {'syntax': 'NOT_RUN', 'typecheck': 'NOT_RUN', 'tests': 'NOT_RUN', 'build': 'NOT_RUN', 'cost': 'NOT_RUN', 'hardware': 'NOT_RUN'},
}
store('source-manifest.json', (json.dumps(manifest, indent=2) + '\n').encode())
print(json.dumps({'files': len(closure_rows), 'bytes': manifest['closureBytes'], 'assets': len(asset_rows), 'tests': test_rows}))
