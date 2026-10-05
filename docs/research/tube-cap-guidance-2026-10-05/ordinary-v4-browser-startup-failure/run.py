"""Root-only finite owner. This source preparation has not probed or started listeners."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import base64,hashlib,json,math,os,signal,socket,struct,subprocess,threading,time
W=Path('/private/tmp/tube-guided-ordinary-v4-telemetry-native-20261005');PROTECTED=(4312,4313,4314,4315);OWNED=(4301,9711)
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
def array_bytes(array):
 widths={'Float32Array':4,'Uint32Array':4,'Int32Array':4,'Uint8Array':1}
 assert array['encoding']=='base64-exact-active-typed-array-words'and array['dtype']in widths
 assert isinstance(array['count'],int)and array['count']>=0 and array['byteLength']==array['count']*widths[array['dtype']]
 raw=base64.b64decode(array['data'],validate=True);assert len(raw)==array['byteLength'];return raw
def validate_witness(witness,row):
 assert len(witness['points'])==14
 assert witness['allPointsLoftParityClear']==all(p['drawnWater']is False and not p['parityDisagreement']for p in witness['points'])
 assert witness['allPointsWaterClear']==all(p['waterClear']for p in witness['points'])
 for point in witness['points']:
  ordinary=point['ordinaryWater']
  if ordinary is not None:
   assert point['drawnWater']is None and not point['candidates']and point['waterAuthority']=='ordinary-host-height-field/outside-all-indexed-crossings'
   assert ordinary['provenance']=='current-snapshot-bilinear-raw-node-max/host-carve-only-lowers'and not ordinary['shaderCubicSkinOrLimbProof']
   if ordinary['available']:
    assert ordinary['wholeFootprintBound']and ordinary['surfaceSeaTime']==row['seaTime']
    assert all(math.isfinite(ordinary[k])for k in('height','bottom','bottomGap','rawNodeMaximum','boundBottomGap'))
    assert ordinary['height']<=ordinary['rawNodeMaximum']and ordinary['bottom']==point['xyz'][1]-point['radius']
    assert ordinary['bottomGap']==ordinary['bottom']-ordinary['height']and ordinary['boundBottomGap']==ordinary['bottom']-ordinary['rawNodeMaximum']
    assert ordinary['clear']==(ordinary['boundBottomGap']>0)and point['waterClear']==ordinary['clear']
   else:assert not point['waterClear']and witness['outsideWaterUnclassified']
  elif point['drawnWater']is True:assert not point['waterClear']
def validate_result(result,limits):
 assert result['schema']=='guided-ordinary-native/v4'and result['complete']and result['firstFailure']is None and result['ownedBrowserClose']and not result['browserErrors']
 assert result['pilot']['style']=='tube'and result['overrides']['seed']==6238 and result['policy']['noProneSteerZeroOverlay']and not result['policy']['normalMenuSeedReachabilityClaim']
 assert result['applicationBuildRequest']['build']==seal['buildId']and result['applicationBuildRequest']['checkedBeforeReplayAndStepping']
 assert result['replayStartup']['publicStartCalls']==1 and result['replayStartup']['diagnosticOnly']and result['replayStartup']['noPlacementOrPrivateClockAssignment']
 assert 0<=result['stepCount']<=limits['steps']and result['stop']['step']==result['stepCount']
 out=W/'candidate-first';assert(out/'report.json').stat().st_size<=limits['reportBytes']
 expected={'report.json','steps.ndjson'};pngs=[];lofts=[]
 for artifact in result['artifacts']:
  if time.monotonic()>=owner_deadline:raise TimeoutError('Finite active owner budget during artifact validation')
  assert Path(artifact['file']).name==artifact['file']and artifact['file']not in expected-{'steps.ndjson'}
  raw=verify({**artifact,'file':str(out/artifact['file'])});expected.add(artifact['file'])
  if artifact['file'].endswith('.png'):
   assert raw.startswith(b'\x89PNG\r\n\x1a\n')and struct.unpack('>II',raw[16:24])==(1708,879)and len(raw)<=limits['pngBytesEach'];pngs.append(artifact)
  elif artifact['file'].startswith('loft-'):
   snap=json.loads(raw);assert len(raw)<=limits['loftBytesEach']and snap['available']and len(snap['arrays'])==37 and snap['arrayIdentitiesAndWordsUnchanged']
   assert snap['counts']['vertices']==134*snap['counts']['slices']and snap['counts']['slices']<=300 and snap['counts']['indices']<=240000
   assert sum(len(array_bytes(a))for a in snap['arrays'].values())==snap['rawBytes']<=4194304
   front=snap['rawFrontPacket'];assert front['dtype']=='Float32Array'and front['stride']==9 and front['count']==9*front['recordCount']and front['recordCount']<=2048;array_bytes(front)
   assert snap['nonmutation']['unchanged']and snap['nonmutation']['checkedLoftArrays']==37;lofts.append(artifact)
  else:assert artifact['file']=='steps.ndjson'
 assert{p.name for p in out.iterdir()}==expected
 assert 2<=len(pngs)==result['pngCount']<=limits['pngCount'] and len(lofts)==len(pngs)==len(result['checkpoints'])
 assert sum(a['bytes']for a in pngs)==result['pngBytes']<=limits['pngBytesTotal']and sum(a['bytes']for a in lofts)==result['loftBytes']<=limits['loftBytesTotal']
 assert result['checkpoints'][0]['label']=='initial'and result['checkpoints'][-1]['label']=='terminal'
 assert result['policy']['passiveSameQueryApproachTelemetry']and result['policy']['telemetryNeverFeedsControl']and result['policy']['observerClassifierUnoptimized']
 assert len(result['checkpoints'])<=len(inputs['milestonePolicy']['labels'])
 for checkpoint in result['checkpoints']:
  assert checkpoint['label']in inputs['milestonePolicy']['labels']
  assert math.isfinite(checkpoint['nativeCheckpointWallMs'])and checkpoint['nativeCheckpointWallMs']>=0

 assert all(c['nonmutation']['unchanged']and c['current']['cameraFollower']['exactPositionQuaternionMatch']for c in result['checkpoints'])
 trace=(out/'steps.ndjson').read_bytes();assert len(trace)==result['traceBytes']<=limits['traceBytes'];rows=[json.loads(line)for line in trace.splitlines()]
 assert len(rows)==result['stepCount'];previous=result['initialBody']['seaTime'];pulseCount=0
 for i,row in enumerate(rows,1):
  if time.monotonic()>=owner_deadline:raise TimeoutError('Finite active owner budget during trace validation')
  assert row['step']==i and abs(row['seaTime']-previous-1/60)<1e-7 and row['inputView']['seaTime']==previous;previous=row['seaTime']
  assert math.isfinite(row['visualPoseTime'])and math.isfinite(row['interpolationLag'])and 0<=row['interpolationLag']<=1/60+1e-7
  assert row['visualPoseTime']==row['clocks']['visualClock']and row['interpolationLag']==row['seaTime']-row['visualPoseTime']and abs(row['clocks']['waterTime']-row['seaTime'])<1e-7
  assert row['input']==row['requestedInput']and row['input']['tubeGuide']is True and row['control']['actualInputEqualsPilotOutput']and row['control']['proneSteeringPreserved']
  assert row['nonmutation']['unchanged']and row['nonmutation']['checkedLoftArrays']==37 and row['cameraFollower']['exactPositionQuaternionMatch']and not row['detector']['continuedWithoutWitness']
  assert row['detector']['cumulativeMilliseconds']<=limits['detectorMilliseconds']
  if row['input']['popUp']:
   pulseCount+=1;assert row['inputView']['ride']['phase']=='prone'and row['inputView']['ride']['cue']is True and pulseCount==1
  if row['ride']['phase']=='standing':
   body=row['ride']['tubeBody'];assert body['seaTime']==row['seaTime']and len(body['renderPoints'])==len(body['partSpheres'])==7
   observation=row['ride']['tubeApproachObservation'];assert observation['schema']=='tube-approach-observation/v1'and observation['seaTime']==row['seaTime']
   assert isinstance(observation['geometryStep'],int)and observation['geometryStep']>=0
   for key in('eligibleMaturePairs','nondegenerateMatureCapSegments','candidatesInReach','endpointDuplicatesSkipped','routesAttempted','columnCalls','clearRouteCalls'):
    assert isinstance(observation[key],int)and observation[key]>=0
   assert observation['routesAttempted']<=observation['candidatesInReach']and observation['nondegenerateMatureCapSegments']<=observation['eligibleMaturePairs']
   assert len(observation['rejectionCounts'])<=15 and all(isinstance(count,int)and count>0 for count in observation['rejectionCounts'].values())
   assert sum(observation['rejectionCounts'].values())<=observation['routesAttempted']
   guide=row['ride']['tubeApproach'];assert(observation['outcome']=='accepted')==(guide is not None)
   if guide:
    assert guide['seaTime']==row['seaTime']and observation['accepted']['bodyFitsMouth']==guide['bodyFitsMouth']and observation['accepted']['bodyInCavity']==guide['bodyInCavity']
   assert all(math.isfinite(value)and value>=0 for value in row['observerTiming'].values())

   witness=row['witness'];rendered=row['renderedWitness'];union=row['unionWitness'];validate_witness(witness,row);validate_witness(rendered,row)
   assert row['nonmutation']['ordinaryGridAndSurfaceChecked']and row['nonmutation']['normalDrawnArraysAndVisualClockChecked']and row['nonmutation']['checkedDrawnRiderWords']==33 and row['nonmutation']['checkedDrawnBoardWords']==8
   assert rendered['visualPoseTime']==row['visualPoseTime']and rendered['currentPartSphereSeaTime']==rendered['drawnLoftSeaTime']==row['seaTime']
   assert rendered['uniqueAdditionalWitnesses']==7 and rendered['duplicatedCurrentPartSpheres']==7
   for j,point in enumerate(rendered['points'][:7]):assert point['xyz']==row['displayedRiderPoints'][3*j:3*j+3]and point['kind']=='actual-displayed-SnapshotTrack-point'and point['radius']==0
   for current,delayed in zip(witness['points'][7:],rendered['points'][7:]):assert current['xyz']==delayed['xyz']and current['radius']==delayed['radius']
   assert union['uniqueWitnessCount']==21 and union['currentWitnessCount']==14 and union['additionalDisplayedPointCount']==7 and union['duplicatedCurrentPartSpheresInImplementation']==7
   assert union['displayedStanding']==(row['displayedRiderPhaseIndex']==3 and row['displayedRiderPresent']>0)and union['normalInterpolationPreserved']and not union['completeSkinCapsuleOrLimbProof']
   assert union['all21ModelWitnessesContained']==(witness['all14ModelWitnessesContained']and rendered['all14ModelWitnessesContained']and union['sameConnectedRun']and union['displayedStanding'])
   assert union['all21WaterClear']==(witness['allPointsWaterClear']and rendered['allPointsWaterClear'])and union['all21ActualPartSpheresClear']==(witness['allActualPartSpheresClear']and rendered['allActualPartSpheresClear'])
   if union['sameConnectedRun']:assert witness['component']['front']==rendered['component']['front']and witness['component']['localId']==rendered['component']['localId']
 for label,predicate in [('first-standing',lambda row:row['ride']['phase']=='standing'),('first-guide',lambda row:row['ride'].get('tubeApproach')is not None),('first-partial-entry',lambda row:row.get('unionWitness')is not None and row['unionWitness']['classification']=='partial')]:
  first=next((row for row in rows if predicate(row)),None)
  observed=next((checkpoint for checkpoint in result['checkpoints']if checkpoint['label']==label),None)
  assert(first is None)==(observed is None)
  if first:assert observed['step']==first['step']and result['phaseMilestones'][label]['step']==first['step']
 assert result['terminalBody']['step']==result['stepCount']and result['terminalBody']['seaTime']==previous
 sequence=result['sequence'];assert result['acceptedModelWitnessRide']==sequence['accepted']and sequence['completeSkinnedBodyOrCapsuleClaim']is False
 if sequence['accepted']:
  assert sequence['observedStandingOutside']and sequence['entry']['front']in sequence['partialFronts']
  assert sequence['travel']['continuousSeconds']>=1-1e-8 and sequence['travel']['relativeProgressMetres']>=3
  assert sequence['entry']['step']<=sequence['travel']['step']<=sequence['exitIntent']['step']<=sequence['exit']['step']<=result['stepCount']
  assert sequence['uniqueWitnessCount']==21 and sequence['bothCurrentAndDisplayedStandingRequired']and sequence['normalInterpolationPreserved']
  assert sequence['exit']['openingAlive']and sequence['exit']['all21ShorewardAndClear']and sequence['standingAfterExitSeconds']>=1-1e-8
 return{'stepCount':result['stepCount'],'stop':result['stop']['kind'],'modelWitnessRideAccepted':sequence['accepted'],'pngCount':len(pngs),'exactInputAndCurrentBodyTraceChecked':True,
  'ordinaryOutsideWaterBoundProvenanceChecked':True,'current14AndDisplayed7Union21TraceChecked':True,'authoredInterpolationLagChecked':True,'completeSkinCapsuleCubicShaderFPSOrVisualQualityAcceptance':False}

sealbytes=(W/'seal.json').read_bytes();seal=json.loads(sealbytes);inputs=json.loads((W/'inputs.json').read_bytes())
assert seal['schema']=='guided-ordinary-seal/v4' and seal['rootAuthorized'] and seal['complete']
build=json.loads(verify(seal['applicationBuild']));assert build['schema']=='guided-ordinary-build/v4' and build['complete']and build['build']==inputs['buildId']
def check(deadline=None):
 assert build['sourceFreeze']==seal['sourceFreeze'];verify(seal['sourceFreeze'])
 for spec in build['assets']+build['productionSources']+build['diagnosticCompiledSources']+seal['helpers']+seal['borrowedHelpers']+seal['references']+build['applicationBuildAssets']+[seal['diagnosticModule'],seal['diagnosticBuild'],build['rootBuildAuthority'],build['applicationBuildLog'],build['diagnosticBuildLog']]:
  if deadline is not None and time.monotonic()>=deadline:raise TimeoutError('Finite pin verification budget')
  verify(spec)
whole_deadline=whole_started+inputs['limits']['totalSeconds'];preflight_deadline=min(whole_started+20,whole_deadline-inputs['limits']['cleanupSeconds'])
check(preflight_deadline);assert not (W/'owner.json').exists() and not (W/'candidate-first').exists() and all(free(port)for port in OWNED)
before=required_read(identities,'preflight-protected',preflight_deadline)
closure=json.loads(verify(inputs['protectedIdentityReference']))
for port,pid in EXPECTED_PROTECTED.items():
 identity=closure['protectedIdentities'][str(port)]['actualIdentity'];assert identity['pid']==pid
 expected=str(pid)+' '+identity['started']+' '+identity['command']
 assert expected in before[str(port)],'Protected full PID/start/command required '+str(port)
started=time.monotonic();owner_deadline=min(started+inputs['limits']['ownerSeconds'],whole_deadline-inputs['limits']['cleanupSeconds']);server=None;proc=None
record={'schema':'guided-ordinary-owner/v4','complete':False,'firstFailure':None,'protectedBefore':before,
 'protected4315ExpectedPid':87796,'protected4315RootToolSession':'64713','toolSessionOSIdentityClaim':False,
 'applicationBuild':seal['applicationBuild'],'sourceFreeze':seal['sourceFreeze'],'diagnosticBuild':seal['diagnosticBuild'],
 'sealSha256':hashlib.sha256(sealbytes).hexdigest(),'preExecutionPinsVerified':True,'postExecutionPinsVerified':False,'copiedAndLiveSourcePinsPostVerified':False,'cleanupFailures':[]}
record['expectedProtectedPids']=EXPECTED_PROTECTED
record['priorObservation']=inputs['priorObservation']
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
 def do_GET(self):
  if self.path.split('?')[0]=='/diagnostic-autopilot.mjs':
   raw=verify(seal['diagnosticModule']);self.send_response(200);self.send_header('Content-Type','text/javascript');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
  else:super().do_GET()
try:
 if time.monotonic()>=owner_deadline:raise TimeoutError('No active owner time before starting resources')
 server=ThreadingHTTPServer(('127.0.0.1',4301),Handler);server.daemon_threads=True
 thread=threading.Thread(target=lambda:server.serve_forever(poll_interval=.1),daemon=True);thread.start()
 env={**os.environ,'GUIDED_OWNER_SEAL_SHA':record['sealSha256'],'FULL_WRITER_FPS_LAUNCHER_REPORT':str(W/'launcher.json')}
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
 record['observation']=validate_result(json.loads((W/'candidate-first/report.json').read_bytes()),seal['limits'])
 check(owner_deadline)
 if time.monotonic()>=owner_deadline:raise TimeoutError('Finite active owner budget after post-pins')
 record['postExecutionPinsVerified']=True;record['copiedAndLiveSourcePinsPostVerified']=True;record['complete']=True
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
