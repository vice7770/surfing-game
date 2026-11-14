# C2 step 5g: the owner's reference photograph, measured from the pixels.
#
#   sips -s format png ../../tube-spray-reference-2026-11-14/owner-abu-dhabi-side-on.webp --out /tmp/ref.png
#   python3 reference-veil.py /tmp/ref.png
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

# crest from teal only (the unbroken water's top), per column; white crest foam sits just above it
crest={}
for x in range(0,1280,20):
    for y in range(280,430):
        if teal(x,y): crest[x]=y; break

# the veil's top: searching up from 20 px above the crest, the highest row whose 9-row running mean stays over THR
THR=100
print('x | crest(teal) y | veil top y | above crest px | above crest, H (H=274 px)')
for x in range(0,1280,40):
    cy=crest.get(x)
    if cy is None: continue
    top=None
    y=cy-20
    while y>4:
        run=st.mean(L[yy][x] for yy in range(max(0,y-4), y+5))
        if run<THR: break
        top=y; y-=1
    print('%4d | %3d | %s | %s | %s'%(x,cy,top,(cy-top) if top else '-', '%.2f'%((cy-top)/274) if top else '-'))

print()
print('pier contrast through the veil, rows 200-300 (the pier band):')
for name,(x0,x1) in {'veiled 600-900':(600,900),'veiled 420-600':(420,600),'edge 900-1050':(900,1050),'clear 1150-1270':(1150,1270)}.items():
    v=[L[y][x] for y in range(200,300) for x in range(x0,x1)]
    m=st.mean(v); s=st.pstdev(v)
    print('  %-16s mean %6.1f  sd %5.1f  RMS contrast sd/mean %.3f'%(name,m,s,s/m))
