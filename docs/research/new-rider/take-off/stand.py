#!/usr/bin/env python3
"""Tables for `stand.ts`'s output. Every median here is a PLAIN median (the mean of the two middle values at even
length), and every count carries its population.

    python3 -I docs/research/new-rider/take-off/stand.py <out.jsonl>                 # the stands, one row each
    python3 -I docs/research/new-rider/take-off/stand.py <out.jsonl> --refusal       # the refusal through the sequence
    python3 -I docs/research/new-rider/take-off/stand.py <out.jsonl> --held          # held vs fell, property by property
    python3 -I docs/research/new-rider/take-off/stand.py <out.jsonl> --trace <wave> <script>
    python3 -I docs/research/new-rider/take-off/stand.py <out.jsonl> --place
    python3 -I docs/research/new-rider/take-off/stand.py <on.jsonl> --control <off.jsonl>

☠️ A file is only read after its own `control` line is printed, with the grid, the seed and the scripts it was made
with: a stale file in a scratchpad is otherwise indistinguishable from a fresh one.
"""
import json
import sys
from collections import Counter


def load(path):
    rows = [json.loads(line) for line in open(path)]
    control = next((r for r in rows if r.get('control')), None)
    done = next((r for r in rows if r.get('done')), None)
    return rows, control, done


def med(xs):
    s = sorted(x for x in xs if isinstance(x, (int, float)))
    if not s:
        return float('nan')
    m = len(s) // 2
    return s[m] if len(s) % 2 else (s[m - 1] + s[m]) / 2


def fmt(x, nd=3):
    if x is None:
        return '-'
    if isinstance(x, bool):
        return '1' if x else '0'
    if isinstance(x, (int, float)):
        return f'{x:.{nd}f}'
    return str(x)


def banner(control, done, path):
    print(f'# {path}')
    if control is None:
        print('!! no control line: this file was not produced by stand.ts, or was truncated')
        return
    print(f"# grid {control['grid']} = {control['cells']} cells · seed {control['seed']} · {control['size']} · "
          f"{control['periods']} periods · arms {','.join(control['arms'])} · scripts {','.join(control['scripts'])} · "
          f"probe {control.get('probe')} · Hs {control['significantHeight']} Tp {control['peakPeriod']} · "
          f"start ({control['startX']:.0f}, {control['startZ']:.0f}) · spun up in {control['spunUp']:.0f} s")
    print(f"# mirror constants: {control.get('mirror')}")
    if done:
        print(f"# {done['waves']} waves, {done['runs']} runs, {done['seconds']:.0f} s wall")
    print()


def stands(rows):
    """One row per stand: the refusal's four tests, the stand's own conditions, and what became of the ride."""
    ss = [r for r in rows if r.get('summary') and r['stood'] == 1]
    print(f'## {len(ss)} stands of {len([r for r in rows if r.get("summary")])} runs '
          f'({len([r for r in rows if r.get("summary") and r["popped"] == 1])} popped)')
    print()
    print('wave script   arm    pop   stand  refusal(game)     mirror            strain   into rearD frntD wet?  sink? '
          'ldPk ldFr | planing latch  cap  faceF slope ahead  wet   load front draft | after  held trunc obs')
    for r in sorted(ss, key=lambda r: (r['wave'], r['script'], r['arm'])):
        a = r.get('atStand') or {}
        print(f"{r['wave']:4d} {r['script']:8s} {r['arm']:6s} {fmt(r['pop'],2):>6s} {fmt(r['stand'],2):>6s}  "
              f"{str(r['popRefusal']):17s} {str(r['mirrorAtStand']):17s} "
              f"{fmt(r['standStrain'],4):>6s} {fmt(r['standInto'],3):>6s} {fmt(r['standRearDepth'],3):>5s} "
              f"{fmt(r['standFrontDepth'],3):>5s} {fmt(r['standFeetWet'],0):>4s} {fmt(r['standSinking'],0):>5s} "
              f"{fmt(r['landingPeak'],2):>4s} {fmt(r['landingFront'],2):>4s} | "
              f"{fmt(a.get('planing'),0):>7s} {fmt(a.get('latchSpeed'),2):>5s} {fmt(a.get('leanCap'),3):>5s} "
              f"{fmt(a.get('faceFrac'),2):>5s} {fmt(a.get('slope'),1):>5s} {fmt(a.get('ahead'),2):>5s} "
              f"{fmt(a.get('wetted'),3):>5s} {fmt(a.get('load'),2):>5s} {fmt(a.get('front'),2):>5s} "
              f"{fmt(a.get('draft'),3):>5s} | {('NEVER' if r['fellAfterStand'] is None else fmt(r['fellAfterStand'],3)):>6s} "
              f"{r['heldFull']:4d} {r['truncated']:5d} {fmt(r['observedAfterStand'],2):>5s}")
    print()
    print('## the refusal, counted (the game\'s own verdict, which returns on the FIRST test that fires)')
    print('  ', dict(Counter(str(r['popRefusal']) for r in ss)))
    print('## the same stands, each test counted SEPARATELY (unconditioned by the short-circuit)')
    print(f"   strained {sum(1 for r in ss if r['standStrained'])} · sinking {sum(1 for r in ss if r['standSinking'])} "
          f"· feet under water {sum(1 for r in ss if r['standFeetWet'])} · clear of all three "
          f"{sum(1 for r in ss if not r['standStrained'] and not r['standSinking'] and not r['standFeetWet'])} of {len(ss)}")
    print('## the mirror against the game, stand for stand (the positive control: these must agree)')
    agree = sum(1 for r in ss if str(r['mirrorAtStand']) == str(r['popRefusal'] or 'none'))
    print(f'   {agree} of {len(ss)} agree at the stand frame; '
          f"{sum(1 for r in ss if str(r['mirrorAtLastLanding']) == str(r['popRefusal'] or 'none'))} at the last landing frame")
    for r in ss:
        if str(r['mirrorAtStand']) != str(r['popRefusal'] or 'none'):
            print(f"   disagree w{r['wave']} {r['script']}: game={r['popRefusal']} mirror@stand={r['mirrorAtStand']} "
                  f"mirror@landing={r['mirrorAtLastLanding']}")
    print()
    print('## held the whole window vs fell')
    held = [r for r in ss if r['heldFull'] == 1]
    trunc = [r for r in ss if r['truncated'] == 1]
    fell = [r for r in ss if r['fellAfterStand'] is not None]
    print(f'   held {len(held)} · fell {len(fell)} · truncated (NEITHER — not observed long enough) {len(trunc)}')
    if fell:
        print(f"   fell after the stand: median {med([r['fellAfterStand'] for r in fell]):.4f} s, "
              f"range {min(r['fellAfterStand'] for r in fell):.3f}-{max(r['fellAfterStand'] for r in fell):.3f}, "
              f"within 1 s {sum(1 for r in fell if r['fellAfterStand'] <= 1)} of {len(fell)}")
    print(f"   causes: {dict(Counter(r['cause'] for r in fell))}")


def refusal(rows):
    """Where in the sequence the feet go under: the paddle, the press, the pop-up's 1.2 s, the stand."""
    ss = [r for r in rows if r.get('summary') and r['stood'] == 1]
    print('## ⭐ the feet\'s own depth through the sequence, m below the surface at the deck point under each foot')
    print('   (FEET_DEPTH is 0.1 m; the worst of the two feet is what `standRefusal` tests)')
    print()
    print('wave script   paddle(-0.5s)  at the cue   at the press  at landing    at the stand   | draft: paddle -> stand'
          ' | wetted: paddle -> stand | verdict')
    for r in sorted(ss, key=lambda r: (r['wave'], r['script'])):
        def worst(row):
            if not row:
                return None
            return max(row['rearDepth'], row['frontDepth'])
        print(f"{r['wave']:4d} {r['script']:8s} "
              f"{fmt(max(r['prePressRearDepth'] or -9, r['prePressFrontDepth'] or -9),3):>13s} "
              f"{fmt(worst(r.get('atCue')),3):>12s} {fmt(worst(r.get('atPop')),3):>13s} "
              f"{fmt(worst(r.get('atLanding')),3):>12s} {fmt(worst(r.get('atStand')),3):>14s}  | "
              f"{fmt(r['prePressDraft'],3):>6s} -> {fmt((r.get('atStand') or {}).get('draft'),3):>6s} | "
              f"{fmt(r['prePressWet'],3):>6s} -> {fmt((r.get('atStand') or {}).get('wetted'),3):>6s} | "
              f"{str(r['popRefusal'])}")
    print()
    print('## medians over the stands at each instant (worst foot)')
    for name, get in (
        ('paddling, the 0.5 s before the press', lambda r: max(r['prePressRearDepth'] or -9, r['prePressFrontDepth'] or -9)),
        ('at the cue', lambda r: max(r['atCue']['rearDepth'], r['atCue']['frontDepth']) if r.get('atCue') else None),
        ('at the press', lambda r: max(r['atPop']['rearDepth'], r['atPop']['frontDepth']) if r.get('atPop') else None),
        ('at push -> landing', lambda r: max(r['atLanding']['rearDepth'], r['atLanding']['frontDepth']) if r.get('atLanding') else None),
        ('at the stand', lambda r: max(r['atStand']['rearDepth'], r['atStand']['frontDepth']) if r.get('atStand') else None),
    ):
        xs = [get(r) for r in ss]
        xs = [x for x in xs if isinstance(x, (int, float))]
        over = sum(1 for x in xs if x > 0.1)
        print(f'   {name:38s} median {med(xs):+.3f} m  (n {len(xs)}, over FEET_DEPTH in {over})')
    print()
    print('## and the `sinking` test at the same instants (SINK_RATE 0.3 m/s)')
    for name, key in (('at the press', 'atPop'), ('at push -> landing', 'atLanding'), ('at the stand', 'atStand')):
        xs = [r[key]['into'] for r in ss if r.get(key)]
        print(f'   {name:38s} median {med(xs):+.3f} m/s (n {len(xs)}, over SINK_RATE in {sum(1 for x in xs if x > 0.3)})')


def held(rows):
    """The survivors' properties against the fallers', with the population on every line."""
    ss = [r for r in rows if r.get('summary') and r['stood'] == 1 and r['truncated'] == 0]
    groups = (('held the full window', [r for r in ss if r['heldFull'] == 1]),
              ('fell', [r for r in ss if r['fellAfterStand'] is not None]))
    cols = (('planing at the stand', lambda r: (r.get('atStand') or {}).get('planing')),
            ('speed through the water, m/s (the latch\'s own)', lambda r: (r.get('atStand') or {}).get('latchSpeed')),
            ('lean cap at the stand, rad', lambda r: (r.get('atStand') or {}).get('leanCap')),
            ('planing share of the first second', lambda r: r['fsPlaningShare']),
            ('wetted hull at the stand, m2', lambda r: (r.get('atStand') or {}).get('wetted')),
            ('up the face at the stand', lambda r: (r.get('atStand') or {}).get('faceFrac')),
            ('face slope under the board, deg', lambda r: (r.get('atStand') or {}).get('slope')),
            ('ahead of the crest, m', lambda r: (r.get('atStand') or {}).get('ahead')),
            ('front foot\'s LOAD SHARE', lambda r: (r.get('atStand') or {}).get('front')),
            ('load at the feet, bw', lambda r: (r.get('atStand') or {}).get('load')),
            ('landing peak, bw', lambda r: r['landingPeak']),
            ('the feet\'s depth, m', lambda r: max(r['standRearDepth'], r['standFrontDepth'])),
            ('the descent into the surface, m/s', lambda r: r['standInto']),
            ('capture margin, min over the first second', lambda r: r['fsCapMarginMin']),
            ('grip left, min', lambda r: r['fsGripMin']),
            ('knees left, min', lambda r: r['fsKneeMin']),
            ('past the feet ACROSS, peak, m', lambda r: r['fsPastXPeak']),
            ('past the feet ALONG, peak, m', lambda r: r['fsPastZPeak']),
            ('roll peak in the first second, deg', lambda r: r['fsRollPeak']))
    print('## held vs fell, median of each (plain medians; truncated runs excluded from BOTH)')
    print(f"   populations: held {len(groups[0][1])}, fell {len(groups[1][1])}, "
          f"excluded as truncated {len([r for r in rows if r.get('summary') and r['stood'] == 1 and r['truncated'] == 1])}")
    print()
    print(f"{'':48s} {'held':>10s} {'fell':>10s}")
    for name, get in cols:
        a = med([get(r) for r in groups[0][1]])
        b = med([get(r) for r in groups[1][1]])
        print(f'{name:48s} {a:10.3f} {b:10.3f}')
    print()
    print('## the refusal against the outcome: a 2x2, because a gate that predicts nothing is not a gate')
    for label, pick in (('refused (any verdict)', lambda r: r['popRefusal'] is not None),
                        ('refused `sinking`', lambda r: r['popRefusal'] == 'sinking'),
                        ('refused `feet under water`', lambda r: r['popRefusal'] == 'feet under water'),
                        ('not refused', lambda r: r['popRefusal'] is None)):
        sub = [r for r in ss if pick(r)]
        h = sum(1 for r in sub if r['heldFull'] == 1)
        print(f'   {label:28s} {h:2d} held of {len(sub):2d}'
              + (f"  (median fall {med([r['fellAfterStand'] for r in sub if r['fellAfterStand'] is not None]):.3f} s)" if len(sub) - h else ''))


def place(rows):
    ps = [r for r in rows if r.get('placement')]
    print(f'## {len(ps)} flush placements, {rows[-1].get("holdS", "?")} s each — the near-threshold entry sweep')
    print('   The mount seeds the planing latch from |board.velocity| > PLANING_SPEED (4 m/s) and a placement is given')
    print('   forward x entry + flow, so two entries either side of 4 differ in the latch and in little else.')
    print()
    print('entry planing1 share  latch1  cap1   fell,s cause     capMarMin pastXpk pastZpk  wetMed depthMed rollPk')
    for r in sorted(ps, key=lambda r: (r['arm'], r['sink'], r['entry'])):
        print(f"{r['entry']:5.2f} {fmt(r['planingFirst'],0):>8s} {fmt(r['planingShare'],2):>5s} "
              f"{fmt(r['latchFirst'],3):>7s} {fmt(r['capFirst'],3):>5s} "
              f"{('NEVER' if r['fellAtS'] is None else fmt(r['fellAtS'],3)):>7s} {str(r['cause']):9s} "
              f"{fmt(r['capMarginMin'],3):>9s} {fmt(r['pastXPeak'],4):>7s} {fmt(r['pastZPeak'],4):>7s} "
              f"{fmt(r['wetMed'],3):>7s} {fmt(r['depthMed'],3):>8s} {fmt(r['rollPeak'],1):>6s}")


def trace(rows, wave, script):
    fr = [r for r in rows if r.get('frame') and r.get('wave') == wave and r.get('script') == script]
    fr.sort(key=lambda r: r['frame'])
    print(f'## wave {wave}, script {script}: {len(fr)} logged frames')
    print()
    print('   t  tPop tStnd phase     att con  refuse            strain  into rearD frntD draft  wet  | plan latch  cap  '
          'ask | load front legN | capAcr capAlo pastX pastZ reach byd wpast capM | bLimit bMarg bGrip bKnee | cAcr cAlo cGrp raw  roll')
    for r in fr:
        print(f"{r['t']:5.2f} {fmt(r['tPop'],2):>5s} {fmt(r['tStand'],2):>5s} {r['phase']:9s} {r['attached']} {r['inContact']}  "
              f"{r['refuse']:17s} {fmt(r['strain'],4):>6s} {fmt(r['into'],2):>5s} {fmt(r['rearDepth'],3):>5s} "
              f"{fmt(r['frontDepth'],3):>5s} {fmt(r['draft'],3):>5s} {fmt(r['wetted'],2):>4s} | "
              f"{fmt(r['planing'],0):>4s} {fmt(r['latchSpeed'],2):>5s} {fmt(r['leanCap'],3):>5s} {fmt(r['leanAsk'],3):>4s} | "
              f"{fmt(r['load'],2):>4s} {fmt(r['front'],2):>5s} {fmt(r['legLoad'],0):>4s} | "
              f"{fmt(r['capAcross'],3):>6s} {fmt(r['capAlong'],3):>6s} {fmt(r['pastX'],3):>5s} {fmt(r['pastZ'],3):>5s} "
              f"{fmt(r['capReach'],3):>5s} {r['capBeyond']:3d} {r['capWeightPast']:5d} {fmt(r['capMargin'],2):>4s} | "
              f"{r['bLimit']:6s} {fmt(r['bMargin'],2):>5s} {fmt(r['bGrip'],2):>5s} {fmt(r['bKnee'],2):>5s} | "
              f"{fmt(r['cAcross'],2):>4s} {fmt(r['cAlong'],2):>4s} {fmt(r['cGrip'],2):>4s} {fmt(r['rawMargin'],2):>4s} "
              f"{fmt(r['roll'],1):>5s}")


def control_against(rows, other_path):
    """The probe's own inertness: PROBE=off builds no row, so it makes none of the probe's reads."""
    other, c2, _ = load(other_path)
    banner(other, None, other_path)
    keys = ['popped', 'stood', 'pop', 'stand', 'fell', 'cause', 'fellAfterStand', 'popOutcome', 'popRefusal',
            'popDuration', 'landingPeak', 'landingFront', 'riding', 'face', 'frames', 'liveFrames', 'cue', 'rule',
            'popBy', 'standAfterPop', 'heldFull', 'truncated', 'observedAfterStand']
    a = {(r['arm'], r['script'], r['wave']): r for r in rows if r.get('summary')}
    b = {(r['arm'], r['script'], r['wave']): r for r in other if r.get('summary')}
    shared = sorted(set(a) & set(b))
    diffs = [(k, key, a[k][key], b[k][key]) for k in shared for key in keys if a[k].get(key) != b[k].get(key)]
    print(f'## {len(shared)} runs aligned, {len(shared) * len(keys)} values compared, {len(diffs)} differ')
    print('   A broken result here is a changed fall time or a changed refusal: the probe would be changing what it measures.')
    for d in diffs[:20]:
        print('   ', d)


if __name__ == '__main__':
    path = sys.argv[1]
    rows, control, done = load(path)
    banner(control, done, path)
    args = sys.argv[2:]
    if not args:
        stands(rows)
    elif args[0] == '--refusal':
        refusal(rows)
    elif args[0] == '--held':
        held(rows)
    elif args[0] == '--place':
        place(rows)
    elif args[0] == '--trace':
        trace(rows, int(args[1]), args[2])
    elif args[0] == '--control':
        control_against(rows, args[1])
    else:
        raise SystemExit(f'unknown {args[0]}')
