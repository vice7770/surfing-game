#!/usr/bin/env python3
"""3.6d: slim copies of the run directories for the archive (README §7). The readers give the same tables on them.

    python3 -I slim.py <run dir> <out dir>       (recurses one level for the settings)

- `o` and `w` rows are dropped (no reader of this round reads them);
- `f` rows are cut to what 3.6c's `freq.py` and `ident.py`'s counts need (`ident.py` is run on the raw files);
- `kick` rows keep everything but `e` (the ledgers' differences, which no table reads; the raw runs keep them);
- every other row is kept whole.
"""
import glob, json, os, sys

F = ['kind', 'script', 'wave', 't', 'tS', 'yaw', 'res', 'fr', 'm1', 'm2', 'm3', 'mf']


def slim(src, dst):
    os.makedirs(dst, exist_ok=True)
    for path in sorted(glob.glob(os.path.join(src, '*.jsonl'))):
        with open(path) as fi, open(os.path.join(dst, os.path.basename(path)), 'w') as fo:
            for line in fi:
                if line.startswith('{"kind":"w"') or line.startswith('{"kind":"o"'):
                    continue
                if line.startswith('{"kind":"f"'):
                    r = json.loads(line)
                    line = json.dumps({k: r[k] for k in F if k in r}, separators=(',', ':')) + '\n'
                elif line.startswith('{"kind":"kick"'):
                    r = json.loads(line)
                    r.pop('e', None)
                    line = json.dumps(r, separators=(',', ':')) + '\n'
                fo.write(line)


src, dst = sys.argv[1], sys.argv[2]
slim(src, dst)
for sub in sorted(os.listdir(src)):
    if os.path.isdir(os.path.join(src, sub)):
        slim(os.path.join(src, sub), os.path.join(dst, sub))
