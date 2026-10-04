#!/usr/bin/env python3
"""Archive integrity only; no numerical/native rerun or tube acceptance claim."""
from pathlib import Path
import gzip,hashlib,json
root=Path(__file__).resolve().parent
manifest=json.loads((root/'manifest.json').read_text())
for name,r in manifest['files'].items():
 b=(root/name).read_bytes()
 assert len(b)==r['bytes'] and hashlib.sha256(b).hexdigest()==r['sha256'],name
copies=json.loads((root/'original-copies.json').read_text())
for name,r in copies.items():
 b=(root/name).read_bytes()
 if r.get('losslessGzip'):
  b=gzip.decompress(b)
  assert len(b)==r['originalBytes'] and hashlib.sha256(b).hexdigest()==r['originalSha256'],name
 else:assert len(b)==r['bytes'] and hashlib.sha256(b).hexdigest()==r['sha256'],name
assert hashlib.sha256(gzip.decompress((root/'geometry/report.json.gz').read_bytes())).hexdigest()==manifest['geometryOriginalReportSha256']
for name in ['attempt-3','menu-big']:
 r=json.loads((root/name/'native-first-owner.json').read_text())
 assert r['complete'] and r['independentClosureValid'],name
 assert all(r['closedPorts'].values()),name
 ports=r.get('untouchedUserPortsOpen',r.get('userPortsOpenAfter'))
 assert ports and all(ports.values()),name
print(json.dumps({'verifiedFiles':len(manifest['files']),'originalCopies':len(copies),'nativeOwnersClosed':2,'numericalOrNativeRerun':False,'tubeGoalComplete':False}))
