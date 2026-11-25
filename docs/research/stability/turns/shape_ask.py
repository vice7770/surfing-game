#!/usr/bin/env python3
"""3.6b amendment 0.11: how far a shaped steer moves the lean asked, the body's bank and the course from the step's, per
shape: the largest |difference| over the ride's common standing frames (deg), and the steer sent (`st`) at +1.0, +1.1 and
+2.1 s, as a check of the drive.

    python3 shape_ask.py <shape run dir> <step run dir>
"""
import statistics as st, sys
from onset import load
S, P = load(sys.argv[1]), load(sys.argv[2])
by = {}
for k, r in S.items():
    p = P.get(k.split('~')[0])
    if not p:
        continue
    ks = [t for t in r['o'] if t in p['o']]
    if not ks:
        continue
    d = lambda key, src='o': max(abs(r[src][t][key] - p[src][t][key]) for t in ks if t in r[src] and t in p[src])
    by.setdefault(k.split('~')[1], []).append((d('ask'), d('bank'), d('crs', 'f')))
    ex = r
for shape, v in by.items():
    print(f"{shape}: {len(v)} rides; largest |Δ lean asked| median {st.median(x[0] for x in v):.2f}°, max {max(x[0] for x in v):.2f}°; "
          f"|Δ bank| median {st.median(x[1] for x in v):.2f}°, max {max(x[1] for x in v):.2f}°; |Δ course| median {st.median(x[2] for x in v):.2f}°, max {max(x[2] for x in v):.2f}°")
for k in ('tw-catch:compress:left~ramp', 'tw-catch:compress:left~in', 'tw-catch:compress:left~out'):
    if k in S:
        f = S[k]['f']
        print(k, 'steer sent at +1.0/+1.017/+1.1/+1.2/+2.0/+2.1/+2.2 s:', [f[t]['st'] if t in f else None for t in (1.0, 1.0167, 1.1, 1.2, 2.0, 2.1, 2.2)])
