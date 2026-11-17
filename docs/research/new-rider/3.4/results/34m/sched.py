# NOTE: the dumps here are gzipped. `gunzip -k *.ticks.jsonl.gz` beside this file first, or point the script at
# the directory the probe wrote (`python3 <this>.py <dir>`).
import json,sys
S=sys.argv[1]; ARMS=['f73-l','s16-l','s16-g']
rows=[]
for a in ARMS:
    for line in open(f'{S}/{a}.ships.ticks.jsonl'):
        rows.append(json.loads(line))
def med(v):
    v=sorted(v); n=len(v)
    return float('nan') if n==0 else (v[n//2] if n%2 else .5*(v[n//2-1]+v[n//2]))
CUTS={'A clamped (<4), |roll|<=25': lambda d: d['speedClamped']==1 and abs(d['roll'])<=25,
 'B clamped, speed<=1.6, |roll|<=25': lambda d: d['speedClamped']==1 and d['speed']<=1.6 and abs(d['roll'])<=25}
print("# the SHIPPED ride's own ticks. Three models at the same state: the tick's own V (3.4j/k/l's quantity),")
print("# the same with the table read off a 4.5 floor, and the CONTROLLER's own design point (V = 4, row '4').")
print(f"{'cut':34s} {'stance':9s} {'n':>5s} | {'V=tick row4':>11s} {'V=tick r4.5':>11s} {'V=4 (sched)':>11s} | {'|r| V=tick':>10s} {'|r| V=4':>8s}")
for cn,cf in CUTS.items():
    for st in ['tall','crouch','compress']:
        c=[d for d in rows if d['live']==1 and d['stance']==st and cf(d) and abs(d['yGame'])>1e-6 and abs(d['yModel'])>1e-6 and abs(d['yModelSched'])>1e-6]
        if not c: continue
        f=lambda k: sum(1 for d in c if (d['yGame']>0)==(d[k]>0))/len(c)
        print(f"{cn:34s} {st:9s} {len(c):5d} | {f('yModel'):11.3f} {f('yModelFloor'):11.3f} {f('yModelSched'):11.3f} | "
              f"{med([abs(d['yModel']/d['yGame']) for d in c]):10.3f} {med([abs(d['yModelSched']/d['yGame']) for d in c]):8.3f}")
    print()
