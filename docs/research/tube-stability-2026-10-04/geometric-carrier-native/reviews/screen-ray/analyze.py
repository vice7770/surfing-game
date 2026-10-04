"""Three declared screen rays through exact saved active loft words; offline only."""
import base64
import hashlib
import json
import math
from pathlib import Path
import struct

OUT = Path('/private/tmp/tube-carrier-screen-ray-review-20261004')
CAPTURE = Path('/private/tmp/tube-bounded-c-carrier-support-native-20261004')
BASE = CAPTURE / 'candidate-first'
PIXEL_INSPECTION = Path('/private/tmp/tube-carrier-video-review-20261004/pixel-inspection.json')
PIXELS = [('right-curtain', 1350, 350), ('green-wall', 450, 450), ('roof', 900, 150)]
POSITIVE_EPSILON = 1e-6
SAMPLES = 134
EXTENSION_SAMPLES = 3

def pin(p):
    data = p.read_bytes()
    return {'file': str(p), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

def check_pin(expected, path=None):
    actual = pin(path or Path(expected['file']))
    assert actual['bytes'] == expected['bytes'] and actual['sha256'] == expected['sha256'], (actual, expected)
    return {**actual, 'expectedBytesAndSha256Matched': True}

def sub(a, b): return tuple(x-y for x,y in zip(a,b))
def add(a, b): return tuple(x+y for x,y in zip(a,b))
def mul(a, s): return tuple(x*s for x in a)
def dot(a, b): return sum(x*y for x,y in zip(a,b))
def cross(a,b): return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])
def norm(a): return math.sqrt(dot(a,a))
def unit(a):
    n=norm(a)
    assert n>0 and math.isfinite(n)
    return mul(a,1/n)

def matrix_inverse(a):
    rows = [[a[4*c+r] for c in range(4)] + [float(r==c) for c in range(4)] for r in range(4)]
    for c in range(4):
        best=max(range(c,4),key=lambda r:abs(rows[r][c]));rows[c],rows[best]=rows[best],rows[c]
        assert abs(rows[c][c])>1e-15
        f=rows[c][c];rows[c]=[x/f for x in rows[c]]
        for r in range(4):
            if r!=c:
                f=rows[r][c];rows[r]=[x-f*y for x,y in zip(rows[r],rows[c])]
    return [rows[r][4+c] for c in range(4) for r in range(4)]

def matvec(m,v): return tuple(sum(m[4*c+r]*v[c] for c in range(4)) for r in range(4))

def rotate(q,v):
    # Same unit-quaternion operation as Three Vector3.applyQuaternion.
    u=q[:3];t=mul(cross(u,v),2)
    return add(v,add(mul(t,q[3]),cross(u,t)))

def region(i):
    if i<0: return 'back-extension'
    if i<32: return 'back'
    if i<60: return 'outer-roof'
    if i<68: return 'cap'
    if i<80: return 'inner-return'
    if i<88: return 'upper-root'
    if i<92: return 'face'
    if i<96: return 'lower-root'
    if i<112: return 'floor'
    if i<128: return 'toe-to-front'
    return 'front-extension'

report_pin=pin(BASE/'report.json')
report=json.loads((BASE/'report.json').read_text())
initial=next(c for c in report['checkpoints'] if c['label']=='initial')
observation=initial['observation']
camera=observation['camera']
assert camera==report['observations'][0]['camera']
assert observation['step']==0 and observation['drawEpoch']['surfaceRevisionAfter']==2
assert report['complete'] and initial['normalMeshOpacityAndVisibility']
width,height=report['initial']['viewport']['canvas']
assert [width,height]==[1708,879]

snapshot_pins=[];snapshots={};array_pins={}
format_for={'Float32Array':'f','Uint32Array':'I','Int32Array':'i','Uint8Array':'B'}
for expected in report['loftSnapshots']:
    if expected['label'] not in ['initial','first-phase2']:continue
    path=BASE/expected['file'];snapshot_pins.append(check_pin(expected,path))
    s=json.loads(path.read_text());assert s['epoch']==expected['epoch'] and s['counts']==expected['counts']
    assert s['arrayIdentitiesAndWordsUnchanged'] and not s['unusedCapacityIncluded']
    assert all(s['nonmutation'].values())
    arrays={};pins=[];rawbytes=0
    for k,a in s['arrays'].items():
        assert a['encoding']=='base64-exact-active-typed-array-words' and a['littleEndian'] is True
        raw=base64.b64decode(a['data'],validate=True)
        assert len(raw)==a['byteLength']==a['count']*struct.calcsize(format_for[a['dtype']])
        arrays[k]=struct.unpack('<'+format_for[a['dtype']]*a['count'],raw)
        rawbytes+=len(raw)
        pins.append({'array':k,'dtype':a['dtype'],'count':a['count'],'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
    assert rawbytes==s['rawBytes']==expected['rawBytes']
    assert len(arrays['positions'])==len(arrays['normals'])==3*s['counts']['vertices']
    assert len(arrays['indices'])==s['counts']['indices']
    assert s['counts']['vertices']==SAMPLES*s['counts']['slices']
    assert all(0<=i<s['counts']['vertices'] for i in arrays['indices'])
    snapshots[s['label']]={'metadata':{k:v for k,v in s.items() if k!='arrays'},'arrays':arrays}
    array_pins[s['label']]=pins
assert set(snapshots)=={'initial','first-phase2'}

png_expected=next(a for a in report['artifacts'] if a['file']=='0-initial.png')
png_pin=check_pin(png_expected,BASE/'0-initial.png')
pngdata=(BASE/'0-initial.png').read_bytes();assert struct.unpack('>II',pngdata[16:24])==(width,height)
pixel_note_pin=pin(PIXEL_INSPECTION)
pixel_note=json.loads(PIXEL_INSPECTION.read_text())
assert next(p for p in pixel_note['pngCheckpointsViewed'] if p['label']=='initial')['sha256']==png_pin['sha256']

needed_source=['package.json','package-lock.json','src/wave/barrel/sweptLoft.ts',
 'src/wave/barrel/ProfileLibrary.ts','src/wave/barrel/boundedCProfile.ts','src/wave/barrel/lipSheet.ts',
 'src/wave/barrel/sharedUpperRoot.ts','src/scene/waterOptics.ts',
 'src/scene/barrel/SweptBarrelMesh.ts','src/scene/barrel/SweptBarrel.ts',
 'src/scene/barrel/barrelMaskGlsl.ts','src/scene/water/richWaterGlsl.ts',
 'src/game/PhysicalMode.ts']
source=Path(report['seal']['source']);source_manifest={p['file']:p for p in report['seal']['sourcePins']}
source_pins=[check_pin(source_manifest[str(source/rel)]) for rel in needed_source]
helper_manifest=json.loads((CAPTURE/'helper-pins.json').read_text())
helper_map={p['file']:p for p in helper_manifest}
helper_pins=[check_pin(helper_map[str(CAPTURE/name)]) for name in ['moving-shape.mjs','loft-snapshot-tools.mjs']]
lock=json.loads((source/'package-lock.json').read_text())
three=lock['packages']['node_modules/three'];assert three['version']=='0.186.1'
dependency_pins=[pin(source/'node_modules/three'/p) for p in [
 'src/renderers/shaders/ShaderChunk/normal_vertex.glsl.js',
 'src/renderers/shaders/ShaderChunk/normal_fragment_begin.glsl.js',
 'src/renderers/shaders/ShaderChunk/defaultnormal_vertex.glsl.js',
 'src/math/Vector3.js']]

l=snapshots['initial']['arrays'];pos=l['positions'];normal=l['normals'];idx=l['indices']
v3=lambda a,i:tuple(a[3*i:3*i+3])
component_by_row={};components=[]
row=0
while row<len(l['sliceFront']):
    first=row;front=l['sliceFront'][row]
    while row+1<len(l['sliceFront']) and l['sliceJoined'][row]==1:
        assert l['sliceFront'][row+1]==front
        row+=1
    component={'front':front,'firstRow':first,'lastRow':row,'sigmaMin':l['sliceSigma'][first],'sigmaMax':l['sliceSigma'][row]}
    # Corroborate the known helper component identity; do not invent IDs for other runs.
    for c in observation['cameraColumns']['eye']['covering']:
        actual=c['component']
        if all(component[k]==actual[k] for k in component):component['capturedHelperLocalId']=actual['localId'];break
    components.append(component)
    for rr in range(first,row+1):component_by_row[rr]=component
    row+=1

triangles=[]
for off in range(0,len(idx),3):
    ids=idx[off:off+3];a,b,c=[v3(pos,i) for i in ids];e1=sub(b,a);e2=sub(c,a);g=cross(e1,e2)
    normals=[v3(normal,i) for i in ids];summed=tuple(sum(n[k] for n in normals) for k in range(3))
    facing=dot(g,summed);flipped=facing<0
    triangles.append({'triangle':off//3,'ids':ids,'a':a,'e1':e1,'e2':e2,'geometricNormal':g,
                      'normals':normals,'facing':facing,'flipped':flipped})

def intersections(origin,direction,min_t=0,excluded_triangle=None):
    hits=[]
    for t in triangles:
        if t['triangle']==excluded_triangle:continue
        h=cross(direction,t['e2']);det=dot(t['e1'],h)
        if abs(det)<1e-12:continue
        inv=1/det;s=sub(origin,t['a']);u=dot(s,h)*inv
        if u < -1e-10 or u > 1+1e-10:continue
        q=cross(s,t['e1']);v=dot(direction,q)*inv
        if v < -1e-10 or u+v > 1+1e-10:continue
        distance=dot(t['e2'],q)*inv
        if distance<=min_t:continue
        hits.append((distance,t,(1-u-v,u,v)))
    return sorted(hits,key=lambda h:(h[0],h[1]['triangle']))

def describe(h,origin,direction):
    distance,t,weights=h;ids=t['ids'];rows=[i//SAMPLES for i in ids];contours=[i%SAMPLES-EXTENSION_SAMPLES for i in ids]
    supplied=unit(tuple(sum(w*n[k] for w,n in zip(weights,t['normals'])) for k in range(3)))
    # Three normal_vertex first normalizes each supplied vertex normal, then fragment normal is normalized.
    per_vertex=[unit(n) for n in t['normals']]
    interpolated=unit(tuple(sum(w*n[k] for w,n in zip(weights,per_vertex)) for k in range(3)))
    draw_geometric=mul(unit(t['geometricNormal']),-1 if t['flipped'] else 1)
    front_facing=dot(draw_geometric,direction)<0
    oriented=mul(interpolated,1 if front_facing else -1)
    point=add(origin,mul(direction,distance))
    barycentric_point=tuple(sum(w*v3(pos,i)[k] for w,i in zip(weights,ids)) for k in range(3))
    closure=norm(sub(point,barycentric_point));assert closure<1e-9
    details={'triangle':t['triangle'],'rawVertexIds':ids,
      'intendedDrawVertexIds':(ids[0],ids[2],ids[1]) if t['flipped'] else ids,
      'distanceMeters':distance,'point':point,'rayBarycentricClosureResidualMeters':closure,
      'barycentricWeightsInRawOrder':weights,'sliceRows':rows,'contourIndices':contours,
      'contourRegions':[region(i) for i in contours],
      'component':component_by_row[rows[0]],
      'slices':[{'row':r,'front':l['sliceFront'][r],'sigma':l['sliceSigma'][r],
        'tau':l['sliceTau'][r],'phase':l['slicePhase'][r],'fade':l['sliceFade'][r],
        'weight':l['sliceWeight'][r],'formed':l['sliceFormed'][r]} for r in sorted(set(rows))],
      'suppliedVertexNormals':t['normals'],'suppliedVertexNormalLengths':[norm(n) for n in t['normals']],
      'normalizedBarycentricSuppliedNormal':supplied,
      'normalizedBarycentricAfterVertexNormalization':interpolated,
      'rawGeometricUnitNormal':unit(t['geometricNormal']),
      'rawCrossDotSummedNormals':t['facing'],'intendedFacesOutWindingFlipped':t['flipped'],
      'intendedDrawGeometricUnitNormal':draw_geometric,'intendedDrawFrontFacing':front_facing,
      'doubleSideFaceDirection':1 if front_facing else -1,
      'idealUnperturbedOrientedWorldNormal':oriented,
      'suppliedVsDrawGeometricDot':dot(interpolated,draw_geometric),
      'orientedNormalDotIncidentRay':dot(oriented,direction)}
    assert all(component_by_row[r]==details['component'] for r in rows)
    return details

def f32(v):return struct.unpack('<f',struct.pack('<f',v))[0]

def attributes_for_vertex(vertex):
    row=vertex//SAMPLES
    rx,rz=l['sliceRayX'][row],l['sliceRayZ'][row]
    a=v3(pos,row*SAMPLES+EXTENSION_SAMPLES+40)
    b=v3(pos,row*SAMPLES+EXTENSION_SAMPLES+60)
    across=(b[0]-a[0])*rx+(b[2]-a[2])*rz;up=b[1]-a[1]
    chord=math.sqrt(across*across+up*up)
    lip_across,lip_up=(-up/chord,across/chord) if chord>0 else (0,1)
    return {'tube':(l['sliceTipX'][row],l['sliceTipY'][row],l['sliceTipZ'][row],l['sliceMouth'][row]),
       'ray':(rx,rz,f32(lip_across),f32(lip_up)),
       'throat':l['throat'][4*vertex:4*vertex+4],
       'sheet':(l['sheet'][vertex],l['sheetWeight'][vertex],l['sheetBack'][vertex])}

def ideal_swept_leaves(nearest,direction):
    ids=nearest['rawVertexIds'];weights=nearest['barycentricWeightsInRawOrder']
    attrs=[attributes_for_vertex(i) for i in ids]
    blended={k:tuple(sum(w*a[k][j] for w,a in zip(weights,attrs)) for j in range(4)) for k in ['tube','ray','throat']}
    tube,ray,throat=blended['tube'],blended['ray'],blended['throat'];point=nearest['point']
    tip=((tube[0]-point[0])*ray[0]+(tube[2]-point[2])*ray[1],tube[1]-point[1])
    across=(direction[0]*ray[0]+direction[2]*ray[1],direction[1])
    along=abs(direction[0]*ray[1]-direction[2]*ray[0])
    determinant=across[0]*tip[1]-across[1]*tip[0]
    opening=across[1]>=0 and determinant>=0
    lhs=along*norm(tip);rhs=tube[3]*norm(across);mouth=lhs>rhs
    leaves=opening or mouth
    factor=(1-throat[3])+throat[3]*(1 if leaves else 0)
    stricter_opening=opening and across[0]>=0 and tip[1]>=0
    return {'generatedAttributeSource':'SweptBarrelMesh.update lines423–446; thickness endpoints40/60; CPU lip normal rounded into F32 ray attribute',
       'generatedPerVertexAttributes':attrs,'barycentricAttributes':blended,
       'tipRelativeToFragmentAcrossUp':tip,'idealReflectedAcrossUp':across,'absoluteAlong':along,
       'openingNonnegativeUp':across[1]>=0,'openingDeterminant':determinant,'openingTerm':opening,
       'mouthLeftAlongTimesTipLength':lhs,'mouthRightDistanceTimesAcrossLength':rhs,'alongMouthTerm':mouth,
       'idealSourceSweptLeaves':leaves,'throatWeight':throat[3],
       'idealSourceReflectedRadianceMultiplier':factor,
       'sameMeshIdealReflectionRehitPresent':True,
       'positiveIdealGateDespiteMeshRehit':factor>0,
       'tipBelowFragment':tip[1]<0,'backwardAcross':across[0]<0,'upwardDirection':across[1]>=0,
       'specificBelowTipBackwardUpwardOpeningPass':tip[1]<0 and across[0]<0 and across[1]>=0 and opening,
       'openingWithAdditionalAcrossAndTipNonnegativeGuards':stricter_opening,
       'actualGpuFragmentAttributeNormalGateOrRadianceClaim':False}

def angle(a,b):return math.acos(max(-1,min(1,dot(unit(a),unit(b)))))

def refract(incident,normal,eta):
    cosine=dot(normal,incident);k=1-eta*eta*(1-cosine*cosine)
    outgoing=(0,0,0) if k<0 else sub(mul(incident,eta),mul(normal,eta*cosine+math.sqrt(k)))
    return {'vector':outgoing,'length':norm(outgoing),'discriminant':k,'totalInternalReflection':k<0,'incidentDotNormal':cosine,'eta':eta}

def transmission(incident,entry,outer):
    entry_outer_dot=dot(entry,outer);far=outer if entry_outer_dot>=0 else mul(outer,-1)
    inside=refract(incident,entry,0.750188)
    outgoing=refract(inside['vector'],far,1.333000)
    towards=dot(inside['vector'],far)<0;nonzero=outgoing['length']>0
    return {'entryNormal':entry,'exitOuterNormal':outer,'entryDotExitOuter':entry_outer_dot,
       'farInwardNormal':far,'inside':inside,'outgoing':outgoing,
       'insideDotFarInward':dot(inside['vector'],far),
       'towardsFarInterfaceGate':towards,'nonzeroOutgoingGate':nonzero,
       'idealSkyTransmissionGate':towards and nonzero,
       'idealSkyRay':outgoing['vector'] if towards and nonzero else incident,
       'etaAuthority':'WATER_IOR=1.333; shader source literals toFixed(6):0.750188 and1.333000',
       'actualGPUOrActualExitIntersectionClaim':False}

def ideal_sheet_transmission(label,nearest,incident):
    ids=nearest['rawVertexIds'];weights=nearest['barycentricWeightsInRawOrder'];entry=nearest['idealUnperturbedOrientedWorldNormal']
    attrs=[attributes_for_vertex(i) for i in ids]
    ray=tuple(sum(w*a['ray'][j] for w,a in zip(weights,attrs)) for j in range(4))
    sheet=tuple(sum(w*a['sheet'][j] for w,a in zip(weights,attrs)) for j in range(3))
    mean=unit((ray[2]*ray[0],ray[3],ray[2]*ray[1]))
    result={'perVertexSheetThicknessWeightBack':[a['sheet'] for a in attrs],
       'barycentricSheet':{'thickness':sheet[0],'weight':sheet[1],'back':sheet[2]},
       'idealWaterViewCos':-dot(entry,incident),'litBodyBranchAllowedByIdealViewCos':-dot(entry,incident)>0,
       'meanOuterExitNormal':mean,'meanExit':transmission(incident,entry,mean),
       'sheetIsActiveAtIdealHit':sheet[1]>0,
       'environmentScalarSupportWithoutFresnelAttenuationFoam':sheet[1]*sheet[2]*(1 if transmission(incident,entry,mean)['idealSkyTransmissionGate'] else 0),
       'pairedExteriorStatus':{'available':False,'reason':'Outside shared68–88 underside contour domain'},
       'actualTransmissionRadianceOrCurtainCausalityClaim':False}
    contours=nearest['contourIndices']
    if all(68<=i<=88 for i in contours):
        pairs=[i//SAMPLES*SAMPLES+EXTENSION_SAMPLES+(126-(i%SAMPLES-EXTENSION_SAMPLES)) for i in ids]
        separations=[sub(v3(pos,j),v3(pos,i)) for i,j in zip(ids,pairs)]
        aligned=all(d[0]==0 and d[2]==0 and d[1]>=0 for d in separations)
        result['pairedExteriorStatus']={'available':aligned,'outerContourIndices':[j%SAMPLES-EXTENSION_SAMPLES for j in pairs],
           'outerVertexIds':pairs,'outerMinusInnerPositions':separations,
           'storedWorldXZExactAndNonnegativeVerticalSeparation':aligned,
           'pairingAuthority':'sharedUpperRoot.ts:56 j=126-i; sweptLoft.ts:817–845 shares final stored X/Z',
           'pairedPointIsVerticalCorrespondenceNotActualRefractedExit':True}
        if label=='right-curtain' and aligned:
            outer=[v3(normal,j) for j in pairs]
            local=unit(tuple(sum(w*unit(n)[k] for w,n in zip(weights,outer)) for k in range(3)))
            curvature=[]
            for j in pairs:
                p0,p1,p2=v3(pos,j-1),v3(pos,j),v3(pos,j+1)
                a,b=sub(p1,p0),sub(p2,p1);turn=angle(a,b);ds=(norm(a)+norm(b))/2
                curvature.append({'vertex':j,'row':j//SAMPLES,'outerContour':j%SAMPLES-EXTENSION_SAMPLES,
                   'discreteContourTurnRadians':turn,'meanNeighborSegmentLengthMeters':ds,
                   'discreteTurnPerMeanLengthInverseMeters':turn/ds,
                   'notContinuousPrincipalCurvature':True})
            alternative=transmission(incident,entry,local)
            result['curtainPairedExteriorHypothesis']={'pairedSuppliedVertexNormals':outer,
               'pairedWorldPoint':tuple(sum(w*v3(pos,j)[k] for w,j in zip(weights,pairs)) for k in range(3)),
               'locallyPairedInterpolatedOuterNormal':local,
               'angleFromMeanExitDegrees':math.degrees(angle(local,mean)),
               'pairedVertexAnglesFromMeanDegrees':[math.degrees(angle(n,mean)) for n in outer],
               'maximumPairedVertexNormalVariationDegrees':max(math.degrees(angle(a,b)) for a in outer for b in outer),
               'discreteExteriorContourCurvature':curvature,
               'hypotheticalLocalExit':alternative,
               'meanAndLocalGateDiffer':alternative['idealSkyTransmissionGate']!=result['meanExit']['idealSkyTransmissionGate'],
               'outgoingAngleDifferenceDegrees':math.degrees(angle(alternative['outgoing']['vector'],result['meanExit']['outgoing']['vector'])) if alternative['outgoing']['length']>0 and result['meanExit']['outgoing']['length']>0 else None,
               'sameEntryRayNormalOnlyExitApproximationChanged':True,
               'hypotheticalAlternativeNotGPUOrActualRefractionExitProof':True}
        elif aligned:result['pairedExteriorStatus']['hypotheticalAlternativeNotComputed']='Scope specifies paired-normal alternative only for curtain'
    return result

inverse_projection=matrix_inverse(camera['projection']);q=camera['quaternion'];origin=tuple(camera['position'])
assert abs(dot(q,q)-1)<1e-12
results=[]
for label,x,y in PIXELS:
    ndc=(2*x/width-1,1-2*y/height)
    local4=matvec(inverse_projection,(ndc[0],ndc[1],-1,1))
    local=tuple(v/local4[3] for v in local4[:3]);direction=unit(rotate(q,local))
    inverse_q=(-q[0],-q[1],-q[2],q[3]);local_direction=rotate(inverse_q,direction)
    clip=matvec(camera['projection'],(*local_direction,1))
    reconstructed=(width*(clip[0]/clip[3]+1)/2,height*(1-clip[1]/clip[3])/2)
    assert max(abs(reconstructed[0]-x),abs(reconstructed[1]-y))<1e-9
    hits=intersections(origin,direction)
    output={'labelFromRootPixelInspection':label,'continuousPngPixelCenter':[x,y],'ndc':ndc,
      'rayOrigin':origin,'unitRayDirection':direction,'reprojectedPixelCenter':reconstructed,
      'doubleSidedTrianglesTested':len(triangles),'positiveIntersectionCount':len(hits),
      'intersections':[describe(h,origin,direction) for h in hits]}
    if hits:
        nearest=output['intersections'][0];n=nearest['idealUnperturbedOrientedWorldNormal']
        mirror=unit(sub(direction,mul(n,2*dot(direction,n))))
        mirror_hits=intersections(nearest['point'],mirror,POSITIVE_EPSILON,nearest['triangle'])
        output['idealUnperturbedReflection']={'origin':nearest['point'],'unitDirection':mirror,
          'normalSignFlipDoesNotChangeIdealReflectionDirection':True,
          'minimumPositiveDistanceMeters':POSITIVE_EPSILON,'originTriangleExcluded':nearest['triangle'],
          'doubleSidedTrianglesTested':len(triangles)-1,'positiveIntersectionCount':len(mirror_hits),
          'intersections':[describe(h,nearest['point'],mirror) for h in mirror_hits],
          'nearestOtherIndexedLoftHit':describe(mirror_hits[0],nearest['point'],mirror) if mirror_hits else None,
          'actualShaderReflectionOrEnvironmentAdmissibilityClaim':False}
        output['idealUnperturbedReflection']['idealSourceSweptLeavesEvaluation']=ideal_swept_leaves(nearest,mirror)
        output['idealSourceRichSheetTransmission']=ideal_sheet_transmission(label,nearest,direction)
    results.append(output)

output={'schema':'three-declared-initial-screen-rays-exact-loft/v1',
 'scope':'Nearest indexed BARREL geometry and ideal unperturbed supplied-normal reflection only',
 'pixelConvention':'Literal continuous PNG center coordinates, top-left origin; no half-pixel offset',
 'allowedInputPixels':PIXELS,'onlyEpochUsedForIntersections':'initial',
 'camera':camera,'viewport':[width,height],'initialEpoch':snapshots['initial']['metadata']['epoch'],
 'pins':{'report':report_pin,'sidecars':snapshot_pins,'initialPng':png_pin,
   'rootPixelInspection':pixel_note_pin,'sourceVerifiedAgainstCaptureSeal':source_pins,
   'helpersVerifiedAgainstHelperPins':helper_pins,'threeLockEntry':three,
   'localThreeReferenceFiles':dependency_pins,
   'localThreeFilesAreNotIndividuallyInCaptureSourceSeal':True},
 'snapshotArrayPins':array_pins,'components':components,'results':results,
 'method':{'intersection':'Double-sided Moller-Trumbore in double arithmetic on decoded exact F32 vertex words',
   'determinantEpsilon':1e-12,'barycentricTolerance':1e-10,
   'screenRay':'Inverse recorded column-major projection at NDC near plane, then recorded unit quaternion',
   'normal':'Record raw barycentric supplied normal and renderer vertex-normalized interpolation; orient via intended facesOut winding and DoubleSide',
   'reflection':'reflect(incidentRay, oriented ideal supplied normal); same complete initial indexed loft; bounded ideal source sweptLeaves and RICH_SHEET_TRANSMISSION evaluation on only the same three rays',
   'facesOut':'Reproduce source default facesOut=true. No saved post-update GPU index/transform/readback is available.',
   'worldTransform':'Saved positions declare world coordinates; source creates identity Mesh and attaches directly to scene. No GPU matrix readback is retained.'},
 'limitations':['Ordinary-water geometry, mask texture/dither outcome, depth-buffer owner and other draw objects are unavailable.',
   'Chop/ripple fragment perturbation and final shader output are unavailable; these are ideal unperturbed normals and reflections.',
   'Nearest BARREL hit and ideal source sweptLeaves evaluation do not establish per-pixel GPU ownership, curtain material causality or actual reflection admissibility.',
   'Source intended draw winding is reconstructed; captured raw loft indices do not contain GPU post-update winding.',
   'No alternate pixel, state, view, native render, resource, build or runtime modification was used.',
   'Contour ranges identify surface regions; complete contour extent is not cavity width or a body/mouth/FPS acceptance metric.'],
 'claims':{'perPixelGpuOwnership':False,'actualShaderNormalOrReflection':False,'curtainMaterialCausality':False,
   'reflectionEnvironmentAdmissibility':False,'bodyOrMouthAcceptance':False,'fpsAcceptance':False}}
output['pinsUnchangedAfterAnalysis']={'report':pin(BASE/'report.json')==report_pin,
 'sidecars':all(check_pin(p)==p for p in snapshot_pins),
 'initialPng':check_pin(png_pin)==png_pin,'rootPixelInspection':pin(PIXEL_INSPECTION)==pixel_note_pin,
 'source':all(check_pin(p)==p for p in source_pins),'helpers':all(check_pin(p)==p for p in helper_pins)}
assert all(output['pinsUnchangedAfterAnalysis'].values())
(OUT/'report.json').write_text(json.dumps(output,indent=2)+'\n')
for result in results:
    hit=result['intersections'][0] if result['intersections'] else None
    reflection=result.get('idealUnperturbedReflection',{}).get('nearestOtherIndexedLoftHit')
    print(json.dumps({'label':result['labelFromRootPixelInspection'],'hits':result['positiveIntersectionCount'],
      'nearest':None if hit is None else {k:hit[k] for k in ['triangle','distanceMeters','sliceRows','contourIndices','contourRegions','component','intendedFacesOutWindingFlipped','intendedDrawFrontFacing','idealUnperturbedOrientedWorldNormal']},
      'idealReflectionNext':None if reflection is None else {k:reflection[k] for k in ['triangle','distanceMeters','sliceRows','contourIndices','contourRegions','component']}}))
print(json.dumps({'report':pin(OUT/'report.json'),'inputPinsUnchanged':output['pinsUnchangedAfterAnalysis']}))
