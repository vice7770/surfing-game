from pathlib import Path
import subprocess,json,hashlib,time
W=Path(__file__).resolve().parent;R=W/'root-helper-logs';R.mkdir(exist_ok=True);B=Path('/private/tmp/tube-native-trial-balance-build-20261005')
def pin(p):
 b=Path(p).read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
checks={}
for name,args in [('sourceHelper',['python3',str(W/'check-source.py')]),('metadata',['python3',str(W/'metadata-check.py')]),('nativeSyntax',['/opt/homebrew/bin/node','--check',str(W/'native.mjs')]),('diagnosticWrapperSyntax',['/opt/homebrew/bin/node','--check',str(B/'build-diagnostic.mjs')]),('sourceOnlyOwner',['python3',str(W/'run.py'),'--arm','candidate'])]:
 log=R/(name+'.log');t=time.monotonic()
 with log.open('wb') as out:p=subprocess.run(args,stdout=out,stderr=subprocess.STDOUT,cwd=W,timeout=30)
 checks[name]={'run':True,'exitCode':p.returncode,'argv':args,'elapsedSeconds':time.monotonic()-t,'log':pin(log)}
 if p.returncode:print(json.dumps(checks));raise SystemExit(p.returncode)
checks.update(schema='trial-balance-root-helper-checks/v1',complete=True,resourcesStarted=False,portsProbed=False)
p=W/'root-helper-checks.json';p.write_text(json.dumps(checks,indent=2)+'\n');print(json.dumps({'complete':True,'receipt':pin(p)}))
