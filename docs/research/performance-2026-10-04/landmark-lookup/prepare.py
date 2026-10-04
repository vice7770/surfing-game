#!/usr/bin/env python3
"""Future root-owned evidence bytes only; no game/helper replay. Default prints an unarmed plan."""
from pathlib import Path
from datetime import datetime, timezone
import argparse,gzip,hashlib,json,os,signal,subprocess,time
R=Path('/Users/regina/Desktop/Projects/surfing-game')
W=Path('/private/tmp/surf-landmark-lookup-archive-20261004')
A=R/'docs/research/performance-2026-10-04/landmark-lookup'
P=A.parent/'primary-f32'
CPU=Path('/private/tmp/surf-landmark-lookup-20261004')
N=Path('/private/tmp/surf-landmark-lookup-native-20261004')
FREEZE=Path('/private/tmp/surf-landmark-lookup-native-first-freeze-observation-20261004.json')
C='0b17d603cb8d7b06bc60a56e599f06f4f362afd5'
CPU_SHA='d08b76435e082f89abc7744f8d868a107e78899b64444aaf7ec28d27f5f5c6f0'
NATIVE_SHA='98c9d66f6ac5b190c1887c578695d41f434bd26e270a4aec3967f7aa0e244fb5'
BINDING_SHA='8bb28e766d07f2fd404b5f8cf8c522c712f8898bb8ce81513263f5fb636bd6ca'
REPORT_SHA='ef9f9a542548c20f724a7f1a171be2e6db837cebf9db3f0977e63d8b6149f50b'
P_MANIFEST_SHA='42f72d3585a1430a57194a3f679f549620b74dec2d40505c8aab52c54392a8dd'
def check(v,msg):
 if not v:raise AssertionError(msg)
def sha(b):return hashlib.sha256(b).hexdigest()
def read(p):return json.loads(p.read_text())
def record(p,b=None):
 b=p.read_bytes() if b is None else b
 return {'path':str(p),'bytes':len(b),'sha256':sha(b)}
def now():return datetime.now(timezone.utc).isoformat()
parser=argparse.ArgumentParser();parser.add_argument('--run',action='store_true');args=parser.parse_args()
if not args.run:
 print(json.dumps({'sourceOnlyPlan':True,'archive':str(A),'cpu':str(CPU),'native':str(N),'requiresExclusiveRootArchiveLease':True,'hashStarted':False,'compressionStarted':False,'helperImport':False,'nativeStarted':False}));raise SystemExit(0)
check(os.environ.get('ROOT_LANDMARK_LOOKUP_ARCHIVE_LEASE')=='true','Exclusive root archive lease required; no concurrent heavy/native work')
check(A.is_dir() and not (A/'manifest.json').exists() and not (A/'payloads').exists(),'Fresh archive content only; preserve first outcome')
first=W/'prepare-first.json';check(not first.exists(),'First preparation only; no automatic retry')
started=time.monotonic();terminal={'schema':'landmark-lookup-archive-first-prepare/v1','valid':False,'startedAt':now(),'firstFailure':None,'scope':'Only retained-byte reads/hashes/deterministic compression and immutable Git data; no game/helper imports or replay.'}
def save_terminal():first.write_text(json.dumps(terminal,indent=2)+'\n')
def timeout(signum,frame):raise TimeoutError('Fixed120s evidence preparation bound; no replay/retry')
signal.signal(signal.SIGALRM,timeout);signal.setitimer(signal.ITIMER_REAL,120);save_terminal()
payloads={};aliases={};gitrefs={};encoded_checked=set();directories=files=0;blob_proc=None
try:
  # Existing durable archive is immutable authority, not a source tree to recopy.
  primary_bytes=(P/'manifest.json').read_bytes();check(sha(primary_bytes)==P_MANIFEST_SHA,'Reviewed primary-F32 manifest identity');old=json.loads(primary_bytes)
  existing={(p['contentSha256'],p['contentBytes']):p for p in old['payloads']}
  old_git={}
  for p in old['gitReferences']:old_git.setdefault((p['originalPath'],p['bytes'],p['sha256']),[]).append(p)
  tree={}
  for row in subprocess.check_output(['git','ls-tree','-r','-z',C],cwd=R).split(b'\0'):
   if row:
    meta,path=row.split(b'\t',1);mode,kind,blob=meta.decode().split();check(kind=='blob','Repository content authority is a blob');tree[path.decode()]=blob
  blob_proc=subprocess.Popen(['git','cat-file','--batch'],cwd=R,stdin=subprocess.PIPE,stdout=subprocess.PIPE)
  blob_cache={}
  def blob_bytes(blob):
   if blob not in blob_cache:
    blob_proc.stdin.write((blob+'\n').encode());blob_proc.stdin.flush();head=blob_proc.stdout.readline().decode().split();check(head[:2]==[blob,'blob'],'Immutable Git blob header');b=blob_proc.stdout.read(int(head[2]));check(blob_proc.stdout.read(1)==b'\n','Git delimiter');blob_cache[blob]=b
   return blob_cache[blob]
  (A/'payloads').mkdir()
  def add(p,expected=None,role='retained evidence'):
   global files
   p=Path(p);check(p.is_absolute() and p.is_file() and not p.is_symlink(),'Owned or frozen regular input '+str(p));b=p.read_bytes();actual=record(p,b)
   if expected is not None:check(actual==expected,'Active frozen identity '+str(p))
   if str(p) in aliases:
    check(aliases[str(p)]['bytes']==actual['bytes'] and aliases[str(p)]['sha256']==actual['sha256'],'Duplicate alias identity '+str(p));return actual
   key=(str(p),actual['bytes'],actual['sha256']);candidates=old_git.get(key,[])
   if candidates:
    ref=next((x for x in candidates if x['commit']==C),candidates[0]);check(blob_bytes(ref['blob'])==b,'Existing immutable Git ref matches active bytes');gitrefs[(str(p),actual['sha256'])]=ref;return actual
   try:rel=p.relative_to(R).as_posix()
   except ValueError:rel=None
   if rel in tree and not rel.startswith('node_modules/'):
    if blob_bytes(tree[rel])==b:
     ref={'originalPath':str(p),'repositoryPath':rel,'commit':C,'blob':tree[rel],'bytes':len(b),'sha256':actual['sha256']};gitrefs[(str(p),actual['sha256'])]=ref;return actual
   content=(actual['sha256'],len(b))
   if content not in payloads:
    borrowed=existing.get(content)
    if borrowed:
     source=(P/borrowed['path']).resolve();check(source.is_relative_to(A.parent),'Adjacent existing payload scope');encoded=source.read_bytes()
     if str(source) not in encoded_checked:
      check(len(encoded)==borrowed['bytes'] and sha(encoded)==borrowed['sha256'],'Existing encoded payload');check(gzip.decompress(encoded)==b,'Existing decoded payload');encoded_checked.add(str(source))
     payload={**borrowed,'path':os.path.relpath(source,A),'existingArchiveReference':True,'sourceArchive':'primary-f32 or its declared adjacent worker-cpu-profile reference'}
    else:
     encoded=bytearray(gzip.compress(b,compresslevel=9,mtime=0));encoded[9]=255;encoded=bytes(encoded);target=A/'payloads'/(actual['sha256']+'.gz');target.write_bytes(encoded);payload={'path':target.relative_to(A).as_posix(),'bytes':len(encoded),'sha256':sha(encoded),'contentBytes':len(b),'contentSha256':actual['sha256'],'existingArchiveReference':False,'codec':'gzip mtime0/no filename/OS255/level9'}
    payloads[content]=payload
   aliases[str(p)]={'originalPath':str(p),'bytes':len(b),'sha256':actual['sha256'],'payload':payloads[content]['path'],'role':role};files+=1;check(files<=2048,'Bounded physical alias inventory')
   return actual
  cr=add(CPU/'ready.json',{'path':str(CPU/'ready.json'),'bytes':127148,'sha256':CPU_SHA},'Exact first CPU ready');nr=add(N/'ready.json',role='Exact first native ready');check(nr['sha256']==NATIVE_SHA,'Native ready');binding=add(N/'bindings.json',role='Root reviewed actual build bindings');check(binding['sha256']==BINDING_SHA,'Native bindings');native_report=add(N/'native-first/report.json',{'path':str(N/'native-first/report.json'),'bytes':22276,'sha256':REPORT_SHA},'First four-arm native result')
  cpu_ready=read(CPU/'ready.json');native_ready=read(N/'ready.json')
  check(cpu_ready['canonicalRuntimeCheckpoint']==native_ready['runtimeCheckpoint']==C,'Exact accepted runtime source checkpoint')
  check(cpu_ready['virtual']==native_ready['runtimeVirtual'] and len(cpu_ready['virtual'])==2 and not native_ready['priorTestVirtual'],'Exactly two F64 lookup overlays, no test/F32 overlays')
  for root_ready in [cpu_ready,native_ready]:
   for p in root_ready['inputs']:add(Path(p['path']),p,'Active frozen input; borrowed JSON nested ancestors remain metadata')
  def add_directory(root):
   global directories,files
   for current,dirs,names in os.walk(root):
    directories+=1;check(directories<=128,'Bounded owned result directories');check(not any((Path(current)/d).is_symlink() for d in dirs),'No recursive directory links')
    for name in sorted(names):
     p=Path(current)/name;check(not p.is_symlink(),'No recursive file links');add(p,role='Actual first owned source/output/result')
  for root in [CPU,N]:
   for p in sorted(root.iterdir()):
    if p.is_file() and not p.is_symlink():add(p,role='Owned frozen source and first top-level output')
  for name in ['compiled','root-checks-first','root-proof-first','root-cost-first','proof-first','cost-first']:add_directory(CPU/name)
  for name in ['root-checks-first','native-first']:add_directory(N/name)
  manifests={}
  for arm in ['baseline','candidate']:
   mpath=N/arm/'build-manifest.json';add(mpath,role='Actual first native build manifest');m=read(mpath);manifests[arm]=m;check(len(m['outputs'])==10,'Ten original production outputs per arm')
   for p in m['outputs']:add(Path(m['outputRoot'])/p['path'],{'path':str(Path(m['outputRoot'])/p['path']),'bytes':p['bytes'],'sha256':p['sha256']},'Actual emitted native output')
  freeze_observation=add(FREEZE,role='Structured original root first-freeze observation; raw transcript/duration unavailable')
  attribution=add(N/'root-native-attribution.json',role='Root first native decision and original output observation')
  first_data=read(FREEZE);attr=read(N/'root-native-attribution.json');check(first_data['terminalExitCode']==0 and first_data['readySha256']==NATIVE_SHA,'First observed root freeze');check(attr['executionValid'] and not attr['candidateAdopted'] and not attr['qualityEligible'] and not attr['nativeQualityExecuted'],'Explicit first rejection/no quality execution')
  # Recheck every direct active input after all retention work, never nested expired capture artifacts.
  for r in [cpu_ready,native_ready]:
   for p in r['inputs']:check(record(Path(p['path']))==p,'Frozen input remained unchanged '+p['path'])
  payload_list=sorted(payloads.values(),key=lambda p:p['path']);refs=sorted(gitrefs.values(),key=lambda p:(p['originalPath'],p['sha256']));alias_list=sorted(aliases.values(),key=lambda p:p['originalPath'])
  physical_roots=[str(CPU),str(N)]
  counts={'payloads':len(payload_list),'aliases':len(alias_list),'immutableGitReferences':len(refs),'localGzipPayloads':sum(not p['existingArchiveReference'] for p in payload_list),'existingGzipReferences':sum(p['existingArchiveReference'] for p in payload_list),'localEncodedBytes':sum(p['bytes'] for p in payload_list if not p['existingArchiveReference'])}
  historical='All active direct frozen inputs and actual CPU/native outputs are durable. Borrowed earlier JSON is exact by its direct input pin, but nested historical capture/source/compilation records remain metadata; expired/overwritten ancestors are not rebuilt or claimed replayable. The held fixture is an older paused F32 SET1 export at b0e003 with omitted NU/RATEH/TKE and fresh body/particles; current replay uses0b17 F64 source and sparse early fronts, not an actual late101-front/WGSL/native proof.'
  sources=[]
  for name in ['prepare.py','verify.py']:sources.append({**record(A/name),'path':name})
  manifest={'schema':'landmark-lookup-evidence-archive/v1','repository':str(R),'runtimeCommit':C,'cpuRoot':str(CPU),'nativeRoot':str(N),'activeOwnedRoots':physical_roots,'cpuReady':cr,'nativeReady':nr,'bindings':binding,'nativeReport':native_report,'firstFreezeObservation':freeze_observation,'nativeAttribution':attribution,'publicWhitelist':native_ready['publicAssets']['path'],'existingArchiveManifest':{'path':'../primary-f32/manifest.json','bytes':len(primary_bytes),'sha256':P_MANIFEST_SHA},'payloads':payload_list,'aliases':alias_list,'gitReferences':refs,'plainSources':sources,'counts':counts,'historicalAncestryQualification':historical,'unfrozenQuality':{'directory':'/private/tmp/surf-landmark-lookup-quality-20261004','retained':False,'frozen':False,'executed':False,'eligibility':False,'qualification':'Thirteen separately prepared source files remain untouched, unfrozen and unexecuted after native rejection; no accepted quality outcome.'},'scope':'Offline bytes/arithmetic archive only, no game/helper replay, benchmark/build/browser/native retry or runtime adoption.'}
  outcome={'schema':'landmark-lookup-evidence-outcome/v1','runtimeAdopted':False,'nativeQualityExecuted':False,'qualityEligible':False,'timingRetryPerformed':False,'cpu':{'firstChecksPassed':True,'firstProofPassed':True,'firstCostPassed':True,'meanSavingPerStepMs':.4023099062500055,'heuristicLower95Ms':.27214296085627665,'qualification':'Sparse paused F32 fixture/current F64 mockhost replay; most positive cost savings occur empty-contact, not causal active/late101/native FPS evidence.'},'native':{'executionValid':True,'fourRenderedFps':[60,60,60,60],'physicsStepsPerWallSecond':[59.89,59.87,59.7,59.49],'totalP50':[12.5,15,15.5,13.6],'renderP95':[24.4,24.8,24.9,17.5],'conclusion':'Complete pipeline median and render p95 worsen in both candidate orders; physics-rate effect changes sign. No consistent native whole-game gain, stable60Hz physics or moving tube-quality acceptance.'},'historicalAncestryQualification':historical,'sourceObservationQualification':first_data['qualification'],'counts':counts}
  (A/'outcome.json').write_text(json.dumps(outcome,indent=2)+'\n');(A/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
  terminal.update(valid=True,counts=counts,manifest=record(A/'manifest.json'),outcome=record(A/'outcome.json'),activeInputsUnchanged=True,noRuntimeReplay=True)
except BaseException as error:terminal['firstFailure']=repr(error)[:4096]
finally:
 if blob_proc is not None:
  if blob_proc.stdin and not blob_proc.stdin.closed:blob_proc.stdin.close()
  try:terminal['gitBatchExitCode']=blob_proc.wait(timeout=max(.001,120-(time.monotonic()-started)))
  except subprocess.TimeoutExpired:blob_proc.kill();blob_proc.wait(timeout=1);terminal['valid']=False;terminal['firstFailure']=terminal['firstFailure'] or 'Archive immutable-Git read deadline'
 terminal['elapsedSeconds']=time.monotonic()-started;terminal['endedAt']=now();save_terminal();signal.setitimer(signal.ITIMER_REAL,0)
print(json.dumps({'valid':terminal['valid'],'firstFailure':terminal['firstFailure'],'receipt':str(first),'archive':str(A),'counts':terminal.get('counts')}));raise SystemExit(0 if terminal['valid'] else 1)
