from pathlib import Path
import hashlib,json,shutil,subprocess,time
C=Path(__file__).resolve().parent; S=C/'source'; R=C/'root-checks'; R.mkdir(exist_ok=True)
W=Path('/private/tmp/tube-native-trial-balance-native-20261005'); BASE=W/'source'
NODE='/opt/homebrew/bin/node'; MOD=Path('/Users/regina/Desktop/Projects/surfing-game/node_modules')
def pin(p):
 b=Path(p).read_bytes(); return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def matches(p,q):
 a=pin(p); return a['bytes']==q['bytes'] and a['sha256']==q['sha256']
dep=json.loads((C/'dependency-pins.json').read_text()); ready=json.loads((C/'readiness.json').read_text())
assert matches(ready['sourceOverride']['path'],ready['sourceOverride'])
base=json.loads((W/'root-base-copy.json').read_text()); assert len(base['pins'])==588
assert {q['path']: (q['bytes'],q['sha256']) for q in base['pins']}=={q['path']: (q['bytes'],q['sha256']) for q in dep['baselineLogicalSourcePins']}
for q in base['pins']:
 assert matches(BASE/q['path'],q)
 p=S/q['path']; p.parent.mkdir(parents=True,exist_ok=True)
 if q['path']=='src/physics/AttachedRider.ts': continue
 assert not p.exists(); shutil.copyfile(BASE/q['path'],p); assert matches(p,q)
(S/'node_modules').symlink_to(MOD,target_is_directory=True)
(C/'node_modules').symlink_to(MOD,target_is_directory=True)
sources=[pin(S/q['path']) for q in base['pins']]
oracle=Path(dep['baselineSourceRoot']); oracle_sources=[pin(oracle/q['path']) for q in base['pins']]
assert all(matches(oracle/q['path'],q) for q in base['pins'])
material={'schema':'trial-balance-root-materialization/v1','source':str(S),'sourceCount':588,'unchangedParentInputs':587,'sourcePins':sources,'oraclePins':oracle_sources,'preparedReadiness':pin(C/'readiness.json'),'fixture':pin(C/'tests/trialBalance.parity.prospective.test.ts'),'fields':pin(C/'observer-fields.json'),'candidateOnlyRuntimeOverride':ready['sourceOverride'],'aliases':['node_modules'],'importsRewritten':False}
(R/'materialization.json').write_text(json.dumps(material,indent=2)+'\n')
ts=R/'tsconfig.json'; ts.write_text(json.dumps({'extends':str(S/'tsconfig.json'),'include':[str(S/'src'),str(C/'tests/trialBalance.parity.prospective.test.ts')]},indent=2)+'\n')
vit=R/'vitest.config.ts'; vit.write_text("import { defineConfig } from 'vitest/config';\nexport default defineConfig({ root: "+json.dumps(str(C))+", test: { include: ['tests/trialBalance.parity.prospective.test.ts'], environment: 'node', maxWorkers: 1 } });\n")
inputs=[pin(ts),pin(vit),pin(MOD/'typescript/bin/tsc'),pin(MOD/'vitest/vitest.mjs'),pin(Path(NODE)),pin(C/'tests/trialBalance.parity.prospective.test.ts'),pin(C/'observer-fields.json')]
checks=[]
for name,args,budget in [('strict',[NODE,str(MOD/'typescript/bin/tsc'),'--noEmit','--incremental','false','-p',str(ts)],90),('parity',[NODE,str(MOD/'vitest/vitest.mjs'),'run','--config',str(vit),'--reporter=json','--outputFile',str(R/'parity.json')],90)]:
 t=time.monotonic(); log=R/(name+'.log'); timeout=False
 with log.open('wb') as out:
  try: r=subprocess.run(args,cwd=C,stdout=out,stderr=subprocess.STDOUT,timeout=budget); code=r.returncode
  except subprocess.TimeoutExpired: timeout=True; code=None
 row={'name':name,'argv':args,'timeoutSeconds':budget,'exitCode':code,'timedOut':timeout,'elapsedSeconds':time.monotonic()-t,'log':pin(log)}
 if name=='parity' and (R/'parity.json').exists():
  report=json.loads((R/'parity.json').read_text()); row.update(report=pin(R/'parity.json'),success=report['success'],passed=report['numPassedTests'],failed=report['numFailedTests'],total=report['numTotalTests'])
 checks.append(row); print(json.dumps(row),flush=True)
 if code!=0: break
unchanged=all(pin(q['file'])==q for q in sources+oracle_sources+inputs)
result={'schema':'trial-balance-root-cpu-checks/v1','complete':len(checks)==2 and all(q['exitCode']==0 for q in checks) and checks[-1].get('passed')==2 and unchanged,'materialization':pin(R/'materialization.json'),'sourceCount':588,'sourceInputs':sources,'oracleInputs':oracle_sources,'checkInputs':inputs,'checks':checks,'sourcePostUnchanged':unchanged,'scope':'Passive observer parity, actual substep stage capture and detached export only; no native attribution or gameplay success.'}
(R/'result.json').write_text(json.dumps(result,indent=2)+'\n'); print(json.dumps({'result':pin(R/'result.json'),'complete':result['complete']}),flush=True)
raise SystemExit(0 if result['complete'] else 1)
