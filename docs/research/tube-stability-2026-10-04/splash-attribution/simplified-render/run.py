#!/usr/bin/env python3
"""One finite owner for a GET-only static server, Node, and its fresh Chrome group."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import argparse, datetime, hashlib, json, os, selectors, signal, socket, subprocess, threading, time, shutil

WORK=Path('/private/tmp/tube-no-splash-ribbons-20261004')
def tcp(port):
    sock=socket.socket();sock.settimeout(.25)
    try: sock.connect(('127.0.0.1',port));return False
    except ConnectionRefusedError:return True
    except OSError:return None
    finally:sock.close()
def members(group):
    result=subprocess.run(['ps','-axo','pid=,pgid=,stat='],capture_output=True,text=True,check=True,timeout=.5)
    return [int(p[0]) for line in result.stdout.splitlines() if len(p:=line.split())==3 and int(p[1])==group and not p[2].startswith('Z')]
parser=argparse.ArgumentParser();parser.add_argument('--run',action='store_true');parser.add_argument('--arm',choices=['baseline','candidate'],required=True);parser.add_argument('--out');args=parser.parse_args()
DIST=WORK/'dist'
PORTS=(4283,9693)
if not args.run:
    print(json.dumps({'sourceOnlyPlan':True,'arm':args.arm,'dist':str(DIST),'wholeSeconds':120,'commandSeconds':108,'cleanupSeconds':7,'heldFrames':2,'pngs':4,'ports':PORTS,'resourcesStarted':False}));raise SystemExit(0)
start=time.monotonic();out=Path(args.out or WORK/(args.arm+'-first')).resolve();owner=out.with_name(out.name+'-owner.json');log=out.with_name(out.name+'-owner.log')
assert out.parent==WORK and not out.exists() and not owner.exists() and not log.exists(),'Fresh direct WORK output required'
assert (DIST/'index.html').is_file(),'Existing root-built dist required; this owner never copies/rebuilds'
assert all(tcp(p) is True for p in PORTS),'Both fresh owned ports must be closed'
node=shutil.which('node');assert node,'Installed Node required'
report={'schema':'tube-no-splash-ribbons-owner/v1','arm':args.arm,'physicalStateEqualityClaim':False,'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'wholeSeconds':120,'commandSeconds':108,'cleanupSeconds':7,'complete':False,'firstFailure':None,'ports':PORTS,
    'dist':str(DIST),'nativeOutput':str(out),'served':{},'logBytes':0,'nativeGroup':None}
lock=threading.Lock();server=None;proc=None;sel=selectors.DefaultSelector()
def save():
    with lock: body=json.dumps(report,separators=(',',':')).encode()
    assert len(body)<=131072,'Owner report cap';owner.write_bytes(body)
def append(body):
    with lock:
        if report['logBytes']+len(body)>1048576:raise RuntimeError('Combined owner/native log cap')
        with log.open('ab') as stream:stream.write(body)
        report['logBytes']+=len(body)
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(DIST),**kw)
    def log_message(self,fmt,*a):append((fmt%a+'\n').encode())
    def do_HEAD(self):self.send_error(405,'GET only')
    def do_GET(self):
        path=Path(self.translate_path(self.path)).resolve()
        if path.is_dir():path=path/'index.html'
        if not path.is_relative_to(DIST) or not path.is_file():self.send_error(404);return
        if path.stat().st_size>16*1024*1024:self.send_error(413);return
        body=path.read_bytes();key=str(path.relative_to(DIST))
        receipt={'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest()}
        with lock:
            assert len(report['served'])<64 or key in report['served'],'Served-file count cap'
            assert key not in report['served'] or report['served'][key]==receipt,'Served artifact changed'
            report['served'][key]=receipt
        self.send_response(200);self.send_header('Content-Type',self.guess_type(str(path)));self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
try:
    server=ThreadingHTTPServer(('127.0.0.1',PORTS[0]),Handler);server.daemon_threads=True
    threading.Thread(target=server.serve_forever,daemon=True).start()
    command=[node,str(WORK/'native.mjs'),'--run=true','--arm='+args.arm,f'--url=http://127.0.0.1:{PORTS[0]}/?diagnostics&physicsDx=1&physicsDz=1','--out='+str(out)]
    report['command']=command
    proc=subprocess.Popen(command,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True)
    report['nativeGroup']=proc.pid;save();sel.register(proc.stdout,selectors.EVENT_READ)
    while proc.poll() is None:
        if time.monotonic()-start>=108:raise TimeoutError('Whole command deadline; no retries')
        for key,_ in sel.select(.1):
            chunk=os.read(key.fileobj.fileno(),65536)
            if chunk:append(chunk)
            else:sel.unregister(key.fileobj)
    for key,_ in sel.select(0):
        while chunk:=os.read(key.fileobj.fileno(),65536):append(chunk)
    report['exitCode']=proc.returncode
    if proc.returncode!=0:raise RuntimeError('Native first invocation failed; retain partial output')
    native=json.loads((out/'report.json').read_text());assert native['complete'] and native['arm']==args.arm and len(native['frames'])==2 and len(native['artifacts'])==4,'Incomplete independent held arm'
    report['complete']=True
except BaseException as error:report['firstFailure']=str(error);report['complete']=False
finally:
    cleanup=time.monotonic()
    if proc is not None:
        try:
            if members(proc.pid):os.killpg(proc.pid,signal.SIGTERM)
        except ProcessLookupError:pass
        while time.monotonic()-cleanup<2.5 and members(proc.pid):time.sleep(.1)
        try:
            if members(proc.pid):os.killpg(proc.pid,signal.SIGKILL)
        except ProcessLookupError:pass
        while time.monotonic()-cleanup<5 and members(proc.pid):time.sleep(.1)
        report['remainingOwnedPids']=members(proc.pid)
        try:proc.wait(timeout=.3)
        except subprocess.TimeoutExpired:report['remainingOwnerChild']=True
    if server is not None:server.shutdown();server.server_close()
    report['closedPorts']={str(p):tcp(p) for p in PORTS}
    report['independentClosureValid']=not report.get('remainingOwnedPids') and all(v is True for v in report['closedPorts'].values())
    report['elapsedSeconds']=time.monotonic()-start
    if not report['independentClosureValid'] or report['elapsedSeconds']>120:report['complete']=False
    save();sel.close()
print(json.dumps({'complete':report['complete'],'firstFailure':report['firstFailure'],'independentClosureValid':report['independentClosureValid'],'elapsedSeconds':report['elapsedSeconds'],'owner':str(owner)}))
raise SystemExit(0 if report['complete'] else 1)
