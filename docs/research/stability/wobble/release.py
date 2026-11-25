#!/usr/bin/env python3
"""3.6c M7 (question 3): a turn started just after letting go of Compress. The release drives against his way held
through the turn (`hisway:<side>`) and the tall turn (`none:<side>`), on the same waves.

    python3 -I release.py <run dir> [--md out.md] [--rows out.jsonl]

Per sea and drive (both sides pooled): rides; falls before +2.0 s and in +2.0..+3.5 s by the benchmark's cause rule
(balance / wave / whitewater); lasting rides. For the balance falls before +2.0 s: sideways at the first `m3` frame at or
after the escape (`mf` = 0), and inside / outside (the capture point's side at the escape against the steer's).
At +1.0 s (frame 60): the leg's depth below the riding stance (−`leg.rest`, m; the design's depth `yd` is the same
quantity floored at 0), the leg's extension (`le`), the room's depth (`hd`, the commanded stance); the rest's highest
point over +0.2..+2.0 s (the rise's overshoot over the riding stance, + over it), and its rate at +1.0 s (`lrr`, m/s).
The swing over the steer: the std of Ω_alt over +1.0 s to the escape or +2.0 s (deg/s).
Paired: per wave and side, the release ride's fall time against `hisway:<side>` (held) and `none:<side>` (tall);
a lasting ride counts as 5.0 s.
"""
import json, math, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wob import load, centred, median

args = sys.argv[1:]
d = args[0]
md = args[args.index('--md') + 1] if '--md' in args else None
rows_out = args[args.index('--rows') + 1] if '--rows' in args else None
DRIVES = ['none', 'hisway', 'release0', 'release0.2', 'release0.4', 'release0.6']
scripts = {f'{x}:{w}' for x in DRIVES for w in ('left', 'right')} | {'hisway', 'release0', 'release0.2', 'release0.4', 'release0.6', 'none:straight'}
W_KEYS = ['om', 'lr', 'le', 'lrr', 'hd', 'yd', 'kt', 'ktY', 'cA', 'kn']
rides, _ = load(d, w_keys=W_KEYS, scripts=scripts)


def sw(ride, a, b):
    xs = [ride['w'].get(i, {}).get('om') for i in range(a - 7, b + 8)]
    if None in xs:
        return None
    alt = centred(xs)[7:-7]
    return math.degrees(math.sqrt(sum(x * x for x in alt) / len(alt)))


rows = []
for rid, r in rides.items():
    sc = r['script']
    if ':' not in sc or sc.endswith('straight'):
        continue
    drive, side = sc.split(':')
    steer = 1 if side == 'left' else -1
    w = r['w']
    x = {'id': rid, 'group': r['group'], 'drive': drive, 'side': side, 'fell': r['fell'], 'cause': r['cause'], 'escape': r['escape']}
    w60 = w.get(60)
    x['depth60'] = None if w60 is None else round(-w60['lr'], 4)
    x['ext60'] = None if w60 is None else round(w60['le'], 4)
    x['room60'] = None if w60 is None else w60['hd']
    x['rate60'] = None if w60 is None else w60['lrr']
    x['kt60'], x['ktY60'] = (None, None) if w60 is None else (w60['kt'], w60['ktY'])
    rs = [w[i]['lr'] for i in range(12, 121) if i in w]
    x['restMax'] = max(rs) if rs else None
    if r['fell'] is not None and r['cause'] == 'balance' and r['escape'] is not None and r['escape'] < 2.0:
        e = round(r['escape'] * 60)
        f = {round(q['tS'] * 60): q for q in r['standing']}
        first = next((i for i in sorted(f) if i >= e and f[i].get('m3')), None)
        x['sideways'] = None if first is None else f[first].get('mf') == 0
        ca = w.get(e, {}).get('cA')
        x['inside'] = None if ca is None else (1 if ca >= 0 else -1) == steer
        fe = round(r['fell'] * 60)
        x['depthFall'] = -w[max(i for i in w if i <= fe)]['lr'] if w else None
    end = round(min(2.0, r['escape'] if r['escape'] is not None else 2.0) * 60)
    x['sw'] = sw(r, 60, end - 8) if end - 8 > 72 else None
    rows.append(x)

if rows_out:
    with open(rows_out, 'w') as fh:
        for x in rows:
            fh.write(json.dumps(x) + '\n')
by = {}
for x in rows:
    by.setdefault((x['group'], x['drive']), []).append(x)
lines = ['# 3.6c M7: a turn just after letting go of Compress', '',
         'Both sides pooled. Falls by the benchmark\'s cause rule (balance / wave / whitewater). Depths in m below the riding stance; rest max: the rest\'s highest point over +0.2..+2.0 s (+ over the riding stance). Medians.', '',
         '| sea | drive | rides | falls < +2.0 s (b / w / ww) | falls +2.0..3.5 s (b / w / ww) | lasting | balance < 2.0: sideways / inside | leg depth at +1.0 s | room depth at +1.0 s | knee travel: room / leg | rest rate at +1.0 s | rest max | swing over the steer (deg/s) |',
         '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |']
for g in ('tw-catch', 'tw-ride', 'med', 'big'):
    for dr in DRIVES:
        xs = by.get((g, dr), [])
        if not xs:
            continue
        def c(a, b, cause):
            return sum(1 for x in xs if x['fell'] is not None and a <= x['fell'] < b and x['cause'] == cause)
        bal = [x for x in xs if x.get('sideways') is not None or x.get('inside') is not None]
        lines.append(f"| {g} | {dr} | {len(xs)} | {c(0, 2, 'balance')} / {c(0, 2, 'wave')} / {c(0, 2, 'whitewater')} | {c(2, 3.5, 'balance')} / {c(2, 3.5, 'wave')} / {c(2, 3.5, 'whitewater')} | "
                     f"{sum(1 for x in xs if x['fell'] is None)} | {sum(1 for x in bal if x.get('sideways'))} of {sum(1 for x in bal if x.get('sideways') is not None)} / {sum(1 for x in bal if x.get('inside'))} of {sum(1 for x in bal if x.get('inside') is not None)} | "
                     f"{median([x['depth60'] for x in xs]):.3f} | {median([x['room60'] for x in xs]):.3f} | {median([x['kt60'] for x in xs]):.3f} / {median([x['ktY60'] for x in xs]):.3f} | {median([x['rate60'] for x in xs]):+.3f} | {median([x['restMax'] for x in xs]):+.3f} | {median([x['sw'] for x in xs]) or float('nan'):.1f} |")
lines.append('')
lines.append('**Paired by wave and side** (fall time, a lasting ride 5.0 s): the release ride against Compress held (`hisway:<side>`) and against tall (`none:<side>`).')
lines.append('')
lines.append('| sea | drive | pairs | vs held: median Δ (later / sooner / same) | vs tall: median Δ (later / sooner / same) |')
lines.append('| --- | --- | --- | --- | --- |')
idx = {(x['id'].rsplit(':', 2)[0], x['drive'], x['side']): x for x in rows}
for g in ('tw-catch', 'tw-ride', 'med', 'big'):
    for dr in DRIVES[2:]:
        dh, dt = [], []
        for (base, drv, side), x in idx.items():
            if drv != dr or x['group'] != g:
                continue
            t = 5.0 if x['fell'] is None else x['fell']
            h = idx.get((base, 'hisway', side))
            n = idx.get((base, 'none', side))
            if h:
                dh.append(t - (5.0 if h['fell'] is None else h['fell']))
            if n:
                dt.append(t - (5.0 if n['fell'] is None else n['fell']))
        if not dh and not dt:
            continue
        def s(v):
            return f"{median(v):+.2f} ({sum(1 for q in v if q > 1e-9)} / {sum(1 for q in v if q < -1e-9)} / {sum(1 for q in v if abs(q) <= 1e-9)})" if v else '—'
        lines.append(f'| {g} | {dr} | {max(len(dh), len(dt))} | {s(dh)} | {s(dt)} |')
text = '\n'.join(lines) + '\n'
print(text)
if md:
    open(md, 'w').write(text)
