#!/usr/bin/env python3
"""Stored bytes, recorded pin closure and stored JSON arithmetic only; no imports/replay/build/game."""
import argparse,gzip,hashlib,json,math,pathlib,statistics,subprocess
A=pathlib.Path(__file__).resolve().parent
REPO=A.parents[3]
sha=lambda b:hashlib.sha256(b).hexdigest()
def check(b,n,h,label):assert len(b)==n and sha(b)==h,label
def close(x,y,label):assert math.isclose(x,y,rel_tol=1e-10,abs_tol=1e-10),label
parser=argparse.ArgumentParser()
parser.add_argument('--originals',action='store_true',help='Require all original scratch, tool and bundle paths to still be available and byte-exact')
parser.add_argument('--git',action='store_true',help='Read immutable committed source/asset blobs; never current source or game code')
args=parser.parse_args()
raw=(A/'manifest.json').read_bytes();m=json.loads(raw);known={};owned={};decoded={};stored_bytes=0
for p in m['payloads']:
    b=(A/p['storedPath']).read_bytes();check(b,p['storedBytes'],p['storedSha256'],p['storedPath']);stored_bytes+=len(b)
    assert b[:3]==b'\x1f\x8b\x08' and b[4:8]==b'\0\0\0\0' and not b[3]&8
    data=gzip.decompress(b);check(data,p['expandedBytes'],p['expandedSha256'],p['storedPath']+' expanded')
    assert len(data)<=2*1024*1024
    for alias in p['originalAliases']:
        check(data,alias['bytes'],alias['sha256'],alias['path']);known[alias['path']]=(alias['bytes'],alias['sha256']);owned[alias['path']]=data
    decoded[p['originalRelativePath']]=data
expected={p['storedPath'] for p in m['payloads']}
assert {str(p.relative_to(A))for p in (A/'evidence').rglob('*')if p.is_file()}==expected
for p in m['generatedRecords']:check((A/p['path']).read_bytes(),p['bytes'],p['sha256'],p['path'])
for p in m['reusedInputs']:
    b=(A/p['storedPath']).read_bytes();check(b,p['storedBytes'],p['storedSha256'],p['storedPath'])
    data=gzip.decompress(b)if p['aliasEncoding']=='gzip-generated'else b
    for alias in p['originalAliases']:check(data,alias['bytes'],alias['sha256'],alias['path']);known[alias['path']]=(alias['bytes'],alias['sha256'])
for p in m['authorityLinks']:check((A/p['path']).read_bytes(),p['bytes'],p['sha256'],p['path'])
for p in m['gitReferences']+m['externalIdentityReferences']:
    for alias in p['originalAliases']:known[alias['path']]=(alias['bytes'],alias['sha256'])
if args.git:
    for p in m['gitReferences']:
        b=subprocess.check_output(['git','show',p['commit']+':'+p['repositoryPath']],cwd=REPO)
        for alias in p['originalAliases']:check(b,alias['bytes'],alias['sha256'],alias['path'])
if args.originals:
    for path,(n,h)in known.items():check(pathlib.Path(path).read_bytes(),n,h,path)
closures=0
def walk(x):
    global closures
    if isinstance(x,dict):
        if {'path','bytes','sha256'}<=x.keys() and x['path'].startswith('/') and not x.get('virtualOnly',False):
            assert known.get(x['path'])==(x['bytes'],x['sha256']),x['path'];closures+=1
        for v in x.values():walk(v)
    elif isinstance(x,list):
        for v in x:walk(v)
for name in m['closureAuthorities']:walk(json.loads(decoded[name]))
summary=json.loads((A/'summary.json').read_text())
if m['kind']=='foam':
    ready=json.loads(decoded['ready.json']);assert ready['canonicalRuntimeCheckpoint']==m['canonicalRuntimeCheckpoint']
    report=json.loads(decoded['cost-first/report.json']);rows=report['rows'];assert len(rows)==32
    values=[]
    for i,r in enumerate(rows):
        assert r['pair']==i and r['order']==['AB','BA','BA','AB'][i%4]
        assert r['baseline']['ticks']==r['candidate']['ticks']==8
        s=(r['baseline']['totalMs']-r['candidate']['totalMs'])/8;close(s,r['savingPerStepMs'],'raw paired step');values.append(s)
    mean=statistics.mean(values);lower=mean-1.96*statistics.stdev(values)/math.sqrt(32)
    close(mean,report['statistics']['meanSavingPerStepMs'],'report mean');close(statistics.median(values),report['statistics']['medianSavingPerStepMs'],'report median');close(lower,report['statistics']['heuristicLower95Ms'],'report lower')
    close(mean,summary['meanSavingPerStepMs'],'summary mean');assert summary['positivePairs']==sum(v>0 for v in values)==8
    for order in ['AB','BA']:
        subset=[r['savingPerStepMs']for r in rows if r['order']==order];close(statistics.mean(subset),summary['orderMeans'][order],'order mean')
    assert not report['valid'] and not report['statistics']['thresholdPass'] and report['strictStop']
    proof=json.loads(decoded['proof-first/report.json']);assert proof['valid'] and len(proof['cases'])==6
    for mode,valid,code in [('checks',True,0),('proof',True,0),('cost',False,1)]:
        t=json.loads(decoded['root-'+mode+'-first/terminal.json']);assert t['valid']==valid and t['pinsUnchanged'];assert all(c['exitCode']==code for c in t['commands'])
    assert report['inputAuthority']['captureIncomplete'] and report['inputAuthority']['f32CommittedExport']
else:
    report=json.loads(decoded['run-first/report.json']);assert report['valid'] and report['originalCaptureValid'] is False and report['originalCaptureIncomplete']
    assert len(report['frames'])==3 and not report['geometryCandidateImplemented']
    eligible=controlled=dominated=0.0
    for f,s in zip(report['frames'],summary['frames']):
        assert f['baselineObservationExactAllArraysAndScalars'] and f['actualDrawnPositionSliceParity'] and f['actualDrawnIndicesRetained']
        rows=f['rows'];formed=sum(r['fullyFormed']for r in rows);full=sum(r['controlledInterior'] and r['finalStoredF32']==1 for r in rows)
        assert len(rows)==28 and formed==9 and full==4 and s['sourceSections']==28 and s['fullyFormed']==9 and s['fullyWeightedControlled']==4
        strips=f['strips'];c=sum(q['length']for q in strips if q['sourceControlledBoth']);e=sum(q['length']for q in strips if q['proposedPolicyEligible']);d=sum(q['length']for q in strips if q['capDominatedBoth'])
        close(c,f['summary']['sourceControlledDrawnSupportMeters'],'controlled strips');close(e,f['summary']['proposedTaperEligibleControlledSupportMeters'],'eligible strips');close(d,f['summary']['capDominatedControlledSupportMeters'],'dominated strips');eligible+=e;controlled+=c;dominated+=d
        assert f['summary']['cutRuns']==0 and f['summary']['sealEvents']==0 and f['summary']['controlledRunsWithNoFullInterior']==0
    assert eligible==0 and dominated/controlled<.2
    d=report['incidenceDecision'];close(controlled,d['controlledSupportMetersSummedAcrossThreeStates'],'controlled total');close(dominated,d['capDominatedSupportMetersSummedAcrossThreeStates'],'dominated total')
    assert d['decision']=='REJECT_AS_NEXT_MAJOR_FIX_IN_THIS_CAPTURE' and not d['visibleCausationProved'] and not d['prematureRetirementProved'] and d['noTaperImplemented']
    terminal=json.loads(decoded['root-first/terminal.json']);assert terminal['valid'] and terminal['pinsUnchanged'] and all(c['exitCode']==0 for c in terminal['commands'])
    assert terminal['physicsSteps']==0 and not terminal['browser'] and not terminal['build']
print(json.dumps({'valid':True,'manifestSha256':sha(raw),'storedPayloads':len(m['payloads']),'storedPayloadBytes':stored_bytes,'reusedInputs':len(m['reusedInputs']),'gitIdentityReferences':len(m['gitReferences']),'externalIdentityReferences':len(m['externalIdentityReferences']),'closureChecks':closures,'originalPathsChecked':len(known)if args.originals else 0,'gitBlobsChecked':len(m['gitReferences'])if args.git else 0,'numericalExperimentReexecuted':False},indent=2))
