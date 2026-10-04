#!/usr/bin/env python3
"""First-only external 30-second/128KiB supervisor for the offline verifier."""
import datetime
import hashlib
import json
import os
import pathlib
import selectors
import signal
import subprocess
import sys
import time

WORK = pathlib.Path('/private/tmp/surf-wavelab-passive-original-v2-20261004')
PREFIX = WORK/'root-postfailure-first-verification'
started = time.monotonic()
argv = [sys.executable, str(PREFIX)+'.py']
source = pathlib.Path(argv[1]).read_bytes()
command = {'argv':argv,'cwd':str(WORK),'deadlineSeconds':30,'childInternalDeadlineSeconds':25,
           'outputCapBytes':131072,'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
           'verifierSource':{'path':argv[1],'bytes':len(source),'sha256':hashlib.sha256(source).hexdigest()},
           'scope':'One offline builtin-only input-integrity verification; no retries. The native capture remains failed.'}
with pathlib.Path(str(PREFIX)+'.command.json').open('x') as f:
    json.dump(command,f,indent=2); f.write('\n')
p = subprocess.Popen(argv,cwd=WORK,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True)
os.set_blocking(p.stdout.fileno(),False)
sel = selectors.DefaultSelector(); sel.register(p.stdout,selectors.EVENT_READ)
log = bytearray(); failure = None
deadline = started+29
try:
    while sel.get_map():
        if time.monotonic() >= deadline:
            failure = 'Outer offline verification command deadline exceeded'
            os.killpg(p.pid,signal.SIGKILL)
            break
        for key,_ in sel.select(min(.1,max(0,deadline-time.monotonic()))):
            chunk = os.read(key.fd,65536)
            if not chunk:
                sel.unregister(key.fileobj)
                continue
            if len(log)+len(chunk) > 131072:
                failure = 'Outer offline verification output exceeded 128KiB'
                log.extend(chunk[:131072-len(log)])
                os.killpg(p.pid,signal.SIGKILL)
                break
            log.extend(chunk)
        if failure:
            break
    try:
        exit_code = p.wait(timeout=max(.01,started+29.5-time.monotonic()))
    except subprocess.TimeoutExpired:
        failure = failure or 'Offline verifier did not exit before external deadline'
        os.killpg(p.pid,signal.SIGKILL)
        exit_code = p.wait(timeout=.2)
finally:
    sel.close()
    p.stdout.close()
with pathlib.Path(str(PREFIX)+'.log').open('xb') as f:
    f.write(log)
terminal = {**command,'pid':p.pid,'freshProcessGroup':p.pid,'exitCode':exit_code,
            'valid':exit_code == 0 and failure is None,'firstFailure':failure,
            'endedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'elapsedSeconds':time.monotonic()-started,'childClosed':p.poll() is not None,
            'log':{'path':str(PREFIX)+'.log','bytes':len(log),'sha256':hashlib.sha256(log).hexdigest()},
            'nineStateQuality':False,'adoption':False,'fpsPass':False}
result_path = pathlib.Path(str(PREFIX)+'.result.json')
if result_path.exists():
    body = result_path.read_bytes()
    terminal['result'] = {'path':str(result_path),'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest()}
    terminal['inputIntegrityValid'] = json.loads(body).get('inputIntegrityValid',False)
with pathlib.Path(str(PREFIX)+'.terminal.json').open('x') as f:
    json.dump(terminal,f,indent=2); f.write('\n')
print(json.dumps(terminal,indent=2))
sys.exit(0 if terminal['valid'] else 1)
