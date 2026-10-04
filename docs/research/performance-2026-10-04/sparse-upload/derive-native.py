#!/usr/bin/env python3
"""Pure summary of retained native reports; no new measurement or simulation."""
from pathlib import Path
import gzip,hashlib,json
HERE=Path(__file__).resolve().parent
manifest=json.loads((HERE/'manifest.json').read_text())
def load(original):
 row=next(r for r in manifest['entries'] if any(a['path']==original for a in r['originals']))
 raw=(HERE/row['storedPath']).read_bytes();raw=gzip.decompress(raw) if row['encoding'].startswith('gzip') else raw
 assert hashlib.sha256(raw).hexdigest()==row['expandedSha256'];return json.loads(raw),row['expandedSha256']
root='/private/tmp/surf-sparse-upload-fps-20261004/run/'
fields=['renderedFps','renderedFrameMsP50','renderedFrameMsP95','renderedFrameMsP99','renderedFrameMsMax','fps','freshSnapshotsPerSecond','physicsStepsPerWallSecond','simulationSecondsPerWallSecond','snapshotIntervalMsP50','snapshotIntervalMsP95','snapshotIntervalMsP99','snapshotIntervalMsMax']
rows={}
for arm in ['baseline','candidate']:
 raw,pin=load(root+arm+'/fps.json');r=raw['results'][0]
 rows[arm]={'rawSha256':pin,'valid':raw['valid'],'nativeReference':raw['nativeAudit']['nativeReference'],'metrics':{f:r[f] for f in fields},'pipelineMsP50':r['pipelineMsP50'],'pipelineMsP95':r['pipelineMsP95'],'lastCompleteWallBins':[{k:b[k] for k in ['from','freshSnapshotsPerSecond','simulationTimeline'] if k in b}|{'pipelineMsP50':b['pipelineMsP50']} for b in r['simulationTimeline'] if 78<=b['from']<90]}
result={'scope':'Pure summary; fixed-order native A then B, not phase-matched sea bins or causal attribution','decision':'HOLD / not adopted; no composition experiment requested','arms':rows,'limits':['Single fixed-order pair; environment/thermal/queue/GPU variation remain','Pipeline per-stage quantiles are neither additive nor full request latency','Fresh progression improved but displayed frame p95 and snapshot p99 worsened','Previous GPU cost is a controlled F32 handover into accepted6f3 with fresh rider/particle streams; not ordinary historical replay','No moving-tube quality or FPS benefit inferred from bytes/cell count']}
(HERE/'native-summary.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'derivedOnly':True,'nativeReportsValidated':2,'decision':result['decision']}))
