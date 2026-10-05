from pathlib import Path as _FreezePath
import json as _FreezeJson
_freeze_record=_FreezePath('/private/tmp/tube-bounded-c-stable-x-sampling-20261005/readiness.json')
if _freeze_record.exists() and _FreezeJson.loads(_freeze_record.read_text()).get('frozen'):
 raise SystemExit('Frozen candidate: generation/test scripts must not rewrite its inputs or evidence; use verify.py only.')
from pathlib import Path
import subprocess,json,hashlib,time
w=Path('/private/tmp/tube-bounded-c-stable-x-sampling-20261005');s=w/'source'
commands=[
 ('sampler-stress',['node','node_modules/vitest/vitest.mjs','run','src/wave/barrel/stableXSampling.test.ts','src/wave/barrel/stableXStress.test.ts','--config',str(w/'vitest.config.mjs'),'--cache=false','--reporter=default','--reporter=json','--outputFile='+str(w/'sampler-stress-vitest.json')],{}),
 ('carrier',['node','node_modules/vitest/vitest.mjs','run','src/wave/barrel/carrierSupport.test.ts','--config',str(w/'vitest.config.mjs'),'--cache=false','--reporter=default','--reporter=json','--outputFile='+str(w/'carrier-vitest.json')],{'CARRIER_METRICS':str(w/'carrier-focused-result.json')}),
 ('strict-typescript',['node','node_modules/typescript/bin/tsc','--noEmit','-p','tsconfig.json'],{})]
receipt=[]
for name,cmd,env in commands:
 import os
 started=time.time();r=subprocess.run(cmd,cwd=s,env={**os.environ,**env},stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 p=w/(name+'-output.txt');p.write_bytes(r.stdout)
 receipt.append({'name':name,'cwd':str(s),'argv':cmd,'environmentAdditions':env,'exitCode':r.returncode,'elapsedSeconds':time.time()-started,'output':{'path':str(p),'bytes':len(r.stdout),'sha256':hashlib.sha256(r.stdout).hexdigest()}})
 print(name,r.returncode,r.stdout.decode()[-1600:],flush=True)
 (w/'final-command-receipt.json').write_text(json.dumps({'complete':len(receipt)==len(commands),'commands':receipt},indent=2)+'\n')
 if r.returncode:raise SystemExit(r.returncode)
