#!/usr/bin/env python3
"""Verify retained archive only; never import or replay game/native helpers."""
import datetime, gzip, hashlib, json, math, pathlib, sys, time, traceback

ROOT = pathlib.Path(__file__).resolve().parent
CAP = 33554432
started = time.monotonic()
checks = []
result = {'schema':'zero-mask-fps-archive-verification/v1','valid':False,'checks':checks,
          'fpsAcceptance':False,'causalGuardBenefit':False,'tubeQualityPass':False,'adoption':False,
          'scope':'Durable retained evidence integrity and descriptive raw analysis only. Full592 production source/current copies and49 compiled bodies are omitted metadata-only pins. No complete runtime dependency closure, game/helper replay, native process, raster decoding, FPS threshold, causal speedup or tube quality claim.'}

def need(ok, why):
    if not ok: raise AssertionError(why)

def done(name, **kw): checks.append({'check':name,'valid':True,**kw})

def digest(body): return hashlib.sha256(body).hexdigest()

def quantile(values, at):
    values = sorted(values)
    return values[min(len(values)-1,math.floor(at*len(values)))] if values else 0

def near(a,b,tolerance=1e-8): return abs(a-b) <= tolerance

try:
    m = json.loads((ROOT/'manifest.json').read_text())
    outcome = json.loads((ROOT/'outcome.json').read_text())
    analysis = json.loads((ROOT/'late-analysis-first.json').read_text())
    need(m['schema']=='zero-mask-fps-archive/v1' and m['fullProductionSourceRetained'] is False and m['fullCompiledBodiesRetained'] is False, 'Archive scope differs')
    need(m['completeRuntimeReplayClosure'] is False, 'Omitted runtime closure mislabeled')
    blobs = {}
    for blob in m['payloads']:
        p = (ROOT/blob['storedPath']).resolve()
        need(p.is_relative_to(ROOT) and p.is_file() and not p.is_symlink(), 'Invalid stored payload path')
        stored = p.read_bytes()
        need(len(stored)==blob['storedBytes'] and digest(stored)==blob['storedSha256'],'Stored payload byte/hash mismatch')
        need(blob['encoding'] in ('gzip','identity'), 'Unknown payload encoding')
        if blob['encoding']=='gzip':
            with gzip.open(p,'rb') as f: original=f.read(8388609)
            need(len(original)<=8388608,'Decoded retained JSON bound exceeded')
        else: original=stored
        need(len(original)==blob['bytes'] and digest(original)==blob['sha256'],'Original byte roundtrip mismatch')
        need(blob['id'] not in blobs,'Duplicate payload id')
        blobs[blob['id']]=original
    labels={}
    bypath={}
    for alias in m['aliases']:
        need(alias['label'] not in labels,'Duplicate archive label')
        need(alias['payload'] in blobs,'Archive alias unresolved')
        body=blobs[alias['payload']]
        need(len(body)==alias['bytes'] and digest(body)==alias['sha256'],'Archive alias identity differs')
        labels[alias['label']]=body
        if alias['originalPath'] in bypath: need(bypath[alias['originalPath']]==body,'Original-path byte aliases differ')
        bypath[alias['originalPath']]=body
    for rec in m['plainSources']:
        body=(ROOT/rec['path']).read_bytes()
        need(len(body)==rec['bytes'] and digest(body)==rec['sha256'],'Verifier/analysis/recipe source differs')
    need(m['counts']['aliases']==len(labels) and m['counts']['payloads']==len(blobs),'Manifest inventory counts differ')
    need(m['counts']['storedPayloadBytes']==sum(x['storedBytes'] for x in m['payloads']),'Stored payload count differs')
    read=lambda label:json.loads(labels[label])
    ready,binding,report,driver = (read(x) for x in ('authority/ready.json','authority/bindings.json','native/report.json','native/driver.json'))
    fps,raw,launcher,audit = (read(x) for x in ('native/fps.json','native/raw-samples.json','native/launcher.json','native/native-audit.json'))
    def retained_pin(pin):
        body=bypath.get(pin['path'])
        need(body is not None and len(body)==pin['bytes'] and digest(body)==pin['sha256'],'Required retained pin unresolved: '+pin['path'])
    retained_pin(binding['ready']); retained_pin(report['ready']); retained_pin(report['binding'])
    for pin in ready['helpers']+ready['originalMeter']+[ready['originalDriver'],ready['cdp'],ready['borrowed']]+binding['receipts']+[binding['reference']]+report['artifacts']+[driver['log'],driver['nativeReport']]: retained_pin(pin)
    need(digest(labels['authority/ready.json'])==driver['readySha256']==m['readySha256'],'Frozen ready differs')
    need(digest(labels['authority/bindings.json'])==driver['bindingsSha256']==m['bindingsSha256'],'Frozen binding differs')
    need(len(ready['helpers'])==9 and len(ready['sourceFiles'])==len(ready['sourceCopies'])==592 and len(binding['compiledFiles'])==49,'Frozen inventory differs')
    need(ready['compiledFiles']==binding['compiledFiles'],'Compiled pins differ')
    current={x['path'].split('/surfing-game/',1)[1]:(x['bytes'],x['sha256']) for x in ready['sourceFiles']}
    copies={x['path'].split('/source/',1)[1]:(x['bytes'],x['sha256']) for x in ready['sourceCopies']}
    need(current==copies and len(current)==592,'Source/copy metadata maps differ')
    omitted=m['omissions']
    need(omitted['currentProductionSources']['count']==592 and omitted['frozenProductionCopies']['count']==592 and omitted['compiledBodies']['count']==49,'Explicit omitted inventory differs')
    for group,key in [('currentProductionSources','sourceFiles'),('frozenProductionCopies','sourceCopies'),('compiledBodies','compiledFiles')]:
        need(omitted[group]['pins']==ready[key] and omitted[group]['retained'] is False,'Omitted byte pins differ')
    gates=read('gates/root-helper-checks.json')
    need(gates['valid'] is True and gates['helperSyntaxFresh'] is True and gates['readySha256']==m['readySha256'],'First helper gate receipt invalid')
    for command in gates['commands']:
        need(command['exitCode']==0,'Original first helper command failed')
        retained_pin({'path':command['log'],'bytes':command['logBytes'],'sha256':command['logSha256']})
    for label in ('gates/root-type-first.json','gates/root-build-first.json'):
        obs=read(label);need(obs['valid'] is True and obs['result']['exit_code']==0,'First current type/build tool observation invalid')
        need('recordedAt' in obs and 'startedAt' not in obs and 'endedAt' not in obs,'First tool observation timestamps invented')
    need(read('gates/root-build-first.json')['buildId']==binding['buildId']==fps['build']=='1099ddaa1-zero-mask-working','Actual working-tree build label differs')
    need(fps['commit']=='working-tree-1099ddaa1','Original meter commit label changed')
    done('retained-byte-aliases-helpers-gates-and-explicit-runtime-omissions',payloads=len(blobs),aliases=len(labels),sourcePins=592,sourceCopyPins=592,compiledPins=49)

    need(binding['valid'] is True and report['valid'] is True and report['incomplete'] is False and report['authorityUnchangedAfter'] is True,'Original successful native evidence differs')
    need(all(report[k] is False for k in ('fpsAcceptance','qualityPass','adoption')),'Harness validity promoted to acceptance')
    plan=read('helpers/plan.json')
    need(report['plan']==plan and plan['sampleSeconds']==90 and plan['warmSeconds']==5,'Original native plan differs')
    compiled={x['relativePath']:x for x in binding['compiledFiles']}
    for row in report['servedGETs']:
        p=compiled.get(row['relativePath'])
        need(p is not None and row['completed'] is True and (row['bytes'],row['sha256'])==(p['bytes'],p['sha256']),'Actual completed GET body identity differs')
    need(report['serving']['setupBodyBytes']==sum(p['bytes'] for p in compiled.values()),'Prehashed response-body accounting differs')
    need(binding['worker']==fps['artifact']['worker'] and any(r['relativePath']==binding['worker'] for r in report['servedGETs']),'Actual served worker missing')
    for rec in fps['artifact']['verified']+fps['artifact']['files']:
        need(compiled[rec['file']]['sha256']==rec['sha256'],'Meter served bundle receipt differs')
    for rel in ['barrels/pad19-a20-l12.bin','barrels/pad19-a30-l12.bin','barrels/pad19-a45-l12.bin','barrels/periodic-padang19s-l12.bin']:
        need(any(r['relativePath']==rel for r in report['servedGETs']),'Actual public case receipt missing')
    need(fps['valid'] is True and fps['nativeAudit']==audit and audit['valid'] is True and len(audit['observations'])==3,'Native meter/audit validity differs')
    need([x['phase'] for x in audit['observations']]==['menu','sample-start','sample-end'],'Ordinary observation phases differ')
    for obs in audit['observations']:
        a=obs['actual'];need(a['inner']==[1708,879] and a['canvas']==[2989,1538] and a['dpr']==2 and a['graphics']==fps['ordinary']['graphics'],'Native tuple/High graphics differs')
        if obs['phase']!='menu':
            need(a['config']==plan['expectedConfig'] and a['compute']=='gpu' and a['cells']==116000 and a['maxBatchSteps']==1 and a['maxQueuedSteps']==6 and a['renderSpacing']==2 and a['maskSpacing']==1,'Ordinary rider/grid/queue configuration differs')
            worker=a['actualWorker'];start=worker['starts'][0]
            need(worker['url']=='http://127.0.0.1:4259/'+binding['worker'] and worker['badAdvances']==0 and worker['interventions']==[] and worker['lastSteps']==1,'Passive worker identity/idle one-step evidence differs')
            need(len(worker['starts'])==1 and start['rider']['value'] is True and start['soloOneStep']['value'] is True and len(start['cases'])==4,'Actual rider worker start differs')
    need(launcher['ownedChromeClosed'] is True and launcher['resizeOverrides']==[] and launcher['portProof']=={'closed':True,'reason':'ECONNREFUSED'},'Original launcher closure differs')
    need(driver['valid'] is True and driver['exitCode']==0 and driver['nativeValid'] is True and driver['nativeIncomplete'] is False and driver['independentClosureValid'] is True,'Independent native closure invalid')
    need(driver['processGroupCreatedByThisDriver'] is True and driver['pid']==driver['processGroup']==report['ownedServer']['pid'] and driver['membersAfterCleanup']==[],'Owned fresh process-group evidence differs')
    need(driver['commandSeconds']==175 and driver['cleanupSeconds']==5 and driver['wholeSeconds']==180 and driver['elapsedSeconds']<=175 and driver['cleanupElapsedSeconds']<=5,'Independent command/cleanup/whole bounds differ')
    for phase in ('prePorts','postPorts'):
        for port in ('4259','9669'):need(driver[phase][port]=={'closed':True,'reason':'ECONNREFUSED'},'Owned TCP closure differs')
        need(driver[phase]['5173']=={'closed':False,'reason':'TCP accepted'},'Unrelated5173 read-only witness differs')
    native_labels=['native/'+n for n in ('fps.json','raw-samples.json','native-audit.json','launcher.json','native.log','report.json')]
    total=sum(len(labels[n]) for n in native_labels)
    logtotal=len(labels['native/native.log'])+len(labels['native/driver.log'])
    need(total==report['budgets']['nativeOutputBytes']==driver['nativeOutputBytes'],'Exact native serialized output accounting differs')
    need(total+len(labels['native/driver.log'])+len(labels['native/driver.json'])==driver['wholeOutputBytes']<=402653184,'Whole native output cap/accounting differs')
    need(logtotal==driver['totalLogBytes']<=1048576 and len(labels['native/native.log'])<=524288 and len(labels['native/driver.log'])<=524288 and len(labels['native/driver.json'])<=131072,'Native/supervisor split log and receipt budgets differ')
    done('actual-served-worker-public-cases-ordinary-guards-independent-closure-and-native-budgets',completedGETs=len(report['servedGETs']),nativeOutputBytes=total,wholeOutputBytes=driver['wholeOutputBytes'],combinedLogBytes=logtotal,driverElapsedSeconds=driver['elapsedSeconds'])

    need(analysis['valid'] is True and analysis['endpoints']==raw['endpoints']==report['sample']['endpoints'],'First late-analysis endpoints differ')
    fr,pub=raw['frames'],raw['snapshots'];origin=raw['endpoints']['startedAt'];end=raw['endpoints']['endedAt']
    need(end-origin>=90000 and raw['frameColumns']==['intervalMs','drawCalls','callbackWorkMs','triangles','callbackTimestampMs'],'Raw90-second callback timing differs')
    need(all(len(f)==5 and all(math.isfinite(v) for v in f) for f in fr),'Invalid raw callback row')
    need(all(a[4]<b[4] for a,b in zip(fr,fr[1:])) and all(a['wall']<b['wall'] for a,b in zip(pub,pub[1:])),'Raw timestamp ordering differs')
    need(all(origin<=f[4]<=end for f in fr) and all(origin<=p['wall']<=end for p in pub),'Raw sample endpoint coverage differs')
    intervals=[];since=0;had=False
    for f in fr:
        since+=f[0]
        if f[1]<=0:continue
        if had:intervals.append(since)
        had=True;since=0
    whole=analysis['whole'];row=fps['results'][0]
    need(len(fr)==row['frames']==whole['callbackRows']==report['sample']['frames'] and len(pub)==row['publicationEvents']==whole['publicationRows']==report['sample']['publications'],'Raw/report sample counts differ')
    drawn=sum(f[1]>0 for f in fr);frame_span=sum(f[0] for f in fr)/1000;pubspan=(pub[-1]['wall']-pub[0]['wall'])/1000;advance=pub[-1]['sea']-pub[0]['sea']
    need(drawn==row['renderedFrames']==whole['drawnCallbackIntervals'] and near(drawn/frame_span,whole['renderedFpsUnrounded']),'Original drawn cadence formula differs')
    need(near(advance*60/pubspan,whole['physicsStepsPerWallSecondUnrounded']) and near(whole['renderedFrameMsP95Unrounded'],quantile(intervals,.95)) and near(whole['renderedFrameMsMaxUnrounded'],max(intervals)),'Whole raw physics/render interval derivation differs')
    need(abs(drawn/frame_span-row['renderedFps'])<=.051 and abs(advance*60/pubspan-row['physicsStepsPerWallSecond'])<=.051,'Original rounded whole metrics differ')
    need(abs(quantile(intervals,.95)-row['renderedFrameMsP95'])<=.0051 and abs(max(intervals)-row['renderedFrameMsMax'])<=.051,'Original rounded rendering tail differs')
    need([x['fromSeconds'] for x in analysis['windows']]==[45,80] and [x['toSeconds'] for x in analysis['windows']]==[60,90] and plan['lateWindowsSeconds']==[[45,60],[80,90]],'Predeclared late windows differ')
    for w in analysis['windows']:
        a,b=w['fromSeconds'],w['toSeconds'];lower,upper=origin+a*1000,origin+b*1000
        callbacks=[f for f in fr if lower<=f[4]<upper];publications=[p for p in pub if lower<=p['wall']<upper]
        drawcount=sum(f[1]>0 for f in callbacks);span=(publications[-1]['wall']-publications[0]['wall'])/1000;sea=publications[-1]['sea']-publications[0]['sea']
        need(w['halfOpen'] is True and w['lowerWallMs']==lower and w['upperWallMs']==upper and w['callbackRows']==len(callbacks) and w['publicationRows']==len(publications),'Late-window membership differs')
        need(w['drawnCallbackIntervals']==drawcount and near(w['drawnFps'],drawcount/(b-a)) and near(w['physicsStepsPerWallSecond'],sea*60/span),'Independent half-open late cadence formulas differ')
        need(w['firstPublicationWallMs']==publications[0]['wall'] and w['lastPublicationWallMs']==publications[-1]['wall'] and w['firstSeaTime']==publications[0]['sea'] and w['lastSeaTime']==publications[-1]['sea'],'Late publication endpoints differ')
    need(outcome['lateAnalysis']==analysis and outcome['nativeHarnessValid'] is True and all(outcome[k] is False for k in ('fpsAcceptance','causalGuardBenefit','tubeQualityPass','adoption','completeRuntimeReplayClosure')),'Derived outcome scope/results differ')
    done('independent-raw-whole-and-predeclared-half-open-late-window-analysis',sampleWallSeconds=(end-origin)/1000,wholeRenderedFps=row['renderedFps'],wholePhysicsStepsPerSecond=row['physicsStepsPerWallSecond'],lateDrawnFps=[w['drawnFps'] for w in analysis['windows']],latePhysicsStepsPerSecond=[w['physicsStepsPerWallSecond'] for w in analysis['windows']])
    files=[p for p in ROOT.rglob('*') if p.is_file()]
    need(sum(p.stat().st_size for p in files)<=CAP,'32MiB archive cap exceeded')
    need(sum(p.stat().st_size for p in files if p.suffix=='.log')<=1048576,'1MiB archive log cap exceeded')
    result.update(valid=True,retainedEvidenceIntegrity=True,archiveBytesAtVerification=sum(p.stat().st_size for p in files),payloads=len(blobs),aliases=len(labels),nativeHarnessValid=True)
except BaseException as error:
    result['firstFailure']=type(error).__name__+': '+str(error)
    result['traceback']=traceback.format_exc()[-8192:]
result['elapsedSeconds']=time.monotonic()-started
result['endedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
body=(json.dumps(result,indent=2)+'\n').encode();need(len(body)<=131072,'128KiB verifier result cap exceeded')
if len(sys.argv)>1:
    with pathlib.Path(sys.argv[1]).open('xb') as f:f.write(body)
print(body.decode(),end='')
sys.exit(0 if result['valid'] else 1)
