"""The ledge decision rule (decision.md) on the stored profiles. Standard library only.

  python3 ledge_rule.py <case>...     each <case> is a path without _library.json / _plunge.json

Per case: H at vertical, the usable clearance (life 0.5-0.9 of the enclosed tube: per frame, the best 0.3 m window's
smallest floor-to-roof gap, at game scale; the median over the frames and the best frame), and the lip's landing (the
cavity's length along the ray at touchdown).
"""
import json, sys, statistics
H0 = 4.5
def gaps(poly, n=300):
    xs = [p[0] for p in poly]; x0, x1 = min(xs), max(xs)
    out = []
    m = len(poly)
    for i in range(n):
        x = x0 + (x1 - x0) * (i + 0.5) / n
        ys = []
        for j in range(m):
            a, b = poly[j], poly[(j + 1) % m]
            if (a[0] - x) * (b[0] - x) <= 0 and a[0] != b[0]:
                t = (x - a[0]) / (b[0] - a[0]); ys.append(a[1] + t * (b[1] - a[1]))
        out.append((x * H0, (max(ys) - min(ys)) * H0 if len(ys) >= 2 else 0.0))
    return out, (x1 - x0) * H0
def usable(poly, win=0.3):
    g, L = gaps(poly)
    best = 0.0
    j = 0
    for i in range(len(g)):
        while j < len(g) and g[j][0] - g[i][0] < win: j += 1
        if j >= len(g) and g[-1][0] - g[i][0] < win - (g[1][0]-g[0][0]): break
        best = max(best, min(v for _, v in g[i:j]))
    return best, L
def case(name):
    L = json.load(open(name + "_library.json")); P = json.load(open(name + "_plunge.json"))
    td = P["t_touchdown"]; Hv = P["at_vertical"]["H_m"]
    fr = [f for f in L["frames"] if f.get("cavity32") and f["t"] >= td - 1e-9]
    t1 = fr[-1]["t"]
    vals = []
    for f in fr:
        life = (f["t"] - td) / (t1 - td) if t1 > td else 0
        if 0.5 <= life <= 0.9:
            vals.append(usable(f["cavity32"])[0])
    land = usable(fr[0]["cavity32"])[1]
    return dict(name=name, Hv=Hv, n=len(vals), p50=statistics.median(vals), best=max(vals), land=land, landH=land / Hv, cells=P["pre_touchdown"].get("lip_cells"), life_s=(t1 - td) * L["time_scale_s"])
rows = {n: case(n) for n in sys.argv[1:]}
for r in rows.values():
    print("%-26s H %.2f  usable p50 %.2f (best %.2f) n=%d  landing %.2f m %.2f H  lip cells %.1f  tube life %.2f s" % (r["name"], r["Hv"], r["p50"], r["best"], r["n"], r["land"], r["landH"], r["cells"], r["life_s"]))
