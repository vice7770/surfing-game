"""Causal single-domain precision-limit analysis, not another recipe/grid or coefficient trial."""
from pathlib import Path
import importlib.util,json,math,struct
W=Path('/private/tmp/tube-bounded-c-profile-20261004');sp=importlib.util.spec_from_file_location('frozen',W/'prototype.py');p=importlib.util.module_from_spec(sp);sp.loader.exec_module(p)
refs=json.load(open('/private/tmp/tube-monotone-inner-profile-20261004/eligible-cases.json'));cases=[]
for ref in refs['cases']:
 b=Path(ref['asset']['file']).read_bytes();_,size=struct.unpack_from('<II',b);head=json.loads(b[8:8+size]);offset=8+((size+3)//4)*4;data=struct.unpack('<'+str((len(b)-offset)//4)+'f',b[offset:]);cases.append({'head':head,'data':data,'count':len(data)//258})
def rawat(c,tau):
 h=c['head'];position=min(c['count']-1,max(0,(tau-h['tauStart'])/h['tauStep']));f=int(position);n=min(c['count']-1,f+1);t=position-f
 return [{'point':i,'q':p.F32(c['data'][f*256+2*i]+t*(c['data'][n*256+2*i]-c['data'][f*256+2*i])),'y':p.F32(c['data'][f*256+2*i+1]+t*(c['data'][n*256+2*i+1]-c['data'][f*256+2*i+1]))} for i in range(128)]
def inverse_remaining(h):
 lo,hi=0.,1.
 for _ in range(64):
  t=(lo+hi)/2
  if 1-p.smoothstep(t)>h:lo=t
  else:hi=t
 return (lo+hi)/2
rows=[]
for foot in (1.4000000000000001,p.F32(1.4)):
 slope=.0526316;group=sorted((c for c in cases if c['head']['slope']==slope),key=lambda c:c['head']['nonlinearity']);a0=foot/7
 if a0<=group[0]['head']['nonlinearity']:lower=upper=group[0];w=0
 elif a0>=group[-1]['head']['nonlinearity']:lower=upper=group[-1];w=0
 else:
  lower,upper=next((a,b) for a,b in zip(group,group[1:]) if a['head']['nonlinearity']<=a0<=b['head']['nonlinearity']);w=(a0-lower['head']['nonlinearity'])/(upper['head']['nonlinearity']-lower['head']['nonlinearity'])
 td=lower['head']['touchdown']+w*(upper['head']['touchdown']-lower['head']['touchdown']);a=rawat(lower,td);b=rawat(upper,td);raw=[{'point':i,'q':p.F32(x['q']+w*(y['q']-x['q'])),'y':p.F32(x['y']+w*(y['y']-x['y']))} for i,(x,y) in enumerate(zip(a,b))];z=p.blend_params(p.params(a,lower['head']['touchdown'],td),p.params(b,upper['head']['touchdown'],td),w);o=p.ordinary(z);ulp=p.old.ulp32(max(abs(v) for key in ('A','T') for v in z[key]));threshold=math.sqrt(64*ulp/o['H']);lowerh=.001
 si,C,ef=p.event(o);impact=td*(1+.3*ef);retire=impact+.3*td;unit=math.sqrt(7/9.81);start=impact+.3*td*inverse_remaining(threshold);end=impact+.3*td*inverse_remaining(lowerh);h=(threshold+lowerh)/2;tau=impact+.3*td*inverse_remaining(h);shape,m=p.transform(raw,{**z,'tau':tau})
 rows.append({'query':{'slope':slope,'footHeight':foot,'footDepth':7,'seconds':tau*unit},'lower':lower['head']['id'],'upper':upper['head']['id'],'weight':w,'NDparams':z,'lengthScale':7,'timeScale':unit,'W':o['W'],'H':o['H'],'ulp':ulp,'collapseResolution':64*ulp,'remainingFailureBand':{'lowerExclusive':lowerh,'upperInclusive':threshold},'tauFailureBand':{'lowerInclusive':start,'upperExclusive':end},'secondsFailureBand':{'lowerInclusive':start*unit,'upperExclusive':end*unit},'durationSeconds':(end-start)*unit,'impactSeconds':impact*unit,'retiredSeconds':retire*unit,'singleInteriorReproduction':{'remaining':h,'tau':tau,'seconds':tau*unit,'geometryReturned':shape is not None,'failure':m['failures'],'intendedLoopScale':m['intendedLoopScale'],'collapseGeometryBound':m['collapseGeometryBound'],'declaredSpatialBudget':.001*max(o['W'],o['H'])}})
report={'schema':'bounded-C-retirement-precision-obstruction/v1','frozenRecipeUnchanged':True,'causalAnalysisOnly':True,'newGridOrCoefficientSearch':False,'derivation':'For small positive h, min(hW,h²H)=h²H.64ULP collapse occurs h<=sqrt(64ULP/H). Spatial-bound max(hW,hH) exceeds .001max(W,H) iff h>.001. Therefore a nonempty shipped-domain failure band exists whenever sqrt(64ULP/H)>.001.','portOrNativeAdoptionBlockedForFullQueries':True,'sourceContextFailure':'consumer allcases2log: pad20 center.7487345402771224 firstAge.7247345447540283, preservedcrest32 ±4frame velocity stencil. Fastpath correctly avoids unrelatedloop forpreservedanchor only.','cases':rows,'structuralNextOption':'Separate new precision-state formulation should preserve the exact zero-limit geometry while collapsing on the actual representability scale with a consistent spatial bound, or distribute an exact continuous zero state. No RAW fallback, no phase exceptions, no coefficient retuning in this frozen trial.'}
(W/'retirement-band-analysis.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(rows,indent=2))
