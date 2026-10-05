"""File-only final V5 draft provenance/diff/freeze; never imports or checks candidate source."""
from pathlib import Path
import difflib,hashlib,json
W=Path('/private/tmp/tube-guided-ordinary-v5-telemetry-native-20261005')
V4=Path('/private/tmp/tube-guided-ordinary-v4-telemetry-native-20261005')
def pin(p):
 b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def write(p,x):p.write_text(json.dumps(x,indent=2)+'\n')
i=json.loads((W/'inputs.json').read_bytes())
i['candidateChange'].pop('driverControlsUnchangedFromV3',None)
i['candidateChange']['driverControlsUnchangedFromV4']=True
i['candidateChange']['sameExactV4ControllerModuleReused']=True
i['completedOwnedReadExpiryPolicy']={'exception':'OwnedReadExpired','strictReadDurationSeconds':2,'strictCompletedReadAgeSeconds':2,'classificationBeforePureObservation':True,'stateRefreshOnExpiry':False,'periodicOutcome':'Observation only; exact same process and HTTP continue.','requiredOutcome':'At most3 retries inside original deadline; no signal until successful fresh anchored read.','genuineAnchorRejectedCaughtAsTimeout':False,'timingNoteLimit':16,'rowEvidencePerNote':16,'commandPrefixCharacters':2048,'commandHashCoversFullString':True,'acceptedIdentityClaimFromExpiredRows':False,'rationale':'Root reported actual sealed identity run failed on completed2.059041958s periodic ps read with unchanged live leader; that failed recipe is preserved separately.'}
write(W/'inputs.json',i)
origin=json.loads((W/'source-only-origin.json').read_bytes());origin['finalFileOnlyWriter']=pin(Path(__file__));origin['completedReadExpiryAdditionAuthorizedByRoot']=True;origin['sourceReviews']={'rootIntegrationApprovalPending':True,'independentImmutableAuthoritySourceReviewCompleted':True,'independentExpiryAndSignalSourceReviewCompleted':True,'independentReviewExecutedChecks':False,'reviewQualification':'Peer read-only reviews found no blocking immutable V4 authority or caller expiry/signal issue. Its precision suggestion was applied: detached Identity construction precedes final age sampling/classification/window. Root review and actual integration checks remain pending.'}
write(W/'source-only-origin.json',origin)
runtime=('prepare.py','run.py','native.mjs','control-policy.mjs','body-mesh.mjs','criteria.mjs','loft-snapshot-tools.mjs','rider-driver.mjs')
unchanged=runtime[3:]
for name in unchanged:assert (W/name).read_bytes()==(V4/name).read_bytes()
before=json.loads((W/'before-source-mapping.json').read_bytes())
for entry in before['files']:
 for key in ('original','preserved'):
  spec=entry[key];assert pin(Path(spec['file']))==spec
# These are finite file-byte/metadata invariants, not candidate syntax/import/test execution.
oldrun=(V4/'run.py').read_text();newrun=(W/'run.py').read_text()
assert newrun[newrun.index('def array_bytes'):newrun.index('sealbytes=')].replace('guided-ordinary-native/v5','guided-ordinary-native/v4')==oldrun[oldrun.index('def array_bytes'):oldrun.index('sealbytes=')]
oldnative=(V4/'native.mjs').read_text();newnative=(W/'native.mjs').read_text()
expected=oldnative.replace(str(V4),str(W)).replace('guided-ordinary-seal/v4','guided-ordinary-seal/v5').replace('guided-ordinary-native/v4','guided-ordinary-native/v5')
expected=expected.replace('priorObservation:inputs.priorObservation,candidateChange:inputs.candidateChange,','priorObservation:inputs.priorObservation,priorV4Failure:inputs.priorV4Failure,candidateChange:inputs.candidateChange,rootCurrentApplicationReceipt:inputs.rootCurrentApplicationReceipt,buildReusePolicy:inputs.buildReusePolicy,')
expected=expected.replace("assert.equal(inputs.pilot.style,'tube');","assert.equal(inputs.executionPendingOwnerPolicyReview,false);assert.equal(inputs.ownerPolicyAmendment.integrationReviewPending,false);assert.equal(inputs.ownerPolicyAmendment.integrationChecksExecuted,true);\nassert.equal(inputs.pilot.style,'tube');")
assert newnative==expected
readiness={'schema':'guided-ordinary-v5-source-readiness/v1','sourceOnly':True,'candidateImportsSyntaxTestsPreparationBuildsDiagnosticCompilationNativeOSPortsGitProbesExecuted':False,'productionMutations':False,'historicalV4OriginalBytesReverifiedByFileReads':True,'unchangedControlWitnessDriverHelpers':{name:pin(W/name)for name in unchanged},'exactOriginalWitnessValidatorExceptSchema':True,'nativeDifferenceExactlyScratchPathSchemaReadinessAndProvenance':True,'originalV4FailedOwnerAndNativePreserved':i['priorV4Failure'],'existingActualNormalAndDiagnosticBuildAuthorityReused':True,'copiedHistoricalApplicationModuleOrCandidateOutputDuringDraft':False,'exactPureModule':pin(W/'owned_group_anchor.py'),'fiveProtectedRootAuthority':i['protectedIdentityReference'],'osReadSeconds':2,'requiredReadAttempts':3,'periodicIdentitySeconds':5,'pendingRootReviewAndChecks':True,'rootMustRefreshInputsAndFreezeAfterChecks':True,'wholeAuthorityPreparationAndRuntimePending':True}
write(W/'readiness.json',readiness)
patch=[]
for name in ('README.md','inputs.json')+runtime:
 a=(W/'before-v4'/name).read_text();b=(W/name).read_text()
 patch.extend(difflib.unified_diff(a.splitlines(True),b.splitlines(True),fromfile='ordinary-v4/'+name,tofile='ordinary-v5/'+name))
for name in ('owned_group_anchor.py','before-source-mapping.json','driver-diff.md','readiness.json','source-only-origin.json'):
 b=(W/name).read_text();patch.extend(difflib.unified_diff([],b.splitlines(True),fromfile='/dev/null',tofile='ordinary-v5/'+name))
(W/'recipe.patch').write_text(''.join(patch))
files=tuple(W/name for name in ('README.md','inputs.json')+runtime+('owned_group_anchor.py','before-source-mapping.json','driver-diff.md','readiness.json','source-only-origin.json','recipe.patch'))
freeze={'schema':'guided-ordinary-recipe-source-freeze/v5','sourceOnly':True,'candidateRuntimeExecuted':False,'candidateSyntaxTestsBuildsPrepareNativeOSPortsGitProbesExecuted':False,'temporaryFileSourceWriterExecuted':True,'originalV4Untouched':True,'pendingRootIntegrationReviewAndChecks':True,'wholeAuthorityAndExecutionSealPending':True,'copiedHistoricalDistCompiledModuleOrExecutionOutputs':False,'files':[pin(p)for p in files],'beforeSourceMapping':pin(W/'before-source-mapping.json'),'exactOwnerGuardModule':pin(W/'owned_group_anchor.py'),'references':{'rootCurrentApplicationReceipt':i['rootCurrentApplicationReceipt'],'immutableV4Application':i['immutableV4Application'],'pureModuleStaticFreeze':i['ownerPolicyAmendment']['moduleStaticFreeze'],'rootPureTests':i['ownerPolicyAmendment']['rootPureTests'],'fiveProtectedRootAuthority':i['protectedIdentityReference']},'limits':i['limits'],'scope':'Unexecuted V5 scratch source only; exact existing V4 build provenance, unchanged controls/21-witness criteria, f79e owner integration plus strict completed-read expiry classification. No runtime or ride acceptance.'}
write(W/'recipe-source-freeze.json',freeze)
print(json.dumps({'directory':str(W),'sourceOnly':True,'freeze':pin(W/'recipe-source-freeze.json'),'patch':pin(W/'recipe.patch'),'readiness':pin(W/'readiness.json'),'beforeSourceMapping':pin(W/'before-source-mapping.json'),'candidateExecutionOrChecks':False,'V4OriginalBytesReadVerified':len(before['files'])}))
