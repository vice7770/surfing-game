#!/usr/bin/env python3
"""One <=30s builtin-only corrected verifier pass; preserve all first evidence."""
import datetime,hashlib,json,os,pathlib,selectors,signal,subprocess,sys,time,traceback
ROOT=pathlib.Path(__file__).resolve().parent
TEMP=pathlib.Path('/private/tmp/roof-pair-trace-archive-20261004')
start=time.monotonic();child=None;log=bytearray();rec={}
def utc():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def h(b):return hashlib.sha256(b).hexdigest()
def pin(path):
 b=path.read_bytes();return {'path':path.name,'bytes':len(b),'sha256':h(b)}
def need(v,msg):
 if not v:raise AssertionError(msg)
expected={
 'manifest.json':'b1ac6b4fbc2f9c182ec51c6a954b1cb5f37007220d8589b947fa32b38cd56702',
 'outcome.json':'9a9b9a5981ad46e754b0c6205129e44b0eab45e6ff621b02ad79b0c560b78d9b',
 'verify-first.result.json':'a214d9366f918230a48401cde4bb641ae30dc32765f30a88a5e17686dd061fc0',
 'first-verification.json':'b935769dea458fca323d9fe124f2f298af0466e2498c2eca90f6647451124fed',
 'verify-v1.py':'b72d9d21824818e38fd3692cfc4272d8ec4b726760f3cd525815c82189224264'}
result={'schema':'roof-pair-trace-corrected-verifier-integration/v1','valid':False,'startedAt':utc(),'wholeSeconds':30,'archiveCapBytes':16777216,'logCapBytes':1048576,'resultCapBytes':131072,'command':rec,'heavyJobsClosed':False,'scope':'One separately authorized corrected retained-byte verifier, no archive rewrite, trace/compiler/helper/game imports, reconstruction, simulation, native or raster execution. First failed verifier and original reports/outcome/receipts preserved.'}
def timeout(signum,frame):raise TimeoutError('30s whole offline integration deadline')
signal.signal(signal.SIGALRM,timeout);signal.setitimer(signal.ITIMER_REAL,29)
try:
 need(TEMP.is_dir(),'Original first temporary evidence missing')
 need(not (ROOT/'integration-first-verification.json').exists() and not (TEMP/'integration-first.command.json').exists(),'Fresh integration-first evidence required')
 original=json.loads((ROOT/'first-verification.json').read_text())
 names=list(expected)+['archive-first.py','first-pass.py']
 names += [c['name']+suffix for c in original['commands'] for suffix in ('.log','.terminal.json')]
 before={n:pin(ROOT/n) for n in names}
 for n,sha in expected.items():need(before[n]['sha256']==sha,'First retained evidence differs: '+n)
 sourcePins=[pin(ROOT/n) for n in ('verify.py','integration-pass.py')];result['firstEvidencePins']=list(before.values());result['integrationSources']=sourcePins
 for c in original['commands']:
  need(before[c['log']['path']]['bytes']==c['log']['bytes'] and before[c['log']['path']]['sha256']==c['log']['sha256'],'Original first command log identity differs')
 argv=[sys.executable,str(ROOT/'verify.py'),str(ROOT/'verify-integration-first.result.json')]
 rec.update(name='verify-integration-first',argv=argv,cwd=str(ROOT),startedAt=utc())
 with (TEMP/'integration-first.command.json').open('x') as f:json.dump({'argv':[sys.executable,str(__file__)],'cwd':str(ROOT),'startedAt':result['startedAt'],'wholeSeconds':30,'childArgv':argv},f,indent=2);f.write('\n')
 began=time.monotonic();child=subprocess.Popen(argv,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True);rec['pid']=rec['freshProcessGroup']=child.pid
 os.set_blocking(child.stdout.fileno(),False);sel=selectors.DefaultSelector();sel.register(child.stdout,selectors.EVENT_READ)
 try:
  oldLogBytes=sum(before[c['log']['path']]['bytes'] for c in original['commands'])
  while sel.get_map():
   need(time.monotonic()-start<28,'Offline integration timeout')
   for key,_ in sel.select(.05):
    data=os.read(key.fd,65536)
    if not data:sel.unregister(key.fileobj);continue
    need(oldLogBytes+len(log)+len(data)<=1048576,'Combined first/integration logs exceed1MiB');log.extend(data)
  rec['exitCode']=child.wait(timeout=max(.01,28.5-(time.monotonic()-start)))
 finally:
  if child.poll() is None:
   try:os.killpg(child.pid,signal.SIGKILL)
   except ProcessLookupError:pass
   child.wait(timeout=.2)
  sel.close();child.stdout.close();rec.update(endedAt=utc(),elapsedSeconds=time.monotonic()-began,childClosed=child.poll() is not None)
  with (ROOT/'verify-integration-first.log').open('xb') as f:f.write(log)
  rec['log']=pin(ROOT/'verify-integration-first.log')
  with (ROOT/'verify-integration-first.terminal.json').open('x') as f:json.dump(rec,f,indent=2);f.write('\n')
 need(rec['exitCode']==0,'Corrected verifier first integration failure retained without retry')
 verified=json.loads((ROOT/'verify-integration-first.result.json').read_text());need(verified['valid'] is True and verified['priorArchiveVerifierFirstFailurePreserved'] is True,'Corrected verifier scope/result differs')
 need(all(pin(ROOT/n)==p for n,p in before.items()),'First evidence changed during integration')
 need([pin(ROOT/p['path']) for p in sourcePins]==sourcePins,'Integration source changed during command')
 result.update(valid=True,firstEvidenceUnchanged=True,correctedVerifierValid=True,priorArchiveVerifierFirstFailurePreserved=True,nativeCaptureComplete=False,nineStateQuality=False,tubeQuality=False,adoption=False,finCauseProved=False,sourcePrototypeImplemented=False)
except BaseException as error:result['firstFailure']=type(error).__name__+': '+str(error);result['traceback']=traceback.format_exc()[-8192:]
finally:
 signal.setitimer(signal.ITIMER_REAL,0)
 if child is not None and child.poll() is None:
  try:os.killpg(child.pid,signal.SIGKILL)
  except ProcessLookupError:pass
  child.wait(timeout=.2)
 result.update(heavyJobsClosed=child is None or child.poll() is not None,endedAt=utc(),elapsedSeconds=time.monotonic()-start)
 for n in ('verify-integration-first.result.json','verify-integration-first.log','verify-integration-first.terminal.json'):
  if (ROOT/n).exists():result[n]=pin(ROOT/n)
 size=sum(p.stat().st_size for p in ROOT.rglob('*') if p.is_file());result['archiveBytesBeforeIntegrationReceipt']=size
 body=(json.dumps(result,indent=2)+'\n').encode();need(len(body)<=131072 and size+len(body)<=16777216,'Integration result/archive cap exceeded')
 with (ROOT/'integration-first-verification.json').open('xb') as f:f.write(body)
 with (TEMP/'integration-first.terminal.json').open('xb') as f:f.write(body)
 print(body.decode(),end='')
sys.exit(0 if result['valid'] else 1)
