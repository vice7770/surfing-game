"""Apply the frozen recipe to EVERY committed case frame. No new geometry formula/gates."""
import json,struct,math
from pathlib import Path
from prototype import transform,receipt,crossing_changes,lerp_profile
from measurement_functions import segment_intersections,vertical_crossings
W=Path('/private/tmp/tube-whole-curl-profile-20261004/descending-lip');index=json.load(open('/private/tmp/tube-monotone-inner-profile-20261004/eligible-cases.json'))
assert not (W/'full-factory-coverage.json').exists()
F32=lambda v:struct.unpack('<f',struct.pack('<f',v))[0]
def rounded(points):return [{'point':p['point'],'q':F32(p['q']),'y':F32(p['y'])} for p in points]
def floor(p):
 tip=p[64];hits=[h for h in vertical_crossings(p,tip['q'],88,127) if h['y']<tip['y']];return max(hits,key=lambda h:h['y'],default=None)
cases=[];bad=[]
for reference in index['cases']:
 path=Path(reference['asset']['file']);b=path.read_bytes();magic,size=struct.unpack_from('<II',b);assert magic in (0x42524c31,0x42524c32);meta=json.loads(b[8:8+size]);start=8+((size+3)//4)*4;raw=struct.unpack('<'+str((len(b)-start)//4)+'f',b[start:]);count=len(raw)//258 if magic==0x42524c32 else len(raw)//256;rows=[]
 for f in range(count):
  points=[{'point':i,'q':raw[f*256+2*i],'y':raw[f*256+2*i+1]} for i in range(128)];after,m=transform(points)
  tau=meta['tauStart']+f*meta['tauStep'];row={'frame':f,'tau':tau,'phase':'post' if tau>meta['touchdown'] else 'pre' if tau<0 else 'open','valid':after is not None,'maturity':m['maturity'],'recipe':m,'before':points,'after':rounded(after) if after else None}
  rows.append(row)
  if after is None:bad.append({'case':meta['id'],**{k:row[k] for k in ('frame','tau','phase','maturity','recipe')}})
 cases.append({'asset':receipt(path),'meta':meta,'frameCount':count,'activeFrames':sum(s['maturity']>0 for s in rows),'frames':rows})
preflight={'allFrames':sum(c['frameCount'] for c in cases),'activeFrames':sum(c['activeFrames'] for c in cases),'invalidFrames':len(bad),'invalid':bad}
(W/'full-factory-preflight.json').write_text(json.dumps(preflight,indent=2)+'\n');print(json.dumps(preflight),flush=True)
# Any active invalid violates the frozen transform-all policy; do not invent a fallback or continue measurements as a pass.
if bad:
 (W/'full-factory-coverage.json').write_text(json.dumps({'schema':'whole-curl-full-factory/v1','complete':True,'policy':'Transform allframes with frozen recipe; any active invalid is a failed candidate, m0 raw','preflight':preflight,'stoppedForInvalidGeometry':True,'sourceFiles':[receipt(W/'prototype.py'),receipt(W/'recipe.md')],'cases':[{'id':c['meta']['id'],'frameCount':c['frameCount'],'activeFrames':c['activeFrames']} for c in cases]},indent=2)+'\n')
 raise SystemExit(0)
changes=[];interpolations=[];td=[]
for c in cases:
 for s in c['frames']:
  ch=crossing_changes(segment_intersections(s['before']),segment_intersections(s['after']));s['crossingChange']=ch
  if ch['newPairs'] or ch['retainedPairsMoved']:changes.append({'case':c['meta']['id'],'frame':s['frame'],'phase':s['phase'],'maturity':s['maturity'],'change':ch})
  if abs(s['tau']-c['meta']['touchdown'])<=c['meta']['tauStep']*1.01:td.append({'case':c['meta']['id'],'frame':s['frame'],'phase':s['phase'],'tau':s['tau'],'touchdown':c['meta']['touchdown'],'maturity':s['maturity'],'tip':s['after'][64],'floorBelowTip':floor(s['after']),'change':ch})
 for a,b in zip(c['frames'],c['frames'][1:]):
  for share in (.25,.5,.75):
   old=rounded(lerp_profile(a['before'],b['before'],share));new=rounded(lerp_profile(a['after'],b['after'],share));ch=crossing_changes(segment_intersections(old),segment_intersections(new))
   if ch['newPairs'] or ch['retainedPairsMoved']:interpolations.append({'case':c['meta']['id'],'frames':[a['frame'],b['frame']],'share':share,'beforePhases':[a['phase'],b['phase']],'change':ch})
summary={'schema':'whole-curl-full-factory/v1','complete':True,'policy':'Transform allframes with frozen recipe; any active invalid is a failed candidate, m0 raw','preflight':preflight,'stoppedForInvalidGeometry':False,'float32TransformedFrameRounding':True,
 'framesWithNewPairs':sum(bool(x['change']['newPairs']) for x in changes),'framesCleanBecomingCrossed':sum(x['change']['beforePairCount']==0 and x['change']['afterPairCount']>0 for x in changes),'framesPairCountIncrease':sum(x['change']['afterPairCount']>x['change']['beforePairCount'] for x in changes),'framesPairCountDecrease':sum(s['crossingChange']['afterPairCount']<s['crossingChange']['beforePairCount'] for c in cases for s in c['frames']),
 'changedCrossings':changes,'adjacentFrameInterpolationSampleCount':sum((c['frameCount']-1)*3 for c in cases),'adjacentFrameChangedPairs':interpolations,'adjacentFrameCleanBecomingCrossed':sum(x['change']['beforePairCount']==0 and x['change']['afterPairCount']>0 for x in interpolations),'adjacentFramePairCountIncrease':sum(x['change']['afterPairCount']>x['change']['beforePairCount'] for x in interpolations),
 'touchdownNeighborCoverage':td,'touchdownNeighborMissingVerticalFloor':sum(x['floorBelowTip'] is None and x['maturity']>0 for x in td),
 'cases':[{'id':c['meta']['id'],'frameCount':c['frameCount'],'activeFrames':c['activeFrames'],'asset':c['asset']} for c in cases],
 'sourceFiles':[receipt(W/'prototype.py'),receipt(W/'recipe.md'),receipt(W/'full-factory-coverage.py')],
 'limits':['No production/native/contact/body validation.','maturity handles geometry, no time/phase gate.','Cross-case blend still needs verification at actual production queries.','Vertical floor coverage does not prove actual touchdown of raised tip.']}
(W/'full-factory-coverage.json').write_text(json.dumps(summary,indent=2)+'\n')
(W/'full-factory-profiles.json').write_text(json.dumps(cases,separators=(',',':'))+'\n')
print(json.dumps({k:summary[k] for k in ('framesWithNewPairs','framesCleanBecomingCrossed','framesPairCountIncrease','adjacentFrameInterpolationSampleCount','adjacentFrameCleanBecomingCrossed','adjacentFramePairCountIncrease','touchdownNeighborMissingVerticalFloor')}),flush=True)
