# NOTE: the dumps here are gzipped. `gunzip -k *.ticks.jsonl.gz` beside this file first, or point the script at
# the directory the probe wrote (`python3 <this>.py <dir>`).
import json,sys,os
S=sys.argv[1]
ARMS=['f73-l','s16-l','s16-g']
def load(tag):
    rows=[]
    for a in ARMS:
        for line in open(f'{S}/{a}.{tag}.ticks.jsonl'):
            d=json.loads(line); d['arm']=a; rows.append(d)
    return rows
def med(v):
    v=sorted(v); n=len(v)
    return float('nan') if n==0 else (v[n//2] if n%2 else .5*(v[n//2-1]+v[n//2]))
CUTS={
 'A clamped (<4), |roll|<=25': lambda d: d['speedClamped']==1 and abs(d['roll'])<=25,
 'B clamped, speed<=1.6, |roll|<=25': lambda d: d['speedClamped']==1 and d['speed']<=1.6 and abs(d['roll'])<=25,
 'C unclamped (4-12), |roll|<=25': lambda d: d['speedClamped']==0 and abs(d['roll'])<=25,
}
for tag,name in [('ships','the SHIPPED ride'),('f45','the floor-4.5 ride')]:
    rows=load(tag)
    print(f'## on {name}\'s own ticks: sign share of the model\'s side force with row \'4\' and with row \'4.5\', SAME state')
    print(f"{'cut':34s} {'stance':9s} {'n':>5s} | {'row4 sign':>9s} {'row4.5 sign':>11s} {'flipped':>8s} | {'row4 |r|':>8s} {'row4.5 |r|':>10s}")
    for cn,cf in CUTS.items():
        for st in ['tall','crouch','compress']:
            c=[d for d in rows if d['live']==1 and d['stance']==st and cf(d) and abs(d['yGame'])>1e-6 and abs(d['yModel'])>1e-6 and abs(d['yModelFloor'])>1e-6]
            if not c: continue
            s4=sum(1 for d in c if (d['yGame']>0)==(d['yModel']>0))/len(c)
            s45=sum(1 for d in c if (d['yGame']>0)==(d['yModelFloor']>0))/len(c)
            fl=sum(1 for d in c if (d['yModel']>0)!=(d['yModelFloor']>0))/len(c)
            r4=med([abs(d['yModel']/d['yGame']) for d in c]); r45=med([abs(d['yModelFloor']/d['yGame']) for d in c])
            print(f'{cn:34s} {st:9s} {len(c):5d} | {s4:9.3f} {s45:11.3f} {fl:8.3f} | {r4:8.3f} {r45:10.3f}')
        print()
