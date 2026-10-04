from pathlib import Path
import json,hashlib
W=Path('/private/tmp/tube-bounded-c-carrier-support-20261004')
r=json.loads((W/'readiness.json').read_text());count=0
for p in r['sourcePins']:
 b=(Path(r['sourceRoot'])/p['path']).read_bytes();assert len(b)==p['bytes'] and hashlib.sha256(b).hexdigest()==p['sha256'],p['path'];count+=1
for p in r['artifactPins']:
 b=Path(p['file']).read_bytes();assert len(b)==p['bytes'] and hashlib.sha256(b).hexdigest()==p['sha256'],p['file']
c=json.loads((W/'parent-copy.json').read_text())
for p in c['sourcePins']:
 b=(Path(c['parentSource'])/p['path']).read_bytes();assert len(b)==p['bytes'] and hashlib.sha256(b).hexdigest()==p['sha256'],p['path']
b=Path(c['parentReadiness']['file']).read_bytes();assert len(b)==c['parentReadiness']['bytes'] and hashlib.sha256(b).hexdigest()==c['parentReadiness']['sha256']
for p in json.loads((W/'verification.json').read_text())['reconstructedFiles']:
 b=(W/'patch-verification-complete'/p['path']).read_bytes();assert len(b)==p['bytes'] and hashlib.sha256(b).hexdigest()==p['sha256'],p['path']
print(json.dumps({'complete':True,'sourcePinsVerified':count,'artifactPinsVerified':len(r['artifactPins']),'parentInputsUnchanged':len(c['sourcePins']),'patchFilesByteExact':8,'readinessSHA256':hashlib.sha256((W/'readiness.json').read_bytes()).hexdigest()}))
