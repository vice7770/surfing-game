from pathlib import Path
import hashlib, json, os, signal, subprocess, time
B = Path(__file__).resolve().parent
S = Path('/private/tmp/tube-board-rhs-components-native-20261005/source')
MOD = Path('/Users/regina/Desktop/Projects/surfing-game/node_modules')
NODE = '/opt/homebrew/bin/node'
def pin(p):
    p = Path(p); b = p.read_bytes()
    return {'file': str(p), 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}
pre = json.loads((B / 'root-prebuild.json').read_text())
assert not (S / 'dist').exists() and not (B / 'root-command-result.json').exists()
for q in pre['sourcePins'] + [pre['readiness']]: assert pin(q['file']) == q
checks = []; outputs = []; env = dict(os.environ, BUILD_ID=pre['buildId'])
for name, args in [('strict-build', [NODE, str(MOD / 'typescript/bin/tsc'), '-b']),
                   ('application', [NODE, str(MOD / 'vite/bin/vite.js'), 'build'])]:
    start = time.monotonic(); timeout = False; log = B / (name + '.log')
    with log.open('wb') as out:
        p = subprocess.Popen(args, cwd=S, env=env, stdout=out, stderr=subprocess.STDOUT, start_new_session=True)
        try: code = p.wait(timeout=120)
        except subprocess.TimeoutExpired:
            timeout = True; os.killpg(p.pid, signal.SIGTERM)
            try: p.wait(timeout=5)
            except subprocess.TimeoutExpired: os.killpg(p.pid, signal.SIGKILL); p.wait()
            code = None
    output = log.read_text(); outputs.append(output)
    checks.append({'name': name, 'argv': args, 'exitCode': code, 'timedOut': timeout,
                   'elapsedSeconds': time.monotonic() - start, 'log': pin(log)})
    print(output, flush=True); print(json.dumps(checks[-1]), flush=True)
    if code != 0: break
unchanged = all(pin(q['file']) == q for q in pre['sourcePins'] + [pre['readiness']])
result = {'schema': 'board-rhs-components-root-application-command/v1', 'terminal': True,
          'exitCode': checks[-1]['exitCode'], 'complete': len(checks) == 2 and all(q['exitCode'] == 0 for q in checks) and unchanged,
          'sourceUnchanged': unchanged, 'prebuild': pin(B / 'root-prebuild.json'), 'checks': checks}
(B / 'root-build-output.txt').write_text('\n'.join(outputs) + '\n' + json.dumps(result, indent=2) + '\n')
(B / 'root-command-result.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'result': pin(B / 'root-command-result.json'), 'complete': result['complete']}), flush=True)
raise SystemExit(0 if result['complete'] else 1)
