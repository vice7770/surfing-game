"""Read-only integrity check for the retained native attribution/comparison."""
from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parent
read = lambda p: json.loads((root / p).read_text())
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
for item in read('manifest.json')['files']:
    file = root / item['file']
    assert file.stat().st_size == item['bytes'] and digest(file) == item['sha256']
baseline, candidate = read('baseline/report.json'), read('candidate/report.json')
comparison = read('comparison.json')
for arm, report in [('baseline', baseline), ('candidate', candidate)]:
    owner = read(f'{arm}/owner.json')
    assert report['complete'] and report['browserErrors'] == []
    assert owner['complete'] and owner['independentClosureValid']
    assert all(owner['closedPorts'].values()) and not owner['remainingOwnedPids']
for name in ['settings', 'overrides', 'graphics', 'target', 'cameraHypothesis', 'selection']:
    assert baseline[name] == candidate[name]
assert baseline['initial']['config'] == candidate['initial']['config']
for a, b, receipt in zip(baseline['frames'], candidate['frames'], comparison['frames'], strict=True):
    assert a['seaTime'] == b['seaTime'] == receipt['seaTime']
    assert a['metrics'] == b['metrics'] and a['trace'] == b['trace']
    assert a['spray']['tally'] == b['spray']['sourceTally']
    assert a['spray']['drawn'] == b['spray']['sourceCount']
    assert b['spray']['tally'].get('2', 0) == 0
    assert {k: v for k, v in a['spray']['tally'].items() if k != '2'} == b['spray']['tally']
    assert a['spray']['normalCanvasRestoredByteExactly'] and b['spray']['normalCanvasRestoredByteExactly']
    i = a['index']
    for name in [f'normal-{i}.png', f'no-rollers-{i}.png']:
        artifact = next(item for item in baseline['artifacts'] if item['file'] == name)
        file = root / 'baseline' / name
        assert file.stat().st_size == artifact['bytes'] and digest(file) == artifact['sha256']
    candidate_artifact = next(item for item in candidate['artifacts'] if item['file'] == f'normal-{i}.png')
    assert digest(root / 'baseline' / f'no-rollers-{i}.png') == candidate_artifact['sha256']
    assert receipt['candidateNormalEqualsBaselineNoRollers']
for reference in read('candidate-png-references.json'):
    file = root / reference['retained']
    assert file.stat().st_size == reference['bytes'] and digest(file) == reference['sha256']
worker = read('worker-comparison.json')['surfZoneWorker-']
assert worker['byteIdentical'] and worker['baselineHash'] == worker['candidateHash']
print('Verified two completed native arms, four original retained PNGs, candidate pixel hashes and recorded geometry/count comparisons.')
