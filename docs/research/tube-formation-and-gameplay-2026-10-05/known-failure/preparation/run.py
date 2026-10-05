#!/usr/bin/env python3
"""Thin finite root-armed owner; the source-only route never probes ports or launches resources."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import argparse,datetime,hashlib,json,os,selectors,signal,socket,subprocess,threading,time,shutil,math,base64,struct,re
from authority import sealed,pin
WORK=Path('/private/tmp/tube-c-formation-native-20261005');PORTS=(4301,9711);USERS=(4310,4311,4312,4313)
CANDIDATE_DIST=WORK/'candidate-complete-dist';BUILD_MANIFEST=WORK/'root-complete-build-result.json'
def validate_camera(e):
 assert e['policy']=='public-authored-follower-mirror/v1' and e['view'] in ('front','behind','side') and e['activeLab'] is False and e['normalHudPause'] is True
 assert e['exactPositionQuaternionMatch'] is True and e['actualDrawnFollowTargetMatch'] is True and e['publishedClockBodyWordsUnchangedByCamera'] is True and e['mirrorUsesOrdinaryHostHeightReads'] is True
 assert type(e['calls']) is int and 1<=e['calls']<=50000 and type(e['positiveDtCalls']) is int and type(e['zeroDtCalls']) is int and e['positiveDtCalls']+e['zeroDtCalls']==e['calls']
 assert len(e['position'])==3 and len(e['quaternion'])==4 and all(math.isfinite(x) for x in e['position']+e['quaternion'])
 return True
def validate_rows(n):
 rows=n['steps'];assert len(rows)==n['stepCount']<=2160 and [r['step'] for r in rows]==list(range(1,len(rows)+1))
 initial=n['initialBody']['seaTime'];popup=None;firstcue=None;previous=None;firstfall=None
 for r in rows:
  validate_camera(r['cameraFollower']);assert r['cameraFollower']['positiveDtCalls']==r['step']
  assert abs(r['seaTime']-initial-r['step']/60)<1e-6 and abs(r['physicalSeconds']-r['step']/60)<1e-9
  v=r['inputView']['ride'];i=r['input'];standing=v['phase']=='standing';prone=v['phase']=='prone'
  assert i['paddle']==prone and i['crouch']==(1 if standing else 0) and i['compress']==(1 if standing else 0) and i['trim']==0 and i['pocketReflex'] is False
  assert math.isfinite(i['steer']) and abs(i['steer'])<=.2+1e-12 and (standing or i['steer']==0)
  if standing:
   if previous is None or previous['inputView']['ride']['phase']!='standing':assert i['steer']==0
   else:assert abs(i['steer']-previous['input']['steer'])<=.4/60+1e-12
  if prone and v['cue'] is True and firstcue is None:firstcue=r['step']
  if i['popUp'] is True:assert prone and v['cue'] is True and popup is None;popup=r['step']
  assert r['popupControl']['issued']==(popup is not None)
  if r['ride']['phase'] in ('fallen','recover') or r['separation'] or r['ride']['resets']>n['initialBody']['ride']['resets']:firstfall=firstfall or r['step']
  previous=r
 assert popup==firstcue and (firstfall is None or firstfall==len(rows))
 assert n['stop']['kind'] in ('first-published-fall-or-separation','maximum-2160-steps')
 if n['stop']['kind']=='maximum-2160-steps':assert len(rows)==2160 and firstfall is None
 else:assert firstfall==len(rows)
 for r in rows:
  for ride in (r['ride'],r['inputView']['ride']):
   cd=ride['contactDiagnostics'];assert cd is not None and cd['mount']>=1 and cd['step']>=0
   if ride['contactDiagnosticRetention']=='full':
    for sample in (cd.get('last'),cd.get('firstLimited'),cd.get('firstNonContact'),(cd.get('loss') or {}).get('sample')):
     if sample is not None:assert all(key in sample and type(sample[key]) in (int,float) and math.isfinite(sample[key]) for key in json.loads((WORK/'observer-fields.json').read_text())['allFields'])
   compact=ride['phase']=='prone' and not ride.get('separation') and cd.get('loss') is None
   assert ride['contactDiagnosticRetention']==('compact-prone-flight-support' if compact else 'full')
 losses=[r for r in rows if r['ride']['contactDiagnostics'].get('loss')]
 if losses:
  r=losses[0];cd=r['ride']['contactDiagnostics'];loss=cd['loss'];s=loss['sample']
  assert r['ride']['contactDiagnosticRetention']=='full' and n['firstContactLoss']['diagnostics']==cd and n['firstContactLoss']['step']==r['step']
  assert all(k in s for k in ('demandX','demandY','demandZ','projectedX','projectedY','projectedZ','appliedX','appliedY','appliedZ','supportXMin','supportXMax','supportZMin','supportZMax','copX','copZ','flightTime','postureError','limit'))
  assert loss['trigger'] in ('flight-time','sway-error','posture-error')
  if loss['trigger']=='flight-time':assert s['flightTime']>cd['maxFlightTime'] and loss['selectedCause']=='lost board' and loss['dominantLimit'] is None
  elif loss['trigger']=='posture-error':
   assert s['flightTime']<=cd['maxFlightTime'] and s['postureError']>cd['recoverableError'] and s['limit']!='none'
   assert loss['selectedCause']=={'flight':'lost board','tip':'balance','slip':'foot slip','impact':'impact'}[loss['dominantLimit']]
  else:assert s['flightTime']<=cd['maxFlightTime'] and loss['selectedCause']=='balance' and loss['dominantLimit'] is None
 else:assert n.get('firstContactLoss') is None
 return True
def validate_native(n,out,sealsha):
 assert n['schema']=='c-formation-native/v1' and n['complete'] is True and n['firstFailure'] is None and n['chromeClosed'] is True and n['sealSha256']==sealsha
 assert n['initial']['menuEvidence']['actualDomStartup'] is True and n['initial']['menuEvidence']['normalSpawnPreserved'] is True and n['initial']['menuEvidence']['rideObserved'] is True and n['initial']['menuEvidence']['selectedChoices']==['Padang Padang','Big','Mid','Calm','Midday']
 assert n['initial']['menuEvidence']['normalHudPaused'] is True and n['initial']['menuEvidence']['activeLabDisabled'] is True
 assert n['knownFailureReplay'] is True and n['normalMenuAcceptance'] is False and n['overrides']=={'seed':6238,'componentCount':64,'dx':2,'fineSpacing':1}
 assert n['replayStartup']['publicReplayStart'] is True and n['replayStartup']['exactInitialReplayClaim'] is False and n['initial']['config']['seed']==6238 and n['replayConfigComparison']['allFieldsCompared'] is True and n['replayConfigComparison']['differences']=={}
 assert n['priorV6Report']['file']=='/private/tmp/tube-pop-up-contact-native-v6-20261005/candidate-first/report.json' and n['replayV6InitialComparison']['descriptiveOnly'] is True and n['replayV6InitialComparison']['priorReport']==n['priorV6Report']
 validate_camera(n['initialBody']['cameraFollower'])
 assert n['initialBody']['ride']['phase']=='prone' and n['schedule']['maxSteps']==2160 and n['schedule']['noPlacements'] is True and n['schedule']['noReset'] is True
 rows=n['steps'];validate_rows(n)
 assert not n['browserErrors'] and 1<=n['pngCount']<=4 and n['pngBytes']<=48*1024*1024
 assert {'initial','terminal'}<=set(label for c in n['checkpoints'] for label in c['labels'])
 labels={label for c in n['checkpoints'] for label in c['labels']}
 assert labels<={'initial','first-pop-up','first-landing','terminal'}
 if any(r['ride']['phase']=='push' for r in rows):assert 'first-pop-up' in labels and n['videoTrigger'] is not None
 if any(r['ride']['phase']=='landing' for r in rows):assert 'first-landing' in labels
 for c in n['checkpoints']:
  validate_camera(c['cameraFollower']);assert c['cameraFollower']['position']==c['camera']['position'] and c['cameraFollower']['quaternion']==c['camera']['quaternion']
 for p in n['artifacts']:pin({'file':str(out/p['file']),'bytes':p['bytes'],'sha256':p['sha256']})
 assert (out/'report.json').stat().st_size<=32*1024*1024 and (out/'steps.ndjson').stat().st_size<=24*1024*1024
 lines=[json.loads(line) for line in (out/'steps.ndjson').read_text().splitlines()];assert lines==rows
 assert len(n['loftSnapshots'])<=4 and n['snapshotBytes']<=24*1024*1024
 total=0
 for q in n['loftSnapshots']:
  assert q['bytes']<=6*1024*1024 and q['file']=='loft-'+q['label']+'.json';b=pin({'file':str(out/q['file']),'bytes':q['bytes'],'sha256':q['sha256']});total+=len(b);f=json.loads(b)
  assert f['schema']=='bounded-C-complete-drawn-loft-words/v1' and f['arrayIdentitiesAndWordsUnchanged'] is True and f['counts']==q['counts'] and f['epoch']==q['epoch'] and all(f['nonmutation'].values()) and f['unusedCapacityIncluded'] is False
  vertex={'positions':3,'normals':3,'mask':1,'lift':1,'sheet':1,'sheetWeight':1,'sheetBack':1,'throat':4};counts=f['counts']
  assert {'positions','normals','indices','sliceFront','sliceJoined','sliceFormed','sliceWeight','slicePhase','sliceOverturned','sliceRayX','sliceRayZ'}<=set(f['arrays'])
  assert all(type(counts[k]) is int and 0<=counts[k]<=limit for k,limit in [('slices',300),('vertices',40200),('indices',240000)]) and counts['indices']%3==0
  rawbytes=0
  assert set(q['arrayManifest'])==set(f['arrays'])
  for key,a in f['arrays'].items():
   assert {k:v for k,v in a.items() if k!='data'}==q['arrayManifest'][key]
   assert key in vertex or key=='indices' or key.startswith('slice')
   expected=vertex[key]*counts['vertices'] if key in vertex else counts['indices'] if key=='indices' else counts['slices'];assert a['count']==expected
   assert type(a['littleEndian']) is bool and a['encoding']=='base64-exact-active-typed-array-words'
   data=base64.b64decode(a['data'],validate=True);size={'Float32Array':4,'Uint32Array':4,'Int32Array':4,'Uint8Array':1}[a['dtype']];assert len(data)==a['byteLength']==a['count']*size;rawbytes+=len(data)
   if key in ('positions','normals'):assert a['dtype']=='Float32Array' and all(math.isfinite(v[0]) for v in struct.iter_unpack(('<' if a['littleEndian'] else '>')+'f',data))
   if key=='indices':assert a['dtype']=='Uint32Array' and all(v[0]<counts['vertices'] for v in struct.iter_unpack(('<' if a['littleEndian'] else '>')+'I',data))
  assert rawbytes==f['rawBytes']==q['rawBytes']<=4*1024*1024
  raw=f['rawFrontPacket'];assert raw['stride']==9 and raw['count']==raw['recordCount']*9 and len(base64.b64decode(raw['data'],validate=True))==raw['byteLength']==raw['count']*4
 assert total==n['snapshotBytes']
 if n['videoTrigger'] is None:assert n['video'] is None and not n['videoRequests']
 else:
  t=n['videoTrigger'];r=rows[t['step']-1];assert r['ride']['phase']=='push' and t['phase']=='push' and t['step']==next(r['step'] for r in rows if r['ride']['phase']=='push')
  video=n['video'];requests=n['videoRequests'];assert video['complete'] is True and video['tracksStopped'] is True and 0<=video['physicsAdvances']<=240 and 1<=len(requests)<=241 and video['requestCount']==len(requests)
  assert video['bytes']<=16*1024*1024 and requests[0]['step']==t['step'] and requests[0]['requestedBeforeRecorderStartEvent'] is True
  assert [q['step'] for q in requests]==list(range(t['step'],video['endStep']+1)) and all(abs(q['seaTime']-rows[q['step']-1]['seaTime'])<1e-9 for q in requests)
 assert n['entry']['fullBodyClearancePass'] is False and n['diagnosticOutput']['fpsClaim'] is False
 return True
def terminal_owner_limits(report):
 return report['independentClosureValid'] is True and report['protectedPortsPreserved'] is True and report['cleanupElapsedSeconds']<=7 and report['elapsedSeconds']<=660
def protected_match(before,after):
 expected={str(p) for p in USERS}
 return set(before)==expected and set(after)==expected and all(type(v) is bool for v in before.values()) and all(type(v) is bool for v in after.values()) and before=={'4310':True,'4311':True,'4312':False,'4313':False} and before==after
def tcp(port):
 sock=socket.socket();sock.settimeout(.25)
 try:sock.connect(('127.0.0.1',port));return False
 except ConnectionRefusedError:return True
 except OSError:return None
 finally:sock.close()
def members(group):
 r=subprocess.run(['ps','-axo','pid=,pgid=,stat='],capture_output=True,text=True,check=True,timeout=.5)
 return [int(p[0]) for line in r.stdout.splitlines() if len(p:=line.split())==3 and int(p[1])==group and not p[2].startswith('Z')]
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--run',action='store_true');parser.add_argument('--check-seal',action='store_true');parser.add_argument('--arm',choices=['candidate'],required=True);args=parser.parse_args()
 if not args.run and not args.check_seal:
  print(json.dumps({'sourceOnly':True,'resourcesStarted':False,'portsProbed':False,'arm':args.arm,'sealRequired':str(WORK/'seal.json'),'ports':PORTS,'protectedPorts':USERS,'maximumOrdinarySteps':2160,'maximumMovingSteps':240,'maximumMovieBytes':16*1024*1024,'maximumLoftSnapshotCount':4,'maximumLoftSnapshotJsonBytesEach':6*1024*1024,'reportBytes':32*1024*1024,'wholeSeconds':660,'commandSeconds':648,'cleanupSeconds':7}));return 0
 try:s,a,DIST,sealsha=sealed(args.arm)
 except (AssertionError,KeyError,FileNotFoundError,json.JSONDecodeError) as e:print(json.dumps({'resourcesStarted':False,'portsProbed':False,'sealFailure':str(e)}));return 2
 if args.check_seal:print(json.dumps({'sealValid':True,'resourcesStarted':False,'portsProbed':False,'arm':args.arm,'sealSha256':sealsha}));return 0
 start=time.monotonic();out=WORK/(args.arm+'-first');owner=WORK/(args.arm+'-first-owner.json');log=WORK/(args.arm+'-first-owner.log');assert not out.exists() and not owner.exists() and not log.exists(),'First-only arm: preserve unsuccessful invocation, no overwrite/retry'
 report={'schema':'c-formation-finite-owner/v1','arm':args.arm,'complete':False,'firstFailure':None,'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sealSha256':sealsha,'wholeSeconds':660,'commandSeconds':648,'cleanupSeconds':7,'ports':PORTS,'protectedPorts':USERS,'dist':str(DIST),'served':{},'logBytes':0,'nativeGroup':None,'physicalGeometryEqualityClaim':False,'bodyEntryClaim':False}
 lock=threading.Lock();server=None;proc=None;sel=selectors.DefaultSelector()
 def save():
  with lock:b=json.dumps(report,separators=(',',':')).encode()
  assert len(b)<=131072,'Owner report cap';owner.write_bytes(b)
 def append(b):
  with lock:
   assert report['logBytes']+len(b)<=1048576,'Combined log cap'
   with log.open('ab') as f:f.write(b)
   report['logBytes']+=len(b)
 assets={str(Path(p['file']).resolve()):p for p in a['assetPins']};diagnostic=s['diagnosticModule']
 class Handler(SimpleHTTPRequestHandler):
  def __init__(self,*args,**kw):super().__init__(*args,directory=str(DIST),**kw)
  def log_message(self,fmt,*args):append((fmt%args+'\n').encode())
  def do_HEAD(self):self.send_error(405,'GET only')
  def do_GET(self):
   if self.path.split('?')[0]=='/diagnostic-autopilot.mjs':
    b=pin(diagnostic);assert len(b)<=2*1024*1024
    with lock:report['served']['diagnostic-autopilot.mjs']={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'separateDiagnosticRoute':True}
    self.send_response(200);self.send_header('Content-Type','text/javascript');self.send_header('Content-Length',str(len(b)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(b);return
   f=Path(self.translate_path(self.path)).resolve()
   if f.is_dir():f=f/'index.html'
   if not f.is_relative_to(DIST) or not f.is_file() or str(f) not in assets:self.send_error(404);return
   b=pin(assets[str(f)]);assert len(b)<=16*1024*1024,'Serve cap';name=str(f.relative_to(DIST));receipt={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
   with lock:report['served'][name]=receipt
   self.send_response(200);self.send_header('Content-Type',self.guess_type(str(f)));self.send_header('Content-Length',str(len(b)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(b)
 try:
  assert (DIST/'index.html').is_file(),'Root-built dist missing';report['ownedPortsInitiallyClosed']={str(p):tcp(p) is True for p in PORTS};assert all(report['ownedPortsInitiallyClosed'].values()),'Owned ports occupied'
  report['protectedStatesInitially']={str(p):tcp(p) for p in USERS};assert protected_match(report['protectedStatesInitially'],report['protectedStatesInitially']),'Protected states must be authoritative booleans and4312 must be open';report['protectedPortsInitiallyOpen']={p:v is False for p,v in report['protectedStatesInitially'].items()}
  node=s['environment']['node']['file'];assert node,'Node missing';server=ThreadingHTTPServer(('127.0.0.1',4301),Handler);server.daemon_threads=True;threading.Thread(target=server.serve_forever,daemon=True).start()
  command=[node,str(WORK/'native.mjs'),'--run=true','--arm='+args.arm,'--url=http://127.0.0.1:4301/?diagnostics','--out='+str(out)];env={**os.environ,'CHROME':s['environment']['chrome']['file'],'BOUNDED_C_OWNER_ARM':args.arm,'BOUNDED_C_OWNER_SEAL_SHA':sealsha};report['command']=command
  proc=subprocess.Popen(command,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True,env=env);report['nativeGroup']=proc.pid;save();sel.register(proc.stdout,selectors.EVENT_READ)
  while proc.poll() is None:
   if time.monotonic()-start>=648:raise TimeoutError('648s finite command deadline; no retries')
   for key,_ in sel.select(.1):
    b=os.read(key.fileobj.fileno(),65536)
    if b:append(b)
    else:sel.unregister(key.fileobj)
  for key,_ in sel.select(0):
   while b:=os.read(key.fileobj.fileno(),65536):append(b)
  report['exitCode']=proc.returncode;assert proc.returncode==0,'Native first invocation failed; preserve output'
  native=json.loads((out/'report.json').read_text());assert validate_native(native,out,sealsha)
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
  report['closedPorts']={str(p):tcp(p) for p in PORTS};report['protectedStatesFinally']={str(p):tcp(p) for p in USERS};report['protectedPortsStillOpen']={p:v is False for p,v in report['protectedStatesFinally'].items()};report['cleanupElapsedSeconds']=time.monotonic()-cleanup;report['elapsedSeconds']=time.monotonic()-start
  report['independentClosureValid']=not report.get('remainingOwnedPids') and all(v is True for v in report['closedPorts'].values());report['protectedPortsPreserved']=protected_match(report.get('protectedStatesInitially',{}),report['protectedStatesFinally'])
  if not terminal_owner_limits(report):report['complete']=False
  save();sel.close()
 print(json.dumps({'complete':report['complete'],'firstFailure':report['firstFailure'],'owner':str(owner),'resourcesClosed':report['independentClosureValid']}));return 0 if report['complete'] else 1
if __name__=='__main__':raise SystemExit(main())
