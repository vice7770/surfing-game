# Ruling 22: the hollow knee on the case's face before the throw, from the committed library file (no sea, no game code).
# Per frame: the largest hollow turn between the crest and the toe marks, read over w m each side along the curve,
# on the run's own frame and on the stored stand-in (point-by-point join of the nearest clean frames) where flagged.
import json, math, sys
d = json.load(open(sys.argv[1])); fr = d['frames'] if isinstance(d, dict) else d
S = 3.2  # m per h0, so the crest stands about 1.6 m over the toe at the throw (step 8's drawn height)
pre = [f for f in fr if f.get('profile') and f['tau'] < 0][-120:]
def curve(p): return [(x * S, y * S) for x, y in p[32:113]]
def resample(c, ds=0.05):
    out = [c[0]]; acc = 0.0
    for (x0, y0), (x1, y1) in zip(c, c[1:]):
        L = math.hypot(x1 - x0, y1 - y0)
        if L < 1e-9: continue
        t = (ds - acc) / L
        while t <= 1:
            out.append((x0 + t * (x1 - x0), y0 + t * (y1 - y0))); t += ds / L
        acc = (acc + L) % ds
    return out
def knee(c, w):
    r = resample(c); n = int(round(w / 0.05)); best = (0, 0)
    for i in range(n, len(r) - n):
        a = math.atan2(r[i][1] - r[i - n][1], r[i][0] - r[i - n][0]); b = math.atan2(r[i + n][1] - r[i][1], r[i + n][0] - r[i][0])
        t = math.degrees(b - a)  # + = hollow (the slope eases going down the face)
        if t > best[0]: best = (t, i / (len(r) - 1))
    return best
clean = [not f['flags'] for f in pre]
def standin(k):
    a = max(i for i in range(k) if clean[i]); b = min(i for i in range(k + 1, len(pre)) if clean[i])
    t = (k - a) / (b - a)
    return [(pa[0] + t * (pb[0] - pa[0]), pa[1] + t * (pb[1] - pa[1])) for pa, pb in zip(pre[a]['profile'], pre[b]['profile'])]
print('clock s | flags | own frame: hollow turn deg over 0.2 / 0.4 m each side, its place (0 crest, 1 toe) | stand-in the same')
for k, f in enumerate(pre):
    clock = f['tau'] * 0.644
    if k % 3 and clean[k]: continue
    o2 = knee(curve(f['profile']), 0.2); o4 = knee(curve(f['profile']), 0.4)
    line = f"{clock:6.2f} | {','.join(f['flags']) or '-':24s} | {o2[0]:5.1f} / {o4[0]:5.1f} at {o4[1]:.2f}"
    if not clean[k] and any(clean[:k]) and any(clean[k + 1:]):
        s = standin(k); s2 = knee(curve(s), 0.2); s4 = knee(curve(s), 0.4)
        line += f" | {s2[0]:5.1f} / {s4[0]:5.1f} at {s4[1]:.2f}"
    print(line)
