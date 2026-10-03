"""The jet's water against the crest's water it could come from, at the frame the face goes vertical.

For the game's lip-jet source rule: how large a share of the crest's water a throw must take to
match the simulated jet. Two references:
  - still water level (y = 0);
  - the trough ahead, crest - H, where H is the crest's height over the lowest surface within
    `ahead` h0 in front of it (the game takes H to the trough half a wavelength ahead).
The window is the contiguous run of surface through the crest standing at least crest - H/2.

usage: python3 source_share.py RUN_DIR LEVEL DOMAIN [AHEAD]
Needs RUN_DIR_metrics.json from metrics.py (t_vertical, and A_J at the last frame before impact).
"""
import json
import sys

import numpy as np

from interface import frame, list_frames


def surface_profile(main, dx):
    """Single-valued top surface y(x) on a regular grid: the highest crossing in each column."""
    x0, x1 = main[:, 0].min(), main[:, 0].max()
    xs = np.arange(x0, x1, dx)
    ys = np.full_like(xs, np.nan)
    seg_a, seg_b = main[:-1], main[1:]
    for k, xq in enumerate(xs):
        lo = np.minimum(seg_a[:, 0], seg_b[:, 0])
        hi = np.maximum(seg_a[:, 0], seg_b[:, 0])
        m = (lo <= xq) & (hi > xq)
        if not m.any():
            continue
        a, b = seg_a[m], seg_b[m]
        t = (xq - a[:, 0]) / np.where(b[:, 0] != a[:, 0], b[:, 0] - a[:, 0], 1.0)
        ys[k] = (a[:, 1] + t * (b[:, 1] - a[:, 1])).max()
    ok = ~np.isnan(ys)
    return xs[ok], ys[ok]


def window(xs, ys, ic, level):
    """Indices of the contiguous run through ic with ys >= level."""
    i0 = ic
    while i0 > 0 and ys[i0 - 1] >= level:
        i0 -= 1
    i1 = ic
    while i1 < len(ys) - 1 and ys[i1 + 1] >= level:
        i1 += 1
    return i0, i1


def analyse(run, level, L0, ahead=3.0):
    met = json.load(open(run.rstrip("/") + "_metrics.json"))
    dx = L0 / 2 ** level
    tv = met["t_vertical"]
    frames = list_frames(run)
    t, path = min(frames, key=lambda f: abs(f[0] - tv))
    fr = frame(path, dx, L0)
    xs, ys = surface_profile(fr["main"], dx)
    ic = int(np.argmax(ys))
    crest, xc = ys[ic], xs[ic]
    front = (xs > xc) & (xs <= xc + ahead)
    trough = ys[front].min()
    H = crest - trough
    i0, i1 = window(xs, ys, ic, crest - H / 2)
    w = slice(i0, i1 + 1)
    above_trough = np.clip(ys[w] - trough, 0, None).sum() * dx
    above_swl_win = np.clip(ys[w], 0, None).sum() * dx
    near = (xs >= xc - 1.5 / 7.0) & (xs <= xc + 1.5 / 7.0)   # the round-6 +-1.5 m at h0 = 7 m, for reference
    AJ = met["impact"]["A_J"]
    HI = met["impact"]["H_I"]
    out = {
        "run": run, "frame_t": t, "t_vertical": tv,
        "crest_y_h0": crest, "trough_ahead_y_h0": trough, "H_h0": H, "H_I_h0": HI,
        "window_h0": [float(xs[i0]), float(xs[i1])], "window_width_h0": float(xs[i1] - xs[i0] + dx),
        "A_J_over_H2": AJ / H ** 2,
        "above_trough_in_window_over_H2": above_trough / H ** 2,
        "above_swl_in_window_over_H2": above_swl_win / H ** 2,
        "share_vs_trough": AJ / above_trough if above_trough > 0 else None,
        "share_vs_swl": AJ / above_swl_win if above_swl_win > 0 else None,
        "above_swl_pm1.5m_at_h0_7m_over_H2": np.clip(ys[near], 0, None).sum() * dx / H ** 2,
    }
    return out


if __name__ == "__main__":
    run, level, L0 = sys.argv[1], int(sys.argv[2]), float(sys.argv[3])
    ahead = float(sys.argv[4]) if len(sys.argv) > 4 else 3.0
    print(json.dumps(analyse(run, level, L0, ahead), indent=1, default=float))
