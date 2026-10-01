"""Interface tools for the Breakline round-6 Basilisk runs.

Reads Basilisk output_facets files (PLIC segments), chains them into polylines,
finds the main free surface, bubbles and droplets, the overturn landmarks, the
Pick & Feddersen style overturn metrics, and resamples each frame to 128 points
with crest, lip tip, throat and toe at fixed indices.
"""
import glob
import math
import os
import re

import numpy as np
from scipy.spatial import cKDTree

# Fixed landmark indices in the 128-point profile (swept-barrel-build.md).
N_PTS = 128
IDX = {"back": 0, "crest": 32, "lip": 64, "throat": 88, "toe": 112, "front": 127}


def read_facets(path):
    pts = []
    with open(path) as fh:
        cur = []
        for line in fh:
            s = line.split()
            if len(s) >= 2:
                cur.append((float(s[0]), float(s[1])))
            else:
                if len(cur) == 2:
                    pts.append(cur)
                cur = []
        if len(cur) == 2:
            pts.append(cur)
    if not pts:
        return np.zeros((0, 2, 2))
    seg = np.array(pts)
    # drop degenerate segments
    keep = np.hypot(*(seg[:, 1] - seg[:, 0]).T) > 1e-9
    return seg[keep]


def chain(seg, tol):
    """Join segments whose endpoints lie within tol (mutual nearest). Returns
    a list of (polyline Nx2, closed flag)."""
    n = len(seg)
    if n == 0:
        return []
    E = seg.reshape(-1, 2)  # endpoint 2i = seg i start, 2i+1 = end
    tree = cKDTree(E)
    d, j = tree.query(E, k=4)
    nb = -np.ones(2 * n, dtype=int)
    best = np.full(2 * n, np.inf)
    for k in range(2 * n):
        for dd, jj in zip(d[k], j[k]):
            if jj == k or jj // 2 == k // 2 or dd > tol:
                continue
            best[k], nb[k] = dd, jj
            break
    # keep mutual links only
    link = -np.ones(2 * n, dtype=int)
    for k in range(2 * n):
        m = nb[k]
        if m >= 0 and nb[m] == k:
            link[k] = m
    used = np.zeros(n, bool)
    lines = []
    for s0 in range(n):
        if used[s0]:
            continue
        # walk backwards from s0's start to find an open end
        s, e = s0, 0  # e: endpoint index we arrived at (0 start / 1 end); walk out via other end
        start_s, start_e = s0, 0
        seen = {s0}
        while True:
            m = link[2 * s + e]
            if m < 0:
                break
            s2 = m // 2
            if s2 in seen:
                break
            seen.add(s2)
            s, e = s2, 1 - (m % 2)
        start_s, start_e = s, e  # start_e is the free endpoint of start_s
        # walk forward
        poly = [seg[start_s][start_e], seg[start_s][1 - start_e]]
        used[start_s] = True
        s, e = start_s, 1 - start_e
        closed = False
        while True:
            m = link[2 * s + e]
            if m < 0:
                break
            s2 = m // 2
            if used[s2]:
                closed = s2 == start_s
                break
            used[s2] = True
            e2 = m % 2
            poly.append(seg[s2][1 - e2])
            s, e = s2, 1 - e2
        lines.append((np.array(poly), closed))
    return lines


def poly_area(p):
    x, y = p[:, 0], p[:, 1]
    return 0.5 * (np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))


def join_open(lines, gap):
    """Greedily join any two open chains whose ends are within `gap` (heals tears
    in the PLIC chain, e.g. at refinement-level jumps), closest pair first."""
    opens = [l for l, c in lines if not c]
    closed = [(l, c) for l, c in lines if c]
    while len(opens) > 1:
        ends = np.array([[o[0], o[-1]] for o in opens]).reshape(-1, 2)
        tree = cKDTree(ends)
        pairs = tree.query_pairs(gap, output_type="ndarray")
        pairs = [p for p in pairs if p[0] // 2 != p[1] // 2]
        if not pairs:
            break
        d = [math.hypot(*(ends[a] - ends[b])) for a, b in pairs]
        a, b = pairs[int(np.argmin(d))]
        i, ea = a // 2, a % 2
        j, eb = b // 2, b % 2
        A, B = opens[i], opens[j]
        if ea == 0:
            A = A[::-1]  # make A's joining end its last point
        if eb == 1:
            B = B[::-1]  # make B's joining end its first point
        merged = np.vstack([A, B])
        opens = [o for k, o in enumerate(opens) if k not in (i, j)] + [merged]
    return [(o, False) for o in opens] + closed


def frame(path, dx, L0):
    """Return dict with main surface (ordered left->right), closed loops, stray opens."""
    seg = read_facets(path)
    lines = chain(seg, tol=0.6 * dx)
    lines = join_open(lines, gap=3.0 * dx)
    opens = [l for l, c in lines if not c]
    closed = [l for l, c in lines if c]
    if not opens:
        return None
    # main surface: the open chain with the largest x extent
    im = max(range(len(opens)), key=lambda k: opens[k][:, 0].max() - opens[k][:, 0].min())
    main = opens[im]
    if main[0, 0] > main[-1, 0]:
        main = main[::-1]
    strays = []
    for k, l in enumerate(opens):
        if k == im:
            continue
        if len(l) > 8 and math.hypot(*(l[0] - l[-1])) < 4 * dx:
            closed.append(l)  # nearly closed loop: a bubble, droplet or the tube cavity
        else:
            strays.append(l)
    span = (main[:, 0].min(), main[:, 0].max())
    return {"main": main, "closed": closed, "strays": strays, "span": span,
            "ok_span": span[0] < 0.05 * L0 and span[1] > 0.95 * L0}


def crossings_y(main, xq):
    """All y where the main surface crosses the vertical x = xq."""
    x, y = main[:, 0], main[:, 1]
    ys = []
    for i in range(len(x) - 1):
        a, b = x[i] - xq, x[i + 1] - xq
        if a == 0:
            ys.append(y[i])
        elif a * b < 0:
            t = a / (a - b)
            ys.append(y[i] + t * (y[i + 1] - y[i]))
    return sorted(ys)


def arclen(p):
    return np.concatenate([[0], np.cumsum(np.hypot(*np.diff(p, axis=0).T))])


def landmarks(main, hs_level=0.0, back_dist=2.0, front_dist=1.0, xmin_search=None, turn_frac=0.03, face_floor=None):
    """Landmarks on the main surface (indices into main).
    crest  = highest point;
    lip    = after the crest, the most forward (max x) point before the surface
             turns back (the jet tip); if the surface never turns back, the
             steepest face point;
    throat = after the lip, the most recessed (min x) point of the face under the
             lip (LH82 x' = 0); equals lip when not overturned;
    toe    = after the throat, the first point where the face has come down to
             within 10 % of the crest height of the water level ahead and is
             flatter than 1:4;
    back/front = window ends, back_dist behind the crest and front_dist past the toe (h0 units).
    turn_frac: how far (a fraction of the crest height) the surface must turn back to count as overturned; a
        larger value walks past small undulations on a big curl's top to the jet's real tip.
    face_floor: if set, the steepest face point (not overturned) is looked for only at least this fraction of the
        crest height above the water level, so a drained step ahead can't take it.
    """
    x, y = main[:, 0], main[:, 1]
    lo = 0 if xmin_search is None else np.searchsorted(x, xmin_search)  # approx
    ic = lo + int(np.argmax(y[lo:]))
    n = len(x)
    # walk forward from crest while x keeps growing (allow tiny noise)
    j = ic
    xmax_i = ic
    overturned = False
    Hc0 = max(y[ic] - hs_level, 0.05)
    while j < n - 1:
        j += 1
        if y[j] - hs_level < 0.05 * Hc0 and x[j] > x[xmax_i]:
            break  # reached the water ahead of the face: no overhang
        if x[j] > x[xmax_i]:
            xmax_i = j
        elif x[xmax_i] - x[j] > turn_frac * Hc0:
            overturned = True
            break
    if overturned:
        il = xmax_i
        # throat: min x after the lip, before x climbs past the lip again
        k = il
        ith = il
        while k < n - 1:
            k += 1
            if x[k] < x[ith]:
                ith = k
            if x[k] > x[il] + 0.02:
                break
        # bounded search: the throat lies before the face returns below the tip
    else:
        # steepest point of the front face (max |dy/dx|, face descending) below the crest
        seg_end = min(n - 1, ic + 400)
        dxs = np.diff(x[ic:seg_end + 1])
        dys = np.diff(y[ic:seg_end + 1])
        ang = np.arctan2(-dys, dxs)  # descending face -> positive
        if face_floor is not None and len(ang):
            high = (y[ic:seg_end] - hs_level) >= face_floor * max(y[ic] - hs_level, 0.05)
            ang = np.where(high, ang, -np.inf)
        k = int(np.argmax(ang)) if len(ang) else 0
        il = ith = ic + k
    Hc = y[ic] - hs_level
    # toe
    it = ith
    k = ith
    xtip = x[il]
    while k < n - 2:
        k += 1
        if overturned and x[k] < xtip:
            continue
        if y[k] - hs_level < 0.1 * Hc:
            sl = abs((y[k + 1] - y[k]) / max(1e-9, x[k + 1] - x[k]))
            if x[k + 1] > x[k] and sl < 0.25:
                it = k
                break
    else:
        it = n - 1
    if it == ith:
        it = min(n - 1, ith + 1)
    ib = int(np.searchsorted(x[:ic + 1], x[ic] - back_dist))  # x increasing behind crest
    ib = max(0, min(ib, ic))
    # front end: first point after toe with x > x_toe + front_dist
    iff = it
    while iff < n - 1 and x[iff] < x[it] + front_dist:
        iff += 1
    return {"back": ib, "crest": ic, "lip": il, "throat": ith, "toe": it, "front": iff,
            "overturned": overturned}


def resample_piece(p, m, include_end):
    """m points along polyline p by arc length (end included if include_end)."""
    if len(p) < 2:
        return np.repeat(p[:1], m, axis=0)
    s = arclen(p)
    if s[-1] <= 0:
        return np.repeat(p[:1], m, axis=0)
    t = np.linspace(0, s[-1], m + (0 if include_end else 1))
    if not include_end:
        t = t[:-1]
    return np.column_stack([np.interp(t, s, p[:, 0]), np.interp(t, s, p[:, 1])])


def resample128(main, lm):
    order = ["back", "crest", "lip", "throat", "toe", "front"]
    out = []
    for a, b in zip(order[:-1], order[1:]):
        m = IDX[b] - IDX[a]
        last = b == "front"
        piece = main[lm[a]:lm[b] + 1]
        out.append(resample_piece(piece, m + (1 if last else 0), include_end=last))
    r = np.vstack(out)
    assert len(r) == N_PTS, len(r)
    return r


def void_polygon(main, lm):
    """Pre-impact void: surface from lip tip, under the jet, to the throat and down the
    face to the face point nearest the tip, closed by a straight segment to the tip."""
    il, ith, it = lm["lip"], lm["throat"], lm["toe"]
    if not lm["overturned"]:
        return None
    tip = main[il]
    face = main[ith:]
    face = face[face[:, 0] < tip[0] + 2.0]
    if len(face) < 2:
        return None
    d = np.hypot(*(face - tip).T)
    k = ith + int(np.argmin(d))
    poly = main[il:k + 1]
    return poly if len(poly) >= 3 else None


def jet_polygon(main, lm):
    """Jet: the water above the void where the surface is multi-valued in x,
    bounded behind by the vertical through the throat."""
    if not lm["overturned"]:
        return None
    ic, il, ith = lm["crest"], lm["lip"], lm["throat"]
    xth = main[ith, 0]
    # top-surface point above the throat: last crossing of x = xth between crest.. lip
    x = main[:, 0]
    j0 = None
    for i in range(0, il):
        if (x[i] - xth) * (x[i + 1] - xth) <= 0:
            j0 = i
    if j0 is None:
        return None
    t = (xth - x[j0]) / (x[j0 + 1] - x[j0]) if x[j0 + 1] != x[j0] else 0
    ptop = main[j0] + t * (main[j0 + 1] - main[j0])
    return np.vstack([ptop, main[j0 + 1:ith + 1]])


def shape_metrics(poly):
    """Length along the major axis (polygon diameter), tilt of that chord from the
    horizontal (deg, 0-90), width across it, area."""
    A = abs(poly_area(poly))
    P = poly
    if len(P) > 400:
        P = P[:: max(1, len(P) // 400)]
    D = np.hypot(P[:, None, 0] - P[None, :, 0], P[:, None, 1] - P[None, :, 1])
    i, j = np.unravel_index(np.argmax(D), D.shape)
    L = D[i, j]
    v = (P[j] - P[i]) / L
    ang = math.degrees(math.atan2(abs(v[1]), abs(v[0])))
    nrm = np.array([-v[1], v[0]])
    proj = poly @ nrm
    W = proj.max() - proj.min()
    return {"A": A, "L": L, "W": W, "theta": ang}


def list_frames(run_dir):
    fs = sorted(glob.glob(os.path.join(run_dir, "facets", "f*.dat")))
    out = []
    for f in fs:
        m = re.search(r"f([0-9.]+)\.dat$", f)
        out.append((float(m.group(1)), f))
    return out
