"""Writes helper metadata only. Default is pending; explicit root receipt acceptance never launches or seals."""
from pathlib import Path
import argparse,hashlib,importlib.util,json,sys
sys.dont_write_bytecode=True
W=Path(__file__).resolve().parent
P=Path('/private/tmp/tube-pop-up-contact-operands-native-v11-20261005')
V7=Path('/private/tmp/tube-pop-up-contact-native-v7-20261005')
V8=Path('/private/tmp/tube-pop-up-contact-operands-native-v8-20261005')
O=Path('/private/tmp/tube-native-trial-balance-observer-20261005')
B=Path('/private/tmp/tube-native-trial-balance-build-20261005')
BUILD_ID='tube-native-trial-balance-20261005'
def pin(path):
 p=Path(path);b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def save(name,value):(W/name).write_text(json.dumps(value,indent=2)+'\n')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--accept-root-authority',action='store_true');args=parser.parse_args()
 inherited=json.loads((P/'seal.json').read_text())
 history={key:value for key,value in inherited.items() if key.startswith('prior') and isinstance(value,dict) and 'file' in value}
 for prefix,base in [('priorV11',P),('priorV7',V7)]:
  for suffix,name in [('Readiness','readiness.json'),('Owner','candidate-first-owner.json'),('Report','candidate-first/report.json')]:history[prefix+suffix]=pin(base/name)
 authorityPin=pin(W/'source-readiness.json') if (W/'source-readiness.json').exists() else None
 history['sourceReadiness']=authorityPin
 appPath=W/'root-complete-build-result.json';diagPath=W/'root-diagnostic-build-result.json';rootChecksPath=W/'root-helper-checks.json'
 accepted=False;build=diagnostic=None;authority=None;checkPin=None
 if args.accept_root_authority:
  spec=importlib.util.spec_from_file_location('trial_balance_owner_freeze',W/'run.py');owner=importlib.util.module_from_spec(spec);spec.loader.exec_module(owner)
  authority,rows=owner.verify_source_authority(authorityPin)
  checks=json.loads((W/'source-helper-checks.json').read_text());metadata=json.loads((W/'metadata-check.json').read_text())
  assert checks['schema']=='trial-balance-source-helper-checks/v1' and checks['complete'] is True and checks['totalFields']==102
  assert metadata['schema']=='trial-balance-helper-metadata-check/v1' and metadata['complete'] is True and metadata['fields']==102
  rootChecks=json.loads(rootChecksPath.read_text());assert rootChecks['schema']=='trial-balance-root-helper-checks/v1' and rootChecks['complete'] is True
  for name in ['nativeSyntax','diagnosticWrapperSyntax','sourceOnlyOwner']:
   check=rootChecks[name];assert check['run'] is True and check['exitCode']==0;assert pin(check['log']['file'])==check['log']
  checkPin=pin(rootChecksPath)
  build=json.loads(appPath.read_text());assert owner.verify_complete_build(build,W/'candidate-complete-dist') and len(build['sourcePins'])==587 and len(build['assetPins'])==49
  candidate=json.loads(diagPath.read_text())
  s=dict(history,rootDiagnosticBuild=pin(diagPath),diagnosticModule=candidate['module'],diagnosticModuleReferencePolicy='root-rebuilt-original74-input-graph-against-trial-balance-observer-source')
  diagnostic=owner.verify_diagnostic_reference(s,build);accepted=True
 borrowed=json.loads((P/'source-helper-checks.json').read_text())['borrowedHelpers']
 owned=['run.py','native.mjs','check-source.py','metadata-check.py','freeze.py','observer-fields.json','adapter.patch','README.md','source-helper-checks.json','metadata-check.json']
 refs=[pin(P/'seal.json'),pin(V8/'source-manifest.json'),pin(O/'observer-fields.json'),pin(O/'freeze.json'),pin(B/'build-diagnostic.mjs'),pin(Path('/private/tmp/tube-landing-longitudinal-native-20261005/run.py')),pin(Path('/private/tmp/tube-landing-longitudinal-native-20261005/native.mjs'))]+[value for value in history.values() if value]
 if authorityPin:
  declaration=json.loads((W/'source-readiness.json').read_text())
  refs.extend(declaration[key] for key in ['sourcePinsManifest','sourceDelta','candidateRuntime','rootObserverChecks','rootCPUResult'])
 if accepted:refs.extend([pin(appPath),pin(diagPath),diagnostic['entry'],diagnostic['module'],checkPin])
 pins=list({q['file']:q for q in [pin(W/name)for name in owned]+refs+borrowed}.values())
 alias={'file':str(W/'observer-fields.json'),'target':str(O/'observer-fields.json'),'bytes':8731,'sha256':'19917b765b18c8b1e37e608878e9041115e1b96fdd21d46451a36d375554d72a','policy':'exact-literal-frozen-observer-metadata-copy'}
 save('helper-pins.json',{'schema':'trial-balance-helper-pins/v1','pins':pins,'helperMetadataCopies':[alias],'adapterTextLineage':{'pins':[pin(Path('/private/tmp/tube-landing-longitudinal-native-20261005/run.py')),pin(Path('/private/tmp/tube-landing-longitudinal-native-20261005/native.mjs'))],'scope':'text normalization only; no rejected source or build authority inherited'},'actualAppBuildAccepted':accepted,'actualDiagnosticBuildAccepted':accepted,'helperAcceptance':accepted})
 pending={name:{'run':False,'passed':False,'status':'pending root acceptance'} for name in ['sourceHelperCheck','metadataCheck','nativeSyntax','diagnosticWrapperSyntax','sourceOnlyOwner','applicationBuild','diagnosticBuild','native']}
 if accepted:
  for name in ['nativeSyntax','diagnosticWrapperSyntax','sourceOnlyOwner']:pending[name]=dict(rootChecks[name],passed=True)
  pending['sourceHelperCheck']={'run':True,'passed':True,'receipt':pin(W/'source-helper-checks.json')}
  pending['metadataCheck']={'run':True,'passed':True,'receipt':pin(W/'metadata-check.json')}
  pending['applicationBuild']={'run':True,'passed':True,'exitCode':0,'receipt':pin(appPath)}
  pending['diagnosticBuild']={'run':True,'passed':True,'exitCode':0,'receipt':pin(diagPath)}
 readiness={'schema':'trial-balance-preparation-readiness/v1','complete':accepted,'frozen':accepted,'preparationFrozen':True,'status':'frozen-actual-root-authority-verified' if accepted else 'pending-actual-root-source-build-and-helper-receipts','sourceOnly':True,'work':str(W),'buildId':BUILD_ID,'sourceReadiness':authorityPin,'helperPinsManifest':pin(W/'helper-pins.json'),'resourcesStarted':False,'portsProbed':False,'sourceOrBuildWrittenByHelper':False,'actualAppBuildAccepted':accepted,'actualDiagnosticBuildAccepted':accepted,'helperAcceptance':accepted,'executableChecksAccepted':accepted,'actualNative':False,'sourcePreparationCount':588,'completeBuildSourceCount':587,'completeBuildAssetCount':49,'diagnosticModuleInputs':74,'diagnosticCandidateSourceInputs':71,'compilerConfigurationInputCount':1,'compilerWatchedInputCount':75,'observerFields':alias,'originalFields':38,'newScalarCopies':63,'availabilityMarker':'standingTrialAvailable','totalFields':102,'markerZeroInvalidatesStaleWords':True,'markerOneOnlyMeansCoupledTrialCaptured':True,'separateHydrodynamicAttributionAvailable':False,'minimalAdapterChanges':'Workspace/schema/source and receipt authority, field metadata reader and descriptive report metadata only; replay/menu/cue/control/camera/timing/media/sidecar/selection tail unchanged.','ordinaryRun':{'publicReplayOverrides':{'seed':6238,'componentCount':64,'dx':2,'fineSpacing':1},'maxSteps':2160,'secondsPerStep':1/60,'noPlacementForcedCueSeedSearchOrRetries':True},'finiteOwner':{'wholeSeconds':660,'commandSeconds':648,'internalNativeSeconds':635,'cleanupSeconds':7,'startupWaitMilliseconds':180000,'rootSealSchema':'trial-balance-root-seal/v1','nativeSchema':'trial-balance-native/v1','ports':[4301,9711],'protectedStatesInitially':{'4310':True,'4311':True,'4312':False,'4313':False}},'movieCapBehavior':{'movingAdvances':240,'requests':241,'movieStopsAtCap':True,'ordinaryPhysicsContinues':True,'replayStopUnchanged':True},'diagnosticModuleReferencePolicy':'root-rebuilt-original74-input-graph-against-trial-balance-observer-source','executableChecks':pending,'claims':{key:False for key in ['actualNative','exactV11InitialReplay','nativeCauseOrFixAccepted','ordinaryStandingAccepted','bodyPassageAccepted','visualAcceptance','FPS','productionAdoption']},'priorV11Readiness':history['priorV11Readiness'],'priorV11Owner':history['priorV11Owner'],'priorV11Report':history['priorV11Report'],'priorV7Readiness':history['priorV7Readiness'],'priorV7Owner':history['priorV7Owner'],'priorV7Report':history['priorV7Report']}
 readiness.update(actualObserverCPUAuthorityKeys=['rootObserverChecks','rootCPUResult'],originalOrFailedFixturePassInherited=False)
 if accepted:readiness.update(rootCompleteBuild=pin(appPath),rootDiagnosticBuild=pin(diagPath),diagnosticModule=diagnostic['module'],rootHelperChecks=checkPin)
 save('readiness.json',readiness)
 handoff={'schema':'trial-balance-root-seal-handoff/v1','sourceOnly':True,'rootSealRequired':True,'rootSealCreated':False,'status':readiness['status'],'newSealPath':str(W/'seal.json'),'newSealSchema':'trial-balance-root-seal/v1','helperReadiness':pin(W/'readiness.json'),'helperPinsManifest':pin(W/'helper-pins.json'),'expectedRootCompleteBuild':{'file':str(appPath),'schema':'trial-balance-root-complete-build/v1','source':str(W/'source'),'buildId':BUILD_ID,'sourceInputs':587,'completeAssets':49},'expectedRootDiagnosticBuild':{'file':str(diagPath),'schema':'trial-balance-diagnostic-root-build/v1','entry':str(W/'autopilot-entry.ts'),'module':str(W/'diagnostic-autopilot.mjs'),'inputs':74,'sourceInputs':71,'compilerConfigurationInputs':1,'compilerWatchedInputs':75,'exports':['Autopilot','autopilotView','riderPartVolumes'],'mustCompileFresh':True,'AttachedRiderMustBeReachable':True,'observerFields':alias},'expectedRootHelperChecks':{'file':str(rootChecksPath),'schema':'trial-balance-root-helper-checks/v1','complete':True,'requiredChecks':['nativeSyntax','diagnosticWrapperSyntax','sourceOnlyOwner'],'eachCheck':{'run':True,'exitCode':0,'log':'file/bytes/sha256 pin'},'sourceHelperCheck':str(W/'source-helper-checks.json'),'metadataCheck':str(W/'metadata-check.json')},'candidateDist':str(W/'candidate-complete-dist'),'inheritSealHistoryFieldsFromV11':pin(P/'seal.json'),'addRequiredSealFields':history,'diagnosticModuleReferencePolicy':readiness['diagnosticModuleReferencePolicy'],'literalOperandMetadataCopy':alias,'movieCapBehavior':readiness['movieCapBehavior'],'actualAppBuildAccepted':accepted,'actualDiagnosticBuildAccepted':accepted,'helperAcceptance':accepted,'actualNative':False}
 handoff['expectedRootSourceAuthorityCPU']={'keys':['rootObserverChecks','rootCPUResult'],'identicalPinsRequired':True,'result':{'complete':True,'checks':'nonempty; all exitCode0'},'failedFixtureReceiptsAccepted':False}
 save('seal-handoff.json',handoff)
 save('freeze.json',{'schema':'trial-balance-helper-freeze/v1','complete':accepted,'frozen':accepted,'preparationFrozen':True,'status':readiness['status'],'pins':[pin(W/name)for name in ['readiness.json','helper-pins.json','seal-handoff.json','source-helper-checks.json','metadata-check.json','adapter.patch']],'helperPinsCount':len(pins),'resourcesStarted':False,'portsProbed':False,'rootSealCreated':False,'actualAppBuildAccepted':accepted,'actualDiagnosticBuildAccepted':accepted,'helperAcceptance':accepted,'actualNative':False})
 print(json.dumps({'status':readiness['status'],'readiness':pin(W/'readiness.json'),'helperPins':pin(W/'helper-pins.json'),'freeze':pin(W/'freeze.json'),'handoff':pin(W/'seal-handoff.json'),'helperPinsCount':len(pins),'accepted':accepted,'resourcesStarted':False,'portsProbed':False}))
