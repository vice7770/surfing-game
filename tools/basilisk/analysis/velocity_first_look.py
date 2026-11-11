import json, math, glob, statistics as st
def med(a): return st.median(a) if a else float('nan')
def slope(ts, xs):
    n=len(ts); mt=sum(ts)/n; mx=sum(xs)/n
    d=sum((t-mt)**2 for t in ts)
    return sum((t-mt)*(x-mx) for t,x in zip(ts,xs))/d if d>0 else float('nan')
for case in ['pool_straight_small','pool_straight_big','canyon23_a38']:
    V=json.load(open(f'docs/research/pool-tube-flow/data/periodic_{case}_L13_velocity.json'))
    lf=[f for f in glob.glob(f'docs/research/*/data/periodic_{case}_L13_library.json')][0]
    L=json.load(open(lf))
    h0=V['h0_m']; U0=math.sqrt(9.81*h0); T0=math.sqrt(h0/9.81)
    F=L['frames']; G=V['frames']; ix=L['indices']
    assert len(F)==len(G)
    taus=[f['tau'] for f in F]
    print(f"\n== {case}: h0 {h0} m, speed unit {U0:.2f} m/s, time unit {T0:.3f} s, frames {len(F)}, impact at tau {V['t_impact']-V['t_vertical']:.2f} ({(V['t_impact']-V['t_vertical'])*T0:.2f} s), missing {V['match']['missing']}, match median {V['match']['median']*h0*100:.1f} cm")
    def local(i, key, w=0.25):
        ts=[];xs=[]
        for j,f in enumerate(F):
            if abs(f['tau']-taus[i])<=w:
                p = f['crest'] if key=='crest' else f['profile'][ix[key]]
                ts.append(f['t']); xs.append(p[0])
        return slope(ts,xs)
    print("tau\ts\tphase\tH m\tcrest speed\ttoe speed\twater at crest\tB\tfastest water\tat pt\tfastest/crest spd\tmid-face water speed in wave frame at the 5 depths, m/s\tq/ruling-4\tq/Bernoulli\tface pts")
    for target in [-3,-2,-1.5,-1,-0.75,-0.5,-0.25,0,0.5,1,1.5,2]:
        i=min(range(len(F)), key=lambda j: abs(taus[j]-target))
        if abs(taus[i]-target)>0.06: continue
        f=F[i]; g=G[i]; P=f['profile']; u=g['u']; v=g['v']
        Cc=local(i,'crest'); Ct=local(i,'toe')
        # crest point: highest profile point
        ic=max(range(len(P)), key=lambda k: P[k][1])
        def val(a,k,d=0):
            x=a[k][d] if a[k] is not None else None
            return x
        uc=val(u,ic); 
        best=None
        for k in range(len(P)):
            x=val(u,k)
            if x is not None and (best is None or x>best[0]): best=(x,k)
        yc=P[ic][1]; yt=f['trough']
        # front-face points between the crest and the toe, in the fixed frame; wave frame speed C = crest speed
        C=Cc
        ra=[];rb=[];mid=None
        for k in range(ic+1, ix['toe']):
            if u[k] is None or u[k][0] is None or v[k][0] is None: continue
            y=P[k][1]; drop=yc-y
            if drop<0.15*(yc-yt) or drop>0.9*(yc-yt): continue
            q=math.hypot(u[k][0]-C, v[k][0])
            qa=math.sqrt(2*drop); qb=math.sqrt((C-(uc or 0))**2+2*drop)
            ra.append(q/qa); rb.append(q/qb)
            if mid is None and drop>=0.5*(yc-yt): mid=k
        md=''
        if mid is not None:
            md=' '.join('%.2f'%(math.hypot(u[mid][d]-C, v[mid][d])*U0) if u[mid][d] is not None and v[mid][d] is not None else '-' for d in range(5))
        print(f"{taus[i]:.2f}\t{taus[i]*T0:.2f}\t{f['phase']}\t{f['H_trough']*h0:.2f}\t{Cc*U0:.2f}\t{Ct*U0:.2f}\t{(uc*U0 if uc is not None else float('nan')):.2f}\t{(uc/Cc if uc is not None else float('nan')):.2f}\t{best[0]*U0:.2f}\t{best[1]}\t{best[0]/Cc:.2f}\t{md}\t{med(ra):.2f}\t{med(rb):.2f}\t{len(ra)}")
    # when does B pass 0.85 and 1
    first={}
    for i,(f,g) in enumerate(zip(F,G)):
        P=f['profile']; ic=max(range(len(P)), key=lambda k: P[k][1])
        if g['u'][ic] is None or g['u'][ic][0] is None: continue
        B=g['u'][ic][0]/local(i,'crest')
        mx=max((x[0] for x in g['u'] if x is not None and x[0] is not None), default=None)
        for lim in (0.85,1.0):
            if B>=lim and ('c',lim) not in first: first[('c',lim)]=taus[i]
            if mx is not None and mx/local(i,'crest')>=lim and ('m',lim) not in first: first[('m',lim)]=taus[i]
    print('first tau where water at the crest top reaches 0.85 / 1.0 of the crest speed:', first.get(('c',0.85)), first.get(('c',1.0)), '| fastest surface water anywhere:', first.get(('m',0.85)), first.get(('m',1.0)))
