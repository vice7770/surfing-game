from pathlib import Path
import json,math
from PIL import Image,ImageDraw,ImageFont
W=Path('/private/tmp/tube-analytic-c-profile-20261004');r=json.load(open(W/'report.json'));bad=json.load(open(W/'failure-profiles.json'))
font=lambda n:ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',n)
def panel(d,box,title,raw,new,notes,scale=1,full=False):
 x0,y0,x1,y1=box;d.rounded_rectangle(box,12,fill='white',outline='#cbd5e1',width=2);d.text((x0+15,y0+12),title,font=font(22),fill='#223047')
 origin=next(a['q'] for a in raw if a['point']==32);lo=20 if full else 32;arrays=[[a for a in z if lo<=a['point']<=112] for z in (raw,new)];xs=[(a['q']-origin)*scale for z in arrays for a in z];ys=[a['y']*scale for z in arrays for a in z];xmin,xmax=min(xs)-.1,max(xs)+.1;ymin,ymax=min(ys)-.1,max(ys)+.1
 graph=(x0+50,y0+80,x1-20,y1-95);u=min((graph[2]-graph[0])/(xmax-xmin),(graph[3]-graph[1])/(ymax-ymin));gx=graph[0]+((graph[2]-graph[0])-(xmax-xmin)*u)/2;gy=graph[3]-((graph[3]-graph[1])-(ymax-ymin)*u)/2
 def at(a):return (gx+((a['q']-origin)*scale-xmin)*u,gy-(a['y']*scale-ymin)*u)
 step=.5 if scale==1 else 2
 for i in range(math.ceil(xmin/step),math.floor(xmax/step)+1):
  x=i*step;xx=gx+(x-xmin)*u;d.line((xx,gy,xx,gy-(ymax-ymin)*u),fill='#e2e8f0');d.text((xx-8,gy+4),str(x),font=font(13),fill='#7b8794')
 for i in range(math.ceil(ymin/step),math.floor(ymax/step)+1):
  y=i*step;yy=gy-(y-ymin)*u;d.line((gx,yy,gx+(xmax-xmin)*u,yy),fill='#e2e8f0');d.text((gx-33,yy-7),str(y),font=font(13),fill='#7b8794')
 for z,c in zip(arrays,('#7b8794','#078c9b')):d.line([at(a) for a in z],fill=c,width=3)
 for i in (32,64,88,112):
  a=next(a for a in new if a['point']==i);x,y=at(a);d.ellipse((x-4,y-4,x+4,y+4),fill='#f59e0b');d.text((x+6,y-9),str(i),font=font(16),fill='#223047')
 for j,n in enumerate(notes):d.text((x0+15,y1-78+j*22),n,font=font(17),fill='#223047')
def main():
 im=Image.new('RGB',(1520,1870),'#f1f5f9');d=ImageDraw.Draw(im);d.text((24,20),'Frozen analytic C-profile: actual captured outlines',font=font(30),fill='#223047');d.text((24,58),'Grey raw; teal analytic. Metres, equal axes. 64 cap minimum; 88 root wall; 32/112 unchanged.',font=font(20),fill='#223047')
 for i,a in enumerate(r['actual']):
  col=i%2;row=i//2;box=(20+col*755,100+row*578,735+col*755,658+row*578)
  panel(d,box,f"Row {a['row']['row']} | {a['model']['phase']}",a['rawPolyline'],a['afterPolyline'],[f"1.13 m width {a['air113']['continuousWidth']:.3f} m; 1.6 m width {a['air160']['continuousWidth']:.3f} m",f"Maximum turn {a['turns']['maximum']['absoluteTurnDegrees']:.2f} deg; sheet {a['model']['thickness']:.3f} m",'Partial captured outline cannot verify preserved bulk before32.'])
 d.text((790,1350),'Captured targets pass; global candidate fails.',font=font(24),fill='#223047')
 for j,n in enumerate(['Reef root crosses roof and preserved bulk.','Strict thin-loop F32 failures remain.','Zero-state floor limits are discontinuous.','No native or actual entry evidence.']):d.text((790,1410+j*45),n,font=font(22),fill='#223047')
 im.save(W/'captured-profile-comparison.png')
 im=Image.new('RGB',(1400,1770),'#f1f5f9');d=ImageDraw.Draw(im);d.text((25,20),'Causal failure: unbounded circular root in narrow Reef domains',font=font(27),fill='#223047');d.text((25,60),'Zoom includes preserved bulk20..31. h0 x 7m is illustrative; both axes have equal scale.',font=font(20),fill='#223047')
 for j,a in enumerate(bad):
  panel(d,(20,110+j*540,1380,630+j*540),f"Reef frame {a['frame']} | phase {a['model']['phase']}",a['raw'],a['after'],[f"W/H {a['model']['W']/a['model']['H']:.3f}; root radius {a['model']['rootRadius']:.3f} h0",f"{len(a['crossings'])} crossings: {str([b['segments'] for b in a['crossings']])}",'Expanding authority alone cannot fix root crossing the owned roof.'],scale=7,full=True)
 im.save(W/'failure-profile-comparison.png')
if __name__=='__main__':main()
