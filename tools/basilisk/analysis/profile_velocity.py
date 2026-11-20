#!/usr/bin/env python3
"""The water's velocity along a run's 128-point profiles (2026-11-11, the Wave Pool Barrel's one interior flow).

  python3 profile_velocity.py <library.json> <run folder> <out.json>

<library.json> is a case's profile library (periodic_library.py): per frame, 128 points along the wave studied, in the
run's own x, y (h0). <run folder> holds vel/v<t>.dat, written by periodic.c built with VELOUT: one row per surface cell,
  x y nx ny Delta   then per sample depth   u v w
(u, v) the velocity that deep into the water along the surface's normal, w the water's fraction there. This script gives
each profile point the nearest surface cell's samples and writes, per frame, u and v as 128 lists (one value per depth;
null where the sample is not in water or no cell is near). Standard library only, so it runs anywhere.

The run that wrote the velocities may be a rerun of the one the library came from. Each frame's `match` says how far its
profile points are from the cells they took (median and largest, h0) and how many found none; a rerun that drifted
shows there.
"""
import json
import math
import os
import sys

DEPTHS = [0.01, 0.02, 0.05, 0.1]   # periodic.c's VELDEPTHS (h0); the first sample, before these, is 1.5 cells deep
BIN = 0.02                         # the search grid (h0)
TOL = 0.03                         # a profile point farther than this from every wet surface cell gets no velocity (h0)
WET = 0.5                          # a sample with less water than this is air, spray or the bed


def read_rows(path):
    rows = []
    with open(path) as fh:
        for line in fh:
            p = line.split()
            if len(p) < 8 or (len(p) - 5) % 3:
                continue
            rows.append([float(v) for v in p])
    return rows


def grid_of(rows):
    grid = {}
    for i, r in enumerate(rows):
        if r[7] < WET:   # the sample just under the surface is not water: a droplet's or a bubble's cell
            continue
        grid.setdefault((math.floor(r[0] / BIN), math.floor(r[1] / BIN)), []).append(i)
    return grid


def nearest(rows, grid, x, y):
    bx, by = math.floor(x / BIN), math.floor(y / BIN)
    best, bd = None, TOL * TOL
    for i in range(bx - 2, bx + 3):
        for j in range(by - 2, by + 3):
            for k in grid.get((i, j), ()):
                d = (rows[k][0] - x) ** 2 + (rows[k][1] - y) ** 2
                if d < bd:
                    best, bd = k, d
    return best, math.sqrt(bd)


def main(library, run, out):
    lib = json.load(open(library))
    frames, nd, dists, lost, files = [], None, [], 0, 0
    for fr in lib["frames"]:
        prof = fr.get("profile")
        path = os.path.join(run, "vel", "v%07.3f.dat" % fr["t"])
        if prof is None or not os.path.exists(path):
            continue
        rows = read_rows(path)
        if not rows:
            continue
        files += 1
        nd = (len(rows[0]) - 5) // 3
        grid = grid_of(rows)
        us, vs, ds, missing = [], [], [], 0
        for x, y in prof:
            k, d = nearest(rows, grid, x, y)
            if k is None:
                us.append(None); vs.append(None); missing += 1
                continue
            r = rows[k]
            ds.append(d)
            us.append([round(r[5 + 3 * j], 4) if r[7 + 3 * j] >= WET else None for j in range(nd)])
            vs.append([round(r[6 + 3 * j], 4) if r[7 + 3 * j] >= WET else None for j in range(nd)])
        ds.sort()
        dists += ds
        lost += missing
        frames.append({"t": fr["t"], "tau": fr["tau"], "phase": fr["phase"],
                       "match": {"median": round(ds[len(ds) // 2], 5) if ds else None,
                                 "max": round(ds[-1], 5) if ds else None, "missing": missing},
                       "u": us, "v": vs})
    dists.sort()
    res = {"library": os.path.basename(library), "run": os.path.basename(run.rstrip("/")),
           "units": "u, v in sqrt(g h0), in the run's fixed frame (x towards the shore, y up); depths in h0 into the "
                    "water along the surface's normal; one u and one v list per profile point (the library's 128, in "
                    "its order), one value per depth; null: not in water, or no surface cell within %g h0" % TOL,
           "depths": ["1.5 cells"] + DEPTHS[:max(0, (nd or 1) - 1)], "dx_h0": lib.get("dx_h0"),
           "h0_m": lib.get("h0_m"), "t_vertical": lib.get("t_vertical"), "t_impact": lib.get("t_impact"),
           "match": {"frames": len(frames), "library_frames": len(lib["frames"]),
                     "median": round(dists[len(dists) // 2], 5) if dists else None,
                     "p99": round(dists[int(0.99 * (len(dists) - 1))], 5) if dists else None, "missing": lost},
           "frames": frames}
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    json.dump(res, open(out, "w"), separators=(",", ":"))
    m = res["match"]
    print("%s: %d of %d frames, %d points without a cell; match median %s, p99 %s h0 (cells %s h0)"
          % (os.path.basename(out), m["frames"], m["library_frames"], m["missing"], m["median"], m["p99"], lib.get("dx_h0")))
    if not frames:
        print("no frame matched: is %s/vel there, and from the same case and output times?" % run, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    sys.exit(main(*sys.argv[1:]))
