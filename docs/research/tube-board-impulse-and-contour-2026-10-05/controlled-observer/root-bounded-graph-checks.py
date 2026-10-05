from pathlib import Path
import hashlib,json,subprocess,time,os,signal
C=Path(__file__).resolve().parent;R=C/'root-bounded-graph-checks';R.mkdir(exist_ok=True)
MOD=Path('/Users/regina/Desktop/Projects/surfing-game/node_modules');NODE='/opt/homebrew/bin/node'
def pin(p):
 b=Path(p).read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
prior=json.loads((C/'root-word-checks/result.json').read_text());old=C/'tests/trialBalance.parity-graph-diff.test.ts';new=C/'tests/trialBalance.parity-bounded-graph.test.ts'
t=old.read_text();assert t.count('}, 30000);')==1;new.write_text(t.replace('}, 30000);','}, 120000);'))
config=R/'vitest.config.mts';config.write_text("import { defineConfig } from 'vitest/config';\nexport default defineConfig({root:"+json.dumps(str(C))+",test:{include:['tests/trialBalance.parity-bounded-graph.test.ts'],maxWorkers:1,environment:'node'}});\n")
ts=R/'tsconfig.json';ts.write_text(json.dumps({'extends':str(C/'source/tsconfig.json'),'include':[str(C/'source/src'),str(new)]},indent=2)+'\n')
inputs=prior['sourceInputs']+prior['oracleInputs']+prior['checkInputs']+[pin(old),pin(new),pin(config),pin(ts)]
assert all(pin(q['file'])==q for q in inputs)
repair={'schema':'trial-balance-root-complete-fixture-repair/v1','original':pin(C/'tests/trialBalance.parity.prospective.test.ts'),'final':pin(new),'runtimeChanged':False,'waterPrefixes':'Complete ordered whole-step calls plus each substep prefix count; no call omitted.','equalWords':'Native isDeepStrictEqual over the full existing declarative own-word graph, including original alias ref IDs/descriptors/typed bytes. Every scalar uses Object.is semantics. Incidental sharing inside the graph representation itself is not a physics-state alias.','perCaseBudgetSeconds':120,'wholeParityBudgetSeconds':270,'budgetEvidence':pin(C/'root-graph-diff/parity.json'),'reason':'Both276-step cases completed all assertions and1668captured standing trials each without difference artifacts, but failed the original30s test budget after60.49s/50.10s. This copies exactly that completed test with a120s per-case bound, preserving all552steps and checks.','earlierTimeouts':[pin(C/'root-checks/result.json'),pin(C/'root-boundary-checks/result.json')],'falseV8ByteComparator':pin(C/'root-word-checks/result.json')}
(R/'repair.json').write_text(json.dumps(repair,indent=2)+'\n');checks=[]
for name,args,budget in [('strict',[NODE,str(MOD/'typescript/bin/tsc'),'--noEmit','--incremental','false','-p',str(ts)],90),('parity',[NODE,str(MOD/'vitest/vitest.mjs'),'run','--config',str(config),'--reporter=json','--outputFile',str(R/'parity.json')],270)]:
 start=time.monotonic();timeout=False;log=R/(name+'.log')
 with log.open('wb') as out:
  p=subprocess.Popen(args,cwd=C,stdout=out,stderr=subprocess.STDOUT,start_new_session=True)
  try:code=p.wait(timeout=budget)
  except subprocess.TimeoutExpired:
   timeout=True;os.killpg(p.pid,signal.SIGTERM)
   try:p.wait(timeout=5)
   except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);p.wait()
   code=None
 row={'name':name,'argv':args,'timeoutSeconds':budget,'exitCode':code,'timedOut':timeout,'elapsedSeconds':time.monotonic()-start,'log':pin(log)}
 if name=='parity' and (R/'parity.json').exists():
  x=json.loads((R/'parity.json').read_text());row.update(report=pin(R/'parity.json'),success=x['success'],passed=x['numPassedTests'],failed=x['numFailedTests'],total=x['numTotalTests'],wholeSteps=552)
 checks.append(row);print(json.dumps(row),flush=True)
 if code!=0:break
unchanged=all(pin(q['file'])==q for q in inputs)
result={'schema':'trial-balance-root-cpu-checks/v1','complete':len(checks)==2 and all(q['exitCode']==0 for q in checks) and checks[-1].get('passed')==checks[-1].get('total')==2 and unchanged,'materialization':prior['materialization'],'sourceCount':588,'sourceInputs':prior['sourceInputs'],'oracleInputs':prior['oracleInputs'],'checkInputs':prior['checkInputs']+[pin(old),pin(new),pin(config),pin(ts)],'checks':checks,'sourcePostUnchanged':unchanged,'fixtureRepair':pin(R/'repair.json'),'scope':'Passive observer full own-word/substep parity, independent stage/marker capture, ordered water queries/reactions with every substep boundary, and detached sample/latch export. No native causality, gameplay repair, standing or tube passage acceptance.'}
(R/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'result':pin(R/'result.json'),'complete':result['complete']}),flush=True)
raise SystemExit(0 if result['complete'] else 1)
