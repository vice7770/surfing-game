// Frozen-input tube QA; no solver steps, FPS claim, or production diagnostics API.
// node scripts/browser/tube-frozen-render.mjs --plan
// After coordinating a short held render burst:
// node scripts/browser/tube-frozen-render.mjs --url=http://localhost:4201/ --dir=/private/tmp/tube-qa-dist
// Headless is the default. Use --headless=false only for a coordinated headed comparison.
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Page, sleep } from './cdp.mjs';

const args = {};
for (const arg of process.argv.slice(2)) {
  if (!arg.startsWith('--')) throw Error('Use --name=value or --plan arguments');
  const at = arg.indexOf('=');
  args[arg.slice(2, at < 0 ? undefined : at)] = at < 0 ? 'true' : arg.slice(at + 1);
}
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const positive = (name, fallback, max) => {
  const value = Number(args[name] ?? fallback);
  if (!Number.isFinite(value) || value <= 0 || value > max) throw Error('Invalid --' + name);
  return value;
};
const width = positive('width', 1280, 4096), height = positive('height', 720, 2160);
const seconds = positive('timeoutSeconds', 120, 180);
if (args.headless !== undefined && !['true', 'false'].includes(args.headless)) throw Error('Use --headless=true or --headless=false');
const headless = args.headless !== 'false';
if (args['mask-diagnostic'] !== undefined && !['true', 'false'].includes(args['mask-diagnostic'])) throw Error('Use --mask-diagnostic=true or --mask-diagnostic=false');
const maskDiagnostic = args['mask-diagnostic'] === 'true';
if (args['freeze-caustics'] !== undefined && !['true', 'false'].includes(args['freeze-caustics'])) throw Error('Use --freeze-caustics=true or --freeze-caustics=false');
const freezeCaustics = args['freeze-caustics'] === 'true';
if (freezeCaustics && !maskDiagnostic) throw Error('Caustic holding is only available for the isolated mask diagnostic');
const url = new URL(args.url ?? 'http://localhost:4201/');
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.port === '4200') throw Error('Use a separate local preview; frozen play port 4200 is forbidden');
for (const flag of ['record', 'physical', 'demo', 'waterSheet', 'particleBench', 'pilot', 'room', 'inpage', 'physicsDx', 'physicsDz', 'barrelView']) {
  if (url.searchParams.has(flag)) throw Error('The QA URL must not contain ' + flag);
}
url.searchParams.set('diagnostics', '');
url.searchParams.set('graphics', 'high');
url.searchParams.set('renderSpacing', '1');
url.searchParams.set('waterNormals', 'pixel');
const inputDir = resolve(args.input ?? '/private/tmp/tube-live-original');
const baselineDir = resolve(args.baseline ?? '/private/tmp/tube-geometry-final');
const currentDir = resolve(args.current ?? '/private/tmp/tube-geometry-final');
const out = resolve(args.out ?? '/private/tmp/tube-frozen-render');
const cameraMode = args.camera ?? 'tube';
if (!['saved', 'tube'].includes(cameraMode)) throw Error('Use --camera=tube or --camera=saved');
const frames = (args.frames ?? '10,20').split(',').map(Number);
if (!frames.length || frames.some((n, i) => !Number.isFinite(n) || n < 0 || frames.indexOf(n) !== i)) throw Error('Invalid --frames');
const sameGrid = (a, b) => ['xMin', 'zMin', 'spacing', 'nx', 'nz'].every(key => a?.[key] === b?.[key]);
function validateGrid(grid, name) {
  if (!grid || !['xMin', 'zMin', 'spacing', 'nx', 'nz'].every(key => Number.isFinite(grid[key])) || grid.spacing <= 0
    || !Number.isInteger(grid.nx) || !Number.isInteger(grid.nz) || grid.nx < 2 || grid.nz < 2) throw Error(name + ': invalid grid');
}
const constructors = { Float32Array, Int32Array, Uint32Array, Uint8Array };
function restore(value, type = 'Float32Array') {
  if (!Array.isArray(value)) throw Error('Expected serialized array');
  if (type !== 'Float32Array' && value.some(v => !Number.isInteger(v))) throw Error('Invalid integer array');
  return constructors[type].from(value, v => v === null ? Number.NaN : v);
}
const pack = array => ({ type: array.constructor.name, length: array.length, sha256: sha(Buffer.from(array.buffer)), base64: Buffer.from(array.buffer).toString('base64') });
const vertexFields = ['mask', 'lift', 'sheet', 'sheetWeight', 'sheetBack'];
const sliceFields = ['sliceFront', 'sliceSigma', 'sliceTau', 'slicePhase', 'sliceLife', 'sliceCollapse', 'sliceFade', 'sliceTipGap',
  'sliceRestHold', 'sliceRestEnd', 'sliceRestClimb', 'sliceToeClimb', 'sliceJoined', 'sliceRayX', 'sliceRayZ', 'sliceWeight',
  'sliceOverturned', 'sliceTipAlong', 'sliceTipUp', 'sliceTipTransportAlong', 'sliceTipTransportUp', 'sliceAnchorVX',
  'sliceAnchorVZ', 'sliceFormed', 'sliceTipX', 'sliceTipY', 'sliceTipZ', 'sliceMouth'];
function fieldLengths(loft) {
  return [['positions', loft.vertexCount * 3], ['normals', loft.vertexCount * 3], ...vertexFields.map(name => [name, loft.vertexCount]),
    ['throat', loft.vertexCount * 4], ['indices', loft.indexCount], ...sliceFields.map(name => [name, loft.sliceCount])];
}
// Same active-prefix Float64 hash used by tube-geometry-regression-report.ts.
function geometryHash(loft) {
  const h = createHash('sha256');
  for (const [name, count] of fieldLengths(loft)) {
    if (!loft[name]) continue;
    h.update(name);
    const copy = Float64Array.from(loft[name].subarray(0, count));
    h.update(new Uint8Array(copy.buffer));
  }
  h.update(JSON.stringify([loft.vertexCount, loft.indexCount, loft.sliceCount]));
  return h.digest('hex');
}
function readGeometry(path, input, inputHash) {
  const bytes = readFileSync(path), data = JSON.parse(bytes);
  if (data.fixture?.sha256 !== inputHash || data.fixture.seaTime !== input.status.seaTime) throw Error(path + ': geometry belongs to a different physical capture');
  if (!sameGrid(data.maskGrid, input.waterGrid)) throw Error(path + ': mask grid differs from saved water');
  const loft = Object.fromEntries(Object.entries(data.loft).map(([key, value]) => [key, Array.isArray(value)
    ? restore(value, key === 'indices' ? 'Uint32Array' : key === 'sliceFront' ? 'Int32Array'
      : ['slicePhase', 'sliceJoined', 'sliceOverturned'].includes(key) ? 'Uint8Array' : 'Float32Array') : value]));
  for (const key of ['vertexCount', 'indexCount', 'sliceCount']) if (!Number.isInteger(loft[key]) || loft[key] < 0) throw Error(path + ': invalid ' + key);
  for (const [key, count] of fieldLengths(loft)) if (loft[key] && loft[key].length !== count) throw Error(path + ': inactive padding or missing ' + key);
  for (const key of ['positions', 'normals', ...vertexFields, 'throat', 'indices', 'sliceFront', 'slicePhase', 'sliceJoined', 'sliceRayX', 'sliceRayZ', 'sliceWeight', 'sliceOverturned', 'sliceFormed', 'sliceTipX', 'sliceTipY', 'sliceTipZ', 'sliceMouth']) {
    if (!loft[key] || !loft[key].every(Number.isFinite)) throw Error(path + ': missing/nonfinite required ' + key);
  }
  if (loft.indices.some(n => n >= loft.vertexCount)) throw Error(path + ': index outside active vertices');
  const hash = geometryHash(loft);
  if (hash !== data.geometryHash) throw Error(path + ': exported geometry hash does not match restored arrays');
  const mask = restore(data.mask, 'Uint8Array');
  if (mask.length !== input.waterGrid.nx * input.waterGrid.nz || data.mask.some(v => v < 0 || v > 255)) throw Error(path + ': invalid mask');
  const sourcePath = data.sourceRuntime?.path;
  const sourceAvailable = typeof sourcePath === 'string' && existsSync(sourcePath);
  if (sourceAvailable && sha(readFileSync(sourcePath)) !== data.sourceRuntime.sha256) throw Error(path + ': geometry source runtime changed');
  return {
    metadata: { path, fileSha256: sha(bytes), geometryHash: hash, maskSha256: sha(mask), sourceRuntime: data.sourceRuntime, sourceAvailable,
      vertices: loft.vertexCount, indices: loft.indexCount, slices: loft.sliceCount,
      restoredNaNs: Object.fromEntries(Object.entries(loft).filter(([, v]) => ArrayBuffer.isView(v)).map(([key, values]) => [key, Array.from(values).filter(Number.isNaN).length]).filter(([, n]) => n)) },
    payload: { loft: Object.fromEntries(Object.entries(loft).map(([key, value]) => [key, ArrayBuffer.isView(value) ? pack(value) : value])), mask: pack(mask), maskGrid: data.maskGrid },
  };
}
const fixtures = frames.map(at => {
  const path = join(inputDir, `at-${at}.json`), bytes = readFileSync(path), data = JSON.parse(bytes), inputHash = sha(bytes);
  validateGrid(data.waterGrid, path);
  if (!sameGrid(data.waterGrid, data.init.grid) || data.waterGrid.spacing !== 1) throw Error(path + ': only the saved matching 1 m grid is supported');
  const surface = restore(data.surfaceData), front = restore(data.front);
  if (surface.length !== 2 * data.waterGrid.nx * data.waterGrid.nz || !surface.every(Number.isFinite)) throw Error(path + ': invalid saved surface');
  if (!Number.isInteger(data.frontCount) || data.frontCount < 0 || front.length !== data.frontCount * 9) throw Error(path + ': invalid front count');
  for (let k = 0; k < data.frontCount; k++) for (let j = 0; j < 7; j++) if (!Number.isFinite(front[9 * k + j])) throw Error(path + ': invalid front coordinate/clock/foot field');
  if (!Number.isFinite(data.status.seaTime) || data.status.ride) throw Error(path + ': expected riderless finite clock');
  if (!data.camera?.position?.every(Number.isFinite) || data.camera.position.length !== 3 || !data.camera.quaternion?.every(Number.isFinite) || data.camera.quaternion.length !== 4) throw Error(path + ': invalid saved camera');
  const baseline = readGeometry(join(baselineDir, `at-${at}.baseline.json`), data, inputHash);
  const currentPath = join(currentDir, `at-${at}.current.json`);
  const current = existsSync(currentPath) ? readGeometry(currentPath, data, inputHash) : undefined;
  // The saved spectator view can face away from every breaking front. Frame the
  // baseline tube's actual bounds so both variants have the same useful view.
  let camera = data.camera;
  if (cameraMode === 'tube') {
    const positions = restore(JSON.parse(readFileSync(join(baselineDir, `at-${at}.baseline.json`))).loft.positions);
    const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i++) {
      const axis = i % 3;
      low[axis] = Math.min(low[axis], positions[i]); high[axis] = Math.max(high[axis], positions[i]);
    }
    if (!low.every(Number.isFinite)) throw Error(path + ': no baseline tube to frame');
    const target = low.map((v, i) => (v + high[i]) / 2);
    const radius = Math.max(8, Math.hypot(high[0] - low[0], high[2] - low[2]) / 2);
    camera = { position: [target[0] - 0.55 * radius, high[1] + 0.55 * radius, target[2] + 1.4 * radius], target, baselineBounds: { low, high } };
  }
  return { at, path, fileSha256: inputHash, surfaceSha256: sha(surface), frontSha256: sha(front), frontNaNs: Array.from(front).filter(Number.isNaN).length, baseline, current, currentPath,
    payload: { config: data.config, init: data.init, status: data.status, grid: data.waterGrid, frontCount: data.frontCount,
      surface: pack(surface), front: pack(front), camera } };
});
if (fixtures.some(f => !sameGrid(f.payload.grid, fixtures[0].payload.grid) || JSON.stringify(f.payload.config) !== JSON.stringify(fixtures[0].payload.config))) throw Error('Held comparisons require one shared grid/configuration');

function installFrozenHelpers() {
  const d = window.breaklineDiagnostics, mode = d.mode, water = d.water, host = mode.host;
  if (!host || host.outstandingSteps || host.snapshot.status.compute !== 'cpu') throw Error('Expected idle CPU initializer');
  const types = { Float32Array, Int32Array, Uint32Array, Uint8Array };
  const decode = packed => {
    const binary = atob(packed.base64), bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const array = new types[packed.type](bytes.buffer);
    if (array.length !== packed.length) throw Error('Packed array length changed');
    return array;
  };
  const hash = async (array, count = array.length) => {
    const bytes = new Uint8Array(array.buffer, array.byteOffset, count * array.BYTES_PER_ELEMENT);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
  };
  const gridsEqual = (a, b) => ['xMin', 'zMin', 'spacing', 'nx', 'nz'].every(key => a[key] === b[key]);
  const bed = host.init.bed.slice();
  const mesh = mode.barrelMesh;
  if (!mesh) throw Error('Actual swept barrel mesh unavailable');
  const gl = d.canvas.getContext('webgl2');
  const gpuTargets = new Map();
  let boundTarget = null, frozenCaustic = null;
  const bindFramebuffer = gl.bindFramebuffer.bind(gl), viewport = gl.viewport.bind(gl), colorMask = gl.colorMask.bind(gl);
  let requestedColorMask = Array.from(gl.getParameter(gl.COLOR_WRITEMASK));
  if (window.__tubeFrozenOptions.maskDiagnostic) {
    gl.bindFramebuffer = (target, framebuffer) => {
      bindFramebuffer(target, framebuffer);
      if (target === gl.FRAMEBUFFER || target === gl.DRAW_FRAMEBUFFER) {
        boundTarget = framebuffer;
        if (framebuffer && !gpuTargets.has(framebuffer)) gpuTargets.set(framebuffer, { id: gpuTargets.size + 1, viewport: Array.from(gl.getParameter(gl.VIEWPORT)) });
        colorMask(...(frozenCaustic && framebuffer === frozenCaustic ? [false, false, false, false] : requestedColorMask));
      }
    };
    gl.viewport = (x, y, width, height) => {
      viewport(x, y, width, height);
      if (boundTarget) gpuTargets.get(boundTarget).viewport = [x, y, width, height];
    };
    gl.colorMask = (...values) => {
      requestedColorMask = values;
      colorMask(...(frozenCaustic && boundTarget === frozenCaustic ? [false, false, false, false] : values));
    };
  }
  async function gpuProvenance() {
    if (!window.__tubeFrozenOptions.maskDiagnostic) return undefined;
    const previous = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING), previousBuffer = gl.getParameter(gl.READ_BUFFER), targets = [];
    try {
      for (const [framebuffer, metadata] of gpuTargets) {
        const [x, y, width, height] = metadata.viewport;
        if (x || y || width > 512 || height > 512 || width < 1 || height < 1) continue;
        bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer);
        gl.readBuffer(gl.COLOR_ATTACHMENT0);
        if (gl.checkFramebufferStatus(gl.READ_FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) continue;
        const format = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT), type = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);
        const components = format === gl.RGBA ? 4 : format === gl.RGB ? 3 : format === gl.RG ? 2 : format === gl.RED ? 1 : 0;
        if (!components || ![gl.FLOAT, gl.UNSIGNED_BYTE, gl.HALF_FLOAT].includes(type)) throw Error('Unsupported diagnostic GPU readback format/type: ' + format + '/' + type);
        const ArrayType = type === gl.FLOAT ? Float32Array : type === gl.HALF_FLOAT ? Uint16Array : Uint8Array;
        const pixels = new ArrayType(width * height * components);
        gl.readPixels(0, 0, width, height, format, type, pixels);
        if (gl.getError() !== gl.NO_ERROR) throw Error('GPU target provenance readback failed');
        targets.push({ id: metadata.id, width, height, format, type, hash: await hash(pixels), frozen: framebuffer === frozenCaustic });
      }
    } finally { bindFramebuffer(gl.READ_FRAMEBUFFER, previous); gl.readBuffer(previousBuffer); }
    return targets;
  }
  function holdCaustics() {
    if (!window.__tubeFrozenOptions.freezeCaustics) return { held: false };
    const candidates = [...gpuTargets].filter(([, m]) => m.viewport[2] === 512 && m.viewport[3] === 512);
    if (candidates.length !== 1) throw Error('Expected exactly one actual 512px caustic framebuffer');
    frozenCaustic = candidates[0][0];
    return { held: true, framebufferID: candidates[0][1].id,
      method: 'Retain the already-rendered HalfFloat caustic target; suppress only its color clear/draw writes. Original texture, filtering, fixed camera/domain/clock retained.' };
  }
  let fixture, current, hidden = false, maskDisabled = false, waterWrites = 0, advancementAttempts = 0;
  host.advance = () => { advancementAttempts++; throw Error('Frozen QA forbids water advancement'); };
  function setFixture(payload) {
    if (!gridsEqual(host.init.grid, payload.grid) || bed.length !== payload.grid.nx * payload.grid.nz) throw Error('Reconstructed bed grid differs from capture');
    fixture = { ...payload, surface: decode(payload.surface), front: decode(payload.front) };
    frozenCaustic = null;
    host.snapshot.surface = fixture.surface;
    host.snapshot.front = fixture.front;
    host.snapshot.frontCount = fixture.frontCount;
    // GPU status is retained ONLY to choose the original renderer's fixed-time FFT shading; no device solver runs.
    host.snapshot.status = { ...fixture.status, ride: undefined };
    host.snapshot.tubeCount = host.snapshot.sprayCount = host.snapshot.bubbleCount = host.snapshot.lipCount = 0;
    host.snapshot.board.fill(0);
    host.snapshot.flow.fill(0);
    host.snapshot.aeration.fill(0);
    mode.focus = { ...fixture.init.focus };
    const source = { grid: fixture.grid, time: fixture.status.seaTime, revision: {}, cubic: true, bedRevision: {},
      write: out => { waterWrites++; out.set(fixture.surface); }, writeBed: out => out.set(bed),
      writeFlow: out => out.fill(0), writeAeration: out => out.fill(0) };
    water.setSource(source);
    water.setBarrelEnabled(true);
    mode.farField.update(fixture.status.seaTime);
    for (const object of [mode.board, mode.surfer.group, mode.leash.object, mode.spray.mesh, mode.bubbles.mesh, mode.lipSheet.mesh]) object.visible = false;
    const camera = mode.camera.camera.clone();
    camera.position.fromArray(fixture.camera.position);
    if (fixture.camera.target) camera.lookAt(camera.position.clone().fromArray(fixture.camera.target));
    else camera.quaternion.fromArray(fixture.camera.quaternion);
    camera.fov = window.__tubeFrozenOptions.fov ?? camera.fov;
    camera.aspect = window.__tubeFrozenOptions.width / window.__tubeFrozenOptions.height;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    window.__tubeFrozenCamera = camera;
  }
  function setGeometry(payload) {
    if (!gridsEqual(water.barrelMaskGrid, payload.maskGrid)) throw Error('Actual renderer mask grid differs');
    current = { loft: Object.fromEntries(Object.entries(payload.loft).map(([key, value]) => [key, value?.base64 !== undefined ? decode(value) : value])), mask: decode(payload.mask) };
  }
  mode.drawBarrel = () => {
    if (!current) throw Error('No frozen geometry selected');
    mesh.setLook('rich');
    mesh.update(current.loft);
    mesh.mesh.visible = !hidden;
    water.setBarrelMask(maskDisabled ? null : current.mask);
  };
  async function signature() {
    if (mode.host !== host || host.outstandingSteps || host.snapshot.status.seaTime !== fixture.status.seaTime || advancementAttempts) throw Error('Held host/clock changed');
    const u = water.materialUniforms, camera = window.__tubeFrozenCamera;
    const textures = {};
    for (const name of ['waterSurface', 'waterBed', 'waterFlow', 'waterAeration', 'waterRippleMap', 'waterChurnMap', 'waterChopMap']) {
      const t = u[name]?.value;
      textures[name] = t?.image?.data ? { hash: await hash(t.image.data), width: t.image.width, height: t.image.height }
        : { uuid: t?.uuid, width: t?.image?.width, height: t?.image?.height };
    }
    const uniforms = Object.fromEntries(['waterTime', 'waterChop', 'waterChopFft', 'waterChopPatch', 'waterRippleStrength', 'waterReflection', 'waterPatchRect',
      'waterAttenuation', 'waterDiffuseAttenuation', 'waterDeepReflectance', 'waterBedAlbedo', 'waterSunDirection', 'waterSunRadiance', 'waterBodyGain', 'waterFoamPattern']
      .map(name => [name, u[name]?.value?.toArray?.() ?? u[name]?.value]));
    const lights = mode.scene.children.filter(object => object.isLight).map(light => ({ type: light.type, color: light.color.toArray(), intensity: light.intensity, position: light.position.toArray() }));
    const common = { seaTime: host.snapshot.status.seaTime, surface: await hash(water.surfaceData), snapshotSurface: await hash(host.snapshot.surface), front: await hash(host.snapshot.front), gpuTargets: await gpuProvenance(),
      bed: await hash(bed), textures, uniforms, lights, environment: mode.scene.environment?.uuid, background: mode.scene.background?.uuid ?? mode.scene.background?.toArray?.(),
      camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov, aspect: camera.aspect, near: camera.near, far: camera.far, projection: camera.projectionMatrix.toArray() } };
    const geometry = mesh.mesh.geometry, attributes = {};
    const projected = camera.position.clone();
    let projectedLiftedVertices = 0;
    for (let i = 0; i < current.loft.vertexCount; i++) {
      if (current.loft.lift[i] < 0.1 || current.loft.sheetWeight[i] < 0.1) continue;
      projected.fromArray(current.loft.positions, i * 3).project(camera);
      if (Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1 && projected.z >= -1 && projected.z <= 1) projectedLiftedVertices++;
    }
    if (geometry.drawRange.count !== current.loft.indexCount) throw Error('Actual barrel renderer clipped exported indices');
    for (const [name, attribute] of Object.entries(geometry.attributes)) attributes[name] = await hash(attribute.array, current.loft.vertexCount * attribute.itemSize);
    return { common, variant: { attributes, indices: await hash(geometry.index.array, geometry.drawRange.count), drawRange: { ...geometry.drawRange },
      mask: await hash(u.waterBarrelMask.value.image.data), maskActive: u.waterBarrelMaskActive.value, visible: mesh.mesh.visible },
      evidence: { advancementAttempts, waterWrites, projectedLiftedVertices, blockedAnimationRequests: window.__tubeFrozenBlockedRafs } };
  }
  async function render(hide = false) {
    hidden = hide;
    d.renderView(window.__tubeFrozenCamera);
    d.renderView(window.__tubeFrozenCamera);
    return signature();
  }
  // Diagnostic output is appended AFTER all normal displacement, clipping, depth and colour chunks.
  // Uniform-only output changes do not replace any material or mutate the production shader sources.
  let diagnostic;
  function beginDiagnostic() {
    if (diagnostic) {
      diagnostic.active.value = water.materialUniforms.waterBarrelMaskActive.value;
      diagnostic.pixels = {};
      return diagnostic.metadata;
    }
    const grid = fixture.grid, origin = window.__tubeFrozenCamera.position.clone();
    const low = origin.clone().set(grid.xMin - 1, -128, grid.zMin - 1);
    const span = origin.clone().set((grid.nx - 1) * grid.spacing + 2, 256, (grid.nz - 1) * grid.spacing + 2);
    // The bed extends beyond the snapshot window. Bound its real static world vertices too;
    // clamped RGB coordinates must never be mistaken for an in-window wet/dry probe.
    const high = low.clone().add(span), bedPosition = mode.seabed.mesh.geometry.attributes.position;
    const vertex = origin.clone();
    for (let i = 0; i < bedPosition.count; i++) {
      vertex.fromBufferAttribute(bedPosition, i).applyMatrix4(mode.seabed.mesh.matrixWorld);
      low.x = Math.min(low.x, vertex.x - 1); low.z = Math.min(low.z, vertex.z - 1);
      high.x = Math.max(high.x, vertex.x + 1); high.z = Math.max(high.z, vertex.z + 1);
    }
    span.subVectors(high, low);
    const output = { value: 0 }, active = { value: water.materialUniforms.waterBarrelMaskActive.value }, bypass = { value: 0 };
    const entries = [
      { name: 'water', mesh: water.mesh, rgb: '0.0, 0.0, 1.0' },
      { name: 'swept', mesh: mesh.mesh, rgb: '1.0, 0.0, 0.0' },
      { name: 'seabed', mesh: mode.seabed.mesh, rgb: '1.0, 1.0, 0.0' },
      { name: 'farField', mesh: mode.farField.mesh, rgb: '1.0, 0.0, 1.0' },
    ];
    for (const entry of entries) {
      const material = entry.mesh.material;
      entry.material = material;
      entry.visible = entry.mesh.visible;
      entry.compile = material.onBeforeCompile;
      entry.key = material.customProgramCacheKey;
      entry.depth = { test: material.depthTest, write: material.depthWrite, func: material.depthFunc, side: material.side,
        transparent: material.transparent, blending: material.blending, polygonOffset: material.polygonOffset,
        polygonOffsetFactor: material.polygonOffsetFactor, polygonOffsetUnits: material.polygonOffsetUnits };
      material.onBeforeCompile = (shader, renderer) => {
        entry.compile.call(material, shader, renderer);
        entry.originalSources = { vertex: shader.vertexShader, fragment: shader.fragmentShader };
        Object.assign(shader.uniforms, { tubeDiagnosticOutput: output, tubeDiagnosticLow: { value: low },
          tubeDiagnosticSpan: { value: span }, tubeDiagnosticOriginalActive: active, tubeDiagnosticBypassSwept: bypass });
        for (const token of ['#include <common>', '#include <project_vertex>']) if (!shader.vertexShader.includes(token)) throw Error('Cannot preserve diagnostic vertex shader: ' + entry.name);
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTubeDiagnosticWorld;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nvTubeDiagnosticWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
        if (!shader.fragmentShader.includes('#include <dithering_fragment>')) throw Error('Cannot preserve diagnostic fragment shader: ' + entry.name);
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vTubeDiagnosticWorld;
uniform float tubeDiagnosticOutput;
uniform vec3 tubeDiagnosticLow;
uniform vec3 tubeDiagnosticSpan;
uniform float tubeDiagnosticOriginalActive;
uniform float tubeDiagnosticBypassSwept;
vec3 tubeDiagnosticEncode( float value ) {
  float n = min( 16777215.0, floor( clamp( value, 0.0, 1.0 ) * 16777215.0 + 0.5 ) );
  return vec3( floor( n / 65536.0 ), floor( mod( n, 65536.0 ) / 256.0 ), mod( n, 256.0 ) ) / 255.0;
}`)
          .replace('#include <dithering_fragment>', `#include <dithering_fragment>
if ( tubeDiagnosticOutput > 0.5 ) {
  vec3 diagnosticColour = vec3( ${entry.rgb} );
  vec3 coordinate = ( vTubeDiagnosticWorld - tubeDiagnosticLow ) / tubeDiagnosticSpan;
  if ( tubeDiagnosticOutput > 1.5 && tubeDiagnosticOutput < 2.5 ) diagnosticColour = tubeDiagnosticEncode( coordinate.x );
  if ( tubeDiagnosticOutput > 2.5 && tubeDiagnosticOutput < 3.5 ) diagnosticColour = tubeDiagnosticEncode( coordinate.y );
  if ( tubeDiagnosticOutput > 3.5 && tubeDiagnosticOutput < 4.5 ) diagnosticColour = tubeDiagnosticEncode( coordinate.z );
  ${['water', 'swept'].includes(entry.name) ? 'if ( tubeDiagnosticOutput > 4.5 && tubeDiagnosticOutput < 5.5 ) diagnosticColour = vec3( waterBarrelMaskAt( vWaterWorld.xz ), waterBarrelDither( gl_FragCoord.xy ), tubeDiagnosticOriginalActive );' : 'if ( tubeDiagnosticOutput > 4.5 && tubeDiagnosticOutput < 5.5 ) diagnosticColour = vec3( 0.0 );'}
  if ( tubeDiagnosticOutput > 5.5 ) diagnosticColour = vec3( all( greaterThanEqual( coordinate, vec3( 0.0 ) ) ) && all( lessThanEqual( coordinate, vec3( 1.0 ) ) ) ? 1.0 : 0.0 );
  gl_FragColor = vec4( diagnosticColour, 1.0 );
}`);
        if (entry.name === 'swept') {
          const discard = 'if ( waterBarrelMaskAt( vWaterWorld.xz ) <= waterBarrelDither( gl_FragCoord.xy ) ) discard;';
          if (!shader.fragmentShader.includes(discard)) throw Error('Actual swept mask discard unavailable');
          shader.fragmentShader = shader.fragmentShader.replace(discard, 'if ( tubeDiagnosticBypassSwept < 0.5 && waterBarrelMaskAt( vWaterWorld.xz ) <= waterBarrelDither( gl_FragCoord.xy ) ) discard;');
        }
        entry.instrumentedSources = { vertex: shader.vertexShader, fragment: shader.fragmentShader };
      };
      // One live uniform instance for the whole ephemeral comparison; Three caches uniforms per material.
      material.customProgramCacheKey = () => entry.key.call(material) + '-held-object-id-v1';
      material.needsUpdate = true;
    }
    diagnostic = { output, active, bypass, entries, low: low.toArray(), span: span.toArray(), pixels: {} };
    diagnostic.metadata = { ids: { water: [0, 0, 255], swept: [255, 0, 0], seabed: [255, 255, 0], farField: [255, 0, 255] },
      worldEncoding: { low: diagnostic.low, span: diagnostic.span, rgbBits: 24,
        method: 'Actual post-displacement vertex world varying interpolated by GPU; RGB24 per-axis. Clamp and highp interpolation/encoding roundoff apply.' } };
    return diagnostic.metadata;
  }
  function diagnosticRender(pass) {
    if (!diagnostic) throw Error('Diagnostic not installed');
    const solid = pass.startsWith('swept-');
    maskDisabled = !pass.startsWith('masked-');
    hidden = maskDisabled && !solid;
    diagnostic.bypass.value = solid ? 1 : 0;
    for (const entry of diagnostic.entries) if (entry.name !== 'swept') entry.mesh.visible = solid ? false : entry.visible;
    const modes = { 'masked-ids': 1, 'masked-x': 2, 'masked-y': 3, 'masked-z': 4, 'masked-bounds': 6,
      'unmasked-ids': 1, 'unmasked-x': 2, 'unmasked-y': 3, 'unmasked-z': 4, 'unmasked-mask': 5, 'unmasked-bounds': 6,
      'swept-solid': 1, 'swept-x': 2, 'swept-y': 3, 'swept-z': 4, 'swept-mask': 5, 'swept-bounds': 6 };
    if (!modes[pass]) throw Error('Unknown diagnostic pass');
    diagnostic.output.value = modes[pass];
    d.renderView(window.__tubeFrozenCamera);
    const canvas = d.canvas, gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    // Same JS turn as render: read the actual default framebuffer before its contents may be discarded.
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    if (gl.getError() !== gl.NO_ERROR) throw Error('Diagnostic framebuffer read failed');
    diagnostic.pixels[pass] = pixels;
    return { pass, width: canvas.width, height: canvas.height, seaTime: host.snapshot.status.seaTime,
      maskActive: water.materialUniforms.waterBarrelMaskActive.value, visible: mesh.mesh.visible };
  }
  async function finishDiagnostic() {
    if (!diagnostic) throw Error('Diagnostic not installed');
    const canvas = d.canvas, pixels = diagnostic.pixels;
    const objectAt = (buffer, n) => {
      const o = n * 4, r = buffer[o], g = buffer[o + 1], b = buffer[o + 2];
      if (r === 0 && g === 0 && b === 255) return 'water';
      if (r === 255 && g === 0 && b === 0) return 'swept';
      if (r === 255 && g === 255 && b === 0) return 'seabed';
      if (r === 255 && g === 0 && b === 255) return 'farField';
      return 'other/background/antialiased';
    };
    const counts = {}, candidates = [], dry = [], candidateSolidCoverage = { absent: 0, present: 0, antialiasedOrOther: 0 };
    const samePixelCausalCounts = { coveredAboveBedBothDiscard: 0, coveredBelowBed: 0, coveredAmbiguous: 0,
      coveredUnreliableWorld: 0, absentSolid: 0, antialiasedOrOther: 0 };
    const coordinate = (n, axis, prefix = 'unmasked') => {
      const p = pixels[prefix + '-' + ['x', 'y', 'z'][axis]], o = n * 4;
      return diagnostic.low[axis] + ((p[o] * 65536 + p[o + 1] * 256 + p[o + 2]) / 16777215) * diagnostic.span[axis];
    };
    const worldAt = (n, prefix) => {
      const point = [0, 1, 2].map(axis => coordinate(n, axis, prefix));
      const projected = window.__tubeFrozenCamera.position.clone().fromArray(point).project(window.__tubeFrozenCamera);
      const x = n % canvas.width, y = Math.floor(n / canvas.width);
      const reprojection = Math.hypot((projected.x + 1) * canvas.width / 2 - (x + 0.5), (projected.y + 1) * canvas.height / 2 - (y + 0.5));
      const insideEncoding = pixels[prefix + '-bounds'][n * 4] === 255;
      const viewPoint = window.__tubeFrozenCamera.position.clone().fromArray(point).applyMatrix4(window.__tubeFrozenCamera.matrixWorldInverse);
      return { point, reprojectionPixels: reprojection, insideEncoding, reliable: insideEncoding && reprojection <= 0.75, viewDepth: -viewPoint.z };
    };
    const causalAt = n => {
      const water = worldAt(n, 'unmasked'), bed = worldAt(n, 'masked'), solid = worldAt(n, 'swept'), o = n * 4;
      const p = pixels['swept-mask'], solidAlpha = p[o] / 255, solidDither = p[o + 1] / 255;
      const margin = 1 / 255, reliable = water.reliable && bed.reliable && solid.reliable;
      let classification = 'coveredAmbiguous';
      if (!reliable) classification = 'coveredUnreliableWorld';
      else if (solid.viewDepth > bed.viewDepth + 0.02) classification = 'coveredBelowBed';
      else if (solid.viewDepth < bed.viewDepth - 0.02 && solidAlpha < solidDither - margin) classification = 'coveredAboveBedBothDiscard';
      return { water, bed, solid, solidAlpha, solidDither, classification,
        method: 'Actual masked seabed, unmasked water and solid-swept GPU world varyings at one pixel. RGB8 mask/dither margin1/255; provisional view-depth margin2cm.' };
    };
    for (let n = 0; n < canvas.width * canvas.height; n++) {
      const from = objectAt(pixels['masked-ids'], n), to = objectAt(pixels['unmasked-ids'], n);
      const pair = from + ' -> ' + to;
      counts[pair] = (counts[pair] ?? 0) + 1;
      if (from === 'seabed' && to === 'water') {
        candidates.push(n);
        const solid = objectAt(pixels['swept-solid'], n);
        if (solid === 'swept') {
          candidateSolidCoverage.present++;
          samePixelCausalCounts[causalAt(n).classification]++;
        }
        else if (solid === 'other/background/antialiased') {
          // Coverage can be absent or an edge blend; avoid attributing an antialiased edge to a solid triangle.
          const o = n * 4, p = pixels['swept-solid'];
          if (p[o] > 0 && p[o + 1] === 0 && p[o + 2] === 0) { candidateSolidCoverage.antialiasedOrOther++; samePixelCausalCounts.antialiasedOrOther++; }
          else { candidateSolidCoverage.absent++; samePixelCausalCounts.absentSolid++; }
        } else { candidateSolidCoverage.antialiasedOrOther++; samePixelCausalCounts.antialiasedOrOther++; }
      }
      if (from === 'seabed' && to === 'seabed') dry.push(n);
    }
    const probes = [], rejectedWorldProbes = [];
    for (const [kind, list, count] of [['mask-exposes-seabed', candidates, 12], ['seabed-without-mask', dry, 4]]) {
      for (let j = 0; j < Math.min(count, list.length); j++) {
        const n = list[Math.floor((j + 0.5) * list.length / Math.min(count, list.length))];
        const x = n % canvas.width, y = Math.floor(n / canvas.width), world = [0, 1, 2].map(axis => coordinate(n, axis));
        const o = n * 4, maskPixels = pixels['unmasked-mask'];
        const projected = window.__tubeFrozenCamera.position.clone().fromArray(world).project(window.__tubeFrozenCamera);
        const reprojection = Math.hypot((projected.x + 1) * canvas.width / 2 - (x + 0.5), (projected.y + 1) * canvas.height / 2 - (y + 0.5));
        const insideEncoding = pixels['unmasked-bounds'][o] === 255;
        if (!insideEncoding || reprojection > 0.75) {
          rejectedWorldProbes.push({ kind, pixel: [x, canvas.height - 1 - y], insideEncoding, reprojectionPixels: reprojection,
            reason: 'Clamped/edge-resolved GPU world encoding is not reliable for xz support or wet/dry attribution.' });
          continue;
        }
        probes.push({ label: kind + '-' + j, pixel: [x, canvas.height - 1 - y], fragCoord: [x + 0.5, y + 0.5],
          worldReprojectionPixels: reprojection, worldEncodingWithinBounds: insideEncoding,
          xz: [world[0], world[2]], pickedObject: objectAt(pixels['masked-ids'], n),
          solidSweptCoverage: objectAt(pixels['swept-solid'], n) === 'swept',
          ...(kind === 'mask-exposes-seabed' ? { samePixelWorlds: causalAt(n) } : {}),
          ...(kind === 'mask-exposes-seabed' ? { unmaskedWaterWorld: world, shaderDither: maskPixels[o + 1] / 255,
            gpuMaskAlpha: maskPixels[o] / 255, gpuMaskActive: maskPixels[o + 2] / 255,
            shaderDitherQuantization: 1 / 255 } : { pickedWorld: world, sceneBedY: world[1] }) });
      }
    }
    const geometry = mesh.mesh.geometry, u = water.materialUniforms;
    // Keep the same compiled program/uniforms; output=0 is the original shader output.
    // The final PNG must match the ordinary baseline exactly. Chrome is disposable and closes after capture.
    for (const entry of diagnostic.entries) {
      entry.mesh.visible = entry.visible;
    }
    const shaderProvenance = [];
    for (const entry of diagnostic.entries) {
      if (!entry.originalSources || !entry.instrumentedSources) throw Error('Diagnostic shader was not compiled: ' + entry.name);
      const m = entry.material, depth = { test: m.depthTest, write: m.depthWrite, func: m.depthFunc, side: m.side,
        transparent: m.transparent, blending: m.blending, polygonOffset: m.polygonOffset,
        polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits };
      if (JSON.stringify(depth) !== JSON.stringify(entry.depth)) throw Error('Diagnostic altered material depth/raster state');
      const sources = {};
      for (const [kind, source] of Object.entries(entry.originalSources)) sources['original' + kind] = await hash(new TextEncoder().encode(source));
      for (const [kind, source] of Object.entries(entry.instrumentedSources)) sources['instrumented' + kind] = await hash(new TextEncoder().encode(source));
      shaderProvenance.push({ name: entry.name, sources, depth, method: 'Original callback runs first; only varying/output appended, with swept-discard bypass uniform0 except the explicitly labelled solid pass. No vertex-displacement or depth code replaced.' });
    }
    const result = { counts, candidateSolidCoverage, samePixelCausalCounts, probes, rejectedWorldProbes, shaderProvenance, method: 'Same held camera, shader geometry/discard/depth; masked ID scene vs tube-hidden and mask-disabled ID scene. Normal shots are output0 instrumented originals.',
      supportInput: { capture: { held: true, clocks: { snapshot: host.snapshot.status.seaTime, source: fixture.status.seaTime, shading: u.waterTime.value },
        camera: { position: window.__tubeFrozenCamera.position.toArray(), quaternion: window.__tubeFrozenCamera.quaternion.toArray(), projection: window.__tubeFrozenCamera.projectionMatrix.toArray() },
        viewport: { width: canvas.width, height: canvas.height, pixelRatio: 1 } },
      mask: { grid: water.barrelMaskGrid, bytes: Array.from(u.waterBarrelMask.value.image.data), active: diagnostic.active.value > 0.5 },
      mesh: { positions: Array.from(geometry.attributes.position.array.subarray(0, current.loft.vertexCount * 3)),
        indices: Array.from(geometry.index.array.subarray(0, current.loft.indexCount)), start: geometry.drawRange.start, count: geometry.drawRange.count, visible: true },
      water: { grid: fixture.grid, surface: Array.from(water.surfaceData), bed: Array.from(bed), look: 'rich' }, probes } };
    diagnostic.output.value = 0;
    diagnostic.bypass.value = 0;
    maskDisabled = false;
    hidden = false;
    return result;
  }
  window.__tubeFrozen = { setFixture, setGeometry, render, holdCaustics, beginDiagnostic, diagnosticRender, finishDiagnostic };
  return { initializedCompute: 'cpu' };
}
const helperSource = `(${installFrozenHelpers.toString()})()`;
new Function(helperSource);
const localSources = ['src/main.ts', 'src/scene/WaterSurface.ts', 'src/scene/barrel/SweptBarrelMesh.ts', 'src/scene/FarFieldOcean.ts', 'scripts/browser/tube-frozen-render.mjs'];
const plan = { schema: 1, url: url.href, width, height, pixelRatio: 1, timeoutSeconds: seconds, headless,
  viewportMethod: headless ? 'Emulation.setDeviceMetricsOverride (DPR 1)' : 'Native window resizing, followed by renderer DPR 1',
  fov: args.fov === undefined ? 'Current SpectatorCamera default (52 degrees)' : positive('fov', 52, 120),
  timeOfDay: 'midday', richLook: true, originalPixelNormals: true, initializedCompute: 'cpu', physicsSteps: 0,
  cameraMode, maskDiagnostic, freezeCaustics,
  sequence: ['baseline', 'baseline-hidden', ...(args['baseline-only'] === 'true' ? [] : ['current']), 'baseline-repeat'],
  fixtures: fixtures.map(f => ({ at: f.at, path: f.path, fileSha256: f.fileSha256, surfaceSha256: f.surfaceSha256, frontSha256: f.frontSha256, restoredFrontNaNs: f.frontNaNs,
    baseline: f.baseline.metadata, current: f.current?.metadata ?? { pendingExport: f.currentPath } })),
  sourceHashes: Object.fromEntries(localSources.map(path => [path, sha(readFileSync(path))])),
  method: 'Ordinary diagnostics page with RAF blocked before startup; same rich renderer, fixed camera/sea clock, exported loft+mask swapped without simulation advance; baseline PNG/state must repeat exactly. With mask diagnostics, normal captures are output0 instrumented originals, not byte-identical unwrapped shader source.',
  limitations: [
    'Captures contain height/foam/front but no bed, flow, aeration, particles or rider pose. Bed/far field are reconstructed from the recorded config; flow/aeration are zero and rider/particles/lip sheet are hidden.',
    'The default camera frames baseline tube bounds because saved spectator views can face away from all tubes. --camera=saved restores captured position/quaternion. Original viewport, projection and sun metadata were not captured; this run fixes the listed viewport/FOV and actual game midday lighting for both variants.',
    'Saved GPU status selects actual fixed-sea-time FFT shading; CPU is used only for zero-spin-up initialization. CPU textures are hashed, FFT render-target pixels are covered by the exact baseline PNG repeat.',
    'This isolates exported geometry and its mask. It does not replay a moving tube, rider contact, live frame rate, or reproduce every missing effect from the original screenshot.',
  ] };
if (args.plan === 'true') {
  console.log(JSON.stringify({ ...plan, readyForComparison: fixtures.every(f => f.current) || args['baseline-only'] === 'true', browserLaunched: false }, null, 2));
  process.exit(0);
}
if (args['baseline-only'] !== 'true' && fixtures.some(f => !f.current)) throw Error('Current exports are missing; --plan can validate the pending comparison');
mkdirSync(out, { recursive: true });
const report = { ...plan, date: new Date().toISOString(), pairs: [], valid: false, failures: [] };
const save = () => writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
let chrome, profile, page, watchdog;
const started = Date.now();
async function bounded(promise, label) {
  const remaining = seconds * 1000 - (Date.now() - started);
  if (remaining <= 0) throw Error('Frozen render deadline expired: ' + label);
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Frozen render deadline: ' + label)), remaining); })]); }
  finally { clearTimeout(timer); }
}
async function bundleMetadata() {
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) }), index = new Uint8Array(await response.arrayBuffer());
  if (!response.ok) throw Error('Preview index unavailable');
  const metadata = { indexSha256: sha(index), verifiedDirectory: false, servedJavaScript: {} };
  if (args.dir) {
    const dir = resolve(args.dir);
    if (sha(readFileSync(join(dir, 'index.html'))) !== metadata.indexSha256) throw Error('Served preview differs from --dir index');
    const files = readdirSync(join(dir, 'assets')).filter(name => name.endsWith('.js')).sort();
    const h = createHash('sha256'); h.update('index.html'); h.update(index);
    for (const name of files) {
      const file = 'assets/' + name, expected = readFileSync(join(dir, file)), r = await fetch(new URL(file, url), { signal: AbortSignal.timeout(5000) }), bytes = new Uint8Array(await r.arrayBuffer());
      if (!r.ok || sha(bytes) !== sha(expected)) throw Error('Served preview differs from --dir ' + file);
      metadata.servedJavaScript[file] = sha(bytes); h.update(file); h.update(bytes);
    }
    metadata.verifiedDirectory = dir; metadata.bundleSha256 = h.digest('hex');
  } else {
    for (const [, path] of new TextDecoder().decode(index).matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)) {
      const r = await fetch(new URL(path, url), { signal: AbortSignal.timeout(5000) }); if (!r.ok) throw Error('Entry script unavailable: ' + path);
      metadata.servedJavaScript[path] = sha(new Uint8Array(await r.arrayBuffer()));
    }
    metadata.limitation = 'No immutable --dir supplied: served entry scripts are hashed, but transitive modules are not verified against local source hashes.';
  }
  return metadata;
}
try {
  report.rendererRuntime = await bounded(bundleMetadata(), 'runtime provenance');
  const port = positive('cdp', 9461, 65535);
  try { await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(500) }); throw Error('CDP port already occupied; choose a new --cdp'); }
  catch (error) { if (error.message.startsWith('CDP port')) throw error; }
  profile = mkdtempSync(join(tmpdir(), 'breakline-tube-frozen-'));
  chrome = spawn(process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio',
    '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
    ...(headless ? ['--headless=new'] : ['--window-position=60,60']),
    `--window-size=${width},${headless ? height : height + 40}`, headless ? 'about:blank' : '--app=about:blank',
  ], { stdio: 'ignore' });
  chrome.on('error', error => report.failures.push(String(error)));
  watchdog = setTimeout(() => chrome?.kill(), seconds * 1000 - (Date.now() - started));
  let target;
  for (let i = 0; i < 100 && !target; i++) {
    if (report.failures.length || chrome.exitCode !== null) throw Error('Owned Chrome failed to start');
    await bounded(sleep(100), 'Chrome startup');
    try { const list = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(500) })).json(); target = list.find(t => t.type === 'page' && t.url === 'about:blank'); }
    catch { /* Chrome is starting. */ }
  }
  if (!target) throw Error('Owned Chrome blank page unavailable');
  page = await bounded(Page.connect(target.webSocketDebuggerUrl), 'CDP connection');
  await bounded(page.send('Page.enable'), 'Page.enable');
  await bounded(page.send('Runtime.enable'), 'Runtime.enable');
  if (headless) await bounded(page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }), 'headless viewport');
  else await bounded(page.fitViewport(width, height), 'headed viewport');
  page.on('Runtime.exceptionThrown', e => report.failures.push(e.exceptionDetails.exception?.description ?? e.exceptionDetails.text));
  page.on('Runtime.consoleAPICalled', e => { if (e.type === 'error') report.failures.push(e.args.map(a => a.value ?? a.description ?? '').join(' ')); });
  const instrument = `(()=>{let seed=0x5eed;Math.random=()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};window.__tubeFrozenBlockedRafs=0;window.requestAnimationFrame=()=>++window.__tubeFrozenBlockedRafs;window.cancelAnimationFrame=()=>{};window.__tubeFrozenOptions=${JSON.stringify({ width, height, maskDiagnostic, freezeCaustics, ...(args.fov ? { fov: Number(args.fov) } : {}) })};localStorage.setItem('breakline.settings.v1',JSON.stringify({graphics:{preset:'high',frameLimit:'60',waterLook:'rich',particles:'high'},detected:{preset:'high',water:'accurate',lowPerformance:false},seen:{rideHints:true,lowPerformanceNotice:true}}));})();`;
  await bounded(page.send('Page.addScriptToEvaluateOnNewDocument', { source: instrument }), 'freeze instrumentation');
  await bounded(page.send('Page.navigate', { url: url.href }), 'preview navigation');
  await bounded(page.waitFor('window.breaklineDiagnostics && window.breaklineLab', 30000), 'diagnostics bootstrap');
  const first = fixtures[0].payload, config = first.config;
  const settings = { spot: config.spot, stage: config.stage, compute: 'cpu', source: 'buoy', significantHeight: config.significantHeight, peakPeriod: config.peakPeriod,
    directionDegrees: config.directionDegrees, spreading: config.spreading, spread: 0, tide: config.tide, windSpeed: config.windSpeed,
    stormWindSpeed: 18, stormFetchKm: 600, stormDurationHours: 36, stormDistanceKm: 3000 };
  const overrides = { ...config, compute: 'cpu', dx: first.init.dx, spinUpPeriods: 0, startSeaTime: first.status.seaTime };
  report.initial = await bounded(page.eval(`(async()=>{const d=window.breaklineDiagnostics;window.breaklineLab.clock.paused=true;await d.start(${JSON.stringify(settings)},${JSON.stringify(overrides)},{rider:false,lab:true});if(d.mode.host.outstandingSteps)throw Error('Initializer advanced');await d.mode.sweptBarrel.ready;d.resize(${width},${height});d.setWaterLook('rich');d.water.setVertexNormals(false);await d.setTimeOfDay('midday');const style=document.createElement('style');style.textContent='#ui,#touch-controls,#loading,#app::after{display:none!important}#scene{opacity:1!important;transition:none!important}#app{background:transparent!important}*,*::before,*::after{animation:none!important;transition:none!important}';document.head.append(style);return{config:d.mode.config,grid:d.mode.host.init.grid,status:d.mode.host.snapshot.status};})()`), 'zero-step initialization');
  report.browser = await bounded(page.eval(`(()=>{const canvas=window.breaklineDiagnostics.canvas,gl=canvas.getContext('webgl2')??canvas.getContext('webgl');if(!gl)throw Error('Actual game GL context unavailable');const debug=gl.getExtension('WEBGL_debug_renderer_info');return{userAgent:navigator.userAgent,headlessRequested:${headless},headlessReportedInUserAgent:navigator.userAgent.includes('HeadlessChrome'),viewport:{width:innerWidth,height:innerHeight,devicePixelRatio},canvas:{width:canvas.width,height:canvas.height},gl:{vendor:gl.getParameter(gl.VENDOR),renderer:gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION),shadingLanguageVersion:gl.getParameter(gl.SHADING_LANGUAGE_VERSION),debugRendererInfoAvailable:Boolean(debug),unmaskedVendor:debug?gl.getParameter(debug.UNMASKED_VENDOR_WEBGL):null,unmaskedRenderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null}};})()`), 'browser and graphics provenance');
  if (report.browser.viewport.width !== width || report.browser.viewport.height !== height || report.browser.canvas.width !== width || report.browser.canvas.height !== height
    || headless && report.browser.viewport.devicePixelRatio !== 1) throw Error('Actual QA viewport/canvas differs from the plan');
  if (report.initial.status.compute !== 'cpu' || !sameGrid(report.initial.grid, first.grid) || report.initial.status.seaTime !== first.status.seaTime) throw Error('Initializer grid/clock/compute differs');
  await bounded(page.eval(helperSource), 'frozen helper');
  for (const fixture of fixtures) {
    await bounded(page.eval(`window.__tubeFrozen.setFixture(${JSON.stringify(fixture.payload)})`), 'fixture upload');
    await bounded(page.eval(`window.__tubeFrozen.setGeometry(${JSON.stringify(fixture.baseline.payload)})`), 'warm-up geometry upload');
    const warmup = [];
    for (let i = 0; i < 3; i++) warmup.push(await bounded(page.eval('window.__tubeFrozen.render(false)'), 'held shader/target warm-up'));
    const causticHold = await bounded(page.eval('window.__tubeFrozen.holdCaustics()'), 'optional exact caustic-target hold');
    if (maskDiagnostic) {
      await bounded(page.eval('window.__tubeFrozen.beginDiagnostic()'), 'persistent diagnostic shader installation');
      for (let i = 0; i < 2; i++) await bounded(page.eval('window.__tubeFrozen.render(false)'), 'instrumented output0 warm-up');
    }
    const shots = [];
    for (const mode of plan.sequence) {
      const geometry = mode === 'current' ? fixture.current : fixture.baseline;
      await bounded(page.eval(`window.__tubeFrozen.setGeometry(${JSON.stringify(geometry.payload)})`), 'geometry upload');
      const state = await bounded(page.eval(`window.__tubeFrozen.render(${mode === 'baseline-hidden'})`), 'held render/signature');
      if (!state.evidence.projectedLiftedVertices) throw Error('No lifted tube geometry is inside the camera frustum');
      if (state.common.surface !== fixture.surfaceSha256 || state.common.front !== fixture.frontSha256) throw Error('Frozen renderer changed saved surface/front');
      if (state.variant.mask !== geometry.metadata.maskSha256 || state.variant.attributes.position !== geometry.payload.loft.positions.sha256
        || state.variant.attributes.normal !== geometry.payload.loft.normals.sha256) throw Error('Actual renderer differs from exported mask/positions/normals');
      const screenshot = await bounded(page.send('Page.captureScreenshot', { format: 'png' }), 'held screenshot');
      const png = Buffer.from(screenshot.data, 'base64'), path = join(out, `at-${fixture.at}.${mode}.png`);
      writeFileSync(path, png);
      shots.push({ mode, path, pngSha256: sha(png), geometryHash: geometry.metadata.geometryHash, state });
      save();
    }
    const firstShot = shots[0], repeat = shots.at(-1);
    const commonUnchanged = shots.every(s => JSON.stringify(s.state.common) === JSON.stringify(firstShot.state.common));
    const baselineStateExact = JSON.stringify(firstShot.state.variant) === JSON.stringify(repeat.state.variant);
    const baselineImageExact = firstShot.pngSha256 === repeat.pngSha256;
    const tubeChangesImage = shots.find(s => s.mode === 'baseline-hidden').pngSha256 !== firstShot.pngSha256;
    report.pairs.push({ at: fixture.at, commonUnchanged, baselineStateExact, baselineImageExact, tubeChangesImage, warmup, causticHold, shots });
    save();
    if (!commonUnchanged || !baselineStateExact || !baselineImageExact || !tubeChangesImage) throw Error('Held rendering failed visibility/state/image checks');
    if (maskDiagnostic) {
      const diagnostics = [];
      for (const variant of args['baseline-only'] === 'true' ? ['baseline'] : ['baseline', 'current']) {
        const geometry = variant === 'baseline' ? fixture.baseline : fixture.current;
        await bounded(page.eval(`window.__tubeFrozen.setGeometry(${JSON.stringify(geometry.payload)})`), 'diagnostic geometry upload');
        const held = await bounded(page.eval('window.__tubeFrozen.render(false)'), 'diagnostic held signature');
        const metadata = await bounded(page.eval('window.__tubeFrozen.beginDiagnostic()'), 'diagnostic shader installation');
        const passes = [];
        for (const pass of ['masked-ids', 'masked-x', 'masked-y', 'masked-z', 'masked-bounds',
          'unmasked-ids', 'unmasked-x', 'unmasked-y', 'unmasked-z', 'unmasked-mask', 'unmasked-bounds',
          'swept-solid', 'swept-x', 'swept-y', 'swept-z', 'swept-mask', 'swept-bounds']) {
          const state = await bounded(page.eval(`window.__tubeFrozen.diagnosticRender(${JSON.stringify(pass)})`), 'diagnostic ' + pass);
          if (state.seaTime !== fixture.payload.status.seaTime) throw Error('Diagnostic clock advanced');
          if (['masked-ids', 'unmasked-ids', 'swept-solid'].includes(pass)) {
            const screenshot = await bounded(page.send('Page.captureScreenshot', { format: 'png' }), 'diagnostic screenshot');
            const png = Buffer.from(screenshot.data, 'base64'), path = join(out, `at-${fixture.at}.${variant}.${pass}.png`);
            writeFileSync(path, png);
            passes.push({ ...state, path, pngSha256: sha(png) });
          } else passes.push(state);
        }
        const result = await bounded(page.eval('window.__tubeFrozen.finishDiagnostic()'), 'diagnostic ID comparison and source export');
        const supportPath = join(out, `at-${fixture.at}.${variant}.support-input.json`);
        writeFileSync(supportPath, JSON.stringify(result.supportInput) + '\n');
        const restored = await bounded(page.eval('window.__tubeFrozen.render(false)'), 'diagnostic shader restoration');
        const restoreDiffPath = join(out, `at-${fixture.at}.${variant}.restoration.json`);
        writeFileSync(restoreDiffPath, JSON.stringify({ held, restored }, null, 2) + '\n');
        if (JSON.stringify(held) !== JSON.stringify(restored) && (JSON.stringify(held.common) !== JSON.stringify(restored.common)
          || JSON.stringify(held.variant) !== JSON.stringify(restored.variant))) throw Error('Diagnostic mutated held render state');
        diagnostics.push({ variant, geometryHash: geometry.metadata.geometryHash, metadata, counts: result.counts, candidateSolidCoverage: result.candidateSolidCoverage,
          samePixelCausalCounts: result.samePixelCausalCounts,
          probes: result.probes, rejectedWorldProbes: result.rejectedWorldProbes, shaderProvenance: result.shaderProvenance, passes,
          supportPath, supportSha256: sha(readFileSync(supportPath)), restoredStateExact: true });
      }
      await bounded(page.eval(`window.__tubeFrozen.setGeometry(${JSON.stringify(fixture.baseline.payload)})`), 'post-diagnostic baseline upload');
      await bounded(page.eval('window.__tubeFrozen.render(false)'), 'post-diagnostic baseline render');
      const screenshot = await bounded(page.send('Page.captureScreenshot', { format: 'png' }), 'post-diagnostic repeat screenshot');
      const png = Buffer.from(screenshot.data, 'base64');
      const exact = sha(png) === firstShot.pngSha256;
      writeFileSync(join(out, `at-${fixture.at}.post-diagnostic-repeat.png`), png);
      report.pairs.at(-1).diagnostics = { postDiagnosticBaselineImageExact: exact, variants: diagnostics };
      save();
      if (!exact) throw Error('Diagnostic shader restoration changed baseline image');
    }
  }
  report.valid = report.failures.length === 0 && report.pairs.length === fixtures.length;
  if (!report.valid) process.exitCode = 1;
} catch (error) { report.failure = String(error.stack ?? error); process.exitCode = 1; console.error(report.failure); }
finally {
  clearTimeout(watchdog);
  page?.socket.close();
  if (chrome) { chrome.kill(); await sleep(500); if (chrome.exitCode === null) chrome.kill('SIGKILL'); }
  if (profile) rmSync(profile, { recursive: true, force: true });
  report.elapsedSeconds = (Date.now() - started) / 1000;
  save();
}
console.log(JSON.stringify({ valid: report.valid, report: join(out, 'report.json'), images: report.pairs.flatMap(p => p.shots.map(s => s.path)) }));
