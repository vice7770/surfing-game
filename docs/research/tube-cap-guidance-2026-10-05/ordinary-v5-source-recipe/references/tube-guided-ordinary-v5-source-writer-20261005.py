"""Temporary source writer only: file copies/text edits/hash metadata; never imports candidate code."""
from pathlib import Path
import difflib, hashlib, json

V4=Path('/private/tmp/tube-guided-ordinary-v4-telemetry-native-20261005')
W=Path('/private/tmp/tube-guided-ordinary-v5-telemetry-native-20261005')
ID=Path('/private/tmp/tube-leaf-identity-core-native-20261005')
PURE=Path('/private/tmp/tube-owned-group-anchor-proposal-20261005')
NAMES=('README.md','inputs.json','prepare.py','run.py','native.mjs','control-policy.mjs','body-mesh.mjs','criteria.mjs','loft-snapshot-tools.mjs','rider-driver.mjs','recipe-source-freeze.json','recipe.patch','source-only-origin.json','root-current-application-receipt.json','root-build-authority.json','build.json','source-freeze.json','seal.json','diagnostic-build.json')
UNCHANGED=('control-policy.mjs','body-mesh.mjs','criteria.mjs','loft-snapshot-tools.mjs','rider-driver.mjs')
def pin(p):
    b=p.read_bytes()
    return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def write_json(p,x):p.write_text(json.dumps(x,indent=2)+'\n')
assert not W.exists(),'New scratch directory only'
(W/'before-v4').mkdir(parents=True)
mapping=[]
for name in NAMES:
    before=V4/name;copied=W/'before-v4'/name
    copied.write_bytes(before.read_bytes())
    assert copied.read_bytes()==before.read_bytes()
    mapping.append({'name':name,'original':pin(before),'preserved':pin(copied)})
for name in UNCHANGED:(W/name).write_bytes((V4/name).read_bytes())
module=PURE/'owned_group_anchor.py';assert pin(module)['sha256']=='f79e1098601eb592fe4b0133db40ee9b4ed4999bb238b760b900ba030685fdb0'
(W/'owned_group_anchor.py').write_bytes(module.read_bytes())
inputs=json.loads((V4/'inputs.json').read_bytes())
inputs['schema']='guided-ordinary-native-inputs/v5'
inputs['protectedPorts']=[4312,4313,4314,4315,4316]
inputs['protectedIdentityReference']=pin(Path('/private/tmp/tube-five-protected-preview-identities-20261005.json'))
assert inputs['protectedIdentityReference']['sha256']=='b08387d71daf4cd9527ec9b7b1bb78d05bebcbebd009362fc33fd21ee779bd28'
inputs['protected4316Provenance']={'pid':38617,'rootSession':59708,'processReceipt':pin(Path('/private/tmp/surfing-game-play-3e75550c2-20261005/process.json'))}
inputs['rootCurrentApplicationReceipt']=pin(V4/'root-current-application-receipt.json')
inputs['rootBuildAuthority']=pin(V4/'root-build-authority.json')
inputs['immutableV4Application']={'directory':str(V4/'dist'),'build':pin(V4/'build.json'),'sourceFreeze':pin(V4/'source-freeze.json'),'seal':pin(V4/'seal.json'),'diagnosticBuild':pin(V4/'diagnostic-build.json')}
v4build=json.loads((V4/'build.json').read_bytes())
inputs['applicationBuildLog']=v4build['applicationBuildLog']
inputs['diagnosticBuildLog']=v4build['diagnosticBuildLog']
inputs['borrowedHelperPins']=[pin(Path('/private/tmp/tube-stable-x-ordinary-rider-v4-20261005')/name)for name in('native-owned.mjs','cdp.mjs','menu-startup.mjs','follower-camera.mjs')]
inputs['ownerPolicyAmendment']={'moduleSource':pin(module),'moduleStaticFreeze':pin(PURE/'source-freeze.json'),'rootPureTests':pin(PURE/'root-tests.json'),'rootPureTestLog':pin(PURE/'root-tests.log'),'copiedModule':pin(W/'owned_group_anchor.py'),'rootPureFixtureCount':20,'rootPureASTChecks':2,'integrationReviewPending':True,'integrationChecksExecuted':False,'rootReviewAndChecksRequiredBeforePreparation':True,'scope':'Exact root-tested pure module; new ordinary V5 integration is source-only and has no actual OS/native evidence.'}
inputs['executionPendingOwnerPolicyReview']=True
inputs['ownerObservationPolicy']['anchorPolicy']='Exact live actual Popen leader bootstrap; immutable original leader if present, otherwise exact immediately previous accepted survivor BEFORE updates. Fresh required read and latest accepted state for each signal; consume only after actual signal.'
inputs['buildReusePolicy']={'normalApplication':'Exact immutable V4 prepared dist; existing root actual terminal0 receipt reused.','diagnosticModule':'Exact existing V4 compiled module reused; no new diagnostic compilation.','freshBuildOrCompilationPerformedByV5':False,'historicalOutputsCopied':False}
inputs['candidateChange'].update({'scope':'Same exact V4 root-built application and diagnostic controller; only owner anchoring/protected-preview/provenance schema changes in scratch recipe.','visualChangesBoundByFreshBuild':False,'visualChangesBoundByReusedExactV4Build':True,'freshBuildClaimByV5':False})
priorOwner=json.loads((V4/'owner.json').read_bytes())
priorReport=json.loads((V4/'candidate-first/report.json').read_bytes())
assert priorOwner['complete'] is False and priorReport['complete'] is False
inputs['priorV4Failure']={'directory':str(V4),'owner':pin(V4/'owner.json'),'report':pin(V4/'candidate-first/report.json'),'launcher':pin(V4/'launcher.json'),'nativeLog':pin(V4/'native.log'),'rootPostFailurePinsAndClosure':pin(V4/'root-post-failure-pins-and-closure.json'),'complete':False,'ownerFirstFailure':priorOwner['firstFailure'],'nativeFirstFailure':priorReport['firstFailure'],'observedReportSteps':priorReport['stepCount'],'observedPngCount':priorReport['pngCount'],'causeQualification':'Legacy owner assertion is recorded; exact underlying native/child identity cause remains unproved. Root later closure is independent evidence, not retroactive owner success.','copiedHistoricalOutputs':False}
write_json(W/'inputs.json',inputs)
native=(V4/'native.mjs').read_text().replace(str(V4),str(W)).replace('guided-ordinary-seal/v4','guided-ordinary-seal/v5').replace('guided-ordinary-native/v4','guided-ordinary-native/v5')
native=native.replace('priorObservation:inputs.priorObservation,candidateChange:inputs.candidateChange,','priorObservation:inputs.priorObservation,priorV4Failure:inputs.priorV4Failure,candidateChange:inputs.candidateChange,rootCurrentApplicationReceipt:inputs.rootCurrentApplicationReceipt,buildReusePolicy:inputs.buildReusePolicy,')
native=native.replace("assert.equal(inputs.pilot.style,'tube');","assert.equal(inputs.executionPendingOwnerPolicyReview,false);assert.equal(inputs.ownerPolicyAmendment.integrationReviewPending,false);assert.equal(inputs.ownerPolicyAmendment.integrationChecksExecuted,true);\nassert.equal(inputs.pilot.style,'tube');")
assert 'report.elapsedMilliseconds=performance.now()-started;save();clearTimeout(deadline);' in native
(W/'native.mjs').write_text(native)
run=(V4/'run.py').read_text().replace(str(V4),str(W)).replace('guided-ordinary-seal/v4','guided-ordinary-seal/v5').replace('guided-ordinary-build/v4','guided-ordinary-build/v5').replace('guided-ordinary-owner/v4','guided-ordinary-owner/v5').replace('guided-ordinary-native/v4','guided-ordinary-native/v5')
idrun=(ID/'run.py').read_text()
run=run.replace('W=Path(',"from owned_group_anchor import (Identity,ProtectedIdentity,LaunchFacts,ReadWindow,AnchorRejected,\n observe_owned_group,authorize_group_signal,validate_protected_snapshot,identity_evidence,observation_record)\nW=Path(",1)
run=run.replace('PROTECTED=(4312,4313,4314,4315);','PROTECTED=(4312,4313,4314,4315,4316);').replace('EXPECTED_PROTECTED={4312:92445,4313:58298,4314:51358,4315:87796}','EXPECTED_PROTECTED={4312:92445,4313:58298,4314:51358,4315:87796,4316:38617}')
run=run[:run.index('def group_identities')]+idrun[idrun.index('def protected_snapshot'):idrun.index('def note_timeout')]+run[run.index('def note_timeout'):]
run=run.replace("assert seal['schema']=='guided-ordinary-seal/v5' and seal['rootAuthorized'] and seal['complete']","assert seal['schema']=='guided-ordinary-seal/v5' and seal['rootAuthorized'] and seal['complete']\nassert inputs['executionPendingOwnerPolicyReview'] is False and inputs['ownerPolicyAmendment']['integrationReviewPending'] is False and inputs['ownerPolicyAmendment']['integrationChecksExecuted'] is True,'Root-reviewed and checked V5 owner integration required'")
run=run.replace("assert build['sourceFreeze']==seal['sourceFreeze'];verify(seal['sourceFreeze'])","assert build['sourceFreeze']==seal['sourceFreeze'];f=json.loads(verify(seal['sourceFreeze']));assert f['schema']=='guided-ordinary-source-freeze/v5' and f['complete'] and f['build']==inputs['buildId']")
oldstart=run.index("closure=json.loads(verify(inputs['protectedIdentityReference']))")
oldend=run.index('started=time.monotonic();owner_deadline=',oldstart)
fresh=idrun[idrun.index("closure=json.loads(verify(inputs['protectedIdentityAuthority']))"):idrun.index('started=time.monotonic();owner_deadline=')].replace('protectedIdentityAuthority','protectedIdentityReference')
run=run[:oldstart]+fresh+run[oldend:]
run=run.replace("record['priorObservation']=inputs['priorObservation']","record['priorObservation']=inputs['priorObservation'];record['priorV4Failure']=inputs['priorV4Failure']\nrecord['rootCurrentApplicationReceipt']=inputs['rootCurrentApplicationReceipt'];record['buildReusePolicy']=inputs['buildReusePolicy']\nrecord['protected4316ExpectedPid']=38617;record['protected4316RootToolSession']='59708';record['protectedIdentityReference']=inputs['protectedIdentityReference']")
oldstart=run.index('known_owned={}')
oldend=run.index('class Handler',oldstart)
fresh=idrun[idrun.index('# Exact argv is declared'):idrun.index('class Handler')]
run=run[:oldstart]+fresh+run[oldend:]
oldpopen="proc=subprocess.Popen(['/opt/homebrew/bin/node',str(W/'native.mjs'),'--run=true','--url=http://127.0.0.1:4301/?diagnostics','--out='+str(W/'candidate-first')],stdout=log,stderr=subprocess.STDOUT,start_new_session=True,env=env)"
assert oldpopen in run
run=run.replace(oldpopen,'proc=subprocess.Popen(native_argv,stdout=log,stderr=subprocess.STDOUT,start_new_session=True,env=env)')
oldinitial="initial_owned=required_read(remember_owned,'initial-owned-leader',min(owner_deadline,time.monotonic()+7));assert proc.pid in initial_owned,'Fresh native leader identity absent'\n  record['ownedProcessIdentity']=initial_owned[proc.pid];record['ownedIdentities']=list(known_owned.values());last_identity=time.monotonic()"
newinitial="initial_owned=required_read(lambda deadline:remember_owned(deadline,'initial-owned-leader'),'initial-owned-leader',min(owner_deadline,time.monotonic()+7))\n  assert initial_owned.anchor_kind=='original-leader/bootstrap' and initial_owned.state.original_leader.pid==proc.pid,'Fresh native leader identity absent'\n  record['ownedProcessIdentity']=identity_evidence(initial_owned.state.original_leader);last_identity=time.monotonic()"
assert oldinitial in run;run=run.replace(oldinitial,newinitial)
run=run.replace('try:remember_owned(owner_deadline);record[\'ownedIdentities\']=list(known_owned.values())',"try:remember_owned(owner_deadline,'periodic-owned-identity')")
oldstart=run.index(' if proc:\n',run.index('\nfinally:\n'))
oldend=run.index(' if server:\n',oldstart)
fresh=idrun[idrun.index(' if proc:\n',idrun.index('\nfinally:\n')):idrun.index(' if server:\n',idrun.index('\nfinally:\n'))]
run=run[:oldstart]+fresh+run[oldend:]
run=run.replace("record['protectedAfter']=required_read(identities,'cleanup-protected',cleanup_deadline)\n  record['protectedPreserved']", "record['protectedAfter']=required_read(identities,'cleanup-protected',cleanup_deadline)\n  validate_protected_snapshot(protected_reference,protected_snapshot(record['protectedAfter']))\n  record['protectedPreserved']")
assert 'known_owned' not in run
# Source-writer invariants only: unchanged original witness validation and runtime controls.
assert run[run.index('def array_bytes'):run.index('sealbytes=')].replace('guided-ordinary-native/v5','guided-ordinary-native/v4')==(V4/'run.py').read_text()[(V4/'run.py').read_text().index('def array_bytes'):(V4/'run.py').read_text().index('sealbytes=')]
for name in UNCHANGED:assert (W/name).read_bytes()==(V4/name).read_bytes()
(W/'run.py').write_text(run)
write_json(W/'before-source-mapping.json',{'schema':'guided-ordinary-v5-before-source-mapping/v1','complete':True,'sourceOnly':True,'originalV4Untouched':True,'files':mapping,'unchangedRuntimeControlWitnessHelpers':list(UNCHANGED),'runtimeControlAndWitnessValidatorPreserved':True,'diagnosticCompilerOrModuleCopiedDuringSourceDraft':False,'productionEdited':False,'candidateImportsSyntaxTestsPrepareBuildNativeOSPortsGitProbesExecuted':False})
write_json(W/'source-only-origin.json',{'schema':'guided-ordinary-source-preparation/v5','sourceOnly':True,'temporaryFileSourceWriterExecuted':True,'sourceWriter':pin(Path(__file__)),'candidateImportsSyntaxTestsPrepareBuildNativeOSPortsGitProbesExecuted':False,'productionEdits':False,'originalFailedV4Untouched':True,'historicalDistDiagnosticModuleOrExecutionOutputsCopied':False,'onlyHistoricalRecipeAndMetadataCopiedToBefore':True,'ownerIntegrationDonor':pin(ID/'run.py'),'pureModuleSource':pin(module),'normalAndDiagnosticBuildEvidence':'Existing actual V4 terminal0 receipts are referenced exactly, not rerun or relabeled as V5 build execution.','executionPendingOwnerPolicyReview':True,'integrationReviewPending':True,'integrationChecksExecuted':False})
print(json.dumps({'sourceOnly':True,'directory':str(W),'filesWritten':len(list(W.iterdir())),'V4RecordsChanged':False,'candidateExecutionOrChecks':False}))
