#!/usr/bin/env python3
"""Bytes and stored-report arithmetic only. Never import/run metric or game code."""
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
r=get('/run-first/report.json');terminal=get('/run-first/terminal.json');root=get('/root-terminal/terminal.json');ready=get('/ready.json');inputs=get('/inputs.json');frames=r['frames']
assert terminal['valid'] and terminal['sourceUnchanged'] and root['valid'];assert len(root['commands'])==3 and all(x['code']==0 for x in root['commands']);assert root['beforePins']==root['afterPins']==56
assert r['sourceReadySha256']==sha(next(b for name,b in original.items() if name.endswith('/ready.json')));assert len(frames)==3 and len(r['decodeRecords'])==45;assert sum(x['expandedBytes'] for x in r['decodeRecords'])==r['expandedInputBytes']==397548
assert inputs['originalFiveCaptureValid'] is False and inputs['originalCaptureIncomplete'] is True
summary=[]
for i,f in enumerate(frames):
 assert f['index']==i;sections=f['sections'];assert len(sections)==28;assert f['phaseCounts']=={phase:sum(s['phase']==phase for s in sections) for phase in ['pre','open','post','invalid']};assert f['phaseCounts']['open']==28
 audited=[s for s in sections if 'whole134' in s];eligible=[s for s in audited if s['fullyWeightedFormedOpen']]
 assert f['counts']=={'totalSections':28,'excluded':28-len(audited),'placeholder':sum(s['placeholder'] for s in sections),'fullyWeightedFormedOpen':len(eligible)};assert len(eligible)==4 and len(audited)==4
 for s in audited:
  for key in ['whole134','core128']:
   x=s[key];assert x['summary']['properIntersectionCount']==len(x['properIntersections']);assert x['summary']['collinearOverlapCount']==len(x['collinearOverlaps']);assert x['summary']['nonAdjacentEndpointTouchCount']==len(x['nonAdjacentEndpointTouches']);assert x['summary']['zeroLengthSegmentCount']==len(x['zeroLengthSegments']);assert x['summary']['duplicatePointCount']==len(x['duplicatePoints'])
 def totals(rows):
  return {'sectionCount':len(rows),'properIntersections':sum(s['whole134']['summary']['properIntersectionCount'] for s in rows),'collinearOverlaps':sum(s['whole134']['summary']['collinearOverlapCount'] for s in rows),'nonAdjacentEndpointTouches':sum(s['whole134']['summary']['nonAdjacentEndpointTouchCount'] for s in rows),'zeroLengthSegments':sum(s['whole134']['summary']['zeroLengthSegmentCount'] for s in rows),'duplicatePoints':sum(s['whole134']['summary']['duplicatePointCount'] for s in rows),'sectionsWithUndersideBelowFace':sum(s['core128']['summary']['raysWithUndersideBelowFace']>0 for s in rows)}
 assert f['fullyWeightedFormedOpenTopology']==totals(eligible)
 for phase,t in f['topologyByPhase'].items():assert t==totals([s for s in audited if s['phase']==phase])
 crossed=[s for s in eligible if s['whole134']['properIntersections']];assert len(crossed)==1;s=crossed[0];assert s['slice']==16+i;assert len(s['whole134']['properIntersections'])==len(s['core128']['properIntersections'])==1
 whole=s['whole134']['properIntersections'][0];core=s['core128']['properIntersections'][0];assert [whole['first'],whole['second']]==[[77,80],[74,77],[72,75]][i];assert core['first']+3==whole['first'] and core['second']+3==whole['second'];assert core['x']==whole['x'] and core['y']==whole['y']
 ts=f['triangleSummary'];assert ts['count']==2*len(f['quads'])==7182;assert ts['canonicalWinding']+ts['reversedCanonicalWinding']==ts['count'];assert ts['exactDegenerate']==len(f['degenerateTriangles'])==0
 reverse=sum(x['fullyFormedOpen'] for x in f['adjacentJacobianReversals']);opposed=sum(q['fullyFormedOpen'] and q['opposingActualNormals'] for q in f['quads']);rays=sum(s['opposingRays'] for s in f['strips']);negative=sum(len(s['negativeRowAdvanceVertices']) for s in f['strips']);assert reverse==rays==negative==0;assert opposed==[2,0,3][i]
 summary.append({'index':i,'seaTime':f['seaTime'],'sections':len(sections),'excluded':28-len(audited),'formedOpen':len(eligible),'properProjectedCrossings':1,'crossedSlice':s['slice'],'wholeSegmentPair':[whole['first'],whole['second']],'coreSegmentPair':[core['first'],core['second']],'invertedUndersideFaceSections':totals(eligible)['sectionsWithUndersideBelowFace'],'formedOpenAdjacentJacobianReversals':reverse,'formedOpenOpposingQuadNormals':opposed,'opposingRays':rays,'negativeRowAdvanceVertices':negative,'maximumStoredTransverseResidual':max(x['maxAbsTransverseProjection'] for x in eligible)})
assert sum(len(f['sections']) for f in frames)==terminal['sections']==84;assert max(x['maximumStoredTransverseResidual'] for x in summary)<1.48e-5
external=0;rawexternal={};parents=set()
if args.external:
 git=[]
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
 capture=json.loads(rawexternal[inputs['captureReport']['path']]);assert not capture['valid'] and capture['incomplete'] and len(capture['capture']['frames'])==3
 assert [f['seaTime'] for f in frames]==[f['seaTime'] for f in capture['capture']['frames']]
print(json.dumps({'schema':'drawn-section-byte-arithmetic-verification/v1','pass':True,'externalRequested':args.external,'storedPayloads':len(m['payloads']),'originalAliases':sum(len(r['originalAliases']) for r in m['payloads']),'storedPayloadBytes':storedbytes,'externalReferencesChecked':external,'parentManifestsChecked':len(parents),'closureReferenceChecks':closure,'decodedFieldIdentityChecks':45 if args.external else 0,'sections':84,'formedOpenSections':12,'excludedSections':72,'frames':summary,'scope':'Byte/hash and arithmetic on already stored report; no helper/metric recomputation, physics, rendering or FPS.'},indent=2))
