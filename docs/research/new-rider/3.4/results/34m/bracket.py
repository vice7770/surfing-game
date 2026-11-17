# NOTE: the dumps here are gzipped. `gunzip -k *.ticks.jsonl.gz` beside this file first, or point the script at
# the directory the probe wrote (`python3 <this>.py <dir>`).
import json,sys
S=sys.argv[1]; ARMS=['f73-l','s16-l','s16-g']
def load(tag):
    rows=[]
    for a in ARMS:
        for line in open(f'{S}/{a}.{tag}.ticks.jsonl'):
            d=json.loads(line); rows.append(d)
    return rows
def med(v):
    v=sorted(v); n=len(v)
    return float('nan') if n==0 else (v[n//2] if n%2 else .5*(v[n//2-1]+v[n//2]))
CUTS={'A clamped (<4), |roll|<=25': lambda d: d['speedClamped']==1 and abs(d['roll'])<=25,
 'B clamped, speed<=1.6, |roll|<=25': lambda d: d['speedClamped']==1 and d['speed']<=1.6 and abs(d['roll'])<=25,
 'C unclamped (4-12), |roll|<=25': lambda d: d['speedClamped']==0 and abs(d['roll'])<=25}
TAGS=[('ships','floor 4 (ships)'),('f45','floor 4.5'),('f5','floor 5'),('f6','floor 6')]
data={t:load(t) for t,_ in TAGS}
print(f"{'cut':34s} {'stance':9s} | "+" | ".join(f"{n:>16s}" for _,n in TAGS))
print(f"{'':34s} {'':9s} | "+" | ".join(f"{'n   share  |r|':>16s}" for _ in TAGS))
for cn,cf in CUTS.items():
    for st in ['tall','crouch','compress']:
        cells=[]
        for t,_ in TAGS:
            c=[d for d in data[t] if d['live']==1 and d['stance']==st and cf(d) and abs(d['yGame'])>1e-6 and abs(d['yModel'])>1e-6]
            sr=sum(1 for d in c if (d['yGame']>0)==(d['yModel']>0))/len(c) if c else float('nan')
            ra=med([abs(d['yModel']/d['yGame']) for d in c]) if c else float('nan')
            cells.append(f"{len(c):4d} {sr:6.3f} {ra:5.2f}")
        print(f"{cn:34s} {st:9s} | "+" | ".join(f"{c:>16s}" for c in cells))
    print()
