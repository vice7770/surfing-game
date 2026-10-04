from pathlib import Path
import json,hashlib,difflib
W=Path('/private/tmp/surf-tube-rowband-moving-native-20261004');D=Path('/private/tmp/surf-tube-rowband-diagnostic-20261004')
def pin(p,rel=False):
 b=p.read_bytes(); return {'path':str(p.relative_to(W)) if rel else str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
p=json.loads((D/'ready.json').read_text());borrowed={r['path']:r for r in p['borrowedRecords']}
refs=[D/n for n in ['ready.json','entry.ts','authority.mjs','build.mjs','device-gate.mjs','PLAN.md','repair.patch','derivation.patch','derivation.json','compiled.json','checks-second/before.json','checks-second/after.json','checks-second/commands.json','checks-second/terminal.json','root-native-first/report.json']]
refs += sorted((D/'checks-second').glob('*.log'))
for f in refs:borrowed[str(f)]=pin(f)
oldcompiled=json.loads((D/'compiled.json').read_text())
for r in oldcompiled['records']:borrowed[r['path']]=r
report=json.loads((D/'root-native-first/report.json').read_text())
# Known parent-verified binary/PNG hashes carried by reference, without sourceprep rehashing images/raw buffers/capture.
for arm in report['arms']:
 for frame in arm['frames']:
  for kind in ['raw','png']:borrowed[frame[kind]['path']]=frame[kind]
 borrowed[arm['mask']['path']]=arm['mask']
patch=''.join(''.join(difflib.unified_diff((D/n).read_text().splitlines(True),(W/n).read_text().splitlines(True),fromfile='diagnostic/'+n,tofile='moving/'+n)) for n in ['entry.ts','authority.mjs','build.mjs','device-gate.mjs'])
(W/'derivation.patch').write_text(patch)
(W/'derivation.json').write_text(json.dumps({'schema':'moving-rowband-source-derivation/v1','parentDiagnosticReady':pin(D/'ready.json'),'parentDiagnosticCompiled':pin(D/'compiled.json'),'parentDiagnosticNative':pin(D/'root-native-first/report.json'),'parentOriginalGateRetained':p['parentNativeFailureSha256'],'sourceOnly':True,'runtimeFormulaGeometryMaskCameraLightShaderChanges':False,'canonicalRuntimeModified':False,'caseCount':42,'normalDrawCount':168,'contexts':1,'controlSequence':['initial-narrow','repeat-narrow','private-full-after-original-hook','restored-narrow'],'exactTarget':'repeat/full/restored RGBA; original first/repeat differences explicitly reported','largeCaptureRawPNGsRehashedDuringSourcePrep':False},indent=2)+'\n')
r={k:v for k,v in p.items() if k not in ['schema','ownedRecords','borrowedRecords','scope','execution','limits','priorFailedReadySha256','strictFirstAttempt','firstDiagnosticFailure','minimalRepair']}
r.update({'schema':'moving-rowband-same-context-source-ready/v1','ownedRecords':[pin(W/n,True) for n in ['entry.ts','cameras.json','tsconfig.json','authority.mjs','build.mjs','device-gate.mjs','PLAN.md','derivation.patch','derivation.json']],'borrowedRecords':list(borrowed.values()),'parentDiagnosticReadySha256':pin(D/'ready.json')['sha256'],'parentDiagnosticReportSha256':pin(D/'root-native-first/report.json')['sha256'],'scope':{'contexts':1,'stepFirst':664,'stepLast':684,'views':2,'framesPerView':21,'cases':42,'normalDraws':168,'settledExactCasesRequired':42,'firstRepeatMetadataCases':42,'checkpointPNG':16,'failureRawControls':4,'failureMask':1,'readPixelsBytesEach':2073600,'workingPixelBytes':8294400,'waterSetupsPerCase':1,'causticRendersPerCase':1,'solverSteps':0,'serverPort':4227,'cdpPort':9637,'offPort':4200,'untouchedPort':5173,'nativeBoundMs':60000},'execution':{k:False for k in ['imports','strict','build','syntax','unarmed','native','captureHashOrDecompression']},'limits':['Exact settled same-context repeat/full/restored target only, no tolerance; preserve original first-repeat differences separately.','Original first two-context failure is not erased or causally attributed.','One natural small CPU capture/two fixed views; no initial/cross-context/grazing/physics/quality/FPS acceptance.','Runtime/cameras/physical bytes unchanged; only harness same-view range controls.','Known capture and diagnostic binary pins copied from reviewed metadata without large binary rehash/decode in source prep.']})
(W/'ready.json').write_text(json.dumps(r,indent=2)+'\n')
for n in ['ready.json','entry.ts','device-gate.mjs','PLAN.md','derivation.patch']:print(json.dumps(pin(W/n)))
