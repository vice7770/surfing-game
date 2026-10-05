from pathlib import Path
import hashlib,json,subprocess,time,argparse
C=Path(__file__).resolve().parent;R=C/'root-graph-diff';MOD=Path('/Users/regina/Desktop/Projects/surfing-game/node_modules');NODE='/opt/homebrew/bin/node'
ap=argparse.ArgumentParser();ap.add_argument('--parity-session',type=int,required=True);ap.add_argument('--parity-exit',type=int,required=True);args=ap.parse_args();assert args.parity_exit==0
def pin(p):
 b=Path(p).read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
prior=json.loads((C/'root-word-checks/result.json').read_text());report=json.loads((R/'parity.json').read_text())
assert report['success'] and report['numPassedTests']==report['numTotalTests']==2 and report['numFailedTests']==0
assert not list(R.glob('*-differences.json'))
fixture=C/'tests/trialBalance.parity-graph-diff.test.ts';config=R/'vitest.config.mts'
ts=R/'tsconfig.json';ts.write_text(json.dumps({'extends':str(C/'source/tsconfig.json'),'include':[str(C/'source/src'),str(fixture)]},indent=2)+'\n')
inputs=prior['sourceInputs']+prior['oracleInputs']+prior['checkInputs']+[pin(fixture),pin(config),pin(ts)]
assert all(pin(q['file'])==q for q in inputs)
argv=[NODE,str(MOD/'typescript/bin/tsc'),'--noEmit','--incremental','false','-p',str(ts)]
t=time.monotonic();log=R/'strict.log'
with log.open('wb') as out:p=subprocess.run(argv,cwd=C,stdout=out,stderr=subprocess.STDOUT,timeout=90)
strict={'name':'strict','argv':argv,'timeoutSeconds':90,'exitCode':p.returncode,'elapsedSeconds':time.monotonic()-t,'log':pin(log)}
parity={'name':'parity','argv':[NODE,str(MOD/'vitest/vitest.mjs'),'run','--config',str(config),'--reporter=json','--outputFile',str(R/'parity.json')],'rootToolSession':args.parity_session,'terminal':True,'exitCode':args.parity_exit,'report':pin(R/'parity.json'),'success':True,'passed':2,'failed':0,'total':2,'wholeSteps':552,'substepStateWords':'All original own fields, descriptors, graph ref IDs, typed-array bytes; exact64 additions filtered only in observer records.','waterSequence':'All ordered calls plus every finish-substep boundary count','comparison':'Native isDeepStrictEqual over the full declarative word graph; this compares represented original ref IDs, not incidental object alias layout within the graph representation.'}
unchanged=all(pin(q['file'])==q for q in inputs)
result={'schema':'trial-balance-root-cpu-checks/v1','complete':strict['exitCode']==0 and unchanged,'materialization':prior['materialization'],'sourceCount':588,'sourceInputs':prior['sourceInputs'],'oracleInputs':prior['oracleInputs'],'checkInputs':prior['checkInputs']+[pin(fixture),pin(config),pin(ts)],'checks':[strict,parity],'sourcePostUnchanged':unchanged,'earlierTimeouts':[pin(C/'root-checks/result.json'),pin(C/'root-boundary-checks/result.json')],'falseSerializationComparison':pin(C/'root-word-checks/result.json'),'fixtureRepairs':['Full ordered water sequence plus exact substep prefix boundaries removes repeated prefix graph copies.','Native scalar Object.is assertions and native declarative graph equality remove expensive Vitest deep failure formatting. The false v8 byte comparator was replaced; all original552step, finish, stage, reaction, marker, private state and detachedness requirements retained.'],'scope':'Passive observer/stage/export validation only; no native causal repair, ordinary standing, tube passage or gameplay acceptance.'}
(R/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'strict':strict,'result':pin(R/'result.json'),'complete':result['complete']}),flush=True)
raise SystemExit(0 if result['complete'] else 1)
