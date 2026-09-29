"""Render a PNG strip of stages and the tube-size plot for one library.

usage: python3 render.py LIBRARY_JSON OUT_STRIP.png OUT_TUBE.png H_TARGET_M TITLE [BED_DAT]
"""
import json
import math
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from interface import IDX, read_facets

lib = json.load(open(sys.argv[1]))
strip_png, tube_png, Ht, title = sys.argv[2], sys.argv[3], float(sys.argv[4]), sys.argv[5]
bed = sys.argv[6] if len(sys.argv) > 6 else None
fr = lib["frames"]
tv, ti = lib["t_vertical"], lib["t_impact"]
run = lib["run"]

INK, MUTED, GRID = "#1f2328", "#6e7781", "#d0d7de"
C_SURF, C_WATER, C_BED = "#0b5cad", "#cfe3f7", "#8c6d46"
C_LM = {"crest": "#1a7f37", "lip": "#cf222e", "throat": "#8250df", "toe": "#bf8700"}

# choose stages: tau from -0.5 to ~ (tau_I + 1.5), 8 frames
tauI = ti - tv if ti else max(f["tau"] for f in fr)
targets = [-0.5, 0.0, 0.25 * tauI, 0.5 * tauI, 0.75 * tauI, tauI - 0.03, tauI + 0.5, tauI + 1.5]
chosen = []
for tt in targets:
    f = min(fr, key=lambda r: abs(r["tau"] - tt))
    if f not in chosen:
        chosen.append(f)

bedseg = read_facets(bed) if bed else None
fig, axs = plt.subplots(2, 4, figsize=(13, 4.6), sharey=True)
for ax, f in zip(axs.flat, chosen):
    cx = f["crest"][0]
    x0, x1 = cx - 1.6, cx + 1.6
    import os
    fpath = os.path.join(run, "facets", "f%07.3f.dat" % f["t"])
    seg = read_facets(fpath)
    if bedseg is not None:
        for s in bedseg:
            if x0 - 0.5 < s[0, 0] < x1 + 0.5:
                ax.plot(s[:, 0], s[:, 1], color=C_BED, lw=1.2)
    for s in seg:
        if x0 - 0.2 < s[0, 0] < x1 + 0.2:
            ax.plot(s[:, 0], s[:, 1], color=MUTED, lw=0.6)
    p = f["profile"]
    if p is not None:
        p = np.array(p)
        ax.plot(p[:, 0], p[:, 1], "-", color=C_SURF, lw=1.3)
        ax.plot(p[:, 0], p[:, 1], ".", color=C_SURF, ms=1.8)
        for k, c in C_LM.items():
            ax.plot(*p[IDX[k]], "o", color=c, ms=4.5, mec="white", mew=0.6, zorder=5)
    if f.get("cavity32"):
        c = np.array(f["cavity32"])
        ax.plot(c[:, 0], c[:, 1], "--", color=C_LM["throat"], lw=0.9)
    ax.set_xlim(x0, x1)
    ax.set_ylim(-0.45, 0.95 * max(0.8, max(r["H"] for r in fr)) + 0.05)
    ax.set_aspect("equal")
    ax.set_title(f"τ = {f['tau']:+.2f}  ({f['tau_s']:+.2f} s)" + ("  flags" if f["flags"] else ""), fontsize=8.5, color=INK)
    ax.tick_params(labelsize=7, colors=MUTED)
    for sp in ax.spines.values():
        sp.set_color(GRID)
for ax in axs.flat[len(chosen):]:
    ax.axis("off")
hs = [plt.Line2D([], [], color=c, marker="o", ls="", label=k) for k, c in C_LM.items()]
hs += [plt.Line2D([], [], color=C_SURF, label="128-pt profile"), plt.Line2D([], [], color=MUTED, label="VOF facets"),
       plt.Line2D([], [], color=C_LM["throat"], ls="--", label="cavity (32 pt)")]
fig.legend(handles=hs, loc="lower center", ncol=7, fontsize=8, frameon=False)
fig.suptitle(title + "   (x, y in h0; τ = t − t_vertical in √(h0/g); seconds at h0 = %.1f m)" % lib["h0_m"], fontsize=9.5, color=INK)
fig.tight_layout(rect=(0, 0.05, 1, 0.95))
fig.savefig(strip_png, dpi=85)

# ---- tube plot ----
h0 = lib["h0_m"]
rows = [r for r in fr if r["tube"] and not ({"surface_torn", "order"} & set(r["flags"]))]
_op = [r for r in rows if r["phase"] == "open"]
_Aref = _op[-1]["tube"]["A"] if _op else 0
rows = [r for r in rows if not (r["phase"] == "open" and r["tube"]["A"] < 0.2 * _Aref)]  # drop sliver-stage voids
tau = np.array([r["tau"] for r in rows])
LW = np.array([r["tube"]["L"] / max(1e-9, r["tube"]["W"]) for r in rows])
HI = [r["H"] for r in fr if abs(r["tau"] - (tauI - 0.03)) < 0.05]
HI = HI[0] if HI else max(r["H"] for r in fr)
sc = Ht / HI  # metres per h0 unit at H_I = Ht
tsc = math.sqrt(sc / 9.81)
fig, (a1, a2) = plt.subplots(1, 2, figsize=(11, 3.8))
a1.axhspan(1.42, 3.43, color="#eaeef2", label="Mead & Black 2001 field L/W (1.42–3.43)")
op = np.array([r["phase"] == "open" for r in rows], dtype=bool)  # stays boolean when empty
a1.plot(tau[op] * tsc, LW[op], "o", ms=3, color=C_SURF, label="open tube (void ≥ 20 % of touchdown area)")
a1.plot(tau[~op] * tsc, LW[~op], "s", ms=3, color=C_LM["throat"], label="after touchdown (enclosed cavity)")
a1.axvline(tauI * tsc, color=C_LM["lip"], lw=0.8, ls=":")
a1.set_xlabel(f"τ, s at H_I = {Ht:g} m", fontsize=9)
a1.set_ylabel("void L/W (vortex ratio)", fontsize=9)
a1.set_ylim(0, 6)
a1.legend(fontsize=7.5, frameon=False, loc="upper right")
a2.plot(tau[op] * tsc, np.array([r["tube"]["L"] for r in rows])[op] * sc, "o", ms=3, color=C_SURF, label="void length L (m)")
a2.plot(tau[op] * tsc, np.array([r["tube"]["height"] for r in rows])[op] * sc, "o", ms=3, color=C_LM["crest"], label="void height (m)")
a2.plot(tau[~op] * tsc, np.array([r["tube"]["L"] for r in rows])[~op] * sc, "s", ms=3, color=C_SURF, alpha=0.45)
a2.plot(tau[~op] * tsc, np.array([r["tube"]["height"] for r in rows])[~op] * sc, "s", ms=3, color=C_LM["crest"], alpha=0.45)
Topen = tauI * tsc
c_sr = 3.19  # Surf Ranch along-crest speed of the break point, m/s (along-crest-barrel.md)
a2.axhspan(2.7, 3.6, xmin=0, xmax=1, color="#fff1d6",
           label="Surf Ranch open curl along crest, 2.7–3.6 m")
a2.plot([Topen], [Topen * c_sr], "D", color=C_LM["lip"], ms=6,
        label=f"this run: T_open × 3.19 m/s = {Topen * c_sr:.2f} m")
a2.axvline(Topen, color=C_LM["lip"], lw=0.8, ls=":")
a2.set_xlabel(f"τ, s at H_I = {Ht:g} m", fontsize=9)
a2.set_ylabel("m", fontsize=9)
a2.legend(fontsize=7.5, frameon=False, loc="upper left")
for a in (a1, a2):
    a.tick_params(labelsize=8)
    for sp in a.spines.values():
        sp.set_color(GRID)
fig.suptitle(title + f"  — tube size, scaled so H_I = {Ht:g} m (h0 = {sc:.2f} m, T_open = {Topen:.2f} s)", fontsize=9.5)
fig.tight_layout()
fig.savefig(tube_png, dpi=85)
print("H_I", HI, "scale m/h0", sc, "T_open s", Topen)
