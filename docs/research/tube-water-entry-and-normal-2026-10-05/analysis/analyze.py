from pathlib import Path
import copy, hashlib, importlib.util, json, math, sys
sys.dont_write_bytecode=True

W=Path('/private/tmp/tube-board-water-patches-native-20261005')
P=Path('/private/tmp/tube-board-rhs-components-native-20261005')
C=Path('/private/tmp/tube-board-water-patches-observer-20261005')
A=Path(__file__).resolve().parent
O=A/'root-results'
NOISE=('.workerStepMs','.detector.elapsedMilliseconds','.detector.cumulativeMilliseconds','.cameraFollower.calls','.cameraFollower.zeroDtCalls','.cameraFollower.positiveDtCalls','.clocks.surfaceRevision')
def pin(p):
 p=Path(p);b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def save(name,value):
 path=O/name;assert not path.exists();path.write_text(json.dumps(value,indent=2,allow_nan=False)+'\n');return pin(path)
def v(s,p):return [s[p+a]for a in 'XYZ']
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def minus(a,b):return [x-y for x,y in zip(a,b)]
def plus(a,b):return [x+y for x,y in zip(a,b)]
def mul(a,k):return [x*k for x in a]
def close(actual,expected,label):
 bound=128*sys.float_info.epsilon*max(1,abs(actual),abs(expected))
 assert abs(actual-expected)<=bound,(label,actual,expected,bound)
 return abs(actual-expected)

assert not O.exists();O.mkdir()
metadata=json.loads((C/'observer-fields.json').read_text());old_fields=metadata['oldFields'];new_fields=set(metadata['newFields'])
cpu=json.loads((C/'root-checks/result.json').read_text());assert cpu['complete'] and cpu['sourcePostUnchanged']
owner=json.loads((W/'candidate-first-owner.json').read_text());assert owner['complete'] and owner['exitCode']==0 and owner['firstFailure']is None and owner['sourceBuildHelpersPostUnchanged']
report_path=W/'candidate-first/report.json';prior_path=P/'candidate-first/report.json'
report=json.loads(report_path.read_text());prior=json.loads(prior_path.read_text());assert report['complete'] and report['chromeClosed'] and not report['browserErrors']
inputs=[pin(__file__),pin(C/'observer-fields.json'),pin(C/'root-checks/result.json'),pin(W/'candidate-first-owner.json'),pin(report_path),pin(prior_path)]
observed=[];noise_differences=[]
def cleaned(x,path='$',candidate=False):
 if isinstance(x,list):return [cleaned(y,path+f'[{i}]',candidate)for i,y in enumerate(x)]
 if isinstance(x,dict):
  observer=all(k in x for k in old_fields)
  if candidate and observer:
   assert x['waterPatchCount']==48 and x['waterPatchScopeAvailable']in(0,1)
   valid=x['standingTrialAvailable']==1 and x['waterPatchScopeAvailable']==1
   payload=metadata['patchFields'];names=[n for patch in payload for n in patch['fields']]
   assert all((n in x)==valid for n in names),'qualified-only patch payload'
   assert all(isinstance(x[n],(int,float))and math.isfinite(x[n])for n in new_fields if n in x)
   observed.append({'path':path,'sample':x,'valid':valid})
  return {k:(0 if any((path+'.'+k).endswith(s)for s in NOISE)else cleaned(y,path+'.'+k,candidate))for k,y in x.items()if not(candidate and observer and k in new_fields)}
 return x
for key in ('steps','initialBody','settings','overrides','expectedConfig','schedule'):
 assert cleaned(report[key],'$.'+key,True)==cleaned(prior[key],'$.'+key),key+' exact old143 replay equality'
assert len(report['steps'])==len(prior['steps'])==1366
rows=[json.loads(line)for line in(W/'candidate-first/steps.ndjson').read_text().splitlines()];assert rows==report['steps'];inputs.append(pin(W/'candidate-first/steps.ndjson'))
assert len(report['checkpoints'])==len(prior['checkpoints'])==4
for now,old in zip(report['checkpoints'],prior['checkpoints']):
 for key in ('step','seaTime','camera','labels'):assert now[key]==old[key],('checkpoint',key)
loft_receipts=[]
for now,old in zip(report['loftSnapshots'],prior['loftSnapshots']):
 np=W/'candidate-first'/now['file'];op=P/'candidate-first'/old['file'];inputs.extend([pin(np),pin(op)])
 nf=json.loads(np.read_text());of=json.loads(op.read_text())
 for key in ('arrays','counts','rawFrontPacket','positionSpace','normalsMeaning','nonmutation'):assert nf[key]==of[key],('loft',now['label'],key)
 loft_receipts.append({'label':now['label'],'arrayCount':len(nf['arrays']),'allArrayAndRawFrontWordsExact':True,'epochRawDelta':nf['epoch']['surfaceRevision']-of['epoch']['surfaceRevision']})
assert len(loft_receipts)==4

records={}
for record in observed:
 if not record['valid']:continue
 s=record['sample'];key=(s['step'],s['substep'],s['phase'])
 if key in records:assert records[key]['raw']==s;records[key]['references'].append(record['path'])
 else:records[key]={'identity':list(key),'raw':s,'references':[record['path']]}
landing=[r for k,r in sorted(records.items())if k[2]=='landing'];assert len(landing)==46
balance_path=Path('/private/tmp/tube-board-rhs-components-actual-review-20261005/balance.py');inputs.append(pin(balance_path))
spec=importlib.util.spec_from_file_location('prior_balance',balance_path);balance=importlib.util.module_from_spec(spec);spec.loader.exec_module(balance)
closures=[];cache={}
for record in landing:
 s=record['raw'];h=s['boardPreStepSeconds'];assert h==s['seconds'] and h>0
 combined=[0.0]*6;radiation=[0.0]*6;entry=[0.0]*6;patches=[]
 for patch in metadata['patchFields']:
  k=patch['index'];p={a['suffix']:s[name]for a,name in zip(metadata['patchOperandArguments'],patch['fields'])}
  nu=v(p,'Nu');arm=v(p,'Arm');axis=nu+v(p,'ArmCrossNu');relative=v(p,'Relative');raw=v(p,'SampleNormal');hull=v(p,'Normal')
  close(dot(nu,nu),1,'nu unit');close(dot(raw,raw),1,'sample normal unit')
  for a,b in zip(balance.cross(arm,nu),axis[3:]):close(a,b,'arm cross nu')
  close(p['Projection'],abs(dot(hull,nu)),'projection')
  close(p['AddedMass'],p['AddedMassPerArea']*(p['WettedArea']+p['DeckWettedArea'])*p['Projection'],'added mass')
  close(p['EntrainedMass'],max(0,p['AddedMass']-p['OldAddedMass']),'entry mass')
  close(p['Radiation'],p['RadiationPerArea']*p['WettedArea']*p['Projection'],'radiation')
  close(p['IntoSurface'],dot(relative,nu),'relative normal speed')
  close(p['Push'],-(h*p['Radiation']+p['EntrainedMass'])*p['IntoSurface'],'push')
  close(p['Inertia'],h*p['Radiation']+p['AddedMass']+p['EntrainedMass'],'inertia')
  qr=mul(axis,-h*p['Radiation']*p['IntoSurface']);qe=mul(axis,-p['EntrainedMass']*p['IntoSurface'])
  combined=plus(combined,mul(axis,p['Push']));radiation=plus(radiation,qr);entry=plus(entry,qe)
  p.update(index=k,axis=axis,radiationRhs=qr,entryRhs=qe,rawNormalDotNu=dot(raw,nu),rawNormalAxisAngleDegrees=math.degrees(math.acos(min(1,abs(dot(raw,nu))))))
  patches.append(p)
 captured=v(s,'boardPreWaterImpulse')+v(s,'boardPreWaterTorqueImpulse')
 assert combined==captured,'48 patch source-order water aggregate exact'
 residual=[close(a,b,'radiation+entry aggregate')for a,b in zip(plus(radiation,entry),captured)]
 record['rhsClosure']=balance.rhs_groups(s);assert record['rhsClosure']['sourceOrderedExact']and record['rhsClosure']['groupSumClosed']
 reconstructed=balance.reconstruct(record,73)
 key=tuple(record['identity']);cache[key]={'record':record,'patches':patches,'radiationRhs':radiation,'entryRhs':entry,'fullMatrix':reconstructed['fullMatrix']}
 closures.append({'identity':record['identity'],'waterSourceOrderedExact':True,'splitResidual':residual,'radiationRhs':radiation,'entryRhs':entry,'maxActiveNormalAxisAngleDegrees':max([p['rawNormalAxisAngleDegrees']for p in patches if p['AddedMass']>0 or p['Radiation']>0]+[0]),'minActiveSampleNormalY':min([p['SampleNormalY']for p in patches if p['AddedMass']>0 or p['Radiation']>0]+[1])})

a=cache[(1356,32,'landing')];b=cache[(1357,1,'landing')];K=b['fullMatrix']
group_deltas={name:minus(b[name],a[name])for name in ('radiationRhs','entryRhs')}
responses={name:balance.solve(K,q+[0.0])[0]for name,q in group_deltas.items()}
patch_changes=[]
for p0,p1 in zip(a['patches'],b['patches']):
 assert p1['OldAddedMass']==p0['AddedMass'],'consecutive leaf added mass history continuity'
 q0=plus(p0['radiationRhs'],p0['entryRhs']);q1=plus(p1['radiationRhs'],p1['entryRhs']);delta=minus(q1,q0);response=balance.solve(K,delta+[0.0])[0]
 patch_changes.append({'index':p0['index'],'rhsDelta':delta,'chosenAfterInverseResponse':response,'legRateAllocation':response[6],'before':p0,'after':p1})
patch_changes.sort(key=lambda p:abs(p['legRateAllocation']),reverse=True)
expected=minus(v(b['record']['raw'],'boardPreWaterImpulse')+v(b['record']['raw'],'boardPreWaterTorqueImpulse'),v(a['record']['raw'],'boardPreWaterImpulse')+v(a['record']['raw'],'boardPreWaterTorqueImpulse'))
for actual,want in zip(plus(group_deltas['radiationRhs'],group_deltas['entryRhs']),expected):close(actual,want,'transition water RHS split')
aggregate_response=balance.solve(K,expected+[0.0])[0]
for actual,want in zip(plus(responses['radiationRhs'],responses['entryRhs']),aggregate_response):close(actual,want,'transition response closure')
artifacts={'closures':save('all46-patch-assembly-closures.json',closures),'transition':save('transition-water-patches.json',{'from':[1356,32],'to':[1357,1],'combinedWaterRhsDelta':expected,'splitDeltas':group_deltas,'chosenAfterInverseResponses':responses,'combinedWaterChosenAfterInverseResponse':aggregate_response,'patchesByAbsoluteLegRateAllocation':patch_changes,'method':'Exact source assembly and chosen after-state inverse algebra; not independent interventions or unique causation.'})}
assert all(pin(q['file'])==q for q in inputs),'input changed during analysis'
summary={'schema':'board-water-patches-root-analysis/v1','complete':True,'old143All1366StepsExact':True,'noiseSuffixes':list(NOISE),'new1922RemovedOnlyFromFullOld143Records':True,'all4LoftSnapshotsExact':loft_receipts,'availableLandingSamples':46,'all48PatchAssembliesClosed':True,'radiationLegRateAllocation':responses['radiationRhs'][6],'entryLegRateAllocation':responses['entryRhs'][6],'combinedWaterLegRateAllocation':aggregate_response[6],'dominantPatchIndices':[p['index']for p in patch_changes[:8]],'inputs':inputs,'artifacts':artifacts,'limitations':['Published/latch samples do not retain every leaf.','Coefficient/history/normal/flow changes are observed operands; an independent physics trial is still required.','The reduced7x7 neutral landing allocation is algebraic and retains the prior reconstruction assumptions.']}
save('analysis.json',summary);print(json.dumps(summary,allow_nan=False))
