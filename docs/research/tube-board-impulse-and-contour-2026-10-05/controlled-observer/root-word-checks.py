from pathlib import Path
import hashlib,json,subprocess,time,os,signal
C=Path(__file__).resolve().parent;R=C/'root-word-checks';R.mkdir(exist_ok=True)
MOD=Path('/Users/regina/Desktop/Projects/surfing-game/node_modules');NODE='/opt/homebrew/bin/node'
def pin(p):
 b=Path(p).read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
prior=json.loads((C/'root-boundary-checks/result.json').read_text());assert prior['checks'][1]['timedOut']
old=C/'tests/trialBalance.parity-boundaries.test.ts';new=C/'tests/trialBalance.parity-words.test.ts';text=old.read_text()
text="import assert from 'node:assert/strict';\nimport { serialize } from 'node:v8';\n"+text
text=text.replace("const DT = 1 / 60, YAW = 0.23362283028731087;","function equalWords(actual: unknown, expected: unknown, label: string) { assert(serialize(actual).equals(serialize(expected)), label); }\nconst DT = 1 / 60, YAW = 0.23362283028731087;")
pairs=[
("for (const [name, value] of Object.entries(expected)) expect(actual[name], name).toBe(value);","for (const [name, value] of Object.entries(expected)) assert.equal(actual[name], value, name);"),
("expect(actual[fields.availabilityMarker]).toBe(marker);","assert.equal(actual[fields.availabilityMarker], marker);"),
("if (hook.candidate) expect((this as unknown as LiveOperands).landingDemand[fields.availabilityMarker]).toBe(0);","if (hook.candidate) assert.equal((this as unknown as LiveOperands).landingDemand[fields.availabilityMarker], 0);"),
("expect(ownWords(p.rider.readContactDiagnostics())).toStrictEqual(diagnosticBefore);","equalWords(ownWords(p.rider.readContactDiagnostics()), diagnosticBefore, 'detached diagnostic words');"),
("expect(state(p, false)).toStrictEqual(before);","equalWords(state(p, false), before, 'full candidate state after detached mutation');"),
("if (step === 181) expect(p.rider.popUp()).toBe(true);","if (step === 181) assert.equal(p.rider.popUp(), true);"),
("expect(state(candidate), `all original own words at step ${step}`).toStrictEqual(state(old));","equalWords(state(candidate), state(old), `all original own words at step ${step}`);"),
("expect(candidateHook.events, `stage scalars and complete finish-substep words at step ${step}`).toStrictEqual(oldHook.events);","equalWords(candidateHook.events, oldHook.events, `stage scalars and complete finish-substep words at step ${step}`);"),
("expect(calls.get(candidate.water), `ordered water query/return/reaction calls at step ${step}`).toStrictEqual(calls.get(old.water));","equalWords(calls.get(candidate.water), calls.get(old.water), `ordered water query/return/reaction calls at step ${step}`);"),
("expect(capturedStandingTrials).toBeGreaterThan(0);","assert(capturedStandingTrials > 0);"),
("import { expect, it } from 'vitest';","import { it } from 'vitest';"),
("detachedDiagnostics(candidate);","detachedDiagnostics(candidate);\n      if (step % 60 === 0 || step === 276) process.stderr.write(JSON.stringify({fixture: fixture.name, step, capturedStandingTrials}) + '\\n');")]
for a,b in pairs:assert text.count(a)==1,a;text=text.replace(a,b)
assert 'expect(' not in text and 'toStrictEqual' not in text;new.write_text(text)
repair={'schema':'trial-balance-root-fixture-word-repair/v1','original':pin(old),'repaired':pin(new),'runtimeChanged':False,'onlyChange':'Native assertions compare identical original scalar operands with Object.is semantics. Native v8 serializes the complete existing declarative own-word graph (descriptors, symbols, references, typed bytes, undefined and numeric values) and compares every serialized byte; no graph fields removed. Every original552whole steps/finish/stage/query/reaction/marker/detachedness check remains. Water-boundary repair retained. Progress logging is external to physics state.','previousBoundedTimeout':pin(C/'root-boundary-checks/result.json')}
(R/'repair.json').write_text(json.dumps(repair,indent=2)+'\n')
config=R/'vitest.config.mts';config.write_text("import { defineConfig } from 'vitest/config';\nexport default defineConfig({ root: "+json.dumps(str(C))+", test: { include: ['tests/trialBalance.parity-words.test.ts'], environment: 'node', maxWorkers: 1 } });\n")
ts=R/'tsconfig.json';ts.write_text(json.dumps({'extends':str(C/'source/tsconfig.json'),'include':[str(C/'source/src'),str(new)]},indent=2)+'\n')
inputs=prior['sourceInputs']+prior['oracleInputs']+prior['checkInputs']+[pin(new),pin(config),pin(ts)]
assert all(pin(q['file'])==q for q in inputs)
checks=[]
for name,args,budget in [('strict',[NODE,str(MOD/'typescript/bin/tsc'),'--noEmit','--incremental','false','-p',str(ts)],90),('parity',[NODE,str(MOD/'vitest/vitest.mjs'),'run','--config',str(config),'--reporter=json','--outputFile',str(R/'parity.json')],90)]:
 t=time.monotonic();timeout=False;log=R/(name+'.log')
 with log.open('wb') as out:
  p=subprocess.Popen(args,cwd=C,stdout=out,stderr=subprocess.STDOUT,start_new_session=True)
  try:code=p.wait(timeout=budget)
  except subprocess.TimeoutExpired:
   timeout=True;os.killpg(p.pid,signal.SIGTERM)
   try:p.wait(timeout=5)
   except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);p.wait()
   code=None
 row={'name':name,'argv':args,'timeoutSeconds':budget,'exitCode':code,'timedOut':timeout,'elapsedSeconds':time.monotonic()-t,'log':pin(log)}
 if name=='parity' and (R/'parity.json').exists():
  x=json.loads((R/'parity.json').read_text());row.update(report=pin(R/'parity.json'),success=x['success'],passed=x['numPassedTests'],failed=x['numFailedTests'],total=x['numTotalTests'])
 checks.append(row);print(json.dumps(row),flush=True)
 if code!=0:break
unchanged=all(pin(q['file'])==q for q in inputs)
result={'schema':'trial-balance-root-cpu-checks/v1','complete':len(checks)==2 and all(q['exitCode']==0 for q in checks) and checks[-1].get('passed')==checks[-1].get('total')==2 and unchanged,'materialization':prior['materialization'],'sourceCount':588,'sourceInputs':prior['sourceInputs'],'oracleInputs':prior['oracleInputs'],'checkInputs':prior['checkInputs']+[pin(new),pin(config),pin(ts)],'checks':checks,'sourcePostUnchanged':unchanged,'fixtureRepair':pin(R/'repair.json'),'scope':'Passive observer full own-word parity, exact stage/marker capture, complete ordered water calls with every substep boundary and detached export; no native attribution or gameplay success.'}
(R/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'result':pin(R/'result.json'),'complete':result['complete']}),flush=True)
raise SystemExit(0 if result['complete'] else 1)
