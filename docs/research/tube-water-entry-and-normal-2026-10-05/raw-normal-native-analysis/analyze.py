from pathlib import Path
import hashlib,json

W=Path('/private/tmp/tube-board-raw-normal-native-20261005')
P=Path('/private/tmp/tube-board-rhs-components-native-20261005')
A=Path(__file__).resolve().parent
OUT=A/'result.json';assert not OUT.exists()
def pin(p):
 p=Path(p);b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
paths=[W/'candidate-first-owner.json',W/'candidate-first/report.json',P/'candidate-first/report.json',W/'seal.json',W/'root-complete-build-result.json',W/'root-diagnostic-build-result.json',Path(__file__)]
inputs=[pin(p)for p in paths]
owner=json.loads(paths[0].read_text());q=json.loads(paths[1].read_text());p=json.loads(paths[2].read_text())
assert owner['complete']and owner['exitCode']==0 and owner['firstFailure']is None and owner['sourceBuildHelpersPostUnchanged']
assert owner['independentClosureValid']and owner['protectedPortsPreserved']and owner['elapsedSeconds']<=660 and owner['cleanupElapsedSeconds']<=7
assert q['complete']and q['firstFailure']is None and q['chromeClosed']and not q['browserErrors']
for k in ['settings','overrides','expectedConfig','schedule','stop','firstPopUp','firstLanding','entry']:
 assert q[k]==p[k],k
assert q['initial']['config']==p['initial']['config']
assert len(q['steps'])==len(p['steps'])==1366
assert all(a['input']==b['input']for a,b in zip(q['steps'],p['steps']))
assert all((a['step'],a['seaTime'],a['physicalSeconds'],a['ride']['phase'],a['ride']['resets'],a['separation'])==(b['step'],b['seaTime'],b['physicalSeconds'],b['ride']['phase'],b['ride']['resets'],b['separation'])for a,b in zip(q['steps'],p['steps']))
stats={}
def compare(a,b,path,summary,step):
 assert type(a)==type(b),(path,type(a),type(b))
 if isinstance(a,dict):
  assert set(a)==set(b),path
  for k in a:compare(a[k],b[k],path+'.'+k,summary,step)
 elif isinstance(a,list):
  assert len(a)==len(b),path
  for i,(x,y)in enumerate(zip(a,b)):compare(x,y,path+f'[{i}]',summary,step)
 elif isinstance(a,(int,float))and not isinstance(a,bool):
  d=abs(a-b)
  if d:
   summary['differentWords']+=1;summary['firstDifferenceStep']=summary['firstDifferenceStep']or step
   if d>summary['maxAbsoluteDelta']:summary.update(maxAbsoluteDelta=d,maxDeltaStep=step,maxDeltaPath=path)
 else:assert a==b,path
for name in ['boardPose','riderPoints','riderWords','displayedBoard','displayedRiderPoints']:
 s={'differentWords':0,'firstDifferenceStep':None,'maxAbsoluteDelta':0,'maxDeltaStep':None,'maxDeltaPath':None}
 for a,b in zip(q['steps'],p['steps']):compare(a[name],b[name],name,s,a['step'])
 stats[name]=s
lofts=[]
for a,b in zip(q['loftSnapshots'],p['loftSnapshots']):
 assert a['label']==b['label']
 ap=W/'candidate-first'/a['file'];bp=P/'candidate-first'/b['file'];inputs.extend([pin(ap),pin(bp)])
 x=json.loads(ap.read_text());y=json.loads(bp.read_text())
 equal={k:x[k]==y[k]for k in ['arrays','counts','rawFrontPacket','positionSpace','normalsMeaning','nonmutation']}
 lofts.append({'label':a['label'],'comparison':equal})
assert len(lofts)==4
assert all(pin(x['file'])==x for x in inputs)
result={'schema':'board-raw-normal-root-native-analysis/v1','complete':True,'same1366StepPhaseInputClockAndStopChronology':True,'initialConfigAndControlsExact':True,'bodyWordDifferences':stats,'drawnLoftComparisons':lofts,'stop':q['stop'],'entry':q['entry'],'rootNativeOwnerSeconds':owner['elapsedSeconds'],'inputs':inputs,'limitations':['This known-failure replay still falls before standing; the direction correction is not a fix for this landing or evidence of tube entry.','The control overlay bypasses production pilot positioning/wait/take-off aiming.','Folded-direction validity is established by separate controlled regressions; natural tube gameplay is still unverified.']}
OUT.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items()if k!='inputs'}))
