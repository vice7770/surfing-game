#!/usr/bin/env python3
"""3.6b: the yaw ledger over a window of the steer, per stance: mean torque x steer (N·m about the world's up, + yawing the
nose toward the steer; `BoardBody.yaw`, rider = everything the rider's coupling carries, a residual), steer ride minus its
straight twin, and the twist torque sent x steer.

    python3 ledger.py <run dir> <group> [from] [to]      (times after the stand; default +1.0 to +1.5 s)
"""
import statistics as st, sys
from onset import load, steer_of, twin_of, stance_of
R = load(sys.argv[1]); grp = sys.argv[2]
a = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
b = float(sys.argv[4]) if len(sys.argv) > 4 else 1.5
KEYS = ['yRails', 'yFins', 'yPress', 'yFr', 'yAm', 'yRider', 'yTot', 'tw']
out = {}
for rid, r in R.items():
    s = steer_of(r['script'])
    if s == 0 or r['group'] != grp:
        continue
    tw = R.get(rid[: -len(r['script'])] + twin_of(r['script']))
    o = r['o']
    ks = [k for k in sorted(o) if a - 1e-6 <= k <= b + 1e-6 and (not tw or k in tw['o'])]
    if len(ks) < (b - a) * 50:
        continue
    row = []
    for key in KEYS:
        v = sum(o[k][key] * s for k in ks) / len(ks)
        if tw:
            v -= sum(tw['o'][k][key] * s for k in ks) / len(ks)
        row.append(v)
    out.setdefault(stance_of(r['script']), []).append(row)
print(f'| stance | rides | ' + ' | '.join(KEYS) + ' |')
print('| --- | --- | ' + ' | '.join('---' for _ in KEYS) + ' |')
for s in ('none', 'crouch', 'compress', 'snap', 'hisway'):
    v = out.get(s)
    if v:
        print(f'| {s} | {len(v)} | ' + ' | '.join(f'{st.median(x[i] for x in v):+.1f}' for i in range(len(KEYS))) + ' |')
