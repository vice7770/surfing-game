"""Overview of a periodic.c run: the surface along the whole domain at chosen times.

usage: python3 train_overview.py RUN_DIR LEVEL DOMAIN H0_M OUT_PNG T1 [T2 ...]
Draws the bed and the surface (main chain and closed loops) at the frames nearest each time,
stacked, in metres, so where each crest breaks and what stands ahead of it can be read off.
"""
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from interface import frame, list_frames, read_facets

run, level, L0, h0, out = sys.argv[1], int(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
times = [float(t) for t in sys.argv[6:]]
dx = L0 / 2 ** level
frames = list_frames(run)
bed = read_facets(run + "/bed.dat")
fig, axes = plt.subplots(len(times), 1, figsize=(11, 1.55 * len(times)), dpi=130, sharex=True)
if len(times) == 1:
    axes = [axes]
for ax, t in zip(axes, times):
    tt, path = min(frames, key=lambda f: abs(f[0] - t))
    fr = frame(path, dx, L0)
    for s in bed:
        ax.plot(s[:, 0] * h0, s[:, 1] * h0, color="#865", lw=1.0)
    if fr:
        ax.plot(fr["main"][:, 0] * h0, fr["main"][:, 1] * h0, color="#248", lw=1.0)
        for l in fr["closed"]:
            if l[:, 1].mean() > -0.2:
                ax.plot(l[:, 0] * h0, l[:, 1] * h0, color="#248", lw=0.8)
    ax.axhline(0, color="#999", lw=0.5, ls=":")
    ax.set_ylim(-0.4 * h0, 0.45 * h0)
    ax.text(0.005, 0.85, f"t = {tt:.1f} √(h0/g) = {tt * (h0 / 9.81) ** 0.5:.1f} s", transform=ax.transAxes, fontsize=7)
    ax.tick_params(labelsize=6)
axes[-1].set_xlabel("m", fontsize=7)
fig.tight_layout()
fig.savefig(out)
print("wrote", out)
