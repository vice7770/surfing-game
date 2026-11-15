# C2 step 5h: the veil's transmission, read three ways, with the method's own noise floor beside it.
#
# (a) the sRGB sd 5g read it from, (b) the same sd in LINEAR light -- which is the light transmission is
# linear in -- and (c) the amplitude of the pier railing's own spatial period, each band finding its own
# period, so a band whose railing is coarser is not read at the wrong frequency.
#
# The clear band is split in two so the method's scatter on water it is not supposed to see through is
# printed beside the readings it is supposed to.
import sys, math, statistics as st
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from png import read_png

REF = sys.argv[1] if len(sys.argv) > 1 else 'ref.png'
ROWS = (200, 300)

def eotf(v):
    c = v / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

w, h, c, d = read_png(REF)
LIN = [[0.0] * w for _ in range(h)]
SRGB = [[0.0] * w for _ in range(h)]
for y in range(h):
    for x in range(w):
        i = (y * w + x) * c
        SRGB[y][x] = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
        LIN[y][x] = 0.2126 * eotf(d[i]) + 0.7152 * eotf(d[i + 1]) + 0.0722 * eotf(d[i + 2])

BANDS = [('clear A 1150-1210', 1150, 1210), ('clear B 1210-1270', 1210, 1270),
         ('clear whole 1150-1270', 1150, 1270), ('veil edge 900-1050', 900, 1050),
         ('under the veil 600-900', 600, 900), ('thickest 420-600', 420, 600)]

def profile(F, x0, x1):
    return [st.mean(F[y][x] for y in range(*ROWS)) for x in range(x0, x1)]

def best_period(p, lo=8.0, hi=40.0):
    n = len(p)
    m = st.mean(p)
    t = [(i - (n - 1) / 2) for i in range(n)]
    den = sum(a * a for a in t) or 1.0
    slope = sum(a * (b - m) for a, b in zip(t, p)) / den
    q = [b - m - slope * a for a, b in zip(t, p)]
    best = (0.0, 0.0)
    for k in range(2, n // 2):
        per = n / k
        if not (lo <= per <= hi): continue
        re = sum(v * math.cos(2 * math.pi * k * i / n) for i, v in enumerate(q)) * 2 / n
        im = sum(v * math.sin(2 * math.pi * k * i / n) for i, v in enumerate(q)) * 2 / n
        a = math.hypot(re, im)
        if a > best[1]: best = (per, a)
    return best

print('rows %d-%d.  Populations: each band is %d rows x its own width of pixels.' % (ROWS[0], ROWS[1], ROWS[1] - ROWS[0]))
print()
print('%-24s %8s %7s %8s %9s %9s %9s' % ('band', 'sRGB mn', 'sRGB sd', 'lin mean', 'lin sd', 'period px', 'amp(lin)'))
rows = {}
for name, x0, x1 in BANDS:
    vs = [SRGB[y][x] for y in range(*ROWS) for x in range(x0, x1)]
    vl = [LIN[y][x] for y in range(*ROWS) for x in range(x0, x1)]
    per, amp = best_period(profile(LIN, x0, x1))
    rows[name] = (st.mean(vl), st.pstdev(vl), per, amp)
    print('%-24s %8.1f %7.1f %8.4f %9.4f %9.1f %9.5f'
          % (name, st.mean(vs), st.pstdev(vs), st.mean(vl), st.pstdev(vl), per, amp))

print()
ref = rows['clear whole 1150-1270'][3]
a, b = rows['clear A 1150-1210'][3], rows['clear B 1210-1270'][3]
print('the method\'s own noise floor: the clear pier\'s two halves give amplitudes %.5f and %.5f,'
      % (a, b))
print('a ratio of %.2f between two pieces of the SAME clear pier -- so a transmission read this way'
      % (min(a, b) / max(a, b)))
print('carries a factor of about %.1f of its own before the veil is reached.' % (max(a, b) / min(a, b)))
print()
for name in ('veil edge 900-1050', 'under the veil 600-900', 'thickest 420-600'):
    T = rows[name][3] / ref
    print('  %-24s T = %.3f   tau = -ln T = %.2f' % (name, T, -math.log(T)))
print()
print('And the sd argument, which is what 5g read the veil\'s thinness from:')
cl = rows['clear whole 1150-1270']; uv = rows['under the veil 600-900']
print('  sRGB sd  23.5 -> 29.4 : "the absolute variation is intact", so the cloud is thin.')
print('  LINEAR sd %.4f -> %.4f : a factor %.1f UP.  Attenuation cannot raise a background\'s'
      % (cl[1], uv[1], uv[1] / cl[1]))
print('  variation. The variance under the veil is the veil\'s own patchiness, so the sd bounds nothing.')

# The radiance balance, which is the only route left once the sd and the periodic amplitude are both out.
# I = I_bg*T + L_veil*(1-T)  =>  T = (L_veil - I) / (L_veil - I_bg).  L_veil is the veil's own in-scattered
# radiance, which this frame cannot settle, so the answer is a bracket and the assumption is named with it.
print()
print('The radiance balance (linear light), under the veil at I = %.4f against a clear pier at I_bg = %.4f:'
      % (rows['under the veil 600-900'][0], rows['clear whole 1150-1270'][0]))
I = rows['under the veil 600-900'][0]; B = rows['clear whole 1150-1270'][0]
for L, what in ((rows['thickest 420-600'][0], 'the thickest veil\'s own reading'),
                (0.543, 'the photograph\'s broken foam'),
                (0.750, 'the photograph\'s glassy foreground, its brightest extended surface'),
                (1.0, 'a clipped white')):
    T = (L - I) / (L - B)
    print('  L_veil = %.3f (%-58s) T = %.3f  tau = %.2f' % (L, what, T, -math.log(T)))
