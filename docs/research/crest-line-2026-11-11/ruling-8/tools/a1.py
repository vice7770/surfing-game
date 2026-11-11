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
        rows.append(dict(t=f(0),who=c[1],inC=c[2]=='1',tau=f(3),step=f(4),c=f(6),va=f(7),last=c[8],a0=f(10),a1=f(12),R=f(14),Atau=f(16),Ah=f(17),shape=f(18),slip=f(19),slope=f(21)))
    late=[r for r in rows if r['inC'] and -0.5<=r['tau']<0 and r['R']==r['R']]
    ok=[r for r in late if r['slip']==r['slip']]
    print(run,'n',len(late),'with parts',len(ok))
    print('  |R| p50 %.2f p95 %.2f max %.2f'%(q([abs(r['R']) for r in late],.5),q([abs(r['R']) for r in late],.95),max(abs(r['R']) for r in late)))
    print('  |R-slip| p50 %.2f p95 %.2f max %.2f   |R-slip-shape| p95 %.2f max %.2f'%(q([abs(r['R']-r['slip']) for r in ok],.5),q([abs(r['R']-r['slip']) for r in ok],.95),max(abs(r['R']-r['slip']) for r in ok),q([abs(r['R']-r['slip']-r['shape']) for r in ok],.95),max(abs(r['R']-r['slip']-r['shape']) for r in ok)))
    print('  |slip| p50 %.2f p95 %.2f; slip signed p50 %.2f; |Atau| p50 %.2f p95 %.2f; |shape| p50 %.2f p95 %.2f'%(q([abs(r['slip']) for r in ok],.5),q([abs(r['slip']) for r in ok],.95),q([r['slip'] for r in ok],.5),q([abs(r['Atau']) for r in ok],.5),q([abs(r['Atau']) for r in ok],.95),q([abs(r['shape']) for r in ok],.5),q([abs(r['shape']) for r in ok],.95)))
    # largest part in tail
    big=[r for r in ok if abs(r['R'])>2]
    cnt={}
    for r in big:
        k=max(('Atau','Ah','shape','slip'),key=lambda k:abs(r[k])); cnt[k]=cnt.get(k,0)+1
    print('  tail |R|>2:',len(big),cnt)
    # anchor state by tau bin, all rows
    for lo,hi in ((-0.6,-0.5),(-0.5,-0.25),(-0.25,0),(0,0.3)):
        b=[r for r in rows if lo<=r['tau']<hi and r['va']==r['va']]
        if not b: continue
        lc={}
        for r in b: lc[r['last']]=lc.get(r['last'],0)+1
        print('  tau %.2f..%.2f n %d va-c p5 %.2f p50 %.2f p95 %.2f  c p50 %.2f cap p50 %.2f  %s'%(lo,hi,len(b),q([r['va']-r['c'] for r in b],.05),q([r['va']-r['c'] for r in b],.5),q([r['va']-r['c'] for r in b],.95),q([r['c'] for r in b],.5),q([0.45*r['c']+0.3 for r in b],.5),lc))
