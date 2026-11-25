"""Step 3.5z: the fore/aft pitch ledger (led.pitchDn, rad/s, + nose down) by window after the stand, median over riders, for the
T falls, the N falls and the lasting stands below 4.6 m/s (`cue`).  python3 take-off-stall-ledwin.py <tag> <dir>..."""
import importlib.util, os, sys
spec=importlib.util.spec_from_file_location('t', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'take-off-stall.py')); t=importlib.util.module_from_spec(spec); spec.loader.exec_module(t)
tag=sys.argv[1]; dirs=sys.argv[2:]
ss=t.all_stands(tag,dirs,('cue',))
wins=[(-0.4,-0.0001),(0,0.15),(0.15,0.3),(0.3,0.5),(0.5,0.7)]
def lw(s,a,b,field='pitchDn'):
    out={}
    t0=s.summary['stand']
    for x in s.all:
        ts=x['t']-t0
        if a-1e-9<=ts<=b+1e-9:
            for k,v in ((x.get('led') or {}).get(field) or {}).items(): out[k]=out.get(k,0)+v
    return out
groups={'T':[],'N':[],'lasting<4.6':[]}
for s in ss:
    c,_=t.classify(s)
    if c=='T': groups['T'].append(s)
    elif c=='N': groups['N'].append(s)
    elif c=='held' and s.f0['vW']<4.6: groups['lasting<4.6'].append(s)
keys=['pressure','buoyancy','addedMass','fins','froth','leg','pitch','ankle','weight','gravity','carry']
for g,lst in groups.items():
    print(f'## {g} (n {len(lst)}): pitch ledger by window, median over riders (rad/s, + nose down)')
    print('| window | '+' | '.join(keys)+' | sum |')
    for a,b in wins:
        vals={k:[] for k in keys}; sums=[]
        for s in lst:
            d=lw(s,a,b)
            for k in keys: vals[k].append(d.get(k,0))
            sums.append(sum(d.values()))
        print(f'| {a:+.2f}..{b:+.2f} | '+' | '.join(f'{t.med(vals[k]):+.2f}' for k in keys)+f' | {t.med(sums):+.2f} |')
