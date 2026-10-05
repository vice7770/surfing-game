"""Read-only source/build/helper contract check. No resources or source/model/build tests."""
from pathlib import Path
import hashlib,importlib.util,json,sys
sys.dont_write_bytecode=True
W=Path(__file__).resolve().parent;S=Path('/private/tmp/tube-bounded-c-stable-x-sampling-20261005');OLD=Path('/private/tmp/tube-bounded-c-carrier-support-native-20261004');C=Path('/private/tmp/tube-bounded-c-carrier-support-20261004')
def pin(p):
 p=Path(p).resolve();b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def verify(r):assert pin(r['file'])==r,r['file']
def relative_verify(root,q):assert {k:v for k,v in pin(root/q['path']).items() if k!='file'}=={k:v for k,v in q.items() if k!='path'},q['path']
ready=pin(S/'readiness.json');assert ready['sha256']=='9d9c5058cf5213ee0e910cc92c648587588e46c078fc6ce4cf80470594c178a6'
r=json.loads((S/'readiness.json').read_text());assert r['complete'] and r['frozen'] and r['sourceRoot']==str(S/'source');relative_verify(S,r['sourcePinsManifest'])
source=json.loads((S/'source-pins.json').read_text());assert source['count']==len(source['pins'])==r['sourceCount']
for p in source['pins']:relative_verify(S/'source',p)
for p in r['payloadPins']:relative_verify(S,p)
carrierready=json.loads((C/'readiness.json').read_text());verify(carrierready['publicHistoryContract']);contract=json.loads((C/'public-history-contract.json').read_text())
assert contract['policy']=='bounded-C-incident-support/v1' and contract['packet']['stride']==9 and contract['packet']['paceFieldIndex']==8
assert contract['immutableFingerprint']==['id','column','x','footHeight','footDepth','throwZ','jetPace','jetBase','jetAt','jetUntil']
provider=(S/'source/src/wave/barrel/carrierSupport.ts').read_text();predicate=provider.split('export function geometricPaceActive')[1].split('export function copyCarrierPoint')[0]
assert "point.jetPace !== undefined && point.jetUntil !== undefined && point.tau < point.jetUntil" in predicate and "h.policy === 'bounded-C-incident-support/v1' && h.atTau === point.tau && h.geometricPaceActive" in predicate and 'point.jetPace !== undefined && point.jetBase !== undefined' in predicate
assert 'incidents: point.carrierSupport.incidents.map(i => ({ ...i }))' in provider
front=(S/'source/src/wave/barrel/BreakingFront.ts').read_text();export=front.split('  exportState(): FrontState {')[1].split('  importState(')[0]
assert 'points: this.points.map(copyCarrierPoint), held: this.held.map(copyCarrierPoint)' in export and all(k not in export for k in ('refresh(','step(','advance(','readback'))
oldcontract=json.loads((OLD/'new-source-contract-checks.json').read_text());unchanged=[];changed=[];runtime=set(r['runtimeChanged'])
for pair in oldcontract['unchangedPublicDrawingExportControlSourcePairs']+oldcontract['changedPublicSourcePairsDeclaredRuntime']:
 verify(pair['candidate']);new=pin(S/'source'/pair['relative']);row={'relative':pair['relative'],'parent':pair['candidate'],'candidate':new}
 if (new['bytes'],new['sha256'])==(pair['candidate']['bytes'],pair['candidate']['sha256']):unchanged.append(row)
 else:assert pair['relative'] in runtime;changed.append(row)
assert {p['relative'] for p in changed}==runtime
verify(oldcontract['inheritedGpuExportTest']);provenance=json.loads((W/'provenance.json').read_text())
for p in provenance['parentHelperInputs']:verify(p)
for key in ('parentReadiness','parentHelperManifest','sourceReadiness','sourcePinsManifest','carrierSourceReadiness','publicHistoryContract','parentSourceContract'):verify(provenance[key])
for group in ('priorFailedMouth','priorFailedParallel'):
 for row in provenance[group].values():verify(row)
spec=importlib.util.spec_from_file_location('stable_X_source_owner',W/'run.py');owner=importlib.util.module_from_spec(spec);spec.loader.exec_module(owner)
build=None;missing=[]
if owner.BUILD_MANIFEST.exists():
 build=json.loads(owner.BUILD_MANIFEST.read_text());assert owner.verify_complete_build(build,owner.CANDIDATE_DIST)
 for p in build['sourcePins']+build['assetPins']:verify(p)
 buildpaths={str(Path(p['file']).relative_to(S/'source')) for p in build['sourcePins']};sourcepaths={p['path'] for p in source['pins']};assert buildpaths<=sourcepaths;missing=sorted(sourcepaths-buildpaths)
 assert missing==['docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json']
result={'schema':'bounded-C-stable-X-source-contract-checks/v1','complete':True,'sourceReadiness':ready,'publicHistoryContract':pin(C/'public-history-contract.json'),'sourcePinsManifest':pin(S/'source-pins.json'),'frozenReadinessSourcePins':len(source['pins']),'runtimeChangedPins':r['runtimePins'],'unchangedPublicDrawingExportControlSourcePairs':unchanged,'changedPublicSourcePairsDeclaredRuntime':changed,'predicateAndDeepCopiedHistoryVerified':True,'exportRetainsNormalActiveOrderButNoHistoryRefreshStepOrReadbackAdded':True,'stableXSamplingIsNewSourceOnlyAndDescriptiveDiagnostics':True,'cameraIdentityHistoryAdvancingAndSnapshotPolicyChanged':False,'inheritedGpuExportTest':oldcontract['inheritedGpuExportTest'],'inheritedGpuTestNotRerunAndNotNewLeaseProof':True,'priorSourceContract':pin(OLD/'new-source-contract-checks.json'),'failedProvenanceUnchanged':True,'rootCompleteBuild':pin(owner.BUILD_MANIFEST) if build else None,'actualRootBuildVerified':build is not None,'awaitingRootBuild':build is None,'actualBuildSourcePins':len(build['sourcePins']) if build else None,'actualBuildAssetPins':len(build['assetPins']) if build else None,'actualManifestOmittedResearchSourcePins':missing,'resourcesStarted':False,'portsProbed':False,'buildPerformed':False,'appearanceMouthBodyFPSAcceptance':False}
(W/'new-source-contract-checks.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ('complete','frozenReadinessSourcePins','actualRootBuildVerified','actualBuildSourcePins','actualBuildAssetPins','awaitingRootBuild','resourcesStarted','portsProbed')}))
