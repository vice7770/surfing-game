#!/usr/bin/env python3
"""First-only exact-byte archival of the two source-reconstruction trace versions."""
import datetime,gzip,hashlib,json,pathlib,sys,time,traceback
ROOT=pathlib.Path(__file__).resolve().parent;REPO=ROOT.parents[3]
V1=pathlib.Path('/private/tmp/surf-tube-roof-pair-trace-20261004');V2=pathlib.Path('/private/tmp/surf-tube-roof-pair-trace-v2-20261004')
R1=pathlib.Path('/private/tmp/surf-tube-roof-pair-trace-root-20261004');R2=pathlib.Path('/private/tmp/surf-tube-roof-pair-trace-root-v2-20261004')
began=time.monotonic();cache={};aliases=[];payloads=[];known={};labels=set();pin_count=0
result={'schema':'roof-pair-trace-first-archive-production/v1','valid':False,'scope':'Selected exact byte inputs/source versions/first reports only. No trace, library, compiler, geometry simulation, native job or raster decoding.'}
def h(b):return hashlib.sha256(b).hexdigest()
def get(path):
 p=pathlib.Path(path).resolve(strict=True);key=str(p)
 if key not in cache:
  assert p.is_file() and not pathlib.Path(path).is_symlink();st=p.stat();b=p.read_bytes();after=p.stat()
  assert st.st_size==len(b)==after.st_size and st.st_mtime_ns==after.st_mtime_ns
  cache[key]={'path':key,'bytes':len(b),'sha256':h(b),'body':b}
 return cache[key]
def pin(p):
 global pin_count
 x=get(p['path']);assert (x['bytes'],x['sha256'])==(p['bytes'],p['sha256']),p['path'];pin_count+=1;return x
try:
 assert not (ROOT/'manifest.json').exists(),'Fresh first archive required'
 a=json.loads(get(V1/'offline-first/report.json')['body']);b=json.loads(get(V2/'offline-first/report.json')['body'])
 assert get(V2/'offline-first/report.json')['sha256']=='7c05e4ed03f7e4c8a19b780de2497d4475406627b4974a5c7d06452ce817706d'
 shared_manifest=REPO/'docs/research/performance-2026-10-04/zero-mask/manifest.json'
 shared=json.loads(get(shared_manifest)['body']);sharedby={(e['original']['bytes'],e['original']['sha256']):e for e in shared['entries']}
 def retain(label,path,pinned=None):
  assert label not in labels;labels.add(label);x=pin(pinned) if pinned else get(path);key=(x['bytes'],x['sha256'])
  if key not in known:
   existing=sharedby.get(key)
   if existing:
    original=get(existing['durablePath']);stored=original['body'];assert len(stored)==existing['storedBytes'] and h(stored)==existing['storedSha256']
    decoded=gzip.decompress(stored) if existing['encoding']=='gzip' else stored
    assert decoded==x['body'],'Shared durable byte alias differs'
    row={'id':x['sha256'],'bytes':x['bytes'],'sha256':x['sha256'],'storage':'shared-durable','storedPath':str(pathlib.Path(existing['durablePath']).relative_to(REPO)),'encoding':existing['encoding'],'storedBytes':len(stored),'storedSha256':h(stored)}
   else:
    encoded='gzip' if pathlib.Path(path).suffix in ('.json','.bin') and x['bytes']>=16384 else 'identity'
    stored=gzip.compress(x['body'],compresslevel=6,mtime=0) if encoded=='gzip' else x['body'];assert (gzip.decompress(stored) if encoded=='gzip' else stored)==x['body']
    rel='payloads/'+x['sha256']+('.gz' if encoded=='gzip' else '.raw');p=ROOT/rel;p.parent.mkdir(exist_ok=True)
    with p.open('xb') as f:f.write(stored)
    row={'id':x['sha256'],'bytes':x['bytes'],'sha256':x['sha256'],'storage':'local','storedPath':rel,'encoding':encoded,'storedBytes':len(stored),'storedSha256':h(stored)}
   known[key]=row;payloads.append(row)
  aliases.append({'label':label,'originalPath':str(path),'bytes':x['bytes'],'sha256':x['sha256'],'payload':known[key]['id']})
 retain('trace-v1/report.json',V1/'offline-first/report.json');retain('trace-v2/report.json',V2/'offline-first/report.json')
 retain('root-v2/current-source-observation.json',R2/'current-source-observation.json')
 for v,w,r in [('v1',V1,R1),('v2',V2,R2)]:
  for name in ['trace.mjs','README.md','plan.json']:retain('trace-'+v+'/'+name,w/name)
  retain('root-'+v+'/first.py',r/'first.py');retain('root-'+v+'/receipt.json',r/'first/receipt.json')
  receipt=json.loads(get(r/'first/receipt.json')['body'])
  for c in receipt['commands']:retain('root-'+v+'/'+c['label']+'.log',c['log']['path'],c['log'])
  for p in receipt['helpers']+receipt['authorityMetadata']:pin(p)
 # Preserve all and only trace input pins, including the nine consumed immutable originals.
 paths={x['originalPath'] for x in aliases}
 for p in b['inputPins']+a['inputPins']:
  pin(p)
  if p['path'] not in paths:
   retain('input/'+str(len(paths))+'/'+pathlib.Path(p['path']).name,p['path'],p);paths.add(p['path'])
 # Historical original source paths are byte aliases to frozen copies, not current repository reads.
 for i,authority in enumerate(b['sourceAuthorities']):
  copy=pin(authority['immutableCopy']);old=authority['originalPin'];assert (old['bytes'],old['sha256'])==(copy['bytes'],copy['sha256'])
  aliases.append({'label':'historical-source/'+str(i),'originalPath':old['path'],'bytes':old['bytes'],'sha256':old['sha256'],'payload':copy['sha256'],'scope':'Historical original path provenance; bytes supplied by immutable copy. Current repository path is not read or asserted unchanged.'})
 sourcepins=[]
 for name in ['archive-first.py','first-pass.py','verify.py']:
  x=get(ROOT/name);sourcepins.append({'path':name,'bytes':x['bytes'],'sha256':x['sha256']})
 points=[x for x in b['comparison']['points'] if x['point'] in (83,86)]
 summary={'schema':'roof-pair-trace-retained-outcome/v1','traceCompleted':True,'rows':[r['row'] for r in b['rows']],
          'originalNativeFailure':b['originalFailure'],'firstTraceFailure':b['priorTraceFirstFailure'],
          'rowQueries':[r['query'] for r in b['rows']],'corePointsCheckedPerRow':[r['corePointsChecked'] for r in b['rows']],
          'reportedAllCoreYWordsMatch':[r['wholeCoreProfileYWordsMatch'] for r in b['rows']],
          'reportedScheduleWordsMatch':b['schedule']['allFrontSigmaTauF32WordsMatch'],'emittedRows':b['schedule']['emittedRows'],
          'selectedScalarDecompositions':points,'sourcePrototypeImplemented':False,
          'nativeCaptureComplete':False,'nineStateQuality':False,'tubeQuality':False,'fpsGate':False,'adoption':False,'geometryRepaired':False,
          'visibleArtifactReproduced':False,'exactFragmentCauseAttributed':False,'finCauseProved':False,'directOriginalF64QueryObservation':False,
          'scope':'Original-source deterministic reconstruction from retained F32 input records; F64 queries were reconstructed, not directly observed. Scalar phase/size decomposition uses both hypothetical orders and is not a physical/visual pass, causal percentage, implemented smoothing prototype or runtime adoption.'}
 with (ROOT/'outcome.json').open('x') as f:json.dump(summary,f,indent=2);f.write('\n')
 m={'schema':'roof-pair-trace-archive/v1','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'payloads':payloads,'aliases':aliases,'plainSources':sourcepins,
    'traceV2ReportSha256':get(V2/'offline-first/report.json')['sha256'],
    'additionalCurrentSourceObservation':'Parent read-only tool613d46; archived root-v2/current-source-observation.json. Point-in-time equality receipt only; no current-source assertion by default verifier or indefinite runtime equivalence.',
    'selectedImmutableOriginalSources':b['sourceAuthorities'],'selectedInputPins':b['inputPins'],
    'omissions':['All unused production source/dependency/compiler/runtime bodies and all unselected dist/typed payloads are omitted. Original authority metadata/paths/hashes in unchanged reports are references only.','All PNG payloads are omitted. Original camera/PNG byte hash reference is metadata-only; no raster/image read, replay, video reproduction or visual-quality proof.'],
    'fullRuntimeReplayClosure':False,'allNativePayloadsRetained':False,'pngPayloadsRetained':False,
    'counts':{'payloads':len(payloads),'localPayloads':sum(x['storage']=='local' for x in payloads),'sharedDurablePayloads':sum(x['storage']=='shared-durable' for x in payloads),'aliases':len(aliases),'selectedOriginalSources':9,'selectedTypedPaths':sum('/fields/' in p['path'] for p in b['inputPins'])},
    'firstCreation':{'pinsVerified':pin_count,'uniquePathsReadOnce':len(cache),'uniqueBytesRead':sum(x['bytes'] for x in cache.values())},
    'scope':'Durable selected input identity and reports/source versions only. Default verifier reads retained local/shared archive bodies and checks raw F32 schedule/pair words; never imports, compiles or reruns trace/game/solver/native code.'}
 with (ROOT/'manifest.json').open('x') as f:json.dump(m,f,indent=2);f.write('\n')
 assert sum(p.stat().st_size for p in ROOT.rglob('*') if p.is_file())<=16777216
 result.update(valid=True,counts=m['counts'],firstCreation=m['firstCreation'],manifestSha256=h((ROOT/'manifest.json').read_bytes()),outcomeSha256=h((ROOT/'outcome.json').read_bytes()))
except BaseException as error:result['firstFailure']=type(error).__name__+': '+str(error);result['traceback']=traceback.format_exc()[-8192:]
result['elapsedSeconds']=time.monotonic()-began
print(json.dumps(result,indent=2));sys.exit(0 if result['valid'] else 1)
