#!/usr/bin/env python3
"""3.6b H7: does the same rail turn the board less in a deep stance? Over +1.5 to +2.0 s (rides standing at +2.0 s):
the twin-subtracted course change divided by the mean rail toward the steer (deg of course per deg of rail per s), and
the yaw rate per degree of rail; and the bank, rail and body-minus-rail at +0.5 s (all world/rider frames as §0.3).

    python3 hull.py <run dir> [group]
"""
import statistics as st, sys
from onset import load, wrap, steer_of, twin_of, stance_of
R = load(sys.argv[1]); grp = sys.argv[2] if len(sys.argv) > 2 else 'big'
rows = {}
for rid, r in R.items():
    s = steer_of(r['script'])
    if s == 0 or r['group'] != grp or (r['fell'] is not None and r['fell'] < 2.0):
        continue
    tw = R.get(rid[: -len(r['script'])] + twin_of(r['script']))
    if not tw:
        continue
    f, o, g = r['f'], r['o'], tw['f']
    ks = [k for k in sorted(o) if 1.5 - 1e-6 <= k <= 2.0 + 1e-6 and k in g]
    if len(ks) < 20:
        continue
    a, b = ks[0], ks[-1]
    dc = wrap(f[b]['crs'] - f[a]['crs']) * s - wrap(g[b]['crs'] - g[a]['crs']) * s
    rail = sum(o[k]['rail'] * s for k in ks) / len(ks)
    yaw = sum(f[k]['yaw'] * s for k in ks) / len(ks)
    rows.setdefault(stance_of(r['script']), []).append((dc / (b - a), rail, yaw, (dc / (b - a)) / rail if rail > 1 else None))
print('| stance | rides standing at +2.0 s | course rate toward, +1.5–2.0 s (deg/s) | mean rail (deg) | mean yaw rate (deg/s) | course rate per deg of rail |')
print('| --- | --- | --- | --- | --- | --- |')
for s in ('none', 'crouch', 'compress', 'snap', 'hisway'):
    v = rows.get(s, [])
    if v:
        m = lambda i: st.median([x[i] for x in v if x[i] is not None])
        print(f'| {s} | {len(v)} | {m(0):.1f} | {m(1):.1f} | {m(2):.1f} | {m(3):.2f} |')
