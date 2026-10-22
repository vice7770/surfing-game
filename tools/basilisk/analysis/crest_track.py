"""Follow a periodic.c run's second crest (the wave studied) through its frames: when and where its face goes vertical,
when its lip lands, its crest as it passes the slope's foot, and the switch, end and window a finer phase needs.

The crest in each frame is the highest surface point within a quarter wavelength of where it is expected: at first the
train's second crest (train.json's crests_x[1]) moving at the train's celerity, then at its own measured pace from frame
to frame. --init T X starts it at X at time T instead (a restarted phase, whose first frame is past the foot). Each frame's
face angle is metrics.face_angle's (90 = vertical), with the water level the lowest surface within 3 h0 ahead of the crest
(the local trough), as plunge_measure.py takes it; touchdown is the first frame past vertical with an enclosed air loop
near the lip, as there.

usage: python3 crest_track.py RUN_DIR [--init T X] [--out FILE]
RUN_DIR holds the build's params.txt (run_periodic.sh writes it), train.json and facets/.
writes FILE (default RUN_DIR/track.json) and prints a summary.
"""
import argparse
import json
import math
import os

import numpy as np

import metrics
from interface import frame, landmarks, list_frames, poly_area

LEAD = 5.0        # the switch, this long before the face goes vertical (sqrt(h0/g)): the library's frames start 3 before
TAIL = 6.5        # the end after vertical when no touchdown is seen; else touchdown + 3, and at least vertical + 5
BACK = 3.0        # the window starts this far behind the crest at vertical - 3 (the profile's back reaches 2 h0 behind it)
AHEAD = 8.0       # and ends at least this far ahead of the crest at vertical (the lip, the splash-up and the bore)


def read_params(run):
    out = {}
    with open(os.path.join(run, "params.txt")) as fh:
        for line in fh:
            if "=" in line:
                k, v = line.strip().split("=", 1)
                try:
                    out[k] = float(v)
                except ValueError:
                    out[k] = v
    return out


def bed_depth(p, x):
    """Still depth over the bed at x, h0 (slope.c's bedProfile)."""
    x1 = p["xtoe"] + (1.0 - p["HMID"]) / p["S1"]
    x2 = x1 + (p["HMID"] - p["HS"]) / p["S2"]
    if x < p["xtoe"]:
        return 1.0
    if x < x1:
        return 1.0 - p["S1"] * (x - p["xtoe"])
    if x < x2:
        return p["HMID"] - p["S2"] * (x - x1)
    return p["HS"]


def crop(main, a, b):
    """The contiguous stretch of the surface chain from its first point at x >= a to its last at x <= b."""
    x = main[:, 0]
    inside = np.where((x >= a) & (x <= b))[0]
    if len(inside) < 8:
        return None
    return main[inside[0]:inside[-1] + 1]


def track(run, init=None):
    p = read_params(run)
    tr = json.load(open(os.path.join(run, "train.json")))
    L0, lev = p["domain"], int(p["level"])
    dx = L0 / 2 ** lev
    L, c = tr["L"], tr["c"]
    half = max(L / 4.0, 3.5)
    if init is not None:
        t_prev, x_prev = init
    else:
        t_prev, x_prev = 0.0, tr["crests_x"][1]
    v = c
    rows = []
    for t, f in list_frames(run):
        if init is not None and t < init[0] - 1e-9:
            continue
        fr = frame(f, dx, L0)
        if fr is None:
            continue
        pred = x_prev + v * (t - t_prev)
        sub = crop(fr["main"], pred - half, pred + half + 3.0)
        if sub is None:
            continue
        ic = int(np.argmax(sub[:, 1]))
        xc, yc = float(sub[ic, 0]), float(sub[ic, 1])
        ahead = (sub[:, 0] > xc) & (sub[:, 0] <= xc + 3.0)
        trough = float(sub[ahead, 1].min()) if ahead.any() else 0.0
        try:
            lm = landmarks(sub, hs_level=trough)
            ang = metrics.face_angle(sub, lm)
        except (ValueError, IndexError):
            continue
        lipx = float(sub[lm["lip"], 0])
        loop = any(abs(l[:, 0].mean() - lipx) < 1.2 and abs(poly_area(l)) > 0.002 for l in fr["closed"])
        if rows and t > rows[-1]["t"]:
            step = (xc - rows[-1]["x"]) / (t - rows[-1]["t"])
            if 0.2 * c < step < 2.0 * c:
                v = step
        rows.append({"t": t, "x": xc, "y": yc, "trough": trough, "angle": ang, "overturned": bool(lm["overturned"]),
                     "loop": bool(loop), "lip_x": lipx})
        t_prev, x_prev = t, xc
    return p, tr, dx, rows


def interp(rows, key, t):
    ts = [r["t"] for r in rows]
    return float(np.interp(t, ts, [r[key] for r in rows]))


def summarise(p, tr, dx, rows):
    out = {"level": int(p["level"]), "dx_h0": dx, "frames": len(rows), "xtoe": p["xtoe"], "h0_m": p["h0"]}
    if not rows:
        out["error"] = "no frame held the second crest"
        return out
    # the crest passing the slope's foot: its height there, interpolated between the frames either side
    foot = None
    for a, b in zip(rows[:-1], rows[1:]):
        if a["x"] <= p["xtoe"] < b["x"]:
            w = (p["xtoe"] - a["x"]) / (b["x"] - a["x"])
            foot = a["y"] + w * (b["y"] - a["y"])
            break
    out["foot_crest_h0"] = foot
    out["train_crest_h0"] = tr["crest"]
    # face vertical: the first crossing of 90 degrees once the crest is on the slope (interpolated, as metrics.py)
    on = [r for r in rows if r["x"] > p["xtoe"] + 1.0]
    tv = xv = None
    for a, b in zip(on[:-1], on[1:]):
        if a["angle"] < 90 <= b["angle"]:
            w = (90 - a["angle"]) / (b["angle"] - a["angle"])
            tv, xv = a["t"] + w * (b["t"] - a["t"]), a["x"] + w * (b["x"] - a["x"])
            break
    if tv is None and on and on[0]["angle"] >= 90:
        tv, xv = on[0]["t"], on[0]["x"]
    out["vertical_found"] = tv is not None
    if tv is None and on:
        r = max(on, key=lambda r: r["angle"])
        tv, xv = r["t"], r["x"]
        out["note"] = (f"the face never went vertical (steepest {r['angle']:.0f} deg at t {r['t']:.2f}); "
                       "the break is placed at its steepest frame")
        if r is on[-1]:
            out["note"] += "; that is the last frame, so the run may have ended before the break"
    if tv is None:
        out["error"] = "the crest never reached the slope"
        return out
    td = next((r["t"] for r in rows if r["t"] > tv and r["loop"]), None)
    out.update(t_vertical=tv, x_vertical=xv, depth_vertical_h0=bed_depth(p, xv), t_touchdown=td,
               crest_at_vertical_h0=interp(rows, "y", tv), trough_at_vertical_h0=interp(rows, "trough", tv))
    out["depth_vertical_m"] = out["depth_vertical_h0"] * p["h0"]
    # a finer phase's switch, end and window, from this run's break
    tsw = max(0.5, math.floor(2.0 * (tv - LEAD) + 1e-6) / 2.0)
    tmax = math.ceil(2.0 * (max(tv + 5.0, td + 3.0) if td is not None else tv + TAIL)) / 2.0
    t3 = max(rows[0]["t"], tv - 3.0)
    w0 = max(0.0, math.floor(min(interp(rows, "x", max(tsw, rows[0]["t"])) - 1.0, interp(rows, "x", t3) - BACK)))
    w1 = min(p["domain"], math.ceil(xv + max(AHEAD, tmax - tv + 3.0)))
    out["suggest"] = {"tswitch": tsw, "tmax": tmax, "xwin0": w0, "xwin1": w1}
    # the analysis's times and crest searches (plunge_measure.py, periodic_library.py), from this run's own track
    t_from, tmin = tv - 1.0, tv - 3.0
    out["analysis"] = {"t_from": t_from, "t_to": tv + 5.0, "xmin_plunge": interp(rows, "x", max(t_from, rows[0]["t"])) - 0.5,
                       "tmin": tmin, "xmin_library": interp(rows, "x", max(tmin, rows[0]["t"])) - 0.5}
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("run")
    ap.add_argument("--init", nargs=2, type=float, metavar=("T", "X"))
    ap.add_argument("--out")
    a = ap.parse_args()
    p, tr, dx, rows = track(a.run, tuple(a.init) if a.init else None)
    out = summarise(p, tr, dx, rows)
    out["run"] = os.path.abspath(a.run)
    out["track"] = rows
    path = a.out or os.path.join(a.run, "track.json")
    json.dump(out, open(path, "w"), indent=1, default=float)
    print(json.dumps({k: v for k, v in out.items() if k not in ("track", "run")}, indent=1, default=float))


if __name__ == "__main__":
    main()
