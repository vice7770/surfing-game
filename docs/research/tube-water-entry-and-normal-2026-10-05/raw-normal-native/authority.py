"""Direct immutable authority only: immediate143 source/build/graph, fresh outputs, nine helpers."""
from pathlib import Path
import hashlib,json,re
W=Path('/private/tmp/tube-board-raw-normal-native-20261005');S=W/'source'
C=Path('/private/tmp/tube-board-raw-normal-native-prep-20261005')
P=Path('/private/tmp/tube-board-rhs-components-native-20261005')
B=Path('/private/tmp/tube-board-raw-normal-build-20261005')
BUILD_ID='tube-board-raw-normal-20261005';CHANGED=['src/physics/BoardBody.ts']
EXTRA='docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json'
def record(p):
 p=Path(p);b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def pin(q):
 p=Path(q['file']);assert p.is_file(),'Missing immutable file '+str(p)
 b=p.read_bytes();assert len(b)==q['bytes'] and hashlib.sha256(b).hexdigest()==q['sha256'],'Immutable file changed '+str(p)
 return b
def load(q):return json.loads(pin(q))
def words(q):return q['bytes'],q['sha256']
def preparation():
 f=json.loads((C/'freeze.json').read_text());assert f['schema']=='board-raw-normal-source-preparation-freeze/v1' and f['sourceOnly'] and f['rootExecutionPending']
 assert len(f['pins'])==len({q['file']for q in f['pins']})
 for q in f['pins']:pin(q)
 i=json.loads((C/'inputs.json').read_text());assert i['schema']=='board-raw-normal-preparation-inputs/v1' and i['immediateParent']==str(P)
 for key in ('parentManifest','parentCompleteBuild','parentDiagnosticBuild','parentNative','parentOwner','observerFields','candidateOverride','parentAliasWrapper'):pin(i[key])
 for q in i['helpers']+i['parentBuildScripts']:pin(q)
 for q in i['compilerToolInputs']:pin(q)
 assert len(i['helpers'])==9 and len({q['file']for q in i['helpers']})==9
 assert i['candidateOverride']['file']=='/private/tmp/tube-board-raw-normal-trial-20261005/source/src/physics/BoardBody.ts'
 return f,i
def source_authority():
 f,i=preparation();a=json.loads((W/'source-readiness.json').read_text())
 assert a['schema']=='board-raw-normal-source-readiness/v1' and a['complete'] and a['frozen']
 assert a['sourceDirectory']==str(S) and a['sourceCount']==588 and a['applicationSourceCount']==587 and a['unchangedParentInputs']==587
 assert a['buildId']==BUILD_ID and a['runtimeChangedPaths']==CHANGED and a['physicalDifferenceIntentional'] is True
 assert a['parentManifest']==i['parentManifest'] and a['candidateOverride']==i['candidateOverride']
 assert a['preparationInputs']==record(C/'inputs.json') and a['preparationFreeze']==record(C/'freeze.json')
 m=load(a['sourcePinsManifest']);old=load(a['parentManifest']);d=load(a['sourceDelta'])
 assert m['schema']=='board-raw-normal-source-pins/v1' and old['schema']=='board-rhs-components-source-pins/v1'
 assert m['count']==old['count']==len(m['pins'])==len(old['pins'])==588
 rows={q['path']:q for q in m['pins']};prior={q['path']:q for q in old['pins']};assert len(rows)==len(prior)==588 and set(rows)==set(prior)
 assert [r for r in sorted(rows)if rows[r]!=prior[r]]==CHANGED
 for relative,q in rows.items():
  assert not Path(relative).is_absolute() and '..' not in Path(relative).parts
  pin(dict(file=str(S/relative),bytes=q['bytes'],sha256=q['sha256']))
  pin(dict(file=str(P/'source'/relative),bytes=prior[relative]['bytes'],sha256=prior[relative]['sha256']))
 assert words(rows[CHANGED[0]])==words(i['candidateOverride'])
 assert d['schema']=='board-raw-normal-source-delta/v1' and d['parentManifest']==i['parentManifest'] and d['source']==str(S) and d['sourceCount']==588 and d['unchangedParentInputs']==587
 assert d['overrides']==[{'path':r,'before':prior[r],'after':rows[r]}for r in CHANGED]
 assert a['candidateRuntimePins']==[record(S/CHANGED[0])]
 assert a['observerFields']==record(W/'observer-fields.json') and pin(a['observerFields'])==pin(i['observerFields'])
 fields=load(a['observerFields']);assert len(fields['oldFields'])==102 and len(fields['newFields'])==41
 assert fields['allFields']==fields['oldFields']+fields['newFields'] and len(set(fields['allFields']))==143 and fields['availabilityMarker']=='standingTrialAvailable'
 cpu=load(a['rootCPUResult']);assert a['rootCPUResult']['file']==i['controlledCPUPath']
 assert cpu['schema']=='board-raw-normal-root-controlled-checks/v1' and cpu['complete'] and cpu['sourcePostUnchanged']
 assert cpu['sourceCount']==588 and cpu['unchangedParentInputs']==587 and cpu['runtimeChangedPaths']==CHANGED
 checks={q['name']:q for q in cpu['checks']};assert set(checks)=={'strict','targeted'} and all(q['exitCode']==0 and not q['timedOut']for q in checks.values())
 assert checks['targeted']['success'] and checks['targeted']['passed']==checks['targeted']['total']==7 and checks['targeted']['failed']==0
 for q in cpu['checkInputs']:pin(q)
 for q in checks.values():
  pin(q['log'])
  if 'report'in q:pin(q['report'])
 for key,root,expected in [('sourceInputs',Path('/private/tmp/tube-board-raw-normal-trial-20261005/source'),rows),('oracleInputs',P/'source',prior)]:
  assert len(cpu[key])==len({q['file']for q in cpu[key]})==588
  wanted={str(root/r):q for r,q in expected.items()}
  assert {q['file']for q in cpu[key]}==set(wanted)
  for q in cpu[key]:pin(q);assert words(q)==words(wanted[q['file']])
 pin(a['rootBaseCopy']);replay=load(a['replayReference']);assert a['replayReference']['file']==str(W/'replay-reference.json') and a['replayReference']['bytes']<=1024*1024
 assert replay['schema']=='board-raw-normal-replay-reference/v1' and replay['rootExtractedFromDirectReports'] and replay['noHistoricalHelperInventories']
 assert {k:replay['references']['v4']['initial']['config'][k]for k in ('seed','componentCount','dx','fineSpacing')}=={'seed':6238,'componentCount':64,'dx':2,'fineSpacing':1}
 return a,rows,i,fields
def workers(build,fields):
 for prefix in ('WorkerSurfZone-','surfZoneWorker-'):
  assets=[q for q in build['assetPins']if Path(q['file']).name.startswith(prefix)and q['file'].endswith('.js')];assert len(assets)==1
  text=pin(assets[0]).decode();assert all(re.search(r'(?<![\w$])'+re.escape(word)+r'(?![\w$])',text)for word in fields['allFields'])
def complete_build():
 a,rows,i,fields=source_authority();b=json.loads((W/'root-complete-build-result.json').read_text())
 assert b['schema']=='board-raw-normal-root-complete-build/v1' and b['terminal'] and b['exitCode']==0 and b['sourceUnchangedAfterBuild']
 assert b['source']==str(S) and b['buildId']==BUILD_ID and b['readiness']==record(W/'source-readiness.json')
 assert b['actualRootCPU']==a['rootCPUResult'] and b['preparationInputs']==a['preparationInputs']
 command=load(b['rootApplicationCommand']);assert b['rootApplicationCommand']['file']==str(B/'root-command-result.json')
 assert command['schema']=='board-raw-normal-root-application-command/v1' and command['complete'] and command['terminal'] and command['exitCode']==0 and command['sourceUnchanged']
 assert command['prebuild']==record(B/'root-prebuild.json')
 mod=Path('/Users/regina/Desktop/Projects/surfing-game/node_modules')
 expected=[('strict-build',['/opt/homebrew/bin/node',str(mod/'typescript/bin/tsc'),'-b']),('application',['/opt/homebrew/bin/node',str(mod/'vite/bin/vite.js'),'build'])]
 assert [(q['name'],q['argv'])for q in command['checks']]==expected and all(q['exitCode']==0 and not q['timedOut']for q in command['checks'])
 for q in command['checks']:pin(q['log'])
 wanted=[dict(file=str(S/r),bytes=q['bytes'],sha256=q['sha256'])for r,q in sorted(rows.items())if r!=EXTRA]
 assert b['sourcePins']==wanted and len(wanted)==587
 D=W/'candidate-complete-dist';assert b['frozenDist']==str(D)and b['assetPins']==b['frozenAssetPins'] and len(b['assetPins'])==49
 for q in b['sourcePins']+b['assetPins']+b['builtAssetPins']+b['generatedOutputPins']:pin(q)
 actual={str(p)for p in D.rglob('*')if p.is_file()};assert actual=={q['file']for q in b['assetPins']}
 assert len(b['builtAssetPins'])==21 and len(b['generatedOutputPins'])==1 and b['generatedOutputPins'][0]['file']==str(S/'tsconfig.tsbuildinfo')
 sourceFiles={str(S/r)for r in rows};extras={q['file']for q in b['builtAssetPins']+b['generatedOutputPins']};assert len(extras)==22 and not sourceFiles&extras
 assert {str(p)for p in S.rglob('*')if p.is_file()and'node_modules'not in p.relative_to(S).parts}==sourceFiles|extras
 for q in b['builtAssetPins']:assert Path(q['file']).is_relative_to(S/'dist')
 assert b['immediateParentStaticAssetsBuild']==i['parentCompleteBuild'];prior=load(i['parentCompleteBuild'])
 assert prior['schema']=='board-rhs-components-root-complete-build/v1'and prior['terminal']and prior['exitCode']==0 and len(prior['assetPins'])==49
 parentassets={q['file']:q for q in prior['assetPins']};assets={str(Path(q['file']).relative_to(D)):q for q in b['assetPins']}
 built={str(Path(q['file']).relative_to(S/'dist'))for q in b['builtAssetPins']};additional=set();c=b['staticComposition']
 assert c['newBuildAssets']==21 and c['additionalStaticAssets']==28 and c['identicalOverlap']==2 and not c['sourceRuntimeCodeChanged']and not c['rebuildPerformed']and c['partialBuildPreserved']
 assert len(c['references'])==28 and len(c['overlap'])==2
 for q in b['builtAssetPins']:assert words(q)==words(assets[str(Path(q['file']).relative_to(S/'dist'))])
 for r in c['references']+c['overlap']:
  q=r['source'];next=r.get('frozenCopy',r.get('sameBuiltAsset'));assert q==parentassets[q['file']]and next==assets[r['relative']];pin(q);pin(next);assert words(q)==words(next)
  assert q['file']==str(P/'candidate-complete-dist'/r['relative'])
  assert any(r['relative'].startswith(d+'/')for d in ('assets/audio','assets/skies','assets/surfers','lessons'))
  if 'frozenCopy'in r:additional.add(r['relative']);assert r['relative']not in built
  else:assert r['relative']in built
 assert len(additional)==28 and set(assets)==built|additional and load(assets['build.json'])['build']==BUILD_ID
 pin(b['rootPartialBuildResult']);pin(b['rootOriginalBuildResult']);pin(b['rootBuildOutputPin']);workers(b,fields)
 return b,a,rows,i,fields
def diagnostic(build,a,rows,i,fields):
 d=json.loads((W/'root-diagnostic-build-result.json').read_text());assert d['schema']=='board-raw-normal-diagnostic-root-build/v1' and d['terminal']and d['exitCode']==0
 assert d['source']==str(S)and d['sourceReadiness']==record(W/'source-readiness.json')and d['rootCompleteBuild']==record(W/'root-complete-build-result.json')
 assert d['immediateParentDiagnosticBuild']==i['parentDiagnosticBuild'];parent=load(i['parentDiagnosticBuild'])
 assert parent['schema']=='board-rhs-components-diagnostic-root-build/v1' and parent['source']==str(P/'source') and len(parent['inputs'])==74 and len(parent['sourceInputs'])==71
 assert d['entry']==record(W/'autopilot-entry.ts')and d['module']==record(W/'diagnostic-autopilot.mjs')
 assert pin(d['entry']).decode()==pin(parent['entry']).decode().replace(parent['source'],str(S))
 assert len(d['inputs'])==len({q['file']for q in d['inputs']})==74 and len(d['sourceInputs'])==71
 mapped=[]
 for q in parent['inputs']:
  file=str(W/'autopilot-entry.ts')if q['file']==parent['entry']['file']else str(S)+q['file'][len(parent['source']):]if q['file'].startswith(parent['source']+'/')else q['file']
  mapped.append(str(Path(file).resolve()))
 assert sorted(q['file']for q in d['inputs'])==sorted(mapped)
 assert d['sourceInputs']==[q for q in d['inputs']if q['file'].startswith(str(S)+'/')]
 source={str(S/r):q for r,q in rows.items()}
 for q in d['inputs']:
  pin(q)
  if q['file']in source:assert words(q)==words(source[q['file']])
 assert d['compilerWatchedInputCount']==75 and d['compilerConfigurationInputs']==[record(S/'tsconfig.json')]
 assert d['changedSourceInputsAgainstImmediateParent']==CHANGED and d['boardBodyReachable']and d['attachedRiderReachable']and d['originalGraphMappedExactly']
 assert sorted(d['moduleExports'])==['Autopilot','autopilotView','riderPartVolumes']and d['actualNewDiagnosticSourceCompiled']and not d['diagnosticModuleCopiedFromPrior']
 assert d['compilerWrapper']==record(W/'build-diagnostic.mjs')and d['compilerWrapperRevision']=='node-alias-v2';pin(d['compilerEntry'])
 for r in d['historicalAliasResolutions']:
  assert r['recordedPin']=={'file':'/opt/homebrew/bin/node','bytes':61838736,'sha256':'dad9bfeb954abae3c4af3767909df6ca1b83dc29a61539d2a023605f35afc48e'}and r['exactHistoricalAliasOnly']and r['recordedBytesAndShaVerified']
  pin(r['recordedPin']);pin(r['canonicalPin']);assert words(r['recordedPin'])==words(r['canonicalPin'])and r['aliasRealpath']==str(Path(r['recordedPin']['file']).resolve())==r['canonicalPin']['file']
 assert len(d['historicalAliasResolutions'])<=1
 assert d['observerFields']==a['observerFields']and d['observerFieldCount']==143
 text=pin(d['module']).decode();count=sum(bool(re.search(r'(?<![\w$])'+re.escape(word)+r'(?![\w$])',text))for word in fields['allFields']);assert count==d['diagnosticLexicalObserverFieldCount']
 assert not d['sourceOrCompleteDistModified']and d['separateDiagnosticRoute']=='/diagnostic-autopilot.mjs'and d['completeBuildAssetCountUnchanged']==49 and d['noHistoricalHelperInventoriesLoaded']
 return d
def sealed(arm):
 body=(W/'seal.json').read_bytes();assert len(body)<=1024*1024;seal=json.loads(body)
 assert seal['schema']=='board-raw-normal-root-seal/v1'and seal['complete']and arm=='candidate'
 build,a,rows,i,fields=complete_build();d=diagnostic(build,a,rows,i,fields)
 assert seal['preparationFreeze']==record(C/'freeze.json')and seal['sourceReadiness']==record(W/'source-readiness.json')
 assert seal['rootDiagnosticBuild']==record(W/'root-diagnostic-build-result.json')and seal['diagnosticModule']==d['module']and seal['replayReference']==a['replayReference']
 assert seal['helperPins']==i['helpers']
 for q in seal['immutableInputsAndOutputs']:pin(q)
 ready=load(seal['helperReadiness']);assert ready['schema']=='board-raw-normal-root-readiness/v1'and ready['complete']and ready['frozen']and ready['resourcesStarted']is False
 assert ready['actualAppBuildAccepted']and ready['actualDiagnosticBuildAccepted']and ready['controlledCPUAccepted']and ready['helperAcceptance']
 checks=load(ready['rootHelperChecks']);assert checks['schema']=='board-raw-normal-root-helper-checks/v1'and checks['complete']
 assert set(checks['checks'])=={'nativeSyntax','diagnosticWrapperSyntax','sourceOnlyOwner'}
 for q in checks['checks'].values():assert q['run']and q['exitCode']==0;pin(q['log'])
 expected={'node':'/opt/homebrew/bin/node','chrome':'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}
 for key,path in expected.items():assert seal['environment'][key]['file']==path;pin(seal['environment'][key])
 armdata=seal['arms'][arm];assert armdata['rootAuthorized']and armdata['dist']==str(W/'candidate-complete-dist')and armdata['sourcePins']==build['sourcePins']and armdata['assetPins']==build['assetPins']and armdata['buildId']==BUILD_ID and armdata['rootBuildManifest']==record(W/'root-complete-build-result.json')
 assert seal['limits']=={'wholeSeconds':660,'commandSeconds':648,'nativeSeconds':635,'startupMilliseconds':180000,'cleanupSeconds':7,'reportBytes':32*1024*1024,'traceBytes':24*1024*1024,'ownedPorts':[4301,9711],'protectedPorts':[4310,4311,4312,4313]}
 return seal,armdata,W/'candidate-complete-dist',hashlib.sha256(body).hexdigest()
