#!/usr/bin/env python3
"""Root-run read-only comparison of two completed captures; no provider/runtime execution."""
from pathlib import Path
from collections import Counter
import base64
import hashlib
import json
import math
import statistics
import struct

BASE = Path('/private/tmp/tube-open-mouth-body-clearance-native-20261005')
CAND = Path('/private/tmp/tube-cap-refinement-native-20261005')
STRIDE, EXT, CREST, CAP, FLOOR = 134, 3, 32, 64, 104
HARD_VERTICES = (40_000 // STRIDE) * STRIDE
CAMERA_KEYS = ('eye', 'target', 'quaternion', 'inheritedUp', 'projection', 'fov', 'aspect', 'near', 'far', 'zoom')


def require(value, message):
    if not value:
        raise RuntimeError(message)


def pin(path):
    raw = path.read_bytes()
    return {'file': str(path), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def verify(path, record):
    actual = pin(path)
    require((actual['bytes'], actual['sha256']) == (record['bytes'], record['sha256']), 'Changed ' + str(path))
    return json.loads(path.read_bytes())


def decode(record):
    types = {'Float32Array': 'f', 'Int32Array': 'i', 'Uint32Array': 'I', 'Uint8Array': 'B'}
    require(record['encoding'] == 'base64-exact-active-typed-array-words', 'Unsupported typed words')
    raw = base64.b64decode(record['data'], validate=True)
    kind = types[record['dtype']]
    require(len(raw) == record['byteLength'] == record['count'] * struct.calcsize(kind), 'Invalid word count')
    return struct.unpack(('<' if record['littleEndian'] else '>') + str(record['count']) + kind, raw), raw


def capture(w, owner_schema, report_schema):
    # The owner is written only after its finite process ends. Reject before reading any live report.
    owner = json.loads((w / 'owner.json').read_bytes())
    require(owner['schema'] == owner_schema and owner['complete'] is True and owner['exitCode'] == 0
            and owner['firstFailure'] is None and owner['postExecutionPinsVerified'] is True
            and owner['copiedAndLiveSourcePinsPostVerified'] is True and owner['protectedPreserved'] is True
            and owner['protectedBefore'] == owner['protectedAfter'] and not owner['cleanupFailures']
            and not owner['ownedMembersAfterCleanup'] and all(owner['closedPorts'].values()), 'Capture is not terminal and closed')
    p = w / 'candidate-first'
    report = json.loads((p / 'report.json').read_bytes())
    require(report['schema'] == report_schema and report['complete'] is True and report['firstFailure'] is None
            and report['ownedBrowserClose'] is True and report['inspection']['available'] is True
            and report['sealSha256'] == owner['sealSha256'], 'Incomplete/mismatched capture report')
    snap = verify(p / 'loft-terminal.json', report['sidecar'])
    require(snap['available'] is True and snap['arrayIdentitiesAndWordsUnchanged'] is True
            and len(snap['arrays']) == 37 and snap['counts']['vertices'] == STRIDE * snap['counts']['slices']
            and snap['epoch']['step'] == report['stepCount'] and snap['epoch']['seaTime'] == report['stop']['seaTime'], 'Incomplete saved loft')
    arrays = {name: decode(record)[0] for name, record in snap['arrays'].items()}
    # This writer omits an endian flag on the raw packet: its bytes share the snapshot's native Float32 order.
    endian = snap['arrays']['positions']['littleEndian']
    require(all(row['littleEndian'] == endian for row in snap['arrays'].values()), 'Mixed native word endianness')
    raw, raw_bytes = decode({**snap['rawFrontPacket'], 'littleEndian': snap['rawFrontPacket'].get('littleEndian', endian)})
    require(snap['rawFrontPacket']['stride'] == 9 and len(raw) == 9 * snap['rawFrontPacket']['recordCount'], 'Unexpected raw packet')
    image = p / 'side-mouth.png'
    image_record = next(row for row in report['artifacts'] if row['file'] == image.name)
    actual = pin(image)
    require((actual['bytes'], actual['sha256']) == (image_record['bytes'], image_record['sha256']), 'Changed side image')
    png = image.read_bytes()
    require(png[:8] == b'\x89PNG\r\n\x1a\n', 'Invalid side PNG')
    dimensions = struct.unpack('>II', png[16:24])
    freeze = verify(Path(report['sourceFreeze']['file']), report['sourceFreeze'])
    provider_pin = next(row['frozen'] for row in freeze['files'] if row['relative'] == 'src/wave/barrel/boundedCProfile.ts')
    return {'w': w, 'report': report, 'snapshot': snap, 'arrays': arrays, 'raw': raw, 'rawBytes': raw_bytes,
            'dimensions': dimensions, 'providerPin': provider_pin,
            'camera': report['inspection']['sideMouth']['cameraDerivation'],
            'pins': [pin(w / 'owner.json'), pin(p / 'report.json'), pin(p / 'loft-terminal.json'), actual, report['sourceFreeze']]}


def vector(c, row, point, field='positions'):
    i = 3 * (STRIDE * row + EXT + point)
    return c['arrays'][field][i:i + 3]


def sub(a, b):
    return tuple(x - y for x, y in zip(a, b))


def angle(a, b):
    length = math.hypot(*a) * math.hypot(*b)
    if not length:
        return None
    return math.degrees(math.acos(max(-1, min(1, sum(x * y for x, y in zip(a, b)) / length))))


def project(point, camera, dimensions):
    x, y, z = sub(point, camera['eye'])
    qx, qy, qz, qw = camera['quaternion']
    require(abs(qx*qx + qy*qy + qz*qz + qw*qw - 1) < 1e-10, 'Nonunit camera quaternion')
    # Inverse world quaternion; projection is column-major, exactly as the captured Three camera.
    qx, qy, qz = -qx, -qy, -qz
    tx, ty, tz = 2*(qy*z-qz*y), 2*(qz*x-qx*z), 2*(qx*y-qy*x)
    view = (x+qw*tx+qy*tz-qz*ty, y+qw*ty+qz*tx-qx*tz, z+qw*tz+qx*ty-qy*tx, 1)
    m = camera['projection']
    clip = [sum(m[4*j+i]*view[j] for j in range(4)) for i in range(4)]
    if clip[3] <= 0:
        return {'inFrustum': False, 'behindCamera': True}
    ndc = [clip[i]/clip[3] for i in range(3)]
    return {'inFrustum': all(-1 <= v <= 1 for v in ndc), 'ndc': ndc,
            'pixel': [(ndc[0]+1)*dimensions[0]/2, (1-ndc[1])*dimensions[1]/2]}


def inspect(c, fixed_camera):
    a, n = c['arrays'], c['snapshot']['counts']['slices']
    strips, incident = Counter(), Counter()
    for i in range(0, len(a['indices']), 3):
        triangle = a['indices'][i:i+3]
        require(all(0 <= v < n*STRIDE for v in triangle), 'Index outside saved geometry')
        rows = sorted(set(v//STRIDE for v in triangle))
        if len(rows) == 2 and rows[1] == rows[0]+1:
            strips[rows[0]] += 1
            for v in triangle:
                if v % STRIDE == EXT + CAP:
                    incident[v//STRIDE] += 1
    mature = set()
    for row in range(n):
        cap, floor = vector(c, row, CAP), vector(c, row, FLOOR)
        if (a['slicePhase'][row] == 1 and a['sliceWeight'][row] == 1 and incident[row] > 0
            and cap[0] == floor[0] and cap[2] == floor[2] and cap[1] > floor[1]):
            mature.add(row)
    pairs = {row for row in range(n-1) if row in mature and row+1 in mature and a['sliceJoined'][row] == 1
             and a['sliceFront'][row] == a['sliceFront'][row+1] and strips[row] == 2*(STRIDE-1)}
    eligible = {row for left in pairs for row in (left, left+1)}
    rows, spacing = [], []
    for row in sorted(eligible):
        cap = vector(c, row, CAP)
        projection = project(cap, fixed_camera, c['dimensions'])
        if not projection['inFrustum']:
            continue
        record = {'row': row, 'front': a['sliceFront'][row], 'x': vector(c, row, CREST)[0],
                  'sigma': a['sliceSigma'][row], 'tau': a['sliceTau'][row], 'cap': cap,
                  'capFloorGap': cap[1]-vector(c, row, FLOOR)[1], 'capIndexedTriangleIncidences': incident[row],
                  'capProjection': projection, 'bendDegrees': None}
        if row-1 in pairs and row in pairs:
            before, after = vector(c, row-1, CAP), vector(c, row+1, CAP)
            record['bendDegrees'] = angle(sub(cap, before), sub(after, cap))
            record['neighborDeltaX'] = [cap[0]-before[0], after[0]-cap[0]]
            record['neighborDeltaSigma'] = [a['sliceSigma'][row]-a['sliceSigma'][row-1], a['sliceSigma'][row+1]-a['sliceSigma'][row]]
            record['capNormalTurnDegrees'] = [angle(vector(c, row-1, CAP, 'normals'), vector(c, row, CAP, 'normals')),
                angle(vector(c, row, CAP, 'normals'), vector(c, row+1, CAP, 'normals'))]
        rows.append(record)
        if row in pairs and project(vector(c, row+1, CAP), fixed_camera, c['dimensions'])['inFrustum']:
            spacing.append(cap[0]-vector(c, row+1, CAP)[0])
    spacing = [abs(v) for v in spacing]
    bends = [row for row in rows if row['bendDegrees'] is not None]
    return {'counts': c['snapshot']['counts'], 'epoch': c['snapshot']['epoch'], 'selector': {
                key: c['report']['inspection']['selector'][key] for key in ('row', 'inwardRow', 'front', 'tau')},
            'eligibleIndexedPairs': len(pairs), 'visibleCapRows': rows,
            'visiblePairDeltaX': {'count': len(spacing), 'min': min(spacing) if spacing else None,
                'median': statistics.median(spacing) if spacing else None, 'max': max(spacing) if spacing else None},
            'maximumVisibleBend': max(bends, key=lambda row: row['bendDegrees']) if bends else None}


def raw_audit(base, candidate):
    def station_map(c):
        return {(c['arrays']['sliceFront'][row], vector(c, row, CREST)[0]): row
                for row in range(c['snapshot']['counts']['slices'])}
    bmap, cmap = station_map(base), station_map(candidate)
    candidate_raw = {(int(candidate['raw'][i+2]), candidate['raw'][i]): i for i in range(0, len(candidate['raw']), 9)}
    records = []
    for i in range(0, len(base['raw']), 9):
        key = (int(base['raw'][i+2]), base['raw'][i]); old = bmap.get(key)
        if old is None or base['arrays']['sliceFade'][old] <= 0:
            continue
        new, raw_index = cmap.get(key), candidate_raw.get(key)
        words_equal = raw_index is not None and base['rawBytes'][4*i:4*(i+9)] == candidate['rawBytes'][4*raw_index:4*(raw_index+9)]
        records.append({'front': key[0], 'x': key[1], 'baselineRow': old, 'candidateRow': new,
            'rawWordsEqual': words_equal, 'baselineFade': base['arrays']['sliceFade'][old],
            'baselinePhase': base['arrays']['slicePhase'][old],
            'candidateFade': candidate['arrays']['sliceFade'][new] if new is not None else None,
            'candidatePhase': candidate['arrays']['slicePhase'][new] if new is not None else None,
            'capPositionExact': vector(base, old, CAP) == vector(candidate, new, CAP) if new is not None else None,
            'stationTauExact': base['arrays']['sliceTau'][old] == candidate['arrays']['sliceTau'][new] if new is not None else None})
    return {'priorRetainedPositiveFadeRawCount': len(records), 'candidateMissingPriorLiveRaw': [r for r in records if r['candidateRow'] is None],
            'candidateAtHardVertexBudget': candidate['snapshot']['counts']['vertices'] == HARD_VERTICES,
            'capturedBudgetOrOmissionReasonAvailable': False, 'records': records}


def main():
    base = capture(BASE, 'open-mouth-owner-body-clearance/v1', 'open-mouth-capture-native-body-clearance/v1')
    candidate = capture(CAND, 'cap-refinement-owner/v1', 'cap-refinement-capture-native/v1')
    require(all(base['camera'][key] == candidate['camera'][key] for key in CAMERA_KEYS), 'Prior side camera is not exact')
    require(candidate['report']['fixedSideReferenceComparison']['poseAndProjectionExact'] is True, 'Fixed-side capture guard absent')
    b, c = inspect(base, base['camera']), inspect(candidate, base['camera'])
    prior_corner = b['maximumVisibleBend']
    matched_corner = next((row for row in c['visibleCapRows'] if prior_corner and
                          (row['front'], row['x']) == (prior_corner['front'], prior_corner['x'])), None)
    result = {'schema': 'cap-refinement-saved-loft-analysis/v1', 'complete': True, 'inputs': {
        'baseline': base['pins'], 'candidate': candidate['pins'], 'analysisSource': pin(Path(__file__).resolve())},
        'comparison': {'exactPriorSideCamera': True, 'pngDimensions': [base['dimensions'], candidate['dimensions']],
            'epochExact': base['snapshot']['epoch'] == candidate['snapshot']['epoch'],
            'rawFrontPacketBytesExact': base['rawBytes'] == candidate['rawBytes'],
            'boundedCControlsSourceExact': (base['providerPin']['bytes'], base['providerPin']['sha256']) ==
                (candidate['providerPin']['bytes'], candidate['providerPin']['sha256']),
            'selectorOrWholeGeometryEqualityRequired': False},
        'method': 'Stored phase1/weight1 with positive aligned cap64/floor104 gap; both neighboring rows must belong to same-front joined indexed266-triangle strips. Camera neighborhood is cap vertices inside exact prior side frustum, before raster depth/discard.',
        'baseline': b, 'candidate': c, 'priorMaximumBendAtSameStoredFrontX': matched_corner,
        'priorLiveRawAudit': raw_audit(base, candidate),
        'limitations': ['Raw saved geometry/normal words only; no provider, simulation, build, native or port execution.',
            'Raw packet endian metadata is absent in this writer; decoding uses the same-capture Float32 array endian flag.',
            'Frustum membership is projected vertex membership, not surviving fragment/white-cut attribution or visibility.',
            'Bend angles describe existing polylines; changes may follow different selectors, epochs or inputs, reported separately.',
            'Prior positive-fade raw rows include ordinary prethrow support; missing rows are listed, not assigned a budget/retirement cause without planner diagnostics.',
            'No image score, optical/shader cause, actual body/board entry, mouth quality, ordinary ride or FPS acceptance.']}
    print(json.dumps(result, indent=2, allow_nan=False))


if __name__ == '__main__':
    main()
