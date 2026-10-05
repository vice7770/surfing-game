"""Root-run bounded syntax checks and the owner's resource-free source-only route."""
from pathlib import Path
import hashlib,json,subprocess,time
W=Path(__file__).resolve().parent;R=W/'root-helper-logs'
assert not R.exists() and not (W/'root-helper-checks.json').exists();R.mkdir()
def pin(p):
 p=Path(p);b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
checks={}
for name,argv in [('nativeSyntax',['/opt/homebrew/bin/node','--check',str(W/'native.mjs')]),('controlSyntax',['/opt/homebrew/bin/node','--check',str(W/'control-policy.mjs')]),('sourceOnlyOwner',['python3',str(W/'run.py'),'--arm','candidate'])]:
 log=R/(name+'.log');start=time.monotonic()
 with log.open('wb')as out:result=subprocess.run(argv,stdout=out,stderr=subprocess.STDOUT,cwd=W,timeout=30,env=__import__('os').environ.copy())
 checks[name]={'run':True,'exitCode':result.returncode,'argv':argv,'elapsedSeconds':time.monotonic()-start,'log':pin(log)}
 if result.returncode:print(json.dumps(checks));raise SystemExit(result.returncode)
receipt={'schema':'c-line-steering-root-helper-checks/v1','complete':True,'resourcesStarted':False,'portsProbed':False,'checks':checks}
(W/'root-helper-checks.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({'complete':True,'receipt':pin(W/'root-helper-checks.json')}))
