"""Root-only first preparation after a terminal successful selected build. No compiler/runtime starts."""
from pathlib import Path
import hashlib,json,shutil
W=Path('/private/tmp/tube-shared-leaf-native-20261005');R=Path('/Users/regina/Desktop/Projects/surfing-game')
BUILD_ID='tube-shared-leaf-seek-history-20261005'
SOURCES=('src/wave/barrel/ProfileLibrary.ts','src/wave/barrel/boundedCProfile.ts','src/wave/barrel/sweptLoft.ts','src/wave/barrel/lipSheet.ts',
 'src/scene/barrel/SweptBarrelMesh.ts','src/scene/barrel/barrelMaskGlsl.ts','src/scene/barrel/SweptBarrel.ts','src/scene/barrel/barrelWater.ts',
 'src/wave/barrel/boundedCLeafReach.test.ts','src/wave/barrel/boundedCCapRefinement.test.ts','src/wave/barrel/boundedCConsumers.test.ts')
HELPERS=('README.md','inputs.json','prepare.py','run.py','native.mjs','geometry-inspection.mjs','measure.py','recipe.patch',
 'preparation-freeze.json','root-owner-audit.patch','root-application-build.log')
def pin(p):
 b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def verify(s):
 b=Path(s['file']).read_bytes();assert len(b)==s['bytes'] and hashlib.sha256(b).hexdigest()==s['sha256'],s['file'];return b
assert not any((W/n).exists()for n in('dist','source','build.json','source-freeze.json','seal.json','prepare-result.json','owner.json','candidate-first')),'First-only root preparation'
i=json.loads((W/'inputs.json').read_bytes());assert i['applicationBuildId']==BUILD_ID and json.loads((R/'dist/build.json').read_bytes())['build']==BUILD_ID
references=[i[k]for k in('referenceReport','referenceOwner','referenceLoft','referenceBuild','referenceSeal','referenceSourceFreeze')]+i['authoredAuthority']+i['opticalAuthority']
for s in references+i['borrowedHelperPins']:verify(s)
for pkey in ('referenceOwner',):
 o=json.loads(verify(i[pkey]));assert o['complete'] and o['exitCode']==0 and o['protectedPreserved'] and o['postExecutionPinsVerified'] and all(o['closedPorts'].values())
r=json.loads(verify(i['referenceReport']));assert r['complete'] and r['firstFailure'] is None and r['stepCount']==0
for family in ('authoredAuthority','opticalAuthority'):
 authority={Path(s['file']).name:json.loads(verify(s))for s in i[family]};assert authority['owner.json']['complete'] and authority['owner.json']['exitCode']==0 and authority['report.json']['complete'] and authority['report.json']['firstFailure'] is None
live=[pin(R/p)for p in SOURCES];shutil.copytree(R/'dist',W/'dist');assert json.loads((W/'dist/build.json').read_bytes())['build']==BUILD_ID
frozen=[]
for p,s in zip(SOURCES,live):
 q=W/'source'/p;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(verify(s));frozen.append(pin(q))
for s in live:verify(s)
freeze={'schema':'shared-leaf-source-freeze/v1','complete':True,'buildId':BUILD_ID,'files':[{'relative':p,'live':a,'frozen':b}for p,a,b in zip(SOURCES,live,frozen)],'scope':'Selected source bytes and root-built assets; root command evidence must independently establish terminal successful compilation.'}
(W/'source-freeze.json').write_text(json.dumps(freeze,indent=2)+'\n')
b={'schema':'shared-leaf-build/v1','build':BUILD_ID,'assets':[pin(p)for p in sorted((W/'dist').rglob('*'))if p.is_file()],'sources':frozen,'liveSources':live,'sourceFreeze':pin(W/'source-freeze.json'),'operation':'Copy exact root-built dist only; no build or runtime invocation.'}
(W/'build.json').write_text(json.dumps(b,indent=2)+'\n')
s={'schema':'shared-leaf-seal/v1','rootAuthorized':True,'complete':True,'applicationBuild':pin(W/'build.json'),'sourceFreeze':pin(W/'source-freeze.json'),'helpers':[pin(W/n)for n in HELPERS],'borrowedHelpers':i['borrowedHelperPins'],'references':references,'limits':i['limits'],'comparison':i['comparison']}
(W/'seal.json').write_text(json.dumps(s,indent=2)+'\n')
result={'schema':'shared-leaf-preparation/v1','complete':True,'build':pin(W/'build.json'),'sourceFreeze':pin(W/'source-freeze.json'),'seal':pin(W/'seal.json'),'resourcesStarted':False,'portsProbed':False,'executedChecksOrBuilds':False}
(W/'prepare-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
