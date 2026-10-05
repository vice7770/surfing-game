"""Finite exact saved-parameter secant decomposition; no geometry/provider/runtime invocation."""
from pathlib import Path
import hashlib,json,math,struct
W=Path('/private/tmp/tube-shared-leaf-residual-analysis-20261005');C=Path('/private/tmp/tube-shared-leaf-native-v2-20261005')
def pin(p):
 b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
data=json.loads((W/'inspection.json').read_bytes());records=data['rows'];byx={r['worldCrestX']:r for r in records}
def terms(r):
 m=r['model'];scale=m['scale'];B=m['thicknessB'];g=m['formationG'];assert g==1
 return {'z':{'crestZ':r['rawSample']['z'],'carrierWidth':.98*m['widthND']*scale,'thicknessRetreat':-2*B*scale,'boundedCorrection':m['boundedWidthDelta']*scale,'normalOffset':-B/2*m['normal'][0]*scale},'y':{'toeHeight':m['toe'][1]*scale,'openHeight':.6*m['heightND']*scale,'fallingHeight':-.8*m['heightND']*m['fallS']*scale,'normalOffset':-B/2*(1+m['normal'][1])*scale}}
def secants(left,middle,right):
 dl=middle['worldCrestX']-left['worldCrestX'];dr=right['worldCrestX']-middle['worldCrestX'];a,b,c=map(terms,(left,middle,right));result={}
 for axis in a:
  result[axis]={}
  for name in a[axis]:
   l=(b[axis][name]-a[axis][name])/dl;r=(c[axis][name]-b[axis][name])/dr
   result[axis][name]={'leftSlope':l,'rightSlope':r,'slopeJump':r-l,'values':[a[axis][name],b[axis][name],c[axis][name]]}
  result[axis]['sum']={k:sum(v[k]for v in result[axis].values())for k in ('leftSlope','rightSlope','slopeJump')}
  component=2 if axis=='z' else 1;observedL=(middle['savedCap'][component]-left['savedCap'][component])/dl;observedR=(right['savedCap'][component]-middle['savedCap'][component])/dr
  result[axis]['savedWordSlopes']={'leftSlope':observedL,'rightSlope':observedR,'slopeJump':observedR-observedL}
 return result
def frame_widths(caseId,position):
 p=C/'dist/barrels'/(caseId+'.bin');raw=p.read_bytes();magic,n=struct.unpack('<II',raw[:8]);header=json.loads(raw[8:8+n]);start=8+4*math.ceil(n/4);floats=struct.unpack('<'+str((len(raw)-start)//4)+'f',raw[start:]);count=len(floats)//258;assert magic==0x42524c32
 floor=math.floor(position);values=[]
 for i in range(max(0,floor-1),min(count,floor+3)):
  width=floats[256*i+224]-floats[256*i+64];next_width=floats[256*(i+1)+224]-floats[256*(i+1)+64]if i+1<count else None
  values.append({'frame':i,'tau':header['tauStart']+i*header['tauStep'],'widthND':width,'slopeToNextPerTau':(next_width-width)/header['tauStep']if next_width is not None else None})
 return {'case':caseId,'position':position,'fraction':position-floor,'frames':values}
targets=[]
for x in (74.25,75.625):
 mid=byx[x];idx=records.index(mid);left,right=records[idx-1],records[idx+1];m=mid['model']
 targets.append({'worldCrestX':x,'savedBendDegrees':mid['observedCapBend'],'neighbors':[left['worldCrestX'],right['worldCrestX']],'spacing':mid['spacingWorldX'],'tauNDNeighbors':[r['model']['tauND']for r in (left,mid,right)],'authoredTDNeighbors':[r['model']['authoredTD']for r in (left,mid,right)],'fallSNeighbors':[r['model']['fallS']for r in (left,mid,right)],'holdEnableNeighbors':[r['model']['holdEnable']for r in (left,mid,right)],'incomingUnitAnglesDegrees':[math.degrees(math.atan2(r['model']['incoming'][1],r['model']['incoming'][0]))for r in (left,mid,right)],'normalOffsetAnglesDegrees':[math.degrees(math.atan2(r['model']['normal'][1],r['model']['normal'][0]))for r in (left,mid,right)],'scaleNeighbors':[r['model']['scale']for r in (left,mid,right)],'blendNeighbors':[r['model']['blendWeight']for r in (left,mid,right)],'BActiveTermNeighbors':[r['model']['BTerms'].index(min(r['model']['BTerms']))for r in (left,mid,right)],'saturationDerivativeNeighbors':[r['model']['saturationDerivative']for r in (left,mid,right)],'requestedDeltaNeighbors':[r['model']['requestedWidthDelta']for r in (left,mid,right)],'boundedDeltaNeighbors':[r['model']['boundedWidthDelta']for r in (left,mid,right)],'secantContributions':secants(left,mid,right),'frameWidths':[frame_widths(m['lower'],m['lowerFramePosition']),frame_widths(m['upper'],m['upperFramePosition'])]})
out={'schema':'shared-leaf-residual-secant-decomposition/v1','complete':True,'script':pin(Path(__file__)),'inputs':[pin(W/'inspection.json'),pin(W/'inspect.py')]+[s for s in data['inputs']if '/dist/barrels/'in s['file']],'scope':'Additive cap-coordinate secant slope jumps from actual saved atX controls and literal current formulas; not a counterfactual render/shape/ride acceptance. Incoming/outgoing normals can affect the last-segment offset; fully formed K itself is independent of these tangents.','targets':targets}
(W/'decomposition.json').write_text(json.dumps(out,indent=2,allow_nan=False)+'\n');print(json.dumps(out,indent=2,allow_nan=False))
