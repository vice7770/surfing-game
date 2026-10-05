from pathlib import Path
import ast,hashlib,json,subprocess,time
A=Path(__file__).resolve().parent;W=Path('/private/tmp/tube-board-rhs-components-native-20261005')
def pin(p):
 p=Path(p);b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
f=A/'freeze.json';assert pin(f)['sha256']=='e4fa6ea1d09bc6c51c8d6f878874fd1a680b0693fac92827a83f16bb6c56b42d'
r=json.loads(f.read_text());inputs=r['pins']+r['sourceDependencies']+[pin(f)]
for q in inputs:assert pin(q['file'])==q
for name in ['analyze.py','authority.py','balance.py']:ast.parse((A/name).read_text())
owner=json.loads((W/'candidate-first-owner.json').read_text());assert owner['complete'] is True and owner['exitCode']==0 and owner['firstFailure'] is None
assert owner['independentClosureValid'] and owner['protectedPortsPreserved'] and owner['sourceBuildHelpersPostUnchanged'] and owner['remainingOwnedPids']==[]
assert owner['closedPorts']=={'4301':True,'9711':True} and owner['protectedStatesFinally']=={'4310':True,'4311':True,'4312':False,'4313':False}
seal=pin(W/'seal.json');report=pin(W/'candidate-first/report.json');wrapper=pin(W/'helper-revisions/node-alias-v2/build-diagnostic.mjs')
assert seal['sha256']=='67cbea5e0dcccbfa70b27ac20be62230d7108626707c43ca4d8e58896b5edc48'
assert report['sha256']=='1090617ad42398382914fab3184e0db3536194331a5cd9ac734dde927e85629a'
assert wrapper['sha256']=='66e857eb3ea4f4381c8e446811260fe5236f977b3fd8de12d05b8b7fb27c2af7'
mass=json.loads((A/'root-mass-source.json').read_text());assert mass['sourceRead'] and mass['expectedRiderMassKg']==73
for q in mass['sourcePins']:assert pin(q['file'])==q
out=A/'root-numeric-review';log=A/'root-analysis.log';receipt=A/'root-command-result.json';assert not out.exists() and not log.exists() and not receipt.exists()
args=['python3',str(A/'analyze.py'),'--root-authorized-terminal','--expected-seal-sha256',seal['sha256'],'--expected-report-sha256',report['sha256'],'--expected-wrapper-sha256',wrapper['sha256'],'--expected-wrapper-file',wrapper['file'],'--expected-rider-mass','73','--output',str(out)]
t=time.monotonic()
with log.open('xb') as stream:p=subprocess.run(args,cwd=A,stdout=stream,stderr=subprocess.STDOUT,timeout=120)
for q in inputs:assert pin(q['file'])==q
result={'schema':'board-rhs-components-root-audit-command/v1','terminal':True,'complete':p.returncode==0,'exitCode':p.returncode,'elapsedSeconds':time.monotonic()-t,'argv':args,'log':pin(log),'inputs':inputs,'actualOwner':pin(W/'candidate-first-owner.json'),'seal':seal,'report':report,'wrapper':wrapper,'sourceMass':pin(A/'root-mass-source.json'),'sourcePostUnchanged':True}
if p.returncode==0:result['analysis']=pin(out/'analysis.json')
receipt.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'complete':result['complete'],'exitCode':p.returncode,'receipt':pin(receipt),'log':pin(log)}));raise SystemExit(p.returncode)
