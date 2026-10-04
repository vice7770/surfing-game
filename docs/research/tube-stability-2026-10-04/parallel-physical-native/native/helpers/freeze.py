"""Freeze source-only helper receipts. Root alone creates the arm seal and launches resources."""
from pathlib import Path
import hashlib, importlib.util, json, subprocess, sys
sys.dont_write_bytecode=True
W=Path(__file__).resolve().parent
OLD=Path('/private/tmp/tube-bounded-c-parallel-mouth-native-20261004')
def pin(p):
 p=Path(p).resolve();b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def verify(row):assert pin(row['file'])==row,row['file']
def save(name,value):
 p=W/name;assert not p.exists(),p;p.write_text(json.dumps(value,indent=2)+'\n')
for name in ['helper-pins.json','readiness.json','seal.json']:assert not (W/name).exists(),name
assert json.loads((W/'cpu-validation.json').read_text())['complete']
sourcecheck=subprocess.run(['python3',str(W/'check-source.py')],capture_output=True,text=True,check=True)
assert json.loads(sourcecheck.stdout)['complete']
spec=importlib.util.spec_from_file_location('freeze_owner',W/'run.py');owner=importlib.util.module_from_spec(spec);spec.loader.exec_module(owner)
build=json.loads(owner.BUILD_MANIFEST.read_text());assert owner.verify_complete_build(build,owner.CANDIDATE_DIST)
assert len(build['sourcePins'])==579 and len(build['assetPins'])==49
for row in build['sourcePins']+build['assetPins']:verify(row)
parent=json.loads((OLD/'readiness.json').read_text());provenance=json.loads((W/'provenance.json').read_text())
for row in provenance['parentHelperPins']:verify(row)
local=['run.py','native.mjs','native-owned.mjs','moving-shape.mjs','station-tools.mjs','mouth-tools.mjs',
 'mouth-tools.test.mjs','mouth-integration-checks.mjs','owner-event-checks.py','mock-checks.mjs','identity-checks.mjs','owner-mock-checks.py',
 'helper-types.d.ts','README.md','blueprint.txt','provenance.json','new-source-contract-checks.json','check-source.py',
 'cpu-validation-runner.py','cpu-validation.json','cpu-validation.log','mouth-integration-checks.json','owner-event-checks.json',
 'mock-checks.json','identity-checks.json','owner-mock-checks.json','syntax-dry-owner-checks.json','first-owner-fixture-failure.json',
 'owner-fixture/first-missing-mouth-helper-seal.json','freeze.py']
external=[Path('/private/tmp/tube-directed-entry-20261004/body-witnesses.mjs'),
 Path('/Users/regina/Desktop/Projects/surfing-game/scripts/browser/cdp.mjs'),OLD/'gpu-export-checks.json',OLD/'new-source-contract-checks.json']
helpers=[pin(W/n) for n in local]+[pin(p) for p in external]
save('helper-pins.json',helpers)
policy=dict(parent['componentLineagePolicy']);policy['actualEventTrajectoryClaimKey']='materialTrajectoryClaim'
ready={'schema':'bounded-C-parallel-physics-mouth-native-readiness/v1','complete':True,'frozen':True,
 'resourcesStarted':False,'portsProbed':False,'buildPerformed':False,'sourceModified':False,
 'newPhysicalCandidateNotCameraOnlyEquality':True,'rootOwnsBuildCompositionSealAndNative':True,
 'rootCompleteBuild':pin(owner.BUILD_MANIFEST),'sourcePins':579,'assets':49,'helperPins':helpers,'helperPinsManifest':pin(W/'helper-pins.json'),
 'priorAirSeal':parent['priorAirSeal'],'priorFullsheetSeal':parent['priorFullsheetSeal'],
 'priorParallelSeal':parent['priorParallelSeal'],'priorMouthSeal':pin(OLD/'seal.json'),
 'priorFailedParallel':provenance['priorFailedParallel'],'priorFailedMouth':provenance['priorFailedMouth'],
 'priorFailedAgeGate':pin(Path('/private/tmp/tube-bounded-c-fullsheet-native-20261004/candidate-first/report.json')),
 'physicalSourceReadiness':provenance['physicalSourceReadiness'],'componentLineagePolicy':policy,
 'cameraPolicy':'whole-directed-interval-full-sightline-and-declared-exterior-fallback',
 'boundarySampling':'24 uniform interior stations over ENTIRE current eye-to-directed first-unformed/run-end interval; boundary-nearest first, strictly youngerward, original along, exact current eye component; furthest sampled strict air; no retry after blocked segment',
 'exteriorAnchorPolicy':{'candidateExists':'current strict-air mouth candidate, including when inner sightline blocked','candidateAbsent':'CURRENT selected strict-air eye and current canonical ray/tangent','width':'initial full 128-point contour W','singlePose':'2W youngerward + W shoreward; existing one water-height clamp','belowSurfaceOrOccluded':'capture and explicitly retain diagnostic failure','poseRetries':0,'innerMovieCameraRestored':True},
 'protectedStatesRequiredInitiallyAndFinally':{'4310':'closed','4311':'closed','4312':'open'},
 'checks':{'actualIndexedMouthGeometryTests':11,'wholeIntervalGapOverThreeCellsBothDirections':True,'newCameraTransportIntegrationIncludingNoneBlockedBelowSurface':True,
 'inheritedControlDrawExportFixturesRerun':23,'identityFixturesRerun':32,'ownerFixtures':18,
 'actualRetainedLineageTransitions':4,'schemaAndIdentityMutationsRejected':5,'protectedStateFixtures':3,
 'publicDrawingExportControlSourceByteEqualityPairs':16,'sourceFaithfulGpuExportEvidenceInheritedNotRerun':True,'checkJsNoEmit':True,'PythonAST':True,'JSsyntax':True,'dryOwnerNoResources':True},
 'maximumNeutralSelectionSteps':300,'maximumMovingSteps':240,'maximumCandidateColumnQueriesPerMouthObservation':24,
 'detectorMilliseconds':20000,'maximumPNGCount':4,'movieBytes':16*1024*1024,'pngBytes':48*1024*1024,'reportBytes':32*1024*1024,
 'wholeSeconds':180,'commandSeconds':168,'cleanupSeconds':7,
 'oldFailuresBytePinnedNotRetroaccepted':True,'priorMouthFailureDoesNotEstablishNoEntrance':True,
 'acceptance':{'nativeShape':False,'mouthVisibility':False,'exteriorEntrance':False,'airCorridor':False,'bodyPassage':False,'FPS':False,'productionAdoption':False}}
save('readiness.json',ready)
print(json.dumps({'complete':True,'readiness':pin(W/'readiness.json'),'helperPins':pin(W/'helper-pins.json'),'helperCount':len(helpers),'sourcePins':579,'assets':49,'resourcesStarted':False,'portsProbed':False,'rootSealNotCreated':True}))
