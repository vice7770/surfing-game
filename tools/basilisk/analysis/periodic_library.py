"""The tau-stamped 128-point profile library for a periodic.c run.

library.py's build, made periodic-aware in three places:
  - every frame's landmarks take the local trough ahead of the crest as the water level (not still
    water) and look for the crest only at x >= XMIN, past the steps the backwash throws on the face;
  - after touchdown, the toe is re-found against that trough level;
  - the times come from RUN_plunge.json (plunge_measure.py): face vertical and touchdown.
Each frame also records the trough level and H over it. The output format is library.py's, so the
game's converter reads it unchanged; the frames' "H" stays the crest's height above still water,
and "H_trough" is the crest over the trough.

usage: python3 periodic_library.py RUN_DIR LEVEL DOMAIN SLOPE A0 H0_M TMIN XMIN [robust]
  robust: walk past small undulations to the jet's tip (turn_frac 0.08), and look for the pre-vertical lip only
  in the upper 60 % of the face (face_floor 0.4), for big curls over a drained step.
writes RUN_DIR_library.json and RUN_DIR_metrics.json (the times it used, for library.py's readers).
"""
import json
import math
import sys

import numpy as np

from interface import (IDX, N_PTS, chain, frame, join_open, landmarks, list_frames, read_facets, resample128,
                       resample_piece, shape_metrics, void_polygon)
from library import cavity, check


def stitch_main(path, dx, tol=0.2, minpts=10):
    """The surface stitched left to right from its larger open pieces, for a frame whose main chain is torn.

    Over the Reef's drained ledge the water surface can meet the bed behind or ahead of the crest. The chain
    then breaks, and the piece with the widest x extent (the back of the wave) is taken as the whole surface.
    Here each piece's start is joined to the previous piece's end when they lie within `tol` (h0) of each other.
    """
    lines = join_open(chain(read_facets(path), tol=0.6 * dx), gap=3.0 * dx)
    opens = [l if l[0, 0] <= l[-1, 0] else l[::-1] for l, c in lines if not c and len(l) >= minpts]
    if not opens:
        return None
    opens.sort(key=lambda l: l[0, 0])
    cur = opens.pop(0)
    while opens:
        d = [float(np.hypot(*(o[0] - cur[-1]))) for o in opens]
        k = int(np.argmin(d))
        if d[k] > tol:
            break
        cur = np.vstack([cur, opens.pop(k)])
    return cur


ROBUST = {}  # landmarks options for big curls over a drained step: {"turn_frac": 0.08, "face_floor": 0.4}


def local_landmarks(main, xmin, ahead=3.0):
    lm0 = landmarks(main, xmin_search=xmin)
    x, y = main[:, 0], main[:, 1]
    sel = (x > x[lm0["crest"]]) & (x <= x[lm0["crest"]] + ahead)
    trough = float(y[sel].min()) if sel.any() else 0.0
    return landmarks(main, hs_level=trough, xmin_search=xmin, **ROBUST), trough


def build(run, level, L0, slope, a0, h0_m, tmin, xmin):
    pl = json.load(open(run.rstrip("/") + "_plunge.json"))
    tv, ti = pl["t_vertical"], pl["t_touchdown"]
    dx = L0 / 2 ** level
    tscale = math.sqrt(h0_m / 9.81)
    frames, prev = [], None
    stats = {"total": 0, "clean": 0, "by_phase": {}}
    for t, f in list_frames(run):
        if t < tmin:
            continue
        fr = frame(f, dx, L0)
        if fr is None:
            continue
        main = fr["main"]
        stitched = False
        if not fr["ok_span"] and main[:, 0].max() < 0.95 * L0:
            # The surface met the bed somewhere: stitch its pieces rather than keep only the widest one.
            whole = stitch_main(f, dx)
            if whole is not None and whole[:, 0].max() > main[:, 0].max() + 1.0:
                main, stitched = whole, True
                fr = dict(fr, main=main)
        if main[:, 0].max() < xmin + 0.5:
            continue
        try:
            lm, trough = local_landmarks(main, xmin)
        except ValueError:
            continue
        tau = t - tv
        phase = "pre" if tau < 0 else ("open" if (ti is None or t < ti) else "post")
        cav = None
        if phase == "post":
            c = cavity(fr, main[lm["crest"], 0])
            if c is not None and c[0] > 0.002:
                cav = c[1]
                fp = cav[np.argmax(cav[:, 0])]
                i0 = lm["crest"]
                k = i0 + int(np.argmin(np.hypot(*(main[i0:] - fp).T)))
                lm = dict(lm)
                lm["lip"] = lm["throat"] = k
                y = main[:, 1]
                Hc = main[lm["crest"], 1] - trough
                j = k
                while j < len(main) - 2 and not (y[j] - trough < 0.1 * Hc and main[j + 1, 0] > main[j, 0]
                                                 and abs((y[j + 1] - y[j]) / max(1e-9, main[j + 1, 0] - main[j, 0])) < 0.25):
                    j += 1
                lm["toe"] = max(j, k + 1)
                ff = lm["toe"]
                while ff < len(main) - 1 and main[ff, 0] < main[lm["toe"], 0] + 1.0:
                    ff += 1
                lm["front"] = ff
        lm = {k: (min(v, len(main) - 1) if isinstance(v, (int, np.integer)) and not isinstance(v, bool) else v)
              for k, v in lm.items()}
        flags = check(main, lm, prev)
        if not fr["ok_span"] and main[:, 0].max() < main[lm["toe"], 0] + 1.0:
            flags.append("surface_torn_in_window")
        if phase == "post" and cav is None:
            flags.append("no_cavity")
        try:
            prof = resample128(main, lm)
        except Exception:  # noqa: BLE001
            flags.append("resample_failed")
            prof = None
        tube = None
        if phase == "open" and lm["overturned"]:
            vp = void_polygon(main, lm)
            if vp is not None and len(vp) > 3:
                tube = shape_metrics(vp)
                tube["height"] = float(vp[:, 1].max() - vp[:, 1].min())
        elif cav is not None:
            tube = shape_metrics(cav)
            tube["height"] = float(cav[:, 1].max() - cav[:, 1].min())
        rec = {"t": t, "tau": tau, "tau_s": tau * tscale, "phase": phase, "flags": flags, "stitched": stitched,
               "overturned": bool(lm["overturned"]), "crest": main[lm["crest"]].tolist(),
               "H": float(main[lm["crest"], 1]), "trough": trough, "H_trough": float(main[lm["crest"], 1] - trough),
               "n_bubbles_droplets": len(fr["closed"]), "n_fragments": len(fr["strays"]), "tube": tube,
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
    return {"run": run, "level": level, "dx_h0": dx, "slope": slope, "A0": a0, "h0_m": h0_m,
            "time_scale_s": tscale, "t_vertical": tv, "t_impact": ti, "indices": IDX, "n_points": N_PTS,
            "wave": "periodic: the second crest of a cnoidal train (periodic.c); times from plunge_measure.py",
            "units": "profile x, y in h0 (the foot's depth); y = 0 still water; each frame's trough is its water "
                     "level ahead; tau in sqrt(h0/g); tau_s in s at h0_m",
            "stats": stats, "frames": frames}


if __name__ == "__main__":
    run, level, L0, slope, a0, h0 = sys.argv[1], int(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6])
    tmin, xmin = float(sys.argv[7]), float(sys.argv[8])
    if len(sys.argv) > 9 and sys.argv[9] == "robust":
        ROBUST.update(turn_frac=0.08, face_floor=0.4)
    out = build(run, level, L0, slope, a0, h0, tmin, xmin)
    json.dump(out, open(run.rstrip("/") + "_library.json", "w"))
    pl = json.load(open(run.rstrip("/") + "_plunge.json"))
    json.dump({"run": run, "t_vertical": pl["t_vertical"], "t_impact": pl["t_touchdown"],
               "timing": "plunge_measure.py: the local trough as the water level, the crest looked for at x >= XMIN, "
                         "touchdown = first enclosed tube, the frame before it with the jet >= 3 cells off the face",
               "at_vertical": pl.get("at_vertical"), "pre_touchdown": pl.get("pre_touchdown")},
              open(run.rstrip("/") + "_metrics.json", "w"), indent=1, default=float)
    s = out["stats"]
    print(f"frames {s['total']}, clean {s['clean']}; by phase " +
          ", ".join(f"{k}: {v['n']} ({v['clean']} clean)" for k, v in s["by_phase"].items()))
