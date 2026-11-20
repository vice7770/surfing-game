import sys, math
H=float(sys.argv[1])
def q(v,p):
    v=sorted(v); return v[min(len(v)-1,int(p*len(v)))] if v else float('nan')
def ss(u):
    u=max(0,min(1,u)); return u*u*(3-2*u)
def clockOf(s):
    if not (0.001<s<0.999): return float('nan')
    return -0.5+0.5*(0.5-math.sin(math.asin(1-2*s)/3))
for f in sys.argv[2:]:
    fronts={}
    for l in open(f.replace('.rise.','.fronts.')):
        if l[0]=='#': continue
        c=l.split('\t'); fronts.setdefault(c[0],[]).append((float(c[2]),float(c[3]),float(c[6]),c[4]))
    imp=[];pred=[];own=[];ratio=[];off=0;gs=[]
    for l in open(f):
        if l[0]=='#': continue
        c=l.rstrip('\n').split('\t')
        try:
            t=c[0];tau=float(c[3]);step=float(c[4]);cc=float(c[6]);a0=float(c[10]);d0=float(c[11]);a1=float(c[12]);d1=float(c[13]);foot=float(c[23]);rx=float(c[24]);rz=float(c[25]);x=float(c[26]);z=float(c[27])
        except: continue
        if c[2]!='1' or not (-1<=tau<0) or not (a0>0.02 and a1>0.02): continue
        band=0.25*foot/H if foot>0 else 0.25
        h0=ss(d0/band) if d0>0 else 0; h1=ss(d1/band) if d1>0 else 0
        if h0<=0 or h1<=0: continue
        r=(clockOf(a1/h1)-clockOf(a0/h0))*60
        if r!=r or step!=step: continue
        pts=[p for p in fronts.get(t,[]) if abs(p[0]-x)<=2.6 and abs(p[1]-z)<8 and p[2]<0.2]
        if len(pts)<3: continue
        n=len(pts); mx=sum(p[0] for p in pts)/n; mt=sum(p[2] for p in pts)/n
        den=sum((p[0]-mx)**2 for p in pts)
        if den<=0: continue
        g=sum((p[0]-mx)*(p[2]-mt) for p in pts)/den
        p_=step+g*cc*rx
        imp.append(r);pred.append(p_);own.append(step);gs.append(g)
        if abs(r-p_)>0.2*abs(p_): off+=1
        if step>0: ratio.append(r/step)
    res=[a-b for a,b in zip(imp,pred)]
    print(f,'n',len(imp))
    print('  dtau/dx p50 %.3f; implied p50 %.2f; own p50 %.2f; geometric (own + g c rx) p50 %.2f'%(q(gs,.5),q(imp,.5),q(own,.5),q(pred,.5)))
    print('  implied - geometric: p5 %.2f p25 %.2f p50 %.2f p75 %.2f p95 %.2f; over 20%% off geometric on %d of %d'%(q(res,.05),q(res,.25),q(res,.5),q(res,.75),q(res,.95),off,len(imp)))
