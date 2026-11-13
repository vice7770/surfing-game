"""The lip's shape from a run's `*_library.json`, frame by frame, at matched times.

Same geometry as `docs/research/lip-look-2026-11-11/tools/lip.mjs` (which reads the
game's compiled `public/barrels/*.bin`), so the numbers are comparable: the library
frames carry the same 128 points and the same landmark indices
(crest 32, lip 64, throat 88, toe 112).

What it measures on one frame, in metres at the run's own h0_m:
  under    arc length of the underside, lip tip -> throat
  outer    arc length of the outer face, crest -> lip tip
  t_tip/t_mid/t_root  the lip's thickness at 15 / 50 / 90 % of the underside arc
           from the tip: distance from that underside point to the outer run
  mean4060 the mean distance from outer points 40..60 to the underside run
  jet_m2   the jet polygon's area (crest..tip..throat, closed)
  over_m2  the overhanging part only (points ahead of the throat's x)
  H        the frame's crest-to-trough height
  reach    how far the tip is ahead of the throat
  tipDrop  how far the tip has fallen below the top

usage:
  lip_lib.py tau   LIB.json [LIB.json ...]         one row per listed tau_s
  lip_lib.py open  LIB.json [LIB.json ...]         rows at shares of the open time
  lip_lib.py stage LIB.json [LIB.json ...]         rows at the same stage of the throw:
           the frame whose underside arc is the asked share of the wave's height
           (under/H = 0.1 is a lip just off the face, 0.8 a long thrown jet)
  lip_lib.py all   LIB.json                        every frame
  (--taus=-0.2,0,0.2 / --shares=0.25,0.5,0.75,0.95 / --stages=0.1,0.2,0.4 to choose the rows)
"""
import json
import math
import sys

CREST, LIP, THROAT, TOE, P = 32, 64, 88, 112, 128


def dist_to_run(p, i, a, b):
    """distance from point i to the polyline p[a..b]"""
    px, py = p[i]
    best = float("inf")
    for k in range(a, b):
        ax, ay = p[k]
        dx, dy = p[k + 1][0] - ax, p[k + 1][1] - ay
        l2 = dx * dx + dy * dy
        t = ((px - ax) * dx + (py - ay) * dy) / l2 if l2 > 0 else 0.0
        t = max(0.0, min(1.0, t))
        d = math.hypot(px - ax - t * dx, py - ay - t * dy)
        if d < best:
            best = d
    return best


def arc(p, a, b):
    return sum(math.hypot(p[k + 1][0] - p[k][0], p[k + 1][1] - p[k][1]) for k in range(a, b))


def poly_area(pts):
    a = 0.0
    for i in range(len(pts)):
        j = (i + 1) % len(pts)
        a += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]
    return abs(a) / 2


def measure(p):
    under, outer = arc(p, LIP, THROAT), arc(p, CREST, LIP)
    th, s = [], 0.0
    for i in range(LIP + 1, THROAT):
        s += math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])
        th.append((s / (under or 1), dist_to_run(p, i, CREST, LIP)))

    def at(u):
        if not th or under <= 0:
            return 0.0
        return min(th, key=lambda e: abs(e[0] - u))[1]

    jet = poly_area([p[i] for i in range(CREST, THROAT + 1)])
    tx = p[THROAT][0]
    over = poly_area([p[i] for i in range(CREST, THROAT + 1) if p[i][0] >= tx])
    mean = sum(dist_to_run(p, i, LIP, THROAT) for i in range(40, 61)) / 21
    trough = min(p[i][1] for i in range(CREST, P))
    top = max(q[1] for q in p)
    return dict(under=under, outer=outer, t_tip=at(0.15), t_mid=at(0.5), t_root=at(0.9),
                mean4060=mean, jet=jet, over=over, H=top - trough,
                reach=p[LIP][0] - tx, tipDrop=top - p[LIP][1])


def load(path):
    """a run's `*_library.json` (the spot cases) or `*_c2.json.gz` (the C2 cases)"""
    if path.endswith(".gz"):
        import gzip
        d = json.load(gzip.open(path))
        d["t_impact"] = d["t_touchdown"]
    else:
        d = json.load(open(path))
    h0 = d["h0_m"]
    d["_h0"] = h0
    d["_open_s"] = (d["t_impact"] - d["t_vertical"]) * d["time_scale_s"]
    for f in d["frames"]:
        f.setdefault("tau_s", f["tau"] * d["time_scale_s"])
    return d


def row(d, fr):
    h0 = d["_h0"]
    m = measure(fr["profile"])
    H = m["H"] * h0
    return dict(tau_s=fr["tau_s"], phase=fr["phase"], ov=m["under"] > 0,
                flags=",".join(fr["flags"]) or "-", frag=fr.get("n_fragments"),
                H=H, under=m["under"] * h0, outer=m["outer"] * h0,
                t_tip=m["t_tip"] * h0, t_mid=m["t_mid"] * h0, t_root=m["t_root"] * h0,
                mean=m["mean4060"] * h0, jet=m["jet"] * h0 * h0, over=m["over"] * h0 * h0,
                reach=m["reach"] * h0, tipDrop=m["tipDrop"] * h0,
                mid_H=m["t_mid"] / m["H"] if m["H"] else 0, mean_H=m["mean4060"] / m["H"] if m["H"] else 0,
                jet_H2=m["jet"] / m["H"] ** 2 if m["H"] else 0)


HDR = ("tau_s phase  ov H_m   under outer t_tip t_mid t_root mean  jet_m2 over_m2 reach tipDrop "
       "mid/H mean/H jet/H2 flags")


def show(d, taus):
    print(f"\n## {d['run'].split('/')[-1]}  level {d['level']} dx {d['dx_h0']*d['_h0']*100:.2f} cm "
          f"A0 {d['A0']} h0 {d['_h0']} m  open {d['_open_s']:.2f} s  frames {len(d['frames'])}")
    print(HDR)
    for target in taus:
        fr = min(d["frames"], key=lambda f: abs(f["tau_s"] - target))
        if abs(fr["tau_s"] - target) > 0.12:
            continue
        r = row(d, fr)
        print(f"{r['tau_s']:+5.2f} {r['phase']:5s} {int(r['ov'])}  {r['H']:.2f}  {r['under']:.3f} "
              f"{r['outer']:.3f} {r['t_tip']:.3f} {r['t_mid']:.3f} {r['t_root']:.3f}  {r['mean']:.3f} "
              f"{r['jet']:.4f} {r['over']:.4f}  {r['reach']:+.3f} {r['tipDrop']:.3f}  "
              f"{r['mid_H']:.3f} {r['mean_H']:.3f} {r['jet_H2']:.4f} {r['flags']}")


def stage_taus(d, stages):
    """the tau_s of the first open-phase frame whose underside arc reaches each share of H"""
    out = []
    seen = []
    for fr in d["frames"]:
        if fr["phase"] not in ("open", "pre") or fr["tau_s"] < 0:
            continue
        m = measure(fr["profile"])
        if m["H"] <= 0 or m["under"] <= 0:
            continue
        seen.append((m["under"] / m["H"], fr["tau_s"]))
    for s in stages:
        hit = next((t for u, t in seen if u >= s), None)
        if hit is not None:
            out.append(hit)
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--"))
    mode, paths = args[0], args[1:]
    taus = [float(x) for x in opts.get("taus", "-0.2,-0.1,0,0.1,0.2,0.3,0.4,0.5,0.6,0.8,1.0").split(",")]
    shares = [float(x) for x in opts.get("shares", "0,0.25,0.5,0.75,0.9,0.98").split(",")]
    stages = [float(x) for x in opts.get("stages", "0.1,0.2,0.3,0.4,0.5,0.6,0.8").split(",")]
    for p in paths:
        d = load(p)
        if mode == "tau":
            show(d, taus)
        elif mode == "open":
            show(d, [s * d["_open_s"] for s in shares])
        elif mode == "stage":
            show(d, stage_taus(d, stages))
        elif mode == "all":
            show(d, [f["tau_s"] for f in d["frames"]])


if __name__ == "__main__":
    main()
