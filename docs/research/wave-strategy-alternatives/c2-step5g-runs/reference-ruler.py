# C2 step 5g: the owner's reference photograph, measured from the pixels.
#
#   sips -s format png ../../tube-spray-reference-2026-11-14/owner-abu-dhabi-side-on.webp --out /tmp/ref.png
#   python3 reference-ruler.py /tmp/ref.png
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

# 1. the water's top edge (crest) and the foreground flat-water line, per column
print('col | crest y | flat water y | wave px')
cr={}
for x in range(60,1280,60):
    crest=None
    for y in range(280,420):
        if teal(x,y) or L[y][x]>150:
            # first strongly non-pier row: either white crest foam or teal water
            crest=y; break
    flat=None
    for y in range(500,700):
        # the glassy foreground: bright and desaturated
        i=(y*w+x)*c
        r,g,b=d[i],d[i+1],d[i+2]
        if L[y][x]>170 and abs((g+b)/2-r)<35: flat=y; break
    cr[x]=(crest,flat)
    print('%4d | %s | %s | %s'%(x,crest,flat,(flat-crest) if crest and flat else '-'))
