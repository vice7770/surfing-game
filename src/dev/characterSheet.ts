/**
 * The G7 screenshot sheet (character-sheet.html): each surfer prone, standing
 * and fallen, at chase distance and at 1.5 m, under one photographed sky, on
 * flat water. `?sky=dawn|midday|sunset` picks the sky, `?row=r&col=c` draws one
 * tile full size, and `?sun` looks along the sun to check that the photo's sun
 * and the light's glint line up. `?riding` draws Part B's riding moments instead,
 * each simulated by the real rider (Regular rows 1 and 3, Goofy rows 2 and 4).
 * `?stances` draws every stance of the stance map for one surfer
 * (`&surfer=0–3`, `&side=goofy`), each beside its reference figure (magenta,
 * built from the map's targets on the surfer's own proportions) with the
 * measures the drawn body misses listed under it.
 */
import {
  BufferGeometry, DirectionalLight, Float32BufferAttribute, LineBasicMaterial, LineSegments, Mesh, MeshPhysicalMaterial, NeutralToneMapping, PerspectiveCamera,
  PlaneGeometry, Points, PointsMaterial, Quaternion, Scene, Vector3, WebGLRenderer, type Bone,
} from 'three';
import { buildBoardShape } from '../physics/boardShape';
import { createBoardMesh } from '../scene/BoardMesh';
import { BOARD_DESIGNS } from '../scene/board/boardDesigns';
import { SkinnedSurfer } from '../scene/character/SkinnedSurfer';
import type { OutfitId } from '../scene/character/outfits';
import { PhotoSky, type TimeOfDay } from '../scene/PhotoSky';
import { ShadowRig, parseShadowLevel } from '../scene/ShadowRig';
import { posturePoints } from '../scene/rig/posturePoints';
import { POINT, createRiderVisualState, type RiderVisualState } from '../scene/rig/riderVisualState';
import { StanceGauge, measureJoints, type StanceJoints } from '../scene/rig/stanceGauge';
import { STANCES } from '../scene/rig/stanceMap';
import { MOMENT_STANCE, RIDING_MOMENTS, drawnStance } from './ridingPoses';
import { figureAngles, figureLengths, figurePlan, referenceJoints } from './stanceFigure';
import { MEASURE_LABEL, compareStance, formatMeasure } from './stanceReport';

const params = new URLSearchParams(window.location.search);
const timeOfDay = (params.get('sky') ?? 'midday') as TimeOfDay;
const SURFERS = ['surfer1', 'surfer2', 'surfer3', 'surfer4'];
/** One outfit each, so the sheet shows all four: the women in the full suit and the bikini, the men in the shorts and the spring suit. */
const DRESS: readonly OutfitId[] = ['fullsuit', 'vestBikini', 'vestShorts', 'springsuit'];
const TILE = { width: 300, height: 360 };
const riding = params.has('riding');
const stances = params.has('stances');
const COLUMNS = riding ? RIDING_MOMENTS.length : 6;
/** The stances view: one surfer, its stance (Regular or Goofy), the map's stances six to a row. */
const STANCE_SURFER = Math.min(3, Math.max(0, Number(params.get('surfer') ?? 0)));
const STANCE_SIDE = params.get('side') === 'goofy' ? 'goofy' : 'regular';
const ROWS = stances ? Math.ceil(STANCES.length / COLUMNS) : SURFERS.length;
const status = document.getElementById('status')!;
const canvas = document.getElementById('sheet') as HTMLCanvasElement;

const renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = 'srgb';
renderer.toneMapping = NeutralToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setPixelRatio(1);

const scene = new Scene();
const sky = new PhotoSky(renderer);
const sun = new DirectionalLight();
scene.add(sun, sun.target);
const water = new Mesh(new PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new MeshPhysicalMaterial({ color: '#1d5d6b', roughness: 0.06, ior: 1.333 }));
scene.add(water);
const boardPosition = new Vector3(0, 0.03, 0);
const boardShape = buildBoardShape();
/** Each row rides a different board design. */
const boards = SURFERS.map((_, i) => {
  const board = createBoardMesh(boardShape, BOARD_DESIGNS[i % BOARD_DESIGNS.length]);
  board.position.copy(boardPosition);
  board.visible = false;
  scene.add(board);
  return board;
});
const camera = new PerspectiveCamera(40, TILE.width / TILE.height, 0.05, 500);
const shadows = new ShadowRig(renderer, sun, scene);
shadows.setLevel(parseShadowLevel(window.location.search), { surfaces: [water] });

/** The stance map's reference figure: its limbs as lines and its joints as dots, drawn over the surfer. */
const figureLines = new LineSegments(new BufferGeometry(), new LineBasicMaterial({ color: '#ff3cf0', depthTest: false, transparent: true }));
const figureJoints = new Points(new BufferGeometry(), new PointsMaterial({ color: '#ff3cf0', size: 5, sizeAttenuation: false, depthTest: false, transparent: true }));
figureLines.renderOrder = figureJoints.renderOrder = 10;
figureLines.visible = figureJoints.visible = false;
scene.add(figureLines, figureJoints);

function showFigure(joints: StanceJoints): void {
  const pairs: [import('three').Vector3, import('three').Vector3][] = [
    [joints.hip.left, joints.hip.right], [joints.hips, joints.spine], [joints.spine, joints.neck], [joints.neck, joints.head],
    [joints.head, joints.head.clone().addScaledVector(joints.headFacing, 0.18)], [joints.shoulder.left, joints.shoulder.right],
  ];
  for (const side of ['left', 'right'] as const) {
    pairs.push([joints.ankle[side], joints.knee[side]], [joints.knee[side], joints.hip[side]], [joints.ankle[side], joints.toe[side]]);
    pairs.push([joints.shoulder[side], joints.elbow[side]], [joints.elbow[side], joints.wrist[side]]);
  }
  figureLines.geometry.setAttribute('position', new Float32BufferAttribute(pairs.flatMap(([a, b]) => [a.x, a.y, a.z, b.x, b.y, b.z]), 3));
  figureJoints.geometry.setAttribute('position', new Float32BufferAttribute(pairs.flatMap(([a]) => [a.x, a.y, a.z]), 3));
  figureLines.visible = figureJoints.visible = true;
}

/** A label over a tile of the sheet, placed in its share of the canvas (the canvas scales to the page). */
function label(column: number, row: number, columns: number, rows: number, html: string): void {
  let layer = document.getElementById('labels');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'labels';
    Object.assign(layer.style, { position: 'relative' });
    canvas.before(layer);
    layer.append(canvas);
  }
  const tag = document.createElement('div');
  Object.assign(tag.style, {
    position: 'absolute', left: `${(column / columns) * 100}%`, top: `${(row / rows) * 100}%`, width: `${100 / columns}%`,
    padding: '4px 6px', boxSizing: 'border-box', background: 'rgba(13,17,23,0.55)', fontSize: '11px', lineHeight: '1.35',
  });
  tag.innerHTML = html;
  layer.append(tag);
}

/** A body floating face down beside the board, limbs spread (the detached surfer's limb centres). */
function fallenState(out: RiderVisualState): RiderVisualState {
  const points: [number, number, number][] = [[0.8, 0, 0], [0.8, 0.02, 0.3], [0.8, 0.05, 0.62], [1.1, -0.04, 0.45], [0.5, -0.04, 0.45], [0.92, -0.08, -0.42], [0.68, -0.08, -0.42]];
  points.forEach(([x, y, z], i) => out.points[i].set(x, y, z));
  out.phase = 'fallen';
  out.heading = 0;
  out.boardPosition.copy(boardPosition);
  out.boardQuaternion.identity();
  out.stroking = 0;
  return out;
}

interface Shot { pose: 'prone' | 'standing' | 'fallen'; eye: [number, number, number]; look: [number, number, number] }
/** Chase (about 4.5 m back and to the chest's side) and close (about 1.5 m from the chest) for each pose. */
const SHOTS: Shot[] = [
  { pose: 'prone', eye: [-2.6, 1.7, -3.2], look: [0, 0.25, 0] },
  { pose: 'prone', eye: [-1.2, 0.75, 0.9], look: [0, 0.3, 0] },
  { pose: 'standing', eye: [-2.4, 1.9, -3.6], look: [0, 0.95, 0] },
  { pose: 'standing', eye: [-1.45, 1.35, 0.35], look: [0, 1.0, 0] },
  { pose: 'fallen', eye: [2.9, 1.9, -2.6], look: [0.8, 0, 0.1] },
  { pose: 'fallen', eye: [1.9, 1.2, 1.5], look: [0.8, 0, 0.2] },
];

function poseFor(shot: Shot, state: RiderVisualState): RiderVisualState {
  if (shot.pose === 'fallen') return fallenState(state);
  return posturePoints(shot.pose, 'regular', boardPosition, new Quaternion(), state);
}

async function main(): Promise<void> {
  const skies = await sky.loadManifest();
  const entry = skies.find((s) => s.timeOfDay === timeOfDay) ?? skies[0];
  await sky.select((Math.asin(entry.sun.direction[1]) * 180) / Math.PI, -25);
  sky.applyTo(scene, [water.material]);
  scene.background = sky.background!;
  sun.color.copy(sky.sunColor);
  sun.intensity = sky.sunIntensity;
  sun.position.copy(sky.sunDirection).multiplyScalar(40);
  shadows.follow(boardPosition, sky.sunDirection, 0);

  if (params.has('sun')) {
    // Look along the sun's azimuth, low: the photo's sun and the glint on the flat water should share a vertical line.
    renderer.setSize(1200, 700, false);
    camera.aspect = 1200 / 700;
    camera.fov = 50;
    camera.position.set(0, 1.5, 0);
    const toward = new Vector3(sky.sunDirection.x, 0, sky.sunDirection.z).normalize();
    camera.lookAt(toward.multiplyScalar(50).setY(Math.max(1.5, sky.sunDirection.y * 50 * 0.6)));
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    status.textContent = `sun check · ${entry.id} · sun ${(Math.asin(sky.sunDirection.y) * 180 / Math.PI).toFixed(1)}° up`;
    (window as unknown as { sheetReady: boolean }).sheetReady = true;
    return;
  }

  const surfers = await Promise.all(SURFERS.map((id) => SkinnedSurfer.load(`assets/surfers/${id}.glb`)));
  surfers.forEach((surfer, i) => {
    surfer.setOutfit(DRESS[i]);
    surfer.group.visible = false;
    scene.add(surfer.group);
  });
  const row = params.get('row');
  const col = params.get('col');
  const single = row !== null && col !== null;
  const scale = single ? 3 : 1;
  const width = single ? TILE.width * scale : TILE.width * COLUMNS;
  const height = single ? TILE.height * scale : TILE.height * ROWS;
  renderer.setSize(width, height, false);
  renderer.setScissorTest(true);
  const state = createRiderVisualState();
  if (stances) {
    drawStances(surfers, single, scale, row, col);
    status.textContent = `${entry.id} · stances · ${SURFERS[STANCE_SURFER]} ${STANCE_SIDE} · magenta: the map's reference figure · red: measures outside the map`;
    (window as unknown as { sheetReady: boolean }).sheetReady = true;
    return;
  }
  for (let r = 0; r < surfers.length; r += 1) {
    for (let c = 0; c < COLUMNS; c += 1) {
      if (single && (r !== Number(row) || c !== Number(col))) continue;
      surfers.forEach((surfer, i) => { surfer.group.visible = i === r; });
      boards.forEach((board, i) => { board.visible = i === r; });
      const stance = r % 2 === 0 ? 'regular' : 'goofy';
      // Riding, the camera stands on the chest's side (Regular faces −x, Goofy +x).
      const shot: Shot = riding
        ? { pose: 'standing', eye: [stance === 'regular' ? -2.9 : 2.9, 1.5, 1.4], look: [0, 0.75, 0.2] }
        : SHOTS[c];
      // Each tile is a still: nothing blends from the tile before. Riding, the moment is drawn as the game draws it,
      // every step of the run through the surfer's smoothing layer.
      surfers[r].resetMotion();
      if (riding) {
        const { state: drawn } = drawnStance(MOMENT_STANCE[RIDING_MOMENTS[c]], stance, boardPosition, (step) => surfers[r].update(step, new Vector3(...shot.eye)));
        boards[r].quaternion.copy(drawn.boardQuaternion);
      } else {
        surfers[r].update(poseFor(shot, state), new Vector3(...shot.eye));
      }
      camera.aspect = TILE.width / TILE.height;
      camera.fov = 40;
      camera.position.set(...shot.eye);
      camera.lookAt(new Vector3(...shot.look));
      camera.updateProjectionMatrix();
      const x = single ? 0 : c * TILE.width;
      const y = single ? 0 : (surfers.length - 1 - r) * TILE.height;
      renderer.setViewport(x, y, TILE.width * scale, TILE.height * scale);
      renderer.setScissor(x, y, TILE.width * scale, TILE.height * scale);
      renderer.render(scene, camera);
    }
  }
  status.textContent = riding
    ? `${entry.id} · riding · rows ${SURFERS.join(', ')} (regular, goofy, regular, goofy) · columns ${RIDING_MOMENTS.join(', ')}`
    : `${entry.id} · rows ${SURFERS.join(', ')} in ${DRESS.join(', ')} · columns prone, standing, fallen × chase, 1.5 m · head ${POINT.head}`;
  (window as unknown as { sheetReady: boolean }).sheetReady = true;
}

/** The stances view: each stance of the map, drawn and measured, beside its reference figure. */
function drawStances(surfers: SkinnedSurfer[], single: boolean, scale: number, row: string | null, col: string | null): void {
  const surfer = surfers[STANCE_SURFER];
  const bones = new Map<string, Bone>();
  surfer.group.traverse((object) => { if ((object as Bone).isBone) bones.set(object.name, object as Bone); });
  // Built at the bind pose, before the surfer is first posed: the gauge's facings and the figure's proportions.
  const gauge = new StanceGauge(bones);
  const lengths = figureLengths(gauge.joints());
  surfers.forEach((other, i) => { other.group.visible = i === STANCE_SURFER; });
  boards.forEach((board, i) => { board.visible = i === STANCE_SURFER; });
  const eye = new Vector3(STANCE_SIDE === 'regular' ? -2.9 : 2.9, 1.5, 1.4);
  STANCES.forEach((stance, i) => {
    const c = i % COLUMNS;
    const r = Math.floor(i / COLUMNS);
    if (single && (r !== Number(row) || c !== Number(col))) return;
    // Drawn as the game draws it: every step of the run through the surfer's smoothing layer.
    surfer.resetMotion();
    const { state, reached } = drawnStance(stance.id, STANCE_SIDE, boardPosition, (step) => surfer.update(step, eye));
    boards[STANCE_SURFER].quaternion.copy(state.boardQuaternion);
    const drawn = gauge.measure(state, STANCE_SIDE);
    const inverse = state.boardQuaternion.clone().invert();
    const onBoard = (point: Vector3) => point.clone().sub(state.boardPosition).applyQuaternion(inverse);
    const joints = gauge.joints();
    const front = STANCE_SIDE === 'regular' ? 'left' : 'right';
    const feet = { front: onBoard(joints.ankle[front]), rear: onBoard(joints.ankle[front === 'left' ? 'right' : 'left']) };
    // The figure stands a stance: none for lying, the push, lying down or the water. What it cannot meet itself
    // (targets that disagree: one trunk for two hips and a trunk angle) is listed apart.
    let conflicts: string[] = [];
    if (state.phase === 'standing' || state.phase === 'landing') {
      const figure = referenceJoints(figureAngles(stance, drawn), lengths, feet, STANCE_SIDE, state, figurePlan(stance));
      showFigure(figure);
      conflicts = compareStance(stance, [{ surfer: 'figure', stance: STANCE_SIDE, reached: true, angles: measureJoints(figure, state, STANCE_SIDE) }]).rows
        .filter((entry) => entry.status === 'out').map((entry) => MEASURE_LABEL[entry.measure].toLowerCase());
    } else {
      figureLines.visible = figureJoints.visible = false;
    }
    camera.aspect = TILE.width / TILE.height;
    camera.fov = 40;
    camera.position.copy(eye);
    camera.lookAt(new Vector3(0, 0.75, 0.2));
    camera.updateProjectionMatrix();
    const x = single ? 0 : c * TILE.width;
    const y = single ? 0 : (ROWS - 1 - r) * TILE.height;
    renderer.setViewport(x, y, TILE.width * scale, TILE.height * scale);
    renderer.setScissor(x, y, TILE.width * scale, TILE.height * scale);
    renderer.render(scene, camera);
    const { rows } = compareStance(stance, [{ surfer: SURFERS[STANCE_SURFER], stance: STANCE_SIDE, reached, angles: drawn }]);
    const misses = rows.filter((entry) => entry.status === 'out')
      .map((entry) => `<span style="color:#ff7b72">${MEASURE_LABEL[entry.measure]} ${formatMeasure(entry.measure, entry.regular.count ? entry.regular.mean : entry.goofy.mean)} (${formatMeasure(entry.measure, entry.target.min)}–${formatMeasure(entry.measure, entry.target.max)})</span>`);
    const met = rows.filter((entry) => entry.status === 'in').length;
    label(single ? 0 : c, single ? 0 : r, single ? 1 : COLUMNS, single ? 1 : ROWS,
      `<b>${stance.name}</b>${reached ? '' : ' <span style="color:#ff7b72">(not reached)</span>'}<br>${met} of ${rows.length} met${misses.length ? `<br>${misses.join('<br>')}` : ''}`
      + (conflicts.length ? `<br><span style="color:#b9a7c9">the figure cannot meet: ${conflicts.join(', ')}</span>` : ''));
  });
  figureLines.visible = figureJoints.visible = false;
}

main().catch((error: unknown) => {
  status.textContent = `failed: ${String(error)}`;
  console.error(error);
});
