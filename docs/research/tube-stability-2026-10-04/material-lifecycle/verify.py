#!/usr/bin/env python3
"""Verify archived bytes/aliases only; never import or execute game/test/runtime code."""
from pathlib import Path
import gzip,hashlib,json,re
HERE=Path(__file__).resolve().parent
manifest=json.loads((HERE/'manifest.json').read_text())
def sha(raw):return hashlib.sha256(raw).hexdigest()
def check(path,bytes_,sha_):
 raw=path.read_bytes();assert len(raw)==bytes_ and sha(raw)==sha_,str(path);return raw
originals=0;seen=set();stored=0;expanded=0
for row in manifest['entries']:
 p=HERE/row['storedPath'];raw=check(p,row['storedBytes'],row['storedSha256'])
 if row['encoding']=='gzip-mtime0':
  assert raw[4:8]==b'\0'*4;raw=gzip.decompress(raw)
 else:assert row['encoding']=='identity'
 assert len(raw)==row['expandedBytes'] and sha(raw)==row['expandedSha256'],str(p)
 assert row['originals']
 for pin in row['originals']:
  assert pin['path'] not in seen;seen.add(pin['path'])
  assert check(Path(pin['path']),pin['bytes'],pin['sha256'])==raw,pin['path'];originals+=1
 if '.test.' in p.name:assert '.txt' in p.name,str(p)
 stored+=row['storedBytes'];expanded+=row['expandedBytes']
assert originals==manifest['originalFileCount'] and len(manifest['entries'])==manifest['uniquePayloadCount']
assert originals-len(manifest['entries'])==manifest['exactDuplicateOriginalAliases']
assert stored==manifest['storedEvidenceBytes'] and expanded==manifest['expandedUniqueBytes']
assert {r['originalPath'] for r in manifest['originalPathMap']}==seen
for row in manifest['originalPathMap']:
 assert any(row['storedPath']==e['storedPath'] and row['originalPath'] in [p['path'] for p in e['originals']] for e in manifest['entries'])
for pin in manifest['externalAuthority']:check(Path(pin['path']),pin['bytes'],pin['sha256'])
links=[]
for target in re.findall(r'\]\(([^)]+)\)',(HERE/'README.md').read_text()):
 if target.startswith(('http:','https:')):continue
 assert (HERE/target).is_file(),target;links.append(target)
value={'valid':True,'scope':'Archive stored/decompressed/original-alias and external-byte verification only; no game/test/build/measurement execution','originalFiles':originals,'uniquePayloads':len(manifest['entries']),'exactDuplicateOriginalAliases':originals-len(manifest['entries']),'storedEvidenceBytes':stored,'expandedUniqueBytes':expanded,'externalReferencesVerified':len(manifest['externalAuthority']),'markdownLinksVerified':len(links),'manifestSha256':sha((HERE/'manifest.json').read_bytes())}
(HERE/'verification.json').write_text(json.dumps(value,indent=2)+'\n');print(json.dumps(value))
