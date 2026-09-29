"""Export a small sample of one run's profile library for the repo (< 200 KB).

usage: python3 export_sample.py LIBRARY_JSON OUT_JSON STRIDE TAU_MIN TAU_MAX
"""
import json
import sys

lib = json.load(open(sys.argv[1]))
out_path, stride, tmin, tmax = sys.argv[2], int(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
frames = [f for f in lib["frames"] if tmin <= f["tau"] <= tmax][::stride]


def r(v, n=4):
    return None if v is None else round(v, n)


out = {
    "about": "Breakline round 6: 2D Basilisk two-phase run, resampled free-surface profiles. "
             "Each profile has 128 points (x, y) with fixed landmark indices; after touchdown the enclosed tube "
             "cavity is given separately as a closed 32-point loop. Coordinates in units of h0 (depth at the wedge base), "
             "y = 0 is still water. tau = t - t_vertical in sqrt(h0/g); tau_s in seconds at h0_m. "
             "phase: pre (face not yet vertical), open (vertical face to touchdown), post (after touchdown). "
             "flags list automatic landmark checks that failed; treat flagged frames as unreliable.",
    "run": {k: lib[k] for k in ("level", "dx_h0", "slope", "A0", "h0_m", "time_scale_s", "t_vertical", "t_impact")},
    "indices": lib["indices"],
    "frames": [{
        "t": r(f["t"], 3), "tau": r(f["tau"], 3), "tau_s": r(f["tau_s"], 3), "phase": f["phase"], "flags": f["flags"],
        "H": r(f["H"]),
        "tube": None if not f["tube"] else {k: r(v) for k, v in f["tube"].items()},
        "profile": [[r(x), r(y)] for x, y in f["profile"]] if f["profile"] else None,
        "cavity32": [[r(x), r(y)] for x, y in f["cavity32"]] if f["cavity32"] else None,
    } for f in frames],
}
s = json.dumps(out, separators=(",", ":"))
open(out_path, "w").write(s)
print(len(frames), "frames", len(s) // 1024, "KB")
