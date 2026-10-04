"""Static offline profile plots from the frozen receipt; no source geometry run."""
from PIL import Image,ImageDraw,ImageFont
import json
from pathlib import Path
W=Path('/private/tmp/tube-whole-curl-profile-20261004/descending-lip');r=json.load(open(W/'report.json'))
im=Image.new('RGB',(1440,900),'#f7f9fc');d=ImageDraw.Draw(im)
try:
 font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',19);small=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',15);large=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',25)
except OSError:font=small=large=ImageFont.load_default()
d.text((40,22),'One frozen C-curl candidate — offline geometry, no native visual acceptance',fill='#172338',font=large)
d.text((40,61),'Purple: captured original   Cyan: full-curl candidate   Indices32/88/rest fixed;64 is lifted rolled tip',fill='#172338',font=font)
for k,s in enumerate(r['actual']):
 left=55+(k%3)*465;top=120+(k//3)*355;w=400;h=280
 def xy(q,y):return (left+(q+.15)/3.0*w,top+h-(y+.2)/3.15*h)
 for q in (0,.5,1,1.5,2,2.5):
  x,_=xy(q,0);d.line([(x,top),(x,top+h)],fill='#dce3ee');d.text((x-10,top+h+8),str(q),fill='#53627a',font=small)
 for y in (0,.5,1,1.5,2,2.5):
  _,z=xy(0,y);d.line([(left,z),(left+w,z)],fill='#dce3ee');d.text((left-32,z-8),str(y),fill='#53627a',font=small)
 d.rectangle((left,top,left+w,top+h),outline='#617084')
 d.line([xy(p['q'],p['y']) for p in s['beforePolyline']],fill='#9b4fbd',width=3)
 d.line([xy(p['q'],p['y']) for p in s['afterPolyline']],fill='#007f9d',width=3)
 for p in s['afterPolyline']:
  if p['point'] in (32,64,88):
   x,y=xy(p['q'],p['y']);d.ellipse((x-4,y-4,x+4,y+4),fill='#073c54');d.text((x+7,y-16),str(p['point']),fill='#073c54',font=small)
 air=s['after']['floorToInnerRoofAir'];d.text((left,top-26),f"Row{s['row']['row']}: max gap{air['maxGap']['gap']:.2f}m, width>=1.6m{air['largestContinuousUsefulWidth']:.2f}m",fill='#172338',font=small)
 if k>=3:d.text((left+125,top+h+33),'q along section (m)',fill='#53627a',font=small)
d.text((1000,530),'Roll thickness0.24–0.25m.',fill='#172338',font=font)
d.text((1000,560),'Tip rises0.85–1.28m.',fill='#172338',font=font)
d.text((1000,580),'1.6m gap / 0.6m width: FAILED.' ,fill='#9b2c32',font=small)
d.text((1000,610),'Authored touchdown must become',fill='#172338',font=small)
d.text((1000,632),'the settling event for the analytic curl.',fill='#172338',font=small)
d.text((1000,680),'Actual case/frame blends, moving loft',fill='#172338',font=small)
d.text((1000,702),'and rider passage remain unverified.',fill='#172338',font=small)
im.save(W/'captured-profile-comparison.png')
