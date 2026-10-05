from pathlib import Path
import hashlib,json,subprocess,time,os,signal
C=Path(__file__).resolve().parent; R=C/'root-boundary-checks';R.mkdir(exist_ok=True)
MOD=Path('/Users/regina/Desktop/Projects/surfing-game/node_modules');NODE='/opt/homebrew/bin/node'
def pin(p):
 b=Path(p).read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
prior=json.loads((C/'root-checks/result.json').read_text());assert prior['checks'][0]['exitCode']==0 and prior['checks'][1]['timedOut']
old=C/'tests/trialBalance.parity.prospective.test.ts';new=C/'tests/trialBalance.parity-boundaries.test.ts'
text=old.read_text();needle="hook.events.push(['finish-substep-exit', h, state(hook.pair), ownWords(calls.get(hook.pair.water))]);"
assert text.count(needle)==1
new.write_text(text.replace(needle,"hook.events.push(['finish-substep-exit', h, state(hook.pair), calls.get(hook.pair.water)!.length]);"))
repair={'schema':'trial-balance-root-fixture-boundary-repair/v1','original':pin(old),'repaired':pin(new),'onlyChange':'Finish events retain the ordered water-call prefix length instead of serializing the entire prefix again. The unchanged full ordered call equality after each whole step, together with every finish boundary count, proves equality of every substep prefix. Complete original own-state graphs at every finish and whole step, all independent stage scalars, marker and detachedness checks remain unchanged.','runtimeChanged':False,'originalTimeoutResult':pin(C/'root-checks/result.json')}
(R/'repair.json').write_text(json.dumps(repair,indent=2)+'\n')
config=R/'vitest.config.mts';config.write_text("import { defineConfig } from 'vitest/config';\nexport default defineConfig({ root: "+json.dumps(str(C))+", test: { include: ['tests/trialBalance.parity-boundaries.test.ts'], environment: 'node', maxWorkers: 1 } });\n")
inputs=prior['sourceInputs']+prior['oracleInputs']+prior['checkInputs']+[pin(new),pin(config)]
assert all(pin(q['file'])==q for q in inputs)
args=[NODE,str(MOD/'vitest/vitest.mjs'),'run','--config',str(config),'--reporter=json','--outputFile',str(R/'parity.json')]
t=time.monotonic();timeout=False;log=R/'parity.log'
with log.open('wb') as out:
 p=subprocess.Popen(args,cwd=C,stdout=out,stderr=subprocess.STDOUT,start_new_session=True)
 try:code=p.wait(timeout=90)
 except subprocess.TimeoutExpired:
  timeout=True;os.killpg(p.pid,signal.SIGTERM)
  try:p.wait(timeout=5)
  except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);p.wait()
  code=None
row={'name':'parity','argv':args,'timeoutSeconds':90,'exitCode':code,'timedOut':timeout,'elapsedSeconds':time.monotonic()-t,'log':pin(log)}
if (R/'parity.json').exists():
 x=json.loads((R/'parity.json').read_text());row.update(report=pin(R/'parity.json'),success=x['success'],passed=x['numPassedTests'],failed=x['numFailedTests'],total=x['numTotalTests'])
unchanged=all(pin(q['file'])==q for q in inputs)
result={'schema':'trial-balance-root-cpu-checks/v1','complete':code==0 and row.get('passed')==row.get('total')==2 and unchanged,'materialization':prior['materialization'],'sourceCount':588,'sourceInputs':prior['sourceInputs'],'oracleInputs':prior['oracleInputs'],'checkInputs':prior['checkInputs']+[pin(new),pin(config)],'checks':[prior['checks'][0],row],'sourcePostUnchanged':unchanged,'strictScope':'Original frozen fixture plus all candidate sources; the sole repaired expression returns a scalar prefix count and is executed by the actual parity run.','fixtureRepair':pin(R/'repair.json'),'scope':'Passive observer equality, actual substep stage capture, full water sequence/boundaries and detached export only; no native attribution or gameplay success.'}
(R/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'parity':row,'result':pin(R/'result.json'),'complete':result['complete']}),flush=True)
raise SystemExit(0 if result['complete'] else 1)
