#!/usr/bin/env python3
"""Step 3.5k's reader: the lateral demand, decomposed, and the board's lateral water force beside it.

`project` computes, on every loaded frame (`AttachedRider.ts`, step 3.5i's own note above the line):

    freeX = local.x - height * (j.x / j.y)          # the moment term is 0 without `?bodyBank=hip`
    across = 1 - |freeX - midX| / halfWidth         # `hAcross`, the fall test's lateral headroom

so with `local.x` emitted beside `freeX` the split into a CENTRE-OF-MASS term and an IMPULSE-RATIO term is an
identity, not a model:

    comOff = local.x - midX                         # m, board-local +x (the board's LEFT rail)
    dLever = local.x - freeX = height * j.x/j.y     # m, board-local +x
    across = 1 - |comOff - dLever| / halfWidth

**A lean is PAID FOR when `dLever` tracks `comOff`.** `pay = dLever / comOff` is that payment, dimensionless; 1.0 is
a lean the contact's own line of action has followed exactly, 0.0 is a lean that has gone entirely into the demand.

Units, frames and axes, on every column this file prints: metres, newtons, degrees, seconds. `...B` is the BOARD's
own local +x (the axis `j.x` lives on, and the one the sole's moment is taken about). `...H` is the WORLD horizontal
across the heading. `dRatio`, `needRatio` and `pay` are dimensionless. Every force is DELIVERED (a ledger of what the
water or the contact did over the step), never requested.

    python3 -I docs/research/new-rider/3.5/swing-demand-read.py <ab.jsonl> [--wave 2] [--script cueL]
"""
import argparse
import gzip
import json
import math
import sys
from collections import defaultdict

ap = argparse.ArgumentParser()
ap.add_argument('path')
ap.add_argument('--wave', type=int, default=2)
ap.add_argument('--script', default='cueL')
ap.add_argument('--every', type=int, default=6, help='frames between printed trace rows (60 Hz, so 6 = 0.1 s)')
ap.add_argument('--turn-at', type=float, default=0.3, help="the probe's TURN_AT, s after the stand")
ap.add_argument('--turn-for', type=float, default=0.9, help="the probe's TURN_FOR, s")
A = ap.parse_args()
TURN_END = A.turn_at + A.turn_for

opener = gzip.open if A.path.endswith('.gz') else open
rows = defaultdict(list)
summaries = {}
control = None
with opener(A.path, 'rt') as fh:
    for line in fh:
        d = json.loads(line)
        if d.get('control'):
            control = d
        elif d.get('kind') == 'summary':
            summaries[(d['arm'], d['script'], d['wave'])] = d
        elif d.get('kind') == 'row':
            rows[(d['arm'], d['script'], d['wave'])].append(d)

ARMS = control['arms']
print('=' * 118)
print('CONTROL')
print('=' * 118)
print(f"  grid {control['grid']} ({control['cells']} cells) · seed {control['seed']} · periods {control['periods']}"
      f" · standHold {control['standHold']} · log {control['log']} · probe {control['probe']}")
print(f"  address  {control['address']}")
print(f"  seaDiffs {control['seaDiffs'] if control['seaDiffs'] else 'EMPTY (the arms ride the same sea)'}")
for arm in ARMS:
    sw = control['switches'][arm]
    print(f"  switches[{arm}] = {sw}")
    if 'bodyBank' in sw:
        print(f"    !! bodyBank IS PRESENT on {arm}: the moment term is live and the decomposition below is incomplete")


def num(row, key):
    x = row.get(key)
    return float('nan') if x is None else float(x)


def standing(cell):
    """Only attached, upright, STANDING frames whose normal passed BALANCE_LOAD.

    `desiredCop` is a LATCH below `BALANCE_LOAD` (it is written only inside `if (this.loaded)`), so an unloaded frame
    carries the last loaded frame's `freeX` and must not enter any arithmetic about this frame.
    """
    return [r for r in rows[cell]
            if r.get('phase') == 'standing' and r.get('attached') == 1 and r.get('loadedNow') == 1
            and r.get('tStand') is not None and not math.isnan(num(r, 'comLX')) and not math.isnan(num(r, 'wantX'))]


def median(xs):
    s = sorted(x for x in xs if not math.isnan(x))
    if not s:
        return float('nan')
    m = len(s) // 2
    return s[m] if len(s) % 2 else (s[m - 1] + s[m]) / 2


def slope(xs, ys):
    """Ordinary least squares through the origin AND with an intercept; both are reported."""
    pts = [(x, y) for x, y in zip(xs, ys) if not math.isnan(x) and not math.isnan(y)]
    n = len(pts)
    if n < 3:
        return float('nan'), float('nan'), float('nan'), n
    sx = sum(p[0] for p in pts)
    sy = sum(p[1] for p in pts)
    sxx = sum(p[0] * p[0] for p in pts)
    sxy = sum(p[0] * p[1] for p in pts)
    syy = sum(p[1] * p[1] for p in pts)
    den = n * sxx - sx * sx
    thru = sxy / sxx if sxx > 0 else float('nan')
    if den == 0:
        return thru, float('nan'), float('nan'), n
    b = (n * sxy - sx * sy) / den
    a = (sy - b * sx) / n
    ssr = sum((y - (a + b * x)) ** 2 for x, y in pts)
    sst = syy - sy * sy / n
    r2 = 1 - ssr / sst if sst > 0 else float('nan')
    return thru, b, r2, n


# Cells come from the summaries when a run completed, and from the rows otherwise, so a killed run can still be read
# (its exits then have to be recovered from the last attached frame, which `1.` says when it does).
cells = sorted({(s, w) for (_, s, w) in summaries} | {(s, w) for (_, s, w) in rows}, key=lambda t: (t[1], t[0]))
if not summaries:
    print('\n  !! NO SUMMARY LINES: this run did not reach its end. Exits below are recovered from the rows.')

print()
print('=' * 118)
print('1. THE EXITS, AND THE LIVENESS OF THE SWITCH  (reproduces PR #444 table 2.1 / 2.3)')
print('=' * 118)
print('   ⚠️ `comX set` is the POSTURE\'s own internal lateral offset (localCenter.x − base.x), which is PR #444\'s')
print('   headline number. `comLX set` is the rider\'s CENTRE OF MASS across the BOARD (board.toLocal(position).x),')
print('   which is the quantity `project` takes the sole\'s moment on and the one `across` is built from. Both are')
print('   medians over the LAST 0.2 s of the loaded standing window, m, board-local +x (the board\'s LEFT rail).')
print(f"{'wave':>5} {'script':>7} | " + ' | '.join(
    f"{arm:>8} exit  foldA°pk   comX set  comLX set" for arm in ARMS))
for script, wave in cells:
    line = f'{wave:>5} {script:>7} |'
    for arm in ARMS:
        s = summaries.get((arm, script, wave))
        fr = standing((arm, script, wave))
        allr = rows.get((arm, script, wave), [])
        if s is None:
            if not allr:
                line += f"{'-':>32} |"
                continue
            gone = [r for r in allr if r.get('attached') == 0 and r.get('tStand') is not None]
            exit_s = f"~{gone[0]['tStand']:.3f}" if gone else '~no fall seen'
        else:
            exit_s = 'rode out' if s.get('fellAfterStand') is None else f"{s['fellAfterStand']:.3f}"
        fold = max((abs(num(r, 'foldA')) for r in fr), default=float('nan'))
        tail = [r for r in fr if num(r, 'tStand') >= (fr[-1]['tStand'] - 0.2)] if fr else []
        settled = median([num(r, 'comX') for r in tail])
        settledL = median([num(r, 'comLX') for r in tail])
        line += f" {exit_s:>13}  {fold:7.3f}  {settled:+9.5f}  {settledL:+9.5f} |"
    print(line)

print()
print('   Controls per cell: rawOk (the three headrooms reproducing the engine\'s own rawMargin), the per-frame drift')
print('   of comLX (which bounds the frame-boundary-versus-substep error on local.x at 1/32 of it), and the agreement')
print('   of the DELIVERED contact ratio with the demanded one on unclamped frames.')
print(f"{'arm':>8} {'script':>7} {'wave':>4} {'n':>5} {'rawOk':>7} {'dComLX/frame':>13} {'subErr':>9} "
      f"{'|dRatio-cRatio| med (limit none)':>34}")
for script, wave in cells:
    for arm in ARMS:
        fr = standing((arm, script, wave))
        if not fr:
            continue
        ok = sum(1 for r in fr if r.get('rawOk') == 1)
        drift = median([abs(num(fr[i], 'comLX') - num(fr[i - 1], 'comLX')) for i in range(1, len(fr))])
        free = [abs(num(r, 'dRatio') - num(r, 'cRatio')) for r in fr if r.get('limit') == 'none']
        print(f"{arm:>8} {script:>7} {wave:>4} {len(fr):>5} {ok:>3}/{len(fr):<3} {drift:13.6f} {drift / 32:9.6f} "
              f"{median(free):>34.5f}")

print()
print('=' * 118)
print(f'2. THE DEMAND, DECOMPOSED — wave {A.wave} `{A.script}`, FRAME BY FRAME, BOTH ARMS')
print('=' * 118)
print('   across = 1 - |comOff - dLever| / half.   comOff is the CoM term, dLever = height*j.x/j.y the impulse-ratio')
print('   term, both m in board-local +x.  pay = dLever/comOff (1 = the lean is fully paid for by the line of action).')
for arm in ARMS:
    fr = standing((arm, A.script, A.wave))
    s = summaries.get((arm, A.script, A.wave))
    if not fr:
        print(f'\n  --- {arm}: no standing frames ---')
        continue
    exit_s = 'rode out' if s.get('fellAfterStand') is None else f"{s['fellAfterStand']:.3f} s"
    print(f'\n  --- arm {arm} · exit {exit_s} · {len(fr)} loaded standing frames ---')
    print(f"   {'t+s':>6} {'foldA°':>7} {'comLX':>8} {'comOff':>8} {'dLever':>8} {'freeX':>8} {'pay':>7} "
          f"{'dRatio':>7} {'needR':>7} {'across':>8} {'load':>6} {'roll°':>7} {'bank°':>7} "
          f"{'fwB':>8} {'fwH':>8} {'fRailsB':>8} {'fFinsB':>8} {'spdTh':>6} {'limit':>7}")
    pick = fr[::A.every]
    if fr[-1] not in pick:
        pick = pick + [fr[-1]]
    for r in pick:
        comOff = num(r, 'comOff')
        dLever = num(r, 'dLever')
        pay = dLever / comOff if abs(comOff) > 1e-4 else float('nan')
        print(f"   {num(r,'tStand'):6.3f} {num(r,'foldA'):7.2f} {num(r,'comLX'):+8.4f} {comOff:+8.4f} "
              f"{dLever:+8.4f} {num(r,'wantX'):+8.4f} {pay:7.2f} {num(r,'dRatio'):+7.3f} {num(r,'needRatio'):+7.3f} "
              f"{num(r,'hAcross'):+8.3f} {num(r,'load'):6.3f} {num(r,'roll'):+7.2f} {num(r,'bank'):+7.2f} "
              f"{num(r,'fwB'):+8.1f} {num(r,'fwH'):+8.1f} {num(r,'fRailsB'):+8.1f} {num(r,'fFinsB'):+8.1f} "
              f"{num(r,'speedThrough'):6.2f} {str(r.get('limit')):>7}")

print()
print('=' * 118)
print('3. IS THE LEAN PAID FOR? — the impulse-ratio term regressed on the centre-of-mass term, per cell')
print('=' * 118)
print('   d(dLever)/d(comOff) over the loaded standing frames. 1.0 would mean every metre of lateral centre of mass')
print('   is matched by a metre of lateral run in the contact\'s line of action, and `across` would not move at all.')
print(f"{'arm':>8} {'script':>7} {'wave':>4} {'n':>5} {'thru0':>8} {'slope':>8} {'R2':>6} "
      f"{'comOff med':>11} {'dLever med':>11} {'pay med':>8} {'across med':>11} {'across min':>11}")
for script, wave in cells:
    for arm in ARMS:
        fr = standing((arm, script, wave))
        if len(fr) < 5:
            continue
        xs = [num(r, 'comOff') for r in fr]
        ys = [num(r, 'dLever') for r in fr]
        t0, b, r2, n = slope(xs, ys)
        pays = [y / x for x, y in zip(xs, ys) if abs(x) > 1e-4]
        print(f"{arm:>8} {script:>7} {wave:>4} {n:>5} {t0:8.3f} {b:8.3f} {r2:6.3f} "
              f"{median(xs):+11.5f} {median(ys):+11.5f} {median(pays):8.2f} "
              f"{median([num(r,'hAcross') for r in fr]):+11.3f} {min(num(r,'hAcross') for r in fr):+11.3f}")

print()
print('=' * 118)
print('4. DOES THE BOARD\'S LATERAL WATER FORCE RISE WITH THE LEAN?')
print('=' * 118)
print('   The water\'s whole mean force on the board over the step (`BoardBody.forces`, every source summed),')
print('   projected on the BOARD\'s own +x (`fwB`) and on the world horizontal across the heading (`fwH`), N.')
print('   `vs sin(roll)` is the slope in N per unit sine — the quantity the 2026-11-15 consult-log row measured at')
print('   709 N for the hull alone — ⚠️ and THAT row is the WORLD-HORIZONTAL across component (it is 98.1 % of a')
print('   deck-normal 722.6 N, and a deck-normal force has NO board-local +x part at all), so the column to compare')
print('   it with is `fwH/sin(roll)` at the right, NOT `fwB/sin(roll)`. `vs comOff` is N per metre of lateral centre')
print('   of mass: the payment, in force.')
print(f"{'arm':>8} {'script':>7} {'wave':>4} {'n':>5} {'fwB med':>9} {'fwB pk':>9} {'fwH med':>9} {'fwH pk':>9} "
      f"{'roll° med':>10} {'fwB/sin(roll)':>14} {'R2':>6} {'fwB/comOff':>11} {'R2':>6}")
for script, wave in cells:
    for arm in ARMS:
        fr = standing((arm, script, wave))
        if len(fr) < 5:
            continue
        fwB = [num(r, 'fwB') for r in fr]
        fwH = [num(r, 'fwH') for r in fr]
        sr = [math.sin(math.radians(num(r, 'roll'))) for r in fr]
        co = [num(r, 'comOff') for r in fr]
        _, b1, r1, _ = slope(sr, fwB)
        _, b2, r2b, _ = slope(co, fwB)
        _, bh, rh, _ = slope(sr, fwH)
        pk = max(fwB, key=abs)
        pkH = max(fwH, key=abs)
        print(f"{arm:>8} {script:>7} {wave:>4} {len(fr):>5} {median(fwB):+9.1f} {pk:+9.1f} {median(fwH):+9.1f} "
              f"{pkH:+9.1f} {median([num(r,'roll') for r in fr]):+10.2f} {b1:+14.1f} {r1:6.3f} {b2:+11.1f} {r2b:6.3f}"
              f" | fwH/sin(roll) {bh:+9.1f} R2 {rh:5.3f}")

print()
print('   By source, board-local +x, N, median over the same frames (the rail band and the fins are the two that a')
print('   banked board is supposed to answer with):')
SRC = ['fPresB', 'fBuoyB', 'fAddB', 'fRadB', 'fFricB', 'fFinsB', 'fRailsB', 'fFrothB', 'fSuctB', 'fBedB']
print(f"{'arm':>8} {'script':>7} {'wave':>4} " + ' '.join(f'{s[1:-1]:>9}' for s in SRC))
for script, wave in cells:
    for arm in ARMS:
        fr = standing((arm, script, wave))
        if len(fr) < 5:
            continue
        print(f"{arm:>8} {script:>7} {wave:>4} " + ' '.join(f'{median([num(r,s) for r in fr]):+9.1f}' for s in SRC))

print()
print('=' * 118)
print('5. THE FORCE THE LEAN ASKS OF THE WATER, AGAINST WHAT THE WATER GAVE')
print('=' * 118)
print('   The rider\'s lean needs a lateral contact force of `needRatio * N` (board +x) to put the demand on the')
print('   support\'s middle; its reaction on the board is the opposite sign, and the water must balance it less the')
print('   board\'s own lateral acceleration. Both columns are in newtons on the board\'s own +x.')
print(f"{'arm':>8} {'script':>7} {'wave':>4} {'n':>5} {'N (=cFy) med':>13} {'needLat med':>12} {'gotLat med':>11} "
      f"{'shortfall':>10} {'fwB med':>9} {'bd accB*m':>10}")
for script, wave in cells:
    for arm in ARMS:
        fr = standing((arm, script, wave))
        if len(fr) < 5:
            continue
        needs, gots, accs = [], [], []
        for i, r in enumerate(fr):
            N = num(r, 'cFy')
            needs.append(num(r, 'needRatio') * N)
            gots.append(num(r, 'cFx'))
            if i:
                dt = num(r, 't') - num(fr[i - 1], 't')
                if dt > 0:
                    accs.append((num(r, 'velB') - num(fr[i - 1], 'velB')) / dt * num(r, 'bMass'))
        print(f"{arm:>8} {script:>7} {wave:>4} {len(fr):>5} {median([num(r,'cFy') for r in fr]):+13.1f} "
              f"{median(needs):+12.1f} {median(gots):+11.1f} {median(needs) - median(gots):+10.1f} "
              f"{median([num(r,'fwB') for r in fr]):+9.1f} {median(accs):+10.1f}")

if any('postA' in r for rs in rows.values() for r in rs[:1]):
    print()
    print('=' * 118)
    print('6. THE SENSING LOOP AND THE ROTOR\'S STOP')
    print('=' * 118)
    print('   `frame()` sets bank = leanLine - postA, where postA is the posture\'s OWN lateral lean (0 by construction')
    print('   on the default rider). So the controller senses the LEG\'s bank, and the hip\'s own weight shift is')
    print('   subtracted out of the signal that commands it. Degrees. `foldA at stop` counts frames at the 1.2 rad')
    print('   (68.755 deg) hip range, which is a SATURATED rotor and not a held lean.')
    print(f"{'arm':>8} {'script':>7} {'wave':>4} {'n':>5} {'postA med':>10} {'postA pk':>9} {'bank med':>9} "
          f"{'leanLine med':>12} {'leanLine pk':>11} {'foldA pk':>9} {'at stop':>9} {'|swingR| med':>12}")
    for script, wave in cells:
        for arm in ARMS:
            fr = standing((arm, script, wave))
            if len(fr) < 5:
                continue
            fold = [abs(num(r, 'foldA')) for r in fr]
            stop = sum(1 for f in fold if f > 68.7)
            print(f"{arm:>8} {script:>7} {wave:>4} {len(fr):>5} {median([num(r,'postA') for r in fr]):+10.3f} "
                  f"{max((num(r,'postA') for r in fr), key=abs):+9.3f} {median([num(r,'bank') for r in fr]):+9.3f} "
                  f"{median([num(r,'leanLine') for r in fr]):+12.3f} "
                  f"{max((num(r,'leanLine') for r in fr), key=abs):+11.3f} {max(fold):9.3f} "
                  f"{stop:>4}/{len(fr):<4} {median([abs(num(r,'swingR')) for r in fr]):12.2f}")

    print()
    print(f'   Frame by frame on wave {A.wave} `{A.script}`:')
    for arm in ARMS:
        fr = standing((arm, A.script, A.wave))
        if not fr:
            continue
        print(f'\n   --- arm {arm} ---')
        print(f"   {'t+s':>6} {'foldA°':>8} {'swingR°/s':>10} {'swingT':>8} {'postA°':>8} {'bank°':>8} "
              f"{'leanLine°':>10} {'roll°':>8} {'ankRest°':>9} {'ankRoom°':>9} {'ask°':>7} {'cap°':>7} "
              f"{'comLX':>8} {'dLever':>8} {'across':>8}")
        pick = fr[::A.every]
        if fr[-1] not in pick:
            pick = pick + [fr[-1]]
        for r in pick:
            print(f"   {num(r,'tStand'):6.3f} {num(r,'foldA'):+8.2f} {num(r,'swingR'):+10.1f} "
                  f"{num(r,'swingT'):+8.1f} {num(r,'postA'):+8.3f} {num(r,'bank'):+8.2f} {num(r,'leanLine'):+10.2f} "
                  f"{num(r,'roll'):+8.2f} {num(r,'ankRest'):+9.3f} {num(r,'ankRoom'):+9.3f} "
                  f"{num(r,'ask')*180/math.pi:+7.2f} {num(r,'capDeg'):+7.2f} {num(r,'comLX'):+8.4f} "
                  f"{num(r,'dLever'):+8.4f} {num(r,'hAcross'):+8.3f}")

print()
print('=' * 118)
print('7. THE TWO HALVES, COUNTERFACTUALLY — which one is spending the headroom')
print('=' * 118)
print('   across = 1 - |comOff - dLever| / half.  So hold one term at zero and recompute: `acr|noCoM` is the headroom')
print('   the turn\'s own line of action would leave with the body plumb, and `acr|noLever` is what the lean alone')
print('   would spend with no lateral run in the force at all. Medians, and the share of frames each puts outside.')
print(f"{'arm':>8} {'script':>7} {'wave':>4} {'n':>5} {'across med':>11} {'<0':>7} {'acr|noCoM med':>14} {'<0':>7} "
      f"{'acr|noLever med':>16} {'<0':>7}")
for script, wave in cells:
    for arm in ARMS:
        fr = standing((arm, script, wave))
        if len(fr) < 5:
            continue
        half, got, nc, nl = None, [], [], []
        for r in fr:
            half = (num(r, 'supXMax') - num(r, 'supXMin')) / 2
            mid = (num(r, 'supXMax') + num(r, 'supXMin')) / 2
            co, dl = num(r, 'comOff'), num(r, 'dLever')
            got.append(num(r, 'hAcross'))
            nc.append(1 - abs(-dl) / half)
            nl.append(1 - abs(co) / half)
        n = len(fr)
        print(f"{arm:>8} {script:>7} {wave:>4} {n:>5} {median(got):+11.3f} {sum(1 for x in got if x<0):>3}/{n:<3} "
              f"{median(nc):+14.3f} {sum(1 for x in nc if x<0):>3}/{n:<3} "
              f"{median(nl):+16.3f} {sum(1 for x in nl if x<0):>3}/{n:<3}")

if any('capOffset' in r for rs in rows.values() for r in rs[:1]):
    print()
    print('=' * 118)
    print('8. THE FALL TEST\'S OWN DECOMPOSITION — `pointAcross = offsetAcross - height*feltAcross`')
    print('=' * 118)
    print('   This is `CaptureState`\'s own pair of reports (humanBalance.ts, step 3.3g), and it is the SAME question')
    print('   in the units `human.fallen` actually uses. `capOffset` = the lean the body ACHIEVED (m, board +x);')
    print('   `capDemand` = height*feltAcross = the lean the turn has EARNED (m) - the felt vertical leans to the')
    print('   INSIDE of a banked turn, so this is what the water is paying for. `capPoint` is their difference, and')
    print('   `capAcross` adds the body\'s across SPEED at 1/omega on top of it.')
    print(f"{'arm':>8} {'script':>7} {'wave':>4} {'n':>5} {'capOffset':>10} {'capDemand':>10} {'earned%':>8} "
          f"{'capPoint':>9} {'spd/omega':>10} {'capAcross':>10} {'capReach':>9} {'beyond':>8} {'wtPast':>8} {'frozen':>7}")
    for script, wave in cells:
        for arm in ARMS:
            fr = standing((arm, script, wave))
            if len(fr) < 5:
                continue
            off = median([num(r, 'capOffset') for r in fr])
            dem = median([num(r, 'capDemand') for r in fr])
            vel = median([num(r, 'capSpeed') / num(r, 'capOmega') if num(r, 'capOmega') > 0 else float('nan') for r in fr])
            n = len(fr)
            print(f"{arm:>8} {script:>7} {wave:>4} {n:>5} {off:+10.5f} {dem:+10.5f} "
                  f"{(100 * dem / off if abs(off) > 1e-4 else float('nan')):8.1f} "
                  f"{median([num(r,'capPoint') for r in fr]):+9.5f} {vel:+10.5f} "
                  f"{median([num(r,'capAcross') for r in fr]):+10.5f} {median([num(r,'capReach') for r in fr]):+9.5f} "
                  f"{sum(1 for r in fr if r.get('capBeyond')==1):>4}/{n:<3} "
                  f"{sum(1 for r in fr if r.get('capWeightPast')==1):>4}/{n:<3} "
                  f"{sum(1 for r in fr if r.get('capFrozen')==1):>3}/{n:<3}")

    print()
    print('   PEAKS, and the across-speed term beside the static one. The 1/omega factor is ~0.29 s, so 1 m/s of')
    print('   across speed is ~0.29 m of capture point against a 0.130 m sole half-width.')
    print(f"{'arm':>8} {'script':>7} {'wave':>4} {'|capOffset|pk':>13} {'|capDemand|pk':>13} {'|capSpeed|pk':>12} "
          f"{'1/omega med':>11} {'|spd/omega|pk':>13} {'|capPoint|pk':>12} {'|capAcross|pk':>13}")
    for script, wave in cells:
        for arm in ARMS:
            fr = standing((arm, script, wave))
            if len(fr) < 5:
                continue
            vels = [abs(num(r, 'capSpeed') / num(r, 'capOmega')) for r in fr if num(r, 'capOmega') > 0]
            print(f"{arm:>8} {script:>7} {wave:>4} {max(abs(num(r,'capOffset')) for r in fr):13.5f} "
                  f"{max(abs(num(r,'capDemand')) for r in fr):13.5f} "
                  f"{max(abs(num(r,'capSpeed')) for r in fr):12.4f} "
                  f"{median([1/num(r,'capOmega') for r in fr if num(r,'capOmega')>0]):11.4f} "
                  f"{(max(vels) if vels else float('nan')):13.5f} "
                  f"{max(abs(num(r,'capPoint')) for r in fr):12.5f} "
                  f"{max(abs(num(r,'capAcross')) for r in fr):13.5f}")

    print()
    print('   Is the lean PAID FOR in the fall test\'s own terms? d(capDemand)/d(capOffset) over the loaded standing')
    print('   frames. 1.0 = the felt vertical tilted exactly as far as the body leaned, and the capture point does')
    print('   not move at all.')
    print(f"{'arm':>8} {'script':>7} {'wave':>4} {'n':>5} {'thru0':>8} {'slope':>8} {'R2':>6} {'pay med':>9}")
    for script, wave in cells:
        for arm in ARMS:
            fr = standing((arm, script, wave))
            if len(fr) < 5:
                continue
            xs = [num(r, 'capOffset') for r in fr]
            ys = [num(r, 'capDemand') for r in fr]
            t0, b, r2, n = slope(xs, ys)
            pays = [y / x for x, y in zip(xs, ys) if abs(x) > 1e-4]
            print(f"{arm:>8} {script:>7} {wave:>4} {n:>5} {t0:8.3f} {b:8.3f} {r2:6.3f} {median(pays):9.3f}")

    print()
    print(f'   Frame by frame on wave {A.wave} `{A.script}`:')
    for arm in ARMS:
        fr = standing((arm, A.script, A.wave))
        if not fr:
            continue
        print(f'\n   --- arm {arm} ---')
        print(f"   {'t+s':>6} {'foldA°':>8} {'capOffset':>10} {'capDemand':>10} {'capPoint':>9} {'capSpeed':>9} "
              f"{'spd/om':>8} {'capAcross':>10} {'capReach':>9} {'byd':>4} {'wtP':>4} {'capTilt°':>9} {'roll°':>8}")
        pick = fr[::A.every]
        if fr[-1] not in pick:
            pick = pick + [fr[-1]]
        for r in pick:
            om = num(r, 'capOmega')
            print(f"   {num(r,'tStand'):6.3f} {num(r,'foldA'):+8.2f} {num(r,'capOffset'):+10.5f} "
                  f"{num(r,'capDemand'):+10.5f} {num(r,'capPoint'):+9.5f} {num(r,'capSpeed'):+9.4f} "
                  f"{(num(r,'capSpeed')/om if om>0 else float('nan')):+8.4f} {num(r,'capAcross'):+10.5f} "
                  f"{num(r,'capReach'):+9.5f} {str(r.get('capBeyond')):>4} {str(r.get('capWeightPast')):>4} "
                  f"{num(r,'capTilt'):+9.3f} {num(r,'roll'):+8.2f}")

print()
print('=' * 118)
print('4b. THE CLOSURE: is the water\'s whole lateral answer to a bank just the DECK NORMAL, projected?')
print('=' * 118)
print('   The contact\'s reaction on the board is minus the rider\'s contact force. Its world-horizontal across part')
print('   is -cFy*sin(roll) (cFy is the normal, N, on the board\'s own up), so a water force that merely balances it')
print('   must read fwH = +cFy*sin(roll) + m_board*a_H, and m_board is 2.54 kg. If that closes, the water makes')
print('   essentially NO force in the plane of the deck across it — which is the component `j.x` (and so `dLever`,')
print('   and so `across`) is built from, and it is what the 2026-11-15 consult-log row predicted for a flat hull.')
print('   Taken on the frames with real roll only (|roll| >= 10 deg), because sin(roll) ~ 0 makes the ratio singular.')
print(f"{'arm':>8} {'script':>7} {'wave':>4} {'n|roll|>=10':>12} {'fwH med':>9} {'reaction med':>12} {'ratio med':>10} "
      f"{'resid med':>10} {'resid/cFy':>10} {'|roll| max':>10} {'fwH at max':>11} {'pred at max':>12}")
for script, wave in cells:
    for arm in ARMS:
        fr = [r for r in standing((arm, script, wave)) if abs(num(r, 'roll')) >= 10]
        if len(fr) < 5:
            continue
        got = [num(r, 'fwH') for r in fr]
        # The FULL reaction, not just its normal: the contact's world-horizontal across part is
        # cFy*sin(roll) + cFx*cos(roll) (board +y meets `sideV` at sin(roll) and board +x at cos(roll), and board +z
        # is along the heading, so its share is second order). `cFx` is the contact's own in-deck-plane across force.
        pred = [num(r, 'cFy') * math.sin(math.radians(num(r, 'roll')))
                + num(r, 'cFx') * math.cos(math.radians(num(r, 'roll'))) for r in fr]
        rat = [g / p for g, p in zip(got, pred) if abs(p) > 1]
        res = [g - p for g, p in zip(got, pred)]
        top = max(fr, key=lambda r: abs(num(r, 'roll')))
        print(f"{arm:>8} {script:>7} {wave:>4} {len(fr):>12} {median(got):+9.1f} {median(pred):+12.1f} "
              f"{median(rat):10.3f} {median(res):+10.1f} "
              f"{median([(g-p)/num(r,'cFy') for g,p,r in zip(got,pred,fr) if num(r,'cFy')>1]):+10.4f} "
              f"{abs(num(top,'roll')):10.2f} {num(top,'fwH'):+11.1f} "
              f"{num(top,'cFy')*math.sin(math.radians(num(top,'roll'))) + num(top,'cFx')*math.cos(math.radians(num(top,'roll'))):+12.1f}")

print()
print('=' * 118)
print('9. WHEN DO THE ARMS FIRST DIFFER AT ALL? — every column compared, frame by frame')
print('=' * 118)
print('   The steer runs from TURN_AT (+0.300 s after the stand) for TURN_FOR (0.900 s), so it CENTRES at +1.200 s.')
print('   A divergence that starts after that cannot be attributed to the turn. `arm` is excluded, nothing else is.')
if len(ARMS) >= 2:
    base, other = ARMS[0], ARMS[1]
    byframe = {k: {r['frame']: r for r in v} for k, v in rows.items()}
    print(f"{'script':>7} {'wave':>4} {'shared':>7} {'differ':>7} {'first t+s':>10} {'after the steer centred?':>25} "
          f"{'the columns that first move':>40}")
    for script, wave in cells:
        a = byframe.get((base, script, wave), {})
        b = byframe.get((other, script, wave), {})
        shared = sorted(set(a) & set(b))
        if not shared:
            continue
        nd, first = 0, None
        for f in shared:
            ra, rb = a[f], b[f]
            d = [k for k in set(ra) | set(rb) if k != 'arm' and ra.get(k) != rb.get(k)]
            if d:
                nd += 1
                if first is None:
                    first = (ra.get('tStand'), sorted(d))
        if first is None:
            print(f"{script:>7} {wave:>4} {len(shared):>7} {0:>7} {'never':>10} {'-':>25} {'bit-identical':>40}")
        else:
            t = first[0]
            late = 'YES' if t is not None and t > TURN_END else 'no'
            print(f"{script:>7} {wave:>4} {len(shared):>7} {nd:>7} {(t if t is not None else float('nan')):10.5f} "
                  f"{late + (f' (+{t - TURN_END:.3f} s)' if late == 'YES' else ''):>25} {','.join(first[1][:5]):>40}")
