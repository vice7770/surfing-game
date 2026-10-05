#!/usr/bin/env python3
"""First-only byte-preserving archive composition. Does not execute candidate code/resources."""
from pathlib import Path
import gzip,hashlib,io,json,os
HERE=Path(__file__).resolve().parent;REPO=HERE.parents[2];OLD=HERE.parent/'tube-stability-2026-10-04'
S=Path('/private/tmp/tube-bounded-c-retirement-boundary-20261005/cap-prefix-v2');N=Path('/private/tmp/tube-bounded-c-retirement-boundary-native-20261005');V=Path('/private/tmp/tube-stable-x-ordinary-rider-v4-20261005');A=Path('/private/tmp/tube-stable-x-object-attribution-native-20261005');C=Path('/private/tmp/tube-retirement-boundary-actual-comparison-20261005');P=Path('/private/tmp/tube-retirement-boundary-root-pixel-review-20261005');R=Path('/private/tmp/tube-stable-x-ordinary-rider-v4-evidence-review-20261005');M=Path('/private/tmp/tube-retirement-adoption-map-20261005')
assert not (HERE/'manifest.json').exists(),'First-only archive; never overwrite'
def fp(b):return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def pin(p):return {'file':str(p),**fp(p.read_bytes())}
def check(q):assert fp(Path(q['file']).read_bytes())=={k:q[k] for k in ['bytes','sha256']},q['file']
files=[];references=[];originMap={};selected={}
def add(original,relative,compressed=False,role='evidence'):
 original=Path(original).resolve();b=original.read_bytes();path=HERE/relative;assert not path.exists(),path;path.parent.mkdir(parents=True,exist_ok=True)
 if compressed:
  z=io.BytesIO()
  with gzip.GzipFile(fileobj=z,mode='wb',filename='',mtime=0,compresslevel=9) as f:f.write(b)
  stored=z.getvalue();assert gzip.decompress(stored)==b
 else:stored=b
 path.write_bytes(stored);q={'originalPath':str(original),'path':relative,'encoding':'gzip' if compressed else 'identity','stored':fp(stored),'decoded':fp(b),'role':role};files.append(q);originMap[str(original)]=q;return q
# Exact references to earlier durable postimages and baseline sidecars, rather than nested archive copies.
prior=[]
for base in ['stable-X-native','geometric-carrier-native','parallel-physical-native','shared-sheet','bounded-c-profile']:
 mp=OLD/base/'manifest.json'
 if not mp.is_file():continue
 j=json.loads(mp.read_text())
 for q in j.get('files',[])+j.get('externalFiles',[]):
  if not all(k in q for k in ['path','encoding','decoded']):continue
  stored=q.get('transport',q.get('stored'))
  if not stored:continue
  p=(mp.parent/q['path']).resolve()
  if p.is_file() and p.is_relative_to(OLD):prior.append((mp,p,q,stored))
def refer_exact(original,role):
 original=Path(original).resolve();b=original.read_bytes();matches=[q for q in prior if q[2]['decoded']==fp(b)]
 if not matches:return None
 mp,p,q,stored=matches[0];raw=p.read_bytes();assert fp(raw)==stored;assert fp(gzip.decompress(raw) if q['encoding']=='gzip' else raw)==fp(b)
 r={'originalPath':str(original),'path':os.path.relpath(p,HERE),'encoding':q['encoding'],'stored':stored,'decoded':fp(b),'role':role,'priorManifest':{'path':os.path.relpath(mp,HERE),**fp(mp.read_bytes())}};references.append(r);originMap[str(original)]=r;return r
mapj=json.loads((M/'comparison.json').read_text());assert len(mapj['runtime'])==15 and len(mapj['testsAndFixtures'])==15
for q in mapj['runtime']+mapj['testsAndFixtures']:
 check(q['candidate'])
 if q['current']:check(q['current'])
# Candidate source bundle: all fifteen coordinated runtime postimages and fourteen tests/one fixture.
for q in mapj['runtime']+mapj['testsAndFixtures']:
 source=Path(q['candidate']['file']);r=refer_exact(source,'coordinated-runtime-postimage' if q in mapj['runtime'] else 'focused-test-or-fixture-postimage')
 if r is None:r=add(source,'source/postimages/'+q['path'],source.suffix=='.json','coordinated-runtime-postimage' if q in mapj['runtime'] else 'focused-test-or-fixture-postimage')
 selected[q['path']]={'status':q['status'],'candidate':r,'current':q['current']}
# Exact preimages for the two incremental runtime files are previous stable-X evidence where available.
for name in ['sweptLoft.ts','sweptContact.ts']:
 source=Path('/private/tmp/tube-bounded-c-stable-x-sampling-20261005/source/src/wave/barrel')/name
 if refer_exact(source,'stable-X-incremental-runtime-preimage') is None:add(source,'source/preimages/src/wave/barrel/'+name,False,'stable-X-incremental-runtime-preimage')
for name in ['README.md','readiness.json','source-pins.json','payload-pins.json','runtime.patch','tests.patch','cap-prefix.patch','source-checks.json','cpu-validation.json','final-tests.json','retirement-final.json','carrier-final.json','sampling-final.json','cap-final.json','cap-fixture.json','cap-fixture-tests.json','cap-initial-tests.json','cap-initial.log','typed-comparator-initial-cpu-validation.json','typed-comparator-initial-final-tests.json']:
 add(S/name,'source/receipts/'+name+('.gz' if name.endswith('.json') else ''),name.endswith('.json'),'source-preparation-receipt')
for name in ['README.md','readiness.json','cpu-validation.json','final-tests.json','contact-final.json','runtime.patch','tests.patch']:
 base=S.parent;add(base/name,'source/predecessor/'+name+('.gz' if name.endswith('.json') else ''),name.endswith('.json'),'retirement-V1-predecessor-receipt')
for name in ['README.md','comparison.json','analysis-pins.json']:add(M/name,'adoption/'+name+('.gz' if name.endswith('.json') else ''),name.endswith('.json'),'adoption-map')
for name in ['readiness.json','root-complete-build-result.json','root-build-result.json','seal.json','helper-pins.json','new-source-contract-checks.json','cpu-validation.json','run.py','native.mjs','README.md','candidate-first-owner.json','candidate-first-owner.log']:
 add(N/name,'retirement/manifests/'+name+('.gz' if name.endswith('.json') else ''),name.endswith('.json'),'retirement-root-build-native-receipt')
report=json.loads((N/'candidate-first/report.json').read_text());owner=json.loads((N/'candidate-first-owner.json').read_text());assert report['complete'] and owner['complete'] and owner['exitCode']==0 and report['stop']['movingStep']==70
add(N/'candidate-first/report.json','retirement/capture/report.json.gz',True,'actual-retirement-report')
for q in report['artifacts']:
 check({'file':str(N/'candidate-first'/q['file']),**{k:q[k] for k in ['bytes','sha256']}});add(N/'candidate-first'/q['file'],'retirement/capture/'+q['file'],False,'actual-retirement-media')
for q in report['loftSnapshots']:check({'file':str(N/'candidate-first'/q['file']),**{k:q[k] for k in ['bytes','sha256']}});add(N/'candidate-first'/q['file'],'retirement/capture/'+q['file']+'.gz',True,'actual-retirement-word-sidecar')
add(N/'candidate-first/launcher.json','retirement/capture/launcher.json',False,'actual-retirement-launcher')
for name in ['README.md','analysis.json','analyze.py']:add(C/name,'retirement/comparison/'+name+('.gz' if name.endswith('.json') else ''),name.endswith('.json'),'actual-retirement-comparison')
for name in ['README.md','result.json','audit.py']:add(C/'owner-review'/name,'retirement/comparison/owner-review/'+name+('.gz' if name.endswith('.json') else ''),name.endswith('.json'),'actual-retirement-owner-review')
for name in ['inspection.json','decode-receipt.json','ffprobe.json','ffprobe-stderr.txt','movie-frame-01.png','movie-frame-02.png','movie-frame-03.png','movie-frame-04.png','movie-frame-05.png']:add(P/name,'retirement/pixels/'+name,False,'actual-retirement-pixel-review')
# Exact attribution baseline report used by the numerical comparison; identical loft words reference stable-X durable payloads.
for name in ['candidate-first/report.json','candidate-first-owner.json','seal.json','moving-shape.mjs']:
 add(A/name,'retirement/comparison/baseline/'+name.replace('/','--')+('.gz' if name.endswith('.json') else ''),name.endswith('.json'),'exact-attribution-comparison-input')
for name in ['loft-initial.json','loft-first-phase2.json']:
 assert refer_exact(A/'candidate-first'/name,'exact-attribution-baseline-sidecar') is not None
vreport=json.loads((V/'candidate-first/report.json').read_text());vowner=json.loads((V/'candidate-first-owner.json').read_text());assert vreport['complete'] and vowner['complete'] and vowner['exitCode']==0 and vreport['stepCount']==1366
for name in ['readiness.json','seal.json','helper-pins.json','candidate-first-owner.json','candidate-first-owner.log','root-pixel-inspection.json','menu-startup.mjs','follower-camera.mjs','rider-driver.mjs','control-policy.mjs','native.mjs','run.py','README.md']:
 add(V/name,'ordinary-V4/manifests/'+name+('.gz' if name.endswith('.json') else ''),name.endswith('.json'),'ordinary-V4-preparation-native-receipt')
for name in ['report.json','steps.ndjson','loft-initial.json','loft-terminal.json']:add(V/'candidate-first'/name,'ordinary-V4/capture/'+name+'.gz',True,'actual-ordinary-V4-words-or-report')
for q in vreport['artifacts']:
 if q['file'].endswith('.png'):check({'file':str(V/'candidate-first'/q['file']),**{k:q[k] for k in ['bytes','sha256']}});add(V/'candidate-first'/q['file'],'ordinary-V4/capture/'+q['file'],False,'actual-ordinary-V4-PNG')
add(V/'candidate-first/launcher.json','ordinary-V4/capture/launcher.json',False,'actual-ordinary-V4-launcher')
for name in ['README.md','review.json','analyze.py','analyze-first-failed.py','analysis-repair.txt']:add(R/name,'ordinary-V4/review/'+name+('.gz' if name.endswith('.json') else ''),name.endswith('.json'),'actual-ordinary-V4-evidence-review')
# Documentation/verifier are generated archive artifacts, with hashes bound by this manifest.
for name in ['README.md','verify.py','build-archive.py','verification-preparation.txt']:
 p=HERE/name;b=p.read_bytes();files.append({'path':name,'encoding':'identity','stored':fp(b),'decoded':fp(b),'role':'generated-archive-document-or-verifier','generated':True})
manifest={'schema':'tube-retirement-and-ordinary-V4-archive/v1','source':'Completed retirement cap-prefix V2 and ordinary rider V4; active V5/contact observer and shader work excluded','files':files,'exactPriorArchiveReferences':references,'sourceBundle':selected,'priorStableXArchiveManifest':{'path':'../tube-stability-2026-10-04/stable-X-native/manifest.json',**fp((OLD/'stable-X-native/manifest.json').read_bytes())},'acceptance':{'tubeQuality':False,'mouthVisibility':False,'bodyPassage':False,'ordinaryLanding':False,'FPS':False,'productionAdoption':False},'currentProductionGeometry':'RAW','coordinatedRuntimeBundleRequired':15,'newGameSourceOrResourcesChanged':False,'fullSourceDependenciesOrBuildReconstructionClaim':False,'omitted':['Complete game source/dependency payloads and application asset bodies','Borrowed native helpers/source inputs not selected above; recorded absolute pins are provenance, not included payloads','Active V5 diagnostic capture/source/module and active shader experiments','Unselected historical test failures and derived evidence; their references are retained in original receipts'],'storedByteCap':30*1024*1024,'counts':{'localPayloadFiles':len(files),'priorExactReferences':len(references),'runtimePostimages':15,'testPostimages':14,'fixtures':1,'retirementPNGs':6,'retirementMovies':1,'retirementWordSidecars':2,'derivedMovieFrames':5,'ordinaryV4PNGs':2,'ordinaryV4WordSidecars':2,'ordinaryV4Steps':1366},'bytes':{'storedPayload':sum(q['stored']['bytes'] for q in files),'decodedLocalPayload':sum(q['decoded']['bytes'] for q in files)}}
(HERE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
assert sum(p.stat().st_size for p in HERE.rglob('*') if p.is_file())<30*1024*1024,'Archive cap exceeded'
for q in files:
 if 'originalPath' in q:assert fp(Path(q['originalPath']).read_bytes())==q['decoded']
print(json.dumps({'complete':True,'localPayloadFiles':len(files),'exactPriorReferences':len(references),'storedPayloadBytes':manifest['bytes']['storedPayload'],'decodedLocalPayloadBytes':manifest['bytes']['decodedLocalPayload'],'storedUnder30MiB':True,'runtimeFiles':15,'tests':14,'fixtures':1,'actualPNGs':8,'actualMovies':1,'actualWordSidecars':4,'activeV5AndShadersIncluded':False}))
