from pathlib import Path
import hashlib,json,shutil
W=Path(__file__).resolve().parent;S=W/'source'
C=Path('/private/tmp/tube-native-trial-balance-observer-20261005')
P=Path('/private/tmp/tube-pop-up-contact-operands-native-v8-20261005')
B=Path('/private/tmp/tube-native-trial-balance-build-20261005')
def pin(p):
 p=Path(p);b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def save(p,x):
 assert not p.exists(),p;p.write_text(json.dumps(x,indent=2)+'\n')
def relpin(p,r):
 q=pin(p);return {'path':r,'bytes':q['bytes'],'sha256':q['sha256']}
base=json.loads((W/'root-base-copy.json').read_text());assert base['sourceCount']==588
assert all(relpin(S/q['path'],q['path'])==q for q in base['pins'])
cpu=C/'root-bounded-graph-checks/result.json';proof=json.loads(cpu.read_text());assert proof['complete'] and proof['sourcePostUnchanged']
assert proof['checks'][1]['passed']==proof['checks'][1]['total']==2
for q in proof['sourceInputs']+proof['oracleInputs']+proof['checkInputs']:assert pin(q['file'])==q,q['file']
ready=json.loads((C/'readiness.json').read_text());q=ready['sourceOverride'];r='src/physics/AttachedRider.ts'
assert pin(q['path'])=={'file':q['path'],'bytes':q['bytes'],'sha256':q['sha256']}
before=relpin(S/r,r);assert before['sha256']=='d6d54aa4f6e20ff7ffcebc39450957b7a81ec26cf14886edec7882d8ecae7b31'
shutil.copyfile(q['path'],S/r);after=relpin(S/r,r)
rows=[relpin(S/q['path'],q['path']) for q in base['pins']];assert sum(a!=b for a,b in zip(rows,base['pins']))==1
save(W/'source-pins.json',{'schema':'trial-balance-source-pins/v1','count':588,'pins':rows})
save(W/'source-delta.json',{'schema':'trial-balance-source-delta/v1','source':str(S),'sourceCount':588,'unchangedParentInputs':587,'parentManifest':pin(P/'source-manifest.json'),'overrides':[{'path':r,'before':before,'after':after}],'onlyPhysicsDifference':'Passive numeric copies of prepared board matrix/RHS, arms/external force and coupled trial delta; solver arithmetic unchanged.'})
fields=json.loads((C/'observer-fields.json').read_text());assert len(fields['allFields'])==102
save(W/'source-readiness.json',{'schema':'trial-balance-source-readiness/v1','complete':True,'frozen':True,'sourceDirectory':str(S),'sourceCount':588,'applicationSourceCount':587,'unchangedParentInputs':587,'runtimeChangedPaths':[r],'parentManifest':pin(P/'source-manifest.json'),'sourcePinsManifest':pin(W/'source-pins.json'),'sourceDelta':pin(W/'source-delta.json'),'candidatePreparation':pin(C/'readiness.json'),'candidateRuntime':pin(S/r),'candidatePatch':pin(C/'observer.patch'),'observerFields':pin(C/'observer-fields.json'),'rootCPUResult':pin(cpu),'rootObserverChecks':pin(cpu),'rootBaseCopy':pin(W/'root-base-copy.json'),'buildId':'tube-native-trial-balance-20261005','resourcesStarted':False,'applicationBuildPerformed':False,'diagnosticBuildPerformed':False,'nativeRun':False,'nativeCauseOrFixAccepted':False,'ordinaryStandingAccepted':False,'bodyPassageAccepted':False,'productionAdoption':False})
B.mkdir(exist_ok=True);extra='docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json'
app=[pin(S/q['path']) for q in rows if q['path']!=extra];assert len(app)==587
save(B/'root-prebuild.json',{'schema':'trial-balance-root-prebuild/v1','source':str(S),'buildId':'tube-native-trial-balance-20261005','preparationSourcePins':588,'excludedPreparationInputs':[extra],'sourcePins':app,'readiness':pin(W/'source-readiness.json'),'actualRootCPU':pin(cpu)})
print(json.dumps({'complete':True,'readiness':pin(W/'source-readiness.json'),'sourcePins':pin(W/'source-pins.json'),'sourceDelta':pin(W/'source-delta.json'),'prebuild':pin(B/'root-prebuild.json')}))
