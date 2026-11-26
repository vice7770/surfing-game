#!/usr/bin/env python3
"""3.6e: the rows the fits and readers read, for the archive (README §7). Every table recomputes from them.

    python3 -I slim.py <run dir> <out dir>

Keeps the `weights`, `kbase` and `kick` rows; on a `kick` row the ledgers' differences `e` are kept only on open,
kicked rows of sizes +1 and −1 (the only ones question 1 reads: `ledgerSet` takes (e₊ − e₋) / 2κ). Drops `f`, `o`, `w`, `stand`,
`summary` and the rest (no reader of this round reads them; 3.6d's own archive keeps its `f` rows).
"""
import glob, json, os, sys

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
for path in sorted(glob.glob(os.path.join(src, '*.jsonl'))):
    with open(path) as fi, open(os.path.join(dst, os.path.basename(path)), 'w') as fo:
        for line in fi:
            if line.startswith('{"kind":"weights"') or line.startswith('{"kind":"kbase"'):
                fo.write(line)
            elif line.startswith('{"kind":"kick"'):
                r = json.loads(line)
                if not (r.get('mode') == 'open' and r.get('channel') != 'none' and r.get('size') in (1, -1)):
                    r.pop('e', None)
                fo.write(json.dumps(r, separators=(',', ':')) + '\n')
