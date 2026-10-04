from pathlib import Path
import hashlib,json,difflib
W=Path('/private/tmp/surf-tube-rowband-diagnostic-20261004'); P=Path('/private/tmp/surf-tube-rowband-native-20261004')
def pin(p,relative=False):
 b=p.read_bytes(); return {'path':p.name if relative else str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
parent=json.loads((P/'ready.json').read_bytes())
oldnames=['entry.ts','cameras.json','tsconfig.json','authority.mjs','build.mjs','device-gate.mjs','PLAN.md','ready.json','compiled.json','cpu-proof-freeze.json','checks-first/before.json','checks-first/after.json','checks-first/commands.json','checks-first/terminal.json','root-native-first/report.json']
oldnames += [str(p.relative_to(P)) for p in sorted((P/'checks-first').glob('*.log'))]
refs=[pin(P/n) for n in oldnames]
compiled=json.loads((P/'compiled.json').read_text()); refs += compiled['records']
seen={r['path']:r for r in parent['borrowedRecords']}
for r in refs:
 if r['path'] in seen and seen[r['path']]['sha256']!=r['sha256']:raise Exception('Original alias conflict')
 seen[r['path']]=r
patch=''.join(''.join(difflib.unified_diff((P/n).read_text().splitlines(True),(W/n).read_text().splitlines(True),fromfile='original-native/'+n,tofile='diagnostic/'+n)) for n in ['entry.ts','authority.mjs','build.mjs','device-gate.mjs'])
(W/'derivation.patch').write_text(patch)
(W/'derivation.json').write_text(json.dumps({'schema':'rowband-first-frame-diagnostic-derivation/v1','parentReady':pin(P/'ready.json'),'parentCompiled':pin(P/'compiled.json'),'firstFailure':pin(P/'root-native-first/report.json'),'oldCpuBeforeAfterIdentical':True,'canonicalRuntimeModified':False,'runtimeAssetCaptureCloned':False,'parentCameraTsconfigExact':True,'ownedSourceOnly':True,'sourceChanges':['Entry firstframe/fixed repeat/full/alias/restore controls and passive capture','Driver retain raw/PNG before all comparisons and40s owned bounds','Authority env/new independent WORK','Build macro/title/metadata only'],'captureHashedOrDecoded':False,'oldNativeStandaloneConsoleFile':'No standalone file exists in root-native-first; report retains native.stderr/targets/failure/closure. Parent tool console remains parent-owned.'},indent=2)+'\n')
ready={k:v for k,v in parent.items() if k not in ['schema','ownedRecords','borrowedRecords','scope','execution','limits']}
ready.update({'schema':'rowband-first-frame-diagnostic-source-ready/v1','ownedRecords':[pin(W/n,True) for n in ['entry.ts','cameras.json','tsconfig.json','authority.mjs','build.mjs','device-gate.mjs','PLAN.md','derivation.patch','derivation.json']],'borrowedRecords':list(seen.values()),'parentFailedReadySha256':pin(P/'ready.json')['sha256'],'parentCompiledSha256':pin(P/'compiled.json')['sha256'],'parentNativeFailureSha256':pin(P/'root-native-first/report.json')['sha256'],'scope':{'step':664,'view':0,'pointId':3,'jetStrip':2,'arms':2,'baselineDraws':3,'candidateDraws':6,'normalDraws':9,'rawRGBAFiles':9,'losslessPNGs':9,'maskFiles':2,'normalFramebufferBytesEach':2073600,'waterSetupsPerContext':1,'causticRendersPerContext':1,'solverSteps':0,'serverPort':4226,'cdpPort':9636,'offPort':4200,'untouchedPort':5173,'nativeBoundMs':40000},'execution':{k:False for k in ['imports','strict','build','syntax','unarmed','native','captureHashOrDecompression']},'limits':['Diagnostic captures/differences are evidence; valid execution does not mean exact pixel/quality/FPS acceptance. No tolerance.','Step664/view0 only; fixed optics/source. No solver or ID/world/depth program.','Material-current shader metadata is passive post-scene; shared Rich repair may be last user.','Original failed gate and raw source/log bytes remain immutable SHA-bound references.','Known capture pins carried without reading/hashing/decompressing33MBgzip during source prep.']})
(W/'ready.json').write_text(json.dumps(ready,indent=2)+'\n')
for n in ['ready.json','entry.ts','device-gate.mjs','PLAN.md','derivation.patch']:
 print(json.dumps(pin(W/n)))
