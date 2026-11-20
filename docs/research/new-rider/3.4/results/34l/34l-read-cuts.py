import json, math, os
from collections import Counter
S = os.path.dirname(os.path.abspath(__file__))
rows = []
for a in ['f73-l','s16-l','s16-g']:
    for line in open(f'{S}/out/{a}.ticks.jsonl'):
        d = json.loads(line); d['arm']=a; rows.append(d)
end={}
for d in rows:
    k=(d['arm'],d['stance'],d['entryAsked'],d['extra']); end[k]=max(end.get(k,0),d['t'])
def med(v):
    v=sorted(v); n=len(v)
    return float('nan') if n==0 else (v[n//2] if n%2 else .5*(v[n//2-1]+v[n//2]))
def qt(v,q):
    v=sorted(v); return float('nan') if not v else v[min(len(v)-1,int(q*len(v)))]
TABLE=[('4',46.4,.513),('4.5',25.9,.293),('5',19.3,.215),('5.5',15.3,.166),('6',12.6,.133),('6.5',10.7,.109),
       ('7',9.2,.091),('7.5',8.8,.085),('8',5.6,.056),('8.5',7.3,.07),('9',5.7,.045),('9.5',4.8,.042),
       ('10',5.7,.047),('10.5',4.3,.027),('11',4.4,.034),('11.5',4.8,.03),('12',2.9,.017)]
near=lambda t,d:(min(TABLE,key=lambda r:abs(r[1]-t))[0],min(TABLE,key=lambda r:abs(r[2]-d))[0])
CUTS={
 'A all clamped (<4 m/s), |roll|<=25': lambda d: d['speedClamped']==1 and abs(d['roll'])<=25,
 'B clamped, speed<=1.6, |roll|<=25': lambda d: d['speedClamped']==1 and d['speed']<=1.6 and abs(d['roll'])<=25,
 'C unclamped (4-12), |roll|<=25': lambda d: d['speedClamped']==0 and abs(d['roll'])<=25,
 'D clamped, t in (0.2,0.6]': lambda d: d['speedClamped']==1 and d['t']<=0.6,
 'E unclamped, t in (0.2,0.6]': lambda d: d['speedClamped']==0 and d['t']<=0.6,
}
print(f"{'cut':36s} {'stance':9s} {'n':>5s} {'spd':>6s} {'trimFace':>9s} {'(10-90)':>14s} {'draft':>7s} {'(10-90)':>15s} {'wet':>6s} | near trim/draft | per-tick modal draft row")
for cn,cf in CUTS.items():
    for st in ['tall','crouch','compress']:
        c=[d for d in rows if d['live']==1 and d['stance']==st and cf(d)]
        if not c: continue
        tf=[d['trimFace'] for d in c]; df=[d['draftFace'] for d in c]
        bt,bd=near(med(tf),med(df))
        cd=Counter(near(d['trimFace'],d['draftFace'])[1] for d in c).most_common(3)
        print(f"{cn:36s} {st:9s} {len(c):5d} {med([d['speed'] for d in c]):6.2f} {med(tf):9.2f} "
              f"{('%.1f-%.1f'%(qt(tf,.1),qt(tf,.9))):>14s} {med(df):7.4f} {('%.3f-%.3f'%(qt(df,.1),qt(df,.9))):>15s} "
              f"{med([d['wetShare'] for d in c]):6.3f} | '{bt}' / '{bd}' | {cd}")
    print()
print("# and the sign share on cuts A/B/C, terciles of |yGame| within the cell")
for cn in ['A all clamped (<4 m/s), |roll|<=25','B clamped, speed<=1.6, |roll|<=25','C unclamped (4-12), |roll|<=25']:
    cf=CUTS[cn]
    for st in ['tall','crouch','compress']:
        c=[d for d in rows if d['live']==1 and d['stance']==st and cf(d) and abs(d['yGame'])>1e-6 and abs(d['yModel'])>1e-6]
        if not c: continue
        ys=sorted(abs(d['yGame']) for d in c); t1,t2=qt(ys,1/3),qt(ys,2/3)
        parts=[]
        for lab,f in [('low',lambda d:abs(d['yGame'])<t1),('mid',lambda d:t1<=abs(d['yGame'])<t2),('high',lambda d:abs(d['yGame'])>=t2)]:
            s=[d for d in c if f(d)]
            sr=sum(1 for d in s if (d['yGame']>0)==(d['yModel']>0))/len(s) if s else float('nan')
            parts.append(f"{lab} n={len(s):4d} |yG|med={med([abs(d['yGame']) for d in s]):6.1f} ratio={med([abs(d['yModel']/d['yGame']) for d in s]):6.3f} sign={sr:.3f}")
        allsr=sum(1 for d in c if (d['yGame']>0)==(d['yModel']>0))/len(c)
        print(f"{cn:36s} {st:9s} n={len(c):5d} ALLsign={allsr:.3f} ratio={med([abs(d['yModel']/d['yGame']) for d in c]):6.3f} | "+" | ".join(parts))
    print()
