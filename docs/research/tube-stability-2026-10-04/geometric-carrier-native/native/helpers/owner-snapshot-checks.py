"""Synthetic bounded sidecar/inventory fixtures, no game/native resources."""
from pathlib import Path
import base64,copy,hashlib,importlib.util,json,sys
sys.dont_write_bytecode=True
W=Path(__file__).resolve().parent;OUT=W/'snapshot-owner-fixture';OUT.mkdir(exist_ok=True)
spec=importlib.util.spec_from_file_location('carrier_owner',W/'run.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def full(label,step):
 arrays={};counts={'slices':2,'vertices':268,'indices':3}
 for key,multiple in {'positions':3,'normals':3,'mask':1,'lift':1,'sheet':1,'sheetWeight':1,'sheetBack':1,'throat':4,'indices':0,'sliceRayX':0,'sliceRayZ':0,'sliceJoined':0,'slicePhase':0,'sliceFront':0}.items():
  dtype='Uint32Array' if key=='indices' else 'Uint8Array' if key in ('sliceJoined','slicePhase') else 'Int32Array' if key=='sliceFront' else 'Float32Array';count=multiple*268 if multiple else 3 if key=='indices' else 2;size=1 if dtype=='Uint8Array' else 4;data=bytes(size*count)
  arrays[key]={'dtype':dtype,'littleEndian':True,'count':count,'byteLength':len(data),'encoding':'base64-exact-active-typed-array-words','data':base64.b64encode(data).decode()}
 return {'schema':'bounded-C-complete-drawn-loft-words/v1','available':True,'label':label,'epoch':{'step':step,'movingStep':step,'seaTime':100+step/60,'surfaceRevision':step},'counts':counts,'rawBytes':sum(a['byteLength'] for a in arrays.values()),'arrays':arrays,'positionSpace':'world-coordinate-loft-input','normalsMeaning':'loft vertex normals supplied to draw mesh; no fragment or G-buffer attribution','unusedCapacityIncluded':False,'arrayIdentitiesAndWordsUnchanged':True,'geometryOrCameraSearch':False,'perFragmentOwnershipOrVisibilityClaim':False,'openingOrBodyPassageClaim':False,'nonmutation':{k:True for k in ('snapshotClockStatusWordsUnchanged','normalAndDiagnosticCameraUnchanged','normalActorControlsAndMeshUnchanged','allActiveLoftWordsUnchanged','drawnSurfaceWordsAndEpochUnchanged','drawGenerationUnchanged')}}
def write(f):
 name='loft-'+f['label']+'.json';b=(json.dumps(f,separators=(',',':'))+'\n').encode();(OUT/name).write_bytes(b)
 return {'file':name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),**{k:f[k] for k in ('schema','label','epoch','counts','rawBytes','nonmutation','arrayIdentitiesAndWordsUnchanged','unusedCapacityIncluded','normalsMeaning','perFragmentOwnershipOrVisibilityClaim')},'arrayManifest':{k:{n:v for n,v in a.items() if n!='data'} for k,a in f['arrays'].items()}}
def report():
 snaps=[write(full('initial',0)),write(full('first-phase2',2))];cs=[]
 for s in snaps:cs.append({'label':s['label'],'loftSnapshot':s,'observation':{'step':s['epoch']['step'],'movingStep':s['epoch']['movingStep'],'seaTime':s['epoch']['seaTime'],'drawEpoch':{'surfaceRevisionAfter':s['epoch']['surfaceRevision']}}})
 cs.append({'label':'initial-exterior'});cs.append({'label':'terminal'})
 return {'loftSnapshots':snaps,'snapshotBytes':sum(s['bytes'] for s in snaps),'checkpoints':cs,'firstObservedPhase2':{'movingStep':2},'artifacts':[{'file':n+'.png'} for n in ('initial','initial-exterior','first-phase2','terminal')]+[{'file':'moving-C.webm'}]}
groups=[];r=report();assert m.validate_loft_snapshots(r,OUT);groups.append('two exact complete word snapshots and separate4PNG+movie inventory accepted')
for mutation in ('hash','countCap','bytesCap','totalCap','epoch','inventory','arrayCount','normalDtype','claim','nonmutation','unexpectedPhase'):
 r=report();s=r['loftSnapshots'][0]
 if mutation=='hash':s['sha256']='0'*64
 if mutation=='countCap':r['loftSnapshots'].append(copy.deepcopy(s))
 if mutation=='bytesCap':s['bytes']=6*1024*1024+1
 if mutation=='totalCap':r['snapshotBytes']=12*1024*1024+1
 if mutation=='epoch':r['checkpoints'][0]['observation']['movingStep']=1
 if mutation=='inventory':r['artifacts'].append({'file':'loft-initial.json'})
 if mutation in ('arrayCount','normalDtype','claim','nonmutation'):
  f=full('initial',0)
  if mutation=='arrayCount':f['counts']['vertices']-=1
  if mutation=='normalDtype':f['arrays']['normals']['dtype']='Uint32Array'
  if mutation=='claim':f['perFragmentOwnershipOrVisibilityClaim']=True
  if mutation=='nonmutation':f['nonmutation']['normalAndDiagnosticCameraUnchanged']=False
  s=write(f);r['loftSnapshots'][0]=s;r['checkpoints'][0]['loftSnapshot']=s;r['snapshotBytes']=sum(s['bytes'] for s in r['loftSnapshots'])
 if mutation=='unexpectedPhase':r['firstObservedPhase2']=None
 try:m.validate_loft_snapshots(r,OUT)
 except (AssertionError,KeyError):groups.append(mutation+' rejected')
 else:raise AssertionError('Accepted '+mutation)
r=report();r['loftSnapshots'][1]={'label':'first-phase2','available':False,'optionalSnapshotUnavailable':True,'reason':'source normals unavailable'};r['checkpoints'][1]['loftSnapshot']=r['loftSnapshots'][1];r['snapshotBytes']=r['loftSnapshots'][0]['bytes'];assert m.validate_loft_snapshots(r,OUT);groups.append('actual encountered phase2 optional normals absence explicitly recorded without fake words')
r=report();r['loftSnapshots']=r['loftSnapshots'][:1];r['firstObservedPhase2']=None;r['checkpoints']=[c for c in r['checkpoints'] if c['label']!='first-phase2'];r['artifacts']=[a for a in r['artifacts'] if a['file']!='first-phase2.png'];r['snapshotBytes']=r['loftSnapshots'][0]['bytes'];assert m.validate_loft_snapshots(r,OUT);groups.append('phase2 never encountered requires only initial snapshot, no forced phase/search')
result={'schema':'bounded-C-carrier-support-owner-snapshot-fixtures/v1','complete':True,'mockOnly':True,'resourcesStarted':False,'portsProbed':False,'groupCount':len(groups),'groups':groups,'nativeGeometryOrQualityProven':False};(W/'owner-snapshot-checks.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
