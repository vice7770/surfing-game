import datetime, hashlib, json, os, subprocess
from pathlib import Path
ROOT = Path('/Users/regina/Desktop/Projects/surfing-game')
OUT = Path('/private/tmp/surf-full-writer-adoption-20261004')
def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def record(p):
    b = p.read_bytes()
    return {'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}
source = {str(p.relative_to(ROOT)): record(p) for p in sorted((ROOT/'src').rglob('*')) if p.is_file()}
assert source['src/wave/SurfZoneSimulation.ts']['sha256'] == '18e7928601d7208d5f7ff1a15a34995f7e63ebeec497dbe7bf7527b06d15948a'
assert source['src/wave/SurfZoneSimulation.test.ts']['sha256'] == '6b49a17db4d32c87ac4d7dfd49af7121233888f2afc5332c48113cfcd2d34d34'
(OUT/'source-before.json').write_text(json.dumps(source,indent=2)+'\n')
compiled_roots = [ROOT/'dist', Path('/private/tmp/surf-rowband-adoption-20261004/root-final/dist')]
compiled = {str(p): record(p) for root in compiled_roots for p in root.rglob('*') if p.is_file() and (p.name == 'index.html' or p.name == 'build.json' or p.parent.name == 'assets')}
def unchanged():
    assert {str(p.relative_to(ROOT)):record(p) for p in sorted((ROOT/'src').rglob('*')) if p.is_file()} == source
    assert all(record(Path(p)) == pin for p,pin in compiled.items())
commands = [
    ['node','node_modules/typescript/bin/tsc','--noEmit','--incremental','false','-p','tsconfig.json'],
    ['node','node_modules/vitest/vitest.mjs','run','src/wave/SurfZoneSimulation.test.ts','--testNamePattern=writes the worker snapshot fields|preserves dynamic void|preserves snapshot bits|allocates snapshot scratch','--reporter=json','--outputFile='+str(OUT/'vitest.json')],
    ['node',str(OUT/'build.mjs')],
]
terminal = {'status':'running','startedAt':now(),'commands':[],'sourceFiles':len(source)}
assert not (OUT/'terminal.json').exists()
try:
    for i,cmd in enumerate(commands):
        started = now()
        with (OUT/f'command-{i+1}.log').open('wb') as log:
            run = subprocess.run(cmd,cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,env={**os.environ,'BUILD_ID':'306258296'},timeout=60)
        terminal['commands'].append({'argv':cmd,'startedAt':started,'endedAt':now(),'exitCode':run.returncode,'log':record(OUT/f'command-{i+1}.log')})
        print(i+1,run.returncode,flush=True)
        unchanged()
        if run.returncode: raise RuntimeError(f'First failure command {i+1}')
    tests = json.loads((OUT/'vitest.json').read_text())
    assert tests['success'] and tests['numPassedTests'] == 4 and tests['numFailedTests'] == 0
    rows = [{'path':str(p.relative_to(OUT/'dist')),**record(p)} for p in sorted((OUT/'dist').rglob('*')) if p.is_file()]
    measured = json.loads(Path('/private/tmp/surf-full-writer-fps-20261004/candidate/build-manifest.json').read_text())['outputRecords']
    assert len(rows) == 11 and sorted(rows,key=lambda x:x['path']) == sorted(measured,key=lambda x:x['path'])
    (OUT/'build-manifest.json').write_text(json.dumps({'buildId':'306258296','outputRecords':rows,'allElevenByteExactMeasuredCandidate':True,'publicAssetCopies':False},indent=2)+'\n')
    (OUT/'source-after.json').write_text(json.dumps(source,indent=2)+'\n')
    terminal.update(status='passed',testsPassed=4,sourceUnchangedDuringChecks=True,canonicalAndRowbandDistPreserved=True,allElevenOutputsByteExact=True)
finally:
    terminal['endedAt'] = now()
    (OUT/'terminal.json').write_text(json.dumps(terminal,indent=2)+'\n')
print(json.dumps(terminal))
