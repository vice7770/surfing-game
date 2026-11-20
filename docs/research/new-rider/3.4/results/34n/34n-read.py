"""Step 3.4n. The side force decomposed on BOTH sides, term by term, on the same ticks.

The question: why is the model's side force wrong-signed in crouch and compress, before the fall, below 4 m/s?
3.4m proved no row of `PLANT_SPEEDS` can produce the observed sign (no side-force derivative changes sign at any
row), so the fault must be in how `Y` is assembled, in a state fed to it, or in a term the model has no derivative
for. This read tests all three on one trajectory's own ticks.

Columns (all new this round, all dumped by `3.3/plant.ts`; definitions in its `Tick` docstrings):
  ymHeel/ymSlip/ymYaw/ymRate   the model's four side-force addends, N — they sum to `yModel` exactly
  dHeelSide/dSlipSide/...      the four derivatives at the tick, in the MODEL's axes
  stPhi/stBeta/stYawRate/...   the four states behind them, model signs
  yModelNegB                   `yModel` with the derived slip's sign reversed and nothing else
  estBeta                      the controller's OWN slip estimate, rad
  ysBuoy..ysSuct               the game's ten water side forces, each on its own, same sign as `yGame`
  ySrcSum                      their sum: must equal `yGame` to the dump's own rounding

Cuts are 3.4l's and 3.4m's, unchanged:
  A = live, speedClamped == 1, |roll| <= 25     B = A and speed <= 1.6     C = live, speedClamped == 0, |roll| <= 25

  python3 34n-read.py <dir-with-the-ticks-dumps>
"""
import json, math, os, sys

S = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
ARMS = ['f73-l', 's16-l', 's16-g']
STANCES = ['tall', 'crouch', 'compress']
DEG = 180 / math.pi

rows = []
for a in ARMS:
    p = f'{S}/{a}.ticks.jsonl'
    if not os.path.exists(p):
        continue
    for line in open(p):
        d = json.loads(line)
        d['arm'] = a
        rows.append(d)

CUTS = [
    ('A clamped (<4 m/s), |roll|<=25', lambda d: d['speedClamped'] == 1 and abs(d['roll']) <= 25),
    ('B clamped, speed<=1.6, |roll|<=25', lambda d: d['speedClamped'] == 1 and d['speed'] <= 1.6 and abs(d['roll']) <= 25),
    ('C unclamped (4-12), |roll|<=25', lambda d: d['speedClamped'] == 0 and abs(d['roll']) <= 25),
]

SRC = ['ysBuoy', 'ysPress', 'ysAdded', 'ysRad', 'ysFric', 'ysBed', 'ysFins', 'ysRails', 'ysFroth', 'ysSuct']
TERM = ['ymHeel', 'ymSlip', 'ymYaw', 'ymRate']


def med(v):
    v = sorted(v)
    n = len(v)
    return float('nan') if n == 0 else (v[n // 2] if n % 2 else .5 * (v[n // 2 - 1] + v[n // 2]))


def share(v):
    v = [x for x in v if x is not None]
    return float('nan') if not v else sum(1 for x in v if x) / len(v)


def signshare(pairs):
    """The share of ticks whose two forces have the same sign, over ticks where BOTH are non-zero -- 3.4l's own rule."""
    use = [(m, g) for m, g in pairs if abs(m) > 1e-6 and abs(g) > 1e-6]
    return (float('nan') if not use else sum(1 for m, g in use if (m > 0) == (g > 0)) / len(use)), len(use)


live = [d for d in rows if d['live'] == 1]
print(f'# rows {len(rows)}, live {len(live)}; per arm ' + '  '.join(
    f'{a}: {sum(1 for d in rows if d["arm"] == a)}/{sum(1 for d in live if d["arm"] == a)}' for a in ARMS))

# --- 0. the identities, read and not asserted -------------------------------------------------------------------
worst_src = max(abs(d['ySrcSum'] - d['yGame']) for d in live)
worst_trm = max(abs(sum(d[k] for k in TERM) - d['yModel']) for d in live)
worst_neg = max(abs((d['ymHeel'] - d['ymSlip'] + d['ymYaw'] + d['ymRate']) - d['yModelNegB']) for d in live)
print(f'# IDENTITY 1  the ten sources against `yGame`:   largest |sum - yGame|  = {worst_src:.3e} N')
print(f'# IDENTITY 2  the four terms against `yModel`:   largest |sum - yModel| = {worst_trm:.3e} N')
print(f'# IDENTITY 3  `yModelNegB` against its own line: largest difference     = {worst_neg:.3e} N')
print()

# --- 1. who carries the game's side force ------------------------------------------------------------------------
print('## 1. WHO CARRIES THE GAME\'S SIDE FORCE. Median |source| N, and the modal largest source, per stance')
hdr = '  '.join(f'{k[2:]:>8s}' for k in SRC)
print(f'{"cut":34s} {"stance":9s} {"n":>5s} {"|yGame|":>8s}  ' + hdr + '   largest (share of ticks)')
for name, cut in CUTS:
    for st in STANCES:
        sel = [d for d in live if cut(d) and d['stance'] == st]
        if not sel:
            continue
        meds = [med([abs(d[k]) for d in sel]) for k in SRC]
        big = {}
        for d in sel:
            k = max(SRC, key=lambda kk: abs(d[kk]))
            big[k] = big.get(k, 0) + 1
        top = sorted(big.items(), key=lambda kv: -kv[1])[:2]
        print(f'{name:34s} {st:9s} {len(sel):5d} {med([abs(d["yGame"]) for d in sel]):8.1f}  '
              + '  '.join(f'{m:8.1f}' for m in meds)
              + '   ' + ', '.join(f'{k[2:]} {v / len(sel):.2f}' for k, v in top))
    print()

# --- 2. who carries the model's side force -----------------------------------------------------------------------
print('## 2. WHO CARRIES THE MODEL\'S SIDE FORCE. Median |term| N, the states, and the derivatives')
print(f'{"cut":34s} {"stance":9s} {"n":>5s} {"|yModel|":>9s} {"|heel|":>8s} {"|slip|":>8s} {"|yaw|":>8s} {"|rate|":>8s}'
      f' {"phi deg":>8s} {"beta deg":>9s} {"r rad/s":>8s} {"Y_beta":>9s} {"Y_r":>8s}')
for name, cut in CUTS:
    for st in STANCES:
        sel = [d for d in live if cut(d) and d['stance'] == st]
        if not sel:
            continue
        print(f'{name:34s} {st:9s} {len(sel):5d} {med([abs(d["yModel"]) for d in sel]):9.1f} '
              + ' '.join(f'{med([abs(d[k]) for d in sel]):8.1f}' for k in TERM)
              + f' {med([abs(d["stPhi"]) * DEG for d in sel]):8.2f} {med([abs(d["stBeta"]) * DEG for d in sel]):9.2f}'
              + f' {med([abs(d["stYawRate"]) for d in sel]):8.3f} {med([d["dSlipSide"] for d in sel]):9.1f}'
              + f' {med([d["dYawSide"] for d in sel]):8.1f}')
    print()

# --- 3. the sign, four ways ---------------------------------------------------------------------------------------
print('## 3. THE SIGN. The published metric, and the three counterfactuals, on the SAME ticks')
print('#   yGame  = all ten sources (3.4l\'s and 3.4m\'s own quantity)')
print('#   yQuasi = yGame - ysAdded - ysRad: the game\'s QUASI-STATIC water side force, the only part a captive')
print('#            derivative measured at a held state can represent (added mass and wave radiation answer the')
print('#            board\'s own acceleration and velocity into the surface, not its roll/slip/yaw)')
print('#   negB   = the model with the derived slip\'s sign reversed and nothing else')
print(f'{"cut":34s} {"stance":9s} {"n":>5s} | {"model vs yGame":>15s} | {"negB vs yGame":>14s} | '
      f'{"model vs yQuasi":>16s} | {"negB vs yQuasi":>15s}')
for name, cut in CUTS:
    for st in STANCES:
        sel = [d for d in live if cut(d) and d['stance'] == st]
        if not sel:
            continue
        q = [d['yGame'] - d['ysAdded'] - d['ysRad'] for d in sel]
        a, na = signshare([(d['yModel'], d['yGame']) for d in sel])
        b, nb = signshare([(d['yModelNegB'], d['yGame']) for d in sel])
        c, nc = signshare([(d['yModel'], qq) for d, qq in zip(sel, q)])
        e, ne = signshare([(d['yModelNegB'], qq) for d, qq in zip(sel, q)])
        print(f'{name:34s} {st:9s} {len(sel):5d} | {a:9.3f} (n={na:3d}) | {b:8.3f} (n={nb:3d}) | '
              f'{c:10.3f} (n={nc:3d}) | {e:9.3f} (n={ne:3d})')
    print()

# --- 4. the magnitudes against the same two denominators ----------------------------------------------------------
print('## 4. THE MAGNITUDE. Median |model/game| against the whole ledger and against its quasi-static part')
print(f'{"cut":34s} {"stance":9s} {"n":>5s} {"|yQuasi| N":>11s} {"added share":>12s} {"|m/yGame|":>10s} {"|m/yQuasi|":>11s} {"|negB/yQuasi|":>14s}')
for name, cut in CUTS:
    for st in STANCES:
        sel = [d for d in live if cut(d) and d['stance'] == st]
        if not sel:
            continue
        q = [d['yGame'] - d['ysAdded'] - d['ysRad'] for d in sel]
        print(f'{name:34s} {st:9s} {len(sel):5d} {med([abs(x) for x in q]):11.1f} '
              f'{med([abs(d["ysAdded"]) / max(1e-9, abs(d["yGame"])) for d in sel]):12.3f} '
              f'{med([abs(d["yModel"] / d["yGame"]) for d in sel if abs(d["yGame"]) > 1e-6]):10.3f} '
              f'{med([abs(d["yModel"] / x) for d, x in zip(sel, q) if abs(x) > 1e-6]):11.3f} '
              f'{med([abs(d["yModelNegB"] / x) for d, x in zip(sel, q) if abs(x) > 1e-6]):14.3f}')
    print()

# --- 5. the controller's own slip estimate against the derived one ------------------------------------------------
print('## 5. THE CONTROLLER\'S OWN SLIP ESTIMATE, against the probe\'s derived one (`stBeta`)')
print(f'{"cut":34s} {"stance":9s} {"n":>5s} {"|stBeta| deg":>13s} {"|estBeta| deg":>14s} {"same sign":>10s} {"est vs -stBeta":>15s}')
for name, cut in CUTS:
    for st in STANCES:
        sel = [d for d in live if cut(d) and d['stance'] == st]
        if not sel:
            continue
        a, na = signshare([(d['estBeta'], d['stBeta']) for d in sel])
        b, nb = signshare([(d['estBeta'], -d['stBeta']) for d in sel])
        print(f'{name:34s} {st:9s} {len(sel):5d} {med([abs(d["stBeta"]) * DEG for d in sel]):13.2f} '
              f'{med([abs(d["estBeta"]) * DEG for d in sel]):14.2f} {a:10.3f} {b:15.3f}  (n={na}/{nb})')
    print()

# --- 6. the inertial part against the quasi-static part ----------------------------------------------------------
print('## 6. THE PART THE TWELVE DERIVATIVES DO NOT CONTAIN: added mass + wave radiation, against the rest')
print('#   The lab\'s own per-part reads say so: at +1 deg of slip off straight, dY/dbeta by part is')
print('#   fins 315.1, rails 22.9, friction 11.5, pressure -11.5, buoyancy 0.0, waterInertia 0.0, radiation 0.0')
print('#   at 4 m/s (and 951.1 / 57.3 / 28.6 / -5.7 / 0.0 / 0.0 / 0.0 at 6) [R, 3.2/results/plant-speeds.jsonl].')
print(f'{"cut":34s} {"stance":9s} {"n":>5s} {"|added+rad| N":>14s} {"|yQuasi| N":>11s} {"share of |yGame|":>17s}'
      f' {"opposes yQuasi":>15s} {"and bigger":>11s}')
for name, cut in CUTS:
    for st in STANCES:
        sel = [d for d in live if cut(d) and d['stance'] == st]
        if not sel:
            continue
        inert = [d['ysAdded'] + d['ysRad'] for d in sel]
        quasi = [d['yGame'] - d['ysAdded'] - d['ysRad'] for d in sel]
        opp = share([not ((i > 0) == (q > 0)) for i, q in zip(inert, quasi) if abs(i) > 1e-6 and abs(q) > 1e-6])
        big = share([abs(i) > abs(q) for i, q in zip(inert, quasi)])
        print(f'{name:34s} {st:9s} {len(sel):5d} {med([abs(i) for i in inert]):14.1f} {med([abs(q) for q in quasi]):11.1f}'
              f' {med([abs(i) / max(1e-9, abs(d["yGame"])) for i, d in zip(inert, sel)]):17.3f} {opp:15.3f} {big:11.3f}')
    print()
