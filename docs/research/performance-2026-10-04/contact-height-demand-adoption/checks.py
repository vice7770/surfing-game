import datetime, hashlib, json, os, pathlib, shutil, subprocess, sys
ROOT=pathlib.Path('/Users/regina/Desktop/Projects/surfing-game')
OUT=pathlib.Path('/private/tmp/contact-height-demand-adoption-20261004')
FILES=['src/physics/PhysicalSurfWater.ts','src/wave/barrel/sweptLoft.ts','src/wave/barrel/sweptContact.ts','src/wave/SurfZoneRunner.ts','src/game/SurfZoneWorkerCore.ts','src/physics/PhysicalSurfWater.test.ts','src/wave/barrel/ordinaryContact.test.ts','package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html']
COMMANDS=[('strict',['./node_modules/.bin/tsc','--noEmit']),('focused',['./node_modules/.bin/vitest','run','--maxWorkers','1','src/wave/barrel/sweptLoft.test.ts','src/wave/barrel/sweptContact.test.ts','src/wave/barrel/ordinaryContact.test.ts','src/physics/PhysicalSurfWater.test.ts','src/wave/SurfZoneRunner.test.ts','src/game/WorkerSurfZone.test.ts','src/game/SurfZoneHost.test.ts']),('build',['npm','run','build'])]
def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def inventory():
    return [{'path':f,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()} for f in FILES for b in [(ROOT/f).read_bytes()]]
def write(name,value): (OUT/name).write_text(json.dumps(value,indent=2)+'\n')
before=inventory(); write('source-before.json',before)
for f in FILES:
    target=OUT/'source-before'/f; target.parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(ROOT/f,target)
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
record={'schema':'contact-height-production-checks/v1','startedUtc':now(),'wrapperPid':os.getpid(),'cwd':str(ROOT),'head':head,'buildIdOverride':os.environ.get('BUILD_ID'),'commands':[],'status':'running'}
write('terminal.json',record)
for phase,argv in COMMANDS:
    entry={'phase':phase,'argv':argv,'cwd':str(ROOT),'startedUtc':now(),'log':phase+'-first.log'}
    with (OUT/entry['log']).open('wb') as log:
        process=subprocess.Popen(argv,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
        entry['pid']=process.pid; record['commands'].append(entry); write('terminal.json',record)
        print('PHASE_STARTED '+json.dumps(entry),flush=True)
        for line in iter(process.stdout.readline,b''):
            log.write(line); log.flush(); sys.stdout.buffer.write(line); sys.stdout.buffer.flush()
        entry['exit']=process.wait()
    entry['endedUtc']=now(); write('terminal.json',record)
    print('PHASE_TERMINAL '+json.dumps(entry),flush=True)
    if entry['exit'] != 0:
        record['status']='failed'; break
else: record['status']='passed'
write('source-after.json',inventory())
record['sourceInputsUnchanged']=before==inventory(); record['endedUtc']=now(); write('terminal.json',record)
print('CHECK_TERMINAL '+json.dumps(record),flush=True)
sys.exit(0 if record['status']=='passed' and record['sourceInputsUnchanged'] else 1)
