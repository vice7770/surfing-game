#!/usr/bin/env python3
"""Finite first-only owner. Default and --check-seal are read-only and start/probe no resources."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import argparse,base64,datetime,hashlib,json,math,os,selectors,signal,socket,struct,subprocess,threading,time
from authority import sealed,pin,LIMITS,W
PORTS=(4301,9711);USERS=(4312,4313,4314)
def tcp(port):
 sock=socket.socket();sock.settimeout(.25)
 try:sock.connect(('127.0.0.1',port));return False
 except ConnectionRefusedError:return True
 except OSError:return None
 finally:sock.close()
def listener_identity(port):
 r=subprocess.run(['/usr/sbin/lsof','-nP','-a','-iTCP:'+str(port),'-sTCP:LISTEN','-Fp'],capture_output=True,text=True,timeout=1)
 assert r.returncode==0,'Protected listener inventory unavailable '+str(port)
 pids=sorted({int(line[1:])for line in r.stdout.splitlines()if line.startswith('p')and line[1:].isdigit()});assert pids,'Protected listener missing '+str(port)
 rows=[]
 for pid in pids:
  p=subprocess.run(['/bin/ps','-p',str(pid),'-o','pid=,lstart=,comm='],capture_output=True,text=True,check=True,timeout=1)
  identity=p.stdout.strip();assert identity.startswith(str(pid)+' '),'Protected process identity unavailable'
  rows.append({'pid':pid,'identity':identity})
 return {'port':port,'listeners':rows}
def members(group):
 r=subprocess.run(['/bin/ps','-axo','pid=,pgid=,stat='],capture_output=True,text=True,check=True,timeout=.5)
 return[int(parts[0])for line in r.stdout.splitlines()if len(parts:=line.split())==3 and int(parts[1])==group and not parts[2].startswith('Z')]
def validate_sidecar(q,out):
 b=pin({'file':str(out/q['file']),'bytes':q['bytes'],'sha256':q['sha256']});assert len(b)<=6291456
 f=json.loads(b);assert f['schema']=='bounded-C-complete-drawn-loft-words/v1' and f['label']=='terminal' and f['available'] is True and f['arrayIdentitiesAndWordsUnchanged'] is True and f['unusedCapacityIncluded'] is False
 assert f['counts']==q['counts'] and f['epoch']==q['epoch'] and all(f['nonmutation'].values())
 c=f['counts'];assert all(type(c[k])is int and 0<=c[k]<=v for k,v in [('slices',300),('vertices',40200),('indices',240000)]) and c['vertices']==134*c['slices'] and c['indices']%3==0
 widths={'positions':3,'normals':3,'mask':1,'lift':1,'sheet':1,'sheetWeight':1,'sheetBack':1,'throat':4};sizes={'Float32Array':4,'Uint32Array':4,'Int32Array':4,'Uint8Array':1};decoded={};total=0
 assert len(f['arrays'])==37 and set(f['arrays'])==set(q['arrayManifest'])
 for key,a in f['arrays'].items():
  assert {k:v for k,v in a.items()if k!='data'}==q['arrayManifest'][key] and(key in widths or key=='indices'or key.startswith('slice'))
  expected=widths[key]*c['vertices']if key in widths else c['indices']if key=='indices'else c['slices'];assert a['count']==expected and type(a['littleEndian'])is bool
  assert a['encoding']=='base64-exact-active-typed-array-words';data=base64.b64decode(a['data'],validate=True);assert len(data)==a['byteLength']==a['count']*sizes[a['dtype']];decoded[key]=(a,data);total+=len(data)
  if key in('positions','normals'):assert a['dtype']=='Float32Array' and all(math.isfinite(x[0])for x in struct.iter_unpack(('<'if a['littleEndian']else'>')+'f',data))
  if key=='indices':assert a['dtype']=='Uint32Array' and all(x[0]<c['vertices']for x in struct.iter_unpack(('<'if a['littleEndian']else'>')+'I',data))
 assert total==f['rawBytes']==q['rawBytes']<=4194304
 front=f['rawFrontPacket'];assert front['dtype']=='Float32Array' and front['stride']==9 and 0<=front['recordCount']<=2048 and front['count']==9*front['recordCount'] and len(base64.b64decode(front['data'],validate=True))==front['byteLength']==4*front['count']
 return f,decoded
def validate_native(n,out,sealsha):
 assert n['schema']=='c-mature-core-native/v1' and n['complete'] is True and n['firstFailure'] is None and n['ownedBrowserClose'] is True and n['sealSha256']==sealsha
 assert n['caps']==LIMITS and n['policy']=={'geometryOnly':True,'knownPublicSeedRestart':True,'normalProductionGameplay':False,'firstOnly':True,'noPlacement':True,'noRetry':True,'noPilotGo':True,'noActorMeshMutationRequested':True,'ordinaryKnownFailureOverlayUnchanged':True}
 assert n['schedule']['hudReadyWaitMilliseconds']==180000 and 0<=n['startupElapsedMilliseconds']<635000
 req=n['applicationBuildRequest'];assert req['url']=='/build.json' and req['cache']=='no-store' and req['ok'] is True and req['build']==req['json']['build']=='tube-c-formation-20261005' and req['checkedBeforeReplayAndStepping'] is True
 e=n['initial']['menuEvidence'];assert all(e[k]is True for k in('actualDomStartup','normalSpawnPreserved','rideObserved','popupNotForced','normalHudPaused','activeLabDisabled')) and e['selectedChoices']==['Padang Padang','Big','Mid','Calm','Midday']
 assert n['replayStartup']['publicStartCalls']==1 and n['replayStartup']['publicReplayStart'] is True and n['replayStartup']['noActorPlacementOrPrivateMutation'] is True and n['replayStartup']['scene']=={'rider':True,'lab':False}
 assert n['overrides']==n['replayStartup']['overrides']=={'seed':6238,'componentCount':64,'dx':2,'fineSpacing':1}
 prior=json.loads(pin(n['knownCReport']));assert n['initial']['config']==prior['initial']['config'] and n['initialSeaTime']==n['initialBody']['seaTime']==prior['initialBody']['seaTime']
 assert n['initialReferenceMatch']=={'configExact':True,'seaTimeExact':True,'noAssignedClock':True,'fullSolverEqualityClaim':False}
 assert n['initialBody']['phase']=='prone' and len(n['initialBody']['boardPose'])==8 and len(n['initialBody']['riderPoints'])==21 and len(n['initialBody']['riderWords'])==12
 assert all(math.isfinite(x)for x in n['initialBody']['boardPose']+n['initialBody']['riderPoints']+n['initialBody']['riderWords'])
 rows=n['steps'];assert 0<=len(rows)==n['stepCount']<=360 and [r['step']for r in rows]==list(range(1,len(rows)+1))
 for row in rows:
  assert len(json.dumps(row,separators=(',',':')).encode())<=4096 and set(row)=={'step','physicalSeconds','seaTime','phase','input','resets','separation'}
  assert abs(row['seaTime']-n['initialSeaTime']-row['step']/60)<1e-6 and abs(row['physicalSeconds']-row['step']/60)<1e-9
  assert row['phase']in('prone','push','landing','standing','fallen','recover') and type(row['resets'])is int and row['resets']>=0
  assert all(type(v)is bool or type(v)in(int,float)and math.isfinite(v)for v in row['input'].values())
 trace=(out/'steps.ndjson').read_bytes();assert [json.loads(line)for line in trace.splitlines()]==rows and len(trace)==n['traceBytes']<=25165824 and(out/'report.json').stat().st_size<=33554432
 stop=n['stop'];assert stop['step']==len(rows) and len(rows)%30==0 and stop['kind']in('first-eligible-capture','first-eligible-failure','finite360-step-ceiling')
 if stop['kind']=='finite360-step-ceiling':assert len(rows)==360
 assert [a['step']for a in n['attempts']]==list(range(0,len(rows)+1,30)) and all(not a['available'] and not a['geometryFailure']for a in n['attempts'][:-1])
 normal=n['normal'];inspection=n['inspection'];assert normal['step']==len(rows) and normal['label']=='terminal' and normal['seaTime']==stop['seaTime'] and not n['browserErrors']
 guard=inspection['nonmutation'];assert guard['checked'] and guard['unchanged'] and guard['normalRenderRestored'] and guard['normalRenderRestoreFailure']is None and guard['checkedLoftArrays']==37 and guard['exactActiveByteComparison']
 assert inspection['geometryOrCameraSearch']is False and inspection['openingOrBodyPassageClaim']is False and not('pngDataUrl'in inspection)and not('png'in normal)
 sidecar,decoded=validate_sidecar(n['sidecar'],out);assert normal['loftSnapshot']==n['sidecar'] and n['sidecar']['epoch']['step']==len(rows) and n['sidecar']['epoch']['seaTime']==normal['seaTime']
 if inspection['available']:
  assert stop['kind']=='first-eligible-capture' and inspection['seaTime']==normal['seaTime'] and inspection['kind']=='geometry-only-mature-core-interior-inspection'
  selected=inspection['selector'];assert selected['phase']==selected['weight']==selected['inwardPhase']==selected['inwardWeight']==1 and abs(selected['row']-selected['inwardRow'])==1 and selected['activeStripTriangleCount']==266
  formats={'Float32Array':'f','Uint32Array':'I','Int32Array':'i','Uint8Array':'B'}
  def value(key,index):
   a,data=decoded[key];assert 0<=index<a['count'];fmt=('<'if a['littleEndian']else'>')+formats[a['dtype']];return struct.unpack_from(fmt,data,index*struct.calcsize(fmt))[0]
  for row in(selected['row'],selected['inwardRow']):assert value('sliceWeight',row)==1 and value('slicePhase',row)==1 and value('sliceFront',row)==selected['front']
  assert value('sliceJoined',selected['strip'])==1
  for air in(selected['air'],selected['inwardAir']):
   assert air['clearance']>0 and air['floorY']<air['middleY']<air['innerRoofY']<air['outerRoofY'] and len(air['crossings'])==3
   assert [c['branch']for c in air['crossings']]==['floor','inner-return','outer-roof']
  camera=inspection['cameraDerivation'];assert camera['eyeAnchor']['fraction']==.25 and camera['targetAnchor']['fraction']==.75 and camera['eyeToTargetActiveTriangleObstruction']is None and len(camera['nearCorners'])==4 and len(camera['checkedPoints'])==7
  assert all(point['floorY']<point['world'][1]<point['innerRoofY']and point['wholeDrawnLoftAir']is True and point['rendererBelowSurface']is False for point in camera['checkedPoints'])
 else:assert stop['kind']!='first-eligible-capture' and(inspection.get('geometryFailure')or inspection.get('firstEligibleAttemptFailed')or len(rows)==360)
 assert len(n['artifacts'])==len({q['file']for q in n['artifacts']}) and len(n['artifacts'])==3+int(inspection['available'])
 pngs=[]
 for q in n['artifacts']:
  assert Path(q['file']).name==q['file'];b=pin({'file':str(out/q['file']),'bytes':q['bytes'],'sha256':q['sha256']})
  if q['file'].endswith('.png'):
   assert b[:8]==bytes([137,80,78,71,13,10,26,10]) and len(b)<=12582912 and struct.unpack('>II',b[16:24])==(1708,879);pngs.append(q)
 assert len(pngs)==n['pngCount']==1+int(inspection['available']) and sum(q['bytes']for q in pngs)==n['pngBytes']<=25165824
 assert normal['artifact']==next(q for q in pngs if q['file']=='normal.png')
 if inspection['available']:assert inspection['artifact']==next(q for q in pngs if q['file']=='mature-core.png')
 assert {p.name for p in out.iterdir()if p.is_file()}=={'report.json'}|{q['file']for q in n['artifacts']}
 return True
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--run',action='store_true');parser.add_argument('--check-seal',action='store_true');parser.add_argument('--arm',choices=['candidate'],required=True);args=parser.parse_args()
 if not args.run and not args.check_seal:
  print(json.dumps({'sourceOnly':True,'resourcesStarted':False,'portsProbed':False,'sealRequired':str(W/'seal.json'),'limits':LIMITS}));return 0
 try:s,build,DIST,sealsha=sealed(args.arm)
 except(AssertionError,KeyError,FileNotFoundError,json.JSONDecodeError)as e:print(json.dumps({'resourcesStarted':False,'portsProbed':False,'sealFailure':str(e)}));return 2
 if args.check_seal:print(json.dumps({'sealValid':True,'resourcesStarted':False,'portsProbed':False,'sealSha256':sealsha}));return 0
 start=time.monotonic();out=W/'candidate-first';owner=W/'candidate-first-owner.json';log=W/'candidate-first-owner.log';launcher=W/'candidate-first-launcher.json'
 assert not any(p.exists()for p in(out,owner,log,launcher)),'First-only: preserve any failed invocation, no overwrite/retry'
 report={'schema':'c-mature-core-finite-owner/v1','complete':False,'firstFailure':None,'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sealSha256':sealsha,'limits':LIMITS,'dist':str(DIST),'served':{},'logBytes':0,'nativeGroup':None,'gameplayAcceptance':False,'tubePassageAcceptance':False,'visualAcceptance':False}
 lock=threading.Lock();server=None;proc=None;sel=selectors.DefaultSelector();protected_pids=set()
 def save():
  with lock:b=json.dumps(report,separators=(',',':')).encode()
  assert len(b)<=131072;owner.write_bytes(b)
 def append(b):
  with lock:
   assert report['logBytes']+len(b)<=1048576,'Combined log cap'
   with log.open('ab')as f:f.write(b)
   report['logBytes']+=len(b)
 assets={str(Path(q['file']).resolve()):q for q in build['assetPins']};diagnostic=s['diagnosticModule']
 class Handler(SimpleHTTPRequestHandler):
  def __init__(self,*args,**kw):super().__init__(*args,directory=str(DIST),**kw)
  def log_message(self,fmt,*args):append((fmt%args+'\n').encode())
  def do_HEAD(self):self.send_error(405,'GET only')
  def do_GET(self):
   if self.path.split('?')[0]=='/diagnostic-autopilot.mjs':b=pin(diagnostic);assert len(b)<=2097152;name='diagnostic-autopilot.mjs';mime='text/javascript'
   else:
    f=Path(self.translate_path(self.path)).resolve()
    if f.is_dir():f=f/'index.html'
    if not f.is_relative_to(DIST)or not f.is_file()or str(f)not in assets:self.send_error(404);return
    b=pin(assets[str(f)]);assert len(b)<=16777216;name=str(f.relative_to(DIST));mime=self.guess_type(str(f))
   with lock:report['served'][name]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
   self.send_response(200);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(b)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(b)
 try:
  report['ownedPortsInitiallyClosed']={str(p):tcp(p)for p in PORTS};assert all(v is True for v in report['ownedPortsInitiallyClosed'].values()),'Owned ports occupied'
  report['protectedStatesInitially']={str(p):tcp(p)for p in USERS};assert all(v is False for v in report['protectedStatesInitially'].values()),'Every human preview must already be open'
  report['protectedListenersInitially']={str(p):listener_identity(p)for p in USERS};protected_pids={row['pid']for q in report['protectedListenersInitially'].values()for row in q['listeners']}
  server=ThreadingHTTPServer(('127.0.0.1',4301),Handler);server.daemon_threads=True;threading.Thread(target=server.serve_forever,daemon=True).start()
  command=[s['environment']['node']['file'],str(W/'native.mjs'),'--run=true','--arm=candidate','--url=http://127.0.0.1:4301/?diagnostics','--out='+str(out)]
  env={**os.environ,'CHROME':s['environment']['chrome']['file'],'MATURE_CORE_OWNER_SEAL_SHA':sealsha,'FULL_WRITER_FPS_LAUNCHER_REPORT':str(launcher)};report['command']=command
  proc=subprocess.Popen(command,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True,env=env);report['nativeGroup']=proc.pid;save();sel.register(proc.stdout,selectors.EVENT_READ)
  while proc.poll()is None:
   if time.monotonic()-start>=648:raise TimeoutError('648s command ceiling; no retry')
   for key,_ in sel.select(.1):
    b=os.read(key.fileobj.fileno(),65536)
    if b:append(b)
    else:sel.unregister(key.fileobj)
  for key,_ in sel.select(0):
   while b:=os.read(key.fileobj.fileno(),65536):append(b)
  report['exitCode']=proc.returncode;assert proc.returncode==0,'Native first invocation failed'
  assert validate_native(json.loads((out/'report.json').read_text()),out,sealsha)
  served=report['served'];assert {'index.html','build.json','diagnostic-autopilot.mjs'}<=set(served)
  for name,q in served.items():
   expected=diagnostic if name=='diagnostic-autopilot.mjs'else assets[str(DIST/name)];assert q=={k:expected[k]for k in('bytes','sha256')}
  for prefix in('WorkerSurfZone-','surfZoneWorker-'):assert any(Path(name).name.startswith(prefix)for name in served)
  launchbytes=launcher.read_bytes();assert len(launchbytes)<=131072
  launch=json.loads(launchbytes);assert launch['ownedChromeClosed']is True and launch['portProof']['closed']is True and not launch.get('requestGuardFailure')
  report['launcher']={'file':str(launcher),'bytes':len(launchbytes),'sha256':hashlib.sha256(launchbytes).hexdigest()}
  sealed(args.arm);report['sourceBuildHelpersPostUnchanged']=True;report['complete']=True
 except BaseException as e:report['firstFailure']=str(e);report['complete']=False
 finally:
  cleanup=time.monotonic();report['cleanupFailures']=[]
  if proc is not None:
   try:
    owned=members(proc.pid);assert not protected_pids.intersection(owned),'Protected PID in owned group; do not signal'
    if owned:os.killpg(proc.pid,signal.SIGTERM)
    while time.monotonic()-cleanup<2.5 and members(proc.pid):time.sleep(.1)
    owned=members(proc.pid);assert not protected_pids.intersection(owned),'Protected PID in owned group; do not signal'
    if owned:os.killpg(proc.pid,signal.SIGKILL)
    while time.monotonic()-cleanup<4.5 and members(proc.pid):time.sleep(.1)
    report['remainingOwnedPids']=members(proc.pid)
    try:proc.wait(timeout=.3)
    except subprocess.TimeoutExpired:report['cleanupFailures'].append('Owner child wait timeout')
   except ProcessLookupError:report['remainingOwnedPids']=[]
   except BaseException as e:report['cleanupFailures'].append(str(e));report['remainingOwnedPids']=None
  else:report['remainingOwnedPids']=[]
  if server is not None:
   try:server.shutdown();server.server_close()
   except BaseException as e:report['cleanupFailures'].append('HTTP closure: '+str(e))
  report['closedPorts']={str(p):tcp(p)for p in PORTS};report['protectedStatesFinally']={str(p):tcp(p)for p in USERS}
  try:report['protectedListenersFinally']={str(p):listener_identity(p)for p in USERS}
  except BaseException as e:report['protectedListenersFinally']=None;report['cleanupFailures'].append('Protected identity: '+str(e))
  report['cleanupElapsedSeconds']=time.monotonic()-cleanup;report['elapsedSeconds']=time.monotonic()-start
  report['independentClosureValid']=report['remainingOwnedPids']==[]and all(v is True for v in report['closedPorts'].values())and not report['cleanupFailures']
  report['protectedPortsPreserved']=report.get('protectedStatesInitially')==report['protectedStatesFinally']=={str(p):False for p in USERS}and report.get('protectedListenersInitially')==report['protectedListenersFinally']
  if not(report['independentClosureValid']and report['protectedPortsPreserved']and report['cleanupElapsedSeconds']<=7 and report['elapsedSeconds']<=660):report['complete']=False
  save();sel.close()
 print(json.dumps({'complete':report['complete'],'firstFailure':report['firstFailure'],'owner':str(owner),'resourcesClosed':report['independentClosureValid']}));return 0 if report['complete']else 1
if __name__=='__main__':raise SystemExit(main())
