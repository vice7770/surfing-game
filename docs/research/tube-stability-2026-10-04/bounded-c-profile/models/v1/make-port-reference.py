from pathlib import Path
import importlib.util,json,struct
W=Path('/private/tmp/tube-bounded-c-profile-20261004');sp=importlib.util.spec_from_file_location('frozen',W/'prototype.py');p=importlib.util.module_from_spec(sp);sp.loader.exec_module(p)
r=json.loads((W/'report.json').read_text());refs=[]
for c in r['cases']:
 b=Path(c['asset']['path']).read_bytes() if 'path' in c['asset'] else Path(c['asset']['file']).read_bytes()
 _,size=struct.unpack_from('<II',b);head=json.loads(b[8:8+size]);start=8+((size+3)//4)*4;d=struct.unpack('<'+str((len(b)-start)//4)+'f',b[start:]);count=len(d)//258
 frames=c['frames'];indices=sorted(set([0,count-1,min(range(count),key=lambda i:abs(frames[i]['params']['tau'])),min(range(count),key=lambda i:abs(frames[i]['params']['tau']-.4*head['touchdown'])),max(range(count),key=lambda i:frames[i]['turns']['maximum']['absoluteTurnDegrees'])]))
 for f in indices:
  raw=[{'point':i,'q':d[f*256+2*i],'y':d[f*256+2*i+1]} for i in range(128)];z=frames[f]['params'];shape,meta=p.transform(raw,z)
  refs.append({'case':c['case'],'frame':f,'raw':[v for a in raw for v in (a['q'],a['y'])],'expected':[v for a in shape for v in (a['q'],a['y'])],'params':{'crest':z['A'],'toe':z['T'],'incoming':z['ct'],'outgoing':z['tt'],'authoredTD':z['TD'],'tau':z['tau']},'impactTau':meta['impactTau'],'thickness':meta['thickness']})
(W/'port-reference.json').write_text(json.dumps(refs,separators=(',',':'))+'\n');print(len(refs))
