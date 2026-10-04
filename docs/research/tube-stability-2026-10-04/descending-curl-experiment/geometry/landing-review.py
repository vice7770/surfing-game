"""Derive landing compatibility from retained before/after profiles; no candidate change."""
import json,math
from pathlib import Path
from measurement_functions import vertical_crossings
W=Path('/private/tmp/tube-whole-curl-profile-20261004/descending-lip');r=json.load(open(W/'report.json'))
def nearest_face(points,scale):
 p={v['point']:v for v in points};tip=p[64];best=None
 for i in range(88,max(p)):
  a,b=p[i],p[i+1]
  if not(a['q']<tip['q']+2*scale):continue
  dx,dy=b['q']-a['q'],b['y']-a['y'];l=dx*dx+dy*dy;t=min(1,max(0,((tip['q']-a['q'])*dx+(tip['y']-a['y'])*dy)/l)) if l else 0
  q,y=a['q']+t*dx,a['y']+t*dy;distance=math.hypot(tip['q']-q,tip['y']-y)
  hit={'q':q,'y':y,'distanceFromTip':distance,'segment':[i,i+1],'t':t}
  if best is None or distance<best['distanceFromTip']:best=hit
 return best
rows=[]
for scope,case,s,scale in [('meters',str(a['row']['row']),a,1) for a in r['actual']]+[('h0',c['id'],s,1) for c in r['cases'] for s in c['frames']]:
 old,new=s['beforePolyline'],s['afterPolyline'];a,b=nearest_face(old,scale),nearest_face(new,scale);tip=next(p for p in new if p['point']==64)
 floors=[h for h in vertical_crossings(new,tip['q'],88,max(p['point'] for p in new)) if h['y']<tip['y']]
 floor=max(floors,key=lambda h:h['y'],default=None)
 rows.append({'scope':scope,'id':case,'frame':s.get('frame'),'maturity':s['recipe']['maturity'],'beforeNearestFace':a,'afterNearestFace':b,'nearestAlongChange':b['q']-a['q'] if a and b else None,
              'verticalFloorBelowTip':{'q':tip['q'],**floor} if floor else None,'sameXFloorCoverage':bool(floor),'candidateTip':[tip['q'],tip['y']]})
result={'schema':'full-c-curl-landing-compatibility/v1','scope':'Existing retained initial/eligible frames only. NOT touchdown-frame coverage; original293 eligibility excludes many TD and later frames. Captured face only88..112, not the complete127 tail.',
 'source':'report.json','actual':[s for s in rows if s['scope']=='meters'],'caseFrameCount':293,'caseFramesWithoutVerticalFloor':sum(not s['sameXFloorCoverage'] for s in rows if s['scope']=='h0'),
 'maximumBackwardNearestAlongDrift':min((s for s in rows if s['scope']=='h0' and s['nearestAlongChange'] is not None),key=lambda s:s['nearestAlongChange']),
 'rows':rows,'proposal':'For analytic curl semantics, landing is a vertical projection beneath preserved tipX, using the highest lower-face crossing under the tip, rather than nearest Euclidean face. Retain nearest-face fallback only when projection is absent, disclose its count and validate transformed touchdown frames before acceptance.'}
(W/'landing-review.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ('actual','caseFramesWithoutVerticalFloor','maximumBackwardNearestAlongDrift')},indent=2))
