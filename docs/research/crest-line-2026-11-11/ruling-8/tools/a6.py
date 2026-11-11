import sys
H=0.85
for fn in sys.argv[1:]:
    print(fn)
    prev=None
    for l in open(fn):
        r=l.split()
        if len(r)<4: continue
        t=float(r[0]); zs=[float(c.split(':')[0]) for c in r[1:]]; e=[float(c.split(':')[1]) for c in r[1:]]
        i=max(range(len(e)),key=lambda k:e[k]); m=e[i]
        out={}
        if 0<i<len(e)-1:
            b,a=e[i-1],e[i+1]; out['p3']=zs[i]+min(.5,max(-.5,0.5*(b-a)/(b-2*e[i]+a)))
        for name,fr in (('cen25',0.25),):
            lev=m-fr*H; w=[max(0,v-lev) for v in e]; out[name]=sum(a*b for a,b in zip(w,zs))/sum(w)
        for name,fr in (('fx15',0.15),('fx25',0.25),('fx40',0.40),('fx50',0.5)):
            lev=m-fr*H
            for k in range(i,len(e)-1):
                if e[k]>=lev>e[k+1]:
                    out[name]=zs[k]+(e[k]-lev)/(e[k]-e[k+1]); break
        # steepest front slope place (max of -de/dz ahead of crest), parabola-refined
        sl=[e[k]-e[k+1] for k in range(len(e)-1)]
        j=max(range(i,len(sl)),key=lambda k:sl[k]) if i<len(sl) else None
        if j is not None:
            zj=zs[j]+0.5
            if 0<j<len(sl)-1:
                b,a=sl[j-1],sl[j+1]; d=b-2*sl[j]+a
                if d<0: zj+=min(.5,max(-.5,0.5*(b-a)/d))
            out['steep']=zj
        s=' '.join('%s %.2f%s'%(k,v,(' (%+.2f)'%(v-prev[k]) if prev and k in prev else '')) for k,v in out.items())
        print('  %.3f max %.1f | %s'%(t,zs[i],s))
        prev=out
