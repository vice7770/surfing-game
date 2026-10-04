"""Algebraic limit and failure classification; no candidate changes."""
from pathlib import Path
import importlib.util,json,math,struct
W=Path('/private/tmp/tube-analytic-c-profile-20261004');sp=importlib.util.spec_from_file_location('frozen_analytic',W/'prototype.py');p=importlib.util.module_from_spec(sp);sp.loader.exec_module(p)
r=json.load(open(W/'report.json'));frames=[f for c in r['cases'] for f in c['frames']]
def max_curve_delta(a,b):return max(p.norm(p.sub(p.bezier(*a,i/6),p.bezier(*b,i/6))) for i in range(7))
def precision(f):
 z=f['params'];m=f['model'];o=p.ordinary(z);g=m['formation'];T=m['thickness'];P,c,v,n=p.roof(o,g,m['seal'],T)
 P0,_,_,_=p.roof(o,0,0,0);roofDifference=max(p.norm(p.sub(a,b)) for a,b in zip(P,P0));zero=p.forward_cubic(o['K0'],o['T'],o['d0'],o['tt'],o['he0'],o['ht0']);limit=p.forward_cubic(o['K0'],o['T'],o['d0'],o['tt']);K=P[-1]
 return {'case':f.get('case'),'frame':f.get('frame'),'frames':f.get('frames'),'share':f.get('share'),'tau':z['tau'],'phase':m['phase'],'formation':g,'remaining':m['remaining'],'thickness':T,'eightULPFloor':m['minimumRepresentableThickness'],'capDiameterToULP':T/(m['minimumRepresentableThickness']/8),'formationRoofChangeFromOrdinary':roofDifference,'leadingReturnReachScale':g*(K[0]-o['A'][0]-.28*o['W']),'formationZeroTailAlgebraicJump':max_curve_delta(zero,limit),'note':'Thickness approaches zero quadratically; this is rejected by the frozen F32 rule. Nonzero-loop feasibility/crossings not fabricated. Algebraic floor-limit mismatch is separate from thickness precision.'}
def classify(rows):
 out=[]
 for f in rows:
  if not f['valid'] or not f['afterCrossings']:continue
  for a in f['afterCrossings']:
   indices=[j for seg in a['segments'] for j in seg];own=min(indices)>=32 and max(indices)<=112
   touch=f.get('capFloor') and f['model']['phase']=='retiring' and f['capFloor']['gap']>=-1e-7 and set(tuple(s) for s in a['segments']) in ({(63,64),(104,105)},{(64,65),(104,105)})
   out.append({'case':f.get('case'),'frame':f.get('frame'),'frames':f.get('frames'),'share':f.get('share'),'cases':f.get('cases'),'phase':f['model']['phase'],'crossing':a,'owned':own,'intendedCapPlateauContactResidual':bool(touch),'capFloorGap':f.get('capFloor',{}).get('gap') if f.get('capFloor') else None})
 return out
def loadraw(case,frame):
 ref=next(c for c in r['cases'] if c['case']==case);b=Path(ref['asset']['file']).read_bytes();_,size=struct.unpack_from('<II',b);start=8+((size+3)//4)*4;d=struct.unpack('<'+str((len(b)-start)//4)+'f',b[start:]);return [{'point':i,'q':d[frame*256+2*i],'y':d[frame*256+2*i+1]} for i in range(128)]
def main():
 invalid=[precision(f) for f in frames+r['adjacentIssues']+r['phaseGrid'] if not f['valid']]
 limits=[];fixtures=[];transitions=[]
 refs=json.load(open('/private/tmp/tube-monotone-inner-profile-20261004/eligible-cases.json'))
 for ref in refs['cases']:
  f=round((ref['held']['tau']-ref['source']['tauStart'])/ref['source']['tauStep']);raw=loadraw(ref['id'],f);z=p.params(raw,ref['source']['touchdown'],ref['held']['tau']);o=p.ordinary(z);_,C,ef=p.event(o);impact=z['TD']*(1+.3*ef);retire=impact+.3*z['TD']
  formZero=p.forward_cubic(o['K0'],o['T'],o['d0'],o['tt'],o['he0'],o['ht0']);formLimit=p.forward_cubic(o['K0'],o['T'],o['d0'],o['tt']);retZero=p.forward_cubic(C,o['T'],[0,-1],o['tt']);retLimit=p.forward_cubic(C,o['T'],[1,0],o['tt'])
  limits.append({'case':ref['id'],'formationTailJumpH0':max_curve_delta(formZero,formLimit),'retirementTailJumpH0':max_curve_delta(retZero,retLimit),'formationZeroControls':formZero,'positiveFormationLimitControls':formLimit,'retiredZeroControls':retZero,'positiveRetirementLimitControls':retLimit})
  lo,ml=p.transform(raw,{**z,'tau':impact-1e-6*z['TD']});hi,mh=p.transform(raw,{**z,'tau':impact+1e-6*z['TD']});transitions.append({'case':ref['id'],'impactTau':impact,'retiredTau':retire,'impactNormalized':impact/z['TD'],'bothImpactSideSamplesValid':lo is not None and hi is not None,'maximumCoordinateDeltaAcrossImpact':max(p.norm(p.sub(p.xy(a),p.xy(b))) for a,b in zip(lo,hi)) if lo and hi else None,'retirementMinusEndpointValid':next(a['valid'] for a in r['phaseGrid'] if a.get('case')==ref['id'] and abs(a['params']['tau']-(retire-1e-6*z['TD']))<1e-10)})
 for frame in (137,150,170):
  raw=loadraw('periodic-reef42-l12',frame);f=next(a for a in frames if a['case']=='periodic-reef42-l12' and a['frame']==frame);after,_=p.transform(raw,f['params']);fixtures.append({'case':f['case'],'frame':frame,'raw':raw,'after':after,'model':f['model'],'crossings':f['afterCrossings']})
 parentarc=Path('/private/tmp/tube-rejected-live-source-verification-20261004');deps=[p.receipt(Path('/private/tmp/tube-descending-facet-profile-20261004/prototype.py')),p.receipt(Path('/private/tmp/tube-whole-curl-profile-20261004/descending-lip/measurement_functions.py')),p.receipt(parentarc/'receipt.json'),p.receipt(parentarc/'restoration.json')]
 out={'precisionFailures':invalid,'zeroStateAlgebraicLimits':limits,'impactTransitions':transitions,'crossingClassifications':{'raw':classify(frames),'adjacent':classify(r['adjacentIssues']),'phase':classify(r['phaseGrid']),'crossCase':classify(r['crossCaseIssues'])},'immutableDependencies':deps,'maximumFormationTailJumpH0':max(a['formationTailJumpH0'] for a in limits),'maximumRetirementTailJumpH0':max(a['retirementTailJumpH0'] for a in limits),'rootFailureCause':'One circular root constrained to reach a low floor can need a radius too large for a narrow steep roof. It intersects both owned outer roof and preserved bulk; all128 authority alone would not remove owned intersections.','noNewRecipeEvaluated':True}
 (W/'causal-diagnostics.json').write_text(json.dumps(out,indent=2)+'\n');(W/'failure-profiles.json').write_text(json.dumps(fixtures,indent=2)+'\n');print(json.dumps({k:out[k] for k in ('maximumFormationTailJumpH0','maximumRetirementTailJumpH0')}));print(json.dumps({'precisionRows':len(invalid),'impactTransitions':transitions}))
if __name__=='__main__':main()
