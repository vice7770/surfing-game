from pathlib import Path as _FreezePath
import json as _FreezeJson
_freeze_record=_FreezePath('/private/tmp/tube-bounded-c-stable-x-sampling-20261005/readiness.json')
if _freeze_record.exists() and _FreezeJson.loads(_freeze_record.read_text()).get('frozen'):
 raise SystemExit('Frozen candidate: generation/test scripts must not rewrite its inputs or evidence; use verify.py only.')
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,difflib,shutil,subprocess
w=Path('/private/tmp/tube-bounded-c-stable-x-sampling-20261005');s=w/'source';parent=Path('/private/tmp/tube-bounded-c-carrier-support-20261004/source')
def pin(p):
 b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def write(p,j):p.write_text(json.dumps(j,indent=2)+'\n')
old=json.loads((w/'parent-source-pins.json').read_text())['pins'];changed=[]
for q in old:
 b=(parent/q['path']).read_bytes();assert len(b)==q['bytes'] and hashlib.sha256(b).hexdigest()==q['sha256'],q['path']
 if (s/q['path']).read_bytes()!=b:changed.append(q['path'])
assert sorted(changed)==sorted(['src/wave/barrel/sweptLoft.ts','src/wave/barrel/crestRays.ts','src/wave/barrel/carrierSupport.test.ts']),changed
new=['src/wave/barrel/stableXSampling.test.ts','src/wave/barrel/stableXStress.test.ts']
assert not any((parent/n).exists() for n in new)
runtime=['src/wave/barrel/crestRays.ts','src/wave/barrel/sweptLoft.ts'];tests=['src/wave/barrel/carrierSupport.test.ts',*new]
for name,files in [('runtime.patch',runtime),('tests.patch',tests)]:
 diff=[]
 for f in files:
  a=(parent/f).read_text().splitlines(keepends=True) if (parent/f).exists() else []
  b=(s/f).read_text().splitlines(keepends=True)
  diff.extend(difflib.unified_diff(a,b,fromfile='a/'+f if a else '/dev/null',tofile='b/'+f))
 (w/name).write_text(''.join(diff))
patchroot=w/'patch-verification-source';patchroot.mkdir(exist_ok=True)
for f in runtime+tests:
 out=patchroot/f;out.parent.mkdir(parents=True,exist_ok=True)
 if (parent/f).exists():out.write_bytes((parent/f).read_bytes())
 elif out.exists():out.unlink()
patchcommands=[]
for name in ['runtime.patch','tests.patch']:
 cmd=['patch','--batch','--forward','-p1','-d',str(patchroot),'-i',str(w/name)]
 r=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/(name+'.verify-output.txt')).write_bytes(r.stdout)
 patchcommands.append({'argv':cmd,'exitCode':r.returncode,'output':pin(w/(name+'.verify-output.txt'))});assert r.returncode==0,r.stdout
patchchecks=[]
for f in runtime+tests:
 assert (patchroot/f).read_bytes()==(s/f).read_bytes(),f
 patchchecks.append({'path':f,'patched':pin(patchroot/f),'candidate':pin(s/f),'exact':True})
write(w/'patch-verification.json',{'schema':'stable-X-five-file-patch-verification/v1','complete':True,'commands':patchcommands,'checks':patchchecks,'scope':'Only two changed runtime files plus one changed/new two test files; not reconstruction of the entire source/build or tube-quality proof.'})
pins=[]
for f in sorted([q['path'] for q in old]+new):
 p=pin(s/f);pins.append({'path':f,'bytes':p['bytes'],'sha256':p['sha256']})
write(w/'source-pins.json',{'schema':'bounded-C-stable-X-source-pins/v1','sourceRoot':str(s),'count':len(pins),'pins':pins})
shutil.copyfile('/private/tmp/tube-carrier-stable-sampling-design-20261004/design.md',w/'design-reference.md')
# Explicit actual read-only fixture/old-parent source dependencies. No native or model rerun.
external=[Path('/private/tmp/tube-bounded-c-carrier-support-20261004/handoff-fixture.json'),Path('/private/tmp/tube-parallel-carrier-handoff-audit-20261004/analysis.json'),Path('/private/tmp/tube-carrier-release-stress-20261004/stress.test.ts'),Path('/private/tmp/tube-carrier-release-stress-20261004/readiness.json'),Path('/private/tmp/tube-carrier-stable-sampling-design-20261004/design.md')]
phys=Path('/private/tmp/tube-bounded-c-parallel-physics-20261004/readiness.json');pj=json.loads(phys.read_text());pp=[]
for q in pj['sourcePins']:
 p=Path(pj['sourceRoot'])/q['path'];b=p.read_bytes();assert len(b)==q['bytes'] and hashlib.sha256(b).hexdigest()==q['sha256'],str(p)
 pp.append(q)
write(w/'external-inputs.json',{'schema':'stable-X-readonly-external-inputs/v1','inputs':[pin(p) for p in external],'unchangedOldRawComparatorSource':{'readiness':pin(phys),'sourceRoot':pj['sourceRoot'],'pinsVerified':len(pp)},'unchangedCarrierParent':{'readiness':pin(w/'parent-readiness.json'),'originalReadiness':pin(parent.parent/'readiness.json'),'sourcePins':pin(w/'parent-source-pins.json'),'originalSourcePins':pin(parent.parent/'source-pins.json'),'originalPinsVerified':len(old)},'measuredStressScope':'Only the two return distances are measured inputs. Controlled clocks, coordinates/bases and CPU substrate are synthetic, not native state replay.'})
# Preserve the initial failed expectation record, and distinguish later actual passing checks.
h=json.loads((w/'validation-history.json').read_text());h['complete']=True;h['new14SamplerStressTestsPassed']=True;h['history'].append({'kind':'honest boundary reclassification','rawX':15,'intrinsicFadeBefore':0,'intrinsicFadeAfter':0,'fixedStation':16.192875862121582,'stationRelocated':False,'endpointPairNowRequires':'joined phase2 overturned pair and positive interpolated original fixed-X roof, with legacy sealed first row explicitly zero','originalFailureUnchanged':pin(w/'carrier-handoff-original-failure.json'),'toleranceWidened':False})
h['finalDurableCommands']=pin(w/'final-command-receipt.json');h['uniqueFocusedPassingTests']=101;h['uniqueFocusedPassingComposition']={'previouslyObservedUnchangedSamplerRayClearRoof':76,'finalCarrier':9,'finalNewSampler':11,'finalNewStress':5};h['fullSuiteClaim']=False
write(w/'validation-history.json',h)
checks=json.loads((w/'final-command-receipt.json').read_text());assert checks['complete'] and all(q['exitCode']==0 for q in checks['commands'])
for file,count in [('sampler-stress-vitest.json',16),('carrier-vitest.json',9)]:
 j=json.loads((w/file).read_text());assert j['numPassedTests']==count and j['numFailedTests']==0 and j['success'],file
summary={'schema':'bounded-C-stable-X-freeze-preflight/v1','complete':True,'checkedAtUTC':datetime.now(timezone.utc).isoformat(),'parentPinsVerifiedUnchanged':len(old),'priorRawComparatorPinsVerifiedUnchanged':len(pp),'sourceCount':len(pins),'runtimeFiles':runtime,'testFiles':tests,'sourcePins':pin(w/'source-pins.json'),'runtimePatch':pin(w/'runtime.patch'),'testsPatch':pin(w/'tests.patch'),'patchVerification':pin(w/'patch-verification.json'),'resourcesStarted':False,'buildRun':False,'nativeRun':False,'readyForSourceFreeze':True}
write(w/'freeze-preflight.json',summary)
print(json.dumps(summary,indent=2))
