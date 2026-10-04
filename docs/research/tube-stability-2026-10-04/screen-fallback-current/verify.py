from pathlib import Path
import gzip,hashlib,json,sys
root=Path(__file__).resolve().parent
manifest=json.loads((root/'manifest.json').read_bytes())
sha=lambda raw:hashlib.sha256(raw).hexdigest()
for row in manifest['records']:
    stored=(root/row['storedPath']).read_bytes()
    assert len(stored)==row['storedBytes'] and sha(stored)==row['storedSha256'],row['storedPath']
    raw=gzip.decompress(stored) if row['encoding']=='gzip' else stored
    assert len(raw)==row['expandedBytes'] and sha(raw)==row['expandedSha256'],row['storedPath']
    if '--originals' in sys.argv:
        for original in row['originalPaths']: assert Path(original).read_bytes()==raw,original
for row in manifest['derivedFiles']:
    raw=(root/row['path']).read_bytes()
    assert len(raw)==row['bytes'] and sha(raw)==row['sha256'],row['path']
print(json.dumps({'valid':True,'records':len(manifest['records']),'originalsChecked':'--originals' in sys.argv}))
