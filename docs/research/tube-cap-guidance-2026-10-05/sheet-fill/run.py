"""Root-only finite owner. This source preparation has not probed or started listeners."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import hashlib,json,os,signal,socket,subprocess,threading,time
W=Path('/private/tmp/tube-sheet-fill-native-20261005');PROTECTED=(4312,4313,4314,4315);OWNED=(4301,9711)
SKY='sweptSkyTransmission * PI * textureCubeUV( envMap, envMapRotation * sweptSkyRay, roughnessFactor ).rgb * envMapIntensity'
SKY_ONCE='PI * textureCubeUV( envMap, envMapRotation * sweptSkyRay, roughnessFactor ).rgb * envMapIntensity'
BACK='vec3 sweptBack = vSweptSheetBack * sweptSky + ( 1.0 - vSweptSheetBack ) * sweptWall;'
BACK_FILL='float sweptSkyShare = clamp( vSweptSheetBack, 0.0, 1.0 ) * sweptSkyTransmission;\n    vec3 sweptBack = sweptSkyShare * sweptSky + ( 1.0 - sweptSkyShare ) * sweptWall;'
THROAT='radiance *= mix( 1.0, sweptLeaves( sweptMirror, sweptTip ) ? 1.0 : 0.0, vSweptThroat.w );'
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
def validate_result(result):
 assert result['schema']=='matched-sheet-fill-native/v1' and result['complete'] and result['firstFailure']is None and result['ownedBrowserClose']
 assert not result['browserErrors'] and result['stepCount']==0 and result['pngCount']==6 and len(result['triples'])==2
 assert result['applicationBuildRequest']['build']=='tube-cap-refinement-20261005' and result['applicationBuildRequest']['checkedBeforeReplay']
 assert result['replayStartup']['publicStartCalls']==1 and result['replayStartup']['noPlacement'] and result['replayStartup']['noClockAssignment']
 assert result['restoration']['complete'] and result['restoration']['originalShaderViewCameraRestored']
 reference=json.loads(verify(inputs['referenceLoft']));out=W/'candidate-first'
 assert result['initial']['seaTime']==reference['epoch']['seaTime'] and result['initial']['compute']=='gpu'
 assert result['initial']['canvas']==[1708,879] and result['initial']['menu']['selectedChoices']==['Padang Padang','Big','Mid','Calm','Midday']
 expected={'report.json'};pngbytes=0
 for name,triple in zip(('interior','side'),result['triples']):
  assert triple['complete'] and triple['camera']==name and triple['fixedPose']==inputs['fixedCameras'][name] and triple['stepCount']==0
  assert triple['seaTime']==reference['epoch']['seaTime'] and triple['baselineRepeatAfterAPixelsIdentical'] and triple['baselineRepeatAfterBPixelsIdentical'] and all(triple['guards'].values())
  programs=triple['shaderEvidence'];assert programs
  for shader in programs:
   assert all(shader[key]for key in('directionTIRGatePreserved','safeNonzeroEnvironmentRayPreserved','sweptDiscardPreserved','vertexShaderUntouchedByDiagnostic','waterShaderUntouchedByDiagnostic','ClassicUntouchedByDiagnostic'))
  assert any(p['variant']=='baseline' and p['baselineUnmodified'] and p['AOff'] and p['BOff'] and p['changedCharacters']==0 for p in programs)
  assert any(p['variant']=='sheet-fill' and p['onlySkyWallMixChanged'] and p['BOff'] and not p['AOff'] and p['changedCharacters']==len(SKY_ONCE)+len(BACK_FILL)-len(SKY)-len(BACK) for p in programs)
  assert any(p['variant']=='throat-bypass' and p['onlyThroatRadianceMultiplierRemoved'] and p['AOff'] and not p['BOff'] and p['changedCharacters']==-len(THROAT) for p in programs)
  for key in ('baseline','sheetFill','throatBypass'):
   artifact=triple[key];assert Path(artifact['file']).name==artifact['file'];expected.add(artifact['file'])
   raw=verify({**artifact,'file':str(out/artifact['file'])});assert raw.startswith(b'\x89PNG\r\n\x1a\n') and len(raw)<=inputs['limits']['pngBytesEach'];pngbytes+=len(raw)
 assert len(result['artifacts'])==6 and pngbytes==result['pngBytes']<=inputs['limits']['pngBytesTotal']
 assert (out/'report.json').stat().st_size<=inputs['limits']['reportBytes'] and {p.name for p in out.iterdir()}==expected
 assert result['acceptance']=={'visualCauseA':None,'visualCauseB':None,'physicalOpticsProof':False,'playability':False,'productionFixAdopted':False}
 return {'steps':0,'pngCount':6,'exactPriorFull37RawFrontAndCurrentActualDrawingGuardsVerified':True,
  'exactFixedInteriorPrimaryAndSideSecondaryCamerasVerified':True,'allFourBaselineRepeatsPixelExact':True,
  'AOnlyEffectiveSkyWallMixAndBOnlyThroatRadianceBypass':True,'originalDiscardDirectionTIRSafeRayAndClassicPreserved':True,
  'ordinaryWaterDepthStencilParameterGuardsVerified':True,'visualCauseOrProductionAdoptionClaim':False}
sealbytes=(W/'seal.json').read_bytes();seal=json.loads(sealbytes);inputs=json.loads((W/'inputs.json').read_bytes())
assert seal['schema']=='matched-sheet-fill-seal/v1' and seal['rootAuthorized'] and seal['complete']
build=json.loads(verify(seal['applicationBuild']));assert build['schema']=='matched-sheet-fill-build/v1' and build['build']==inputs['applicationBuildId']
def check():
 for spec in build['assets']+seal['helpers']+seal['borrowedHelpers']+seal['references']+seal['priorAssetsAndFrozenSources']:verify(spec)
check();assert not (W/'owner.json').exists() and not (W/'candidate-first').exists() and all(free(port)for port in OWNED)
before=identities();assert any(int(row.split()[0])==87796 for row in before['4315']),'Protected4315 PID87796 required'
started=time.monotonic();server=None;proc=None
record={'schema':'matched-sheet-fill-owner/v1','complete':False,'firstFailure':None,'protectedBefore':before,
 'protected4315ExpectedPid':87796,'protected4315RootToolSession':'64713','toolSessionOSIdentityClaim':False,
 'sealSha256':hashlib.sha256(sealbytes).hexdigest(),'preExecutionPinsVerified':True,'postExecutionPinsVerified':False,'cleanupFailures':[]}
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kw):super().__init__(*args,directory=str(W/'dist'),**kw)
 def log_message(self,*args):pass
try:
 server=ThreadingHTTPServer(('127.0.0.1',4301),Handler);server.daemon_threads=True
 thread=threading.Thread(target=lambda:server.serve_forever(poll_interval=.1),daemon=True);thread.start()
 env={**os.environ,'SHEET_FILL_OWNER_SEAL_SHA':record['sealSha256'],'FULL_WRITER_FPS_LAUNCHER_REPORT':str(W/'launcher.json')}
 with (W/'native.log').open('wb')as log:
  proc=subprocess.Popen(['/opt/homebrew/bin/node',str(W/'native.mjs'),'--run=true','--url=http://127.0.0.1:4301/?diagnostics','--out='+str(W/'candidate-first')],stdout=log,stderr=subprocess.STDOUT,start_new_session=True,env=env)
  record['pid']=proc.pid;record['ownedProcessGroup']=proc.pid;(W/'live.json').write_text(json.dumps(record))
  while proc.poll()is None:
   if time.monotonic()-started>inputs['limits']['ownerSeconds']:raise TimeoutError('Finite owner deadline')
   time.sleep(.2)
  record['exitCode']=proc.returncode;assert proc.returncode==0,'Native terminal exit '+str(proc.returncode)
 record['observation']=validate_result(json.loads((W/'candidate-first/report.json').read_bytes()))
 check();record['postExecutionPinsVerified']=True;record['complete']=True
except BaseException as error:record['firstFailure']=type(error).__name__+': '+str(error);record['complete']=False
finally:
 cleanup=time.monotonic()
 if proc:
  try:
   protected={int(row.split()[0])for group in before.values()for row in group};owned=group_members(proc.pid)
   assert not protected.intersection(owned),'Owned process group intersects protected listener PIDs'
   record['ownedMembersBeforeCleanup']=owned
   if owned:
    os.killpg(proc.pid,signal.SIGTERM);end=time.monotonic()+1.5
    while time.monotonic()<end and group_members(proc.pid):time.sleep(.05)
    if group_members(proc.pid):os.killpg(proc.pid,signal.SIGKILL)
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
