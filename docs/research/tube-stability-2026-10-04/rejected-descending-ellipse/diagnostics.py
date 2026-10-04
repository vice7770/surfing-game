"""Classify frozen-trial failures and draw numeric plots; never alter the recipe."""
import collections, importlib.util, json, math, struct
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
W=Path('/private/tmp/tube-descending-tip-profile-20261004')
spec=importlib.util.spec_from_file_location('descending_tip_diagnostic_source',W/'prototype.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
report=json.load(open(W/'report.json'));old=json.load(open(p.PREVIOUS/'report.json'))
F32=lambda x:struct.unpack('<f',struct.pack('<f',x))[0]
def rounded(points):return [{'point':r['point'],'q':F32(r['q']),'y':F32(r['y'])} for r in points]
def blend(a,b,t):return [{'point':x['point'],'q':F32(x['q']+(y['q']-x['q'])*t),'y':F32(x['y']+(y['y']-x['y'])*t)} for x,y in zip(a,b)]
def zero_edges(points):return {(a['point'],b['point']) for a,b in zip(points,points[1:]) if a['q']==b['q'] and a['y']==b['y']}
def decode(asset):
    b=Path(asset['file']).read_bytes();magic,size=struct.unpack_from('<II',b);start=8+((size+3)//4)*4;raw=struct.unpack('<'+str((len(b)-start)//4)+'f',b[start:]);count=len(raw)//(258 if magic==0x42524c32 else 256)
    return [[{'point':i,'q':raw[f*256+2*i],'y':raw[f*256+2*i+1]} for i in range(128)] for f in range(count)]

groups=collections.defaultdict(list)
for r in report['invalidFrames']:groups[r['case']].append(r)
domains=[]
for case,rows in groups.items():
    domains.append({'case':case,'frames':[r['frame'] for r in rows],'count':len(rows),'phaseCounts':dict(collections.Counter(r['phase'] for r in rows)),
      'allNonpositiveFloorBasisDepth':all(r['recipe']['d0']<=0 for r in rows),'d0Range':[min(r['recipe']['d0'] for r in rows),max(r['recipe']['d0'] for r in rows)]})
framezeros=[];interpzeros=[];crossprofiles=[];allpaired={};finite_bit_preservation=True
for case in report['cases']:
    original=decode(case['asset']);after=[]
    for i,points in enumerate(original):
        double_candidate,meta=p.transform(points);candidate=rounded(double_candidate) if double_candidate else None;after.append(candidate)
        assert (candidate is not None)==case['frames'][i]['valid']
        if candidate is None:continue
        finite_bit_preservation &= all(points[j]==candidate[j] for j in list(range(33))+[64]+list(range(88,128)))
        changed=zero_edges(candidate)-zero_edges(points)
        if changed:framezeros.append({'case':case['id'],'frame':i,'newZeroLengthSegments':[list(s) for s in sorted(changed)],'maturity':meta['maturity'],'sheetThickness':meta.get('sheetThickness')})
        ch=case['frames'][i]['crossingChange']
        if ch['afterPairCount']>ch['beforePairCount']:
            # The unblended target is a component of this frozen recipe, not a new trial.
            m=meta['maturity'];target=[dict(a) for a in double_candidate]
            for raw,tgt in zip(points,target):
                if 33<=raw['point']<=87 and raw['point']!=64:
                    tgt['q']=(tgt['q']-(1-m)*raw['q'])/m;tgt['y']=(tgt['y']-(1-m)*raw['y'])/m
            crossprofiles.append({'case':case['id'],'frame':i,'recipe':meta,'before':points,'after':candidate,'crossingChange':ch,
                'crossingsBeforeF32Rounding':p.segment_intersections(double_candidate),'unblendedInternalTargetCrossings':p.segment_intersections(target)})
    allpaired[case['id']]=(original,after)
    for i in range(len(original)-1):
        if after[i] is None or after[i+1] is None:continue
        for t in (.25,.5,.75):
            a=blend(original[i],original[i+1],t);b=blend(after[i],after[i+1],t);changed=zero_edges(b)-zero_edges(a)
            if changed:interpzeros.append({'case':case['id'],'frames':[i,i+1],'share':t,'newZeroLengthSegments':[list(s) for s in sorted(changed)]})
review={'schema':'descending-tip-failure-attribution/v1','geometryRecipeUnchanged':p.receipt(W/'prototype.py')==report['freeze']['prototype'],'recipeDocumentUnchanged':p.receipt(W/'recipe.md')==report['freeze']['recipe'],
  'invalidDomainGroups':domains,'allInvalidAreNegativeFloorBasisDepth':all(r['recipe']['d0']<0 for r in report['invalidFrames']),
  'exactF32AnchorAndRestPreservation':finite_bit_preservation,'newDiscreteZeroEdgeFrames':framezeros,'newDiscreteZeroEdgeInterpolationSamples':interpzeros,
  'crossingFrameDetails':[{'case':r['case'],'frame':r['frame'],'maturity':r['recipe']['maturity'],'thickness':r['recipe']['sheetThickness'],'d0':r['recipe']['d0'],'originalPairs':r['crossingChange']['beforePairCount'],'newPairs':r['crossingChange']['afterPairCount'],'pairsBeforeF32Rounding':len(r['crossingsBeforeF32Rounding']),'unblendedInternalTargetPairCount':len(r['unblendedInternalTargetCrossings']),'maximumSampledCurvature':r['recipe']['maximumSampledOuterCurvature']} for r in crossprofiles],
  'captured':[{'row':r['row']['row'],'originalBodyWidth':r['beforeAir113']['continuousWidth'],'candidateBodyWidth':r['afterAir113']['continuousWidth'],'candidateGenerousWidth':r['afterAir160']['continuousWidth'],
    'capturedInner70_80ActualDistanceRange':[min(t['nearestOppositeRunDistance'] for t in r['afterThickness']['inner70_80']),max(t['nearestOppositeRunDistance'] for t in r['afterThickness']['inner70_80'])],
    'attachment82Turn':next(x['absoluteTurnDegrees'] for x in r['afterTurns']['junctions'] if x['point']==82),'root36Distance':next(x['nearestOppositeRunDistance'] for x in r['afterThickness']['outer36_56'] if x['point']==36)} for r in report['actual']],
  'diagnosticSource':p.receipt(W/'diagnostics.py'),
  'nextActionProposal':'Do not integrate this recipe. If another offline trial is authorized, replace the quarter ellipse with a crest-to-lip Hermite centreline that accepts arbitrary anchor direction and ends at the preserved floor tangent. Construct its paired underside from the same discretized outer facets with a global representability/curvature bound, rather than independently sampled continuous offsets. Keep original64 XY and all-frame scope; no per-frame exceptions. This requires a new explicit recipe and new full evidence, not coefficient tuning of this rejected trial.'}
(W/'failure-profiles.json').write_text(json.dumps(crossprofiles,separators=(',',':'))+'\n')
(W/'review.json').write_text(json.dumps(review,indent=2)+'\n')
try:
    font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',21);small=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',17);big=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',28)
except OSError:font=small=big=ImageFont.load_default()
im=Image.new('RGB',(1800,1080),'#f7f9fc');d=ImageDraw.Draw(im)
d.text((40,20),'Descending-tip paired ellipse — rejected globally after one frozen offline trial',font=big,fill='#172338')
d.text((40,62),'Grey: original    Purple: existing 0.25H shelf    Teal: descending-tip trial    Tip 64 XY retained; no native adoption',font=font,fill='#263850')
priorrows={r['row']['row']:r for r in old['actual']}
for k,row in enumerate(report['actual']):
    left=65+(k%3)*580;top=145+(k//3)*495;width=515;height=330
    def xy(q,y):return left+(q+.15)/3.0*width,top+height-(y+.10)/3.0*height
    for q in (0,.5,1,1.5,2,2.5):
        x,_=xy(q,0);d.line([(x,top),(x,top+height)],fill='#dce3ee');d.text((x-8,top+height+7),str(q),font=small,fill='#53627a')
    for y in (0,.5,1,1.5,2,2.5):
        _,z=xy(0,y);d.line([(left,z),(left+width,z)],fill='#dce3ee');d.text((left-30,z-8),str(y),font=small,fill='#53627a')
    d.rectangle((left,top,left+width,top+height),outline='#617084')
    d.line([xy(p['q'],p['y']) for p in row['beforePolyline']],fill='#9297a0',width=3)
    d.line([xy(p['q'],p['y']) for p in priorrows[row['row']['row']]['afterPolyline']],fill='#a06bb4',width=3)
    d.line([xy(p['q'],p['y']) for p in row['afterPolyline']],fill='#007f9d',width=3)
    for point in row['afterPolyline']:
        if point['point'] in (32,64,82,88):
            x,y=xy(point['q'],point['y']);d.ellipse((x-4,y-4,x+4,y+4),fill='#073c54');d.text((x+6,y-18),str(point['point']),font=small,fill='#073c54')
    gap=row['afterAir113']['maxGap']['gap'];bw=row['afterAir113']['continuousWidth'];gw=row['afterAir160']['continuousWidth']
    d.text((left,top-50),f"Row {row['row']['row']}: max gap {gap:.3f}m; width at 1.13m={bw:.3f}m",font=small,fill='#172338')
    d.text((left,top-26),f"Width at 1.60m={gw:.3f}m; analytic T={row['recipe']['sheetThickness']:.3f}m",font=small,fill='#172338')
    for a,b in row['afterAir113']['usefulIntervals']:
        xa,_=xy(a,0);xb,_=xy(b,0);d.line([(xa,top+height+39),(xb,top+height+39)],fill='#258156',width=7)
    d.text((left+10,top+height+49),'Green strip: separate continuous 1.13m vertical-gap corridor',font=small,fill='#397056')
d.text((1255,600),'Local captured corridor gains:',font=font,fill='#172338')
d.text((1255,635),'1.13m gap / 1.25m width: all five pass.',font=small,fill='#258156')
d.text((1255,663),'1.60m gap / 1.25m width: all five fail.',font=small,fill='#a12d37')
d.text((1255,715),'Global failures:',font=font,fill='#a12d37')
d.text((1255,750),'157 invalid formation frames.',font=small,fill='#a12d37')
d.text((1255,778),'4 new clean-to-crossed frames.',font=small,fill='#a12d37')
d.text((1255,806),'11 new clean-to-crossed F32 interps.',font=small,fill='#a12d37')
d.text((1255,856),'Attachment 82 sampled turn up to 70deg.',font=small,fill='#172338')
d.text((1255,884),'Local corridor is not body/board/path proof.',font=small,fill='#172338')
d.text((1255,912),'No production changes or native launches.',font=small,fill='#172338')
im.save(W/'captured-profile-comparison.png')
print(json.dumps({'newZeroEdgeFrames':len(framezeros),'newZeroEdgeInterpolationSamples':len(interpzeros),'sourceAndRecipeUnchanged':review['geometryRecipeUnchanged'] and review['recipeDocumentUnchanged'],'exactAnchorRestPreservation':finite_bit_preservation,'crossingFrameDetails':review['crossingFrameDetails']}))
