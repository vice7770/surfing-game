"""Root-only finite owner. This source preparation has not probed or started listeners."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import hashlib,json,os,signal,socket,subprocess,threading,time
W=Path('/private/tmp/tube-shared-leaf-native-20261005');PROTECTED=(4312,4313,4314,4315);OWNED=(4301,9711)
EXPECTED_PROTECTED={4312:92445,4313:58298,4314:51358,4315:87796}
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
  ids=sorted({int(row[1:])for row in raw.stdout.splitlines()if row.startswith('p')});assert ids;pids[str(port)]=ids
 allids=sorted({pid for ids in pids.values()for pid in ids})
 raw=subprocess.check_output(['/bin/ps','-p',','.join(map(str,allids)),'-o','pid=,lstart=,comm='],text=True,timeout=.35)
 rows={int(row.split()[0]):row.strip()for row in raw.splitlines()if row.strip()};assert set(rows)==set(allids)
 return {port:[rows[pid]for pid in ids]for port,ids in pids.items()}
def group_members(pgid):
 raw=subprocess.check_output(['/bin/ps','-axo','pid=,pgid=,stat='],text=True,timeout=.35)
 return [int(words[0])for row in raw.splitlines()if len(words:=row.split())==3 and int(words[1])==pgid and not words[2].startswith('Z')]
def group_identities(pgid):
 raw=subprocess.check_output(['/bin/ps','-axo','pid=,pgid=,stat=,lstart=,command='],text=True,timeout=.35)
 result={}
 for row in raw.splitlines():
  words=row.split(None,8)
  if len(words)==9 and int(words[1])==pgid and not words[2].startswith('Z'):
   pid=int(words[0]);result[pid]={'pid':pid,'pgid':pgid,'started':' '.join(words[3:8]),'command':words[8]}
 return result
def validate_result(result):
 assert result['schema']=='shared-leaf-native/v1' and result['complete'] and result['firstFailure'] is None and result['ownedBrowserClose']
 assert not result['browserErrors'] and result['stepCount']==0 and result['pngCount']==8 and len(result['pairs'])==4
 assert result['applicationBuildRequest']['build']==inputs['applicationBuildId'] and result['applicationBuildRequest']['checkedBeforeReplay']
 assert result['replayStartup']['publicStartCalls']==1 and result['replayStartup']['noPlacement'] and result['replayStartup']['noClockAssignment']
 assert result['restoration']['complete'] and all(result['restoration']['guards'].values())
 assert result['initial']['seaTime']==inputs['referenceEpoch']['seaTime'] and result['initial']['compute']=='gpu' and result['initial']['canvas']==[1708,879]
 assert result['installation']['exactRawFrontWords'] and result['installation']['priorActorAndNormalCameraExact'] and result['installation']['currentMaterialUnmodified']
 assert result['initial']['menu']['selectedChoices']==['Padang Padang','Big','Mid','Calm','Midday']
 out=W/'candidate-first';expected={'report.json','loft-candidate.json','draw-inputs.json'};pngbytes=0
 for declaration,pair in zip(inputs['comparison']['pairs'],result['pairs']):
  assert pair['complete'] and pair['camera']==declaration['camera'] and pair['view']==declaration['view'] and pair['fixedPose']==inputs['fixedCameras'][pair['camera']]
  assert pair['stepCount']==0 and pair['seaTime']==inputs['referenceEpoch']['seaTime'] and pair['baselineRepeatPixelsIdentical'] and all(pair['guards'].values())
  for key in ('baseline','candidate'):
   artifact=pair[key];assert Path(artifact['file']).name==artifact['file'];expected.add(artifact['file'])
   raw=verify({**artifact,'file':str(out/artifact['file'])});assert raw.startswith(b'\x89PNG\r\n\x1a\n') and len(raw)<=inputs['limits']['pngBytesEach'];pngbytes+=len(raw)
 for name,limit in (('sidecar','sidecarBytes'),('drawInputs','drawInputsBytes')):
  artifact=result[name];raw=verify({**artifact,'file':str(out/artifact['file'])});assert len(raw)<=inputs['limits'][limit]
 candidate=json.loads((out/'loft-candidate.json').read_bytes());reference=json.loads(verify(inputs['referenceLoft']))
 assert candidate['available'] and candidate['arrayIdentitiesAndWordsUnchanged'] and len(candidate['arrays'])==37 and candidate['epoch']['step']==0 and candidate['epoch']['seaTime']==reference['epoch']['seaTime']
 assert candidate['rawFrontPacket']==reference['rawFrontPacket']
 assert len(result['artifacts'])==10 and pngbytes==result['pngBytes']<=inputs['limits']['pngBytesTotal']
 assert (out/'report.json').stat().st_size<=inputs['limits']['reportBytes'] and {p.name for p in out.iterdir()}==expected
 return {'steps':0,'pngCount':8,'sameExactRawFrontActorAndFixedCamerasVerified':True,'unmodifiedCurrentMaterialBothVariantsVerified':True,
  'sameCurrentOrdinarySurfaceAndMaskBytesVerified':True,'preservedCap37AndCurrentCandidate37UploadVerified':True,'fourBaselineRepeatsPixelExact':True,
  'candidateCountEqualityToPriorRequired':False,'globalC1VisualRideOrQualityAcceptance':False}
sealbytes=(W/'seal.json').read_bytes();seal=json.loads(sealbytes);inputs=json.loads((W/'inputs.json').read_bytes())
assert seal['schema']=='shared-leaf-seal/v1' and seal['rootAuthorized'] and seal['complete']
build=json.loads(verify(seal['applicationBuild']));assert build['schema']=='shared-leaf-build/v1' and build['build']==inputs['applicationBuildId']
def check():
 assert build['sourceFreeze']==seal['sourceFreeze'];verify(seal['sourceFreeze'])
 for spec in build['assets']+build['sources']+build['liveSources']+seal['helpers']+seal['borrowedHelpers']+seal['references']:verify(spec)
check();assert not (W/'owner.json').exists() and not (W/'candidate-first').exists() and all(free(port)for port in OWNED)
before=identities()
for port,pid in EXPECTED_PROTECTED.items():assert any(int(row.split()[0])==pid for row in before[str(port)]),'Protected PID required '+str(port)
started=time.monotonic();server=None;proc=None
record={'schema':'shared-leaf-owner/v1','complete':False,'firstFailure':None,'protectedBefore':before,
 'protected4315ExpectedPid':87796,'protected4315RootToolSession':'64713','toolSessionOSIdentityClaim':False,
 'sealSha256':hashlib.sha256(sealbytes).hexdigest(),'preExecutionPinsVerified':True,'postExecutionPinsVerified':False,'copiedAndLiveSourcePinsPostVerified':False,'cleanupFailures':[]}
record['expectedProtectedPids']=EXPECTED_PROTECTED
known_owned={}
def remember_owned():
 current=group_identities(proc.pid)
 if current:
  if not known_owned:
   assert proc.poll() is None and proc.pid in current and str(W/'native.mjs') in current[proc.pid]['command'],'Fresh leader command identity required'
  for pid in current.keys()&known_owned.keys():assert current[pid]==known_owned[pid],'Owned PID identity changed'
  # A matching recorded survivor proves that this process group has not been recycled, even after its leader exits.
  assert not known_owned or any(current.get(pid)==identity for pid,identity in known_owned.items()),'Owned process group lost its recorded identity'
  known_owned.update(current)
 return current
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kw):super().__init__(*args,directory=str(W/'dist'),**kw)
 def log_message(self,*args):pass
try:
 server=ThreadingHTTPServer(('127.0.0.1',4301),Handler);server.daemon_threads=True
 thread=threading.Thread(target=lambda:server.serve_forever(poll_interval=.1),daemon=True);thread.start()
 env={**os.environ,'SHARED_LEAF_OWNER_SEAL_SHA':record['sealSha256'],'FULL_WRITER_FPS_LAUNCHER_REPORT':str(W/'launcher.json')}
 with (W/'native.log').open('wb')as log:
  proc=subprocess.Popen(['/opt/homebrew/bin/node',str(W/'native.mjs'),'--run=true','--url=http://127.0.0.1:4301/?diagnostics','--out='+str(W/'candidate-first')],stdout=log,stderr=subprocess.STDOUT,start_new_session=True,env=env)
  record['pid']=proc.pid;record['ownedProcessGroup']=proc.pid;(W/'live.json').write_text(json.dumps(record))
  initial_owned=remember_owned();assert proc.pid in initial_owned,'Fresh native leader identity absent'
  record['ownedProcessIdentity']=initial_owned[proc.pid];record['ownedIdentities']=list(known_owned.values());last_identity=time.monotonic()
  while proc.poll()is None:
   if time.monotonic()-started>inputs['limits']['ownerSeconds']:raise TimeoutError('Finite owner deadline')
   if time.monotonic()-last_identity>=1:
    remember_owned();record['ownedIdentities']=list(known_owned.values());last_identity=time.monotonic()
   time.sleep(.2)
  record['exitCode']=proc.returncode;assert proc.returncode==0,'Native terminal exit '+str(proc.returncode)
 record['observation']=validate_result(json.loads((W/'candidate-first/report.json').read_bytes()))
 check();record['postExecutionPinsVerified']=True;record['copiedAndLiveSourcePinsPostVerified']=True;record['complete']=True
except BaseException as error:record['firstFailure']=type(error).__name__+': '+str(error);record['complete']=False
finally:
 cleanup=time.monotonic()
 if proc:
  try:
   protected={int(row.split()[0])for group in before.values()for row in group};owned=list(remember_owned())
   assert not protected.intersection(owned),'Owned process group intersects protected listener PIDs'
   record['ownedMembersBeforeCleanup']=owned
   record['ownedIdentities']=list(known_owned.values())
   if owned:
    os.killpg(proc.pid,signal.SIGTERM);end=time.monotonic()+1.5
    while time.monotonic()<end and group_members(proc.pid):time.sleep(.05)
    remaining=remember_owned()
    if remaining:
     assert not protected.intersection(remaining),'Remaining owned group intersects protected PIDs'
     os.killpg(proc.pid,signal.SIGKILL)
    end=time.monotonic()+.5
    while time.monotonic()<end and group_members(proc.pid):time.sleep(.05)
   record['ownedMembersAfterCleanup']=group_members(proc.pid);assert not record['ownedMembersAfterCleanup'];proc.wait(timeout=.35)
  except BaseException as error:record['cleanupFailures'].append('owned-group: '+type(error).__name__+': '+str(error))
 if server:
  try:
   stopper=threading.Thread(target=server.shutdown,daemon=True);stopper.start();stopper.join(timeout=.35);server.server_close();assert not stopper.is_alive()
  except BaseException as error:record['cleanupFailures'].append('server: '+type(error).__name__+': '+str(error))
 try:record['protectedAfter']=identities();record['protectedPreserved']=record['protectedAfter']==before
 except BaseException as error:record['protectedPreserved']=False;record['cleanupFailures'].append('protected: '+type(error).__name__+': '+str(error))
 try:record['closedPorts']={str(port):free(port)for port in OWNED}
 except BaseException as error:record['closedPorts']={str(port):False for port in OWNED};record['cleanupFailures'].append('ports: '+type(error).__name__+': '+str(error))
 record['cleanupElapsedSeconds']=time.monotonic()-cleanup;record['elapsedSeconds']=time.monotonic()-started
 record['complete']=record['complete']and not record['cleanupFailures']and record['protectedPreserved']and all(record['closedPorts'].values())and record['cleanupElapsedSeconds']<=inputs['limits']['cleanupSeconds']and record['elapsedSeconds']<=inputs['limits']['totalSeconds']
 (W/'owner.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record));raise SystemExit(0 if record['complete']else 1)
