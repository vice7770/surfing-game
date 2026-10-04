#!/usr/bin/env python3
"""First-only exact-byte archival production. Omitted runtime bodies stay metadata-only."""
import datetime, gzip, hashlib, json, pathlib, sys, time, traceback

ROOT=pathlib.Path(__file__).resolve().parent
WORK=pathlib.Path('/private/tmp/surf-zero-mask-fps-20261004')
started=time.monotonic();cache={};verified=0
result={'schema':'zero-mask-fps-first-archive-production/v1','valid':False,'scope':'Read/hash once per original path, exact-byte copies/gzip roundtrip only; no game/helper import, replay, build, native process or raster decoding.'}
def h(body):return hashlib.sha256(body).hexdigest()
def identity(path):
    p=pathlib.Path(path).resolve(strict=True)
    if str(p) not in cache:
        assert p.is_file() and not pathlib.Path(path).is_symlink(),str(path)
        st=p.stat();body=p.read_bytes();after=p.stat()
        assert st.st_size==len(body)==after.st_size and st.st_mtime_ns==after.st_mtime_ns,'Input changed during read'
        cache[str(p)]={'path':str(p),'bytes':len(body),'sha256':h(body),'body':body}
    return cache[str(p)]
def pin(rec):
    global verified
    x=identity(rec['path']);assert (x['bytes'],x['sha256'])==(rec['bytes'],rec['sha256']),rec['path'];verified+=1;return x
def pins(obj):
    if isinstance(obj,dict):
        if {'path','bytes','sha256'}<=obj.keys():pin(obj)
        for v in obj.values():pins(v)
    elif isinstance(obj,list):
        for v in obj:pins(v)
try:
    assert not (ROOT/'manifest.json').exists(),'First-only archive requires fresh manifest'
    ready=json.loads(identity(WORK/'ready.json')['body']);binding=json.loads(identity(WORK/'bindings.json')['body'])
    report=json.loads(identity(WORK/'native-first/report.json')['body']);driver=json.loads(identity(WORK/'native-first.native-driver.json')['body'])
    assert identity(WORK/'ready.json')['sha256']=='7c4c016509a373b70b670cb51aa413b83966170c8b8f2f4bb3b063c17d4058be'
    assert identity(WORK/'bindings.json')['sha256']=='2d3128d031b2eeb22d33d4d22919be022f8428d5c4337337a02feebd51ea1db9'
    for obj in (ready,binding,report,driver):pins(obj)
    assert report['valid'] is True and driver['valid'] is True and driver['independentClosureValid'] is True
    payloads=[];aliases=[];dedup={};labelset=set()
    def retain(label,path):
        assert label not in labelset,'Duplicate archive label';labelset.add(label)
        rec=identity(path);body=rec['body'];key=(rec['sha256'],rec['bytes'])
        if key not in dedup:
            encoding='gzip' if pathlib.Path(path).suffix=='.json' and len(body)>=16384 else 'identity'
            stored=gzip.compress(body,compresslevel=6,mtime=0) if encoding=='gzip' else body
            assert (gzip.decompress(stored) if encoding=='gzip' else stored)==body,'Exact gzip roundtrip failed'
            suffix='.gz' if encoding=='gzip' else '.raw';relative='payloads/'+rec['sha256']+suffix
            target=ROOT/relative;target.parent.mkdir(exist_ok=True)
            with target.open('xb') as f:f.write(stored)
            blob={'id':rec['sha256'],'bytes':rec['bytes'],'sha256':rec['sha256'],'storedPath':relative,'encoding':encoding,'storedBytes':len(stored),'storedSha256':h(stored)}
            payloads.append(blob);dedup[key]=blob
        blob=dedup[key]
        aliases.append({'label':label,'originalPath':str(path),'bytes':rec['bytes'],'sha256':rec['sha256'],'payload':blob['id']})
    retain('authority/ready.json',WORK/'ready.json');retain('authority/bindings.json',WORK/'bindings.json')
    for rec in ready['helpers']:retain('helpers/'+pathlib.Path(rec['path']).name,rec['path'])
    for rec in ready['originalMeter']:retain('original-meter/'+pathlib.Path(rec['path']).name,rec['path'])
    retain('original-driver/native-driver.py',ready['originalDriver']['path'])
    retain('dependencies/current-cdp.mjs',ready['cdp']['path']);retain('dependencies/borrowed-cdp.mjs',ready['borrowed']['path'])
    for rec in binding['receipts']:retain('gates/'+pathlib.Path(rec['path']).name,rec['path'])
    retain('gates/root-checks-first.py',WORK/'root-checks-first.py')
    gates=json.loads(identity(WORK/'root-helper-checks.json')['body'])
    for i,cmd in enumerate(gates['commands']):
        pin({'path':cmd['log'],'bytes':cmd['logBytes'],'sha256':cmd['logSha256']})
        retain('gates/command-'+str(i)+'.log',cmd['log'])
    retain('reference/AB-baseline-fps.json',binding['reference']['path'])
    for p in sorted((WORK/'native-first').iterdir()):
        assert p.is_file() and not p.is_symlink(),'Unexpected native output'
        retain('native/'+p.name,p)
    retain('native/driver.json',WORK/'native-first.native-driver.json');retain('native/driver.log',WORK/'native-first.native-driver.log')
    sourcepins=[]
    for name in ['archive-first.py','first-pass.py','late-analysis.py','verify.py']:
        rec=identity(ROOT/name);sourcepins.append({'path':name,'bytes':rec['bytes'],'sha256':rec['sha256']})
    m={'schema':'zero-mask-fps-archive/v1','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
       'readySha256':identity(WORK/'ready.json')['sha256'],'bindingsSha256':identity(WORK/'bindings.json')['sha256'],
       'nativeExecReceipt':'Parent-authoritative CLOSED0 exec chunk079761; retained independent native driver receipt carries observed119.0309075419791s/closure proof.',
       'productionProvenance':'Parent current branch fea73ce7d. Original meter retains working-tree-1099ddaa1/build1099ddaa1-zero-mask-working labels and first root tool observations unchanged.',
       'payloads':payloads,'aliases':aliases,'plainSources':sourcepins,
       'fullProductionSourceRetained':False,'fullCompiledBodiesRetained':False,'completeRuntimeReplayClosure':False,
       'omissions':{
           'currentProductionSources':{'count':592,'retained':False,'pins':ready['sourceFiles'],'scope':'Byte pins verified at first archive creation; bodies omitted. Default durable verifier does not read current repository.'},
           'frozenProductionCopies':{'count':592,'retained':False,'pins':ready['sourceCopies'],'scope':'Temporary source-copy paths are metadata references only; bodies omitted.'},
           'compiledBodies':{'count':49,'retained':False,'pins':ready['compiledFiles'],'scope':'Temporary49 dist/public body paths are metadata references only; actual GET body identity receipts retained. No durable compiled runtime or replay claim.'}},
       'counts':{'payloads':len(payloads),'aliases':len(aliases),'storedPayloadBytes':sum(x['storedBytes'] for x in payloads)},
       'firstCreationVerification':{'pinOccurrencesVerified':verified,'uniquePathsReadOnce':len(cache),'uniqueOriginalBytesRead':sum(x['bytes'] for x in cache.values()),'allOriginalPinnedInputIdentitiesVerified':True},
       'scope':'Exact retained numeric scalar FPS arrays/reports/helpers/first observations and native closure evidence. Original reports remain byte-identical. Full production dependencies/source/dist are not retained; no full runtime capture or replay closure.'}
    with (ROOT/'manifest.json').open('x') as f:json.dump(m,f,indent=2);f.write('\n')
    archivebytes=sum(p.stat().st_size for p in ROOT.rglob('*') if p.is_file());assert archivebytes<=33554432
    result.update(valid=True,payloads=len(payloads),aliases=len(aliases),storedPayloadBytes=m['counts']['storedPayloadBytes'],archiveBytes=archivebytes,manifestSha256=h((ROOT/'manifest.json').read_bytes()),firstCreationVerification=m['firstCreationVerification'])
except BaseException as error:
    result['firstFailure']=type(error).__name__+': '+str(error);result['traceback']=traceback.format_exc()[-8192:]
result['elapsedSeconds']=time.monotonic()-started
print(json.dumps(result,indent=2))
sys.exit(0 if result['valid'] else 1)
