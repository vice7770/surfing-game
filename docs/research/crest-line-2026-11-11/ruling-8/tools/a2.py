import sys, math
def q(v,p):
    v=sorted(v); return v[min(len(v)-1,int(p*len(v)))] if v else float('nan')
D=sys.argv[1]
for run in sys.argv[2:]:
    rows=[]
    for l in open(f'{D}/{run}.rise.tsv'):
        if l[0]=='#': continue
        c=l.rstrip('\n').split('\t')
        def f(i):
            try: return float(c[i])
            except: return float('nan')
        rows.append(dict(t=f(0),who=c[1],inC=c[2]=='1',tau=f(3),step=f(4),c=f(6),va=f(7),last=c[8],a0=f(10),a1=f(12),R=f(14),Atau=f(16),shape=f(18),slip=f(19),slope=f(21),x=f(26) if len(c)>26 else float('nan')))
    ok=[r for r in rows if r['inC'] and -0.5<=r['tau']<0 and r['slip']==r['slip']]
    pos=[r for r in ok if r['slip']>0.5]; neg=[r for r in ok if r['slip']<-0.5]
    print(run,'n',len(ok),'slip>0.5:',len(pos),'slip<-0.5:',len(neg))
    for name,g in (('pos',pos),('neg',neg)):
        if g: print('   %s: slip p50 %.2f; tau p50 %.2f; share p50 %.2f; slope p50 %.2f; va-c p50 %.2f; capped %d of %d; R p50 %.2f'%(name,q([r['slip'] for r in g],.5),q([r['tau'] for r in g],.5),q([r['a1'] for r in g],.5),q([r['slope'] for r in g],.5),q([r['va']-r['c'] for r in g],.5),sum(r['last']=='capped' for r in g),len(g),q([r['R'] for r in g],.5)))
    # kept vs capped: va-c
    for lab in ('kept','capped'):
        g=[r for r in rows if -0.5<=r['tau']<0 and r['last']==lab and r['va']==r['va']]
        if g: print('   %s n %d: va-c p5 %.2f p25 %.2f p50 %.2f p75 %.2f p95 %.2f; (va-c)/c p50 %.2f'%(lab,len(g),*[q([r['va']-r['c'] for r in g],p) for p in (.05,.25,.5,.75,.95)],q([(r['va']-r['c'])/r['c'] for r in g],.5)))
    g=[r for r in rows if -0.5<=r['tau']<0 and r['step']==r['step']]
    print('   clock step rate p5 %.2f p50 %.2f p95 %.2f'%tuple(q([r['step'] for r in g],p) for p in (.05,.5,.95)))
