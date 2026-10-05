"""Root-only future freeze; pending build authority deliberately prevents preparation now."""
from pathlib import Path
import hashlib,json,shutil
W=Path('/private/tmp/tube-guided-ordinary-v4-telemetry-native-20261005');R=Path('/Users/regina/Desktop/Projects/surfing-game')
def pin(path):
 raw=path.read_bytes();return {'file':str(path),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
def verify(spec):
 raw=Path(spec['file']).read_bytes();assert len(raw)==spec['bytes']and hashlib.sha256(raw).hexdigest()==spec['sha256'],spec['file'];return raw
assert not any((W/name).exists()for name in('dist','source-freeze.json','build.json','seal.json','prepare-result.json','owner.json','candidate-first'))
inputs=json.loads((W/'inputs.json').read_text());assert inputs['pilot']['style']=='tube'and inputs['limits']['steps']==3000
recipe=json.loads((W/'recipe-source-freeze.json').read_text());assert recipe['sourceOnly']and not recipe['candidateRuntimeExecuted']
for spec in recipe['files']:verify(spec)
authority=json.loads(Path(inputs['rootBuildAuthority']['file']).read_text())
assert authority['schema']=='guided-ordinary-root-build-authority/v4'and authority['complete']and authority['buildId']==inputs['buildId']
assert authority['applicationTerminalExitCode']==0 and authority['diagnosticTerminalExitCode']==0
assert authority['rootVerifiedNewProductionBuild']and authority['rootVerifiedNewDiagnosticBuild']
applicationLog=authority['applicationBuildLog'];diagnosticLog=authority['diagnosticBuildLog'];verify(applicationLog);verify(diagnosticLog)
assert applicationLog['file']==inputs['applicationBuildLog']['file']
assert json.loads((R/'dist/build.json').read_text())['build']==inputs['buildId'],'Root must finish the fresh NEW successful production build first'
applicationAssets=[pin(p)for p in sorted((R/'dist').rglob('*'))if p.is_file()]
assert applicationAssets==authority['applicationBuildAssets'],'Root terminal-build asset receipt must equal every current dist asset'
diagnostic=json.loads((W/'diagnostic-build.json').read_text());assert diagnostic['schema']=='guided-ordinary-diagnostic-build/v4'and diagnostic['complete']and diagnostic['buildId']==inputs['buildId']and not diagnostic['copiedHistoricalModule']
for spec in diagnostic['compiledSources']+[diagnostic['entry'],diagnostic['module'],diagnostic['compiler']]:verify(spec)
sources=[pin(R/path)for path in inputs['productionSources']]
verify(inputs['protectedIdentityReference'])
for key in('owner','report','trace','rootPostFailurePins'):verify(inputs['priorObservation'][key])
shutil.copytree(R/'dist',W/'dist');assets=[pin(p)for p in sorted((W/'dist').rglob('*'))if p.is_file()]
original={str(Path(spec['file']).relative_to(R/'dist')):(spec['bytes'],spec['sha256'])for spec in applicationAssets}
copied={str(Path(spec['file']).relative_to(W/'dist')):(spec['bytes'],spec['sha256'])for spec in assets};assert copied==original
for spec in sources+applicationAssets+[applicationLog,diagnosticLog]:verify(spec)
freeze={'schema':'guided-ordinary-source-freeze/v4','complete':True,'build':inputs['buildId'],'productionSources':sources,'diagnosticCompiledSources':diagnostic['compiledSources'],
 'rootBuildAuthority':pin(W/'root-build-authority.json'),'freezeTiming':'After root-recorded terminal successful NEW production and diagnostic builds',
 'scope':'Exact source/new compilation/build pins. No ride acceptance.'}
(W/'source-freeze.json').write_text(json.dumps(freeze,indent=2)+'\n')
build={'schema':'guided-ordinary-build/v4','build':inputs['buildId'],'complete':True,'assets':assets,'productionSources':sources,
 'diagnosticCompiledSources':diagnostic['compiledSources'],'applicationBuildLog':applicationLog,'diagnosticBuildLog':diagnosticLog,
 'applicationBuildAssets':applicationAssets,'sourceFreeze':pin(W/'source-freeze.json'),'rootBuildAuthority':pin(W/'root-build-authority.json'),
 'priorObservation':inputs['priorObservation'],'operation':'Exact fresh root-built assets copy; no rebuild or production mutation by preparer'}
(W/'build.json').write_text(json.dumps(build,indent=2)+'\n')
helpers=tuple(Path(spec['file']).name for spec in recipe['files'])+('recipe-source-freeze.json','root-build-authority.json')
borrowed=[Path('/private/tmp/tube-stable-x-ordinary-rider-v4-20261005')/name for name in('native-owned.mjs','cdp.mjs','menu-startup.mjs','follower-camera.mjs')]
references=[inputs['protectedIdentityReference']]+[inputs['priorObservation'][key]for key in('owner','report','trace','rootPostFailurePins')]
seal={'schema':'guided-ordinary-seal/v4','rootAuthorized':True,'complete':True,'buildId':inputs['buildId'],'limits':inputs['limits'],
 'applicationBuild':pin(W/'build.json'),'sourceFreeze':pin(W/'source-freeze.json'),'diagnosticBuild':pin(W/'diagnostic-build.json'),'diagnosticModule':diagnostic['module'],
 'priorObservation':inputs['priorObservation'],'helpers':[pin(W/name)for name in helpers],'borrowedHelpers':[pin(p)for p in borrowed],'references':references}
(W/'seal.json').write_text(json.dumps(seal,indent=2)+'\n')
result={'schema':'guided-ordinary-preparation-result/v4','complete':True,'build':pin(W/'build.json'),'sourceFreeze':pin(W/'source-freeze.json'),'seal':pin(W/'seal.json'),
 'resourcesStarted':False,'portsProbed':False,'executedTestsOrBuilds':False,'rootActualTerminalBuildAuthorityRequired':True}
(W/'prepare-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
