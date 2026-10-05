"""Root-only future freeze of a terminal application build and newly compiled diagnostic module."""
from pathlib import Path
import hashlib,json,shutil
W=Path('/private/tmp/tube-guided-ordinary-v2-native-20261005')
R=Path('/Users/regina/Desktop/Projects/surfing-game')
def pin(path):
 raw=path.read_bytes();return {'file':str(path),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
def verify(spec):
 raw=Path(spec['file']).read_bytes();assert len(raw)==spec['bytes']and hashlib.sha256(raw).hexdigest()==spec['sha256'],spec['file'];return raw
assert not any((W/name).exists()for name in('dist','source-freeze.json','build.json','seal.json','prepare-result.json','owner.json','candidate-first'))
inputs=json.loads((W/'inputs.json').read_text());assert inputs['pilot']['style']=='tube'and inputs['limits']['steps']==1800
assert json.loads((R/'dist/build.json').read_text())['build']==inputs['buildId'],'Root must finish current application build first'
parent=json.loads(verify(inputs['unchangedProductionBuild']));assert parent['schema']=='guided-ordinary-build/v1'and parent['complete']and parent['build']==inputs['buildId']
for spec in parent['assets']+parent['productionSources']+[inputs['applicationBuildLog']]:verify(spec)
diagnostic=json.loads((W/'diagnostic-build.json').read_text());assert diagnostic['schema']=='guided-ordinary-diagnostic-build/v2'and diagnostic['complete']and not diagnostic['copiedHistoricalModule']
for spec in diagnostic['compiledSources']+[diagnostic['entry'],diagnostic['module'],diagnostic['compiler']]:verify(spec)
sources=[pin(R/path)for path in inputs['productionSources']]
shutil.copytree(Path(inputs['unchangedProductionBuild']['file']).parent/'dist',W/'dist')
freeze={'schema':'guided-ordinary-source-freeze/v2','complete':True,'build':inputs['buildId'],'productionSources':sources,
 'diagnosticCompiledSources':diagnostic['compiledSources'],'freezeTiming':'Root preparation after terminal application build and fresh diagnostic compilation',
 'scope':'Exact live source and diagnostic compilation pins; application byte identity. Root owns successful build/test receipts. No ride acceptance.'}
(W/'source-freeze.json').write_text(json.dumps(freeze,indent=2)+'\n')
build={'schema':'guided-ordinary-build/v2','build':inputs['buildId'],'complete':True,'assets':[pin(p)for p in sorted((W/'dist').rglob('*'))if p.is_file()],
 'productionSources':sources,'diagnosticCompiledSources':diagnostic['compiledSources'],'applicationBuildLog':inputs['applicationBuildLog'],
 'unchangedProductionBuild':inputs['unchangedProductionBuild'],
 'operation':'Exact parent terminal built dist, current production sources verified; fresh diagnostic compilation; no application rebuild or source write'}
(W/'build.json').write_text(json.dumps(build,indent=2)+'\n')
helpers=('inputs.json','autopilot-entry.ts','build-diagnostic.mjs','prepare.py','run.py','native.mjs','control-policy.mjs','body-mesh.mjs','criteria.mjs','rider-driver.mjs','loft-snapshot-tools.mjs','README.md','driver-diff.md')
borrowed=[Path('/private/tmp/tube-stable-x-ordinary-rider-v4-20261005')/name for name in('native-owned.mjs','cdp.mjs','menu-startup.mjs','follower-camera.mjs')]
seal={'schema':'guided-ordinary-seal/v2','rootAuthorized':True,'complete':True,'buildId':inputs['buildId'],'limits':inputs['limits'],
 'applicationBuild':pin(W/'build.json'),'sourceFreeze':pin(W/'source-freeze.json'),'diagnosticBuild':pin(W/'diagnostic-build.json'),'diagnosticModule':diagnostic['module'],
 'unchangedProductionBuild':inputs['unchangedProductionBuild'],
 'helpers':[pin(W/name)for name in helpers],'borrowedHelpers':[pin(p)for p in borrowed]}
(W/'seal.json').write_text(json.dumps(seal,indent=2)+'\n')
result={'schema':'guided-ordinary-preparation-result/v2','complete':True,'build':pin(W/'build.json'),'sourceFreeze':pin(W/'source-freeze.json'),'seal':pin(W/'seal.json'),'resourcesStarted':False,'portsProbed':False,'executedTestsOrBuilds':False}
(W/'prepare-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
