"""Offline authority adapter; functions run only after root's explicit terminal gate."""
from pathlib import Path
import hashlib, importlib.util, json, re, sys

sys.dont_write_bytecode = True
CANDIDATE = Path('/private/tmp/tube-board-rhs-components-native-20261005')
BASELINE = Path('/private/tmp/tube-native-trial-balance-native-20261005')
PRIOR_AUDIT = Path('/private/tmp/tube-native-trial-balance-actual-review-20261005/root-audit-v3')
BASELINE_SEAL = '19847d2bf1af8944a28f841a13fde0f88d688f271376842363d1a70605a4c549'
BASELINE_REPORT = 'dd71421a152b01ad63e87161db7c80faa5eb84a4b343f3b3698b280e656d65af'
PRIOR_AUTHORITY_PIN = {'file': str(PRIOR_AUDIT / 'authority.py'), 'bytes': 18253,
    'sha256': '19ab3931ca5e119f2b4f311c09ad647f1e10c97551edc09d49a5eb938055816e'}
HISTORICAL_NODE = {'file': '/opt/homebrew/bin/node', 'bytes': 61838736,
    'sha256': 'dad9bfeb954abae3c4af3767909df6ca1b83dc29a61539d2a023605f35afc48e'}

def pin(path):
    p = Path(path); raw = p.read_bytes()
    return {'file': str(p), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}

def check(record):
    assert pin(record['file']) == record, ('Current literal pin differs', record['file'])
    return record

def load(path): return json.loads(Path(path).read_text())

def module(path, name):
    if Path(path) == PRIOR_AUDIT / 'authority.py': check(PRIOR_AUTHORITY_PIN)
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result)
    return result

def closure(owner, schema):
    # Exact successful prior authority logic; no resource functions are imported or called here.
    prior = module(PRIOR_AUDIT / 'authority.py', 'components_prior_closure')
    return prior.closure(owner, schema)

def wrapper_authority(diag, expected_wrapper, expected_wrapper_sha):
    q = diag['compilerWrapper']; check(q)
    assert q['file'] == str(expected_wrapper.resolve()) and q['sha256'] == expected_wrapper_sha
    assert diag['compilerWrapperRevision'] == 'node-alias-v2'
    aliases = diag['historicalAliasResolutions']
    assert isinstance(aliases, list)
    for row in aliases:
        assert row['recordedPin'] == HISTORICAL_NODE
        assert row['exactHistoricalAliasOnly'] is True and row['recordedBytesAndShaVerified'] is True
        check(row['recordedPin']); check(row['canonicalPin'])
        resolved = str(Path(HISTORICAL_NODE['file']).resolve())
        assert row['aliasRealpath'] == row['canonicalPin']['file'] == resolved
        assert (row['canonicalPin']['bytes'], row['canonicalPin']['sha256']) == (HISTORICAL_NODE['bytes'], HISTORICAL_NODE['sha256'])
    return {'compilerWrapper': q, 'revision': diag['compilerWrapperRevision'], 'historicalAliasResolutions': aliases,
        'historicalAliasRecordsValidated': len(aliases), 'canonicalIdentityVerifiedAgainstRecordedAlias': bool(aliases),
        'currentProcessExecutableIdentityClaim': False}

def verify(owner, report, expected_seal, expected_wrapper, expected_wrapper_sha):
    """Use the actual sealed source guards plus explicit offline publication/receipt checks."""
    seal_pin = pin(CANDIDATE / 'seal.json'); assert seal_pin['sha256'] == expected_seal
    seal = load(seal_pin['file'])
    assert seal['schema'] == 'board-rhs-components-root-seal/v1' and seal['complete'] is True
    arm = seal['arms']['candidate']; assert arm['rootAuthorized'] is True
    assert arm['dist'] == owner['dist'] == str(CANDIDATE / 'candidate-complete-dist')
    assert report['sealSha256'] == owner['sealSha256'] == expected_seal
    assert report['schema'] == 'board-rhs-components-native/v1' and report['complete'] is True
    assert report['firstFailure'] is None and report['chromeClosed'] is True and report['browserErrors'] == []
    assert report['diagnosticModule'] == seal['diagnosticModule']
    assert report['rootCompleteBuild'] == arm['rootBuildManifest']
    helper_manifest = load(check(seal['helperPinsManifest'])['file'])
    assert helper_manifest['schema'] == 'board-rhs-components-helper-pins/v1'
    assert helper_manifest['pins'] == seal['helperPins']
    assert len(helper_manifest['pins']) == len({q['file'] for q in helper_manifest['pins']})
    for q in helper_manifest['pins']: check(q)
    owner_path = CANDIDATE / 'run.py'
    assert pin(owner_path) in helper_manifest['pins'], 'Import only current sealed owner guard source.'
    guard = module(owner_path, 'components_sealed_offline_guard')
    source, rows = guard.verify_source_authority(seal['sourceReadiness'])
    build = load(check(arm['rootBuildManifest'])['file'])
    assert guard.verify_complete_build(build, CANDIDATE / 'candidate-complete-dist')
    diag = guard.verify_diagnostic_reference(seal, build)
    revision = wrapper_authority(diag, expected_wrapper, expected_wrapper_sha)
    ready = load(check(seal['helperReadiness'])['file'])
    assert ready['schema'] == 'board-rhs-components-preparation-readiness/v1'
    assert ready['complete'] is True and ready['frozen'] is True and ready['totalFields'] == 143
    assert ready['sourceReadiness'] == seal['sourceReadiness']
    for key in ('actualAppBuildAccepted', 'actualDiagnosticBuildAccepted', 'helperAcceptance', 'executableChecksAccepted'): assert ready[key] is True
    helper_checks = load(check(ready['rootHelperChecks'])['file'])
    assert helper_checks['schema'] == 'board-rhs-components-root-helper-checks/v1' and helper_checks['complete'] is True
    for name in ('nativeSyntax', 'diagnosticWrapperSyntax', 'sourceOnlyOwner'):
        assert helper_checks[name]['run'] is True and helper_checks[name]['exitCode'] == 0; check(helper_checks[name]['log'])
    assets = {str(Path(q['file']).relative_to(Path(owner['dist']))): q for q in build['assetPins']}
    actual_assets = {str(p.relative_to(Path(owner['dist']))) for p in Path(owner['dist']).rglob('*') if p.is_file()}
    assert set(assets) == actual_assets and len(assets) == 49
    served = []; assert owner['served'] and 'diagnostic-autopilot.mjs' in owner['served']
    for relative, receipt in owner['served'].items():
        expected = diag['module'] if receipt.get('separateDiagnosticRoute') else assets[relative]
        check(expected); assert (receipt['bytes'], receipt['sha256']) == (expected['bytes'], expected['sha256'])
        served.append({'relative': relative, 'receipt': receipt, 'currentPin': expected})
    for key, q in seal.items():
        if isinstance(q, dict) and {'file', 'bytes', 'sha256'} <= q.keys(): check({k: q[k] for k in ('file', 'bytes', 'sha256')})
    fields = load(CANDIDATE / 'observer-fields.json')
    lexical = [field for field in fields['allFields'] if re.search(r'(?<![\w$])' + re.escape(field) + r'(?![\w$])', Path(diag['module']['file']).read_text())]
    assert len(lexical) == diag['diagnosticLexicalObserverFieldCount']
    return {'seal': seal_pin, 'source': source, 'sourceInputs': len(rows), 'applicationInputs': len(build['sourcePins']),
        'assets': len(assets), 'generatedOutputs': build['builtAssetPins'] + build['generatedOutputPins'],
        'frozenPrebuildInputs': 588, 'postbuildFiles': 610, 'generatedOutputCount': 22,
        'diagnosticInputs': len(diag['inputs']), 'diagnosticSourceInputs': len(diag['sourceInputs']),
        'diagnosticWatchedInputs': diag['compilerWatchedInputCount'], 'diagnosticLexicalIdentifiers': lexical,
        'bothActualWorkerRetention': guard.verify_worker_field_retention(build), 'wrapperAuthority': revision,
        'helperPinsActual': len(helper_manifest['pins']), 'helperPinCountNotInherited': True, 'served': served,
        'closure': closure(owner, 'board-rhs-components-finite-owner/v1'), 'portsOrPidsProbedByAudit': False}

def verify_baseline(owner, report):
    assert pin(BASELINE / 'seal.json')['sha256'] == BASELINE_SEAL
    assert pin(BASELINE / 'candidate-first/report.json') == {'file': str(BASELINE / 'candidate-first/report.json'),
        'bytes': 13122643, 'sha256': BASELINE_REPORT}
    prior = module(PRIOR_AUDIT / 'authority.py', 'components_prior_authority')
    return prior.verify(owner, report, BASELINE_SEAL)
