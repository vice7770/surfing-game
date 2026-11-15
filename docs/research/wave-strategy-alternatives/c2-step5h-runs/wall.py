# C2 step 5h: our own pier band. The `front` camera has the pool's wall behind the wave, so the veil's
# translucency can be measured in our own frame the way the photograph's was -- except better, because our wall
# is uniform along x, which the photograph's pier is not (the periodic-amplitude route failed on it for exactly
# that reason). Linear light throughout: transmission is linear in radiance and sRGB code values are not.
#
#   python3 -I wall.py <png> <label>  [more pairs]
import sys, math, statistics as st
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from png import read_png

ROWS = (264, 284)          # the wall band, read off the pixels (a 32 px scan puts the wall in rows 256-288)
CLEAR = (410, 560)         # wall with no veil in front of it
VEILED = (640, 800)        # wall behind the veil
SKY = (264, 284, 900, 1040)  # a second clear stretch of the same wall, as a control on the method

def eotf(v):
    c = v / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def band(path, x0, x1, rows=ROWS):
    w, h, c, d = read_png(path)
    out = []
    for y in range(*rows):
        for x in range(x0, x1):
            i = (y * w + x) * c
            out.append(0.2126 * eotf(d[i]) + 0.7152 * eotf(d[i + 1]) + 0.0722 * eotf(d[i + 2]))
    return out

print('The pool wall behind the wave, rows %d-%d, LINEAR luminance.' % ROWS)
print('clear x %d-%d (%d px), veiled x %d-%d (%d px), second control x %d-%d'
      % (CLEAR[0], CLEAR[1], (CLEAR[1] - CLEAR[0]) * (ROWS[1] - ROWS[0]), VEILED[0], VEILED[1],
         (VEILED[1] - VEILED[0]) * (ROWS[1] - ROWS[0]), SKY[2], SKY[3]))
print()
print('%-22s | %-24s | %-24s | %-24s | %s' % ('leg', 'clear: mean / sd', 'veiled: mean / sd', 'control: mean / sd', 'lift, sd ratio'))
args = sys.argv[1:]
for k in range(0, len(args), 2):
    path, label = args[k], args[k + 1]
    cl = band(path, *CLEAR)
    ve = band(path, *VEILED)
    ct = band(path, SKY[2], SKY[3], (SKY[0], SKY[1]))
    cm, cs = st.mean(cl), st.pstdev(cl)
    vm, vs = st.mean(ve), st.pstdev(ve)
    tm, ts = st.mean(ct), st.pstdev(ct)
    print('%-22s | %10.4f / %-10.4f | %10.4f / %-10.4f | %10.4f / %-10.4f | +%.4f, x%.2f'
          % (label, cm, cs, vm, vs, tm, ts, vm - cm, vs / cs if cs else 0))
