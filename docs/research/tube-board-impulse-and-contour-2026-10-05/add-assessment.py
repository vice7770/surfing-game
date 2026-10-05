from pathlib import Path
import hashlib, json, gzip
OUT = Path('/Users/regina/Desktop/Projects/surfing-game/docs/research/tube-board-impulse-and-contour-2026-10-05')
BASE = Path('/private/tmp/tube-board-rhs-source-assessment-20261005')
def words(raw): return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
p = OUT / 'result.json'
prior_pin = words(p.read_bytes())
result = json.loads(p.read_text())
assert result['archive']['selectedReferences'] == 161
for source, relative in [(BASE / 'ASSESSMENT.md', 'pending-board-rhs-assessment/ASSESSMENT.md'),
                         (BASE / 'pins.json', 'pending-board-rhs-assessment/pins.json'),
                         (Path(__file__), 'add-assessment.py')]:
    raw = source.read_bytes()
    target = OUT / relative
    assert not target.exists()
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(raw)
    assert target.read_bytes() == raw
    result['files'].append({'original': {'file': str(source), **words(raw)},
                            'archived': {'file': relative, **words(raw), 'encoding': 'identity'}})
result['balance']['sourceAssessment'] = 'pending-board-rhs-assessment/ASSESSMENT.md'
result['balance']['nextObserverPreparation'] = 'Source-only143-field draft authorized: retain existing102 and copy41 already computed aggregate RHS scalars; no physics arithmetic or radiation/entrainment split. Not built/tested/run/adopted.'
result['archive']['priorResultBeforeAssessmentAppend'] = prior_pin
result['archive']['selectedReferences'] = len(result['files'])
unique = {q['archived']['file']: q['archived'] for q in result['files']}
result['archive']['uniquePayloads'] = len(unique)
result['archive']['uniquePayloadBytes'] = sum(q['bytes'] for q in unique.values())
result['archive']['unusedPreparatoryScript'] = 'controlled-observer/root-finalize-graph-check.py was prepared but never executed; actual accepted CPU authority is root-bounded-graph-checks/result.json.'
p.write_text(json.dumps(result, indent=2, allow_nan=False) + '\n')
for row in result['files']:
    a, b = row['original'], row['archived']
    assert words(Path(a['file']).read_bytes()) == {k: a[k] for k in ('bytes', 'sha256')}
    stored = (OUT / b['file']).read_bytes()
    assert words(stored) == {k: b[k] for k in ('bytes', 'sha256')}
    raw = gzip.decompress(stored) if b['encoding'] == 'gzip' else stored
    assert words(raw) == {k: a[k] for k in ('bytes', 'sha256')}
actual = {str(q.relative_to(OUT)) for q in OUT.rglob('*') if q.is_file()}
assert actual == set(unique) | {'result.json'}
print(json.dumps({'complete': True, 'references': len(result['files']), 'payloads': len(unique), 'files': len(actual),
                  'totalBytes': sum(q.stat().st_size for q in OUT.rglob('*') if q.is_file()), 'result': words(p.read_bytes())}))
