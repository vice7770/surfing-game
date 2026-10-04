from pathlib import Path
import importlib.util,json,math,struct
from PIL import Image,ImageDraw,ImageFont
W=Path('/private/tmp/tube-bounded-c-profile-20261004');r=json.load(open(W/'report.json'))
sp=importlib.util.spec_from_file_location('frozen',W/'prototype.py');p=importlib.util.module_from_spec(sp);sp.loader.exec_module(p)
font=lambda n:ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',n)
def panel(d,box,title,raw,new,notes,scale=1,full=False):
 x0,y0,x1,y1=box;d.rounded_rectangle(box,12,fill='white',outline='#cbd5e1',width=2);d.text((x0+15,y0+12),title,font=font(22),fill='#223047')
 origin=next(a['q'] for a in raw if a['point']==32);lo=20 if full else 32;arrays=[[a for a in z if lo<=a['point']<=112] for z in (raw,new)];xs=[(a['q']-origin)*scale for z in arrays for a in z];ys=[a['y']*scale for z in arrays for a in z];xmin,xmax=min(xs)-.1,max(xs)+.1;ymin,ymax=min(ys)-.1,max(ys)+.1
 graph=(x0+50,y0+80,x1-20,y1-95);u=min((graph[2]-graph[0])/(xmax-xmin),(graph[3]-graph[1])/(ymax-ymin));gx=graph[0]+((graph[2]-graph[0])-(xmax-xmin)*u)/2;gy=graph[3]-((graph[3]-graph[1])-(ymax-ymin)*u)/2
 def at(a):return (gx+((a['q']-origin)*scale-xmin)*u,gy-(a['y']*scale-ymin)*u)
 for i in range(math.ceil(xmin/.5),math.floor(xmax/.5)+1):
  x=i*.5;xx=gx+(x-xmin)*u;d.line((xx,gy,xx,gy-(ymax-ymin)*u),fill='#e2e8f0');d.text((xx-8,gy+4),str(x),font=font(13),fill='#7b8794')
 for i in range(math.ceil(ymin/.5),math.floor(ymax/.5)+1):
  y=i*.5;yy=gy-(y-ymin)*u;d.line((gx,yy,gx+(xmax-xmin)*u,yy),fill='#e2e8f0');d.text((gx-33,yy-7),str(y),font=font(13),fill='#7b8794')
 for z,c in zip(arrays,('#7b8794','#078c9b')):d.line([at(a) for a in z],fill=c,width=3)
 for i in (32,64,88,112):
  a=next(a for a in new if a['point']==i);x,y=at(a);d.ellipse((x-4,y-4,x+4,y+4),fill='#f59e0b');d.text((x+6,y-9),str(i),font=font(16),fill='#223047')
 for j,n in enumerate(notes):d.text((x0+15,y1-78+j*22),n,font=font(17),fill='#223047')
im=Image.new('RGB',(1520,1870),'#f1f5f9');d=ImageDraw.Draw(im);d.text((24,20),'Bounded analytic C-profile: frozen captured comparison',font=font(30),fill='#223047');d.text((24,58),'Grey raw; teal analytic. Metres, equal axes.64 cap minimum;88 descending face.32/112 unchanged.',font=font(20),fill='#223047')
for i,a in enumerate(r['actual']):
 col=i%2;row=i//2;panel(d,(20+col*755,100+row*578,735+col*755,658+row*578),f"Row{a['row']['row']} | {a['model']['phase']}",a['rawPolyline'],a['afterPolyline'],[f"1.13m width {a['air113']['continuousWidth']:.3f}m;1.6m width {a['air160']['continuousWidth']:.3f}m",f"Maximum turn {a['turns']['maximum']['absoluteTurnDegrees']:.2f}deg;sheet {a['model']['thickness']:.3f}m",'Partial capture cannot verify preserved bulk before32.'])
d.text((790,1360),'All declared global groups finite/valid.',font=font(24),fill='#223047')
for j,n in enumerate(['No new crossing pairs or cap-floor penetration.','All1224frames/3648F32 blends evaluated.','Collapsed tiny loops publish no air.','Native curl and actual entry remain unproven.']):d.text((790,1415+j*45),n,font=font(22),fill='#223047')
im.save(W/'captured-profile-comparison.png')
# Render existing predeclared normalized ages; no extra geometry grid or coefficient changes.
ref=json.load(open('/private/tmp/tube-monotone-inner-profile-20261004/eligible-cases.json'))
for caseid in ('pad19-a30-l12','periodic-reef42-l12'):
 c=next(x for x in r['cases'] if x['case']==caseid);b=Path(c['asset']['file']).read_bytes();_,size=struct.unpack_from('<II',b);head=json.loads(b[8:8+size]);start=8+((size+3)//4)*4;vals=struct.unpack('<'+str((len(b)-start)//4)+'f',b[start:]);source=next(x for x in ref['cases'] if x['id']==caseid);f=round((source['held']['tau']-head['tauStart'])/head['tauStep']);raw=[{'point':i,'q':vals[f*256+2*i],'y':vals[f*256+2*i+1]} for i in range(128)]
 ages=[0,.25,.4,.8,1,1.15,1.5,1.9];im=Image.new('RGB',(1520,2280),'#f1f5f9');d=ImageDraw.Draw(im);d.text((24,20),caseid+' | frozen ordinary-to-retirement phase grid',font=font(28),fill='#223047');d.text((24,60),'Held input parameters; 7m illustrative scale. Grey raw, teal model. Same controls at zero limits.',font=font(20),fill='#223047')
 for i,age in enumerate(ages):
  a=min((x for x in r['phaseGrid'] if x['case']==caseid),key=lambda x:abs(x['params']['tau']/x['params']['TD']-age));new,m=p.transform(raw,a['params']);row=i//2;col=i%2
  panel(d,(20+col*755,100+row*540,735+col*755,625+row*540),f"Age {age:.2f}TD | {m['phase']}",raw,new,[f"Formation {m['formation']:.3f};remaining {m['remaining']:.3f}",f"T {m['thickness']*7:.4f}m;root R {m['rootRadius']*7:.4f}m",'No phase fallbacks; ordinary/retired loops explicitly collapse.'],scale=7,full=True)
 im.save(W/(caseid+'-phase-grid.png'))
