#!/usr/bin/env python3
"""Finite root-armed owner. No source-only path opens/probes a port or launches Chrome."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import argparse,datetime,hashlib,json,os,selectors,signal,socket,subprocess,threading,time,shutil
WORK=Path('/private/tmp/tube-bounded-c-parallel-physics-mouth-native-20261004');PORTS=(4299,9709);USERS=(4310,4311,4312)
CANDIDATE_DIST=WORK/'candidate-complete-dist';BUILD_MANIFEST=WORK/'root-complete-build-result.json'
def pin(p):
 file=Path(p['file']);assert file.is_file(),'Missing sealed file '+str(file)
 b=file.read_bytes();assert len(b)==p['bytes'] and hashlib.sha256(b).hexdigest()==p['sha256'],'Sealed file changed '+str(file)
 return b
def verify_complete_build(build,dist):
 assert build['schema']=='bounded-C-parallel-physics-root-complete-build/v1' and build['terminal'] is True and build['exitCode']==0
 assert build['source']=='/private/tmp/tube-bounded-c-parallel-physics-20261004/source' and build['sourceUnchangedAfterBuild'] is True and len(build['sourcePins'])==579
 assert build['frozenDist']==str(dist) and build['assetPins']==build['frozenAssetPins'] and len(build['assetPins'])==49
 assert len({p['file'] for p in build['assetPins']})==49 and len({p['file'] for p in build['sourcePins']})==len(build['sourcePins'])
 partial=json.loads(pin(build['rootPartialBuildResult']));pin(build['rootOriginalBuildResult'])
 assert build['rootPartialBuildResult']['file']==str(CANDIDATE_DIST.parent/'root-build-result.json') and partial['terminal'] is True and partial['exitCode']==0
 assert partial['sourcePins']==build['sourcePins'] and partial['buildId']==build['buildId'] and len(partial['frozenAssetPins'])==21
 for p in partial['frozenAssetPins']:pin(p)
 prior=json.loads(pin(build['priorStaticAssetsSeal']));assert prior['schema']=='bounded-C-root-seal/v1' and prior['complete'] is True
 assert build['priorStaticAssetsSeal']['file']=='/private/tmp/tube-bounded-c-native-20261004/seal.json'
 old={p['file']:p for p in prior['arms']['candidate']['assetPins']};assets={str(Path(p['file']).relative_to(dist)):p for p in build['assetPins']}
 comp=build['staticComposition'];assert (comp['newBuildAssets'],comp['additionalStaticAssets'],comp['identicalOverlap'])==(21,28,2)
 assert comp['sourceRuntimeCodeChanged'] is False and comp['rebuildPerformed'] is False and comp['partialBuildPreserved'] is True
 assert len(build['builtAssetPins'])==21 and len(comp['references'])==28 and len(comp['overlap'])==2
 built=set()
 for p in build['builtAssetPins']:
  pin(p);relative=str(Path(p['file']).relative_to(Path(build['builtDist'])));q=assets[relative];pin(q)
  assert (p['bytes'],p['sha256'])==(q['bytes'],q['sha256']);built.add(relative)
 additional=set()
 for r in comp['references']+comp['overlap']:
  p=r['source'];q=r.get('frozenCopy',r.get('sameBuiltAsset'));pin(p);pin(q)
  assert p==old[p['file']] and q==assets[r['relative']] and (p['bytes'],p['sha256'])==(q['bytes'],q['sha256'])
  if 'frozenCopy' in r:additional.add(r['relative']);assert r['relative'] not in built
  else:assert r['relative'] in built
 assert len(built)==21 and len(additional)==28 and set(assets)==built|additional
 assert json.loads(pin(assets['build.json']))['build']==build['buildId']
 return True
def sealed(arm):
 f=WORK/'seal.json';assert f.is_file(),'Root source/build/arm seal missing; no resources started'
 body=f.read_bytes();assert len(body)<=1024*1024,'Seal cap';s=json.loads(body);assert s['schema']=='bounded-C-parallel-physics-mouth-root-seal/v1' and s['complete'] is True,'Root seal incomplete'
 prior=json.loads(pin(s['priorAirSeal']));assert prior['schema']=='bounded-C-air-root-seal/v1' and prior['complete'] is True;assert s['priorAirSeal']['file']=='/private/tmp/tube-bounded-c-air-native-20261004/seal.json'
 parent=json.loads(pin(s['priorFullsheetSeal']));assert parent['schema']=='bounded-C-fullsheet-root-seal/v1' and parent['complete'] is True;assert s['priorFullsheetSeal']['file']=='/private/tmp/tube-bounded-c-fullsheet-native-20261004/seal.json'
 a=s['arms'][arm];assert arm=='candidate' and a['rootAuthorized'] is True,'New candidate arm not root authorized';dist=Path(a['dist']).resolve()
 assert dist==CANDIDATE_DIST,'Exact new candidate dist required'
 build=json.loads(pin(a['rootBuildManifest']));assert build['terminal'] is True and build['exitCode']==0 and build['source']=='/private/tmp/tube-bounded-c-parallel-physics-20261004/source' and build['sourcePins']==a['sourcePins'] and build['buildId']==a['buildId'],'Actual terminal new source build pins required'
 assert a['rootBuildManifest']['file']==str(BUILD_MANIFEST)
 verify_complete_build(build,dist);assert build['assetPins']==a['assetPins']
 assert all(Path(p['file']).resolve().is_relative_to(Path(build['source'])) for p in a['sourcePins'])
 assert all(Path(p['file']).resolve().is_relative_to(dist) for p in a['assetPins'])
 assert len(a['sourcePins'])==579 and len(a['assetPins'])==49,'Full source/assets seal required'
 for group in ('sourcePins','assetPins'):
  for receipt in a[group]:pin(receipt)
 assert {Path(p['file']).name for p in s['helperPins']}>= {'run.py','native.mjs','native-owned.mjs','moving-shape.mjs','station-tools.mjs','mouth-tools.mjs','mock-checks.mjs','body-witnesses.mjs','cdp.mjs'},'Complete source helper seal required'
 for receipt in s['helperPins']:pin(receipt)
 pin(a['rootBuildManifest']);return s,a,dist,hashlib.sha256(body).hexdigest()
def validate_lineage_event(event,observation):
 passing=[c for c in event['testedCandidates'] if c['qualified']]
 assert len(passing)==event['qualifiedCount']==1 and passing[0]['front']==observation['currentFront']
 assert all(v is True for v in passing[0]['gates'].values()) and event['materialTrajectoryClaim'] is False
 ids=event['provenOrderedInternalPointIDs']
 assert len(ids)==2 and len(set(ids))==2 and all(type(i) is int and i>=0 for i in ids)
 assert ids==passing[0]['publicPointIdentity']['pointIDs']==observation['initialPublicPointIdentity']['pointIDs']
 return True
def protected_match(before,after):
 expected={str(p) for p in USERS}
 return set(before)==expected and set(after)==expected and all(type(v) is bool for v in before.values()) and all(type(v) is bool for v in after.values()) and before=={'4310':True,'4311':True,'4312':False} and before==after
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
  print(json.dumps({'sourceOnly':True,'resourcesStarted':False,'portsProbed':False,'arm':args.arm,'sealRequired':str(WORK/'seal.json'),'ports':PORTS,'protectedPorts':USERS,'maximumNeutralSteps':300,'maximumMovingSteps':240,'maximumMovieBytes':16*1024*1024,'wholeSeconds':180,'commandSeconds':168,'cleanupSeconds':7}));return 0
 try:s,a,DIST,sealsha=sealed(args.arm)
 except (AssertionError,KeyError,FileNotFoundError,json.JSONDecodeError) as e:print(json.dumps({'resourcesStarted':False,'portsProbed':False,'sealFailure':str(e)}));return 2
 if args.check_seal:print(json.dumps({'sealValid':True,'resourcesStarted':False,'portsProbed':False,'arm':args.arm,'sealSha256':sealsha}));return 0
 start=time.monotonic();out=WORK/(args.arm+'-first');owner=WORK/(args.arm+'-first-owner.json');log=WORK/(args.arm+'-first-owner.log');assert not out.exists() and not owner.exists() and not log.exists(),'First-only arm: preserve unsuccessful invocation, no overwrite/retry'
 report={'schema':'bounded-C-parallel-physics-mouth-finite-owner/v1','arm':args.arm,'complete':False,'firstFailure':None,'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sealSha256':sealsha,'wholeSeconds':180,'commandSeconds':168,'cleanupSeconds':7,'ports':PORTS,'protectedPorts':USERS,'dist':str(DIST),'served':{},'logBytes':0,'nativeGroup':None,'physicalGeometryEqualityClaim':False,'bodyEntryClaim':False}
 lock=threading.Lock();server=None;proc=None;sel=selectors.DefaultSelector()
 def save():
  with lock:b=json.dumps(report,separators=(',',':')).encode()
  assert len(b)<=131072,'Owner report cap';owner.write_bytes(b)
 def append(b):
  with lock:
   assert report['logBytes']+len(b)<=1048576,'Combined log cap'
   with log.open('ab') as f:f.write(b)
   report['logBytes']+=len(b)
 assets={str(Path(p['file']).resolve()):p for p in a['assetPins']}
 class Handler(SimpleHTTPRequestHandler):
  def __init__(self,*args,**kw):super().__init__(*args,directory=str(DIST),**kw)
  def log_message(self,fmt,*args):append((fmt%args+'\n').encode())
  def do_HEAD(self):self.send_error(405,'GET only')
  def do_GET(self):
   f=Path(self.translate_path(self.path)).resolve()
   if f.is_dir():f=f/'index.html'
   if not f.is_relative_to(DIST) or not f.is_file() or str(f) not in assets:self.send_error(404);return
   b=pin(assets[str(f)]);assert len(b)<=16*1024*1024,'Serve cap';name=str(f.relative_to(DIST));receipt={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
   with lock:report['served'][name]=receipt
   self.send_response(200);self.send_header('Content-Type',self.guess_type(str(f)));self.send_header('Content-Length',str(len(b)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(b)
 try:
  assert (DIST/'index.html').is_file(),'Root-built dist missing';report['ownedPortsInitiallyClosed']={str(p):tcp(p) is True for p in PORTS};assert all(report['ownedPortsInitiallyClosed'].values()),'Owned ports occupied'
  report['protectedStatesInitially']={str(p):tcp(p) for p in USERS};assert protected_match(report['protectedStatesInitially'],report['protectedStatesInitially']),'Protected states must be authoritative booleans and4312 must be open';report['protectedPortsInitiallyOpen']={p:v is False for p,v in report['protectedStatesInitially'].items()}
  node=shutil.which('node');assert node,'Node missing';server=ThreadingHTTPServer(('127.0.0.1',4299),Handler);server.daemon_threads=True;threading.Thread(target=server.serve_forever,daemon=True).start()
  command=[node,str(WORK/'native.mjs'),'--run=true','--arm='+args.arm,'--url=http://127.0.0.1:4299/?diagnostics','--out='+str(out)];env={**os.environ,'BOUNDED_C_OWNER_ARM':args.arm,'BOUNDED_C_OWNER_SEAL_SHA':sealsha};report['command']=command
  proc=subprocess.Popen(command,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True,env=env);report['nativeGroup']=proc.pid;save();sel.register(proc.stdout,selectors.EVENT_READ)
  while proc.poll() is None:
   if time.monotonic()-start>=168:raise TimeoutError('168s finite command deadline; no retries')
   for key,_ in sel.select(.1):
    b=os.read(key.fileobj.fileno(),65536)
    if b:append(b)
    else:sel.unregister(key.fileobj)
  for key,_ in sel.select(0):
   while b:=os.read(key.fileobj.fileno(),65536):append(b)
  report['exitCode']=proc.returncode;assert proc.returncode==0,'Native first invocation failed; preserve output'
  native=json.loads((out/'report.json').read_text());assert native['complete'] and native['arm']==args.arm and native['video']['complete'],'Incomplete native capture'
  assert 3<=len(native['checkpoints'])<=4 and {'initial','initial-exterior','terminal'} <= {c['label'] for c in native['checkpoints']} and native['pngBytes']<=48*1024*1024 and native['video']['bytes']<=16*1024*1024 and (out/'report.json').stat().st_size<=32*1024*1024,'Artifact caps'
  requests=native['videoRequests'];assert 2<=len(requests)<=241 and native['video']['requestFrameCount']==len(requests),'Movie requests'
  assert len(native['observations'])==len(requests) and [q['movingStep'] for q in native['observations']]==list(range(len(requests))),'Ordinary moving sequence'
  assert native['stop']['reason'] in ('raw-front-absent','station-outside-raw-range','loft-join-absent','component-lineage-zero','component-lineage-ambiguous','240ordinary-advances')
  if native['stop']['reason']!='240ordinary-advances':
   last=native['observations'][-1];assert last['missing'] and last['stopReason']==native['stop']['reason'] and last['retirementClaim'] is False and len(last['allFrontRowsOnLoss'])==last['counts']['slices']
  for observation in native['observations']:
   assert observation['initialPublicPointIdentity']['qualified'] is True and len(observation['initialPublicPointIdentity']['pointIDs'])==2
   for export in observation['publicExportEvidence']:
    assert all(export[k] is True for k in ('snapshotClockStatusWordsUnchanged','normalActorPoseAndCameraUnchanged','surfaceWordsAndEpochUnchanged','drawGenerationUnchanged','exactLoftWordsUnchanged')) and export['solverArraysDecodedOrRetained'] is False
   ray=observation['rayDiagnostics'];assert ray['rayInvalidIntervals']==0 and (ray['joinedRowPairs']==0 or ray['rayMinAdvance']>0 and ray['rayMaxBlend']==1)
   assert len(observation['rawFrontRecords'])==observation['counts']['front']
   assert observation['locked']==native['selection']['locked'] and isinstance(observation['currentFront'],int)
   if observation['lineageDecision'] and observation['lineageDecision'].get('componentLineageEvent'):
    event=observation['lineageDecision'];assert validate_lineage_event(event,observation) and event['DTEqualityRequired'] is False and event['provenOrderedInternalPointIDs']==observation['initialPublicPointIdentity']['pointIDs']
   assert observation['locked']['stationIdentity']=='fixed-Eulerian-solver-column-crest-station' and observation['retirementClaim'] is False
   epoch=observation['drawEpoch'];assert epoch['drawnWaterTimeMatchesCurrentSnapshot'] and epoch['snapshotIdentityUnchanged'] and epoch['physicsClockUnchanged'] and epoch['supportedOrder']==['water.update','mode.drawBarrel'] and abs(epoch['seaTime']-observation['seaTime'])<1e-7
   if observation['movingStep']>0:assert observation['renderEvidence']['observedRowIndexPositionWordsUnchanged'] and observation['renderEvidence']['drawEpochUnchanged']
   if not observation['missing']:assert observation['rawMappingCorroboration']['usedToLocateLoftRows'] is False and (not observation['openingPresent'] or observation['cameraColumns']['eye']['strictSameFrontAirBandContainsCameraHeight']);assert 'eye' in observation['cameraColumns'] and 'target' in observation['cameraColumns'] and 'firstHit' in observation['cameraOcclusion'] and observation['visibilityProven'] is False
  assert native['detectorMilliseconds']<=20000 and native['selection']['step']<=300 and native['video']['physicsAdvances']<=240,'Bounded neutral/moving/detector budgets'
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
  if not report['independentClosureValid'] or not report['protectedPortsPreserved'] or report['cleanupElapsedSeconds']>7 or report['elapsedSeconds']>180:report['complete']=False
  save();sel.close()
 print(json.dumps({'complete':report['complete'],'firstFailure':report['firstFailure'],'owner':str(owner),'resourcesClosed':report['independentClosureValid']}));return 0 if report['complete'] else 1
if __name__=='__main__':raise SystemExit(main())
