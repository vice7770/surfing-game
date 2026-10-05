"""Root-only independent saved-word comparison. Reject incomplete owner before reading its report."""
from pathlib import Path
from collections import Counter
import base64,hashlib,json,math,struct
W=Path('/private/tmp/tube-leaf-identity-core-native-v2-20261005');STRIDE,EXT,CAP,CREST,FLOOR=134,3,64,32,104
TARGET_FRONT,TARGET_WORLD_X=41,75.625

def require(v,why):
 if not v:raise RuntimeError(why)
def pin(p):
 b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def verify(s,p=None):
 p=Path(s['file'])if p is None else p;b=p.read_bytes();require(len(b)==s['bytes']and hashlib.sha256(b).hexdigest()==s['sha256'],'Changed '+str(p));return json.loads(b)
def decode(r):
 kinds={'Float32Array':'f','Float64Array':'d','Int32Array':'i','Uint32Array':'I','Uint8Array':'B'};k=kinds[r['dtype']];b=base64.b64decode(r['data'],validate=True);require(len(b)==r['byteLength']==r['count']*struct.calcsize(k),'Typed byte count');return struct.unpack(('<'if r.get('littleEndian',True)else'>')+str(r['count'])+k,b),b
def load(s):
 require(s['available']and s['arrayIdentitiesAndWordsUnchanged']and len(s['arrays'])==37 and s['counts']['vertices']==STRIDE*s['counts']['slices'],'Complete37 words unavailable');return {k:decode(v)[0]for k,v in s['arrays'].items()}
def vec(a,row,point,field='positions'):
 o=3*(STRIDE*row+EXT+point);return a[field][o:o+3]
def sub(a,b):return tuple(x-y for x,y in zip(a,b))
def angle(a,b):
 n=math.hypot(*a)*math.hypot(*b);return None if n==0 else math.degrees(math.acos(max(-1,min(1,sum(x*y for x,y in zip(a,b))/n))))
def projection(p,c):
 x,y,z=sub(p,c['eye']);qx,qy,qz,qw=c['quaternion'];qx,qy,qz=-qx,-qy,-qz;tx,ty,tz=2*(qy*z-qz*y),2*(qz*x-qx*z),2*(qx*y-qy*x);v=(x+qw*tx+qy*tz-qz*ty,y+qw*ty+qz*tx-qx*tz,z+qw*tz+qx*ty-qy*tx,1);m=c['projection'];clip=[sum(m[4*j+i]*v[j]for j in range(4))for i in range(4)]
 if clip[3]<=0:return {'inFrustum':False,'behindCamera':True}
 ndc=[clip[i]/clip[3]for i in range(3)];return {'inFrustum':all(-1<=k<=1 for k in ndc),'ndc':ndc,'pixel':[.5*(1+ndc[0])*1708,.5*(1-ndc[1])*879]}
def inspect(s,a,c):
 n=s['counts']['slices'];strips=Counter();incident=Counter()
 for i in range(0,len(a['indices']),3):
  tri=a['indices'][i:i+3];require(all(0<=v<n*STRIDE for v in tri),'Index outside loft');rows=sorted({v//STRIDE for v in tri})
  if len(rows)==2 and rows[1]==rows[0]+1:
   strips[rows[0]]+=1
   for v in tri:
    if v%STRIDE==EXT+CAP:incident[v//STRIDE]+=1
 def mature(r):
  cap,floor=vec(a,r,CAP),vec(a,r,FLOOR);return a['slicePhase'][r]==1 and a['sliceWeight'][r]==1 and incident[r]>0 and cap[0]==floor[0]and cap[2]==floor[2]and cap[1]>floor[1]
 joined={r for r in range(n-1)if mature(r)and mature(r+1)and a['sliceJoined'][r]==1 and a['sliceFront'][r]==a['sliceFront'][r+1]and strips[r]==2*(STRIDE-1)}
 records=[]
 for r in range(n):
  if a['sliceFront'][r]!=TARGET_FRONT:continue
  x=vec(a,r,CREST)[0];cap=vec(a,r,CAP)
  if not 74<=x<=77:continue
  record={'row':r,'front':a['sliceFront'][r],'worldCrestX':x,'storedSigma':a['sliceSigma'][r],'worldCap':cap,'tau':a['sliceTau'][r],'phase':a['slicePhase'][r],'weight':a['sliceWeight'][r],'fade':a['sliceFade'][r],'capFloorGap':cap[1]-vec(a,r,FLOOR)[1],'projection':projection(cap,c),'bendDegrees':None}
  if r-1 in joined and r in joined:
   left,right=vec(a,r-1,CAP),vec(a,r+1,CAP);record.update(bendDegrees=angle(sub(cap,left),sub(right,cap)),bendXZDegrees=angle((cap[0]-left[0],cap[2]-left[2]),(right[0]-cap[0],right[2]-cap[2])),neighborWorldCrestDeltaX=[x-vec(a,r-1,CREST)[0],vec(a,r+1,CREST)[0]-x],neighborStoredDeltaSigma=[a['sliceSigma'][r]-a['sliceSigma'][r-1],a['sliceSigma'][r+1]-a['sliceSigma'][r]],capNormalTurnDegrees=[angle(vec(a,r-1,CAP,'normals'),vec(a,r,CAP,'normals')),angle(vec(a,r,CAP,'normals'),vec(a,r+1,CAP,'normals'))])
  records.append(record)
 visible=[r for r in records if r['projection']['inFrustum']and r['bendDegrees']is not None]
 return {'counts':s['counts'],'cSampling':s.get('cSampling'),'targetAtExactWorldCrestX':next((r for r in records if r['worldCrestX']==TARGET_WORLD_X),None),'targetBracketingWorldX':{k:next((r for r in sorted(records,key=lambda q:q['worldCrestX'],reverse=reverse)if (r['worldCrestX']<=TARGET_WORLD_X if reverse else r['worldCrestX']>=TARGET_WORLD_X)),None)for k,reverse in [('lower',True),('upper',False)]},'predeclaredFront41WorldX74To77Rows':records,'maximumEligibleVisibleBendInDeclaredNeighborhood':max(visible,key=lambda q:q['bendDegrees'])if visible else None}
def main():
 owner=json.loads((W/'owner.json').read_bytes());require(owner['schema']=='leaf-identity-core-owner/v1'and owner['complete']and owner['exitCode']==0 and owner['firstFailure']is None and owner['preExecutionPinsVerified']and owner['postExecutionPinsVerified']and owner['copiedAndSelectedLiveSourcePinsPostVerified']and owner['protectedPreserved']and owner['protectedBefore']==owner['protectedAfter']and not owner['cleanupFailures']and not owner['ownedMembersAfterCleanup']and all(owner['closedPorts'].values()),'Not a terminal accepted closed capture')
 i=json.loads((W/'inputs.json').read_bytes());r=json.loads((W/'candidate-first/report.json').read_bytes());require(r['schema']=='leaf-identity-core-native/v1'and r['complete']and r['firstFailure']is None and r['ownedBrowserClose']and r['stepCount']==0 and r['sealSha256']==owner['sealSha256'],'Incomplete report')
 base=verify(i['referenceLoft']);cand=verify(r['sidecar'],W/'candidate-first'/r['sidecar']['file']);ba,ca=load(base),load(cand);require(base['epoch']['seaTime']==cand['epoch']['seaTime']==i['referenceEpoch']['seaTime']and base['epoch']['step']==cand['epoch']['step']==0,'Different fixed epoch');require(decode(base['rawFrontPacket'])[1]==decode(cand['rawFrontPacket'])[1],'Raw packet differs')
 require(all(p['fixedPose']==i['fixedCameras'][p['camera']]and all(p['guards'].values())and p['baselineRepeatPixelsIdentical']for p in r['pairs']),'Pair guard failure')
 bm={(ba['sliceFront'][row],vec(ba,row,CREST)[0]):row for row in range(base['counts']['slices'])};cm={(ca['sliceFront'][row],vec(ca,row,CREST)[0]):row for row in range(cand['counts']['slices'])};raw,_=decode(base['rawFrontPacket']);audit=[]
 for o in range(0,len(raw),9):
  k=(int(raw[o+2]),raw[o]);old=bm.get(k)
  if old is None or ba['sliceFade'][old]<=0:continue
  new=cm.get(k);audit.append({'front':k[0],'rawWorldX':k[1],'rawSigma':raw[o+3],'oldRow':old,'candidateRow':new,'oldPhase':ba['slicePhase'][old],'oldFade':ba['sliceFade'][old],'candidatePhase':ca['slicePhase'][new]if new is not None else None,'candidateFade':ca['sliceFade'][new]if new is not None else None,'tauExact':ba['sliceTau'][old]==ca['sliceTau'][new]if new is not None else None})
 out={'schema':'leaf-identity-core-saved-cap-analysis/v1','complete':True,'inputs':[pin(Path(__file__)),pin(W/'owner.json'),pin(W/'candidate-first/report.json'),i['referenceLoft'],r['sidecar'],r['drawInputs']], 'target':{'front':TARGET_FRONT,'worldCrestX':TARGET_WORLD_X,'coordinateIsSigma':False,'priorReportedPreIdentityBend':'Baseline direct measurement below is authoritative; historical pre-identity saved bend was approximately21.48degrees, not the earlier33-degree cap-only value.'},'epochAndRawPacketExact':True,'old':inspect(base,ba,i['fixedCameras']['side']),'candidate':inspect(cand,ca,i['fixedCameras']['side']),'priorRetainedPositiveFadeRawAudit':{'records':audit,'missing':[v for v in audit if v['candidateRow']is None]},'limitations':['Actual indexed saved polyline bend and normal-turn only; no shader/pixel silhouette or radiance proof.','World crest X and stored sigma are separate fields; no nearest-sigma substitute for the old world-X corner.','Adaptive stations/counts may differ. A missing exact target is bracketed and reported, not silently moved.','The identity-core map is C1 in delta for fixed positive budget; raw.98 width/B/height/tangent terms and budget branches do not guarantee a globally C1 trajectory.','Common current ordinary-water mask is held fixed; altered footprint/authored support can alter overlap and surviving coverage.','Missing prior raw rows are not attributed to budget/retirement without saved cSampling evidence.','No quality, full-body clearance, ordinary ridden entry/travel/exit, reference match or FPS acceptance.']}
 print(json.dumps(out,indent=2,allow_nan=False))
if __name__=='__main__':main()
