import sys, math
D=sys.argv[1]
def q(v,p):
    v=sorted(v); return v[min(len(v)-1,int(p*len(v)))] if v else float('nan')
def ss(u):
    u=max(0,min(1,u)); return u*u*(3-2*u)
def clockOf(s):
    if not (0.001<s<0.999): return float('nan')
    return -0.5+0.5*(0.5-math.sin(math.asin(1-2*s)/3))
for run in sys.argv[2:]:
    tab={}
    fronts={}
    try:
        for l in open(f'{D}/{run}.fronts.tsv'):
            if l[0]=='#': continue
            c=l.split('\t'); fronts.setdefault(c[0],[]).append((float(c[2]),float(c[3]),float(c[6])))
    except: pass
    tracks={}
    for l in open(f'{D}/{run}.rise.tsv'):
        if l[0]=='#': continue
        c=l.rstrip('\n').split('\t')
        try: tau=float(c[3])
        except: continue
        if -0.5<=tau<0:
            k=(c[8],c[2]); tab[k]=tab.get(k,0)+1
        if len(c)<28: continue
        try: t=float(c[0]);step=float(c[4]);cc=float(c[6]);a0=float(c[10]);d0=float(c[11]);a1=float(c[12]);d1=float(c[13]);foot=float(c[23]);rx=float(c[24]);x=float(c[26]);z=float(c[27])
        except: continue
        if c[2]!='1' or not (-1<=tau<0) or not (a0>0.02 and a1>0.02): continue
        band=0.25*foot/0.85
        h0=ss(d0/band) if d0>0 else 0; h1=ss(d1/band) if d1>0 else 0
        if h0<=0 or h1<=0: continue
        r=(clockOf(a1/h1)-clockOf(a0/h0))*60
        if r!=r or step!=step: continue
        pts=[p for p in fronts.get(c[0],[]) if abs(p[0]-x)<=2.6 and abs(p[1]-z)<8 and p[2]<0.2]
        if len(pts)<3: continue
        n=len(pts); mx=sum(p[0] for p in pts)/n; mt=sum(p[2] for p in pts)/n
        den=sum((p[0]-mx)**2 for p in pts)
        g=sum((p[0]-mx)*(p[2]-mt) for p in pts)/den
        geo=step+g*cc*rx
        tracks.setdefault((c[1],int(t/10)),[]).append((t,r,geo,step,a0))
    print(run,'tau -0.5..0 rows by (last,inCase):',tab)
    if not tracks: continue
    # windows: runs of consecutive steps >= 6 long (0.1 s)
    ratios=[];rs=[]
    allr=[];allg=[]
    for k,v in tracks.items():
        v.sort()
        seg=[v[0]]
        segs=[]
        for a in v[1:]:
            if a[0]-seg[-1][0]<0.018: seg.append(a)
            else: segs.append(seg); seg=[a]
        segs.append(seg)
        for s in segs:
            for a in s: allr.append(a[1]); allg.append(a[2])
            # 0.1 s windows
            for i in range(0,len(s)-5,6):
                w=s[i:i+6]
                si=sum(a[1] for a in w)/6; sg=sum(a[2] for a in w)/6; so=sum(a[3] for a in w)/6
                ratios.append(si/sg if sg>0.2 else float('nan')); rs.append((si,sg,so))
    ratios=[r for r in ratios if r==r]
    print('   per step n %d: implied/geometric: within 20%% %d, within 35%% %d; negative implied %d'%(len(allr),sum(abs(a-b)<=0.2*abs(b) for a,b in zip(allr,allg)),sum(abs(a-b)<=0.35*abs(b) for a,b in zip(allr,allg)),sum(a<0 for a in allr)))
    print('   0.1 s windows n %d: mean implied/mean geometric p5 %.2f p25 %.2f p50 %.2f p75 %.2f p95 %.2f; within 20%% %d; implied/own p50 %.2f'%(len(ratios),*[q(ratios,p) for p in (.05,.25,.5,.75,.95)],sum(abs(r-1)<=0.2 for r in ratios),q([a/c for a,b,c in rs if c>0],.5)))
    print('   means: implied %.2f geometric %.2f own %.2f'%(sum(allr)/len(allr),sum(allg)/len(allg),sum(a[3] for v in tracks.values() for a in v)/len(allr)))
