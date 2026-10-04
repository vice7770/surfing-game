from pathlib import Path
import gzip,hashlib,json,re
A=Path(__file__).resolve().parent
def sha(b):return hashlib.sha256(b).hexdigest()
def check(p,n,s):
 b=Path(p).read_bytes();assert len(b)==n and sha(b)==s,str(p);return b
m=json.loads((A/'manifest.json').read_text());aliases=0;stored=expanded=0
for row in m['payloads']:
 b=check(A/row['archivePath'],row['storedBytes'],row['storedSha256']);stored+=len(b)
 if row['encoding']=='gzip':assert int.from_bytes(b[4:8],'little')==0;raw=gzip.decompress(b)
 else:assert row['encoding']=='raw';raw=b
 assert len(raw)==row['expandedBytes'] and sha(raw)==row['expandedSha256'];expanded+=len(raw)
 for alias in row['originalAliases']:
  assert alias['bytes']==len(raw) and alias['sha256']==sha(raw)
  assert check(alias['path'],alias['bytes'],alias['sha256'])==raw;aliases+=1
 assert not row['archivePath'].endswith('.test.ts')
for row in m['externalReferences']:check(row['path'],row['bytes'],row['sha256'])
for row in m['readOnlyUseLinks']:assert Path(row['path']).is_symlink() and str(Path(row['path']).resolve())==row['target']
checks=(A/'SHA256SUMS').read_text().splitlines()
assert checks==[row['storedSha256']+'  '+row['archivePath'] for row in m['payloads']]
report=json.loads(gzip.decompress((A/'root-cost-first/cost-report.json.gz').read_bytes()))
assert report['valid'] and report['plan']['chainCalls']==148 and len(report['conditions'])==2
for c in report['conditions']:
 assert c['exactPairsIncludingWarmInitial']==37 and len(c['rows'])==24 and c['positiveCompletePairs']==0
 assert c['cumulativeWork']['reseeds']==1 and c['cumulativeWork']['sourceCalls']==167869 and c['cumulativeWork']['guardChecks']==163369
 assert [len([r for r in c['rows'] if r['order']==order]) for order in ['AB','BA']]==[12,12]
 assert all(r['savingMs']<0 for r in c['rows'])
term=json.loads((A/'root-cost-first/terminal.json').read_text());assert term['status']=='passed' and term['exitCode']==0 and term['sourceInputsUnchanged']
assert m['uniquePayloadCount']==len(m['payloads']) and aliases==m['archivedOriginalCount'] and stored==m['totalStoredPayloadBytes'] and expanded==m['totalExpandedUniqueBytes']
for target in re.findall(r'\]\(([^)]+)\)',(A/'README.md').read_text()):assert (A/target).resolve().exists(),target
if (A/'ready.json').exists():
 ready=json.loads((A/'ready.json').read_text())
 for row in ready['files']:check(A/row['archivePath'],row['bytes'],row['sha256'])
 assert set(p.relative_to(A).as_posix() for p in A.rglob('*') if p.is_file())==set(row['archivePath'] for row in ready['files'])|{'ready.json'}
print(json.dumps({'valid':True,'uniquePayloads':len(m['payloads']),'originalAliasesVerified':aliases,'externalRefsVerified':len(m['externalReferences']),'linksVerified':len(m['readOnlyUseLinks']),'storedPayloadBytes':stored,'expandedUniqueBytes':expanded,'primaryReportExpandedSha256':sha(gzip.decompress((A/'root-cost-first/cost-report.json.gz').read_bytes()))},indent=2))
