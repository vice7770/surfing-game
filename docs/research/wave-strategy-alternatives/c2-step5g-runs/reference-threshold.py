# C2 step 5g: the owner's reference photograph, measured from the pixels.
#
#   sips -s format png ../../tube-spray-reference-2026-11-14/owner-abu-dhabi-side-on.webp --out /tmp/ref.png
#   python3 reference-threshold.py /tmp/ref.png
#
# `png.py` beside this is step 5d's pure-Python PNG reader (no decoder in the tree).
import sys
REF = sys.argv[1] if len(sys.argv) > 1 else '/tmp/ref.png'
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from png import read_png
import statistics as st
w,h,c,d = read_png(REF)
L=[[0.0]*w for _ in range(h)]
for y in range(h):
    for x in range(w):
        i=(y*w+x)*c
        L[y][x]=0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2]
def teal(x,y):
    i=(y*w+x)*c
    r,g,b=d[i],d[i+1],d[i+2]
    return (g+b)/2 - r > 40 and g>80
crest={}
for x in range(0,1280,20):
    for y in range(280,430):
        if teal(x,y): crest[x]=y; break
print('threshold sensitivity: the veil top over the crest at the barrel (x 400-700), in H (H=274 px)')
for THR in (70,85,100,120,140):
    vals=[]
    for x in range(400,701,20):
        cy=crest.get(x)
        if cy is None: continue
        top=None; y=cy-20
        while y>4:
            run=st.mean(L[yy][x] for yy in range(max(0,y-4),y+5))
            if run<THR: break
            top=y; y-=1
        if top: vals.append((cy-top)/274)
    print('  THR %3d -> median %.2f H  max %.2f H  (n=%d)'%(THR, st.median(vals), max(vals), len(vals)))
