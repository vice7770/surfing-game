"""Root-only first preparation: exact immutable V4 app/diagnostic copy; no new build or resources."""
from pathlib import Path
import hashlib,json,shutil
W=Path('/private/tmp/tube-guided-ordinary-v5-telemetry-native-20261005');R=Path('/Users/regina/Desktop/Projects/surfing-game')
def pin(path):
 raw=path.read_bytes();return {'file':str(path),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
def verify(spec):
 raw=Path(spec['file']).read_bytes();assert len(raw)==spec['bytes']and hashlib.sha256(raw).hexdigest()==spec['sha256'],spec['file'];return raw
assert not any((W/name).exists()for name in('dist','diagnostic-autopilot.mjs','diagnostic-build.json','source-freeze.json','build.json','seal.json','prepare-result.json','owner.json','candidate-first')),'First-only V5 preparation'
inputs=json.loads((W/'inputs.json').read_bytes())
assert inputs['executionPendingOwnerPolicyReview'] is False and inputs['ownerPolicyAmendment']['integrationReviewPending'] is False and inputs['ownerPolicyAmendment']['integrationChecksExecuted'] is True,'Root integration review/checks and refreshed input/freeze required before preparation'
assert inputs['pilot']['style']=='tube' and inputs['overrides']['seed']==6238 and inputs['limits']['steps']==3000
assert tuple(inputs['limits'][key]for key in('observationSeconds','nativeSeconds','ownerSeconds','totalSeconds','cleanupSeconds'))==(620,640,653,690,20)
assert inputs['protectedPorts']==[4312,4313,4314,4315,4316] and inputs['ownedPorts']==[4301,9711]
recipe=json.loads((W/'recipe-source-freeze.json').read_bytes());assert recipe['schema']=='guided-ordinary-recipe-source-freeze/v5' and recipe['sourceOnly'] and not recipe['candidateRuntimeExecuted']
for spec in recipe['files']:verify(spec)
mapping=json.loads((W/'before-source-mapping.json').read_bytes());assert mapping['complete'] and mapping['originalV4Untouched']
references=[inputs['rootCurrentApplicationReceipt'],inputs['rootBuildAuthority'],inputs['protectedIdentityReference'],inputs['protected4316Provenance']['processReceipt']]
references+=[spec for key,spec in inputs['immutableV4Application'].items()if key!='directory']
references+=[inputs['priorObservation'][key]for key in('owner','report','trace','rootPostFailurePins')]
references+=[inputs['priorV4Failure'][key]for key in('owner','report','launcher','nativeLog','rootPostFailurePinsAndClosure')]
references+=[inputs['ownerPolicyAmendment'][key]for key in('moduleSource','moduleStaticFreeze','rootPureTests','rootPureTestLog','copiedModule')]
references+=[entry[key]for entry in mapping['files']for key in('original','preserved')]
for spec in references+inputs['borrowedHelperPins']:verify(spec)
policy=inputs['ownerPolicyAmendment'];assert policy['moduleSource']['sha256']==policy['copiedModule']['sha256']=='f79e1098601eb592fe4b0133db40ee9b4ed4999bb238b760b900ba030685fdb0'
assert policy['moduleSource']['bytes']==policy['copiedModule']['bytes']
module_freeze=json.loads(verify(policy['moduleStaticFreeze']));assert module_freeze['schema']=='owned-group-anchor-proposal-static-freeze/v1' and policy['moduleSource'] in module_freeze['files']
pure=json.loads(verify(policy['rootPureTests']));assert pure['exitCode']==0 and pure['pythonASTChecks']==2 and pure['verifiedFreezeSHA256']==policy['moduleStaticFreeze']['sha256'] and pure['runtimeOSIdentityClaim'] is False
assert (pure['logBytes'],pure['logSha256'])==(policy['rootPureTestLog']['bytes'],policy['rootPureTestLog']['sha256'])
closure=json.loads(verify(inputs['protectedIdentityReference']));assert closure['schema']=='root-five-protected-preview-identities/v1' and closure['complete'] and closure['protectedPorts']==inputs['protectedPorts'] and closure['noSignalsSent']
assert {int(port):entry['actualIdentity']['pid']for port,entry in closure['protectedIdentities'].items()}=={4312:92445,4313:58298,4314:51358,4315:87796,4316:38617}
assert all(entry['actualListenerVerified'] and entry['fullIdentityMatchesPreviousRootAuthority']for entry in closure['protectedIdentities'].values())
root=json.loads(verify(inputs['rootCurrentApplicationReceipt']));BUILD_ID=inputs['buildId']
assert root['schema']=='root-current-tube-application-build/v1' and root['complete'] and root['buildId']==BUILD_ID and not root['nativeResultClaim']
assert root['actualNormalBuild']['command']==['npm','run','build'] and root['actualNormalBuild']['BUILD_ID']==BUILD_ID and root['actualNormalBuild']['exitCode']==0
assert root['authority']==inputs['rootBuildAuthority']
authority=json.loads(verify(inputs['rootBuildAuthority']));assert authority['schema']=='guided-ordinary-root-build-authority/v4' and authority['complete'] and authority['buildId']==BUILD_ID
assert authority['applicationTerminalExitCode']==authority['diagnosticTerminalExitCode']==0 and authority['rootVerifiedNewProductionBuild'] and authority['rootVerifiedNewDiagnosticBuild']
assert authority['applicationBuildAssets']==root['assets']
applicationLog=authority['applicationBuildLog'];diagnosticLog=authority['diagnosticBuildLog']
assert applicationLog==inputs['applicationBuildLog'] and diagnosticLog==inputs['diagnosticBuildLog']
assert (root['actualNormalBuild']['logBytes'],root['actualNormalBuild']['logSha256'])==(applicationLog['bytes'],applicationLog['sha256'])
verify(applicationLog);verify(diagnosticLog);references+=[applicationLog,diagnosticLog]
old=inputs['immutableV4Application'];old_build=json.loads(verify(old['build']));old_freeze=json.loads(verify(old['sourceFreeze']));old_seal=json.loads(verify(old['seal']));old_diag=json.loads(verify(old['diagnosticBuild']))
assert old_build['schema']=='guided-ordinary-build/v4' and old_build['complete'] and old_build['build']==BUILD_ID
assert old_freeze['schema']=='guided-ordinary-source-freeze/v4' and old_freeze['complete'] and old_freeze['build']==BUILD_ID
assert old_seal['schema']=='guided-ordinary-seal/v4' and old_seal['rootAuthorized'] and old_seal['complete'] and old_seal['buildId']==BUILD_ID
assert old_build['sourceFreeze']==old_seal['sourceFreeze']==old['sourceFreeze'] and old_seal['applicationBuild']==old['build']
assert old_build['rootBuildAuthority']==inputs['rootBuildAuthority'] and old_build['applicationBuildAssets']==root['assets']
assert old_build['applicationBuildLog']==applicationLog and old_build['diagnosticBuildLog']==diagnosticLog
assert old_build['productionSources']==old_freeze['productionSources'] and old_build['diagnosticCompiledSources']==old_freeze['diagnosticCompiledSources']
assert old_diag['schema']=='guided-ordinary-diagnostic-build/v4' and old_diag['complete'] and old_diag['buildId']==BUILD_ID and not old_diag['copiedHistoricalModule']
assert old_seal['diagnosticBuild']==old['diagnosticBuild'] and old_seal['diagnosticModule']==old_diag['module']
assert old_diag['compiledSources']==old_build['diagnosticCompiledSources'] and old_diag['exports']==['Autopilot','autopilotView'] and old_diag['style']=='tube'
for spec in old_diag['compiledSources']+[old_diag['entry'],old_diag['module'],old_diag['compiler']]:verify(spec)
references+=[old_diag['entry'],old_diag['module'],old_diag['compiler']]
source_map={str(Path(spec['file']).relative_to(R)):spec for spec in root['sourcePins']};assert len(source_map)==584
sources=[source_map[path]for path in inputs['productionSources']]
assert len(sources)==15 and sources==old_build['productionSources']
for spec in sources:verify(spec)
# Root's complete existing receipt pins the built source set. This verifies bytes; it never recompiles them.
for spec in root['sourcePins']:verify(spec)
app=Path(old['directory']);root_dist=R/'dist'
root_assets={Path(spec['file']).relative_to(root_dist):spec for spec in root['assets']}
old_assets={Path(spec['file']).relative_to(app):spec for spec in old_build['assets']}
assert len(root_assets)==len(old_assets)==49 and set(root_assets)==set(old_assets)=={p.relative_to(app)for p in app.rglob('*')if p.is_file()}
for relative,spec in old_assets.items():
 original=root_assets[relative];assert (spec['bytes'],spec['sha256'])==(original['bytes'],original['sha256']);verify(spec)
assert json.loads((app/'build.json').read_bytes())['build']==BUILD_ID
prior_owner=json.loads(verify(inputs['priorV4Failure']['owner']));prior_report=json.loads(verify(inputs['priorV4Failure']['report']))
assert prior_owner['schema']=='guided-ordinary-owner/v4' and prior_owner['complete'] is False and prior_owner['firstFailure']==inputs['priorV4Failure']['ownerFirstFailure']
assert prior_report['schema']=='guided-ordinary-native/v4' and prior_report['complete'] is False and prior_report['firstFailure']==inputs['priorV4Failure']['nativeFirstFailure']
# Only after all gates pass, copy exact immutable assets and compiled diagnostic bytes.
shutil.copytree(app,W/'dist');assets=[pin(p)for p in sorted((W/'dist').rglob('*'))if p.is_file()]
for spec in assets:
 relative=Path(spec['file']).relative_to(W/'dist');original=old_assets[relative];assert (spec['bytes'],spec['sha256'])==(original['bytes'],original['sha256'])
assert len(assets)==49
(W/'diagnostic-autopilot.mjs').write_bytes(verify(old_diag['module']))
module=pin(W/'diagnostic-autopilot.mjs');assert (module['bytes'],module['sha256'])==(old_diag['module']['bytes'],old_diag['module']['sha256'])
diagnostic={'schema':'guided-ordinary-diagnostic-build/v5','complete':True,'buildId':BUILD_ID,'module':module,'compiledSources':old_diag['compiledSources'],'entry':old_diag['entry'],'compiler':old_diag['compiler'],'exports':old_diag['exports'],'style':'tube','copiedHistoricalModule':True,'newCompilationPerformed':False,'originalBuildReceipt':old['diagnosticBuild'],'originalModule':old_diag['module'],'actualOriginalTerminalAuthority':inputs['rootBuildAuthority'],'operation':'Exact immutable V4 compiled module copy; original terminal0 receipt retained, no new compilation.'}
(W/'diagnostic-build.json').write_text(json.dumps(diagnostic,indent=2)+'\n')
for spec in sources+old_diag['compiledSources']+list(old_assets.values())+[applicationLog,diagnosticLog]:verify(spec)
freeze={'schema':'guided-ordinary-source-freeze/v5','complete':True,'build':BUILD_ID,'productionSources':sources,'diagnosticCompiledSources':old_diag['compiledSources'],'rootBuildAuthority':inputs['rootBuildAuthority'],'rootCurrentApplicationReceipt':inputs['rootCurrentApplicationReceipt'],'immutableV4Application':old,'rootAllSourcePinsVerifiedAtPreparation':584,'freezeTiming':'After exact existing actual V4 application/diagnostic receipt and immutable asset verification; no new build.','scope':'Exact reused source/build/module pins. No native or ride acceptance.'}
(W/'source-freeze.json').write_text(json.dumps(freeze,indent=2)+'\n')
build={'schema':'guided-ordinary-build/v5','complete':True,'build':BUILD_ID,'assets':assets,'productionSources':sources,'diagnosticCompiledSources':old_diag['compiledSources'],'applicationBuildLog':applicationLog,'diagnosticBuildLog':diagnosticLog,'applicationBuildAssets':old_build['assets'],'sourceFreeze':pin(W/'source-freeze.json'),'rootBuildAuthority':inputs['rootBuildAuthority'],'rootCurrentApplicationReceipt':inputs['rootCurrentApplicationReceipt'],'immutableV4Application':old,'priorObservation':inputs['priorObservation'],'priorV4Failure':inputs['priorV4Failure'],'operation':'Exact immutable V4 assets/module copy. No V5 build, diagnostic compilation or production mutation.'}
(W/'build.json').write_text(json.dumps(build,indent=2)+'\n')
helpers=[spec for spec in recipe['files']]+[pin(W/'recipe-source-freeze.json')]
seal={'schema':'guided-ordinary-seal/v5','rootAuthorized':True,'complete':True,'buildId':BUILD_ID,'limits':inputs['limits'],'applicationBuild':pin(W/'build.json'),'sourceFreeze':pin(W/'source-freeze.json'),'diagnosticBuild':pin(W/'diagnostic-build.json'),'diagnosticModule':module,'priorObservation':inputs['priorObservation'],'priorV4Failure':inputs['priorV4Failure'],'rootCurrentApplicationReceipt':inputs['rootCurrentApplicationReceipt'],'buildReusePolicy':inputs['buildReusePolicy'],'helpers':helpers,'borrowedHelpers':inputs['borrowedHelperPins'],'references':references}
(W/'seal.json').write_text(json.dumps(seal,indent=2)+'\n')
result={'schema':'guided-ordinary-preparation-result/v5','complete':True,'build':pin(W/'build.json'),'sourceFreeze':pin(W/'source-freeze.json'),'seal':pin(W/'seal.json'),'resourcesStarted':False,'portsProbed':False,'executedTestsBuildsOrDiagnosticCompilation':False,'existingActualV4BuildAuthorityRequired':True,'copiedHistoricalApplicationAndDiagnosticModule':True,'copiedHistoricalExecutionOutputs':False}
(W/'prepare-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
