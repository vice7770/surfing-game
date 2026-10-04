#!/usr/bin/env python3
"""Pure summary of the one retained operation, never a simulation or repeated benchmark."""
from pathlib import Path
import hashlib
import json
import statistics

root = Path(__file__).resolve().parent
raw = (root / 'result.json').read_bytes()
report = json.loads(raw)
if not report['valid'] or report['exitCode'] != 0 or report['chromeExit']['code'] != 0: raise RuntimeError('Gate did not pass')
if any(report['closed'][str(port)] is not True for port in [4200,4219,9629]): raise RuntimeError('Owned closure not established')
cost = report['result']['cost']; rows = cost['rows']
if len(rows) != 24 or sum(r['order']=='AB' for r in rows) != 12 or sum(r['order']=='BA' for r in rows) != 12: raise RuntimeError('Declared balanced rows differ')
for i,row in enumerate(rows):
    if row['pair'] != i or row['order'] != ('AB' if i%2==0 else 'BA') or row['substeps'] != 2: raise RuntimeError('Row/order/substep evidence differs')
    if row['savingMs'] != row['originalMs']-row['candidateMs']: raise RuntimeError('Unpaired saving')
def stats(values):
    values=sorted(values)
    return {'median':statistics.median(values),'mean':statistics.mean(values),'min':min(values),'max':max(values)}
def summarize(group):
    values=[r['savingMs'] for r in group]
    return {'count':len(group),'pairedSavingMs':stats(values),'positive':sum(v>0 for v in values),'negative':sum(v<0 for v in values),'zero':sum(v==0 for v in values),
        'originalMs':stats([r['originalMs']for r in group]),'candidateMs':stats([r['candidateMs']for r in group]),
        'pairedPackSavingMs':stats([r['originalPackMs']-r['candidatePackMs']for r in group])}
derived={'scope':'Pure paired/order summary of retained one controlled real-GPU diagnostic; no new measurement/FPS/adoption',
    'rawPath':str(root/'result.json'),'rawSha256':hashlib.sha256(raw).hexdigest(),
    'all':summarize(rows),'orders':{order:summarize([r for r in rows if r['order']==order])for order in ['AB','BA']},
    'limits':['One fixed F32 handover phase, fresh rider/particles, no renderer competition/postMessage; not ordinary historical replay.',
        '19 positive/5 negative use exact stored timer differences: one negative is -5.960464477539063e-8ms and practically a quantized tie.',
        'Initial/detailed lifecycle allocation before warmup may cause later GC. Small same particle RNG observer overhead included.'],
    'clock':{k:cost[k]for k in ['fromTime','toTime','fromSea','toSea','dt','costPhaseMs']},
    'operation':{k:report[k]for k in ['started','ended','hardSeconds','chromePid','closed','chromeExit']}}
(root/'derived.json').write_text(json.dumps(derived,indent=2)+'\n')
print(json.dumps(derived,indent=2))
