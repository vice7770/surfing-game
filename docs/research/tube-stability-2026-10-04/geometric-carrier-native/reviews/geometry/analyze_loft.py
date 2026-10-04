#!/usr/bin/env python3
"""Bounded exact-word, indexed-loft geometry analysis. Actual run requires root terminal authorization."""
from pathlib import Path
import argparse, base64, hashlib, json, math, xml.etree.ElementTree as ET
import numpy as np
from PIL import Image, ImageDraw, ImageFont
SAMPLES=134; EXT=3; PROFILE=128
LANDMARK={'back':0,'crest':32,'lip':64,'throat':88,'toe':112,'front':127}
DTYPES={'Float32Array':('f4',4),'Float64Array':('f8',8),'Uint32Array':('u4',4),'Int32Array':('i4',4),'Uint16Array':('u2',2),'Uint8Array':('u1',1),'Int8Array':('i1',1)}
VERTEX={'positions':3,'normals':3,'mask':1,'lift':1,'sheet':1,'sheetWeight':1,'sheetBack':1,'throat':4}
def pin(path):
 b=Path(path).read_bytes();return {'file':str(Path(path).resolve()),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def finite_json(v):
 if isinstance(v,np.ndarray):return finite_json(v.tolist())
 if isinstance(v,np.generic):return finite_json(v.item())
 if isinstance(v,float):return v if math.isfinite(v) else None
 if isinstance(v,dict):return {k:finite_json(x) for k,x in v.items()}
 if isinstance(v,(list,tuple)):return [finite_json(x) for x in v]
 return v
def write_json(path,data):Path(path).write_text(json.dumps(finite_json(data),indent=2)+'\n')
def decode(snapshot):
 if snapshot.get('schema')!='bounded-C-complete-drawn-loft-words/v1' or snapshot.get('available') is not True:raise ValueError('Actual complete public drawn loft unavailable')
 if snapshot.get('unusedCapacityIncluded') is not False or snapshot.get('arrayIdentitiesAndWordsUnchanged') is not True:raise ValueError('Snapshot active word/identity contract failed')
 c=snapshot['counts'];ns,nv,ni=[c[k] for k in ['slices','vertices','indices']]
 if not all(isinstance(x,int) and not isinstance(x,bool) for x in [ns,nv,ni]) or not (0<=ns<=300 and 0<=nv<=40200 and 0<=ni<=240000 and ni%3==0 and nv==ns*SAMPLES):raise ValueError('Active count bounds/source134 row contract')
 arrays={};manifest=[];total=0
 for key,a in snapshot['arrays'].items():
  if a['dtype'] not in DTYPES or a['encoding']!='base64-exact-active-typed-array-words' or not isinstance(a['littleEndian'],bool):raise ValueError('Typed exact-word encoding unsupported')
  code,size=DTYPES[a['dtype']];expected=ni if key=='indices' else VERTEX[key]*nv if key in VERTEX else ns if key.startswith('slice') else None
  if expected is None or a['count']!=expected or a['byteLength']!=expected*size:raise ValueError('Array active count mismatch: '+key)
  b=base64.b64decode(a['data'],validate=True)
  if len(b)!=a['byteLength']:raise ValueError('Decoded word byte count mismatch: '+key)
  total+=len(b);arrays[key]=np.frombuffer(b,dtype=np.dtype(('<' if a['littleEndian'] else '>')+code))
  manifest.append({'key':key,'dtype':a['dtype'],'count':expected,'byteLength':len(b),'sha256':hashlib.sha256(b).hexdigest()})
 if total!=snapshot['rawBytes'] or total>4*1024*1024:raise ValueError('Raw decoded snapshot size mismatch/bound')
 for k in [*VERTEX,'indices','sliceFront','sliceJoined','sliceRayX','sliceRayZ','sliceWeight','sliceSigma','sliceTau','slicePhase','sliceOverturned']:
  if k not in arrays:raise ValueError('Required public array unavailable: '+k)
 if arrays['positions'].dtype.kind!='f' or arrays['positions'].dtype.itemsize!=4 or arrays['normals'].dtype.kind!='f' or arrays['normals'].dtype.itemsize!=4 or arrays['indices'].dtype.kind!='u' or arrays['indices'].dtype.itemsize!=4:raise ValueError('Core source word dtypes mismatch')
 ids=arrays['indices'].astype(np.int64);used=np.unique(ids)
 if ni==0:raise ValueError('No indexed triangles: no geometric inventory to analyze')
 if ids.max(initial=-1)>=nv:raise ValueError('Index outside active words')
 positions=arrays['positions'].astype(np.float64).reshape(nv,3);normals=arrays['normals'].astype(np.float64).reshape(nv,3)
 if not np.isfinite(positions[used]).all() or not np.isfinite(normals[used]).all():raise ValueError('Nonfinite indexed geometry/normal')
 return {'snapshot':snapshot,'a':arrays,'p':positions,'n':normals,'ids':ids,'tri':ids.reshape(-1,3),'used':used,'manifest':manifest,'counts':c}
def band(index):
 p=index-EXT
 if p<0:return 'back-extension'
 if p<32:return 'back-slope'
 if p<64:return 'outer-roof'
 if p<88:return 'lip-return-underside'
 if p<112:return 'inner-face-floor'
 if p<127:return 'forward-rest-profile'
 return 'front-extension' if p>=128 else 'front-profile-boundary'
def triangle_meta(g,ids):
 rows=[int(i//SAMPLES) for i in ids];js=[int(i%SAMPLES) for i in ids]
 return {'vertices':[int(x) for x in ids],'rows':rows,'fronts':[int(g['a']['sliceFront'][r]) for r in rows],'profileIndices':[j-EXT for j in js],
  'cellStartProfileIndex':min(js)-EXT,'contourBand':band(min(js)),'position':g['p'][ids]}
def source_index_check(g):
 a,p=g['a'],g['p'];expected=[];reverse_cells=0
 for s in range(g['counts']['slices']-1):
  if a['sliceJoined'][s]!=1:continue
  for j in range(SAMPLES-1):
   v=s*SAMPLES+j;w=v+SAMPLES
   forward=(p[v+1,0]-p[v,0])*a['sliceRayX'][s]+(p[v+1,2]-p[v,2])*a['sliceRayZ'][s]+(p[w+1,0]-p[w,0])*a['sliceRayX'][s+1]+(p[w+1,2]-p[w,2])*a['sliceRayZ'][s+1]
   rev=forward<0;reverse_cells+=int(rev)
   expected.extend([v,w,w+1 if rev else v+1,v if rev else v+1,w+1 if rev else w,v+1 if rev else w+1])
 expected=np.asarray(expected,dtype=np.int64)
 if len(expected)!=len(g['ids']) or not np.array_equal(expected,g['ids']):raise ValueError('Indices differ from source C physical-diagonal triangulation; grouping cannot be asserted')
 return {'exactSourceCIndexSequence':True,'reverseDiagonalCells':reverse_cells,'indexedTriangles':len(g['tri'])}
def run_bounds(g):
 ns=g['counts']['slices'];joins=g['a']['sliceJoined'];out={};s=0
 while s+1<ns:
  if joins[s]!=1:s+=1;continue
  first=s;last=s+1
  while last+1<ns and joins[last]==1:last+=1
  for r in range(first,last+1):out[r]=(first,last)
  s=last+1
 return out
def normal_check(g):
 p=g['p'];bounds=run_bounds(g);expected=np.zeros_like(g['n']);fallback=0
 for v in g['used']:
  s,j=divmod(int(v),SAMPLES)
  if s not in bounds:raise ValueError('Indexed row lacks final source normal run')
  first,last=bounds[s];sb=max(first,s-1);sa=min(last,s+1);jb=max(0,j-1);ja=min(SAMPLES-1,j+1)
  ax,ay,az=p[s*SAMPLES+ja]-p[s*SAMPLES+jb];bx,by,bz=p[sa*SAMPLES+j]-p[sb*SAMPLES+j]
  cx=ay*bz-az*by;cy=az*bx-ax*bz;cz=ax*by-ay*bx;length=math.sqrt(cx*cx+cy*cy+cz*cz)
  if length>1e-12:expected[v]=[cx/length,cy/length,cz/length]
  else:expected[v]=[0,1,0];fallback+=1
 used=g['used'];source_f32=expected[used].astype(np.float32);captured=g['n'][used].astype(np.float32)
 wordsdiff=source_f32.view(np.uint32)!=captured.view(np.uint32);lengths=np.linalg.norm(g['n'][used],axis=1)
 return {'sourceFormula':'profile-central-difference cross front-central-difference; one-sided at final run/profile edge; length<=1e-12 fallback[0,1,0] then F32 store',
  'indexedVertices':len(used),'fallbackVertices':fallback,'f32WordDifferencesFromSourceReconstruction':int(wordsdiff.sum()),'verticesWithWordDifference':int(wordsdiff.any(axis=1).sum()),
  'maximumComponentDifference':float(np.max(np.abs(source_f32.astype(float)-captured.astype(float)))),'normalLengthRange':[float(lengths.min()),float(lengths.max())]}
def winding(g):
 t=g['tri'];p=g['p'];cross=np.cross(p[t[:,1]]-p[t[:,0]],p[t[:,2]]-p[t[:,0]]);area2=np.linalg.norm(cross,axis=1)
 average=g['n'][t].mean(axis=1);nl=np.linalg.norm(average,axis=1);valid=(area2>0)&(nl>0);alignment=np.full(len(t),np.nan);alignment[valid]=np.einsum('ij,ij->i',cross[valid],average[valid])/(area2[valid]*nl[valid])
 out=[]
 for key in ['back-extension','back-slope','outer-roof','lip-return-underside','inner-face-floor','forward-rest-profile','front-profile-boundary','front-extension']:
  chosen=np.array([band(int((ids%SAMPLES).min()))==key for ids in t]);vals=alignment[chosen&valid]
  out.append({'band':key,'triangles':int(chosen.sum()),'zeroAreaTriangles':int((chosen&(area2==0)).sum()),'faceVersusSuppliedMeanNormalCosRange':[float(vals.min()),float(vals.max())] if len(vals) else None,
   'negativeAlignmentTriangles':int((chosen&valid&(alignment<0)).sum()),'positiveAlignmentTriangles':int((chosen&valid&(alignment>0)).sum())})
 return {'normalConventionNote':'Source flat +Z profile/+X front central-difference normals point+Y; source index order face cross points-Y. Negative alignment alone is this existing source convention, not proof of defective winding/visibility.',
  'global':{'zeroAreaTriangles':int((area2==0).sum()),'positiveAreaRange':[float(area2[area2>0].min()/2),float(area2.max()/2)] if np.any(area2>0) else None},'bands':out},cross,area2,alignment
def row_contour(g,row):return g['p'][row*SAMPLES:(row+1)*SAMPLES]
def thickness(g,row):
 p=row_contour(g,row);top=np.arange(38,59);under=126-top;upper=p[top+EXT];lower=p[under+EXT];delta=upper-lower
 return {'row':row,'front':int(g['a']['sliceFront'][row]),'phase':int(g['a']['slicePhase'][row]),'weight':float(g['a']['sliceWeight'][row]),
  'pairs':[{'top':int(t),'under':int(u),'upper':a,'lower':b,'delta':d,'separation':float(np.linalg.norm(d))} for t,u,a,b,d in zip(top,under,upper,lower,delta)],
  'verticalSeparationRange':[float(delta[:,1].min()),float(delta[:,1].max())],'negativeVerticalPairs':int((delta[:,1]<0).sum()),'zeroVerticalPairs':int((delta[:,1]==0).sum()),
  'maxHorizontalSeparation':float(np.linalg.norm(delta[:,[0,2]],axis=1).max()),'lipMinusFloor104':p[64+EXT]-p[104+EXT]}
def contour_features(g,row):
 p=row_contour(g,row);ray=np.array([float(g['a']['sliceRayX'][row]),float(g['a']['sliceRayZ'][row])]);length=np.linalg.norm(ray)
 if not length>0:raise ValueError('Invalid captured row ray')
 ray/=length;crest=p[32+EXT];along=(p[:,[0,2]]-crest[[0,2]])@ray;q=np.column_stack((along,p[:,1]));d=np.diff(q,axis=0);dl=np.linalg.norm(d,axis=1);turn=[]
 for j in range(len(d)-1):
  if dl[j]>0 and dl[j+1]>0:
   angle=math.degrees(math.atan2(float(d[j,0]*d[j+1,1]-d[j,1]*d[j+1,0]),float(np.dot(d[j],d[j+1]))));turn.append({'profileVertex':j+1-EXT,'angleDegrees':angle,'band':band(j+1)})
 crossings=[]
 def orient(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
 for i in range(len(q)-1):
  for j in range(i+2,len(q)-1):
   a,b,c,d0=q[i],q[i+1],q[j],q[j+1]
   if orient(a,b,c)*orient(a,b,d0)<0 and orient(c,d0,a)*orient(c,d0,b)<0:crossings.append({'edgeA':[i-EXT,i+1-EXT],'edgeB':[j-EXT,j+1-EXT]})
 return {'row':row,'sourceAuthoredOverturned':int(g['a']['sliceOverturned'][row]),'zeroLengthProfileEdges':int((dl==0).sum()),
  'largestTurns':sorted(turn,key=lambda x:abs(x['angleDegrees']),reverse=True)[:12],'strictNonadjacentProjectedSegmentCrossings':crossings,
  'interpretation':'Return underside intentionally runs backward; lip turn/coalesced or shared zero-thickness contacts are not automatically defects. Proper strict nonadjacent intersections reported separately; no visibility/body inference.'}
def plane_sections(g,x,front):
 sections=[];coplanar=[];cache={}
 def edge(u,v):
  if u>v:u,v=v,u
  key=(u,v)
  if key in cache:return cache[key]
  a,b=g['p'][u],g['p'][v]
  if a[0]==x:point=a.copy()
  elif b[0]==x:point=b.copy()
  elif (a[0]<x<b[0]) or (b[0]<x<a[0]):point=a+(x-a[0])/(b[0]-a[0])*(b-a)
  else:return None
  cache[key]=point;return point
 for n,ids in enumerate(g['tri']):
  rows=ids//SAMPLES
  if not all(int(g['a']['sliceFront'][r])==front for r in rows):continue
  p=g['p'][ids]
  if x<p[:,0].min() or x>p[:,0].max():continue
  if np.all(p[:,0]==x):coplanar.append(n);continue
  pts=[]
  for u,v in [(int(ids[0]),int(ids[1])),(int(ids[1]),int(ids[2])),(int(ids[2]),int(ids[0]))]:
   a=edge(u,v)
   if a is not None and not any(np.array_equal(a,b) for b in pts):pts.append(a)
  if len(pts)==2:sections.append({'triangle':n,'band':band(int((ids%SAMPLES).min())),'rows':[int(v) for v in rows],'points':pts})
  elif len(pts)>2:raise ValueError('Noncoplanar triangle has unexpected plane intersection')
 return {'fixedX':x,'front':front,'segments':sections,'coplanarTriangles':coplanar,'method':'exact fixed-X intersections of active indexed triangles; diagonal kinks retained, no row-contour interpolation substituted'}
def dot(a,b):return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]
def cross(a,b):return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def first_hit(g,eye,target):
 d=[target[k]-eye[k] for k in range(3)];best=None
 for n,ids in enumerate(g['tri']):
  a=g['p'][ids].tolist();e1=[a[1][k]-a[0][k] for k in range(3)];e2=[a[2][k]-a[0][k] for k in range(3)];h=cross(d,e2);det=dot(e1,h)
  if abs(det)<1e-12:continue
  inv=1/det;s=[eye[k]-a[0][k] for k in range(3)];u=inv*dot(s,h)
  if u<0 or u>1:continue
  q=cross(s,e1);v=inv*dot(d,q)
  if v<0 or u+v>1:continue
  t=inv*dot(e2,q)
  if not(1e-6<t<1-1e-6) or (best and t>=best['fraction']):continue
  best={'triangle':n,**triangle_meta(g,ids),'fraction':t,'distance':t*math.hypot(*d),'point':[eye[k]+t*d[k] for k in range(3)],'barycentric':[1-u-v,u,v],'doubleSided':True}
 return {'trianglesTested':len(g['tri']),'firstHit':best,'indexedLoftOccluded':bool(best),'algorithm':'exact recorded segment; source firstHit det1e-12 and1e-6<t<1-1e-6; no backface culling, no pose search'}
# Standalone scientific SVG plots; no browser/chart runtime or media editing is required.
COLORS={'back-extension':'#8c8c8c','back-slope':'#55855f','outer-roof':'#2166ac','lip-return-underside':'#d6604d','inner-face-floor':'#7b3294','forward-rest-profile':'#a6761d','front-profile-boundary':'#a6761d','front-extension':'#8c8c8c'}
def svg_plot(path,title,xlabel,ylabel,series,points=(),equal=False):
 ns='http://www.w3.org/2000/svg';ET.register_namespace('',ns);root=ET.Element('{'+ns+'}svg',{'width':'1120','height':'740','viewBox':'0 0 1120 740'})
 def el(tag,attrs,text=None):
  z=ET.SubElement(root,'{'+ns+'}'+tag,{k:str(v) for k,v in attrs.items()});z.text=text;return z
 el('rect',{'width':1120,'height':740,'fill':'white'});el('text',{'x':65,'y':30,'font-size':18,'font-family':'sans-serif'},title)
 allxy=[xy for s in series for xy in s['xy']]+[p['xy'] for p in points];arr=np.asarray(allxy,dtype=float)
 if not len(arr):raise ValueError('Cannot plot empty actual geometry')
 mins=arr.min(axis=0);maxs=arr.max(axis=0);span=np.maximum(maxs-mins,1e-9);mins-=.04*span;maxs+=.04*span
 left,top,width,height=82,70,910,535
 if equal:
  ratio=width/height;s=(maxs-mins)
  if s[0]/s[1]<ratio:mid=(maxs[0]+mins[0])/2;mins[0]=mid-s[1]*ratio/2;maxs[0]=mid+s[1]*ratio/2
  else:mid=(maxs[1]+mins[1])/2;mins[1]=mid-s[0]/ratio/2;maxs[1]=mid+s[0]/ratio/2
 def xy(v):return [left+(v[0]-mins[0])/(maxs[0]-mins[0])*width,top+height-(v[1]-mins[1])/(maxs[1]-mins[1])*height]
 for axis in [0,1]:
  for k in range(7):
   value=mins[axis]+(maxs[axis]-mins[axis])*k/6;v=xy([value,mins[1]]) if axis==0 else xy([mins[0],value])
   el('line',{'x1':v[0] if axis==0 else left,'x2':v[0] if axis==0 else left+width,'y1':top if axis==0 else v[1],'y2':top+height if axis==0 else v[1],'stroke':'#e3e3e3'})
   el('text',{'x':v[0] if axis==0 else left-7,'y':top+height+22 if axis==0 else v[1]+4,'text-anchor':'middle' if axis==0 else 'end','font-size':12,'font-family':'sans-serif'},format(value,'.5g'))
 for s in series:
  values=' '.join(','.join(format(v,'.8g') for v in xy(p)) for p in s['xy'])
  el('polyline',{'points':values,'fill':'none','stroke':s.get('color','#222'),'stroke-width':s.get('width',1.2),'opacity':s.get('opacity',1)})
 for p in points:
  a,b=xy(p['xy']);el('circle',{'cx':a,'cy':b,'r':4,'fill':p.get('color','#222')});el('text',{'x':a+6,'y':b-6,'font-size':11,'font-family':'sans-serif'},p.get('label',''))
 el('text',{'x':left+width/2,'y':top+height+48,'text-anchor':'middle','font-family':'sans-serif','font-size':14},xlabel)
 el('text',{'x':20,'y':top+height/2,'transform':f'rotate(-90 20 {top+height/2})','text-anchor':'middle','font-family':'sans-serif','font-size':14},ylabel)
 labels=[]
 for s in series:
  if s.get('label') and s['label'] not in [a for a,b in labels]:labels.append((s['label'],s.get('color','#222')))
 for k,(label,color) in enumerate(labels[:12]):
  x=82+(k%3)*320;y=670+(k//3)*16;el('line',{'x1':x,'x2':x+24,'y1':y-4,'y2':y-4,'stroke':color,'stroke-width':2});el('text',{'x':x+29,'y':y,'font-size':11,'font-family':'sans-serif'},label)
 ET.ElementTree(root).write(path,encoding='utf-8',xml_declaration=True)
 # Raster preview of the same exact-coordinate scientific plot, kept distinct from native capture media.
 im=Image.new('RGB',(1120,740),'white');dr=ImageDraw.Draw(im);font=ImageFont.load_default(size=14);small=ImageFont.load_default(size=12)
 dr.text((65,14),title,fill='black',font=font)
 for axis in [0,1]:
  for k in range(7):
   value=mins[axis]+(maxs[axis]-mins[axis])*k/6;v=xy([value,mins[1]]) if axis==0 else xy([mins[0],value])
   dr.line([(v[0],top),(v[0],top+height)] if axis==0 else [(left,v[1]),(left+width,v[1])],fill='#e3e3e3')
   dr.text((v[0]-16,top+height+7) if axis==0 else (4,v[1]-6),format(value,'.5g'),fill='black',font=small)
 for line in series:
  values=[tuple(xy(q)) for q in line['xy']]
  if len(values)>1:dr.line(values,fill=line.get('color','#222'),width=max(1,round(line.get('width',1.2))))
 for point in points:
  aa,bb=xy(point['xy']);dr.ellipse((aa-4,bb-4,aa+4,bb+4),fill=point.get('color','#222'));dr.text((aa+6,bb-15),point.get('label',''),fill='black',font=small)
 dr.text((left+width/2-70,top+height+32),xlabel,fill='black',font=font);dr.text((left,46),ylabel,fill='black',font=font)
 for k,(label,color) in enumerate(labels[:12]):
  xx=82+(k%3)*320;yy=660+(k//3)*17;dr.line([(xx,yy+6),(xx+24,yy+6)],fill=color,width=2);dr.text((xx+29,yy),label,fill='black',font=small)
 im.save(Path(path).with_suffix('.png'))

def station_bracket(g,front,x):
 matches=[];p=g['p'];a=g['a'];ns=g['counts']['slices']
 for s in range(ns-1):
  if a['sliceJoined'][s]!=1 or a['sliceFront'][s]!=front or a['sliceFront'][s+1]!=front:continue
  ca=p[s*SAMPLES+EXT+32];cb=p[(s+1)*SAMPLES+EXT+32]
  if not cb[0]>ca[0]:continue
  last=s+2==ns or a['sliceJoined'][s+1]!=1 or a['sliceFront'][s+2]!=front
  if ca[0]<=x and (x<cb[0] or last and x==cb[0]):matches.append({'a':s,'b':s+1,'t':float((x-ca[0])/(cb[0]-ca[0]))})
 if len(matches)!=1:raise ValueError('Unique current-component joined crest-X bracket unavailable')
 return matches[0]
def vertical_crossings(g,x,z,triangles):
 p=g['p'];out=[]
 def edge(u,v,x0,z0):
  lo,hi=(u,v) if u<v else (v,u);val=(p[hi,0]-p[lo,0])*(z0-p[lo,2])-(p[hi,2]-p[lo,2])*(x0-p[lo,0]);return val if u<v else -val
 def inside(val,u,v,sign):return val*sign>0 or val==0 and (sign>0)==(u<v)
 for ti in triangles:
  aa,bb,cc=map(int,g['tri'][ti]);area=edge(aa,bb,p[cc,0],p[cc,2])
  if area==0:continue
  sign=1 if area>0 else -1;wa=edge(bb,cc,x,z);wb=edge(cc,aa,x,z);wc=edge(aa,bb,x,z)
  if not(inside(wa,bb,cc,sign) and inside(wb,cc,aa,sign) and inside(wc,aa,bb,sign)):continue
  y=(wa*p[aa,1]+wb*p[bb,1]+wc*p[cc,1])/area
  # The triangle's plane supplies exact one-sided endpoint limits for this interval.
  slope=((p[cc,0]-p[bb,0])*p[aa,1]+(p[aa,0]-p[cc,0])*p[bb,1]+(p[bb,0]-p[aa,0])*p[cc,1])/area
  out.append({'triangle':int(ti),'height':float(y),'dYdZ':float(slope),'band':triangle_meta(g,g['tri'][ti])['contourBand']})
 return sorted(out,key=lambda r:r['height'])
def proper_section_crossings(section):
 lines=section['segments'];out=[]
 def orient(aa,bb,cc):return (bb[0]-aa[0])*(cc[1]-aa[1])-(bb[1]-aa[1])*(cc[0]-aa[0])
 for i,sa in enumerate(lines):
  aa,bb=[np.array([q[2],q[1]]) for q in sa['points']]
  for sb in lines[i+1:]:
   cc,dd=[np.array([q[2],q[1]]) for q in sb['points']]
   if not(orient(aa,bb,cc)*orient(aa,bb,dd)<0 and orient(cc,dd,aa)*orient(cc,dd,bb)<0):continue
   e=bb-aa;f=dd-cc;v=cc-aa;t=(v[0]*f[1]-v[1]*f[0])/(e[0]*f[1]-e[1]*f[0]);point=aa+t*e
   out.append({'triangles':[sa['triangle'],sb['triangle']],'bands':[sa['band'],sb['band']],'worldZY':point})
 return out
def cavity(g,section,eye):
 x=section['fixedX'];segments=section['segments'];tris=[s['triangle'] for s in segments];breaks=sorted(set([float(q[2]) for s in segments for q in s['points']]+[float(q['worldZY'][0]) for q in section['properNonadjacentSegmentCrossings']]));intervals=[]
 for lo,hi in zip(breaks,breaks[1:]):
  if not hi>lo:continue
  mid=(lo+hi)/2;c=vertical_crossings(g,x,mid,tris)
  if len(c)==3 and c[0]['height']<c[1]['height']<c[2]['height']:
   height=c[1]['height']-c[0]['height'];slope=c[1]['dYdZ']-c[0]['dYdZ'];ends=[height+slope*(q-mid) for q in [lo,hi]]
   intervals.append({'zRange':[lo,hi],'midZ':mid,'crossings':c,'airHeightAtMid':height,'airHeightEndpointLimits':ends})
 regions=[]
 for q in intervals:
  if not regions or regions[-1]['zRange'][1]!=q['zRange'][0]:regions.append({'zRange':q['zRange'].copy(),'intervals':[q]})
  else:regions[-1]['zRange'][1]=q['zRange'][1];regions[-1]['intervals'].append(q)
 for q in regions:
  q['horizontalSpan']=q['zRange'][1]-q['zRange'][0];q['maximumAirHeight']=max(max(k['airHeightEndpointLimits']) for k in q['intervals']);q['spanOverMaximumHeight']=q['horizontalSpan']/q['maximumAirHeight'] if q['maximumAirHeight']>0 else None
 at_eye=vertical_crossings(g,x,float(eye[2]),tris);selected=[q for q in regions if q['zRange'][0]<eye[2]<q['zRange'][1]]
 return {'method':'Actual fixed-X indexed section; sorted source half-open XZ edge-function crossings. Open Z intervals with exactly3 strictly ordered heights define geometric air between lowest and middle. Piecewise-linear heights evaluated at interval endpoint limits; no raster/body proof.',
  'allThreeCrossingAirRegions':regions,'recordedEye':eye,'crossingsAtRecordedEyeZ':at_eye,'recordedEyeStrictlyInAir':len(at_eye)==3 and at_eye[0]['height']<eye[1]<at_eye[1]['height']<at_eye[2]['height'],
  'selectedEyeConnectedRegion':selected[0] if len(selected)==1 else None}
def local_curvature(g,row):
 p=row_contour(g,row);n=g['n'][row*SAMPLES:(row+1)*SAMPLES];out=[]
 for j in range(80,97):
  k=j+EXT;left=p[k]-p[k-1];right=p[k+1]-p[k];ll=np.linalg.norm(left);rr=np.linalg.norm(right);na=n[k-1];nb=n[k]
  angle=math.degrees(math.acos(float(np.clip(np.dot(left,right)/(ll*rr),-1,1)))) if ll>0 and rr>0 else None
  normal_angle=math.degrees(math.acos(float(np.clip(np.dot(na,nb)/(np.linalg.norm(na)*np.linalg.norm(nb)),-1,1))))
  out.append({'profile':j,'position':p[k],'normal':n[k],'turnDegrees':angle,'turnPerMeanChordRadiansPerMetre':math.radians(angle)/((ll+rr)/2) if angle is not None else None,'precedingNormalChangeDegrees':normal_angle,'precedingChordMetres':float(ll),'followingChordMetres':float(rr)})
 return out
def validate_capture(report_path,labels):
 report_path=Path(report_path);r=json.loads(report_path.read_text());root=report_path.parent
 if r.get('schema')!='bounded-C-carrier-support-native-moving-shape/v1' or r.get('complete') is not True or r.get('firstFailure') is not None:raise ValueError('Completed actual carrier capture required')
 out=[]
 for label in labels:
  stubs=[x for x in r.get('loftSnapshots',[]) if x.get('label')==label];checks=[x for x in r['checkpoints'] if x['label']==label]
  if len(stubs)!=1 or len(checks)!=1:raise ValueError('Unique actual snapshot/checkpoint unavailable')
  stub,cp=stubs[0],checks[0];path=root/stub['file']
  if path.parent!=root or path.name!='loft-'+label+'.json':raise ValueError('Snapshot path contract')
  p=pin(path)
  if p['bytes']>6*1024*1024 or any(p[k]!=stub[k] for k in ['bytes','sha256']):raise ValueError('Snapshot byte pin bound/mismatch')
  s=json.loads(path.read_text());g=decode(s);o=cp['observation'];epoch=s['epoch']
  if any(s[k]!=stub[k] for k in ['schema','label','epoch','counts','rawBytes']):raise ValueError('Snapshot manifest mismatch')
  if any(not v for v in s['nonmutation'].values()) or s['nonmutation']!=stub['nonmutation']:raise ValueError('Snapshot nonmutation gate')
  am={k:{f:v[f] for f in ['dtype','littleEndian','count','byteLength','encoding']} for k,v in s['arrays'].items()}
  if am!=stub['arrayManifest']:raise ValueError('Array manifest mismatch')
  if any(epoch[k]!=o[k] for k in ['step','movingStep','seaTime']) or epoch['surfaceRevision']!=o['drawEpoch']['surfaceRevisionAfter'] or epoch['drawnWaterTime']!=o['drawEpoch']['drawnWaterTime']:raise ValueError('Checkpoint exact epoch mismatch')
  g.update({'inputPin':p,'checkpoint':cp});out.append(g)
 return r,out

def station_profile_edges(g,bracket,x):
 out=[]
 for j in range(SAMPLES):
  u=bracket['a']*SAMPLES+j;v=bracket['b']*SAMPLES+j;pa,pb=g['p'][u],g['p'][v]
  if pb[0]==pa[0] or not(min(pa[0],pb[0])<=x<=max(pa[0],pb[0])):out.append(None);continue
  t=(x-pa[0])/(pb[0]-pa[0]);q=pa+t*(pb-pa);out.append(q)
 valid=all(q is not None for q in out)
 if not valid:return {'allProfileRowEdgesIntersectFixedX':False,'edgeIntersections':out}
 wall=out[88+EXT:93+EXT];wp=np.array(wall);crest=out[32+EXT];toe=out[112+EXT]
 return {'allProfileRowEdgesIntersectFixedX':True,'method':'Actual indexed cross-row edges at every profile vertex intersect fixed X; triangle interior diagonal kinks are separate in fixedXSection.',
  'profileEdgeIntersections':out,'crestToToeHorizontalDistance':float(np.linalg.norm((toe-crest)[[0,2]])),'crestToToeVerticalDifference':float(crest[1]-toe[1]),
  'innerWall88to92':{'positions':wall,'horizontalCoordinateRanges':np.ptp(wp[:,[0,2]],axis=0),'verticalSpan':float(np.ptp(wp[:,1])),'pointNormalsAreSuppliedNotFragmentNormals':True}}
def cross_front_normal_changes(contours):
 out=[]
 for lo,hi in zip(contours,contours[1:]):
  for aa,bb in zip(lo['root80to96'],hi['root80to96']):
   na=np.array(aa['normal']);nb=np.array(bb['normal']);angle=math.degrees(math.acos(float(np.clip(np.dot(na,nb)/(np.linalg.norm(na)*np.linalg.norm(nb)),-1,1))))
   out.append({'rows':[lo['row'],hi['row']],'profile':aa['profile'],'normalChangeDegrees':angle})
 return {'comparisons':out,'maximum':max(out,key=lambda q:q['normalChangeDegrees'])}
def analyze_snapshot(g,outdir):
 cp=g['checkpoint'];o=cp['observation'];label=cp['label'];front=int(o['currentFront']);x=float(o['locked']['stationX']);bracket=station_bracket(g,front,x)
 if any(bracket[k]!=o['loftStation']['bracket'][k] for k in ['a','b','t']):raise ValueError('Reconstructed station bracket differs from native')
 a,b=bracket['a'],bracket['b'];bounds=run_bounds(g);first,last=bounds[a];rows=list(range(max(first,a-2),min(last,b+2)+1));section=plane_sections(g,x,front)
 if not section['segments']:raise ValueError('No actual current-component plane section')
 section['properNonadjacentSegmentCrossings']=proper_section_crossings(section)
 winding_report,face,area,alignment=winding(g);normal=normal_check(g);cav=cavity(g,section,o['eye']);declared=[q for q in o['cameraColumns']['eye']['covering'] if q['component']['front']==front];observed=[q['height'] for q in cav['crossingsAtRecordedEyeZ']]
 if len(declared)!=1 or observed!=declared[0]['crossings']:raise ValueError('Exact half-open eye crossings do not reproduce native column')
 cav['recordedEyeCrossingsExactlyMatchNative']=True;contours=[]
 for row in rows:
  contours.append({'row':row,'aux':{k:float(v[row]) for k,v in g['a'].items() if k.startswith('slice')},'positions':row_contour(g,row),'pairedThickness':thickness(g,row),'features':contour_features(g,row),'root80to96':local_curvature(g,row)})
 series=[{'xy':[[p[2],p[1]] for p in s['points']],'color':COLORS[s['band']],'label':s['band']} for s in section['segments']]
 svg_plot(outdir/(label+'-fixed-X-section.svg'),f'{label}: exact indexed section at X={x:.8f}, front={front}','world Z (m)','world Y (m)',series,[{'xy':[o['eye'][2],o['eye'][1]],'label':'recorded inside eye','color':'#111'}],equal=True)
 svg_plot(outdir/(label+'-cavity-detail.svg'),f'{label}: exact indexed profile32..112 cavity detail','world Z (m)','world Y (m)',[line for line,segment in zip(series,section['segments']) if 32<=triangle_meta(g,g['tri'][segment['triangle']])['cellStartProfileIndex']<112],[{'xy':[o['eye'][2],o['eye'][1]],'label':'recorded inside eye','color':'#111'}],equal=True)
 svg_plot(outdir/(label+'-paired-thickness.svg'),f'{label}: source paired upper38..58 / underside88..68','upper source profile index','upper minus underside Y (m)',[{'xy':[[p['top'],p['delta'][1]] for p in c['pairedThickness']['pairs']],'color':['#4575b4','#91bfdb','#fee090','#fc8d59','#d73027','#756bb1'][i%6],'label':f"row {c['row']}"} for i,c in enumerate(contours)])
 s=[]
 for row in rows:
  v=row_contour(g,row);s.append({'xy':[[q[2],q[1]] for q in v[80+EXT:97+EXT]],'color':['#4575b4','#91bfdb','#fee090','#fc8d59','#d73027','#756bb1'][rows.index(row)%6],'label':f'row {row}'})
 svg_plot(outdir/(label+'-root80-96.svg'),f'{label}: indexed-row contour80..96 near fixed station','world Z (m)','world Y (m)',s,equal=True)
 normalseries=[]
 for ci,c in enumerate(contours):normalseries.append({'xy':[[p['profile'],p['precedingNormalChangeDegrees']] for p in c['root80to96']],'color':['#4575b4','#91bfdb','#fee090','#fc8d59','#d73027','#756bb1'][ci%6],'label':f"row {c['row']}"})
 svg_plot(outdir/(label+'-normal80-96.svg'),f'{label}: supplied indexed-row normal changes','source profile index','angle from preceding supplied normal (degrees)',normalseries)
 localtris=np.array([all(int(r) in rows for r in ids//SAMPLES) for ids in g['tri']]);finite=localtris&np.isfinite(alignment)
 return {'label':label,'input':g['inputPin'],'epoch':g['snapshot']['epoch'],'counts':g['counts'],'arrayWordPins':g['manifest'],'front':front,'locked':o['locked'],'bracket':bracket,'nearbyRows':rows,'indexVerification':source_index_check(g),'normalVerification':normal,'winding':winding_report,
  'crossFrontRootNormalChanges':cross_front_normal_changes(contours),'localWinding':{'triangles':int(localtris.sum()),'zeroAreaTriangles':int((localtris&(area==0)).sum()),'negativeAlignment':int((finite&(alignment<0)).sum()),'positiveAlignment':int((finite&(alignment>0)).sum())},'fixedXSection':section,'cavity':cav,'stationProfileEdges':station_profile_edges(g,bracket,x),'nearbyContours':contours}
def exterior_check(g,r,outdir):
 cp=next(c for c in r['checkpoints'] if c['label']=='initial-exterior');o=cp['observation'];ext=o['mouth']['exterior'];eye,target=ext['eye'],ext['target']
 if o['camera']['position']!=eye or o['target']!=target:raise ValueError('Recorded exterior camera pose mismatch')
 if any(o[k]!=g['checkpoint']['observation'][k] for k in ['step','movingStep','seaTime','currentFront']):raise ValueError('Exterior pose epoch/component mismatch')
 result=first_hit(g,eye,target);declared=ext['fullSightline'];hit=result['firstHit'];dh=declared['firstHit'];comparison={}
 for key in ['trianglesTested','indexedLoftOccluded']:comparison[key]=result[key]==declared[key]
 for key in ['triangle','vertices','rows','fronts','fraction','distance','point']:comparison['firstHit.'+key]=finite_json(hit[key])==dh[key] if hit and dh else hit==dh
 if not all(comparison.values()):raise ValueError('Exact indexed first hit does not reproduce native declared ray')
 front=g['checkpoint']['observation']['currentFront'];hit['sameSelectedTubeFront']=all(f==front for f in hit['fronts']);hit['componentClassification']='same selected tube component' if hit['sameSelectedTubeFront'] else 'other/mixed component'
 positions=g['p'][hit['vertices']];series=[{'xy':[[eye[0],eye[2]],[target[0],target[2]]],'color':'#111','width':2,'label':'fixed recorded exterior segment'}, {'xy':[[p[0],p[2]] for p in [*positions,positions[0]]],'color':'#d73027','width':2,'label':'first intersected triangle'}]
 svg_plot(outdir/'initial-exterior-ray-plan.svg','Initial recorded exterior segment and exact first indexed triangle','world X (m)','world Z (m)',series,[{'xy':[eye[0],eye[2]],'label':'exterior eye'},{'xy':[target[0],target[2]],'label':'recorded target'},{'xy':[hit['point'][0],hit['point'][2]],'label':'first hit','color':'#d73027'}],equal=True)
 return {'recordedEye':eye,'recordedTarget':target,'anchorPolicy':ext['anchorPolicy'],'noPoseSearch':True,'declared':declared,'reconstructed':result,'exactComparison':comparison,'limits':'One double-sided ray intersects this source contour band/component. This is geometry evidence; no pixel/material ownership or globally absent entrance claim.'}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--report',required=True);ap.add_argument('--out',required=True);ap.add_argument('--terminal-capture-authorized',action='store_true');args=ap.parse_args()
 if not args.terminal_capture_authorized:ap.error('Actual terminal root authorization is required')
 out=Path(args.out);out.mkdir(exist_ok=True);r,gs=validate_capture(args.report,['initial','first-phase2']);method=Path(__file__).parent/'source-method-pins.json';pins=json.loads(method.read_text())
 if any(pin(p['file'])!=p for p in pins['pins']):raise ValueError('Frozen source-method inputs changed')
 result={'schema':'bounded-C-exact-indexed-loft-offline-analysis/v1','terminalCaptureAuthorizedByRoot':True,'rootTerminalSession':74434,'rootSeal':'1f99b63593ebdb1e33c167957e8c9d45ac5cf0f537a4b448ab57b777208309af','inputReport':pin(args.report),'sourceMethodPins':pins,'snapshots':[analyze_snapshot(g,out) for g in gs],'initialExteriorSightline':exterior_check(gs[0],r,out),'limits':['Exact active indexed geometry and supplied vertex normals only.','No native physics, source, capture, camera, browser, ports or repo changes.','No raster pixel ownership, material/G-buffer attribution, visibility, physical-body passage, FPS or adoption claim.','Only two recorded epochs; no temporal continuity proof.']}
 result['outputPlots']=[pin(p) for p in sorted(out.iterdir()) if p.suffix in ['.svg','.png']]
 result['inputPreservationRechecked']=pin(args.report)==result['inputReport'] and all(pin(q['inputPin']['file'])==q['inputPin'] for q in gs) and all(pin(p['file'])==p for p in pins['pins'])
 if not result['inputPreservationRechecked']:raise ValueError('Immutable inputs changed while analyzing')
 write_json(out/'analysis.json',result);print(json.dumps({'snapshots':[(g['snapshot']['label'],g['counts']) for g in gs],'analysis':pin(out/'analysis.json'),'plots':len(result['outputPlots'])}))
if __name__=='__main__':main()
