# C2 step 5i: how much of our broken water's brightness is NOT the foam's albedo?
#
# A third, throwaway leg was rendered with `waterFoamColor` set to black and nothing else changed, so the
# foam's diffuse term is zero and everything else -- the sky the surface mirrors, the sun's specular and
# glitter, the backlit glow, and whatever the water under the foam contributes where the cover is short of
# 1 -- is untouched. In the same box, in linear light:
#
#     off  = D + S        (D the foam's diffuse term at albedo 0.840, S everything else)
#     black= S
#     on   = D * k + S    (k the cap and age this round applies)
#
# so D and S come straight out, and the FLOOR tells how far a pure albedo change can ever go.
# Encoding as in within_frame.py: sRGB inverse EOTF, Rec. 709 luminance, mean over pixels.
#
#   python3 -I floor.py <dir>
import sys, statistics as st
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from within_frame import linear, box, BOXES

root = sys.argv[1].rstrip('/')
print('ENCODING: sRGB inverse EOTF, Rec. 709 luminance, mean over pixels.\n')
for name in ('side', 'bore-face'):
    b = BOXES[name]
    m = {}
    for leg in ('off', 'on', 'black'):
        _, _, L, _, _ = linear('%s/%s/%s.png' % (root, leg, name))
        m[leg] = (box(L, b['broken']), box(L, b['flat']))
    (nb, off_b, _), (nf, off_f, _) = m['off']
    (_, on_b, _), (_, on_f, _) = m['on']
    (_, bl_b, _), (_, bl_f, _) = m['black']
    D = off_b - bl_b
    print('== %s, the broken box, n %d ==' % (name, nb))
    print('  off %.4f   on %.4f   foam colour black %.4f' % (off_b, on_b, bl_b))
    print('  the foam\'s own diffuse share D = %.4f (%.0f %% of the off leg); everything else S = %.4f (%.0f %%)'
          % (D, 100 * D / off_b, bl_b, 100 * bl_b / off_b))
    print('  this round takes the diffuse term to %.3f of what it was' % ((on_b - bl_b) / D))
    # Within-frame: each leg's broken box is divided by ITS OWN flat water, never another leg's.
    print('  FLOOR: the darkest this box can be made by the albedo alone = %.4f, a within-frame ratio of %.3f'
          % (bl_b, bl_b / bl_f))
    print('  the three legs\' own within-frame ratios: off %.3f  on %.3f  black %.3f'
          % (off_b / off_f, on_b / on_f, bl_b / bl_f))
    print('  flat water in the same frame: off %.4f  on %.4f  black %.4f' % (off_f, on_f, bl_f))
    print()
