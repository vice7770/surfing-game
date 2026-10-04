#!/usr/bin/env python3
"""Verify archived bytes and identities; never import or run game/experiment code."""
import argparse,gzip,hashlib,json,struct,subprocess,zlib
from pathlib import Path
A=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
def check(b,n,h,label):
 assert len(b)==n, f'{label}: bytes {len(b)} != {n}'
 assert sha(b)==h, f'{label}: SHA256 differs'
def expand(b,encoding):
 if encoding.startswith('gzip'):return gzip.decompress(b)
 if encoding.startswith('deflate'):return zlib.decompress(b)
 assert encoding=='identity',encoding
 return b
p=argparse.ArgumentParser();p.add_argument('--external',action='store_true');args=p.parse_args()
m=json.loads((A/'manifest.json').read_text());identities={};originals={};rawrecords={};storedbytes=0
for r in m['payloads']:
 path=A/r['storedPath'];b=path.read_bytes();check(b,r['storedBytes'],r['storedSha256'],str(path));raw=expand(b,r['encoding']);check(raw,r['expandedBytes'],r['expandedSha256'],str(path)+' expanded');storedbytes+=len(b)
 if r['encoding']=='gzip-generated-mtime0':assert struct.unpack_from('<I',b,4)[0]==0
 for alias in r['originalAliases']:
  original=raw if r['encoding']=='gzip-generated-mtime0' else b
  check(original,alias['bytes'],alias['sha256'],alias['path']);key=(alias['bytes'],alias['sha256']);identities[key]=True;originals.setdefault(alias['path'],[]).append((alias,original));rawrecords[alias['path']]=original
for r in m.get('generatedRecords',[]):check((A/r['path']).read_bytes(),r['bytes'],r['sha256'],r['path'])
external_keys={(r['bytes'],r['sha256']) for r in m['externalReferences']};closure=0
def walk(o,label):
 global closure
 if isinstance(o,dict):
  if isinstance(o.get('path'),str) and o['path'].startswith('/') and isinstance(o.get('bytes'),int) and isinstance(o.get('sha256'),str):
   key=(o['bytes'],o['sha256']);assert key in identities or key in external_keys,f'{label}: unbound {o["path"]}';closure+=1
  for v in o.values():walk(v,label)
 elif isinstance(o,list):
  for v in o:walk(v,label)
for name in m['closureAuthorities']:walk(json.loads(rawrecords[name]),name)
def original(path):
 rows=originals[path];assert len(rows)==1,f'Ambiguous original {path}';return rows[0][1]
reportpath=next(k for k in originals if k.endswith('/root-run/capture/report.json'));report=json.loads(original(reportpath));capture=report['capture'];frames=capture['frames'];fields=capture['fields']
assert report['valid'] is False and capture['state']=='failed' and len(frames)==3
assert report['authorityUnchangedAfter'] is True
assert len(report['artifacts'])==107 and len(fields)==106
assert sum(r['bytes'] for r in report['artifacts'])==report['storedBytes']==6362979
widths={'Float32Array':4,'Uint32Array':4,'Int32Array':4,'Uint8Array':1}
for f in fields:
 assert f['retained'] is True and f['elements']*widths[f['type']]==f['bytes'],f['label']
 b=original(f['file']['path']);check(b,f['file']['bytes'],f['file']['sha256'],f['label']+' compressed');raw=gzip.decompress(b)
 check(raw,f['bytes'],f['sha256'],f['label']);check(raw,f['file']['expandedBytes'],f['file']['expandedSha256'],f['label']+' expanded')
for i,f in enumerate(frames):
 assert f['index']==i and f['status']['seaTime']==f['seaTime']
 assert f['status']['compute']=='gpu' and f['status']['cells']==116000
 assert f['surfaceRevision']==1050+i
 if i:assert frames[i-1]['seaTime']+1/60==f['seaTime']
 labels={x['label'] for x in f['retainedFields']};assert labels=={x['label'] for x in fields if x['label'].startswith(f'frame-{i}/')}
 # The first bed is shared; this verifies declared lengths, not geometric or material quality.
 assert f['grid']['nx']*f['grid']['nz']*2*4==next(x['bytes'] for x in f['retainedFields'] if x['label']==f'frame-{i}/surface')
 assert f['maskGrid']['nx']*f['maskGrid']['nz']==next(x['bytes'] for x in f['retainedFields'] if x['label']==f'frame-{i}/mask')
e=report['export'];b=original(e['file']['path']);check(b,e['bytes'],e['sha256'],'export compressed');raw=zlib.decompress(b) if e['deflated'] else b;check(raw,e['expandedBytes'],e['expandedSha256'],'export expanded')
magic,n=struct.unpack_from('<II',raw);assert magic==0x53455431 and n<=len(raw)-8
header=json.loads(raw[8:8+n]);assert header==e['header'];start=8+((n+3)//4)*4;floatwords=sum(count for _,count in header['arrays']);assert start+4*floatwords==len(raw)
assert header['solverTime']+header['seaTimeOffset']==e['pausedSeaTime'];assert e['pausedSeaTime']>frames[-1]['seaTime'];assert e['snapshotUnchanged'] and e['outstandingSteps']==0
assert 'heldViews' not in report and not any(r['path'].endswith('.png') for r in report['artifacts'])
for port in ['4240','9650','4200']:assert report['postPorts'][port]=={'closed':True,'reason':'ECONNREFUSED'}
git_refs=[];external_count=0
if args.external:
 for r in m['externalReferences']:
  v=r['verification']
  if v['kind']=='git':git_refs.append(r);continue
  b=expand(Path(v['path']).read_bytes(),v['encoding']);check(b,r['bytes'],r['sha256'],r['originalPath']);external_count+=1
 if git_refs:
  repos={r['verification']['repository'] for r in git_refs};assert len(repos)==1
  proc=subprocess.Popen(['git','cat-file','--batch'],cwd=next(iter(repos)),stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
  try:
   for r in git_refs:
    v=r['verification'];expr=v['commit']+':'+v['relativePath'];proc.stdin.write((expr+'\n').encode());proc.stdin.flush();line=proc.stdout.readline();parts=line.rstrip(b'\n').split();assert len(parts)==3 and parts[1]==b'blob',line
    n=int(parts[2]);b=proc.stdout.read(n);assert proc.stdout.read(1)==b'\n';check(b,r['bytes'],r['sha256'],expr);external_count+=1
   proc.stdin.close();assert proc.wait()==0
  finally:
   if proc.poll() is None:proc.kill();proc.wait()
result={'schema':'live-big-archive-byte-verification/v1','pass':True,'externalRequested':args.external,'storedPayloads':len(m['payloads']),'originalAliases':sum(len(r['originalAliases']) for r in m['payloads']),'storedPayloadBytes':storedbytes,'closureReferenceChecks':closure,'externalReferencesChecked':external_count,'capturedFrames':len(frames),'retainedFields':len(fields),'transportArtifacts':len(report['artifacts']),'exportFloatWords':floatwords,'exportSeaTime':e['pausedSeaTime'],'scope':'Byte/hash/type-length/record/revision/SET1 clock identities only; no physical or render replay.'}
print(json.dumps(result,indent=2))
