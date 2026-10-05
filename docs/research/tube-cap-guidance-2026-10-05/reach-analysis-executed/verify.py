#!/usr/bin/env python3
"""Administrative byte/reference verification only; never execute archived code."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

def verify_bytes(data, expected, label):
    assert len(data) == expected['bytes'], f"byte mismatch: {label}"
    assert hashlib.sha256(data).hexdigest() == expected['sha256'], f"SHA256 mismatch: {label}"

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--original-scratch', action='store_true')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    raw_manifest = (root / 'manifest.json').read_bytes()
    manifest = json.loads(raw_manifest)
    counts = {'executionPayloads': 0, 'sourceArchivePayloadsAndReferences': 0, 'archiveFiles': 0, 'gzipDecoded': 0, 'originalPathsVerified': 0}
    def check_item(base, item):
        path = base / item['storage']['path']
        data = path.read_bytes()
        if item['storage'].get('compression') == 'gzip':
            verify_bytes(data, item['storage']['encoded'], str(path) + ' gzip transport')
            data = gzip.decompress(data)
            counts['gzipDecoded'] += 1
        verify_bytes(data, item, str(path))
        if args.original_scratch and 'original' in item:
            verify_bytes(Path(item['original']).read_bytes(), item, item['original'])
            counts['originalPathsVerified'] += 1
    for item in manifest['files']:
        check_item(root, item)
        counts['executionPayloads'] += 1
    for item in manifest['archiveFiles']:
        check_item(root, item)
        counts['archiveFiles'] += 1
    reference = manifest['sourceArchive']
    source_manifest_path = root / reference['path']
    source_raw = source_manifest_path.read_bytes()
    verify_bytes(source_raw, reference, str(source_manifest_path))
    source_manifest = json.loads(source_raw)
    for group in ['payloads', 'references', 'archiveFiles']:
        for item in source_manifest[group]:
            check_item(source_manifest_path.parent, item)
            counts['sourceArchivePayloadsAndReferences'] += 1
    # Validate the recorded completed outcome only; never recreate it.
    execution = json.loads((root / 'root-execution.json').read_text())
    assert execution['complete'] is True
    assert execution['actualBundle']['exitCode'] == 0
    assert execution['actualOfflineExecution']['exitCode'] == 0
    assert execution['suggestedEsbuildAttempt']['exitCode'] == 127
    assert execution['observations'] == 34
    assert execution['fixedGridPoints'] == 33
    assert execution['exactPublishedHoldPoints'] == 1
    assert execution['productionChanged'] is False
    print(json.dumps({'complete': True, 'scope': 'bytes/references/recorded-receipt checks only; no rerun', 'manifestSha256': hashlib.sha256(raw_manifest).hexdigest(), 'originalScratch': args.original_scratch, **counts}, indent=2))

if __name__ == '__main__':
    main()
