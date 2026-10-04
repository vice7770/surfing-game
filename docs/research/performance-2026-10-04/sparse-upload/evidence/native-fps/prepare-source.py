#!/usr/bin/env python3
"""Read-only Git extraction and text/byte preparation only, after root lease release."""
from pathlib import Path
import difflib, hashlib, io, json, subprocess, tarfile

ROOT=Path('/Users/regina/Desktop/Projects/surfing-game')
WORK=Path('/private/tmp/surf-sparse-upload-fps-20261004')
SPARSE=Path('/private/tmp/surf-sparse-upload-20261004')
OLD=Path('/private/tmp/contact-height-demand-build-20261004')
BASE='6f321d704269f9f1afc73750ab2b1f4a86f61122'
PATCH_SHA='63e8c90c5c651fa684fccbd994087b8682bb438a98e6bb8ba3c2e5b42650acbe'
AUTHORITY_SHA='11f1aab08c64d7ab09a5119bf47ef53b7af73f96c2cf72f02aa1b72f8ae1ba66'
BUILD_ID='6f321d704-qa-sparse-upload'
SELECTION=['src','index.html','package.json','package-lock.json','tsconfig.json','vite.config.ts','vitest.config.ts']

def sha(raw): return hashlib.sha256(raw).hexdigest()
def record(path):
 raw=path.read_bytes();return {'path':str(path),'bytes':len(raw),'sha256':sha(raw)}
def write(name,value):
 target=WORK/name
 if target.exists():raise RuntimeError('Fresh source output required: '+str(target))
 target.write_text(json.dumps(value,indent=2)+'\n')
def git(*args): return subprocess.check_output(['git','-C',str(ROOT),*args])
def verify(path,pin):
 raw=path.read_bytes();assert len(raw)==pin['bytes'] and sha(raw)==pin['sha256'],str(path);return raw

assert git('rev-parse',BASE+'^{commit}').decode().strip()==BASE
patch=(SPARSE/'candidate.patch').read_bytes();assert sha(patch)==PATCH_SHA
authority=(SPARSE/'source-authority.json').read_bytes();assert sha(authority)==AUTHORITY_SHA
sparse=json.loads(authority);assert sparse['baseline']==BASE
changed=[r for r in sparse['files'] if r['changed']];assert len(changed)==8
# All of src plus exact tracked root build/config/package inputs. No docs/scripts/assets/tree clone.
meta={}
for entry in git('ls-tree','-r','-z',BASE,'--',*SELECTION).split(b'\0'):
 if not entry:continue
 head,rawpath=entry.split(b'\t',1);mode,kind,blob=head.decode().split();name=rawpath.decode()
 assert kind=='blob' and mode in ['100644','100755'],name
 meta[name]={'gitMode':mode,'gitBlob':blob}
archive=git('archive','--format=tar',BASE,*SELECTION)
contents={}
with tarfile.open(fileobj=io.BytesIO(archive),mode='r:') as tar:
 for member in tar:
  if member.isdir():continue
  assert member.isfile() and member.name in meta,member.name
  raw=tar.extractfile(member).read()
  assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==meta[member.name]['gitBlob']
  contents[member.name]=raw
assert set(contents)==set(meta)
# The exact full-tree patch must regenerate from independent accepted blobs and frozen candidate bytes.
overlays=[];diff=[]
for row in changed:
 name=row['path'];original=contents.get(name,b'');candidate=(SPARSE/'candidate'/name).read_bytes()
 assert len(original)==row['originalBytes'] and (sha(original) if name in contents else None)==row['originalSha256']
 assert len(candidate)==row['candidateBytes'] and sha(candidate)==row['candidateSha256']
 diff.extend(difflib.unified_diff(original.decode().splitlines(True),candidate.decode().splitlines(True),fromfile='a/'+name if name in contents else '/dev/null',tofile='b/'+name))
 overlays.append({'stage':'sparse-only','path':name,'source':str(SPARSE/'candidate'/name),'bytes':len(candidate),'sha256':sha(candidate)})
assert ''.join(diff).encode()==patch,'Frozen exact eight-path patch mismatch'
arm_records=[]
for arm in ['baseline','candidate']:
 target=WORK/arm;assert not target.exists(),str(target);target.mkdir()
 outputs=dict(contents)
 if arm=='candidate':
  for overlay in overlays:outputs[overlay['path']]=(Path(overlay['source'])).read_bytes()
 files=[]
 for name,raw in sorted(outputs.items()):
  p=target/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw)
  if name in meta:p.chmod(int(meta[name]['gitMode'][-3:],8))
  files.append({'path':name,**meta.get(name,{'gitMode':None,'gitBlob':None}),'baselineBytes':len(contents.get(name,b'')),'baselineSha256':sha(contents[name]) if name in contents else None,'bytes':len(raw),'sha256':sha(raw),'finalOverlayStage':'sparse-only' if arm=='candidate' and name in {o['path'] for o in overlays} else None})
 (target/'node_modules').symlink_to(ROOT/'node_modules',target_is_directory=True)
 (target/'public').symlink_to(ROOT/'public',target_is_directory=True)
 arm_records.append({'arm':arm,'root':str(target),'files':files,'fileCount':len(files),'bytes':sum(r['bytes'] for r in files),'nonliteralOrResolutionBlockers':[],'sourceScope':'All tracked src and the six root client/config/package inputs; public/shared dependencies referenced read-only.'})
# Compiled reuse is intentionally declined: older provenance pins a 246-file literal closure only.
old=json.loads((OLD/'source-manifest.json').read_text());old_arm=next(a for a in old['arms'] if a['arm']=='candidate')
old_names={r['path'] for r in old_arm['files']}
write('compiled-reuse-assessment.json',{'decision':'Do not reuse old compiled arm; prepare two matched builds','oldSourceAuthority':record(OLD/'source-manifest.json'),'oldManifest':record(OLD/'candidate/build-manifest.json'),'oldLiteralFiles':len(old_names),'acceptedFullSourceFiles':len(contents),'acceptedPathsNotInOldAuthority':sorted(set(contents)-old_names),'reason':'No complete accepted full-source authority byte proof for old compiled candidate. This does not assert every old runtime import differs.'})
write('source-manifest.json',{'schema':'sparse-upload-two-arm-build-source/v1','stage':'source-only; strict/build/syntax/dryplan/hardware unexecuted','baseline':BASE,'documentationHeadAtPreparation':None,'selection':SELECTION,'extraction':'Read-only git archive; each extracted byte sequence independently checked against accepted Git blob SHA-1. Exact regenerated patch SHA-256 checked.','overlaysAppliedInOrder':overlays,'runtimePatch':record(SPARSE/'candidate.patch'),'originalSparseAuthority':record(SPARSE/'source-authority.json'),'dependencyUse':'Read-only shared node_modules/public symlinks; runner config loader and owned per-arm cache; no asset/install copies','publicAssetsCopied':False,'fullRepositoryCopied':False,'arms':arm_records})
old_dep=json.loads((OLD/'dependency-authority.json').read_text())
for pin in old_dep['packageRecords']:verify(Path(pin['path']),pin)
old_dep.update(schema='sparse-upload-build-dependencies/v1',lockFiles=[{'arm':arm,'path':str(WORK/arm/'package-lock.json'),**{k:v for k,v in record(WORK/arm/'package-lock.json').items() if k!='path'}} for arm in ['baseline','candidate']])
write('dependency-authority.json',old_dep)
write('extraction-terminal.json',{'stage':'source-preparation-complete','baseline':BASE,'completeBaselineFiles':len(contents),'candidateAdditionalFiles':1,'candidateChangedOrAddedFiles':len(overlays),'archiveBytes':len(archive),'archiveSha256':sha(archive),'sourceManifest':record(WORK/'source-manifest.json'),'compiledReuse':'declined','sourceImportsExecuted':False,'checks':False,'build':False,'network':False,'GitMutations':False,'publicOrDependenciesCopied':False})
print(json.dumps({'sourcePrepared':True,'baselineFiles':len(contents),'candidateFiles':len(contents)+1,'patchSha256':PATCH_SHA,'buildsOrChecksExecuted':False}))
