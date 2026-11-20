"""The crest water's share of the wave's speed, for any case at any level.

Same maths as `tools/basilisk/analysis/velocity_first_look.py` (the local crest-point
speed) and `velocity_wave_speed.py` (one straight line through the crest place over the
2 tau before the throw), so the numbers sit beside `docs/research/pool-tube-flow/`'s
first look and second look. Those two scripts name their three level-13 cases in the
code; this one takes the case and the level as arguments, so the level-14 files can be
read with no change to the shipped tools.

usage: velocity_look.py CASE LEVEL [CASE LEVEL ...]
  e.g. velocity_look.py pool_knee_big 14 pool_straight_big 13
Standard library only. Run from the repo root.
"""
import glob
import json
import math
import sys


def fit(ts, xs):
    n = len(ts)
    mt, mx = sum(ts) / n, sum(xs) / n
    d = sum((t - mt) ** 2 for t in ts)
    return sum((t - mt) * (x - mx) for t, x in zip(ts, xs)) / d if d > 0 else float("nan")


def case(name, lev):
    V = json.load(open(f"docs/research/pool-tube-flow/data/periodic_{name}_L{lev}_velocity.json"))
    L = json.load(open(glob.glob(f"docs/research/*/data/periodic_{name}_L{lev}_library.json")[0]))
    h0 = V["h0_m"]
    U0, T0 = math.sqrt(9.81 * h0), math.sqrt(h0 / 9.81)
    F, G = L["frames"], V["frames"]
    assert len(F) == len(G), (len(F), len(G))
    taus = [f["tau"] for f in F]
    top, water, water_d4, fastest = [], [], [], []
    for f, g in zip(F, G):
        P = f["profile"]
        ic = max(range(len(P)), key=lambda k: P[k][1])
        top.append(f["crest"][0])
        u = g["u"][ic]
        water.append(u[0] if u is not None and u[0] is not None else None)
        water_d4.append(u[4] if u is not None and u[4] is not None else None)
        fastest.append(max((x[0] for x in g["u"] if x is not None and x[0] is not None), default=None))

    def local(i, w=0.25):
        pts = [(F[j]["t"], top[j]) for j in range(len(F)) if abs(taus[j] - taus[i]) <= w]
        return fit([p[0] for p in pts], [p[1] for p in pts]) if len(pts) > 4 else float("nan")

    pts = [(F[j]["t"], top[j]) for j in range(len(F)) if -2 <= taus[j] <= 0]
    ts, ps = [p[0] for p in pts], [p[1] for p in pts]
    C = fit(ts, ps)
    mt, mp = sum(ts) / len(ts), sum(ps) / len(ps)
    rms = math.sqrt(sum((p - mp - C * (t - mt)) ** 2 for t, p in zip(ts, ps)) / len(ts))
    print(f"\n== {name} L{lev}: h0 {h0} m, speed unit {U0:.2f} m/s, frames {len(F)}, "
          f"open {(V['t_impact'] - V['t_vertical']) * T0:.2f} s, missing {V['match']['missing']}, "
          f"match median {V['match']['median'] * h0 * 100:.1f} cm")
    print(f"   one straight-line wave speed over the 2 tau before the throw: {C * U0:.2f} m/s "
          f"({C:.3f} sqrt(g h0)), the line misses by {rms * h0:.3f} m")
    print("   s from throw | H m | crest water m/s | share of the one speed | share of the local crest speed |"
          " fastest water m/s | its share | water 45 cm down, share")
    for target in [-1.5, -1.03, -0.75, -0.5, -0.25, -0.12, 0, 0.12, 0.25, 0.5, 0.75, 1.0]:
        i = min(range(len(F)), key=lambda j: abs(taus[j] - target))
        if abs(taus[i] - target) > 0.06 or water[i] is None:
            continue
        cc = local(i)
        fw = fastest[i]
        d4 = water_d4[i]
        print(f"   {taus[i] * T0:+6.2f} | {F[i]['H_trough'] * h0:.2f} | {water[i] * U0:5.2f} | "
              f"{water[i] / C:.2f} | {water[i] / cc:.2f} | {fw * U0:5.2f} | {fw / C:.2f} | "
              f"{(d4 / C) if d4 is not None else float('nan'):.2f}")
    for lim in (0.85, 1.0):
        hit = next((taus[i] * T0 for i in range(len(F)) if water[i] is not None and taus[i] > -2
                    and water[i] / C >= lim), None)
        print(f"   crest water first at {lim} of the one speed: "
              f"{'never' if hit is None else format(hit, '.2f') + ' s'}")


if __name__ == "__main__":
    a = sys.argv[1:]
    for i in range(0, len(a), 2):
        case(a[i], int(a[i + 1]))
