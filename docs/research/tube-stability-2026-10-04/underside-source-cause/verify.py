#!/usr/bin/env python3
"""Verify bytes/aliases and counts already present in the report; never rerun the renderer."""
import argparse,gzip,hashlib,json,struct,subprocess
from pathlib import Path
A=Path(__file__).resolve().parent;sha=lambda b:hashlib.sha256(b).hexdigest()
def check(b,n,h,label):
 assert len(b)==n,f'{label}: byte length differs';assert sha(b)==h,f'{label}: SHA256 differs'
p=argparse.ArgumentParser();p.add_argument('--external',action='store_true');args=p.parse_args();m=json.loads((A/'manifest.json').read_text());original={};identities=set();storedbytes=0
for r in m['payloads']:
 b=(A/r['storedPath']).read_bytes();check(b,r['storedBytes'],r['storedSha256'],r['storedPath']);assert struct.unpack_from('<I',b,4)[0]==0;raw=gzip.decompress(b);check(raw,r['expandedBytes'],r['expandedSha256'],r['storedPath']+' expanded');storedbytes+=len(b)
 for a in r['originalAliases']:check(raw,a['bytes'],a['sha256'],a['path']);original[a['path']]=raw;identities.add((a['bytes'],a['sha256']))
for r in m.get('generatedRecords',[]):check((A/r['path']).read_bytes(),r['bytes'],r['sha256'],r['path'])
extkeys={(r['bytes'],r['sha256']) for r in m['externalReferences']};closure=0
def walk(o,label):
 global closure
 if isinstance(o,dict):
  if isinstance(o.get('path'),str) and o['path'].startswith('/') and isinstance(o.get('bytes'),int) and isinstance(o.get('sha256'),str):assert (o['bytes'],o['sha256']) in identities|extkeys,(label,o['path']);closure+=1
  for v in o.values():walk(v,label)
 elif isinstance(o,list):
  for v in o:walk(v,label)
for name in m['closureAuthorities']:walk(json.loads(original[name]),name)
def get(suffix):return json.loads(next(b for name,b in original.items() if name.endswith(suffix)))
r=get('/run-first/report.json');t=get('/run-first/terminal.json');cpu=get('/root-cpu/terminal.json');num=get('/root-numerical/terminal.json');ready=get('/ready.json');inputs=get('/inputs.json');compiled=get('/compiled.json')
readybytes=next(b for name,b in original.items() if name.endswith('/ready.json'));assert r['readySha256']==compiled['readySha256']==cpu['readySha256']==sha(readybytes)
assert r['valid'] and r['sourceParityVerified'] and not r['originalCaptureValid'] and r['originalCaptureIncomplete'];assert t['valid'] and t['inputPinsUnchanged'] and t['sourceParityVerified']
assert cpu['valid'] and cpu['beforePins']==cpu['afterPins']==130 and len(cpu['commands'])==4 and all(x['code']==0 for x in cpu['commands']);assert num['valid'] and num['code']==0 and num['beforePins']==num['afterPins']==131 and num['outerBoundSeconds']==20 and num['pid']==43802
assert len(r['frames'])==len(r['statefulness'])==3;assert len(r['sections'])==t['sections']==12;assert len(r['decodedFields'])==93;assert sum(x['bytes'] for x in r['decodedFields'])==r['decodedBytes']==t['decodedBytes']==2590284
for i,x in enumerate(r['statefulness']):
 assert x['frame']==i and x['priorCapturedBuilds']==i
 for key in ['freshIndependentCaseIdentities','sourceCasesUnchanged','freshAndReusedActualPositionsByteExact','allRetainedSliceArraysByteExact','originalLoftIndicesHashExact','queryAndProfileByteExact']:assert x[key] is True
geometry_count=0
def geometry_counts(o):
 global geometry_count
 if isinstance(o,dict):
  if isinstance(o.get('summary'),dict) and 'properIntersectionCount' in o['summary']:
   geometry_count+=1
   for count,array in [('properIntersectionCount','properIntersections'),('collinearOverlapCount','collinearOverlaps'),('nonAdjacentEndpointTouchCount','nonAdjacentEndpointTouches'),('zeroLengthSegmentCount','zeroLengthSegments'),('duplicatePointCount','duplicatePoints')]:assert o['summary'][count]==len(o[array])
  for v in o.values():geometry_counts(v)
 elif isinstance(o,list):
  for v in o:geometry_counts(v)
geometry_counts(r)
rows=[];clean=0
for i,f in enumerate(r['frames']):
 assert f['index']==i and f['comparisonCount']==4;sections=[s for s in r['sections'] if s['actualCapturedSeaTime']==f['seaTime']];assert len(sections)==4 and [s['slice'] for s in sections]==[15,16,17,18]
 crossed=[]
 for s in sections:
  assert s['raisedCrestToToeYExact'] and s['sourceAndCapturedCrossSegmentPairsEqual']
  a=s['capturedProjectedGeometry']['properIntersections'];b=s['sourceProfile']['geometry']['properIntersections'];assert [(x['first'],x['second']) for x in a]==[(x['first'],x['second']) for x in b]
  assert len(s['contributions'])==2 and len(s['sourceProfile']['coordinates'])==256
  if not a:clean+=1;assert s['stageEvidence']=='Neither source profile nor captured projection crosses';continue
  assert len(a)==len(b)==1;crossed.append(s['slice']);endcounts=[e['geometry']['summary']['properIntersectionCount'] for c in s['contributions'] for e in c['endpoints']];interpcounts=[c['currentInterpolation']['unscaledGeometry']['summary']['properIntersectionCount'] for c in s['contributions']]
  if i==0:
   assert endcounts==[0,0,0,0] and interpcounts==[0,0];assert s['stageEvidence']=='Cross-case blended profile crosses; primitive same-time interpolations clean'
  else:assert any(endcounts) and s['stageEvidence']=='At least one source contributing endpoint already crosses'
  rows.append({'frame':i,'slice':s['slice'],'seaTime':f['seaTime'],'footRatio':s['footRatio'],'coreSegmentPair':[a[0]['first'],a[0]['second']],'sameTimePrimitiveCrossingCounts':interpcounts,'contributorEndpointCrossingCounts':endcounts,'stageEvidence':s['stageEvidence']})
 assert crossed==f['observedCrossingSlices']==[16+i]
assert clean==9 and len(rows)==3
external=0;rawexternal={};parents=set();git=[]
if args.external:
 for x in m['externalReferences']:
  v=x['verification']
  if v['kind']=='git':git.append(x);continue
  if 'archiveManifest' in v:
   parent=(v['archiveManifest'],v['archiveManifestSha256']);parents.add(parent);assert sha(Path(parent[0]).read_bytes())==parent[1]
  b=Path(v['path']).read_bytes();raw=gzip.decompress(b) if v['encoding']=='gzip' else b;check(raw,x['bytes'],x['sha256'],x['originalPath']);rawexternal[x['originalPath']]=raw;external+=1
 if git:
  repos={x['verification']['repository'] for x in git};assert len(repos)==1;proc=subprocess.Popen(['git','cat-file','--batch'],cwd=next(iter(repos)),stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
  try:
   for x in git:
    v=x['verification'];expr=v['commit']+':'+v['relativePath'];proc.stdin.write((expr+'\n').encode());proc.stdin.flush();line=proc.stdout.readline().rstrip(b'\n').split();assert len(line)==3 and line[1]==b'blob',line;b=proc.stdout.read(int(line[2]));assert proc.stdout.read(1)==b'\n';check(b,x['bytes'],x['sha256'],expr);external+=1
   proc.stdin.close();assert proc.wait()==0
  finally:
   if proc.poll() is None:proc.kill();proc.wait()
 for x in inputs['capturedFields']:
  raw=gzip.decompress(rawexternal[x['file']['path']]);check(raw,x['bytes'],x['sha256'],x['label']);check(raw,x['file']['expandedBytes'],x['file']['expandedSha256'],x['label']+' declared expanded')
 cap=json.loads(rawexternal[inputs['capture']['path']]);audit=json.loads(rawexternal[inputs['audit']['path']]);assert not cap['valid'] and cap['incomplete'] and len(cap['capture']['frames'])==3
 assert [f['seaTime'] for f in r['frames']]==[f['seaTime'] for f in cap['capture']['frames']]==[f['seaTime'] for f in audit['frames']]
print(json.dumps({'schema':'underside-source-byte-count-verification/v1','pass':True,'externalRequested':args.external,'storedPayloads':len(m['payloads']),'originalAliases':sum(len(r['originalAliases']) for r in m['payloads']),'storedPayloadBytes':storedbytes,'externalReferencesChecked':external,'parentManifestsChecked':len(parents),'closureReferenceChecks':closure,'fieldIdentityChecks':93 if args.external else 0,'storedGeometryCountConsistencyChecks':geometry_count,'freshReusedBuildsReported':6,'formedOpenSections':12,'cleanSections':clean,'crossingSections':rows,'scope':'Byte/hash/alias and arithmetic on stored report only; no helper, renderer, numerical comparison, physics or FPS rerun.'},indent=2))
