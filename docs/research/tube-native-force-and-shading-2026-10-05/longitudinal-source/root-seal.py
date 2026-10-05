from pathlib import Path
import json,hashlib
W=Path('/private/tmp/tube-landing-longitudinal-native-20261005')
def pin(p):
 p=Path(p);b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def verify(p):
 q=pin(p['file']);assert all(q[k]==p[k] for k in ('file','bytes','sha256')),p['file']
 return json.loads(Path(p['file']).read_text())
h=json.loads((W/'seal-handoff.json').read_text());s=verify(h['inheritSealHistoryFieldsFromV11'])
r=verify(h['helperReadiness']);hp=verify(h['helperPinsManifest']);b=verify(r['rootCompleteBuild']);d=verify(r['rootDiagnosticBuild'])
assert len(hp['pins'])==48 and len(b['sourcePins'])==587 and len(b['assetPins'])==49 and len(d['inputs'])==74
for p in hp['pins']+b['sourcePins']+b['assetPins']+d['inputs']:verify(p) if p['file'].endswith('.json') and False else None
s['schema']=h['newSealSchema'];s['complete']=True
s['rootPurpose']='Prospective counterfactual of landing longitudinal compliance after controlled fixture passes: change only AttachedRider.ts, retain actual V11 scene, seed, ordinary pop-up cue, controls, camera, phases, unilateral contact and stop. Test native standing and support beyond landing; controlled positive-axial witness is not the native cause. No visual, body-passage, FPS or production acceptance.'
s['helperReadiness']=h['helperReadiness'];s['helperPinsManifest']=h['helperPinsManifest'];s['helperPins']=hp['pins']
s['rootCompleteBuild']=r['rootCompleteBuild'];s['rootDiagnosticBuild']=r['rootDiagnosticBuild'];s['diagnosticModule']=r['diagnosticModule'];s['diagnosticModuleReferencePolicy']=h['diagnosticModuleReferencePolicy']
s['arms']={'candidate':{'rootAuthorized':True,'source':b['source'],'dist':b['frozenDist'],'buildId':b['buildId'],'sourcePins':b['sourcePins'],'assetPins':b['assetPins'],'rootBuildManifest':r['rootCompleteBuild']}}
s.update(h['addRequiredSealFields']);s['sourceDelta']=pin(W/'source-delta.json');s['sourcePinsManifest']=pin(W/'source-pins.json');s['sourceContractCheck']=pin(W/'source-helper-checks.json')
s['priorV11Seal']=h['inheritSealHistoryFieldsFromV11'];s['finiteOwner']=r['finiteOwner'];s['movieCapBehavior']=r['movieCapBehavior']
s['ordinaryRun']['purpose']='Actual native counterfactual of prospective landing compliance, with unchanged V11 ordinary replay.'
s['literalOperandListCopy']=h['literalOperandListCopy'];s['productionAdoption']='No compliance candidate or rejected shader adopted. Existing bounded tube geometry and landing frame correction remain committed.'
s['actualNewNativePending']=True
s['candidateAcceptance']={'controlledFixturePass':True,'nativeCauseOrFixAccepted':False,'ordinaryStandingAccepted':False,'bodyPassageAccepted':False,'visualAcceptance':False,'productionAdoption':False}
# Every pin retained by the new seal must still match its actual bytes.
count=[0]
def walk(x):
 if isinstance(x,dict):
  if all(k in x for k in ('file','bytes','sha256')):
   p=pin(x['file']);assert p['bytes']==x['bytes'] and p['sha256']==x['sha256'],x['file'];count[0]+=1
  for v in x.values():walk(v)
 elif isinstance(x,list):
  for v in x:walk(v)
walk(s)
assert not (W/'seal.json').exists()
(W/'seal.json').write_text(json.dumps(s,indent=2)+'\n')
print(json.dumps({'seal':pin(W/'seal.json'),'verifiedPins':count[0],'applicationSources':len(b['sourcePins']),'assets':len(b['assetPins']),'helpers':len(hp['pins'])}))
