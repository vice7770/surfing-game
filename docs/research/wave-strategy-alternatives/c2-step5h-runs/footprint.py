# C2 step 5h: the owner's photograph's own test, run on our own frames, with a perfect control.
#
# The reference README item 2 asks whether the veil LIFTS its background while leaving the background's own
# variation readable through it. In the photograph that had to be judged across two different pieces of pier.
# Here the control is exact: the same held sea, the same frame, the same camera, with and without the switch.
#
# The veil's footprint is the set of pixels the two legs differ on. Inside it, in LINEAR light:
#   - the mean lift, ON - OFF;
#   - the background's own sd (the OFF leg) against the sd under the veil (the ON leg);
#   - and the implied transmission, from the per-pixel pairs: a veil that attenuates and adds its own radiance
#     satisfies ON = T*OFF + L*(1-T), so a straight-line fit of ON against OFF over the footprint gives T as its
#     SLOPE and L*(1-T) as its intercept -- with no assumption about L at all, which is what the photograph
#     could not supply. tau = -ln T.
#
#   python3 -I footprint.py <on.png> <off.png> <label> [more triples]
import sys, statistics as st, math
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from png import read_png

THRESH = 2.0 / 255  # a pixel is in the footprint once the legs differ by more than this in sRGB luminance

def eotf(v):
    c = v / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def lum(path):
    w, h, c, d = read_png(path)
    srgb = [0.0] * (w * h)
    lin = [0.0] * (w * h)
    for p in range(w * h):
        i = p * c
        srgb[p] = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255.0
        lin[p] = 0.2126 * eotf(d[i]) + 0.7152 * eotf(d[i + 1]) + 0.0722 * eotf(d[i + 2])
    return w, h, srgb, lin

args = sys.argv[1:]
print('%-18s | %7s %6s | %-19s | %-19s | %-17s | %s'
      % ('leg', 'px', '%frame', 'OFF in it: mean/sd', 'ON in it: mean/sd', 'lift / sd ratio', 'fit: T, tau, L'))
for k in range(0, len(args), 3):
    on, off, label = args[k], args[k + 1], args[k + 2]
    w, h, s1, l1 = lum(on)
    w2, h2, s2, l2 = lum(off)
    assert (w, h) == (w2, h2), (on, off)
    idx = [p for p in range(w * h) if abs(s1[p] - s2[p]) > THRESH]
    if not idx:
        print('%-18s | no pixels differ' % label)
        continue
    rows = [p // w for p in idx]
    cut = st.median(rows)
    for part, keep in (('whole', idx), ('upper half', [p for p in idx if p // w < cut]), ('lower half', [p for p in idx if p // w >= cut])):
        if part == 'whole': continue
        aa = [l1[p] for p in keep]; bb = [l2[p] for p in keep]
        if not aa: continue
        m1, m2 = st.mean(aa), st.mean(bb)
        s1_, s2_ = st.pstdev(aa), st.pstdev(bb)
        nn = len(keep)
        sxx2 = sum((x - m2) ** 2 for x in bb)
        sxy2 = sum((x - m2) * (y - m1) for x, y in zip(bb, aa))
        T2 = sxy2 / sxx2 if sxx2 else float('nan')
        print('  %-16s | %7d %5.2f%% | %8.4f / %-8.4f | %8.4f / %-8.4f | %+.4f / x%.2f | T %.3f, tau %s'
              % (label + ' ' + part, nn, 100 * nn / (w * h), m2, s2_, m1, s1_, m1 - m2, s1_ / s2_ if s2_ else 0, T2,
                 ('%.2f' % -math.log(T2)) if 0 < T2 < 1 else '-'))
    a = [l1[p] for p in idx]
    b = [l2[p] for p in idx]
    am, asd = st.mean(a), st.pstdev(a)
    bm, bsd = st.mean(b), st.pstdev(b)
    # least squares ON = T*OFF + c
    n = len(idx)
    sxx = sum((x - bm) ** 2 for x in b)
    sxy = sum((x - bm) * (y - am) for x, y in zip(b, a))
    T = sxy / sxx if sxx else float('nan')
    c0 = am - T * bm
    tau = -math.log(T) if 0 < T < 1 else float('nan')
    L = c0 / (1 - T) if T < 1 else float('nan')
    print('%-18s | %7d %5.2f%% | %8.4f / %-8.4f | %8.4f / %-8.4f | %+.4f / x%.2f | T %.3f, tau %.2f, L %.2f'
          % (label, n, 100 * n / (w * h), bm, bsd, am, asd, am - bm, asd / bsd if bsd else 0, T, tau, L))
