import sys, math
D=sys.argv[1]
def ss(u):
    u=max(0,min(1,u)); return u*u*(3-2*u)
for run in sys.argv[2:]:
    fronts={}
    for l in open(f'{D}/{run}.fronts.tsv'):
        if l[0]=='#': continue
        c=l.split('\t'); fronts.setdefault(c[0],[]).append((int(c[1]),float(c[2]),float(c[3]),c[4],float(c[5]),float(c[6]),float(c[7])))
    times=sorted(fronts,key=float)
    idx={t:i for i,t in enumerate(times)}
    print(run)
    n=0
    for l in open(f'{D}/{run}.rise.tsv'):
        if l[0]=='#': continue
        c=l.rstrip('\n').split('\t')
        try: tau=float(c[3]);a0=float(c[10]);a1=float(c[12]);x=float(c[26]);z=float(c[27]);d0=float(c[11]);d1=float(c[13]);foot=float(c[23])
        except: continue
        if c[2]!='1' or not(-1<=tau<0) or not (a0>0.02 and a1>0.02): continue
        if a0-a1<=0.005: continue
        n+=1
        band=0.25*foot/0.85
        h0=ss(d0/band); h1=ss(d1/band)
        t=c[0]; i=idx.get(t)
        prev=fronts.get(times[i-1],[]) if i else []
        cur=fronts.get(t,[])
        def near(P): 
            P=[p for p in P if abs(p[1]-x)<=3.1 and abs(p[2]-z)<8]
            return sorted(P,key=lambda p:p[1])
        a=near(prev); b=near(cur)
        print('  t %s %s tau %.3f x %.2f z %.2f share %.3f->%.3f (a_tau %.3f->%.3f, a_h %.3f->%.3f) last %s'%(t,c[1][:14],tau,x,z,a0,a1,a0/h0 if h0 else float('nan'),a1/h1 if h1 else float('nan'),h0,h1,c[8]))
        print('     prev:',' '.join('k%d x%.2f z%.2f f%s s%.2f tau%.3f'%p[:6] for p in a))
        print('     now :',' '.join('k%d x%.2f z%.2f f%s s%.2f tau%.3f'%p[:6] for p in b))
    print('  drops',n)
