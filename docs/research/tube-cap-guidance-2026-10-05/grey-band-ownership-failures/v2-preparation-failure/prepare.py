"""Root-only preparation source. Copies immutable V3 assets; never builds or pins mutable production."""
from pathlib import Path
import hashlib,json,shutil,subprocess
W=Path('/private/tmp/tube-grey-band-ownership-native-v2-20261005')
def pin(p):
 b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def verify(spec):
 b=Path(spec['file']).read_bytes();assert len(b)==spec['bytes'] and hashlib.sha256(b).hexdigest()==spec['sha256'],spec['file'];return b
assert not any((W/n).exists()for n in('dist','historical-source','historical-diagnostic','source-provenance.json','build.json','seal.json','prepare-result.json','owner.json','candidate-first')),'First-only root preparation'
i=json.loads((W/'inputs.json').read_bytes())
reference_names=('opticalApplicationBuild','opticalApplicationFreeze','opticalApplicationSeal','opticalApplicationBuildLog','referenceReport','referenceOwner','referenceLoft','authoredReport','authoredOwner','authoredSeal','baselinePNG')
references=[i[k]for k in reference_names]+i['readOnlyEvidence']+[i['protectedIdentityAuthority'],i['historicalOpticalRun']['owner'],i['historicalOpticalRun']['report']]
for spec in references+i['borrowedHelperPins']:verify(spec)
closure=json.loads(verify(i['protectedIdentityAuthority']))
assert closure['schema']=='shared-leaf-independent-post-failure/v1' and closure['complete'] and closure['protectedPreserved'] and closure['ownedGroupAbsent'] and all(closure['closedPorts'].values())
# This independent root OS receipt is an expected-identity authority, not success of this ID recipe.
old_run=json.loads(verify(i['historicalOpticalRun']['owner']));old_report=json.loads(verify(i['historicalOpticalRun']['report']))
assert not old_run['complete'] and old_run['exitCode']==1 and not old_report['complete'] and old_report['stepCount']==1525 and '640s native deadline' in old_report['firstFailure']
b=json.loads(verify(i['opticalApplicationBuild']));f=json.loads(verify(i['opticalApplicationFreeze']));s=json.loads(verify(i['opticalApplicationSeal']))
assert b['complete'] and b['build']==i['applicationBuildId'] and f['complete'] and f['build']==b['build'] and s['complete'] and s['rootAuthorized'] and s['buildId']==b['build']
assert b['applicationBuildLog']==i['opticalApplicationBuildLog']
assert b['productionSources']==f['productionSources'] and b['diagnosticCompiledSources']==f['diagnosticCompiledSources']
# These records are historical evidence. Their live /repo source paths, root dist and old run helpers are NOT read or verified.
# Only the immutable copied V3 app asset paths are authoritative executable inputs here.
app=Path(i['applicationDirectory']);assert app.is_dir();asset_paths={Path(spec['file']).resolve()for spec in b['assets']}
assert asset_paths=={p.resolve()for p in app.rglob('*')if p.is_file()}
for spec in b['assets']:assert Path(spec['file']).is_relative_to(app);verify(spec)
assert json.loads((app/'build.json').read_bytes())['build']==i['applicationBuildId']
cap=json.loads(verify(i['referenceReport']));cap_owner=json.loads(verify(i['referenceOwner']));raw=json.loads(verify(i['referenceLoft']))
assert cap['complete'] and cap['firstFailure']is None and cap['stepCount']==0 and cap_owner['complete'] and cap_owner['exitCode']==0
assert len(raw['arrays'])==37 and raw['epoch']['seaTime']==cap['stop']['seaTime']==i['referenceEpoch']['seaTime'] and raw['counts']==i['referenceCounts']
a=json.loads(verify(i['authoredReport']));ao=json.loads(verify(i['authoredOwner']));aseal=json.loads(verify(i['authoredSeal']))
assert a['complete'] and a['firstFailure']is None and a['stepCount']==0 and a['pngCount']==10 and len(a['pairs'])==5
assert ao['complete'] and ao['exitCode']==0 and ao['preExecutionPinsVerified'] and ao['postExecutionPinsVerified'] and all(ao['closedPorts'].values())
assert aseal['complete'] and aseal['rootAuthorized'] and ao['sealSha256']==a['sealSha256']==i['authoredSeal']['sha256']
assert all(p['baselineRepeatPixelsIdentical'] and all(p['guards'].values())for p in a['pairs'])
assert a['pairs'][4]['treatment']=='authored-mask-plus-sheet-fill-A' and a['pairs'][4]['fixedPose']==i['fixedCamera']
assert {k:i['baselinePNG'][k]for k in('bytes','sha256')}=={k:a['pairs'][4]['combinedSupport'][k]for k in('bytes','sha256')}
# Repository source receipts and external diagnostic entries have different, explicit provenance.
# No mutable repo source is read. External pinned entry points are not assigned a Git commit/hash.
repo=Path(i['repository']);commit=i['historicalCommit'];historical=[];external=[];repository_records=[];external_records=[];extra_records=[]
historical_specs={};external_specs={};families={}
for family in ('productionSources','diagnosticCompiledSources'):
 for spec in b[family]:
  path=Path(spec['file']);families.setdefault(str(path),[]).append(family)
  if path.is_relative_to(repo):
   relative=path.relative_to(repo)
   assert relative.parts and '..' not in relative.parts
   target=historical_specs;key=str(relative)
  else:
   target=external_specs;key=str(path)
  if key in target:assert target[key]==spec,'Conflicting historical source receipt '+key
  target[key]=spec
for relative,spec in sorted(historical_specs.items()):
 data=subprocess.check_output(['/usr/bin/git','show',commit+':'+relative],cwd=repo,timeout=10)
 assert len(data)==spec['bytes'] and hashlib.sha256(data).hexdigest()==spec['sha256'],'Historical committed source differs: '+relative
 dest=W/'historical-source'/relative;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data);copy=pin(dest);historical.append(copy)
 repository_records.append({'relative':relative,'historicalCommit':commit,'receipt':spec,'copied':copy,'sourceFamilies':families[spec['file']],'provenance':'Exact git show from declared historical commit, verified against existing compiled/production source receipt.'})
for number,(original,spec)in enumerate(sorted(external_specs.items())):
 data=verify(spec);dest=W/'historical-diagnostic'/(str(number).zfill(3)+'-'+Path(original).name)
 dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data);copy=pin(dest);external.append(copy);verify(spec)
 external_records.append({'original':spec,'copied':copy,'sourceFamilies':families[original],'historicalCommit':None,'recoveredFromGit':False,'provenance':'Exact pinned original outside-repository diagnostic source; compiled-source receipt verified directly. No committed source hash invented.'})
for relative in i['historicalOpticalSourcePaths']:
 rel=Path(relative);assert not rel.is_absolute() and '..' not in rel.parts
 dest=W/'historical-source'/rel
 if dest.exists():continue
 data=subprocess.check_output(['/usr/bin/git','show',commit+':'+relative],cwd=repo,timeout=10)
 dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data);copy=pin(dest);historical.append(copy)
 extra_records.append({'relative':relative,'historicalCommit':commit,'copied':copy,'existingBuildReceiptHashAvailable':False,'provenance':'Additional source read from the exact declared commit for optical interpretation; not assigned an invented prior build receipt hash.'})
provenance={'schema':'grey-band-ownership-source-provenance/v2','complete':True,'applicationBuild':i['opticalApplicationBuild'],'applicationFreeze':i['opticalApplicationFreeze'],'historicalCommit':commit,'repositorySources':repository_records,'externalDiagnosticSources':external_records,'extraOpticalCommittedSources':extra_records,'mutableProductionSourcesReadOrFrozen':False,'originalV3GameplaySucceeded':False}
(W/'source-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
shutil.copytree(app,W/'dist')
copied_assets=[pin(p)for p in sorted((W/'dist').rglob('*'))if p.is_file()]
old_assets={Path(spec['file']).relative_to(app):spec for spec in b['assets']}
assert {Path(spec['file']).relative_to(W/'dist')for spec in copied_assets}==set(old_assets)
for spec in copied_assets:
 original=old_assets[Path(spec['file']).relative_to(W/'dist')]
 assert spec['bytes']==original['bytes'] and spec['sha256']==original['sha256'],'Copied immutable app bytes differ'
for spec in b['assets']:verify(spec)
copied={'schema':'grey-band-ownership-build/v2','complete':True,'build':i['applicationBuildId'],
 'operation':'Copy immutable V3 app assets only; read-only git show reconstructs historical source; no build/current source freeze.',
 'assets':copied_assets, 'priorBuild':i['opticalApplicationBuild'],
 'historicalCommit':commit,'sourceProvenance':pin(W/'source-provenance.json'),'reconstructedHistoricalSources':historical,'copiedExternalDiagnosticSources':external,'historicalOpticalRun':i['historicalOpticalRun'],'oldProductionSourceReceiptVerification':True,
 'mutableProductionSourcePinsRequired':False,'oldAndCurrentGeometryEquivalenceAsserted':False}
(W/'build.json').write_text(json.dumps(copied,indent=2)+'\n')
names=('inputs.json','README.md','prepare.py','run.py','native.mjs','ownership-inspection.mjs','recipe-diff.md','recipe.patch','preparation-freeze.json')
seal={'schema':'grey-band-ownership-seal/v2','rootAuthorized':True,'complete':True,'applicationBuild':pin(W/'build.json'),
 'sourceProvenance':pin(W/'source-provenance.json'),'helpers':[pin(W/n)for n in names],'borrowedHelpers':i['borrowedHelperPins'],'references':references,
 'immutablePriorAssets':b['assets'],'historicalScratchSources':historical,'externalDiagnosticScratchSources':external,'limits':i['limits'],'comparison':i['comparison']}
(W/'seal.json').write_text(json.dumps(seal,indent=2)+'\n')
result={'schema':'grey-band-ownership-preparation/v2','complete':True,'seal':pin(W/'seal.json'),'build':pin(W/'build.json'),
 'resourcesStarted':False,'portsProbed':False,'executedChecksOrBuilds':False,'liveSourcesWrittenOrFrozen':False,
 'sourceProvenance':pin(W/'source-provenance.json'),'historicalSourceRecovery':'Repository sources recovered with read-only git show and existing receipt hashes; outside-repository diagnostic sources copied from their exact direct receipt. No build/current source freeze.'}
(W/'prepare-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
