from pathlib import Path
import json,hashlib,shutil
W=Path(__file__).resolve().parent;S=W/'source';P=Path('/private/tmp/tube-pop-up-contact-operands-native-v8-20261005');manifest=P/'root-complete-build-result.json';old=json.loads(manifest.read_text())
def pin(p):
 b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
assert not S.exists();S.mkdir();rows=[]
for q in old['sourcePins']:
 p=Path(q['file']);assert pin(p)==q
 rel=str(p.relative_to(Path(old['source']))) if p.is_relative_to(Path(old['source'])) else 'public/'+str(p).split('/public/',1)[1]
 rows.append((rel,p,q))
extra='docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json';p=P/'source'/extra;rows.append((extra,p,pin(p)))
assert len(rows)==588 and len({x[0] for x in rows})==588
result=[]
for rel,p,q in sorted(rows):
 d=S/rel;d.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,d);a=pin(d);assert(a['bytes'],a['sha256'])==(q['bytes'],q['sha256']);result.append({'path':rel,'bytes':a['bytes'],'sha256':a['sha256']})
(S/'node_modules').symlink_to('/Users/regina/Desktop/Projects/surfing-game/node_modules',target_is_directory=True)
r={'schema':'trial-balance-root-base-copy/v1','complete':True,'source':str(S),'sourceCount':588,'parentManifest':pin(manifest),'pins':result,'candidateOverrideApplied':False,'actualBuild':False,'actualNative':False}
p=W/'root-base-copy.json';p.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({'baseCopy':pin(p),'sourceCount':588,'candidateOverridePending':True}))
