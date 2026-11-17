"""Step 3.5a's read: every table in README.md Part 1, rebuilt from the arms' own dumps.

    gunzip -k docs/research/new-rider/3.5/results/35a/*.gz
    python3 docs/research/new-rider/3.5/read.py docs/research/new-rider/3.5/results/35a

Every number is a median of per-run values or a TICK-WEIGHTED share (each run's share weighted by its own live-tick
count), never a mean of shares, and every population is printed beside its number. `clip` is the share of live ticks
on which `|want| > cap`, read off the probe's own `askClip` column.
"""
import json
import os
import sys

DIR = sys.argv[1] if len(sys.argv) > 1 else 'docs/research/new-rider/3.5/results/35a'
STANCES = ('tall', 'crouch', 'compress')


def rows(name):
    p = os.path.join(DIR, name + '.log')
    if not os.path.exists(p):
        return None
    return [json.loads(l) for l in open(p) if l.startswith('{')]


def qt(v, p):
    s = sorted(v)
    return s[min(len(s) - 1, int(p * len(s)))] if s else float('nan')


def med(v):
    return qt(v, 0.5)


def weighted(rr, share_key, n_key):
    tot = sum(x[n_key] for x in rr)
    return sum((x[share_key] or 0) * x[n_key] for x in rr) / tot if tot else float('nan')


def table(title, arms, cols):
    print(f'\n## {title}\n')
    print('| arm | stance | runs | fell | median s | ' + ' | '.join(c[0] for c in cols) + ' |')
    print('|---|---|---|---|---|' + '---|' * len(cols))
    for arm in arms:
        r = rows(arm)
        if r is None:
            print(f'| {arm} | MISSING | | | | ' + ' | '.join('' for _ in cols) + ' |')
            continue
        for st in STANCES:
            rr = [x for x in r if x['stance'] == st]
            if not rr:
                continue
            fell = [x['fellAt'] for x in rr if x['fell']]
            cells = [c[1](rr) for c in cols]
            print(f"| `{arm}` | {st} | {len(rr)} | **{len(fell)} of {len(rr)}** | "
                  f"{med(fell):.3f} | " + ' | '.join(cells) + ' |')


def num(rr, key, d=2):
    v = [x[key] for x in rr if x[key] is not None]
    return f'{med(v):.{d}f}' if v else '–'


def reached(rr, key):
    return f"{sum(1 for x in rr if x[key] is not None)} of {len(rr)}"


LOW = ['f73-l.ships', 'f73-l.a45', 'f73-l.a4', 'f73-l.a2', 'f73-l.a15', 'f73-l.a9']
LOWS = ['f73-ls.ships', 'f73-ls.a45', 'f73-ls.a4', 'f73-ls.a2', 'f73-ls.a15', 'f73-ls.a9']
HALF = ['f73-l.s0.5.ships', 'f73-l.s0.5.2', 'f73-l.s05.a9']
THIRD = ['f73-l.s0.3.ships', 'f73-l.s0.3.2']
GLIDE = ['f73-g.ships', 'f73-g.a2', 'f73-g.a9', 'f73-gs.ships', 'f73-gs.a2', 'f73-gs.a9']
STEEP = ['s16-l.ships', 's16-l.a2', 's16-ls.ships', 's16-ls.a2', 's16-ls.a9']

CLIP = [
    ('clip, live ticks', lambda rr: f"**{weighted(rr, 'askClipShare', 'askN'):.3f}**"),
    ('n live', lambda rr: str(sum(x['askN'] for x in rr))),
    ('< 2 m/s', lambda rr: f"{weighted(rr, 'askClipBelow2', 'askNBelow2'):.3f} ({sum(x['askNBelow2'] for x in rr)})"),
    ('2–3', lambda rr: f"{weighted(rr, 'askClip2to3', 'askN2to3'):.3f} ({sum(x['askN2to3'] for x in rr)})"),
    ('3–4', lambda rr: f"{weighted(rr, 'askClip3to4', 'askN3to4'):.3f} ({sum(x['askN3to4'] for x in rr)})"),
    ('4–6', lambda rr: f"{weighted(rr, 'askClip4to6', 'askN4to6'):.3f} ({sum(x['askN4to6'] for x in rr)})"),
    ('≥ 6', lambda rr: f"{weighted(rr, 'askClipAbove6', 'askNAbove6'):.3f} ({sum(x['askNAbove6'] for x in rr)})"),
]
ASKS = [
    ('want °', lambda rr: num(rr, 'askWantMed')),
    ('cap °, med', lambda rr: num(rr, 'askCapMed')),
    ('held °, med', lambda rr: num(rr, 'askHeldMed')),
    ('ask °, med', lambda rr: num(rr, 'askAskMed')),
    ('ask °, peak', lambda rr: num(rr, 'askAskPeak')),
    ('planing share', lambda rr: num(rr, 'askPlaningShare', 3)),
    ('v through, med', lambda rr: num(rr, 'askSpeedMed')),
]
TURN = [
    ('to rail 5°, s', lambda rr: num(rr, 'askRail5', 3)),
    ('to 10°, s', lambda rr: num(rr, 'askRail10', 3)),
    ('to 20°, s', lambda rr: num(rr, 'askRail20', 3)),
    ('reached 20°', lambda rr: reached(rr, 'askRail20')),
    ('rail peak °', lambda rr: num(rr, 'askRailPeak', 1)),
    ('bank peak °', lambda rr: num(rr, 'askBankPeak', 1)),
    ('yaw peak °/s', lambda rr: num(rr, 'askYawPeak', 1)),
    ('turned °', lambda rr: num(rr, 'askYawTurned', 1)),
]

print('# step 3.5a — the ask cap, read off the arms')
print('\nEvery arm: `RIDER=new FELT=deck BODY=two AHEAD=0.75 SIDE=-45 SECONDS=9`, the stance held, 9 s a run.')
print('`ships` is the switch unset. `a15/a2/a4/a45/a9` are `ASKCAP=1.5|2|4|4.5|9`.')
print('`-l` is the owner\'s own low cell (`ENTRIES=1…6`), `-g` the glide cell (eight absolute entries 4.435–10.435),')
print('`f73` = `FACE=1.4,7.32,5.7` (5.5° under the board), `s16` = `FACE=1.4,16,5.7` (12.1°).')
print('A trailing `s` on the cell name is `STEERS=1`; `s0.5`/`s0.3` are those sticks; otherwise the stick is centred.')

for name, arms in [('The owner\'s own low cell, stick CENTRED — falls and ride times', LOW),
                   ('The owner\'s own low cell, stick HARD OVER', LOWS),
                   ('Half stick and a third', HALF + THIRD),
                   ('The glide cell', GLIDE),
                   ('The 12.1° face', STEEP)]:
    table(name + ' — what the cap binds', arms, CLIP)
    table(name + ' — the ask itself', arms, ASKS)
    table(name + ' — turn initiation', arms, TURN)


def identity(base, others):
    print(f'\n## Bit-identity against `{base}`\n')
    b = rows(base)
    for arm in others:
        o = rows(arm)
        if o is None:
            print(f'- `{arm}`: MISSING')
            continue
        diffs = {}
        n = 0
        for x, y in zip(b, o):
            for k in x:
                if k == 'askCapArm':
                    continue
                n += 1
                if x[k] != y.get(k):
                    diffs[k] = diffs.get(k, 0) + 1
        print(f"- `{arm}`: {sum(diffs.values())} differing column-values of {n} over {len(b)} runs"
              + (f" — {diffs}" if diffs else ' — **identical**'))


identity('f73-l.ships', ['f73-l.a15', 'f73-l.a2', 'f73-l.a4', 'f73-l.a45', 'f73-l.a9'])
identity('s16-l.ships', ['s16-l.a2'])
identity('f73-g.ships', ['f73-g.a2', 'f73-g.a9'])
