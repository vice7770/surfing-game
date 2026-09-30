"""Per-frame overturn metrics for one run: vertical-face time, impact time, and the
Pick & Feddersen (2026) style metrics at the last frame before impact.

usage: python3 metrics.py RUN_DIR LEVEL DOMAIN SLOPE A0 [HS]
"""
import json
import math
import sys

import numpy as np

from interface import (frame, landmarks, list_frames, void_polygon, jet_polygon,
                       shape_metrics, poly_area)


def face_angle(main, lm):
    """Steepest angle of the front face below the crest, deg (90 = vertical, >90 = overhanging)."""
    ic = lm["crest"]
    it = lm["toe"]
    p = main[ic:it + 1]
    if len(p) < 3:
        return 0.0
    d = np.diff(p, axis=0)
    # smooth over a few segments to suppress PLIC jitter
    k = 3
    if len(d) > 2 * k:
        d = np.array([d[max(0, i - k):i + k + 1].sum(axis=0) for i in range(len(d))])
    ang = np.degrees(np.arctan2(-d[:, 1], d[:, 0]))  # descending forward = 0..90, overhang > 90
    ang = ang[d[:, 1] < 0]  # descending parts only
    return float(ang.max()) if len(ang) else 0.0


def gap(main, lm):
    if not lm["overturned"]:
        return None
    tip = main[lm["lip"]]
    face = main[lm["throat"]:]
    face = face[face[:, 0] < tip[0] + 2.0]
    if len(face) < 2:
        return None
    return float(np.hypot(*(face - tip).T).min())


def analyse(run_dir, level, L0, slope, a0, hs=0.05, tmin=0.0):
    dx = L0 / 2 ** level
    rows = []
    for t, f in list_frames(run_dir):
        if t < tmin:
            continue
        fr = frame(f, dx, L0)
        if fr is None:
            rows.append({"t": t, "ok": False})
            continue
        main = fr["main"]
        lm = landmarks(main, hs_level=0.0)
        r = {"t": t, "ok": fr["ok_span"], "crest_x": float(main[lm["crest"], 0]),
             "crest_y": float(main[lm["crest"], 1]), "overturned": bool(lm["overturned"]),
             "angle": face_angle(main, lm), "gap": gap(main, lm),
             "n_closed": len(fr["closed"]), "n_strays": len(fr["strays"])}
        # big enclosed air loop near the crest = the tube after touchdown
        big = [c for c in fr["closed"] if abs(poly_area(c)) > 0.002 and abs(c[:, 0].mean() - r["crest_x"]) < 3]
        r["closed_big"] = len(big)
        rows.append(r)
    # vertical face: first frame with angle >= 90 (interpolated)
    tv = None
    for a, b in zip(rows[:-1], rows[1:]):
        if a.get("angle") is not None and b.get("angle") is not None and a["angle"] < 90 <= b["angle"]:
            tv = a["t"] + (90 - a["angle"]) / (b["angle"] - a["angle"]) * (b["t"] - a["t"])
            break
    # impact: first frame after tv where the gap closes (< 2 dx) or a big closed loop appears,
    # or the main surface stops being overturned after having been overturned
    ti, pre = None, None
    seen_ov = False
    for r in rows:
        if tv is None or r["t"] < tv or not r.get("ok", False) and "angle" not in r:
            continue
        if r.get("overturned"):
            seen_ov = True
        closed_now = (r.get("gap") is not None and r["gap"] < 2 * dx) or r.get("closed_big", 0) > 0 \
            or (seen_ov and not r.get("overturned"))
        if seen_ov and closed_now:
            ti = r["t"]
            break
        # the metrics' frame: the last overturned one whose jet is at least 3 dx off the face (at level 12 the
        # frame before touchdown can hold the jet 2 dx off, where the landmarks take a sliver for the void)
        if r.get("overturned") and r.get("gap") is not None and r["gap"] >= 3 * dx:
            pre = r
    out = {"run": run_dir, "level": level, "dx": dx, "slope": slope, "A0": a0,
           "psi0": slope / a0 ** 0.25, "t_vertical": tv, "t_impact": ti,
           "pre_impact_t": pre["t"] if pre else None, "frames": rows}
    if pre:
        f = [f for t, f in list_frames(run_dir) if t == pre["t"]][0]
        fr = frame(f, dx, L0)
        main = fr["main"]
        lm = landmarks(main)
        HI = float(main[lm["crest"], 1])
        vp = void_polygon(main, lm)
        jp = jet_polygon(main, lm)
        m = shape_metrics(vp) if vp is not None else None
        AJ = abs(poly_area(jp)) if jp is not None else None
        out["impact"] = {"H_I": HI, "A_O": m["A"] if m else None, "L_O": m["L"] if m else None,
                         "W_O": m["W"] if m else None, "theta_O": m["theta"] if m else None,
                         "A_J": AJ, "gap": pre["gap"],
                         "A_O/H2": m["A"] / HI ** 2 if m else None,
                         "A_J/H2": AJ / HI ** 2 if AJ else None,
                         "W/L": m["W"] / m["L"] if m else None,
                         "L/W": m["L"] / m["W"] if m else None,
                         "tip": main[lm["lip"]].tolist(), "throat": main[lm["throat"]].tolist()}
    p = out["psi0"]
    out["fits"] = {"A_O/H2": 5.319 * p - 0.043, "A_J/H2": 37.072 * p * p - 0.587 * p + 0.020,
                   "W/L": 1.661 * p + 0.298, "theta_O": -5746.4 * p * p + 225.2 * p + 48.4,
                   "gamma_b": 0.871 * math.exp(11.874 * p)}
    return out


if __name__ == "__main__":
    run, level, L0, slope, a0 = sys.argv[1], int(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
    tmin = float(sys.argv[6]) if len(sys.argv) > 6 else 0.0
    o = analyse(run, level, L0, slope, a0, tmin=tmin)
    with open(run.rstrip("/") + "_metrics.json", "w") as fh:
        json.dump(o, fh, indent=1, default=lambda v: bool(v) if isinstance(v, np.bool_) else float(v))
    s = {k: v for k, v in o.items() if k != "frames"}
    print(json.dumps(s, indent=1, default=lambda v: bool(v) if isinstance(v, np.bool_) else float(v)))
