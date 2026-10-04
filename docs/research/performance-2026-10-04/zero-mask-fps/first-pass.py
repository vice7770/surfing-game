#!/usr/bin/env python3
"""One <=30s archival pass, with first production, standalone analysis and verifier receipts."""
import datetime, hashlib, json, os, pathlib, selectors, signal, subprocess, sys, time, traceback

ROOT=pathlib.Path(__file__).resolve().parent
TEMP=pathlib.Path('/private/tmp/zero-mask-fps-archive-first-20261004')
start=time.monotonic();child=None;records=[];logs_total=0
def utc():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(body):return hashlib.sha256(body).hexdigest()
receipt={'schema':'zero-mask-fps-first-bounded-archive-pass/v1','valid':False,'startedAt':utc(),'deadlineSeconds':30,'archiveCapBytes':33554432,'logsCapBytes':1048576,'resultCapBytes':131072,'commands':records,'heavyJobsClosed':False,'scope':'One first-only offline archive/standalone late analysis/default verifier pass; no retries or game/helper/native/browser/build/raster execution.'}
def alarm(signum,frame):raise TimeoutError('30s outer archive pass deadline')
signal.signal(signal.SIGALRM,alarm);signal.setitimer(signal.ITIMER_REAL,29)

def run(name,argv):
    global child,logs_total
    began=time.monotonic();rec={'name':name,'argv':argv,'cwd':str(ROOT),'startedAt':utc()};records.append(rec)
    child=subprocess.Popen(argv,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True)
    rec['pid']=child.pid;rec['freshProcessGroup']=child.pid
    os.set_blocking(child.stdout.fileno(),False);sel=selectors.DefaultSelector();sel.register(child.stdout,selectors.EVENT_READ);body=bytearray()
    try:
        while sel.get_map():
            if time.monotonic()-start>=28:raise TimeoutError('Archive subcommand exceeded remaining whole bound')
            for key,_ in sel.select(.05):
                chunk=os.read(key.fd,65536)
                if not chunk:sel.unregister(key.fileobj);continue
                if logs_total+len(body)+len(chunk)>1048576:raise RuntimeError('First archive logs exceeded1MiB')
                body.extend(chunk)
        rec['exitCode']=child.wait(timeout=max(.01,28.5-(time.monotonic()-start)))
    except BaseException as error:
        rec['firstFailure']=type(error).__name__+': '+str(error)
        try:os.killpg(child.pid,signal.SIGKILL)
        except ProcessLookupError:pass
        child.wait(timeout=.2);rec['exitCode']=child.returncode
    finally:
        sel.close();child.stdout.close();rec['childClosed']=child.poll() is not None
        rec['endedAt']=utc();rec['elapsedSeconds']=time.monotonic()-began
        path=ROOT/(name+'.log')
        with path.open('xb') as f:f.write(body)
        logs_total+=len(body);rec['log']={'path':path.name,'bytes':len(body),'sha256':sha(body)}
        terminal=ROOT/(name+'.terminal.json')
        with terminal.open('x') as f:json.dump(rec,f,indent=2);f.write('\n')
    if rec['exitCode']!=0 or rec.get('firstFailure'):raise RuntimeError(name+' first command failed; preserved without retry')

try:
    assert not TEMP.exists(),'Fresh first-only temporary output directory required';TEMP.mkdir()
    command={'argv':[sys.executable,str(__file__)],'cwd':str(ROOT),'startedAt':receipt['startedAt'],'wholeSeconds':30,'scope':receipt['scope']}
    with (TEMP/'command.json').open('x') as f:json.dump(command,f,indent=2);f.write('\n')
    run('archive-first',[sys.executable,str(ROOT/'archive-first.py')])
    run('late-analysis-first',[sys.executable,str(ROOT/'late-analysis.py'),str(ROOT/'late-analysis-first.json')])
    m=json.loads((ROOT/'manifest.json').read_text());analysis=json.loads((ROOT/'late-analysis-first.json').read_text())
    outcome={'schema':'zero-mask-fps-retained-outcome/v1','nativeHarnessValid':True,'archivalVerificationReceipt':'verify-first.result.json',
             'fpsAcceptance':False,'causalGuardBenefit':False,'tubeQualityPass':False,'adoption':False,'completeRuntimeReplayClosure':False,
             'lateAnalysis':analysis,'readySha256':m['readySha256'],'bindingsSha256':m['bindingsSha256'],
             'scope':'Current production arm is descriptive evidence. Valid native meter/configuration/closure does not prove sustained60Hz physics, causal guard benefit, tube quality or a new adoption decision. Full production source and compiled bodies omitted; archival verification receipt is separate.'}
    with (ROOT/'outcome.json').open('x') as f:json.dump(outcome,f,indent=2);f.write('\n')
    run('verify-first',[sys.executable,str(ROOT/'verify.py'),str(ROOT/'verify-first.result.json')])
    verification=json.loads((ROOT/'verify-first.result.json').read_text());assert verification['valid'] is True
    receipt.update(valid=True,firstProductionValid=True,firstLateAnalysisValid=True,firstDefaultVerifierValid=True,nativeHarnessValid=True,
                   archiveBytesBeforeFinalReceipt=sum(p.stat().st_size for p in ROOT.rglob('*') if p.is_file()),
                   fpsAcceptance=False,causalGuardBenefit=False,tubeQualityPass=False,adoption=False)
except BaseException as error:
    receipt['firstFailure']=type(error).__name__+': '+str(error);receipt['traceback']=traceback.format_exc()[-8192:]
finally:
    signal.setitimer(signal.ITIMER_REAL,0)
    if child is not None and child.poll() is None:
        try:os.killpg(child.pid,signal.SIGKILL)
        except ProcessLookupError:pass
        child.wait(timeout=.2)
    receipt['heavyJobsClosed']=child is None or child.poll() is not None
    receipt['endedAt']=utc();receipt['elapsedSeconds']=time.monotonic()-start;receipt['firstLogsBytes']=logs_total
    body=(json.dumps(receipt,indent=2)+'\n').encode();assert len(body)<=131072
    assert sum(p.stat().st_size for p in ROOT.rglob('*') if p.is_file())+len(body)<=33554432
    with (ROOT/'first-verification.json').open('xb') as f:f.write(body)
    with (TEMP/'terminal.json').open('xb') as f:f.write(body)
    for name in ('manifest.json','outcome.json','late-analysis-first.json','verify-first.result.json','first-verification.json'):
        p=ROOT/name
        if p.exists():
            data=p.read_bytes();receipt[name]={'bytes':len(data),'sha256':sha(data)}
    print(json.dumps(receipt,indent=2))
sys.exit(0 if receipt['valid'] else 1)
