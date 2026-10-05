import base64, hashlib, json, math, struct
from pathlib import Path
p=Path('/private/tmp/tube-cap-refinement-native-20261005/candidate-first/loft-terminal.json')
raw=p.read_bytes(); d=json.loads(raw)
def decode(k,code):
 a=d['arrays'][k]
 return struct.unpack('<'+str(a['count'])+code,base64.b64decode(a['data']))
pos=decode('positions','f'); n=decode('normals','f'); ix=decode('indices','I')
out=list(ix); flips=changed=nonfinite=zero=0; first=None
for i in range(0,len(ix),3):
 a,b,c=ix[i:i+3]; a3,b3,c3=3*a,3*b,3*c
 e1x=pos[b3]-pos[a3]; e1y=pos[b3+1]-pos[a3+1]; e1z=pos[b3+2]-pos[a3+2]
 e2x=pos[c3]-pos[a3]; e2y=pos[c3+1]-pos[a3+1]; e2z=pos[c3+2]-pos[a3+2]
 facing=(e1y*e2z-e1z*e2y)*(n[a3]+n[b3]+n[c3])+(e1z*e2x-e1x*e2z)*(n[a3+1]+n[b3+1]+n[c3+1])+(e1x*e2y-e1y*e2x)*(n[a3+2]+n[b3+2]+n[c3+2])
 nonfinite+=not math.isfinite(facing); zero+=facing==0
 if facing<0:
  flips+=1; out[i+1]=c; out[i+2]=b
  if b!=c:
   changed+=1
   if first is None:first={'triangleSlot':i//3,'source':list(ix[i:i+3]),'expectedDraw':out[i:i+3],'facing':facing}
print(json.dumps({'scope':'Offline expected historical facesOut mapping only; no observed runtime index buffer','fileSha256':hashlib.sha256(raw).hexdigest(),'triangles':len(ix)//3,'flipTriangles':flips,'changedTriangles':changed,'nonfiniteFacing':nonfinite,'zeroFacing':zero,'firstDifference':first,'sourcePrefixSha256':hashlib.sha256(struct.pack('<'+str(len(ix))+'I',*ix)).hexdigest(),'expectedDrawPrefixSha256':hashlib.sha256(struct.pack('<'+str(len(out))+'I',*out)).hexdigest()},indent=2))
