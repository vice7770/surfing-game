"""One exhaustive/predeclared analytic-profile evaluation. No adaptive tuning."""
from pathlib import Path
import collections,gzip,importlib.util,json,math,struct
W=Path('/private/tmp/tube-bounded-c-precision-v4-20261004');ROOT=Path('/Users/regina/Desktop/Projects/surfing-game')
sp=importlib.util.spec_from_file_location('analytic_trial',W/'prototype.py');p=importlib.util.module_from_spec(sp);sp.loader.exec_module(p)
def blend(a,b,t):return [{'point':x['point'],'q':p.F32(x['q']+(y['q']-x['q'])*t),'y':p.F32(x['y']+(y['y']-x['y'])*t)} for x,y in zip(a,b)]
def capfloor(points):
 events=sorted(set(a['q'] for a in points if 60<=a['point']<=68 or 96<=a['point']<=112));rows=[]
 for q in events:
  caps=p.old.vertical_crossings(points,q,60,68);floors=p.old.vertical_crossings(points,q,96,112)
  caps+=[{'y':a['y'],'segment':[a['point'],a['point']]} for a in points if 60<=a['point']<=68 and a['q']==q]
  floors+=[{'y':a['y'],'segment':[a['point'],a['point']]} for a in points if 96<=a['point']<=112 and a['q']==q]
  if caps and floors:
   c=min(caps,key=lambda a:a['y']);f=max(floors,key=lambda a:a['y']);rows.append({'q':q,'gap':c['y']-f['y'],'capSegment':c['segment'],'floorSegment':f['segment']})
 return min(rows,key=lambda a:a['gap']) if rows else None
def air(points,height):
 a=p.corridor_metrics(points,height)['floorToInnerRoofAir'];return {'continuousWidth':a['largestContinuousUsefulWidth'],'intervals':a['usefulIntervals'],'maxGap':a['maxGap'],'verticalThickness':a['verticalRoofSeparationWhereUseful']}
def allturns(points):
 reduced=[]
 for a in points:
  if not reduced or p.xy(a)!=p.xy(reduced[-1]['position']):reduced.append({'position':a,'indices':[a['point']]})
  else:reduced[-1]['indices'].append(a['point'])
 rows=[]
 for a,b,c in zip(reduced,reduced[1:],reduced[2:]):
  u=p.sub(p.xy(b['position']),p.xy(a['position']));v=p.sub(p.xy(c['position']),p.xy(b['position']));angle=abs(math.degrees(math.atan2(p.cross(u,v),p.dot(u,v))))
  if any(32<=i<=112 for i in b['indices']):rows.append({'indices':b['indices'],'absoluteTurnDegrees':angle})
 return {'maximum':max(rows,key=lambda a:a['absoluteTurnDegrees'],default=None),'over35':[a for a in rows if a['absoluteTurnDegrees']>35],'over90':[a for a in rows if a['absoluteTurnDegrees']>90]}
def sample(raw,z,metrics=False,scale=1,velocity=False):
 new,m=p.transform(raw,z,velocity);before=p.segment_intersections(raw);r={'valid':new is not None,'params':z,'model':m,'beforeCrossings':before}
 if new is None:return r
 after=p.segment_intersections(new);r.update({'afterCrossings':after,'crossingChange':p.crossing_changes(before,after),'anchorsAndOutsideExact':all(a==b for a,b in zip(raw,new) if a['point']<=32 or a['point']>=112),'finite':all(math.isfinite(a[k]) for a in new for k in ('q','y')),'turns':allturns(new),'rawTurns':allturns(raw),'zeroEdges':p.zero_edges(new),'collapsedOwnedMonotoneX':all(a['q']<=b['q'] for a,b in zip(new,new[1:]) if 32<=a['point']<112) if not m['sheetExists'] else None,'capFloor':capfloor(new) if m['sheetExists'] else None,'maximumDisplacement':max(p.norm(p.sub(p.xy(a),p.xy(b))) for a,b in zip(raw,new))})
 if metrics:
  r.update({'air113':air(new,1.13/scale),'air160':air(new,1.6/scale),'beforeAir113':air(raw,1.13/scale),'beforeAir160':air(raw,1.6/scale)})
 return r
def summary(rows):
 good=[r for r in rows if r['valid']];return {'attempted':len(rows),'valid':len(good),'invalid':len(rows)-len(good),'failures':dict(collections.Counter(e for r in rows for e in r['model']['failures'])),'finite':all(r['finite'] for r in good),'anchorsOutsideExact':all(r['anchorsAndOutsideExact'] for r in good),'beforeCrossed':sum(bool(r['beforeCrossings']) for r in good),'afterCrossed':sum(bool(r['afterCrossings']) for r in good),'cleanToCrossed':sum(not r['beforeCrossings'] and bool(r['afterCrossings']) for r in good),'pairIncrease':sum(r['crossingChange']['afterPairCount']>r['crossingChange']['beforePairCount'] for r in good),'newPairs':sum(bool(r['crossingChange']['newPairs']) for r in good),'maximumTurn':max((r['turns']['maximum']['absoluteTurnDegrees'] for r in good if r['turns']['maximum']),default=None),'capFloorPenetrations':sum(r['capFloor'] is not None and r['capFloor']['gap']< -1e-7 for r in good),'capFloorRange':[min(r['capFloor']['gap'] for r in good if r['capFloor']),max(r['capFloor']['gap'] for r in good if r['capFloor'])] if any(r['capFloor'] for r in good) else None,'phases':dict(collections.Counter(r['model'].get('phase') for r in rows))}
def issues(rows):return [r for r in rows if not r['valid'] or r.get('afterCrossings') or r.get('capFloor') and r['capFloor']['gap']<-1e-7 or r.get('turns',{}).get('maximum') and r['turns']['maximum']['absoluteTurnDegrees']>35]
def main():
 assert not (W/'report.json').exists(),'frozen result cannot be overwritten'
 freeze={k:p.receipt(W/v) for k,v in [('recipe','recipe.md'),('prototype','prototype.py'),('evaluator','evaluate.py')]};freeze['declaredBeforeEvaluation']=True
 (W/'evaluation-start.json').write_text(json.dumps(freeze,indent=2)+'\n')
 sources=json.load(gzip.open(ROOT/'docs/research/tube-stability-2026-10-04/rejected-roof-thinning/inputs/captured-polylines.json.gz','rt'));refs=json.load(open('/private/tmp/tube-monotone-inner-profile-20261004/eligible-cases.json'))
 actual=[]
 for row in sources['selection']['initialCrossSections']:
  ray=p.unit(row['row']['ray']);values=row['positions'];ox,_,oz=values[:3];raw=[{'point':row['firstProfilePoint']+i//3,'q':(values[i]-ox)*ray[0]+(values[i+2]-oz)*ray[1],'y':values[i+1]} for i in range(0,len(values),3)];tau=row['row']['tau'];td=tau/row['row']['life'];z=p.params(raw,td,tau);r=sample(raw,z,True,velocity=True);new,_=p.transform(raw,z);r.update({'row':row['row'],'rawPolyline':raw,'afterPolyline':new,'TDInferredFromTauLife':True});actual.append(r)
 print(json.dumps({'captured':summary(actual),'rows':[{'row':r['row']['row'],'valid':r['valid'],'failures':r['model']['failures'],'air113':r.get('air113'),'air160':r.get('air160')} for r in actual]}),flush=True)
 cases=[];frameRows=[];adj=[];held=[];sources_=[]
 for ref in refs['cases']:
  asset=Path(ref['asset']['file']);rec=p.receipt(asset);assert rec['sha256']==ref['asset']['sha256'];b=asset.read_bytes();_,size=struct.unpack_from('<II',b);head=json.loads(b[8:8+size]);start=8+((size+3)//4)*4;d=struct.unpack('<'+str((len(b)-start)//4)+'f',b[start:]);n=len(d)//258;rawframes=[];rows=[];zs=[]
  for f in range(n):
   raw=[{'point':i,'q':d[f*256+2*i],'y':d[f*256+2*i+1]} for i in range(128)];z=p.params(raw,head['touchdown'],head['tauStart']+f*head['tauStep']);r=sample(raw,z);r.update({'case':head['id'],'frame':f});rawframes.append(raw);rows.append(r);zs.append(z);frameRows.append(r)
  for f in range(n-1):
   for share in (.25,.5,.75):
    raw=blend(rawframes[f],rawframes[f+1],share);z=p.blend_params(zs[f],zs[f+1],share);r=sample(raw,z);r.update({'case':head['id'],'frames':[f,f+1],'share':share});adj.append(r)
  hf=round((ref['held']['tau']-head['tauStart'])/head['tauStep']);held.append({'case':head['id'],'raw':rawframes[hf],'params':zs[hf]});sources_.append(rec)
  cases.append({'case':head['id'],'asset':rec,'summary':summary(rows),'frames':rows})
  print(json.dumps({'caseComplete':head['id'],'summary':summary(rows),'adjacentCount':len(adj)}),flush=True)
 assert len(frameRows)==1224 and len(adj)==3648
 phases=[]
 for h in held:
  z=h['params'];o=p.ordinary(z);si,cap,ef=p.event(o);impact=z['TD']*(1+.3*ef);retire=impact+.3*z['TD'];ages=[(-.1+i*.05)*z['TD'] for i in range(41)]+[v+d*z['TD'] for v in (impact,retire) for d in (-1e-6,0,1e-6)]
  for tau in ages:
   r=sample(h['raw'],{**z,'tau':tau});r.update({'case':h['case'],'phaseGridTau':tau});phases.append(r)
 print(json.dumps({'phaseGridComplete':summary(phases)}),flush=True)
 crosscase=[]
 for i,a in enumerate(held):
  for b in held[i+1:]:
   for share in (.25,.5,.75):
    raw=blend(a['raw'],b['raw'],share);z=p.blend_params(a['params'],b['params'],share)
    for age in (0,.1,.25,.4,.8,1,1.15,1.5):
     r=sample(raw,{**z,'tau':age*z['TD']});r.update({'cases':[a['case'],b['case']],'share':share,'normalizedAge':age});crosscase.append(r)
 assert len(phases)==376 and len(crosscase)==672
 outcome={'captured':summary(actual),'all1224Frames':summary(frameRows),'all3648AdjacentF32':summary(adj),'continuousPhaseGrid':summary(phases),'parameterCrossCaseGrid':summary(crosscase),'captured113Width125Pass':all(r['valid'] and r['air113']['continuousWidth']>=1.25 for r in actual),'captured160Width125Pass':all(r['valid'] and r['air160']['continuousWidth']>=1.25 for r in actual),'consumerReady':False,'nativeAdopted':False}
 report={'schema':'bounded-analytic-C/offline-v4','complete':True,'freeze':freeze,'sources':sources_,'outcome':outcome,'actual':actual,'cases':cases,'adjacentIssues':issues(adj),'phaseGrid':phases,'crossCaseIssues':issues(crosscase),'crossCaseGridAll':crosscase,'adjacentModelPhaseCounts':summary(adj)['phases'],'limits':['No native/body/board/entry/FPS evidence.','Captured TD inferred from tau/life; absent crest/toe neighbors use labeled one-sided tangents.','Proper crossings omit endpoint/collinear and 3D volume.','Source coordinates h0;7m scaling illustrative.','Nominal retired loop degeneracies explicit; geometry/cache consumers need new semantics.']}
 (W/'report.json').write_text(json.dumps(report,indent=2)+'\n');(W/'summary.json').write_text(json.dumps({'outcome':outcome,'captured':[{'row':r['row']['row'],'model':r['model'],'air113':r.get('air113'),'air160':r.get('air160')} for r in actual]},indent=2)+'\n');print(json.dumps(outcome),flush=True)
if __name__=='__main__':main()
