#!/usr/bin/env python3
"""3.6b: the his-way turn drives (not in the baseline), an arm against switch off: per sea, the rides, falls before +2.0 s
and in all, balance-labelled (shape.py's rule), lasting rides, falls sooner by 0.25 s or more (balance), lasting rides that
now fall, and lowest reserves 0.10 lower.

    python3 hisfalls.py <arm probe run> <switch-off onset run>
"""
import sys
sys.argv = [sys.argv[0], sys.argv[1], sys.argv[2]]
exec(open(__file__.replace('hisfalls.py', 'shape.py')).read().split("lines = ['| group")[0])
print('| sea | rides | falls before +2.0 s off → on (balance) | falls in all off → on (balance) | lasted off → on | regressions: lasted now falls / balance fall ≥ 0.25 s sooner / reserve 0.10 lower |')
print('| --- | --- | --- | --- | --- | --- |')
for g in ('tw-catch', 'tw-ride', 'med', 'big'):
    ids = sorted(k for k, r in S.items() if r['group'] == g and r['script'] in ('hisway:left', 'hisway:right') and k in P)
    if not ids:
        continue
    def c(R, early):
        fs = [(k, R[k]) for k in ids if R[k]['fell'] is not None and (not early or R[k]['fell'] < 2.0)]
        return len(fs), sum(1 for k, r in fs if cause(k, r) == 'balance')
    low = lambda r: min(f['res'] for f in r['f'].values() if 'res' in f)
    lastfall = sum(1 for k in ids if P[k]['fell'] is None and S[k]['fell'] is not None)
    sooner = sum(1 for k in ids if P[k]['fell'] is not None and S[k]['fell'] is not None and P[k]['fell'] - S[k]['fell'] > 0.25 and cause(k, S[k]) == 'balance')
    lower = sum(1 for k in ids if low(P[k]) - low(S[k]) > 0.10)
    a, b, x, y = c(P, True), c(S, True), c(P, False), c(S, False)
    print(f"| {g} | {len(ids)} | {a[0]} → {b[0]} ({a[1]} → {b[1]}) | {x[0]} → {y[0]} ({x[1]} → {y[1]}) | {sum(1 for k in ids if P[k]['fell'] is None)} → {sum(1 for k in ids if S[k]['fell'] is None)} | {lastfall} / {sooner} / {lower} |")
