"""Build the tau-stamped 128-point profile library for one run.

usage: python3 library.py RUN_DIR LEVEL DOMAIN SLOPE A0 H0_METRES [TMIN]

Needs RUN_DIR_metrics.json from metrics.py (vertical-face and impact times).
Writes RUN_DIR_library.json and prints landmark reliability.
"""
import json
import math
import sys

import numpy as np

from interface import (IDX, N_PTS, frame, landmarks, list_frames, poly_area,
                       resample128, resample_piece, shape_metrics, void_polygon)


def cavity(fr, crest_x):
    """Largest enclosed air loop near the crest (the tube after touchdown)."""
    best = None
    for c in fr["closed"]:
        a = abs(poly_area(c))
        if abs(c[:, 0].mean() - crest_x) < 3 and (best is None or a > best[0]):
            best = (a, c)
    return best


def check(main, lm, prev):
    """Sanity flags for a landmark set."""
    flags = []
    order = [lm[k] for k in ("back", "crest", "lip", "throat", "toe", "front")]
    if any(b < a for a, b in zip(order[:-1], order[1:])):
        flags.append("order")
    x, y = main[:, 0], main[:, 1]
    if lm["overturned"] and x[lm["throat"]] > x[lm["lip"]]:
        flags.append("throat_ahead_of_lip")
    if lm["toe"] - lm["throat"] < 2:
        flags.append("toe_collapsed")
    if prev is not None:
        for k in ("crest", "lip", "toe"):
            if np.hypot(*(main[lm[k]] - prev[k])) > 0.35:
                flags.append("jump_" + k)
    return flags


def build(run, level, L0, slope, a0, h0_m, tmin=0.0):
    met = json.load(open(run.rstrip("/") + "_metrics.json"))
    tv, ti = met["t_vertical"], met["t_impact"]
    dx = L0 / 2 ** level
    tscale = math.sqrt(h0_m / 9.81)
    frames = []
    prev = None
    stats = {"total": 0, "clean": 0, "by_phase": {}}
    for t, f in list_frames(run):
        if t < tmin:
            continue
        fr = frame(f, dx, L0)
        if fr is None:
            continue
        main = fr["main"]
        lm = landmarks(main)
        tau = t - tv
        phase = "pre" if tau < 0 else ("open" if (ti is None or t < ti) else "post")
        cav = None
        if phase == "post":
            c = cavity(fr, main[lm["crest"], 0])
            if c is not None and c[0] > 0.002:
                cav = c[1]
                # touchdown point: the outer-surface point nearest the cavity's front-most point
                fp = cav[np.argmax(cav[:, 0])]
                i0 = lm["crest"]
                d = np.hypot(*(main[i0:] - fp).T)
                k = i0 + int(np.argmin(d))
                lm = dict(lm)
                lm["lip"] = lm["throat"] = k
                # toe: re-find ahead of touchdown
                y = main[:, 1]
                j = k
                Hc = main[lm["crest"], 1]
                while j < len(main) - 2 and not (y[j] < 0.1 * Hc and main[j + 1, 0] > main[j, 0]
                                                 and abs((y[j + 1] - y[j]) / max(1e-9, main[j + 1, 0] - main[j, 0])) < 0.25):
                    j += 1
                lm["toe"] = max(j, k + 1)
                lm["front"] = max(lm["front"], lm["toe"] + 1)
                ff = lm["toe"]
                while ff < len(main) - 1 and main[ff, 0] < main[lm["toe"], 0] + 1.0:
                    ff += 1
                lm["front"] = ff
        lm = {k: (min(v, len(main) - 1) if isinstance(v, (int, np.integer)) and not isinstance(v, bool) else v) for k, v in lm.items()}
        flags = check(main, lm, prev)
        if not fr["ok_span"] and main[:, 0].max() < main[lm["toe"], 0] + 1.0:
            flags.append("surface_torn_in_window")
        if phase == "post" and cav is None:
            flags.append("no_cavity")
        try:
            prof = resample128(main, lm)
        except Exception as e:  # noqa
            flags.append("resample_failed")
            prof = None
        # tube geometry
        tube = None
        if phase == "open" and lm["overturned"]:
            vp = void_polygon(main, lm)
            if vp is not None and len(vp) > 3:
                tube = shape_metrics(vp)
                tube["height"] = float(vp[:, 1].max() - vp[:, 1].min())
        elif cav is not None:
            tube = shape_metrics(cav)
            tube["height"] = float(cav[:, 1].max() - cav[:, 1].min())
        rec = {"t": t, "tau": tau, "tau_s": tau * tscale, "phase": phase, "flags": flags,
               "overturned": bool(lm["overturned"]),
               "crest": main[lm["crest"]].tolist(), "H": float(main[lm["crest"], 1]),
               "n_bubbles_droplets": len(fr["closed"]), "n_fragments": len(fr["strays"]),
               "tube": tube,
               "profile": np.round(prof, 5).tolist() if prof is not None else None,
               "cavity32": np.round(resample_piece(np.vstack([cav, cav[:1]]), 32, True), 5).tolist() if cav is not None else None}
        frames.append(rec)
        prev = {k: main[lm[k]] for k in ("crest", "lip", "toe")}
        stats["total"] += 1
        ph = stats["by_phase"].setdefault(phase, {"n": 0, "clean": 0, "flags": {}})
        ph["n"] += 1
        if not flags:
            stats["clean"] += 1
            ph["clean"] += 1
        for fl in flags:
            ph["flags"][fl] = ph["flags"].get(fl, 0) + 1
    out = {"run": run, "level": level, "dx_h0": dx, "slope": slope, "A0": a0, "h0_m": h0_m,
           "time_scale_s": tscale, "t_vertical": tv, "t_impact": ti,
           "indices": IDX, "n_points": N_PTS,
           "units": "profile x, y in h0 (offshore depth); y = 0 still water; tau in sqrt(h0/g); tau_s in s at h0_m",
           "stats": stats, "frames": frames}
    return out


if __name__ == "__main__":
    run, level, L0, slope, a0, h0 = sys.argv[1], int(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6])
    tmin = float(sys.argv[7]) if len(sys.argv) > 7 else 0.0
    o = build(run, level, L0, slope, a0, h0, tmin)
    json.dump(o, open(run.rstrip("/") + "_library.json", "w"))
    print(json.dumps(o["stats"], indent=1))
