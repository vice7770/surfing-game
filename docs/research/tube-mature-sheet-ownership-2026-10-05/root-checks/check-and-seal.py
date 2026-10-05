from pathlib import Path
import hashlib,json,subprocess,sys

W=Path('/private/tmp/tube-c-mature-region-native-20261005')
def pin(p):
    p=Path(p); b=p.read_bytes()
    return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def save(p,obj):
    assert not p.exists(), 'Preserve prior root output '+str(p)
    p.write_text(json.dumps(obj,indent=2)+'\n')

sys.path.insert(0,str(W))
import authority
freeze,inputs=authority.preparation()
source_before=[pin(p['file']) for p in freeze['pins']]
assert source_before==freeze['pins']
assert not any((W/name).exists() for name in ['root-camera-syntax-checks.json','root-helper-checks.json','seal.json','root-helper-logs'])
logs=W/'root-helper-logs'; logs.mkdir()
approved=json.loads(Path(inputs['approvedCandidateSeal']['file']).read_text())
node=approved['environment']['node']['file']
def run(name,command):
    log=logs/(name+'.log')
    with log.open('xb') as output:
        result=subprocess.run(command,cwd=W,stdout=output,stderr=subprocess.STDOUT,timeout=60)
    assert result.returncode==0, name+' failed; preserve log'
    return {'run':True,'exitCode':result.returncode,'log':pin(log)}

syntax=[]
for name in ['mature-mouth.mjs','inspection-bridge.mjs']:
    syntax.append({'name':name,**run(name,[node,'--check',str(W/name)])})
assert [pin(p['file']) for p in freeze['pins']]==source_before
save(W/'root-camera-syntax-checks.json',{
    'schema':'c-mature-region-root-syntax-checks/v1','complete':True,
    'resourcesStarted':False,'portsProbed':False,'sourcePostUnchanged':True,
    'inputs':[pin(W/'mature-mouth.mjs'),pin(W/'inspection-bridge.mjs')],
    'checks':syntax,
})
checks={
    'nativeSyntax':run('native-syntax',[node,'--check',str(W/'native.mjs')]),
    'sourceOnlyOwner':run('source-only-owner',[sys.executable,str(W/'run.py'),'--arm','candidate']),
}
assert [pin(p['file']) for p in freeze['pins']]==source_before
save(W/'root-helper-checks.json',{
    'schema':'c-mature-region-native-root-helper-checks/v1','complete':True,
    'resourcesStarted':False,'portsProbed':False,'sourcePostUnchanged':True,
    'checks':checks,
})
seal={
    'schema':'c-mature-region-root-seal/v1','complete':True,'rootAuthorized':True,
    'limits':authority.LIMITS,'preparationInputs':pin(W/'inputs.json'),
    'preparationFreeze':pin(W/'source-freeze.json'),
    'helperPins':freeze['pins']+[pin(W/'source-freeze.json')],
    'helperReadiness':pin(W/'readiness.json'),
    'borrowedHelperPins':inputs['borrowedHelperPins'],
    'environment':approved['environment'],
    'rootCameraSyntaxChecks':pin(W/'root-camera-syntax-checks.json'),
    'rootHelperChecks':pin(W/'root-helper-checks.json'),
    'gameplayAcceptance':False,'tubePassageAcceptance':False,'visualAcceptance':False,
}
for key in ['approvedCandidateSeal','approvedApplicationBuild','approvedDiagnosticBuild','diagnosticModule','knownCReport','knownCOwner','approvedMatureSeal','approvedMatureReport','approvedMatureOwner','approvedMatureSidecar','matureParentSourceFreeze']:
    seal[key]=inputs[key]
save(W/'seal.json',seal)
authority.sealed('candidate')
print(json.dumps({'complete':True,'resourcesStarted':False,'portsProbed':False,
    'sourcePostUnchanged':True,'cameraSyntax':pin(W/'root-camera-syntax-checks.json'),
    'helperChecks':pin(W/'root-helper-checks.json'),'seal':pin(W/'seal.json')},indent=2))
