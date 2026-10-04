"""Verify frozen source/build/helper provenance read-only; no resources or model/build tests."""
from pathlib import Path
import hashlib,importlib.util,json,sys
sys.dont_write_bytecode=True
W=Path(__file__).resolve().parent;S=Path('/private/tmp/tube-bounded-c-carrier-support-20261004');OLD=Path('/private/tmp/tube-bounded-c-parallel-physics-mouth-native-20261004')
def pin(p):
 p=Path(p).resolve();b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def verify(r):assert pin(r['file'])==r,r['file']
ready=pin(S/'readiness.json');assert ready['sha256']=='be2073b25d70ca69db3b2362a18bcb618163a2ca4af42493f32b0090751d2cb0'
r=json.loads((S/'readiness.json').read_text());verify(r['sourcePinsManifest']);verify(r['publicHistoryContract']);assert r['complete'] and r['sourceRoot']==str(S/'source')
source=json.loads((S/'source-pins.json').read_text());assert source['count']==len(source['pins'])==582 and source['pins']==r['sourcePins']
for p in source['pins']:assert {k:v for k,v in pin(S/'source'/p['path']).items() if k!='file'}=={k:v for k,v in p.items() if k!='path'}
contract=json.loads((S/'public-history-contract.json').read_text());assert contract['policy']=='bounded-C-incident-support/v1' and contract['packet']['stride']==9 and contract['packet']['paceFieldIndex']==8
assert contract['immutableFingerprint']==['id','column','x','footHeight','footDepth','throwZ','jetPace','jetBase','jetAt','jetUntil']
provider=(S/'source/src/wave/barrel/carrierSupport.ts').read_text();predicate=provider.split('export function geometricPaceActive')[1].split('export function copyCarrierPoint')[0]
assert "point.jetPace !== undefined && point.jetUntil !== undefined && point.tau < point.jetUntil" in predicate and "h.policy === 'bounded-C-incident-support/v1' && h.atTau === point.tau && h.geometricPaceActive" in predicate and 'point.jetPace !== undefined && point.jetBase !== undefined' in predicate
assert 'incidents: point.carrierSupport.incidents.map(i => ({ ...i }))' in provider
front=(S/'source/src/wave/barrel/BreakingFront.ts').read_text();export=front.split('  exportState(): FrontState {')[1].split('  importState(')[0]
assert 'points: this.points.map(copyCarrierPoint), held: this.held.map(copyCarrierPoint)' in export and all(k not in export for k in ('refresh(','step(','advance(','readback'))
oldcontract=json.loads((OLD/'new-source-contract-checks.json').read_text());unchanged=[];changed=[];runtime={p['path'] for p in r['runtimePins']}
for pair in oldcontract['unchangedPublicDrawingExportControlSourcePairs']:
 verify(pair['candidate']);new=pin(S/'source'/pair['relative']);row={'relative':pair['relative'],'parent':pair['candidate'],'candidate':new}
 if (new['bytes'],new['sha256'])==(pair['candidate']['bytes'],pair['candidate']['sha256']):unchanged.append(row)
 else:assert pair['relative'] in runtime;changed.append(row)
verify(oldcontract['inheritedGpuExportTest']);provenance=json.loads((W/'provenance.json').read_text())
for p in provenance['parentHelperInputs']:verify(p)
verify(provenance['parentReadiness'])
parentprovenance=json.loads((OLD/'provenance.json').read_text())
for group in ('priorFailedMouth','priorFailedParallel'):
 for row in parentprovenance[group].values():verify(row)
spec=importlib.util.spec_from_file_location('carrier_source_owner',W/'run.py');owner=importlib.util.module_from_spec(spec);spec.loader.exec_module(owner)
build=None;missing=[]
if owner.BUILD_MANIFEST.exists():
 build=json.loads(owner.BUILD_MANIFEST.read_text());assert owner.verify_complete_build(build,owner.CANDIDATE_DIST)
 for p in build['sourcePins']+build['assetPins']:verify(p)
 buildpaths={str(Path(p['file']).relative_to(S/'source')) for p in build['sourcePins']};sourcepaths={p['path'] for p in source['pins']};assert buildpaths<=sourcepaths;missing=sorted(sourcepaths-buildpaths)
 assert missing==['docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json']
result={'schema':'bounded-C-carrier-support-source-contract-checks/v1','complete':True,'sourceReadiness':ready,'publicHistoryContract':pin(S/'public-history-contract.json'),'sourcePinsManifest':pin(S/'source-pins.json'),'frozenReadinessSourcePins':len(source['pins']),'runtimeChangedPins':r['runtimePins'],'unchangedPublicDrawingExportControlSourcePairs':unchanged,'changedPublicSourcePairsDeclaredRuntime':changed,'predicateAndDeepCopiedHistoryVerified':True,'exportRetainsNormalActiveOrderButNoHistoryRefreshStepOrReadbackAdded':True,'inheritedGpuExportTest':oldcontract['inheritedGpuExportTest'],'inheritedGpuTestNotRerunAndNotNewLeaseProof':True,'priorSourceContract':pin(OLD/'new-source-contract-checks.json'),'failedProvenanceUnchanged':True,'rootCompleteBuild':pin(owner.BUILD_MANIFEST) if build else None,'actualRootBuildVerified':build is not None,'awaitingRootBuild':build is None,'actualBuildSourcePins':len(build['sourcePins']) if build else None,'actualBuildAssetPins':len(build['assetPins']) if build else None,'actualManifestOmittedResearchSourcePins':missing,'resourcesStarted':False,'portsProbed':False,'buildPerformed':False,'appearanceMouthBodyFPSAcceptance':False}
(W/'new-source-contract-checks.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ('complete','frozenReadinessSourcePins','actualRootBuildVerified','actualBuildSourcePins','actualBuildAssetPins','awaitingRootBuild','resourcesStarted','portsProbed')}))
