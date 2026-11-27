#!/usr/bin/env python3
"""3.6j's line 4, no nudge (README §0.5), per stance; written and committed before any screening number was read.

    python3 -I line4.py OFFDIR NAME=DIR ...   (each DIR holds big_s1..3.jsonl, the probe's rows, and rides.jsonl, the report's --reuse)

The heading and its sign as the coordinator's aim36i.py: `hdg` (deg) of the probe's `o` rows, its change wrapped to
+-180, signed by the lean asked (`ask`) at tS 1.5 in off (+1 if > 0); a ride whose off sign disagrees with its script's
steer (left +1) is counted and printed. Stances: standing tall `none:left|right`, Compress `compress:left|right`, Crouch
`crouch:left|right`, and `hisway:left|right` beside Compress (printed whether its frames are identical to Compress's).
(a) rides standing at tS 2.5 in both off and the arm (stood, and no fall or a fall after 2.5): the mean paired change
    toward the steer of the heading from tS 1.0 to tS 2.5 (arm minus off), with both means and n;
(b) rides standing at tS 3.0 in both: the mean paired largest change toward the steer between tS 1.0 and tS 3.0.
The line holds for a stance when both paired means are >= 0.
"""
import json, sys, statistics as st, collections
STANCES = {'none': ('none:left', 'none:right'), 'compress': ('compress:left', 'compress:right'), 'crouch': ('crouch:left', 'crouch:right'),
           'hisway': ('hisway:left', 'hisway:right')}
WANT = {s for v in STANCES.values() for s in v}


def load(d):
    fr = collections.defaultdict(list)
    for seed in (1, 2, 3):
        for l in open(f'{d}/big_s{seed}.jsonl'):
            if not l.startswith('{"kind":"o"'): continue
            o = json.loads(l)
            if o['script'] in WANT: fr[f"big:s{seed}:w{o['wave']}:{o['script']}"].append((o['tS'], o['hdg'], o.get('ask')))
    rides = {}
    for l in open(f'{d}/rides.jsonl'):
        r = json.loads(l)
        if r['group'] == 'big': rides[r['id']] = r
    for v in fr.values(): v.sort()
    return fr, rides


def standing(r, t):
    return r is not None and r['stood'] and (not r['fell'] or (r['fellAt'] is not None and r['fellAt'] > t))


def at(rows, t):
    if not rows: return None
    best = min(rows, key=lambda o: abs(o[0] - t))
    return best if abs(best[0] - t) < 0.02 else None


def wrap(d): return (d + 180) % 360 - 180


def measure(rows, sg):
    h0 = at(rows, 1.0)
    h = at(rows, 2.5)
    a = sg * wrap(h[1] - h0[1]) if h0 and h else None
    seg = [o for o in rows if 1.0 <= o[0] <= 3.0]
    b = max(sg * wrap(o[1] - h0[1]) for o in seg) if h0 and seg else None
    return a, b


offF, offR = load(sys.argv[1])
signs, bad = {}, 0
for k, rows in offF.items():
    m = at(rows, 1.5)
    steer = 1 if k.endswith('left') else -1
    if m and m[2]:
        signs[k] = 1 if m[2] > 0 else -1
        if signs[k] != steer: bad += 1
    else:
        signs[k] = steer
print(f'sign check: {bad} rides whose off lean asked at tS 1.5 disagrees with the steer (sign then taken from the lean asked, as aim36i.py)')
print('| arm | stance | (a) n | heading +1.0->+2.5 s: off / arm / paired mean (deg, toward the steer) | (b) n | largest +1.0..+3.0 s: off / arm / paired mean | line 4 |')
print('| --- | --- | --- | --- | --- | --- | --- |')
for spec in sys.argv[2:]:
    name, _, d = spec.partition('=')
    F, R = load(d)
    for s, scripts in STANCES.items():
        A, B = [], []
        for k in offF:
            if k.split(':')[3] + ':' + k.split(':')[4] not in scripts or k not in F: continue
            sg = signs[k]
            ao, bo = measure(offF[k], sg)
            an, bn = measure(F[k], sg)
            if standing(offR.get(k), 2.5) and standing(R.get(k), 2.5) and ao is not None and an is not None: A.append((ao, an))
            if standing(offR.get(k), 3.0) and standing(R.get(k), 3.0) and bo is not None and bn is not None: B.append((bo, bn))
        fa = lambda L, i: st.mean(x[i] for x in L) if L else float('nan')
        pa = st.mean(x[1] - x[0] for x in A) if A else float('nan')
        pb = st.mean(x[1] - x[0] for x in B) if B else float('nan')
        ok = 'n/a (beside)' if s == 'hisway' else ('holds' if A and B and pa >= 0 and pb >= 0 else 'fails')
        print(f'| {name} | {s} | {len(A)} | {fa(A, 0):.2f} / {fa(A, 1):.2f} / {pa:+.2f} | {len(B)} | {fa(B, 0):.2f} / {fa(B, 1):.2f} / {pb:+.2f} | {ok} |')
    same = 0; total = 0
    for k in F:
        if ':hisway:' in k:
            total += 1
            c = k.replace(':hisway:', ':compress:')
            if c in F and [x[1] for x in F[k]] == [x[1] for x in F[c]]: same += 1
    print(f'{name}: hisway frame-identical to compress (heading rows) on {same} of {total} rides')
