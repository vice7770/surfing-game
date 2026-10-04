"""Static numeric contour figures, no editing of native imagery."""
from pathlib import Path
import json,math
from PIL import Image,ImageDraw,ImageFont
W=Path('/private/tmp/tube-descending-facet-profile-20261004')
r=json.load(open(W/'report.json'))
old=json.load(open('/private/tmp/tube-whole-curl-profile-20261004/descending-lip/report.json'))
fixtures=json.load(open(W/'failure-profiles.json'))
FONT=Path('/System/Library/Fonts/Supplemental/Arial.ttf')
f=lambda s:ImageFont.truetype(str(FONT),s)
GRAY='#7b8794';PURPLE='#bc73cf';TEAL='#058e9b';ORANGE='#f59e0b';BLACK='#223047';GRID='#e0e6ed'

def panel(draw,box,title,lines,points,scale=1,oldroof=None,pre=None,notes=()):
    x0,y0,x1,y1=box;draw.rounded_rectangle(box,14,fill='white',outline='#cbd5e1',width=2)
    draw.text((x0+20,y0+15),title,font=f(22),fill=BLACK)
    for j,line in enumerate(lines):draw.text((x0+20,y0+44+21*j),line,font=f(17),fill=BLACK)
    graph=(x0+53,y0+114,x1-24,y1-75)
    q0=next(p['q'] for p in points if p['point']==32);raw=[p for p in points if 32<=p['point']<=112]
    outlines=[a for a in (raw,oldroof,pre) if a]
    xmin=min((p['q']-q0)*scale for a in outlines for p in a if 32<=p['point']<=88)-.15*scale
    xmax=max((p['q']-q0)*scale for a in outlines for p in a if 32<=p['point']<=88)+.2*scale
    ymin=min(p['y']*scale for a in outlines for p in a if 32<=p['point']<=88)-.08*scale
    ymax=max(p['y']*scale for a in outlines for p in a if 32<=p['point']<=88)+.08*scale
    for a in outlines:
        for p in a:
            if p['point']>=88 and xmin<=(p['q']-q0)*scale<=xmax:ymin=min(ymin,p['y']*scale-.08*scale)
    width,height=graph[2]-graph[0],graph[3]-graph[1];unit=min(width/(xmax-xmin),height/(ymax-ymin))
    gx=graph[0]+(width-unit*(xmax-xmin))/2;gy=graph[3]-(height-unit*(ymax-ymin))/2
    def xy(p):return (gx+((p['q']-q0)*scale-xmin)*unit,gy-(p['y']*scale-ymin)*unit)
    step=.5 if scale==1 else 1
    for i in range(math.ceil(xmin/step),math.floor(xmax/step)+1):
        q=i*step;xx=gx+(q-xmin)*unit;draw.line((xx,gy,xx,gy-(ymax-ymin)*unit),fill=GRID,width=1)
        draw.text((xx-9,gy+4),f'{q:g}',font=f(14),fill=GRAY)
    for i in range(math.ceil(ymin/step),math.floor(ymax/step)+1):
        y=i*step;yy=gy-(y-ymin)*unit;draw.line((gx,yy,gx+(xmax-xmin)*unit,yy),fill=GRID,width=1)
        draw.text((gx-38,yy-8),f'{y:g}',font=f(14),fill=GRAY)
    # Drawing clips long retained floor tails to the displayed local domain.
    def contour(a,color,width):
        for p,q in zip(a,a[1:]):
            if p['point']<32 or q['point']>112:continue
            A,B=xy(p),xy(q)
            if max(A[0],B[0])<gx or min(A[0],B[0])>gx+(xmax-xmin)*unit:continue
            if gx-2<=A[0]<=gx+(xmax-xmin)*unit+2 and gx-2<=B[0]<=gx+(xmax-xmin)*unit+2:
                draw.line((*A,*B),fill=color,width=width)
    contour(points,GRAY,3)
    if oldroof:contour(oldroof,PURPLE,3)
    if pre:contour(pre,'#df5d59',3)
    after=raw if oldroof is None and pre is None else None
    # Teal candidate is passed as the first notes item so bounds include it above.
    candidate=notes[0] if notes else points
    contour(candidate,TEAL,4)
    for i in (32,64,88):
        p=next(a for a in candidate if a['point']==i);x,y=xy(p)
        draw.ellipse((x-5,y-5,x+5,y+5),fill=ORANGE)
        draw.text((x+7,y-8),str(i),font=f(16),fill=BLACK)
    for j,note in enumerate(notes[1:] if notes else []):draw.text((x0+20,y1-61+20*j),note,font=f(17),fill=BLACK)

def main():
    im=Image.new('RGB',(1540,1920),'#f1f5f9');d=ImageDraw.Draw(im)
    d.text((28,20),'Preserved low tip: frozen Hermite / discrete-facet candidate',font=f(29),fill=BLACK)
    d.text((28,57),'Actual saved native outlines in metres. Grey original; purple rejected 0.25H shelf; teal new candidate.',font=f(20),fill=BLACK)
    for j,a in enumerate(r['actual']):
        o=next(t for t in old['actual'] if t['row']['row']==a['row']['row'])
        col=j%2;row=j//2;box=(25+col*765,98+row*598,750+col*765,676+row*598)
        candidate=a['afterPolyline'];original=a['beforePolyline']
        panel(d,box,f"Captured row {a['row']['row']}  |  lip drop {a['recipe']['crestToOriginalTipDrop']:.3f} m",
          [f"1.13 m clearance width: {a['afterAir113']['continuousWidth']:.3f} m (target 1.25 m)",
           f"1.60 m clearance width: {a['afterAir160']['continuousWidth']:.3f} m"],original,oldroof=o['afterPolyline'],
          notes=(candidate,f"Maximum sampled turn {a['afterTurns']['maximum']['absoluteTurnDegrees']:.1f} degrees; nominal sheet {a['recipe']['sheetThickness']:.3f} m.",
                 'Contour drawing uses equal horizontal and vertical scales.'))
    d.text((800,1330),'Result: geometry evidence only',font=f(28),fill=BLACK)
    for i,text in enumerate(['All five preserve original 32 / 64 / 88.',
                            'Four of five meet crouched-width target.',
                            'None meets generous-height-width target.',
                            'Attachment still bends 45–55 degrees.',
                            'Actual board/body/path clearance untested.',
                            'No moving native adoption.']):
        d.text((800,1380+i*43),text,font=f(22),fill=BLACK)
    im.save(W/'captured-profile-comparison.png')
    im=Image.new('RGB',(1540,1930),'#f1f5f9');d=ImageDraw.Draw(im)
    d.text((28,18),'Frozen recipe: causal failure receipts',font=f(29),fill=BLACK)
    d.text((28,57),'Grey raw; teal after-query construction; red pretransformed blend where shown. h0 x 7 m is illustrative.',font=f(20),fill=BLACK)
    for j,a in enumerate(fixtures):
        col=j%2;row=j//2;box=(25+col*765,100+row*603,750+col*765,683+row*603)
        frame=str(a['frame']) if a['share'] is None else f"{a['frame']} -> {a['frame']+1} @ {a['share']}"
        panel(d,box,a['case'],[f'Frame {frame}',a['title']],a['raw'],scale=7,pre=a['pretransformedBlend'],
              notes=(a['after'],f"Maturity {a['recipe']['maturity']:.6f}; reach {a['recipe']['originalReach']:.6f} h0.",
                     'Finite contours and inherited crossings do not establish usable tube geometry.'))
    im.save(W/'failure-profile-comparison.png')

if __name__=='__main__':main()
