#!/usr/bin/env python3
"""3.6c: a slim copy of a run directory for the archive (README §7). Every row kind is kept whole except the `w` rows,
cut to the fields the readers use (`freq.py`, `power.py`, `tip.py`, `release.py`), and the `o` rows, cut to `roll`
(3.6b's own `o` fields are not read this round). The readers give the same tables on the slim copy.

    python3 -I slim.py <run dir> <out dir> [--freq]      (recurses one level for the knob settings)

The `w` and `o` rows are kept only up to tS 3.6 s (every reader's window ends by +3.5 s). With --freq (the knob runs,
read only by `freq.py`), the `w` and `o` rows are dropped and the `f` rows cut to what `freq.py` reads.
"""
import glob, json, os, sys

W = ['kind', 'script', 'wave', 'tS', 'om', 'p', 'yFin', 'yRail', 'yP', 'yB', 'yAm', 'yRad', 'yFr', 'yFro', 'yBed', 'yGy', 'ySuc', 'yRid', 'yTot', 'yDup',
     'jTw', 'sH', 'qFin', 'qRail', 'qP', 'qB', 'qAm', 'qRad', 'qFr', 'qFro', 'qBed', 'qGy', 'qSuc', 'qRid', 'qTot',
     'twAct', 'twA', 'twR', 'wAct', 'wK', 'wC', 'le', 'lr', 'lrr', 'lk', 'ank', 'aRest', 'cA', 'cOA', 'cH', 'cFA', 'cSA', 'cW', 'pfX', 'bey',
     'cHalf', 'cR', 'cM', 'hd', 'yd', 'kt', 'ktY', 'kn', 'lL', 'grip', 'held', 'twT', 'nS']
O = ['kind', 'script', 'wave', 'tS', 'roll']
F = ['kind', 'script', 'wave', 't', 'tS', 'yaw', 'res', 'fr', 'm1', 'm2', 'm3', 'mf']
FREQ = '--freq' in sys.argv


def slim(src, dst):
    os.makedirs(dst, exist_ok=True)
    for path in sorted(glob.glob(os.path.join(src, '*.jsonl'))):
        with open(path) as fi, open(os.path.join(dst, os.path.basename(path)), 'w') as fo:
            for line in fi:
                if line.startswith('{"kind":"w"') or line.startswith('{"kind":"o"'):
                    if FREQ:
                        continue
                    r = json.loads(line)
                    if r['tS'] > 3.6:
                        continue
                    keys = W if r['kind'] == 'w' else O
                    line = json.dumps({k: r[k] for k in keys if k in r}, separators=(',', ':')) + '\n'
                elif FREQ and line.startswith('{"kind":"f"'):
                    r = json.loads(line)
                    line = json.dumps({k: r[k] for k in F if k in r}, separators=(',', ':')) + '\n'
                fo.write(line)


src, dst = sys.argv[1], sys.argv[2]
slim(src, dst)
for sub in sorted(os.listdir(src)):
    if os.path.isdir(os.path.join(src, sub)):
        slim(os.path.join(src, sub), os.path.join(dst, sub))
