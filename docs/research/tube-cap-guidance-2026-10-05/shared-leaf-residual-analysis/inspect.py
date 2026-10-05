"""Finite offline saved-word inspection. No runtime, compiler, physics, port, or production mutation."""
from pathlib import Path
import base64,hashlib,json,math,struct
W=Path('/private/tmp/tube-shared-leaf-residual-analysis-20261005')
C=Path('/private/tmp/tube-shared-leaf-native-v2-20261005')
R=Path('/Users/regina/Desktop/Projects/surfing-game')
def pin(p):
 b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def f32(x):return struct.unpack('<f',struct.pack('<f',x))[0]
def decode(s):
 k={'Float32Array':'f','Float64Array':'d','Int32Array':'i','Uint32Array':'I','Uint8Array':'B'}[s['dtype']];b=base64.b64decode(s['data'],validate=True)
 assert len(b)==s['byteLength']==struct.calcsize(k)*s['count']
 return struct.unpack('<'+str(s['count'])+k,b)
def case(p):
 b=p.read_bytes();magic,n=struct.unpack('<II',b[:8]);assert magic in (0x42524c32,0x42524c31)
 h=json.loads(b[8:8+n]);start=8+4*math.ceil(n/4);floats=struct.unpack('<'+str((len(b)-start)//4)+'f',b[start:]);count=len(floats)//(258 if magic==0x42524c32 else 256)
 assert count>2;h['frameCount']=count;h['frames']=floats[:count*256];return h
def smooth(x):x=max(0,min(1,x));return x*x*(3-2*x)
def vec(a,b):return [a[0]+b[0],a[1]+b[1]]
def sub(a,b):return [a[0]-b[0],a[1]-b[1]]
def mul(a,b):return [a[0]*b,a[1]*b]
def mix(a,b,t):return vec(mul(a,1-t),mul(b,t))
def unit(a):return mul(a,1/math.hypot(*a))
def bez(c,t):
 s=1-t;return vec(vec(mul(c[0],s*s*s),mul(c[1],3*s*s*t)),vec(mul(c[2],3*s*t*t),mul(c[3],t*t*t)))
def deriv(c,t):
 s=1-t;return mul(vec(vec(mul(sub(c[1],c[0]),s*s),mul(sub(c[2],c[1]),2*s*t)),mul(sub(c[3],c[2]),t*t)),3)
def width(c,f):return c['frames'][256*f+224]-c['frames'][256*f+64]
def delta(c,tau):
 n=c['frameCount'];position=max(0,min(n-1,(tau-c['tauStart'])/c['tauStep']));enable=smooth(position-1)*smooth(n-2-position)
 if not enable:return 0,position,enable,None
 frame=math.floor(position);share=position-frame;raw=width(c,frame)+share*(width(c,frame+1)-width(c,frame));hi=position+1;lo=position-1;i=math.floor(lo);area=0
 while lo<hi:
  end=min(hi,i+1);a=width(c,i);slope=width(c,i+1)-a;area+=(end-lo)*(2*a+slope*(lo+end-2*i))/2;lo=end;i+=1
 return enable*(area/2-raw),position,enable,area/2
def parameters(c,tau):
 pos=max(0,min(c['frameCount']-1,(tau-c['tauStart'])/c['tauStep']));f=math.floor(pos);n=min(c['frameCount']-1,f+1);t=pos-f
 points={i:[f32(c['frames'][f*256+2*i+k]+t*(c['frames'][n*256+2*i+k]-c['frames'][f*256+2*i+k]))for k in range(2)]for i in (31,32,112,113)}
 return {'crest':points[32],'toe':points[112],'incoming':sub(points[32],points[31]),'outgoing':sub(points[113],points[112])}
def model(q,cases):
 a0=q['footHeight']/q['footDepth'];low,high=cases[0],cases[-1];weight=0
 if a0<=low['nonlinearity']:high=low
 elif a0>=high['nonlinearity']:low=high
 else:
  for a,b in zip(cases,cases[1:]):
   if a['nonlinearity']<=a0<=b['nonlinearity']:low,high=a,b;weight=(a0-a['nonlinearity'])/(b['nonlinearity']-a['nonlinearity']);break
 scale=q['footHeight']/low['nonlinearity'] if low is high else q['footDepth'];timeUnit=math.sqrt(scale/9.81);tau=q['seconds']/timeUnit
 TD=low['touchdown']+weight*(high['touchdown']-low['touchdown']);step=low['tauStep']+weight*(high['tauStep']-low['tauStep']);carrier=min(tau,TD);enable=smooth((TD-carrier)/step)
 pa,pb=parameters(low,carrier),parameters(high,carrier)
 p={k:pa[k] if low is high else [f32(x) for x in mix(pa[k],pb[k],weight)] for k in pa}
 da,posa,ena,meanA=delta(low,carrier);db,posb,enb,meanB=delta(high,carrier);requested=enable*(da+weight*(db-da))
 A,Toe=p['crest'],p['toe'];ct,tt=unit(p['incoming']),unit(p['outgoing']);widthND=Toe[0]-A[0];heightND=A[1]-Toe[1]
 chord=math.hypot(*sub(Toe,A));ha=min(chord/3,widthND/(3*ct[0]));ht=min(chord/3,widthND/(3*tt[0]));base=[A,vec(A,mul(ct,ha)),sub(Toe,mul(tt,ht)),Toe];K0=bez(base,.5);d0=unit(deriv(base,.5))
 budgets=[.06*heightND,widthND/16,.1*min((.85*widthND)**2/heightND,(.4*heightND)**2/(.85*widthND))];B=min(budgets);budget=min(B,.13*widthND-2*B);bounded=budget*requested/(budget+abs(requested));g=smooth(tau/(.4*TD));s=smooth((tau-TD)/(.3*TD));T=B*g*g
 angle=(1-g)*math.atan2(d0[1],d0[0])-g*math.pi/2;v=[math.cos(angle),math.sin(angle)];L=[Toe[0]-2*B-.02*widthND+bounded,Toe[1]+.6*heightND-.8*heightND*s];K=mix(K0,L,g)
 hs=(1-g)*ha/2+g*4/3*math.tan(math.pi/8)*(K[0]-A[0]);he=(1-g)*math.hypot(*deriv(base,.5))/6+g*4/3*math.tan(math.pi/8)*(A[1]-K[1]);advance=hs*ct[0]+he*max(0,v[0]);limited=advance>.85*(K[0]-A[0])
 if limited:hs*=.85*(K[0]-A[0])/advance;he*=.85*(K[0]-A[0])/advance
 roof=[A,vec(A,mul(ct,hs)),sub(K,mul(v,he)),K];previous=[f32(x)for x in bez(roof,27/28)];last=unit(sub(K,previous));normal=[-last[1],last[0]]
 cap=[K[0]-T/2*normal[0],K[1]-T/2*(1+normal[1])]
 return {'a0':a0,'lower':low['id'],'upper':high['id'],'blendWeight':weight,'scale':scale,'timeUnit':timeUnit,'tauND':tau,'authoredTD':TD,'frameStep':step,'carrierTau':carrier,'lowerFramePosition':posa,'upperFramePosition':posb,'lowerMeanEnabled':ena,'upperMeanEnabled':enb,'holdEnable':enable,'lowerWidthDelta':da,'upperWidthDelta':db,'requestedWidthDelta':requested,'BTerms':budgets,'thicknessB':B,'reachBudget':budget,'boundedWidthDelta':bounded,'boundedPerRequested':bounded/requested if requested else None,'saturationDerivative':budget**2/(budget+abs(requested))**2,'crest':A,'toe':Toe,'incoming':p['incoming'],'outgoing':p['outgoing'],'widthND':widthND,'heightND':heightND,'formationG':g,'fallS':s,'K0':K0,'K':K,'normal':normal,'cap':cap,'limitedRoofControls':limited,'caseHeaders':[{k:c[k]for k in ('id','tauStart','tauStep','touchdown','frameCount')}for c in (low,high)]}
def point(a,row,i):o=3*(134*row+3+i);return list(a['positions'][o:o+3])
def bend(p0,p1,p2):
 u,v=sub3(p1,p0),sub3(p2,p1);n=math.hypot(*u)*math.hypot(*v)
 return math.degrees(math.acos(max(-1,min(1,sum(x*y for x,y in zip(u,v))/n))))if n else None
def sub3(a,b):return [x-y for x,y in zip(a,b)]
inputs=C/'candidate-first/draw-inputs.json';loft=C/'candidate-first/loft-candidate.json';analysis=C/'saved-cap-analysis.json';report=C/'candidate-first/report.json';owner=C/'owner.json';rawPaths=[inputs,loft,analysis,report,owner,C/'build.json',C/'source-freeze.json',C/'seal.json']
data=json.loads(inputs.read_bytes());saved=json.loads(loft.read_bytes());a={k:decode(v)for k,v in saved['arrays'].items()};cases=sorted([case(p)for p in sorted((C/'dist/barrels').glob('*.bin'))if 'pad' in p.name],key=lambda c:c['nonlinearity']);assert len(cases)==4
rawPaths += [C/'dist/barrels'/ (c['id']+'.bin')for c in cases]
rawPaths += [R/'src/wave/barrel'/p for p in ('ProfileLibrary.ts','boundedCProfile.ts','profileFormat.ts','barrelLibraryIndex.ts','sweptLoft.ts')]
queries=data['candidateQueries'];rows=[]
for r in queries:
 if r['front']!=41 or not 73.5<=r['worldCrestX']<=76.5:continue
 m=model(r['query'],cases);i=r['row'];cap=point(a,i,64);crest=point(a,i,32);toe=point(a,i,112);scale=m['scale'];raw=r['rawSample']
 predicted=[r['worldCrestX'],f32(m['cap'][1]*scale),f32(raw['z']-f32(m['crest'][0]*scale)+f32(m['cap'][0]*scale))]
 rows.append({'row':i,'worldCrestX':r['worldCrestX'],'storedSigma':r['storedSigma'],'sampledSigma':r['sampledSigma'],'query':r['query'],'rawSample':raw,'model':m,'savedCap':cap,'savedCrest':crest,'savedToe':toe,'predictedCap':predicted,'predictionError':sub3(predicted,cap),'observedCapBend':bend(point(a,i-1,64),cap,point(a,i+1,64))if 0<i<saved['counts']['slices']-1 else None,'spacingWorldX':[crest[0]-point(a,i-1,32)[0],point(a,i+1,32)[0]-crest[0]]if 0<i<saved['counts']['slices']-1 else None})
out={'schema':'shared-leaf-residual-offline-inspection/v1','scope':'Saved words plus literal finite parameter/roof arithmetic reconstruction only; no compiled provider, new sampling search, render, runtime, tests, physical ride, or quality acceptance. Model cap formula applies only pre-impact/non-collapsed rows; reconstruction errors are reported.','inputs':[pin(p)for p in rawPaths],'script':pin(Path(__file__)),'rows':rows,'rawFrontPacket':data['rawFrontPacket']}
(W/'inspection.json').write_text(json.dumps(out,indent=2,allow_nan=False)+'\n')
print(json.dumps({'rows':len(rows),'cases':[{k:c[k]for k in ('id','tauStart','tauStep','touchdown','frameCount')}for c in cases],'inspection':pin(W/'inspection.json'),'selected':[{'x':r['worldCrestX'],'bend':r['observedCapBend'],'error':r['predictionError'],'tau':r['model']['tauND'],'g':r['model']['formationG'],'frames':[r['model']['lowerFramePosition'],r['model']['upperFramePosition']],'W':r['model']['widthND'],'H':r['model']['heightND'],'requested':r['model']['requestedWidthDelta'],'bounded':r['model']['boundedWidthDelta'],'budget':r['model']['reachBudget']}for r in rows]},indent=2))
