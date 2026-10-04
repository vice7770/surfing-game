#!/usr/bin/env python3
"""One stdlib-only offline integrity check of the failed V2 partial capture."""
import datetime
import hashlib
import json
import math
import pathlib
import re
import signal
import struct
import sys
import time
import traceback
import urllib.parse

WORK = pathlib.Path('/private/tmp/surf-wavelab-passive-original-v2-20261004')
PREFIX = WORK / 'root-postfailure-first-verification'
READY = '3e5a7b8b06c12f6b26e6df2dd57349e8831d91bb62b772f164441f89b1772c50'
BINDING = 'c5a1690c4e1ceffd097f1b568f5b1b1974686290dd2af40e90a4585f583695a4'
MAX_OUTPUT = 131072
started = time.monotonic()
cache = {}
checks = []
pin_occurrences = 0
result = {
    'schema': 'root-postfailure-first-input-integrity/v1',
    'valid': False, 'inputIntegrityValid': False,
    'nineStateQuality': False, 'adoption': False, 'fpsPass': False,
    'scope': 'Offline input integrity of a failed partial capture only. No game/helper import, replay, solver, native/browser/build/FPS execution or quality assessment. Canonical file bytes and alias metadata/file identities are verified; separately omitted original duplicate buffers cannot be independently compared again.',
    'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'checks': checks,
}

def must(condition, message):
    if not condition:
        raise AssertionError(message)

def done(name, **details):
    checks.append({'check': name, 'valid': True, **details})

def timeout(signum, frame):
    raise TimeoutError('Offline verification exceeded its 25-second internal bound')

signal.signal(signal.SIGALRM, timeout)
signal.setitimer(signal.ITIMER_REAL, 25)

def identity(path):
    p = pathlib.Path(path).resolve(strict=True)
    key = str(p)
    if key not in cache:
        must(p.is_file() and not pathlib.Path(path).is_symlink(), 'Expected ordinary file: ' + str(path))
        st = p.stat()
        sha = hashlib.sha256()
        size = 0
        # Only retain JSON and the four small case bodies; all other files stream once.
        keep_body = p.suffix == '.json' or p.name.startswith('start-case-') or (p.parent.name == 'barrels' and p.name in {
            'pad19-a20-l12.bin', 'pad19-a30-l12.bin', 'pad19-a45-l12.bin', 'periodic-padang19s-l12.bin'})
        body = bytearray() if keep_body else None
        head = b''
        tail = b''
        with p.open('rb') as f:
            while True:
                chunk = f.read(1048576)
                if not chunk:
                    break
                sha.update(chunk)
                size += len(chunk)
                if len(head) < 33:
                    head += chunk[:33-len(head)]
                tail = (tail + chunk)[-12:]
                if body is not None:
                    body.extend(chunk)
        after = p.stat()
        must(size == st.st_size == after.st_size and st.st_mtime_ns == after.st_mtime_ns,
             'File changed during its one read: ' + key)
        cache[key] = {'path': key, 'bytes': size, 'sha256': sha.hexdigest(),
                      'body': bytes(body) if body is not None else None, 'head': head, 'tail': tail}
    return cache[key]

def pin(record):
    global pin_occurrences
    pin_occurrences += 1
    got = identity(record['path'])
    must(type(record['bytes']) is int and record['bytes'] >= 0, 'Invalid pinned byte count')
    must((got['bytes'], got['sha256']) == (record['bytes'], record['sha256']),
         'Pinned byte/hash mismatch: ' + record['path'])
    return got

def pins_in(obj):
    if isinstance(obj, dict):
        if {'path', 'bytes', 'sha256'} <= obj.keys():
            pin(obj)
        for v in obj.values():
            pins_in(v)
    elif isinstance(obj, list):
        for v in obj:
            pins_in(v)

def read_json(path):
    got = identity(path)
    must(got['body'] is not None, 'JSON body was not retained')
    return json.loads(got['body'])

def short_identity(path):
    got = identity(path)
    return {k: got[k] for k in ('path', 'bytes', 'sha256')}

def stamp(value):
    return datetime.datetime.fromisoformat(value.replace('Z', '+00:00'))

def label_index(label):
    m = re.match(r'^state-([0-8])/', label)
    return int(m.group(1)) if m else -1

try:
    ready = read_json(WORK/'ready.json')
    binding = read_json(WORK/'bindings.json')
    plan = read_json(WORK/'plan.json')
    report = read_json(WORK/'native-first/report.json')
    driver = read_json(WORK/'native-first.native-driver.json')
    must(identity(WORK/'ready.json')['sha256'] == READY, 'Unexpected frozen ready')
    must(identity(WORK/'bindings.json')['sha256'] == BINDING, 'Unexpected frozen bindings')
    for authority in (ready, binding, report, driver):
        pins_in(authority)
    must(report['ready'] == binding['ready'], 'Report/binding ready records differ')
    must(report['binding']['sha256'] == BINDING, 'Report binding differs')
    must(driver['readySha256'] == READY and driver['bindingsSha256'] == BINDING, 'Driver authority differs')
    must(report['plan'] == plan, 'Native report did not retain the exact frozen plan')
    must(binding['valid'] is True and binding['originalSource'] is True and binding['storageRevision'] == 2, 'Invalid original binding')
    must(len(ready['helpers']) == 7 and len({x['path'] for x in ready['helpers']}) == 7, 'Helper inventory differs')
    must(len(ready['sourceFiles']) == len(ready['sourceCopies']) == 592, 'Current/copied source inventory differs')
    repo = pathlib.Path(plan['repository'])
    current = {str(pathlib.Path(x['path']).relative_to(repo)): (x['bytes'], x['sha256']) for x in ready['sourceFiles']}
    copies = {str(pathlib.Path(x['path']).relative_to(WORK/'source')): (x['bytes'], x['sha256']) for x in ready['sourceCopies']}
    must(len(current) == len(copies) == 592 and current == copies, 'Source copy identity map differs')
    must(ready['cdp']['sha256'] == ready['borrowed']['sha256'], 'Borrowed CDP differs')
    compiled = {x['relativePath']: x for x in binding['compiledFiles']}
    must(len(compiled) == len(binding['compiledFiles']) == 49, 'Compiled inventory differs')
    must(ready['inheritedCompiledFiles'] == binding['compiledFiles'], 'Inherited compiled inventory differs')
    v1 = ready['lineage']
    must(v1 == binding['lineage'], 'Lineage objects differ')
    v1ready = read_json(v1['ready']['path'])
    v1binding = read_json(v1['binding']['path'])
    pins_in(v1ready)
    pins_in(v1binding)
    old_current = {str(pathlib.Path(x['path']).relative_to(repo)): (x['bytes'], x['sha256']) for x in v1['sourceFiles']}
    old_compiled = {x['relativePath']: (x['bytes'], x['sha256']) for x in v1['compiledFiles']}
    must(current == old_current and old_compiled == {k: (v['bytes'], v['sha256']) for k,v in compiled.items()}, 'V1/V2 unchanged source/dist maps differ')
    for rec in binding['receipts']:
        receipt = read_json(rec['path'])
        must(receipt['valid'] is True and receipt['readyUnchanged'] is True and receipt['readySha256'] == READY, 'V2 gate receipt invalid')
        for command in receipt.get('commands', []):
            must(command['exitCode'] == 0, 'V2 helper source command failed')
            pin({'path': command['log'], 'bytes': command['logBytes'], 'sha256': command['logSha256']})
    build = read_json(WORK/'build-receipt.json')
    must(all(build[k] is True for k in ['inherited','sourceByteIdentityVerified','compiledByteIdentityVerified','originalStrictTypecheckInherited']), 'Original build inheritance invalid')
    must(build['sourceFiles'] == 592 and build['compiledFiles'] == 49, 'Build inherited counts differ')
    for rec in v1['gateReceipts']:
        receipt = read_json(rec['path'])
        must(receipt['valid'] is True and receipt['readyUnchanged'] is True, 'Original gate receipt invalid')
        for command in receipt.get('commands', []):
            must(command['exitCode'] == 0 and identity(command['log'])['bytes'] == command['logBytes'], 'Original gate command/log differs')
        if 'exitCode' in receipt:
            must(receipt['exitCode'] == 0 and identity(receipt['log'])['bytes'] == receipt['logBytes'], 'Original build command/log differs')
    oldreport = read_json(pathlib.Path(v1['failedRunPins'][1]['path']))
    olddriver = read_json(pathlib.Path(v1['failedRunPins'][0]['path']))
    must(oldreport['valid'] is False and oldreport['incomplete'] is True and olddriver['valid'] is False, 'V1 failure changed')
    must([f['targetSeconds'] for f in oldreport['capture']['frames']] == [0,5,10,15,20,25], 'V1 retained target lineage differs')
    must(oldreport['capture']['failure'] == v1['failedRun']['captureFailure'] == 'Error: 96MiB retained numerical/typed payload exceeded', 'V1 failure lineage differs')
    must(oldreport['firstFailure'] == v1['failedRun']['firstFailure'], 'V1 first failure lineage differs')
    must(oldreport['capture']['followClick']['followingAfterOriginalHandler'] is False and oldreport['capture']['frames'][-1]['lab']['following'] is True, 'Original immediate/next-target Follow lineage differs')
    done('frozen-authorities-source-copies-dist-gates-borrowed-and-V1-lineage', helpers=7, currentSources=592, copiedSources=592, compiledFiles=49)

    cap = report['capture']
    must(report['valid'] is False and report['incomplete'] is True and cap['state'] == 'incomplete', 'Native failure changed')
    must(cap['failure'] == 'Error: 96MiB retained numerical/typed payload exceeded', 'Raw-cap first capture failure missing')
    must(report['firstFailure'] == driver['nativeFirstFailure'] and report['firstFailure'], 'Original first failure differs')
    must(report['partialEvidencePreserved'] is True, 'Partial evidence not preserved')
    must(all(report[k] is False for k in ('adoption','qualityPass','fpsGate')), 'Failure incorrectly accepted')
    must(plan['targetsSeconds'] == list(range(0,41,5)) and plan['rawTypedBytes'] == 100663296, 'Targets/raw cap changed')
    bpe = {'Int8Array':1,'Uint8Array':1,'Uint8ClampedArray':1,'Int16Array':2,'Uint16Array':2,'Int32Array':4,'Uint32Array':4,'Float32Array':4,'Float64Array':8,'BigInt64Array':8,'BigUint64Array':8}
    fields = {}
    canonicals = {}
    payload_aliases = {}
    physical = logical_owned = png_bytes = 0
    for f in cap['fields']:
        label = f['label']
        must(label not in fields, 'Duplicate global descriptor label: '+label)
        if f['kind'] == 'typed':
            must(f['semanticField'] == re.sub(r'^state-[0-8]/','',label), 'Current semantic field changed: '+label)
            must(type(f['elements']) is int and f['elements'] >= 0 and f['type'] in bpe and f['bytes'] == f['elements']*bpe[f['type']], 'Typed descriptor byte/element identity differs: '+label)
            logical_owned += f['bytes']
            if 'payloadDuplicateOf' in f:
                source = canonicals.get(f['payloadDuplicateOf'])
                must(source is not None, 'Alias is not an earlier owned canonical: '+label)
                must(all(f[k] == source[k] for k in ('semanticField','type','elements','bytes')), 'Cross-state semantic/type/length changed: '+label)
                must(f['physicalBytes'] == 0 and f['payloadCanonical'] == source['label'] and f['file'] == source['file'] and f['fileAliasOf'] == source['label'], 'Cross-state file identity differs: '+label)
                must(f['payloadEquality'] == {'method':'Exact full Uint8 byte comparison against earlier immutable owned canonical of same semantic field/type/elements/bytes','equalBytes':f['bytes']}, 'Cross-state equality assertion changed: '+label)
                payload_aliases[label] = f
            else:
                must(f['payloadCanonical'] == label and f['physicalBytes'] == f['bytes'] and f['file']['bytes'] == f['bytes'], 'Canonical accounting differs: '+label)
                must(pathlib.Path(f['file']['path']) == WORK/'native-first/fields'/(label.replace('/','-')+'.bin'), 'Canonical transport path differs: '+label)
                canonicals[label] = f
                physical += f['bytes']
        else:
            must(f['kind'] == 'png' and f['file']['bytes'] == f['bytes'] <= plan['pngFileBytes'], 'Original PNG byte budget differs')
            must(pathlib.Path(f['file']['path']) == WORK/'native-first/frames'/label.replace('/','-'), 'Original PNG transport path differs')
            got = identity(f['file']['path'])
            must(got['head'][:8] == b'\x89PNG\r\n\x1a\n' and got['head'][12:16] == b'IHDR' and struct.unpack('>II',got['head'][16:24]) == (2989,1538), 'Original PNG signature/dimensions differ')
            must(got['tail'] == b'\x00\x00\x00\x00IEND\xaeB`\x82', 'Original PNG terminal chunk missing')
            png_bytes += f['bytes']
        fields[label] = f
    aliases = {}
    logical_alias = 0
    for a in cap['bufferAliases']:
        label = a['label']
        source = fields.get(a['field'])
        must(label not in fields and label not in aliases and source is not None and source['kind'] == 'typed', 'Invalid same-buffer alias label/reference')
        must(label_index(label) == label_index(source['label']) >= 0, 'Within-state alias escaped its state')
        must(a['semanticField'] == a['name'] == label.split('/',1)[1], 'Within-state current semantic name differs')
        must(all(a[k] == source[k] for k in ('type','elements','bytes','payloadCanonical','file')), 'Within-state file/type/byte identity differs')
        must(a['kind'] == 'typed' and a['physicalBytes'] == 0 and a['payloadDuplicateOf'] == source['label'] == a['fileAliasOf'], 'Within-state alias accounting differs')
        must(a['payloadEquality'] == {'method':'Same original buffer/type/interval within this state','equalBytes':a['bytes']}, 'Within-state equality assertion differs')
        aliases[label] = a
        logical_alias += a['bytes']
    registry = {**fields, **aliases}
    descriptor_instances = descriptor_without_direct_file = 0
    def descriptors(obj):
        global descriptor_instances, descriptor_without_direct_file
        if isinstance(obj,dict):
            if obj.get('kind') in ('typed','png') and 'label' in obj:
                descriptor_instances += 1
                original = registry.get(obj['label'])
                must(original is not None, 'Nested current descriptor missing from registry: '+obj['label'])
                for k,v in obj.items():
                    must(k in original and original[k] == v, 'Nested descriptor metadata differs: '+obj['label']+'/'+k)
                if 'file' not in obj:
                    descriptor_without_direct_file += 1
                    must(obj['label'].startswith('start/case-'), 'Unexpected descriptor without direct file')
            for k,v in obj.items():
                if k != 'file':
                    descriptors(v)
        elif isinstance(obj,list):
            for v in obj:
                descriptors(v)
    descriptors(cap)
    expected_artifacts = {f['file']['path']:f['file'] for f in list(canonicals.values())+[x for x in fields.values() if x['kind']=='png']}
    actual_artifacts = {x['path']:x for x in report['artifacts']}
    must(len(actual_artifacts) == len(report['artifacts']) == len(expected_artifacts) and actual_artifacts == expected_artifacts, 'Canonical/original-PNG artifact inventory differs')
    for f in registry.values():
        must(f['file']['path'] in actual_artifacts and f['file'] == actual_artifacts[f['file']['path']], 'Descriptor refers outside actual canonical artifacts')
    fa = {x['label']:x for x in report['fileAliases']}
    must(len(fa) == len(report['fileAliases']) == len(payload_aliases)+len(aliases) and set(fa) == set(payload_aliases)|set(aliases), 'Explicit file alias inventory differs')
    for label,a in {**payload_aliases,**aliases}.items():
        rec = fa[label]
        must(rec['payloadDuplicateOf'] == a['payloadDuplicateOf'] and rec['file'] == a['file'] and rec['logicalBytes'] == a['bytes'] and rec['physicalBytes'] == 0, 'Explicit file alias identity differs: '+label)
        if label in aliases:
            must(rec['withinStateBufferAlias'] is True and rec['payloadCanonical'] == a['payloadCanonical'], 'Explicit within-state alias differs')
    expected = {'physicalBytes':physical,'logicalOwnedFieldBytes':logical_owned,'logicalBufferAliasBytes':logical_alias,'logicalBytes':logical_owned+logical_alias,'canonicalPayloads':len(canonicals),'payloadAliasFields':len(payload_aliases),'withinStateAliases':len(aliases)}
    must(all(report['transportTyped'][k] == v for k,v in expected.items()), 'Transport exact accounting differs')
    must(cap['typedPhysicalBytes'] == cap['typedBytes'] == physical <= plan['rawTypedBytes'], 'Raw physical cap/count differs')
    must(cap['typedLogicalOwnedFieldBytes'] == logical_owned and cap['typedLogicalBufferAliasBytes'] == logical_alias and cap['typedLogicalBytes'] == logical_owned+logical_alias and cap['pngBytes'] == png_bytes, 'Logical/PNG accounting differs')
    must(cap['typedPayloadAliases'] == len(payload_aliases) and cap['typedSameBufferAliases'] == len(aliases), 'Alias counters differ')
    must(cap['observer']['typedCopies'] == len(canonicals) and cap['observer']['typedBytes'] == physical and cap['observer']['pngCopies'] == 8 and cap['observer']['pngBytes'] == png_bytes, 'Observation copy accounting differs')
    must(report['finalObserver']['typedCopies'] == len(canonicals) and report['finalObserver']['typedBytes'] == physical and report['finalObserver']['pngBytes'] == png_bytes, 'Final retained accounting differs')
    done('all-canonical-transport-files-and-descriptor-alias-identities', **expected, pngBytes=png_bytes, originalPNGs=8, artifactFiles=len(actual_artifacts), descriptorInstances=descriptor_instances, originalWorkerAuditDescriptorsResolvedByLabel=descriptor_without_direct_file)

    frames = cap['frames']
    must([f['index'] for f in frames] == list(range(8)) and [f['targetSeconds'] for f in frames] == list(range(0,36,5)), 'Retained eight targets differ')
    must(cap['followClick']['trusted'] is True and cap['followClick']['followingAfterOriginalHandler'] is False, 'Actual trusted click immediate flag differs')
    for f in frames:
        idx = f['index']
        must(f['config'] == plan['expectedConfig'] and f['status']['compute'] == 'gpu' and f['status']['cells'] == 203200, 'Original frame configuration differs')
        must(f['phase'] == ('original-overview' if idx <= 4 else 'after-single-real-Follow-click') and f['lab']['following'] is (idx >= 5), 'Retained camera mode differs')
        must(f['latenessMs'] >= 0 and f['latenessMs'] <= plan['maximumDrawLatenessMs'] and abs((f['relativeWallSeconds']-f['targetSeconds'])*1000-f['latenessMs']) < 1e-6, 'Target timing metadata differs')
        for k,n in [('position',3),('quaternion',4),('matrixWorld',16),('matrixWorldInverse',16),('projectionMatrix',16)]:
            must(len(f['camera'][k]) == n and all(math.isfinite(v) for v in f['camera'][k]), 'Retained camera matrix metadata invalid')
        must(all(x == fields[x['label']] for x in f['fields']) and all(x == aliases[x['label']] for x in f['aliases']), 'Complete frame descriptors differ')
        must({x['label'] for x in f['fields']} == {x['label'] for x in fields.values() if label_index(x['label']) == idx and x['kind']=='typed'}, 'Complete frame field inventory differs')
        must({x['label'] for x in f['aliases']} == {x['label'] for x in aliases.values() if label_index(x['label']) == idx}, 'Complete frame alias inventory differs')
        png = fields['state-'+str(idx)+'/original.png']
        must(f['pixels']['field'] == png and (f['pixels']['width'],f['pixels']['height']) == (2989,1538), 'Retained original pixels descriptor differs')
        must(fields['state-'+str(idx)+'/front']['bytes'] == f['frontCount']*9*4, 'Active published front prefix differs')
        upto = [x for x in fields.values() if label_index(x['label']) <= idx]
        must(f['ownedTypedBytesAfter'] == sum(x['physicalBytes'] for x in upto if x['kind']=='typed'), 'Complete frame physical counter differs')
        must(f['logicalOwnedFieldBytesAfter'] == sum(x['bytes'] for x in upto if x['kind']=='typed'), 'Complete frame logical counter differs')
        must(f['logicalBufferAliasBytesAfter'] == sum(x['bytes'] for x in aliases.values() if label_index(x['label']) <= idx), 'Complete frame alias counter differs')
        must(f['ownedPNGBytesAfter'] == sum(x['bytes'] for x in upto if x['kind']=='png'), 'Complete frame PNG counter differs')
    partial = [x for x in fields.values() if label_index(x['label']) == 8]
    must(partial and all(x['kind']=='typed' for x in partial) and 'state-8/original.png' not in fields, 'Failed ninth snapshot incorrectly completed')
    must(all(label_index(x['label']) >= 0 or x['label'].startswith('start/case-') for x in fields.values()), 'Unknown capture label scope')
    done('eight-complete-targets-and-raw-cap-failed-ninth-snapshot', completeTargetsSeconds=list(range(0,36,5)), completeFrames=8, partialNinthTypedDescriptors=len(partial), partialNinthWithinStateAliases=sum(label_index(x['label']) == 8 for x in aliases.values()), rawCapFailure=cap['failure'], typedHeadroomBytes=plan['rawTypedBytes']-physical, nineStateQuality=False)

    served = report['servedGETs']
    for receipt in served:
        source = compiled.get(receipt['relativePath'])
        must(source is not None and (receipt['bytes'],receipt['sha256']) == (source['bytes'],source['sha256']), 'Actual served body differs from copied compiled pin')
        must(receipt['completed'] is True and stamp(receipt['finishedAt']) >= stamp(receipt['startedAt']), 'Actual GET did not finish')
    must(report['servingOverhead']['bodyBytes'] == sum(x['bytes'] for x in served), 'Actual served byte accounting differs')
    starts = cap['workerStarts']
    must(len(starts) == 1 and starts[0]['config'] == plan['expectedConfig'], 'Original worker start differs')
    must(starts[0]['rider'] == {'own':True,'undefined':False,'value':False}, 'Original no-rider start differs')
    for k in ('componentCount','board','contact','sea','soloOneStep'):
        must(starts[0][k] == {'own':False,'undefined':True}, 'Unexpected worker override: '+k)
    must(starts[0]['renderSpacing'] == {'own':True,'undefined':True}, 'Original render spacing override differs')
    must(len(starts[0]['cases']) == 4, 'Four original start cases missing')
    for i,asset in enumerate(plan['caseAssets']):
        case = starts[0]['cases'][i]
        original = compiled[asset]
        matches = [x for x in served if x['relativePath'] == asset]
        must(len(matches) == 1 and matches[0]['completed'] is True, 'Original case GET missing/duplicated')
        must((case['file']['bytes'],case['file']['sha256']) == (original['bytes'],original['sha256']), 'Actual original case/start bytes differ')
        must(identity(case['file']['path'])['body'] == identity(original['path'])['body'], 'Original case/start full bytes differ')
    url = urllib.parse.urlparse(cap['workerAudit']['url'])
    must(url.scheme == 'http' and url.netloc == '127.0.0.1:4259' and url.path.lstrip('/') == binding['worker'], 'Original worker URL/compiled binding differs')
    must(any(x['relativePath'] == binding['worker'] for x in served), 'Original worker body not served')
    must(cap['workerAudit']['badAdvances'] == 0 and cap['workerAudit']['interventions'] == [], 'Original passive worker advance evidence differs')
    done('actual-completed-original-GETs-and-four-case-start-bodies', completedGETs=len(served), servedBodyBytes=sum(x['bytes'] for x in served), originalCases=4, directCaseFullByteComparisons=4)

    must((plan['commandSeconds'],plan['cleanupSeconds'],plan['wholeSeconds']) == (175,5,180), 'Native timing plan changed')
    must((driver['commandSeconds'],driver['cleanupSeconds'],driver['wholeSeconds']) == (175,5,180), 'Independent timing receipt differs')
    must(driver['valid'] is False and driver['nativeValid'] is False and driver['nativeIncomplete'] is True and driver['exitCode'] == 1, 'Independent failed outcome differs')
    must(driver['processGroupCreatedByThisDriver'] is True and driver['pid'] == driver['processGroup'] == report['ownedServer']['pid'], 'Fresh owned process group identity differs')
    must(driver['membersAtCleanup'] == [] and driver['membersAfterCleanup'] == [] and driver['signals'] == [], 'Unexpected owned process/signal closure evidence')
    must(driver['independentClosureValid'] is True and driver['cleanupElapsedSeconds'] <= 5 and driver['elapsedSeconds'] <= 180 and driver['elapsedSeconds'] <= 175, 'Independent closure/time evidence invalid')
    must(abs((stamp(driver['endedAt'])-stamp(driver['startedAt'])).total_seconds()-driver['elapsedSeconds']) < .01, 'Driver wall/monotonic duration differs')
    for owner in (driver,report):
        for phase in ('prePorts','postPorts'):
            for port in ('4259','9669'):
                must(owner[phase][port] == {'closed':True,'reason':'ECONNREFUSED'}, 'Owned port not independently closed')
            must(owner[phase]['5173'] == {'closed':False,'reason':'TCP accepted'} and owner[phase]['4200'] == {'closed':True,'reason':'ECONNREFUSED'}, 'Read-only unrelated port witness differs')
    must(report['launcher']['ownedChromeClosed'] is True and report['launcher']['portProof'] == {'closed':True,'reason':'ECONNREFUSED'} and report['launcher']['exit']['code'] == 0, 'Owned Chrome closure differs')
    must(report['launcher']['resizeOverrides'] == [] and report['teardown']['restored'] is True, 'Original viewport/observer teardown differs')
    out = WORK/'native-first'
    actual_files = {str(p) for p in out.rglob('*') if p.is_file()}
    must(actual_files == set(actual_artifacts)|{str(out/'report.json'),str(out/'native.log')}, 'Native output file inventory differs')
    native_bytes = sum(identity(p)['bytes'] for p in actual_files)
    native_log = identity(out/'native.log')
    driver_log = identity(WORK/'native-first.native-driver.log')
    driver_receipt = identity(WORK/'native-first.native-driver.json')
    whole_bytes = native_bytes + driver_log['bytes'] + driver_receipt['bytes']
    must(native_bytes == report['budgets']['outputBytes'] == driver['nativeOutputBytes'], 'Native output exact byte accounting differs')
    must(whole_bytes == driver['wholeOutputBytes'] <= plan['allOutputBytes'] == 402653184, 'Whole output exact byte accounting/cap differs')
    must(native_log['bytes'] == report['budgets']['logBytes'] <= plan['nativeLogBytes'] == 524288, 'Native log share differs')
    must(driver_log['bytes'] <= plan['driverLogBytes'] == 524288 and driver_receipt['bytes'] <= plan['driverReceiptBytes'] == 131072, 'Supervisor reserved share differs')
    must(native_log['bytes']+driver_log['bytes'] == driver['totalLogBytes'] <= plan['logBytes'] == 1048576, 'Combined exact log accounting/cap differs')
    must(report['budgets']['driverLogReservedBytes'] == 524288 and report['budgets']['driverReceiptReservedBytes'] == 131072 and report['budgets']['combinedLogCapBytes'] == 1048576, 'Native output reserved receipt/log caps differ')
    must(identity(out/'report.json')['bytes'] <= plan['metadataFileBytes'], 'Retained metadata file cap differs')
    done('independent-driver-original-report-logs-closure-time-and-exact-budgets', driverElapsedSeconds=driver['elapsedSeconds'], cleanupElapsedSeconds=driver['cleanupElapsedSeconds'], independentClosureValid=True, nativeOutputBytes=native_bytes, wholeOutputBytes=whole_bytes, combinedLogBytes=driver['totalLogBytes'], unrelated5173='TCP accepted before and after; read-only witness')
    result.update(valid=True, inputIntegrityValid=True, failedPartialCapturePreserved=True,
                  ready=short_identity(WORK/'ready.json'), bindings=short_identity(WORK/'bindings.json'),
                  nativeReport=short_identity(out/'report.json'), independentDriver=short_identity(WORK/'native-first.native-driver.json'),
                  nativeLog=short_identity(out/'native.log'), driverLog=short_identity(WORK/'native-first.native-driver.log'),
                  originalFirstFailure=report['firstFailure'], captureFailure=cap['failure'],
                  nineStateQuality=False, adoption=False, fpsPass=False,
                  pinOccurrencesVerified=pin_occurrences, uniquePathsReadOnce=len(cache),
                  uniqueFileBytesRead=sum(x['bytes'] for x in cache.values()))
except BaseException as exc:
    result['firstFailure'] = type(exc).__name__+': '+str(exc)
    result['firstFailureTraceback'] = traceback.format_exc()[-8192:]
finally:
    signal.setitimer(signal.ITIMER_REAL, 0)
    result['endedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    result['elapsedSeconds'] = time.monotonic()-started
    body = (json.dumps(result,indent=2)+'\n').encode()
    if len(body) > MAX_OUTPUT:
        body = (json.dumps({'valid':False,'inputIntegrityValid':False,'firstFailure':result.get('firstFailure','Verification result exceeded 128KiB'),'nineStateQuality':False,'adoption':False,'fpsPass':False})+'\n').encode()
    with pathlib.Path(str(PREFIX)+'.result.json').open('xb') as f:
        f.write(body)
    print(body.decode(),end='')
sys.exit(0 if result['valid'] else 1)
