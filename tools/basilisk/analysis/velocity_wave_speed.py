"""A steadier wave speed for the Basilisk velocity data (2026-11-11). The crest's highest point hops, so its speed is
noisy. The back face does not steepen or overturn: the speed of its half-height point is the wave's speed. Prints, per
case, the water's speed at the crest's top over that speed. Standard library only.
  python3 tools/basilisk/analysis/velocity_wave_speed.py > docs/research/pool-tube-flow/wave-speed-2026-11-11.txt"""
import json, math, glob

def fit(ts, xs):
    n = len(ts); mt = sum(ts) / n; mx = sum(xs) / n
    d = sum((t - mt) ** 2 for t in ts)
    return sum((t - mt) * (x - mx) for t, x in zip(ts, xs)) / d if d > 0 else float('nan')

for case in ['pool_straight_small', 'pool_straight_big', 'canyon23_a38']:
    V = json.load(open(f'docs/research/pool-tube-flow/data/periodic_{case}_L13_velocity.json'))
    L = json.load(open(glob.glob(f'docs/research/*/data/periodic_{case}_L13_library.json')[0]))
    h0 = V['h0_m']; U0 = math.sqrt(9.81 * h0); T0 = math.sqrt(h0 / 9.81)
    F = L['frames']; G = V['frames']; taus = [f['tau'] for f in F]
    back = []; top = []; water = []
    for f, g in zip(F, G):
        P = f['profile']; ic = max(range(len(P)), key=lambda k: P[k][1])
        level = f['trough'] + 0.5 * f['H_trough']
        xb = None
        for k in range(ic, 0, -1):  # walk down the back face from the crest
            if P[k][1] >= level > P[k - 1][1]:
                a = (level - P[k - 1][1]) / (P[k][1] - P[k - 1][1]); xb = P[k - 1][0] + a * (P[k][0] - P[k - 1][0]); break
        back.append(xb); top.append(f['crest'][0])
        u = g['u'][ic]; water.append(u[0] if u is not None and u[0] is not None else None)
    def speed(xs, i, w):
        pts = [(F[j]['t'], xs[j]) for j in range(len(F)) if abs(taus[j] - taus[i]) <= w and xs[j] is not None]
        return fit([p[0] for p in pts], [p[1] for p in pts]) if len(pts) > 4 else float('nan')
    print(f"\n== {case}: speed unit sqrt(g h0) = {U0:.2f} m/s")
    print("s from the throw\tback-face speed m/s\tcrest-point speed m/s\twater at the crest m/s\twater / back-face speed\twater / crest-point speed")
    rows = {}
    for target in [-2, -1.5, -1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1, 1.5]:
        i = min(range(len(F)), key=lambda j: abs(taus[j] - target))
        if abs(taus[i] - target) > 0.06 or water[i] is None: continue
        cb = speed(back, i, 0.5); cc = speed(top, i, 0.5)
        print(f"{taus[i] * T0:.2f}\t{cb * U0:.2f}\t{cc * U0:.2f}\t{water[i] * U0:.2f}\t{water[i] / cb:.2f}\t{water[i] / cc:.2f}")
    cbs = [speed(back, i, 0.5) for i in range(len(F)) if -2 <= taus[i] <= 1]
    cbs = [c for c in cbs if c == c]
    print(f"back-face speed over 2 tau before to 1 tau after the throw: {min(cbs) * U0:.2f} to {max(cbs) * U0:.2f} m/s ({min(cbs):.2f} to {max(cbs):.2f} sqrt(g h0))")
    for lim in (0.85, 1.0):
        hit = next((taus[i] * T0 for i in range(len(F)) if water[i] is not None and taus[i] > -2 and water[i] / speed(back, i, 0.5) >= lim), None)
        print(f"water at the crest first at {lim} of the back-face speed: {hit if hit is None else round(hit, 2)} s")
    # One speed for the whole approach: a straight line through the place over the 2 tau before the throw.
    print("one straight-line speed over the 2 tau before the throw (m/s, and the line's miss in m):")
    for name, xs in (('crest point', top), ('back face, half height', back)):
        pts = [(F[j]['t'], xs[j]) for j in range(len(F)) if -2 <= taus[j] <= 0 and xs[j] is not None]
        ts = [p[0] for p in pts]; ps = [p[1] for p in pts]; c = fit(ts, ps)
        mt = sum(ts) / len(ts); mp = sum(ps) / len(ps)
        rms = math.sqrt(sum((p - mp - c * (t - mt)) ** 2 for t, p in zip(ts, ps)) / len(ts))
        shares = []
        for target in (-1, -0.5, -0.25, 0, 0.25, 0.5):
            i = min(range(len(F)), key=lambda j: abs(taus[j] - target))
            shares.append(f"{taus[i] * T0:+.2f} s {water[i] / c:.2f}" if water[i] is not None else f"{taus[i] * T0:+.2f} s -")
        print(f"  {name}: {c * U0:.2f} m/s ({c:.3f} sqrt(g h0)), miss {rms * h0:.3f} m; crest water's share: " + ", ".join(shares))
