#!/usr/bin/env python3
"""First-only bounded owner. The default and --check-seal routes start/probe no resources."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import argparse,datetime,hashlib,json,os,selectors,signal,socket,subprocess,threading,time,math,base64,struct
from authority import sealed,pin,LIMITS,W
PORTS=(4301,9711);USERS=(4310,4311,4312,4313)
def validate_camera(e):
 assert e['policy']=='public-authored-follower-mirror/v1' and e['view'] in ('front','behind','side') and e['activeLab'] is False and e['normalHudPause'] is True
 assert e['exactPositionQuaternionMatch'] is True and e['actualDrawnFollowTargetMatch'] is True and e['publishedClockBodyWordsUnchangedByCamera'] is True and e['mirrorUsesOrdinaryHostHeightReads'] is True
 assert type(e['calls']) is int and 1<=e['calls']<=50000 and e['positiveDtCalls']+e['zeroDtCalls']==e['calls']
 assert len(e['position'])==3 and len(e['quaternion'])==4 and all(math.isfinite(x)for x in e['position']+e['quaternion'])
def body(q,count):
 assert q['dtype']=='Float64Array' and type(q['littleEndian']) is bool and q['count']==count and q['encoding']=='base64-exact-active-typed-array-words'
 b=base64.b64decode(q['data'],validate=True);assert len(b)==8*count and all(math.isfinite(x[0])for x in struct.iter_unpack(('<'if q['littleEndian']else'>')+'d',b))
def sidecar(q,out):
 b=pin({'file':str(out/q['file']),'bytes':q['bytes'],'sha256':q['sha256']});assert len(b)<=6291456
 f=json.loads(b);assert f['schema']=='bounded-C-complete-drawn-loft-words/v1' and f['arrayIdentitiesAndWordsUnchanged'] is True and f['unusedCapacityIncluded'] is False
 assert f['label']==q['label'] and f['counts']==q['counts'] and f['epoch']==q['epoch'] and all(f['nonmutation'].values())
 widths={'positions':3,'normals':3,'mask':1,'lift':1,'sheet':1,'sheetWeight':1,'sheetBack':1,'throat':4};c=f['counts'];total=0
 assert len(f['arrays'])==37 and set(f['arrays'])==set(q['arrayManifest']) and c['indices']%3==0
 assert all(type(c[k])is int and 0<=c[k]<=v for k,v in [('slices',300),('vertices',40200),('indices',240000)])
 for key,a in f['arrays'].items():
  assert {k:v for k,v in a.items()if k!='data'}==q['arrayManifest'][key] and (key in widths or key=='indices' or key.startswith('slice'))
  expected=widths[key]*c['vertices']if key in widths else c['indices']if key=='indices'else c['slices'];assert a['count']==expected
  assert type(a['littleEndian'])is bool and a['encoding']=='base64-exact-active-typed-array-words'
  data=base64.b64decode(a['data'],validate=True);size={'Float32Array':4,'Uint32Array':4,'Int32Array':4,'Uint8Array':1}[a['dtype']];assert len(data)==a['byteLength']==a['count']*size;total+=len(data)
  if key in('positions','normals'):assert a['dtype']=='Float32Array' and all(math.isfinite(x[0])for x in struct.iter_unpack(('<'if a['littleEndian']else'>')+'f',data))
  if key=='indices':assert a['dtype']=='Uint32Array' and all(x[0]<c['vertices']for x in struct.iter_unpack(('<'if a['littleEndian']else'>')+'I',data))
 assert total==f['rawBytes']==q['rawBytes']<=4194304
 r=f['rawFrontPacket'];assert r['dtype']=='Float32Array' and r['stride']==9 and r['count']==9*r['recordCount'] and len(base64.b64decode(r['data'],validate=True))==r['byteLength']==4*r['count']
def validate_native(n,out,sealsha):
 assert n['schema']=='c-formation-autopilot-native/v1' and n['complete'] is True and n['firstFailure'] is None and n['ownedBrowserClose'] is True and n['sealSha256']==sealsha
 assert n['applicationBuildRequest']['url']=='/build.json' and n['applicationBuildRequest']['cache']=='no-store' and n['applicationBuildRequest']['ok'] is True and n['applicationBuildRequest']['build']=='tube-c-formation-20261005'
 assert n['applicationBuildRequest']['json']['build']=='tube-c-formation-20261005' and n['applicationBuildRequest']['checkedBeforeHarnessStepping'] is True
 assert n['policy']['comparison']=='Distinct unmatched normal UI seed gameplay observation; not a paired causal comparison'
 e=n['initial']['menuEvidence'];assert e['actualDomStartup'] and e['normalSpawnPreserved'] and e['rideObserved'] and e['popupNotForced'] and e['normalHudPaused'] and e['activeLabDisabled']
 assert e['selectedChoices']==['Padang Padang','Big','Mid','Calm','Midday'] and n['initial']['ordinaryFirstSession'] is True and n['initial']['diagnosticStartCalled'] is False
 config=n['initial']['config'];assert config['seed']==n['normalMenuSeed'] and type(config['seed'])is int and 1<=config['seed']<=9999
 assert all(config[k]==v for k,v in {'spot':'padang','significantHeight':3.8,'peakPeriod':18,'directionDegrees':0,'tide':0,'windSpeed':0,'stage':2}.items())
 assert n['policy']['noPlacement'] and n['policy']['noRetry'] and n['policy']['noPilotGoOrReset'] and n['policy']['noOverlay']
 initial=n['initialBody'];body(initial['board'],8);body(initial['rider'],33);assert initial['ride']['phase']=='prone'
 rows=n['steps'];assert 1<=len(rows)==n['stepCount']<=7200 and [r['step']for r in rows]==list(range(1,len(rows)+1))
 first_standing=None;first_push=None
 for r in rows:
  assert len(json.dumps(r,separators=(',',':'),ensure_ascii=False).encode())<=3440
  body(r['board'],8);body(r['rider'],33);i=r['input'];assert set(i)=={'paddle','popUp','steer'} and type(i['paddle'])is bool and type(i['popUp'])is bool and math.isfinite(i['steer']) and abs(i['steer'])<=1
  assert abs(r['seaTime']-initial['seaTime']-r['step']/60)<1e-6 and abs(r['physicalSeconds']-r['step']/60)<1e-9
  assert 'contactDiagnostics'not in r['ride'] and 'ride'not in r['inputView'] and set(r['camera'])=={'position','quaternion'}
  assert all(math.isfinite(x)for x in r['camera']['position']+r['camera']['quaternion'])
  if r['ride']['phase']=='standing'and first_standing is None:first_standing=r['step']
  if r['ride']['phase']=='push'and first_push is None:first_push=r['step']
  stopped=r['ride']['phase']in('fallen','recover')or r['ride']['separation']or r['ride']['resets']>initial['ride']['resets']or r['pilot']['state']=='done'
  assert not stopped or r['step']==len(rows),'No retry after first production stop'
 stop=n['stop'];assert stop['step']==len(rows) and stop['kind']in('automatic-production-reset','production-pilot-done','first-fall-or-separation','finite7200-step-ceiling')
 if stop['kind']=='finite7200-step-ceiling':assert len(rows)==7200
 else:assert stopped
 assert n['firstStanding'] is None if first_standing is None else n['firstStanding']['step']==first_standing
 assert n['firstPopUp'] is None if first_push is None else n['firstPopUp']['step']==first_push
 lines=[json.loads(line)for line in(out/'steps.ndjson').read_text().splitlines()];assert lines==rows and(out/'steps.ndjson').stat().st_size<=25165824 and(out/'report.json').stat().st_size<=33554432
 assert not n['browserErrors'] and 1<=n['pngCount']==len(n['checkpoints'])<=6 and n['pngBytes']<=50331648
 labels={label for q in n['checkpoints']for label in q['labels']};assert {'initial','terminal'}<=labels and labels<={'initial','first-pop-up','first-standing','first-entry','formed-mouth','terminal'}
 if first_standing is not None:assert 'first-standing'in labels
 if first_push is not None:assert 'first-pop-up'in labels
 for q in n['checkpoints']:
  assert 0<=q['step']<=len(rows) and q['row']==(initial if q['step']==0 else rows[q['step']-1])
  assert len(json.dumps(q['fullEventRide'],separators=(',',':'),ensure_ascii=False).encode())<=262144 and len(json.dumps(q,separators=(',',':'),ensure_ascii=False).encode())<=524288
  if q.get('geometryOnly'):
   assert q['label']=='formed-mouth' and q['riderPassageClaim'] is False and q['nonmutation']['checked'] and q['nonmutation']['unchanged'] and q['nonmutation']['normalRenderRestored'] and q['nonmutation']['checkedLoftArrays']==37
  else:
   validate_camera(q['cameraFollower']);assert q['cameraFollower']['position']==q['camera']['position'] and q['cameraFollower']['quaternion']==q['camera']['quaternion'] and q['nonmutation']['snapshotUnchanged'] and q['nonmutation']['rowUnchanged']
  if q.get('loftSnapshot'):assert q['loftSnapshot']['label']in q['labels'] and q['loftSnapshot']['epoch']['step']==q['step']
 pngs=[];movies=[];assert len({q['file']for q in n['artifacts']})==len(n['artifacts'])
 for q in n['artifacts']:
  assert Path(q['file']).name==q['file'];b=pin({'file':str(out/q['file']),'bytes':q['bytes'],'sha256':q['sha256']})
  if q['file'].endswith('.png'):
   assert b[:8]==bytes([137,80,78,71,13,10,26,10]) and len(b)<=12582912;pngs.append(q)
  if q['file'].endswith('.webm'):
   assert b[:4]==bytes([0x1a,0x45,0xdf,0xa3]) and len(b)<=16777216;movies.append(q)
 assert len(pngs)==n['pngCount'] and sum(q['bytes']for q in pngs)==n['pngBytes']<=50331648 and len(movies)<=1
 assert {q['file']for q in pngs}=={q['file']for q in n['checkpoints']}
 assert len(n['loftSnapshots'])<=4 and sum(q['bytes']for q in n['loftSnapshots'])==n['snapshotBytes']<=25165824
 for q in n['loftSnapshots']:sidecar(q,out)
 assert n['entry']['fullBodyPassageClaim'] is False and n['mouth']['geometryOnly'] is True and n['mouth']['riderPassageClaim'] is False
 if first_standing is None:assert n['video'] is None and not n['videoRequests'] and not movies and n['videoAbsentReason']
 else:
  t=n['videoTrigger'];v=n['video'];requests=n['videoRequests'];assert t['step']==first_standing and t['phase']=='standing'and v['tracksStopped'] and 1<=len(requests)==v['requestCount']<=401
  assert 0<=v['physicsAdvances']<=1200 and v['startStep']==first_standing and v['endStep']==first_standing+v['physicsAdvances'] and v['bytes']<=16777216
  assert requests[0]['step']==first_standing and requests[0]['requestedBeforeRecorderStartEvent'] is True
  assert [q['step']for q in requests]==list(range(first_standing,requests[-1]['step']+1,3)) and requests[-1]['step']<=first_standing+1200
  assert all(abs(q['seaTime']-rows[q['step']-1]['seaTime'])<1e-9 for q in requests)
  assert(v['complete'] is True and v['partial'] is False)or(v['complete'] is False and v['partial'] is True and v['error'])
  if v['bytes']:
   assert v['file']=='standing-motion.webm' and len(movies)==1 and movies[0]=={'file':v['file'],'bytes':v['bytes'],'sha256':v['sha256']}
  else:assert not movies and 'file'not in v
 return True
def protected_match(a,b):return a==b=={'4310':True,'4311':True,'4312':False,'4313':False}
def tcp(port):
 sock=socket.socket();sock.settimeout(.25)
 try:sock.connect(('127.0.0.1',port));return False
 except ConnectionRefusedError:return True
 except OSError:return None
 finally:sock.close()
def members(group):
 r=subprocess.run(['ps','-axo','pid=,pgid=,stat='],capture_output=True,text=True,check=True,timeout=.5)
 return[int(p[0])for line in r.stdout.splitlines()if len(p:=line.split())==3 and int(p[1])==group and not p[2].startswith('Z')]
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--run',action='store_true');parser.add_argument('--check-seal',action='store_true');parser.add_argument('--arm',choices=['candidate'],required=True);args=parser.parse_args()
 if not args.run and not args.check_seal:
  print(json.dumps({'sourceOnly':True,'resourcesStarted':False,'portsProbed':False,'sealRequired':str(W/'seal.json'),'limits':LIMITS}));return 0
 try:s,a,DIST,sealsha=sealed(args.arm)
 except(AssertionError,KeyError,FileNotFoundError,json.JSONDecodeError)as e:print(json.dumps({'resourcesStarted':False,'portsProbed':False,'sealFailure':str(e)}));return 2
 if args.check_seal:print(json.dumps({'sealValid':True,'resourcesStarted':False,'portsProbed':False,'sealSha256':sealsha}));return 0
 start=time.monotonic();out=W/'candidate-first';owner=W/'candidate-first-owner.json';log=W/'candidate-first-owner.log';launcher=W/'candidate-first-launcher.json'
 assert not any(p.exists()for p in(out,owner,log,launcher)),'First-only invocation; preserve failure, no overwrite/retry'
 report={'schema':'c-formation-autopilot-finite-owner/v1','complete':False,'firstFailure':None,'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sealSha256':sealsha,'limits':LIMITS,'dist':str(DIST),'served':{},'logBytes':0,'nativeGroup':None,'gameplayAcceptance':False,'tubePassageAcceptance':False}
 lock=threading.Lock();server=None;proc=None;sel=selectors.DefaultSelector()
 def save():
  with lock:b=json.dumps(report,separators=(',',':')).encode()
  assert len(b)<=131072;owner.write_bytes(b)
 def append(b):
  with lock:
   assert report['logBytes']+len(b)<=1048576
   with log.open('ab')as f:f.write(b)
   report['logBytes']+=len(b)
 assets={str(Path(q['file']).resolve()):q for q in a['assetPins']};diagnostic=s['diagnosticModule']
 class Handler(SimpleHTTPRequestHandler):
  def __init__(self,*args,**kw):super().__init__(*args,directory=str(DIST),**kw)
  def log_message(self,fmt,*args):append((fmt%args+'\n').encode())
  def do_HEAD(self):self.send_error(405,'GET only')
  def do_GET(self):
   if self.path.split('?')[0]=='/diagnostic-autopilot.mjs':
    b=pin(diagnostic);assert len(b)<=2097152;name='diagnostic-autopilot.mjs';mime='text/javascript'
   else:
    f=Path(self.translate_path(self.path)).resolve()
    if f.is_dir():f=f/'index.html'
    if not f.is_relative_to(DIST)or not f.is_file()or str(f)not in assets:self.send_error(404);return
    b=pin(assets[str(f)]);assert len(b)<=16777216;name=str(f.relative_to(DIST));mime=self.guess_type(str(f))
   with lock:report['served'][name]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
   self.send_response(200);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(b)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(b)
 try:
  report['ownedPortsInitiallyClosed']={str(p):tcp(p)for p in PORTS};assert all(v is True for v in report['ownedPortsInitiallyClosed'].values())
  report['protectedStatesInitially']={str(p):tcp(p)for p in USERS};assert protected_match(report['protectedStatesInitially'],report['protectedStatesInitially'])
  server=ThreadingHTTPServer(('127.0.0.1',4301),Handler);server.daemon_threads=True;threading.Thread(target=server.serve_forever,daemon=True).start()
  command=[s['environment']['node']['file'],str(W/'native.mjs'),'--run=true','--arm=candidate','--url=http://127.0.0.1:4301/?diagnostics','--out='+str(out)]
  env={**os.environ,'CHROME':s['environment']['chrome']['file'],'PRODUCTION_OWNER_SEAL_SHA':sealsha,'FULL_WRITER_FPS_LAUNCHER_REPORT':str(launcher)};report['command']=command
  proc=subprocess.Popen(command,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True,env=env);report['nativeGroup']=proc.pid;save();sel.register(proc.stdout,selectors.EVENT_READ)
  while proc.poll()is None:
   if time.monotonic()-start>=1788:raise TimeoutError('1788s command deadline; no retries')
   for key,_ in sel.select(.1):
    b=os.read(key.fileobj.fileno(),65536)
    if b:append(b)
    else:sel.unregister(key.fileobj)
  for key,_ in sel.select(0):
   while b:=os.read(key.fileobj.fileno(),65536):append(b)
  report['exitCode']=proc.returncode;assert proc.returncode==0,'Native first invocation failed'
  assert validate_native(json.loads((out/'report.json').read_text()),out,sealsha)
  served=report['served'];assert 'index.html'in served and 'build.json'in served and 'diagnostic-autopilot.mjs'in served
  for name,q in served.items():
   expected=diagnostic if name=='diagnostic-autopilot.mjs'else assets[str(DIST/name)];assert q=={k:expected[k]for k in('bytes','sha256')}
  for prefix in('WorkerSurfZone-','surfZoneWorker-'):assert any(Path(name).name.startswith(prefix)for name in served)
  launchbytes=launcher.read_bytes();assert len(launchbytes)<=131072
  report['launcher']={'file':str(launcher),'bytes':len(launchbytes),'sha256':hashlib.sha256(launchbytes).hexdigest()}
  sealed(args.arm);report['sourceBuildHelpersPostUnchanged']=True;report['complete']=True
 except BaseException as e:report['firstFailure']=str(e);report['complete']=False
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
  report['closedPorts']={str(p):tcp(p)for p in PORTS};report['protectedStatesFinally']={str(p):tcp(p)for p in USERS};report['cleanupElapsedSeconds']=time.monotonic()-cleanup;report['elapsedSeconds']=time.monotonic()-start
  report['independentClosureValid']=not report.get('remainingOwnedPids')and all(v is True for v in report['closedPorts'].values());report['protectedPortsPreserved']=protected_match(report.get('protectedStatesInitially',{}),report['protectedStatesFinally'])
  if not(report['independentClosureValid']and report['protectedPortsPreserved']and report['cleanupElapsedSeconds']<=7 and report['elapsedSeconds']<=1800):report['complete']=False
  save();sel.close()
 print(json.dumps({'complete':report['complete'],'firstFailure':report['firstFailure'],'owner':str(owner),'resourcesClosed':report['independentClosureValid']}));return 0 if report['complete']else 1
if __name__=='__main__':raise SystemExit(main())
