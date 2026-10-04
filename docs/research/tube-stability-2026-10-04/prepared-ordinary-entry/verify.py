from pathlib import Path
import json,gzip,hashlib,sys
A=Path(__file__).resolve().parent;R=A.parents[3]
h=lambda b:hashlib.sha256(b).hexdigest()
m=json.loads((A/'manifest.json').read_text())
actual={str(p.relative_to(A)) for p in A.rglob('*') if p.is_file() and p.name!='manifest.json'}
assert actual==set(m['files'])
for rel,v in m['files'].items():
 b=(A/rel).read_bytes();assert len(b)==v['bytes'] and h(b)==v['sha256'],rel
originals=json.loads((A/'original-receipts.json').read_text())
for v in originals:
 b=(A/v['archive']).read_bytes();b=gzip.decompress(b) if v['gzip'] else b
 assert len(b)==v['bytes'] and h(b)==v['sha256'],v['archive']
 if '--original' in sys.argv:assert Path(v['original']).read_bytes()==b,v['original']
refs=json.loads((A/'input-references.json').read_text())['references']
for v in refs:
 b=(R/v['repository']).read_bytes();assert len(b)==v['bytes'] and h(b)==v['sha256'],v['repository']
d=json.loads(gzip.decompress((A/'native/report.json.gz').read_bytes()))
steps=[json.loads(x) for x in gzip.decompress((A/'native/steps.ndjson.gz').read_bytes()).splitlines()]
assert steps==d['steps'] and len(steps)==314 and d['complete'] and d['firstFailure'] is None
assert d['stop']['step']==314 and d['stop']['separation']=='balance' and d['video'] is None
assert d['entry']['firstConnectedWitnessEntry'] is None
for v in d['artifacts']:
 p=A/'native'/v['file'];p=p if p.exists() else Path(str(p)+'.gz')
 b=p.read_bytes();b=gzip.decompress(b) if p.suffix=='.gz' else b
 assert len(b)==v['bytes'] and h(b)==v['sha256'],v['file']
print(json.dumps({'archiveVerified':True,'exactPayloads':len(originals),'priorReferences':len(refs),'exactSteps':len(steps),'originalScratchChecked':'--original' in sys.argv,'entryOrSourceFixAccepted':False,'scope':'Storage and recorded-receipt checks only; no game imports, numerical/geometry reconstruction, owner execution or live probes.'},indent=2))
