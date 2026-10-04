#!/usr/bin/env python3
"""Future local compiled-byte binding only; requires root-reviewed successful strict/build checks."""
from pathlib import Path
import hashlib,json
WORK=Path('/private/tmp/surf-sparse-upload-fps-20261004')
def rec(p):
 raw=p.read_bytes();return {'path':str(p),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
def jsonfile(p):return json.loads(p.read_text())
def verify(p,pin):
 actual=rec(p);assert actual['bytes']==pin['bytes'] and actual['sha256']==pin['sha256'],str(p)
ready=jsonfile(WORK/'ready.json');source=jsonfile(WORK/'source-manifest.json');terminal=jsonfile(WORK/'build-terminal.json')
assert terminal['status']=='passed' and terminal['readySha256']==rec(WORK/'ready.json')['sha256']
assert terminal['sourceManifestSha256']==rec(WORK/'source-manifest.json')['sha256']
arms={}
for arm in ['baseline','candidate']:
 pin=next(r for r in terminal['armManifests'] if r['arm']==arm);verify(Path(pin['path']),pin)
 manifest=jsonfile(Path(pin['path']));assert manifest['arm']==arm and manifest['runtimeBaseline']==source['baseline']
 assert manifest['buildId']=='6f321d704-qa-sparse-upload' and not manifest['publicAssetCopies']
 for row in manifest['outputRecords']:verify(Path(manifest['outputRoot'])/row['path'],row)
 arms[arm]=pin
bp=jsonfile(Path(arms['baseline']['path']));cp=jsonfile(Path(arms['candidate']['path']))
assert bp['surfZoneWorker']!=cp['surfZoneWorker'],'Sparse candidate must use changed ordinary worker artifact'
bindings={'schema':'sparse-upload-fps-bindings/v1','pending':False,'buildReady':rec(WORK/'ready.json'),'sourceManifest':rec(WORK/'source-manifest.json'),'buildTerminal':rec(WORK/'build-terminal.json'),'arms':arms,'publicAssets':rec(WORK/'public-assets.json'),'scope':'Actual completed source/compiled arm byte binding. Does not grant hardware lease.','literalBuildId':'6f321d704-qa-sparse-upload'}
assert jsonfile(WORK/'bindings.json')['pending'] is True,'One compiled binding only'
(WORK/'bindings.source-pending.json').write_bytes((WORK/'bindings.json').read_bytes())
(WORK/'bindings.json').write_text(json.dumps(bindings,indent=2)+'\n')
artifacts=[rec(WORK/n) for n in ['native-owned.mjs','passive-guard.mjs','pair.mjs','survey.mjs','plan.json','public-assets.json','bindings.json','source-manifest.json','dependency-authority.json','build-terminal.json','ready.json','derivation-owned.json']]
borrowed=[rec(Path(r['path'])) for r in ready['borrowedSourceAuthorities']]
launch={'schema':'sparse-upload-fps-launch-ready/v1','stage':'Compiled/local binding; source check/dry plan and sole hardware review still required','artifacts':artifacts,'borrowedSourceAuthorities':borrowed,'compiledArms':arms,'noHardwareLaunched':True}
assert not (WORK/'launch-ready.json').exists()
(WORK/'launch-ready.json').write_text(json.dumps(launch,indent=2)+'\n')
print(json.dumps({'launchReady':rec(WORK/'launch-ready.json'),'workerArtifactsDiffer':True,'serverOrChromeStarted':False}))
