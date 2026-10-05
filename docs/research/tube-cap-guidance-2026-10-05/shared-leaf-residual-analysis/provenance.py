"""Finite direct pin validation for the offline scripts and completed capture inputs."""
from pathlib import Path
import hashlib,json
W=Path('/private/tmp/tube-shared-leaf-residual-analysis-20261005');C=Path('/private/tmp/tube-shared-leaf-native-v2-20261005')
def pin(p):
 b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def verify(s,p=None):
 p=Path(s['file'])if p is None else p;b=p.read_bytes();assert len(b)==s['bytes']and hashlib.sha256(b).hexdigest()==s['sha256'],str(p)
 return b
inspection=json.loads((W/'inspection.json').read_bytes());decomposition=json.loads((W/'decomposition.json').read_bytes());analysis=json.loads((C/'saved-cap-analysis.json').read_bytes());owner=json.loads((C/'owner.json').read_bytes());report=json.loads((C/'candidate-first/report.json').read_bytes());build=json.loads((C/'build.json').read_bytes())
assert owner['complete']and owner['exitCode']==0 and owner['firstFailure']is None and owner['protectedPreserved']and all(owner['closedPorts'].values())and owner['postExecutionPinsVerified']and not owner['ownedMembersAfterCleanup']
assert report['complete']and report['firstFailure']is None and report['pngCount']==8 and report['stepCount']==0 and report['ownedBrowserClose']
assert analysis['complete']and analysis['epochAndRawPacketExact']
for s in analysis['inputs']:verify(s,C/'candidate-first'/s['file']if not Path(s['file']).is_absolute()else None)
for s in inspection['inputs']+[inspection['script']]+decomposition['inputs']+[decomposition['script']]:verify(s)
currentPins={s['file']:s for s in inspection['inputs']};selected=[]
for s in build['liveSources']:
 if s['file']in currentPins:verify(s);assert s==currentPins[s['file']];selected.append(s)
assert len(selected)==3
casePins=[s for s in build['assets']if '/dist/barrels/'in s['file']and 'pad' in Path(s['file']).name]
assert len(casePins)==4
for s in casePins:verify(s);assert s==currentPins[s['file']]
outputs=[pin(p)for p in sorted(W.iterdir())if p.is_file()and p.name not in ('provenance.json','provenance-run.log')]
out={'schema':'shared-leaf-residual-offline-provenance/v1','complete':True,'script':pin(Path(__file__)),'captureClosedCompleteVerified':True,'captureHandleSuppliedByRoot':None,'savedAnalysisDirectInputPinsVerified':True,'allOfflineInspectionInputPinsVerified':True,'captureSelectedLiveSourcePinsVerified':selected,'capturedCaseAssetPinsVerified':casePins,'actualOfflineExecutions':[{'script':'inspect-pre-nan-fix.py','exitCode':1,'outcome':'NaN-expanded packet serialization failure before inspection output; exact first source preserved.'},{'script':'inspect.py','exitCode':0,'log':'inspection-run-final.log'},{'script':'decompose.py','exitCode':0,'log':'decomposition-run.log'}],'files':outputs,'maximumAbsoluteCapPredictionErrorMeters':max(abs(v)for r in inspection['rows']for v in r['predictionError']),'runtimeCompilerTestPortProductionMutations':False,'scope':'Direct completed capture/source/asset checks and finite saved-word math only; no visual, globalC1, ordinary rider passage, physics or quality acceptance.'}
(W/'provenance.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'complete':True,'provenance':pin(W/'provenance.json'),'files':len(outputs),'selectedLiveSourcePins':len(selected),'caseAssetPins':len(casePins),'maximumCapErrorMeters':out['maximumAbsoluteCapPredictionErrorMeters']}))
