#!/usr/bin/env python3
"""Verify only archive bytes; this never imports or executes the archived runtime/tests."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--external', action='store_true', help='Also verify existing external files; missing paths are reported.')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    manifest = json.loads((root / 'manifest.json').read_bytes())
    files = 0
    aliases = 0
    for row in manifest['records']:
        path = root / row['storedPath']
        assert path.resolve().is_relative_to(root), row['storedPath']
        raw = path.read_bytes()
        assert len(raw) == row['storedBytes'] and digest(raw) == row['storedSha256'], row['storedPath']
        if row['encoding'] == 'gzip':
            assert raw[4:8] == bytes(4), 'Nonzero gzip mtime: ' + row['storedPath']
            expanded = gzip.decompress(raw)
        else:
            assert row['encoding'] == 'identity', row['storedPath']
            expanded = raw
        assert len(expanded) == row['expandedBytes'] and digest(expanded) == row['expandedSha256'], row['storedPath']
        for alias in row['originalAliases']:
            assert alias['bytes'] == len(expanded) and alias['sha256'] == digest(expanded), alias['path']
            aliases += 1
        if row['mediaType'] == 'application/json':
            json.loads(expanded)
        if row['mediaType'] == 'image/png':
            assert expanded[:8] == b'\x89PNG\r\n\x1a\n', row['storedPath']
            assert [int.from_bytes(expanded[16:20], 'big'), int.from_bytes(expanded[20:24], 'big')] == [1920, 1080]
        files += 1
    for row in manifest['generatedRecords']:
        raw = (root / row['path']).read_bytes()
        assert len(raw) == row['bytes'] and digest(raw) == row['sha256'], row['path']
    assert not list(root.rglob('*.test.ts')), 'Archived tests must end .test.ts.txt'
    image = manifest['images']
    assert image['retainedCheckpointAliases'] == 16 and image['retainedAliasBytes'] <= 20_000_000
    assert len(manifest['candidateSequence']) == 42
    capture = next(row for row in manifest['records'] if any(alias['path'].endswith('/capture-first/manifest.json') for alias in row['originalAliases']))
    raw = (root / capture['storedPath']).read_bytes()
    capture_data = json.loads(gzip.decompress(raw) if capture['encoding'] == 'gzip' else raw)
    fields = capture_data['shared'] + [field for frame in capture_data['frames'] for field in frame['fields']]
    assert len(fields) == 132 and len(capture_data['frames']) == 21
    offset = 0
    for field in fields:
        assert field['offset'] == offset and field['bytes'] == field['length'] * (4 if field['type'] == 'F32' else 8)
        offset += field['bytes']
    assert offset == capture_data['binary']['expandedBytes']
    external_checked = 0
    external_missing = []
    if args.external:
        for row in manifest['externalRecords']:
            path = Path(row['path'])
            if not path.is_file():
                external_missing.append(str(path))
                continue
            raw = path.read_bytes()
            assert len(raw) == row['bytes'] and digest(raw) == row['sha256'], row['path']
            external_checked += 1
    print(json.dumps({'archive': 'verified', 'storedEvidenceFiles': files, 'originalAliases': aliases,
                      'checkpointImageAliases': 16, 'candidateSequenceReferences': 42, 'captureFieldSlices': 132,
                      'externalChecked': external_checked, 'externalMissing': external_missing}, indent=2))


if __name__ == '__main__':
    main()
