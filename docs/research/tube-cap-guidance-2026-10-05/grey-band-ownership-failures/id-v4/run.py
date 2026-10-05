"""Root-only finite owner. This source preparation has not probed or started listeners."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import hashlib,json,os,signal,socket,subprocess,threading,time
W=Path('/private/tmp/tube-grey-band-ownership-native-v4-20261005');PROTECTED=(4312,4313,4314,4315);OWNED=(4301,9711)
EXPECTED_PROTECTED={4312:92445,4313:58298,4314:51358,4315:87796}
OS_SECONDS=2;IDENTITY_PERIOD=5;REQUIRED_ATTEMPTS=3;NOTE_LIMIT=16;whole_started=time.monotonic()
timeout_notes=[];timeout_count=0
def verify(spec):
 b=Path(spec['file']).read_bytes();assert len(b)==spec['bytes'] and hashlib.sha256(b).hexdigest()==spec['sha256'],spec['file'];return b
def free(port):
 s=socket.socket();s.settimeout(.15)
 try:s.connect(('127.0.0.1',port));return False
 except ConnectionRefusedError:return True
 except (TimeoutError,OSError):return False
 finally:s.close()
def read_timeout(deadline=None):
 remaining=OS_SECONDS if deadline is None else min(OS_SECONDS,deadline-time.monotonic())
 if remaining<=0:raise TimeoutError('Finite required identity-read budget exhausted')
 return remaining
def identities(deadline=None):
 pids={}
 for port in PROTECTED:
  raw=subprocess.run(['/usr/sbin/lsof','-nP','-a','-iTCP:'+str(port),'-sTCP:LISTEN','-Fp'],text=True,capture_output=True,timeout=read_timeout(deadline))
  assert raw.returncode==0,'Protected listener absent '+str(port)
  ids=sorted({int(row[1:])for row in raw.stdout.splitlines()if row.startswith('p')});assert ids;pids[str(port)]=ids
 allids=sorted({pid for ids in pids.values()for pid in ids})
 raw=subprocess.check_output(['/bin/ps','-ww','-p',','.join(map(str,allids)),'-o','pid=,lstart=,command='],text=True,timeout=read_timeout(deadline))
 rows={}
 for row in raw.splitlines():
  fields=row.split(None,6)
  if fields:
   assert len(fields)==7,'Full PID/start/command required';rows[int(fields[0])]=fields[0]+' '+' '.join(fields[1:6])+' '+fields[6]
 assert set(rows)==set(allids)
 return {port:[rows[pid]for pid in ids]for port,ids in pids.items()}
def group_identities(pgid,deadline=None):
 raw=subprocess.check_output(['/bin/ps','-ww','-axo','pid=,pgid=,stat=,lstart=,command='],text=True,timeout=read_timeout(deadline))
 result={}
 for row in raw.splitlines():
  words=row.split(None,8)
  if len(words)==9 and int(words[1])==pgid and not words[2].startswith('Z'):
   pid=int(words[0]);result[pid]={'pid':pid,'pgid':pgid,'started':' '.join(words[3:8]),'command':words[8]}
 return result
def note_timeout(phase,error):
 global timeout_count
 timeout_count+=1
 if len(timeout_notes)<NOTE_LIMIT:
  timeout_notes.append({'phase':phase,'elapsedSeconds':time.monotonic()-whole_started,'command':list(error.cmd)if not isinstance(error.cmd,str)else error.cmd,'timeoutSeconds':error.timeout,'outcome':'Observation only'if phase=='periodic-owned-identity'else'Required identity read will retry within its finite budget'})
def required_read(call,phase,deadline):
 last=None
 for attempt in range(REQUIRED_ATTEMPTS):
  if time.monotonic()>=deadline:break
  try:return call(deadline)
  except subprocess.TimeoutExpired as error:
   note_timeout(phase,error);last=error
   if attempt+1<REQUIRED_ATTEMPTS and time.monotonic()<deadline:time.sleep(min(.1,max(0,deadline-time.monotonic())))
 raise TimeoutError('Required identity could not be verified: '+phase)from last
def validate_result(result):
 assert result['schema']=='grey-band-ownership-native/v4' and result['complete'] and result['firstFailure']is None and result['ownedBrowserClose']
 assert not result['browserErrors'] and result['stepCount']==0 and result['pngCount']==4
 assert result['applicationBuildRequest']['build']==inputs['applicationBuildId'] and result['applicationBuildRequest']['checkedBeforeReplay']
 assert result['replayStartup']['publicStartCalls']==1 and result['replayStartup']['noPlacement'] and result['replayStartup']['noClockAssignment']
 assert result['firstBaselineNativePNGMatchesCombinedAuthority']
 restore=result['restoration'];assert restore['complete'] and restore['originalShaderCacheDefineViewAndCameraRestored'] and restore['originalAttributesNeverModified']
 assert restore['completedStages']==['owner','rasterFace','bodyCos']
 reference=json.loads(verify(inputs['referenceLoft']));out=W/'candidate-first'
 assert result['initial']['seaTime']==reference['epoch']['seaTime'] and result['initial']['compute']=='gpu'
 assert result['initial']['canvas']==[1708,879] and result['initial']['menu']['selectedChoices']==['Padang Padang','Big','Mid','Calm','Midday']
 installation=result['installation'];assert installation['installed'] and installation['legacyLipIndexedGeometryEmpty']
 legacy=installation['legacyLipState'];assert legacy['indexPresent'] and legacy['indexCount']==0 and legacy['positionCount']==0
 c=result['capture'];assert c['legacyLipState']==legacy and c['guards']['legacyLipIndexedGeometryEmpty'];assert c['complete'] and c['camera']=='interior' and c['view']=='rich' and c['fixedPose']==inputs['fixedCamera']
 assert c['stepCount']==0 and c['seaTime']==reference['epoch']['seaTime'] and all(c['guards'].values())
 assert c['renderedStages']==['owner','rasterFace','bodyCos'] and len(c['restoredRepeats'])==3
 assert [r['after']for r in c['restoredRepeats']]==c['renderedStages']
 assert all(r['baselineRepeatPNGByteIdentical'] and r['originalDefinesObjectRestored']for r in c['restoredRepeats'])
 assert len(c['materialGroups'])==5 and len({m['materialUUID']for m in c['materialGroups']})==5
 assert {m['kind']:m['id']for m in c['materialGroups']}==inputs['comparison']['owners']
 groups={m['kind']:m for m in c['materialGroups']};evidence=c['shaderEvidence']
 for stage in inputs['comparison']['stages']:
  for kind,ownerid in inputs['comparison']['owners'].items():
   records=[e for e in evidence if e['stage']==stage and e['kind']==kind];assert records,'Missing actual compile '+stage+'/'+kind
   for e in records:
    assert e['materialUUID']==groups[kind]['materialUUID'] and e['meshUUIDs']==groups[kind]['meshUUIDs']
    assert e['actualFinalMaterialDefinesVerified'] and e['vertexUnchanged'] and e['originalGeneratedSourceByteIdentical'] and e['allOriginalPredicatesAndAlphaRetained']
    assert e['originalVertexSHA256']==e['actualVertexSHA256']
    if stage=='baseline':
     assert e['ownerId']is None and e['baselineShaderUnchanged'] and not e['onlyDeclaredReversibleRGBAndCosineDelta']
     assert e['addedFragmentCharacters']==0 and e['originalFragmentSHA256']==e['actualFragmentSHA256']
    else:
     assert e['ownerId']==ownerid and not e['baselineShaderUnchanged'] and e['onlyDeclaredReversibleRGBAndCosineDelta']
     assert e['addedFragmentCharacters']>0 and e['originalFragmentSHA256']!=e['actualFragmentSHA256']
    if kind=='lateRepair':assert e['dynamicRepairDelegationResolved']
 assert len(c['samples'])==4
 for choice,sample in zip(inputs['samples'],c['samples']):
  assert all(sample[k]==v for k,v in choice.items())
  for key in('baselineRGBA','ownerRGBA','rasterFaceRGBA','bodyCosRGBA'):assert len(sample[key])==4 and all(isinstance(x,int) and 0<=x<=255 for x in sample[key])
  ownerid=sample['unmixedEncodedOwnerId'];kind=sample['unmixedEncodedOwnerKind']
  if ownerid is None:assert kind is None
  else:assert inputs['comparison']['owners'][kind]==ownerid and sample['ownerRGBA']==inputs['comparison']['encodedOwnerRGB'][str(ownerid)]+[255]
 expected={'report.json'};pngbytes=0
 assert len(result['artifacts'])==4
 for stage,artifact in zip(inputs['comparison']['stages'],result['artifacts']):
  assert artifact['file']=='interior-rich-'+stage+'.png';expected.add(artifact['file'])
  raw=verify({**artifact,'file':str(out/artifact['file'])});assert raw.startswith(b'\x89PNG\r\n\x1a\n') and len(raw)<=inputs['limits']['pngBytesEach'];pngbytes+=len(raw)
  if stage=='baseline':assert artifact['bytes']==inputs['baselinePNG']['bytes'] and artifact['sha256']==inputs['baselinePNG']['sha256']
 assert pngbytes==result['pngBytes']<=inputs['limits']['pngBytesTotal']
 assert (out/'report.json').stat().st_size<=inputs['limits']['reportBytes'] and {p.name for p in out.iterdir()}==expected
 return {'steps':0,'pngCount':4,'sameHistoricalFull37Raw333AndCurrentDrawableGuardsVerified':True,
  'exactFixedInteriorCameraAndCombinedNativeBaselinePNGVerified':True,'threeRestoredBaselineRepeatsByteExact':True,
  'legacyLipIndexedGeometryEmpty':True,'legacyLipActualState':legacy,
  'fiveActualMaterialIdDefinesAndRepairDynamicDelegationVerified':True,'allOriginalDiscardAlphaDepthStencilAndFarOpacityRetained':True,
  'originalCallbacksCacheDefineIdentityViewCameraRestored':True,'mixedIdsRemainAmbiguous':True,
  'wholePixelOwnershipPlayabilityOrProductionFixClaim':False}

sealbytes=(W/'seal.json').read_bytes();seal=json.loads(sealbytes);inputs=json.loads((W/'inputs.json').read_bytes())
assert seal['schema']=='grey-band-ownership-seal/v4' and seal['rootAuthorized'] and seal['complete']
build=json.loads(verify(seal['applicationBuild']));assert build['schema']=='grey-band-ownership-build/v4' and build['build']==inputs['applicationBuildId']
def check(deadline=None):
 assert build['sourceProvenance']==seal['sourceProvenance']
 provenance=json.loads(verify(seal['sourceProvenance']));assert provenance['complete'] and provenance['schema']=='grey-band-ownership-source-provenance/v4' and provenance['applicationBuild']==inputs['opticalApplicationBuild'] and provenance['applicationFreeze']==inputs['opticalApplicationFreeze'] and provenance['sourceProvenancePolicy']==inputs['sourceProvenancePolicy'] and provenance['priorPreparationFailure']==inputs['priorPreparationFailure'] and provenance['priorNativeFailure']==inputs['priorNativeFailure'] and provenance['legacyLipGuardPolicy']==inputs['legacyLipGuard']
 for spec in build['assets']+seal['helpers']+seal['borrowedHelpers']+seal['references']+seal['immutablePriorAssets']+seal['historicalScratchSources']+seal['repositoryDependencyScratchSources']+seal['externalDiagnosticScratchSources']:
  if deadline is not None and time.monotonic()>=deadline:raise TimeoutError('Finite pin verification budget')
  verify(spec)
whole_deadline=whole_started+inputs['limits']['totalSeconds'];preflight_deadline=min(whole_started+20,whole_deadline-inputs['limits']['cleanupSeconds'])
check(preflight_deadline);assert not (W/'owner.json').exists() and not (W/'candidate-first').exists() and all(free(port)for port in OWNED)
before=required_read(identities,'preflight-protected',preflight_deadline)
closure=json.loads(verify(inputs['protectedIdentityAuthority']))
for port,pid in EXPECTED_PROTECTED.items():
 identity=closure['protectedIdentities'][str(port)]['actualIdentity'];assert identity['pid']==pid
 expected=str(pid)+' '+identity['started']+' '+identity['command']
 assert expected in before[str(port)],'Protected full PID/start/command required '+str(port)
started=time.monotonic();owner_deadline=min(started+inputs['limits']['ownerSeconds'],whole_deadline-inputs['limits']['cleanupSeconds']);server=None;proc=None
record={'schema':'grey-band-ownership-owner/v4','complete':False,'firstFailure':None,'protectedBefore':before,
 'protected4315ExpectedPid':87796,'protected4315RootToolSession':'64713','toolSessionOSIdentityClaim':False,
 'sealSha256':hashlib.sha256(sealbytes).hexdigest(),'preExecutionPinsVerified':True,'postExecutionPinsVerified':False,'copiedAndHistoricalSourcePinsPostVerified':False,'cleanupFailures':[]}
record['expectedProtectedPids']=EXPECTED_PROTECTED
record['protectedIdentityAuthority']=inputs['protectedIdentityAuthority']
record['historicalOpticalRun']=inputs['historicalOpticalRun']
record['priorPreparationFailure']=inputs['priorPreparationFailure']
record['priorNativeFailure']=inputs['priorNativeFailure']
record['osObservationPolicy']=inputs['ownerObservationPolicy']
record['absoluteBudget']={'wholeSeconds':inputs['limits']['totalSeconds'],'cleanupReservedSeconds':inputs['limits']['cleanupSeconds'],'activeOwnerBudgetSeconds':owner_deadline-started,'maximumNativeOwnerSeconds':inputs['limits']['ownerSeconds'],'preflightBudgetSeconds':20}
known_owned={}
def remember_owned(deadline=None):
 current=group_identities(proc.pid,deadline)
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
 if time.monotonic()>=owner_deadline:raise TimeoutError('No active owner time before starting resources')
 server=ThreadingHTTPServer(('127.0.0.1',4301),Handler);server.daemon_threads=True
 thread=threading.Thread(target=lambda:server.serve_forever(poll_interval=.1),daemon=True);thread.start()
 env={**os.environ,'GREY_OWNERSHIP_OWNER_SEAL_SHA':record['sealSha256'],'FULL_WRITER_FPS_LAUNCHER_REPORT':str(W/'launcher.json')}
 with (W/'native.log').open('wb')as log:
  proc=subprocess.Popen(['/opt/homebrew/bin/node',str(W/'native.mjs'),'--run=true','--url=http://127.0.0.1:4301/?diagnostics','--out='+str(W/'candidate-first')],stdout=log,stderr=subprocess.STDOUT,start_new_session=True,env=env)
  record['pid']=proc.pid;record['ownedProcessGroup']=proc.pid;(W/'live.json').write_text(json.dumps(record))
  initial_owned=required_read(remember_owned,'initial-owned-leader',min(owner_deadline,time.monotonic()+7));assert proc.pid in initial_owned,'Fresh native leader identity absent'
  record['ownedProcessIdentity']=initial_owned[proc.pid];record['ownedIdentities']=list(known_owned.values());last_identity=time.monotonic()
  while proc.poll()is None:
   if time.monotonic()>=owner_deadline:raise TimeoutError('Finite owner deadline with cleanup reserved')
   if time.monotonic()-last_identity>=IDENTITY_PERIOD:
    try:remember_owned(owner_deadline);record['ownedIdentities']=list(known_owned.values())
    except subprocess.TimeoutExpired as error:note_timeout('periodic-owned-identity',error)
    # A transient OS observation timeout never closes HTTP, aborts this process, or starts another native handle.
    last_identity=time.monotonic()
   time.sleep(min(.2,max(0,owner_deadline-time.monotonic())))
  record['exitCode']=proc.returncode;assert proc.returncode==0,'Native terminal exit '+str(proc.returncode)
 if time.monotonic()>=owner_deadline:raise TimeoutError('Finite active owner budget before report validation')
 record['observation']=validate_result(json.loads((W/'candidate-first/report.json').read_bytes()))
 check(owner_deadline)
 if time.monotonic()>=owner_deadline:raise TimeoutError('Finite active owner budget after post-pins')
 record['postExecutionPinsVerified']=True;record['copiedAndHistoricalSourcePinsPostVerified']=True;record['complete']=True
except BaseException as error:record['firstFailure']=type(error).__name__+': '+str(error);record['complete']=False
finally:
 cleanup=time.monotonic();cleanup_deadline=min(cleanup+inputs['limits']['cleanupSeconds'],whole_deadline)
 if proc:
  try:
   protected={int(row.split()[0])for group in before.values()for row in group}
   owned=required_read(remember_owned,'cleanup-before-TERM',cleanup_deadline)
   assert not protected.intersection(owned),'Owned process group intersects protected listener PIDs'
   record['ownedMembersBeforeCleanup']=list(owned);record['ownedIdentities']=list(known_owned.values())
   if owned:
    # The immediately preceding read must carry the original leader or an exact recorded survivor anchor.
    record.setdefault('signals',[]).append({'signal':'TERM','verifiedMembers':list(owned),'identityAnchorVerified':True})
    os.killpg(proc.pid,signal.SIGTERM);time.sleep(min(.5,max(0,cleanup_deadline-time.monotonic())))
    remaining=required_read(remember_owned,'cleanup-before-KILL',cleanup_deadline)
    if remaining:
     assert not protected.intersection(remaining),'Remaining owned group intersects protected PIDs'
     record['signals'].append({'signal':'KILL','verifiedMembers':list(remaining),'identityAnchorVerified':True})
     os.killpg(proc.pid,signal.SIGKILL);time.sleep(min(.2,max(0,cleanup_deadline-time.monotonic())))
   remaining=required_read(remember_owned,'cleanup-final-group-absence',cleanup_deadline)
   record['ownedMembersAfterCleanup']=list(remaining);assert not remaining,'Owned group still present'
   proc.wait(timeout=read_timeout(cleanup_deadline));record['ownedGroupIdentityAndAbsenceVerified']=True
  except BaseException as error:
   record['ownedGroupIdentityAndAbsenceVerified']=False
   record['cleanupFailures'].append('owned-group: '+type(error).__name__+': '+str(error))
 if server:
  try:
   stopper=threading.Thread(target=server.shutdown,daemon=True);stopper.start();stopper.join(timeout=max(0,min(OS_SECONDS,cleanup_deadline-time.monotonic())));server.server_close();assert not stopper.is_alive()
  except BaseException as error:record['cleanupFailures'].append('server: '+type(error).__name__+': '+str(error))
 try:
  record['protectedAfter']=required_read(identities,'cleanup-protected',cleanup_deadline)
  record['protectedPreserved']=record['protectedAfter']==before
 except BaseException as error:record['protectedPreserved']=False;record['cleanupFailures'].append('protected: '+type(error).__name__+': '+str(error))
 try:record['closedPorts']={str(port):free(port)for port in OWNED}
 except BaseException as error:record['closedPorts']={str(port):False for port in OWNED};record['cleanupFailures'].append('ports: '+type(error).__name__+': '+str(error))
 record['osReadTimeoutCount']=timeout_count;record['osReadTimeoutNotes']=timeout_notes;record['osReadTimeoutNotesTruncated']=timeout_count>len(timeout_notes)
 record['cleanupElapsedSeconds']=time.monotonic()-cleanup;record['nativeOwnerElapsedSeconds']=time.monotonic()-started;record['elapsedSeconds']=time.monotonic()-whole_started
 record['complete']=record['complete']and record.get('ownedGroupIdentityAndAbsenceVerified',False)and not record['cleanupFailures']and record['protectedPreserved']and all(record['closedPorts'].values())and record['cleanupElapsedSeconds']<=inputs['limits']['cleanupSeconds']and record['elapsedSeconds']<=inputs['limits']['totalSeconds']
 (W/'owner.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record));raise SystemExit(0 if record['complete']else 1)
