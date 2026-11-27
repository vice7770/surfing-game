#!/usr/bin/env python3
"""3.6j's reported quantities (README §0.6), deciding nothing; written and committed before any screening number was read.

    python3 -I quantities.py NAME=DIR ...   (each DIR: big_s1..3.jsonl and rides.jsonl over Big seeds 1-3)

Per arm and stance (none, compress, crouch, hisway, snap; the left and right steers), over the steer's frames tS
[1.0, 2.0) while attached, signed toward the steer (+ the script's steer side, left +1): the felt lean sensed (fLs) and
true (fL) against the old lean asked (`ask`, which the rider still computes), the tilt asked (tA) and reached (tR = roll -
bank), the share of frames with the ankle at its range or the rail's bite (aSat), the free reference's share (frOn); the
least sideways headroom per ride ((cHalf + cR) - |cA| of the `w` rows over the same frames), its median over rides; and
the rides' peak yaw rate (`yawPeak`, the report's) mean.
"""
import json, sys, statistics as st, collections
STANCES = {'none': ('none:left', 'none:right'), 'compress': ('compress:left', 'compress:right'), 'crouch': ('crouch:left', 'crouch:right'),
           'hisway': ('hisway:left', 'hisway:right'), 'snap': ('snap:left', 'snap:right')}
WANT = {s: k for k, v in STANCES.items() for s in v}
print('| arm | stance | frames | felt lean sensed / true | old lean asked | tilt asked / reached | ankle at range | free ref on | least headroom (median, m; rides) | peak yaw (mean, deg/s) |')
print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for spec in sys.argv[1:]:
    name, _, d = spec.partition('=')
    acc = collections.defaultdict(lambda: collections.defaultdict(list))
    head = collections.defaultdict(dict)
    for seed in (1, 2, 3):
        for l in open(f'{d}/big_s{seed}.jsonl'):
            if not (l.startswith('{"kind":"o"') or l.startswith('{"kind":"w"')): continue
            o = json.loads(l)
            s = WANT.get(o['script'])
            if s is None or not (1.0 <= o['tS'] < 2.0): continue
            sg = 1 if o['script'].endswith('left') else -1
            k = f"big:s{seed}:w{o['wave']}:{o['script']}"
            if o['kind'] == 'o':
                a = acc[s]
                a['n'].append(1)
                for f in ('fLs', 'fL', 'ask', 'tA', 'tR'):
                    if o.get(f) is not None: a[f].append(sg * o[f])
                a['aSat'].append(o.get('aSat') or 0); a['frOn'].append(o.get('frOn') or 0)
            elif o.get('cA') is not None and o.get('cHalf') is not None and o.get('cR') is not None:
                h = o['cHalf'] + o['cR'] - abs(o['cA'])
                head[s][k] = min(head[s].get(k, 9), h)
    yp = collections.defaultdict(list)
    for l in open(f'{d}/rides.jsonl'):
        r = json.loads(l)
        s = WANT.get(r['script'])
        if r['group'] == 'big' and s and r.get('yawPeak') is not None: yp[s].append(r['yawPeak'])
    m = lambda L: f'{st.mean(L):.2f}' if L else '-'
    for s in STANCES:
        a = acc[s]
        hs = list(head[s].values())
        print(f"| {name} | {s} | {len(a['n'])} | {m(a['fLs'])} / {m(a['fL'])} | {m(a['ask'])} | {m(a['tA'])} / {m(a['tR'])} | {m(a['aSat'])} | {m(a['frOn'])} | "
              f"{(f'{st.median(hs):.3f}' if hs else '-')} ({len(hs)}) | {m(yp[s])} |")
