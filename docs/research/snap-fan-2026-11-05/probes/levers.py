# The options table from ../data/levers/ (zz-fanPivot runs: L-<lever>-flat|climb, F-<lever>-r<ramp>-a<after>).
import json,glob,os,sys
S=sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','data','levers')+'/'
names=['base','back03','back1','stamp03','counter','notwist','rot04','rail55','rail70']
def load(f): return json.load(open(S+f+'.json'))
for n in names:
    flat=load(f'L-{n}-flat'); climb=load(f'L-{n}-climb')
    falls=0; tot=0; pad=0
    for ramp in ['0.2','0']:
        for after in ['1','0.5','0']:
            for x in load(f'F-{n}-r{ramp}-a{after}'):
                tot+=1
                if x['fell'] is not None: falls+=1; pad+= (ramp=='0')
    cf=[x for x in climb if x['fell'] is not None]
    def cell(x):
        t=x['turn']; return f"{t['at10']}°/{t['peak']}"
    c={x['case'].split(': ')[0]:x for x in climb}
    f={x['case'].split(': ')[0]:x for x in flat}
    finmax=max(x['turn']['finMax'] for x in flat+climb)
    slip=max(x['turn']['slipTime'] for x in flat+climb)
    print(f"{n:8} | flat7 {cell(f['flat 7'])} flat9 {cell(f['flat 9'])} | c150/6.7 {cell(c['climb 150° 6.7'])} c150/8 {cell(c['climb 150° 8'])} c120/6.7 {cell(c['climb 120° 6.7'])} c120/8 {cell(c['climb 120° 8'])} | fin max {finmax} slip {slip}s | flat falls {falls}/{tot} (pad {pad}) climb falls {len(cf)}/4 {[x['fell'] for x in cf]} | mean c150/6.7 {c['climb 150° 6.7']['turn']['spanMean']} 1s-from-onset {c['climb 150° 6.7']['turn']['onset1s']} kept {c['climb 150° 6.7']['turn']['kept1']} | flat7 apex {f['flat 7']['fan']['aftApex']} drawn {f['flat 7']['fan']['drawn95']} flat9 apex {f['flat 9']['fan']['aftApex']} drawn {f['flat 9']['fan']['drawn95']}")
