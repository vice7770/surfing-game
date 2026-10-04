#!/usr/bin/env python3
"""Read-only byte verification of the bounded analyzer outcome; never runs native resources."""
import hashlib,json
from pathlib import Path
W=Path(__file__).resolve().parent
m=json.loads((W/'manifest.json').read_text())
def check(p):
 b=Path(p['file']).read_bytes()
 if len(b)!=p['bytes'] or hashlib.sha256(b).hexdigest()!=p['sha256']:raise RuntimeError('Byte pin changed: '+p['file'])
for p in m['artifactPins']+m['inputPins']+m['sourceMethodPins']:check(p)
r=json.loads((W/'readiness.json').read_text());check(r['manifest'])
for key in ['analysis','analyzer','tests','testLog','actualRunLog','sourceMethodManifest']:check(r[key])
a=json.loads((W/'actual/analysis.json').read_text())
assert a['inputPreservationRechecked'] is True
assert all(s['normalVerification']['f32WordDifferencesFromSourceReconstruction']==0 and s['indexVerification']['exactSourceCIndexSequence'] and s['cavity']['recordedEyeCrossingsExactlyMatchNative'] for s in a['snapshots'])
assert all(a['initialExteriorSightline']['exactComparison'].values())
assert 'Ran 9 tests' in (W/'unit-tests.log').read_text() and (W/'unit-tests.log').read_text().rstrip().endswith('OK')
print(json.dumps({'verified':True,'artifacts':len(m['artifactPins']),'immutableNativeInputs':len(m['inputPins']),'sourceMethods':len(m['sourceMethodPins']),'actualSnapshots':len(a['snapshots']),'plots':len(a['outputPlots']),'noNativeResourcesUsed':True}))
