"""Offline, read-only comparison of one complete recorded V3 prefix and completed V2.
No simulation, source edits, live APIs, seeds, cameras, or ports are operated.
"""
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter
import hashlib, json, math, os

ROOT=Path('/Users/regina/Desktop/Projects/surfing-game')
V2=Path('/private/tmp/tube-guided-ordinary-v2-native-20261005/candidate-first/steps.ndjson')
V3=Path('/private/tmp/tube-guided-ordinary-v3-native-20261005/candidate-first/steps.ndjson')
OUT=Path('/private/tmp/tube-guided-ordinary-v3-takeoff-guide-prefix-20261005.json')
LIMIT=64*1024*1024
DT=1/60

def read_prefix(path):
 with path.open('rb') as f:
  size=os.fstat(f.fileno()).st_size
  if size>LIMIT:raise ValueError('Declared trace byte bound exceeded')
  raw=f.read(size)
 end=raw.rfind(b'\n')+1
 prefix=raw[:end]
 rows=[json.loads(line)for line in prefix.splitlines()]
 if not rows:raise ValueError('No complete recorded rows')
 if any(row['step']!=i for i,row in enumerate(rows,1)):raise ValueError('Not a complete sequential prefix')
 return rows,{'file':str(path),'observedFileBytes':size,'capturedBytes':len(raw),'completePrefixBytes':len(prefix),
  'trailingPartialBytesExcluded':len(raw)-end,'sha256':hashlib.sha256(prefix).hexdigest(),'rowCount':len(rows),
  'firstStep':rows[0]['step'],'lastStep':rows[-1]['step'],'readPolicy':'One opened file; fstat byte bound captured once; complete newline-terminated rows only; no reread.'}

def brief(row):
 view=row['inputView'];wave=view['ride']['wave']
 return{'step':row['step'],'inputSeaTime':view['seaTime'],'outputSeaTime':row['seaTime'],'physicalSeconds':row['step']*DT,
  'inputPhase':view['ride']['phase'],'outputPhase':row['ride']['phase'],'inputPilot':row['inputPilot'],'input':row['input'],
  'crestBehind':view['crestBehind'],'focusZ':view['focusZ'],'board':view['board'],'peelDirection':view['peelDirection'],
  'inputCue':view['ride']['cue'],'outputCue':row['ride']['cue'],'boardSpeed':view['ride']['boardSpeed'],'wave':wave}

def gates(wave):
 names=('faceHeight','crestSpeed','speedShoreward','faceFraction','aheadOfCrest')
 if not all(isinstance(wave.get(k),(int,float))and math.isfinite(wave[k])for k in names):
  return{'finiteLoggedOperands':False}
 face=max(0,wave['faceHeight']);low=min(2,1.1*face);high=min(4,2.2*face);speed=max(.8*wave['crestSpeed'],3)
 values={'valid':wave['valid'] is True,'crestSpeedAtLeast3':wave['crestSpeed']>=3,
  'shorewardSpeedAtLeastCaughtThreshold':wave['speedShoreward']>=speed,'faceFractionAtLeastHalf':wave['faceFraction']>=.5,
  'clearOfLip':wave['aheadOfCrest']>=low,'nearCrest':wave['aheadOfCrest']<=high}
 return{'finiteLoggedOperands':True,'passes':values,'failed':[k for k,v in values.items()if not v],
  'inTakeOffWindow':all(values.values()),'geometryWindow':values['valid']and values['faceFractionAtLeastHalf']and values['clearOfLip']and values['nearCrest'],
  'requiredShorewardSpeed':speed,'requiredAheadMinimum':low,'requiredAheadMaximum':high,
  'shorewardSpeedGap':wave['speedShoreward']-speed,'crestSpeedGap':wave['crestSpeed']-3,
  'aheadMinimumGap':wave['aheadOfCrest']-low,'aheadMaximumGap':high-wave['aheadOfCrest']}

def consecutive(rows,predicate):
 result=[];start=None
 for i,row in enumerate(rows):
  if predicate(row):
   if start is None:start=i
  elif start is not None:
   result.append({'firstStep':rows[start]['step'],'lastStep':rows[i-1]['step'],'actions':i-start,'actionSeconds':(i-start)*DT})
   start=None
 if start is not None:result.append({'firstStep':rows[start]['step'],'lastStep':rows[-1]['step'],'actions':len(rows)-start,'actionSeconds':(len(rows)-start)*DT})
 return result

def gate_summary(rows,side):
 frames=[];failed=Counter();combinations=Counter();outside=0
 for row in rows:
  ride=row['inputView']['ride']if side=='input'else row['ride']
  if ride['phase']!='prone':outside+=1;continue
  g=gates(ride['wave']);entry={'step':row['step'],'seaTime':row['inputView']['seaTime']if side=='input'else row['seaTime'],
   'cue':ride['cue'],'boardSpeed':ride['boardSpeed'],'wave':ride['wave'],'gates':g}
  frames.append(entry)
  if not g['finiteLoggedOperands']:failed['nonfiniteOrMissingOperands']+=1;continue
  failed.update(g['failed']);combinations['+'.join(g['failed'])or'none']+=1
 geometry=[f for f in frames if f['gates'].get('geometryWindow')]
 speed=[f for f in frames if f['gates'].get('passes',{}).get('shorewardSpeedAtLeastCaughtThreshold')]
 full=[f for f in frames if f['gates'].get('inTakeOffWindow')]
 def endpoints(items):return None if not items else{'count':len(items),'first':items[0],'last':items[-1]}
 return{'proneSamples':len(frames),'nonProneSamplesExcluded':outside,'individualGateFailureCounts':dict(failed),
  'gateFailureCombinations':dict(combinations),'geometryWindow':endpoints(geometry),'shorewardCaughtSpeed':endpoints(speed),'fullWindow':endpoints(full),
  'cueTrueWithWindowFalse':sum(f['cue']and not f['gates'].get('inTakeOffWindow')for f in frames),
  'cueFalseWithWindowTrue':sum(not f['cue']and f['gates'].get('inTakeOffWindow')for f in frames),
  'boardSpeedBelow2':sum(f['boardSpeed']<2 for f in frames),
  'uncertifiedPhysicalCueOperands':['board.forces.pressure.y/combinedWeight','sample.slopeX/slopeZ','normalized board-forward slope projection','sample.outsideDomain','last-substep cue timing']}

def ranges(rows):
 getters={'crestBehind':lambda r:r['inputView']['crestBehind'],'boardSpeed':lambda r:r['inputView']['ride']['boardSpeed'],
  'crestSpeed':lambda r:r['inputView']['ride']['wave']['crestSpeed'],'shorewardSpeed':lambda r:r['inputView']['ride']['wave']['speedShoreward'],
  'faceHeight':lambda r:r['inputView']['ride']['wave']['faceHeight'],'faceFraction':lambda r:r['inputView']['ride']['wave']['faceFraction'],
  'aheadOfCrest':lambda r:r['inputView']['ride']['wave']['aheadOfCrest'],'heading':lambda r:r['inputView']['board']['heading']}
 result={}
 for name,get in getters.items():
  values=[(get(r),r['step'])for r in rows if isinstance(get(r),(int,float))and math.isfinite(get(r))]
  result[name]={'minimum':min(v for v,s in values),'maximum':max(v for v,s in values),'sampleCount':len(values)}if values else None
 return result

def analyse(rows,pin):
 idle=lambda row:row['inputView']['ride']['phase']=='prone'and not row['input']['paddle']and not row['input']['popUp']
 intervals=consecutive(rows,idle)
 crest_rows=[r for r in rows if r['inputView']['crestBehind']>1]
 go=[r for r in rows if r['inputPilot']['state']=='go']
 return{'prefix':pin,'inputPhaseCounts':dict(Counter(r['inputView']['ride']['phase']for r in rows)),
  'outputPhaseCounts':dict(Counter(r['ride']['phase']for r in rows)),'inputPilotCounts':dict(Counter(r['inputPilot']['state']for r in rows)),
  'commands':{'paddleTrue':sum(r['input']['paddle']is True for r in rows),'paddleFalse':sum(r['input']['paddle']is False for r in rows),
   'popUpTrue':sum(r['input']['popUp']is True for r in rows),'inputCueTrue':sum(r['inputView']['ride']['cue']is True for r in rows),
   'outputCueTrue':sum(r['ride']['cue']is True for r in rows),'idleProneRuns':intervals,'idleProneActions':sum(i['actions']for i in intervals)},
  'firstPositiveCrest':brief(crest_rows[0])if crest_rows else None,'firstCatchState':brief(go[0])if go else None,
  'first':brief(rows[0]),'last':brief(rows[-1]),'ranges':ranges(rows),'inputWindow':gate_summary(rows,'input'),'outputWindow':gate_summary(rows,'output'),
  'observedSequenceStopInPrefix':rows[-1]['sequence'].get('stop'),'terminalOwnerOrReportRead':False}


def phase_event(row):
 if row is None:return None
 out=brief(row)
 out.update({'displayedPhase':row['displayedRiderPhase'],'visualPoseTime':row['visualPoseTime'],'interpolationLag':row['interpolationLag'],
  'pilot':row['pilot'],'boardPose':row['boardPose'],'popUpReport':row['ride']['popUp'],'outputGuide':row['ride'].get('tubeApproach'),
  'outputTubeBodyAvailable':row['ride'].get('tubeBody')is not None,
  'witnessClass':row.get('witness',{}).get('classification')if row.get('witness')else None,
  'renderedWitnessClass':row.get('renderedWitness',{}).get('classification')if row.get('renderedWitness')else None,
  'unionWitnessClass':row.get('unionWitness',{}).get('classification')if row.get('unionWitness')else None})
 return out

def first(rows,predicate):return next((r for r in rows if predicate(r)),None)

def standing_guide(rows):
 standing=[r for r in rows if r['ride']['phase']=='standing']
 seek=[r for r in standing if r['pilot']['phase']=='seek']
 def classification(name):return dict(Counter(r[name]['classification']if r.get(name)else'absent'for r in standing))
 def rate_pair(previous,row):
  dt=row['inputView']['seaTime']-previous['inputView']['seaTime']
  a=row['inputView']['board']['heading']-previous['inputView']['board']['heading']
  wrapped=math.atan2(math.sin(a),math.cos(a))
  bank=row['inputView']['ride']['bank']-previous['inputView']['ride']['bank']
  return{'previousStep':previous['step'],'step':row['step'],'inputDeltaSeconds':dt,'actualLoggedHeadingRate':wrapped/dt if dt>0 else None,
   'actualLoggedBankRate':bank/dt if dt>0 else None,'steer':row['input']['steer'],'bank':row['inputView']['ride']['bank'],
   'noCurrentGuide':row['inputView']['ride'].get('tubeApproach')is None}
 pairs=[(a,b)for a,b in zip(rows,rows[1:])if a['inputView']['ride']['phase']=='standing'and b['inputView']['ride']['phase']=='standing'
  and a['pilot']['phase']=='seek'and b['pilot']['phase']=='seek'and not b['inputView']['ride'].get('tubeApproach')]
 return{'standingSampleCount':len(standing),'seekStandingSampleCount':len(seek),
  'firstInputPositiveCue':phase_event(first(rows,lambda r:r['inputView']['ride']['cue']is True)),
  'firstPilotPopUp':phase_event(first(rows,lambda r:r['input']['popUp']is True)),
  'firstOutputPush':phase_event(first(rows,lambda r:r['ride']['phase']=='push')),
  'firstOutputLanding':phase_event(first(rows,lambda r:r['ride']['phase']=='landing')),
  'firstOutputStanding':phase_event(first(rows,lambda r:r['ride']['phase']=='standing')),
  'firstDisplayedStanding':phase_event(first(rows,lambda r:r['displayedRiderPhase']=='standing')),
  'firstTubeSeek':phase_event(first(rows,lambda r:r['pilot']['phase']=='seek')),
  'firstOutputGuide':phase_event(first(rows,lambda r:r['ride'].get('tubeApproach')is not None)),
  'inputGuideSamples':sum(r['inputView']['ride'].get('tubeApproach')is not None for r in rows),
  'outputGuideSamples':sum(r['ride'].get('tubeApproach')is not None for r in rows),
  'standingCurrentTubeBodySamples':sum(r['ride'].get('tubeBody')is not None for r in standing),
  'standingCurrent14ClassificationCounts':classification('witness'),'standingDisplayed7WithCurrentSpheresClassificationCounts':classification('renderedWitness'),
  'standingUnion21ClassificationCounts':classification('unionWitness'),
  'currentAndDisplayedStandingRuns':consecutive(rows,lambda r:r['ride']['phase']=='standing'and r['displayedRiderPhase']=='standing'),
  'firstConsecutiveNoGuideSeekPair':rate_pair(*pairs[0])if pairs else None,'lastConsecutiveNoGuideSeekPair':rate_pair(*pairs[-1])if pairs else None,
  'lastStanding':phase_event(standing[-1])if standing else None,
  'guideAbsenceMeaning':'With same-time tubeBody stamped on standing rows, measureTubeApproach passes enabled/attached/contact-query gates and calls approachNear. No cue identifies no accepted route; it does not separate absence of a mature indexed strip within16m from finite-route or body/board-envelope rejection.',
  'missingGuideRejectionOperands':['nearest eligible mouth distance/front/sigma','candidate mature/joined/phase counts','route rejection stage','actual request envelope dimensions including board footprint'],
  'definiteSeekControllerSourceIssue':'TubePilot.next clears this.previous whenever no current cue, then computes yaw/bankRate from it; those rates are therefore zero during every no-guide seek update, despite logged motion. Retain physical rate history separately from mouth/route history; this alone is not proof of why a guide is missing or a fall occurs.'}

v3,p3=read_prefix(V3)
v2,p2=read_prefix(V2)
paths=('src/dev/Autopilot.ts','src/physics/takeOffCue.ts','src/physics/AttachedRider.ts','src/physics/RideSession.ts','src/physics/waveFrame.ts','src/wave/SurfZoneRunner.ts')
sources=[]
for relative in paths:
 raw=(ROOT/relative).read_bytes();sources.append({'file':str(ROOT/relative),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
result={'schema':'guided-ordinary-v3-takeoff-prefix-audit/v1','complete':True,'capturedAtUTC':datetime.now(timezone.utc).isoformat(),
 'scope':'Offline complete-prefix control/window operand comparison only; V3 may remain live; no terminal or causal body/hydrodynamic acceptance.',
 'productionSourcePins':sources,'v3':analyse(v3,p3),'v2':analyse(v2,p2),
 'comparison':{'samePrefixRows':min(len(v3),len(v2)),'v3IdleProneActions':sum(r['inputView']['ride']['phase']=='prone'and not r['input']['paddle']and not r['input']['popUp']for r in v3),
  'v2IdleProneActionsOverSamePrefix':sum(r['inputView']['ride']['phase']=='prone'and not r['input']['paddle']and not r['input']['popUp']for r in v2[:len(v3)]),
  'commandedPaddleDoesNotProveActualWetHandThrust':True,'positiveCrestBehindIsNotTheActualCue':True},
 'limitations':['Input wave window is reconstructed from exactly logged source operands; the independent physical planing cue lacks pressure and slope telemetry.',
 'Cue false cannot distinguish insufficient pressure, adverse board-facing slope, outside sample, and substep timing using current trace alone.',
 'No crest tracking, force, wet-hand thrust, catch speed, spawn location or cue threshold change is justified solely by a missing positive cue.',
 'No root owner/report was read live; complete prefix does not imply final outcome, ride acceptance, or current run termination.']}
result['followup']='Fresh complete prefix after takeoff was observed; previous prefix receipt remains unchanged.'
result['takeoffAndGuide']=standing_guide(v3)
OUT.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'file':str(OUT),'v3Prefix':p3,'phaseCounts':result['v3']['outputPhaseCounts'],'commands':result['v3']['commands'],'takeoffAndGuide':result['takeoffAndGuide']},indent=2))
