#!/usr/bin/env python3
"""Verify retained bytes, pixels and recorded arithmetic. No game imports, replay or new metrics."""
import argparse,gzip,hashlib,json,math,pathlib,statistics,struct,subprocess,zlib
A=pathlib.Path(__file__).resolve().parent
REPO=A.parents[3]
sha=lambda b:hashlib.sha256(b).hexdigest()
def check(b,n,h,label):assert len(b)==n and sha(b)==h,label
def close(a,b,label):assert math.isclose(a,b,rel_tol=1e-10,abs_tol=1e-10),label
def key(p):return(p['path'],p['bytes'],p['sha256'])
parser=argparse.ArgumentParser()
parser.add_argument('--originals',action='store_true',help='Require identity-only original paths, tools, bundles and scratch files to remain available')
parser.add_argument('--git',action='store_true',help='Read immutable committed blobs, never current runtime sources or experiment modules')
args=parser.parse_args()
manifest=(A/'manifest.json').read_bytes();m=json.loads(manifest)
known=set();owned={};named={};stored_bytes=0
for p in m['payloads']:
    b=(A/p['storedPath']).read_bytes();check(b,p['storedBytes'],p['storedSha256'],p['storedPath']);stored_bytes+=len(b)
    raw=gzip.decompress(b)if p['encoding']=='gzip-generated-mtime0'else b
    check(raw,p['originalBytes'],p['originalSha256'],p['storedPath']+' original bytes')
    if p['encoding']=='gzip-generated-mtime0':assert b[:3]==b'\x1f\x8b\x08' and b[4:8]==b'\0\0\0\0' and not b[3]&8
    for alias in p['originalAliases']:
        check(raw,alias['bytes'],alias['sha256'],alias['path']);known.add(key(alias));owned[alias['path']]=p
    for name in p['ownedNames']:named[name]=p
assert {str(p.relative_to(A))for p in (A/'evidence').rglob('*')if p.is_file()}=={p['storedPath']for p in m['payloads']}
def original(path):
    p=owned[path];b=(A/p['storedPath']).read_bytes()
    return gzip.decompress(b)if p['encoding']=='gzip-generated-mtime0'else b
def data(name):
    p=named[name];return original(p['originalAliases'][0]['path'])
def record(name):return json.loads(data(name))
for p in m['reusedInputs']:
    b=(A/p['storedPath']).read_bytes();check(b,p['storedBytes'],p['storedSha256'],p['storedPath'])
    raw=gzip.decompress(b)if p['aliasEncoding']=='gzip'else b
    for alias in p['originalAliases']:check(raw,alias['bytes'],alias['sha256'],alias['path']);known.add(key(alias))
for p in m['authorityLinks']+m['generatedRecords']:check((A/p['path']).read_bytes(),p['bytes'],p['sha256'],p['path'])
for p in m['gitReferences']+m['externalIdentityReferences']:
    for alias in p['originalAliases']:known.add(key(alias))
if args.git:
    for p in m['gitReferences']:
        b=subprocess.check_output(['git','show',p['commit']+':'+p['repositoryPath']],cwd=REPO)
        for alias in p['originalAliases']:check(b,alias['bytes'],alias['sha256'],alias['path'])
if args.originals:
    for path,n,h in known:check(pathlib.Path(path).read_bytes(),n,h,path)
closures=0
def walk(x):
    global closures
    if isinstance(x,dict):
        if {'path','bytes','sha256'}<=x.keys() and isinstance(x['path'],str) and x['path'].startswith('/') and not x.get('virtualOnly',False):assert key(x)in known,x['path'];closures+=1
        for v in x.values():walk(v)
    elif isinstance(x,list):
        for v in x:walk(v)
for name in m['closureAuthorities']:walk(record(name))
for p in m.get('relativeSourceAuthorities',[]):
    x=record(p['name']);assert len(x['files'])==554
    for row in x['files']:assert (str(REPO/row['path']),row['bytes'],row['sha256'])in known
summary=json.loads((A/'summary.json').read_text())
pixels_checked=fields_checked=projection_states_checked=projection_vertices_checked=0
if m['kind']=='maturation':
    v1=record('v1/run/report.json');v2=record('v2/run/report.json');c=v2['capture']
    assert not v1['valid'] and v1['incomplete'] and v1['storedBytes']==0 and 'Active mesh index differs from loft'in v1['firstFailure']
    assert v1['capture']['state']=='failed' and not v1['capture']['frames'] and not v1['capture']['fields']
    assert v2['valid'] and not v2['incomplete'] and v2['authorityUnchangedAfter'] and c['state']=='captured-lifecycle' and c['failure']is None
    assert len(c['frames'])==7 and len(c['fields'])==379 and c['publicationRows']==len(c['timeline'])==46 and len(c['events'])==3
    assert v2['storedBytes']==sum(p['bytes']for p in v2['artifacts'])==52369602
    assert c['copiedBytes']==sum(p['bytes']for p in c['fields'])==171306563
    selected=c['selection'];assert selected['pointId']==selected['stripId']==2
    assert [e['method']for e in c['events']]==['holdJet','crashJet','removeStrip']
    assert all(e['stripId']==2 and e['pointTouchdown']is None for e in c['events'])
    assert c['tdEvent']==c['events'][1] and c['tdEvent']['result']is True
    assert c['retirementEvent']==c['events'][2] and c['retirementEvent']['after']is None and c['retirementEvent']['reason']=='actual-removal-with-no-live-parcels'
    timeline={r['publication']:r for r in c['timeline']};assert len(timeline)==46
    assert [r['publication']for r in c['timeline']]==list(range(989,1035))
    assert all(r['generation']==1 for r in c['timeline'])
    assert all(c['timeline'][i]['seaTime']<c['timeline'][i+1]['seaTime']for i in range(45))
    fields={f['label']:f for f in c['fields']};assert len(fields)==379
    def png_rgba(b,width,height):
        assert b[:8]==b'\x89PNG\r\n\x1a\n';offset=8;parts=[];types=[]
        while offset<len(b):
            n=struct.unpack_from('>I',b,offset)[0];tag=b[offset+4:offset+8];body=b[offset+8:offset+8+n];crc=struct.unpack_from('>I',b,offset+8+n)[0]
            assert zlib.crc32(tag+body)&0xffffffff==crc;types.append(tag)
            if tag==b'IHDR':assert len(body)==13 and struct.unpack('>IIBBBBB',body)==(width,height,8,6,0,0,0)
            elif tag==b'IDAT':parts.append(body)
            else:assert tag==b'IEND'and not body
            offset+=n+12
        assert offset==len(b)and types==[b'IHDR',b'IDAT',b'IEND']
        raw=zlib.decompress(b''.join(parts));stride=width*4;assert len(raw)==(stride+1)*height
        out=bytearray(stride*height)
        for y in range(height):assert raw[y*(stride+1)]==0;out[y*stride:(y+1)*stride]=raw[y*(stride+1)+1:(y+1)*(stride+1)]
        return out
    for f in c['fields']:
        file=f['file'];b=original(file['path']);check(b,file['bytes'],file['sha256'],file['path'])
        if f['label'].endswith('/rgba'):
            frame=next(fr for fr in c['frames']if fr['pixels']['field']['label']==f['label']);raw=png_rgba(b,frame['pixels']['width'],frame['pixels']['height']);pixels_checked+=1
        else:
            raw=gzip.decompress(b);check(raw,file['expandedBytes'],file['expandedSha256'],f['label']+' expansion')
        check(raw,f['bytes'],f['sha256'],f['label']);assert f['elements']*{'Uint8Array':1,'Uint8ClampedArray':1,'Float32Array':4,'Int32Array':4,'Uint32Array':4,'Float64Array':8}[f['type']]==len(raw);fields_checked+=1
    for i,f in enumerate(c['frames']):
        assert f['index']==i and f['generation']==1 and f['barrelMeshActuallyDrawn']
        assert f['status']['__tubeQA']['publication']==f['publication'] and f['status']['__tubeQA']['generation']==f['generation'] and f['status']['__tubeQA']['seaTime']==f['seaTime']
        assert f['publication']in timeline and timeline[f['publication']]['seaTime']==f['seaTime']
        if i:assert f['skippedWorkerPublicationsSincePreviousRetainedFrame']==f['publication']-c['frames'][i-1]['publication']-1
        for side in ['before','after']:
            fb=f['framebuffer'][side];assert fb['logicalDefaultTarget']and fb['defaultDrawFramebuffer']and fb['canvasMatchesContext']and fb['viewport']==[0,0,2989,1538]
        prefix='state-'+str(i)+'/'
        for topic in ['surface','aeration']:assert fields[prefix+'published-'+topic]['sha256']==fields[prefix+'drawn-'+topic]['sha256']
        assert fields[prefix+'positions']['sha256']==fields[prefix+'source-loft-positions']['sha256']
        assert fields[prefix+'normals']['sha256']==fields[prefix+'source-loft-normals']['sha256']
        contract=f['indexContract'];assert contract['sameOrder']+contract['reversedOrder']==contract['triangles']==f['indexCount']//3
        assert contract['facingNegative']==contract['reversedOrder'] and contract['facingNaN']==0 and contract['sourceAndActivePositionsExact']and contract['sourceAndActiveNormalsExact']and contract['activeTriangleSupportExact']
        front=gzip.decompress(original(fields[prefix+'front']['file']['path']));words=struct.unpack('<'+'I'*(len(front)//4),front)
        rows=f['status']['__tubeQA']['rows'];assert len(words)==9*len(rows)==9*f['frontCount']
        for row in rows:assert list(words[row['index']*9:row['index']*9+9])==row['transportBits']
    projection=record('v2/projection-diagnosis.json');assert projection['reportSha256']==sha(data('v2/run/report.json'))
    assert len(projection['rows'])==7
    def transform(matrix,v):
        assert len(matrix)==16 and len(v)==4
        return tuple(sum(matrix[col*4+row]*v[col]for col in range(4))for row in range(4))
    for f,p in zip(c['frames'],projection['rows']):
        field=fields['state-'+str(f['index'])+'/positions'];raw=gzip.decompress(original(field['file']['path']))
        assert field['type']=='Float32Array' and len(raw)==f['vertexCount']*12
        nonpositive=inside=vertices=0;w_min=math.inf;w_max=-math.inf
        for xyz in struct.iter_unpack('<fff',raw):
            world=transform(f['matrixWorld'],(*xyz,1))
            view=transform(f['camera']['matrixWorldInverse'],world)
            clip=transform(f['camera']['projectionMatrix'],view)
            assert all(math.isfinite(v)for v in clip),'Captured clip coordinate must be finite'
            w=clip[3];w_min=min(w_min,w);w_max=max(w_max,w);vertices+=1
            nonpositive+=w<=0
            inside+=w>0 and all(-w<=v<=w for v in clip[:3])
        assert p['state']==f['index'] and p['seaTime']==f['seaTime'] and p['vertices']==f['vertexCount']==vertices==nonpositive==p['nonpositiveClipW']
        assert inside==p['insideClipVertices']==0 and w_max<0
        close(w_min,p['clipWRange'][0],'Retained projection minimum clip W')
        close(w_max,p['clipWRange'][1],'Retained projection maximum clip W')
        projection_states_checked+=1;projection_vertices_checked+=vertices
    assert 'KeyError'in record('v2/projection-diagnosis-first-failure.json')['error']
    for version,ports,valid in [('v1',[4200,4251,9661],False),('v2',[4200,4252,9662],True)]:
        cl=record(version+'/independent-closure.json');assert sorted(map(int,cl['ports']))==ports and all(p=={'closed':True,'reason':'ECONNREFUSED'}for p in cl['ports'].values())
        assert record(version+'/run.native-driver.json')['valid']==valid
        checkgate=record(version+'/checks/terminal.json');assert checkgate['status']=='passed' and checkgate['sourceBefore']==checkgate['sourceAfter'] and all(cmd['exitCode']==0 for cmd in checkgate['commands'])
        bindings=record(version+'/bindings.json');served=record(version+'/run/report.json')['servedCompiled'];assert len(bindings['compiledFiles'])==len(served)==11
        expected={r['relativePath']:(r['bytes'],r['sha256'])for r in bindings['compiledFiles']};assert {r['path']:(r['bytes'],r['sha256'])for r in served}==expected
    assert summary['visualQualityAccepted']is False and summary['originalWaveLabFailureAccepted']is False and summary['nativeFpsClaim']is False
else:
    ready=[record(v+'/ready.json')for v in ['v1','v2','v3']]
    assert ready[0]['virtual']==ready[1]['virtual']==ready[2]['virtual'] and ready[1]['virtualTests']==ready[2]['virtualTests']
    assert all(r['canonicalRuntimeCheckpoint']==m['canonicalRuntimeCheckpoint']for r in ready)
    assert record('v1/root-checks-first/terminal.json')['valid']is False
    assert not any(name.startswith('v1/proof-first/')or name.startswith('v1/compiled')for name in named)
    assert record('v2/root-checks-first/terminal.json')['valid']is True
    first=record('v2/proof-first/report.json');assert first['valid']is False and len(first['cases'])==3 and all(c['ticks']==24 for c in first['cases'])
    assert record('v2/proof-first/terminal.json')['error']=='RangeError: Cannot shift 8 columns in a 8-column window'
    assert not any(name.startswith('v2/cost-first/')for name in named)
    proof=record('v3/proof-first/report.json');assert proof['valid']and len(proof['cases'])==6
    assert proof['maximumChannelError']<=5e-5 and proof['maximumRenderedFoamError']<=1e-4 and proof['maximumCoverageSumOvershoot']<=2e-7
    for v,mode,valid in [('v1','checks',False),('v2','checks',True),('v2','proof',False),('v3','checks',True),('v3','proof',True),('v3','cost',False)]:
        terminal=record(v+'/root-'+mode+'-first/terminal.json');assert terminal['valid']==valid and terminal['pinsUnchanged']
        assert terminal['readySha256']==sha(data(v+'/ready.json')) and all(c['exitCode']==(0 if valid else 1)for c in terminal['commands'])
    compiled=[record(v+'/compiled.json')for v in ['v2','v3']]
    for name in ['baseline.mjs','candidate.mjs']:
        rows=[next(r for r in x['outputs']if r['path'].endswith('/'+name))for x in compiled];assert (rows[0]['bytes'],rows[0]['sha256'])==(rows[1]['bytes'],rows[1]['sha256'])
    cost=record('v3/cost-first/report.json');rows=cost['rows'];assert len(rows)==32
    values=[]
    for i,r in enumerate(rows):
        assert r['pair']==i and r['order']==['AB','BA','BA','AB'][i%4]and r['baseline']['ticks']==r['candidate']['ticks']==8
        v=(r['baseline']['totalMs']-r['candidate']['totalMs'])/8;close(v,r['savingPerStepMs'],'paired raw arithmetic');values.append(v)
    stats=cost['statistics'];mean=statistics.mean(values);median=statistics.median(values);lower=mean-1.96*statistics.stdev(values)/math.sqrt(32)
    for k,v in [('meanSavingPerStepMs',mean),('medianSavingPerStepMs',median),('heuristicLower95Ms',lower)]:close(v,stats[k],k);close(v,summary[k],k+' summary')
    assert sum(v>0 for v in values)==stats['positivePairs']==summary['positivePairs']==20
    means={o:statistics.mean(r['savingPerStepMs']for r in rows if r['order']==o)for o in ['AB','BA']}
    for r in stats['orderStrata']:close(means[r['order']],r['meanSavingPerStepMs'],'order raw arithmetic');close(means[r['order']],summary['orderMeans'][r['order']],'order summary')
    assert stats['thresholdMs']==.1 and not stats['thresholdPass'] and not cost['valid']and cost['strictStop']
    assert not(lower>.1 and all(v>.1 for v in means.values()))and not summary['nativeRun']and not summary['adopted']
    assert cost['inputAuthority']['captureIncomplete']and cost['inputAuthority']['f32CommittedExport']
print(json.dumps({'valid':True,'kind':m['kind'],'manifestSha256':sha(manifest),'storedPayloads':len(m['payloads']),'storedPayloadBytes':stored_bytes,'ownedOriginalAliases':sum(len(p['originalAliases'])for p in m['payloads']),'reusedInputs':len(m['reusedInputs']),'gitReferences':len(m['gitReferences']),'externalIdentityReferences':len(m['externalIdentityReferences']),'closureChecks':closures,'fieldsVerified':fields_checked,'pixelsVerified':pixels_checked,'projectionStatesVerified':projection_states_checked,'projectionVerticesVerified':projection_vertices_checked,'originalPathsChecked':len(known)if args.originals else 0,'gitBlobsChecked':len(m['gitReferences'])if args.git else 0,'numericalExperimentReexecuted':False},indent=2))
