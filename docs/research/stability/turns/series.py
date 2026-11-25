#!/usr/bin/env python3
"""Print one ride's onset frame by frame, twin subtracted (README §0.3 frames; everything x steer, + toward the steer).

    python3 series.py <run dir> <ride id> [every n frames] [from] [to]
"""
import sys
from onset import load, wrap, steer_of, twin_of
d, rid = sys.argv[1], sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 2
t_from = float(sys.argv[4]) if len(sys.argv) > 4 else 0.95
t_to = float(sys.argv[5]) if len(sys.argv) > 5 else 1.8
R = load(d)
ride = R[rid]
s = steer_of(ride['script'])
tw = R.get(rid[: -len(ride['script'])] + twin_of(ride['script']))
f, o = ride['f'], ride['o']
k0 = min(k for k in o if k >= 1.0 - 1e-6)
print(f"{rid}: fell {ride['fell']}, twin {'yes' if tw else 'no'}")
print('   tS  subC  subH  yaw  |  ask rBank pBank  bank | rRoll pRoll  roll  rail | aRaw aRest | swing  twist twA | yFin yPrs yRdr yTot | vS  res')
for k in sorted(o):
    if k < t_from or k > t_to or round(k * 60) % n:
        continue
    a, b = o[k], f[k]
    sc = wrap(b['crs'] - f[k0]['crs']) * s - (wrap(tw['f'][k]['crs'] - tw['f'][k0]['crs']) * s if tw and k in tw['f'] else 0)
    sh = wrap(a['hdg'] - o[k0]['hdg']) * s - (wrap(tw['o'][k]['hdg'] - tw['o'][k0]['hdg']) * s if tw and k in tw['o'] and k0 in tw['o'] else 0)
    print(f"{k:5.3f} {sc:5.1f} {sh:5.1f} {b['yaw'] * s:5.0f} | {a['ask'] * s:4.0f} {a['rBank'] * s:5.1f} {a['pBank'] * s:5.1f} {a['bank'] * s:5.1f} | {a['rRoll'] * s:5.1f} {a['pRoll'] * s:5.1f} {a['roll'] * s:5.1f} {a['rail'] * s:5.1f} | {a['aRaw'] * s:5.2f} {a['aRest'] * s:5.2f} | {a['sw'] * s:5.2f} {a['tw'] * s:5.0f} {a['twA'] * s:5.2f} | {a['yFins'] * s:4.0f} {a['yPress'] * s:4.0f} {a['yRider'] * s:4.0f} {a['yTot'] * s:4.0f} | {a['vS']:.1f} {b.get('res')}")
