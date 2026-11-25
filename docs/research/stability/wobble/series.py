#!/usr/bin/env python3
"""3.6c: one ride frame by frame (every `every`-th frame) over a span.

    python3 -I series.py <run dir> <ride id> [from tS] [to tS] [every] [keys...]

Default keys: the yaw rate (deg/s), the course (deg), the twist's active torque and angle, the twist's reaction on the
board (jTw/sH, N·m about the world's up), the rider's coupling (yRid), the fins and the hull's pressure (N·m), the
capture point across and its felt and offset parts (m), the pair's specific force across (pfX, m/s²), the leg's rest.
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wob import load

d, rid = sys.argv[1], sys.argv[2]
a = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
b = float(sys.argv[4]) if len(sys.argv) > 4 else 3.0
every = int(sys.argv[5]) if len(sys.argv) > 5 else 1
keys = sys.argv[6:] or ['yaw', 'crs', 'twAct', 'twA', 'twist', 'yRid', 'yFin', 'yP', 'cA', 'felt', 'cOA', 'pfX', 'lr', 'res']
group = rid.split(':')[0]
script = ':'.join(rid.split(':')[3:]) if not group.startswith('tw-') else ':'.join(rid.split(':')[1:])
rides, _ = load(d, w_keys=None, scripts={script}, groups={group})
r = rides[rid]
f = {round(x['tS'] * 60): x for x in r['f']}
print(f"# {rid}: stand {r['stand']}, fell {r['fell']}, cause {r['cause']}, escape {r['escape']}")
print('tS ' + ' '.join(f'{k:>8}' for k in keys))
for i in range(round(a * 60), round(b * 60) + 1, every):
    w = r['w'].get(i, {})
    fr = f.get(i, {})
    vals = []
    for k in keys:
        if k == 'twist':
            v = w['jTw'] / w['sH'] if w.get('sH') else None
        elif k == 'felt':
            v = -w['cH'] * w['cFA'] if 'cH' in w else None
        else:
            v = fr.get(k, w.get(k))
        vals.append('       —' if v is None else f'{v:8.3f}' if isinstance(v, (int, float)) else f'{str(v):>8}')
    print(f'{i / 60:.3f} ' + ' '.join(vals))
