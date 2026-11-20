import sys
sys.path.insert(0,'.')
from px import load
for f in sys.argv[1:]:
    w,h,bpp,rows=load(f); red=green=blue=0; gx=[]; bx=[]
    for y in range(h):
        r=rows[y]
        for x in range(w):
            R,G,B=r[x*bpp],r[x*bpp+1],r[x*bpp+2]
            if R>110 and G<70 and B<70: red+=1
            elif G>150 and R<90 and B<140: green+=1; gx.append(x)
            elif B>150 and R<110 and G<160 and G>70: blue+=1
    print(f.split('/')[-2:], 'red',red,'green',green,'blue',blue, 'green x-range', (min(gx),max(gx)) if gx else None)
