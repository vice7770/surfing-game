#!/usr/bin/env python3
"""Step 3.5w phase 3: the 27-cell plumb grid (straight-fall.ts GRID=1), shipped / plantFloor=6 / face / taper, paired by cell.

Usage: python3 plant-rows-grid.py results/35w/grid/g-ship.jsonl.gz results/35w/grid/g-pf6.jsonl.gz \
           results/35w/grid/g-face.jsonl.gz results/35w/grid/g-taper.jsonl.gz
Pass line (plant-rows.md sections 8.5 / 9.4): paired median delta >= -0.1 s and <= 2 cells worse by >= 0.25 s.
"""
import gzip
import json
import statistics as st
import sys

NAMES = ('shipped', 'plantFloor=6', 'face', 'taper')


def load(path):
    T, built = {}, set()
    with gzip.open(path, 'rt') as fh:
        for line in fh:
            d = json.loads(line)
            if d.get('kind') == 'summary':
                T[d['cell']] = d['fell'] if d.get('fell') is not None else d.get('seconds')
            elif d.get('kind') == 'built':
                built.add((d.get('plantFloor'), d.get('plantSpeed'), d.get('configPlantSpeed')))
    return T, built


def main(paths):
    arms = [load(p) for p in paths]
    print('# 3.5w phase 3: the 27-cell plumb grid (straight-fall.ts GRID=1, no input, 6 s), fall time s\n')
    print('builds (plantFloor, plantSpeed, config plantSpeed):', {n: sorted(map(str, b)) for n, (_, b) in zip(NAMES, arms)}, '\n')
    ship = arms[0][0]
    cells = sorted(ship, key=lambda c: tuple(float(x) for x in c.split('|')))
    print('| cell (dh|dx|dv) | ' + ' | '.join(NAMES[:len(arms)]) + ' | taper - shipped |')
    print('| --- ' * (len(arms) + 2) + '|')
    for c in cells:
        vals = [a[0].get(c) for a in arms]
        d = '' if vals[-1] is None else f'{vals[-1] - vals[0]:+.3f}'
        print(f'| {c} | ' + ' | '.join('—' if v is None else f'{v:.3f}' for v in vals) + f' | {d} |')
    print()
    for n, (T, _) in zip(NAMES[1:], arms[1:]):
        d = [T[c] - ship[c] for c in cells if c in T]
        print(f'- **{n}** - shipped: n {len(d)}, later {sum(x >= 0.0005 for x in d)} / sooner {sum(x <= -0.0005 for x in d)} / same '
              f'{sum(abs(x) < 0.0005 for x in d)}, median {st.median(d):+.3f}, worse by >= 0.25 s: {sum(x <= -0.25 for x in d)}, '
              f'median fall {st.median(T[c] for c in cells if c in T):.3f}')
    print(f'- shipped: median fall {st.median(ship[c] for c in cells):.3f}')


if __name__ == '__main__':
    main(sys.argv[1:])
