"""Step 3.5j A/B reader: ships vs swing=mass, seed 2, steer only.

Reports, in the order the movement coordinator asked for: (0) liveness and the negative control, (1) the hip angle and rate against
time from the steer, (2) the settled lateral centre of mass against the support, (3) bank, course change and climb,
(4) both exits.
"""
import json
import sys
from collections import defaultdict

PATH = sys.argv[1]
rows = []
control = None
for line in open(PATH):
    r = json.loads(line)
    if r.get('control'):
        control = r
    elif r.get('kind') == 'row':
        rows.append(r)

runs = defaultdict(list)
for r in rows:
    runs[(r['arm'], r['script'], r['wave'])].append(r)
for v in runs.values():
    v.sort(key=lambda r: r['t'])

ARMS = control['arms']
print(f"arms {ARMS}  scripts {control['scripts']}  seed {control['seed']}  seaDiffs {control['seaDiffs']}")
for arm, sw in control['switches'].items():
    print(f"  {arm}: {sw}")
print()


def stand_t(run):
    """`tStand` is already the time SINCE the stand, so the clock is the column itself."""
    return 0 if any(r.get('tStand') is not None for r in run) else None


def summary(run):
    """Stand time, fall time (first unattached), and the standing window."""
    st = stand_t(run)
    if st is None:
        return None
    standing = [r for r in run if r['phase'] == 'standing' and r['upright'] and r.get('tStand') is not None]
    if not standing:
        return None
    fell = None
    for r in run:
        if r['attached'] == 0 and r.get('tStand') is not None:
            fell = r['tStand']
            break
    return {'stand': 0, 'fell': fell, 'last': standing[-1]['tStand'], 'rows': standing}


def live(run, lo, hi):
    """Standing rows with time-from-stand in [lo, hi)."""
    return [r for r in run if r['phase'] == 'standing' and r['upright'] and r.get('tStand') is not None and lo <= r['tStand'] < hi]


print('=== 0. LIVENESS AND THE NEGATIVE CONTROL ===')
for arm in ARMS:
    folds = [abs(r['foldA']) for r in rows if r['arm'] == arm and r['phase'] == 'standing']
    coms = [abs(r['comX']) for r in rows if r['arm'] == arm and r['phase'] == 'standing' and r['comX'] is not None]
    print(f"{arm:6s} standing frames {len(folds):5d}  |foldA| max {max(folds, default=0):8.4f} deg  "
          f"nonzero {sum(1 for f in folds if f > 0):5d}  |comX| max {max(coms, default=0):8.5f} m")
print()

waves = sorted({w for (_, _, w) in runs})
print('=== 1. THE EXITS: how long each stand lasted (s after the stand) ===')
print(f"{'wave':>5} {'script':>6} " + ' '.join(f"{a:>12}" for a in ARMS))
for w in waves:
    for sc in control['scripts']:
        cells = []
        for a in ARMS:
            s = summary(runs.get((a, sc, w), []))
            if s is None:
                cells.append('   no stand')
            elif s['fell'] is None:
                cells.append(f"  rode {s['last'] - s['stand']:5.3f}")
            else:
                cells.append(f"  fell {s['fell'] - s['stand']:5.3f}")
        if any('no stand' not in c for c in cells):
            print(f"{w:>5} {sc:>6} " + ' '.join(f"{c:>12}" for c in cells))
print()

print('=== 2. THE HIP AGAINST TIME FROM THE STEER (steer at +0.300 s; deg and deg/s) ===')
BANDS = [(0.0, 0.3), (0.3, 0.4), (0.4, 0.5), (0.5, 0.6), (0.6, 0.8), (0.8, 1.2), (1.2, 2.0), (2.0, 4.0)]
for w in waves:
    for sc in control['scripts']:
        if sc == 'cue':
            continue
        if not any((a, sc, w) in runs for a in ARMS):
            continue
        print(f"-- wave {w} {sc}")
        for a in ARMS:
            run = runs.get((a, sc, w), [])
            if not run or stand_t(run) is None:
                continue
            out = []
            for lo, hi in BANDS:
                band = live(run, lo, hi)
                if not band:
                    out.append(f"{lo:.1f}-{hi:.1f}: -")
                    continue
                pa = max(band, key=lambda r: abs(r['swingA']))
                pr = max(band, key=lambda r: abs(r['swingR']))
                out.append(f"{lo:.1f}-{hi:.1f}: A{pa['swingA']:+7.2f} R{pr['swingR'] * 57.2958:+8.1f}")
            print(f"   {a:6s} " + '  '.join(out))
print()

print('=== 3. THE SETTLED LATERAL CENTRE OF MASS (comX, m; sole half-width 0.130) ===')
print('    settled = the last 0.2 s of the standing window, so a transient cannot carry it')
print(f"{'wave':>5} {'script':>6} {'arm':>6} {'comX last0.2s med':>18} {'|comX| peak':>12} {'frames':>7} {'as a share of 0.130':>20}")
for w in waves:
    for sc in control['scripts']:
        for a in ARMS:
            run = runs.get((a, sc, w), [])
            s = summary(run)
            if s is None:
                continue
            tail = [r for r in s['rows'] if r['tStand'] >= s['last'] - 0.2 and r['comX'] is not None]
            allx = [r['comX'] for r in s['rows'] if r['comX'] is not None]
            if not tail:
                continue
            tail.sort(key=lambda r: r['comX'])
            med = tail[len(tail) // 2]['comX']
            peak = max(abs(x) for x in allx)
            print(f"{w:>5} {sc:>6} {a:>6} {med:>18.5f} {peak:>12.5f} {len(tail):>7} {abs(med) / 0.130:>19.2f}x")
print()

print('=== 4. SHARPNESS: bank, course change and climb over the standing window ===')
print('    course change = |course at the end - course at the stand|; climb = faceFrac at the end - at the stand')
print(f"{'wave':>5} {'script':>6} {'arm':>6} {'bank peak':>10} {'roll peak':>10} {'course d':>9} {'faceFrac':>16} {'speedThrough':>13} {'hAcross min':>11}")
for w in waves:
    for sc in control['scripts']:
        for a in ARMS:
            run = runs.get((a, sc, w), [])
            s = summary(run)
            if s is None:
                continue
            rs = s['rows']
            bank = max(abs(r['bank']) for r in rs)
            roll = max(abs(r['roll']) for r in rs)
            c0, c1 = rs[0]['course'], rs[-1]['course']
            d = (c1 - c0 + 180) % 360 - 180
            f0, f1 = rs[0]['faceFrac'], rs[-1]['faceFrac']
            sp = f"{rs[0]['speedThrough']:.2f}->{rs[-1]['speedThrough']:.2f}"
            ha = min(r['hAcross'] for r in rs)
            print(f"{w:>5} {sc:>6} {a:>6} {bank:>10.2f} {roll:>10.2f} {d:>+9.1f} {f0:>7.3f}->{f1:<7.3f} {sp:>13} {ha:>11.4f}")
