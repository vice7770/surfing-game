"""Root-only first preparation. Copies a complete immutable ordinary V4 app; never builds or starts resources."""
from pathlib import Path
import hashlib,json,shutil
W=Path('/private/tmp/tube-leaf-identity-core-native-v2-20261005');R=Path('/Users/regina/Desktop/Projects/surfing-game')
SOURCES=('src/wave/barrel/ProfileLibrary.ts','src/wave/barrel/boundedCProfile.ts','src/wave/barrel/sweptLoft.ts','src/wave/barrel/lipSheet.ts',
 'src/scene/barrel/SweptBarrelMesh.ts','src/scene/barrel/barrelMaskGlsl.ts','src/scene/barrel/SweptBarrel.ts','src/scene/barrel/barrelWater.ts',
 'src/wave/barrel/boundedCLeafReach.test.ts','src/wave/barrel/boundedCCapRefinement.test.ts','src/wave/barrel/boundedCConsumers.test.ts')
CHANGED=('src/wave/barrel/boundedCProfile.ts','src/wave/barrel/boundedCLeafReach.test.ts')
HELPERS=('README.md','inputs.json','prepare.py','run.py','native.mjs','geometry-inspection.mjs','measure.py','recipe-diff.md','recipe.patch','owner-policy-amendment.md','owner-policy-amendment.patch','before-owner-policy-preservation.json','owned_group_anchor.py','preparation-freeze.json','owner-expired-read.patch','v2-provenance.json','parent-copy.json')
def pin(p):
 b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def verify(spec):
 b=Path(spec['file']).read_bytes();assert len(b)==spec['bytes'] and hashlib.sha256(b).hexdigest()==spec['sha256'],spec['file'];return b
assert not any((W/n).exists()for n in('dist','source','build.json','source-freeze.json','seal.json','prepare-result.json','owner.json','candidate-first')),'First-only root preparation'
i=json.loads((W/'inputs.json').read_bytes());BUILD_ID=i['applicationBuildId']
assert i['executionPendingOwnerPolicyReview'] is False and i['ownerPolicyAmendment']['integrationReviewPending'] is False and i['ownerPolicyAmendment']['integrationChecksExecuted'] is True,'Root integration review/checks must be completed and current input/freeze metadata amended before preparation'
references=[i['rootCurrentApplicationReceipt'],i['scenePoseReferenceReport'],i['protectedIdentityAuthority'],i['knownOwnerDisciplineFailure']]+list(i['candidatePreparedApplication'].values())+list(i['baselineAuthority'].values())+list(i['identityCoreProposal'].values())+i['authoredAuthority']+i['opticalAuthority']
references+=[i['ownerPolicyAmendment'][key]for key in('moduleSource','moduleStaticFreeze','rootPureTests','rootPureTestLog','copiedModule','beforeOwnerPolicyPreservation')]+[i['protected4316']['processReceipt']]
for spec in references+i['borrowedHelperPins']:verify(spec)
policy=i['ownerPolicyAmendment'];assert policy['moduleSource']['bytes']==policy['copiedModule']['bytes'] and policy['moduleSource']['sha256']==policy['copiedModule']['sha256']=='f79e1098601eb592fe4b0133db40ee9b4ed4999bb238b760b900ba030685fdb0'
module_freeze=json.loads(verify(policy['moduleStaticFreeze']));assert module_freeze['schema']=='owned-group-anchor-proposal-static-freeze/v1' and policy['moduleSource'] in module_freeze['files']
pure=json.loads(verify(policy['rootPureTests']));assert pure['exitCode']==0 and pure['pythonASTChecks']==2 and pure['verifiedFreezeSHA256']==policy['moduleStaticFreeze']['sha256'] and pure['runtimeOSIdentityClaim'] is False
assert (pure['logBytes'],pure['logSha256'])==(policy['rootPureTestLog']['bytes'],policy['rootPureTestLog']['sha256'])
assert i['protectedPorts']==[4312,4313,4314,4315,4316] and i['ownedPorts']==[4301,9711]
root=json.loads(verify(i['rootCurrentApplicationReceipt']));assert root['schema']=='root-current-tube-application-build/v1' and root['complete'] and root['buildId']==BUILD_ID and not root['nativeResultClaim']
assert root['actualNormalBuild']['exitCode']==0 and root['actualNormalBuild']['BUILD_ID']==BUILD_ID and root['actualNormalBuild']['command']==['npm','run','build']
authority=json.loads(verify(root['authority']));references.append(root['authority'])
assert authority['schema']=='guided-ordinary-root-build-authority/v4' and authority['complete'] and authority['buildId']==BUILD_ID
assert authority['applicationTerminalExitCode']==authority['diagnosticTerminalExitCode']==0 and authority['rootVerifiedNewProductionBuild'] and authority['rootVerifiedNewDiagnosticBuild']
assert authority['applicationBuildAssets']==root['assets']
assert root['actualNormalBuild']['logBytes']==authority['applicationBuildLog']['bytes'] and root['actualNormalBuild']['logSha256']==authority['applicationBuildLog']['sha256']
# The already executed log is direct borrowed evidence; this preparer never runs a build or diagnostic compiler.
verify(authority['applicationBuildLog']);references.append(authority['applicationBuildLog'])
app_build=json.loads(verify(i['candidatePreparedApplication']['build']));app_freeze=json.loads(verify(i['candidatePreparedApplication']['sourceFreeze']));app_seal=json.loads(verify(i['candidatePreparedApplication']['seal']))
assert app_build['schema']=='guided-ordinary-build/v4' and app_build['complete'] and app_build['build']==BUILD_ID
assert app_freeze['schema']=='guided-ordinary-source-freeze/v4' and app_freeze['complete'] and app_freeze['build']==BUILD_ID
assert app_seal['schema']=='guided-ordinary-seal/v4' and app_seal['complete'] and app_seal['rootAuthorized'] and app_seal['buildId']==BUILD_ID
assert app_build['sourceFreeze']==app_seal['sourceFreeze']==i['candidatePreparedApplication']['sourceFreeze']
assert app_seal['applicationBuild']==i['candidatePreparedApplication']['build'] and app_build['rootBuildAuthority']==root['authority']
assert app_build['productionSources']==app_freeze['productionSources'] and app_build['diagnosticCompiledSources']==app_freeze['diagnosticCompiledSources']
assert app_build['applicationBuildAssets']==root['assets'] and app_build['applicationBuildLog']==authority['applicationBuildLog']
app=Path(i['applicationDirectory']);root_dist=R/'dist'
root_assets={Path(spec['file']).relative_to(root_dist):spec for spec in root['assets']};app_assets={Path(spec['file']).relative_to(app):spec for spec in app_build['assets']}
assert len(root_assets)==len(app_assets)==49 and set(root_assets)==set(app_assets)=={p.relative_to(app)for p in app.rglob('*')if p.is_file()}
for relative,spec in app_assets.items():
 original=root_assets[relative];assert (spec['bytes'],spec['sha256'])==(original['bytes'],original['sha256']);verify(spec)
assert json.loads((app/'build.json').read_bytes())['build']==BUILD_ID
# No live ordinary owner/report is read. Its complete app preparation is authority, not a ride result.
base=i['baselineAuthority'];bo=json.loads(verify(base['owner']));br=json.loads(verify(base['report']));bf=json.loads(verify(base['sourceFreeze']));bb=json.loads(verify(base['build']));bs=json.loads(verify(base['seal']));prior=json.loads(verify(base['loft']))
assert bo['schema']=='shared-leaf-owner/v2' and bo['complete'] and bo['exitCode']==0 and bo['firstFailure']is None
assert bo['preExecutionPinsVerified'] and bo['postExecutionPinsVerified'] and bo['copiedAndLiveSourcePinsPostVerified'] and bo['protectedPreserved'] and bo['ownedGroupIdentityAndAbsenceVerified'] and not bo['cleanupFailures'] and all(bo['closedPorts'].values())
assert br['schema']=='shared-leaf-native/v2' and br['complete'] and br['firstFailure']is None and br['stepCount']==0 and br['pngCount']==8 and br['ownedBrowserClose']
assert bs['schema']=='shared-leaf-seal/v2' and bs['complete'] and bs['rootAuthorized'] and bs['applicationBuild']==base['build'] and bs['sourceFreeze']==base['sourceFreeze']
assert bo['sealSha256']==br['sealSha256']==base['seal']['sha256'] and bb['sourceFreeze']==base['sourceFreeze']
assert bf['schema']=='shared-leaf-source-freeze/v2' and bf['complete'] and bf['buildId']==bb['build']
assert br['sidecar']['bytes']==base['loft']['bytes'] and br['sidecar']['sha256']==base['loft']['sha256'] and prior['available'] and prior['arrayIdentitiesAndWordsUnchanged'] and len(prior['arrays'])==37
assert prior['counts']==i['referenceCounts']=={'slices':80,'vertices':10720,'indices':61446} and prior['epoch']['step']==0 and prior['epoch']['seaTime']==i['referenceEpoch']['seaTime']
assert all(pair['baselineRepeatPixelsIdentical'] and all(pair['guards'].values())for pair in br['pairs'])
assert all(pair['fixedPose']==i['fixedCameras'][pair['camera']]for pair in br['pairs'])
scene=json.loads(verify(i['scenePoseReferenceReport']));assert scene['complete'] and scene['firstFailure']is None and scene['stepCount']==0 and scene['stop']['seaTime']==prior['epoch']['seaTime']
for family in ('authoredAuthority','opticalAuthority'):
 records={Path(spec['file']).name:json.loads(verify(spec))for spec in i[family]}
 assert records['owner.json']['complete'] and records['owner.json']['exitCode']==0 and records['report.json']['complete'] and records['report.json']['firstFailure']is None
closure=json.loads(verify(i['protectedIdentityAuthority']));assert closure['schema']=='root-five-protected-preview-identities/v1' and closure['complete'] and closure['protectedPorts']==i['protectedPorts'] and closure['noSignalsSent']
assert {int(port):entry['actualIdentity']['pid']for port,entry in closure['protectedIdentities'].items()}=={4312:92445,4313:58298,4314:51358,4315:87796,4316:38617} and all(entry['actualListenerVerified'] and entry['fullIdentityMatchesPreviousRootAuthority']for entry in closure['protectedIdentities'].values())
# Selected geometry/optical sources are exact current root-built bytes. Only scalar bound/test may differ from baseline.
root_sources={str(Path(spec['file']).relative_to(R)):spec for spec in root['sourcePins']};assert len(root_sources)==584
old_sources={entry['relative']:entry['frozen']for entry in bf['files']};assert set(old_sources)==set(SOURCES)
proposal=json.loads(verify(i['identityCoreProposal']['provenance.json']));assert proposal['sourceOnly'] and not proposal['appliedToProduction']
expected_changes={entry['relative']:entry for entry in proposal['candidate']};assert set(expected_changes)==set(CHANGED)
for relative in SOURCES:
 spec=root_sources[relative];verify(spec)
 if relative in CHANGED:
  expected=expected_changes[relative];assert (spec['bytes'],spec['sha256'])==(expected['bytes'],expected['sha256'])
 else:
  old=old_sources[relative];verify(old);assert (spec['bytes'],spec['sha256'])==(old['bytes'],old['sha256']),'Unexpected runtime/optical source change: '+relative
# Root's direct receipt pins the complete source set. Verify it while held unchanged, without copying a runtime tree.
for spec in root['sourcePins']:verify(spec)
live=[root_sources[relative]for relative in SOURCES];shutil.copytree(app,W/'dist')
copied_assets=[pin(p)for p in sorted((W/'dist').rglob('*'))if p.is_file()];assert len(copied_assets)==49
for spec in copied_assets:
 relative=Path(spec['file']).relative_to(W/'dist');old=app_assets[relative];assert (spec['bytes'],spec['sha256'])==(old['bytes'],old['sha256'])
frozen=[]
for relative,spec in zip(SOURCES,live):
 p=W/'source'/relative;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(verify(spec));frozen.append(pin(p))
for spec in root['sourcePins']+app_build['assets']:verify(spec)
f={'schema':'leaf-identity-core-source-freeze/v1','complete':True,'buildId':BUILD_ID,'files':[{'relative':p,'live':a,'frozen':b}for p,a,b in zip(SOURCES,live,frozen)],'rootCurrentApplicationReceipt':i['rootCurrentApplicationReceipt'],'rootAllSourcePinsVerifiedAtPreparation':584,'immutableCopiedApplication':i['candidatePreparedApplication'],'onlySelectedScalarBoundAndTestChangedFromPreIdentityBaseline':True,'scope':'Direct complete root build receipt plus selected live/frozen geometry and optical source bytes. No new build/runtime invocation.'}
(W/'source-freeze.json').write_text(json.dumps(f,indent=2)+'\n')
b={'schema':'leaf-identity-core-build/v1','complete':True,'build':BUILD_ID,'assets':copied_assets,'sources':frozen,'liveSources':live,'sourceFreeze':pin(W/'source-freeze.json'),'rootCurrentApplicationReceipt':i['rootCurrentApplicationReceipt'],'immutablePreparedApplication':i['candidatePreparedApplication'],'operation':'Copy exact immutable ordinary V4 app assets only; no rebuild/diagnostic compilation.','applicationBuildEvidence':authority['applicationBuildLog'],'baselineAuthority':base}
(W/'build.json').write_text(json.dumps(b,indent=2)+'\n')
s={'schema':'leaf-identity-core-seal/v1','rootAuthorized':True,'complete':True,'applicationBuild':pin(W/'build.json'),'sourceFreeze':pin(W/'source-freeze.json'),'helpers':[pin(W/name)for name in HELPERS],'borrowedHelpers':i['borrowedHelperPins'],'references':references,'limits':i['limits'],'comparison':i['comparison'],'rootCurrentApplicationReceipt':i['rootCurrentApplicationReceipt'],'baselineAuthority':base}
(W/'seal.json').write_text(json.dumps(s,indent=2)+'\n')
result={'schema':'leaf-identity-core-preparation/v1','complete':True,'build':pin(W/'build.json'),'sourceFreeze':pin(W/'source-freeze.json'),'seal':pin(W/'seal.json'),'resourcesStarted':False,'portsProbed':False,'executedChecksOrBuilds':False,'liveOrdinaryOwnerOrReportRead':False}
(W/'prepare-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
