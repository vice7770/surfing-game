from pathlib import Path
import gzip, hashlib, json
root=Path(__file__).resolve().parent
sha=lambda b: hashlib.sha256(b).hexdigest()
manifest=json.loads((root/'manifest.json').read_text())
assert sum(row['bytes'] for row in manifest['files'])<=16*1024*1024
for row in manifest['files']:
 p=root/row['path'];assert p.resolve().is_relative_to(root)
 data=p.read_bytes();assert len(data)==row['bytes'] and sha(data)==row['sha256'],row['path']
origins=json.loads((root/'archive-origins.json').read_text())
for row in origins:
 data=(root/row['retained']).read_bytes()
 assert len(data)==row['retainedBytes'] and sha(data)==row['retainedSha256']
 if row['compressed']:
  assert int.from_bytes(data[4:8],'little')==0
  data=gzip.decompress(data)
 assert len(data)==row['originalBytes'] and sha(data)==row['originalSha256']
for row in json.loads((root/'baseline-references.json').read_text())['files']:
 p=(root/row['retained']).resolve();assert p.is_relative_to(root.parent/'natural-entry')
 data=p.read_bytes();assert len(data)==row['bytes'] and sha(data)==row['sha256']
 if 'originalSha256' in row: assert sha(gzip.decompress(data))==row['originalSha256']
comparison=json.loads((root/'comparison.json').read_text())
assert comparison['sameTrajectoryClaim'] is False
assert all(comparison['sameRecordedConfigurationAndSpawn'].values())
assert comparison['candidateOwnerComplete']
for label,raw in [('baseline',gzip.decompress((root/'../natural-entry/corrected/native-first/report.json.gz').read_bytes())),('candidate',gzip.decompress((root/'candidate/native-first/report.json.gz').read_bytes()))]:
 assert sha(raw)==comparison['receipts'][label]['sha256']
 report=json.loads(raw);assert comparison[label]['steps']==762
 assert comparison[label]['firstStanding'] is None and comparison[label]['firstCue'] is None
owner=json.loads((root/'candidate/native-first-owner.json').read_text())
assert owner['complete'] and owner['independentClosureValid'] and owner['userServersStayedOpen']
assert owner['copiedDistUnchanged'] and owner['diagnosticSourcesUnchanged']
assert owner['closedPorts']=={'4289':True,'9699':True}
print(json.dumps({'complete':True,'files':len(manifest['files']),'retainedBytes':sum(r['bytes'] for r in manifest['files']),'originalCopiesVerified':len(origins),'resourcesStarted':False}))
