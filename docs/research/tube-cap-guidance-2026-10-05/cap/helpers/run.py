"""Root-only finite owner. Source preparation alone does not start this script."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import base64,hashlib,json,os,signal,socket,struct,subprocess,threading,time

W=Path('/private/tmp/tube-cap-refinement-native-20261005')
PROTECTED=(4312,4313,4314,4315)
OWNED=(4301,9711)
def verify(spec):
 b=Path(spec['file']).read_bytes();assert len(b)==spec['bytes'] and hashlib.sha256(b).hexdigest()==spec['sha256'],spec['file'];return b
def free(port):
 s=socket.socket();s.settimeout(.15)
 try:s.connect(('127.0.0.1',port));return False
 except ConnectionRefusedError:return True
 except (TimeoutError,OSError):return False
 finally:s.close()
def identities():
 pids={}
 for port in PROTECTED:
  raw=subprocess.run(['/usr/sbin/lsof','-nP','-a','-iTCP:'+str(port),'-sTCP:LISTEN','-Fp'],text=True,capture_output=True,timeout=.35)
  assert raw.returncode==0,'Protected listener absent '+str(port)
  ids=sorted({int(row[1:])for row in raw.stdout.splitlines()if row.startswith('p')});assert ids
  pids[str(port)]=ids
 allids=sorted({pid for ids in pids.values()for pid in ids})
 raw=subprocess.check_output(['/bin/ps','-p',','.join(map(str,allids)),'-o','pid=,lstart=,comm='],text=True,timeout=.35)
 rows={int(row.split()[0]):row.strip()for row in raw.splitlines()if row.strip()}
 assert set(rows)==set(allids)
 return {port:[rows[pid]for pid in ids]for port,ids in pids.items()}
def group_members(pgid):
 raw=subprocess.check_output(['/bin/ps','-axo','pid=,pgid=,stat='],text=True,timeout=.35)
 return [int(words[0])for row in raw.splitlines()if len(words:=row.split())==3 and int(words[1])==pgid and not words[2].startswith('Z')]
def array_bytes(array):
 widths={'Float32Array':4,'Uint32Array':4,'Int32Array':4,'Uint8Array':1}
 assert array['encoding']=='base64-exact-active-typed-array-words' and array['dtype']in widths
 assert isinstance(array['count'],int) and array['count']>=0 and array['byteLength']==array['count']*widths[array['dtype']]
 raw=base64.b64decode(array['data'],validate=True);assert len(raw)==array['byteLength'];return raw
def validate_result(result):
 assert result['schema']=='cap-refinement-capture-native/v1' and result['complete'] and result['firstFailure']is None and result['ownedBrowserClose']
 assert not result['browserErrors'] and 0<=result['stepCount']<=360 and result['stepCount']==len(result['steps'])==result['stop']['step']
 assert result['policy']['geometryOnly'] and not result['policy']['priorGeometryEpochOrSelectorEqualityClaim']
 assert result['applicationBuildRequest']['build']=='tube-cap-refinement-20261005' and result['applicationBuildRequest']['checkedBeforeReplayAndStepping']
 assert result['replayStartup']['publicReplayStart'] and result['replayStartup']['publicStartCalls']==1 and result['replayStartup']['noActorPlacementOrPrivateMutation']
 inspection=result['inspection'];guard=inspection['nonmutation']
 assert guard['checked'] and guard['unchanged'] and guard['normalRenderRestored'] and guard['checkedLoftArrays']==37 and guard['checkedBoardWords']==8 and guard['checkedRiderWords']==33
 out=W/'candidate-first'
 assert (out/'report.json').stat().st_size<=33554432
 sidecar=result['sidecar'];snap=json.loads(verify({**sidecar,'file':str(out/sidecar['file'])}))
 assert sidecar['bytes']<=6291456 and snap['available'] and snap['arrayIdentitiesAndWordsUnchanged'] and len(snap['arrays'])==37
 assert snap['counts']['vertices']==134*snap['counts']['slices'] and 0<=snap['counts']['slices']<=300 and snap['counts']['indices']<=240000
 assert snap['epoch']['step']==result['stepCount'] and snap['epoch']['seaTime']==result['normal']['seaTime']==result['stop']['seaTime']
 rawtotal=sum(len(array_bytes(a))for a in snap['arrays'].values());assert rawtotal==snap['rawBytes']<=4194304
 front=snap['rawFrontPacket'];assert front['dtype']=='Float32Array' and front['stride']==9 and front['count']==9*front['recordCount'] and front['recordCount']<=2048
 array_bytes(front);assert guard['checkedRawFrontWords']==front['count']
 assert all(snap['nonmutation'].values())
 pngs=[]
 for artifact in result['artifacts']:
  assert Path(artifact['file']).name==artifact['file']
  raw=verify({**artifact,'file':str(out/artifact['file'])})
  if artifact['file'].endswith('.png'):
   assert raw.startswith(b'\x89PNG\r\n\x1a\n') and len(raw)<=12582912;pngs.append(artifact)
 assert len(pngs)==result['pngCount']<=4 and sum(a['bytes']for a in pngs)==result['pngBytes']<=50331648
 expected={'report.json','steps.ndjson','loft-terminal.json','normal.png'}
 if inspection['available']:
  expected.update(('mature-core.png','mature-region.png','side-mouth.png'))
  assert len(pngs)==4 and result['fixedInteriorReferenceComparison']['poseAndProjectionExact']
  assert inspection['primaryView']=='fixed-prior-side-mouth' and inspection['secondaryView']=='fixed-prior-interior' and not inspection['bodyClearanceCertification']
  selector=inspection['selector'];assert selector['minimumMouthClearance']==1.20 and not selector['bodyClearanceCertification']
  positions=snap['arrays']['positions'];assert positions['dtype']=='Float32Array'
  position_words=array_bytes(positions);endian='<'if positions['littleEndian']else '>'
  gaps=[]
  for row in (selector['row'],selector['inwardRow']):
   assert 0<=row<snap['counts']['slices']
   cap=struct.unpack_from(endian+'fff',position_words,12*(134*row+3+64))
   floor=struct.unpack_from(endian+'fff',position_words,12*(134*row+3+104))
   assert cap[0]==floor[0] and cap[2]==floor[2] and cap[1]-floor[1]>=1.20
   gaps.append(cap[1]-floor[1])
  assert gaps==[selector['mouth']['clearance'],selector['inwardMouth']['clearance']]
  side=inspection['sideMouth']['cameraDerivation']
  assert side['primaryInspection'] and not side['fullBodyContainmentCertification'] and side['priorPoseExact'] and not side['derivedFromCurrentCapOrFloor']
  prior_body=json.loads(verify(next(spec for spec in seal['referencePins']if spec['file']=='/private/tmp/tube-open-mouth-body-clearance-native-20261005/candidate-first/report.json')))
  prior_side=prior_body['inspection']['sideMouth']['cameraDerivation']
  assert all(side[key]==prior_side[key]for key in('eye','target','quaternion','inheritedUp','projection','fov','aspect','near','far','zoom'))
  assert result['fixedSideReferenceComparison']['poseAndProjectionExact'] and not result['fixedSideReferenceComparison']['derivedFromCurrentCapOrFloor']
  assert not any(result['fixedSideReferenceComparison'][key]for key in('geometryEqualityAsserted','epochEqualityAsserted','selectorEqualityAsserted','currentPairFitsFixedCameraPoseClaim'))
  assert not any(result['fixedInteriorReferenceComparison'][key]for key in('geometryEqualityAsserted','epochEqualityAsserted','selectorEqualityAsserted'))
  for viewguard in (inspection['interiorNonmutation'],inspection['sideMouth']['nonmutation']):
   assert viewguard['checked'] and viewguard['unchanged'] and viewguard['normalRenderRestored'] and viewguard['checkedLoftArrays']==37 and viewguard['checkedRawFrontWords']==front['count']
  assert inspection['region']['sameCanonicalCamera'] and inspection['region']['originalViewRestored'] and inspection['pairedCloneCameraWordsCompared']
  assert inspection['sideMouth']['cloneCameraWordsCompared'] and not inspection['sideMouth']['exposedRunEndMouthAcceptance'] and not inspection['sideMouth']['visualAcceptance'] and not inspection['sideMouth']['passageClaim']
 else:assert len(pngs)==1 and (inspection.get('geometryFailure')or result['stepCount']==360 and not inspection['eligibleAttempted'])
 assert {p.name for p in out.iterdir()}==expected,'Unexpected capture output'
 assert (out/'steps.ndjson').stat().st_size==result['traceBytes']<=25165824
 return {'inspectionAvailable':inspection['available'],'stepCount':result['stepCount'],'pngCount':len(pngs),'pngBytes':result['pngBytes'],'currentFull37AndRawFrontEncodingVerified':True,
  'perViewPublicGuardsVerified':inspection['available'],'bothRowSampledMouthGapsAtLeast1p20Verified':inspection['available'],'exactPriorSideCameraPoseAndProjectionVerified':inspection['available'],'geometryQualityOrExposedRunEndAcceptance':False}

sealbytes=(W/'seal.json').read_bytes();seal=json.loads(sealbytes)
assert seal['schema']=='cap-refinement-capture/v1' and seal['rootAuthorized'] and seal['complete']
build=json.loads(verify(seal['approvedApplicationBuild']))
assert build['schema']=='cap-refinement-build/v1' and build['build']=='tube-cap-refinement-20261005'
def check():
 for spec in build['assets']+build['sources']+build['liveSources']+seal['helpers']+seal['borrowedHelpers']+seal['referencePins']+[seal['diagnosticModule'],seal['approvedDiagnosticBuild'],seal['sourceFreeze']]:verify(spec)
check();assert not (W/'owner.json').exists() and not (W/'candidate-first').exists() and all(free(port)for port in OWNED)
before=identities();assert any(int(row.split()[0])==87796 for row in before['4315']),'Protected preview4315 PID87796 required';started=time.monotonic();server=None;server_thread=None;proc=None
record={'schema':'cap-refinement-owner/v1','complete':False,'firstFailure':None,'protectedBefore':before,'build':seal['approvedApplicationBuild'],'sourceFreeze':seal['sourceFreeze'],'sealSha256':hashlib.sha256(sealbytes).hexdigest(),'cleanupFailures':[],
 'protected4315ExpectedPid':87796,'protected4315RootToolSession':'64713','toolSessionOSIdentityClaim':False,
 'preExecutionPinsVerified':True,'postExecutionPinsVerified':False,'copiedAndLiveSourcePinsPostVerified':False,
 'limits':seal['limits'],'scope':'Independent bytes, bounds, original-state restoration and resources. No geometry, visual-quality or exposed run-end acceptance.'}
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(W/'dist'),**kw)
 def log_message(self,*a):pass
 def do_GET(self):
  if self.path.split('?')[0]=='/diagnostic-autopilot.mjs':
   raw=verify(seal['diagnosticModule']);self.send_response(200);self.send_header('Content-Type','text/javascript');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
  else:super().do_GET()
try:
 server=ThreadingHTTPServer(('127.0.0.1',4301),Handler);server.daemon_threads=True
 server_thread=threading.Thread(target=lambda:server.serve_forever(poll_interval=.1),daemon=True);server_thread.start()
 env={**os.environ,'CAP_REFINEMENT_OWNER_SEAL_SHA':record['sealSha256'],'FULL_WRITER_FPS_LAUNCHER_REPORT':str(W/'launcher.json')}
 with (W/'native.log').open('wb')as log:
  proc=subprocess.Popen(['/opt/homebrew/bin/node',str(W/'native.mjs'),'--run=true','--arm=candidate','--url=http://127.0.0.1:4301/?diagnostics','--out='+str(W/'candidate-first')],stdout=log,stderr=subprocess.STDOUT,start_new_session=True,env=env)
  record['pid']=proc.pid;record['ownedProcessGroup']=proc.pid
  (W/'live.json').write_text(json.dumps(record))
  while proc.poll()is None:
   if time.monotonic()-started>648:raise TimeoutError('Native deadline reached')
   time.sleep(.2)
  record['exitCode']=proc.returncode;assert proc.returncode==0,'Native terminal exit '+str(proc.returncode)
 result=json.loads((W/'candidate-first/report.json').read_text())
 record['observation']=validate_result(result)
 check();record['postExecutionPinsVerified']=True;record['copiedAndLiveSourcePinsPostVerified']=True;record['complete']=True
except BaseException as error:record['firstFailure']=type(error).__name__+': '+str(error);record['complete']=False
finally:
 cleanup_started=time.monotonic()
 # Each cleanup stage is independent and bounded; only the fresh owned PGID is signalled.
 if proc:
  try:
   protected={int(row.split()[0])for group in before.values()for row in group}
   owned=group_members(proc.pid);assert not protected.intersection(owned),'Owned group intersects protected listener PIDs'
   record['ownedMembersBeforeCleanup']=owned
   if owned:
    os.killpg(proc.pid,signal.SIGTERM)
    end=time.monotonic()+1.5
    while time.monotonic()<end and group_members(proc.pid):time.sleep(.05)
    owned=group_members(proc.pid)
    if owned:os.killpg(proc.pid,signal.SIGKILL)
    end=time.monotonic()+.5
    while time.monotonic()<end and group_members(proc.pid):time.sleep(.05)
   record['ownedMembersAfterCleanup']=group_members(proc.pid)
   assert not record['ownedMembersAfterCleanup'],'Owned native/browser group remains'
   proc.wait(timeout=.35)
  except BaseException as error:record['cleanupFailures'].append('owned-group: '+type(error).__name__+': '+str(error))
 if server:
  try:
   stopper=threading.Thread(target=server.shutdown,daemon=True);stopper.start();stopper.join(timeout=.35)
   server.server_close();assert not stopper.is_alive(),'Server shutdown deadline'
  except BaseException as error:record['cleanupFailures'].append('server: '+type(error).__name__+': '+str(error))
 try:
  record['protectedAfter']=identities();record['protectedPreserved']=before==record['protectedAfter']
 except BaseException as error:
  record['protectedPreserved']=False;record['cleanupFailures'].append('protected: '+type(error).__name__+': '+str(error))
 try:record['closedPorts']={str(port):free(port)for port in OWNED}
 except BaseException as error:
  record['closedPorts']={str(port):False for port in OWNED};record['cleanupFailures'].append('ports: '+type(error).__name__+': '+str(error))
 record['cleanupElapsedSeconds']=time.monotonic()-cleanup_started;record['elapsedSeconds']=time.monotonic()-started
 record['complete']=record['complete']and not record['cleanupFailures']and record['protectedPreserved']and all(record['closedPorts'].values())and record['cleanupElapsedSeconds']<=7 and record['elapsedSeconds']<=660
 (W/'owner.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record));raise SystemExit(0 if record['complete']else 1)
