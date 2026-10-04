"""Check stable weighted-handle arithmetic and continuity against frozen formulas."""
import json,importlib.util,copy,math
from pathlib import Path
from prototype import transform
W=Path('/private/tmp/tube-whole-curl-profile-20261004/descending-lip')
spec=importlib.util.spec_from_file_location('old_recipe',str(W.parent/'prototype.py'));old=importlib.util.module_from_spec(spec);spec.loader.exec_module(old)
base=[{k:p[k] for k in ('point','q','y')} for p in json.load(open(W/'report.json'))['actual'][2]['beforePolyline']]
rows=[]
for slope in (-1,0,1e-12,1e-9,1e-6,1e-3,.01,.1,1,10):
 p=copy.deepcopy(base);B=next(q for q in p if q['point']==88);N=next(q for q in p if q['point']==89);N['q']=B['q']+.1;N['y']=B['y']-.1*slope
 after,meta=transform(p);assert after is not None;assert all(math.isfinite(q[k]) for q in after for k in ('q','y'))
 row={'slope':slope,'descent':meta.get('normalizedDescent'),'maturity':meta['maturity'],'maximumDisplacement':max(math.hypot(q['q']-v['q'],q['y']-v['y']) for q,v in zip(after,p))}
 if slope in (.01,.1,1,10):
  before_gate,om=old.transform(p);assert before_gate is not None;face=meta['descendingFaceFormation']
  expected=[{k:v[k]+face*(q[k]-v[k]) for k in ('q','y')} for q,v in zip(before_gate,p)]
  difference=max(abs(q[k]-v[k]) for q,v in zip(after,expected) for k in ('q','y'));assert difference<1e-11;row['maxDifferenceFromAlgebraicDirectForm']=difference
 if slope<=0:assert after==p
 rows.append(row)
assert rows[2]['maximumDisplacement']<1e-9 and rows[3]['maximumDisplacement']<1e-6 and rows[4]['maximumDisplacement']<1e-3
(W/'arithmetic-check.json').write_text(json.dumps({'complete':True,'finiteAndContinuousAtHorizontal':True,'noDivisionByNormalizedDescent':True,'directFormEquivalentModerateSlopes':True,'rows':rows},indent=2)+'\n')
print(json.dumps({'complete':True,'maximumDirectFormDifference':max(x.get('maxDifferenceFromAlgebraicDirectForm',0) for x in rows),'horizontalLimitRows':rows[:5]}))
