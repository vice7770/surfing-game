#!/usr/bin/env python3
"""Offline stream-start preparation checks; never arms any owner."""
from pathlib import Path
import ast,datetime,hashlib,json,re,shutil,subprocess
ROOT=Path('/Users/regina/Desktop/Projects/surfing-game');WORK=Path('/private/tmp/tube-whole-curl-stream-start-20261004');OLD=Path('/private/tmp/tube-whole-curl-fixed-view-20261004');FIRST=Path('/private/tmp/tube-whole-curl-native-20261004')
checks=[]
def check(name,value):checks.append({'name':name,'passed':bool(value)});assert value,name
def receipt(path):
 body=path.read_bytes();return {'path':str(path),'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest()}
def section(s,start,end):
 a=s.index(start);return s[a:s.index(end,a)]
node=shutil.which('node');check('Node syntax-only present',bool(node))
for name in ('native.mjs','native-owned.mjs','ray-faces.mjs','handshake-source-check.mjs'):
 r=subprocess.run([node,'--check',str(WORK/name)],capture_output=True,text=True,timeout=10);check(name+' syntax',r.returncode==0)
for name in ('run.py','verify-stream-source.py'):ast.parse((WORK/name).read_text());check(name+' AST syntax',True)
s=(WORK/'native.mjs').read_text();old=(OLD/'native.mjs').read_text()
for name in ('SETTINGS','OVERRIDES','GRAPHICS'):
 pattern=rf'const {name} = .*?;';check(name+' exact fixed-view source',re.search(pattern,s,re.S).group()==re.search(pattern,old,re.S).group())
for a,b in (('  function finiteDrawnLoft(', '  async function beginVideo('),('  async function captureVideoFrame(', '  window.__wholeCurl=')):
 check('Unchanged fixed target/ordinary/remaining-video mechanics '+a.strip(),section(s,a,b)==section(old,a,b))
check('1047 settle exact',"__wholeCurl.steps(1047)" in s)
check('One choose',s.count('__wholeCurl.choose()')==1)
check('One initial motion entry from handshake','report.video=videoStart;report.motionFrames.push(initialMotionFrame)' in s)
check('Outer duplicate settled request removed',"let observation=await page.eval('__wholeCurl.observe(0)')" not in s)
check('Ordinary60 / PNG18,30,60 retained','physicalStepIndex<=60' in s and 'const pngIndices=[18,30,60];' in s)
check('No opacity/visibility assignments',not re.search(r'\.(?:visible|opacity)\s*=(?!=)',s))
r=subprocess.run(['python3',str(WORK/'run.py'),'--arm','candidate'],capture_output=True,text=True,timeout=10);check('Dry owner exits',r.returncode==0);plan=json.loads(r.stdout)
check('Dry owner starts no resources',plan['sourceOnlyPlan'] and plan['resourcesStarted'] is False)
check('Same owned/user ports',[plan['ports'],plan['untouchedUserPorts']]==[[4290,9700],[4310,4311]])
check('Same deadlines',[plan[k] for k in ('wholeSeconds','commandSeconds','cleanupSeconds')]==[180,168,7])
prior=json.loads((WORK/'prior-fixed-view-preparation.json').read_text());built=[]
for e in prior['copiedDistFiles']:
 src=Path(e['path']);dest=WORK/'dist'/src.relative_to(OLD/'dist');check('Frozen copy '+str(dest.relative_to(WORK)),receipt(src)['sha256']==e['sha256']==receipt(dest)['sha256']);built.append(receipt(dest))
check('Exactly49 built files',len(built)==len([p for p in (WORK/'dist').rglob('*') if p.is_file()])==49)
check('Build ID retained',json.loads((WORK/'dist/build.json').read_text())=={'build':'tube-whole-curl-descending-20261004-513ad9d39'})
paths=[p for p in (ROOT/'src').rglob('*') if p.is_file() and not p.name.endswith('.test.ts')]+[p for p in (ROOT/'public').rglob('*') if p.is_file()]
paths += [ROOT/name for name in ('package.json','package-lock.json','index.html','vite.config.ts','tsconfig.json','tsconfig.app.json','tsconfig.node.json') if (ROOT/name).is_file()]
production={str(p.relative_to(ROOT)):receipt(p) for p in sorted(set(paths))};check('All328 production/public/build inputs unchanged',production==json.loads((WORK/'prior-production-source.json').read_text()) and len(production)==328)
(WORK/'production-source-now.json').write_text(json.dumps(production,indent=2)+'\n')
failures=[]
for prefix,work in (('target-qualification',FIRST),('recorder-start-timeout',OLD)):
 entries=[receipt(p) for p in sorted(work.rglob('*')) if p.is_file()];check(prefix+' original whole work unchanged',entries==json.loads((WORK/(prefix+'-work-before.json')).read_text()));(WORK/(prefix+'-work-after.json')).write_text(json.dumps(entries,indent=2)+'\n')
 files=[]
 for srcname,dstname in (('native-first/report.json','report.json'),('native-first/launcher.json','launcher.json'),('native-first-owner.json','owner.json'),('native-first-owner.log','owner.log')):
  src=work/srcname;dst=WORK/(prefix+'-'+dstname);check(prefix+' exact failure '+dstname,src.read_bytes()==dst.read_bytes());files.append(receipt(dst))
 failure=json.loads((work/'native-first/report.json').read_text());failures.append({'originalWork':str(work),'exactFirstFailure':failure['firstFailure'],'copiedReceipts':files,'originalWholeWorkBefore':receipt(WORK/(prefix+'-work-before.json')),'originalWholeWorkAfter':receipt(WORK/(prefix+'-work-after.json'))})
check('Whole candidate diff retained',(WORK/'production-model.diff').read_bytes()==(OLD/'production-model.diff').read_bytes())
cdp=json.loads((WORK/'original-source-manifest.json').read_text())['sharedCdpHelper'];check('SharedCDP helper unchanged',receipt(Path(cdp['path']))==cdp)
r=subprocess.run([node,str(WORK/'handshake-source-check.mjs')],capture_output=True,text=True,timeout=10);check('Both extracted startup handshake checks pass',r.returncode==0)
handshake=json.loads((WORK/'handshake-source-checks.json').read_text());check('Handshake checks no native resources',handshake['complete'] and handshake['resourcesStarted'] is False)
validation={'schema':'tube-whole-curl-stream-start-source-checks/v1','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'complete':True,'sourceOnly':True,'resourcesStarted':False,'checks':checks,'dryOwnerPlan':plan,'startupHandshakeChecks':receipt(WORK/'handshake-source-checks.json')}
(WORK/'source-checks.json').write_text(json.dumps(validation,indent=2)+'\n')
original=json.loads((WORK/'original-preparation.json').read_text());head=subprocess.run(['git','rev-parse','HEAD'],cwd=ROOT,text=True,capture_output=True,check=True,timeout=5).stdout.strip()
prep={'schema':'tube-whole-curl-stream-start-preparation/v1','complete':True,'preparedForRootSingleInvocation':True,'nativeInvocations':0,'browserLaunches':0,'serverLaunches':0,'newBuilds':0,
 'frozenBuildId':'tube-whole-curl-descending-20261004-513ad9d39','frozenProductionHead':original['head'],'currentHead':head,
 'copiedDistFiles':built,'copiedDistBytes':sum(e['bytes'] for e in built),'productionSourceDrift':{},'productionSourceHashPin':receipt(WORK/'production-source-now.json'),'wholeCandidateProductionDiff':receipt(WORK/'production-model.diff'),
 'sourceFiles':[receipt(WORK/name) for name in ('native.mjs','native-owned.mjs','ray-faces.mjs','run.py','verify-stream-source.py','handshake-source-check.mjs','README.md')],
 'failuresPreserved':failures,'startupHandshakeChecks':receipt(WORK/'handshake-source-checks.json'),'sourceChecks':receipt(WORK/'source-checks.json'),'sharedCdpHelper':cdp,
 'repair':'recorder.start -> normal render -> initial requestFrame(request1) before awaiting onstart; retain initial observe0 as first motion entry; remove duplicate outer initial request;61total/60advances.',
 'targetPolicy':'Original fixed front48/sigma32.379207311/time/camera; inventory and nullable diagnostic selection unchanged; target missing/unqualified is not a tube pass.',
 'finiteRootCommand':['python3',str(WORK/'run.py'),'--run','--arm','candidate','--out',str(WORK/'native-first')],
 'ownership':'Only new scratch preparation and future owned4290/9700 group; both original works, production and user4310/4311 untouched.',
 'parentFinalValidation':original['parentFinalValidation']}
(WORK/'preparation.json').write_text(json.dumps(prep,indent=2)+'\n')
print(json.dumps({'complete':True,'sourceOnly':True,'resourcesStarted':False,'checks':len(checks),'copiedDistFiles':len(built),'productionInputs':len(production),'bothOriginalWorksUnchanged':True,'preparation':str(WORK/'preparation.json')}))
