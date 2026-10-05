"""Closest actual saved initial indexed barrel to captured normal rider; offline only."""
import base64, hashlib, json, math, struct
from pathlib import Path
ROOT=Path('/private/tmp/tube-bounded-c-carrier-support-native-20261004/candidate-first')
OUT=Path('/private/tmp/tube-carrier-rider-entry-audit-20261005')
def pin(p):
 b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def sub(a,b):return tuple(x-y for x,y in zip(a,b))
def add(a,b):return tuple(x+y for x,y in zip(a,b))
def mul(a,s):return tuple(x*s for x in a)
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def cross(a,b):return(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def norm(a):return math.sqrt(dot(a,a))
def seg(p,a,b):
 ab=sub(b,a);d=dot(ab,ab);t=min(1,max(0,dot(sub(p,a),ab)/d)) if d else 0
 q=add(a,mul(ab,t));return norm(sub(p,q)),q,t
def tri(p,a,b,c):
 ab,ac,ap=sub(b,a),sub(c,a),sub(p,a)
 if dot(cross(ab,ac),cross(ab,ac))<1e-24:
  candidates=[]
  for aa,bb,wa,wb in [(a,b,(1,0,0),(0,1,0)),(a,c,(1,0,0),(0,0,1)),(b,c,(0,1,0),(0,0,1))]:
   d,q,t=seg(p,aa,bb);candidates.append((d,q,add(mul(wa,1-t),mul(wb,t))))
  return min(candidates,key=lambda x:x[0])
 d1,d2=dot(ab,ap),dot(ac,ap)
 if d1<=0 and d2<=0:q=a;w=(1,0,0)
 else:
  bp=sub(p,b);d3,d4=dot(ab,bp),dot(ac,bp)
  if d3>=0 and d4<=d3:q=b;w=(0,1,0)
  else:
   vc=d1*d4-d3*d2
   if vc<=0 and d1>=0 and d3<=0:
    v=d1/(d1-d3);q=add(a,mul(ab,v));w=(1-v,v,0)
   else:
    cp=sub(p,c);d5,d6=dot(ab,cp),dot(ac,cp)
    if d6>=0 and d5<=d6:q=c;w=(0,0,1)
    else:
     vb=d5*d2-d1*d6
     if vb<=0 and d2>=0 and d6<=0:
      v=d2/(d2-d6);q=add(a,mul(ac,v));w=(1-v,0,v)
     else:
      va=d3*d6-d5*d4
      if va<=0 and d4-d3>=0 and d5-d6>=0:
       v=(d4-d3)/((d4-d3)+(d5-d6));q=add(b,mul(sub(c,b),v));w=(0,1-v,v)
      else:
       den=1/(va+vb+vc);v=vb*den;z=vc*den;q=add(a,add(mul(ab,v),mul(ac,z)));w=(1-v-z,v,z)
 return norm(sub(p,q)),q,w
def hull(points):
 p=sorted(set(points));turn=lambda a,b,c:(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
 halves=[]
 for order in [p,p[::-1]]:
  half=[]
  for q in order:
   while len(half)>=2 and turn(half[-2],half[-1],q)<=0:half.pop()
   half.append(q)
  halves.append(half[:-1])
 return halves[0]+halves[1]

report_pin=pin(ROOT/'report.json');r=json.loads((ROOT/'report.json').read_text());initial=r['observations'][0]
expected=next(s for s in r['loftSnapshots'] if s['label']=='initial');snapshot_pin=pin(ROOT/expected['file'])
assert all(snapshot_pin[k]==expected[k] for k in ['bytes','sha256'])
s=json.loads((ROOT/expected['file']).read_text());arrays={};types={'Float32Array':'f','Uint32Array':'I','Int32Array':'i','Uint8Array':'B'}
for k,a in s['arrays'].items():
 raw=base64.b64decode(a['data'],validate=True);assert len(raw)==a['byteLength'];arrays[k]=struct.unpack('<'+types[a['dtype']]*a['count'],raw)
p=arrays['positions'];indices=arrays['indices'];point=lambda i:tuple(p[3*i:3*i+3]);project=lambda a:(a[0],0,a[2])
assert s['counts']['vertices']==134*s['counts']['slices']
components=[];component_rows={};i=0
while i<s['counts']['slices']:
 first=i;front=arrays['sliceFront'][i]
 while i+1<s['counts']['slices'] and arrays['sliceJoined'][i]==1:
  assert arrays['sliceFront'][i+1]==front;i+=1
 component={'front':front,'firstRow':first,'lastRow':i}
 components.append(component)
 for row in range(first,i+1):component_rows[row]=component
 i+=1
names=['board-position','pelvis','torso','head','left-hand','right-hand','left-foot','right-foot']
points=[tuple(initial['boardPose'][:3])]+[tuple(initial['riderPoints'][3*i:3*i+3]) for i in range(7)]
footprint=hull([(v[0],v[2]) for v in points]);footprint3=[(x,0,z) for x,z in footprint]
nearest={name:{'xyz':None,'xz':None} for name in names};by_component={c['front']:None for c in components};fpbest=None;liftedbest=None
for off in range(0,len(indices),3):
 ids=indices[off:off+3];verts=[point(i) for i in ids];xz=[project(v) for v in verts];rows=[i//134 for i in ids];component=component_rows[rows[0]]
 assert all(component_rows[row]==component for row in rows)
 details={'triangle':off//3,'vertices':ids,'rows':rows,'contours':[i%134-3 for i in ids], 'component':component,
  'sliceWeight':[arrays['sliceWeight'][row] for row in sorted(set(rows))],'vertexLift':[arrays['lift'][i] for i in ids]}
 for name,pt in zip(names,points):
  for key,tpt,tverts in [('xyz',pt,verts),('xz',project(pt),xz)]:
   distance,q,w=tri(tpt,*tverts)
   if nearest[name][key] is None or distance<nearest[name][key]['distanceMeters']:
    nearest[name][key]={'distanceMeters':distance,'inputPoint':pt,'nearestPoint':q,'barycentric':w,**details}
  if name=='board-position':
   d,q,w=tri(pt,*verts);prior=by_component[component['front']]
   if prior is None or d<prior['distanceMeters']:by_component[component['front']]={'distanceMeters':d,'nearestPoint':q,**details}
   if any(v>0 for v in details['vertexLift']) and (liftedbest is None or d<liftedbest['distanceMeters']):
    liftedbest={'distanceMeters':d,'nearestPoint':q,'interpolatedLiftAtNearest':sum(ww*arrays['lift'][ii] for ww,ii in zip(w,ids)),**details}
 # Exact minimum between the convex hull of measured landmark XZ points and a projected indexed triangle.
 # Vertex-to-triangle and triangle-vertex-to-polygon cover containment; disjoint edge minima cover this convex case.
 for fpt in footprint3:
  d,q,w=tri(fpt,*xz)
  if fpbest is None or d<fpbest['distanceMeters']:fpbest={'distanceMeters':d,'footprintPoint':fpt,'barrelProjectedPoint':q,**details}
 for v in xz:
  for j in range(1,len(footprint3)-1):
   d,q,w=tri(v,footprint3[0],footprint3[j],footprint3[j+1])
   if fpbest is None or d<fpbest['distanceMeters']:fpbest={'distanceMeters':d,'footprintPoint':q,'barrelProjectedPoint':v,**details}

obs=r['observations'];first_cue=next((o for o in obs if o['ride']['cue']),None)
def takeoff(w):return w['valid'] and w['crestSpeed']>=3 and w['speedShoreward']>=max(.8*w['crestSpeed'],3) and w['faceFraction']>=.5 and min(2,1.1*max(0,w['faceHeight']))<=w['aheadOfCrest']<=min(4,2.2*max(0,w['faceHeight']))
first_window=next((o for o in obs if takeoff(o['ride']['wave'])),None)
nearest_crest=None
for row in range(s['counts']['slices']-1):
 if arrays['sliceJoined'][row]!=1:continue
 a,b=point(row*134+3+32),point((row+1)*134+3+32);d,q,t=seg(project(points[0]),project(a),project(b))
 if nearest_crest is None or d<nearest_crest['distanceMeters']:
  nearest_crest={'distanceMeters':d,'nearestProjectedCrest':q,'segmentFraction':t,'rows':[row,row+1],'component':component_rows[row]}
source=Path(r['seal']['source']);manifest={p['file']:p for p in r['seal']['sourcePins']}
source_pins=[]
for rel in ['src/wave/SurfZoneRunner.ts','src/wave/SurfZoneSimulation.ts','src/wave/warmStart.ts',
 'src/physics/waveFrame.ts','src/physics/takeOffCue.ts','src/physics/AttachedRider.ts',
 'src/physics/RideSession.ts','src/physics/BoardBody.ts','src/game/PhysicalMode.ts',
 'src/game/SurfZoneWorkerCore.ts','src/game/pocketReflex.ts','src/wave/barrel/sweptLoft.ts']:
 path=source/rel;actual=pin(path);expected_source=manifest[str(path)]
 assert all(actual[k]==expected_source[k] for k in ['bytes','sha256']);source_pins.append(actual)
summary={'schema':'saved-new-C-normal-rider-entry-audit/v1','pins':{'captureReport':report_pin,'initialSidecarVerified':snapshot_pin},
 'epoch':s['epoch'],'normalInitialBoardPose':initial['boardPose'],'normalInitialRiderLandmarks':dict(zip(names[1:],points[1:])),
 'indexedMeshTriangles':len(indices)//3,'components':components,'nearestForBoardAndRiderLandmarks':nearest,
 'boardNearestPerComponent':list(by_component.values()),
 'boardNearestIndexedTriangleWithAnyLiftedVertex':liftedbest,'boardNearestJoinedActualCrestSegmentXZ':nearest_crest,
 'measuredLandmarkConvexHullFootprintXZ':footprint,'closestProjectedBarrelToMeasuredLandmarkFootprint':fpbest,
 'footprintMeaning':'Exact convex hull of saved board position and seven drawn rider landmarks; full board hull and body radii are not retained and are not claimed.',
 'retainedNormalRiderProgress':{'ordinarySteps':obs[-1]['step']-obs[0]['step'],'physicalSeconds':obs[-1]['seaTime']-obs[0]['seaTime'],
  'initial':{'step':0,'boardPose':obs[0]['boardPose'],'ride':obs[0]['ride']},
  'firstCue':None if first_cue is None else {'step':first_cue['step'],'elapsedSeconds':first_cue['seaTime']-obs[0]['seaTime'],'boardPose':first_cue['boardPose'],'ride':first_cue['ride']},
  'firstTakeOffWindowByExactSourceThresholds':None if first_window is None else {'step':first_window['step'],'elapsedSeconds':first_window['seaTime']-obs[0]['seaTime'],'ride':first_window['ride']},
  'firstCueTakeOffWindowAlsoPassed':None if first_cue is None else takeoff(first_cue['ride']['wave']),
  'terminal':{'step':obs[-1]['step'],'boardPose':obs[-1]['boardPose'],'ride':obs[-1]['ride']},
  'phaseCounts':{phase:sum(o['ride']['phase']==phase for o in obs) for phase in sorted(set(o['ride']['phase'] for o in obs))},
  'maxCrestBreaking':max(o['ride']['wave']['crestBreaking'] for o in obs),
  'anyFiniteReportedCurlDistance':any(o['ride']['wave']['curlDistance'] is not None for o in obs)},
 'limitations':['Saved indexed barrel proximity is geometry evidence, not body contact or per-fragment ownership.',
  'Only the measured landmark footprint is exact; a full board/body contact envelope is not reconstructed.',
  'No solver surface/current/crest lineage arrays are retained for forecasting this rider wave to breaking.',
  'The 68-step normal rider progress was captured alongside the diagnostic camera and is not an ordinary body-entry run.',
  'Earlier RAW body traces were not consulted or used as evidence for this new C run.']}
summary['pins']['sourceVerifiedAgainstCaptureSeal']=source_pins
summary['staticFocus']=r['initial']['status']['breakPoint']
summary['sourceRideLineupEqualsCapturedInitialBoardXZ']=points[0][0]==summary['staticFocus']['x'] and points[0][2]==summary['staticFocus']['z']-6
summary['selectedDiagnosticEyeHorizontalDistanceFromBoard']=norm(sub(project(points[0]),project(initial['eye'])))
summary['projectedIndexedMeshBoundsXZ']={'minX':min(p[0::3]),'maxX':max(p[0::3]),'minZ':min(p[2::3]),'maxZ':max(p[2::3])}
summary['footprintAndMeshSeparatedByZAxis']=max(v[2] for v in footprint3)<min(p[2::3])
assert summary['footprintAndMeshSeparatedByZAxis']
assert pin(ROOT/'report.json')==report_pin and pin(ROOT/expected['file'])==snapshot_pin
assert all(pin(Path(v['file']))==v for v in source_pins)
summary['inputBytesUnchangedAfterAnalysis']=True
(OUT/'geometry.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({'components':components,'boardNearestXYZ':nearest['board-position']['xyz'],'boardNearestXZ':nearest['board-position']['xz'],
 'landmarkFootprintNearestXZ':fpbest,'firstCueStep':None if first_cue is None else first_cue['step'],
 'lifted':liftedbest,'crestXZ':nearest_crest,'eyeDistance':summary['selectedDiagnosticEyeHorizontalDistanceFromBoard'],
 'progress':{k:v for k,v in summary['retainedNormalRiderProgress'].items() if k not in ['initial','firstCue','terminal','firstTakeOffWindowByExactSourceThresholds']},
 'firstTakeOffWindowStep':None if first_window is None else first_window['step']}))
