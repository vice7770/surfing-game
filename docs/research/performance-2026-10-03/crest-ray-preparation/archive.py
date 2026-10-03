from pathlib import Path
import hashlib,json,shutil,gzip
repo=Path('/Users/regina/Desktop/Projects/surfing-game')
src=Path('/private/tmp/crest-ray-prepare-cost-20261003')
dst=repo/'docs/research/performance-2026-10-03/crest-ray-preparation'
sha=lambda b:hashlib.sha256(b).hexdigest()
files=[]
for p in sorted(src.rglob('*')):
    if not p.is_file():continue
    rel=p.relative_to(src)
    if str(rel)=='guard.test.mjs':rel=Path('guard.test.mjs.txt')
    target=dst/rel
    assert not target.exists(),str(target)
    target.parent.mkdir(parents=True,exist_ok=True)
    b=p.read_bytes();target.write_bytes(b)
    assert target.read_bytes()==b
    files.append({'path':str(rel),'originalPath':str(p),'bytes':len(b),'sha256':sha(b),'encoding':'original-bytes'})
plan=Path('/private/tmp/crest-ray-prepare-cost-plan.md')
b=plan.read_bytes();(dst/'cost-plan.md').write_bytes(b)
files.append({'path':'cost-plan.md','originalPath':str(plan),'bytes':len(b),'sha256':sha(b),'encoding':'original-bytes'})
archiveScript=Path('/private/tmp/crest-ray-preparation-archive-vitest-isolation.py')
b=archiveScript.read_bytes();(dst/'archive.py').write_bytes(b)
files.append({'path':'archive.py','originalPath':str(archiveScript),'bytes':len(b),'sha256':sha(b),'encoding':'original-bytes'})
b=(dst/'README.md').read_bytes()
files.append({'path':'README.md','originalPath':None,'bytes':len(b),'sha256':sha(b),'encoding':'new-research-note'})
authority=json.loads((dst/'guard-manifest.json').read_text())
result=json.loads((dst/'measurement.json').read_text())
assert result['status']=='complete' and result['manifestSha256']==sha((dst/'guard-manifest.json').read_bytes())
assert sha((dst/'driver.mjs').read_bytes())=='f226fa843e95742e4c23bc12572b47607fb5f50ba33297c19c5c0ece310419d6'
assert sha((dst/'front.bin').read_bytes())==result['front']['sha256']
external=[]
v2=repo/'docs/research/performance-2026-10-03/rich-patch-half-metre/v2'
for key,target,encoding in [
    ('source',v2/'baseline-held-source.json.gz','original-gzip'),
    ('held',v2/'baseline-held-report.json','original-bytes'),
    ('fps',v2/'baseline-fps.json.gz','deterministic-gzip'),
    ('meta',v2/'baseline-adapter-meta.json','original-bytes'),
    ('captureHelper',v2/'preparation/rich-patch-held-helper-v2.mjs.txt','original-bytes')]:
    record=authority['authority'][key];b=target.read_bytes()
    if key=='fps':raw=gzip.decompress(b);assert sha(raw)==record['sha256'] and len(raw)==record['bytes']
    else:assert sha(b)==record['sha256'] and len(b)==record['bytes']
    external.append({'key':key,'path':str(target.relative_to(repo)),'originalPath':record['path'],'storedBytes':len(b),'storedSha256':sha(b),'originalBytes':record['bytes'],'originalSha256':record['sha256'],'encoding':encoding,'duplicated':False})
for record in authority['cases']:
    target=repo/'public'/record['file'];b=target.read_bytes()
    assert sha(b)==record['sha256'] and len(b)==record['bytes']
    external.append({'key':'default-case','path':str(target.relative_to(repo)),'originalPath':record['path'],'bytes':len(b),'sha256':sha(b),'canonicalRef':'1bcc7c0c9','loaderOrderFile':record['file'],'duplicated':False})
target=repo/'docs/research/performance-2026-10-03/rich-patch-half-metre/prototype/source-manifest.json'
record=authority['sourceAuthorityManifest'];b=target.read_bytes()
assert sha(b)==record['sha256'] and len(b)==record['bytes']
external.append({'key':'552-file-source-authority','path':str(target.relative_to(repo)),'originalPath':record['path'],'bytes':len(b),'sha256':sha(b),'duplicated':False})
external.append({'key':'compiler-not-duplicated','originalPath':authority['compiler']['path'],'bytes':authority['compiler']['bytes'],'sha256':authority['compiler']['sha256'],'version':authority['compiler']['version'],'duplicated':False,'authority':'Installed compiler used for retained type-erased modules; compiler bytes omitted, full original source and compiled outputs retained.'})
manifest={'schema':1,'decision':'REJECT cross-owner CrestRayPlan reuse: measured cost too small for added mutable state','scope':'Archive of the single parent-executed preparation-only command; no new numerical execution, tests, builds, replay or GPU work during archival. No production changes or index edits.','canonicalRef':authority['canonicalRef'],'originalInputManifestSha256':sha((dst/'guard-manifest.json').read_bytes()),'rawReportSha256':sha((dst/'measurement.json').read_bytes()),'completedSamples':len(result['rawElapsedMs']),'totalPrepareMsPerOriginalContactRangeSequence':result['totalPrepareMsPerOriginalContactRangeSequence'],'files':files,'externalAuthority':external,'archiveScope':{'fullPackedFrontCapacityRetained':True,'activeRecords':result['front']['count'],'activeBytes':result['front']['activeBytes'],'largeHeldSourceAndCasesLinkedNotCopied':True,'originalAbsolutePathsRetained':True,'compilerBinaryOmitted':True,'sourceAndCompiledModuleBytesRetained':True,'previousTinyGuardTests':8,'newTestsDuringArchive':0,'newNumericalExecutionsDuringArchive':0}}
(dst/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
paths=sorted(p for p in dst.rglob('*') if p.is_file() and p.name!='SHA256SUMS')
(dst/'SHA256SUMS').write_text(''.join(sha(p.read_bytes())+'  '+str(p.relative_to(dst))+'\n' for p in paths))
print(json.dumps({'path':str(dst),'files':len(paths)+1,'storedBytes':sum(p.stat().st_size for p in dst.rglob('*') if p.is_file()),'manifestSha256':sha((dst/'manifest.json').read_bytes()),'reportSha256':manifest['rawReportSha256'],'decision':manifest['decision']}))
