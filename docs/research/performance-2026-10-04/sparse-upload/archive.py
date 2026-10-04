#!/usr/bin/env python3
"""Archive existing bytes only; never invokes source, checks, game, network or hardware."""
from pathlib import Path
import gzip,hashlib,json
HERE=Path(__file__).resolve().parent
PROTO=Path('/private/tmp/surf-sparse-upload-20261004')
FPS=Path('/private/tmp/surf-sparse-upload-fps-20261004')
BASE='6f321d704269f9f1afc73750ab2b1f4a86f61122'
def sha(raw):return hashlib.sha256(raw).hexdigest()
def rec(p):
 raw=p.read_bytes();return {'path':str(p),'bytes':len(raw),'sha256':sha(raw)}
selected=[]
def add(path,label):
 assert path.is_file() and not path.is_symlink(),str(path)
 selected.append((path,label))
def tree(root,label):
 for p in sorted(root.rglob('*')):
  if p.is_file() and not p.is_symlink():add(p,str(Path(label)/p.relative_to(root)))
# Original/candidate full dependency trees are referenced by authority, not copied.
for p in sorted(PROTO.iterdir()):
 if p.is_file() and not p.is_symlink():add(p,'prototype/'+p.name)
for name in ['checks','checks-v2']:tree(PROTO/name,'prototype/'+name)
G=PROTO/'gpu-gate'
for p in sorted(G.iterdir()):
 if p.is_file() and not p.is_symlink():add(p,'gpu-gate/'+p.name)
for name in ['checks','source-review-v1','run']:tree(G/name,'gpu-gate/'+name)
for p in sorted(FPS.iterdir()):
 if p.is_file() and not p.is_symlink():add(p,'native-fps/'+p.name)
for name in ['checks','checks-corrected','hardware-root','run']:tree(FPS/name,'native-fps/'+name)
for arm in ['baseline','candidate']:add(FPS/arm/'build-manifest.json','native-fps/'+arm+'-build-manifest.json')
# First use supplies a real readable payload path. Exact duplicate originals are explicit aliases.
entries=[];by_hash={};aliases=0
for path,label in selected:
 raw=path.read_bytes();digest=sha(raw)
 if digest in by_hash:
  entry=by_hash[digest];assert raw==entry['_raw'];entry['originals'].append(rec(path));aliases+=1;continue
 if '.test.' in Path(label).name:label+='.txt'
 compressed=len(raw)>=16384
 stored=gzip.compress(raw,compresslevel=9,mtime=0) if compressed else raw
 if compressed:label+='.gz'
 out=HERE/'evidence'/label;out.parent.mkdir(parents=True,exist_ok=True)
 assert not out.exists(),str(out);out.write_bytes(stored)
 entry={'storedPath':str(out.relative_to(HERE)),'encoding':'gzip-mtime0' if compressed else 'identity','storedBytes':len(stored),'storedSha256':sha(stored),'expandedBytes':len(raw),'expandedSha256':digest,'originals':[rec(path)],'_raw':raw}
 entries.append(entry);by_hash[digest]=entry
for entry in entries:entry.pop('_raw')
# Assets/build products and canonical source tree are external hash references only.
source=json.loads((FPS/'source-manifest.json').read_text())
external={'schema':'sparse-upload-external-authority/v1','acceptedBaseCommit':BASE,'acceptedSource':'Every baseline Git mode/blob and SHA256 is retained in the source manifest; candidate is exact accepted source plus archived eight-path patch. No full source tree or copied public/assets/binaries in this archive.','completeSources':source['arms'],'compiled':[],'sharedPublic':json.loads((FPS/'public-assets.json').read_text()),'dependencies':json.loads((FPS/'dependency-authority.json').read_text()),'controlledFixture':json.loads((G/'fixture-authority.json').read_text()),'prototypeOriginalAndCandidate':json.loads((PROTO/'source-authority.json').read_text()),'borrowedLauncherOrigins':json.loads((FPS/'ready.json').read_text())['borrowedSourceAuthorities']}
for arm in ['baseline','candidate']:
 m=json.loads((FPS/arm/'build-manifest.json').read_text());external['compiled'].append({'scope':'Native ordinary '+arm,'outputRoot':m['outputRoot'],'manifestOriginal':rec(FPS/arm/'build-manifest.json'),'files':m['outputRecords']})
compiled=json.loads((G/'compiled.json').read_text());external['compiled'].append({'scope':'Real GPU parity/complete-worker driver','outputRoot':str(G/'dist'),'manifestOriginal':rec(G/'compiled.json'),'files':compiled['files']})
external_raw=(json.dumps(external,indent=2)+'\n').encode()
(HERE/'external-authority.json.gz').write_bytes(gzip.compress(external_raw,compresslevel=9,mtime=0))
manifest={'schema':'sparse-upload-lossless-archive/v1','scope':'Existing evidence archived; sparse upload held/unadopted. No repeated measurement or runtime adoption.','acceptedBaseCommit':BASE,'runtimePatchSha256':'63e8c90c5c651fa684fccbd994087b8682bb438a98e6bb8ba3c2e5b42650acbe','entries':entries,'originalFileCount':len(selected),'uniquePayloadCount':len(entries),'exactDuplicateOriginalAliases':aliases,'storedEvidenceBytes':sum(e['storedBytes'] for e in entries),'expandedUniqueBytes':sum(e['expandedBytes'] for e in entries),'externalAuthority':{'path':'external-authority.json.gz','encoding':'gzip-mtime0','expandedBytes':len(external_raw),'expandedSha256':sha(external_raw),**{k:v for k,v in rec(HERE/'external-authority.json.gz').items() if k!='path'}}}
(HERE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({k:manifest[k] for k in ['originalFileCount','uniquePayloadCount','exactDuplicateOriginalAliases','storedEvidenceBytes','expandedUniqueBytes']}))
