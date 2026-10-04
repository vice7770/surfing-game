#!/usr/bin/env python3
"""One first-only <=30s offline archival production/default-verifier pass."""
import datetime,hashlib,json,os,pathlib,selectors,signal,subprocess,sys,time,traceback
ROOT=pathlib.Path(__file__).resolve().parent;TEMP=pathlib.Path('/private/tmp/roof-pair-trace-archive-20261004')
start=time.monotonic();child=None;commands=[];logged=0
def utc():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def h(b):return hashlib.sha256(b).hexdigest()
result={'schema':'roof-pair-trace-first-archive-pass/v1','valid':False,'startedAt':utc(),'wholeSeconds':30,'archiveCapBytes':16777216,'logCapBytes':1048576,'resultCapBytes':131072,'commands':commands,'heavyJobsClosed':False,'scope':'First-only selected archive production and retained-byte default verifier. No trace/library/compiler/simulation/native/raster execution; no retries.'}
def timeout(signum,frame):raise TimeoutError('30s whole offline archive deadline')
signal.signal(signal.SIGALRM,timeout);signal.setitimer(signal.ITIMER_REAL,29)
try:
 assert not TEMP.exists(),'Fresh first-only temporary evidence required';TEMP.mkdir()
 with (TEMP/'command.json').open('x') as f:json.dump({'argv':[sys.executable,str(__file__)],'cwd':str(ROOT),'startedAt':result['startedAt'],'wholeSeconds':30},f,indent=2);f.write('\n')
 for name,argv in [('archive-first',[sys.executable,str(ROOT/'archive-first.py')]),('verify-first',[sys.executable,str(ROOT/'verify.py'),str(ROOT/'verify-first.result.json')])]:
  rec={'name':name,'argv':argv,'cwd':str(ROOT),'startedAt':utc()};commands.append(rec);began=time.monotonic()
  child=subprocess.Popen(argv,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True);rec['pid']=rec['freshProcessGroup']=child.pid
  os.set_blocking(child.stdout.fileno(),False);sel=selectors.DefaultSelector();sel.register(child.stdout,selectors.EVENT_READ);log=bytearray()
  try:
   while sel.get_map():
    if time.monotonic()-start>=28:raise TimeoutError('Offline subcommand whole-bound timeout')
    for key,_ in sel.select(.05):
     data=os.read(key.fd,65536)
     if not data:sel.unregister(key.fileobj);continue
     if logged+len(log)+len(data)>1048576:raise RuntimeError('1MiB first logs cap')
     log.extend(data)
   rec['exitCode']=child.wait(timeout=max(.01,28.5-(time.monotonic()-start)))
  except BaseException as error:
   rec['firstFailure']=type(error).__name__+': '+str(error)
   try:os.killpg(child.pid,signal.SIGKILL)
   except ProcessLookupError:pass
   child.wait(timeout=.2);rec['exitCode']=child.returncode
  finally:
   sel.close();child.stdout.close();rec['endedAt']=utc();rec['elapsedSeconds']=time.monotonic()-began;rec['childClosed']=child.poll() is not None
   path=ROOT/(name+'.log')
   with path.open('xb') as f:f.write(log)
   logged+=len(log);rec['log']={'path':path.name,'bytes':len(log),'sha256':h(log)}
   with (ROOT/(name+'.terminal.json')).open('x') as f:json.dump(rec,f,indent=2);f.write('\n')
  if rec['exitCode']!=0 or rec.get('firstFailure'):raise RuntimeError(name+' first failure preserved without retry')
 result.update(valid=True,firstProductionValid=True,firstDefaultVerifierValid=True,nativeCaptureComplete=False,nineStateQuality=False,tubeQuality=False,adoption=False,finCauseProved=False,sourcePrototypeImplemented=False)
except BaseException as error:result['firstFailure']=type(error).__name__+': '+str(error);result['traceback']=traceback.format_exc()[-8192:]
finally:
 signal.setitimer(signal.ITIMER_REAL,0)
 if child is not None and child.poll() is None:
  try:os.killpg(child.pid,signal.SIGKILL)
  except ProcessLookupError:pass
  child.wait(timeout=.2)
 result['heavyJobsClosed']=child is None or child.poll() is not None;result['endedAt']=utc();result['elapsedSeconds']=time.monotonic()-start;result['firstLogsBytes']=logged
 before=sum(p.stat().st_size for p in ROOT.rglob('*') if p.is_file());result['archiveBytesBeforeReceipt']=before
 body=(json.dumps(result,indent=2)+'\n').encode();assert len(body)<=131072 and before+len(body)<=16777216
 with (ROOT/'first-verification.json').open('xb') as f:f.write(body)
 if TEMP.exists():
  with (TEMP/'terminal.json').open('xb') as f:f.write(body)
 for n in ['manifest.json','outcome.json','verify-first.result.json','first-verification.json']:
  p=ROOT/n
  if p.exists():b=p.read_bytes();result[n]={'bytes':len(b),'sha256':h(b)}
 print(json.dumps(result,indent=2))
sys.exit(0 if result['valid'] else 1)
