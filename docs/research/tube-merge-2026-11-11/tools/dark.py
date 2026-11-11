import sys
sys.path.insert(0,'.')
from px import load
img=load(sys.argv[1]); w,h,bpp,rows=img
x0,y0,x1,y1=map(int,sys.argv[2].split(','))
c=[]
for y in range(y0,y1):
    r=rows[y]
    for x in range(x0,x1):
        R,G,B=r[x*bpp],r[x*bpp+1],r[x*bpp+2]
        c.append((R+G+B,x,y,(R,G,B)))
c.sort()
print('darkest',[ (x,y,rgb) for _,x,y,rgb in c[:8]])
n=sum(1 for s,_,_,rgb in c if rgb[0]<60 and rgb[1]<90)
print('navy count (R<60,G<90):',n,'of',len(c))
