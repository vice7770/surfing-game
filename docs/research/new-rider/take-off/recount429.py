#!/usr/bin/env python3
"""Re-count PR #429's own summaries, stand for stand, off its own files.

Three things the published tables could not show, all of them read straight from the jsonl:

 1. **The refusal split between the two seas.** Seed 1 refuses 12 of 18 for `feet under water` and 0 for `sinking`;
    seed 2 refuses 15 of 21 for `sinking` and 3 for `feet under water`. ⚠️ A `sinking` verdict returns at
    `AttachedRider.ts:2789`, **before** the loop at `:2790` samples a foot, so those 15 establish nothing about feet.
 2. **Which stands were actually observed.** `bench.ts:512` retires a trial at TRIAL s whatever its riders are doing,
    so a stand at 16.0167 s on a 16 s trial is stepped once and never falls. `fsN` is the tell: 0 frames observed.
 3. **Which stands carried the window**, and what they have in common.

    python3 -I docs/research/new-rider/take-off/recount429.py <seed1-summaries.jsonl> <seed2-summaries.jsonl>
"""
import json
import sys
from collections import Counter


def rows(path):
    return [json.loads(line) for line in open(path)]


def report(path, seed):
    ss = [r for r in rows(path) if r.get('summary') and r['arm'] == 'ships']
    stood = [r for r in ss if r['stood'] == 1]
    print(f'== seed {seed}: the `ships` arm, {len(ss)} runs, {len(stood)} stands')
    print(f"   the game's verdict: {dict(Counter(str(r['popRefusal']) for r in stood))}")
    fell = [r for r in stood if r['fell'] is not None]
    unobserved = [r for r in stood if r['fell'] is None and r['fsN'] == 0]
    heldreal = [r for r in stood if r['fell'] is None and r['fsN'] > 0]
    print(f'   fell {len(fell)} · carried the window {len(heldreal)} · NEVER OBSERVED (fsN == 0) {len(unobserved)}')
    print()
    print('   wave script  fsN  refusal            outcome      planing1 capMed  wetMed  popFrac  popFace landPk')
    for r in sorted(stood, key=lambda r: (r['fell'] is not None, r['wave'], r['script'])):
        out = 'HELD 3 s' if r['fell'] is None and r['fsN'] > 0 else (
            'UNOBSERVED' if r['fell'] is None else f"fell {r['fellAfterStand']:.3f} s")
        def g(key, nd=3, w=7):
            x = r.get(key)
            return f'{x:{w}.{nd}f}' if isinstance(x, (int, float)) else f'{"-":>{w}s}'
        print(f"   {r['wave']:4d} {r['script']:6s} {r['fsN']:4d}  {str(r['popRefusal']):18s} {out:12s} "
              f"{g('fsPlaningFirst', 0, 8)} {g('fsCapMed', 3, 6)} "
              f"{g('fsWetMed')} {g('popFraction', 3, 8)} {g('popFace', 3, 8)} {g('landingPeak', 3, 6)}")
    if heldreal:
        print()
        print('   what the stands that carried the window have in common:')
        for key, name in (('fsPlaningFirst', 'planing at the stand'), ('fsCapMed', 'lean cap, median'),
                          ('fsWetMed', 'wetted hull, median m2'), ('popFraction', 'up the face at the press')):
            hv = [r[key] for r in heldreal if r.get(key) is not None]
            fv = [r[key] for r in fell if r.get(key) is not None]
            if hv and fv:
                print(f'     {name:28s} held {min(hv):.3f}-{max(hv):.3f}   fell {min(fv):.3f}-{max(fv):.3f}')
    print()


if __name__ == '__main__':
    report(sys.argv[1], 1)
    report(sys.argv[2], 2)
