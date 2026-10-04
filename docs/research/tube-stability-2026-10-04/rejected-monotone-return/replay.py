"""Optional finite replay of the recorded fixed candidate; never a parameter search."""
import argparse
import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import sys
import tempfile

ARCHIVE = Path(__file__).resolve().parent
sha = lambda b: hashlib.sha256(b).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=ARCHIVE.parents[3])
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    repo = args.repo.resolve()
    refs = json.loads((ARCHIVE / 'input-references.json').read_text())
    archived = {}
    for entry in refs['reusedArchivedInputsAndLoaders']:
        p = repo / entry['repositoryRelative']
        data = p.read_bytes()
        assert len(data) == entry['bytes'] and sha(data) == entry['sha256'], p
        if p.suffix == '.gz':
            data = gzip.decompress(data)
            assert len(data) == entry['uncompressedBytes'] and sha(data) == entry['uncompressedSha256'], p
        archived[p.name] = data
    index = json.loads(archived['case-frame-index.json.gz'])
    cases = copy.deepcopy(index['cases'])
    for case in cases:
        relative = case['asset'].pop('repositoryRelative')
        p = repo / relative
        data = p.read_bytes()
        assert len(data) == case['asset']['bytes'] and sha(data) == case['asset']['sha256'], p
        case['asset']['file'] = str(p)
        for frame in case['eligible']:
            offset, count = frame.pop('byteOffset'), frame.pop('floatCount')
            expected = frame.pop('frameBytesSha256')
            payload = data[offset:offset + 4 * count]
            assert len(payload) == 4 * count and sha(payload) == expected
            frame['profile'] = [0.0 if x == 0 else x for x in struct.unpack('<' + str(count) + 'f', payload)]
    assert sum(len(c['eligible']) for c in cases) == 293
    work = args.output.resolve() if args.output else Path(tempfile.mkdtemp(prefix='monotone-return-replay-'))
    if args.output:
        work.mkdir(parents=True, exist_ok=False)
    for name in ('prototype.py', 'air_metrics.py', 'measurement_functions.py'):
        (work / name).write_bytes((ARCHIVE / 'source' / name).read_bytes())
    for name in ('load-cases.ts', 'load-cases.mjs'):
        (work / name).write_bytes(archived[name])
    capture, baseline = work / 'captured.json', work / 'air-baseline.json'
    capture.write_bytes(archived['captured-polylines.json.gz'])
    baseline.write_bytes(archived['air-baseline.json.gz'])
    eligibility = {'schema': 'thin-roof-eligible/v1', 'complete': True,
                   'sourceFiles': index['sourceFiles'], 'sourceOwner': index['sourceOwner'],
                   'eligibility': index['eligibility'], 'cases': cases}
    (work / 'eligible-cases.json').write_text(json.dumps(eligibility, separators=(',', ':')) + '\n')
    sys.path.insert(0, str(work))
    sys.dont_write_bytecode = True
    spec = importlib.util.spec_from_file_location('recorded_monotone', work / 'prototype.py')
    prototype = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(prototype)
    prototype.WORK, prototype.SOURCE, prototype.PRIOR_BASELINE = work, capture, baseline
    prototype.main()
    observed = json.loads((work / 'report.json').read_text())
    expected = json.loads(gzip.decompress((ARCHIVE / 'evidence/original-report.json.gz').read_bytes()))
    # Asset file paths can move with the caller's checkout; numeric/shape and remaining metadata must match.
    for c in observed['cases']:
        old = next(x for x in expected['cases'] if x['id'] == c['id'])
        c['asset']['file'] = old['asset']['file']
    for key in ('actualSections', 'actualAggregate', 'cases', 'aggregate', 'unsafeOfflineFindings', 'stopped'):
        assert observed[key] == expected[key], key
    print(json.dumps({'complete': True, 'allFiveCapturedSectionsExact': True,
                      'allEightCasesAnd293FrameRecordsExact': True, 'output': str(work),
                      'comparison': 'Numeric/profile structures; relocated source paths/hashes excluded.'}))


if __name__ == '__main__':
    main()
