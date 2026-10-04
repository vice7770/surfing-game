#!/usr/bin/env python3
"""Byte/record/stored-summary arithmetic verification; no game imports or replay."""
import argparse, gzip, hashlib, json, math, struct, subprocess
from pathlib import Path

A = Path(__file__).resolve().parent
REPO = A.parents[3]
sha = lambda b: hashlib.sha256(b).hexdigest()
def check(b, n, h, label):
    assert len(b) == n and sha(b) == h, label + ': byte identity differs'
def decoded(r):
    b = (A / r['storedPath']).read_bytes()
    check(b, r['storedBytes'], r['storedSha256'], r['storedPath'])
    encoding = r['encoding']
    if encoding.startswith('gzip'):
        assert struct.unpack_from('<I', b, 4)[0] == 0
        raw = gzip.decompress(b)
    else:
        assert encoding == 'identity'
        raw = b
    check(raw, r['expandedBytes'], r['expandedSha256'], r['storedPath'] + ' expanded')
    return raw
parser = argparse.ArgumentParser()
parser.add_argument('--originals', action='store_true')
args = parser.parse_args()
mr = (A / 'manifest.json').read_bytes()
m = json.loads(mr)
for r in m['parentArchives']:
    check((A/r['storedPath']).read_bytes(),r['bytes'],r['sha256'],r['storedPath'])
originals, known = {}, {}
payload_bytes = 0
for r in m['payloads'] + m['reusedInputs']:
    raw = decoded(r)
    if r in m['payloads']:
        payload_bytes += r['storedBytes']
    for p in r['originalAliases']:
        check(raw, p['bytes'], p['sha256'], p['path'])
        originals[p['path']] = raw
        known[p['path']] = (p['bytes'], p['sha256'])
for r in m['generatedRecords']:
    check((A / r['path']).read_bytes(), r['bytes'], r['sha256'], r['path'])
assert {str(p.relative_to(A)) for p in (A/'evidence').rglob('*') if p.is_file()} == {r['storedPath'] for r in m['payloads']}
assert not any(p.suffix in {'.mjs','.js','.ts','.py'} for p in (A/'evidence').rglob('*'))
git_bytes = {}
proc = subprocess.Popen(['git','cat-file','--batch'], cwd=REPO, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
try:
    for r in m['gitReferences']:
        expr = r['commit'] + ':' + r['relativePath']
        proc.stdin.write((expr+'\n').encode()); proc.stdin.flush()
        parts = proc.stdout.readline().rstrip(b'\n').split()
        assert len(parts)==3 and parts[1]==b'blob' and parts[0].decode()==r['blob'], expr
        b = proc.stdout.read(int(parts[2])); assert proc.stdout.read(1)==b'\n'
        check(b, r['bytes'], r['sha256'], expr)
        git_bytes[r['relativePath']] = b
        for p in r['originalAliases']:
            check(b,p['bytes'],p['sha256'],p['path'])
            known[p['path']] = (p['bytes'],p['sha256'])
    proc.stdin.close(); assert proc.wait()==0
finally:
    if proc.poll() is None: proc.kill(); proc.wait()
for r in m['externalIdentityReferences']:
    known[r['path']] = (r['bytes'],r['sha256'])
closure = 0
def walk(o):
    global closure
    if isinstance(o,dict):
        if isinstance(o.get('path'),str) and o['path'].startswith('/') and isinstance(o.get('bytes'),int) and isinstance(o.get('sha256'),str):
            assert known.get(o['path'])==(o['bytes'],o['sha256']), 'Unbound '+o['path']
            closure += 1
        for v in o.values(): walk(v)
    elif isinstance(o,list):
        for v in o: walk(v)
for n in m['closureAuthorities']: walk(json.loads(originals[n]))
def orig(n): return json.loads(originals[m['scratchOriginalRoot']+'/'+n])
ready, bindings = orig('ready.json'), orig('bindings.json')
source, build, checks = orig('source-manifest.json'), orig('build-terminal.json'), orig('checks/terminal.json')
strict, report = orig('strict-terminal.json'), orig('root-run/report.json')
assert ready['runtimeBaseline']==source['baseline']==build['runtimeBaseline']==m['canonicalRuntimeCommit']
assert sha(originals[m['scratchOriginalRoot']+'/ready.json']) == bindings['buildReady']['sha256'] == build['readySha256']
assert sha(originals[m['scratchOriginalRoot']+'/source-manifest.json']) == bindings['sourceManifest']['sha256'] == build['sourceManifestSha256']
assert sha(originals[m['scratchOriginalRoot']+'/build-terminal.json']) == bindings['buildTerminal']['sha256']
assert not bindings['pending'] and build['status']=='passed' and strict['valid']
assert strict['sourceBefore']==strict['sourceAfter'] and build['sourceBefore']==build['sourceAfter']
assert checks['status']=='passed' and checks['sourceUnchanged'] and checks['sourcePinCount']==661 and checks['linkCount']==0
assert len(checks['commands'])==8 and all(c['exitCode']==0 for c in checks['commands'])
assert orig('checks/source-before.json')==orig('checks/source-after.json')
assert len(source['arms'])==2 and source['arms'][0]['files']==source['arms'][1]['files']
assert all(a['fileCount']==len(a['files'])==554 for a in source['arms'])
for r in source['arms'][0]['files']: check(git_bytes[r['path']],r['bytes'],r['sha256'],r['path'])

# Literal text arithmetic only, never import or execute the archived transform.
target = source['onlyRuntimeDifference']
assert target['relativePath']=='src/wave/gpu/GpuBoussinesq.ts' and target['editCount']==3
text = git_bytes[target['relativePath']].decode()
original_prefix = text.split('export class GpuBoussinesq')[0]
edits = [
 ('  private feedSlots = 0;', '  private feedSlots = 0;\n  /** Constructor-fixed SideFeed count, captured at the existing table refresh. */\n  private feedComponents = 0;'),
 ('    this.feedSlots = feed.deviceShape().slots;', '    const shape = feed.deviceShape();\n    this.feedSlots = shape.slots;\n    this.feedComponents = shape.components;'),
 ('device.queue.writeBuffer(this.feedBuffer, 0, this.feedPacked, 0, this.zone.feed.deviceShape().components * 3);', 'device.queue.writeBuffer(this.feedBuffer, 0, this.feedPacked, 0, this.feedComponents * 3);')
]
for before,after in edits:
    assert text.count(before)==1
    text=text.replace(before,after)
assert text.split('export class GpuBoussinesq')[0]==original_prefix
check(text.encode(),target['virtualCandidate']['bytes'],target['virtualCandidate']['sha256'],'virtual candidate')
assert target['exportedHelpersAndWriteParamsStayLiteral']

assert report['valid'] and not report['incomplete'] and [r['arm'] for r in report['arms']]==['baseline','candidate']
assert report['arms'][0]['endedAt'] < report['arms'][1]['startedAt']
summary, mapping = [json.loads((A/n).read_text()) for n in ['summary.json','identity-map.json']]
assert summary['decision']=='HOLD' and summary['adopted'] is False and summary['mainMergeClaimed'] is False
assert summary['startedAt']==report['startedAt'] and summary['endedAt']==report['endedAt']
compiled_refs = [r for r in m['externalIdentityReferences'] if r.get('kind')=='compiled-output']
assert len(compiled_refs)==22
for row in report['arms']:
    arm=row['arm']; bm=orig(arm+'/build-manifest.json'); fps=orig('root-run/'+arm+'/fps.json')
    audit=orig('root-run/'+arm+'/native-audit.json'); launcher=orig('root-run/'+arm+'/launcher.json')
    assert row['valid'] and row['terminal']['code']==0 and row['authorityUnchangedAfter']
    assert bm['status']=='passed' and bm['buildId']=='306258296' and bm['runtimeBaseline']==m['canonicalRuntimeCommit']
    assert row['manifest']==bindings['arms'][arm]
    assert bm['readySha256']==build['readySha256'] and bm['sourceManifest']==bindings['sourceManifest']
    assert len(bm['outputRecords'])==11 and row['compiledServed']==bm['outputRecords']
    assert bm['literalSourceFiles']==554 and not bm['publicAssetCopies'] and not bm['taskPublicAssetCopies']
    for p in bm['outputRecords']:
        assert known[bm['outputRoot']+'/'+p['path']]==(p['bytes'],p['sha256'])
    if arm=='baseline': assert bm['reusedCanonicalCompilation']
    else:
        assert not bm['reusedCanonicalCompilation'] and bm['workerPluginFactory']
        loads=bm['sourceTransform']['loads']; assert len(loads)==1 and loads[0]['realm']=='worker'
        assert loads[0]['virtualSha256']==target['virtualCandidate']['sha256']
    fp=row['fps']
    if 'path' in fp:
        assert fp['path']==m['scratchOriginalRoot']+'/root-run/'+arm+'/fps.json'
        check(originals[fp['path']],fp['bytes'],fp['sha256'],'pair FPS artifact')
    else:
        assert fps==fp
    assert fps['valid'] and fps['commit']==m['canonicalRuntimeCommit'] and str(fps['build'])=='306258296'
    art=fps['artifact']; assert art['entry']==bm['clientEntry'] and art['worker']==bm['surfZoneWorker'] and art['root']==bm['outputRoot']
    assert art['files']==art['verified'] and len(art['files'])==10
    expected={p['path']:p['sha256'] for p in bm['outputRecords'] if p['path']!='build.json'}
    assert {p['file']:p['sha256'] for p in art['files']}==expected
    assert fps['gpuTiming']=='disabled (passive counters)' and fps['rideSeconds']==90 and len(fps['results'])==1
    r=fps['results'][0]; assert r['ordinaryConfigMatches'] and r['baselineComparable'] and not r['comparisonFailures']
    assert r['config']==report['plan']['expectedConfig'] and r['canvas']=='2989 × 1538'
    o=r['observed']; assert o['viewport']=='1708 × 879' and o['browserDpr']==2 and o['renderPixelRatio']==1.75
    assert o['graphics']==fps['ordinary']['graphics'] and o['maxBatchSteps']==1 and o['compute']=='gpu' and o['renderSpacing']==2 and not o['vertexNormals']
    assert not fps['ordinary']['workerRngOverride'] and not fps['ordinary']['diagnosticGpuProfile']
    assert audit==fps['nativeAudit'] and audit['valid'] and not audit['workerRngOverride'] and not audit['resizeOverrides'] and audit['menuResizeEvents']==0
    assert audit['practiceWorkerSerialsExcluded']==[0]
    for v in audit['observations']:
        a=v['actual']; assert a['inner']==[1708,879] and a['dpr']==2 and a['canvas']==[2989,1538] and a['resizeEvents']==0
        if v['phase'] in ['sample-start','sample-end']:
            assert a['config']==r['config'] and a['cells']==116000 and a['maxBatchSteps']==1 and a['maskSpacing']==1
            worker=a['actualWorker']; assert worker['serial']==audit['rideWorkerSerial']==1 and worker['badAdvances']==0 and not worker['interventions'] and worker['lastSteps']==1
            assert worker['url'].endswith('/'+bm['surfZoneWorker'])
            start=worker['starts'][0]; assert start['soloOneStep']['value'] is True and start['rider']['value'] is True
    assert launcher['initialRequest']['size']==[1708,966] and not launcher['resizeOverrides'] and launcher['ownedChromeClosed']
    assert launcher['portProof']=={'closed':True,'reason':'ECONNREFUSED'}
    for key in ['serverClosure','cdpClosure','port4200','port4200End']:
        assert row[key]=={'closed':True,'reason':'ECONNREFUSED'}
    timeline=r['simulationTimeline']; assert len(timeline)==46 and [t['from'] for t in timeline]==list(range(0,92,2))
    assert sum(t['snapshots'] for t in timeline)==r['publicationEvents']==r['freshSnapshots']
    for t in [r]+timeline:
        assert t['duplicatePublicationEvents']==t['backwardsPublicationEvents']==t['nonIntegralPhysicsStepDeltas']==0
        assert t['advancingPublications']==max(0,t['freshSnapshots']-1)
        assert t['publicationEvents']==t['freshSnapshots']
        assert t['physicsStepDeltaDistribution']==({'1':t['advancingPublications']} if t['advancingPublications'] else {})
        assert abs(t['physicsAdvanceSeconds']-t['advancingPublications']/60)<.000001
        assert t['fixedPhysicsStepSeconds']==1/60
        assert t['physicsStepsPerWallSecond']==t['freshSnapshotsPerSecond']==t['publicationEventsPerSecond']
    assert abs(r['simulationSecondsPerWallSecond']-r['physicsStepsPerWallSecond']/60)<.0006
    metrics={k:r[k] for k in summary['arms'][arm]['reported']}
    assert metrics==summary['arms'][arm]['reported']
    assert summary['arms'][arm]['fullBins']==[{'from':t['from'],'snapshots':t['snapshots'],'freshSnapshotsPerSecond':t['freshSnapshotsPerSecond']} for t in timeline if t['from'] in [86,88]]
    assert mapping['arms'][arm]['outputRecords']==bm['outputRecords']
for k,d in summary['differencesCandidateMinusBaseline'].items():
    assert math.isclose(d, summary['arms']['candidate']['reported'][k]-summary['arms']['baseline']['reported'][k],abs_tol=1e-12)
note=json.loads((A/'root-coordination.json').read_text())
assert not note['standaloneTcpToolArtifactSaved'] and note['decision']=='HOLD' and not note['adopted']
assert note['independentTcpClosure']['rows']==[{'port':p,'closed':True,'reason':'ECONNREFUSED'} for p in [4241,9651,4242,9652,4200]]
assert note['independentTcpClosure']['afterExclusive']=='2026-10-04T07:21:59.243Z'
assert note['independentTcpClosure']['beforeExclusive']=='2026-10-04T07:22:37.593970Z'
assert not note['independentTcpClosure']['archiveWorkerRepeatedChecks']
original_count=0
if args.originals:
    for p,(n,h) in known.items(): check(Path(p).read_bytes(),n,h,p); original_count+=1
print(json.dumps({'schema':'feed-components-native-archive-byte-arithmetic-verification/v1','pass':True,
 'manifestSha256':sha(mr),'storedPayloads':len(m['payloads']),'storedPayloadBytes':payload_bytes,
 'reusedPayloads':len(m['reusedInputs']),'gitBlobIdentities':len(m['gitReferences']),
 'compiledIdentityReferences':22,'externalIdentities':len(m['externalIdentityReferences']),
 'closureReferenceChecks':closure,'completedNativeArms':2,'fullBinsPerArm':45,'partialTrailingBinsPerArm':1,
 'decision':'HOLD','adopted':False,'originalsRequested':args.originals,'originalFilesChecked':original_count,
 'scope':'Bytes, identities, recorded guards and count/summary arithmetic only; no quantile reconstruction, game/experiment execution, physics replay, network or FPS rerun.'},indent=2))
