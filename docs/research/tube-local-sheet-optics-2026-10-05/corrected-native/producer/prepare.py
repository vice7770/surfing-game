from pathlib import Path
import hashlib,json,shutil

W=Path('/private/tmp/tube-local-sheet-capture-v2-20261005')
R=Path('/Users/regina/Desktop/Projects/surfing-game')
P=Path('/private/tmp/tube-c-mature-region-native-20261005')
def pin(p):
 b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
assert not (W/'dist').exists()
shutil.copytree(R/'dist',W/'dist')
assert json.loads((W/'dist/build.json').read_text())['build']=='tube-local-sheet-20261005'
for name in ('mature-mouth.mjs','inspection-bridge.mjs','inputs.json'):
 shutil.copyfile(P/name,W/name)
native=(P/'native.mjs').read_text()
native=native.replace(str(P),str(W)).replace('tube-c-formation-20261005','tube-local-sheet-20261005')
native=native.replace('c-mature-region-root-seal/v1','local-sheet-capture/v1').replace('c-mature-region-native/v1','local-sheet-capture-native/v1')
native=native.replace('${retainContactDiagnostics.toString()}', 'ride => ride')
(W/'native.mjs').write_text(native)
parent=json.loads((P/'seal.json').read_text())
sources=[R/p for p in ('src/wave/barrel/lipSheet.ts','src/wave/barrel/sheetExitNormals.test.ts','src/scene/barrel/SweptBarrelMesh.ts','src/scene/barrel/SweptBarrelMesh.test.ts','src/wave/barrel/sweptLoft.ts','src/wave/barrel/boundedCProfile.ts')]
frozen=[]
for source in sources:
 target=W/'source'/source.relative_to(R);target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target);frozen.append(target)
build={'schema':'local-sheet-build/v1','build':'tube-local-sheet-20261005','assets':[pin(p)for p in sorted((W/'dist').rglob('*'))if p.is_file()],'sources':[pin(p)for p in frozen]}
(W/'build.json').write_text(json.dumps(build,indent=2)+'\n')
seal={'schema':'local-sheet-capture/v1','rootAuthorized':True,'complete':True,'limits':parent['limits'],
 'approvedApplicationBuild':pin(W/'build.json'),'approvedDiagnosticBuild':parent['approvedDiagnosticBuild'],'diagnosticModule':parent['diagnosticModule'],
 'helpers':[pin(W/n)for n in('native.mjs','mature-mouth.mjs','inspection-bridge.mjs','inputs.json')],
 'borrowedHelpers':parent['borrowedHelperPins'],
 'comparison':'Shader-only candidate; same public seed and first eligible mature camera. All 37 loft arrays and raw front must match accepted parent; no ride or exposed-mouth claim.'}
(W/'seal.json').write_text(json.dumps(seal,indent=2)+'\n')
print(json.dumps({'prepared':True,'build':pin(W/'build.json'),'seal':pin(W/'seal.json')}))
