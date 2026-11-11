import sys, zlib, struct
def load(path):
    d=open(path,'rb').read(); p=8; idat=b''
    while p<len(d):
        n,t=struct.unpack('>I4s',d[p:p+8]); c=d[p+8:p+8+n]; p+=12+n
        if t==b'IHDR': w,h,bd,ct=struct.unpack('>IIBB',c[:10])
        elif t==b'IDAT': idat+=c
    bpp={2:3,6:4}[ct]; raw=zlib.decompress(idat); st=w*bpp; rows=[]; prev=bytearray(st); q=0
    for y in range(h):
        f=raw[q]; line=bytearray(raw[q+1:q+1+st]); q+=1+st
        if f==1:
            for i in range(bpp,st): line[i]=(line[i]+line[i-bpp])&255
        elif f==2:
            for i in range(st): line[i]=(line[i]+prev[i])&255
        elif f==3:
            for i in range(st): line[i]=(line[i]+(((line[i-bpp] if i>=bpp else 0)+prev[i])>>1))&255
        elif f==4:
            for i in range(st):
                a=line[i-bpp] if i>=bpp else 0; b=prev[i]; c2=prev[i-bpp] if i>=bpp else 0
                pp=a+b-c2; pa=abs(pp-a); pb=abs(pp-b); pc=abs(pp-c2)
                line[i]=(line[i]+(a if pa<=pb and pa<=pc else b if pb<=pc else c2))&255
        rows.append(line); prev=line
    return w,h,bpp,rows
def px(img,x,y,r=2):
    w,h,bpp,rows=img; s=[0,0,0]; n=0
    for yy in range(y-r,y+r+1):
        for xx in range(x-r,x+r+1):
            for c in range(3): s[c]+=rows[yy][xx*bpp+c]
            n+=1
    return tuple(round(v/n) for v in s)
if __name__=='__main__':
    img=load(sys.argv[1])
    for a in sys.argv[2:]:
        if a.startswith('row'):
            _,y,x0,x1,step=a.split(':'); print(a,[px(img,x,int(y),1) for x in range(int(x0),int(x1),int(step))])
        elif a.startswith('col'):
            _,x,y0,y1,step=a.split(':'); print(a,[px(img,int(x),y,1) for y in range(int(y0),int(y1),int(step))])
        else:
            x,y=map(int,a.split(',')); print(a,px(img,x,y))
