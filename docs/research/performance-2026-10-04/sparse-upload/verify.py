#!/usr/bin/env python3
"""Independent bytes/decompression/alias verification; no game/check/build/network execution."""
from pathlib import Path
import gzip,hashlib,json,re
HERE=Path(__file__).resolve().parent
manifest=json.loads((HERE/'manifest.json').read_text())
def sha(raw):return hashlib.sha256(raw).hexdigest()
def check(p,pin):
 raw=p.read_bytes();assert len(raw)==pin['bytes'] and sha(raw)==pin['sha256'],str(p);return raw
originals=0;stored=0;expanded=0;paths=set()
for row in manifest['entries']:
 p=HERE/row['storedPath'];raw=p.read_bytes()
 assert len(raw)==row['storedBytes'] and sha(raw)==row['storedSha256'],str(p)
 if row['encoding']=='gzip-mtime0':
  assert raw[4:8]==b'\0'*4;raw=gzip.decompress(raw)
 else:assert row['encoding']=='identity'
 assert len(raw)==row['expandedBytes'] and sha(raw)==row['expandedSha256'],str(p)
 assert row['originals']
 for pin in row['originals']:
  assert pin['path'] not in paths;paths.add(pin['path']);original=check(Path(pin['path']),pin)
  assert original==raw,pin['path'];originals+=1
 if '.test.' in p.name:assert '.txt' in p.name,str(p)
 stored+=row['storedBytes'];expanded+=row['expandedBytes']
assert originals==manifest['originalFileCount'] and len(manifest['entries'])==manifest['uniquePayloadCount']
assert originals-len(manifest['entries'])==manifest['exactDuplicateOriginalAliases']
assert stored==manifest['storedEvidenceBytes'] and expanded==manifest['expandedUniqueBytes']
extpin=manifest['externalAuthority'];z=check(HERE/extpin['path'],extpin);assert z[4:8]==b'\0'*4
raw=gzip.decompress(z);assert len(raw)==extpin['expandedBytes'] and sha(raw)==extpin['expandedSha256']
ext=json.loads(raw);refs=[]
for arm in ext['completeSources']:
 for pin in arm['files']:refs.append({'path':str(Path(arm['root'])/pin['path']),'bytes':pin['bytes'],'sha256':pin['sha256']})
for scope in ext['compiled']:
 for pin in scope['files']:refs.append({'path':str(Path(scope['outputRoot'])/pin.get('path',pin.get('name'))),'bytes':pin['bytes'],'sha256':pin['sha256']})
for pin in ext['sharedPublic']['files']:refs.append({'path':str(Path(ext['sharedPublic']['root'])/pin['path']),'bytes':pin['bytes'],'sha256':pin['sha256']})
refs.extend(ext['dependencies']['packageRecords']+ext['dependencies']['lockFiles']+ext['borrowedLauncherOrigins'])
fixture=ext['controlledFixture'];refs.append(fixture['source']);refs.extend(fixture['sourceMetadata']+fixture['cases'])
proto=ext['prototypeOriginalAndCandidate']
for pin in proto['files']:
 for arm in ['original','candidate']:
  if pin[arm+'Sha256'] is None:continue
  refs.append({'path':str(Path('/private/tmp/surf-sparse-upload-20261004')/arm/pin['path']),'bytes':pin[arm+'Bytes'],'sha256':pin[arm+'Sha256']})
for pin in refs:check(Path(pin['path']),pin)
# Local Markdown targets, excluding HTTPS, must resolve to stored/external canonical authority.
localLinks=[]
for target in re.findall(r'\]\(([^)]+)\)',(HERE/'README.md').read_text()):
 if target.startswith(('http:','https:')):continue
 assert (HERE/target).exists(),target;localLinks.append(target)
summary={'valid':True,'scope':'Archive byte/decompression/alias and external-reference verification only; no new measurement','originalFiles':originals,'uniquePayloads':len(manifest['entries']),'exactDuplicateOriginalAliases':originals-len(manifest['entries']),'storedEvidenceBytes':stored,'expandedUniqueBytes':expanded,'externalByteReferencesVerified':len(refs),'markdownLinksVerified':len(localLinks),'manifestSha256':sha((HERE/'manifest.json').read_bytes())}
(HERE/'verification.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary))
