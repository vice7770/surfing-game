#!/usr/bin/env python3
"""Local byte authority only. No imports of game modules, checks/build/network/hardware."""
from pathlib import Path
import hashlib,json
WORK=Path('/private/tmp/surf-sparse-upload-fps-20261004')
ROOT=Path('/Users/regina/Desktop/Projects/surfing-game')
ORIGIN=Path('/private/tmp/contact-height-demand-fps-20261004')
SPARSE=Path('/private/tmp/surf-sparse-upload-20261004')
def rec(p):
 raw=p.read_bytes();return {'path':str(p),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
def verify(p,pin):
 actual=rec(p);assert actual['bytes']==pin['bytes'] and actual['sha256']==pin['sha256'],str(p)
source=json.loads((WORK/'source-manifest.json').read_text())
assert source['baseline']=='6f321d704269f9f1afc73750ab2b1f4a86f61122'
for arm in source['arms']:
 assert arm['fileCount']==len(arm['files'])
 for row in arm['files']:verify(Path(arm['root'])/row['path'],row)
 for name in ['node_modules','public']:assert (Path(arm['root'])/name).readlink()==ROOT/name
baseline={r['path']:r for r in source['arms'][0]['files']};candidate={r['path']:r for r in source['arms'][1]['files']}
diff=[name for name in sorted(set(baseline)|set(candidate)) if baseline.get(name,{}).get('sha256')!=candidate.get(name,{}).get('sha256')]
assert diff==[r['path'] for r in source['overlaysAppliedInOrder']] and len(diff)==8
assert len(baseline)==550 and len(candidate)==551
assets=json.loads((WORK/'public-assets.json').read_text())
assert assets['root']==str(ROOT/'public') and len(assets['files'])==38
for row in assets['files']:verify(ROOT/'public'/row['path'],row)
dep=json.loads((WORK/'dependency-authority.json').read_text())
for row in dep['packageRecords']+dep['lockFiles']:verify(Path(row['path']),row)
owned=['derive-owned.py','prepare-source.py','freeze-source.py','native-owned.mjs','native-owned.mjs.diff','passive-guard.mjs','passive-guard.mjs.diff','pair.mjs','pair.mjs.diff','build-only.mjs','build-only.mjs.diff','bind-launch.py','survey.mjs','survey.patch','derivation.json','derivation-owned.json','public-assets.json','bindings.json','plan.json','source-manifest.json','dependency-authority.json','compiled-reuse-assessment.json','extraction-terminal.json','README.md','proposal.md']
borrowed=[ORIGIN/n for n in ['survey.mjs','native-owned.mjs','passive-guard.mjs','pair.mjs','derivation.json','public-assets.json','run/report.json']]+[Path('/private/tmp/contact-height-demand-build-20261004')/'build-only.mjs',ROOT/'scripts/browser/cdp.mjs',SPARSE/'candidate.patch',SPARSE/'source-authority.json']
ready={'schema':'sparse-upload-native-fps-prepared/v1','stage':'source-ready; strict/build/syntax/dryplan/hardware unexecuted','directory':str(WORK),'baseline':source['baseline'],'runtimePatch':source['runtimePatch'],'preparedArtifacts':[rec(WORK/n) for n in owned],'borrowedSourceAuthorities':[rec(p) for p in borrowed],'sourceAuthority':rec(WORK/'source-manifest.json'),'baselineSourceRoot':str(WORK/'baseline'),'candidateSourceRoot':str(WORK/'candidate'),'completeArmFileCounts':[550,551],'changedPaths':diff,'scopeBlockers':{'buildSource':[]},'proposedBuild':{'commonBuildId':'6f321d704-qa-sparse-upload','mechanism':'Existing vite.config.ts BUILD_ID environment override in both arms; no source change','command':'env BUILD_ID=6f321d704-qa-sparse-upload SPARSE_FPS_READY_SHA256=<reviewed-ready-sha> node build-only.mjs','publicAssetCopies':False,'configLoader':'runner','perArmOwnedCache':True},'pending':{'strict':True,'build':True,'compiledBindings':True,'syntax':True,'dryplan':True,'rootCompiledReview':True,'hardwareLease':True},'executed':{'sourceExtractionAndLocalByteVerification':True,'gameImport':False,'strict':False,'build':False,'syntax':False,'dryplan':False,'server':False,'browser':False,'GPU':False,'FPS':False,'productionEdits':False,'GitMutations':False}}
assert not (WORK/'ready.json').exists()
(WORK/'ready.json').write_text(json.dumps(ready,indent=2)+'\n')
print(json.dumps({'ready':rec(WORK/'ready.json'),'sourceAuthority':ready['sourceAuthority'],'baselineFiles':550,'candidateFiles':551,'changedPaths':diff,'publicAssets':{'files':38,'bytes':sum(row['bytes'] for row in assets['files'])},'checksOrBuildsExecuted':False}))
