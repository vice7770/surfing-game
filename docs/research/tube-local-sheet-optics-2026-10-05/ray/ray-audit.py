#!/usr/bin/env python3
"""Prepared offline fixed-camera loft rays. No browser, port, model or camera changes.

Default invocation is a no-op. Root must review and explicitly use --run.
This source was prepared without running or syntax-checking it.
"""
from pathlib import Path
import argparse
import base64
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

W = Path('/private/tmp/tube-c-mature-sheet-ray-audit-20261005')
WIDTHS = {'positions': 3, 'normals': 3, 'mask': 1, 'lift': 1,
          'sheet': 1, 'sheetWeight': 1, 'sheetBack': 1, 'throat': 4}
FORMATS = {'Float32Array': 'f', 'Uint32Array': 'I', 'Int32Array': 'i', 'Uint8Array': 'B'}
EXPECTED_TYPES = {'positions': 'Float32Array', 'normals': 'Float32Array',
                  'indices': 'Uint32Array', 'sliceFront': 'Int32Array',
                  'slicePhase': 'Uint8Array', 'sliceJoined': 'Uint8Array',
                  'sliceOverturned': 'Uint8Array'}
STRIDE = 134
EXTENSIONS = 3
PROFILE_POINTS = 128
DET_RELATIVE_EPSILON = 1e-12
BARYCENTRIC_EPSILON = 1e-9
DEPTH_EPSILON = 1e-9
NEAREST_TIE_EPSILON_METRES = 1e-7


def must(condition, message):
    if not condition:
        raise RuntimeError(message)


def pin(spec):
    p = Path(spec['file'])
    must(p.is_file() and p.stat().st_size == spec['bytes'], 'Pinned size changed: ' + str(p))
    b = p.read_bytes()
    must(hashlib.sha256(b).hexdigest() == spec['sha256'], 'Pinned bytes changed: ' + str(p))
    return b


def jpin(spec):
    return json.loads(pin(spec))


def add(a, b):
    return tuple(a[i] + b[i] for i in range(3))


def sub(a, b):
    return tuple(a[i] - b[i] for i in range(3))


def scale(a, k):
    return tuple(a[i] * k for i in range(3))


def dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0])


def norm(a):
    return math.sqrt(dot(a, a))


def unit(a):
    n = norm(a)
    return scale(a, 1 / n) if n > 0 and math.isfinite(n) else None


def weighted(vectors, bary):
    return tuple(sum(bary[k] * vectors[k][i] for k in range(3)) for i in range(len(vectors[0])))


def rotate(q, v):
    # Three Quaternion application to a vector (x,y,z,w); no renormalization/search.
    x, y, z, w = q
    qv = (x, y, z)
    t = scale(cross(qv, v), 2)
    return add(add(v, scale(t, w)), cross(qv, t))


def unproject_direction(projection, quaternion, ndc):
    # Column-major recorded perspective matrix. Solve its x/y clip equations at z=-1.
    # This supports recorded asymmetric offsets p[8],p[9]; reject shear/projective variants.
    p = projection
    must(len(p) == 16 and all(math.isfinite(x) for x in p), 'Invalid projection words')
    must(all(p[i] == 0 for i in (1, 2, 3, 4, 6, 7, 12, 13, 15)) and
         p[11] == -1 and p[0] > 0 and p[5] > 0,
         'Recorded matrix is not the declared perspective form')
    local = ((ndc[0] + p[8]) / p[0], (ndc[1] + p[9]) / p[5], -1)
    world = unit(rotate(quaternion, local))
    must(world is not None, 'Undefined camera ray')
    return world


def finite_json(value):
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, dict):
        return {k: finite_json(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [finite_json(v) for v in value]
    return value


def validate_inputs(inputs):
    must(inputs['schema'] == 'c-mature-fixed-sheet-ray-inputs/v1', 'Wrong inputs schema')
    freeze = json.loads((W / 'source-freeze.json').read_bytes())
    must(freeze['schema'] == 'c-mature-fixed-sheet-ray-source-freeze/v1' and
         freeze['unexecutedAtPreparation'] is True, 'Wrong preparation freeze')
    for spec in freeze['files']:
        pin(spec)
    for spec in inputs['sourcePins']:
        pin(spec)
    pins = inputs['pins']
    # These are byte-pinned direct receipts. No transitive runner/resource execution.
    seal = jpin(pins['regionSeal'])
    owner = jpin(pins['regionOwner'])
    report = jpin(pins['regionReport'])
    jpin(pins['regionFreeze'])
    jpin(pins['regionInputs'])
    must(seal['complete'] is True and seal['rootAuthorized'] is True, 'Region root seal incomplete')
    must(owner['schema'] == inputs['expected']['ownerSchema'] and owner['complete'] is True and
         owner['exitCode'] == 0 and owner['firstFailure'] is None and
         owner['independentClosureValid'] is True and owner['protectedPortsPreserved'] is True and
         not owner['cleanupFailures'] and not owner['remainingOwnedPids'], 'Region owner incomplete')
    must(owner['sealSha256'] == report['sealSha256'] ==
         inputs['expected']['regionSealSha256'] == pins['regionSeal']['sha256'], 'Region seal disagreement')
    must(report['schema'] == inputs['expected']['reportSchema'] and report['complete'] is True and
         report['firstFailure'] is None and report['ownedBrowserClose'] is True and
         report['stepCount'] == 0 and report['steps'] == [] and report['stop'] == inputs['expected']['stop'],
         'Region fixed terminal report disagreement')
    inspection = report['inspection']
    must(inspection['available'] is True and inspection['selector'] == inputs['expected']['selector'] and
         inspection['cameraDerivation'] == inputs['expected']['camera'] and
         inspection['region']['camera'] == inputs['expected']['regionCamera'], 'Canonical inspection changed')
    guard = inspection['nonmutation']
    must(guard['checked'] is True and guard['unchanged'] is True and guard['normalRenderRestored'] is True and
         guard['normalRenderRestoreFailure'] is None and guard['checkedLoftArrays'] == 37 and
         guard['exactActiveByteComparison'] is True and
         guard['originalBarrelViewSheetAndWindingChecked'] is True, 'Capture restoration guard incomplete')
    region = inspection['region']
    must(region['complete'] is True and region['sameCanonicalCamera'] is True and
         region['cloneCameraWordsCompared'] is True and region['originalViewRestored'] is True and
         region['originalView'] == 'ordinary-colour' and not region['selectorRerun'] and
         not region['cameraDerivedAgain'] and not region['geometryOrQualityAcceptance'], 'Paired pass disagreement')
    for key in ('normalPng', 'corePng', 'regionPng'):
        b = pin(pins[key])
        must(b[:8] == b'\x89PNG\r\n\x1a\n' and
             struct.unpack('>II', b[16:24]) == (inputs['pixels']['width'], inputs['pixels']['height']),
             'Captured PNG dimensions changed')
    c = inputs['expected']['camera']
    r = inputs['expected']['regionCamera']
    must(r['position'] == c['eye'] and r['quaternion'] == c['quaternion'] and
         r['projection'] == c['projection'] and r['up'] == c['inheritedUp'], 'Paired camera fields disagree')
    must(all(r[k] == c[k] for k in ('fov', 'aspect', 'near', 'far', 'zoom')), 'Paired projection parameters disagree')
    must(len(c['quaternion']) == 4 and abs(sum(x*x for x in c['quaternion']) - 1) < 1e-12,
         'Captured quaternion is not unit within declared tolerance')
    return report


def decode_loft(inputs, report):
    spec = inputs['pins']['loftSidecar']
    must(spec['bytes'] <= inputs['limits']['sidecarFileBytes'], 'Sidecar file cap')
    loft = jpin(spec)
    expected = inputs['expected']
    must(loft['schema'] == 'bounded-C-complete-drawn-loft-words/v1' and loft['available'] is True and
         loft['label'] == 'terminal' and loft['arrayIdentitiesAndWordsUnchanged'] is True and
         loft['unusedCapacityIncluded'] is False and all(loft['nonmutation'].values()), 'Loft packet incomplete')
    must(loft['epoch'] == expected['sidecarEpoch'] == report['sidecar']['epoch'] and
         loft['counts'] == expected['sidecarCounts'] == report['sidecar']['counts'] and
         loft['positionSpace'] == expected['positionSpace'] and
         loft['normalsMeaning'] == expected['normalsMeaning'], 'Loft terminal metadata changed')
    must(report['sidecar']['sha256'] == spec['sha256'] and report['sidecar']['bytes'] == spec['bytes'],
         'Report sidecar pin changed')
    counts = loft['counts']
    for name in ('slices', 'vertices', 'indices'):
        must(type(counts[name]) is int and 0 < counts[name] <= inputs['limits'][name], 'Loft count cap')
    must(counts['vertices'] == STRIDE * counts['slices'] and counts['indices'] % 3 == 0, 'Loft indexing layout')
    must(len(loft['arrays']) == 37 and set(loft['arrays']) == set(expected['arrayManifest']), 'Full37 keys changed')
    arrays = {}
    total = 0
    for name, packet in loft['arrays'].items():
        must({k: v for k, v in packet.items() if k != 'data'} == expected['arrayManifest'][name] ==
             report['sidecar']['arrayManifest'][name], 'Array manifest changed: ' + name)
        must(name in WIDTHS or name == 'indices' or name.startswith('slice'), 'Unknown array key')
        count = WIDTHS[name] * counts['vertices'] if name in WIDTHS else (
            counts['indices'] if name == 'indices' else counts['slices'])
        dtype = EXPECTED_TYPES.get(name, 'Float32Array')
        must(packet['count'] == count and packet['dtype'] == dtype and
             packet['encoding'] == 'base64-exact-active-typed-array-words' and
             type(packet['littleEndian']) is bool, 'Array layout changed: ' + name)
        data = base64.b64decode(packet['data'], validate=True)
        fmt = ('<' if packet['littleEndian'] else '>') + FORMATS[dtype]
        must(len(data) == packet['byteLength'] == count * struct.calcsize(fmt), 'Array bytes changed: ' + name)
        arrays[name] = tuple(x[0] for x in struct.iter_unpack(fmt, data))
        total += len(data)
        if name in WIDTHS:
            must(all(math.isfinite(x) for x in arrays[name]), 'Nonfinite vertex attribute: ' + name)
    must(total == loft['rawBytes'] == expected['sidecarRawBytes'] <= inputs['limits']['rawBytes'], 'Raw byte cap')
    must(all(0 <= x < counts['vertices'] for x in arrays['indices']), 'Out-of-range loft index')
    parent = jpin(expected['parentSidecar'])
    must(loft['arrays'] == parent['arrays'] and loft['counts'] == parent['counts'] and
         loft['rawFrontPacket'] == parent['rawFrontPacket'], 'Mature-parent full37/rawfront mismatch')
    return loft, arrays


def vec(arrays, name, vertex):
    width = WIDTHS[name]
    return arrays[name][width*vertex:width*(vertex+1)]


def profile_branch(local):
    # Descriptive ranges only: inner and outer lip share this folded profile.
    if local < 0:
        return 'back-extension'
    if local >= PROFILE_POINTS:
        return 'front-extension'
    if local < 32:
        return 'back-to-crest'
    if local < 88:
        return 'crest-to-throat-folded-lip'
    if local <= 112:
        return 'throat-to-toe'
    return 'toe-to-front'


def region_colour(arrays, vertex):
    row, point = vertex // STRIDE, vertex % STRIDE - EXTENSIONS
    lip = arrays['sheetWeight'][vertex] >= .5
    wall = not lip and arrays['slicePhase'][row] == 1 and arrays['throat'][4*vertex+3] >= .5 and 88 <= point <= 112
    face = arrays['slicePhase'][row] == 0 and arrays['lift'][vertex] >= .5 and 32 <= point <= 112
    return (1 if lip or face else 0, 0 if lip or wall else 1, 1 if wall else 0)


def vertex_record(arrays, vertex):
    row, local = vertex // STRIDE, vertex % STRIDE - EXTENSIONS
    slices = {key: values[row] for key, values in arrays.items() if key.startswith('slice')}
    return {'index': vertex, 'row': row, 'localProfileIndex': local, 'profileBranch': profile_branch(local),
            'front': slices['sliceFront'], 'position': vec(arrays, 'positions', vertex),
            'rawLoftNormal': vec(arrays, 'normals', vertex),
            'unitVertexNormalBeforeInterpolation': unit(vec(arrays, 'normals', vertex)),
            'attributes': {name: vec(arrays, name, vertex)[0] if width == 1 else vec(arrays, name, vertex)
                           for name, width in WIDTHS.items() if name not in ('positions', 'normals')},
            'sliceFields': slices,
            'nonfiniteSliceFields': [key for key, value in slices.items()
                                     if isinstance(value, float) and not math.isfinite(value)],
            'sourceRegionColour': region_colour(arrays, vertex),
            'analyticFormationG': None,
            'formationAvailability': 'not serialized; sliceWeight bundles formation/end/fade, sliceFormed is legacy underside metadata'}


def triangle_hit(eye, direction, p):
    e1, e2 = sub(p[1], p[0]), sub(p[2], p[0])
    area = norm(cross(e1, e2))
    if area == 0:
        return None, 'degenerate'
    h = cross(direction, e2)
    determinant = dot(e1, h)
    if abs(determinant) <= DET_RELATIVE_EPSILON * area:
        return None, 'near-parallel'
    reciprocal = 1 / determinant
    s = sub(eye, p[0])
    u = dot(s, h) * reciprocal
    q = cross(s, e1)
    v = dot(direction, q) * reciprocal
    if u < -BARYCENTRIC_EPSILON or v < -BARYCENTRIC_EPSILON or u+v > 1+BARYCENTRIC_EPSILON:
        return None, 'outside'
    distance = dot(e2, q) * reciprocal
    if distance <= 0:
        return None, 'behind-eye'
    bary = (1-u-v, u, v)
    return (distance, bary, determinant), 'hit'


def describe_hit(arrays, triangle, distance, bary, determinant, eye, direction, forward, near, far):
    offset = 3 * triangle
    original = arrays['indices'][offset:offset+3]
    positions = [vec(arrays, 'positions', v) for v in original]
    normals = [vec(arrays, 'normals', v) for v in original]
    raw_cross = cross(sub(positions[1], positions[0]), sub(positions[2], positions[0]))
    summed_normals = tuple(normals[0][i] + normals[1][i] + normals[2][i] for i in range(3))
    # Exact source branch: no tolerance changes facing<0. Assumed source facesOut=true.
    facing = dot(raw_cross, summed_normals)
    swapped = facing < 0
    repaired = (original[0], original[2], original[1]) if swapped else original
    gpu_cross = scale(raw_cross, -1) if swapped else raw_cross
    world = add(eye, scale(direction, distance))
    view = unit(sub(eye, world))
    front_dot = dot(gpu_cross, view)
    # Triangle orientation prediction only, assumes identity world + ordinary viewport orientation.
    face_direction = 1 if front_dot > 0 else -1 if front_dot < 0 else None
    raw_front_dot = dot(raw_cross, view)
    raw_interp = weighted(normals, bary)
    vertex_units = [unit(n) for n in normals]
    unit_interp = weighted(vertex_units, bary) if all(n is not None for n in vertex_units) else None
    pre_flip = unit(unit_interp) if unit_interp is not None else None
    post_flip = scale(pre_flip, face_direction) if pre_flip is not None and face_direction is not None else None
    depth = distance * dot(direction, forward)
    scalar_interpolants = {name: sum(bary[k] * arrays[name][original[k]] for k in range(3))
                           for name, width in WIDTHS.items() if width == 1}
    throat = weighted([vec(arrays, 'throat', v) for v in original], bary)
    rows = sorted({v // STRIDE for v in original})
    slice_interpolants = {name: sum(bary[k] * arrays[name][original[k]//STRIDE] for k in range(3))
                          for name in ('sliceSigma', 'sliceTau', 'sliceWeight', 'sliceFade', 'sliceLife', 'sliceFormed', 'sliceMouth')}
    bary_repaired = (bary[0], bary[2], bary[1]) if swapped else bary
    return {'triangleOrdinal': triangle, 'indexOffset': offset, 'originalIndices': original,
            'predictedGpuIndicesFacesOutTrue': repaired, 'originalBarycentrics': bary,
            'predictedGpuBarycentrics': bary_repaired, 'distanceMetres': distance,
            'cameraForwardDepthMetres': depth, 'insideInheritedNearFar': near <= depth <= far,
            'clipBoundaryToleranceUsed': not near <= depth <= far,
            'world': world, 'rows': rows, 'fronts': sorted({arrays['sliceFront'][row] for row in rows}),
            'canonicalRow37Or38Only': all(row in (37, 38) for row in rows),
            'vertices': [vertex_record(arrays, v) for v in original],
            'attributesInterpolatedAtHit': scalar_interpolants | {'throat': throat},
            'sliceInterpolantsDescriptiveOnly': slice_interpolants,
            'nonfiniteSliceInterpolants': [k for k,v in slice_interpolants.items() if not math.isfinite(v)],
            'analyticFormationG': None,
            'rasterizedXzMask': None,
            'maskLimitation': 'loft.mask barycentric interpolant is not the rasterized/filter-sampled XZ texture value; mask discard and screen dither not evaluated',
            'sourceRegionColourInterpolant': weighted([region_colour(arrays, v) for v in original], bary),
            'orientation': {'rawAreaCross': raw_cross, 'rawUnitFaceNormal': unit(raw_cross),
                            'facesOutDotRawNormalSum': facing, 'facesOutSwapApplied': swapped,
                            'repairNearZeroAmbiguity': abs(facing) <= DET_RELATIVE_EPSILON * norm(raw_cross) * norm(summed_normals),
                            'predictedGpuAreaCross': gpu_cross, 'predictedGpuUnitFaceNormal': unit(gpu_cross),
                            'predictedGpuFacingCameraDot': front_dot,
                            'predictedGpuFrontFacing': None if face_direction is None else face_direction > 0,
                            'predictedDoubleSideFaceDirection': face_direction,
                            'rawWindingFacingCameraDot': raw_front_dot,
                            'intersectionDeterminant': determinant},
            'normalProvenance': {'rawLoftNormalInterpolant': raw_interp,
                                 'unitVertexNormalInterpolant': unit_interp,
                                 'baseUnitWorldNormalBeforeDoubleSide': pre_flip,
                                 'predictedBaseWorldNormalAfterDoubleSide': post_flip,
                                 'viewUnitWorld': view,
                                 'preDoubleSideCameraViewCosine': dot(pre_flip, view) if pre_flip is not None else None,
                                 'predictedPreChopRippleCameraViewCosine': dot(post_flip, view) if post_flip is not None else None,
                                 'actualFragmentWaterViewCosine': None,
                                 'actualSheetLightBranch': None,
                                 'limitation': 'actual richFarNormal world-horizontal chop plus ripple and live uniforms/textures are omitted; calculated base cosine cannot certify waterViewCos>0 or shader radiance'},
            'barycentricNearEdge': min(bary) <= BARYCENTRIC_EPSILON,
            'physicalOrVisibleBlockageClaim': False}


def fixed_rays(inputs, loft, arrays, deadline):
    camera = inputs['expected']['camera']
    eye = tuple(camera['eye'])
    forward = unit(rotate(camera['quaternion'], (0, 0, -1)))
    must(forward is not None, 'Undefined camera forward')
    locations = inputs['pixels']['locations']
    must(len(locations) == inputs['limits']['rays'] == 5 and
         [p['name'] for p in locations] == ['center', 'right-center', 'lower-right', 'top-right', 'left-center'],
         'Fixed predeclared ray list changed')
    width, height = inputs['pixels']['width'], inputs['pixels']['height']
    results = []
    triangles = loft['counts']['indices'] // 3
    for location in locations:
        must(time.monotonic() < deadline, 'Offline analysis deadline reached')
        fraction = location['fraction']
        px, py = math.floor(fraction[0]*width), math.floor(fraction[1]*height)
        must(0 <= px < width and 0 <= py < height, 'Fixed location outside image')
        ndc = (2*(px+.5)/width - 1, 1 - 2*(py+.5)/height)
        direction = unproject_direction(camera['projection'], camera['quaternion'], ndc)
        denominator = dot(direction, forward)
        must(denominator > 0, 'Fixed ray faces away from camera')
        heap = []
        stats = {'trianglesVisited': 0, 'degenerate': 0, 'nearParallel': 0,
                 'positiveIntersectionsBeforeClip': 0, 'clipRejected': 0, 'acceptedGeometricHits': 0}
        for triangle in range(triangles):
            if triangle % 128 == 0:
                must(time.monotonic() < deadline, 'Offline analysis deadline reached')
            ids = arrays['indices'][3*triangle:3*triangle+3]
            p = [vec(arrays, 'positions', v) for v in ids]
            hit, reason = triangle_hit(eye, direction, p)
            stats['trianglesVisited'] += 1
            if reason == 'degenerate':
                stats['degenerate'] += 1
            elif reason == 'near-parallel':
                stats['nearParallel'] += 1
            if hit is None:
                continue
            distance, bary, determinant = hit
            stats['positiveIntersectionsBeforeClip'] += 1
            depth = distance * denominator
            if depth < camera['near']-DEPTH_EPSILON or depth > camera['far']+DEPTH_EPSILON:
                stats['clipRejected'] += 1
                continue
            stats['acceptedGeometricHits'] += 1
            entry = (-distance, -triangle, bary, determinant)
            if len(heap) < inputs['limits']['retainedHitsPerRay']:
                heapq.heappush(heap, entry)
            elif (distance, triangle) < (-heap[0][0], -heap[0][1]):
                heapq.heapreplace(heap, entry)
        retained = sorted([(-x[0], -x[1], x[2], x[3]) for x in heap], key=lambda h: (h[0], h[1]))
        hits = [describe_hit(arrays, triangle, distance, bary, determinant, eye, direction,
                             forward, camera['near'], camera['far'])
                for distance, triangle, bary, determinant in retained]
        tie_ordinals = [h['triangleOrdinal'] for h in hits
                        if hits and abs(h['distanceMetres']-hits[0]['distanceMetres']) <= NEAREST_TIE_EPSILON_METRES]
        results.append({'location': location, 'pixel': [px, py], 'pixelCentre': [px+.5, py+.5],
                        'ndc': ndc, 'eye': eye, 'directionUnitWorld': direction,
                        'nearDistanceAlongRay': camera['near']/denominator,
                        'farDistanceAlongRay': camera['far']/denominator,
                        'stats': stats, 'nearestGeometricLoftHit': hits[0] if hits else None,
                        'nextRetainedGeometricLoftHits': hits[1:],
                        'nearestTieTriangleOrdinalsAmongRetained': tie_ordinals,
                        'moreThanEightCandidatesOmitted': stats['acceptedGeometricHits'] > len(hits),
                        'retainedNearestTieMayBeTruncated': len(tie_ordinals) == len(hits) == 8 and stats['acceptedGeometricHits'] > 8,
                        'nearestSurvivingRasterPixelClaim': False})
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', action='store_true', help='Root-reviewed explicit offline analysis; first-only output')
    args = parser.parse_args()
    if not args.run:
        print(json.dumps({'preparedOnly': True, 'analysisExecuted': False, 'rootExecutionRequired': True,
                          'command': 'python3 ' + str(W/'ray-audit.py') + ' --run'}))
        return 0
    inputs = json.loads((W/'inputs.json').read_bytes())
    output = W / inputs['output']
    must(inputs['output'] == 'analysis-first.json', 'Fixed first-only output changed')
    fd = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    started = time.monotonic()
    seconds = inputs['limits']['seconds']
    must(type(seconds) is int and seconds == 30, 'Fixed offline deadline changed')
    old_handler = signal.getsignal(signal.SIGALRM)

    def alarm(_signum, _frame):
        raise TimeoutError('Finite offline analysis deadline reached')

    signal.signal(signal.SIGALRM, alarm)
    signal.setitimer(signal.ITIMER_REAL, seconds)
    result = {'schema': 'c-mature-fixed-sheet-ray-analysis/v1', 'complete': False,
              'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'firstFailure': None, 'resourcesStarted': False, 'portsProbed': False,
              'cameraEpochOrModelChanged': False, 'rasterizedDiscardOrOtherDepthEvaluated': False,
              'shaderRadianceOrPhysicalBlockageClaim': False, 'qualityPassageOrGameplayAcceptance': False}
    exit_code = 1
    try:
        report = validate_inputs(inputs)
        loft, arrays = decode_loft(inputs, report)
        result.update({'inputsSha256': hashlib.sha256((W/'inputs.json').read_bytes()).hexdigest(),
                       'capturePins': inputs['pins'], 'sourcePins': inputs['sourcePins'],
                       'epoch': loft['epoch'], 'counts': loft['counts'],
                       'canonicalSelector': inputs['expected']['selector'],
                       'fixedCamera': inputs['expected']['camera'],
                       'renderAssumptions': inputs['renderAssumptions'],
                       'pixelPolicy': inputs['pixels'],
                       'numericPolicy': {'doublePrecisionCpuApproximation': True,
                                         'intersection': 'double-sided Moller-Trumbore, original indexed active prefix',
                                         'relativeParallelDetEpsilon': DET_RELATIVE_EPSILON,
                                         'inclusiveBarycentricEpsilon': BARYCENTRIC_EPSILON,
                                         'nearFarForwardDepthEpsilonMetres': DEPTH_EPSILON,
                                         'nearestTieEpsilonMetres': NEAREST_TIE_EPSILON_METRES,
                                         'edgeHits': 'inclusive; shared-edge duplicates retained, nearest ties sorted by original triangle ordinal',
                                         'clipping': 'camera-forward near/far depth, not Euclidean ray distance',
                                         'normal': 'individual raw loft vertex normals unitized, barycentrically interpolated and normalized; repaired winding double-side sign applied'},
                       'rays': fixed_rays(inputs, loft, arrays, started+seconds),
                       'limitations': [
                           'Geometric rays omit rasterized triangle coverage, GPU precision and sample rules, global XZ mask texture filtering/discard, fixed screen dither, stencil and depth against ordinary water, actors or other surfaces.',
                           'Nearest geometric hit may be discarded. Retained farther loft hits are candidate provenance only; no nearest visible fragment or physical closure is established.',
                           'The frozen source implies facesOut=true, sheetShown=true and identity mesh world transform. The capture guard proves view/sheet/winding values stayed unchanged, but did not record their values or compare the underlying mesh transform/matrixWorld. Predicted GPU orientation/base normal is conditional on these source-derived assumptions.',
                           'The ray barycentrics recover perspective-correct attribute interpolation for ideal triangles. CPU doubles and tolerance policy are not an exact GPU rasterization.',
                           'loft.mask interpolant is not the rasterized mask texture sample. A mature stored row weight1 does not certify the full frustum, per-pixel mask or other row/front formation.',
                           'Analytic pre-round formation g is unavailable; stored sliceWeight includes end/fade/formation, sliceFormed is legacy underside metadata and sliceLife is a separate life clock.',
                           'richFarNormal adds world-horizontal wind chop and ripple to the current double-sided normal. Live uniforms/textures are absent. Base normal/cosine alone cannot establish final waterViewCos, sheet-light branch, reflection or darkness.',
                           'Region colours are interpolated vertex classifications; pure red denotes surviving loft sheet pixels in the paired image, but ray candidates alone cannot assign that pixel to a precise surviving triangle.',
                           'Exactly five predeclared screen locations at one existing canonical camera and epoch. No image-quality, camera, trajectory or model search. No FPS, exposed mouth, body passage, gameplay or adoption acceptance.'
                       ]})
        result['complete'] = True
        exit_code = 0
    except Exception as error:
        result['firstFailure'] = type(error).__name__ + ': ' + str(error)[:1500]
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, old_handler)
        result['elapsedSeconds'] = time.monotonic() - started
        b = (json.dumps(finite_json(result), indent=2, allow_nan=False) + '\n').encode()
        if len(b) > inputs['limits']['outputBytes']:
            result = {'schema': result['schema'], 'complete': False, 'firstFailure': 'Output byte cap reached',
                      'resourcesStarted': False, 'portsProbed': False, 'elapsedSeconds': result['elapsedSeconds']}
            b = (json.dumps(result, indent=2) + '\n').encode()
            exit_code = 1
        with os.fdopen(fd, 'wb') as stream:
            stream.write(b)
        print(json.dumps({'complete': result['complete'], 'firstFailure': result.get('firstFailure'),
                          'file': str(output), 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest(),
                          'analysisOnly': True, 'resourcesStarted': False, 'portsProbed': False}))
    return exit_code


if __name__ == '__main__':
    sys.exit(main())
