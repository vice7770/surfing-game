"""A train of first-order cnoidal waves for periodic.c's initial condition.

The shallow-water periodic wave (Korteweg-de Vries, first order; e.g. Fenton 1979 or the
Coastal Engineering Manual, Part II-1): with depth h, height H and elliptic parameter m,
  wavelength  L = 4 K(m) h sqrt(m h / (3 H))                (Ursell number H L^2/h^3 = 16 m K^2 / 3)
  trough      eta_t = (H/m) (1 - m - E(m)/K(m))             (so the mean level is still water)
  profile     eta(x) = eta_t + H cn^2(2 K (x - x_crest) / L | m)
  celerity    c / sqrt(g h) = 1 + (H/h) (1/m - 1/2 - 3 E / (2 m K))
and m is found so that L / c equals the period.

Units as in slope.c: h0 = 1, g = 1. The train has `crests` crests with a trough at x = 0 (the left
wall); ahead of the leading crest it ends at the first zero crossing, still water beyond. So the
leading crest meets still water, like a solitary wave, and every later crest has a real trough ahead.

usage: python3 cnoidal_train.py H_OVER_H0 PERIOD_S H0_M CRESTS OUT_DIR
writes OUT_DIR/train.dat (x, eta, deta/dx) and OUT_DIR/train.json (m, L, c, trough, crests, front).
"""
import json
import math
import sys

import numpy as np
from scipy.optimize import brentq
from scipy.special import ellipe, ellipj, ellipk, ellipkm1


def cnoidal(Hh, Tnd):
    """m, L, c, trough for height Hh (in h) and period Tnd (in sqrt(h/g))."""
    def params(m1):          # m1 = 1 - m, for precision near the solitary limit
        m = 1.0 - m1
        K = ellipkm1(m1)
        E = ellipe(m)
        L = 4.0 * K * math.sqrt(m / (3.0 * Hh))
        c = 1.0 + Hh * (1.0 / m - 0.5 - 1.5 * E / (m * K))
        return m, K, E, L, c

    def f(lm1):
        m, K, E, L, c = params(10.0 ** lm1)
        return L / c - Tnd

    lm1 = brentq(f, -14.0, -1e-6)
    m, K, E, L, c = params(10.0 ** lm1)
    trough = (Hh / m) * (1.0 - m - E / K)
    return {"m": m, "m1": 1.0 - m, "K": K, "E": E, "L": L, "c": c, "trough": trough, "crest": trough + Hh}


def main():
    Hh, T, h0, crests, out = float(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
    Tnd = T * math.sqrt(9.81 / h0)
    p = cnoidal(Hh, Tnd)
    L, m, K = p["L"], p["m"], p["K"]
    # crest n (0 = leading) at x_n = (crests - n - 0.5) L: a trough sits at the wall, x = 0
    xc = [(crests - n - 0.5) * L for n in range(crests)]
    dx = 0.002
    x = np.arange(0.0, xc[0] + L / 2, dx)
    sn, cn, dn, ph = ellipj(2.0 * K * (x - xc[0]) / L, m)
    eta = p["trough"] + Hh * cn ** 2
    deta = Hh * 2.0 * cn * (-sn * dn) * (2.0 * K / L)
    # end the train at the first zero crossing ahead of the leading crest
    ahead = np.where((x > xc[0]) & (eta <= 0.0))[0]
    front = x[ahead[0]] if len(ahead) else x[-1]
    keep = x <= front
    x, eta, deta = x[keep], eta[keep], deta[keep]
    eta[-1], deta[-1] = 0.0, 0.0
    np.savetxt(f"{out}/train.dat", np.column_stack([x, eta, deta]), fmt="%.6f")
    mean = float(np.trapezoid(eta[x <= xc[-1] + L / 2], x[x <= xc[-1] + L / 2]) / (xc[-1] + L / 2)) if crests > 0 else 0.0
    info = dict(p, H_over_h0=Hh, period_s=T, period_nd=Tnd, h0_m=h0, crests_x=xc, front=float(front),
                rows=int(len(x)), mean_level_check=mean, wavelength_m=L * h0, trough_m=p["trough"] * h0)
    json.dump(info, open(f"{out}/train.json", "w"), indent=1)
    print(json.dumps({k: (round(v, 5) if isinstance(v, float) else v) for k, v in info.items() if k != "crests_x"}, indent=1))
    print("crests at", [round(v, 3) for v in xc], "front at", round(float(front), 3))


if __name__ == "__main__":
    main()
