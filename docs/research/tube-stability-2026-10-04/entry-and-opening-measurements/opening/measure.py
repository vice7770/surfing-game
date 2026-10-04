import hashlib
import json
import math
from pathlib import Path

SOURCE = Path('/private/tmp/tube-lip-attribution-20261004/native-first/report.json')
DEST = Path('/private/tmp/tube-opening-shape-20261004/receipt.json')
source_bytes = SOURCE.read_bytes()
report = json.loads(source_bytes)
selection = report['selection']
LANDMARK = {'crest': 32, 'lip': 64, 'throat': 88, 'toe': 112}


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


sections = []
for retained in selection['initialCrossSections']:
    row = retained['row']
    rx, rz = row['ray']
    norm = math.hypot(rx, rz)
    rx, rz = rx / norm, rz / norm
    # q follows the reported propagation ray. Lateral n is perpendicular to
    # the row plane; interpreting it as a local tube axis is an inference.
    nx, nz = rz, -rx
    raw = retained['positions']
    origin = raw[:3]
    points = []
    for offset in range(0, len(raw), 3):
        x, y, z = raw[offset:offset + 3]
        points.append({'point': retained['firstProfilePoint'] + offset // 3,
                       'q': (x - origin[0]) * rx + (z - origin[2]) * rz,
                       'y': y, 'lateral': (x - origin[0]) * nx + (z - origin[2]) * nz,
                       'world': [x, y, z]})
    landmarks = {name: next(p for p in points if p['point'] == index) for name, index in LANDMARK.items()}
    inner = [p for p in points if 64 <= p['point'] <= 88]
    floor = [p for p in points if 88 <= p['point'] <= 112]
    cavity_range = [max(min(p['q'] for p in inner), min(p['q'] for p in floor)),
                    min(max(p['q'] for p in inner), max(p['q'] for p in floor))]
    crossings = segment_intersections(points)
    events = sorted(set([p['q'] for p in points] + [x['q'] for x in crossings] + cavity_range))
    queries = []
    for a, b in zip(events, events[1:]):
        a, b = max(a, cavity_range[0]), min(b, cavity_range[1])
        if b <= a:
            continue
        # Largest gaps are affine between these events. Sample either one-sided
        # limit and midpoint, avoiding tangent/vertex double-counting.
        epsilon = min(1e-8, (b - a) / 1000)
        queries.extend([a + epsilon, (a + b) / 2, b - epsilon])
    measurements = [at_q(points, q) for q in queries]
    maximum = max((m for m in measurements if m['largestAirGap'] is not None), key=lambda m: m['largestAirGap'])
    five = [m['q'] for m in measurements if m['crossingCount'] >= 5]
    first_reverse = next(({'from': a, 'to': b} for a, b in zip(points, points[1:])
                          if b['q'] < a['q'] - 1e-6), None)
    dx, dy, dz = [selection['eye'][i] - origin[i] for i in range(3)]
    camera_q, camera_lateral = dx * rx + dz * rz, dx * nx + dz * nz
    horizontal = math.hypot(dx, dz)
    center = [origin[0] + rx * maximum['q'],
              (maximum['boundedVerticalAirGaps'][0]['roofY'] + maximum['boundedVerticalAirGaps'][0]['floorY']) / 2,
              origin[2] + rz * maximum['q']]
    cdx, cdy, cdz = [selection['eye'][i] - center[i] for i in range(3)]
    cq, clateral = cdx * rx + cdz * rz, cdx * nx + cdz * nz
    sections.append({'row': row, 'joinedToNext': retained['joinedToNext'], 'rayUnit': [rx, rz],
                     'landmarks': landmarks, 'projectedPolyline': points,
                     'maxAbsLateralProjectionError': max(abs(p['lateral']) for p in points),
                     'cavityRangeQ': cavity_range, 'maximumBoundedVerticalAirGap': maximum,
                     'fiveOrMoreCrossingRangeQ': [min(five), max(five)] if five else None,
                     'properNonadjacentPolylineCrossings': crossings,
                     'onsetOfReverseAlongRay': first_reverse,
                     'innerUndersideHighestPoint': max(inner, key=lambda p: p['y']),
                     'innerUndersideLowestPoint': min(inner, key=lambda p: p['y']),
                     'eyeRelativeCrest': {'q': camera_q, 'lateral': camera_lateral, 'vertical': dy,
                                          'horizontalDistance': horizontal,
                                          'elevationDegrees': math.degrees(math.atan2(dy, horizontal)),
                                          'offLocalTubeAxisDegrees': math.degrees(math.atan2(abs(camera_q), abs(camera_lateral)))},
                     'eyeRelativeMaximumCavityCenter': {'world': center, 'q': cq, 'lateral': clateral, 'vertical': cdy,
                                                        'elevationDegrees': math.degrees(math.atan2(cdy, math.hypot(cdx, cdz))),
                                                        'offLocalTubeAxisDegrees': math.degrees(math.atan2(abs(cq), abs(clateral)))}})

common = [max(s['cavityRangeQ'][0] for s in sections), min(s['cavityRangeQ'][1] for s in sections)]
sample_q = [common[0] + 1e-6, 0.8, 1.0, 1.25, 1.35, 1.5, 1.75, 1.84, 2.0, common[1] - 1e-6]
for section in sections:
    section['commonRangeMeasurements'] = [at_q(section['projectedPolyline'], q) for q in sample_q if common[0] < q < common[1]]

eye, target = selection['eye'], selection['target']
view_horizontal = math.hypot(target[0] - eye[0], target[2] - eye[2])
receipt = {
    'source': str(SOURCE), 'sourceSha256': hashlib.sha256(source_bytes).hexdigest(),
    'scope': 'Five retained initial Float32 crest-to-toe row polylines of front48. Measures projected row outlines, not joined triangles, shader displacement, full body collision, alongshore mouths or the user recording.',
    'units': 'meters, degrees',
    'landmarkIndices': LANDMARK, 'initialSourceRow': selection['sourceRow'],
    'captureMismatch': {'initialSettle': report['settle'],
                        'pngFrames': [{'index': f['index'], 'seaTime': f['seaTime'], 'selectedRow': f['metrics']['selected']} for f in report['frames']],
                        'note': 'Retained initial outlines precede the supplied no-splash and region PNG states; do not assign a measured initial landmark to a later pictured lobe.'},
    'camera': {'eye': eye, 'target': target, 'opticalAxisDownwardPitchDegrees': math.degrees(math.atan2(eye[1] - target[1], view_horizontal)),
               'axisInference': 'Local tube-axis angles use the horizontal perpendicular to each profile ray. Actual alongshore opening/end normals are not retained.'},
    'commonCavityRayRangeQ': common, 'sections': sections,
    'method': 'Normalize the retained row ray, project from crest, intersect actual linear row segments with vertical lines. For odd crossing counts, pair low-to-high consecutive crossings to measure bounded air above the water below the floor, excluding exterior air above the final top crossing. Piecewise endpoints and proper crossing events bound gap maxima; sample one-sided limits to avoid tangent double-counting. Thickness is vertical outer-to-uppermost-under contour separation, not a normal material thickness.',
    'limitations': ['No universal malformed-outline classification from five rows.',
                    'No alongshore continuity/end-cut diagnosis from row polylines.',
                    'Multiple vertical air intervals near the rolled tip are reported separately, not combined through intervening water.',
                    'Polyline crossings and gap values exclude shader normal/ripple displacement and original Float64 worker geometry.'],
}
DEST.write_text(json.dumps(receipt, indent=2) + '\n')
print('receipt', DEST)
print('common q range', common)
print('camera pitch', receipt['camera']['opticalAxisDownwardPitchDegrees'])
for s in sections:
    lm = s['landmarks']; gap = s['maximumBoundedVerticalAirGap']
    print('row', s['row']['row'], 'weight', s['row']['weight'],
          'landmarks q/y', {k: [round(v['q'], 6), round(v['y'], 6)] for k, v in lm.items()},
          'max gap', gap['largestAirGap'], 'at q', gap['q'],
          'roof thickness there', gap['verticalRoofThickness'],
          'five-crossing range', s['fiveOrMoreCrossingRangeQ'],
          'proper crossings', len(s['properNonadjacentPolylineCrossings']),
          'camera at cavity center', s['eyeRelativeMaximumCavityCenter'])
selected = next(s for s in sections if s['row']['row'] == selection['sourceRow']['row'])
for m in selected['commonRangeMeasurements']:
    print('selected sample', m['q'], 'hits', m['crossingCount'], 'gaps', m['boundedVerticalAirGaps'], 'vertical roof thickness', m['verticalRoofThickness'])
