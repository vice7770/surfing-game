#!/usr/bin/env python3
"""Byte/reference/gzip integrity only; never import archived code or rerun it."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

def check(data, expected, label):
    assert len(data) == expected['bytes'], f"byte count mismatch: {label}"
    assert hashlib.sha256(data).hexdigest() == expected['sha256'], f"SHA256 mismatch: {label}"

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--original-scratch', action='store_true', help='Also read and hash pinned original paths; no execution.')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    raw_manifest = (root / 'manifest.json').read_bytes()
    manifest = json.loads(raw_manifest)
    counts = {'logicalScratchPayloads': 0, 'referencedPayloads': 0, 'generatedArchiveFiles': 0, 'gzipDecoded': 0, 'originalPathsVerified': 0}
    for group, key in [('payloads', 'logicalScratchPayloads'), ('references', 'referencedPayloads'), ('archiveFiles', 'generatedArchiveFiles')]:
        for item in manifest[group]:
            storage = item['storage']
            path = root / storage['path']
            encoded = path.read_bytes()
            if storage.get('compression') == 'gzip':
                check(encoded, storage['encoded'], str(path) + ' (gzip transport)')
                data = gzip.decompress(encoded)
                counts['gzipDecoded'] += 1
            else:
                data = encoded
            check(data, item, str(path) + ' (decoded/original bytes)')
            counts[key] += 1
            if args.original_scratch and 'original' in item:
                check(Path(item['original']).read_bytes(), item, item['original'])
                counts['originalPathsVerified'] += 1
    print(json.dumps({'complete': True, 'verification': 'bytes/references/gzip only; no archived code execution', 'originalScratch': args.original_scratch, 'manifestSha256': hashlib.sha256(raw_manifest).hexdigest(), **counts}, indent=2))

if __name__ == '__main__':
    main()
