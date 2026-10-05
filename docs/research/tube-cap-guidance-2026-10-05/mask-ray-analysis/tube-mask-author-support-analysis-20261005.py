#!/usr/bin/env python3
"""Root-run saved-word ray support; no renderer, provider, texture or simulation execution."""
from pathlib import Path
import base64
import hashlib
import json
import math
import struct
import zlib

W = Path('/private/tmp/tube-mask-support-native-20261005')
# Predeclared image pixels, zero-based with upper-left origin. No pixel/epoch/camera search.
SAMPLES = {'side': [(800, 600), (600, 500)], 'interior': [(800, 650), (400, 450)]}
STRIDE, EXT = 134, 3
EDGE_EPS, TIE_METRES = 1e-9, 1e-7


def require(value, message):
    if not value:
        raise RuntimeError(message)


def read_pin(spec):
    raw = Path(spec['file']).read_bytes()
    require(len(raw) == spec['bytes'] and hashlib.sha256(raw).hexdigest() == spec['sha256'], 'Changed ' + spec['file'])
    return raw


def pin(path, raw):
    return {'file': str(path), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def decode(record):
    codes = {'Float32Array': 'f', 'Uint32Array': 'I', 'Int32Array': 'i', 'Uint8Array': 'B'}
    raw = base64.b64decode(record['data'], validate=True)
    code = codes[record['dtype']]
    require(record['encoding'] == 'base64-exact-active-typed-array-words'
            and len(raw) == record['byteLength'] == record['count'] * struct.calcsize(code), 'Invalid typed words')
    return struct.unpack(('<' if record['littleEndian'] else '>') + str(record['count']) + code, raw)


def png_pixels(raw, pixels):
    """Read exact encoded RGBA pixels; Canvas PNG8 RGB/RGBA, no colour-space inference."""
    require(raw[:8] == b'\x89PNG\r\n\x1a\n', 'Not PNG')
    offset, data, header = 8, [], None
    while offset < len(raw):
        length = struct.unpack_from('>I', raw, offset)[0]
        kind, body = raw[offset + 4:offset + 8], raw[offset + 8:offset + 8 + length]
        require(len(body) == length and zlib.crc32(kind + body) & 0xffffffff == struct.unpack_from('>I', raw, offset + 8 + length)[0], 'PNG CRC')
        if kind == b'IHDR':
            header = struct.unpack('>IIBBBBB', body)
        if kind == b'IDAT':
            data.append(body)
        offset += length + 12
        if kind == b'IEND':
            break
    require(header is not None, 'Missing PNG header')
    width, height, depth, colour, compression, filtering, interlace = header
    require((width, height) == (1708, 879) and depth == 8 and colour in (2, 6)
            and compression == filtering == interlace == 0, 'Unsupported PNG layout')
    channels, stride = (3 if colour == 2 else 4), width * (3 if colour == 2 else 4)
    require(all(0 <= x < width and 0 <= y < height for x, y in pixels), 'Pixel outside PNG')
    inflater = zlib.decompressobj()
    decoded = inflater.decompress(b''.join(data), (stride + 1) * height + 1)
    require(inflater.eof and not inflater.unconsumed_tail and len(decoded) == (stride + 1) * height, 'PNG decompression size')
    wanted, result, previous = set(pixels), {}, bytearray(stride)
    for y in range(max(y for _, y in wanted) + 1):
        start = y * (stride + 1)
        method, row = decoded[start], bytearray(decoded[start + 1:start + 1 + stride])
        require(method in range(5), 'Unsupported PNG filter')
        if method == 2:
            row[:] = bytes((value + above) & 255 for value, above in zip(row, previous))
        elif method:
            for i in range(stride):
                left = row[i - channels] if i >= channels else 0
                above, upper_left = previous[i], previous[i - channels] if i >= channels else 0
                if method == 1:
                    predictor = left
                elif method == 3:
                    predictor = (left + above) // 2
                else:
                    prediction = left + above - upper_left
                    a, b, c = abs(prediction - left), abs(prediction - above), abs(prediction - upper_left)
                    predictor = left if a <= b and a <= c else above if b <= c else upper_left
                row[i] = (row[i] + predictor) & 255
        for x, py in wanted:
            if y == py:
                rgba = list(row[channels * x:channels * (x + 1)])
                result[(x, y)] = rgba + ([255] if channels == 3 else [])
        previous = row
    return (width, height), result


def sub(a, b):
    return tuple(x - y for x, y in zip(a, b))


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def inverse(matrix):
    # Captured Three matrices are column-major. Gauss-Jordan keeps any captured off-centre projection.
    rows = [[matrix[4 * c + r] for c in range(4)] + [float(r == c) for c in range(4)] for r in range(4)]
    for c in range(4):
        pivot = max(range(c, 4), key=lambda r: abs(rows[r][c]))
        rows[c], rows[pivot] = rows[pivot], rows[c]
        require(abs(rows[c][c]) > 1e-15, 'Singular camera projection')
        scale = rows[c][c]
        rows[c] = [v / scale for v in rows[c]]
        for r in range(4):
            if r != c:
                scale = rows[r][c]
                rows[r] = [x - scale * y for x, y in zip(rows[r], rows[c])]
    return [row[4:] for row in rows]


def rotate(point, quaternion):
    qx, qy, qz, qw = quaternion
    require(abs(dot(quaternion, quaternion) - 1) < 1e-10, 'Nonunit saved quaternion')
    t = tuple(2 * v for v in cross((qx, qy, qz), point))
    turn = cross((qx, qy, qz), t)
    return tuple(point[i] + qw * t[i] + turn[i] for i in range(3))


def ray(camera, size, pixel):
    width, height = size
    x, y = pixel
    ndc = (2 * (x + .5) / width - 1, 1 - 2 * (y + .5) / height)
    inv = inverse(camera['projection'])
    offsets = []
    for z in (-1, 1):
        homogeneous = [dot(row, (*ndc, z, 1)) for row in inv]
        require(abs(homogeneous[3]) > 1e-15, 'Infinite saved clip point')
        offsets.append(rotate(tuple(v / homogeneous[3] for v in homogeneous[:3]), camera['quaternion']))
    direction = tuple(v / math.hypot(*offsets[1]) for v in offsets[1])
    require(math.hypot(*cross(offsets[0], direction)) < 1e-7, 'Unsupported non-perspective ray')
    return tuple(camera['eye']), direction, (dot(offsets[0], direction), dot(offsets[1], direction)), ndc


def intersect(origin, direction, a, b, c):
    e1, e2 = sub(b, a), sub(c, a)
    p = cross(direction, e2)
    determinant = dot(e1, p)
    if abs(determinant) <= 1e-14 * max(1, math.hypot(*e1) * math.hypot(*e2)):
        return None
    t = sub(origin, a)
    u = dot(t, p) / determinant
    q = cross(t, e1)
    v, distance = dot(direction, q) / determinant, dot(e2, q) / determinant
    if u < -EDGE_EPS or v < -EDGE_EPS or u + v > 1 + EDGE_EPS or distance <= 0:
        return None
    return distance, (1 - u - v, u, v)


def region(arrays, vertex):
    row, point = vertex // STRIDE, vertex % STRIDE - EXT
    lip = arrays['sheetWeight'][vertex] >= .5
    wall = not lip and arrays['slicePhase'][row] == 1 and arrays['throat'][4 * vertex + 3] >= .5 and 88 <= point <= 112
    face = arrays['slicePhase'][row] == 0 and arrays['lift'][vertex] >= .5 and 32 <= point <= 112
    return (int(lip or face), int(not (lip or wall)), int(wall))


def describe(arrays, offset, indices, hit, origin, direction, clip):
    distance, weights = hit
    vertices = []
    for vertex in indices:
        row, point = vertex // STRIDE, vertex % STRIDE - EXT
        vertices.append({'index': vertex, 'row': row, 'profilePoint': point, 'front': arrays['sliceFront'][row],
            'phase': arrays['slicePhase'][row], 'tau': arrays['sliceTau'][row], 'sigma': arrays['sliceSigma'][row],
            'rowWeight': arrays['sliceWeight'][row], 'rowFade': arrays['sliceFade'][row], 'authoredMask': arrays['mask'][vertex],
            'lift': arrays['lift'][vertex], 'sheetWeight': arrays['sheetWeight'][vertex], 'throatWeight': arrays['throat'][4 * vertex + 3],
            'regionLinearRGB': region(arrays, vertex)})
    masks = [v['authoredMask'] for v in vertices]
    return {'triangle': offset // 3, 'indexOffset': offset, 'distanceMetres': distance,
        'insideClipRange': clip[0] <= distance <= clip[1], 'worldPoint': [a + distance * b for a, b in zip(origin, direction)],
        'barycentric': weights, 'nearTriangleEdge': min(weights) <= EDGE_EPS,
        'vertexMasks': masks, 'allThreeMasksExactly1': all(value == 1 for value in masks),
        'interpolatedAuthoredMask': dot(weights, masks),
        'interpolatedRegionLinearRGB': [dot(weights, [v['regionLinearRGB'][c] for v in vertices]) for c in range(3)],
        'barycentricProfileIndex': dot(weights, [v['profilePoint'] for v in vertices]), 'vertices': vertices}


def main():
    owner_raw = (W / 'owner.json').read_bytes()
    owner = json.loads(owner_raw)
    require(owner['schema'] == 'matched-mask-support-owner/v1' and owner['complete'] is True and owner['exitCode'] == 0
            and owner['firstFailure'] is None and owner['postExecutionPinsVerified'] is True and owner['protectedPreserved'] is True
            and owner['protectedBefore'] == owner['protectedAfter'] and not owner['cleanupFailures']
            and not owner['ownedMembersAfterCleanup'] and all(owner['closedPorts'].values()), 'Owner not terminal/complete/closed')
    report_raw = (W / 'candidate-first/report.json').read_bytes()
    report = json.loads(report_raw)
    require(report['schema'] == 'matched-mask-support-native/v1' and report['complete'] is True and report['firstFailure'] is None
            and report['ownedBrowserClose'] is True and report['sealSha256'] == owner['sealSha256'] and report['stepCount'] == 0
            and not report['browserErrors'] and len(report['pairs']) == 2, 'Incomplete matched result')
    inputs_raw = (W / 'inputs.json').read_bytes()
    inputs = json.loads(inputs_raw)
    require(report['referenceLoft'] == inputs['referenceLoft'] and report['referenceReport'] == inputs['referenceReport'], 'Different reference pins')
    snapshot = json.loads(read_pin(report['referenceLoft']))
    reference = json.loads(read_pin(report['referenceReport']))
    freeze = json.loads(read_pin(inputs['referenceSourceFreeze']))
    renderer = next(item['frozen'] for item in freeze['files'] if item['relative'] == 'src/scene/barrel/SweptBarrelMesh.ts')
    library = next(item['frozen'] for item in freeze['files'] if item['relative'] == 'src/wave/barrel/ProfileLibrary.ts')
    require('crest: 32, lip: 64, throat: 88, toe: 112' in read_pin(library).decode(), 'Different frozen landmarks')
    source = read_pin(renderer).decode()
    require('const REGION_SHARE = 0.5;' in source and 'point >= LANDMARK.throat && point <= LANDMARK.toe' in source
            and 'out[o] = lip || face ? 1 : 0;' in source and 'out[o + 1] = lip || wall ? 0 : 1;' in source
            and 'out[o + 2] = wall ? 1 : 0;' in source and 'vec3 transformed = vec3( position );' in source, 'Different frozen region/position semantics')
    require(snapshot['available'] is True and snapshot['arrayIdentitiesAndWordsUnchanged'] is True and len(snapshot['arrays']) == 37
            and snapshot['positionSpace'] == 'world-coordinate-loft-input' and snapshot['counts'] == inputs['referenceCounts']
            and snapshot['counts']['vertices'] == STRIDE * snapshot['counts']['slices'] and snapshot['epoch']['step'] == 0
            and snapshot['epoch']['seaTime'] == report['initial']['seaTime'], 'Different/incomplete exact saved geometry')
    arrays = {name: decode(words) for name, words in snapshot['arrays'].items()}
    positions, indices = arrays['positions'], arrays['indices']
    require(len(positions) == 3 * snapshot['counts']['vertices'] and len(indices) == snapshot['counts']['indices']
            and len(indices) % 3 == 0 and all(0 <= i < snapshot['counts']['vertices'] for i in indices), 'Invalid active indexed geometry')
    triangles = [(i, indices[i:i + 3], [positions[3 * v:3 * v + 3] for v in indices[i:i + 3]]) for i in range(0, len(indices), 3)]
    records, pins = [], [pin(W / 'owner.json', owner_raw), pin(W / 'candidate-first/report.json', report_raw), pin(W / 'inputs.json', inputs_raw),
                          report['referenceLoft'], report['referenceReport'], inputs['referenceSourceFreeze'], renderer, library]
    for pair in report['pairs']:
        name = pair['camera']
        require(name in SAMPLES and pair['complete'] is True and pair['stepCount'] == 0 and pair['maskedRepeatPixelsIdentical'] is True
                and all(value is True for value in pair['guards'].values()) and pair['fixedPose'] == inputs['fixedCameras'][name], 'Incomplete/different matched pair')
        old_camera = reference['inspection']['sideMouth']['cameraDerivation'] if name == 'side' else reference['inspection']['cameraDerivation']
        require(all(pair['fixedPose'][key] == old_camera[key] for key in pair['fixedPose']), 'Different completed cap camera')
        images = {}
        for variant in ('masked', 'bypassed'):
            spec = {**pair[variant], 'file': str(W / 'candidate-first' / pair[variant]['file'])}
            size, images[variant] = png_pixels(read_pin(spec), SAMPLES[name])
            pins.append(spec)
            require(list(size) == report['initial']['canvas'], 'Different capture canvas')
        for pixel in SAMPLES[name]:
            origin, direction, clip, ndc = ray(pair['fixedPose'], size, pixel)
            hits = [(offset, ids, hit) for offset, ids, vertices in triangles
                    if (hit := intersect(origin, direction, *vertices)) is not None]
            hits.sort(key=lambda item: (item[2][0], item[0]))
            clipped = [item for item in hits if clip[0] <= item[2][0] <= clip[1]]
            def nearest(group):
                if not group:
                    return None
                ties = [item for item in group if item[2][0] <= group[0][2][0] + TIE_METRES]
                require(len(ties) <= 16, 'Unexpected nearest intersection tie count')
                return {'coNearestCount': len(ties), 'hits': [describe(arrays, offset, ids, hit, origin, direction, clip) for offset, ids, hit in ties]}
            records.append({'camera': name, 'pixelTopLeft0Based': pixel, 'sampleCenter': [pixel[0] + .5, pixel[1] + .5],
                'ndcXY': ndc, 'rayOrigin': origin, 'rayDirection': direction, 'clipDistancesAlongRay': clip,
                'encodedMaskedRGBA': images['masked'][pixel], 'encodedBypassedRGBA': images['bypassed'][pixel],
                'encodedPixelChanged': images['masked'][pixel] != images['bypassed'][pixel], 'forwardLoftIntersections': len(hits),
                'nearestForwardDoubleSidedLoft': nearest(hits), 'nearestInsideFrustumDoubleSidedLoft': nearest(clipped)})
    print(json.dumps({'schema': 'mask-authored-ray-support/v1', 'complete': True, 'inputs': pins, 'geometryEpoch': snapshot['epoch'],
        'predeclaredPixels': SAMPLES, 'samples': records, 'scope': [
            'Four predeclared pixel-centre rays, not a visible-pixel ownership or affected-area survey.',
            'Exact saved Float32 world positions/indices/attributes; double-sided intersection ignores winding repair and no vertex displacement is modeled.',
            'Barycentric interpolation is world-triangle interpolation, matching perspective-correct varying interpolation at this geometric hit.',
            'Authored loft.mask is not the filtered rasterized world-XZ texture sampled by the swept discard.',
            'Mask1 core plus a changed PNG pixel supports a texture-support hypothesis; other scene water/depth/stencil can affect final pixels, so exact visible triangle/discard cause is not certified.',
            'No texture value/dither decision, stencil simulation, other-object occlusion, shader displacement, lighting, body clearance, physics force or quality claim.',
            'PNG RGBA values are exact encoded output samples; interpolated region RGB is linear shader input, not predicted encoded PNG colour.'
        ]}, separators=(',', ':'), allow_nan=False))


if __name__ == '__main__':
    main()
