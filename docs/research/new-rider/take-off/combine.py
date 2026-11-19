#!/usr/bin/env python3
"""Pool the stands of several `stand.ts` runs and ask the only two questions that need more than one sea.

 1. **What is NECESSARY for a ride that lasts, and what is SUFFICIENT?** A min/max "no overlap" test conflates the two
    and a single sea answers neither: seed 1 alone shows seven columns separating with no overlap and **seed 2 shows
    none**, so that test was a fact about 34 stands. Necessity survives pooling and is what this prints.
 2. ⭐ **What does `standRefusal`'s feet test say when it is NOT short-circuited?** The game's verdict returns on the
    first test that fires, so `sinking` (`AttachedRider.ts:2789`) hides the feet (`:2790`). `stand.ts` records every
    test's own number at the stand whatever the verdict was, so the two can finally be counted apart.

    python3 -I docs/research/new-rider/take-off/combine.py <s1.jsonl> <s2.jsonl> [...]

Every count carries its population. Truncated stands — stood, never fell, not followed the full window — are excluded
from both groups, and the count of them is printed; a survivor total without that count is not a count.
"""
import json
import sys


def stands(paths):
    out = []
    for path in paths:
        rs = [json.loads(line) for line in open(path)]
        control = next((r for r in rs if r.get('control')), None)
        if control is None:
            raise SystemExit(f'{path}: no control line — not a stand.ts run, or truncated')
        print(f"# {path}: grid {control['grid']} seed {control['seed']} {control['periods']} periods "
              f"scripts {','.join(control['scripts'])} arms {','.join(control['arms'])}")
        for r in rs:
            if r.get('summary') and r['stood'] == 1:
                r['seed'] = control['seed']
                out.append(r)
    return out


def V(r):
    return (r.get('atStand') or {}).get('latchSpeed') or 0.0


def planing(r):
    return (r.get('atStand') or {}).get('planing') == 1


def main(paths):
    allst = stands(paths)
    trunc = [r for r in allst if r['truncated'] == 1]
    rows = [r for r in allst if r['truncated'] == 0]
    held = [r for r in rows if r['heldFull'] == 1]
    waves = {(r['seed'], r['wave']) for r in rows}
    print()
    print(f'## {len(rows)} stands over {len(waves)} (seed, wave) pairs: {len(held)} carried the full window, '
          f'{len(rows) - len(held)} fell, {len(trunc)} excluded as truncated')
    if held:
        print(f"   the rides that lasted came from {len({(r['seed'], r['wave']) for r in held})} distinct waves")
    cut = min(V(r) for r in held) if held else float('nan')
    print()
    print('## ⭐ necessity and sufficiency, pooled. A condition on the left that holds for every ride that lasted is')
    print('   NECESSARY; one that is also mostly followed by a ride that lasts is SUFFICIENT. These are not the same.')
    print()
    print('                                             held / stands   share')
    tests = (
        ('planing at the stand', planing),
        ('NOT planing at the stand', lambda r: not planing(r)),
        (f'speed through the water >= {cut:.3f} m/s', lambda r: V(r) >= cut - 1e-9),
        (f'speed through the water <  {cut:.3f} m/s', lambda r: V(r) < cut - 1e-9),
        ('the feet DRY at the stand', lambda r: r['standFeetWet'] == 0),
        ('⭐ the feet WET at the stand', lambda r: r['standFeetWet'] == 1),
        ('planing AND the feet dry', lambda r: planing(r) and r['standFeetWet'] == 0),
        ('planing AND the feet wet', lambda r: planing(r) and r['standFeetWet'] == 1),
        ('not planing AND the feet dry', lambda r: not planing(r) and r['standFeetWet'] == 0),
    )
    for name, pred in tests:
        sub = [r for r in rows if pred(r)]
        h = sum(r['heldFull'] for r in sub)
        print(f'  {name:42s} {h:3d} / {len(sub):3d}' + (f'   {h / len(sub):5.0%}' if sub else '      —'))
    print()
    print("## ⭐ the game's verdict against the feet, measured. The verdict returns on the FIRST test that fires.")
    print()
    print('  verdict                 held / stands | of those, feet actually WET | feet actually DRY')
    for name, pick in (("'feet under water'", lambda r: r['popRefusal'] == 'feet under water'),
                       ("'sinking'", lambda r: r['popRefusal'] == 'sinking'),
                       ("'strained'", lambda r: r['popRefusal'] == 'strained'),
                       ("'no water'", lambda r: r['popRefusal'] == 'no water'),
                       ('not refused', lambda r: r['popRefusal'] is None)):
        sub = [r for r in rows if pick(r)]
        if not sub:
            continue
        h = sum(r['heldFull'] for r in sub)
        wet = [r for r in sub if r['standFeetWet'] == 1]
        print(f"  {name:22s} {h:3d} / {len(sub):3d}  | {len(wet):26d} | {len(sub) - len(wet):17d}"
              + (f"   ({sum(r['heldFull'] for r in wet)} of the wet ones lasted)" if wet else ''))
    hidden = [r for r in rows if r['popRefusal'] == 'sinking' and r['standFeetWet'] == 1]
    print()
    print(f"   ⚠️ stands whose verdict is `sinking` while the feet ARE under water: {len(hidden)} — the game's own")
    print(f"      `feet under water` count under-reports wet feet by that many")
    for r in hidden:
        print(f"      seed {r['seed']} w{r['wave']:2d} {r['script']:8s} into {r['standInto']:.3f} m/s "
              f"(> SINK_RATE, so it returned first), rear foot {r['standRearDepth']:+.3f} m, "
              f"front {r['standFrontDepth']:+.3f} m, lasted {r['heldFull']}")
    print()
    print("## ⭐ the fall test's two terms, per sea. `human.fallen` is `beyond && weightPast`, and the conjunction is")
    print('   reached INSIDE a substep, so at frame granularity it shows only on the frame AFTER the separation — which')
    print('   is a frozen frame and excluded. A probe that looks for the conjunction on live frames finds nothing.')
    for path in paths:
        rs = [json.loads(line) for line in open(path)]
        control = next((r for r in rs if r.get('control')), None)
        fr = [r for r in rs if r.get('frame') and r.get('phase') == 'standing' and r.get('attached') == 1]
        if not fr:
            print(f"   {path}: no per-frame rows (LOG=none) — rerun with LOG=window for this section")
            continue
        sums = {(r['arm'], r['script'], r['wave']): r for r in rs if r.get('summary')}
        runs = {}
        for r in fr:
            runs.setdefault((r['arm'], r['script'], r['wave']), []).append(r)
        reached = [k for k, v in runs.items() if any(x['capBeyond'] == 1 for x in v)]
        heldof = sum(1 for k in reached if sums.get(k, {}).get('heldFull') == 1)
        b = sum(1 for r in fr if r['capBeyond'] == 1)
        w = sum(1 for r in fr if r['capWeightPast'] == 1)
        both = sum(1 for r in fr if r['capBeyond'] == 1 and r['capWeightPast'] == 1)
        print(f"   seed {control['seed']}: of {len(fr)} live standing frames, `beyond` on {b}, `weightPast` on {w}, "
              f"BOTH on {both}")
        print(f"      stands that reached `beyond` at least once: {len(reached)}; of those, {heldof} carried the window")
    print()
    print('## what a gate would have cost, had each test been the gate (the stand refused, the rider laid back down)')
    for name, pred in (("the flag as written (any verdict)", lambda r: r['popRefusal'] is not None),
                       ("`feet under water` as the verdict", lambda r: r['popRefusal'] == 'feet under water'),
                       ("⭐ the FEET, measured, test order aside", lambda r: r['standFeetWet'] == 1),
                       ("`sinking` as the verdict", lambda r: r['popRefusal'] == 'sinking')):
        sub = [r for r in rows if pred(r)]
        lost = sum(r['heldFull'] for r in sub)
        print(f'  {name:40s} refuses {len(sub):3d} of {len(rows)} stands, '
              f'and would destroy {lost:2d} of the {len(held)} rides that lasted')


if __name__ == '__main__':
    main(sys.argv[1:])
