# C2 step 5j: the within-frame ratio over THREE legs -- off, step 5i's `?foamAlbedo=on`, and this round's
# `?foamAlbedo=bubbles` -- on the same held frame at the same four cameras.
#
# It is step 5i's own `within_frame.py` with a third leg and nothing else changed: the same boxes, the same
# recipe, the same photograph. The off leg is the CONTROL: it must reproduce step 5i's published figures, and
# the on leg must reproduce them too, because nothing in step 5j moves `?foamAlbedo=on`.
#
# ENCODING, stated because rule 1 of the brief says it must be: every PNG here is sRGB-encoded -- the
# renderer's output transfer is sRGB and the owner's reference is an sRGB webp. Each channel goes through the
# sRGB INVERSE EOTF to radiance, the pixel's luminance is Rec. 709 of the three, and a box's figure is the
# MEAN OVER ITS PIXELS OF THAT LUMINANCE, not the EOTF of the mean. sRGB code values are not radiance and no
# ratio here is taken on them.
#
# CAVEAT, carried from step 5i section 1: the renderer tone-maps (NeutralToneMapping) BEFORE the sRGB encode,
# so "linear" here is display-linear after a compressive curve, not scene radiance. The ratio is still
# exposure-free; an albedo change does NOT move a bright pixel in proportion.
#
#   python3 -I within_frame3.py <dir-with-off/ on/ bubbles/ ref.png>
import sys, statistics as st
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from png import read_png

LEGS = ('off', 'on', 'bubbles')

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

# Step 5i's boxes, unchanged: the photograph's are step 5h's own, and ours were drawn on the OFF leg before
# any other leg was looked at. Nothing here was redrawn for this round.
BOXES = {
    'side':      dict(broken=(660, 390, 1240, 500), flat=(700, 600, 1200, 700), face=(40, 430, 420, 620)),
    'front':     dict(broken=(600, 395, 1050, 470), flat=(40, 330, 300, 420)),
    'above':     dict(broken=(640, 380, 1100, 470), flat=(60, 230, 500, 320)),
    'bore-face': dict(broken=(700, 320, 1240, 520), flat=(60, 190, 560, 270)),
}
REF = dict(broken=(16, 300, 440, 540), flat=(300, 600, 900, 700), face=(700, 400, 1200, 500))

if __name__ == '__main__':
    root = sys.argv[1].rstrip('/')
    print('ENCODING: sRGB inverse EOTF per channel, Rec. 709 luminance, mean over pixels. Ratios are within one frame.')
    print('Tone-mapped before the encode, so display-linear, not scene radiance (step 5i section 1).\n')

    w, h, L, _, _ = linear('%s/ref.png' % root)
    print('the owner\'s photograph (%d x %d)' % (w, h))
    nb, mb, sb = box(L, REF['broken']); nf, mf, sf = box(L, REF['flat']); nc, mc, sc = box(L, REF['face'])
    print('  broken foam   n %6d  linear mean %.4f  sd %.4f' % (nb, mb, sb))
    print('  glassy water  n %6d  linear mean %.4f  sd %.4f' % (nf, mf, sf))
    print('  clean face    n %6d  linear mean %.4f  sd %.4f' % (nc, mc, sc))
    print('  WITHIN-FRAME RATIO broken / glassy water = %.3f   (broken / clean face = %.3f)' % (mb / mf, mb / mc))
    print('  contrast inside the broken region, sd / mean = %.3f\n' % (sb / mb))

    for name, b in BOXES.items():
        print('== %s ==' % name)
        legs = {}
        for leg in LEGS:
            w, h, L, d, c = linear('%s/%s/%s.png' % (root, leg, name))
            legs[leg] = (w, h, L, d, c)
            nb, mb, sb = box(L, b['broken']); nf, mf, sf = box(L, b['flat'])
            extra = ''
            if 'face' in b:
                _, mc, _ = box(L, b['face'])
                extra = '  (broken / clean face %.3f)' % (mb / mc)
            print('  %-7s broken n %6d mean %.4f sd %.4f | flat n %6d mean %.4f sd %.4f | RATIO %.3f | contrast %.3f%s'
                  % (leg, nb, mb, sb, nf, mf, sf, mb / mf, sb / mb, extra))
        # Each leg's footprint against the off leg: the pixels they differ on, with no box drawn at all.
        (w, h, Loff, doff, c0) = legs['off']
        for leg in ('on', 'bubbles'):
            (_, _, Lx, dx, c1) = legs[leg]
            off_v = []; on_v = []
            for y in range(h):
                for x in range(w):
                    i = (y * w + x) * c0
                    j = (y * w + x) * c1
                    if doff[i] != dx[j] or doff[i + 1] != dx[j + 1] or doff[i + 2] != dx[j + 2]:
                        off_v.append(Loff[y][x]); on_v.append(Lx[y][x])
            n = len(off_v)
            if n:
                mo = st.mean(off_v); mn = st.mean(on_v)
                print('  footprint %-7s n %6d (%.2f %% of the frame)  OFF mean %.4f  LEG mean %.4f  LEG/OFF %.3f'
                      % (leg, n, 100.0 * n / (w * h), mo, mn, mn / mo))
            else:
                print('  footprint %-7s EMPTY -- this leg moved nothing in this frame' % leg)
        # And the two switched legs against each other, so "what the field changes about the cap" has a number.
        (_, _, Lon, don, ca) = legs['on']
        (_, _, Lbb, dbb, cb) = legs['bubbles']
        a_v = []; b_v = []
        for y in range(h):
            for x in range(w):
                i = (y * w + x) * ca
                j = (y * w + x) * cb
                if don[i] != dbb[j] or don[i + 1] != dbb[j + 1] or don[i + 2] != dbb[j + 2]:
                    a_v.append(Lon[y][x]); b_v.append(Lbb[y][x])
        if a_v:
            print('  bubbles vs on  n %6d (%.2f %% of the frame)  ON mean %.4f  BUBBLES mean %.4f  BUBBLES/ON %.3f'
                  % (len(a_v), 100.0 * len(a_v) / (w * h), st.mean(a_v), st.mean(b_v), st.mean(b_v) / st.mean(a_v)))
        else:
            print('  bubbles vs on  IDENTICAL -- the two legs drew the same pixels')
        print()
