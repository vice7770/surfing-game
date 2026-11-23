#!/usr/bin/env python3
"""Step 3.5w phase 2: the take-off populations, shipped / plantFloor=6 / plantSpeed=face, paired by stand.

Reads 3.5v's base and pf6 arms (`results/35v/data`, the same probe, the same bundle source; the switch-off code path is
byte-identical, checked by re-running catch runs 2 and 7 `cue` and run 2 `cueC` pf6 against them) and this round's
`fs` arm (`results/35w/data`). Populations as 3.5v §6 defined them; the rule is 3.5v §0.5's (`sideways-falls.py`
`effect`: rescue = carried 3 s, delay = +0.25 s, worse = -0.25 s).

Usage: python3 plant-rows-takeoffs.py results/35v/data results/35w/data [results/35w/data-taper]

Phase 3 (plant-rows.md section 9): with a third directory, its `tp` arm (`plantSpeed=taper`; compact files, the
summaries only, which is all `effect` reads of an arm) is added as a column, and the difference column is taper - pf6.
"""
import importlib.util
import os
import statistics as st
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('sf', os.path.join(HERE, 'sideways-falls.py'))
sf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sf)

CREST_STALLS = {(1, 12), (2, 8), (3, 7), (3, 10)}  # 3.5t kind a, 2.34-2.76 m/s (3.5v section 3)


def main(v_dir, w_dir, *more):
    S = sf.stands_of(v_dir)
    S.update(sf.stands_of(w_dir))
    for extra in more:
        S.update(sf.stands_of(extra))
    taper = any(k[2] == 'tp' for k in S)
    ARMS = ('pf6', 'fs', 'tp') if taper else ('pf6', 'fs')
    last = 'tp' if taper else 'fs'
    base = {k: v for k, v in S.items() if k[2] == 'base'}

    def falls(mode, cl, crest=False):
        out = []
        for k, v in base.items():
            if k[0] != mode or k[1] != cl:
                continue
            t = sf.standing_time(v['summary'])
            if t is None or t >= sf.HOLD or sf.axis(v['frames']) != 'across':
                continue
            if not crest and mode == 'o' and (k[3], k[5]) in CREST_STALLS:
                continue
            out.append(k)
        return sorted(out, key=lambda k: (k[3], k[5], k[4]))

    def lasting(mode, cl):
        return sorted(k for k, v in base.items() if k[0] == mode and k[1] == cl and sf.standing_time(v['summary']) == sf.HOLD)

    pops = [
        ('organic, cueLater on: sideways falls', falls('o', 'on')),
        ('organic, cueLater off: sideways falls, not crest stalls', falls('o', 'off')),
        ('catch (switch off): the collapses', falls('c', 'off')),
        ('lasting controls (organic on, organic off, catch off)', lasting('o', 'on') + lasting('o', 'off') + lasting('c', 'off')),
    ]
    print(f"# 3.5w phase {'3' if taper else '2'}: take-offs, paired by stand (time standing, s, censored at 3.00)\n")
    for title, keys in pops:
        print(f'## {title} (n = {len(keys)})\n')
        if taper:
            print('| stand | script | shipped | plantFloor=6 | face | taper | taper - pf6 |')
            print('| --- | --- | --- | --- | --- | --- | --- |')
        else:
            print('| stand | script | shipped | plantFloor=6 | face | face - pf6 |')
            print('| --- | --- | --- | --- | --- | --- |')
        tally = {a: {'rescue': 0, 'delay': 0, 'none': 0, 'worse': 0, 'n/a': 0, 'unpaired': 0, 'd': [], 'lost': 0} for a in ARMS}
        for k in keys:
            t0 = sf.standing_time(S[k]['summary'])
            cells = []
            ts = {}
            for a in ARMS:
                tag, d = sf.effect(S, k, a)
                if tag.endswith('*'):
                    tally[a]['unpaired'] += 1
                tally[a][tag.rstrip('*')] += 1
                v = S.get((k[0], k[1], a) + k[3:])
                t1 = sf.standing_time(v['summary']) if v else None
                ts[a] = t1
                if d is not None:
                    tally[a]['d'].append(d)
                if t1 is not None and t1 < sf.HOLD and t0 == sf.HOLD:
                    tally[a]['lost'] += 1
                cells.append('n/a' if d is None else f'{t1:.2f} ({tag})')
            diff = '' if ts[last] is None or ts['pf6'] is None else f"{ts[last] - ts['pf6']:+.2f}"
            print(f"| {sf.label(k).split()[0]} | {k[4]} | {t0:.2f} | " + ' | '.join(cells) + f' | {diff} |')
        print()
        for a in ARMS:
            t = tally[a]
            med = f"{st.median(t['d']):+.2f}" if t['d'] else '-'
            print(f"- **{a}**: rescue {t['rescue']} / delay {t['delay']} / none {t['none']} / worse {t['worse']} / n/a {t['n/a']}"
                  f" (unpaired stands {t['unpaired']}), median delta {med}, controls lost (fell < 3 s) {t['lost']}")
        print()


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], *sys.argv[3:])
