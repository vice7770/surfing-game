from pathlib import Path
import gzip,hashlib,json,sys
base=Path(sys.argv[1]); out=Path(sys.argv[2])
assert not out.exists(),str(out)
keys=['renderedFps','freshSnapshotsPerSecond','physicsStepsPerWallSecond','simulationSecondsPerWallSecond','renderedFrameMsP50','renderedFrameMsP95','renderedFrameMsP99','renderedFrameMsMax','renderedTrianglesP50','renderedTrianglesP95','renderedDrawCalls','fps','frameMsP50','frameMsP95','frameMsP99','frameMsMax','mainThreadMsP50','mainThreadMsP95','snapshotIntervalMsP50','snapshotIntervalMsP95','snapshotIntervalMsP99','snapshotIntervalMsMax','drawCalls','pipelineMsP50','pipelineMsP95','physicsStepDeltaDistribution','advancingPublications','freshSnapshots','nonIntegralPhysicsStepDeltas','fixedPhysicsStepSeconds','nativeRasterAndShadersPreserved','nativeQualityPreserved','fullNativeGeometryPreserved','ordinaryConfigMatches','explicitSpacingTrialConfigMatches','comparisonFailures','observed','config']
summary={'schema':1,'method':'Pure extraction of retained passive results and bin-local statistics; no simulation, rendering or timing. Stage quantiles are not summed.','variants':{},'limits':['One adjacent sequential pair; no confidence interval or repeatable/causal speed attribution.','Display/rendered cap and fresh fixed1/60 physics rates are separate.','Passive mainThread fields describe callback work, not the complete asynchronous worker/GPU critical path.','Legacy baseline drawCalls is0 despite held renderInfo36(default)/29(close); retain discrepancy rather than treating zero as real absence.','Late bins are wall-time aligned, not identical sea-state windows; partial final bin excluded from selected late display.','Candidate nativeQualityPreserved/fullNativeGeometryPreserved and both held qualityAccepted remainfalse.','Two held views do not establish cavity, grazing-skirt or moving lifecycle quality.']}
for v in ['baseline','candidate']:
 p=base/(v+'-fps.json.gz'); raw=gzip.decompress(p.read_bytes()); d=json.loads(raw)
 rows=[r for r in d['results'] if 'renderedFps' in r]
 assert len(rows)==1,v
 r=rows[0]; assert r['comparisonFailures']==[] and r['ordinaryConfigMatches'] is True
 h=json.loads((base/(v+'-held-report.json')).read_text())
 assert h['valid'] is True and h['qualityAccepted'] is False
 for f in h['frames']:
  for m in f['observed']['rendererMaterialVersionAccounting']:
   assert m['valid'] and m['rawVersion']==m['expectedRawVersion']
   assert m['expectedIncrement']==2*m['eligibleDoubleSideCalls']
   assert m['rawVersion']==m['normalizedGuardVersion']+m['expectedIncrement']
   assert m['colorObjectCalls']==m['colorMaterialCalls']
   assert m['flags']==m['actualFlags']
 core={k:r[k] for k in keys if k in r}
 selected=[b for b in r['simulationTimeline'] if 76<=b['from']<90]
 summary['variants'][v]={'rawFpsSha256':hashlib.sha256(raw).hexdigest(),'core':core,'allRetainedWallBins':r['simulationTimeline'],'selectedLateWallBins':selected,'held':{'valid':h['valid'],'qualityAccepted':h['qualityAccepted'],'frameCount':len(h['frames']),'invariant':h['invariant'],'repeatPairs':h['repeatPairs'],'views':[{'view':f['view'],'name':f['name'],'clock':f['observed']['seaTime'],'renderInfo':f['observed']['renderInfo'],'tubeNonempty':f['observed']['tubeNonempty'],'waterTubeCount':f['observed']['waterTubeCount'],'waterPatchRect':f['observed']['waterPatchRect']} for f in h['frames']],'lastMaterialLedger':h['frames'][-1]['observed']['rendererMaterialVersionAccounting']}}
summary['singlePairDeltaFreshHz']=round(summary['variants']['candidate']['core']['freshSnapshotsPerSecond']-summary['variants']['baseline']['core']['freshSnapshotsPerSecond'],2)
out.write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({'summaryPath':str(out),'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'freshHzDelta':summary['singlePairDeltaFreshHz'],'frames':[summary['variants'][v]['held']['frameCount'] for v in ['baseline','candidate']]},indent=2))
