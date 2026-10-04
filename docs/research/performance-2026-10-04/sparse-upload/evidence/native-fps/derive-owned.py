#!/usr/bin/env python3
"""Text-only preparation. No game import, syntax check, build, server or browser."""
from pathlib import Path
import difflib, hashlib, json

WORK = Path('/private/tmp/surf-sparse-upload-fps-20261004')
ORIGIN = Path('/private/tmp/contact-height-demand-fps-20261004')
OLD_BUILD = Path('/private/tmp/contact-height-demand-build-20261004')
BASE = '6f321d704269f9f1afc73750ab2b1f4a86f61122'
BUILD_ID = '6f321d704-qa-sparse-upload'
records = []

def rec(path):
 raw=path.read_bytes(); return {'path':str(path),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
def put(name,raw):
 p=WORK/name
 if p.exists(): raise RuntimeError('Refuse existing source '+str(p))
 p.write_bytes(raw.encode() if isinstance(raw,str) else raw)
def derive(name,changes,origin=ORIGIN):
 p=origin/name; original=p.read_text(); text=original; ops=[]
 for label,old,new,expected in changes:
  actual=text.count(old)
  if actual!=expected: raise RuntimeError(f'{name} {label}: {actual} != {expected}')
  text=text.replace(old,new)
  ops.append({'label':label,'exactMatches':actual,'before':old,'after':new})
 put(name,text)
 put(name+'.diff',''.join(difflib.unified_diff(original.splitlines(True),text.splitlines(True),fromfile=str(p),tofile=str(WORK/name))))
 records.append({'name':name,'original':rec(p),'derived':rec(WORK/name),'changes':ops})

for name in ['survey.mjs','survey.patch','derivation.json','public-assets.json']:
 put(name,(ORIGIN/name).read_bytes()); records.append({'name':name,'original':rec(ORIGIN/name),'derived':rec(WORK/name),'byteIdentical':True})
derive('native-owned.mjs',[
 ('launcher evidence environment','CONTACT_FPS_LAUNCHER_REPORT','SPARSE_FPS_LAUNCHER_REPORT',1),
 ('owned profile label','breakline-contact-height-fps-','breakline-sparse-upload-fps-',1),
 ('retain selected actual sole page','const pages = list.filter((entry) => entry.type === \'page\');','evidence.lastTargetInventory = list;\n        const pages = list.filter((entry) => entry.type === \'page\');',1),
 ('retain target before connecting','page = await Page.connect(target.webSocketDebuggerUrl);','evidence.selectedTarget = target; save();\n    page = await Page.connect(target.webSocketDebuggerUrl);',1),
])
derive('passive-guard.mjs',[
 ('worker binding environment','CONTACT_FPS_EXPECTED_WORKER','SPARSE_FPS_EXPECTED_WORKER',1),
 ('predeclared exact native tuple guard',"fail('Native High backing/DPR differs');", "fail('Native High backing/DPR differs');\n    if (actual.inner[0] !== 1708 || actual.inner[1] !== 879 || actual.canvas[0] !== 2989 || actual.canvas[1] !== 1538) fail('Predeclared native CSS/backing tuple differs; no resize or fallback');",1),
])
derive('pair.mjs',[
 ('owned FPS directory',str(ORIGIN),str(WORK),1),
 ('owned build directory',str(OLD_BUILD),str(WORK),1),
 ('complete accepted source rather than older import closure',"armSource && armSource.files.length === 246, 'Exact literal source closure absent'", "armSource && armSource.files.length === armSource.fileCount && armSource.fileCount > 246, 'Complete accepted source authority absent'",1),
 ('build arm schema','contact-height-build-arm/v1','sparse-upload-build-arm/v1',1),
 ('same existing explicit BUILD_ID','68e263250-qa-contact-height',BUILD_ID,1),
 ('compiled launch-ready artifact','const readyPath = join(WORK, \'ready.json\');','const readyPath = join(WORK, \'launch-ready.json\');',1),
 ('reviewed launch binding environment','CONTACT_HEIGHT_FPS_READY_SHA256','SPARSE_FPS_LAUNCH_READY_SHA256',1),
 ('experiment report schema','contact-height-passive-pair/v1','sparse-upload-passive-pair/v1',1),
 ('baseline ports','port: 4216, cdp: 9626','port: 4219, cdp: 9629',1),
 ('candidate ports','port: 4217, cdp: 9627','port: 4220, cdp: 9630',1),
 ('launcher report environment','CONTACT_FPS_LAUNCHER_REPORT','SPARSE_FPS_LAUNCHER_REPORT',1),
 ('worker binding environment','CONTACT_FPS_EXPECTED_WORKER','SPARSE_FPS_EXPECTED_WORKER',1),
])
derive('build-only.mjs',[
 ('owned directory',str(OLD_BUILD),str(WORK),1),
 ('common existing BUILD_ID','68e263250-qa-contact-height',BUILD_ID,1),
 ('prepared ready binding environment','CONTACT_HEIGHT_BUILD_READY_SHA256','SPARSE_FPS_READY_SHA256',1),
 ('ready stage','source-ready; strict/build/hardware unexecuted','source-ready; strict/build/syntax/dryplan/hardware unexecuted',1),
 ('build terminal schema','contact-height-two-arm-build-terminal/v1','sparse-upload-two-arm-build-terminal/v1',1),
 ('arm schema','contact-height-build-arm/v1','sparse-upload-build-arm/v1',1),
],OLD_BUILD)
plan=json.loads((ORIGIN/'plan.json').read_text())
plan.update(schema='sparse-upload-passive-fps-plan/v1',stage='source-only; no checks/builds/dryplan/server/browser executed',purpose='One prospective accepted6f3 versus exact8-path sparse-only native passive pair; no adoption',directory=str(WORK),runtimeBaseline=BASE,documentationHeadAtBuildPreparation=None,buildDirectory=str(WORK),commonBuildId=BUILD_ID)
for arm,port,cdp in zip(plan['arms'],[4219,4220],[9629,9630]):
 arm.update(port=port,cdp=cdp,url=f'http://127.0.0.1:{port}/?diagnostics',manifest=str(WORK/arm['name']/'build-manifest.json'))
plan['window'].update(reference='Exact predeclared CSS1708x879/browserDPR2/backing2989x1538; stable native inner/outer/client/bounds through sample',noCanonicalCssDimensionsClaim=False,exactCss=[1708,879],exactBacking=[2989,1538])
plan['limits'][-1]='Exact native tuple is required; different display/window chrome aborts without resizing, retry or substitute tuple.'
put('plan.json',json.dumps(plan,indent=2)+'\n')
put('bindings.json',json.dumps({'schema':'sparse-upload-fps-bindings/v1','pending':True,'scope':'Complete source extracted and reviewed before strict/build. Compiled arm binding deferred; no hardware allowed.','literalBuildId':BUILD_ID},indent=2)+'\n')
put('derivation-owned.json',json.dumps({'stage':'text-only; derived modules unexecuted','records':records,'survey':'byte-identical inherited successful native survey; all numerical statistics, settings/load, passive sample and menu/ride/quit preserved','nativeGuardDelta':'Only add requested exact native CSS/backing tuple; no resizing or setup repair','launcherDelta':'Environment/profile label and retain actual sole-page inventory/selection; no route/timing changes'},indent=2)+'\n')
print(json.dumps({'textPrepared':True,'files':len(records),'checksExecuted':False,'directory':str(WORK)}))
