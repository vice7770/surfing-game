#!/usr/bin/env python3
"""3.6j, reported, deciding nothing (README §0.5): Crouch's and Compress's bar dips before the steer, the coordinator's
crouch36i.py pattern. Per arm, over Big seeds 1-3 `compress|crouch:left|right`: on how many rides the balance reserve
(`res` of the `f` rows) is lowest, over the whole ride while attached, before tS 1.0 (the steer's start).

    python3 -I dips.py NAME=DIR ...
"""
import json, sys
for spec in sys.argv[1:]:
    name, _, d = spec.partition('=')
    low = {}
    for seed in (1, 2, 3):
        for l in open(f'{d}/big_s{seed}.jsonl'):
            if not l.startswith('{"kind":"f"'): continue
            o = json.loads(l)
            if o['script'] not in ('compress:left', 'compress:right', 'crouch:left', 'crouch:right') or o.get('res') is None: continue
            k = f"big:s{seed}:w{o['wave']}:{o['script']}"
            if k not in low or o['res'] < low[k][0]: low[k] = (o['res'], o['tS'])
    for s in ('compress', 'crouch'):
        rows = [v for k, v in low.items() if k.split(':')[3] == s]
        print(f"{name}: {s} lowest reserve before the steer on {sum(1 for v in rows if v[1] < 1.0)} of {len(rows)} rides")
