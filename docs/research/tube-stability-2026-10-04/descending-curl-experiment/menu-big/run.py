#!/usr/bin/env python3
"""One finite owner for a GET-only static server, Node, and its fresh Chrome group."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import argparse, datetime, hashlib, json, math, os, selectors, signal, socket, subprocess, threading, time, shutil

WORK=Path('/private/tmp/tube-menu-big-entry-20261004')
MIB=1024*1024
USER_PORTS=(4310,4311)
def tcp(port):
    sock=socket.socket();sock.settimeout(.25)
    try: sock.connect(('127.0.0.1',port));return False
    except ConnectionRefusedError:return True
    except OSError:return None
    finally:sock.close()
def members(group):
    result=subprocess.run(['ps','-axo','pid=,pgid=,stat='],capture_output=True,text=True,check=True,timeout=.5)
    return [int(p[0]) for line in result.stdout.splitlines() if len(p:=line.split())==3 and int(p[1])==group and not p[2].startswith('Z')]
def bounded_file(path,cap):
    assert path.is_file(),f'Missing artifact: {path.name}'
    assert 0<path.stat().st_size<=cap,f'Artifact byte cap: {path.name}'
    body=path.read_bytes()
    assert 0<len(body)<=cap,f'Artifact changed beyond byte cap: {path.name}'
    return body
def integer(value):return isinstance(value,int) and not isinstance(value,bool)
def clock_equal(a,b):
    return isinstance(a,(int,float)) and isinstance(b,(int,float)) and math.isfinite(a) and math.isfinite(b) and abs(a-b)<1e-7
def validate_capture(native,out,arm):
    count=native['stepCount'];steps=native['steps']
    assert native['complete'] is True and native['arm']==arm and integer(count) and 0<count<=1800 and len(steps)==count,'Incomplete finite ordinary-input attempt'
    assert all(integer(s['step']) and s['step']==i for i,s in enumerate(steps,1)),'Ordinary step sequence must be1..stepCount'
    for i,s in enumerate(steps):
        assert clock_equal(s['physicalSeconds'],s['step']/60),f'Step physical-time mismatch at{s["step"]}'
        assert clock_equal(s['seaTime'],steps[0]['seaTime']+i/60),f'Step sea clock mismatch at{s["step"]}'
    artifacts=native['artifacts'];names=[a['file'] for a in artifacts]
    assert len(names)==len(set(names)) and 2<=len(names)<=5,'Unique bounded PNG/step/video artifacts required'
    receipts=[];png_bytes=0;ndjson=None
    for artifact in artifacts:
        name=artifact['file']
        assert isinstance(name,str) and Path(name).name==name and name not in ('','.', '..'),'Direct artifact filename required'
        path=out/name
        assert path.resolve().parent==out,'Artifact must stay inside owned output'
        suffix=path.suffix
        assert suffix in ('.png','.ndjson','.webm'),f'Unexpected artifact type: {name}'
        body=bounded_file(path,{'.png':12*MIB,'.ndjson':24*MIB,'.webm':16*MIB}[suffix]);digest=hashlib.sha256(body).hexdigest()
        assert integer(artifact['bytes']) and len(body)==artifact['bytes'] and digest==artifact['sha256'],f'Artifact receipt mismatch: {name}'
        if suffix=='.png':
            assert len(body)>8 and body[:8]==b'\x89PNG\r\n\x1a\n',f'PNG signature: {name}'
            png_bytes+=len(body)
        elif suffix=='.webm':
            assert len(body)>4 and body[:4]==b'\x1a\x45\xdf\xa3',f'WebM EBML signature: {name}'
        else:ndjson=body
        receipts.append({'file':name,'bytes':len(body),'sha256':digest})
    pngs=[name for name in names if name.endswith('.png')]
    assert integer(native['pngCount']) and 1<=len(pngs)<=3 and len(pngs)==native['pngCount'] and png_bytes<=36*MIB,'PNG count/total byte cap'
    assert native['pngBytes']==png_bytes,'Actual PNG byte total must match native report'
    assert [name for name in names if name.endswith('.ndjson')]==['steps.ndjson'],'Exactly one steps.ndjson required'
    rows=[json.loads(line) for line in ndjson.decode('utf-8').splitlines() if line.strip()]
    assert rows==steps,'Actual NDJSON rows must exactly match retained ordinary steps'
    assert {p.name for p in out.iterdir() if p.suffix in ('.png','.ndjson','.webm')}==set(names),'Undeclared/missing media artifacts in owned output'
    videos=[name for name in names if name.endswith('.webm')]
    standing=native.get('firstStanding');video=native.get('video');requests=native.get('videoRequests',[])
    if standing is None:
        assert not videos and not requests and not video,'No first standing: no video capture/artifact permitted'
        video_check={'required':False,'firstStanding':None,'completeClip':False}
    else:
        first=standing['step']
        assert integer(first) and 1<=first<=count and clock_equal(standing['seaTime'],steps[first-1]['seaTime']) and clock_equal(standing['physicalSeconds'],first/60),'First-standing witness must match ordinary steps'
        assert len(videos)==1 and videos[0]=='standing-motion.webm' and isinstance(video,dict),'First standing requires exactly one complete standing-motion.webm'
        assert video['complete'] is True and video['tracksStopped'] is True,'Standing clip must complete and stop all tracks'
        begin,end,advances=video['startStep'],video['endStep'],video['physicsAdvances']
        assert all(integer(v) for v in (begin,end,advances)) and begin==first and begin<=end<=count and 0<=advances<=240 and end-begin==advances,'Standing movie must span at most240 physical advances from first standing'
        assert 1<=len(requests)<=241 and len(requests)==advances+1 and video['requestFrameCount']==len(requests) and video['requestCount']==len(requests),'Standing movie request count must match actual request log'
        assert all(integer(r['request']) and r['request']==i and integer(r['step']) and r['step']==begin+i-1 for i,r in enumerate(requests,1)),'Movie requests must cover every consecutive captured step'
        for request in requests:
            assert clock_equal(request['seaTime'],steps[request['step']-1]['seaTime']),f'Movie request clock mismatch at{request["step"]}'
        assert clock_equal(video['physicalSeconds'],advances/60) and clock_equal(video['startSeaTime'],steps[begin-1]['seaTime']) and clock_equal(video['endSeaTime'],steps[end-1]['seaTime']) and clock_equal(video['endSeaTime']-video['startSeaTime'],advances/60),'Movie physical span must match ordinary clocks'
        artifact=next(a for a in artifacts if a['file']==videos[0])
        assert video['file']==artifact['file'] and video['bytes']==artifact['bytes'] and video['sha256']==artifact['sha256'],'Movie metadata must match actual bounded artifact receipt'
        video_check={'required':True,'completeClip':True,'startStep':begin,'endStep':end,'physicsAdvances':advances,'requests':len(requests),'bytes':video['bytes']}
    return {'stepCount':count,'pngCount':len(pngs),'pngBytes':png_bytes,'artifactReceipts':receipts,'ndjsonRows':len(rows),'video':video_check,'reportBytes':(out/'report.json').stat().st_size}
parser=argparse.ArgumentParser();parser.add_argument('--run',action='store_true');parser.add_argument('--arm',choices=['baseline','candidate'],required=True);parser.add_argument('--out');args=parser.parse_args()
DIST=WORK/'dist'
PORTS=(4291,9701)
if not args.run:
    print(json.dumps({'sourceOnlyPlan':True,'arm':args.arm,'dist':str(DIST),'wholeSeconds':180,'commandSeconds':168,'cleanupSeconds':7,'maximumSteps':1800,'maximumPhysicalSeconds':30,'maximumPngs':3,'maximumPngBytesEach':12*MIB,'maximumPngBytesTotal':36*MIB,'maximumReportBytes':32*MIB,'maximumNdjsonBytes':24*MIB,'optionalMovieMaximumAdvances':240,'optionalMovieMaximumRequests':241,'optionalMovieMaximumBytes':16*MIB,'ports':PORTS,'userPorts':USER_PORTS,'userPortsMustStayOpen':True,'resourcesStarted':False}));raise SystemExit(0)
start=time.monotonic();out=Path(args.out or WORK/(args.arm+'-first')).resolve();owner=out.with_name(out.name+'-owner.json');log=out.with_name(out.name+'-owner.log')
assert out==WORK/'native-first' and not out.exists() and not owner.exists() and not log.exists(),'Only one fresh native-first invocation is prepared'
preparation=None;expected_assets={}
def verify_copy():
    return bool(preparation) and all((DIST/key).is_file() and (DIST/key).stat().st_size==value['bytes'] and hashlib.sha256((DIST/key).read_bytes()).hexdigest()==value['sha256'] for key,value in expected_assets.items())
def verify_sources():
    return bool(preparation) and all(Path(value['file']).is_file() and Path(value['file']).stat().st_size==value['bytes'] and hashlib.sha256(Path(value['file']).read_bytes()).hexdigest()==value['sha256'] for value in preparation['diagnosticSources'].values())
report={'schema':'tube-natural-entry-owner/v1','arm':args.arm,'physicalStateEqualityClaim':False,'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'wholeSeconds':180,'commandSeconds':168,'cleanupSeconds':7,'complete':False,'firstFailure':None,'failures':[],'ports':PORTS,
    'dist':str(DIST),'nativeOutput':str(out),'served':{},'logBytes':0,'nativeGroup':None,'resourcesStarted':False,'preflightComplete':False}
lock=threading.Lock();server=None;proc=None;sel=selectors.DefaultSelector();server_thread=None
def failure(error,phase):
    entry={'phase':phase,'type':type(error).__name__,'message':str(error)}
    with lock:
        if report['firstFailure'] is None:report['firstFailure']=entry['message'];report['firstFailureType']=entry['type'];report['firstFailurePhase']=phase
        if entry not in report['failures']:report['failures'].append(entry)
        report['complete']=False
def save():
    with lock: body=json.dumps(report,separators=(',',':')).encode()
    assert len(body)<=131072,'Owner report cap';owner.write_bytes(body)
def append(body):
    with lock:
        if report['logBytes']+len(body)>1048576:raise RuntimeError('Combined owner/native log cap')
        with log.open('ab') as stream:stream.write(body)
        report['logBytes']+=len(body)
def command_deadline():
    if time.monotonic()-start>=168:raise TimeoutError('Whole command deadline; no retries')
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(DIST),**kw)
    def log_message(self,fmt,*a):
        try:append((fmt%a+'\n').encode())
        except BaseException as error:failure(error,'static-server-log');raise
    def do_HEAD(self):self.send_error(405,'GET only')
    def do_GET(self):
        try:self.get_owned()
        except BaseException as error:failure(error,'static-server');raise
    def get_owned(self):
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
    save()
    assert (DIST/'index.html').is_file(),'Existing root-built dist required; this owner never copies/rebuilds'
    report['ownedPortsInitiallyClosed']={str(p):tcp(p) for p in PORTS}
    assert all(v is True for v in report['ownedPortsInitiallyClosed'].values()),'Both fresh owned ports must be closed'
    report['userPortsOpenBefore']={str(p):tcp(p) is False for p in USER_PORTS}
    assert all(report['userPortsOpenBefore'].values()),'Existing user4310 and4311 must both be open before launch'
    node=shutil.which('node');assert node,'Installed Node required'
    preparation=json.loads((WORK/'preparation.json').read_text());expected_assets={**preparation['assets'],**preparation['diagnosticAssets']}
    assert verify_copy() and verify_sources(),'Prepared copied dist and frozen sources must match manifest before launch'
    report['preflightComplete']=True;save();command_deadline()
    server=ThreadingHTTPServer(('127.0.0.1',PORTS[0]),Handler);server.daemon_threads=True
    server_thread=threading.Thread(target=server.serve_forever,daemon=True);server_thread.start();report['resourcesStarted']=True
    command=[node,str(WORK/'native.mjs'),'--run=true','--arm='+args.arm,f'--url=http://127.0.0.1:{PORTS[0]}/?diagnostics','--out='+str(out)]
    report['command']=command
    proc=subprocess.Popen(command,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True)
    report['nativeGroup']=proc.pid;save();os.set_blocking(proc.stdout.fileno(),False);sel.register(proc.stdout,selectors.EVENT_READ)
    while proc.poll() is None:
        command_deadline()
        if report['firstFailure'] is not None:raise RuntimeError('Static owner failure; preserve first failure and stop owned capture')
        for key,_ in sel.select(.1):
            try:chunk=os.read(key.fileobj.fileno(),65536)
            except BlockingIOError:continue
            if chunk:append(chunk)
            else:sel.unregister(key.fileobj)
    for key,_ in sel.select(0):
        while True:
            command_deadline()
            try:chunk=os.read(key.fileobj.fileno(),65536)
            except BlockingIOError:break
            if not chunk:break
            append(chunk)
    report['exitCode']=proc.returncode
    if proc.returncode!=0:raise RuntimeError('Native first invocation failed; retain partial output')
    native=json.loads(bounded_file(out/'report.json',32*MIB))
    report['captureValidation']=validate_capture(native,out,args.arm);command_deadline()
    assert report['firstFailure'] is None,'Owner already retained an earlier failure'
    report['complete']=True
except BaseException as error:failure(error,'preflight' if not report['preflightComplete'] else 'command')
finally:
    cleanup=time.monotonic()
    def owned_members():
        try:return members(proc.pid)
        except BaseException as error:failure(error,'owned-group-proof');return None
    def kill_owned(sig):
        try:os.killpg(proc.pid,sig)
        except ProcessLookupError:pass
        except BaseException as error:failure(error,'owned-group-signal')
    if proc is not None:
        remaining=owned_members()
        if remaining is None or remaining:kill_owned(signal.SIGTERM)
        while time.monotonic()-cleanup<2.5:
            remaining=owned_members()
            if remaining==[]:break
            time.sleep(.1)
        if remaining is None or remaining:kill_owned(signal.SIGKILL)
        while time.monotonic()-cleanup<5:
            remaining=owned_members()
            if remaining==[]:break
            time.sleep(.1)
        report['remainingOwnedPids']=owned_members()
        try:proc.wait(timeout=.3)
        except BaseException as error:report['remainingOwnerChild']=True;failure(error,'owned-child-wait')
    if server is not None:
        try:
            if server_thread is not None and server_thread.is_alive():
                stop_thread=threading.Thread(target=server.shutdown,daemon=True);stop_thread.start();stop_thread.join(max(0,cleanup+6-time.monotonic()))
                if stop_thread.is_alive():failure(TimeoutError('Owned server shutdown exceeded cleanup budget'),'server-cleanup')
            server.server_close()
        except BaseException as error:failure(error,'server-cleanup')
    report['closedPorts']={str(p):tcp(p) for p in PORTS}
    report['userPortsOpenAfter']={str(p):tcp(p) is False for p in USER_PORTS}
    report['user4310StillOpen']=report['userPortsOpenAfter']['4310']
    report['user4311StillOpen']=report['userPortsOpenAfter']['4311']
    report['userServersStayedOpen']=all(report['userPortsOpenAfter'].values())
    for key,check in (('copiedDistUnchanged',verify_copy),('diagnosticSourcesUnchanged',verify_sources)):
        try:report[key]=check() if preparation is not None else None
        except BaseException as error:report[key]=False;failure(error,key)
    report['independentClosureValid']=(not report['resourcesStarted']) or (report.get('remainingOwnedPids',[])==[] and all(v is True for v in report['closedPorts'].values()))
    if not report['independentClosureValid']:failure(RuntimeError('Owned process/port closure unproven'),'cleanup')
    if not report['userServersStayedOpen']:failure(RuntimeError('Existing user4310/4311 closure observed; neither server was managed'),'cleanup')
    if preparation is not None and (not report['copiedDistUnchanged'] or not report['diagnosticSourcesUnchanged']):failure(RuntimeError('Prepared dist or diagnostic source changed'),'cleanup')
    try:sel.close()
    except BaseException as error:failure(error,'selector-cleanup')
    report['cleanupElapsedSeconds']=time.monotonic()-cleanup;report['elapsedSeconds']=time.monotonic()-start
    if report['cleanupElapsedSeconds']>7:failure(TimeoutError('Cleanup exceeded7-second deadline'),'cleanup')
    if report['elapsedSeconds']>180:failure(TimeoutError('Owner exceeded180-second whole deadline'),'cleanup')
    if report['firstFailure'] is not None:report['complete']=False
    save()
print(json.dumps({'complete':report['complete'],'firstFailure':report['firstFailure'],'independentClosureValid':report['independentClosureValid'],'elapsedSeconds':report['elapsedSeconds'],'owner':str(owner)}))
raise SystemExit(0 if report['complete'] else 1)
