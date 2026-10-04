#!/usr/bin/env python3
"""Future ROOT one-shot CPU supervisor: fresh owned process group, 30s work +1s cleanup. No ports/native."""
from pathlib import Path
import argparse, datetime, hashlib, json, os, selectors, signal, subprocess, time

WORK = Path('/private/tmp/surf-zero-mask-triangle-20261004/partial-eight')
LOG_CAP = 1048576
RECEIPT_CAP = 131072

def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

parser = argparse.ArgumentParser()
parser.add_argument('--run', choices=['true', 'false'], default='false')
parser.add_argument('--ready-sha256')
args = parser.parse_args()
if args.run != 'true':
    print(json.dumps({'planOnly': True, 'commandSeconds': 30, 'cleanupSeconds': 1, 'wholeSeconds': 31, 'nativeResources': False}))
    raise SystemExit(0)
assert os.environ.get('ROOT_ZERO_MASK_OFFLINE_LEASE') == 'true'
assert args.ready_sha256 and len(args.ready_sha256) == 64 and all(c in '0123456789abcdef' for c in args.ready_sha256)
out, receipt_path, log_path = WORK/'offline-first', WORK/'offline-first.driver.json', WORK/'offline-first.driver.log'
assert not any(p.exists() for p in [out, receipt_path, log_path]), 'Fresh first outcome required; zero retries'
node = os.environ.get('ROOT_ZERO_MASK_NODE')
assert node and Path(node).is_absolute() and Path(node).is_file(), 'Root supplies reviewed absolute Node executable'
start, child, log_bytes = time.monotonic(), None, bytearray()
receipt = {'schema': 'zero-mask-partial-eight-offline-driver/v1', 'valid': False, 'nativeCaptureComplete': False, 'nineStateQuality': False, 'startedAt': utc(), 'readySha256': args.ready_sha256,
           'commandSeconds': 30, 'cleanupSeconds': 1, 'wholeSeconds': 31, 'nativeResources': False, 'signals': [], 'firstFailure': None,
           'adoption': False, 'qualityPass': False, 'fpsGate': False}

def save():
    body = (json.dumps(receipt, separators=(',', ':'))+'\n').encode()
    assert len(body) <= RECEIPT_CAP
    receipt_path.write_bytes(body)

def kill_owned(sig):
    if child is not None and child.poll() is None:
        os.killpg(child.pid, sig)
        receipt['signals'].append({'signal': signal.Signals(sig).name, 'freshOwnedGroup': child.pid, 'at': utc()})

def hard_alarm(_sig, _frame):
    signal.setitimer(signal.ITIMER_REAL, 0)
    receipt['firstFailure'] = receipt['firstFailure'] or '31s whole supervisor deadline'
    try:
        kill_owned(signal.SIGKILL)
    except ProcessLookupError:
        pass
    receipt.update({'valid': False, 'finalizationIncomplete': True, 'endedAt': utc(), 'elapsedSeconds': time.monotonic()-start})
    save()
    os._exit(1)

signal.signal(signal.SIGALRM, hard_alarm)
signal.setitimer(signal.ITIMER_REAL, 31)
save()
try:
    ready = WORK/'ready.json'
    assert ready.stat().st_size <= RECEIPT_CAP
    assert hashlib.sha256(ready.read_bytes()).hexdigest() == args.ready_sha256
    env = dict(os.environ, ROOT_ZERO_MASK_DRIVER_PID=str(os.getpid()))
    command = [node, str(WORK/'run.mjs'), '--ready-sha256='+args.ready_sha256]
    child = subprocess.Popen(command, cwd=WORK, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=True)
    receipt.update({'command': command, 'pid': child.pid, 'processGroup': child.pid, 'createdFreshOwnedGroup': True})
    save()
    selector = selectors.DefaultSelector()
    selector.register(child.stdout, selectors.EVENT_READ)
    while selector.get_map():
        if time.monotonic()-start >= 30:
            receipt['firstFailure'] = receipt['firstFailure'] or '30s offline command deadline'
            break
        for key, _events in selector.select(.05):
            chunk = os.read(key.fileobj.fileno(), 65536)
            if not chunk:
                selector.unregister(key.fileobj)
                continue
            if len(log_bytes)+len(chunk) > LOG_CAP:
                receipt['firstFailure'] = receipt['firstFailure'] or '1MiB offline log cap'
                break
            log_bytes.extend(chunk)
            log_path.write_bytes(log_bytes)
        if receipt['firstFailure']:
            break
    if child.poll() is None and not receipt['firstFailure']:
        child.wait(timeout=max(.001, 30-(time.monotonic()-start)))
except Exception as error:
    receipt['firstFailure'] = receipt['firstFailure'] or str(error)
finally:
    cleanup = time.monotonic()
    try:
        if child is not None and child.poll() is None:
            kill_owned(signal.SIGTERM)
            try:
                child.wait(timeout=.2)
            except subprocess.TimeoutExpired:
                kill_owned(signal.SIGKILL)
                child.wait(timeout=.3)
    except Exception as error:
        receipt['cleanupFailure'] = str(error)
    receipt.update({'exitCode': child.poll() if child else None, 'childTerminal': child is not None and child.poll() is not None,
                    'cleanupSecondsActual': time.monotonic()-cleanup, 'endedAt': utc(), 'elapsedSeconds': time.monotonic()-start})
    log_path.write_bytes(log_bytes)
    receipt['log'] = {'path': str(log_path), 'bytes': len(log_bytes), 'sha256': hashlib.sha256(log_bytes).hexdigest()}
    report_path = out/'report.json'
    if report_path.exists():
        body = report_path.read_bytes()
        assert len(body) <= RECEIPT_CAP
        receipt['report'] = {'path': str(report_path), 'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest()}
        local = json.loads(body)
        receipt['localValid'] = local.get('valid')
        receipt['localFirstFailure'] = local.get('firstFailure')
        receipt['inputsUnchangedAfter'] = local.get('inputsUnchangedAfter')
    receipt['valid'] = receipt.get('exitCode') == 0 and receipt.get('localValid') is True and receipt.get('childTerminal') is True and not receipt.get('firstFailure') and not receipt.get('cleanupFailure') and receipt['elapsedSeconds'] <= 31 and receipt['cleanupSecondsActual'] <= 1
    save()
    signal.setitimer(signal.ITIMER_REAL, 0)
print(json.dumps({'valid': receipt['valid'], 'exitCode': receipt['exitCode'], 'firstFailure': receipt['firstFailure'], 'localFirstFailure': receipt.get('localFirstFailure'), 'receipt': str(receipt_path)}))
raise SystemExit(0 if receipt['valid'] else 1)
