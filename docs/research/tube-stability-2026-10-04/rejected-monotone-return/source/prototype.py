"""One fixed monotone-X inner-roof representation trial; no production integration."""
import copy
import hashlib
import json
import math
from pathlib import Path
from measurement_functions import vertical_crossings, at_q, segment_intersections
from air_metrics import measure, summary_metrics

WORK = Path('/private/tmp/tube-monotone-inner-profile-20261004')
SOURCE = Path('/private/tmp/tube-lip-attribution-20261004/native-first/report.json')
PRIOR_BASELINE = Path('/private/tmp/tube-opening-shape-20261004/receipt.json')
REFERENCE_SCALE = 7


def envelope(points, q):
    """Highest original floor88..112, lowest original outer32..64 strictly above it."""
    floors = vertical_crossings(points, q, 88, 112)
    if not floors:
        return None, {'reason': 'missing_floor', 'q': q}
    floor = max(floors, key=lambda h: h['y'])
    tops = [h for h in vertical_crossings(points, q, 32, 64) if h['y'] > floor['y']]
    if not tops:
        return None, {'reason': 'missing_outer_strictly_above_floor', 'q': q,
                      'floor': floor, 'originalOuterCrossings': vertical_crossings(points, q, 32, 64)}
    ceiling = min(tops, key=lambda h: h['y'])
    if not (math.isfinite(floor['y']) and math.isfinite(ceiling['y']) and ceiling['y'] > floor['y']):
        return None, {'reason': 'invalid_envelope', 'q': q, 'floor': floor, 'ceiling': ceiling}
    return {'floor': floor, 'ceiling': ceiling, 'height': ceiling['y'] - floor['y']}, None


def monotone_inner_roof(points, ray=None):
    """Fixed formula from the assignment. Any failed envelope invalidates the whole candidate."""
    by_id = {p['point']: p for p in points}
    lip, throat = by_id[64], by_id[88]
    meta = {'lipThroatReach': lip['q'] - throat['q'], 'formulaVertices': [], 'failures': [],
            'outerAndFloorExact': True, 'lipAndThroatExact': True, 'allXExact': False,
            'xChangesIntentional': True}
    if not lip['q'] > throat['q']:
        meta['failures'].append({'reason': 'non_overturned_endpoint_order',
                                 'lipX': lip['q'], 'throatX': throat['q']})
        return None, meta
    changed = copy.deepcopy(points)
    for before, after in zip(points, changed):
        i = before['point']
        if not 65 <= i <= 87:
            assert before == after
            continue
        u = (i - 64) / 24
        s = u * u * (3 - 2 * u)
        q = lip['q'] + (throat['q'] - lip['q']) * s
        alpha = (1 - u) + 0.4 * math.sin(math.pi * u) ** 2
        bounds, error = envelope(points, q)
        if error:
            meta['failures'].append({'point': i, 'u': u, 's': s, 'alpha': alpha, **error})
            continue
        if not 0 <= alpha <= 1:
            meta['failures'].append({'point': i, 'reason': 'alpha_outside_envelope', 'alpha': alpha})
            continue
        y = bounds['floor']['y'] + alpha * bounds['height']
        after['q'], after['y'] = q, y
        if 'world' in after:
            assert ray is not None
            dq = q - before['q']
            after['world'][0] = before['world'][0] + ray[0] * dq
            after['world'][1] = y
            after['world'][2] = before['world'][2] + ray[1] * dq
        meta['formulaVertices'].append({'point': i, 'u': u, 's': s, 'alpha': alpha,
                                        'qBefore': before['q'], 'qAfter': q,
                                        'yBefore': before['y'], 'yAfter': y,
                                        'floor': bounds['floor'], 'ceiling': bounds['ceiling'],
                                        'floorClearance': y - bounds['floor']['y'],
                                        'ceilingSeparation': bounds['ceiling']['y'] - y})
    # Check the formula's limiting endpoints independently; retained endpoints are never changed.
    endpoints = []
    for i, alpha in ((64, 1), (88, 0)):
        p = by_id[i]
        bounds, error = envelope(points, p['q'])
        if error:
            meta['failures'].append({'point': i, 'endpoint': True, **error})
        else:
            limit_y = bounds['floor']['y'] + alpha * bounds['height']
            mismatch = limit_y - p['y']
            endpoints.append({'point': i, 'preservedY': p['y'], 'formulaLimitY': limit_y,
                              'formulaLimitMinusPreservedY': mismatch, 'envelope': bounds})
            if abs(mismatch) > 1e-8:
                meta['failures'].append({'point': i, 'reason': 'endpoint_formula_discontinuity',
                                         'mismatch': mismatch})
    meta['endpointLimits'] = endpoints
    if meta['failures']:
        return None, meta
    inner = [p for p in changed if 64 <= p['point'] <= 88]
    meta['innerXStrictlyDecreasing'] = all(b['q'] < a['q'] for a, b in zip(inner, inner[1:]))
    if not meta['innerXStrictlyDecreasing']:
        meta['failures'].append({'reason': 'non_monotone_candidate_inner_x'})
        return None, meta
    meta['maximumAbsXChange'] = max(abs(p['qAfter'] - p['qBefore']) for p in meta['formulaVertices'])
    meta['maximumAbsYChange'] = max(abs(p['yAfter'] - p['yBefore']) for p in meta['formulaVertices'])
    return changed, meta


def shape_quality(points):
    by_id = {p['point']: p for p in points}
    turns = []
    for i in range(33, 112):
        a, b, c = [by_id[j] for j in (i - 1, i, i + 1)]
        ux, uy = b['q'] - a['q'], b['y'] - a['y']
        vx, vy = c['q'] - b['q'], c['y'] - b['y']
        lu, lv = math.hypot(ux, uy), math.hypot(vx, vy)
        chord = math.hypot(c['q'] - a['q'], c['y'] - a['y'])
        cross, dot = ux * vy - uy * vx, ux * vx + uy * vy
        turn = math.degrees(math.atan2(cross, dot)) if lu and lv else None
        curvature = 2 * abs(cross) / (lu * lv * chord) if lu and lv and chord else None
        turns.append({'point': i, 'signedTurnDegrees': turn, 'absoluteTurnDegrees': abs(turn) if turn is not None else None,
                      'threePointCurvature': curvature, 'incomingLength': lu, 'outgoingLength': lv})
    relevant = [t for t in turns if 64 <= t['point'] <= 88]
    lengths = [math.hypot(by_id[i + 1]['q'] - by_id[i]['q'], by_id[i + 1]['y'] - by_id[i]['y'])
               for i in range(64, 88)]
    return {'lipJoin': next(t for t in turns if t['point'] == 64),
            'throatJoin': next(t for t in turns if t['point'] == 88),
            'maxInnerAbsoluteTurn': max(relevant, key=lambda t: t['absoluteTurnDegrees'] or 0),
            'maxInnerCurvature': max(relevant, key=lambda t: t['threePointCurvature'] or 0),
            'innerSegmentLengthRange': [min(lengths), max(lengths)],
            'innerTurnSamples': relevant,
            'curvatureDefinition': '2*abs(incoming cross outgoing)/(incomingLength*outgoingLength*two-edge chordLength); inverse coordinate units'}


def envelope_between_vertices(original, modified):
    """Inspect affine candidate edges against the original envelope between every event."""
    inner = [p for p in modified if 64 <= p['point'] <= 88]
    qlo, qhi = min(p['q'] for p in inner), max(p['q'] for p in inner)
    old_crosses = segment_intersections(original)
    events = sorted(set([p['q'] for p in original if 32 <= p['point'] <= 112]
                        + [p['q'] for p in inner] + [x['q'] for x in old_crosses] + [qlo, qhi]))
    samples, failures = [], []
    for a, b in zip(events, events[1:]):
        a, b = max(a, qlo), min(b, qhi)
        if b <= a:
            continue
        eps = min(1e-8, (b - a) / 1000)
        for q in (a + eps, (a + b) / 2, b - eps):
            bounds, error = envelope(original, q)
            roof_hits = vertical_crossings(modified, q, 64, 88)
            if error or len(roof_hits) != 1:
                failures.append({'q': q, 'error': error, 'candidateRoofCrossings': roof_hits})
                continue
            roof = roof_hits[0]['y']
            sample = {'q': q, 'roofY': roof, 'floor': bounds['floor'], 'ceiling': bounds['ceiling'],
                      'floorClearance': roof - bounds['floor']['y'],
                      'ceilingSeparation': bounds['ceiling']['y'] - roof}
            samples.append(sample)
            if sample['floorClearance'] < -1e-9 or sample['ceilingSeparation'] < -1e-9:
                failures.append({'reason': 'candidate_segment_outside_original_envelope', **sample})
    return {'sampleCount': len(samples), 'failureCount': len(failures), 'failures': failures,
            'minimumFloorClearance': min((s['floorClearance'] for s in samples), default=None),
            'minimumCeilingSeparation': min((s['ceilingSeparation'] for s in samples), default=None),
            'minFloorSample': min(samples, key=lambda s: s['floorClearance'], default=None),
            'minCeilingSample': min(samples, key=lambda s: s['ceilingSeparation'], default=None),
            'method': 'One-sided/midpoint affine limits between every original/candidate X event and proper original crossing event; tolerances match baseline crossing method.'}


def crossing_change(before, after):
    def key(x):
        return tuple(tuple(s) for s in x['segments'])
    old, new = {key(x): x for x in before}, {key(x): x for x in after}
    return {'beforePairCount': len(old), 'afterPairCount': len(new),
            'newPairs': [new[k] for k in sorted(new.keys() - old.keys())],
            'removedPairs': [old[k] for k in sorted(old.keys() - new.keys())],
            'retainedPairsMoved': [{'segments': [list(s) for s in k], 'before': old[k], 'after': new[k],
                                    'distanceMoved': math.hypot(new[k]['q'] - old[k]['q'], new[k]['y'] - old[k]['y'])}
                                   for k in sorted(old.keys() & new.keys())
                                   if abs(new[k]['q'] - old[k]['q']) > 1e-9 or abs(new[k]['y'] - old[k]['y']) > 1e-9]}


def compare(points, threshold, ray=None):
    core = [p for p in points if 32 <= p['point'] <= 112]
    before = measure(core, threshold)
    before['cavityRayWidth'] = max(0, before['cavityRangeQ'][1] - before['cavityRangeQ'][0])
    before_full = segment_intersections(points)
    modified, meta = monotone_inner_roof(points, ray)
    result = {'prototype': meta, 'validCandidate': modified is not None,
              'before': before, 'beforeShapeQuality': shape_quality(points),
              'beforeFullContourCrossings': before_full,
              'after': None, 'afterShapeQuality': None, 'afterFullContourCrossings': None,
              'change': None, 'betweenVertexEnvelopeCheck': None}
    if modified is None:
        return result, None
    after = measure([p for p in modified if 32 <= p['point'] <= 112], threshold)
    after['cavityRayWidth'] = max(0, after['cavityRangeQ'][1] - after['cavityRangeQ'][0])
    after_full = segment_intersections(modified)
    result.update({'after': after, 'afterShapeQuality': shape_quality(modified),
                   'afterFullContourCrossings': after_full,
                   'betweenVertexEnvelopeCheck': envelope_between_vertices(points, modified),
                   'change': {'maxGapGain': after['maxGap'] - before['maxGap'] if after['maxGap'] is not None and before['maxGap'] is not None else None,
                              'usefulWidthGain': after['usefulWidth'] - before['usefulWidth'],
                              'cavityRayWidthChange': after['cavityRayWidth'] - before['cavityRayWidth'],
                              'coreCrossings': crossing_change(before['properNonadjacentPolylineCrossings'], after['properNonadjacentPolylineCrossings']),
                              'fullCrossings': crossing_change(before_full, after_full)}})
    return result, modified


def actual_sections(report):
    sections = []
    for retained in report['selection']['initialCrossSections']:
        rx, rz = retained['row']['ray']
        norm = math.hypot(rx, rz)
        rx, rz = rx / norm, rz / norm
        nx, nz = rz, -rx
        raw, origin = retained['positions'], retained['positions'][:3]
        points = []
        for o in range(0, len(raw), 3):
            x, y, z = raw[o:o + 3]
            points.append({'point': retained['firstProfilePoint'] + o // 3,
                           'q': (x - origin[0]) * rx + (z - origin[2]) * rz,
                           'y': y, 'lateral': (x - origin[0]) * nx + (z - origin[2]) * nz,
                           'world': [x, y, z]})
        result, changed = compare(points, 1.4, (rx, rz))
        sections.append({'row': retained['row'], 'joinedToNext': retained['joinedToNext'],
                         'rayUnit': [rx, rz], 'beforePolyline': points, 'afterPolyline': changed,
                         'atQ1_35': {'before': at_q(points, 1.35), 'after': at_q(changed, 1.35) if changed else None},
                         **result})
    return sections


def aggregate(frames):
    valid = [s for s in frames if s['validCandidate']]
    def count(which, phase):
        return sum(bool(s['change'][which][phase]) for s in valid)
    def range_of(values):
        return [min(values), max(values)] if values else None
    return {'totalFrames': len(frames), 'validCandidates': len(valid),
            'invalidEnvelopeOrEndpointFrames': len(frames) - len(valid),
            'framesWithNewCorePairs': count('coreCrossings', 'newPairs'),
            'framesWithNewFullPairs': count('fullCrossings', 'newPairs'),
            'framesWithMovedRetainedCorePairs': count('coreCrossings', 'retainedPairsMoved'),
            'framesWithMovedRetainedFullPairs': count('fullCrossings', 'retainedPairsMoved'),
            'previouslyCleanCoreFramesBecomingCrossed': sum(s['change']['coreCrossings']['beforePairCount'] == 0 and s['change']['coreCrossings']['afterPairCount'] > 0 for s in valid),
            'previouslyCleanFullFramesBecomingCrossed': sum(s['change']['fullCrossings']['beforePairCount'] == 0 and s['change']['fullCrossings']['afterPairCount'] > 0 for s in valid),
            'beforeCoreCrossedFrames': sum(bool(s['before']['properNonadjacentPolylineCrossings']) for s in frames),
            'afterCoreCrossedValidFrames': sum(bool(s['after']['properNonadjacentPolylineCrossings']) for s in valid),
            'beforeFullCrossedFrames': sum(bool(s['beforeFullContourCrossings']) for s in frames),
            'afterFullCrossedValidFrames': sum(bool(s['afterFullContourCrossings']) for s in valid),
            'framesWithBetweenVertexEnvelopeFailure': sum(s['betweenVertexEnvelopeCheck']['failureCount'] > 0 for s in valid),
            'maxGapGainRange': range_of([s['change']['maxGapGain'] for s in valid if s['change']['maxGapGain'] is not None]),
            'usefulWidthGainRange': range_of([s['change']['usefulWidthGain'] for s in valid]),
            'maxGapAfterRange': range_of([s['after']['maxGap'] for s in valid if s['after']['maxGap'] is not None]),
            'maxAbsoluteLipJoinDegreesAfter': max((s['afterShapeQuality']['lipJoin']['absoluteTurnDegrees'] for s in valid), default=None),
            'maxAbsoluteThroatJoinDegreesAfter': max((s['afterShapeQuality']['throatJoin']['absoluteTurnDegrees'] for s in valid), default=None),
            'maxAbsoluteInnerTurnDegreesAfter': max((s['afterShapeQuality']['maxInnerAbsoluteTurn']['absoluteTurnDegrees'] for s in valid), default=None)}


def source_receipt(path):
    b = path.read_bytes()
    return {'file': str(path), 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}


def main():
    dest = WORK / 'report.json'
    assert not dest.exists(), 'Single fixed finite trial; receipt must not be overwritten.'
    source_bytes = SOURCE.read_bytes()
    report = json.loads(source_bytes)
    loaded = json.loads((WORK / 'eligible-cases.json').read_bytes())
    assert len(loaded['cases']) == 8
    assert sum(len(c['eligible']) for c in loaded['cases']) == 293
    for c in loaded['cases']:
        got = source_receipt(Path(c['asset']['file']))
        assert got['sha256'] == c['asset']['sha256'] and got['bytes'] == c['asset']['bytes']
    actual = actual_sections(report)
    baseline = json.loads(PRIOR_BASELINE.read_bytes())
    for s, b in zip(actual, baseline['sections']):
        assert s['row']['row'] == b['row']['row']
        assert s['before']['maxGap'] == b['maximumBoundedVerticalAirGap']['largestAirGap']
    cases = []
    problems = []
    all_frames = []
    for c in loaded['cases']:
        frames = []
        for frame in c['eligible']:
            raw = frame['profile']
            assert len(raw) == 256
            points = [{'point': i, 'q': raw[2 * i], 'y': raw[2 * i + 1]} for i in range(128)]
            result, changed = compare(points, 1.4 / REFERENCE_SCALE)
            record = {'frame': frame['frame'], 'tau': frame['tau'], 'afterPolyline': changed, **result}
            frames.append(record)
            all_frames.append(record)
            if not record['validCandidate'] or record['betweenVertexEnvelopeCheck']['failureCount'] or record['change']['fullCrossings']['newPairs'] or record['change']['fullCrossings']['retainedPairsMoved']:
                problems.append({'case': c['id'], 'frame': frame['frame'], 'tau': frame['tau'],
                                 'validCandidate': record['validCandidate'], 'prototypeFailures': record['prototype']['failures'],
                                 'fullCrossings': record['change']['fullCrossings'] if record['change'] else None,
                                 'betweenVertexEnvelopeCheck': record['betweenVertexEnvelopeCheck']})
        cases.append({'id': c['id'], 'asset': c['asset'], 'source': c['source'], 'held': c['held'],
                      'eligibleCount': len(frames), 'aggregate': aggregate(frames), 'frames': frames})
    all_aggregate = aggregate(all_frames)
    actual_aggregate = aggregate(actual)
    unsafe = bool(all_aggregate['invalidEnvelopeOrEndpointFrames'] or all_aggregate['framesWithNewFullPairs']
                  or all_aggregate['framesWithBetweenVertexEnvelopeFailure']
                  or actual_aggregate['invalidEnvelopeOrEndpointFrames'] or actual_aggregate['framesWithNewFullPairs']
                  or actual_aggregate['framesWithBetweenVertexEnvelopeFailure'])
    receipt = {'schema': 'monotone-inner-profile-offline/v1', 'complete': True,
               'trial': {'indices': 'only65..87', 'u': '(i-64)/24', 'x': 'lipX+(throatX-lipX)*u*u*(3-2*u)',
                         'floor': 'highest original throat88..toe112 crossing',
                         'ceiling': 'lowest original crest32..lip64 crossing strictly above floor',
                         'alpha': '(1-u)+0.4*sin(pi*u)^2', 'y': 'floor+alpha*(ceiling-floor)',
                         'invalidEnvelopePolicy': 'Entire candidate is invalid and after metrics are null; no original-vertex fallback.',
                         'endpointPolicy': 'All original points except65..87 exact; formula endpoint limits checked separately.'},
               'sourceFiles': [source_receipt(p) for p in [SOURCE, PRIOR_BASELINE, WORK / 'eligible-cases.json',
                              WORK / 'load-cases.ts', WORK / 'load-cases.mjs', WORK / 'measurement_functions.py',
                              WORK / 'air_metrics.py', WORK / 'prototype.py']],
               'sourceEquivalentAirMethod': 'Exact prior vertical crossing/parity/proper-crossing functions and affine useful-width method, unchanged. Core32..112 gap metrics, full available contour crossing checks.',
               'units': {'actualSections': 'meters', 'caseFrames': 'h0', 'referenceScaleMeters': REFERENCE_SCALE,
                         'caseUsefulWidthThresholdH0': 1.4 / REFERENCE_SCALE, 'caseMeterConversionIllustrativeOnly': True},
               'scope': 'All5 retained initial front48 Float32 projected core outlines; all293 original heldFrame-eligible frames of8 shipped assets with full128-point contour.',
               'constraints': {'scratchOnly': True, 'productionEdits': False, 'native': False, 'browser': False,
                              'solverRuns': False, 'coefficientRetuning': False, 'singleFiniteTrial': True},
               'initialSourceRow': report['selection']['sourceRow'],
               'actualSections': actual, 'actualAggregate': actual_aggregate, 'cases': cases,
               'aggregate': all_aggregate, 'unsafeOfflineFindings': unsafe, 'stopped': unsafe,
               'limitations': ['New X/Y geometry deliberately differs physically from the original profile.',
                               'No joined-loft triangles, alongshore ends, shader displacement, contact body trajectories, optics or FPS are validated.',
                               'Proper crossings exclude endpoint touches and collinear overlap as in the retained baseline method.',
                               'Captured core outlines are initial geometry, not later PNG-frame polylines; shipped scales are nondimensional.',
                               'Discrete tangent/curvature samples diagnose representation shape, not hydrodynamic smoothness or physical stability.']}
    encoded = json.dumps(receipt, separators=(',', ':')) + '\n'
    assert len(encoded.encode()) <= 16 * 1024 * 1024
    dest.write_text(encoded)
    (WORK / 'problems.json').write_text(json.dumps(problems, indent=2) + '\n')
    table = ['scope\tid/row\tvalid\tbeforeMaxGap\tafterMaxGap\tbeforeCavityWidth\tafterCavityWidth\tbeforeWidthGap>=threshold\tafterWidthGap>=threshold\tlipJoinDegrees\tthroatJoinDegrees']
    for s in actual:
        a, q = s['after'], s['afterShapeQuality']
        table.append('\t'.join(map(str, ['meters', s['row']['row'], s['validCandidate'], s['before']['maxGap'],
                      a['maxGap'] if a else None, s['before']['cavityRayWidth'], a['cavityRayWidth'] if a else None,
                      s['before']['usefulWidth'], a['usefulWidth'] if a else None,
                      q['lipJoin']['signedTurnDegrees'] if q else None, q['throatJoin']['signedTurnDegrees'] if q else None])))
    for c in cases:
        s = c['frames'][-1]
        a, q = s['after'], s['afterShapeQuality']
        table.append('\t'.join(map(str, ['h0', c['id'] + '@held' + str(s['frame']), s['validCandidate'], s['before']['maxGap'],
                      a['maxGap'] if a else None, s['before']['cavityRayWidth'], a['cavityRayWidth'] if a else None,
                      s['before']['usefulWidth'], a['usefulWidth'] if a else None,
                      q['lipJoin']['signedTurnDegrees'] if q else None, q['throatJoin']['signedTurnDegrees'] if q else None])))
    (WORK / 'table.tsv').write_text('\n'.join(table) + '\n')
    print(json.dumps({'complete': True, 'report': str(dest), 'bytes': len(encoded.encode()), 'aggregate': all_aggregate,
                      'actualAggregate': actual_aggregate, 'unsafe': unsafe, 'problemFrameCount': len(problems),
                      'cases': [{'id': c['id'], 'aggregate': c['aggregate']} for c in cases]}))


if __name__ == '__main__':
    main()
