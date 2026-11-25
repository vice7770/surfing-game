#!/usr/bin/env python3
"""3.6b's pass lines (README §0.7): an arm's rides against switch off, ride for ride.

    python3 compare.py --on <dir> [<dir> ...] --off <dir> [<dir> ...] --twins <switch-off onset dir> [--md out.md]

Every dir is a turn-probe run or a benchmark report's raw run (the same file names and rows). A steer ride's straight
twin is looked up in its own run first, then in --twins (an arm acts only off centre, so a straight ride is the same with
it on; README §0.5). Cells: Compress and Crouch steer-only on tw-catch, tw-ride and big; the his-way turn on tw-catch,
tw-ride, med and big. Metrics: twin-subtracted course toward the steer at +0.5 and +1.0 s, peak yaw toward the steer over
+1.0 to +2.0 s. A cell passes a metric when the paired median (on - off) > 0 and more pairs rise than fall (on the test
wave, both pairs rise).
"""
import argparse, statistics as st
from onset import load, metrics, stance_of

ap = argparse.ArgumentParser()
ap.add_argument('--on', nargs='+', required=True)
ap.add_argument('--off', nargs='+', required=True)
ap.add_argument('--twins', required=True)
ap.add_argument('--md')
a = ap.parse_args()


def rides_of(dirs):
    out = {}
    for d in dirs:
        out.update(load(d))
    return out


twins = load(a.twins)
on = metrics(rides_of(a.on), twins)
off = metrics(rides_of(a.off), twins)
CELLS = [(g, s) for s in ('crouch', 'compress') for g in ('tw-catch', 'tw-ride', 'big')] + [(g, 'hisway') for g in ('tw-catch', 'tw-ride', 'med', 'big')]
METRICS = ['sub0.5', 'sub1.0', 'yawPeak']
lines = ['| group | drive | metric | pairs | rise / fall / same | median on − off | median off | median on | passes |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |']
allpass = True
for g, s in CELLS:
    ids = sorted(k for k, m in on.items() if m['group'] == g and stance_of(m['script']) == s and k in off)
    for metric in METRICS:
        pairs = [(off[k].get(metric), on[k].get(metric)) for k in ids]
        pairs = [(x, y) for x, y in pairs if x is not None and y is not None]
        if not pairs:
            lines.append(f'| {g} | {s} | {metric} | 0 | — | — | — | — | no pairs |')
            continue
        d = [y - x for x, y in pairs]
        rise, fall = sum(1 for v in d if v > 1e-9), sum(1 for v in d if v < -1e-9)
        md = st.median(d)
        ok = (rise == len(d)) if g.startswith('tw-') else (md > 0 and rise > fall)
        allpass &= ok
        lines.append(f'| {g} | {s} | {metric} | {len(d)} | {rise} / {fall} / {len(d) - rise - fall} | {md:+.2f} | {st.median(x for x, _ in pairs):.2f} | {st.median(y for _, y in pairs):.2f} | {"yes" if ok else "**no**"} |')
lines.append('')
lines.append(f'**Faster by the pass line: {"yes" if allpass else "no"}.**')
text = '\n'.join(lines)
if a.md:
    open(a.md, 'w').write(text + '\n')
print(text)
