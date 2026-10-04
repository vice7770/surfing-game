"""Verify retained bytes only; no game execution or external availability claim."""
from pathlib import Path
import gzip, hashlib, json

root = Path(__file__).resolve().parent
manifest = json.loads((root / 'manifest.json').read_text())
for row in manifest['payloads']:
    path = (root / row['archive']).resolve()
    assert path.is_relative_to(root)
    packed = path.read_bytes()
    assert len(packed) == row['gzipBytes']
    assert hashlib.sha256(packed).hexdigest() == row['gzipSha256']
    raw = gzip.decompress(packed)
    assert len(raw) == row['rawBytes']
    assert hashlib.sha256(raw).hexdigest() == row['rawSha256']
print(json.dumps({'verifiedPayloads': len(manifest['payloads']), 'externalFilesChecked': False}))
