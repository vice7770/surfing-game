"""One fixed half-thickness trial. Production and solver inputs remain untouched."""
import copy
import hashlib
import json
import math
from pathlib import Path
from measurement_functions import vertical_crossings, at_q, segment_intersections

WORK=Path('/private/tmp/tube-thinner-roof-20261004/contour-ceiling')
SOURCE=Path('/private/tmp/tube-lip-attribution-20261004/native-first/report.json')
METHOD=Path('/private/tmp/tube-opening-shape-20261004/measure.py')
REFERENCE_SCALE=7
LANDMARK={'crest':32,'lip':64,'throat':88,'toe':112}


def smoothstep(x):
    x=max(0,min(1,x))
    return x*x*(3-2*x)


def thin_inner_roof(points):
    """Keep X and every outer/floor point; raise 65..87 half toward the nearest higher original nonincident contour."""
    changed=copy.deepcopy(points)
    by_id={p['point']:p for p in points}
    crest,lip,throat,toe=[by_id[LANDMARK[key]] for key in ('crest','lip','throat','toe')]
    crest_height=crest['y']-toe['y']
    reach=lip['q']-throat['q']
    onset=smoothstep(reach/(0.15*crest_height)) if reach>0 and crest_height>0 else 0
    raised=[];missing=[];nonpositive=[];separations=[]
    for p,after in zip(points,changed):
        i=p['point']
        if not 65<=i<=87:
            continue
        above=[]
        for a,b in zip(points,points[1:]):
            if a['point'] in (i-1,i):
                continue
            qa,qb=a['q'],b['q']
            if abs(qb-qa)<1e-12 or not min(qa,qb)<=p['q']<=max(qa,qb):
                continue
            t=(p['q']-qa)/(qb-qa)
            y=a['y']+t*(b['y']-a['y'])
            if y>p['y']:
                above.append({'y':y,'segment':[a['point'],b['point']]})
        if not above:
            missing.append(i)
            continue
        ceiling=min(above,key=lambda h:h['y'])
        top=ceiling['y']
        separation=top-p['y']
        if separation<=0:
            nonpositive.append({'point':i,'separation':separation})
            continue
        ramp=smoothstep(min((i-64)/4,(88-i)/4))
        raise_y=0.5*separation*ramp*onset
        after['y']=p['y']+raise_y
        if 'world' in after:
            after['world'][1]=after['y']
        separations.append({'point':i,'before':separation,'after':top-after['y'],'ramp':ramp})
        if raise_y:
            raised.append({'point':i,'raise':raise_y,'ceilingSegment':ceiling['segment'],'ceilingY':top})
    for before,after in zip(points,changed):
        assert before['q']==after['q']
        assert before['point']==after['point']
        if before['point']<=64 or before['point']>=88:
            assert before==after
        if 'world' in before:
            assert before['world'][0]==after['world'][0]
            assert before['world'][2]==after['world'][2]
    return changed,{'overturned':reach>0,'onset':onset,'lipThroatReach':reach,'crestHeightAboveToe':crest_height,
        'raisedPoints':raised,'missingHigherNonincidentContourAtInnerVertices':missing,'nonpositiveOriginalVertexSeparations':nonpositive,
        'minVertexCeilingSeparationBefore':min((s['before'] for s in separations),default=None),
        'minVertexCeilingSeparationAfter':min((s['after'] for s in separations),default=None),
        'maxRaise':max((s['raise'] for s in raised),default=0),
        'allXExact':True,'outerCrestToLipExact':True,'throatToToeExact':True,'lipAndThroatExact':True}


def line_y(points_by_id,segment,q):
    a,b=[points_by_id[i] for i in segment]
    return a['y']+(q-a['q'])*(b['y']-a['y'])/(b['q']-a['q'])


def merge_intervals(intervals):
    merged=[]
    for a,b in sorted(intervals):
        if b<=a:
            continue
        if merged and a<=merged[-1][1]+1e-12:
            merged[-1][1]=max(merged[-1][1],b)
        else:
            merged.append([a,b])
    return merged


def measure(points,gap_threshold):
    inner=[p for p in points if 64<=p['point']<=88]
    floor=[p for p in points if 88<=p['point']<=112]
    cavity=[max(min(p['q'] for p in inner),min(p['q'] for p in floor)),
            min(max(p['q'] for p in inner),max(p['q'] for p in floor))]
    crosses=segment_intersections(points)
    events=sorted(set([p['q'] for p in points]+[x['q'] for x in crosses]+cavity))
    by_id={p['point']:p for p in points}
    samples=[];useful=[];max_interval_gap=0;negative_roof=[]
    for a,b in zip(events,events[1:]):
        a,b=max(a,cavity[0]),min(b,cavity[1])
        if b<=a:
            continue
        epsilon=min(1e-8,(b-a)/1000)
        queries=[a+epsilon,(a+b)/2,b-epsilon]
        for q in queries:
            m=at_q(points,q)
            samples.append(m)
            if m['verticalRoofThickness'] is not None and m['verticalRoofThickness'] < -1e-9:
                negative_roof.append({'q':q,'separation':m['verticalRoofThickness']})
        mid=at_q(points,(a+b)/2)
        hits=mid['crossings']
        if len(hits)>=3 and len(hits)%2:
            for i in range(0,len(hits)-1,2):
                bottom,top=hits[i]['segment'],hits[i+1]['segment']
                ga=line_y(by_id,top,a)-line_y(by_id,bottom,a)
                gb=line_y(by_id,top,b)-line_y(by_id,bottom,b)
                max_interval_gap=max(max_interval_gap,ga,gb)
                if ga>=gap_threshold and gb>=gap_threshold:
                    useful.append([a,b])
                elif ga>=gap_threshold or gb>=gap_threshold:
                    crossing=a+(gap_threshold-ga)*(b-a)/(gb-ga)
                    useful.append([a,crossing] if ga>=gap_threshold else [crossing,b])
    maximum=max((m for m in samples if m['largestAirGap'] is not None),
                key=lambda m:m['largestAirGap'],default=None)
    useful=merge_intervals(useful)
    roof=[m['verticalRoofThickness'] for m in samples if m['verticalRoofThickness'] is not None]
    return {'maxGap':maximum['largestAirGap'] if maximum else None,
        'maxGapQ':maximum['q'] if maximum else None,
        'maxGapAtQ':maximum,'maxGapAffineOneSidedLimit':max_interval_gap,
        'usefulWidthThreshold':gap_threshold,'usefulWidth':sum(b-a for a,b in useful),'usefulWidthIntervals':useful,
        'cavityRangeQ':cavity,'properNonadjacentPolylineCrossings':crosses,
        'minimumSampledVerticalRoofSeparation':min(roof,default=None),
        'negativeRoofSeparationSampleCount':len(negative_roof),'firstNegativeRoofSeparation':negative_roof[0] if negative_roof else None}


def summary_metrics(m):
    return {k:v for k,v in m.items() if k not in ('maxGapAtQ','properNonadjacentPolylineCrossings')}


def crossing_pairs(m):
    return {tuple(tuple(s) for s in x['segments']) for x in m['properNonadjacentPolylineCrossings']}


def compare(points,threshold):
    modified,meta=thin_inner_roof(points)
    core=[p for p in points if 32<=p['point']<=112]
    changed_core=[p for p in modified if 32<=p['point']<=112]
    before,after=measure(core,threshold),measure(changed_core,threshold)
    before_full=segment_intersections(points)
    after_full=segment_intersections(modified)
    old_full={tuple(tuple(edge) for edge in x['segments']) for x in before_full}
    new_full={tuple(tuple(edge) for edge in x['segments']) for x in after_full}
    old_pairs,new_pairs=crossing_pairs(before),crossing_pairs(after)
    changed={'maxGapGain':after['maxGap']-before['maxGap'] if after['maxGap'] is not None and before['maxGap'] is not None else None,
        'usefulWidthGain':after['usefulWidth']-before['usefulWidth'],
        'newCrossingSegmentPairs':[list(pair) for pair in sorted(new_pairs-old_pairs)],
        'removedCrossingSegmentPairs':[list(pair) for pair in sorted(old_pairs-new_pairs)],
        'existingCrossingPairCount':len(old_pairs),'afterCrossingPairCount':len(new_pairs),
        'newFullContourCrossingSegmentPairs':[list(pair) for pair in sorted(new_full-old_full)],
        'removedFullContourCrossingSegmentPairs':[list(pair) for pair in sorted(old_full-new_full)],
        'existingFullContourCrossingPairCount':len(old_full),'afterFullContourCrossingPairCount':len(new_full)}
    return {'prototype':meta,'before':before,'after':after,'change':changed,
        'beforeFullContourCrossings':before_full,'afterFullContourCrossings':after_full},modified


def actual_sections(report):
    sections=[]
    for retained in report['selection']['initialCrossSections']:
        rx,rz=retained['row']['ray'];norm=math.hypot(rx,rz);rx,rz=rx/norm,rz/norm
        nx,nz=rz,-rx;raw=retained['positions'];origin=raw[:3];points=[]
        for offset in range(0,len(raw),3):
            x,y,z=raw[offset:offset+3]
            points.append({'point':retained['firstProfilePoint']+offset//3,
                'q':(x-origin[0])*rx+(z-origin[2])*rz,'y':y,
                'lateral':(x-origin[0])*nx+(z-origin[2])*nz,'world':[x,y,z]})
        result,changed=compare(points,1.4)
        sections.append({'row':retained['row'],'joinedToNext':retained['joinedToNext'],'rayUnit':[rx,rz],
            'beforePolyline':points,'afterPolyline':changed,**result,
            'atQ1_35':{'before':at_q(points,1.35),'after':at_q(changed,1.35)}})
    return sections


def case_sections(loaded):
    cases=[]
    for c in loaded['cases']:
        summaries=[]
        for frame in c['eligible']:
            raw=frame['profile']
            points=[{'point':i,'q':raw[2*i],'y':raw[2*i+1]} for i in range(128)]
            result,_=compare(points,1.4/REFERENCE_SCALE)
            summaries.append({'frame':frame['frame'],'tau':frame['tau'],
                'prototype':result['prototype'],'before':summary_metrics(result['before']),
                'after':summary_metrics(result['after']),'change':result['change'],
                'beforeCrossings':result['before']['properNonadjacentPolylineCrossings'],
                'afterCrossings':result['after']['properNonadjacentPolylineCrossings'],
                'beforeFullContourCrossings':result['beforeFullContourCrossings'],
                'afterFullContourCrossings':result['afterFullContourCrossings']})
        gains=[s['change']['maxGapGain'] for s in summaries if s['change']['maxGapGain'] is not None]
        useful=[s['change']['usefulWidthGain'] for s in summaries]
        cases.append({'id':c['id'],'asset':c['asset'],'source':c['source'],'held':c['held'],
            'eligibleCount':len(summaries),'frames':summaries,
            'aggregate':{'maxGapGainRange': [min(gains),max(gains)] if gains else None,
                'usefulWidthGainRange':[min(useful),max(useful)] if useful else None,
                'framesWithNewCrossings':sum(bool(s['change']['newCrossingSegmentPairs']) for s in summaries),
                'framesWithNewFullContourCrossings':sum(bool(s['change']['newFullContourCrossingSegmentPairs']) for s in summaries),
                'framesWithExistingFullContourCrossings':sum(s['change']['existingFullContourCrossingPairCount']>0 for s in summaries),
                'framesWithAfterFullContourCrossings':sum(s['change']['afterFullContourCrossingPairCount']>0 for s in summaries),
                'framesWithExistingCrossings':sum(s['change']['existingCrossingPairCount']>0 for s in summaries),
                'framesWithAfterCrossings':sum(s['change']['afterCrossingPairCount']>0 for s in summaries),
                'framesWithAfterNegativeRoofSeparation':sum(s['after']['negativeRoofSeparationSampleCount']>0 for s in summaries),
                'framesWithOriginalNonpositiveVertexSeparation':sum(bool(s['prototype']['nonpositiveOriginalVertexSeparations']) for s in summaries),
                'framesWithMissingHigherNonincidentContourAtInnerVertices':sum(bool(s['prototype']['missingHigherNonincidentContourAtInnerVertices']) for s in summaries),
                'held':summaries[-1]}})
    return cases


def main():
    dest=WORK/'report.json'
    assert not dest.exists(),'One fixed finite offline trial; do not rerun in this scratch directory.'
    source_bytes=SOURCE.read_bytes();report=json.loads(source_bytes)
    eligible_path=WORK/'eligible-cases.json';loaded=json.loads(eligible_path.read_bytes())
    actual=actual_sections(report)
    # Independently reproduce every original captured row's maximum from the retained baseline receipt.
    baseline=json.loads(Path('/private/tmp/tube-opening-shape-20261004/receipt.json').read_text())
    for section,original in zip(actual,baseline['sections']):
        assert section['row']['row']==original['row']['row']
        assert section['before']['maxGap']==original['maximumBoundedVerticalAirGap']['largestAirGap']
    cases=case_sections(loaded)
    files=[SOURCE,METHOD,eligible_path,WORK/'measurement_functions.py',WORK/'prototype.py',WORK/'load-cases.ts',WORK/'load-cases.mjs']
    sources=[{'file':str(p),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]
    receipt={'schema':'nonincident-contour-half-thickness-inner-roof-offline/v1','complete':True,'sourceFiles':sources,
        'trial':'Only underside65..87 raised by 0.5*positive(nearest strictly higher original nonincident contour crossing Y minus undersideY), multiplied by smooth endpoint ramp and continuous overturn onset. Only ceiling selection changed from the retained top-only trials; coefficient, ramp and onset unchanged.',
        'sourceEquivalentAirMethod':'Exact source functions vertical_crossings, at_q, segment_intersections extracted from measure.py. Useful width is the union of affine bounded-gap intervals >=threshold within the same cavity ray range, using midpoint parity and the same segment ordering.',
        'constraints':{'productionEdits':False,'browser':False,'solverRuns':False,'bodyTests':False,'singleFiniteOfflineTrial':True},
        'units':{'capturedRows':'meters','shippedCases':'h0','caseIllustrativeScaleMeters':REFERENCE_SCALE,
            'caseUsefulWidthThresholdH0':1.4/REFERENCE_SCALE,'actualCurrentNativeCaseScaleClaim':False},
        'scope':'Five initial front48 Float32 projected row outlines, plus every original heldFrame-eligible frame of all eight shipped assets. Core32..112 air metrics are kept comparable; nonincident ceilings and additional full-contour crossing checks use all128 authored points, or all81 available captured points. Does not measure joined row triangles, end cuts, shader displacement or actual physical collision response.',
        'initialSourceRow':report['selection']['sourceRow'],'actualSections':actual,'cases':cases,
        'aggregate':{'eligibleFrames':sum(c['eligibleCount'] for c in cases),
            'framesWithNewCrossings':sum(c['aggregate']['framesWithNewCrossings'] for c in cases),
            'framesWithAfterCrossings':sum(c['aggregate']['framesWithAfterCrossings'] for c in cases),
            'framesWithNewFullContourCrossings':sum(c['aggregate']['framesWithNewFullContourCrossings'] for c in cases),
            'framesWithAfterFullContourCrossings':sum(c['aggregate']['framesWithAfterFullContourCrossings'] for c in cases)},
        'limitations':['Captured profiles are Float32 projected along normalized retained rays; worldX/Z stay exact and worldY alone changes.',
            'Before/after preserve all profile X and all outer/floor points exactly; no solver, mass, velocity, splash, contact or mask behavior is changed or accepted.',
            'Only positive nonincident ceiling separation is raised; missing higher contour is retained and reported. Core outer/inner roof-order checks remain separate.',
            'Proper nonadjacent crossings exclude shared endpoints, collinear overlap and shader/collision-radius effects.',
            'Meter-valued case useful widths require a real per-slice scale; the 7 m conversion is illustrative only.']}
    encoded=json.dumps(receipt,separators=(',',':'))
    assert len(encoded.encode())<=2*1024*1024,'Bounded 2 MiB receipt'
    dest.write_text(encoded+'\n')
    table=['scope\tid/row\tbeforeMaxGap\tafterMaxGap\tbeforeWidthGap>=1.4m\tafterWidthGap>=1.4m\tnewCrossingFrames']
    for s in actual:
        table.append('\t'.join(map(str,['meters',s['row']['row'],s['before']['maxGap'],s['after']['maxGap'],s['before']['usefulWidth'],s['after']['usefulWidth'],len(s['change']['newCrossingSegmentPairs'])])))
    for c in cases:
        s=c['aggregate']['held'];scale=REFERENCE_SCALE
        table.append('\t'.join(map(str,['illustrative_h0=7m',c['id'],s['before']['maxGap']*scale if s['before']['maxGap'] is not None else None,s['after']['maxGap']*scale if s['after']['maxGap'] is not None else None,s['before']['usefulWidth']*scale,s['after']['usefulWidth']*scale,c['aggregate']['framesWithNewCrossings']])))
    (WORK/'table.txt').write_text('\n'.join(table)+'\n')
    print(json.dumps({'complete':True,'report':str(dest),'bytes':len(encoded.encode()),'aggregate':receipt['aggregate'],
        'actual':[{'row':s['row']['row'],'before':s['before']['maxGap'],'after':s['after']['maxGap'],'widthBefore':s['before']['usefulWidth'],'widthAfter':s['after']['usefulWidth'],'atQ1_35':s['atQ1_35'],'newCrossings':s['change']['newCrossingSegmentPairs']} for s in actual],
        'cases':[{'id':c['id'],'eligible':c['eligibleCount'],'aggregate':{k:v for k,v in c['aggregate'].items() if k!='held'}} for c in cases]}))

if __name__=='__main__':
    main()
