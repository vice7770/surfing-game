#!/usr/bin/env python3
"""3.6i: the turn just after letting go of R2 (release<x>:left|right) and the untouched controls, per configuration.

    python3 -I release.py NAME=DIR ...   (each DIR holds the report's rides.jsonl over Big seeds 1-3; the first is off)

Balance falls before +2.0 s and over the ride (the benchmark's cause rule); course05 / course10 paired against the first
(off); and for the untouched controls (release0 straight, none:left|right, snap:left|right) how many rides are identical
in every field to off's.
"""
import json, statistics as st, sys
cfg = [(a.split('=', 1)[0], {json.loads(l)['id']: json.loads(l) for l in open(a.split('=', 1)[1] + '/rides.jsonl')}) for a in sys.argv[1:]]
off = cfg[0][1]
bal = lambda r: r and r['stood'] and r['fell'] and r['cause'] == 'balance'
print('| drive | ' + ' | '.join(f'{n}: falls < +2.0 s / over the ride (n); course +0.5 / +1.0 s mean' for n, _ in cfg) + ' |')
print('|' + ' --- |' * (len(cfg) + 1))
for x in ('0', '0.2', '0.4', '0.6'):
    scripts = (f'release{x}:left', f'release{x}:right')
    cells = []
    for n, rides in cfg:
        sel = [r for r in rides.values() if r['group'] == 'big' and r['script'] in scripts]
        early = sum(1 for r in sel if bal(r) and r['fellAt'] < 2.0)
        whole = sum(1 for r in sel if bal(r))
        cs = []
        for k in ('course05', 'course10'):
            d = [r[k] - off[r['id']][k] for r in sel if r['id'] in off and r[k] is not None and off[r['id']][k] is not None]
            cs.append(f'{st.mean(d):+.2f}° ({len(d)})' if d else '-')
        cells.append(f'{early} / {whole} ({len(sel)}); {cs[0]} / {cs[1]}')
    print(f'| release{x}:left\\|right | ' + ' | '.join(cells) + ' |')
print()
for scripts in (('release0',), ('none:left', 'none:right'), ('snap:left', 'snap:right')):
    out = []
    for n, rides in cfg[1:]:
        sel = [r for r in rides.values() if r['group'] == 'big' and r['script'] in scripts]
        same = sum(1 for r in sel if off.get(r['id']) == r)
        falls = sum(1 for r in sel if bal(r))
        out.append(f'{n}: {same} of {len(sel)} identical to off, {falls} balance falls (off {sum(1 for r in off.values() if r["group"] == "big" and r["script"] in scripts and bal(r))})')
    print(f'{"/".join(scripts)}: ' + '; '.join(out))
