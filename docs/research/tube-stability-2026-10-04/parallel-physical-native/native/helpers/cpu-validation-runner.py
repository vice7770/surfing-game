"""Bounded CPU-only validation. All output files belong to this new helper directory."""
from pathlib import Path
import ast, json, subprocess, time
W=Path(__file__).resolve().parent
commands=[
 ['node','--test','mouth-tools.test.mjs'],
 ['node','mouth-integration-checks.mjs'],
 ['node','mock-checks.mjs'],
 ['node','identity-checks.mjs'],
 ['python3','owner-event-checks.py'],
 ['python3','owner-mock-checks.py'],
 ['python3','check-source.py'],
 ['python3','run.py','--arm','candidate'],
 ['node','/private/tmp/tube-bounded-c-parallel-physics-20261004/source/node_modules/typescript/bin/tsc','--allowJs','--checkJs','--noEmit','--module','nodenext','--target','es2022','--moduleResolution','nodenext','--lib','es2022,dom','--skipLibCheck','helper-types.d.ts','moving-shape.mjs','station-tools.mjs','mouth-tools.mjs']]
for p in sorted(W.glob('*.py')):ast.parse(p.read_text())
commands += [['node','--check',p.name] for p in sorted(W.glob('*.mjs'))]
records=[];output=[]
for cmd in commands:
 start=time.monotonic();r=subprocess.run(cmd,cwd=W,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=30)
 records.append({'command':cmd,'exitCode':r.returncode,'elapsedSeconds':time.monotonic()-start,'stdoutAndStderr':r.stdout})
 output.append(json.dumps(cmd)+'\n'+r.stdout)
 if r.returncode:break
complete=len(records)==len(commands) and all(r['exitCode']==0 for r in records)
(W/'cpu-validation.log').write_text('\n'.join(output))
(W/'cpu-validation.json').write_text(json.dumps({'schema':'bounded-C-parallel-physics-mouth-CPU-validation/v1','complete':complete,'commands':records,'PythonAST':True,'JSsyntax':complete,'checkJsNoEmit':complete,'actualStdoutAndStderrCaptured':True,'resourcesStarted':False,'portsProbed':False,'buildPerformed':False},indent=2)+'\n')
print(json.dumps({'complete':complete,'commands':len(records),'resourcesStarted':False,'portsProbed':False}))
raise SystemExit(0 if complete else 1)
