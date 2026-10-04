from pathlib import Path
import json,hashlib,difflib,shutil,subprocess
W=Path('/private/tmp/tube-bounded-c-carrier-support-20261004'); S=W/'source'; P=Path('/private/tmp/tube-bounded-c-parallel-physics-20261004/source')
def dump(path,value): path.write_text(json.dumps(value,indent=2)+'\n')
def pin(path):
 b=path.read_bytes();return {'file':str(path),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def sp(path): return {'path':str(path.relative_to(S)),**{k:v for k,v in pin(path).items() if k!='file'}}
copy=json.loads((W/'parent-copy.json').read_text());parent=copy['sourcePins']
for item in parent:
 assert pin(P/item['path'])['sha256']==item['sha256'],item['path']
assert pin(Path(copy['parentReadiness']['file']))==copy['parentReadiness']
files=sorted(p for p in S.rglob('*') if p.is_file() and 'node_modules' not in p.parts)
sourcepins=[sp(p) for p in files]; paths={x['path']:x for x in sourcepins}; changes=[x['path'] for x in parent if paths[x['path']]['sha256']!=x['sha256']]; added=sorted(set(paths)-{x['path'] for x in parent})
runtime=sorted(changes+['src/wave/barrel/carrierSupport.ts']);tests=['src/wave/barrel/carrierSupport.test.ts']
assert len(changes)==6 and added==['src/wave/barrel/carrierSupport.test.ts','src/wave/barrel/carrierSupport.ts']
for name,entries in [('runtime.patch',runtime),('tests.patch',tests)]:
 text=''
 for n in entries:
  a=(P/n).read_text().splitlines(True) if (P/n).exists() else []
  text+=''.join(difflib.unified_diff(a,(S/n).read_text().splitlines(True),fromfile='a/'+n if a else '/dev/null',tofile='b/'+n))
 (W/name).write_text(text)
V=W/'patch-verification-complete';V.mkdir(exist_ok=False)
for n in runtime+tests:
 if (P/n).exists(): (V/n).parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(P/n,V/n)
commands=[]
for name in ['runtime.patch','tests.patch']:
 for dry in [True,False]:
  command=['patch','-p1',*(['--dry-run'] if dry else []),'-i',str(W/name)]
  r=subprocess.run(command,cwd=V,capture_output=True,text=True);log=W/(name+('.dry-run.log' if dry else '.apply.log'));log.write_text(r.stdout+r.stderr)
  commands.append({'argv':command,'cwd':str(V),'exitCode':r.returncode,'log':pin(log)});assert r.returncode==0,r.stderr
reconstructed=[]
for n in runtime+tests:
 actual=pin(V/n);assert actual['sha256']==paths[n]['sha256'];reconstructed.append({'path':n,'sha256':actual['sha256'],'bytes':actual['bytes']})
dump(W/'source-pins.json',{'schema':'bounded-C-carrier-source-pins/v1','sourceRoot':str(S),'count':len(sourcepins),'pins':sourcepins})
verification={'schema':'bounded-C-carrier-source-verification/v1','complete':True,'parentInputCount':len(parent),'parentInputsUnchanged':True,'parentReadinessUnchanged':True,'candidateCount':len(sourcepins),'changedExistingRuntimeFiles':changes,'addedFiles':added,'unmodifiedParentInputs':len(parent)-len(changes),'runtimePatchReconstruction':commands,'reconstructedFiles':reconstructed,'allReconstructedBytesEqual':True,'frozenOrRepoMutationClaim':False}
dump(W/'verification.json',verification)
r=json.loads((W/'test-result-complete.json').read_text());m=json.loads((W/'test-metrics-complete.json').read_text());assert r['numTotalTests']==97 and r['numPassedTests']==97 and r['numFailedTests']==0
assert (W/'strict-complete.log').read_text()==''
contract={'schema':'bounded-C-carrier-public-history-contract/v1','policy':'bounded-C-incident-support/v1','frontPointField':'carrierSupport','optionalForUnpacedPoint':True,
'fields':{'policy':'exact literal bounded-C-incident-support/v1','atTau':'finite number; exact source point tau at refresh','solverTime':'finite source solver epoch at refresh; held/imported history may precede exported solver epoch','ownPocketAlive':'boolean: point.tau < unchanged point.jetUntil','retainedForGeometry':'boolean: !ownPocketAlive && incidents.some(potentiallyLive)','geometricPaceActive':'boolean: ownPocketAlive || retainedForGeometry','state':'own-pocket | incident-support | released, from those two booleans','incidents':'array of current adjacent increasing-X same-front raw support records; held points have none'},
'incidentFields':{'otherId':'nonnegative integer stable source point identity','front':'nonnegative integer current source component identity','boundSeconds':'finite positive conservative provider retirement bound, seconds','minimumPacketAge':'finite min(endpoint source tau, endpoint Float32 tau); CAN BE NEGATIVE for unformed younger neighbor','potentiallyLive':'boolean minimumPacketAge < boundSeconds','maxScale':'finite positive actual bracket scale bound; includes H/caseA single/clamped case','maxAuthoredTD':'finite positive maximum authored nondimensional touchdown within crossed case/clamp domain','partitions':'positive integer H/D case/clamp partitions'},
'sharedPredicate':'own = jetPace !== undefined && jetUntil !== undefined && tau < jetUntil; geometric = own || (history.policy === bounded-C-incident-support/v1 && history.atTau === tau && history.geometricPaceActive && jetPace !== undefined && jetBase !== undefined)',
'packet':{'stride':9,'paceFieldIndex':8,'carrierPresent':'shared geometric predicate => Float32 jetPace; otherwise NaN','carrierAbsent':'exact old own-pocket conditional => Float32 jetPace; otherwise NaN','otherFieldsUnchanged':True},
'pointPlacement':'while shared geometric predicate holds, z = jetBase + jetPace * tau; fitted tau may advance by more than DT',
'immutableFingerprint':['id','column','x','footHeight','footDepth','throwZ','jetPace','jetBase','jetAt','jetUntil'],
'dynamicFieldsNeverImmutable':['carrierSupport.*','front','sigma','tau','z','seen','crestZ'],
'refreshOrder':[{'source':'src/wave/barrel/BreakingFront.ts:285','meaning':'refresh active supports and isolated held history before crest matching/coast'},{'source':'src/wave/barrel/BreakingFront.ts:422','meaning':'refresh current incidents after link/split'},{'source':'src/wave/SurfZoneSimulation.ts:885','meaning':'tracker then fitted monotone clock advance then crash'},{'source':'src/wave/barrel/SweptCrash.ts:204','meaning':'refresh after original own-pocket watchdog, before geometric component watchdog and pace placement'},{'source':'src/wave/barrel/SweptCrash.ts:268','meaning':'refresh after all new throws are assigned once, before final geometry/air/water processing'}],
'sourceReferences':{'typesAndPredicate':'src/wave/barrel/carrierSupport.ts:4','supportRefresh':'src/wave/barrel/carrierSupport.ts:46','watchdog':'src/wave/barrel/carrierSupport.ts:89','providerBound':'src/wave/barrel/ProfileLibrary.ts:333','packet':'src/wave/barrel/frontRecords.ts:17','trackerPredicate':'src/wave/barrel/BreakingFront.ts:729','exportDeepCopy':'src/wave/barrel/BreakingFront.ts:643','budgetDeadGuard':'src/wave/barrel/sweptLoft.ts:550'},
'publicExport':'read-only deep copy of point/history/incident records; no refresh, clock advance, solver readback, or native actor relocation added',
'identityProof':'Exact ordered point IDs, columns, fixed X, current unique front/join bracket, immutable jet fingerprint remain required. History is dynamic qualification only. Do not equate source and F32 ages or assert DT-age equality.',
'physicalOwnLifetime':'jetUntil, physical live array, jetStrip funding/void/crash/pour/air expiry and original own-pocket watchdog unchanged; support history never extends own pocket',
'watchdog':'If a raw contiguous front still has retained support, every own pocket is expired, and solver time-latestSourceTime >=2*max incident provider bound, remove whole dependent raw component before drawing; latest source epoch=max(jetAt ?? broke). Existing 2-lifetime watchdog factor is reused; not a normal global lease.'}
dump(W/'public-history-contract.json',contract)
limits=['New isolated source experiment, not built, not native captured, not adopted, not merged.',
'Observed-refitted-age CPU handoff fixture only: +0.265180 m endpoint and about +0.1280 m fixed-X joined phase-2 crest/lip/toe. This is not constant-DT motion or new native appearance proof.',
'Conservative incident bound can retain longer than exact provider retirement; no endpoint-max-only or arbitrary seconds allowance. Normal release remains local dependency based.',
'Forced stalled support retirement removes an entire physically expired dependent raw component. It may shorten late geometry; native appearance still requires review.',
'Focused same-front retirement regression measures clock and surviving roof sampling residuals. It does not prove global continuity for every layout/clock refit.',
'RAW parity established for bounded tracker/crash/packet and actual budgeted draw/contact fixtures; no giant query-domain rerun.',
'No browser FPS/performance/adoption/body passage/mouth entrance/tube gameplay claim. New allocations and provider-bound work have not been benchmarked.',
'Physical width/funding remains projected X quadrature. No exact varying-section volume integral claim.',
'Identity columns describe a fixed solver station, not a material particle trajectory. Dynamic support fields never replace immutable identity gates.',
'Public history for held/imported states may have an earlier source solver epoch. Incident minimum age may be negative. Paused/drained native helpers must audit current exported source state without stepping.',
'Parent frozen test imports in the new bounded regression require the retained local parent tree; runtime.patch itself reconstructs portable byte-exact runtime files.']
result={'schema':'bounded-C-carrier-support-result/v1','complete':True,'validation':{'strictTypescript':{'command':'./node_modules/.bin/tsc --noEmit','cwd':str(S),'exitCode':0,'terminalSession':46983,'log':pin(W/'strict-complete.log')},'boundedTests':{'command':'CARRIER_METRICS='+str(W/'test-metrics-complete.json')+' PARALLEL_PHYSICAL_METRICS='+str(W/'physical-metrics-complete.json')+' ./node_modules/.bin/vitest run src/wave/barrel/carrierSupport.test.ts src/wave/barrel/BreakingFront.test.ts src/wave/barrel/SweptCrash.test.ts src/wave/barrel/frontRecords.test.ts src/wave/barrel/sliceClock.test.ts src/wave/barrel/parallelPhysicalCoupling.test.ts --reporter=json --outputFile='+str(W/'test-result-complete.json'),'cwd':str(S),'exitCode':0,'terminalSession':85343,'tests':97,'passed':97,'failed':0,'files':6,'newFocusedTests':9,'report':pin(W/'test-result-complete.json'),'metrics':pin(W/'test-metrics-complete.json'),'physicalMetrics':pin(W/'physical-metrics-complete.json'),'log':pin(W/'test-complete.log')}},'measuredFixture':m['handoff'],'interiorOnly':m['interior'],'budget':m['budget'],'retirement':m['release'],'lifecycle':m['lifecycle'],'stall':m['stall'],'raw':m['raw'],'bounds':m['bounds'],'limits':limits,'buildReadyClaim':False,'nativeReadyClaim':False,'adoptionReady':False,'resourceUse':{'native':False,'browser':False,'ports':False,'build':False,'Git':False,'repoMutation':False,'subagents':False}}
dump(W/'result.json',result)
