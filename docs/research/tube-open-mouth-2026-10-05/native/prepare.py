"""Root-only byte freeze of the already completed production build; never builds or starts resources."""
from pathlib import Path
import hashlib,json,shutil

W=Path('/private/tmp/tube-open-mouth-native-20261005')
R=Path('/Users/regina/Desktop/Projects/surfing-game')
P=Path('/private/tmp/tube-local-sheet-capture-v2-20261005')
BUILD_ID='tube-open-mouth-20261005'
SOURCE_PATHS=(
 'src/wave/barrel/lipSheet.ts',
 'src/scene/barrel/SweptBarrelMesh.ts',
 'src/wave/barrel/boundedCProfile.ts',
 'src/wave/barrel/sweptLoft.ts',
 'src/wave/barrel/sheetExitNormals.test.ts',
 'src/scene/barrel/SweptBarrelMesh.test.ts',
 'src/wave/barrel/boundedCOpenMouth.test.ts',
 'src/wave/barrel/boundedCConsumers.test.ts',
)
HELPERS=('prepare.py','run.py','native.mjs','mature-mouth.mjs','inspection-bridge.mjs','inputs.json','README.md')
def pin(p):
 b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def verify(spec):
 b=Path(spec['file']).read_bytes();assert len(b)==spec['bytes'] and hashlib.sha256(b).hexdigest()==spec['sha256'];return b
assert not any((W/name).exists()for name in('dist','source','source-freeze.json','build.json','seal.json','prepare-result.json','owner.json','candidate-first')),'First-only actual root preparation'
assert json.loads((R/'dist/build.json').read_text())['build']==BUILD_ID,'Root must finish the selected production build before freezing'
inputs=json.loads((W/'inputs.json').read_text())
parent=json.loads((P/'seal.json').read_text())
assert parent['schema']=='local-sheet-capture/v1' and parent['rootAuthorized'] and parent['complete']
for spec in inputs['borrowedHelperPins']+[inputs['diagnosticModule'],inputs['approvedDiagnosticBuild'],inputs['knownCReport'],inputs['knownCOwner'],inputs['approvedMatureReport'],inputs['approvedMatureOwner']]:verify(spec)
live=[pin(R/path)for path in SOURCE_PATHS]
shutil.copytree(R/'dist',W/'dist')
assert json.loads((W/'dist/build.json').read_text())['build']==BUILD_ID
frozen=[]
for path,original in zip(SOURCE_PATHS,live):
 target=W/'source'/path;target.parent.mkdir(parents=True,exist_ok=True)
 target.write_bytes(verify(original));frozen.append(pin(target))
for spec in live:verify(spec)
freeze={'schema':'open-mouth-source-freeze/v1','complete':True,'buildId':BUILD_ID,
 'freezeTiming':'Actual root preparation after root-reported terminal tsc/vite build; no build is executed by this producer.',
 'files':[{'relative':path,'live':a,'frozen':b}for path,a,b in zip(SOURCE_PATHS,live,frozen)],
 'sourceBuildIdentityScope':'Exact selected dist and current source bytes. Root owns compile command/result evidence; byte binding is not geometry, optics or quality acceptance.'}
(W/'source-freeze.json').write_text(json.dumps(freeze,indent=2)+'\n')
build={'schema':'open-mouth-build/v1','build':BUILD_ID,
 'assets':[pin(p)for p in sorted((W/'dist').rglob('*'))if p.is_file()],
 'sources':frozen,'liveSources':live,'sourceFreeze':pin(W/'source-freeze.json'),
 'buildOperation':'Copy only of root-built dist; no runtime build or source mutation.'}
(W/'build.json').write_text(json.dumps(build,indent=2)+'\n')
limits={**parent['limits'],'pngCount':4,'pngBytesTotal':50331648}
seal={'schema':'open-mouth-capture/v1','rootAuthorized':True,'complete':True,'limits':limits,
 'approvedApplicationBuild':pin(W/'build.json'),'sourceFreeze':pin(W/'source-freeze.json'),
 'approvedDiagnosticBuild':inputs['approvedDiagnosticBuild'],'diagnosticModule':inputs['diagnosticModule'],
 'helpers':[pin(W/name)for name in HELPERS],'borrowedHelpers':inputs['borrowedHelperPins'],
 'referencePins':[inputs[key]for key in('knownCReport','knownCOwner','approvedMatureReport','approvedMatureOwner')],
 'comparison':'Current first mature geometry recorded anew. Prior report supplies fixed interior pose/projection only; no prior geometry/epoch/selector equality. Separate declared current cap64/floor104 side view. No exposed run-end mouth, playability or quality acceptance.'}
(W/'seal.json').write_text(json.dumps(seal,indent=2)+'\n')
result={'schema':'open-mouth-preparation-result/v1','complete':True,'build':pin(W/'build.json'),'sourceFreeze':pin(W/'source-freeze.json'),'seal':pin(W/'seal.json'),
 'sources':len(frozen),'resourcesStarted':False,'portsProbed':False,'executedTestsOrBuilds':False}
(W/'prepare-result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
