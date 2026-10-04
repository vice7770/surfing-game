"""Existing affine gap/width method, unchanged from the first thinner-roof trial."""
from measurement_functions import at_q, segment_intersections

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
