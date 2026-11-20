import sys
src=open('px.py').read().split('if __name__')[0]
exec(src)
img=load(sys.argv[1])
def luma(x,y):
    p=px(img,x,y,0); return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
for spec in sys.argv[2:]:
    x,y0,y1=map(int,spec.split(':'))
    L=[luma(x,y) for y in range(y0,y1)]
    # detrend with 15 px running mean, report rms of residual and count of sign changes
    k=15; res=[]
    for i in range(k,len(L)-k):
        m=sum(L[i-k:i+k+1])/(2*k+1); res.append(L[i]-m)
    rms=(sum(r*r for r in res)/len(res))**0.5
    zc=sum(1 for i in range(1,len(res)) if res[i]*res[i-1]<0)
    print(spec,'rms luma residual %.2f'%rms,'zero crossings',zc,'over',len(res),'px')
