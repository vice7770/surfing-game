"""Root-only finite owner. Protect all human previews, including4315. Never builds."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import base64,hashlib,json,math,os,signal,socket,struct,subprocess,threading,time
W=Path('/private/tmp/tube-guided-ordinary-v3-native-20261005')
PROTECTED=(4312,4313,4314,4315)
OWNED=(4301,9711)
def verify(spec):
 raw=Path(spec['file']).read_bytes();assert len(raw)==spec['bytes']and hashlib.sha256(raw).hexdigest()==spec['sha256'],spec['file'];return raw
def free(port):
 connection=socket.socket();connection.settimeout(.15)
 try:connection.connect(('127.0.0.1',port));return False
 except ConnectionRefusedError:return True
 except (TimeoutError,OSError):return False
 finally:connection.close()
def identities():
 pids={}
 for port in PROTECTED:
  result=subprocess.run(['/usr/sbin/lsof','-nP','-a','-iTCP:'+str(port),'-sTCP:LISTEN','-Fp'],capture_output=True,text=True,timeout=.5)
  assert result.returncode==0,'Protected listener absent '+str(port)
  ids=sorted({int(line[1:])for line in result.stdout.splitlines()if line.startswith('p')});assert ids;pids[str(port)]=ids
 assert pids['4315']==[87796],'Root preview4315 identity changed before observation'
 allids=sorted({pid for ids in pids.values()for pid in ids})
 raw=subprocess.check_output(['/bin/ps','-p',','.join(map(str,allids)),'-o','pid=,lstart=,comm='],text=True,timeout=.5)
 rows={int(line.split()[0]):line.strip()for line in raw.splitlines()if line.strip()};assert set(rows)==set(allids)
 return{port:[rows[pid]for pid in ids]for port,ids in pids.items()}
def members(pgid):
 raw=subprocess.check_output(['/bin/ps','-axo','pid=,pgid=,stat='],text=True,timeout=.5)
 return[int(words[0])for row in raw.splitlines()if len(words:=row.split())==3 and int(words[1])==pgid and not words[2].startswith('Z')]
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
 assert result['schema']=='guided-ordinary-native/v2'and result['complete']and result['firstFailure']is None and result['ownedBrowserClose']and not result['browserErrors']
 assert result['pilot']['style']=='tube'and result['overrides']['seed']==6238 and result['policy']['noProneSteerZeroOverlay']and not result['policy']['normalMenuSeedReachabilityClaim']
 assert result['applicationBuildRequest']['build']==seal['buildId']and result['applicationBuildRequest']['checkedBeforeReplayAndStepping']
 assert result['replayStartup']['publicStartCalls']==1 and result['replayStartup']['diagnosticOnly']and result['replayStartup']['noPlacementOrPrivateClockAssignment']
 assert 0<=result['stepCount']<=limits['steps']and result['stop']['step']==result['stepCount']
 out=W/'candidate-first';assert(out/'report.json').stat().st_size<=limits['reportBytes']
 expected={'report.json','steps.ndjson'};pngs=[];lofts=[]
 for artifact in result['artifacts']:
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
 assert 2<=len(pngs)==result['pngCount']<=4 and len(lofts)==len(pngs)==len(result['checkpoints'])
 assert sum(a['bytes']for a in pngs)==result['pngBytes']<=limits['pngBytesTotal']and sum(a['bytes']for a in lofts)==result['loftBytes']<=limits['loftBytesTotal']
 assert result['checkpoints'][0]['label']=='initial'and result['checkpoints'][-1]['label']=='terminal'
 assert all(c['nonmutation']['unchanged']and c['current']['cameraFollower']['exactPositionQuaternionMatch']for c in result['checkpoints'])
 trace=(out/'steps.ndjson').read_bytes();assert len(trace)==result['traceBytes']<=limits['traceBytes'];rows=[json.loads(line)for line in trace.splitlines()]
 assert len(rows)==result['stepCount'];previous=result['initialBody']['seaTime'];pulseCount=0
 for i,row in enumerate(rows,1):
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

sealbytes=(W/'seal.json').read_bytes();seal=json.loads(sealbytes)
assert seal['schema']=='guided-ordinary-seal/v2'and seal['rootAuthorized']and seal['complete']
build=json.loads(verify(seal['applicationBuild']));assert build['schema']=='guided-ordinary-build/v2'and build['complete']and build['build']==seal['buildId']
def check():
 for spec in build['assets']+build['productionSources']+build['diagnosticCompiledSources']+seal['helpers']+seal['borrowedHelpers']+build['applicationBuildAssets']+[seal['diagnosticModule'],seal['diagnosticBuild'],seal['sourceFreeze'],build['applicationBuildLog']]:verify(spec)
check();assert not(W/'owner.json').exists()and not(W/'candidate-first').exists()and all(free(port)for port in OWNED)
before=identities();started=time.monotonic();server=None;thread=None;proc=None
record={'schema':'guided-ordinary-owner/v2','complete':False,'firstFailure':None,'protectedBefore':before,'protected4315RootSession':64713,
 'build':seal['applicationBuild'],'sourceFreeze':seal['sourceFreeze'],'diagnosticBuild':seal['diagnosticBuild'],'sealSha256':hashlib.sha256(sealbytes).hexdigest(),
 'limits':seal['limits'],'preExecutionPinsVerified':True,'postExecutionPinsVerified':False,'cleanupFailures':[],
 'scope':'Independent current input/body trace, artifact bytes and finite resources. Geometric classifier is independent from production guide; no full skin/capsule or quality claim.'}
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(W/'dist'),**kwargs)
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path.split('?')[0]=='/diagnostic-autopilot.mjs':
   raw=verify(seal['diagnosticModule']);self.send_response(200);self.send_header('Content-Type','text/javascript');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
  else:super().do_GET()
try:
 server=ThreadingHTTPServer(('127.0.0.1',4301),Handler);server.daemon_threads=True;thread=threading.Thread(target=lambda:server.serve_forever(poll_interval=.1),daemon=True);thread.start()
 env={**os.environ,'GUIDED_OWNER_SEAL_SHA':record['sealSha256'],'FULL_WRITER_FPS_LAUNCHER_REPORT':str(W/'launcher.json')}
 with(W/'native.log').open('wb')as log:
  proc=subprocess.Popen(['/opt/homebrew/bin/node',str(W/'native.mjs'),'--run=true','--url=http://127.0.0.1:4301/?diagnostics','--out='+str(W/'candidate-first')],stdout=log,stderr=subprocess.STDOUT,start_new_session=True,env=env)
  record['pid']=proc.pid;record['ownedProcessGroup']=proc.pid;(W/'live.json').write_text(json.dumps(record))
  while proc.poll()is None:
   if time.monotonic()-started>seal['limits']['ownerSeconds']:raise TimeoutError('650s owner deadline')
   time.sleep(.2)
  record['exitCode']=proc.returncode;assert proc.returncode==0,'Native terminal exit '+str(proc.returncode)
 record['observation']=validate_result(json.loads((W/'candidate-first/report.json').read_text()),seal['limits'])
 check();record['postExecutionPinsVerified']=True;record['complete']=True
except BaseException as error:record['firstFailure']=type(error).__name__+': '+str(error)
finally:
 cleanup_started=time.monotonic()
 if proc:
  try:
   protected={int(row.split()[0])for group in before.values()for row in group};owned=members(proc.pid);assert not protected.intersection(owned),'Owned group intersects protected listener'
   record['ownedMembersBeforeCleanup']=owned
   if owned:
    os.killpg(proc.pid,signal.SIGTERM);end=time.monotonic()+1.5
    while time.monotonic()<end and members(proc.pid):time.sleep(.05)
    if members(proc.pid):os.killpg(proc.pid,signal.SIGKILL)
    end=time.monotonic()+.5
    while time.monotonic()<end and members(proc.pid):time.sleep(.05)
   record['ownedMembersAfterCleanup']=members(proc.pid);assert not record['ownedMembersAfterCleanup'];proc.wait(timeout=.5)
  except BaseException as error:record['cleanupFailures'].append('owned-group: '+type(error).__name__+': '+str(error))
 if server:
  try:
   stopper=threading.Thread(target=server.shutdown,daemon=True);stopper.start();stopper.join(timeout=.5);server.server_close();assert not stopper.is_alive()
  except BaseException as error:record['cleanupFailures'].append('server: '+type(error).__name__+': '+str(error))
 try:record['protectedAfter']=identities();record['protectedPreserved']=before==record['protectedAfter']
 except BaseException as error:record['protectedPreserved']=False;record['cleanupFailures'].append('protected: '+type(error).__name__+': '+str(error))
 try:record['closedPorts']={str(port):free(port)for port in OWNED}
 except BaseException as error:record['closedPorts']={str(port):False for port in OWNED};record['cleanupFailures'].append('ports: '+type(error).__name__+': '+str(error))
 record['cleanupElapsedSeconds']=time.monotonic()-cleanup_started;record['elapsedSeconds']=time.monotonic()-started
 record['complete']=record['complete']and not record['cleanupFailures']and record['protectedPreserved']and all(record['closedPorts'].values())and record['cleanupElapsedSeconds']<=7 and record['elapsedSeconds']<=660
 (W/'owner.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record));raise SystemExit(0 if record['complete']else 1)
