# C2 step 5h: is a bright region white foam or bright water? mean r,g,b and the teal lead (g+b)/2 - r.
# python3 -I colour.py <png> <x0> <y0> <x1> <y1> <label>
import sys, statistics as st
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from png import read_png

def stats(path, x0, y0, x1, y1):
    w, h, c, d = read_png(path)
    R = []; G = []; B = []
    clip = 0; n = 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            i = (y * w + x) * c
            r, g, b = d[i], d[i + 1], d[i + 2]
            R.append(r); G.append(g); B.append(b)
            n += 1
            if max(r, g, b) >= 250: clip += 1
    return dict(n=n, r=st.mean(R), g=st.mean(G), b=st.mean(B), clip=clip / n)

for args in [a.split(',') for a in sys.argv[1:]]:
    path, x0, y0, x1, y1, label = args[0], *(int(a) for a in args[1:5]), args[5]
    s = stats(path, x0, y0, x1, y1)
    print('%-30s n %6d  r %5.1f g %5.1f b %5.1f   teal lead (g+b)/2-r %+6.1f   >=250 in any channel %5.1f%%'
          % (label, s['n'], s['r'], s['g'], s['b'], (s['g'] + s['b']) / 2 - s['r'], 100 * s['clip']))
