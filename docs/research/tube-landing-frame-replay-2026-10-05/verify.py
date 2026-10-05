#!/usr/bin/env python3
"""Verify recorded evidence without launching a game or executing archived code."""
from pathlib import Path
import gzip
import hashlib
import json

ROOT = Path(__file__).resolve().parent


def check(data, pin):
    assert len(data) == pin['bytes']
    assert hashlib.sha256(data).hexdigest() == pin['sha256']
    return data


def main():
    manifest = json.loads((ROOT / 'manifest.json').read_text())
    assert manifest['schema'] == 'landing-frame-replay-archive/v1'
    assert manifest['complete'] is True
    payloads = {}
    for item in manifest['payloads']:
        path = (ROOT / item['stored']).resolve()
        assert path.is_relative_to(ROOT)
        stored = check(path.read_bytes(), item['storedPin'])
        decoded = gzip.decompress(stored) if item['encoding'] == 'gzip' else stored
        payloads[item['stored']] = check(decoded, item['decodedPin'])
        assert item['original']['bytes'] == item['decodedPin']['bytes']
        assert item['original']['sha256'] == item['decodedPin']['sha256']
    reference = manifest['priorV6Report']
    prior = check((ROOT / reference['stored']).read_bytes(), reference['storedPin'])
    v6 = json.loads(check(gzip.decompress(prior), reference['decodedPin']))
    v7 = json.loads(payloads['capture/report.json.gz'])
    owner = json.loads(payloads['receipts/owner.json'])
    comparison = json.loads(payloads['receipts/actual-comparison.json'])
    assert v7['complete'] and v7['firstFailure'] is None and v7['browserErrors'] == []
    assert v7['stepCount'] == len(v7['steps']) == len(v6['steps']) == 1366
    assert all(a['input'] == b['input'] and a['seaTime'] == b['seaTime']
               for a, b in zip(v7['steps'], v6['steps']))
    for key in ['boardPose', 'riderPoints', 'riderWords']:
        assert all(a[key] == b[key] for a, b in zip(v7['steps'][:1342], v6['steps'][:1342]))
        assert v7['steps'][1342][key] != v6['steps'][1342][key]
    assert v7['stop']['step'] == 1366 and v7['stop']['separation'] == 'lost board'
    loss = v7['firstContactLoss']['diagnostics']['loss']
    assert loss['trigger'] == 'posture-error' and loss['dominantLimit'] == 'flight'
    assert loss['sample']['inContact'] is True and loss['sample']['flightTime'] == 0
    assert loss['sample']['postureError'] > 0.25
    assert owner['complete'] and owner['exitCode'] == 0 and owner['sourceBuildHelpersPostUnchanged']
    assert owner['remainingOwnedPids'] == [] and all(owner['closedPorts'].values())
    assert owner['protectedStatesInitially'] == owner['protectedStatesFinally']
    assert comparison['claims']['knownFailureLandingSolved'] is False
    assert len(v7['loftSnapshots']) == 4
    for snapshot in v7['loftSnapshots']:
        key = 'capture/' + snapshot['file'] + '.gz'
        data = payloads[key]
        assert len(data) == snapshot['bytes']
        assert hashlib.sha256(data).hexdigest() == snapshot['sha256']
    total = sum(p.stat().st_size for p in ROOT.rglob('*') if p.is_file())
    assert total <= manifest['storedByteCap']
    print(json.dumps({'complete': True, 'payloads': len(payloads), 'storedBytes': total,
                      'steps': v7['stepCount'], 'knownFailureSolved': False,
                      'tubePassageOrQualityAcceptance': False}, indent=2))


if __name__ == '__main__':
    main()
