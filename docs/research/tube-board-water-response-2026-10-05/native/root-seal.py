from pathlib import Path
import json,hashlib
W=Path(__file__).resolve().parent
def pin(p):
 p=Path(p);b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def read(q):
 assert pin(q['file'])==q,q['file'];return json.loads(Path(q['file']).read_text())
h=json.loads((W/'seal-handoff.json').read_text());s=read(h['inheritHistoryFromImmediate102Seal']);r=read(h['helperReadiness']);hp=read(h['helperPinsManifest']);b=read(r['rootCompleteBuild']);d=read(r['rootDiagnosticBuild'])
assert r['complete'] and r['frozen'] and r['helperAcceptance'] and len(hp['pins'])>=86 and len(b['sourcePins'])==587 and len(b['assetPins'])==49 and len(d['inputs'])==74
s.update(schema='board-rhs-components-root-seal/v1',complete=True,rootPurpose='Capture eight board RHS aggregate channels at the retained ordinary102 landing failure. Only passive numeric copies change;552step full-state/stage/water-query/reaction/detachment parity passed. Combined water impulse remains radiation/entrainment mixed; native attribution and gameplay/tube quality remain pending.')
s.update(helperReadiness=h['helperReadiness'],helperPinsManifest=h['helperPinsManifest'],helperPins=hp['pins'],rootCompleteBuild=r['rootCompleteBuild'],rootDiagnosticBuild=r['rootDiagnosticBuild'],diagnosticModule=r['diagnosticModule'],diagnosticModuleReferencePolicy=h['diagnosticModuleReferencePolicy'])
s['arms']={'candidate':{'rootAuthorized':True,'source':b['source'],'dist':b['frozenDist'],'buildId':b['buildId'],'sourcePins':b['sourcePins'],'assetPins':b['assetPins'],'rootBuildManifest':r['rootCompleteBuild']}}
s.update(h['addRequiredSealFields']);s.update(sourceDelta=pin(W/'source-delta.json'),sourcePinsManifest=pin(W/'source-pins.json'),sourceContractCheck=pin(W/'source-helper-checks.json'),priorTrialBalanceSeal=h['inheritHistoryFromImmediate102Seal'],finiteOwner=r['finiteOwner'],movieCapBehavior=r['movieCapBehavior'],literalOperandMetadataCopy=h['literalOperandMetadataCopy'],rootHelperChecks=r['rootHelperChecks'])
s.pop('literalOperandListCopy',None)
s['ordinaryRun']['purpose']='One ordinary immediate102 replay with passive143scalar diagnostic capture; eight-channel force attribution remains pending.'
s['actualNewNativePending']=True;s['candidateAcceptance']={'observerFixturePass':True,'nativeCausalExplanationAccepted':False,'nativeCauseOrFixAccepted':False,'ordinaryStandingAccepted':False,'bodyPassageAccepted':False,'visualAcceptance':False,'productionAdoption':False}
s['productionAdoption']='Observer, rejected compliance/shaders and unverified two-branch geometry remain isolated; current production runtime unchanged.'
count=[0]
def walk(x):
 if isinstance(x,dict):
  if all(k in x for k in ('file','bytes','sha256')):
   q=pin(x['file']);assert q['bytes']==x['bytes'] and q['sha256']==x['sha256'],x['file'];count[0]+=1
  for v in x.values():walk(v)
 elif isinstance(x,list):
  for v in x:walk(v)
walk(s);assert not (W/'seal.json').exists();(W/'seal.json').write_text(json.dumps(s,indent=2)+'\n')
print(json.dumps({'seal':pin(W/'seal.json'),'verifiedPins':count[0],'sources':587,'assets':49,'helpers':len(hp['pins'])}))
