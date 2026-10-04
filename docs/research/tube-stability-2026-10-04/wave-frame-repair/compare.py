#!/usr/bin/env python3
"""Read-only finite same-policy report analysis. Run only after root confirms owner terminal."""
from pathlib import Path
from collections import Counter
import argparse, hashlib, json, math
WORK=Path('/private/tmp/tube-gauge-analysis-20261004')
BASE=Path('/private/tmp/tube-natural-entry-ready-20261004/native-first/report.json')
CANDIDATE=Path('/private/tmp/tube-gauge-natural-entry-20261004/native-first/report.json')
def read(path):
    body=path.read_bytes();assert len(body)<=32*1024*1024,'Native report cap'
    r=json.loads(body);assert r['schema']=='tube-natural-entry-native/v1'
    assert 0<len(r['steps'])==r['stepCount']<=1080
    return r,{'file':str(path),'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest()}
def interval(rows,key):
    values=[key(row) for row in rows];values=[v for v in values if isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)]
    return {'min':min(values),'max':max(values)} if values else None
def brief(row):
    if not row:return None
    return {k:row.get(k) for k in ['step','physicalSeconds','seaTime','cue','separation']}|{
        'phase':row['ride']['phase'],'speed':row['ride']['speed'],'boardSpeed':row['ride']['boardSpeed'],
        'boardXZ':[row['boardPose'][0],row['boardPose'][2]],'wave':row['ride']['wave'],'pilot':row['pilot']}
def gates(w):
    face=max(0,w['faceHeight']);lo=min(2,1.1*face);hi=min(4,2.2*face)
    return {'valid':w['valid'],'crestSpeed':w['crestSpeed']>=3,
        'caughtSpeed':w['speedShoreward']>=max(.8*w['crestSpeed'],3),
        'faceFraction':w['faceFraction']>=.5,'aheadLower':w['aheadOfCrest']>=lo,'aheadUpper':w['aheadOfCrest']<=hi}
def summarize(r):
    rows=r['steps'];valid=[x for x in rows if x['ride']['wave']['valid']]
    angle=math.radians(r['settings']['directionDegrees']);ix,iz=math.sin(angle),math.cos(angle)
    dot=lambda row:row['ride']['wave']['directionX']*ix+row['ride']['wave']['directionZ']*iz
    phase=lambda row:row['ride']['phase'];window=[x for x in rows if all(gates(x['ride']['wave']).values())]
    counts=lambda subset:{key:sum(gates(x['ride']['wave'])[key] for x in subset) for key in gates(rows[0]['ride']['wave'])}
    witnesses=[x for x in rows if x.get('witness') is not None]
    fall=next((x for x in rows if phase(x) in ('fallen','recover') or x.get('separation')),None)
    standing=next((x for x in rows if phase(x)=='standing'),None)
    first_cue=next((x for x in rows if x['cue']),None)
    first_pop=next((x for x in rows if x['input'].get('popUp')),None)
    first_go=next((x for x in rows if x['pilot']['state']=='go'),None)
    positions=[r['initialBody']['boardPose']]+[x['boardPose'] for x in rows]
    speeds=[(positions[k+1][2]-positions[k][2])*60 for k in range(len(rows))]
    private_speed_pass=sum(x['ride']['boardSpeed']>=2 for x in rows)
    def forward2(row):
        x,y,z,w=row['boardPose'][3:7];fx=2*(x*z+y*w);fz=1-2*(x*x+y*y);return fx*fx+fz*fz
    thresholds={'crestSpeedMinimum':3,'shorewardMinimum':3,'crestSpeedShare':.8,'faceFractionMinimum':.5,
        'aheadMinimum':'min(2,1.1*max(0,faceHeight))','aheadMaximum':'min(4,2.2*max(0,faceHeight))'}
    return {'complete':r['complete'],'firstFailure':r['firstFailure'],'steps':len(rows),'physicalSeconds':len(rows)/60,
        'initialSeaTime':r['initialBody']['seaTime'],'finalSeaTime':rows[-1]['seaTime'],
        'phaseCounts':dict(Counter(map(phase,rows))),'paddleSteps':sum(x['input'].get('paddle',False) for x in rows),
        'cueSteps':[x['step'] for x in rows if x['cue']],'popUpSteps':[x['step'] for x in rows if x['input'].get('popUp')],
        'firstCue':brief(first_cue),'firstPopUp':brief(first_pop),'firstStanding':brief(standing),'firstFall':brief(fall),
        'firstGo':brief(first_go),'stop':r['stop'],'initialBoardPose':r['initialBody']['boardPose'],
        'spawnOutsideFocus':rows[0]['inputView']['focusZ']-r['initialBody']['boardPose'][2],
        'boardXZChange':[positions[-1][j]-positions[0][j] for j in [0,2]],
        'boardPositionFiniteDifferenceZ':{'min':min(speeds),'max':max(speeds),'stepsAtLeast3':sum(v>=3 for v in speeds),
            'scope':'Observed world-z position finite differences, not worker velocity or paddling-force attribution'},
        'speed':interval(rows,lambda x:x['ride']['speed']),'boardSpeed':interval(rows,lambda x:x['ride']['boardSpeed']),
        'incomingDirectionDotAll':interval(rows,dot),'incomingDirectionDotValid':interval(valid,dot),
        'incomingDirectionNegativeSteps':sum(dot(x)<0 for x in rows),'incomingDirectionNegativeValidSteps':sum(dot(x)<0 for x in valid),
        'waveValidSteps':len(valid),'crestSpeedAll':interval(rows,lambda x:x['ride']['wave']['crestSpeed']),
        'crestSpeedValid':interval(valid,lambda x:x['ride']['wave']['crestSpeed']),
        'waveRangesValid':{key:interval(valid,lambda row,key=key:row['ride']['wave'][key]) for key in ['speedShoreward','faceFraction','faceHeight','aheadOfCrest']},
        'takeoffWindow':{'thresholdsUnchanged':thresholds,'allRowsGatePassCounts':counts(rows),'validRowsGatePassCounts':counts(valid),
            'allGatesPassSteps':[x['step'] for x in window],
            'validDistanceBandPassCount':sum(gates(x['ride']['wave'])['aheadLower'] and gates(x['ride']['wave'])['aheadUpper'] for x in valid),
            'validFailures':{},
            'scope':'Exact published inTakeOffWindow clauses; not raw AttachedRider.popUpCue refusal reasons'},
        'privateRiderCueObservable':{'boardSpeedBelow2Steps':len(rows)-private_speed_pass,'boardSpeedAtLeast2Steps':private_speed_pass,
            'minimumProjectedForwardLengthSquared':min(forward2(x) for x in rows),
            'scope':'Pressure support, sampled downhill slope and sample-domain predicate are unlogged. Combined cue false implies raw rider cue false, but does not identify its private rejecting clause.'},
        'witnessRows':len(witnesses),'witnessClassifications':dict(Counter(x['witness']['classification'] for x in witnesses)),
        'standingUnmeasuredRows':sum(phase(x)=='standing' and x.get('witness') is None for x in rows),
        'detectorDisabledReasons':dict(Counter(x['detector'].get('disabledReason') for x in rows if x['detector'].get('disabledReason'))),
        'entry':r['entry'],'entryScope':'Seven air-column witnesses on one connected indexed mesh component plus reference trunk spheres; no full-body/capsule or air-volume connectivity proof',
        'inheritedWorkerWording':[text for text in r.get('limitations',[]) if 'No worker internals changed' in text],
        'wordingCorrection':'No added private worker instrumentation. Candidate intentionally changes the physical host gauge; inherited wording is not evidence of unchanged physics or equal trajectory.',
        'renderer':r['diagnosticOutput'].get('renderer'),'browserErrors':r['browserErrors']}
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--compare-after-owner-terminal',action='store_true');args=parser.parse_args()
    assert args.compare_after_owner_terminal,'Explicit root terminal confirmation required before numerical comparison'
    baseline,base_receipt=read(BASE);candidate,candidate_receipt=read(CANDIDATE)
    owner_path=CANDIDATE.parent.with_name('native-first-owner.json');owner=json.loads(owner_path.read_text())
    assert owner.get('independentClosureValid') is True,'Candidate owner must have terminal owned closure evidence'
    assert all(owner.get('closedPorts',{}).get(str(p)) is True for p in [4289,9699]),'Both candidate ports must be closed'
    a=summarize(baseline);b=summarize(candidate)
    for r,s in [(baseline,a),(candidate,b)]:
        s['takeoffWindow']['validFailures']=dict(Counter(','.join(k for k,v in gates(x['ride']['wave']).items() if not v) for x in r['steps'] if x['ride']['wave']['valid']))
    same={key:baseline[key]==candidate[key] for key in ['settings','overrides','graphics','policy','schedule']}
    same['initialBoardPose']=baseline['initialBody']['boardPose']==candidate['initialBody']['boardPose']
    same['initialRiderPoints']=baseline['initialBody']['riderPoints']==candidate['initialBody']['riderPoints']
    same['initialSeaTime']=baseline['initialBody']['seaTime']==candidate['initialBody']['seaTime']
    result={'schema':'tube-gauge-natural-entry-comparison/v1','receipts':{'baseline':base_receipt,'candidate':candidate_receipt},
        'candidateTerminalOwner':str(owner_path),'candidateOwnerComplete':owner.get('complete'),
        'sameRecordedConfigurationAndSpawn':same,'sameTrajectoryClaim':False,'candidateInstrumentationScope':b['wordingCorrection'],
        'baseline':a,'candidate':b,'limitations':['Independent fresh seeded scenes and gauge-dependent inputs do not establish equal trajectories.',
        'Renderer also changes from957 foam balls tocurrent8f79 omission; body evidence does not establish identical rendered fragments.',
        'Connected witness entry is not complete-body clearance. Raw private pop-up cue clauses remain uninstrumented.']}
    out=WORK/'comparison.json';out.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'comparison':str(out),'sameConfigAndSpawn':same,'baselineSteps':a['steps'],'candidateSteps':b['steps'],
        'baselinePhase':a['phaseCounts'],'candidatePhase':b['phaseCounts'],'candidateCueSteps':b['cueSteps'],'candidatePopUpSteps':b['popUpSteps'],
        'candidateFirstStanding':None if not b['firstStanding'] else b['firstStanding']['step'],
        'candidateFirstFall':None if not b['firstFall'] else b['firstFall']['step']}))
if __name__=='__main__':main()
