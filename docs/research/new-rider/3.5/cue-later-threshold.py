"""3.5u: the cue-later threshold from 3.5t's committed catch data. Run from results/35t."""
import gzip,json,statistics as st
def load(p):
    R=[];M={}
    for l in gzip.open(p,'rt'):
        x=json.loads(l)
        if x.get('kind')=='f': R.append(x)
        else: M.setdefault(x.get('kind'),[]).append(x)
    return R,M
def near(R,t): return min(R,key=lambda q:abs(q['t']-t))
costs=[];P=[];dur=[]
for run in range(10):
    R,M=load(f'catch/c-paddle-{run}.jsonl.gz'); cue=M['summary'][0]['cue']
    Rc,Mc=load(f'catch/c-cue-{run}.jsonl.gz'); sc=Mc['summary'][0]
    standRow=next(r for r in Rc if r['tS'] is not None)
    pr=near(R,standRow['t'])
    cost=pr['vW']-standRow['vW']; costs.append(cost); dur.append(sc['stand']-sc['pop'])
    P.append((run,R,cue,cost))
    print(f"run{run} pop {sc['pop']} stand {sc['stand']} dur {sc['stand']-sc['pop']:.3f} standVW {standRow['vW']} paddleVW@{pr['t']} {pr['vW']} cost {cost:.3f}")
print('cost median',st.median(costs),'range',min(costs),max(costs),'dur',set(round(d,3) for d in dur))
cmed=st.median(costs); cmax=max(costs)
for th in [3.3,3.4,3.5,3.6,3.7,3.8,3.9,4.0]:
    own=[];medc=[];maxc=[];lead=[]
    for run,R,cue,cost in P:
        after=[r for r in R if r['t']>=cue-1e-6]
        r=next((q for q in after if q['vW']>=th and q['cue']==1),None)
        # pop happens on next step after cue lights (pop - cue = 1/60)
        tp=r['t']+1/60; ts=tp+1.2
        v=near(R,ts)['vW']
        own.append(v-cost);medc.append(v-cmed);maxc.append(v-cmax);lead.append(r['t']-cue)
    f=lambda a:f"min {min(a):.2f} med {st.median(a):.2f} n>=4.4 {sum(x>=4.4 for x in a)}"
    print(f"X={th}: cue later by med {st.median(lead):.2f} ({min(lead):.2f}..{max(lead):.2f}) | own-cost {f(own)} | med-cost {f(medc)} | max-cost {f(maxc)}")
