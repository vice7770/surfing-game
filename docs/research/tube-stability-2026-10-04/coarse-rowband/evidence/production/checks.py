import datetime, hashlib, json, os, subprocess
from pathlib import Path
ROOT = Path('/Users/regina/Desktop/Projects/surfing-game')
OUT = Path('/private/tmp/surf-rowband-adoption-20261004/root-final')
FREEZE = OUT.parent / 'proof-baseline'
def record(p):
    b = p.read_bytes()
    return {'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}
def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
source = json.loads((OUT / 'after-source.json').read_text())
manifest = json.loads((FREEZE / 'manifest.json').read_text())
def unchanged():
    assert {str(p.relative_to(ROOT)): record(p) for p in sorted((ROOT / 'src').rglob('*')) if p.is_file()} == source
    for row in manifest['payloads']:
        if row['kind'] == 'accepted-e3-compiled':
            assert record(Path(row['originalPath'])) == {'bytes': row['bytes'], 'sha256': row['sha256']}
unchanged()
commands = [
    ['node', 'node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false', '-p', 'tsconfig.json'],
    ['node', 'node_modules/vitest/vitest.mjs', 'run', 'src/scene/WaterSurface.test.ts', 'src/scene/barrel/SweptBarrel.test.ts', 'src/scene/barrel/SweptBarrelMesh.test.ts', 'src/scene/barrel/fallbackRows.test.ts', '--reporter=json', '--outputFile=' + str(OUT / 'vitest.json')],
    ['node', str(OUT / 'build.mjs')],
]
terminal = {'startedAt': now(), 'status': 'running', 'commands': [], 'sourceFiles': len(source), 'canonicalDistPreserved': False, 'physicsWorkerByteExact': False}
assert not (OUT / 'terminal.json').exists()
try:
    for i, cmd in enumerate(commands):
        started = now()
        with (OUT / f'command-{i+1}.log').open('wb') as log:
            run = subprocess.run(cmd, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, env={**os.environ, 'BUILD_ID': '306258296'}, timeout=60)
        terminal['commands'].append({'argv': cmd, 'startedAt': started, 'endedAt': now(), 'exitCode': run.returncode, 'log': record(OUT / f'command-{i+1}.log')})
        print(i+1, run.returncode, flush=True)
        unchanged()
        if run.returncode: raise RuntimeError(f'command {i+1} failed')
    tests = json.loads((OUT / 'vitest.json').read_text())
    assert tests['success'] and tests['numPassedTests'] == 46 and tests['numFailedTests'] == 0
    rows = [{'path': str(p.relative_to(OUT / 'dist')), **record(p)} for p in sorted((OUT / 'dist').rglob('*')) if p.is_file()]
    assert len(rows) == 11
    workers = [r for r in rows if r['path'].startswith('assets/surfZoneWorker-')]
    assert len(workers) == 1 and workers[0]['bytes'] == 447015 and workers[0]['sha256'] == 'e08444a9b72f73d62126a2e4b503092bc6e3cc7536d714a2e49743ed1293f480'
    assert json.loads((OUT / 'dist/build.json').read_text())['build'] == '306258296'
    (OUT / 'build-manifest.json').write_text(json.dumps({'buildId': '306258296', 'outputRecords': rows, 'publicAssetCopies': False}, indent=2)+'\n')
    terminal.update(status='passed', testsPassed=46, canonicalDistPreserved=True, physicsWorkerByteExact=True)
finally:
    terminal['endedAt'] = now()
    (OUT / 'terminal.json').write_text(json.dumps(terminal, indent=2)+'\n')
print(json.dumps(terminal))
