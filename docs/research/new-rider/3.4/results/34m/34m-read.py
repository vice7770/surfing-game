"""Step 3.4m. The sign-correct share of the model's side force, before the fall, per stance, shipped against
`?plantFloor=4.5` — step 3.4l's own cuts and step 3.4l's own arms, read off the per-tick dumps.

Cuts are step 3.4l's (`../34l/34l-read-cuts.py`) unchanged, so the before/after is read the same way:
  A  = live, `speedClamped == 1` (speedUsed outside the SHIPPED table's 4-12 m/s), |roll| <= 25 deg
  B  = A and speed <= 1.6 m/s          -- the owner's own cell, and thin: 17-24 ticks a stance in 3.4l
  C  = live, `speedClamped == 0`, |roll| <= 25  -- the honest band, the control that must not move
`speedClamped` keeps the SHIPPED 4-12 definition in both arms (`3.3/plant.ts`'s `TABLE_FLOOR`), so "clamped" names
the same band of speeds either side of the switch.

The sign share is over ticks with both forces non-zero, exactly as 3.4l took it. The rides are NOT the same ticks
in the two arms -- the switch changes the design, so it changes the trajectory -- so every n is printed.

  python3 34m-read.py <dir-with-the-ticks-dumps>
"""
# NOTE: the dumps here are gzipped. `gunzip -k *.ticks.jsonl.gz` beside this file first, or point the script at
# the directory the probe wrote (`python3 <this>.py <dir>`).

import json, math, os, sys
from collections import Counter

S = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
ARMS = ['f73-l', 's16-l', 's16-g']
TAGS = [('ships', 'shipped floor 4'), ('f45', 'floor 4.5')]


def load(tag):
    rows = []
    for a in ARMS:
        p = f'{S}/{a}.{tag}.ticks.jsonl'
        if not os.path.exists(p):
            continue
        for line in open(p):
            d = json.loads(line)
            d['arm'] = a
            rows.append(d)
    return rows


def med(v):
    v = sorted(v)
    n = len(v)
    return float('nan') if n == 0 else (v[n // 2] if n % 2 else .5 * (v[n // 2 - 1] + v[n // 2]))


def qt(v, q):
    v = sorted(v)
    return float('nan') if not v else v[min(len(v) - 1, int(q * len(v)))]


CUTS = {
    'A clamped (<4 m/s), |roll|<=25': lambda d: d['speedClamped'] == 1 and abs(d['roll']) <= 25,
    'B clamped, speed<=1.6, |roll|<=25': lambda d: d['speedClamped'] == 1 and d['speed'] <= 1.6 and abs(d['roll']) <= 25,
    'C unclamped (4-12), |roll|<=25': lambda d: d['speedClamped'] == 0 and abs(d['roll']) <= 25,
}
TABLE = [('4', 46.4, .513), ('4.5', 25.9, .293), ('5', 19.3, .215), ('5.5', 15.3, .166), ('6', 12.6, .133),
         ('6.5', 10.7, .109), ('7', 9.2, .091), ('7.5', 8.8, .085), ('8', 5.6, .056), ('8.5', 7.3, .07),
         ('9', 5.7, .045), ('9.5', 4.8, .042), ('10', 5.7, .047), ('10.5', 4.3, .027), ('11', 4.4, .034),
         ('11.5', 4.8, .03), ('12', 2.9, .017)]
near = lambda t, d: (min(TABLE, key=lambda r: abs(r[1] - t))[0], min(TABLE, key=lambda r: abs(r[2] - d))[0])

data = {tag: load(tag) for tag, _ in TAGS}
print('# live tick counts per arm (live == t > 0.2 s and the measured bank NOT at the 70 deg clamp)')
for tag, name in TAGS:
    rows = data[tag]
    print(f'#   {name:16s} rows {len(rows):5d}  live {sum(1 for d in rows if d["live"] == 1):5d}  ' +
          '  '.join(f'{a}: {sum(1 for d in rows if d["arm"] == a and d["live"] == 1)}' for a in ARMS))

print()
print('## THE PRIMARY METRIC: the sign-correct share of the side force, per stance, never pooled')
print()
print(f"{'cut':34s} {'stance':9s} | {'shipped n':>9s} {'share':>7s} {'|ratio|':>8s} | {'floor4.5 n':>10s} {'share':>7s} {'|ratio|':>8s} | {'move':>7s}")
for cn, cf in CUTS.items():
    for st in ['tall', 'crouch', 'compress']:
        cells = []
        for tag, _ in TAGS:
            c = [d for d in data[tag] if d['live'] == 1 and d['stance'] == st and cf(d)
                 and abs(d['yGame']) > 1e-6 and abs(d['yModel']) > 1e-6]
            sr = sum(1 for d in c if (d['yGame'] > 0) == (d['yModel'] > 0)) / len(c) if c else float('nan')
            ra = med([abs(d['yModel'] / d['yGame']) for d in c]) if c else float('nan')
            cells.append((len(c), sr, ra))
        mv = cells[1][1] - cells[0][1]
        print(f'{cn:34s} {st:9s} | {cells[0][0]:9d} {cells[0][1]:7.3f} {cells[0][2]:8.3f} | '
              f'{cells[1][0]:10d} {cells[1][1]:7.3f} {cells[1][2]:8.3f} | {mv:+7.3f}')
    print()

print('## the same share by tercile of |yGame| WITHIN each stance cell (3.4l CHECK 1, so the magnitude cut survives)')
for cn in ['A clamped (<4 m/s), |roll|<=25', 'B clamped, speed<=1.6, |roll|<=25', 'C unclamped (4-12), |roll|<=25']:
    cf = CUTS[cn]
    for st in ['tall', 'crouch', 'compress']:
        line = []
        for tag, name in TAGS:
            c = [d for d in data[tag] if d['live'] == 1 and d['stance'] == st and cf(d)
                 and abs(d['yGame']) > 1e-6 and abs(d['yModel']) > 1e-6]
            if not c:
                line.append(f'{name}: -')
                continue
            ys = sorted(abs(d['yGame']) for d in c)
            t1, t2 = qt(ys, 1 / 3), qt(ys, 2 / 3)
            parts = []
            for lab, f in [('low', lambda d: abs(d['yGame']) < t1), ('mid', lambda d: t1 <= abs(d['yGame']) < t2),
                           ('high', lambda d: abs(d['yGame']) >= t2)]:
                s = [d for d in c if f(d)]
                sr = sum(1 for d in s if (d['yGame'] > 0) == (d['yModel'] > 0)) / len(s) if s else float('nan')
                parts.append(f'{lab} n={len(s):4d} |yG|={med([abs(d["yGame"]) for d in s]):6.1f} r={med([abs(d["yModel"] / d["yGame"]) for d in s]):6.3f} sign={sr:.3f}')
            line.append(f'{name:16s} ' + ' | '.join(parts))
        print(f'{cn:34s} {st:9s}')
        for l in line:
            print(f'    {l}')
    print()

print('## the board\'s own regime on the same cuts, and the nearest measured row (3.4l CHECK 2)')
print(f"{'cut':34s} {'stance':9s} {'arm':16s} {'n':>5s} {'spd':>6s} {'trimFace':>9s} {'draft':>7s} {'wet':>6s} | near trim/draft | modal draft row")
for cn, cf in CUTS.items():
    for st in ['tall', 'crouch', 'compress']:
        for tag, name in TAGS:
            c = [d for d in data[tag] if d['live'] == 1 and d['stance'] == st and cf(d)]
            if not c:
                continue
            tf = [d['trimFace'] for d in c]
            df = [d['draftFace'] for d in c]
            bt, bd = near(med(tf), med(df))
            cd = Counter(near(d['trimFace'], d['draftFace'])[1] for d in c).most_common(2)
            print(f'{cn:34s} {st:9s} {name:16s} {len(c):5d} {med([d["speed"] for d in c]):6.2f} {med(tf):9.2f} '
                  f'{med(df):7.4f} {med([d["wetShare"] for d in c]):6.3f} | \'{bt}\' / \'{bd}\' | {cd}')
    print()
