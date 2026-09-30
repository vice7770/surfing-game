"""Overturn metrics for a periodic.c run, with H measured crest to trough.

metrics.py takes H as the crest's height above still water, right for a solitary wave running
onto still water. In a wave train the water ahead of the crest has drained below still level
(at a reef, the step), so H here is the crest's height over the lowest surface within AHEAD h0
in front of it, as the game takes H (crest minus the trough ahead). Both are reported.

usage: python3 periodic_metrics.py RUN_DIR LEVEL DOMAIN SLOPE A0 TMIN H0_M [AHEAD] [XMIN]
XMIN (h0): look for the crest only at x >= XMIN, to skip steps and curls behind the break.
writes RUN_DIR_pmetrics.json and prints a summary.
"""
import json
import math
import sys

import numpy as np

import functools

import interface
import metrics
from interface import frame, list_frames

landmarks = interface.landmarks


def trough_ahead(main, lm, ahead):
    x, y = main[:, 0], main[:, 1]
    xc = x[lm["crest"]]
    m = (x > xc) & (x <= xc + ahead)
    return float(y[m].min()) if m.any() else 0.0


def main():
    run, level, L0, slope, a0, tmin, h0 = (sys.argv[1], int(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]),
                                           float(sys.argv[5]), float(sys.argv[6]), float(sys.argv[7]))
    ahead = float(sys.argv[8]) if len(sys.argv) > 8 else 3.0
    xmin = float(sys.argv[9]) if len(sys.argv) > 9 else None
    global landmarks
    if xmin is not None:
        landmarks = functools.partial(interface.landmarks, xmin_search=xmin)
        metrics.landmarks = landmarks
    o = metrics.analyse(run, level, L0, slope, a0, tmin=tmin)
    dx = L0 / 2 ** level
    frames = dict(list_frames(run))
    out = {"run": run, "level": level, "dx_h0": dx, "h0_m": h0, "slope": slope, "ahead_h0": ahead, "xmin_h0": xmin,
           "t_vertical": o["t_vertical"], "t_impact": o["t_impact"], "pre_impact_t": o["pre_impact_t"]}
    ts = math.sqrt(h0 / 9.81)
    if o["t_vertical"] is not None:
        tv = min(frames, key=lambda t: abs(t - o["t_vertical"]))
        fv = frame(frames[tv], dx, L0)
        lmv = landmarks(fv["main"])
        crest_v = float(fv["main"][lmv["crest"], 1])
        out["at_vertical"] = {"t": tv, "crest_x_m": float(fv["main"][lmv["crest"], 0]) * h0,
                              "crest_m": crest_v * h0, "trough_ahead_m": trough_ahead(fv["main"], lmv, ahead) * h0,
                              "H_m": (crest_v - trough_ahead(fv["main"], lmv, ahead)) * h0}
    imp = o.get("impact")
    if imp and imp.get("A_J") is not None and o["pre_impact_t"] is not None:
        fp = frame(frames[o["pre_impact_t"]], dx, L0)
        lmp = landmarks(fp["main"])
        crest = float(fp["main"][lmp["crest"], 1])
        trough = trough_ahead(fp["main"], lmp, ahead)
        H = crest - trough
        AJ, AO, LO, WO = imp["A_J"], imp["A_O"], imp["L_O"], imp["W_O"]
        out["impact"] = {
            "crest_m": crest * h0, "trough_ahead_m": trough * h0, "H_m": H * h0, "crest_over_H": crest / H,
            "A_J/H2": AJ / H ** 2, "A_O/H2": (AO / H ** 2) if AO else None,
            "L_O/H": (LO / H) if LO else None, "W/L": (WO / LO) if (WO and LO) else None,
            "L/W": (LO / WO) if (WO and LO) else None, "tilt_deg": imp.get("theta_O"),
            "lip_thickness/H": (AJ / LO / H) if LO else None, "lip_cells": (AJ / LO / dx) if LO else None,
            "open_s": (o["t_impact"] - o["t_vertical"]) * ts if (o["t_impact"] and o["t_vertical"]) else None,
            "crest_elevation_based": {"A_J/H2": imp.get("A_J/H2"), "A_O/H2": imp.get("A_O/H2")},
        }
    json.dump(out, open(run.rstrip("/") + "_pmetrics.json", "w"), indent=1, default=float)
    print(json.dumps({k: v for k, v in out.items() if k != "run"}, indent=1, default=float))


if __name__ == "__main__":
    main()
