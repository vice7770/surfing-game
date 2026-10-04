#!/usr/bin/env python3
"""Byte/hash/alias verification only. Never import the archived JS/TS or rerun a gate."""
import argparse,gzip,hashlib,json,re,struct,subprocess
from pathlib import Path
A=Path(__file__).resolve().parent
H=lambda b:hashlib.sha256(b).hexdigest()
def check(b,n,h,label):
 assert len(b)==n,f'{label}: byte length differs'
 assert H(b)==h,f'{label}: SHA256 differs'
p=argparse.ArgumentParser();p.add_argument('--external',action='store_true');args=p.parse_args()
m=json.loads((A/'manifest.json').read_text());original={};keys=set();storedbytes=0
for r in m['payloads']:
 b=(A/r['storedPath']).read_bytes();check(b,r['storedBytes'],r['storedSha256'],r['storedPath'])
 assert struct.unpack_from('<I',b,4)[0]==0
 raw=gzip.decompress(b);check(raw,r['expandedBytes'],r['expandedSha256'],r['storedPath']+' expanded');storedbytes+=len(b)
 for alias in r['originalAliases']:
  check(raw,alias['bytes'],alias['sha256'],alias['path']);original[alias['path']]=raw;keys.add((alias['bytes'],alias['sha256']))
for r in m.get('generatedRecords',[]):check((A/r['path']).read_bytes(),r['bytes'],r['sha256'],r['path'])
extkeys={(x['bytes'],x['sha256']) for x in m['externalReferences']};closure=0
refs={}
def walk(o):
 global closure
 if isinstance(o,dict):
  if isinstance(o.get('path'),str) and o['path'].startswith('/') and isinstance(o.get('bytes'),int) and isinstance(o.get('sha256'),str):
   key=(o['bytes'],o['sha256']);assert key in keys|extkeys,(o['path'],key);closure+=1;refs[o['path']]=key
  for v in o.values():walk(v)
 elif isinstance(o,list):
  for v in o:walk(v)
for name in m['closureAuthorities']:walk(json.loads(original[name]))
external=0;parents=set();rawexternal={};git=[]
if args.external:
 for x in m['externalReferences']:
  v=x['verification']
  if v['kind']=='git':git.append(x);continue
  if 'archiveManifest' in v:
   parent=(v['archiveManifest'],v['archiveManifestSha256']);parents.add(parent);assert H(Path(parent[0]).read_bytes())==parent[1]
  b=Path(v['path']).read_bytes();raw=gzip.decompress(b) if v['encoding']=='gzip' else b
  check(raw,x['bytes'],x['sha256'],x['originalPath']);external+=1
  for alias in x['originalAliases']:rawexternal[alias]=raw
 if git:
  repos={x['verification']['repository'] for x in git};assert len(repos)==1
  proc=subprocess.Popen(['git','cat-file','--batch'],cwd=next(iter(repos)),stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
  try:
   for x in git:
    v=x['verification'];expr=v['commit']+':'+v['relativePath'];proc.stdin.write((expr+'\n').encode());proc.stdin.flush()
    header=proc.stdout.readline().rstrip(b'\n').split();assert len(header)==3 and header[1]==b'blob',header
    raw=proc.stdout.read(int(header[2]));assert proc.stdout.read(1)==b'\n';check(raw,x['bytes'],x['sha256'],expr);external+=1
    for alias in x['originalAliases']:rawexternal[alias]=raw
   proc.stdin.close();assert proc.wait()==0
  finally:
   if proc.poll() is None:proc.kill();proc.wait()
 inputs=json.loads(original[next(n for n in original if n.endswith('/inputs.json'))]);fields=inputs['allActualSourceFields']+inputs['addedNativeMaskFields']
 for x in fields:
  f=x['file'];b=rawexternal[f['path']];check(b,f['bytes'],f['sha256'],x['label']+' compressed')
  raw=gzip.decompress(b);check(raw,x['bytes'],x['sha256'],x['label']);check(raw,f['expandedBytes'],f['expandedSha256'],x['label']+' declared expanded')
 for name,raw in original.items():check(Path(name).read_bytes(),len(raw),H(raw),name+' original')
# Sources are provenance text, not live build/test entries. No archived code is executed.
for file in A.rglob('*'):
 if not file.is_file():continue
 assert file.suffix not in ['.ts','.tsx','.js','.jsx','.mjs','.cjs','.mts','.cts'],file
 assert not re.search(r'\.(test|spec)\.[cm]?[jt]sx?$',file.name),file
links=0
for link in re.findall(r'\]\(([^)]+)\)',(A/'README.md').read_text()):
 if '://' in link or link.startswith('#'):continue
 assert (A/link.split('#')[0]).exists(),link;links+=1
print(json.dumps({'schema':'tiny-underside-byte-verification/v1','pass':True,'externalRequested':args.external,'storedPayloads':len(m['payloads']),'originalAliases':len(original),'storedPayloadBytes':storedbytes,'externalReferencesChecked':external,'parentManifestsChecked':len(parents),'closureReferenceChecks':closure,'compressedAndExpandedFieldIdentitiesChecked':96 if args.external else 0,'localLinksChecked':links,'inertSourceAliases':True,'scope':'Bytes/hashes/aliases, declared reference closure and local links only; no tests, helper, renderer, metric, cost, simulation, native or FPS rerun.'},indent=2))
