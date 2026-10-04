#!/usr/bin/env python3
"""One bounded byte archive; no game/harness/build/native import or execution."""
from pathlib import Path
import datetime, gzip, hashlib, json, os, signal, statistics, time

WORK = Path('/private/tmp/zero-mask-archive-first-20261004')
LOCAL = Path('/private/tmp/surf-zero-mask-triangle-20261004/partial-eight')
V1 = Path('/private/tmp/surf-wavelab-passive-original-20261004')
V2 = Path('/private/tmp/surf-wavelab-passive-original-v2-20261004')
DEST = Path('/Users/regina/Desktop/Projects/surfing-game/docs/research/performance-2026-10-04/zero-mask')
CAP, JSON_CAP, LOG_CAP, RAW_CAP = 32*1024*1024, 128*1024, 1024*1024, 96*1024*1024
start, original_pins, entries = time.monotonic(), {}, []
receipt = {'schema': 'zero-mask-archive-first/v1', 'valid': False, 'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
           'firstFailure': None, 'nativeCaptureComplete': False, 'nineStateQuality': False, 'qualityPass': False, 'fpsGate': False,
           'movingTubePass': False, 'commandSeconds': 30, 'inputUnchangedAfter': None, 'roundtripAllCopiedBytes': False, 'completedFiles': 0}

def digest(body):
    return hashlib.sha256(body).hexdigest()

def compact(value):
    body = (json.dumps(value, ensure_ascii=False, separators=(',', ':'))+'\n').encode()
    assert len(body) <= JSON_CAP, '128KiB generated JSON cap'
    return body

def checked(path, cap=8*1024*1024):
    path = Path(path)
    assert path.is_absolute() and path.is_file() and not path.is_symlink() and path.resolve() == path
    assert path.stat().st_size <= cap, 'Original file cap: '+str(path)
    body = path.read_bytes()
    return body, {'path': str(path), 'bytes': len(body), 'sha256': digest(body)}

def pin(path, expected=None, cap=8*1024*1024):
    body, actual = checked(path, cap)
    if expected is not None:
        assert actual == {k:expected[k] for k in ['path','bytes','sha256']}, 'Original input identity: '+str(path)
    old = original_pins.get(str(path))
    assert old is None or old == actual
    original_pins[str(path)] = actual
    return body, actual

def save_receipt():
    receipt['completedFiles'] = len(entries)
    body = compact(receipt)
    (WORK/'report.json').write_bytes(body)
    if DEST.exists():
        (DEST/'archive-first.json').write_bytes(body)

def alarm(_sig, _frame):
    signal.setitimer(signal.ITIMER_REAL, 0)
    receipt['firstFailure'] = receipt['firstFailure'] or '30s archive whole-command deadline'
    receipt.update({'valid': False, 'incomplete': True, 'elapsedSeconds': time.monotonic()-start, 'finalizationIncomplete': True})
    save_receipt()
    os._exit(1)

def used_bytes():
    return sum(p.stat().st_size for p in DEST.rglob('*') if p.is_file())

def add(path, expected=None):
    path = Path(path)
    if any(e['original']['path'] == str(path) for e in entries):
        if expected is not None:
            pin(path, expected, RAW_CAP)
        return
    body, original = pin(path, expected, RAW_CAP if path.suffix == '.bin' else 8*1024*1024)
    for root, prefix in [(LOCAL, 'local'), (V2, 'lineage/v2'), (V1, 'lineage/v1'), (WORK, 'archive-source')]:
        if path.is_relative_to(root):
            rel = Path(prefix)/path.relative_to(root)
            break
    else:
        raise AssertionError('Input outside declared immutable archive roots: '+str(path))
    compress = path.suffix == '.bin' or (path.suffix == '.json' and len(body) > JSON_CAP)
    if compress:
        rel = Path(str(rel)+'.gz')
    encoded = gzip.compress(body, compresslevel=6, mtime=0) if compress else body
    assert used_bytes()+len(encoded)+3*JSON_CAP+32768 <= CAP, '32MiB archive cap/reserve'
    target = DEST/rel
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open('xb') as handle:
        handle.write(encoded)
    archived = target.read_bytes()
    assert archived == encoded
    assert (gzip.decompress(archived) if compress else archived) == body, 'Byte roundtrip after compression: '+str(path)
    entries.append({'original': original, 'durablePath': str(target), 'relativePath': str(rel),
                    'encoding': 'gzip' if compress else 'identity', 'storedBytes': len(archived), 'storedSha256': digest(archived), 'byteRoundtripVerified': True})
    save_receipt()

assert not (WORK/'report.json').exists(), 'One archive attempt; immutable first outcome'
assert not DEST.exists(), 'Fresh durable archive required; no retry or overwrite'
signal.signal(signal.SIGALRM, alarm)
signal.setitimer(signal.ITIMER_REAL, 30)
DEST.mkdir()
save_receipt()
try:
    ready_body, ready_pin = pin(LOCAL/'ready.json')
    ready = json.loads(ready_body)
    result_body, result_pin = pin(LOCAL/'offline-first/report.json')
    result = json.loads(result_body)
    assert result['ready'] == ready_pin
    assert result['schema'] == 'zero-mask-partial-eight-offline-first/v1' and result['valid'] is True and result['incomplete'] is False
    assert result['inputsUnchangedBefore'] is True and result['inputsUnchangedAfter'] is True and result['arraysUnchangedAfter'] is True
    assert result['nativeCaptureComplete'] is False and result['nineStateQuality'] is False and result['fpsGate'] is False and result['qualityPass'] is False and result['adoption'] is False
    assert [s['targetSeconds'] for s in result['states']] == [0,5,10,15,20,25,30,35]
    assert all(s['exactOutputParity'] is True and s['originalSet'] == s['candidateSet'] and s['originalBytesSha256'] == s['candidateBytesSha256'] for s in result['states'])
    assert all(t['passed'] for name in ['original','candidate'] for t in result['regression'][name])
    assert len(result['overlap']['receipts']) == 4
    assert all(r['set'] == 20 for r in result['overlap']['receipts'])
    for name in ['freeze-first/report.json','offline-first.driver.json']:
        body, _p = pin(LOCAL/name)
        assert json.loads(body)['valid'] is True
    assert len(ready['inputPins']) <= 128
    for p in ready['inputPins']:
        add(p['path'], p)
    for path in sorted(LOCAL.rglob('*')):
        if path.is_file():
            add(path)
    assert sum(p['bytes'] for p in ready['selectedFiles']) <= RAW_CAP
    for p in ready['selectedFiles']:
        add(p['path'], p)

    # Lineage metadata/helpers/gates only: do not descend raw fields, frames, compiled dist or whole source trees.
    for root in [V1, V2]:
        for path in sorted(root.iterdir()):
            if path.is_file():
                add(path)
        for name in ['report.json','native.log']:
            add(root/'native-first'/name)
        for path in sorted((root/'root-checks-first').rglob('*')):
            if path.is_file():
                add(path)
    for p in ready['capture'].values():
        if isinstance(p,dict) and all(k in p for k in ['path','bytes','sha256']):
            add(p['path'], p)
    v1_report = json.loads(pin(V1/'native-first/report.json')[0])
    v2_report = json.loads(pin(V2/'native-first/report.json')[0])
    v1_driver = json.loads(pin(V1/'native-first.native-driver.json')[0])
    v2_driver = json.loads(pin(V2/'native-first.native-driver.json')[0])
    assert v1_report['valid'] is False and v1_report['incomplete'] is True and len(v1_report['capture']['frames']) == 6
    assert v2_report['valid'] is False and v2_report['incomplete'] is True and len(v2_report['capture']['frames']) == 8
    assert all(d['independentClosureValid'] is True for d in [v1_driver,v2_driver])
    assert all(d['postPorts'][str(p)]['closed'] is True for d in [v1_driver,v2_driver] for p in [4259,9669])
    add(WORK/'archive.py')
    by_original = {e['original']['path']: e for e in entries}
    mappings = []
    for f in ready['selectedFields']:
        e = by_original[f['file']['path']]
        mappings.append({'label': f['label'], 'type': f['type'], 'elements': f['elements'], 'bytes': f['bytes'],
                         'payloadCanonical': f['canonical'], 'originalFile': f['file'], 'durablePath': e['durablePath'], 'encoding': e['encoding']})
    active_indexes = {s['index'] for s in result['states'] if s['indices'] > 0}
    active_pairs = [p for t in result['timings'] if t['index'] in active_indexes for p in t['pairs']]
    savings = [p['originalMs']-p['candidateMs'] for p in active_pairs]
    order_medians = {name: statistics.median(p['originalMs']-p['candidateMs'] for p in active_pairs if p['order'][0] == first)
                     for name,first in [('AB','original'),('BA','candidate')]}
    summary = {'activePairCount': len(active_pairs), 'medianPairedActiveCallSavingMs': statistics.median(savings), 'orderMedianSavingsMs': order_medians,
               'states': [{k:s[k] for k in ['index','targetSeconds','indices','zeroMaskTriangles','zeroMaskTriangleFraction','originalSet','candidateSet','exactOutputParity']} for s in result['states']],
               'costScope': result['costProtocol'], 'localResult': result_pin, 'nativeCaptureComplete': False, 'nineStateQuality': False, 'fpsGate': False, 'movingTubePass': False,
               'productionChecks': 'Original root tool observations are archived as local/root-production-checks-first.json;12 targeted tests/strict typecheck. This archive does not rerun them.'}
    (DEST/'summary.json').write_bytes(compact(summary))
    manifest = {'schema':'zero-mask-byte-archive/v1','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'entries':entries,'logicalSelectedFields':mappings,
                'closure':'All local ready.inputPins and canonical selected typed files are copied and verified. Larger original JSON and selected typed files use deterministic gzip with exact original-byte roundtrip. Sources/current production are not rebuilt or imported.',
                'omissions':['All unused native raw fields and all PNG payloads are omitted. Their original descriptors/hashes/camera references remain in unchanged archived reports; these omitted bytes are not independently verified by this archive.',
                             'Whole original592 source trees and49 compiled files are not copied: original ready/build/source pins remain metadata, and the five actually used frozen V2 source copies plus all local inputPins are included.',
                             'Fresh tool observations with no raw logfile are preserved exactly in receipts; no substitute raw logs are fabricated.'],
                'nativeFailures':{'V1':{'valid':False,'incomplete':True,'frames':6,'firstFailure':v1_report.get('firstFailure'),'captureFailure':v1_report['capture']['failure']},
                                  'V2':{'valid':False,'incomplete':True,'frames':8,'firstFailure':v2_report.get('firstFailure'),'captureFailure':v2_report['capture']['failure']}},
                'archiveCapBytes':CAP,'jsonCapBytes':JSON_CAP,'logCapBytes':LOG_CAP,'nativeCaptureComplete':False,'nineStateQuality':False,'qualityPass':False,'fpsGate':False,'movingTubePass':False}
    (DEST/'manifest.json').write_bytes(compact(manifest))
    readme = f'''# Zero-mask triangle guard evidence

The candidate inserts one guard in the original barrel-mask rasterizer: skip a triangle only when all three original vertex mask words equal zero. Its interpolated contribution is zero/signed-zero for finite barycentric arithmetic, or NaN when nonfinite arithmetic multiplies zero; none can exceed a nonnegative Uint8 mask node. Positive/mixed triangles and all rendered/contact geometry stay present. The exact frozen source argument is [analytic-proof.md](local/analytic-proof.md).

The first local comparison passed exact full-mask bytes and set counts for **all eight retained states0..35s**, both original regression functions, both zero/positive overlap orders, and source/file/working-array closure. An active retained texture reproduced exactly. Inactive textures remain receipts of the original stale-byte behavior. The [original first result](local/offline-first/report.json), [driver receipt](local/offline-first.driver.json), [summary](summary.json) and [manifest](manifest.json) preserve the outcomes and canonical alias mappings. No harness/game/build was rerun during archiving.

Eight AB/BA whole-raster pairs per state included output clear and final count scan after fixed warmup. Across48 active pairs, median paired saving was **{statistics.median(savings):.6f}ms per call**, with AB **{order_medians['AB']:.6f}ms** and BA **{order_medians['BA']:.6f}ms**. This small short-process CPU result establishes no sustained game-FPS materiality. Root's exact production observations are retained in [root-production-checks-first.json](local/root-production-checks-first.json):12 targeted tests and strict typecheck passed; root owns subsequent production/FPS evidence.

Both original native captures remain **failed and incomplete**: V1 retained6 states and V2 retained8, then each hit the unchanged96MiB retained typed-payload limit. Their original first-failure reports/drivers/logs, source helpers, ready/bindings, gates and V2 postfailure verification receipts are archived as lineage. This evidence does not supply target40, accept nine-state quality, prove moving tube quality, reproduce the video's fins or claim an FPS pass.

The archive contains every local ready input pin, immutable local source/gate/result file, exact five used frozen V2 source copies and selected canonical typed payloads. Deterministic gzip preserves original byte length/SHA256; stored gzip length/SHA256 and a checked byte roundtrip appear in the manifest. All PNG payloads, unused raw fields and whole unused source/dist trees are explicitly omitted. Their reference pins remain in unchanged archived metadata; omitted bytes are not independently verified here. Existing tool-observation receipts are preserved as such, with no fabricated raw logfile.
'''
    assert len(readme.encode()) <= 16384
    (DEST/'README.md').write_text(readme)
    total_logs = sum(e['storedBytes'] for e in entries if e['relativePath'].endswith('.log'))
    assert total_logs <= LOG_CAP
    for path, expected in original_pins.items():
        assert checked(Path(path), RAW_CAP)[1] == expected, 'Input changed after archive: '+path
    receipt.update({'valid':True,'incomplete':False,'inputUnchangedAfter':True,'roundtripAllCopiedBytes':True,'manifest':str(DEST/'manifest.json'),
                    'manifestSha256':digest((DEST/'manifest.json').read_bytes()),'summary':str(DEST/'summary.json'),'storedLogBytes':total_logs,
                    'selectedUniqueRawBytes':sum(p['bytes'] for p in ready['selectedFiles']),'originalPins':len(original_pins)})
except Exception as error:
    receipt['firstFailure'] = receipt['firstFailure'] or repr(error)
    receipt.update({'valid':False,'incomplete':True})
    try:
        receipt['inputUnchangedAfter'] = all(checked(Path(path),RAW_CAP)[1] == p for path,p in original_pins.items())
    except Exception as failure:
        receipt['inputUnchangedAfter'] = False
        receipt['closureFailure'] = repr(failure)
finally:
    receipt['elapsedSeconds'] = time.monotonic()-start
    receipt['endedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    for _ in range(4):
        save_receipt()
        receipt['archiveBytes'] = used_bytes()
    assert receipt['archiveBytes'] <= CAP, '32MiB final archive cap'
    save_receipt()
    signal.setitimer(signal.ITIMER_REAL,0)
    print(json.dumps(receipt,separators=(',',':')))
raise SystemExit(0 if receipt['valid'] else 1)
