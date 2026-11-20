import json,sys,csv
import os
# Usage: python3 table.py round1-60451f1e round2-d49c1c87 round2-final (the folders under data/).
S=os.environ.get('DATA', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data'))
labels=sys.argv[1:]
def flat(L):
  out={}
  for r in json.load(open(f'{S}/{L}/flat.json')):
    tr=r['trace']; mv=[f for f in tr if f['ph']!='pre']
    at=lambda t:[f for f in tr if f['t']>=t-1e-9][0]
    h08=at(1.0)['hd']; v0=[f for f in tr if f['ph']=='move'][0]['v']
    out[r['case']]=dict(h08=h08, peak=max(abs(f['rate']) for f in mv), end=r['whole']['turned'], body=r['whole']['bodyTurned'], kept08=round(at(1.0)['v']/v0,2), kept2=r['whole']['kept'], drift=max(abs(f['drift']) for f in mv), pitch=max(f['pitch'] for f in mv), lead=r['move']['upperLead'], fell=r['fell'], cause=r['cause'])
  return out
for L in labels:
  print('=====',L)
  for k,v in flat(L).items(): print(' ',k,v)
  for r in json.load(open(f'{S}/{L}/climb.json')): print(' ',r['case'],{k:r[k] for k in ['at1','end','t150','peak','kept','least','drift','fell']})
  for r in json.load(open(f'{S}/{L}/two.json')):
    m1=r['m1'];m2=r['m2']
    print(f"  {r['case']}: m1 {m1['turned']}° {m1['time']}s pk{m1['peak']} kept{m1['kept']} body{m1['body']} lead{m1['lead']} | hi{r['highest']} | m2 {m2['turned']}° {m2['time']}s pk{m2['peak']} kept{m2['kept']} body{m2['body']} drift{m2['drift']} | lo{r['lowest']} | fell {r['fell']} {r['cause']}")
