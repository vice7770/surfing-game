"""A periodic run's main plunge: face vertical, touchdown, the jet and tube just before touchdown
(the last overturned frame with the jet at least 3 cells off the face).

The water level ahead is the local trough (the step), not still water, and the crest is looked for
only at x >= XMIN (h0), past the steps the backwash throws on the face. Areas are per the breaking
height H at the face-vertical frame, the height the game sizes its jets with; per H at touchdown too.

usage: python3 plunge_measure.py RUN_DIR DOMAIN LEVEL H0_M T_FROM T_TO XMIN
writes RUN_DIR_plunge.json.
"""
import json
import math
import sys
from interface import frame, list_frames, landmarks, void_polygon, jet_polygon, shape_metrics, poly_area
import metrics
run, L0, lev, h0, t0, t1, xmin = sys.argv[1], float(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6]), float(sys.argv[7])
dx = L0/2**lev; ts = math.sqrt(h0/9.81)
def local(m):
    lm0 = landmarks(m, xmin_search=xmin)
    x, y = m[:, 0], m[:, 1]
    ahead = (x > x[lm0["crest"]]) & (x <= x[lm0["crest"]] + 3.0)
    tr = float(y[ahead].min()) if ahead.any() else 0.0
    lm = landmarks(m, hs_level=tr, xmin_search=xmin)
    return lm, tr
rows = []
for t, f in list_frames(run):
    if not (t0 <= t <= t1): continue
    fr = frame(f, dx, L0)
    if fr is None: continue
    m = fr["main"]
    if m[:, 0].max() < xmin + 0.5: continue
    try:
        lm, tr = local(m)
    except ValueError:
        continue
    ang = metrics.face_angle(m, lm)
    loops = [l for l in fr["closed"] if abs(l[:, 0].mean() - m[lm["lip"], 0]) < 1.2 and abs(poly_area(l)) > 0.002]
    g = metrics.gap(m, lm) if lm["overturned"] else None
    rows.append(dict(t=t, f=f, crest=float(m[lm["crest"], 1]), cx=float(m[lm["crest"], 0]), tr=tr, ang=ang,
                     ov=lm["overturned"], loop=bool(loops), gap=g))
tv = next((r["t"] for r in rows if r["ang"] >= 90), None)
td = next((r for r in rows if tv and r["t"] > tv and r["loop"]), None)
# the last overturned frame before touchdown with the jet at least 3 cells off the face (closer, the void reads as a sliver)
pre = max((r for r in rows if td and r["t"] < td["t"] and r["ov"] and (r["gap"] is None or r["gap"] >= 3 * dx)),
          key=lambda r: r["t"], default=None)
out = {"run": run, "t_vertical": tv, "t_touchdown": td["t"] if td else None}
if tv:
    rv = next(r for r in rows if r["t"] == tv)
    out["at_vertical"] = {"crest_m": rv["crest"]*h0, "x_m": rv["cx"]*h0, "trough_m": rv["tr"]*h0, "H_m": (rv["crest"]-rv["tr"])*h0}
if pre:
    fr = frame(pre["f"], dx, L0); m = fr["main"]; lm, tr = local(m)
    vp, jp = void_polygon(m, lm), jet_polygon(m, lm)
    sm = shape_metrics(vp) if vp is not None else None
    AJ = abs(poly_area(jp)) if jp is not None else None
    H = pre["crest"] - tr
    Hv = out["at_vertical"]["H_m"]/h0
    if sm and AJ:
        out["pre_touchdown"] = {"t": pre["t"], "crest_m": pre["crest"]*h0, "trough_m": tr*h0, "H_m": H*h0,
            "jet_m2": AJ*h0*h0, "tube_m2": sm["A"]*h0*h0, "tube_L_m": sm["L"]*h0, "tube_W_m": sm["W"]*h0,
            "L/W": sm["L"]/sm["W"], "tilt_deg": sm["theta"], "lip_m": AJ/sm["L"]*h0, "lip_cells": AJ/sm["L"]/dx,
            "per H at touchdown": {"jet": AJ/H**2, "tube": sm["A"]/H**2, "lip": AJ/sm["L"]/H},
            "per H at vertical": {"jet": AJ/Hv**2, "tube": sm["A"]/Hv**2, "lip": AJ/sm["L"]/Hv},
            "open_s": (td["t"] - tv)*ts}
print(json.dumps(out, indent=1, default=float))
json.dump(out, open(run.rstrip("/") + "_plunge.json", "w"), indent=1, default=float)
