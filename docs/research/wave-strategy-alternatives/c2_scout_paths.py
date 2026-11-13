"""C2 step 1b: the path tables of scout runs, for the state matching's coverage when a case's level-12 file is not there yet.

A scout (run_periodic.sh scout, level 10) has its crest track (crest_track.py's track.json: every frame's crest x, y and
the trough within 3 h0 ahead) and its params.txt. Per frame this writes tau (from the scout's own vertical), the still
depth under the crest d (crest_track.bed_depth, h0) and H/d, with the scout's foot crest as A0 and the bed's keys, as
WaveLibrary's `CasePath` reads them. Frames from tau -12 to 0.

Standard library only (crest_track.py's bed rule is copied here, with its reef top and back slope).

usage: python3 c2_scout_paths.py OUT.json RUN_DIR [RUN_DIR ...]
"""
import json
import math
import os
import sys


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
    """crest_track.py's bed_depth: periodic.c's bedProfile with its reef top and back slope."""
    x1 = p["xtoe"] + (1.0 - p["HMID"]) / p["S1"]
    x2 = x1 + (p["HMID"] - p["HS"]) / p["S2"]
    if x < p["xtoe"]:
        return 1.0
    if x < x1:
        return 1.0 - p["S1"] * (x - p["xtoe"])
    if x < x2:
        return p["HMID"] - p["S2"] * (x - x1)
    if isinstance(p.get("REEFTOP"), float):
        x3 = x2 + p["REEFTOP"]
        if x < x3:
            return p["HS"]
        return min(1.0, p["HS"] + p["SBACK"] * (x - x3))
    return p["HS"]


def main():
    out, runs = sys.argv[1], sys.argv[2:]
    paths = []
    for run in runs:
        p = read_params(run)
        tr = json.load(open(os.path.join(run, "track.json")))
        tv = tr["t_vertical"]
        unit = 1.0  # times are in sqrt(h0/g) already
        rows = [r for r in tr["track"] if -12.0 <= (r["t"] - tv) / unit <= 0.0]
        tau, d, hd = [], [], []
        for r in rows:
            dd = bed_depth(p, r["x"])
            if dd <= 0:
                continue
            tau.append(round(r["t"] - tv, 5))
            d.append(round(dd, 6))
            hd.append(round((r["y"] - r["trough"]) / dd, 6))
        name = os.path.basename(run.rstrip("/"))
        paths.append({"id": name, "a0": tr["foot_crest_h0"], "slope": p["S1"], "reefDepth": p["HS"],
                      "period": p["period"] / math.sqrt(p["h0"] / 9.81), "tau": tau, "d": d, "Hd": hd,
                      "level": tr["level"], "t_vertical": tv})
        print(f"{name}: A0 {tr['foot_crest_h0']:.4f}, slope {p['S1']}, HS {p['HS']}, {len(tau)} frames from tau {tau[0]:.2f}, "
              f"H/d {hd[0]:.3f} to {hd[-1]:.3f}, d {d[0]:.3f} to {d[-1]:.3f}")
    json.dump(paths, open(out, "w"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
