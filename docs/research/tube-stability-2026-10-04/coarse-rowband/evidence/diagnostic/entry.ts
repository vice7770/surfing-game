import { AmbientLight, Color, CubeCamera, DirectionalLight, FogExp2, NeutralToneMapping, PerspectiveCamera,
  PMREMGenerator, Scene, Vector3, WebGLCubeRenderTarget, WebGLRenderer, type BufferGeometry, type Material, type Mesh, type Texture, type Vector2, type Vector4 } from 'three';
import { PhysicalMode } from '@arm/game/PhysicalMode';
import { SnapshotSampler, SnapshotSurfZone, type SurfZoneHost, type SurfZoneInit, type SurfZoneSnapshot } from '@arm/game/SurfZoneHost';
import { PhysicalSurfaceSource } from '@arm/scene/PhysicalSurfaceSource';
import { WaterSurface } from '@arm/scene/WaterSurface';
import { SweptBarrel } from '@arm/scene/barrel/SweptBarrel';
import { SpotSeabed } from '@arm/scene/SpotSeabed';
import { Environment } from '@arm/scene/Environment';
import { CausticMap, CAUSTIC_WINDOW } from '@arm/scene/CausticMap';
import { BACKDROP_TIME, TIMES } from '@arm/game/SurfConditions';
import { libraryFromBytes, barrelCasesFor } from '@arm/wave/barrel/barrelLibrary';
import type { LoftResult } from '@arm/wave/barrel/sweptLoft';
import { FRONT_FIELD as F, FRONT_STRIDE } from '@arm/wave/barrel/frontRecords';
import cameras from './cameras.json';
declare const __ROWBAND_DIAGNOSTIC_CANDIDATE__: boolean;
const WIDTH = 960, HEIGHT = 540;
const ARM = __ROWBAND_DIAGNOSTIC_CANDIDATE__ ? 'candidate' : 'baseline';
const assert: (value: unknown, message: string) => asserts value = (value, message) => { if (!value) throw Error(message); };
const hash = async (bytes: ArrayBufferView) => {
  const owned = new Uint8Array(bytes.byteLength); owned.set(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', owned)), n => n.toString(16).padStart(2, '0')).join('');
};
interface Field { name: string; type: 'F32' | 'F64'; offset: number; bytes: number; length: number; sha256: string }
interface Frame {
  index: number; step: number; time: number; seaTime: number; grid: { xMin: number; zMin: number; spacing: number; nx: number; nz: number };
  windowXMin: number; frontCount: number; actualTubeCount: number;
  selected: { pointId: number; jetStrip: number; sourceOrdinal: number; point: { front: number; sigma: number; x: number; z: number; tau: number }; strip: unknown };
  fields: Field[];
}
interface Capture {
  status: string; firstStep: number; lastStep: number; dt: number; shared: Field[]; frames: Frame[];
  meta: { solverGrid: { dx: number }; fixture: { tide: number }; renderGrid: Frame['grid'] };
  binary: { storedSha256: string; storedBytes: number; expandedSha256: string; expandedBytes: number };
}
interface Decoded { frame: Frame; front: Float32Array; surface: Float32Array; flow: Float32Array; aeration: Float32Array; tubes: Float32Array }
interface PlaybackHost { init: SurfZoneInit; snapshot: SurfZoneSnapshot; heightAt(x: number, z: number): number }
const apiWindow = window as unknown as { rowbandDiagnosticQA?: unknown };
const STAGES = __ROWBAND_DIAGNOSTIC_CANDIDATE__
  ? ['initial-narrow', 'repeat-narrow', 'private-full', 'repeat-private-full', 'source-alias-full', 'restore-narrow']
  : ['initial-full', 'repeat-full-1', 'repeat-full-2'];
const base64 = (bytes: Uint8Array) => {
  let binary = ''; for (let o = 0; o < bytes.length; o += 8192) binary += String.fromCharCode(...bytes.subarray(o, o + 8192));
  return btoa(binary);
};
interface CompiledProgram { id: number; cacheKey: string; program: WebGLProgram; vertexShader: WebGLShader; fragmentShader: WebGLShader }
interface PassiveWater { uniforms: { waterBarrelMask: { value: Texture }; waterBarrelGrid: { value: Vector4 }; waterBarrelGridSize: { value: Vector2 }; waterBarrelMaskActive: { value: number }; waterBarrelScreenFallback: { value: number } } }
async function start() {
  const capture = await (await fetch('/capture/manifest.json')).json() as Capture;
  assert(capture.status === 'passed' && capture.firstStep === 664 && capture.lastStep === 684 && capture.frames.length === 21, 'Reviewed exact natural-cycle capture required');
  const compressed = new Uint8Array(await (await fetch('/capture/frames.bin.gz')).arrayBuffer());
  assert(compressed.length === capture.binary.storedBytes && await hash(compressed) === capture.binary.storedSha256, 'Stored capture bytes differ');
  const raw = await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  assert(raw.byteLength === capture.binary.expandedBytes && await hash(new Uint8Array(raw)) === capture.binary.expandedSha256, 'Expanded capture bytes differ');
  const decode = async (field: Field): Promise<Float32Array> => {
    assert(field.type === 'F32' && field.bytes === 4 * field.length && field.offset % 4 === 0, 'Renderer decodes required F32 planes only');
    // Whole owned field bytes preserve every F32 bit; F64 provenance with unaligned offsets is never interpreted here.
    const bytes = raw.slice(field.offset, field.offset + field.bytes);
    const array = new Float32Array(bytes);
    assert(await hash(array) === field.sha256, 'Captured F32 field differs: ' + field.name);
    return array;
  };
  const bedField = capture.shared.find(f => f.name === 'renderBed'); assert(bedField, 'Shared real renderbed missing');
  const bed = await decode(bedField);
  // Decode only the unchanged first actual frame. Full manifest/binary authority remains verified.
  const frame = capture.frames[0];
  assert(frame.index === 0 && frame.step === 664 && frame.selected.pointId === 3 && frame.selected.jetStrip === 2, 'Fixed first physical frame required');
  const field = (name: string) => { const f = frame.fields.find(v => v.name === name); assert(f, 'Captured field missing: ' + name); return f; };
  const initial: Decoded = { frame, front: await decode(field('frontControls')), surface: await decode(field('surface')),
    flow: await decode(field('flow')), aeration: await decode(field('aeration')), tubes: await decode(field('actualTubeTable')) };
  const cases = barrelCasesFor('padang'); assert(cases.length === 4, 'Four actual authored cases required');
  const bytes = await Promise.all(cases.map(async c => new Uint8Array(await (await fetch('/' + c.asset)).arrayBuffer())));
  const library = libraryFromBytes(bytes);
  const renderer = new WebGLRenderer({ antialias: true, stencil: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(WIDTH, HEIGHT, false); renderer.outputColorSpace = 'srgb';
  renderer.toneMapping = NeutralToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.domElement.style.width = WIDTH + 'px'; renderer.domElement.style.height = HEIGHT + 'px'; document.body.append(renderer.domElement);
  const gl = renderer.getContext(); assert(gl.getContextAttributes()?.stencil === true, 'Both full/rowband fallback arms require literal held stencil context');
  const framePixels = new Uint8Array(WIDTH * HEIGHT * 4);
  renderer.debug.onShaderError = (_gl, _program, vertex, fragment) => { throw Error('Normal production shader failed: ' + gl.getShaderInfoLog(vertex) + ' ' + gl.getShaderInfoLog(fragment)); };
  const scene = new Scene(); scene.background = new Color('#b8e3e5');
  const environment = new Environment(); const sunSettings = TIMES[BACKDROP_TIME];
  environment.setSunPosition(sunSettings.sunHeight, sunSettings.sunDirection); scene.add(environment.group);
  scene.add(new AmbientLight('#d8d9cd', 1.5));
  const fill = new DirectionalLight('#76c6d3', .8); fill.position.set(8, 4, -10); scene.add(fill);
  const sunlight = new DirectionalLight('#ffe7bd', 1.2 + .6 * sunSettings.sunHeight);
  sunlight.position.copy(environment.sunPosition).normalize().multiplyScalar(45); scene.add(sunlight);
  const camera = new PerspectiveCamera(50, WIDTH / HEIGHT, .05, 1600);
  const host = {
    init: { grid: { ...initial.frame.grid }, bed, focus: { x: initial.frame.selected.point.x, z: initial.frame.selected.point.z },
      windowXMin: initial.frame.windowXMin, dx: capture.meta.solverGrid.dx },
    snapshot: { front: initial.front, frontCount: initial.frame.frontCount, surface: initial.surface, flow: initial.flow,
      aeration: initial.aeration, tubes: initial.tubes, tubeCount: initial.frame.actualTubeCount,
      status: { seaTime: initial.frame.seaTime, naturalFrame: 0 } } as unknown as SurfZoneSnapshot,
    heightAt(x: number, z: number) { return SnapshotSampler.prototype.heightAt.call(this as unknown as SnapshotSampler, x, z); },
  } as PlaybackHost;
  // Only init/snapshot/heightAt are consumed. Unused live-host control/export/disposal methods are intentionally absent.
  const zone = new SnapshotSurfZone(host as unknown as SurfZoneHost, { sweptBarrel: true });
  const source = new PhysicalSurfaceSource(zone, initial.frame.grid.spacing);
  const water = new WaterSurface(source); water.setLook('rich'); water.setBarrelScreenFallback(gl.getContextAttributes()?.stencil === true);
  assert(typeof water.setBarrelScreenFallback === 'function', 'Both compiled arms must expose the reviewed fallback capability');
  water.setSun(environment.sunPosition.clone().normalize(), sunlight.color.clone().multiplyScalar(sunlight.intensity)); scene.add(water.mesh);
  const barrel = new SweptBarrel(water, async () => library); barrel.setSpot('padang'); await barrel.ready; scene.add(barrel.mesh.mesh);
  const seabed = new SpotSeabed();
  seabed.setDepthOnGrid((x, z) => -SnapshotSampler.prototype.bedAt.call(host as unknown as SnapshotSampler, x, z),
    Array.from({ length: initial.frame.grid.nx }, (_, k) => initial.frame.grid.xMin + k * initial.frame.grid.spacing),
    Array.from({ length: initial.frame.grid.nz }, (_, k) => initial.frame.grid.zMin + k * initial.frame.grid.spacing));
  seabed.useCaustics(water.causticUniforms, { waterAttenuation: water.attenuation, waterSunDirection: water.causticSource.waterSunDirection }); scene.add(seabed.mesh);
  const caustics = new CausticMap(water.causticSource, water.causticUniforms);
  // Normal production painted-sky fallback reflection recipe; no photo assets or diagnostic shader edits.
  const hidden = [water.mesh, barrel.mesh.mesh, seabed.mesh, environment.sunMesh]; const shown = hidden.map(m => m.visible); hidden.forEach(m => { m.visible = false; });
  const cube = new WebGLCubeRenderTarget(128); const cubeCamera = new CubeCamera(.1, 180, cube); cubeCamera.position.set(0, .6, 0); cubeCamera.update(renderer, scene);
  const pmrem = new PMREMGenerator(renderer); const reflection = pmrem.fromCubemap(cube.texture);
  water.mesh.material.envMap = reflection.texture; water.mesh.material.needsUpdate = true;
  cube.dispose(); pmrem.dispose(); hidden.forEach((m, k) => { m.visible = shown[k]; });
  const mode = { host, sweptBarrel: barrel, config: { tide: capture.meta.fixture.tide }, swept: true, shown: true, camera: { camera } } as unknown as PhysicalMode;
  let previous = -1, setupCalls = 0, causticCalls = 0;
  let savedView: BufferGeometry | undefined, savedHook: Mesh['onBeforeRender'] | undefined;
  let fixedPrimary: { coarse: ReturnType<typeof range>; patch: ReturnType<typeof range> } | undefined;
  let below = false; let fixedCaustic: Texture | null = null;
  const projection = new Vector3(); const ahead = new Vector3();
  const range = (geometry: BufferGeometry) => {
    const { start, count } = geometry.drawRange, indexCount = geometry.index?.count ?? 0;
    const effectiveStart = Math.max(0, Math.min(start, indexCount));
    const effectiveCount = Math.max(0, Math.min(count, indexCount - effectiveStart));
    return { start, count: Number.isFinite(count) ? count : 'Infinity', indexCount, effectiveStart, effectiveCount };
  };
  const rowRanges = (coarseBefore: ReturnType<typeof range>, patchBefore: ReturnType<typeof range>) => {
    const owner = water.mesh.geometry, patch = water.patch.geometry, repair = water.barrelFallback, repairPatch = water.barrelPatchFallback;
    assert(JSON.stringify(range(owner)) === JSON.stringify(coarseBefore) && JSON.stringify(range(patch)) === JSON.stringify(patchBefore), 'Fallback modified original primary draw range');
    const attributesShared = !!repair && repair.geometry.attributes === owner.attributes;
    const indexShared = !!repair && repair.geometry.index === owner.index;
    if (repair) {
      assert(attributesShared && indexShared, 'Actual fallback attribute/index ownership differs');
      const shouldAlias = !__ROWBAND_DIAGNOSTIC_CANDIDATE__ || STAGES[previous] === 'source-alias-full';
      assert(shouldAlias ? repair.geometry === owner : repair.geometry === savedView && repair.geometry !== owner, 'Diagnostic private/alias geometry identity differs');
      const original = range(owner), selected = range(repair.geometry);
      assert(selected.effectiveStart >= original.effectiveStart && selected.effectiveStart + selected.effectiveCount <= original.effectiveStart + original.effectiveCount, 'Private view widens original draw interval');
    }
    assert(!repairPatch || repairPatch.geometry === patch, 'Rich repair must retain the original complete patch geometry');
    const selected = repair ? range(repair.geometry) : null, stride = owner.parameters.widthSegments * 6;
    return { coarseBefore, coarseAfter: range(owner), patchBefore, patchAfter: range(patch), repair: selected,
      repairVisible: repair?.visible ?? false, distinctPrivateView: !!repair && repair.geometry !== owner, attributesShared, indexShared,
      widthCells: owner.parameters.widthSegments, rowCells: owner.parameters.heightSegments,
      selectedPrimitiveRows: selected?.effectiveCount ? { first: Math.floor(selected.effectiveStart / stride), last: Math.ceil((selected.effectiveStart + selected.effectiveCount) / stride) - 1 } : null,
      richRepair: repairPatch ? range(repairPatch.geometry) : null, richRepairVisible: repairPatch?.visible ?? false, sourceRangesUnchanged: true };
  };
  const bracket = (loft: LoftResult | undefined, frame: Frame) => {
    if (!loft) return null;
    const o = frame.selected.sourceOrdinal * FRONT_STRIDE, front = host.snapshot.front[o + F.front], sigma = host.snapshot.front[o + F.sigma];
    for (let row = 0; row + 1 < loft.sliceCount; row++) if (loft.sliceJoined[row] && loft.sliceFront[row] === front && loft.sliceFront[row + 1] === front
      && sigma >= loft.sliceSigma[row] && sigma < loft.sliceSigma[row + 1]) return { row, phase0: loft.slicePhase[row], phase1: loft.slicePhase[row + 1], fade0: loft.sliceFade[row], fade1: loft.sliceFade[row + 1], weight0: loft.sliceWeight[row], weight1: loft.sliceWeight[row + 1] };
    return null;
  };
  const passive = async (includeBytes: boolean) => {
    const repair: Mesh<BufferGeometry> | undefined = water.barrelFallback; assert(repair, 'First frame must have an actual coarse fallback');
    // Read the pure materialUniforms getter without mutating mask-grid getters or cache hooks.
    const uniforms = water.materialUniforms as unknown as PassiveWater['uniforms'], texture = uniforms.waterBarrelMask.value;
    const image = texture.image as { data: Uint8Array; width: number; height: number };
    assert(image.data instanceof Uint8Array && image.width * image.height === image.data.length, 'Actual U8 mask texture required');
    let minX = image.width, minZ = image.height, maxX = -1, maxZ = -1, nonzero = 0, max = 0;
    for (let j = 0; j < image.height; j++) for (let i = 0; i < image.width; i++) { const v = image.data[j * image.width + i];
      if (v) { nonzero++; minX = Math.min(minX, i); maxX = Math.max(maxX, i); minZ = Math.min(minZ, j); maxZ = Math.max(maxZ, j); max = Math.max(max, v); }
    }
    const materialProperties = renderer.properties.get(repair.material) as { currentProgram?: CompiledProgram };
    const gpu = materialProperties.currentProgram;
    const shaderSource = (shader: WebGLShader) => gl.isShader(shader) ? gl.getShaderSource(shader) : null;
    const actualUniform = (name: string) => {
      if (!gpu?.program) return null;
      const location = gl.getUniformLocation(gpu.program, name); if (location === null) return null;
      const value: unknown = gl.getUniform(gpu.program, location);
      return value instanceof Float32Array || value instanceof Int32Array || value instanceof Uint32Array ? Array.from(value) : value;
    };
    const textHash = (text: string | null) => text === null ? null : hash(new TextEncoder().encode(text));
    const gridF32 = Float32Array.from(uniforms.waterBarrelGrid.value.toArray()), sizeF32 = Float32Array.from(uniforms.waterBarrelGridSize.value.toArray());
    return { mask: { bytes: image.data.byteLength, width: image.width, height: image.height, sha256: await hash(image.data),
        nonzero, max, positiveBBox: nonzero ? { minX, maxX, minZ, maxZ } : null,
        rawBase64: includeBytes ? base64(image.data) : undefined,
        gridJS: uniforms.waterBarrelGrid.value.toArray(), gridF32: Array.from(gridF32), gridF32Sha256: await hash(gridF32),
        gridSizeF32: Array.from(sizeF32), gridSizeF32Sha256: await hash(sizeF32),
        active: uniforms.waterBarrelMaskActive.value, fallback: uniforms.waterBarrelScreenFallback.value,
        texture: { version: texture.version, width: image.width, height: image.height, wrapS: texture.wrapS, wrapT: texture.wrapT,
          minFilter: texture.minFilter, magFilter: texture.magFilter, flipY: texture.flipY, generateMipmaps: texture.generateMipmaps } },
      matrices: { sourceWorld: water.mesh.matrixWorld.toArray(), repairWorld: repair.matrixWorld.toArray(),
        repairModelView: repair.modelViewMatrix.toArray(), repairNormal: repair.normalMatrix.toArray() },
      program: gpu ? { id: gpu.id, cacheKey: gpu.cacheKey, vertexSha256: await textHash(shaderSource(gpu.vertexShader)),
        fragmentSha256: await textHash(shaderSource(gpu.fragmentShader)),
        maskGridGPU: actualUniform('waterBarrelGrid'), maskGridSizeGPU: actualUniform('waterBarrelGridSize'),
        maskActiveGPU: actualUniform('waterBarrelMaskActive'), fallbackGPU: actualUniform('waterBarrelScreenFallback') } : null,
      opticalReferences: { causticTexture: water.causticUniforms.causticMap.value === fixedCaustic,
        reflection: water.mesh.material.envMap === reflection.texture,
        causticDomain: water.causticUniforms.causticDomain.value.toArray(), causticStrength: water.causticUniforms.causticStrength.value },
      setupCalls, causticCalls };
  };
  const qa = {
    arm: ARM, stages: STAGES, canvas: renderer.domElement,
    async initialize() { return { arm: ARM, decodedFrames: 1, sourceCaptureFrames: capture.frames.length, cases: await Promise.all(bytes.map(hash)),
      context: gl.getContextAttributes(), stencilBits: gl.getParameter(gl.STENCIL_BITS), grid: capture.meta.renderGrid,
      camera: cameras[0], stages: STAGES,
      light: { method: 'Unchanged production Environment/light/painted sky/actual water.setSun; no optical, fog, camera or shader replacement.', sunSettings },
      methods: 'Actual SnapshotSampler→SnapshotSurfZone(swept)→PhysicalSurfaceSource→WaterSurface.update→PhysicalMode.drawBarrel once; actual caustics once.' }; },
    async draw(index: number) {
      assert(index === previous + 1 && index < STAGES.length, 'Fixed diagnostic order only'); previous = index;
      if (index === 0) {
        camera.position.fromArray(cameras[0].position); camera.lookAt(new Vector3().fromArray(cameras[0].target)); camera.updateMatrixWorld();
        host.init.grid = { ...frame.grid }; host.init.windowXMin = frame.windowXMin;
        Object.assign(host.snapshot, { front: initial.front, frontCount: frame.frontCount, surface: initial.surface, flow: initial.flow,
          aeration: initial.aeration, tubes: initial.tubes, tubeCount: frame.actualTubeCount,
          status: { seaTime: frame.seaTime, naturalFrame: 0, view: 0 } });
        water.update(); PhysicalMode.prototype.drawBarrel.call(mode); setupCalls++;
        const repair: Mesh<BufferGeometry> | undefined = water.barrelFallback; assert(repair, 'Actual first-frame fallback required');
        savedView = repair.geometry; savedHook = repair.onBeforeRender;
        fixedPrimary = { coarse: range(water.mesh.geometry), patch: range(water.patch.geometry) };
        below = PhysicalMode.prototype.cameraBelowSurface.call(mode);
        scene.fog = below ? new FogExp2('#1e7a87', .12) : null; environment.group.position.copy(camera.position);
        camera.getWorldDirection(ahead); caustics.render(renderer, camera.position.x + ahead.x * CAUSTIC_WINDOW / 3, camera.position.z + ahead.z * CAUSTIC_WINDOW / 3); causticCalls++; fixedCaustic = water.causticUniforms.causticMap.value;
      }
      const repair: Mesh<BufferGeometry> | undefined = water.barrelFallback; assert(repair && savedView && savedHook && fixedPrimary, 'Fixed scene setup missing');
      if (__ROWBAND_DIAGNOSTIC_CANDIDATE__ && index === 2) {
        // QA counterfactual: preserve original hook/callback effects, then override ONLY the private range.
        const hook = savedHook, view = savedView;
        repair.onBeforeRender = (...args) => { hook.apply(repair, args); view.setDrawRange(water.mesh.geometry.drawRange.start, water.mesh.geometry.drawRange.count); };
      } else if (__ROWBAND_DIAGNOSTIC_CANDIDATE__ && index === 4) {
        repair.geometry = water.mesh.geometry; repair.onBeforeRender = () => {};
      } else if (__ROWBAND_DIAGNOSTIC_CANDIDATE__ && index === 5) {
        repair.geometry = savedView; repair.onBeforeRender = savedHook;
      }
      renderer.render(scene, camera);
      assert(renderer.getRenderTarget() === null && gl.drawingBufferWidth === WIDTH && gl.drawingBufferHeight === HEIGHT, 'Actual normal default framebuffer dimensions differ');
      // Retain exact bytes synchronously before any await. No further draw/update occurs until driver requests next stage.
      gl.readPixels(0, 0, WIDTH, HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, framePixels);
      assert(gl.getError() === gl.NO_ERROR, 'Normal framebuffer render/read error');
      const retained = new Uint8Array(framePixels), ranges = rowRanges(fixedPrimary.coarse, fixedPrimary.patch);
      const pixelSha256 = await hash(retained), witnesses = await passive(index === 0);
      const loft = barrel.lastLoft;
      const sourceHash = { front: await hash(initial.front), surface: await hash(initial.surface), flow: await hash(initial.flow), aeration: await hash(initial.aeration) };
      assert(sourceHash.surface === await hash(water.surfaceData), 'Uploaded actual water differs from captured field');
      projection.set(frame.selected.point.x, .6, frame.selected.point.z).project(camera);
      return { arm: ARM, stage: STAGES[index], draw: index, view: 0, frame: 0, step: 664,
        clock: { time: frame.time, seaTime: frame.seaTime }, sourceHash, rowRanges: ranges, witnesses,
        framebuffer: { width: WIDTH, height: HEIGHT, byteLength: retained.byteLength, order: 'RGBA8 bottom-up WebGL readPixels', sha256: pixelSha256 },
        payload: { rgbaBase64: base64(retained) },
        primaryGeometry: { positionSha256: await hash(water.mesh.geometry.getAttribute('position').array), indexSha256: await hash(water.mesh.geometry.index!.array) },
        belowSurface: below, hostHeightAtCamera: host.heightAt(camera.position.x, camera.position.z), stillLevel: capture.meta.fixture.tide,
        camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), projection: camera.projectionMatrix.toArray() },
        selectedWorldProjection: projection.toArray(), selectedBracket: bracket(loft, frame), frontCount: frame.frontCount,
        geometry: loft ? { slices: loft.sliceCount, vertices: loft.vertexCount, indices: loft.indexCount,
          positionSha256: await hash(loft.positions.subarray(0, loft.vertexCount * 3)), indexSha256: await hash(loft.indices.subarray(0, loft.indexCount)) } : null,
        viewport: { css: [innerWidth, innerHeight], dpr: devicePixelRatio, buffer: [renderer.domElement.width, renderer.domElement.height] },
        scope: 'First actual natural frame/fixed overview camera. Normal pixels are diagnostic evidence, no toleranced acceptance.' };
    },
    async finish() {
      assert(previous === STAGES.length - 1 && setupCalls === 1 && causticCalls === 1, 'Exactly one setup/caustic render and complete fixed diagnostic draws required');
      const repair: Mesh<BufferGeometry> | undefined = water.barrelFallback; assert(repair, 'Original fallback missing at retirement'); assert(repair?.geometry === savedView && repair.onBeforeRender === savedHook, 'Original geometry/hook must be restored before retirement');
      const resources = new Map<Material | BufferGeometry, { name: string; disposals: number }>();
      const watch = (object: Material | BufferGeometry, name: string) => { if (!resources.has(object)) { const r = { name, disposals: 0 }; resources.set(object, r); object.addEventListener('dispose', () => { r.disposals++; }); } };
      for (const [name, mesh] of [['water', water.mesh], ['patch', water.patch], ['swept', barrel.mesh.mesh], ['bed', seabed.mesh], ['fallback', water.barrelFallback], ['patchFallback', water.barrelPatchFallback]] as const) if (mesh) { watch(mesh.geometry, name + '-geometry'); watch(mesh.material, name + '-material'); }
      barrel.dispose(); water.dispose(); seabed.mesh.geometry.dispose(); seabed.mesh.material.dispose(); caustics.dispose(); reflection.dispose();
      environment.group.traverse(object => { const mesh = object as unknown as { geometry?: BufferGeometry; material?: Material }; mesh.geometry?.dispose(); mesh.material?.dispose(); });
      renderer.dispose(); renderer.forceContextLoss(); await new Promise(resolve => setTimeout(resolve, 20));
      assert([...resources.values()].every(r => r.disposals === 1), 'Owned shared renderer resource disposal differs');
      return { contextLost: gl.isContextLost(), resources: [...resources.values()], solverSteps: 0, qualityAccepted: false };
    },
  };
  apiWindow.rowbandDiagnosticQA = qa;
}
start().catch(error => { apiWindow.rowbandDiagnosticQA = { failure: String(error?.stack ?? error) }; });
