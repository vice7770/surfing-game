"""Step 3.4n, the independent check: the GAME's own side-force derivatives, fitted from the ride itself.

Nothing here reads `PLANT_SPEEDS` or any comment about a frame. It takes the game's own quasi-static water side force
(`yGame - ysAdded - ysRad`, the part a captive derivative at a held state can represent) and least-squares it on the
four states the model uses, with an intercept, per stance and per band:

    yQuasi  ~  c + Y_phi . phi  +  Y_beta . beta  +  Y_r . r  +  Y_phidot . phidot

`beta` is taken in the MODEL's own frame, `-stBeta` (the probe derives `stBeta = atan2(v_left, v_fwd)`, + sliding
LEFT; the lab's slip, which every derivative in `PLANT_SPEEDS` was measured against, is `atan2(-v_left, v_fwd)`,
+ sliding RIGHT [R, `../roll-plant/plant.ts:368`]). The fitted `Y_beta` is then directly comparable with the table's
own, and its SIGN is read off the ride with no frame argument in it.

The fit is a diagnosis of a sign, not a proposed row: the states are correlated along a trajectory and the ride is
not a captive hold, so the magnitudes are indicative only and are printed with their condition number.

  python3 34n-fit.py <dir-with-the-ticks-dumps>
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
        rows.append(d)
live = [d for d in rows if d['live'] == 1]

CUTS = [
    ('A clamped (<4 m/s), |roll|<=25', lambda d: d['speedClamped'] == 1 and abs(d['roll']) <= 25),
    ('C unclamped (4-12), |roll|<=25', lambda d: d['speedClamped'] == 0 and abs(d['roll']) <= 25),
]


def solve(a, b):
    """Gaussian elimination with partial pivoting on a small dense system."""
    n = len(a)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for i in range(n):
        p = max(range(i, n), key=lambda k: abs(m[k][i]))
        if abs(m[p][i]) < 1e-300:
            return None
        m[i], m[p] = m[p], m[i]
        for k in range(i + 1, n):
            f = m[k][i] / m[i][i]
            for j in range(i, n + 1):
                m[k][j] -= f * m[i][j]
    x = [0.0] * n
    for i in reversed(range(n)):
        x[i] = (m[i][n] - sum(m[i][j] * x[j] for j in range(i + 1, n))) / m[i][i]
    return x


def fit(sel):
    """Least squares with an intercept; returns the four coefficients, R^2 and the normal matrix's own scale ratio."""
    xs = [[d['stPhi'], -d['stBeta'], d['stYawRate'], d['stRollRate'], 1.0] for d in sel]
    ys = [d['yGame'] - d['ysAdded'] - d['ysRad'] for d in sel]
    n = 5
    a = [[sum(r[i] * r[j] for r in xs) for j in range(n)] for i in range(n)]
    b = [sum(r[i] * y for r, y in zip(xs, ys)) for i in range(n)]
    c = solve(a, b)
    if c is None:
        return None
    mean = sum(ys) / len(ys)
    sst = sum((y - mean) ** 2 for y in ys)
    sse = sum((y - sum(ci * ri for ci, ri in zip(c, r))) ** 2 for r, y in zip(xs, ys))
    diag = [a[i][i] for i in range(n)]
    return c, (1 - sse / sst if sst > 0 else float('nan')), max(diag) / max(1e-30, min(diag))


print(f'# live ticks {len(live)}')
print('# The game\'s own quasi-static side force regressed on the model\'s four states, beta in the MODEL\'s frame.')
print('# `table` is `PLANT_SPEEDS` at the band\'s own median row, through `boardDerivatives` (the median of the')
print('# dumped per-tick derivative columns, which ARE the model\'s own numbers at those ticks).')
print()
print(f'{"cut":34s} {"stance":9s} {"n":>5s} | {"Y_phi fit":>10s} {"table":>9s} | {"Y_beta fit":>11s} {"table":>9s} |'
      f' {"Y_r fit":>9s} {"table":>8s} | {"Y_pdot fit":>11s} {"table":>7s} | {"R2":>6s} {"scale":>9s}')
for name, cut in CUTS:
    for st in STANCES:
        sel = [d for d in live if cut(d) and d['stance'] == st]
        if len(sel) < 20:
            continue
        out = fit(sel)
        if out is None:
            continue
        c, r2, cond = out

        def tmed(k):
            v = sorted(d[k] for d in sel)
            return v[len(v) // 2]
        print(f'{name:34s} {st:9s} {len(sel):5d} | {c[0]:10.1f} {tmed("dHeelSide"):9.1f} | {c[1]:11.1f} '
              f'{tmed("dSlipSide"):9.1f} | {c[2]:9.1f} {tmed("dYawSide"):8.1f} | {c[3]:11.1f} '
              f'{tmed("dRateSide"):7.1f} | {r2:6.3f} {cond:9.1e}')
    print()

print('# And the same fit with beta in the PROBE\'s frame (+stBeta), which is the sign the shipped probe feeds the')
print('# derivatives: the fitted coefficient must simply change sign, and the comparison with the table\'s own')
print('# negative number is then the one that fails.')
print(f'{"cut":34s} {"stance":9s} {"n":>5s} | {"Y_beta fit (probe frame)":>25s} {"table":>9s}')
for name, cut in CUTS:
    for st in STANCES:
        sel = [d for d in live if cut(d) and d['stance'] == st]
        if len(sel) < 20:
            continue
        xs = [[d['stPhi'], d['stBeta'], d['stYawRate'], d['stRollRate'], 1.0] for d in sel]
        ys = [d['yGame'] - d['ysAdded'] - d['ysRad'] for d in sel]
        a = [[sum(r[i] * r[j] for r in xs) for j in range(5)] for i in range(5)]
        b = [sum(r[i] * y for r, y in zip(xs, ys)) for i in range(5)]
        c = solve(a, b)
        v = sorted(d['dSlipSide'] for d in sel)
        print(f'{name:34s} {st:9s} {len(sel):5d} | {c[1]:25.1f} {v[len(v) // 2]:9.1f}')
    print()
