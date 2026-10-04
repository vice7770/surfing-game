# Exact function sources extracted from tube-opening-shape/measure.py; no main execution.
def vertical_crossings(points, q, lo=32, hi=112):
    hits = []
    for a, b in zip(points, points[1:]):
        if a['point'] < lo or b['point'] > hi:
            continue
        qa, qb = a['q'], b['q']
        if abs(qb - qa) < 1e-12:
            continue
        if min(qa, qb) <= q <= max(qa, qb):
            t = (q - qa) / (qb - qa)
            hits.append({'y': a['y'] + t * (b['y'] - a['y']), 'segment': [a['point'], b['point']]})
    hits.sort(key=lambda hit: hit['y'])
    unique = []
    for hit in hits:
        if not unique or abs(hit['y'] - unique[-1]['y']) > 1e-8:
            unique.append(hit)
    return unique

def at_q(points, q):
    hits = vertical_crossings(points, q)
    outer = vertical_crossings(points, q, 32, 64)
    inner = vertical_crossings(points, q, 64, 88)
    floor = vertical_crossings(points, q, 88, 112)
    # Below the lowest crossing is sea water. Exclude the unbounded air above
    # the topmost crossing; an odd number of crossings gives bounded cavities.
    gaps = []
    if len(hits) >= 3 and len(hits) % 2:
        for i in range(0, len(hits) - 1, 2):
            gaps.append({'floorY': hits[i]['y'], 'roofY': hits[i + 1]['y'], 'gap': hits[i + 1]['y'] - hits[i]['y']})
    return {
        'q': q, 'crossingCount': len(hits), 'crossings': hits,
        'boundedVerticalAirGaps': gaps,
        'largestAirGap': max((g['gap'] for g in gaps), default=None),
        'outerY': max((h['y'] for h in outer), default=None),
        'upperUndersideY': max((h['y'] for h in inner), default=None),
        'floorY': min((h['y'] for h in floor), default=None),
        'verticalRoofThickness': outer[-1]['y'] - inner[-1]['y'] if outer and inner else None,
    }

def segment_intersections(points):
    intersections = []
    segments = list(zip(points, points[1:]))
    for i, (a, b) in enumerate(segments):
        dx, dy = b['q'] - a['q'], b['y'] - a['y']
        for j in range(i + 2, len(segments)):
            c, d = segments[j]
            ex, ey = d['q'] - c['q'], d['y'] - c['y']
            denominator = dx * ey - dy * ex
            if abs(denominator) < 1e-12:
                continue
            cx, cy = c['q'] - a['q'], c['y'] - a['y']
            t = (cx * ey - cy * ex) / denominator
            u = (cx * dy - cy * dx) / denominator
            if 1e-9 < t < 1 - 1e-9 and 1e-9 < u < 1 - 1e-9:
                intersections.append({'q': a['q'] + t * dx, 'y': a['y'] + t * dy,
                                      'segments': [[a['point'], b['point']], [c['point'], d['point']]]})
    return intersections
