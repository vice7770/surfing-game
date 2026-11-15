# C2 step 5h: the veil's transmission, measured exposure-free from the pier's own periodic railing.
#
# 5g read the veil as optically thin from a preserved *sRGB* sd (23.5 -> 29.4). Transmission is linear in
# radiance and sRGB code values are not, and the veil's own patchiness adds variance of its own, so an sd
# cannot bound tau in either direction. What can: the pier's railing is PERIODIC in x, and the veil's
# patchiness is not. Take the amplitude of the railing's own spatial frequency, in LINEAR light, under the
# veil and in the clear, and their ratio is the transmission T with no assumption about the veil's own
# radiance and none about the camera's exposure.
#
#   python3 -I transmission.py /tmp/ref.png
import sys, math, statistics as st
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from png import read_png

REF = sys.argv[1] if len(sys.argv) > 1 else 'ref.png'

def eotf(v):
    """sRGB code value (0-255) -> linear, the inverse electro-optical transfer function."""
    c = v / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

w, h, c, d = read_png(REF)
LIN = [[0.0] * w for _ in range(h)]
SRGB = [[0.0] * w for _ in range(h)]
for y in range(h):
    for x in range(w):
        i = (y * w + x) * c
        s = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
        SRGB[y][x] = s
        LIN[y][x] = 0.2126 * eotf(d[i]) + 0.7152 * eotf(d[i + 1]) + 0.0722 * eotf(d[i + 2])

ROWS = (200, 300)
BANDS = {'clear pier 1150-1270': (1150, 1270), 'veil edge 900-1050': (900, 1050),
         'under the veil 600-900': (600, 900), 'thickest veil 420-600': (420, 600)}

def profile(F, x0, x1):
    return [st.mean(F[y][x] for y in range(*ROWS)) for x in range(x0, x1)]

def spectrum(p):
    """Amplitude per spatial period (px), after removing the band's own linear trend."""
    n = len(p)
    m = st.mean(p)
    t = [(i - (n - 1) / 2) for i in range(n)]
    den = sum(a * a for a in t)
    slope = sum(a * (b - m) for a, b in zip(t, p)) / den if den else 0.0
    q = [b - m - slope * a for a, b in zip(t, p)]
    out = []
    for k in range(2, n // 3):
        re = sum(v * math.cos(2 * math.pi * k * i / n) for i, v in enumerate(q)) * 2 / n
        im = sum(v * math.sin(2 * math.pi * k * i / n) for i, v in enumerate(q)) * 2 / n
        out.append((n / k, math.hypot(re, im)))
    return out

print('rows %d-%d, luminance.  Amplitude is of the railing\'s own period, LINEAR light.' % ROWS)
print()
# The railing's pitch, from the clear band
cx0, cx1 = BANDS['clear pier 1150-1270']
cs = spectrum(profile(LIN, cx0, cx1))
pitch, amp0 = max(cs, key=lambda a: a[1])
print('the railing\'s pitch, read off the clear band: %.1f px (%.2f m at 137 px/m)' % (pitch, pitch / 137))
print()
print('%-24s | %8s %8s | %10s %10s | %6s' % ('band', 'sRGB mn', 'lin mean', 'amp(pitch)', 'amp/clear', 'tau'))
for name, (x0, x1) in BANDS.items():
    pl = profile(LIN, x0, x1); ps = profile(SRGB, x0, x1)
    n = len(pl)
    k = max(2, min(n // 3 - 1, round(n / pitch)))
    sp = dict((round(p), a) for p, a in spectrum(pl))
    # the amplitude at the nearest available period to the pitch
    best = min(spectrum(pl), key=lambda a: abs(a[0] - pitch))
    T = best[1] / amp0
    print('%-24s | %8.1f %8.4f | %10.5f %10.3f | %6s'
          % (name, st.mean(ps), st.mean(pl), best[1], T, '%.2f' % (-math.log(T)) if T > 0 else '-'))
print()
print('T is the railing amplitude under the veil over its amplitude in the clear; tau = -ln T.')
print('The clear band is the reference, so its T is 1 by construction.')
