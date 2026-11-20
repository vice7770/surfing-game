import sys
rows=[l.split() for l in open(sys.argv[1])]
for r in rows:
    t=float(r[0]); zs=[float(c.split(':')[0]) for c in r[1:]]; e=[float(c.split(':')[1]) for c in r[1:]]
    out=[]
    for i in range(1,len(e)-1):
        if e[i]>e[i-1] and e[i]>e[i+1]:
            b,a=e[i-1],e[i+1]
            s3=min(.5,max(-.5,0.5*(b-a)/(b-2*e[i]+a)))
            p3=zs[i]+s3
            p5=float('nan')
            if 2<=i<len(e)-2:
                y=e[i-2:i+3]
                c2=(2*y[0]-y[1]-2*y[2]-y[3]+2*y[4])/14; c1=(-2*y[0]-y[1]+y[3]+2*y[4])/10
                p5=zs[i]+(-c1/(2*c2) if c2<0 else 0)
            lo=max(0,i-3); hi=min(len(e),i+4)
            w=[max(0,e[k]-0.85*e[i]) for k in range(lo,hi)]
            pc=sum(w[k-lo]*zs[k] for k in range(lo,hi))/sum(w)
            out.append(f"max {zs[i]:.1f} p3 {p3:.2f} p5 {p5:.2f} cen {pc:.2f}")
    print(t,' | '.join(out))
