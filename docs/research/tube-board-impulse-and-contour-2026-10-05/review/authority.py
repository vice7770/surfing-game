"""Read-only post-terminal authority checks; imported only by root's gated analyzer."""
from pathlib import Path
import hashlib, json, re

CANDIDATE = Path('/private/tmp/tube-native-trial-balance-native-20261005')
BASELINE = Path('/private/tmp/tube-pop-up-contact-operands-native-v11-20261005')
OBSERVER = Path('/private/tmp/tube-native-trial-balance-observer-20261005')
V8 = Path('/private/tmp/tube-pop-up-contact-operands-native-v8-20261005')
BUILD_ID = 'tube-native-trial-balance-20261005'
EXPECTED_SEAL = '19847d2bf1af8944a28f841a13fde0f88d688f271376842363d1a70605a4c549'
RUNTIME = 'src/physics/AttachedRider.ts'
EXTRA = 'docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json'

def pin(path):
    p = Path(path)
    raw = p.read_bytes()
    return {'file': str(p), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}

def check(record):
    assert pin(record['file']) == record, ('Current pin differs', record['file'])
    return record

def load(path):
    return json.loads(Path(path).read_text())

def pinned_json(record):
    check(record)
    return load(record['file'])

def closure(owner, schema):
    assert owner['schema'] == schema and owner['complete'] is True
    assert owner['exitCode'] == 0 and owner['firstFailure'] is None
    assert owner['sourceBuildHelpersPostUnchanged'] is True
    assert owner['independentClosureValid'] is True and owner['protectedPortsPreserved'] is True
    assert owner['remainingOwnedPids'] == []
    assert owner['closedPorts'] == {'4301': True, '9711': True}
    expected = {'4310': True, '4311': True, '4312': False, '4313': False}
    assert owner['protectedStatesInitially'] == owner['protectedStatesFinally'] == expected
    assert owner['protectedPortsStillOpen'] == {'4310': False, '4311': False, '4312': True, '4313': True}
    assert owner['elapsedSeconds'] <= 660 and owner['cleanupElapsedSeconds'] <= 7
    return {key: owner[key] for key in ('complete', 'exitCode', 'sourceBuildHelpersPostUnchanged',
        'independentClosureValid', 'protectedPortsPreserved', 'remainingOwnedPids', 'closedPorts',
        'protectedStatesInitially', 'protectedStatesFinally', 'protectedPortsStillOpen',
        'elapsedSeconds', 'cleanupElapsedSeconds')}

def verify(owner, report, expected_seal):
    """Never probes ports/PIDs or imports native helpers. All closure evidence is recorded."""
    assert expected_seal == EXPECTED_SEAL
    seal_pin = pin(CANDIDATE / 'seal.json')
    assert seal_pin['bytes'] == 194155 and seal_pin['sha256'] == expected_seal
    assert report['sealSha256'] == owner['sealSha256'] == expected_seal
    seal = load(seal_pin['file'])
    assert seal['schema'] == 'trial-balance-root-seal/v1' and seal['complete'] is True
    arm = seal['arms']['candidate']
    assert arm['rootAuthorized'] is True and arm['buildId'] == BUILD_ID
    assert arm['dist'] == owner['dist'] == str(CANDIDATE / 'candidate-complete-dist')
    assert report['schema'] == 'trial-balance-native/v1' and report['complete'] is True
    assert report['firstFailure'] is None and report['chromeClosed'] is True and report['browserErrors'] == []
    assert report['diagnosticModule'] == seal['diagnosticModule']
    assert report['rootCompleteBuild'] == seal['rootCompleteBuild']

    source = pinned_json(seal['sourceReadiness'])
    assert source['schema'] == 'trial-balance-source-readiness/v1' and source['complete'] is True and source['frozen'] is True
    assert source['sourceDirectory'] == str(CANDIDATE / 'source') and source['buildId'] == BUILD_ID
    assert (source['sourceCount'], source['applicationSourceCount'], source['unchangedParentInputs']) == (588, 587, 587)
    assert source['runtimeChangedPaths'] == [RUNTIME]
    assert source['rootObserverChecks'] == source['rootCPUResult']
    assert source['rootCPUResult']['file'] == str(OBSERVER / 'root-bounded-graph-checks/result.json')
    cpu = pinned_json(source['rootCPUResult'])
    assert cpu['complete'] is True and cpu['sourcePostUnchanged'] is True
    assert cpu['checks'] and all(q['exitCode'] == 0 for q in cpu['checks'])
    for key in ('sourceInputs', 'oracleInputs', 'checkInputs'):
        for record in cpu[key]: check(record)
    manifest = pinned_json(source['sourcePinsManifest'])
    delta = pinned_json(source['sourceDelta'])
    parent = pinned_json(source['parentManifest'])
    assert manifest['schema'] == 'trial-balance-source-pins/v1' and manifest['count'] == len(manifest['pins']) == 588
    rows = {q['path']: q for q in manifest['pins']}
    assert len(rows) == 588 and source['parentManifest']['file'] == str(V8 / 'source-manifest.json')
    old = {}
    for item in parent['files']:
        q = check(item['after'])
        assert item['path'] not in old
        old[item['path']] = {'path': item['path'], 'bytes': q['bytes'], 'sha256': q['sha256']}
    assert len(old) == 588 and old.keys() == rows.keys()
    changes = [key for key in sorted(rows) if rows[key] != old[key]]
    assert changes == [RUNTIME]
    assert (old[RUNTIME]['bytes'], old[RUNTIME]['sha256']) == (146425, 'd6d54aa4f6e20ff7ffcebc39450957b7a81ec26cf14886edec7882d8ecae7b31')
    assert (rows[RUNTIME]['bytes'], rows[RUNTIME]['sha256']) == (153209, '1a92e1b5ebe216c4a29f32a12e274a0d7f713d4bed0202ff54f4c1742cb2a2f4')
    assert delta['schema'] == 'trial-balance-source-delta/v1'
    assert delta['source'] == str(CANDIDATE / 'source') and delta['sourceCount'] == 588 and delta['unchangedParentInputs'] == 587
    assert delta['parentManifest'] == source['parentManifest']
    assert delta['overrides'] == [{'path': RUNTIME, 'before': old[RUNTIME], 'after': rows[RUNTIME]}]
    for relative, q in rows.items():
        assert not Path(relative).is_absolute() and '..' not in Path(relative).parts
        check({'file': str(CANDIDATE / 'source' / relative), 'bytes': q['bytes'], 'sha256': q['sha256']})
    actual_source_files = {str(p.relative_to(CANDIDATE / 'source')) for p in (CANDIDATE / 'source').rglob('*') if p.is_file()}
    assert actual_source_files == set(rows), ('Source filesystem inventory differs', sorted(actual_source_files ^ set(rows)))
    for key in ('candidateRuntime', 'candidatePreparation', 'candidatePatch', 'observerFields', 'rootBaseCopy'): check(source[key])

    build = pinned_json(seal['rootCompleteBuild'])
    assert arm['rootBuildManifest'] == seal['rootCompleteBuild']
    assert build['schema'] == 'trial-balance-root-complete-build/v1' and build['terminal'] is True and build['exitCode'] == 0
    assert build['buildId'] == BUILD_ID and build['source'] == source['sourceDirectory'] and build['sourceUnchangedAfterBuild'] is True
    assert build['readiness'] == seal['sourceReadiness']
    assert len(build['sourcePins']) == len({q['file'] for q in build['sourcePins']}) == 587
    expected_app = [{'file': str(CANDIDATE / 'source' / k), 'bytes': q['bytes'], 'sha256': q['sha256']} for k, q in sorted(rows.items()) if k != EXTRA]
    assert sorted(build['sourcePins'], key=lambda q: q['file']) == expected_app
    assert build['sourcePins'] == arm['sourcePins'] and build['assetPins'] == build['frozenAssetPins'] == arm['assetPins']
    assert len(build['assetPins']) == len({q['file'] for q in build['assetPins']}) == 49
    assets = {str(Path(q['file']).relative_to(Path(owner['dist']))): q for q in build['assetPins']}
    assert set(assets) == {str(p.relative_to(Path(owner['dist']))) for p in Path(owner['dist']).rglob('*') if p.is_file()}
    for q in build['sourcePins'] + build['assetPins']: check(q)
    partial = pinned_json(build['rootPartialBuildResult'])
    check(build['rootOriginalBuildResult'])
    assert partial['terminal'] is True and partial['exitCode'] == 0 and partial['sourcePins'] == build['sourcePins'] and partial['buildId'] == BUILD_ID
    static = pinned_json(build['priorStaticAssetsSeal'])
    assert static['schema'] == 'bounded-C-root-seal/v1' and static['complete'] is True
    old_assets = {q['file']: q for q in static['arms']['candidate']['assetPins']}
    comp = build['staticComposition']
    assert comp['sourceRuntimeCodeChanged'] is False and comp['rebuildPerformed'] is False and comp['partialBuildPreserved'] is True
    built, additional = set(), set()
    assert comp['newBuildAssets'] == len(build['builtAssetPins']) == len(partial['frozenAssetPins'])
    assert comp['additionalStaticAssets'] == len(comp['references']) and comp['identicalOverlap'] == len(comp['overlap'])
    for q in build['builtAssetPins']:
        check(q); relative = str(Path(q['file']).relative_to(Path(build['builtDist'])))
        assert (q['bytes'], q['sha256']) == (assets[relative]['bytes'], assets[relative]['sha256']); built.add(relative)
    for q in comp['references'] + comp['overlap']:
        original, copied = check(q['source']), check(q.get('frozenCopy', q.get('sameBuiltAsset')))
        assert original == old_assets[original['file']] and copied == assets[q['relative']]
        assert (original['bytes'], original['sha256']) == (copied['bytes'], copied['sha256'])
        if 'frozenCopy' in q: additional.add(q['relative']); assert q['relative'] not in built
        else: assert q['relative'] in built
    assert set(assets) == built | additional and len(additional) == comp['additionalStaticAssets']
    assert pinned_json(assets['build.json'])['build'] == BUILD_ID

    diag = pinned_json(seal['rootDiagnosticBuild'])
    assert diag['schema'] == 'trial-balance-diagnostic-root-build/v1' and diag['terminal'] is True and diag['exitCode'] == 0
    assert diag['module'] == seal['diagnosticModule'] and diag['rootCompleteBuild'] == seal['rootCompleteBuild']
    assert diag['sourceReadiness'] == seal['sourceReadiness'] and diag['source'] == build['source']
    assert len(diag['inputs']) == len({q['file'] for q in diag['inputs']}) == 74
    assert len(diag['sourceInputs']) == len({q['file'] for q in diag['sourceInputs']}) == 71
    app_map = {q['file']: q for q in build['sourcePins']}
    assert all(q == app_map[q['file']] and q in diag['inputs'] for q in diag['sourceInputs'])
    assert str(CANDIDATE / 'source' / RUNTIME) in {q['file'] for q in diag['sourceInputs']}
    original = pinned_json(diag['originalDiagnosticBuild'])
    expected_graph = {str(Path(build['source']) / Path(q['file']).relative_to(original['source'])) for q in original['sourceInputs']}
    assert {q['file'] for q in diag['sourceInputs']} == expected_graph and diag['originalGraphMappedExactly'] is True
    outside = [q for q in diag['inputs'] if q not in diag['sourceInputs']]
    original_outside = [q for q in original['inputs'] if q not in original['sourceInputs'] and q != original['entry']]
    assert sorted(outside, key=lambda q: q['file']) == sorted(original_outside + [diag['entry']], key=lambda q: q['file'])
    assert diag['originalEntry'] == original['entry']
    assert Path(diag['entry']['file']).read_text() == Path(original['entry']['file']).read_text().replace(original['source'], build['source'])
    assert len(diag['compilerConfigurationInputs']) == 1 and diag['compilerWatchedInputCount'] == 75
    assert diag['compilerConfigurationInputs'][0] == app_map[str(CANDIDATE / 'source/tsconfig.json')]
    assert sorted(diag['moduleExports']) == ['Autopilot', 'autopilotView', 'riderPartVolumes']
    assert diag['attachedRiderReachable'] is True and diag['actualNewDiagnosticSourceCompiled'] is True and diag['diagnosticModuleCopiedFromPrior'] is False
    assert diag['changedSourceInputsAgainstV8'] == [RUNTIME] and diag['sourceOrCompleteDistModified'] is False
    assert (diag['observerFieldCount'], diag['originalObserverFieldCount'], diag['newObserverScalarCount']) == (102, 38, 63)
    for q in diag['inputs'] + diag['compilerConfigurationInputs'] + [diag['module'], diag['observerFields'], diag['originalFailedCompilation'], diag['parentV8DiagnosticBuild']]: check(q)
    candidate_fields_pin = pin(CANDIDATE / 'observer-fields.json')
    frozen_fields_pin = pin(OBSERVER / 'observer-fields.json')
    assert diag['observerFields'] == candidate_fields_pin
    assert (candidate_fields_pin['bytes'], candidate_fields_pin['sha256']) == (8731, '19917b765b18c8b1e37e608878e9041115e1b96fdd21d46451a36d375554d72a')
    assert (candidate_fields_pin['bytes'], candidate_fields_pin['sha256']) == (frozen_fields_pin['bytes'], frozen_fields_pin['sha256'])
    fields = load(candidate_fields_pin['file'])
    module_text = Path(diag['module']['file']).read_text()
    module_fields_present = [word for word in fields['allFields'] if re.search(r'\b' + re.escape(word) + r'\b', module_text)]
    assert len(module_fields_present) == len(set(fields['allFields'])) == 102

    helpers = pinned_json(seal['helperPinsManifest'])
    ready = pinned_json(seal['helperReadiness'])
    assert helpers['schema'] == 'trial-balance-helper-pins/v1' and helpers['pins'] == seal['helperPins']
    assert len(helpers['pins']) == len({q['file'] for q in helpers['pins']}) == 79
    assert ready['schema'] == 'trial-balance-preparation-readiness/v1' and ready['complete'] is True and ready['frozen'] is True
    for key in ('actualAppBuildAccepted', 'actualDiagnosticBuildAccepted', 'helperAcceptance', 'executableChecksAccepted'): assert ready[key] is True
    assert ready['sourceReadiness'] == seal['sourceReadiness'] and ready['totalFields'] == 102
    checks = pinned_json(ready['rootHelperChecks'])
    assert checks['schema'] == 'trial-balance-root-helper-checks/v1' and checks['complete'] is True
    for name in ('nativeSyntax', 'diagnosticWrapperSyntax', 'sourceOnlyOwner'):
        assert checks[name]['run'] is True and checks[name]['exitCode'] == 0; check(checks[name]['log'])
    for q in helpers['pins']: check(q)
    served = []
    assert owner['served'] and 'diagnostic-autopilot.mjs' in owner['served']
    for relative, receipt in owner['served'].items():
        expected = diag['module'] if receipt.get('separateDiagnosticRoute') else assets[relative]
        assert (receipt['bytes'], receipt['sha256']) == (expected['bytes'], expected['sha256'])
        check(expected); served.append({'relative': relative, 'receipt': receipt, 'currentPin': expected})
    history = []
    for name in ('root-checks', 'root-boundary-checks', 'root-word-checks'):
        path = OBSERVER / name / 'result.json'
        assert path.is_file(), ('Preserved CPU history missing', path)
        history.append({'pin': pin(path), 'record': load(path), 'acceptedAsCurrentAuthority': False})
    for key, q in seal.items():
        if isinstance(q, dict) and {'file', 'bytes', 'sha256'} <= q.keys(): check({k: q[k] for k in ('file', 'bytes', 'sha256')})
    return {'seal': seal_pin, 'source': source, 'currentCPU': {'pin': source['rootCPUResult'], 'record': cpu},
        'preservedCPUHistory': history, 'sourceChangesAgainstExactV8': changes,
        'counts': {'sourceDeclared': source['sourceCount'], 'sourcePinsActual': len(rows), 'sourceFilesystemActual': len(actual_source_files),
            'appDeclared': source['applicationSourceCount'], 'appPinsActual': len(build['sourcePins']), 'assetsExpected': 49, 'assetPinsActual': len(assets),
            'diagnosticInputsExpected': 74, 'diagnosticInputsActual': len(diag['inputs']), 'diagnosticSourcesExpected': 71,
            'diagnosticSourcesActual': len(diag['sourceInputs']), 'diagnosticWatchedDeclared': diag['compilerWatchedInputCount'],
            'diagnosticWatchedActual': len(diag['inputs']) + len(diag['compilerConfigurationInputs']), 'moduleFieldsDeclared': diag['observerFieldCount'],
            'moduleFieldIdentifiersPresentActual': len(module_fields_present),
            'helperPinsExpected': 79, 'helperPinsActual': len(helpers['pins'])}, 'served': served,
        'closure': closure(owner, 'trial-balance-finite-owner/v1'), 'portsOrPidsProbedByAudit': False}
