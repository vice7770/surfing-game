"""Read-only audit of the preserved V3 trace; not a replay, classifier, test or capture."""
from pathlib import Path
import hashlib,json,statistics
V3=Path('/private/tmp/tube-guided-ordinary-v3-native-20261005');W=Path('/private/tmp/tube-guided-ordinary-v4-telemetry-native-20261005')
def pin(p):
 raw=p.read_bytes();return {'file':str(p),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
rows=[json.loads(line)for line in(V3/'candidate-first/steps.ndjson').read_bytes().splitlines()]
standing=[row for row in rows if row['ride']['phase']=='standing'];owner=json.loads((V3/'owner.json').read_text());report=json.loads((V3/'candidate-first/report.json').read_text())
sphereChecks=[p['clearance']['checkedNearTriangles']for row in standing for key in('witness','renderedWitness')for p in row[key]['points'][7:]]
result={'scope':'Read-only audit of recorded prefix. No candidate helper/test/build/native/port execution; no retrospective missing geometry or telemetry reconstruction.',
 'priorComplete':report['complete'],'priorFailure':report['firstFailure'],'inputs':[pin(V3/name)for name in('owner.json','candidate-first/report.json','candidate-first/steps.ndjson','rider-driver.mjs','body-mesh.mjs')],
 'steps':len(rows),'physicalSeconds':len(rows)/60,'ownerElapsedSeconds':owner['elapsedSeconds'],'averageWholeAttemptWallMsPerRecordedStep':1000*owner['elapsedSeconds']/len(rows),
 'detectorCumulativeMsLastRow':rows[-1]['detector']['cumulativeMilliseconds'],'detectorElapsedMsSum':sum(row['detector']['elapsedMilliseconds']for row in rows),
 'standingRows':len(standing),'standingDetectorElapsedMsSum':sum(row['detector']['elapsedMilliseconds']for row in standing),'publishedWorkerStepMsSum':sum(row['workerStepMs']for row in rows),
 'publishedWorkerStepMsMedian':statistics.median(row['workerStepMs']for row in rows),'detectorBudgetMilliseconds':report['limits']['detectorMilliseconds'],
 'sphereChecks':{'calls':len(sphereChecks),'nearTrianglesTotal':sum(sphereChecks),'callsWithZeroNearTriangles':sum(value==0 for value in sphereChecks),'scope':'V3 recomputes all seven current spheres twice per standing row; near count is after every active indexed triangle AABB scan.'},
 'standingGeometryCounts':{key:{'minimum':min(row['loft'][key]for row in standing),'maximum':max(row['loft'][key]for row in standing)}for key in('slices','vertices','indices')},
 'firstPhaseSteps':{phase:next((row['step']for row in rows if row['ride']['phase']==phase),None)for phase in('push','landing','standing')},
 'causalLimit':'Published worker-step sums and detector cumulative time are not a complete partition of the whole wall interval. Startup, native/browser transport, drawing, guard capture/verification and other work were not separately recorded. Classifier domination is unsupported; exact dominant cause remains unproved.',
 'candidatePolicy':'Keep classifier, witness checks, acceptance, controls and byte guards unchanged. Add per-phase observer timings before deciding an optimization.'}
(W/'observer-cost-audit.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({key:result[key]for key in('steps','ownerElapsedSeconds','detectorCumulativeMsLastRow','standingRows','publishedWorkerStepMsSum','sphereChecks')},indent=2))
