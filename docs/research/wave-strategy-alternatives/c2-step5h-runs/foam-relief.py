# C2 step 5h: how flat is a white region?
#
# A region of broken water is "lumpy and shadowed" (the owner's photograph, reference README item 4) or
# "a flat white mass" (the coordinator's reading of our own still). Both are bright; what separates them
# is RELIEF -- the variation that survives inside a small window, which a smooth gradient does not produce.
#
# For each box: mean luminance, global sd, and the LOCAL sd (the mean over t x t tiles of the sd inside
# each tile), plus the share of pixels over 220 of 255 (near-white) and the 5th/95th percentile spread.
#
#   python3 -I foam-relief.py <png> <x0> <y0> <x1> <y1> [label]
import sys, statistics as st
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from png import read_png

TILE = 8
NEAR_WHITE = 220.0

def lum(path):
    w, h, c, d = read_png(path)
    L = [[0.0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            i = (y * w + x) * c
            L[y][x] = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
    return w, h, L

def box(L, x0, y0, x1, y1, tile=TILE):
    v = [L[y][x] for y in range(y0, y1) for x in range(x0, x1)]
    m = st.mean(v); s = st.pstdev(v)
    locals_ = []
    for ty in range(y0, y1 - tile + 1, tile):
        for tx in range(x0, x1 - tile + 1, tile):
            t = [L[y][x] for y in range(ty, ty + tile) for x in range(tx, tx + tile)]
            locals_.append(st.pstdev(t))
    v.sort()
    p5 = v[int(0.05 * len(v))]; p95 = v[int(0.95 * len(v))]
    white = sum(1 for a in v if a > NEAR_WHITE) / len(v)
    return dict(n=len(v), mean=m, sd=s, local=st.mean(locals_), localmed=st.median(locals_),
                p5=p5, p95=p95, white=white, rms=s / m if m else 0)

def show(label, r):
    print('%-28s n %6d  mean %6.1f  sd %5.1f  LOCAL sd(%dpx) %5.2f (med %5.2f)  p5-p95 %5.1f-%5.1f  >%d: %5.1f%%'
          % (label, r['n'], r['mean'], r['sd'], TILE, r['local'], r['localmed'], r['p5'], r['p95'], NEAR_WHITE, 100 * r['white']))

if __name__ == '__main__':
    path = sys.argv[1]
    w, h, L = lum(path)
    x0, y0, x1, y1 = (int(a) for a in sys.argv[2:6])
    label = sys.argv[6] if len(sys.argv) > 6 else path
    show(label, box(L, x0, y0, x1, y1))
