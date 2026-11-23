#!/usr/bin/env python3
"""Step 3.5w phase 2: 3.5o's steering drives, shipped / plantFloor=6 / plantSpeed=face, paired by rider.

`results/35w/steer/s<seed>-c<0|1>-<ship|pf6|face>.jsonl.gz` (`sharp-steer.ts`, PERIODS=12, STAND_HOLD=5). The
collapses are 3.5o §8's named riders (its rule, applied there on the shipped arm); `plantFloor=4.5` is read from
3.5o's own population file (`results/35o/population-summaries.jsonl.gz`, run tag `floor`), valid as a comparison only
where this round's shipped re-run reproduces 3.5o's shipped fall times (checked and printed first).

Fall time: `fellAfterStand`, censored at 5 s (a rider still up at the hold counts at 5).
The climb (3.5o §8): seed 2 wave 2, left turn, the first frame after the climb's minimum at which the climb (face
height x face fraction above the trough) reaches 0.50 and 0.90 m: its time after the stand, speed over the ground and
course.

Usage: python3 plant-rows-steer.py results/35w/steer results/35o/population-summaries.jsonl.gz [more directories]

Phase 3 (plant-rows.md section 9): `plantSpeed=taper` files (`s<seed>-c<0|1>-taper.jsonl.gz`, compact: the summaries, the
builds and the seed-2 wave-2 `cueL` rows only) are read from any further directory, e.g. `results/35w/steer-taper`.
Without a taper file the output is phase 2's.
"""
import gzip
import json
import os
import statistics as st
import sys

HOLD = 5.0
COLLAPSE = {0: [(2, 1, 'cueL'), (2, 1, 'cueR'), (3, 9, 'cueR'), (3, 12, 'cueL'), (3, 12, 'cueR'), (4, 6, 'cueL'),
                (8, 2, 'cueL'), (8, 2, 'cueR'), (8, 5, 'cueL'), (8, 5, 'cueR')],
            1: [(2, 1, 'cueL'), (2, 1, 'cueR'), (2, 6, 'cueL'), (2, 6, 'cueR'), (3, 9, 'cueL'), (3, 9, 'cueR')]}
ARMS = ('ship', 'pf6', 'face', 'taper')


def t_of(s):
    if s.get('stand') is None:
        return None
    f = s.get('fellAfterStand')
    return HOLD if f is None else min(HOLD, f)


def load(directory):
    T, rows, built = {}, {}, {}
    for name in sorted(os.listdir(directory)):
        if not name.endswith('.jsonl.gz'):
            continue
        seed, c, arm = name[:-9].split('-')
        seed, c = int(seed[1:]), int(c[1:])
        with gzip.open(os.path.join(directory, name), 'rt') as fh:
            for line in fh:
                d = json.loads(line)
                k = d.get('kind')
                if k == 'summary':
                    T[(arm, c, seed, d['wave'], d['script'])] = t_of(d)
                elif k == 'built':
                    built.setdefault((arm, c), set()).add((d.get('plantFloor'), d.get('plantSpeed')))
                elif k == 'row' and seed == 2 and c == 0 and d['wave'] == 2 and d['script'] == 'cueL':
                    rows.setdefault(arm, []).append(d)
    return T, rows, built


def floor45(path):
    T = {}
    with gzip.open(path, 'rt') as fh:
        for line in fh:
            d = json.loads(line)
            if d.get('kind') != 'summary':
                continue
            seed, c, arm = d['run'].split('-')
            T[({'ships': 'ship35o', 'floor': 'pf45'}[arm], int(c[1:]), int(seed[1:]), d['wave'], d['script'])] = t_of(d)
    return T


def fmt(t):
    return '—' if t is None else (f'>={HOLD:.2f}' if t >= HOLD else f'{t:.3f}')


def pair(T, keys, a, b):
    d = [T[(b,) + k] - T[(a,) + k] for k in keys if T.get((a,) + k) is not None and T.get((b,) + k) is not None]
    later = sum(x >= 0.0005 for x in d)
    sooner = sum(x <= -0.0005 for x in d)
    worse = sum(x <= -0.25 for x in d)
    return d, f"later {later} / sooner {sooner} / same {len(d) - later - sooner}, median {st.median(d):+.3f}, worse by >= 0.25 s: {worse}" if d else 'n/a'


def main(directory, pop35o, *more):
    T, rows, built = load(directory)
    for extra in more:
        t2, r2, b2 = load(extra)
        T.update(t2); rows.update(r2); built.update(b2)
    TAPER = any(k[0] == 'taper' for k in T)
    NEW = ('pf6', 'face', 'taper') if TAPER else ('pf6', 'face')
    T.update(floor45(pop35o))
    print(f"# 3.5w phase {'3' if TAPER else '2'}: steering (sharp-steer.ts, 3.5o drives), paired by rider\n")
    print('Printed-back builds (plantFloor, plantSpeed) per arm:', {f'{a}-c{c}': sorted(map(str, v)) for (a, c), v in sorted(built.items())}, '\n')
    # Reproduction of 3.5o's shipped arm.
    keys = [k[1:] for k in T if k[0] == 'ship35o']
    same = sum(1 for k in keys if T.get(('ship',) + k) == T[('ship35o',) + k])
    have = sum(1 for k in keys if ('ship',) + k in T)
    print(f'Reproduction: this round\'s shipped arm against 3.5o\'s shipped arm: {same} of {have} riders with the identical fall time '
          f'({len(keys)} in 3.5o\'s file).\n')
    for c, title in ((0, 'Steer only (seeds 1-9)'), (1, 'Steer + Compress (seeds 1-3)')):
        ck = [(c,) + k for k in COLLAPSE[c]]
        print(f'## {title}: the sharp-steer collapses (n = {len(ck)})\n')
        print('| rider | shipped (3.5o) | shipped | plantFloor=4.5 (3.5o) | plantFloor=6 | face |' + (' taper |' if TAPER else ''))
        print('| --- | --- | --- | --- | --- | --- |' + (' --- |' if TAPER else ''))
        for k in ck:
            print(f"| s{k[1]}w{k[2]} {k[3]} | {fmt(T.get(('ship35o',) + k))} | {fmt(T.get(('ship',) + k))} | {fmt(T.get(('pf45',) + k))} | {fmt(T.get(('pf6',) + k))} | {fmt(T.get(('face',) + k))} |" + (f" {fmt(T.get(('taper',) + k))} |" if TAPER else ''))
        print()
        for arm in ('pf45',) + NEW:
            base = 'ship35o' if arm == 'pf45' else 'ship'
            vals = [T.get((arm,) + k) for k in ck]
            print(f"- **{arm}** - {base}: {pair(T, ck, base, arm)[1]}; median fall {st.median([v for v in vals if v is not None]):.3f}; "
                  f"carried past +1.5 s {sum(1 for v in vals if v is not None and v > 1.5)}")
        print(f"- shipped: median fall {st.median([T[('ship',) + k] for k in ck if T.get(('ship',) + k) is not None]):.3f}")
        print()
        nk = sorted(k[1:] for k in T if k[0] == 'ship' and k[1] == c and k[4] == 'cue' and T[k] is not None)
        print(f'### neutral riders (script `cue`, stood on shipped; n = {len(nk)})\n')
        for arm in NEW:
            print(f'- {arm} - shipped: {pair(T, nk, "ship", arm)[1]}')
        print()
        sk = sorted(k[1:] for k in T if k[0] == 'ship' and k[1] == c and k[4] != 'cue' and T[k] is not None)
        print(f'### every steered rider that stood (n = {len(sk)})\n')
        for arm in NEW:
            d, txt = pair(T, sk, 'ship', arm)
            print(f'- {arm} - shipped: {txt}')
        for arm in NEW[1:]:
            worst = sorted(((T[(arm,) + k] - T[('ship',) + k], k) for k in sk if T.get((arm,) + k) is not None), key=lambda x: x[0])[:6]
            print(f'- {arm}, the six largest losses: ' + ', '.join(f"s{k[1]}w{k[2]} {k[3]} {T[('ship',) + k]:.2f} -> {T[(arm,) + k]:.2f}" for _, k in worst))
        print()
    print('## The seed-2 wave-2 left turn\'s climb (3.5o: 0.50 m at +2.067 s, 4.24 m/s, 48.6°; 0.90 m at +2.783 s, 3.31 m/s, 46.4°)\n')
    for arm in (ARMS if TAPER else ARMS[:3]):
        rs = sorted((r for r in rows.get(arm, []) if r.get('climb') is not None and r.get('attached')), key=lambda r: r['tStand'])
        if not rs:
            print(f'- {arm}: no rows')
            continue
        lo = min(range(len(rs)), key=lambda i: rs[i]['climb'])
        out = []
        for h in (0.5, 0.9):
            hit = next((r for r in rs[lo:] if r['climb'] >= h), None)
            out.append(f"{h:.2f} m: " + ('not reached' if hit is None else f"+{hit['tStand']:.3f} s, {hit['speedThrough']:.2f} m/s through the water ({hit['speed']:.2f} over the ground), course {hit['course']:.1f}°"))
        print(f"- {arm}: fall {fmt(T.get((arm, 0, 2, 2, 'cueL')))}; " + '; '.join(out))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], *sys.argv[3:])
