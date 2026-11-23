#!/usr/bin/env python3
"""Step 3.5w: the attitude the game's board rides at, by schedule speed, from 3.5v's logged frames.

Reads the base arms of `results/35v/data/` (organic seeds 1-3 and the catch start runs 0-9, `cue` and `cueC`, the
`cueLater` switch on and off; the switch-off arms are 3.5t's runs, reproduced to zero differences by 3.5v §2). Only
`standing` frames, the board inside ROLL_MAX of roll, up to 3 s after the stand, and (for the `before` cut) before the
stand's first escape is near: frames more than 0.3 s before the stand's fall.

Definitions (all per frame, the probe's own fields, `slow-take-off.ts` `row`):
- `sched`: the speed the balance's `tick` was called with (`ctl.speed`, forward speed through the water along the
  heading, m/s): the speed the design table is read at. Frames without a controller tick are skipped.
- `trim`: the board's pitch against the local surface along its heading, deg, nose up +: `pitch + fall`, where `pitch`
  is the deck's world pitch (asin of the forward axis' y) and `fall` is the surface's own fall ahead of the nose along
  the heading (atan of the slope, + when the surface drops ahead). On flat water `fall` = 0 and this is the lab's trim.
- `tail`, `nose`: immersion of the bottom's rocker line 5 cm in from each end, m (surface over the point minus the
  point, + submerged).
- `wet` m^2, `subL` litres: the hull's wetted area and submerged volume.
- `Fp`, `Fb`, `Fam`: the hull's pressure, buoyancy and added-mass vertical forces as a share of the pair's weight.

Usage: python3 plant-rows-attitude.py results/35v/data > results/35w/attitude.md
"""
import gzip
import json
import os
import statistics
import sys

ROLL_MAX = 10.0
# Bins centred on the rows measured (3, 3.5, 4, 4.5) and the controls (5, 5.5, 6), 0.5 m/s wide.
BINS = [(2.75, 3.25), (3.25, 3.75), (3.75, 4.25), (4.25, 4.75), (4.75, 5.25), (5.25, 5.75), (5.75, 6.25)]
FIELDS = ['trim', 'pitch', 'fall', 'tail', 'nose', 'wet', 'subL', 'Fp', 'Fb', 'Fam', 'vW']


def q(xs, p):
    xs = sorted(xs)
    if not xs:
        return float('nan')
    k = (len(xs) - 1) * p
    lo = int(k)
    hi = min(lo + 1, len(xs) - 1)
    return xs[lo] + (xs[hi] - xs[lo]) * (k - lo)


def stands(path):
    """Yield (stand key, fell-after-stand or None, frames) per stand in one file."""
    frames = {}
    fell = {}
    with gzip.open(path, 'rt') as fh:
        catch = os.path.basename(path).startswith('c-')
        script_of_file = os.path.basename(path).split('-')[1]
        for line in fh:
            d = json.loads(line)
            if d['kind'] == 'summary':
                key = (d.get('script'), d.get('wave'))
                fell[key] = d.get('fellAfterStand')
            elif d['kind'] == 'f' and d.get('ph') == 'standing':
                key = (d.get('script', script_of_file), d.get('wave'))
                frames.setdefault(key, []).append(d)
            elif d['kind'] == 'stand' and catch:
                pass
    # Catch files carry no summary per wave: the stand lasts as long as its standing frames do (3 s hold by default).
    for key, fs in frames.items():
        f = fell.get(key)
        if f is None and catch:
            last = max(x['tS'] for x in fs)
            f = None if last >= 2.95 else last
        yield key, f, fs


def main(root):
    rows = []
    for name in sorted(os.listdir(root)):
        if '-base' not in name:
            continue
        pop = 'catch' if name.startswith('c-') else 'organic'
        switch = 'on' if '-on-' in name else 'off'
        for key, fell, fs in stands(os.path.join(root, name)):
            for d in fs:
                ctl = d.get('ctl')
                if not ctl or ctl.get('speed') is None:
                    continue
                if d.get('roll') is None or abs(d['roll']) > ROLL_MAX or d['tS'] > 3.0:
                    continue
                if d.get('pitch') is None or d.get('fall') is None:
                    continue
                lasting = fell is None or fell >= 3.0
                before = lasting or d['tS'] <= fell - 0.3
                rows.append({
                    'pop': pop, 'switch': switch, 'file': name, 'stand': key, 'lasting': lasting, 'before': before,
                    'sched': ctl['speed'], 'trim': d['pitch'] + d['fall'], 'pitch': d['pitch'], 'fall': d['fall'],
                    'tail': d['tail'], 'nose': d['nose'], 'wet': d['wet'], 'subL': d['subL'], 'Fp': d['Fp'], 'Fb': d['Fb'],
                    'Fam': d['Fam'], 'vW': d['vW'],
                })
    print('# 3.5w: the ridden attitude by schedule speed (3.5v base arms, standing frames)\n')
    print(f'Frames: standing, |roll| <= {ROLL_MAX} deg, tS <= 3 s, a controller tick present. `before`: frames from lasting')
    print('stands, and from falling stands up to 0.3 s before the fall. Median (10-90 %). `stands`: distinct stands in the bin.\n')
    for cut_name, cut in [('before (the attitude the board rides at)', lambda r: r['before']),
                          ('lasting stands only', lambda r: r['lasting']),
                          ('falling stands, before the fall', lambda r: r['before'] and not r['lasting'])]:
        print(f'## {cut_name}\n')
        print('| sched m/s | frames | stands | trim vs surface deg | world pitch deg | tail m | nose m | wet m2 | sub L | Fp W | Fb W | Fam W | vW m/s |')
        print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
        for lo, hi in BINS:
            sel = [r for r in rows if cut(r) and lo <= r['sched'] < hi]
            if not sel:
                print(f'| {lo}-{hi} | 0 | 0 |' + ' |' * 10)
                continue
            n_st = len({(r['file'], r['stand']) for r in sel})
            cells = []
            for f in ['trim', 'pitch', 'tail', 'nose', 'wet', 'subL', 'Fp', 'Fb', 'Fam', 'vW']:
                xs = [r[f] for r in sel if r[f] is not None]
                nd = 1 if f in ('trim', 'pitch') else 2 if f in ('subL', 'vW', 'wet', 'Fp', 'Fb', 'Fam') else 3
                cells.append(f'{q(xs, .5):.{nd}f} ({q(xs, .1):.{nd}f} to {q(xs, .9):.{nd}f})')
            print(f'| {lo}-{hi} | {len(sel)} | {n_st} | ' + ' | '.join(cells) + ' |')
        print()
    # Per population (organic / catch) for the `before` cut at the bins that matter.
    print('## By population, `before` cut: trim / tail (median)\n')
    print('| sched m/s | organic on | organic off | catch on | catch off |')
    print('| --- | --- | --- | --- | --- |')
    for lo, hi in BINS:
        cells = []
        for pop, sw in [('organic', 'on'), ('organic', 'off'), ('catch', 'on'), ('catch', 'off')]:
            sel = [r for r in rows if r['before'] and r['pop'] == pop and r['switch'] == sw and lo <= r['sched'] < hi]
            if not sel:
                cells.append('-')
                continue
            cells.append(f"{statistics.median(r['trim'] for r in sel):.1f} deg / {statistics.median(r['tail'] for r in sel):.3f} m (n {len(sel)})")
        print(f'| {lo}-{hi} | ' + ' | '.join(cells) + ' |')
    # Machine-readable medians for the probe.
    out = {}
    for lo, hi in BINS:
        sel = [r for r in rows if r['before'] and lo <= r['sched'] < hi]
        if sel:
            out[f'{lo}-{hi}'] = {f: round(statistics.median(r[f] for r in sel), 4) for f in ['trim', 'tail', 'nose', 'wet', 'subL', 'Fp', 'Fb', 'Fam']}
            out[f'{lo}-{hi}']['frames'] = len(sel)
    print('\n```json')
    print(json.dumps(out, indent=1))
    print('```')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'results/35v/data')
