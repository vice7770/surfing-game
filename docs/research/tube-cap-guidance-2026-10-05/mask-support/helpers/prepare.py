"""Root-only copy of the completed sealed cap application. No build or live-source freeze."""
from pathlib import Path
import hashlib,json,shutil
W=Path('/private/tmp/tube-mask-support-native-20261005')
def pin(p):
 b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def verify(spec):
 b=Path(spec['file']).read_bytes();assert len(b)==spec['bytes'] and hashlib.sha256(b).hexdigest()==spec['sha256'],spec['file'];return b
assert not any((W/name).exists()for name in('dist','build.json','seal.json','prepare-result.json','owner.json','candidate-first')),'First-only root preparation'
inputs=json.loads((W/'inputs.json').read_bytes())
references=[inputs[key]for key in('referenceReport','referenceOwner','referenceLoft','referenceBuild','referenceSeal','referenceSourceFreeze')]
for spec in references+inputs['borrowedHelperPins']:verify(spec)
report=json.loads(verify(inputs['referenceReport']));owner=json.loads(verify(inputs['referenceOwner']))
assert report['complete'] and report['firstFailure']is None and report['stepCount']==0 and owner['complete'] and owner['exitCode']==0
parent=json.loads(verify(inputs['referenceSeal']));assert parent['rootAuthorized'] and parent['complete']
build=json.loads(verify(inputs['referenceBuild']));assert build['build']==inputs['applicationBuildId']
# Prior frozen assets/sources are authoritative. Current mutable repository files are not frozen or compared here.
for spec in build['assets']+build['sources']:verify(spec)
shutil.copytree(Path(inputs['applicationDirectory']),W/'dist')
assert json.loads((W/'dist/build.json').read_bytes())['build']==inputs['applicationBuildId']
copied={'schema':'matched-mask-support-build/v1','build':inputs['applicationBuildId'],'operation':'Copy sealed completed cap dist only; no build or live-source freeze.',
 'assets':[pin(p)for p in sorted((W/'dist').rglob('*'))if p.is_file()],'priorBuild':inputs['referenceBuild']}
(W/'build.json').write_text(json.dumps(copied,indent=2)+'\n')
names=('inputs.json','README.md','prepare.py','run.py','native.mjs','mask-inspection.mjs')
seal={'schema':'matched-mask-support-seal/v1','rootAuthorized':True,'complete':True,'applicationBuild':pin(W/'build.json'),
 'helpers':[pin(W/name)for name in names],'borrowedHelpers':inputs['borrowedHelperPins'],'references':references,
 'priorAssetsAndFrozenSources':build['assets']+build['sources'],'limits':inputs['limits'],'comparison':inputs['comparison']}
(W/'seal.json').write_text(json.dumps(seal,indent=2)+'\n')
result={'schema':'matched-mask-support-preparation/v1','complete':True,'seal':pin(W/'seal.json'),'build':pin(W/'build.json'),
 'resourcesStarted':False,'portsProbed':False,'executedChecksOrBuilds':False,'liveSourcesWrittenOrFrozen':False}
(W/'prepare-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
