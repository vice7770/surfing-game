"""Root-run helper metadata only. Default remains pending; explicit acceptance never builds, seals or launches."""
from pathlib import Path
import argparse,hashlib,importlib.util,json,sys
sys.dont_write_bytecode=True
W=Path(__file__).resolve().parent
P=Path('/private/tmp/tube-native-trial-balance-native-20261005')
C=Path('/private/tmp/tube-board-rhs-components-observer-20261005')
BUILD_ID='tube-board-rhs-components-20261005'
POLICY='root-rebuilt-immediate102-parent74-input-graph-against-board-rhs-components-source'
def pin(path):
 p=Path(path);b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def save(name,value):(W/name).write_text(json.dumps(value,indent=2)+'\n')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--accept-root-authority',action='store_true');args=parser.parse_args()
 inherited=json.loads((P/'seal.json').read_text())
 history={key:value for key,value in inherited.items() if key.startswith('prior') and isinstance(value,dict) and 'file' in value}
 for suffix,name in [('Readiness','readiness.json'),('Owner','candidate-first-owner.json'),('Report','candidate-first/report.json')]:history['priorTrialBalance'+suffix]=pin(P/name)
 authorityPin=pin(W/'source-readiness.json') if (W/'source-readiness.json').exists() else None
 history['sourceReadiness']=authorityPin
 appPath=W/'root-complete-build-result.json';diagPath=W/'root-diagnostic-build-result.json';rootChecksPath=W/'root-helper-checks.json'
 supplied={name:pin(path)for name,path in [('rootCompleteBuild',appPath),('rootDiagnosticBuild',diagPath)]if path.is_file()}
 accepted=False;diagnostic=None;authority=None;rootChecks=None
 if args.accept_root_authority:
  spec=importlib.util.spec_from_file_location('board_rhs_components_owner_freeze',W/'run.py');owner=importlib.util.module_from_spec(spec);spec.loader.exec_module(owner)
  authority,rows=owner.verify_source_authority(authorityPin)
  checks=json.loads((W/'source-helper-checks.json').read_text());metadata=json.loads((W/'metadata-check.json').read_text())
  assert checks['schema']=='board-rhs-components-source-helper-checks/v1' and checks['complete'] is True and checks['totalFields']==143
  assert metadata['schema']=='board-rhs-components-helper-metadata-check/v1' and metadata['complete'] is True and metadata['fields']==143
  rootChecks=json.loads(rootChecksPath.read_text());assert rootChecks['schema']=='board-rhs-components-root-helper-checks/v1' and rootChecks['complete'] is True
  for name in ['nativeSyntax','diagnosticWrapperSyntax','sourceOnlyOwner']:
   check=rootChecks[name];assert check['run'] is True and check['exitCode']==0 and pin(check['log']['file'])==check['log']
  build=json.loads(appPath.read_text());assert owner.verify_complete_build(build,W/'candidate-complete-dist')
  candidate=json.loads(diagPath.read_text());s=dict(history,rootDiagnosticBuild=pin(diagPath),diagnosticModule=candidate['module'],diagnosticModuleReferencePolicy=POLICY)
  diagnostic=owner.verify_diagnostic_reference(s,build);accepted=True
 borrowed=json.loads((P/'source-helper-checks.json').read_text())['borrowedHelpers']
 owned=['run.py','native.mjs','check-source.py','metadata-check.py','freeze.py','build-diagnostic.mjs','observer-fields.json','adapter.patch','README.md','source-helper-checks.json','metadata-check.json']
 for optional in ['independent-helper-review.md','independent-helper-review-pins.json']:
  if (W/optional).is_file():owned.append(optional)
 refs=[pin(P/name)for name in ['seal.json','source-pins.json','run.py','native.mjs','root-diagnostic-build-result.json']]
 refs += [pin(C/name)for name in ['observer-fields.json','readiness.json','freeze.json','runtime.patch']]+[q for q in history.values()if q]+list(supplied.values())
 if authorityPin:
  declaration=json.loads((W/'source-readiness.json').read_text());refs += [declaration[key]for key in ['sourcePinsManifest','sourceDelta','candidatePreparation','candidatePatch','observerFields','rootCPUResult','rootObserverChecks','rootBaseCopy']]+declaration['candidateRuntimePins']
 if accepted:refs += [pin(appPath),pin(diagPath),diagnostic['entry'],diagnostic['module'],pin(rootChecksPath)]
 pins=list({q['file']:q for q in [pin(W/name)for name in owned]+refs+borrowed}.values())
 alias={'file':str(W/'observer-fields.json'),'target':str(C/'observer-fields.json'),'bytes':17859,'sha256':'e015b21641a592888aea8c160687edb0e4005d6c3e0ab8c0e011b2b739799fc8','policy':'exact-literal-frozen143-field-copy'}
 save('helper-pins.json',{'schema':'board-rhs-components-helper-pins/v1','pins':pins,'helperMetadataCopies':[alias],'adapterTextLineage':{'pins':[pin(P/'run.py'),pin(P/'native.mjs')],'scope':'Exact successful102 helper/control lineage; no102 CPU/build acceptance inherited for143.'},'actualAppBuildAccepted':accepted,'actualDiagnosticBuildAccepted':accepted,'helperAcceptance':accepted})
 pending={name:{'run':False,'passed':False,'status':'pending root acceptance'}for name in ['sourceHelperCheck','metadataCheck','nativeSyntax','diagnosticWrapperSyntax','sourceOnlyOwner','applicationBuild','diagnosticBuild','native']}
 if accepted:
  for name in ['nativeSyntax','diagnosticWrapperSyntax','sourceOnlyOwner']:pending[name]=dict(rootChecks[name],passed=True)
  for name,file in [('sourceHelperCheck','source-helper-checks.json'),('metadataCheck','metadata-check.json')]:pending[name]={'run':True,'passed':True,'receipt':pin(W/file)}
  for name,path in [('applicationBuild',appPath),('diagnosticBuild',diagPath)]:pending[name]={'run':True,'passed':True,'exitCode':0,'receipt':pin(path)}
 readiness={'schema':'board-rhs-components-preparation-readiness/v1','complete':accepted,'frozen':accepted,'preparationFrozen':True,'status':'frozen-actual-root-authority-verified'if accepted else'pending-actual-root-build-and-helper-receipts','sourceOnly':True,'work':str(W),'buildId':BUILD_ID,'sourceReadiness':authorityPin,'helperPinsManifest':pin(W/'helper-pins.json'),'resourcesStarted':False,'portsProbed':False,'sourceOrBuildWrittenByHelper':False,'actualAppBuildAccepted':accepted,'actualDiagnosticBuildAccepted':accepted,'helperAcceptance':accepted,'executableChecksAccepted':accepted,'actualNative':False,'sourcePreparationCount':588,'unchangedParentInputs':586,'completeBuildSourceCount':587,'completeBuildAssetCount':49,'diagnosticModuleInputs':74,'diagnosticCandidateSourceInputs':71,'compilerConfigurationInputCount':1,'compilerWatchedInputCount':75,'observerFields':alias,'oldFields':102,'newScalarCopies':41,'availabilityMarker':'standingTrialAvailable','totalFields':143,'markerZeroInvalidatesStaleWords':True,'markerOneOnlyMeansCoupledTrialCaptured':True,'waterRadiationAndEntrainmentRemainMixed':True,'separateHydrodynamicAttributionAvailable':False,'ordinaryRun':{'publicReplayOverrides':{'seed':6238,'componentCount':64,'dx':2,'fineSpacing':1},'maxSteps':2160,'secondsPerStep':1/60,'noPlacementForcedCueSeedSearchOrRetries':True},'finiteOwner':{'wholeSeconds':660,'commandSeconds':648,'internalNativeSeconds':635,'cleanupSeconds':7,'startupWaitMilliseconds':180000,'rootSealSchema':'board-rhs-components-root-seal/v1','nativeSchema':'board-rhs-components-native/v1','ports':[4301,9711],'protectedStatesInitially':{'4310':True,'4311':True,'4312':False,'4313':False}},'movieCapBehavior':{'movingAdvances':240,'requests':241,'movieStopsAtCap':True,'ordinaryPhysicsContinues':True,'replayStopUnchanged':True},'diagnosticModuleReferencePolicy':POLICY,'diagnosticRetentionPolicy':'Source graph74/71 includes both runtimes; diagnostic lexical count0 allowed; both actual WorkerSurfZone/surfZoneWorker assets must retain143; full actual report samples must be finite143.','generatedOutputPolicy':'Prebuild source-readiness remains frozen. Actual completeBuild builtAssetPins21 plus generatedOutputPins cache1 are separate outputs; postbuild W/source610=588inputs+22outputs.','actualObserverCPUAuthorityKeys':['rootObserverChecks','rootCPUResult'],'prior102CPUOrBuildAcceptanceInherited':False,'executableChecks':pending,'claims':{key:False for key in ['actualNative','exactInitialReplay','nativeCauseOrFixAccepted','ordinaryStandingAccepted','bodyPassageAccepted','visualAcceptance','FPS','productionAdoption']},'priorTrialBalanceReadiness':history['priorTrialBalanceReadiness'],'priorTrialBalanceOwner':history['priorTrialBalanceOwner'],'priorTrialBalanceReport':history['priorTrialBalanceReport']}
 if accepted:readiness.update(rootCompleteBuild=pin(appPath),rootDiagnosticBuild=pin(diagPath),diagnosticModule=diagnostic['module'],rootHelperChecks=pin(rootChecksPath))
 readiness['rootSuppliedReceipts']=supplied
 readiness['suppliedReceiptPinsAreHelperAcceptance']=False
 save('readiness.json',readiness)
 handoff={'schema':'board-rhs-components-root-seal-handoff/v1','sourceOnly':True,'rootSealRequired':True,'rootSealCreated':False,'newSealPath':str(W/'seal.json'),'newSealSchema':'board-rhs-components-root-seal/v1','status':readiness['status'],'helperReadiness':pin(W/'readiness.json'),'helperPinsManifest':pin(W/'helper-pins.json'),'candidateDist':str(W/'candidate-complete-dist'),'inheritHistoryFromImmediate102Seal':pin(P/'seal.json'),'addRequiredSealFields':history,'diagnosticModuleReferencePolicy':POLICY,'literalOperandMetadataCopy':alias,'movieCapBehavior':readiness['movieCapBehavior'],'expectedRootCompleteBuild':{'file':str(appPath),'schema':'board-rhs-components-root-complete-build/v1','buildId':BUILD_ID,'source':str(W/'source'),'sourceInputs':587,'assets':49,'rootApplicationCommand':'Direct pinned board-rhs-components-root-application-command/v1; complete/terminal true exit0; strict-build/application exit0; sourceUnchanged true','builtAssetPins':21,'generatedOutputPins':1},'expectedRootDiagnosticBuild':{'file':str(diagPath),'schema':'board-rhs-components-diagnostic-root-build/v1','entry':str(W/'autopilot-entry.ts'),'module':str(W/'diagnostic-autopilot.mjs'),'inputs':74,'sourceInputs':71,'compilerConfigurationInputs':1,'watchedInputs':75,'exports':['Autopilot','autopilotView','riderPartVolumes'],'freshCompile':True,'AttachedRiderAndBoardBodyReachable':True,'diagnosticLexicalCount0Allowed':True,'bothAppWorkerAssetsRetain':143,'fullActualSamplesFinite':143},'expectedRootHelperChecks':{'file':str(rootChecksPath),'schema':'board-rhs-components-root-helper-checks/v1','complete':True,'checks':['nativeSyntax','diagnosticWrapperSyntax','sourceOnlyOwner'],'each':'run true exitCode0 log pin','sourceHelperCheck':str(W/'source-helper-checks.json'),'metadataCheck':str(W/'metadata-check.json')},'expectedRootCPU':{'path':str(C/'root-checks/result.json'),'schema':'board-rhs-components-root-cpu-checks/v1','keys':['rootObserverChecks','rootCPUResult'],'identicalDirectPins':True,'strictAndParityExit0':True,'parityPassed':2,'parityTotal':2,'parityFailed':0,'wholeSteps':552,'sourcePostUnchanged':True,'sourceOracleCheckInputsAndLogsPinned':True},'actualAppBuildAccepted':accepted,'actualDiagnosticBuildAccepted':accepted,'helperAcceptance':accepted,'actualNative':False}
 save('seal-handoff.json',handoff)
 save('freeze.json',{'schema':'board-rhs-components-helper-freeze/v1','complete':accepted,'frozen':accepted,'preparationFrozen':True,'status':readiness['status'],'pins':[pin(W/name)for name in ['readiness.json','helper-pins.json','seal-handoff.json','source-helper-checks.json','metadata-check.json','adapter.patch']],'helperPinsCount':len(pins),'resourcesStarted':False,'portsProbed':False,'rootSealCreated':False,'actualAppBuildAccepted':accepted,'actualDiagnosticBuildAccepted':accepted,'helperAcceptance':accepted,'actualNative':False})
 print(json.dumps({'status':readiness['status'],'readiness':pin(W/'readiness.json'),'helperPins':pin(W/'helper-pins.json'),'freeze':pin(W/'freeze.json'),'handoff':pin(W/'seal-handoff.json'),'helperPinsCount':len(pins),'accepted':accepted,'resourcesStarted':False,'portsProbed':False}))
