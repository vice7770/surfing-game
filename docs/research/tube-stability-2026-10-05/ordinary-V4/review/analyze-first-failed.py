#!/usr/bin/env python3
"""Read completed V4 native evidence; no simulation, resource, or source mutation."""
import base64,collections,hashlib,json,math,pathlib,struct
W=pathlib.Path('/private/tmp/tube-stable-x-ordinary-rider-v4-20261005')
OUT=pathlib.Path(__file__).resolve().parent
S=pathlib.Path('/private/tmp/tube-bounded-c-stable-x-sampling-20261005/source')
def pin(p):
 p=pathlib.Path(p);b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
report=json.loads((W/'candidate-first/report.json').read_text())
owner=json.loads((W/'candidate-first-owner.json').read_text())
rows=[json.loads(x) for x in (W/'candidate-first/steps.ndjson').read_text().splitlines()]
assert rows==report['steps'] and len(rows)==report['stepCount']==1366
assert owner['complete'] and owner['exitCode']==0 and owner['firstFailure'] is None
assert report['complete'] and report['firstFailure'] is None
for rec in report['artifacts']+report['loftSnapshots']:
 assert {k:pin(W/'candidate-first'/rec['file'])[k] for k in ['bytes','sha256']}=={k:rec[k] for k in ['bytes','sha256']}
sourceRel=['src/physics/AttachedRider.ts','src/physics/AttachedRider.test.ts','src/physics/RideSession.ts','src/physics/takeOffCue.ts','src/wave/SurfZoneRunner.ts','src/scene/SpectatorCamera.ts','src/game/PhysicalMode.ts','src/physics/riderPosture.ts']
sourcePins={x['file']:x for x in report['source']['sourcePins']}
for rel in sourceRel:
 p=str(S/rel);assert pin(p)==sourcePins[p]
helperPins=json.loads((W/'helper-pins.json').read_text())
records=helperPins.get('pins',helperPins.get('files',[]))
if isinstance(records,dict): records=list(records.values())
# Relevant capture helpers are root-sealed through their manifest; retain manifest and local hashes.
phases=collections.Counter(x['ride']['phase'] for x in rows)
transitions=[];prev=None
for row in rows:
 phase=row['ride']['phase']
 if phase!=prev:
  transitions.append({'step':row['step'],'phase':phase,'seaTime':row['seaTime'],'physicalSeconds':row['physicalSeconds'],'balance':row['balance'],'boardPosition':row['boardPose'][:3],'nearestIndexedFormedHorizontalDistance':row['nearFormed'].get('horizontalDistance')});prev=phase
cameraFields=['exactPositionQuaternionMatch','actualDrawnFollowTargetMatch','publishedClockBodyWordsUnchangedByCamera','normalHudPause']
assert all(all(x['cameraFollower'][k] for k in cameraFields) and not x['cameraFollower']['activeLab'] and x['cameraFollower']['positiveDtCalls']==x['step'] for x in rows)
assert all(x['input']=={'paddle':x['inputView']['ride']['phase']=='prone','popUp':x['step']==1300,'steer':0,'trim':0,'crouch':0,'compress':0,'pocketReflex':False} for x in rows)
initial=report['initialBody'];terminal=rows[-1]
assert all(abs(x['seaTime']-initial['seaTime']-x['step']/60)<1e-7 for x in rows)
near=[x for x in rows if x['nearFormed'].get('available') and 'horizontalDistance' in x['nearFormed']]
assert len(near)==len(rows)
minimum=min(near,key=lambda x:x['nearFormed']['horizontalDistance'])
firstNear=next((x for x in near if x['nearFormed']['qualifies']),None)
D={'Float32Array':('f',4),'Float64Array':('d',8),'Uint32Array':('I',4),'Int32Array':('i',4),'Uint8Array':('B',1)}
def decode(rec):
 b=base64.b64decode(rec['data'],validate=True);fmt,n=D[rec['dtype']]
 assert rec['littleEndian'] is True and len(b)==rec['byteLength']==rec['count']*n
 a=struct.unpack('<'+fmt*rec['count'],b)
 if fmt in 'fd': assert all(math.isfinite(v) for v in a)
 return a

def closest(l,point):
 p=l['positions'];idx=l['indices'];SLOTS=134;x,z=point[0],point[2];best=None;eligible=0
 def segment(a,b):
  ax,az=p[a*3],p[a*3+2];dx,dz=p[b*3]-ax,p[b*3+2]-az;n=dx*dx+dz*dz
  t=max(0,min(1,((x-ax)*dx+(z-az)*dz)/n)) if n else 0
  q=(ax+t*dx,az+t*dz);return ((x-q[0])**2+(z-q[1])**2,q)
 for o in range(0,len(idx),3):
  a,b,c=idx[o:o+3];r=[a//SLOTS,b//SLOTS,c//SLOTS];lo,hi=min(r),max(r)
  if hi!=lo+1 or l['sliceJoined'][lo]!=1 or l['sliceFront'][lo]!=l['sliceFront'][hi] or not (l['sliceWeight'][lo]>0 and l['sliceWeight'][hi]>0) or not (l['sliceFormed'][lo]>0 or l['sliceFormed'][hi]>0):continue
  eligible+=1
  cross=lambda u,v:(p[v*3]-p[u*3])*(z-p[u*3+2])-(p[v*3+2]-p[u*3+2])*(x-p[u*3])
  area=(p[b*3]-p[a*3])*(p[c*3+2]-p[a*3+2])-(p[b*3+2]-p[a*3+2])*(p[c*3]-p[a*3])
  sign=math.copysign(1,area)
  if area and all(cross(u,v)*sign>=0 for u,v in [(a,b),(b,c),(c,a)]):d,q=0,(x,z)
  else:d,q=min(segment(a,b),segment(b,c),segment(c,a))
  if best is None or d<best['distanceSquared']:
   best={'distanceSquared':d,'horizontalDistance':math.sqrt(d),'nearestXZ':list(q),'front':l['sliceFront'][lo],'triangleIndexOffset':o,'indices':[a,b,c],'rows':[lo,hi],'rowPhases':[l['slicePhase'][lo],l['slicePhase'][hi]],'rowFormed':[l['sliceFormed'][lo],l['sliceFormed'][hi]],'rowWeights':[l['sliceWeight'][lo],l['sliceWeight'][hi]]}
 return {'eligibleTriangles':eligible,**(best or {})}
checkpointGeometry=[]
for label,row in [('initial',initial),('terminal',terminal)]:
 side=json.loads((W/'candidate-first'/('loft-'+label+'.json')).read_text())
 arrays={k:decode(v) for k,v in side['arrays'].items()};raw=decode(side['rawFrontPacket'])
 assert len(arrays)==37 and len(arrays['positions'])==side['counts']['vertices']*3 and len(arrays['indices'])==side['counts']['indices']
 assert all(i<side['counts']['vertices'] for i in arrays['indices'])
 assert len(raw)==side['rawFrontPacket']['recordCount']*9
 distances={'board':closest(arrays,row['boardPose'])}
 for i,name in enumerate(['pelvis','chest','head','leftHand','rightHand','leftFoot','rightFoot']):distances[name]=closest(arrays,row['riderPoints'][i*3:i*3+3])
 if label=='terminal':
  actual=row['nearFormed'];ind=distances['board'];assert abs(actual['horizontalDistance']-ind['horizontalDistance'])<1e-12 and actual['triangleIndexOffset']==ind['triangleIndexOffset'] and actual['eligibleTriangles']==ind['eligibleTriangles']
 checkpointGeometry.append({'label':label,'epoch':side['epoch'],'counts':side['counts'],'decodedArrays':len(arrays),'decodedBytes':sum(v['byteLength'] for v in side['arrays'].values())+side['rawFrontPacket']['byteLength'],'rawFrontRecords':side['rawFrontPacket']['recordCount'],'nonmutationRecorded':side['nonmutation'],'distances':distances})
checkpointCamera=[]
for c in report['checkpoints']:
 fol=c['cameraFollower'];assert all(fol[k] for k in cameraFields)
 assert c['camera']['position']==fol['position'] and c['camera']['quaternion']==fol['quaternion']
 checkpointCamera.append({'label':c['label'],'step':c['step'],'position':c['camera']['position'],'quaternion':c['camera']['quaternion'],'calls':fol['calls'],'positiveDtCalls':fol['positiveDtCalls'],'zeroDtCalls':fol['zeroDtCalls'],'lastFollowTarget':fol['last'],'clocks':c['clocks']})
def event(x):return None if x is None else {'step':x['step'],'phase':x['ride']['phase'],'physicalSeconds':x['physicalSeconds'],'seaTime':x['seaTime'],'horizontalDistance':x['nearFormed'].get('horizontalDistance'),'front':x['nearFormed'].get('front')}
reportResult={'schema':'stable-X-ordinary-rider-v4-evidence-review/v1','actualNative':{'ownerComplete':True,'ownerExitCode':0,'ownerFirstFailure':None,'independentClosureValid':owner['independentClosureValid'],'protectedPortsPreserved':owner['protectedPortsPreserved'],'sourceBuildHelpersPostUnchanged':owner['sourceBuildHelpersPostUnchanged'],'normalMenuSeed':report['normalMenuSeed'],'steps':len(rows),'physicalSeconds':len(rows)/60,'initialSeaTime':initial['seaTime'],'terminalSeaTime':terminal['seaTime'],'phaseCounts':dict(phases),'transitions':transitions,'stop':report['stop'],'outputCueSteps':[x['step'] for x in rows if x['cue']],'preInputCueSteps':[x['step'] for x in rows if x['inputView']['ride']['cue']],'popUpInputSteps':[x['step'] for x in rows if x['input']['popUp']],'terminalPopUp':terminal['ride']['popUp'],'entry':report['entry'],'witnessCount':sum(x['witness'] is not None for x in rows),'video':report['video'],'videoRequests':len(report['videoRequests']),'pngs':report['pngCount'],'browserErrors':report['browserErrors']},'validation':{'ndjsonExactlyEqualsReportSteps':True,'allStepClocksMatchStepOver60Within1e-7':True,'relevantSourceHashesMatchActualReport':True,'allActualArtifactPinsMatch':True,'allRecordedCameraCertificatesPass':True,'allPositiveDtCallsEqualPhysicalSteps':True,'allActualControlsMatchDeclaredProneAndNonstandingPolicy':True,'terminalBoardDistanceIndependentlyRecomputed':True,'sidecarsAll37ArraysAndRawPacketDecodedAndBounded':True},'nearIndexedFormed':{'initialBoardHorizontalDistance':checkpointGeometry[0]['distances']['board']['horizontalDistance'],'firstWithin15m':event(firstNear),'minimum':event(minimum),'terminal':event(terminal),'qualifyingSteps':sum(x['nearFormed']['qualifies'] for x in rows),'scope':'XZ distance to actual positive-weight, formed joined indexed interslice bands; tails may qualify; not cavity, roof, physical collision or body passage proof'},'checkpointGeometry':checkpointGeometry,'camera':{'view':'front','all1366RowsCertified':True,'checkpoints':checkpointCamera,'scope':'Public authored continuation after one setRideView cut and real HUD pause; mirror repeats ordinary height reads; no prior smoothing history, unpaused wall-time schedule or complete renderer nonmutation claim'},'sourceInterpretation':{'cue':'SurfZoneRunner.cue is prone-only OR of own planing cue and gauge takeoff window. Output 1299 independently passes the takeoff window; exclusive cue cause unavailable. Input 1300 consumes the real pre-input cue once.','transition':'PUSH_TIME=.72 and LANDING_TIME=.48; standing transition records refusal but occurs regardless of refusal. The rider separated during landing before reaching it.','lostBoard':'finish may separate with lost board through flightTime>MAX_FLIGHT=.4 OR postureError>RECOVERABLE_ERROR=.25 with dominant flight contact limit. The recorded reason does not distinguish these paths. Private flightTime, postureError, contact impulse/projection and limits were not published.','nextStep':'Instrument the existing ordinary pop-up/contact path at the actual worker step/substep: phase clock, flightTime, postureError, inContact/feasible, contact limit and impulses, leg extension, relative board/rider velocity and local water surface/flow. Preserve normal spawn/seed/menu/cue and finite first-fall stop; add checkpoint/movie at first pop-up and landing rather than requiring standing. Diagnose the first loss of support before changing cue or contact constants. Continue tube roof/seam retirement work separately.'},'visualInspection':{'performed':True,'files':['00-initial.png','01-terminal.png'],'initial':'Prone rider/board visible in local elevated follower view over foam-covered ocean.','terminal':'Rider visible above water at a steep dark face edge, with spray/foam; no convincing hollow mouth or ridden tube is shown in this PNG. This alone does not classify all tubes or establish the fall cause.','movie':'No movie was created because the standing-plus-near-band trigger never occurred. No reconstructed or substitute clip.'},'limits':report['limitations']+['One normal random-seed run; no success rate or impossibility claim.','No private worker contact state, no causal diagnosis of lost-board branch.','Indexed band proximity includes tails and does not prove an air cavity or obstacle-free entry.','Only initial and terminal actual images; no pop-up/landing images or movie.','No FPS, real-time player experience, complete physical collision or visual quality acceptance.']}
readInputs=[W/'candidate-first-owner.json',W/'candidate-first/report.json',W/'candidate-first/steps.ndjson',W/'candidate-first/loft-initial.json',W/'candidate-first/loft-terminal.json',W/'candidate-first/00-initial.png',W/'candidate-first/01-terminal.png',W/'seal.json',W/'readiness.json',W/'helper-pins.json',W/'rider-driver.mjs',W/'control-policy.mjs',W/'follower-camera.mjs',W/'native.mjs',W/'native-owned.mjs']+[S/r for r in sourceRel]
reportResult['inputPins']=[pin(x) for x in readInputs]
(OUT/'review.json').write_text(json.dumps(reportResult,indent=2)+'\n')
print(json.dumps({'steps':len(rows),'phases':dict(phases),'minimumNear':event(minimum),'terminalBoardNearest':checkpointGeometry[-1]['distances']['board'],'review':pin(OUT/'review.json')},indent=2))
