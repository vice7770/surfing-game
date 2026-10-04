from pathlib import Path
import hashlib,json,subprocess,tarfile,io,difflib
W=Path('/private/tmp/contact-lazy-height-20261004');S=W/'scratch';ROOT=Path('/Users/regina/Desktop/Projects/surfing-game')
BASE='58ceb6a29617c00f93fb3b21eff3058d824319d5'
sha=lambda b:hashlib.sha256(b).hexdigest()
archive=subprocess.check_output(['git','archive',BASE,'src','package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html','scripts/browser/cdp.mjs'],cwd=ROOT)
with tarfile.open(fileobj=io.BytesIO(archive)) as t:original={m.name:t.extractfile(m).read() for m in t.getmembers() if m.isfile()}
owned=['src/game/SurfZoneWorkerCore.ts','src/game/surfZoneWorker.ts','src/wave/contactDemandQa.ts','src/wave/contactDemandQa.test.ts']
paths=sorted({*original,*owned});sources=[];patch=''
for path in paths:
 data=(S/path).read_bytes();before=original.get(path)
 changed=before!=data
 assert not changed or path in owned,path
 sources.append({'path':path,'bytes':len(data),'sha256':sha(data),'baselineSha256':sha(before) if before is not None else None,'owned':path in owned,'unchangedAsArchived':not changed})
 if changed:patch+=''.join(difflib.unified_diff((before or b'').decode().splitlines(True),data.decode().splitlines(True),fromfile='a/'+path if before is not None else '/dev/null',tofile='b/'+path))
(W/'observer.patch').write_text(patch)
buildpaths=sorted([p for p in (S/'dist').rglob('*') if p.is_file() and (p.suffix in ['.js','.css'] or p.relative_to(S/'dist').as_posix() in ['index.html','build.json'] or p.relative_to(S/'dist').as_posix().startswith('barrels/'))])
build=[{'path':p.relative_to(S/'dist').as_posix(),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in buildpaths]
assert json.loads((S/'dist/build.json').read_text())=={'build':'58ceb6a29'}
prepnames=['intent.md','prepared-plan.md','adapter.mjs','count-summary.mjs','count-summary.test.mjs','tests.log','summary-tests.log','build.log','typecheck.log','tests-v2-invalid-fixture.log','typecheck-v1-invalid-test-types.log','observer.patch','freeze.py']
preparation=[{'path':p,'bytes':(W/p).stat().st_size,'sha256':sha((W/p).read_bytes())} for p in prepnames]
audits=[]
for path in ['/private/tmp/contact-demand-strip-feasibility-20261004.md','/private/tmp/contact-eager-unused-work-20261004.md','/private/tmp/contact-owned-height-provider-20261004.md']:
 p=Path(path);audits.append({'path':path,'sha256':sha(p.read_bytes())})
manifest={'schema':1,'base':BASE,'docsOnlyPreparationOrigin':'7ec1fe3c48b1c2fc9101e02456fa3837a0af5659','sourceExtraction':'git archive src/config/helper only; public and node_modules symlinked; no full repository copy','runtimeOwned':owned[:3],'testOwned':owned[3:],'sources':sources,'unownedCount':sum(not r['owned'] for r in sources),'allUnownedAsArchived':all(r['unchangedAsArchived'] for r in sources if not r['owned']),'sourceClosureSha256':sha(json.dumps(sources,sort_keys=True,separators=(',',':')).encode()),'build':build,'buildClosureSha256':sha(json.dumps(build,sort_keys=True,separators=(',',':')).encode()),'worker':next(r for r in build if r['path'].startswith('assets/surfZoneWorker-')),'main':next(r for r in build if r['path'].startswith('assets/index-') and r['path'].endswith('.js')),'literalBuildId':'58ceb6a29','preparation':preparation,'auditReferences':audits,'checks':{'observer':'7/7 pure tests, actual original eager classes; final tests.log','summary':'4/4 pure tests; summary-tests.log','typescript':'npm run build includes strict tsc -b; no failures','vite':'BUILD_ID=58ceb6a29 npm run build passed; build.log','syntax':'node --check adapter.mjs and count-summary.mjs passed','noHardwareRun':True,'noProductionChanges':True},'pending':['root frozen source/adapter review','one separately leased hardware demand capture','offline original eager fixture/query parity','any later complete-path cost/prototype authorization']}
(W/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'manifestSha256':sha((W/'manifest.json').read_bytes()),'patchSha256':sha((W/'observer.patch').read_bytes()),'sources':len(sources),'unownedCount':manifest['unownedCount'],'worker':manifest['worker'],'main':manifest['main'],'buildFiles':len(build),'audits':audits},indent=2))
