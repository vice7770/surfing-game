# A coarse map of a frame: mean luminance and LOCAL sd (8 px tiles) over a 64 px grid, so boxes are
# picked from the data and not by eye.  python3 -I scan.py <png>
import sys
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from foam_relief import lum, box

path = sys.argv[1]
G = int(sys.argv[2]) if len(sys.argv) > 2 else 64
w, h, L = lum(path)
print(path, w, 'x', h, '- grid', G)
for what, key in (('mean', 'mean'), ('LOCAL sd x10', 'local')):
    print('--', what)
    print('      ' + ''.join('%5d' % x for x in range(0, w - G + 1, G)))
    for y in range(0, h - G + 1, G):
        row = []
        for x in range(0, w - G + 1, G):
            r = box(L, x, y, x + G, y + G)
            row.append(r['mean'] if key == 'mean' else r['local'] * 10)
        print('%5d ' % y + ''.join('%5.0f' % a for a in row))
