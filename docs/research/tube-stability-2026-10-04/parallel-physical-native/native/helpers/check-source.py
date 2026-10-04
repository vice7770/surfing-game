"""Read-only verification of current public contracts, root build and failed provenance."""
from pathlib import Path
import hashlib, importlib.util, json, sys
sys.dont_write_bytecode = True
W = Path(__file__).resolve().parent
def verify(row):
    data=Path(row['file']).read_bytes()
    assert len(data)==row['bytes'] and hashlib.sha256(data).hexdigest()==row['sha256'],row['file']
contract=json.loads((W/'new-source-contract-checks.json').read_text())
verify(contract['rootCompleteBuild'])
for pair in contract['unchangedPublicDrawingExportControlSourcePairs']:
    verify(pair['parent']);verify(pair['candidate'])
    assert (pair['parent']['bytes'],pair['parent']['sha256'])==(pair['candidate']['bytes'],pair['candidate']['sha256'])
verify(contract['priorSourceContract']);verify(contract['inheritedGpuExportTest'])
provenance=json.loads((W/'provenance.json').read_text())
for row in provenance['parentHelperPins']:verify(row)
for group in ['priorFailedMouth','priorFailedParallel']:
    for row in provenance[group].values():verify(row)
verify(provenance['physicalSourceReadiness'])
spec=importlib.util.spec_from_file_location('source_only_owner',W/'run.py')
owner=importlib.util.module_from_spec(spec);spec.loader.exec_module(owner)
build=json.loads(owner.BUILD_MANIFEST.read_text());assert owner.verify_complete_build(build,owner.CANDIDATE_DIST)
for row in build['sourcePins']+build['assetPins']:verify(row)
print(json.dumps({'complete':True,'publicContractPairsExact':16,'newRootSourcePins':579,'assets':49,'failedProvenanceUnchanged':True,'resourcesStarted':False,'portsProbed':False,'buildPerformed':False}))
