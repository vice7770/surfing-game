from pathlib import Path
import hashlib,json,subprocess,time,os,signal
C=Path(__file__).resolve().parent;S=C/'source';R=C/'root-checks';R.mkdir(exist_ok=True)
MOD=Path('/Users/regina/Desktop/Projects/surfing-game/node_modules');NODE='/opt/homebrew/bin/node'
def pin(p):
 b=Path(p).read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
ready=json.loads((C/'readiness.json').read_text());manifest=json.loads((C/'source-pins.json').read_text())
rows=manifest['pins'];assert len(rows)==588
inputs=[{'file':str(S/q['path']),'bytes':q['bytes'],'sha256':q['sha256']} for q in rows]
inputs += [pin(p) for p in [C/'readiness.json',C/'source-pins.json',C/'source-delta.json',Path('/private/tmp/tube-bounded-c-shared-seam-20261004/fixed-query-inputs.json'),Path('/private/tmp/tube-bounded-c-precision-v4-fixed-20261004/port-reference.json'),Path('/private/tmp/tube-bounded-c-shared-seam-20261004/precision-switch-inputs.json'),MOD/'typescript/bin/tsc',MOD/'vitest/vitest.mjs']]
assert all(pin(q['file'])==q for q in inputs)
for p in [S/'node_modules',C/'node_modules']:assert not p.exists();p.symlink_to(MOD,target_is_directory=True)
config=R/'vitest.config.mts';config.write_text("import { defineConfig } from 'vitest/config';\nexport default defineConfig({root:"+json.dumps(str(S))+",test:{include:['src/wave/barrel/sharedUpperRoot.test.ts','src/wave/barrel/boundedCProfile.test.ts'],maxWorkers:1,environment:'node'}});\n")
inputs.append(pin(config));checks=[]
for name,args in [('strict',[NODE,str(MOD/'typescript/bin/tsc'),'--noEmit','--incremental','false','-p',str(S/'tsconfig.json')]),('geometry',[NODE,str(MOD/'vitest/vitest.mjs'),'run','--config',str(config),'--reporter=json','--outputFile',str(R/'geometry.json')])]:
 t=time.monotonic();timeout=False;log=R/(name+'.log')
 with log.open('wb') as out:
  p=subprocess.Popen(args,cwd=S,stdout=out,stderr=subprocess.STDOUT,start_new_session=True)
  try:code=p.wait(timeout=90)
  except subprocess.TimeoutExpired:
   timeout=True;os.killpg(p.pid,signal.SIGTERM)
   try:p.wait(timeout=5)
   except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);p.wait()
   code=None
 row={'name':name,'argv':args,'timeoutSeconds':90,'exitCode':code,'timedOut':timeout,'elapsedSeconds':time.monotonic()-t,'log':pin(log)}
 if name=='geometry' and (R/'geometry.json').exists():
  x=json.loads((R/'geometry.json').read_text());row.update(report=pin(R/'geometry.json'),success=x['success'],passed=x['numPassedTests'],failed=x['numFailedTests'],total=x['numTotalTests'])
 checks.append(row);print(json.dumps(row),flush=True)
 if code!=0:break
unchanged=all(pin(q['file'])==q for q in inputs)
outputs=[pin(C/name) for name in ['fullsheet-query-receipt.json','fullsheet-exact-receipt.json','fullsheet-switch-receipt.json'] if (C/name).exists()]
result={'schema':'C-two-branch-root-geometry-checks/v2','complete':len(checks)==2 and all(q['exitCode']==0 for q in checks) and checks[-1].get('passed')==15 and unchanged,'inputs':inputs,'sourcePostUnchanged':unchanged,'checks':checks,'outputs':outputs,'scope':'Numerical contour/domain/thickness/lifecycle/footprint gates only; no app, native appearance, standing or passage acceptance.'}
(R/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'result':pin(R/'result.json'),'complete':result['complete']}),flush=True)
raise SystemExit(0 if result['complete'] else 1)
