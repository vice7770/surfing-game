"""Root-only before/after check. It edits only this preparation's fresh output directory."""
from pathlib import Path
import argparse, hashlib, json, os, re, signal, subprocess, time
W=Path(__file__).resolve().parent
NODE='/opt/homebrew/bin/node'
MODULES=Path('/Users/regina/Desktop/Projects/surfing-game/node_modules')
parser=argparse.ArgumentParser()
parser.add_argument('--root-run',action='store_true',required=True)
parser.add_argument('--source',required=True,type=Path)
parser.add_argument('--phase',required=True,choices=['before','after'])
args=parser.parse_args();source=args.source.resolve()
assert (source/'src/wave/barrel/sweptLoft.ts').is_file() and (source/'public/barrels/pad19-a30-l12.bin').is_file()
out=W/args.phase;assert not out.exists(),'Preserve the first check and its failure evidence';out.mkdir()
(out/'public').symlink_to(source/'public',target_is_directory=True)
(out/'node_modules').symlink_to(MODULES,target_is_directory=True)
def pin(file):
 file=Path(file);b=file.read_bytes();return {'file':str(file),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
template=W/'BoundedCFormationWater.test.ts';text=template.read_text()
# Only relocate the saved repository-relative fixture; the product test itself has no temp or parent imports.
base=source/'src/wave/barrel'
def relocate(match):
 literal=match.group(1)
 return "from '"+str((base/literal).resolve())+"'" if literal.startswith('.') else match.group(0)
text=re.sub(r"from '([^']+)'",relocate,text)
fixture=out/'regression.test.ts';fixture.write_text(text)
config=out/'vitest.config.ts';config.write_text("import { defineConfig } from 'vitest/config';\nexport default defineConfig({ root: "+json.dumps(str(out))+", test: { include: ['regression.test.ts'], environment: 'node', pool: 'forks', maxWorkers: 1 } });\n")
source_files=['src/wave/barrel/sweptLoft.ts','src/wave/barrel/sweptContact.ts','src/wave/barrel/ProfileLibrary.ts','src/wave/barrel/boundedCProfile.ts','src/wave/ShallowWaterSolver.ts','src/physics/PhysicalSurfWater.ts','src/physics/SurfWater.ts']
source_pins=[pin(source/r)for r in source_files]
assets=[pin(p)for p in sorted((source/'public/barrels').glob('*pad*'))if p.is_file()]
command=[NODE,str(MODULES/'vitest/vitest.mjs'),'run','--config',str(config),'--reporter=json','--outputFile='+str(out/'tests.json')]
started=time.monotonic();timed_out=False
with (out/'run.log').open('wb')as log:
 proc=subprocess.Popen(command,cwd=out,env=os.environ.copy(),stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
 try:exit_code=proc.wait(timeout=45)
 except subprocess.TimeoutExpired:
  timed_out=True;os.killpg(proc.pid,signal.SIGTERM)
  try:proc.wait(timeout=3)
  except subprocess.TimeoutExpired:os.killpg(proc.pid,signal.SIGKILL);proc.wait()
  exit_code=proc.returncode
unchanged=all(pin(q['file'])==q for q in source_pins+assets)
report=json.loads((out/'tests.json').read_text())if(out/'tests.json').exists()else None
actual={'total':report.get('numTotalTests'),'passed':report.get('numPassedTests'),'failed':report.get('numFailedTests'),'success':report.get('success')}if report else None
expected={'total':4,'passed':0,'failed':4,'success':False}if args.phase=='before'else{'total':4,'passed':4,'failed':0,'success':True}
accepted=not timed_out and unchanged and actual==expected and ((exit_code!=0)if args.phase=='before'else(exit_code==0))
result={'schema':'bounded-C-formation-root-production-regression/v1','phase':args.phase,'acceptedExpectedResult':accepted,'source':str(source),'sourcePostUnchanged':unchanged,'template':pin(template),'relocatedFixture':pin(fixture),'sourcePins':source_pins,'assetPins':assets,'command':command,'exitCode':exit_code,'timedOut':timed_out,'elapsedSeconds':time.monotonic()-started,'actual':actual,'expected':expected,'log':pin(out/'run.log'),'testReport':pin(out/'tests.json')if report else None,'portsStarted':False,'primaryFilesEdited':False,'tubePassageClaim':False}
(out/'result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'acceptedExpectedResult':accepted,'result':str(out/'result.json'),'actual':actual,'exitCode':exit_code,'sourcePostUnchanged':unchanged}))
raise SystemExit(0 if accepted else 1)
