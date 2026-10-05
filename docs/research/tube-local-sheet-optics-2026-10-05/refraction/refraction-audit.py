#!/usr/bin/env python3
"""Unexecuted source preparation: fixed five base-normal two-interface comparisons.

Default is a no-op. Root-reviewed --run reads pinned completed captures and
uses borrowed offline geometry definitions; it never launches a runtime.
"""
from pathlib import Path
import argparse
import datetime
import hashlib
import heapq
import json
import math
import os
import signal
import struct
import sys
import time
import types

W = Path('/private/tmp/tube-c-sheet-refraction-audit-20261005')


def must(condition, message):
    if not condition:
        raise RuntimeError(message)


def pin(spec):
    p = Path(spec['file'])
    must(p.is_file() and p.stat().st_size == spec['bytes'], 'Pinned size changed: ' + str(p))
    b = p.read_bytes()
    must(hashlib.sha256(b).hexdigest() == spec['sha256'], 'Pinned bytes changed: ' + str(p))
    return b


def load_dependencies(inputs):
    freeze = json.loads((W/'source-freeze.json').read_bytes())
    must(freeze['schema'] == 'c-fixed-sheet-refraction-source-freeze/v1' and
         freeze['unexecutedAtPreparation'] is True, 'Wrong preparation freeze')
    for spec in freeze['files']:
        pin(spec)
    for spec in inputs['sourcePins']:
        pin(spec)
    for spec in inputs['capturePins'].values():
        pin(spec)
    for spec in inputs['pins'].values():
        pin(spec)
    prior = json.loads(pin(inputs['pins']['rayAnalysis']))
    must(inputs['pins']['rayAnalysis']['bytes'] <= inputs['limits']['parentAnalysisBytes'], 'Parent result byte cap')
    must(prior['schema'] == 'c-mature-fixed-sheet-ray-analysis/v1' and prior['complete'] is True and
         prior['firstFailure'] is None and not prior['resourcesStarted'] and not prior['portsProbed'] and
         prior['capturePins'] == inputs['capturePins'] and prior['epoch'] == inputs['expectedEpoch'] and
         prior['counts'] == inputs['expectedCounts'] and prior['fixedCamera'] == inputs['fixedCamera'] and
         prior['renderAssumptions'] == inputs['renderAssumptions'], 'Completed fixed ray authority changed')
    must(prior['inputsSha256'] == inputs['pins']['rayInputs']['sha256'], 'Completed ray input pin changed')
    must(prior['pixelPolicy']['locations'] == inputs['fixedLocations'] and len(prior['rays']) == 5,
         'Fixed five locations changed')
    for ray, fixed in zip(prior['rays'], inputs['fixedCandidates']):
        hit = ray['nearestGeometricLoftHit']
        must(ray['location'] == fixed['location'] and ray['pixel'] == fixed['pixel'] and hit is not None and
             hit['triangleOrdinal'] == fixed['triangleOrdinal'] and hit['originalIndices'] == fixed['originalIndices'],
             'Fixed nearest candidate changed')
    # Load only byte-pinned function definitions, without reading/writing pycache.
    # The parent's main block never runs; its existing output remains untouched.
    geometry = types.ModuleType('pinned_fixed_loft_geometry')
    geometry.__file__ = inputs['pins']['rayScript']['file']
    exec(compile(pin(inputs['pins']['rayScript']), geometry.__file__, 'exec'), geometry.__dict__)
    old_inputs = json.loads(pin(inputs['pins']['rayInputs']))
    report = geometry.validate_inputs(old_inputs)
    loft, arrays = geometry.decode_loft(old_inputs, report)
    must(loft['epoch'] == inputs['expectedEpoch'] and loft['counts'] == inputs['expectedCounts'], 'Decoded loft authority changed')
    return prior, geometry, loft, arrays


def f32(value):
    return struct.unpack('<f', struct.pack('<f', value))[0]


def mix_vector(a, b, fraction):
    return tuple(a[i] + fraction * (b[i]-a[i]) for i in range(len(a)))


def refract(q, incident, normal, eta):
    # GLSL refract: no normal/incident re-normalization inside this function.
    cosine = q.dot(normal, incident)
    discriminant = 1-eta*eta*(1-cosine*cosine)
    outgoing = (0.0, 0.0, 0.0) if discriminant < 0 else q.sub(
        q.scale(incident, eta), q.scale(normal, eta*cosine+math.sqrt(discriminant)))
    return {'eta': eta, 'incidentDotNormal': cosine, 'discriminant': discriminant,
            'totalInternalReflection': discriminant < 0, 'outgoing': outgoing,
            'outgoingLength': q.norm(outgoing)}


def exit_with_inward(q, inside, inward, eta):
    result = refract(q, inside, inward, eta)
    result['farInwardNormal'] = inward
    result['strictInsideDotFarNegative'] = q.dot(inside, inward) < 0
    result['sourceTransmissionGateFromBaseInputs'] = result['strictInsideDotFarNegative'] and result['outgoingLength'] > 0
    return result


def source_exit(q, inside, entry_normal, outer, eta):
    # Exact current RICH_SHEET_TRANSMISSION orientation and strict gate.
    orient_dot = q.dot(entry_normal, outer)
    inward = outer if orient_dot >= 0 else q.scale(outer, -1)
    result = exit_with_inward(q, inside, inward, eta)
    result['outerNormal'] = outer
    result['entryNormalDotOuter'] = orient_dot
    result['sourceFarOrientationKept'] = orient_dot >= 0
    return result


def row_chord(q, arrays, row, constants):
    def point(local):
        return q.vec(arrays, 'positions', row*constants['stride']+constants['extensionSamples']+local)
    start, end = point(constants['thicknessChordFrom']), point(constants['thicknessChordTo'])
    ray = (arrays['sliceRayX'][row], arrays['sliceRayZ'][row])
    across = (end[0]-start[0])*ray[0] + (end[2]-start[2])*ray[1]
    up = end[1]-start[1]
    chord = math.sqrt(across*across+up*up)
    lip_across, lip_up = (-up/chord, across/chord) if chord > 0 else (0.0, 1.0)
    uploaded = (f32(ray[0]), f32(ray[1]), f32(lip_across), f32(lip_up))
    return {'row': row, 'front': arrays['sliceFront'][row], 'fromPoint': constants['thicknessChordFrom'],
            'toPoint': constants['thicknessChordTo'], 'worldStart': start, 'worldEnd': end,
            'across': across, 'up': up, 'chordLength': chord,
            'computedLipAcrossUp': [lip_across, lip_up], 'uploadedSweptRayFloat32': uploaded,
            'fallbackForZeroChord': chord <= 0}


def nearest_opposite_run(q, arrays, vertex, constants):
    stride, extension = constants['stride'], constants['extensionSamples']
    row, local = vertex//stride, vertex%stride-extension
    crest, lip, throat = constants['crest'], constants['lip'], constants['throat']
    if crest < local < lip:
        begin, end, role = lip, throat, 'outer-entry-to-inner-run'
    elif lip < local < throat:
        begin, end, role = crest, lip, 'inner-entry-to-outer-run'
    else:
        return {'entryVertex': vertex, 'row': row, 'localProfileIndex': local, 'available': False,
                'reason': 'generic sheetAcross has no opposite-run search at this point (tip is self/zero thickness; endpoints and non-sheet points are not searched)'}
    ray = (arrays['sliceRayX'][row], arrays['sliceRayZ'][row])
    origin = q.vec(arrays, 'positions', row*stride+extension+crest)

    def world(point):
        return q.vec(arrays, 'positions', row*stride+extension+point)

    def planar(point):
        p = world(point)
        return ((p[0]-origin[0])*ray[0]+(p[2]-origin[2])*ray[1], p[1]-origin[1])

    px, py = planar(local)
    best = None
    # Source acrossTo search output without its acceleration: strict d2 minimum,
    # exact-distance ties select lowest k, including point segments.
    for k in range(begin, end):
        ax, ay = planar(k)
        bx, by = planar(k+1)
        dx, dy = bx-ax, by-ay
        length2 = dx*dx+dy*dy
        reciprocal = 1/length2 if length2 > 0 else 0
        fraction = min(1, max(0, ((px-ax)*dx+(py-ay)*dy)*reciprocal))
        ex, ey = px-ax-fraction*dx, py-ay-fraction*dy
        distance2 = ex*ex+ey*ey
        if best is None or distance2 < best[0] or distance2 == best[0] and k < best[1]:
            best = (distance2, k, fraction, dx, dy)
    must(best is not None, 'Opposite run is empty')
    distance2, segment, fraction, dx, dy = best
    a = row*stride+extension+segment
    b = a+1
    n0, n1 = q.vec(arrays, 'normals', a), q.vec(arrays, 'normals', b)
    u0, u1 = q.unit(n0), q.unit(n1)
    paired_base = q.unit(mix_vector(u0, u1, fraction)) if u0 is not None and u1 is not None else None
    length = math.sqrt(dx*dx+dy*dy)
    tangent_normal_2d = (-dy/length, dx/length) if length > 0 else None
    tangent_world = q.unit((tangent_normal_2d[0]*ray[0], tangent_normal_2d[1], tangent_normal_2d[0]*ray[1])) if tangent_normal_2d is not None else None
    return {'entryVertex': vertex, 'row': row, 'front': arrays['sliceFront'][row],
            'localProfileIndex': local, 'available': True, 'mappingRole': role,
            'evaluatedRunSegments': [begin, end-1], 'pairedSegmentFirstLocalIndex': segment,
            'pairedSegmentFraction': fraction, 'pairedIndices': [a, b],
            'rowProjectedDistance': math.sqrt(distance2), 'pairedWorld': mix_vector(world(segment), world(segment+1), fraction),
            'pairedRawLoftNormalInterpolant': mix_vector(n0, n1, fraction),
            'pairedUnitVertexNormalInterpolant': paired_base,
            'pairedSegmentTangentNormal2d': tangent_normal_2d,
            'pairedSegmentTangentNormalWorld': tangent_world,
            'originalTablePairingRecovered': False,
            'limitation': 'generic sheetAcross nearest-opposite-run rule on final stored row projection; legacy precomputed/blended query-profile pairing is absent. Inner back is source constant1, not a normal lookup.'}


def conditional_datum_pair(q, arrays, vertex, constants):
    row, local = vertex//constants['stride'], vertex%constants['stride']-constants['extensionSamples']
    if not 68 <= local <= 88:
        return {'available': False, 'reason': 'outside conditional C sharedSheet underside index range68..88'}
    top = 126-local
    top_vertex = row*constants['stride']+constants['extensionSamples']+top
    entry_world = q.vec(arrays, 'positions', vertex)
    top_world = q.vec(arrays, 'positions', top_vertex)
    return {'available': True, 'entryVertex': vertex, 'localProfileIndex': local,
            'conditionalPairedTopLocalIndex': top, 'conditionalPairedTopVertex': top_vertex,
            'topWorld': top_world, 'topMinusEntry': q.sub(top_world, entry_world),
            'topRawLoftNormal': q.vec(arrays, 'normals', top_vertex),
            'topUnitLoftNormal': q.unit(q.vec(arrays, 'normals', top_vertex)),
            'analyticSharedSheetFlag': None, 'sameDatumPairingCertified': False,
            'limitation': 'source uses this XZ mapping only when analytic.sharedSheet exists; that flag is not serialized. This is distinct from sheetAcross nearest segment mapping.'}


def hit_base_normal(q, arrays, indices, bary):
    units = [q.unit(q.vec(arrays, 'normals', v)) for v in indices]
    return q.unit(q.weighted(units, bary)) if all(n is not None for n in units) else None


def describe_second(q, arrays, hit, entry, inside, inputs):
    distance, triangle, bary, determinant = hit
    indices = arrays['indices'][3*triangle:3*triangle+3]
    p = [q.vec(arrays, 'positions', v) for v in indices]
    normals = [q.vec(arrays, 'normals', v) for v in indices]
    raw_cross = q.cross(q.sub(p[1], p[0]), q.sub(p[2], p[0]))
    normal_sum = tuple(normals[0][i]+normals[1][i]+normals[2][i] for i in range(3))
    facing = q.dot(raw_cross, normal_sum)
    swapped = facing < 0
    gpu_cross = q.scale(raw_cross, -1) if swapped else raw_cross
    base = hit_base_normal(q, arrays, indices, bary)
    inside_unit = q.unit(inside)
    world = q.add(entry['world'], q.scale(inside_unit, distance))
    incident_inward = base if base is not None and q.dot(inside, base) <= 0 else q.scale(base, -1) if base is not None else None
    geo_unit = q.unit(gpu_cross)
    geo_inward = geo_unit if geo_unit is not None and q.dot(inside, geo_unit) <= 0 else q.scale(geo_unit, -1) if geo_unit is not None else None
    exit_eta = float(inputs['sourceConstants']['exitEtaLiteral'])
    entry_normal = entry['normalProvenance']['predictedBaseWorldNormalAfterDoubleSide']
    source_style = source_exit(q, inside, entry_normal, base, exit_eta) if base is not None else None
    rows = sorted({v//inputs['sourceConstants']['stride'] for v in indices})
    return {'triangleOrdinal': triangle, 'indexOffset': 3*triangle, 'originalIndices': indices,
            'barycentrics': bary, 'distanceFromEntryMetres': distance, 'world': world,
            'rows': rows, 'fronts': sorted({arrays['sliceFront'][row] for row in rows}),
            'vertices': [q.vertex_record(arrays, v) for v in indices],
            'interpolatedAttributes': {key: sum(bary[k]*arrays[key][indices[k]] for k in range(3))
                                      for key, width in q.WIDTHS.items() if width == 1},
            'interpolatedThroat': q.weighted([q.vec(arrays, 'throat', v) for v in indices], bary),
            'normal': {'rawVertexNormalInterpolant': q.weighted(normals, bary),
                       'unitVertexBaseNormalInterpolantBeforeDoubleSide': base,
                       'sourceFacesOutDot': facing, 'sourceFacesOutSwap': swapped,
                       'predictedGpuIndices': [indices[0], indices[2], indices[1]] if swapped else indices,
                       'predictedGpuUnitFaceNormal': geo_unit,
                       'baseNormalFacingInsideRay': incident_inward,
                       'geometricFaceNormalFacingInsideRay': geo_inward,
                       'normalOrientedIntoActualWaterCertified': False},
            'sourceStyleExitUsingCandidateBaseNormal': source_style,
            'exitUsingBaseNormalFacingIncidentRay': exit_with_inward(q, inside, incident_inward, exit_eta) if incident_inward is not None else None,
            'exitUsingGeometricFaceNormalFacingIncidentRay': exit_with_inward(q, inside, geo_inward, exit_eta) if geo_inward is not None else None,
            'intersectionDeterminant': determinant, 'nearSharedEdge': min(bary) <= q.BARYCENTRIC_EPSILON,
            'actualSecondWaterAirInterfaceCertified': False,
            'limitation': 'nearest indexed loft candidate after entry; unknown water-volume membership, raster survival and physical interface role. Orientations are comparison conventions, not a material-boundary certificate.'}


def second_candidates(q, arrays, entry, inside, inputs, deadline):
    direction = q.unit(inside)
    if direction is None:
        return {'available': False, 'reason': 'entry refract returns zero/undefined direction', 'candidates': []}
    heap = []
    cap = inputs['limits']['retainedSecondCandidatesPerRay']
    stats = {'trianglesVisited': 0, 'degenerate': 0, 'nearParallel': 0,
             'positiveIntersections': 0, 'selfOrTooNearRejected': 0, 'distanceCapRejected': 0, 'acceptedCandidates': 0}
    for triangle in range(len(arrays['indices'])//3):
        if triangle % 128 == 0:
            must(time.monotonic() < deadline, 'Offline refraction deadline reached')
        indices = arrays['indices'][3*triangle:3*triangle+3]
        hit, reason = q.triangle_hit(entry['world'], direction, [q.vec(arrays, 'positions', v) for v in indices])
        stats['trianglesVisited'] += 1
        if reason == 'degenerate':
            stats['degenerate'] += 1
        elif reason == 'near-parallel':
            stats['nearParallel'] += 1
        if hit is None:
            continue
        distance, bary, determinant = hit
        stats['positiveIntersections'] += 1
        if distance <= inputs['limits']['selfIntersectionMinimumMetres']:
            stats['selfOrTooNearRejected'] += 1
            continue
        if distance > inputs['limits']['maximumInsideRayDistanceMetres']:
            stats['distanceCapRejected'] += 1
            continue
        stats['acceptedCandidates'] += 1
        heap_entry = (-distance, -triangle, bary, determinant)
        if len(heap) < cap:
            heapq.heappush(heap, heap_entry)
        elif (distance, triangle) < (-heap[0][0], -heap[0][1]):
            heapq.heapreplace(heap, heap_entry)
    retained = sorted([(-x[0], -x[1], x[2], x[3]) for x in heap], key=lambda h: (h[0], h[1]))
    candidates = [describe_second(q, arrays, hit, entry, inside, inputs) for hit in retained]
    ties = [c['triangleOrdinal'] for c in candidates if candidates and
            abs(c['distanceFromEntryMetres']-candidates[0]['distanceFromEntryMetres']) <= q.NEAREST_TIE_EPSILON_METRES]
    return {'available': True, 'originAtEntryWithoutOffset': entry['world'], 'directionUnitForGeometryOnly': direction,
            'insideVectorPassedUnnormalizedToExitRefract': inside,
            'selfMinimumMetres': inputs['limits']['selfIntersectionMinimumMetres'],
            'maximumDistanceMetres': inputs['limits']['maximumInsideRayDistanceMetres'],
            'cameraRasterNearFarClipApplied': False, 'stats': stats,
            'nearestCandidate': candidates[0] if candidates else None,
            'nextRetainedCandidates': candidates[1:], 'nearestTieOrdinalsAmongRetained': ties,
            'moreCandidatesOmitted': stats['acceptedCandidates'] > len(candidates),
            'nearestTieMayBeTruncated': len(ties) == len(candidates) == cap and stats['acceptedCandidates'] > cap,
            'actualPhysicalSecondInterfaceCertified': False}


def analyse_ray(q, arrays, ray, inputs, deadline):
    entry = ray['nearestGeometricLoftHit']
    ids, bary = entry['originalIndices'], entry['originalBarycentrics']
    must(list(arrays['indices'][entry['indexOffset']:entry['indexOffset']+3]) == ids, 'Fixed entry indices disagree with actual loft')
    entry_world = q.weighted([q.vec(arrays, 'positions', v) for v in ids], bary)
    must(q.norm(q.sub(entry_world, entry['world'])) < 1e-7, 'Pinned entry point does not match barycentric geometry')
    base_normal = entry['normalProvenance']['predictedBaseWorldNormalAfterDoubleSide']
    must(base_normal is not None, 'Fixed candidate base normal is undefined')
    incident = q.scale(entry['normalProvenance']['viewUnitWorld'], -1)
    water_view_cos = q.dot(base_normal, entry['normalProvenance']['viewUnitWorld'])
    entry_eta = float(inputs['sourceConstants']['entryEtaLiteral'])
    exit_eta = float(inputs['sourceConstants']['exitEtaLiteral'])
    entered = refract(q, incident, base_normal, entry_eta)
    inside = entered['outgoing']
    chords = [row_chord(q, arrays, v//inputs['sourceConstants']['stride'], inputs['sourceConstants']) for v in ids]
    varying = q.weighted([c['uploadedSweptRayFloat32'] for c in chords], bary)
    mean_outer = q.unit((varying[2]*varying[0], varying[3], varying[2]*varying[1]))
    mean_exit = source_exit(q, inside, base_normal, mean_outer, exit_eta) if mean_outer is not None else None
    if mean_exit is not None:
        mean_exit['sourceSkyRayFromBaseInputs'] = mean_exit['outgoing'] if mean_exit['sourceTransmissionGateFromBaseInputs'] else incident
    pairings = [nearest_opposite_run(q, arrays, v, inputs['sourceConstants']) for v in ids]
    paired_normals = [p.get('pairedUnitVertexNormalInterpolant') for p in pairings]
    paired_base = q.unit(q.weighted(paired_normals, bary)) if all(n is not None for n in paired_normals) else None
    paired_tangents = [p.get('pairedSegmentTangentNormalWorld') for p in pairings]
    paired_tangent = q.unit(q.weighted(paired_tangents, bary)) if all(n is not None for n in paired_tangents) else None
    paired_exit = source_exit(q, inside, base_normal, paired_base, exit_eta) if paired_base is not None else None
    tangent_exit = source_exit(q, inside, base_normal, paired_tangent, exit_eta) if paired_tangent is not None else None
    second = second_candidates(q, arrays, entry, inside, inputs, deadline)
    nearest = second.get('nearestCandidate')
    candidate_exit = nearest['sourceStyleExitUsingCandidateBaseNormal'] if nearest is not None else None
    return {'location': ray['location'], 'pixel': ray['pixel'], 'entryTriangleOrdinal': entry['triangleOrdinal'],
            'entryRows': entry['rows'], 'entryFronts': entry['fronts'], 'entryWorld': entry['world'],
            'entryVertices': entry['vertices'], 'entryOriginalBarycentrics': bary,
            'entryInterpolatedAttributes': entry['attributesInterpolatedAtHit'],
            'entryBaseNormalAfterDoubleSide': base_normal, 'incidentAirRay': incident,
            'baseWaterViewCosine': water_view_cos, 'baseSheetLightBranchPositive': water_view_cos > 0,
            'actualFragmentWaterViewCosine': None, 'actualShaderTransmissionGate': None,
            'entryAirToWaterRefract': entered,
            'currentMeanChordApproximation': {'perEntryVertexChordUpload': chords,
                                              'interpolatedSweptRay': varying,
                                              'outerNormalFromProductsOfInterpolatedVarying': mean_outer,
                                              'twoInterfaceExitFromBaseInputs': mean_exit},
            'localOppositeRunComparison': {'perEntryVertexPairing': pairings,
                                           'barycentricBlendOfPairedUnitNormals': paired_base,
                                           'barycentricBlendOfPairedTangentNormals': paired_tangent,
                                           'exitUsingPairedUnitNormalSourceOrientation': paired_exit,
                                           'exitUsingPairedTangentNormalSourceOrientation': tangent_exit,
                                           'pairedNormalDotMeanOuter': q.dot(paired_base, mean_outer) if paired_base is not None and mean_outer is not None else None,
                                           'mappingAtExactHitCertified': False,
                                           'limitation': 'pair per stored vertex then barycentrically blend; not the exact nearest-foot mapping at the interior hit, and not the original blended table pairing'},
            'conditionalSharedDatumPairing': [conditional_datum_pair(q, arrays, v, inputs['sourceConstants']) for v in ids],
            'indexedRefractedRay': second,
            'baseInputComparisonOnly': {'meanGateZeroWhilePairedGatePositive': mean_exit is not None and paired_exit is not None and
                                       not mean_exit['sourceTransmissionGateFromBaseInputs'] and paired_exit['sourceTransmissionGateFromBaseInputs'],
                                       'meanGateZeroWhileNearestCandidateGatePositive': mean_exit is not None and candidate_exit is not None and
                                       not mean_exit['sourceTransmissionGateFromBaseInputs'] and candidate_exit['sourceTransmissionGateFromBaseInputs'],
                                       'nearestCandidateNormalDotMeanOuter': q.dot(nearest['normal']['unitVertexBaseNormalInterpolantBeforeDoubleSide'], mean_outer)
                                       if nearest is not None and nearest['normal']['unitVertexBaseNormalInterpolantBeforeDoubleSide'] is not None and mean_outer is not None else None,
                                       'actualSkySuppressionCauseCertified': False},
            'sheetMaterialBoundaryOrRadianceClaim': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', action='store_true', help='Explicit root-reviewed first-only offline comparison')
    args = parser.parse_args()
    if not args.run:
        print(json.dumps({'preparedOnly': True, 'analysisExecuted': False, 'rootExecutionRequired': True,
                          'command': 'python3 ' + str(W/'refraction-audit.py') + ' --run'}))
        return 0
    inputs = json.loads((W/'inputs.json').read_bytes())
    must(inputs['schema'] == 'c-fixed-sheet-refraction-inputs/v1' and inputs['limits']['seconds'] == 30 and
         inputs['limits']['rays'] == 5 and inputs['limits']['retainedSecondCandidatesPerRay'] == 8 and
         inputs['output'] == 'analysis-first.json', 'Fixed offline policy changed')
    output = W/inputs['output']
    fd = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    started = time.monotonic()
    old_handler = signal.getsignal(signal.SIGALRM)

    def alarm(_signum, _frame):
        raise TimeoutError('Finite offline refraction deadline reached')

    signal.signal(signal.SIGALRM, alarm)
    signal.setitimer(signal.ITIMER_REAL, inputs['limits']['seconds'])
    result = {'schema': 'c-fixed-sheet-refraction-analysis/v1', 'complete': False, 'firstFailure': None,
              'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'resourcesStarted': False, 'portsProbed': False, 'cameraEpochOrModelChanged': False,
              'actualFinalFragmentNormalEvaluated': False, 'rasterSurvivalOrWaterVolumeCertified': False,
              'radianceOrDarkWedgeCauseCertified': False, 'qualityPassageGameplayOrFpsAcceptance': False}
    exit_code = 1
    geometry = None
    try:
        prior, geometry, loft, arrays = load_dependencies(inputs)
        result.update({'inputSha256': hashlib.sha256((W/'inputs.json').read_bytes()).hexdigest(),
                       'parentRayAnalysis': inputs['pins']['rayAnalysis'], 'capturePins': inputs['capturePins'],
                       'sourcePins': inputs['sourcePins'], 'epoch': loft['epoch'], 'counts': loft['counts'],
                       'fixedCamera': inputs['fixedCamera'], 'renderAssumptions': inputs['renderAssumptions'],
                       'fixedLocations': inputs['fixedLocations'], 'sourceConstants': inputs['sourceConstants'],
                       'numericPolicy': {'cpuDoubleApproximation': True,
                                         'uploadedRayAndChordComponentsRoundedToFloat32': True,
                                         'eta': 'six-decimal source GLSL literal parsed as CPU double; no claim of exact GPU arithmetic',
                                         'insideVectorPassedDirectlyToExitRefract': True,
                                         'geometryDirectionNormalizedForDistanceOnly': True,
                                         'entryPointToleranceMetres': 1e-7,
                                         'selfIntersectionMinimumMetres': inputs['limits']['selfIntersectionMinimumMetres'],
                                         'nearestTieEpsilonMetres': geometry.NEAREST_TIE_EPSILON_METRES,
                                         'genericPairDistanceTie': 'exact distance equality chooses lowest segment k'},
                       'rays': [analyse_ray(geometry, arrays, ray, inputs, started+inputs['limits']['seconds'])
                                for ray in prior['rays']],
                       'limitations': [
                           'One fixed captured camera/epoch and exactly the five prior nearest geometric candidates. No nearest visible fragment, original GPU/raster ownership, model or camera search.',
                           'Entry normals are the pre-chop/ripple base normals from the completed ray analysis. Live richFarNormal perturbations are absent; actual waterViewCos, sheet-light and transmission branches remain unknown.',
                           'Current mean chord uses the frozen 40-to-60 row chord with Float32 uploaded ray/chord components, barycentric interpolation and source far-normal orientation. CPU arithmetic does not certify shader arithmetic or radiance.',
                           'Source sheetAcross generic nearest-opposite-run rule is reconstructed on final stored row projections. Its original profile/table foot k/t is not serialized; the local normal comparison is per-vertex then interpolated, not an exact nearest foot at the hit.',
                           'The analytic sharedSheet XZ index pairing is conditional on an unavailable flag, and is reported separately from the generic sheetAcross search. It is not a formation or pairing certificate.',
                           'The first indexed intersection beyond1 micrometre on the refracted ray is a candidate only. The loft is not certified as a closed water volume, so the ray may meet a different front, inner surface, lower water or another interface role.',
                           'Second candidates omit global XZ mask filtering/discard, screen dither, stencil, GPU sample precision and other-surface depth; no physical air/water boundary or survival is established.',
                           'Candidate normals oriented by the source entry-hemisphere rule and separately against the incident ray are comparison conventions. Neither certifies which side is actual water.',
                           'No environment sampling, attenuation, Fresnel energy, lighting, reflection or final outgoing occlusion is evaluated; a positive alternate base gate cannot certify a visible sky ray or the dark wedge cause.',
                           'No production source change, lighting fix, FPS, exposed mouth, physical passage, gameplay, visual-quality or adoption acceptance.'
                       ]})
        result['complete'] = True
        exit_code = 0
    except Exception as error:
        result['firstFailure'] = type(error).__name__ + ': ' + str(error)[:1500]
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, old_handler)
        result['elapsedSeconds'] = time.monotonic()-started
        clean = geometry.finite_json(result) if geometry is not None else result
        b = (json.dumps(clean, indent=2, allow_nan=False)+'\n').encode()
        if len(b) > inputs['limits']['outputBytes']:
            result = {'schema': result['schema'], 'complete': False, 'firstFailure': 'Output byte cap reached',
                      'resourcesStarted': False, 'portsProbed': False, 'elapsedSeconds': result['elapsedSeconds']}
            b = (json.dumps(result, indent=2)+'\n').encode()
            exit_code = 1
        with os.fdopen(fd, 'wb') as stream:
            stream.write(b)
        print(json.dumps({'complete': result['complete'], 'firstFailure': result.get('firstFailure'),
                          'file': str(output), 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest(),
                          'resourcesStarted': False, 'portsProbed': False, 'analysisOnly': True}))
    return exit_code


if __name__ == '__main__':
    sys.exit(main())
