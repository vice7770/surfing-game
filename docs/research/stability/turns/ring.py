#!/usr/bin/env python3
"""3.6b: the ringing during the steer (README §2). Per steer ride and its straight twin, over +1.0 s to the earlier of
+2.0 s and the fall: the yaw rate's ringing (std of yaw minus its centred 0.25 s mean, deg/s, world), the twist torque's
ringing (the same on `heldTwist`, N·m), the yaw ledger's rider and fins terms (RMS, N·m), the lag that best lines the twist
torque up against minus the yaw rate (s) and that correlation, and the body bank's shortfall behind the lean asked at
+0.25 and +0.5 s (deg).

    python3 ring.py <run dir> [group]
"""
import math, statistics as st, sys
from onset import load, steer_of, twin_of, stance_of

STEP = 1 / 60


def detrend(xs, w=15):
    out = []
    for i in range(len(xs)):
        lo, hi = max(0, i - w // 2), min(len(xs), i + w // 2 + 1)
        out.append(xs[i] - sum(xs[lo:hi]) / (hi - lo))
    return out


def sd(xs):
    return st.pstdev(xs) if len(xs) > 1 else None


def corr(a, b):
    if len(a) < 5:
        return None
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    va = sum((x - ma) ** 2 for x in a); vb = sum((y - mb) ** 2 for y in b)
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / math.sqrt(va * vb) if va > 0 and vb > 0 else None


def window(ride, end):
    o = ride['o']
    ks = [k for k in sorted(o) if 1.0 - 1e-6 <= k <= end + 1e-6]
    return ks, o


def ring(ride, end):
    ks, o = window(ride, end)
    if len(ks) < 20:
        return None
    yaw = [ride['f'][k]['yaw'] for k in ks]
    tw = [o[k]['tw'] for k in ks]
    out = {'yawRing': sd(detrend(yaw)), 'twRing': sd(detrend(tw)),
           'yRider': math.sqrt(sum(o[k]['yRider'] ** 2 for k in ks) / len(ks)), 'yFins': math.sqrt(sum(o[k]['yFins'] ** 2 for k in ks) / len(ks))}
    dy, dt = detrend(yaw), detrend(tw)
    best = None
    for lag in range(0, 13):
        c = corr(dt[lag:], [-y for y in dy[: len(dy) - lag]])
        if c is not None and (best is None or c > best[1]):
            best = (lag * STEP, c)
    out['lag'], out['corr'] = best if best else (None, None)
    return out


R = load(sys.argv[1])
group = sys.argv[2] if len(sys.argv) > 2 else None
rows = {}
for rid, ride in R.items():
    s = steer_of(ride['script'])
    if s == 0 or (group and ride['group'] != group):
        continue
    twin = R.get(rid[: -len(ride['script'])] + twin_of(ride['script']))
    end = min(2.0, ride['fell'] - STEP if ride['fell'] is not None else 2.0)
    a = ring(ride, end)
    b = ring(twin, end) if twin else None
    o = ride['o']
    short = {}
    for h in (0.25, 0.5):
        k = next((k for k in sorted(o) if k >= 1.0 + h - 1e-6), None)
        short[h] = (o[k]['ask'] - o[k]['bank']) * s if k is not None and k <= end + 1e-6 else None
    rows[rid] = (ride['group'], stance_of(ride['script']), a, b, short)
print('| group | stance | rides | yaw ring steer / twin (deg/s) | twist ring steer / twin (N·m) | yaw ledger rider / fins RMS (N·m) | twist vs −yaw: lag (s), corr | bank short of ask +0.25 / +0.5 (deg) |')
print('| --- | --- | --- | --- | --- | --- | --- | --- |')
groups = [group] if group else ['tw-catch', 'tw-ride', 'med', 'big']
for g in groups:
    for s in ('none', 'crouch', 'compress', 'snap', 'hisway'):
        rs = [v for v in rows.values() if v[0] == g and v[1] == s and v[2]]
        if not rs:
            continue
        m = lambda xs: f'{st.median(xs):.1f}' if xs else '—'
        m2 = lambda xs: f'{st.median(xs):.2f}' if xs else '—'
        print(f"| {g} | {s} | {len(rs)} | {m([v[2]['yawRing'] for v in rs])} / {m([v[3]['yawRing'] for v in rs if v[3]])} | {m([v[2]['twRing'] for v in rs])} / {m([v[3]['twRing'] for v in rs if v[3]])} | {m([v[2]['yRider'] for v in rs])} / {m([v[2]['yFins'] for v in rs])} | {m2([v[2]['lag'] for v in rs if v[2]['lag'] is not None])}, {m2([v[2]['corr'] for v in rs if v[2]['corr'] is not None])} | {m([v[4][0.25] for v in rs if v[4][0.25] is not None])} / {m([v[4][0.5] for v in rs if v[4][0.5] is not None])} |")
