from pathlib import Path
import ast, datetime, hashlib, json, subprocess, time

WORK = Path('/private/tmp/surf-wavelab-passive-original-v2-20261004')
V1 = Path('/private/tmp/surf-wavelab-passive-original-20261004')

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def save(name, value):
    with (WORK / name).open('x') as f:
        json.dump(value, f, indent=2)
        f.write('\n')

started = now()
clock = time.monotonic()
ready_sha = digest(WORK / 'ready.json')
ready = json.loads((WORK / 'ready.json').read_text())
assert ready['schema'] == 'wavelab-passive-original-ready/v2'
logs = WORK / 'root-checks-first'
logs.mkdir()
commands = [
    ['node', '--check', str(WORK / name)]
    for name in ['freeze.mjs', 'native-owned.mjs', 'page-prelude.js', 'capture.mjs']
]
commands.extend([
    ['python3', '-c', 'import ast,pathlib; ast.parse(pathlib.Path('+repr(str(WORK / 'native-driver.py'))+').read_text()); print("AST parse passed; no driver import")'],
    ['node', str(WORK / 'capture.mjs'), '--run=false'],
    ['python3', str(WORK / 'native-driver.py'), '--run=false'],
])
rows = []
for i, command in enumerate(commands):
    command_started = now()
    command_clock = time.monotonic()
    result = subprocess.run(command, cwd=WORK, capture_output=True, timeout=10)
    body = result.stdout + result.stderr
    assert len(body) <= 1024*1024
    log = logs / ('command-'+str(i)+'.log')
    log.write_bytes(body)
    rows.append({'argv':command,'startedAt':command_started,'endedAt':now(),'elapsedSeconds':time.monotonic()-command_clock,'exitCode':result.returncode,'log':str(log),'logBytes':len(body),'logSha256':digest(log)})
    assert result.returncode == 0, rows[-1]
assert digest(WORK / 'ready.json') == ready_sha
save('syntax-receipt.json', {'valid':True,'helperSyntaxFresh':True,'readySha256':ready_sha,'readyUnchanged':True,'command':'python3 '+str(WORK / 'root-checks-first.py'),'commands':rows,'startedAt':started,'endedAt':now(),'elapsedSeconds':time.monotonic()-clock,'scope':'Fresh V2 helper syntax and unarmed guards only; no original strict/build repeat, native process, browser or solver'})

identity_started = now()
identity_clock = time.monotonic()
assert len(ready['sourceFiles']) == len(ready['sourceCopies']) == 592
assert len(ready['inheritedCompiledFiles']) == 49
for source, copied in zip(ready['sourceFiles'], ready['sourceCopies']):
    original_body = Path(source['path']).read_bytes()
    copied_body = Path(copied['path']).read_bytes()
    assert original_body == copied_body
    assert len(original_body) == source['bytes'] == copied['bytes']
    assert hashlib.sha256(original_body).hexdigest() == source['sha256'] == copied['sha256']
for original, copied in zip(ready['lineage']['compiledFiles'], ready['inheritedCompiledFiles']):
    original_body = Path(original['path']).read_bytes()
    copied_body = Path(copied['path']).read_bytes()
    assert original_body == copied_body
    assert len(original_body) == original['bytes'] == copied['bytes']
    assert hashlib.sha256(original_body).hexdigest() == original['sha256'] == copied['sha256']
original_ready = digest(V1 / 'ready.json')
original_bindings = digest(V1 / 'bindings.json')
assert original_ready == '8fe5b72b044f718bd6575a3e448d696a7f849d2dd817ce165ccd8191885460c0'
assert original_bindings == '97c1b9ec0e71a8573689dd203d236118f7d660ec15d09b53b3583ba65b641c96'
original_syntax = json.loads((V1 / 'syntax-receipt.json').read_text())
original_build = json.loads((V1 / 'build-receipt.json').read_text())
assert original_syntax['valid'] and original_build['valid']
assert original_build['exitCode'] == 0
assert any('--noEmit' in row['argv'] and row['exitCode'] == 0 for row in original_syntax['commands'])
assert digest(WORK / 'ready.json') == ready_sha
save('build-receipt.json', {'valid':True,'readySha256':ready_sha,'readyUnchanged':True,'command':'python3 '+str(WORK / 'root-checks-first.py')+' exact byte identity / original successful gate inheritance','startedAt':identity_started,'endedAt':now(),'elapsedSeconds':time.monotonic()-identity_clock,'inherited':True,'originalReadySha256':original_ready,'originalBindingsSha256':original_bindings,'sourceByteIdentityVerified':True,'compiledByteIdentityVerified':True,'originalStrictTypecheckInherited':True,'sourceFiles':592,'compiledFiles':49,'originalStrictReceipt':str(V1 / 'syntax-receipt.json'),'originalBuildReceipt':str(V1 / 'build-receipt.json'),'scope':'No new original typecheck/build execution. Identical source/dist bytes retain original successful strict/build evidence; V1 native capture remains failed.'})
print(json.dumps({'valid':True,'freshHelperChecks':len(rows),'sourceByteIdentityVerified':592,'compiledByteIdentityVerified':49,'readySha256':ready_sha,'elapsedSeconds':time.monotonic()-clock}))
