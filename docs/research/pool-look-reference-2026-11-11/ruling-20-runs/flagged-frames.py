"""Ruling 20: are the pre-throw frames the builder refills bad surfaces, or good surfaces with a jumped lip mark?
Reads the committed Basilisk library JSON (no game code). For each flagged frame before the throw: its own curve
(crest to toe) against (P) the builder's refill, the point-by-point join of its nearest clean neighbours, and (A) the
join of the same neighbours each spaced evenly by arc first. Lengths in metres at the reference pool's scale.
  python3 flagged-frames.py [json] [scale m]"""
import json, math, sys, collections
path = sys.argv[1] if len(sys.argv) > 1 else 'docs/research/pool-tube-runs/data/periodic_pool_straight_big_L13_library.json'
SCALE = float(sys.argv[2]) if len(sys.argv) > 2 else 4.06
CREST, TOE = 32, 112
SEC = 0.0161 / 0.025  # seconds per unit of tau at this scale (the library's frame step is 0.0161 s)
fr = [f for f in json.load(open(path))['frames'] if f['phase'] == 'pre']
clean = [not f['flags'] and f['profile'] is not None for f in fr]
seg = lambda f: [(x * SCALE, y * SCALE) for x, y in f['profile'][CREST:TOE + 1]]
def spaced(p, n=81):
    s = [0.0]
    for i in range(len(p) - 1): s.append(s[-1] + math.dist(p[i], p[i + 1]))
    out = []; k = 0
    for j in range(n):
        t = s[-1] * j / (n - 1)
        while k < len(p) - 2 and s[k + 1] <= t: k += 1
        d = s[k + 1] - s[k]; u = (t - s[k]) / d if d > 0 else 0
        out.append((p[k][0] + u * (p[k + 1][0] - p[k][0]), p[k][1] + u * (p[k + 1][1] - p[k][1])))
    return out
def off(a, b):  # worst vertex of a off polyline b
    w = 0
    for (px, py) in a:
        best = 1e9
        for i in range(len(b) - 1):
            ax, ay = b[i]; bx, by = b[i + 1][0] - ax, b[i + 1][1] - ay; l2 = bx * bx + by * by
            u = max(0, min(1, ((px - ax) * bx + (py - ay) * by) / l2)) if l2 > 0 else 0
            best = min(best, math.hypot(px - ax - u * bx, py - ay - u * by))
        w = max(w, best)
    return w
two = lambda a, b: max(off(a, b), off(b, a))
lerp = lambda a, b, t: [(x0 + t * (x1 - x0), y0 + t * (y1 - y0)) for (x0, y0), (x1, y1) in zip(a, b)]
def near(i, d):
    j = i + d
    while 0 <= j < len(fr) and not clean[j]: j += d
    return j if 0 <= j < len(fr) else -1
q = lambda v, p: sorted(v)[min(len(v) - 1, int(p * len(v)))] if v else float('nan')
print(f'{path}: {len(fr)} frames before the throw, {clean.count(False)} flagged; flags: {dict(collections.Counter(g for f in fr for g in f["flags"]))}; scale {SCALE} m')
rowsP, rowsA, lateP, lateA, toeP, toeA = [], [], [], [], [], []
for i, f in enumerate(fr):
    if clean[i]: continue
    a, b = near(i, -1), near(i, 1)
    if a < 0 or b < 0: continue
    t = (i - a) / (b - a)
    own = seg(f); P = lerp(seg(fr[a]), seg(fr[b]), t); A = lerp(spaced(seg(fr[a])), spaced(seg(fr[b])), t)
    dP, dA = two(own, P), two(own, A)
    toe = any(g != 'jump_lip' for g in f['flags'])
    (toeP if toe else rowsP).append(dP); (toeA if toe else rowsA).append(dA)
    if not toe and f['tau'] * SEC >= -0.6: lateP.append(dP); lateA.append(dA)
    print(f"  clock {f['tau'] * SEC:6.3f} s {','.join(f['flags']):24s} neighbours {b - a} frames apart: own curve off the stored refill {dP:.4f} m, off the arc join of the neighbours {dA:.4f} m")
print(f'flagged jump_lip only ({len(rowsP)}): own curve off the stored refill: median {q(rowsP, .5):.4f}, 90 % {q(rowsP, .9):.4f}, most {max(rowsP):.4f} m; off the arc join of its clean neighbours: median {q(rowsA, .5):.4f}, 90 % {q(rowsA, .9):.4f}, most {max(rowsA):.4f} m')
if lateP: print(f'  of these in the last 0.6 s ({len(lateP)}): off the refill median {q(lateP, .5):.4f}, most {max(lateP):.4f} m; off the arc join median {q(lateA, .5):.4f}, most {max(lateA):.4f} m')
if toeP: print(f'flagged with a toe flag ({len(toeP)}): off the refill median {q(toeP, .5):.4f}, most {max(toeP):.4f} m; off the arc join median {q(toeA, .5):.4f}, most {max(toeA):.4f} m')
# The floor: clean frames left out and rebuilt by arc from the clean frames either side (one frame each side).
floor = []
for i in range(1, len(fr) - 1):
    if clean[i - 1] and clean[i] and clean[i + 1]: floor.append(two(seg(fr[i]), lerp(spaced(seg(fr[i - 1])), spaced(seg(fr[i + 1])), 0.5)))
print(f'for scale, clean frames rebuilt by arc from their two clean neighbours ({len(floor)}): median {q(floor, .5):.4f}, 90 % {q(floor, .9):.4f}, most {max(floor):.4f} m')
# Clean frames that still stand off their clean neighbours' arc join by more than 0.05 m, with the marks' arc lengths.
arcl = lambda p: sum(math.dist(p[i], p[i + 1]) for i in range(len(p) - 1))
for i in range(1, len(fr) - 1):
    if clean[i - 1] and clean[i] and clean[i + 1]:
        d = two(seg(fr[i]), lerp(spaced(seg(fr[i - 1])), spaced(seg(fr[i + 1])), 0.5))
        if d > 0.05: print(f"  clean frame at clock {fr[i]['tau'] * SEC:6.3f} s stands {d:.4f} m off; crest-to-toe arc of the three: {arcl(seg(fr[i-1])):.2f} {arcl(seg(fr[i])):.2f} {arcl(seg(fr[i+1])):.2f} m; toe x: {fr[i-1]['profile'][TOE][0]*SCALE:.2f} {fr[i]['profile'][TOE][0]*SCALE:.2f} {fr[i+1]['profile'][TOE][0]*SCALE:.2f}; crest x: {fr[i-1]['profile'][CREST][0]*SCALE:.2f} {fr[i]['profile'][CREST][0]*SCALE:.2f} {fr[i+1]['profile'][CREST][0]*SCALE:.2f}")
