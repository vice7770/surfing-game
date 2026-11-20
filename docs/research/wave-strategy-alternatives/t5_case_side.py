"""T5, the case's side: the wave of a Basilisk pool case before its throw, per half second.

Reads a case's crest track (crest_track.py's track.json: every frame's crest x, y, the trough ahead and the face angle)
or its 128-point library (periodic_library.py's _library.json), and prints per tau bin (s before the face goes vertical,
at the case's own h0): where the crest stands before its place at the throw (m), its height over still water (m), its
height over the trough ahead (m, the case's H), and the face's angle (deg). With two libraries it also prints how far
their profiles differ where both have frames (the overlap: the T5 run against today's case).

Standard library only. Lengths in m at the case's h0; --scale F gives the game's size (lengths x F, times x sqrt(F),
Froude): the reference pool draws pool_straight_big at about 1.11.

usage: python3 t5_case_side.py [--scale F] FILE [FILE ...]
  FILE: a *_track.json (any level; a scout's reaches the whole run) or a *_library.json
examples (from the repository's root):
  python3 docs/research/wave-strategy-alternatives/t5_case_side.py \
    docs/research/pool-tube-runs/data/periodic_pool_straight_big_L13_scout_track.json \
    docs/research/pool-tube-runs/data/periodic_pool_straight_big_L13_library.json
  python3 docs/research/wave-strategy-alternatives/t5_case_side.py \
    docs/research/pool-tube-runs-t5/data/periodic_pool_far_big_L13_library.json \
    docs/research/pool-tube-runs/data/periodic_pool_straight_big_L13_library.json
"""
import json
import math
import sys

G = 9.81
BINS = [-6.0 + 0.5 * k for k in range(13)]  # -6.0 .. 0.0 s


def load(path):
    d = json.load(open(path))
    if isinstance(d.get("frames"), list) and d["frames"] and "profile" in d["frames"][0]:
        return library_rows(d, path)
    return track_rows(d, path)


def track_rows(d, path):
    """A crest track: tau from its own vertical, h0 from the track."""
    h0 = d["h0_m"]
    ts = math.sqrt(h0 / G)
    tv, xv = d["t_vertical"], d.get("x_vertical")
    rows = d["track"]
    if xv is None:  # a phase's track: its crest at vertical, interpolated
        xv = interp(rows, "x", tv)
    out = []
    for r in rows:
        out.append({"tau_s": (r["t"] - tv) * ts, "before_m": (xv - r["x"]) * h0, "crest_m": r["y"] * h0,
                    "H_m": (r["y"] - r["trough"]) * h0, "angle": r["angle"]})
    return {"name": path.split("/")[-1], "kind": f"track, level {d.get('level')}", "h0": h0, "rows": out}


def library_rows(d, path):
    """A library: tau as stored, the crest at tau 0 from the frame nearest it."""
    h0 = d["h0_m"]
    fr = [f for f in d["frames"] if f.get("profile")]
    x0 = min(fr, key=lambda f: abs(f["tau"]))["crest"][0]
    out = []
    for f in fr:
        p = f["profile"]
        out.append({"tau_s": f["tau_s"], "before_m": (x0 - f["crest"][0]) * h0, "crest_m": f["H"] * h0,
                    "H_m": f["H_trough"] * h0, "angle": steepest(p), "clean": not f["flags"],
                    "profile": [(x - x0, y) for x, y in p]})  # x from the crest at tau 0, as the game's case file
    return {"name": path.split("/")[-1], "kind": f"library, level {d.get('level')}", "h0": h0, "rows": out}


def steepest(p):
    """The face's steepest slope over points crest (32) to toe (112), between points at least 0.05 h0 apart, deg
    (ruling 17's probe reads the drawn profile the same way)."""
    best = 0.0
    for a in range(32, 112):
        for b in range(a + 1, 113):
            dx, dy = p[b][0] - p[a][0], p[b][1] - p[a][1]
            if math.hypot(dx, dy) >= 0.05:
                best = max(best, math.degrees(math.atan2(abs(dy), abs(dx))))
                break
    return best


def interp(rows, key, t):
    for a, b in zip(rows[:-1], rows[1:]):
        if a["t"] <= t <= b["t"]:
            w = (t - a["t"]) / (b["t"] - a["t"]) if b["t"] > a["t"] else 0.0
            return a[key] + w * (b[key] - a[key])
    return None


def at(rows, tau_s, key):
    for a, b in zip(rows[:-1], rows[1:]):
        if a["tau_s"] <= tau_s <= b["tau_s"]:
            w = (tau_s - a["tau_s"]) / (b["tau_s"] - a["tau_s"]) if b["tau_s"] > a["tau_s"] else 0.0
            return a[key] + w * (b[key] - a[key])
    return None


def nearest(rows, tau_s):
    r = min(rows, key=lambda r: abs(r["tau_s"] - tau_s))
    return r if abs(r["tau_s"] - tau_s) < 0.02 else None


def main():
    args = sys.argv[1:]
    scale = 1.0
    if args[:1] == ["--scale"]:
        scale, args = float(args[1]), args[2:]
    if not args:
        sys.exit(__doc__)
    cases = [load(p) for p in args]
    ts = math.sqrt(scale)
    print(f"lengths x {scale:g}, times x {ts:.3f} (Froude); tau = s before the face goes vertical (the throw)")
    for c in cases:
        print(f"\n{c['name']} ({c['kind']}, h0 {c['h0']:g} m; frames tau {c['rows'][0]['tau_s']:.2f} to "
              f"{c['rows'][-1]['tau_s']:.2f} s)")
        print("  tau s | crest before its throw place, m | crest over still water, m | H over the trough ahead, m | face, deg")
        for b in BINS:
            tau = b / ts  # the case's own seconds for the game's
            v = [at(c["rows"], tau, k) for k in ("before_m", "crest_m", "H_m", "angle")]
            if v[0] is None:
                print(f"  {b:5.1f} | —")
                continue
            print(f"  {b:5.1f} | {v[0] * scale:6.1f} | {v[1] * scale:5.2f} | {v[2] * scale:5.2f} | {v[3]:4.0f}")
    libs = [c for c in cases if c["kind"].startswith("library")]
    if len(libs) >= 2:
        a, b = libs[0], libs[1]
        print(f"\nThe overlap: {a['name']} against {b['name']} (the same tau, clean frames of both; each profile from its "
              "own crest at tau 0, point by point)")
        print("  tau s | frames | point gap, m: median, 90 % (medians over the frames) | crest place gap, m | H gap, m")
        for lo in BINS + [0.5, 1.0, 1.5, 2.0, 2.5, 3.0]:
            hi = lo + 0.5
            gaps, places, hs, n = [], [], [], 0
            for r in a["rows"]:
                if not (lo <= r["tau_s"] < hi):
                    continue
                s = nearest(b["rows"], r["tau_s"])
                if s is None or not (r["clean"] and s["clean"]):
                    continue
                n += 1
                g = sorted(math.hypot(p[0] - q[0], p[1] - q[1]) for p, q in zip(r["profile"], s["profile"]))
                gaps.append((g[len(g) // 2], g[int(0.9 * (len(g) - 1))]))
                places.append(abs(r["before_m"] - s["before_m"]))
                hs.append(abs(r["H_m"] - s["H_m"]))
            if n:
                med = lambda v: sorted(v)[len(v) // 2]  # noqa: E731
                print(f"  {lo:5.1f} | {n:3d} | {med([g[0] for g in gaps]) * a['h0']:.3f}, {med([g[1] for g in gaps]) * a['h0']:.3f} | "
                      f"{med(places):.3f} | {med(hs):.3f}")


if __name__ == "__main__":
    main()
