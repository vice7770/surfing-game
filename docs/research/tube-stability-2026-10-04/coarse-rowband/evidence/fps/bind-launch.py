#!/usr/bin/env python3
"""Future local metadata binding only, after root-approved successful checks/build."""
from pathlib import Path
import hashlib,json
W=Path('/private/tmp/surf-tube-rowband-fps-20261004')
def rec(p):
 b=p.read_bytes();return {'path':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
terminal=json.loads((W/'build-terminal.json').read_text());assert terminal['status']=='passed'
assert terminal['readySha256']==rec(W/'ready.json')['sha256'] and terminal['sourceManifestSha256']==rec(W/'source-manifest.json')['sha256']
assert not (W/'bindings.json').exists()
arms={}
for pin in terminal['armManifests']:
 r=rec(Path(pin['path']));assert r['bytes']==pin['bytes'] and r['sha256']==pin['sha256'];arms[pin['arm']]=pin
assert sorted(arms)==['baseline','candidate']
value={'schema':'tube-rowband-fps-bindings/v1','pending':False,'buildReady':rec(W/'ready.json'),'sourceManifest':rec(W/'source-manifest.json'),'buildTerminal':rec(W/'build-terminal.json'),'publicAssets':rec(W/'public-assets.json'),'arms':arms,'baselineReused':True,'sourceOnlyPreparationDoesNotGrantHardware':True}
(W/'bindings.json').write_text(json.dumps(value,indent=2)+'\n')
print(json.dumps({'bindings':rec(W/'bindings.json'),'serverChromeStarted':False}))
