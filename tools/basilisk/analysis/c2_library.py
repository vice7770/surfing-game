#!/usr/bin/env python3
"""C2's case file from one periodic.c run (2026-11-13; docs/research/wave-strategy-alternatives/c2-plan.md, step 1, and
c2-step1.md): the whole breaking wave, from well before the throw to the bore, for the game's library (`WaveLibrary`, a
later step) to match each slice's state at the hand-over and to hand the bore back to the sea.

  python3 c2_library.py RUN_DIR LEVEL DOMAIN SLOPE A0 H0_M TMIN XMIN [--vel-depths 0,4] [--q-dx 0.25] [--q-every 0.1]
                        [--out FILE]

RUN_DIR is a finished phase 2 with RUN_DIR_plunge.json (plunge_measure.py), params.txt and facets/; vel/ (VELOUT) and q/
(QOUT) when the build had them. The arguments as periodic_library.py's (TMIN: the first frame, sqrt(h0/g); XMIN: the
crest is looked for past it, h0). Writes FILE (default RUN_DIR_c2.json.gz, gzipped JSON) and prints a summary.

Per frame (every fine frame from TMIN to the run's end):
- the profile, 128 points with periodic_library.py's landmarks at its indices (back 0, crest 32, lip 64, throat 88,
  toe 112, front 127). Before the throw (tau < 0) the crest-to-toe arc is spaced by arc length with the lip and the
  throat at their shares of that arc in the throw's frame (the first frame at tau >= 0), not at the frame's own lip mark,
  which is noise on a face of nearly even slope (ruling 19). From the throw on, the frame's own landmarks, as today's
  library. `use`: "own" for a clean frame or one whose only flag is jump_lip before the throw (its own curve is sound:
  ruling 20), "refill" for any other flag (the reader rebuilds it from the nearest "own" frames by arc);
- the path row: the crest (x, y), the trough within 3 h0 ahead, H over it, the still depth under the crest d, H/d, the
  crest's speed (a least-squares slope over +-0.1 sqrt(h0/g) of frames) and the face's steepest angle (90 = vertical);
- the water's velocity at two depths at every profile point (VELOUT's samples: index 0 is 1.5 cells under the surface,
  1..4 are periodic.c's VELDEPTHS 0.01, 0.02, 0.05, 0.1 h0), the nearest surface cell's, null where none is within
  0.03 h0 or the sample is not in water (profile_velocity.py's rule);
Every --q-every (sqrt(h0/g)), from QOUT, resampled to --q-dx (h0) bins over the phase's window:
- the columns: x, the water's volume per width h, its flux q, the top, and the air share under the top
  (air / (air + h));
- from touchdown on, the bore: its front (the most shoreward column whose top stands 0.05 h0 over the water ahead,
  within 12 h0 of the touchdown place), and its top and air share from the touchdown place to the front.
And the QOUT mass check over every fine frame: the domain's water (the sum of h over its bins) against the first frame's.

Units as the run's: h0 = 1, g = 1; x from the run's left wall, y = 0 still water.
"""
import argparse
import gzip
import json
import math
import os
import sys

import numpy as np

import metrics
from crest_track import bed_depth, read_params
from interface import IDX, N_PTS, arclen, resample_piece
from periodic_library import build
from profile_velocity import read_rows

WET = 0.5


def piece_by_arc(p, s0, s1, m, include_end):
    """m points from arc place s0 to s1 along polyline p (by arc length, end included if include_end)."""
    s = arclen(p)
    t = np.linspace(s0, s1, m + (0 if include_end else 1))
    if not include_end:
        t = t[:-1]
    return np.column_stack([np.interp(t, s, p[:, 0]), np.interp(t, s, p[:, 1])])


def arc_profile(main, lm, lip_share, throat_share):
    """128 points: back to crest and toe to front as periodic_library.py's; crest to toe by arc with the lip and the
    throat at the given shares of that arc."""
    c, toe = lm["crest"], lm["toe"]
    seg = main[c:toe + 1]
    total = arclen(seg)[-1]
    parts = [resample_piece(main[lm["back"]:c + 1], IDX["crest"] - IDX["back"], False),
             piece_by_arc(seg, 0.0, lip_share * total, IDX["lip"] - IDX["crest"], False),
             piece_by_arc(seg, lip_share * total, throat_share * total, IDX["throat"] - IDX["lip"], False),
             piece_by_arc(seg, throat_share * total, total, IDX["toe"] - IDX["throat"], False),
             resample_piece(main[toe:lm["front"] + 1], IDX["front"] - IDX["toe"] + 1, True)]
    out = np.vstack(parts)
    assert len(out) == N_PTS, len(out)
    return out


def shares(main, lm):
    seg = main[lm["crest"]:lm["toe"] + 1]
    s = arclen(seg)
    total = s[-1] if s[-1] > 0 else 1.0
    return float(s[lm["lip"] - lm["crest"]] / total), float(s[lm["throat"] - lm["crest"]] / total)


def vel_grid(rows, cell):
    """The wet surface cells on a search grid of cell `cell` (h0)."""
    grid = {}
    for i, r in enumerate(rows):
        if r[7] >= WET:
            grid.setdefault((math.floor(r[0] / cell), math.floor(r[1] / cell)), []).append(i)
    return grid


def vel_nearest(rows, grid, cell, tol, x, y):
    bx, by = math.floor(x / cell), math.floor(y / cell)
    reach = int(math.ceil(tol / cell))
    best, bd = None, tol * tol
    for i in range(bx - reach, bx + reach + 1):
        for j in range(by - reach, by + reach + 1):
            for k in grid.get((i, j), ()):
                d = (rows[k][0] - x) ** 2 + (rows[k][1] - y) ** 2
                if d < bd:
                    best, bd = k, d
    return best


def read_q(path):
    a = np.loadtxt(path, ndmin=2)
    return a if a.size and a.shape[1] >= 6 else None


def speed(ts, xs, k, half=0.1):
    sel = [j for j in range(len(ts)) if abs(ts[j] - ts[k]) <= half + 1e-9]
    if len(sel) < 3:
        return None
    t = np.array([ts[j] for j in sel])
    x = np.array([xs[j] for j in sel])
    return float(np.polyfit(t, x, 1)[0])


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    for name in ("run", "level", "domain", "slope", "a0", "h0", "tmin", "xmin"):
        ap.add_argument(name)
    ap.add_argument("--vel-depths", default="0,4")
    ap.add_argument("--q-dx", type=float, default=0.25)
    ap.add_argument("--q-every", type=float, default=0.1)
    ap.add_argument("--out")
    a = ap.parse_args()
    run, level, L0 = a.run.rstrip("/"), int(a.level), float(a.domain)
    slope, a0, h0_m, tmin, xmin = float(a.slope), float(a.a0), float(a.h0), float(a.tmin), float(a.xmin)
    p = read_params(run)
    cap = []
    lib = build(run, level, L0, slope, a0, h0_m, tmin, xmin, capture=cap)
    frames = lib["frames"]
    if not frames:
        sys.exit("c2_library.py: no frame")
    tv, ti = lib["t_vertical"], lib["t_impact"]
    # the throw's frame: the first at tau >= 0 (else the last); its lip and throat shares of the crest-to-toe arc
    k0 = next((k for k, fr in enumerate(frames) if fr["tau"] >= 0), len(frames) - 1)
    lip_share, throat_share = shares(cap[k0][1], cap[k0][2])
    lip_share = min(max(lip_share, 0.05), 0.9)
    throat_share = min(max(throat_share, lip_share + 0.02), 0.97)
    vel_idx = [int(v) for v in a.vel_depths.split(",")]
    # the path from the phase's crest track (crest_track.py, which follows the second crest by its own pace) when it is
    # there; else from the frames' landmarks (which can jump to another crest)
    tpath = os.path.join(run, "track.json")
    trows = json.load(open(tpath)).get("track") if os.path.exists(tpath) else None
    if trows:
        tt = np.array([r["t"] for r in trows])
        path_at = lambda t, key: float(np.interp(t, tt, [r[key] for r in trows]))  # noqa: E731
    ts = [fr["t"] for fr in frames]
    xs = [path_at(fr["t"], "x") if trows else fr["crest"][0] for fr in frames]
    vtol = max(0.03, 1.5 * lib["dx_h0"])
    vcell = max(0.02, lib["dx_h0"])
    out_frames, kinds = [], {"own": 0, "refill": 0}
    vel_files = vel_frames = 0
    for k, (fr, (t, mainc, lm)) in enumerate(zip(frames, cap)):
        flags = fr["flags"]
        pre = fr["tau"] < 0
        prof = None
        try:
            prof = arc_profile(mainc, lm, lip_share, throat_share) if pre else (np.array(fr["profile"]) if fr["profile"] else None)
        except Exception:  # noqa: BLE001
            flags = flags + ["arc_failed"]
        use = "own" if (not flags or (pre and set(flags) == {"jump_lip"})) and prof is not None else "refill"
        kinds[use] += 1
        if trows:
            x, y, trough, face = (path_at(t, k) for k in ("x", "y", "trough", "angle"))
        else:
            (x, y), trough, face = fr["crest"], fr["trough"], metrics.face_angle(mainc, lm)
        d = bed_depth(p, x)
        H = y - trough
        row = {"t": round(t, 4), "tau": round(fr["tau"], 4), "phase": fr["phase"], "use": use, "flags": flags,
               "crest": [round(x, 5), round(y, 5)], "trough": round(trough, 5), "H": round(H, 5), "d": round(d, 5),
               "H_over_d": round(H / d, 5) if d > 0 else None, "speed": None, "face_deg": round(face, 2),
               "crest_mark": [round(fr["crest"][0], 5), round(fr["crest"][1], 5)],
               "profile": np.round(prof, 4).tolist() if prof is not None else None, "u": None, "v": None}
        c = speed(ts, xs, k)
        row["speed"] = round(c, 4) if c is not None else None
        vpath = os.path.join(run, "vel", "v%07.3f.dat" % t)
        if prof is not None and os.path.exists(vpath):
            vel_files += 1
            rows = read_rows(vpath)
            if rows:
                vel_frames += 1
                grid = vel_grid(rows, vcell)
                us, vs = [], []
                for px, py in prof:
                    j = vel_nearest(rows, grid, vcell, vtol, px, py)
                    if j is None:
                        us.append(None); vs.append(None)
                        continue
                    r = rows[j]
                    us.append([round(r[5 + 3 * i], 3) if r[7 + 3 * i] >= WET else None for i in vel_idx])
                    vs.append([round(r[6 + 3 * i], 3) if r[7 + 3 * i] >= WET else None for i in vel_idx])
                row["u"], row["v"] = us, vs
        out_frames.append(row)
    # the path table's checks near the break: d falling and H/d rising over tau -8..0 (smoothed over 0.5)
    pre_rows = [r for r in out_frames if -8.0 - 1e-9 <= r["tau"] < 0 and r["H_over_d"] is not None]
    mono = {}
    if len(pre_rows) > 10:
        tt = np.array([r["tau"] for r in pre_rows])
        for key in ("d", "H_over_d"):
            v = np.array([r[key] for r in pre_rows])
            sm = np.array([v[np.abs(tt - t0) <= 0.25].mean() for t0 in tt])
            dv = np.diff(sm)
            want = -1 if key == "d" else 1
            bad = dv * want < 0
            mono[key] = {"monotone": bool(not bad.any()), "share_wrong_way": round(float(bad.mean()), 4),
                         "largest_wrong_step": round(float(np.max(-dv * want)) if bad.any() else 0.0, 5),
                         "wrong_tau": [round(float(tt[i]), 3) for i in np.where(bad)[0][:20]]}
    # QOUT: the mass check (every fine frame), the columns and the bore (every q_every)
    qdir = os.path.join(run, "q")
    qout = None
    if os.path.isdir(qdir):
        names = sorted(f for f in os.listdir(qdir) if f.startswith("q") and f.endswith(".dat"))
        mass, cols, bore = [], [], []
        x0w = p.get("xwin0") if isinstance(p.get("xwin0"), float) else 0.0
        x1w = p.get("xwin1") if isinstance(p.get("xwin1"), float) else L0
        first = sorted(f for f in os.listdir(qdir) if f.endswith(".dat"))
        q0 = read_q(os.path.join(qdir, first[0])) if first else None
        qbw = float(q0[1, 0] - q0[0, 0]) if q0 is not None and len(q0) > 1 else a.q_dx
        qdx = max(a.q_dx, qbw)
        edges = np.arange(x0w, x1w + 1e-9, qdx)
        centres = 0.5 * (edges[:-1] + edges[1:])
        last_kept = None
        td_x = None
        prev_front = None
        if ti is not None:
            k1 = next((k for k, fr in enumerate(frames) if fr["t"] >= ti), None)
            td_x = frames[k1]["crest"][0] if k1 is not None else None
        for name in names:
            t = float(name[1:-4])
            q = read_q(os.path.join(qdir, name))
            if q is None:
                continue
            bw = q[1, 0] - q[0, 0] if len(q) > 1 else L0
            mass.append((t, float(q[:, 2].sum() * bw)))
            if t < tmin - 1e-9 or (last_kept is not None and t < last_kept + a.q_every - 1e-6):
                continue
            last_kept = t
            # resample: the volume and flux are averages over the bin; top the highest; air share from the summed parts
            which = np.digitize(q[:, 0], edges) - 1
            h = np.zeros(len(centres)); qq = np.zeros(len(centres)); air = np.zeros(len(centres))
            top = np.full(len(centres), -np.inf); n = np.zeros(len(centres))
            for i, b in enumerate(which):
                if 0 <= b < len(centres):
                    h[b] += q[i, 2]; qq[b] += q[i, 3]; air[b] += q[i, 5]; n[b] += 1; top[b] = max(top[b], q[i, 4])
            n[n == 0] = 1
            h, qq, air = h / n, qq / n, air / n
            share = np.where(air + h > 1e-9, air / np.maximum(air + h, 1e-9), 0.0)
            cols.append({"t": round(t, 4), "h": np.round(h, 4).tolist(), "q": np.round(qq, 4).tolist(),
                         "top": np.round(top, 4).tolist(), "air": np.round(share, 3).tolist()})
            if ti is not None and t >= ti and td_x is not None:
                # the bore's front: its steepest falling top (smoothed over 3 bins), followed from frame to frame (first
                # within 4 h0 ahead of touchdown, then within 0.5 behind to 2 h0 ahead of the last front)
                sm = np.convolve(np.where(np.isfinite(top), top, np.nan), np.ones(3) / 3, mode="same")
                grad = np.gradient(sm, centres)
                lo, hi = (td_x - 1.0, td_x + 4.0) if prev_front is None else (prev_front - 0.5, prev_front + 2.0)
                cand = np.where((centres >= lo) & (centres <= hi) & np.isfinite(grad))[0]
                front = float(centres[cand[np.argmin(grad[cand])]]) if cand.size and np.nanmin(grad[cand]) < -0.05 else None
                if front is not None:
                    prev_front = front
                if front is not None:
                    sel = (centres >= td_x - 1.0) & (centres <= front + 0.5)
                    bore.append({"t": round(t, 4), "front": round(float(front), 4),
                                 "x": [round(float(v), 3) for v in centres[sel]],
                                 "top": np.round(top[sel], 4).tolist(), "air": np.round(share[sel], 3).tolist()})
        if mass:
            m0 = mass[0][1]
            rel = [abs(m / m0 - 1.0) for _, m in mass]
            steps = [abs(mass[i + 1][1] / mass[i][1] - 1.0) for i in range(len(mass) - 1)]
            qout = {"frames": len(mass), "first_volume": m0, "drift_max": max(rel), "drift_end": rel[-1],
                    "step_max": max(steps) if steps else 0.0, "pass_0p1pc": max(rel) < 1e-3}
        bore_speed = None
        if len(bore) > 3:
            bt = np.array([b["t"] for b in bore]); bx = np.array([b["front"] for b in bore])
            bore_speed = round(float(np.polyfit(bt, bx, 1)[0]), 4)
        qout_block = {"x": np.round(centres, 4).tolist(), "dx": qdx, "every": a.q_every, "frames": cols,
                      "bore": bore, "bore_speed": bore_speed, "mass": qout}
    else:
        qout_block = None
    res = {"format": "c2-case 1", "run": os.path.basename(run), "level": level, "dx_h0": lib["dx_h0"], "h0_m": h0_m,
           "time_scale_s": lib["time_scale_s"], "A0": a0, "params": {k: v for k, v in p.items()},
           "t_vertical": tv, "t_touchdown": ti, "indices": IDX, "n_points": N_PTS,
           "arc": {"lip_share": round(lip_share, 4), "throat_share": round(throat_share, 4), "throw_frame_t": frames[k0]["t"]},
           "velocity_depths": [["1.5 cells", 0.01, 0.02, 0.05, 0.1][i] for i in vel_idx],
           "uses": kinds, "path_checks": mono, "stats": lib["stats"],
           "units": "h0 = 1, g = 1: x from the left wall, y = 0 still water, tau = t - t_vertical in sqrt(h0/g), u and v in "
                    "sqrt(g h0) in the run's fixed frame; q columns: h and q per unit width, top the highest water, air the "
                    "air share under the top",
           "frames": out_frames, "qout": qout_block}
    path = a.out or run + "_c2.json.gz"
    with gzip.open(path, "wt") as fh:
        json.dump(res, fh, separators=(",", ":"), default=float)
    m = (qout_block or {}).get("mass") or {}
    print(f"{os.path.basename(path)}: {len(out_frames)} frames (own {kinds['own']}, refill {kinds['refill']}), "
          f"tau {out_frames[0]['tau']:.2f} to {out_frames[-1]['tau']:.2f}; lip / throat shares at the throw "
          f"{lip_share:.3f} / {throat_share:.3f}; velocity on {vel_frames} of {vel_files} frames; path checks "
          + ", ".join(f"{k} monotone {v['monotone']} (wrong way {v['share_wrong_way']:.1%})" for k, v in mono.items())
          + (f"; QOUT {m.get('frames')} frames, mass drift max {m.get('drift_max', 0):.2e}, step max {m.get('step_max', 0):.2e}"
             if m else "; no QOUT")
          + (f"; bore {len(qout_block['bore'])} frames, front speed {qout_block['bore_speed']}" if qout_block else "")
          + f"; {os.path.getsize(path) / 1e6:.2f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
