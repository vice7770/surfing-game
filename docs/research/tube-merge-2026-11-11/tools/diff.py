import sys
from px import load
a=load(sys.argv[1]); b=load(sys.argv[2]); w,h,bp,ra=a; rb=b[3]
n=0; big=0; mx=0
for y in range(h):
    A=ra[y]; B=rb[y]
    if A==B: continue
    for x in range(w):
        d=max(abs(A[x*bp+c]-B[x*bp+c]) for c in range(3))
        if d: n+=1; mx=max(mx,d)
        if d>24: big+=1
print(sys.argv[1],'vs',sys.argv[2],'differ px',n,'over 24:',big,'max',mx)
