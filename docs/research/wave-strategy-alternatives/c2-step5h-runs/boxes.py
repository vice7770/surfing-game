# C2 step 5h: the named boxes, in the photograph and in our own stills.  python3 -I boxes.py [tile]
import sys
sys.path.insert(0, __file__.rsplit('/', 1)[0])
import foam_relief as F
if len(sys.argv) > 1: F.TILE = int(sys.argv[1])
from foam_relief import lum, box, show

BOXES = {
    'ref.png': [
        ('[photo] broken foam', 16, 300, 440, 540),
        ('[photo] broken, upper half', 16, 300, 440, 420),
        ('[photo] broken, lower half', 16, 420, 440, 540),
        ('[photo] clean teal face', 700, 400, 1200, 500),
        ('[photo] crest foam on face', 460, 310, 700, 360),
        ('[photo] glassy foreground', 300, 600, 900, 700),
    ],
    'veil-off-side.png': [
        ('[ours off] broken mass', 660, 390, 1240, 500),
        ('[ours off] broken, upper', 660, 330, 1240, 390),
        ('[ours off] broken, lower', 660, 440, 1240, 520),
        ('[ours off] clean teal face', 40, 430, 420, 620),
        ('[ours off] crest/lip region', 450, 380, 660, 470),
        ('[ours off] flat foreground', 700, 600, 1200, 700),
    ],
    'veil-on-side.png': [
        ('[ours on] broken mass', 660, 390, 1240, 500),
        ('[ours on] broken, upper', 660, 330, 1240, 390),
        ('[ours on] broken, lower', 660, 440, 1240, 520),
        ('[ours on] clean teal face', 40, 430, 420, 620),
        ('[ours on] crest/lip region', 450, 380, 660, 470),
        ('[ours on] flat foreground', 700, 600, 1200, 700),
    ],
}

print('tile = %d px' % F.TILE)
for path, boxes in BOXES.items():
    w, h, L = lum(path)
    for label, x0, y0, x1, y1 in boxes:
        show('%s %d,%d-%d,%d' % (label, x0, y0, x1, y1), box(L, x0, y0, x1, y1, F.TILE))
    print()
