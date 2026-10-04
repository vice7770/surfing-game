#!/usr/bin/env python3
"""Root-owned one-shot supervisor. Only its freshly created process group is signalled."""
from pathlib import Path
import argparse, datetime, hashlib, json, os, selectors, signal, socket, subprocess, time

WORK = Path('/private/tmp/surf-wavelab-passive-original-20261004')
LOG_CAP = 1048576
LOG_SHARE = 524288
RECEIPT_CAP = 131072
ALL_CAP = 402653184

def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def identity(path):
    body = path.read_bytes()
    return {'path': str(path), 'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest()}

def tcp(port):
    connection = socket.socket()
    connection.settimeout(.3)
    try:
        connection.connect(('127.0.0.1', port))
        return {'closed': False, 'reason': 'TCP accepted'}
    except ConnectionRefusedError:
        return {'closed': True, 'reason': 'ECONNREFUSED'}
    except OSError as error:
        return {'closed': None, 'reason': str(error)}
    finally:
        connection.close()

def members(group):
    result = subprocess.run(['ps', '-axo', 'pid=,pgid=,stat=,command='], capture_output=True, text=True, timeout=.5, check=True)
    rows = []
    for line in result.stdout.splitlines():
        parts = line.strip().split(None, 3)
        if len(parts) == 4 and int(parts[1]) == group and not parts[2].startswith('Z'):
            rows.append({'pid': int(parts[0]), 'pgid': group, 'state': parts[2], 'command': parts[3]})
    return rows

parser = argparse.ArgumentParser()
parser.add_argument('--run', choices=['true', 'false'], default='false')
parser.add_argument('--ready-sha256')
parser.add_argument('--bindings-sha256')
args = parser.parse_args()
if args.run != 'true':
    print(json.dumps({'planOnly': True, 'commandSeconds': 175, 'cleanupSeconds': 5, 'wholeSeconds': 180, 'ownedPorts': [4259,9669], 'resourcesStarted': False}))
    raise SystemExit(0)
assert os.environ.get('ROOT_PASSIVE_NATIVE_LEASE') == 'true'
out = WORK / 'native-first'
receipt_path = WORK / 'native-first.native-driver.json'
log_path = WORK / 'native-first.native-driver.log'
assert not any(path.exists() for path in [out, receipt_path, log_path]), 'Fresh one-shot output required'
start = time.monotonic()
child = None
report = {'schema': 'root-passive-original-native-driver/v1', 'valid': False, 'commandSeconds': 175, 'cleanupSeconds': 5, 'wholeSeconds': 180, 'readySha256': args.ready_sha256, 'bindingsSha256': args.bindings_sha256, 'startedAt': utc(), 'signals': []}
def hard_alarm(_signal, _frame):
    signal.setitimer(signal.ITIMER_REAL, 0)
    reason = '180s whole supervisor deadline' if _signal == signal.SIGALRM else 'Owned supervisor terminated by SIGTERM'
    report.setdefault('firstFailure', reason)
    report.update({'valid': False, 'hardDeadlineFailure': reason, 'endedAt': utc(), 'elapsedSeconds': time.monotonic()-start, 'independentClosureValid': False, 'finalizationIncomplete': True})
    if child is not None:
        try:
            os.killpg(child.pid, signal.SIGKILL)
            report['signals'].append({'signal': 'SIGKILL', 'processGroup': child.pid, 'at': utc(), 'scope': 'Unconditional whole alarm; recorded fresh owned group only'})
        except ProcessLookupError:
            pass
        except OSError as error:
            report['hardDeadlineKillFailure'] = str(error)
    try:
        body = (json.dumps(report, indent=2)+'\n').encode()
        if len(body)>RECEIPT_CAP:
            body = (json.dumps({'schema':report['schema'],'valid':False,'firstFailure':report['firstFailure'],'hardDeadlineFailure':report['hardDeadlineFailure'],'finalizationIncomplete':True,'processGroup':child.pid if child else None})+'\n').encode()
        receipt_path.write_bytes(body)
    finally:
        os._exit(1)
signal.signal(signal.SIGALRM, hard_alarm)
signal.signal(signal.SIGTERM, hard_alarm)
signal.setitimer(signal.ITIMER_REAL, 180)
assert identity(WORK / 'ready.json')['sha256'] == args.ready_sha256
assert identity(WORK / 'bindings.json')['sha256'] == args.bindings_sha256
report['prePorts'] = {str(port): tcp(port) for port in [4259,9669,4200,5173]}
assert all(report['prePorts'][str(port)]['closed'] is True for port in [4259,9669]), 'Owned ports unavailable'
command = ['node', str(WORK / 'capture.mjs'), '--run=true', '--out=' + str(out)]
env = dict(os.environ, PASSIVE_READY_SHA256=args.ready_sha256, PASSIVE_BINDINGS_SHA256=args.bindings_sha256)
assert time.monotonic()-start<175, 'Preflight consumed command budget before spawning any resource'
child = subprocess.Popen(command, cwd=WORK, env=env, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=True)
report.update({'command': command, 'pid': child.pid, 'processGroup': child.pid, 'processGroupCreatedByThisDriver': True})
selector = selectors.DefaultSelector()
selector.register(child.stdout, selectors.EVENT_READ)
logs = bytearray()
deadline_hit = False
try:
    while child.poll() is None or selector.get_map():
        if time.monotonic() - start >= 175:
            deadline_hit = True
            report['firstFailure'] = '175s command deadline'
            break
        for key, _ in selector.select(min(.1, max(0, 175-(time.monotonic()-start)))):
            block = os.read(key.fileobj.fileno(), 65536)
            if not block:
                selector.unregister(key.fileobj)
            elif len(logs) + len(block) <= LOG_SHARE:
                logs.extend(block)
            else:
                deadline_hit = True
                report['firstFailure'] = '512KiB supervisor log share within combined1MiB cap'
                break
        if deadline_hit:
            break
except BaseException as error:
    report['firstFailure'] = str(error)
    deadline_hit = True
finally:
    selector.close()
    cleanup_start = time.monotonic()
    remaining = max(0, min(5, 180-(cleanup_start-start)))
    try:
        alive = members(child.pid)
        report['membersAtCleanup'] = alive
        if alive:
            if not deadline_hit and child.poll() is not None:
                report['firstFailure'] = 'Native child exited with owned process-group members still live'
            os.killpg(child.pid, signal.SIGTERM)
            report['signals'].append({'signal': 'SIGTERM', 'processGroup': child.pid, 'at': utc()})
            gentle_end = min(cleanup_start + remaining*.45, time.monotonic()+1)
            while time.monotonic() < gentle_end:
                child.poll()
                if not members(child.pid):
                    break
                time.sleep(.05)
            alive = members(child.pid)
            if alive:
                os.killpg(child.pid, signal.SIGKILL)
                report['signals'].append({'signal': 'SIGKILL', 'processGroup': child.pid, 'at': utc()})
        child.wait(timeout=max(.01, cleanup_start+remaining-2-time.monotonic()))
        report['membersAfterCleanup'] = members(child.pid)
    except ProcessLookupError:
        child.poll()
        report['membersAfterCleanup'] = []
    except BaseException as error:
        report['cleanupFailure'] = str(error)
        try:
            os.killpg(child.pid, signal.SIGKILL)
            report['signals'].append({'signal': 'SIGKILL', 'processGroup': child.pid, 'at': utc(), 'scope': 'Cleanup probe failure; recorded fresh owned group even if leader exited'})
        except ProcessLookupError:
            pass
    if child.stdout:
        child.stdout.close()
    report['cleanupElapsedSeconds'] = time.monotonic()-cleanup_start
    report['exitCode'] = child.poll()
    report['postPorts'] = {str(port): tcp(port) for port in [4259,9669,4200,5173]}
    report['independentClosureValid'] = not report.get('membersAfterCleanup', [True]) and all(report['postPorts'][str(port)]['closed'] is True for port in [4259,9669])
    report['untouchedPortScope'] = '4200/5173 are read-only TCP witnesses; no signal, stop, or interaction'
    log_path.write_bytes(logs)
    report['log'] = identity(log_path)
    native_report = out / 'report.json'
    if native_report.exists():
        report['nativeReport'] = identity(native_report)
        try:
            original = json.loads(native_report.read_bytes())
            report['nativeValid'] = original['valid']
            report['nativeIncomplete'] = original['incomplete']
            report['nativeFirstFailure'] = original.get('firstFailure')
        except (KeyError,ValueError) as error:
            report['nativeReportFailure'] = str(error)
    report['nativeOutputBytes'] = sum(path.stat().st_size for path in out.rglob('*') if path.is_file()) if out.exists() else 0
    report['totalLogBytes'] = len(logs) + ((out/'native.log').stat().st_size if (out/'native.log').exists() else 0)
    if report['totalLogBytes']>LOG_CAP:
        report.setdefault('firstFailure', 'Combined1MiB native and supervisor log cap')
    report['endedAt'] = utc()
    report['elapsedSeconds'] = time.monotonic()-start
    report['valid'] = report['exitCode'] == 0 and report.get('nativeValid') is True and report['independentClosureValid'] and not report.get('firstFailure') and not report.get('cleanupFailure') and report['elapsedSeconds']<=180 and report['cleanupElapsedSeconds']<=5 and report['totalLogBytes']<=LOG_CAP
    for _ in range(5):
        body = (json.dumps(report, indent=2)+'\n').encode()
        total = report['nativeOutputBytes']+len(logs)+len(body)
        if total == report.get('wholeOutputBytes'):
            break
        report['wholeOutputBytes'] = total
    if report['wholeOutputBytes']>ALL_CAP:
        report['valid'] = False
        report.setdefault('firstFailure', '384MiB complete output cap including supervisor receipt/log')
        for _ in range(5):
            body = (json.dumps(report, indent=2)+'\n').encode()
            total = report['nativeOutputBytes']+len(logs)+len(body)
            if total == report['wholeOutputBytes']:
                break
            report['wholeOutputBytes'] = total
    assert len(body)<=RECEIPT_CAP, '128KiB supervisor receipt bound'
    receipt_path.write_bytes(body)
    signal.setitimer(signal.ITIMER_REAL, 0)
print(json.dumps({'valid':report['valid'],'exitCode':report['exitCode'],'elapsedSeconds':report['elapsedSeconds'],'independentClosureValid':report['independentClosureValid'],'firstFailure':report.get('firstFailure'),'nativeFirstFailure':report.get('nativeFirstFailure'),'receipt':str(receipt_path)}))
raise SystemExit(0 if report['valid'] else 1)
