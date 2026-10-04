"""Fixed all-case precision boundary evidence declared before one evaluation."""
from pathlib import Path
import importlib.util,json,math,struct,collections
W=Path('/private/tmp/tube-bounded-c-precision-v4-20261004');B=Path('/private/tmp/tube-bounded-c-profile-20261004')
sp=importlib.util.spec_from_file_location('eval',W/'evaluate.py');e=importlib.util.module_from_spec(sp);sp.loader.exec_module(e);p=e.p
refs=json.load(open('/private/tmp/tube-monotone-inner-profile-20261004/eligible-cases.json'))
def rawat(c,tau):
 h=c['head'];position=min(c['count']-1,max(0,(tau-h['tauStart'])/h['tauStep']));f=int(position);n=min(c['count']-1,f+1);t=position-f;d=c['data']
 return [{'point':i,'q':p.F32(d[f*256+2*i]+t*(d[n*256+2*i]-d[f*256+2*i])),'y':p.F32(d[f*256+2*i+1]+t*(d[n*256+2*i+1]-d[f*256+2*i+1]))} for i in range(128)]
def inv(v):
 lo,hi=0.,1.
 for _ in range(64):
  m=(lo+hi)/2
  if p.smoothstep(m)<v:lo=m
  else:hi=m
 return (lo+hi)/2

def adjacent(v,k):
 f=p.F32(v);u=struct.unpack('<I',struct.pack('<f',f))[0];return struct.unpack('<f',struct.pack('<I',max(0,u+k)))[0]
def contour_distance(a,b):
 A=[p.xy(v) for v in a if 32<=v['point']<=112];B=[p.xy(v) for v in b if 32<=v['point']<=112]
 def one(A,B):
  probes=A+[p.mix(x,y,.5) for x,y in zip(A,A[1:])]
  return max(min(p.point_segment_distance({'q':x[0],'y':x[1]},{'q':u[0],'y':u[1]},{'q':v[0],'y':v[1]}) for u,v in zip(B,B[1:])) for x in probes)
 return max(one(A,B),one(B,A))
def switch_pair(raw,z,tau,label):
 a=adjacent(tau,-1);b=adjacent(tau,1);na,ma=p.transform(raw,{**z,'tau':a});nb,mb=p.transform(raw,{**z,'tau':b});r={'label':label,'tauSwitch':tau,'tauPair':[a,b],'valid':na is not None and nb is not None,'leftModel':ma,'rightModel':mb}
 if r['valid']:
  r.update({'maximumPerIndexDisplacement':max(p.norm(p.sub(p.xy(x),p.xy(y))) for x,y in zip(na,nb)),'maximumRetainedOuterDisplacement':max(p.norm(p.sub(p.xy(x),p.xy(y))) for x,y in zip(na,nb) if 32<=x['point']<=60),'maximumRetainedTailDisplacement':max(p.norm(p.sub(p.xy(x),p.xy(y))) for x,y in zip(na,nb) if 106<=x['point']<=112),'sampledSymmetricContourDistance':contour_distance(na,nb),'leftAir':e.air(na,0),'rightAir':e.air(nb,0),'leftCrossings':p.segment_intersections(na),'rightCrossings':p.segment_intersections(nb)})
 return r

def main():
 assert not (W/'precision-report.json').exists(),'no overwrite'
 cases=[]
 for ref in refs['cases']:
  asset=Path(ref['asset']['file']);assert p.receipt(asset)['sha256']==ref['asset']['sha256'];b=asset.read_bytes();_,size=struct.unpack_from('<II',b);h=json.loads(b[8:8+size]);off=8+((size+3)//4)*4;d=struct.unpack('<'+str((len(b)-off)//4)+'f',b[off:]);cases.append({'head':h,'data':d,'count':len(d)//258})
 blocks=[]
 for c in cases:
  h=c['head'];raw=rawat(c,h['touchdown']);blocks.append({'label':h['id'],'raw':raw,'params':p.params(raw,h['touchdown'],h['touchdown'])})
 old=json.load(open(B/'retirement-band-analysis.json'))
 for row in old['cases']:
  lo=next(c for c in cases if c['head']['id']==row['lower']);hi=next(c for c in cases if c['head']['id']==row['upper']);z=row['NDparams'];w=row['weight'];raw=e.blend(rawat(lo,z['TD']),rawat(hi,z['TD']),w);blocks.append({'label':'exact-factory-'+str(row['query']['footHeight']),'raw':raw,'params':z,'oldInteriorTau':row['singleInteriorReproduction']['tau'],'oldFailureBand':row['tauFailureBand'],'actualFactoryQuery':row['query']})
 allrows=[];switches=[];receipts=[]
 for block in blocks:
  z=block['params'];o=p.ordinary(z);si,C,ef=p.event(o);impact=z['TD']*(1+.3*ef);retire=impact+.3*z['TD'];ulp=p.old.ulp32(max(abs(v) for k in ('A','T') for v in z[k]));r=64*ulp;hc=max(r/o['W'],math.sqrt(r/o['H']));gc=r/min(o['W'],o['H']);hTau=lambda h:impact+.3*z['TD']*inv(1-min(1,max(0,h)));gTau=lambda g:.4*z['TD']*inv(min(1,max(0,g)));ht=hTau(hc);gt=gTau(gc)
  sheetcrit=math.sqrt(8*ulp/o['B']);sheetht=hTau(sheetcrit);sheetgt=gTau(sheetcrit)
  samples=[('h'+str(h),hTau(h)) for h in (0,.0005,.001,(.001+hc)/2,hc,2*hc)]+[('g'+str(g),gTau(g)) for g in (0,gc/2,gc,2*gc)]
  samples += [('sheet-h'+str(h),hTau(h)) for h in (sheetcrit/2,sheetcrit,2*sheetcrit)]+[('sheet-g'+str(g),gTau(g)) for g in (sheetcrit/2,sheetcrit,2*sheetcrit)]
  for label,tau in [('post-switch',ht),('pre-switch',gt),('impact',impact),('retire',retire),('sheet-post-switch',sheetht),('sheet-pre-switch',sheetgt)]:
   samples.append((label+'-double',tau));samples += [(label+'-f32-'+str(k),adjacent(tau,k)) for k in (-2,-1,0,1,2)]
  if 'oldInteriorTau' in block:samples.append(('old-failing-interior',block['oldInteriorTau']))
  rows=[]
  for label,tau in samples:
   q=e.sample(block['raw'],{**z,'tau':tau});q.update({'block':block['label'],'sample':label,'ageSecondsAt7m':tau*math.sqrt(7/9.81)});rows.append(q);allrows.append(q)
  for label,tau in [('post',ht),('pre',gt),('sheet-post',sheetht),('sheet-pre',sheetgt)]:
   q=switch_pair(block['raw'],z,tau,label);q['block']=block['label'];switches.append(q)
  receipts.append({**block,'ordinary':o,'ULP':ulp,'postHcrit':hc,'formationGcrit':gc,'requestedThicknessResolutionPhase':sheetcrit,'sheetPostSwitchTau':sheetht,'sheetFormationSwitchTau':sheetgt,'impactTau':impact,'retireTau':retire,'postSwitchTau':ht,'formationSwitchTau':gt,'summary':e.summary(rows)})
 outcome=e.summary(allrows);collapsed=[q['model'] for q in allrows if q['valid'] and not q['model']['sheetExists']];outcome.update({'allCollapsedEnvelopeBoundsWithinUnchangedBudget':all(q['collapseGeometryBound']<=q['collapseSpatialBudget'] for q in collapsed),'maximumCollapsedControlBound':max(q['collapseGeometryBound'] for q in collapsed),'maximumBoundOverBudgetFraction':max(q['collapseGeometryBound']/q['collapseSpatialBudget'] for q in collapsed),'allCollapsedOwnedMonotoneX':all(q['collapsedOwnedMonotoneX'] for q in allrows if q['valid'] and not q['model']['sheetExists']),'switchPairs':len(switches),'switchValid':all(q['valid'] for q in switches),'maximumSwitchPerIndexDisplacement':max(q['maximumPerIndexDisplacement'] for q in switches if q['valid']),'maximumSampledContourSwitchDistance':max(q['sampledSymmetricContourDistance'] for q in switches if q['valid'])})
 report={'schema':'bounded-C-precision-v4/boundary-evidence','frozenBeforeEvaluation':True,'outcome':outcome,'blocks':receipts,'rows':allrows,'switches':switches,'notClaimed':['No native/body/entry proof.','Control budget is retained roof/tail Bezier displacement, not per-index or analytic Hausdorff continuity.','Sampled contour distance is evidence only.','3D neighboring-age mesh invariants belong to separate consumer work.']}
 (W/'precision-report.json').write_text(json.dumps(report,indent=2)+'\n');(W/'precision-summary.json').write_text(json.dumps(outcome,indent=2)+'\n');print(json.dumps(outcome),flush=True)
if __name__=='__main__':main()
