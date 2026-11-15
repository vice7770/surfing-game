# C2 step 5i: the within-frame ratio -- broken water against flat water IN THE SAME FRAME, in linear light.
#
# This is the one instrument step 5h's section 5 settles the foam's brightness on, and the reason it is
# trustworthy is that it never compares two frames' absolute brightness: each frame is divided by its own
# flat water, so no exposure or grading difference survives.
#
# ENCODING, stated because rule 1 of this round's brief says it must be: every PNG here is sRGB-encoded,
# the renderer's output transfer is sRGB and the owner's photograph is an sRGB webp. Each channel goes
# through the sRGB INVERSE EOTF to radiance, the pixel's luminance is Rec. 709 of the three, and the box's
# figure is the MEAN OVER PIXELS OF THAT LUMINANCE -- not the EOTF of the mean, which is a different number
# for any box with spread in it. sRGB code values are not radiance and no ratio here is taken on them.
#
# Step 5h's own section 5.2 figures (0.567 / 0.758 and 0.798 / 0.609) do not come out of this recipe; it does
# not say which transfer it used, and a pure gamma 2.2 reproduces them to about a percent. The sign flip and
# its size survive either way; the factor's second digit does not. See c2-step5i.md section 2.
#
#   python3 -I within_frame.py <dir-with-off/ on/ ref.png>
import sys, statistics as st
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from png import read_png

def eotf(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

LUT = [eotf(float(v)) for v in range(256)]

def linear(path):
    w, h, c, d = read_png(path)
    L = [[0.0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            i = (y * w + x) * c
            L[y][x] = 0.2126 * LUT[d[i]] + 0.7152 * LUT[d[i + 1]] + 0.0722 * LUT[d[i + 2]]
    return w, h, L, d, c

def box(L, b):
    x0, y0, x1, y1 = b
    v = [L[y][x] for y in range(y0, y1) for x in range(x0, x1)]
    return len(v), st.mean(v), st.pstdev(v)

# The boxes. The photograph's are step 5h's own (c2-step5h-runs/boxes.py), unchanged. Ours were drawn on the
# OFF leg, before the ON leg was looked at, and used unchanged for both legs: the broken water right of the
# curl, and the largest piece of unbroken water in the same frame.
BOXES = {
    'side':      dict(broken=(660, 390, 1240, 500), flat=(700, 600, 1200, 700), face=(40, 430, 420, 620)),
    'front':     dict(broken=(600, 395, 1050, 470), flat=(40, 330, 300, 420)),
    'above':     dict(broken=(640, 380, 1100, 470), flat=(60, 230, 500, 320)),
    'bore-face': dict(broken=(700, 320, 1240, 520), flat=(60, 190, 560, 270)),
}
REF = dict(broken=(16, 300, 440, 540), flat=(300, 600, 900, 700), face=(700, 400, 1200, 500))

if __name__ == '__main__':
    root = sys.argv[1].rstrip('/')
    print('ENCODING: sRGB inverse EOTF per channel, Rec. 709 luminance, mean over pixels. Ratios are within one frame.\n')

    w, h, L, _, _ = linear('%s/ref.png' % root)
    print('the owner\'s photograph (%d x %d)' % (w, h))
    nb, mb, sb = box(L, REF['broken']); nf, mf, sf = box(L, REF['flat']); nc, mc, sc = box(L, REF['face'])
    print('  broken foam   n %6d  linear mean %.4f  sd %.4f' % (nb, mb, sb))
    print('  glassy water  n %6d  linear mean %.4f  sd %.4f' % (nf, mf, sf))
    print('  clean face    n %6d  linear mean %.4f  sd %.4f' % (nc, mc, sc))
    print('  WITHIN-FRAME RATIO broken / glassy water = %.3f   (broken / clean face = %.3f)\n' % (mb / mf, mb / mc))

    for name, b in BOXES.items():
        print('== %s ==' % name)
        legs = {}
        for leg in ('off', 'on'):
            w, h, L, d, c = linear('%s/%s/%s.png' % (root, leg, name))
            legs[leg] = (w, h, L, d, c)
            nb, mb, sb = box(L, b['broken']); nf, mf, sf = box(L, b['flat'])
            extra = ''
            if 'face' in b:
                _, mc, _ = box(L, b['face'])
                extra = '  (broken / clean face %.3f)' % (mb / mc)
            print('  %-3s broken n %6d mean %.4f sd %.4f | flat n %6d mean %.4f sd %.4f | RATIO %.3f%s'
                  % (leg, nb, mb, sb, nf, mf, sf, mb / mf, extra))
        # The switch's own footprint: the pixels the two legs differ on, with no box drawn at all. Both legs are
        # the same held frame of the same sea, so this is where foam is drawn and nowhere else.
        (w, h, Loff, doff, c0) = legs['off']
        (_, _, Lon, don, c1) = legs['on']
        off_v = []; on_v = []
        for y in range(h):
            for x in range(w):
                i = (y * w + x) * c0
                j = (y * w + x) * c1
                if doff[i] != don[j] or doff[i + 1] != don[j + 1] or doff[i + 2] != don[j + 2]:
                    off_v.append(Loff[y][x]); on_v.append(Lon[y][x])
        n = len(off_v)
        if n:
            mo = st.mean(off_v); mn = st.mean(on_v)
            print('  footprint (the pixels the switch moves): n %6d (%.2f %% of the frame)  OFF mean %.4f  ON mean %.4f  ON/OFF %.3f'
                  % (n, 100.0 * n / (w * h), mo, mn, mn / mo))
        else:
            print('  footprint: EMPTY -- the switch moved nothing in this frame')
        print()
