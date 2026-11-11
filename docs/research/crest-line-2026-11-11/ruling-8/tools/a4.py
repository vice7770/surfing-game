import sys
D=sys.argv[1]
def q(v,p):
    v=sorted(v); return v[min(len(v)-1,int(p*len(v)))] if v else float('nan')
for run in sys.argv[2:]:
    fronts={}
    for l in open(f'{D}/{run}.fronts.tsv'):
        if l[0]=='#': continue
        c=l.split('\t'); fronts.setdefault(c[0],[]).append((float(c[2]),float(c[3]),float(c[6])))
    xs=[];drops=[];alls=[]
    for l in open(f'{D}/{run}.rise.tsv'):
        if l[0]=='#': continue
        c=l.rstrip('\n').split('\t')
        try: tau=float(c[3]);a0=float(c[10]);a1=float(c[12]);x=float(c[26]);z=float(c[27])
        except: continue
        if c[2]!='1' or not(-1<=tau<0) or not (a0>0.02 and a1>0.02): continue
        P=[p for p in fronts.get(c[0],[]) if abs(p[1]-z)<8 and p[2]>=0]
        dthrown=min((abs(p[0]-x) for p in P),default=99)
        rec=(x,tau,dthrown,c[8],a0-a1,c[1][:2])
        alls.append(rec)
        if a0-a1>0.005: drops.append(rec)
    print(run,'steps',len(alls),'x p5 %.1f p50 %.1f p95 %.1f'%tuple(q([r[0] for r in alls],p) for p in (.05,.5,.95)),'| riders',sorted(set(r[5] for r in alls)))
    print('   all: within 1.5 m in x of a thrown point %d; capped %d; tau>-0.3: %d'%(sum(r[2]<=1.5 for r in alls),sum(r[3]=='capped' for r in alls),sum(r[1]>-0.3 for r in alls)))
    print('   drops %d: within 1.5 m of thrown %d; capped %d; tau>-0.3 %d; x %s; size max %.3f'%(len(drops),sum(r[2]<=1.5 for r in drops),sum(r[3]=='capped' for r in drops),sum(r[1]>-0.3 for r in drops),' '.join('%.1f'%r[0] for r in drops),max((r[4] for r in drops),default=0)))
