#!/usr/bin/env python3
"""Standalone offline analysis of the first retained timestamped ordinary FPS arm."""
import datetime, gzip, hashlib, json, math, pathlib, sys, time, traceback

ROOT = pathlib.Path(__file__).resolve().parent
started = time.monotonic()
result = {'schema':'zero-mask-fps-first-late-analysis/v1','valid':False,
          'fpsAcceptance':False,'causalGuardBenefit':False,'tubeQualityPass':False,'adoption':False,
          'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'scope':'Descriptive offline analysis only. Predeclared half-open wall windows use actual sample endpoint origin; callback draws and physics progress remain separate. No paired causal comparison, FPS acceptance threshold, tube quality or adoption decision.'}

def get(label, manifest):
    alias = next(x for x in manifest['aliases'] if x['label'] == label)
    blob = next(x for x in manifest['payloads'] if x['id'] == alias['payload'])
    stored = (ROOT/blob['storedPath']).read_bytes()
    assert len(stored) == blob['storedBytes'] and hashlib.sha256(stored).hexdigest() == blob['storedSha256']
    original = gzip.decompress(stored) if blob['encoding'] == 'gzip' else stored
    assert len(original) == alias['bytes'] and hashlib.sha256(original).hexdigest() == alias['sha256']
    return json.loads(original)

def q(values, at):
    ordered = sorted(values)
    return ordered[min(len(ordered)-1, math.floor(at*len(ordered)))] if ordered else None

try:
    manifest = json.loads((ROOT/'manifest.json').read_text())
    raw = get('native/raw-samples.json',manifest)
    fps = get('native/fps.json',manifest)
    frames, pubs, endpoint = raw['frames'], raw['snapshots'], raw['endpoints']
    origin = endpoint['startedAt']
    assert endpoint['endedAt']-origin >= 90000
    assert raw['frameColumns'] == ['intervalMs','drawCalls','callbackWorkMs','triangles','callbackTimestampMs']
    assert all(len(f) == 5 and all(math.isfinite(v) for v in f) for f in frames)
    assert all(a[4] < b[4] for a,b in zip(frames,frames[1:]))
    assert all(a['wall'] < b['wall'] and a['sea'] <= b['sea'] for a,b in zip(pubs,pubs[1:]))
    assert all(origin <= f[4] <= endpoint['endedAt'] for f in frames)
    assert all(origin <= p['wall'] <= endpoint['endedAt'] for p in pubs)
    total = sum(f[0] for f in frames)/1000
    rendered = sum(f[1] > 0 for f in frames)
    intervals = []
    since = 0
    had = False
    for f in frames:
        since += f[0]
        if f[1] <= 0: continue
        if had: intervals.append(since)
        had = True; since = 0
    pubspan = (pubs[-1]['wall']-pubs[0]['wall'])/1000
    advance = pubs[-1]['sea']-pubs[0]['sea']
    whole = {'callbackRows':len(frames),'drawnCallbackIntervals':rendered,
             'originalIntervalDenominatorSeconds':total,'renderedFpsUnrounded':rendered/total,
             'publicationRows':len(pubs),'publicationSpanSeconds':pubspan,'seaAdvanceSeconds':advance,
             'physicsStepsPerWallSecondUnrounded':advance*60/pubspan,
             'renderedFrameMsP95Unrounded':q(intervals,.95),'renderedFrameMsMaxUnrounded':max(intervals),
             'originalReport':{k:fps['results'][0][k] for k in ('renderedFps','physicsStepsPerWallSecond','renderedFrameMsP95','renderedFrameMsMax')}}
    windows = []
    for a,b in ((45,60),(80,90)):
        lower, upper = origin+a*1000, origin+b*1000
        fr = [f for f in frames if lower <= f[4] < upper]
        pr = [p for p in pubs if lower <= p['wall'] < upper]
        assert len(pr) > 1
        span = (pr[-1]['wall']-pr[0]['wall'])/1000
        sea = pr[-1]['sea']-pr[0]['sea']
        windows.append({'fromSeconds':a,'toSeconds':b,'halfOpen':True,'lowerWallMs':lower,'upperWallMs':upper,
                        'callbackRows':len(fr),'drawnCallbackIntervals':sum(f[1]>0 for f in fr),
                        'drawnFps':sum(f[1]>0 for f in fr)/(b-a),'publicationRows':len(pr),
                        'firstPublicationWallMs':pr[0]['wall'],'lastPublicationWallMs':pr[-1]['wall'],
                        'firstSeaTime':pr[0]['sea'],'lastSeaTime':pr[-1]['sea'],
                        'publicationSpanSeconds':span,'seaAdvanceSeconds':sea,
                        'physicsStepsPerWallSecond':sea*60/span})
    result.update(valid=True,endpoints=endpoint,whole=whole,windows=windows,
                  callbackWindowFormula='count(callbackTimestampMs in [origin+a*1000,origin+b*1000) with drawCalls>0)/(b-a)',
                  physicsWindowFormula='(lastSea-firstSea)*60/((lastPublicationWall-firstPublicationWall)/1000), publications selected in the same half-open wall window',
                  timingQualification='Draw counters aggregate original observer callback intervals; the first interval can cross sample origin. Existing simulationTimeline uses first publication as origin. Equal wall windows need not represent equal wave clocks. Stage quantiles overlap and are not additive request latency.')
except BaseException as error:
    result['firstFailure'] = type(error).__name__+': '+str(error)
    result['traceback'] = traceback.format_exc()[-8192:]
result['elapsedSeconds'] = time.monotonic()-started
result['endedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
body = (json.dumps(result,indent=2)+'\n').encode()
assert len(body) <= 131072
path = pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'late-analysis-first.json'
with path.open('xb') as f: f.write(body)
print(body.decode(),end='')
sys.exit(0 if result['valid'] else 1)
