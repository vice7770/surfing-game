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
    return gzip.decompress(b)if p.get('encoding')=='gzip-generated-mtime0'or p.get('aliasEncoding')=='gzip'else b
def data(name):
    p=named[name];return original(p['originalAliases'][0]['path'])
def record(name):return json.loads(data(name))
for p in m['reusedInputs']:
    b=(A/p['storedPath']).read_bytes();check(b,p['storedBytes'],p['storedSha256'],p['storedPath'])
    raw=gzip.decompress(b)if p['aliasEncoding']=='gzip'else b
    for alias in p['originalAliases']:check(raw,alias['bytes'],alias['sha256'],alias['path']);known.add(key(alias));owned[alias['path']]=p
    for name in p.get('ownedNames',[]):named[name]=p
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
# Literal retained-pixel and indexed projection arithmetic only; no game modules.
pixels_checked=fields_checked=projection_states_checked=projection_vertices_checked=0
r=record('run/report.json');c=r['capture'];review=record('visual-review.json')
assert m['kind']=='wavelab-visible' and r['valid']and not r['incomplete']and r['authorityUnchangedAfter']
assert c['state']=='captured-lifecycle'and c['failure']is None and len(c['frames'])==7 and len(c['fields'])==379
assert c['publicationRows']==len(c['timeline'])==52 and len(c['events'])==3
assert r['storedBytes']==sum(x['bytes']for x in r['artifacts'])==59405979
assert c['copiedBytes']==sum(x['bytes']for x in c['fields'])==174642678
assert c['selection']['pointId']==12 and c['selection']['stripId']==2
assert [e['method']for e in c['events']]==['holdJet','crashJet','removeStrip']
assert [e['sequence']for e in c['events']]==[2,26,46]
assert all(e['stripId']==2 and e['pointTouchdown']is None for e in c['events'])
assert c['tdEvent']==c['events'][1]and c['tdEvent']['pointId']==12 and c['tdEvent']['result']is True
assert c['retirementEvent']==c['events'][2]and c['retirementEvent']['pointId']==12 and c['retirementEvent']['after']is None and c['retirementEvent']['reason']=='actual-removal-with-no-live-parcels'
timeline={x['publication']:x for x in c['timeline']};assert len(timeline)==52 and list(timeline)==list(range(382,434))
assert all(x['generation']==1 and x['point']['values']['id']==12 for x in c['timeline'])
assert all(c['timeline'][i]['seaTime']<c['timeline'][i+1]['seaTime']for i in range(51))
assert c['timeline'][-1]['originalStrip']is None and c['timeline'][-1]['point']['strip']is None
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
for field in c['fields']:
    file=field['file'];b=original(file['path']);check(b,file['bytes'],file['sha256'],file['path'])
    if field['label'].endswith('/rgba'):
        f=next(x for x in c['frames']if x['pixels']['field']['label']==field['label']);raw=png_rgba(b,f['pixels']['width'],f['pixels']['height']);pixels_checked+=1
    else:raw=gzip.decompress(b);check(raw,file['expandedBytes'],file['expandedSha256'],field['label']+' expanded')
    check(raw,field['bytes'],field['sha256'],field['label'])
    assert field['elements']*{'Uint8Array':1,'Uint8ClampedArray':1,'Float32Array':4,'Int32Array':4,'Uint32Array':4}[field['type']]==len(raw);fields_checked+=1
def array(label,code):
    f=fields[label];b=gzip.decompress(original(f['file']['path']));assert len(b)==f['bytes'];return struct.unpack('<'+code*f['elements'],b)
def transform(matrix,v):
    assert len(matrix)==16 and len(v)==4 and all(math.isfinite(x)for x in matrix)
    return tuple(sum(matrix[col*4+row]*v[col]for col in range(4))for row in range(4))
def project(f,point,mesh=True):
    a=transform(f['matrixWorld'],(*point,1))if mesh else(*point,1)
    view=transform(f['camera']['matrixWorldInverse'],a);clip=transform(f['camera']['projectionMatrix'],view);assert all(math.isfinite(x)for x in clip)
    w=clip[3];inside=w>0 and all(abs(x)<=w for x in clip[:3]);width=f['pixels']['width'];height=f['pixels']['height']
    pixel=((clip[0]/w+1)*width/2,(1-clip[1]/w)*height/2)if w!=0 else None
    return {'clipW':w,'cameraZ':view[2],'inside':inside,'pixel':pixel}
for i,f in enumerate(c['frames']):
    assert f['index']==i and f['generation']==1 and f['barrelMeshActuallyDrawn']
    q=f['status']['__tubeQA'];assert q['generation']==f['generation']and q['publication']==f['publication']and q['seaTime']==f['seaTime']
    assert timeline[f['publication']]['seaTime']==f['seaTime']and f['material']['point']['values']['id']==12
    assert f['labClock']=={'paused':False,'scale':1,'pendingManualSteps':0}
    pose=f['cameraPoseSource'];assert pose['pointId']==12 and pose['stripId']==2 and pose['sourceGeneration']==1 and pose['sourcePublication']<=f['publication']
    assert all(abs(x-y)<=1e-6 for x,y in zip(pose['eye'],f['camera']['position']))
    if i:assert f['skippedWorkerPublicationsSincePreviousRetainedFrame']==f['publication']-c['frames'][i-1]['publication']-1
    for side in ['before','after']:
        fb=f['framebuffer'][side];assert fb['logicalDefaultTarget']and fb['defaultDrawFramebuffer']and fb['canvasMatchesContext']and fb['viewport']==[0,0,2989,1538]
    prefix='state-'+str(i)+'/'
    for topic in ['surface','aeration']:assert fields[prefix+'published-'+topic]['sha256']==fields[prefix+'drawn-'+topic]['sha256']
    assert fields[prefix+'positions']['sha256']==fields[prefix+'source-loft-positions']['sha256']and fields[prefix+'normals']['sha256']==fields[prefix+'source-loft-normals']['sha256']
    contract=f['indexContract'];assert contract['sameOrder']+contract['reversedOrder']==contract['triangles']==f['indexCount']//3
    assert contract['facingNegative']==contract['reversedOrder']and contract['facingNaN']==0 and contract['sourceAndActivePositionsExact']and contract['sourceAndActiveNormalsExact']and contract['activeTriangleSupportExact']
    words=array(prefix+'front','I');assert len(words)==9*len(q['rows'])==9*f['frontCount']
    for row in q['rows']:assert list(words[9*row['index']:9*row['index']+9])==row['transportBits']
    positions=array(prefix+'positions','f');indices=array(prefix+'indices','I');front=array(prefix+'sliceFront','i');sigma=array(prefix+'sliceSigma','f');joined=array(prefix+'sliceJoined','B')
    assert len(positions)==3*f['vertexCount']and len(indices)==f['indexCount']and len(front)==len(sigma)==len(joined)==f['sliceCount']
    assert f['vertexCount']%f['sliceCount']==0 and all(v<f['vertexCount']for v in indices);stride=f['vertexCount']//f['sliceCount']
    values=f['material']['point']['values'];source=f['material']['point']['currentCrashSlice'];point=(source['crestX'],source['crestY'],source['crestZ'])if source else(values['x'],values['footHeight'],values['z'])
    section=None
    for k in range(f['sliceCount']-1):
        if front[k]!=values['front']or front[k+1]!=values['front']or joined[k]!=1:continue
        if not(sigma[k]<sigma[k+1]and sigma[k]<=values['sigma']<=sigma[k+1]):continue
        first=k;last=k+1
        if k>0 and front[k-1]==values['front']and joined[k-1]==1:first-=1
        if k+2<f['sliceCount']and front[k+2]==values['front']and joined[k+1]==1:last+=1
        section={'first':first,'last':last,'sigma':[sigma[first],sigma[last]],'containing':[k,k+1],'front':values['front']};break
    v=f['visibleSupport'];assert section==v['bracket']
    slots=[];front_slots=[];vertex_ids=set()
    for k in range(0,len(indices),3):
        ids=indices[k:k+3]
        if all(front[x//stride]==values['front']for x in ids):front_slots.append(k)
        if section and all(section['first']<=x//stride<=section['last']and front[x//stride]==values['front']for x in ids):slots.append(k);vertex_ids.update(ids)
    assert slots==v['triangleIndexOffsets']and front_slots==v['selectedCurrentFrontTriangleIndexOffsets']
    assert bool(front_slots)==v['selectedCurrentFrontHasOtherIndexedSupport']and (not front_slots)==v['selectedCurrentFrontCompleteTrianglesAbsent']
    projected={x:project(f,positions[3*x:3*x+3])for x in vertex_ids};assert len(vertex_ids)==v['indexedVertices']
    assert sum(p['clipW']>0 for p in projected.values())==v['positiveClipWVertices']and sum(p['inside']for p in projected.values())==v['inFrustumVertices']
    selected=project(f,point,False);assert selected['inside']==v['selectedPoint']['inside'];close(selected['clipW'],v['selectedPoint']['clipW'],'Selected point W');close(selected['cameraZ'],v['selectedPoint']['cameraZ'],'Selected point camera Z')
    for x,y in zip(selected['pixel'],v['selectedPoint']['pixel']):close(x,y,'Selected point pixel')
    visible=[];area=0;xs=[];ys=[]
    for k in slots:
        ps=[projected[x]for x in indices[k:k+3]]
        if not all(p['inside']for p in ps):continue
        a,b,d=[p['pixel']for p in ps];triangle_area=abs((b[0]-a[0])*(d[1]-a[1])-(b[1]-a[1])*(d[0]-a[0]))/2
        if not triangle_area>.01:continue
        visible.append(k);area+=triangle_area;xs.extend(p['pixel'][0]for p in ps);ys.extend(p['pixel'][1]for p in ps)
    assert visible==v['visibleTriangleIndexOffsets'];close(area,v['summedVisibleTriangleArea'],'Retained visible triangle area sum')
    if vertex_ids:
        for x,y in zip([min(p['clipW']for p in projected.values()),max(p['clipW']for p in projected.values())],v['clipWRange']):close(x,y,'Selected indexed W range')
    else:assert v['clipWRange']is None
    if visible:
        bounds=[min(xs),min(ys),max(xs),max(ys)];span=(bounds[2]-bounds[0],bounds[3]-bounds[1]);assert v['visible']and not v['retirementAbsence']and selected['inside']and all(p['clipW']>0 for p in projected.values())
        assert len(visible)>=v['minimum']['triangles']==32 and span[0]>=v['minimum']['width']==160 and span[1]>=v['minimum']['height']==80
        for x,y in zip(bounds,v['projectedSpan']['bounds']):close(x,y,'Retained selected span bounds')
        close(span[0],v['projectedSpan']['width'],'Retained selected span width');close(span[1],v['projectedSpan']['height'],'Retained selected span height')
        projection_states_checked+=1;projection_vertices_checked+=len(vertex_ids)
    else:
        assert i==6 and v['retirementAbsence']and not v['visible']and v['pointPresent']and section is None and not slots and front_slots
        assert not v['activeIntervalEmpty']and not v['absentPointWithLingeringActiveGeometryUnproved']and f['material']['originalStrip']is None
        assert len(front_slots)==12502 and v['projectedSpan']=={'width':0,'height':0,'bounds':None}
assert projection_states_checked==6 and projection_vertices_checked==3216
check(data('visual-review.json'),4817,'6b00f8336b3d67dd1531fdbb6cd70ea361e6eaa1da9c8d4d9710331cc19fd51e','Root visual review identity')
assert review['reportSha256']==sha(data('run/report.json'))and review['observedFrames']==list(range(7))and not review['visualAcceptance']and not review['referenceEquivalence']and not review['originalFinDefectResolved']and not review['fpsAcceptance']
gate=record('checks/terminal.json');assert gate['status']=='passed'and len(gate['commands'])==12 and gate['sourceBefore']==gate['sourceAfter']and all(x['exitCode']==0 for x in gate['commands'])
driver=record('run.native-driver.json');assert driver['valid']and driver['exitCode']==0
cl=record('independent-closure.json');assert cl['valid']and cl['independent']and sorted(x['port']for x in cl['ports'])==[4200,4253,9663]and all(x['closed']and x['errno']==61 and 'Connection refused'in x['result']for x in cl['ports'])
bindings=record('bindings.json');assert len(bindings['compiledFiles'])==len(r['servedCompiled'])==11
expected={x['relativePath']:(x['bytes'],x['sha256'])for x in bindings['compiledFiles']};assert {x['path']:(x['bytes'],x['sha256'])for x in r['servedCompiled']}==expected
assert expected=={x['relativePath']:(x['bytes'],x['sha256'])for x in record('borrowed/v2-bindings.json')['compiledFiles']}
assert record('run/native-audit.json')['valid']and not record('run/native-audit.json')['workerRngOverride']
assert not summary['visualAcceptance']and not summary['referenceEquivalence']and not summary['originalFinDefectResolved']and not summary['fpsAcceptance']
print(json.dumps({'valid':True,'manifestSha256':sha(manifest),'storedPayloads':len(m['payloads']),'storedPayloadBytes':stored_bytes,'ownedOriginalAliases':sum(len(x['originalAliases'])for x in m['payloads']),'reusedInputs':len(m['reusedInputs']),'gitReferences':len(m['gitReferences']),'externalIdentityReferences':len(m['externalIdentityReferences']),'closureChecks':closures,'fieldsVerified':fields_checked,'pixelsVerified':pixels_checked,'visibleProjectionStatesVerified':projection_states_checked,'selectedIndexedVerticesVerified':projection_vertices_checked,'retirementCurrentFrontOtherTriangles':12502,'originalPathsChecked':len(known)if args.originals else 0,'gitBlobsChecked':len(m['gitReferences'])if args.git else 0,'numericalExperimentReexecuted':False},indent=2))
