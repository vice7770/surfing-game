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
 * measures the drawn body misses listed under it. `?motion=id,id…` plays stance
 * recipes one after another in real time on one surfer (`&surfer`, `&side`),
 * the camera riding beside the board; `&record` films it from the canvas for
 * scripts/browser/motion-clip.mjs, and `&alarm=0` draws it without step 5's
 * balance cue (the arms as step 4 left them). `?realism` draws the
 * animation-realism plan's stance sheet (`realismSheet.ts`): every stage today
 * beside its target figure.
 */
import {
  BufferGeometry, DirectionalLight, Float32BufferAttribute, LineBasicMaterial, LineSegments, Mesh, MeshPhysicalMaterial, NeutralToneMapping, PerspectiveCamera,
  PlaneGeometry, Points, PointsMaterial, Quaternion, Scene, Vector3, WebGLRenderer, type Bone,
} from 'three';
import { buildBoardShape } from '../physics/boardShape';
import { createBoardMesh } from '../scene/BoardMesh';
import { BOARD_DESIGNS } from '../scene/board/boardDesigns';
import { SkinnedSurfer } from '../scene/character/SkinnedSurfer';
import { RIG_DETAIL } from '../scene/rig/HumanoidRig';
import type { OutfitId } from '../scene/character/outfits';
import { PhotoSky, type TimeOfDay } from '../scene/PhotoSky';
import { ShadowRig, parseShadowLevel } from '../scene/ShadowRig';
import { posturePoints } from '../scene/rig/posturePoints';
import { POINT, createRiderVisualState, type RiderVisualState } from '../scene/rig/riderVisualState';
import { StanceGauge, measureJoints, type StanceJoints } from '../scene/rig/stanceGauge';
import { STANCES } from '../scene/rig/stanceMap';
import { MOMENT_STANCE, RIDING_MOMENTS, STANCE_RECIPES, drawnRecipe, drawnStance, type StanceRecipe } from './ridingPoses';
import { drawRealism } from './realismSheet';
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
  if (params.has('realism')) {
    await drawRealism({ renderer, scene, camera, sun, shadows, surfers, boards, boardPosition, water, canvas, status, params });
    return;
  }
  const motion = params.get('motion');
  if (motion) {
    await playMotion(surfers, motion.split(','), entry.id);
    return;
  }
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

/** Motions for the films beside the map's stances: a pump's three pulses, a held bottom turn released, a weave with the weight back. */
const FILM_RECIPES: Record<string, StanceRecipe & { show?: number }> = {
  pumping: {
    ...STANCE_RECIPES['pump-compression'],
    controls: [{ at: 0.4, crouch: 1 }, { at: 0.8, crouch: 0 }, { at: 1.2, crouch: 1 }, { at: 1.6, crouch: 0 }, { at: 2.0, crouch: 1 }, { at: 2.4, crouch: 0 }],
    seconds: 2.8,
  },
  'bottom-turn': {
    ...STANCE_RECIPES['extension-frontside'],
    controls: [{ at: 0, crouch: 0.6 }, { at: 0.4, steer: 1 }, { at: 0.7, compress: 1 }, { at: 1.7, compress: 0, crouch: 0, steer: 0.3, trim: -0.5 }],
    seconds: 2.3,
  },
  weave: { ...STANCE_RECIPES.trim, controls: [{ at: 0.3, trim: -1, steer: 1 }, { at: 1.1, steer: -1 }, { at: 1.9, steer: 1 }], seconds: 2.4 },
  // The animation-realism plan's phase 2: the backside bottom turn; the cutbacks held round toward 180° and let go at
  // about 100° (on flat water the weight back stalls the board past it: the deep U, the plan's phase 5); the tubes under
  // a test curl until the deep tuck slows the board to a stall; the kick-out climbing a 15° face.
  'bottom-turn-backside': {
    ...STANCE_RECIPES['extension-backside'],
    controls: [{ at: 0, crouch: 0.6 }, { at: 0.4, steer: -1 }, { at: 0.7, compress: 1 }, { at: 1.7, compress: 0, crouch: 0, steer: -0.3, trim: -0.5 }],
    seconds: 2.3,
  },
  cutback: { ...STANCE_RECIPES['cutback-frontside'], controls: [{ at: 0, crouch: 0.5 }, { at: 0.4, steer: -1, trim: -0.7 }, { at: 1.8, steer: 0, trim: 0, crouch: 0.3 }], seconds: 2.4 },
  'cutback-backside': { ...STANCE_RECIPES['cutback-backside'], controls: [{ at: 0, crouch: 0.5 }, { at: 0.4, steer: 1, trim: -0.7 }, { at: 1.8, steer: 0, trim: 0, crouch: 0.3 }], seconds: 2.4 },
  tube: { ...STANCE_RECIPES['tube-frontside'], seconds: 1.8 },
  'tube-backside': { ...STANCE_RECIPES['tube-backside'], seconds: 1.6 },
  'kick-out': { ...STANCE_RECIPES['kick-out'], seconds: 1.3 },
  // The animation-realism plan's phase 3: paddling from rest (a look-up every eight strokes); the catch down a 15° face
  // into the pop-up and the landing; sitting up after 2 s still (the scan's full cycle), then paddling off; and a ride
  // let go with Enter, lying back down (the prone kick-out).
  paddle: { phase: 'prone', water: 'flat', start: 'prone', speed: 0, controls: [{ at: 0, paddle: true }], seconds: 9 },
  'catch-pop-up': {
    phase: 'standing', water: 'face', start: 'prone', speed: 0, controls: [{ at: 0, paddle: true }, { at: 1.5, paddle: false, popUp: true }], seconds: 3.6,
  },
  'sit-and-paddle': { phase: 'prone', water: 'flat', start: 'prone', speed: 0, controls: [{ at: 7.2, paddle: true }], seconds: 9.2 },
  'lie-down': { ...STANCE_RECIPES['lying-down'], seconds: 3, after: 1.4, controls: [{ at: 0.6, popUp: true }] },
  // The video check (the owner's reel, 2026-10-22: barefoot_surf, a frontside top turn on a left; `&side=goofy`): down a
  // 15° face crouched (the take-off and the drop), the bottom turn compressed onto the toes' rail, let go climbing with
  // the weight going back, the redirect onto the heels with it back, and the finish crouched. A plane face is no wave:
  // the board crosses it but never climbs it (the redirect's own physics, the plan's phase 5); the body's moves are the
  // game's, step by step.
  // The animation-realism plan's phase 4: each fall by cause (the stance recipes' stand-ins for a pearl's nose, a
  // kick-out's tail and the lip's throw), 3 s of each; a fall, rising to the surface and looking round (6.5 s); reeling the
  // leash in (from 5 s, shown from 4 s); and holding the board to climb back on after a slow fall, shown from 15.5 s (the
  // swimmer reels from 3 s and comes within reach at 16.3 s; the body comes on at 17.2 s).
  'fall-side': { ...STANCE_RECIPES['fall-side'], after: undefined, seconds: 3.5 },
  'fall-pearl': { ...STANCE_RECIPES['fall-pearl'], after: undefined, seconds: 3.5 },
  'fall-over': { ...STANCE_RECIPES['fall-over'], after: undefined, seconds: 3.5 },
  'fall-back': { ...STANCE_RECIPES['fall-back'], after: undefined, seconds: 3.5 },
  surfacing: { ...STANCE_RECIPES.surfacing, seconds: 6.5 },
  reel: { ...STANCE_RECIPES.reel, seconds: 7, show: 4 },
  climb: { phase: 'prone', water: 'flat', start: 'standing', speed: 2, separate: 0.5, controls: [{ at: 3, reel: true }], seconds: 18.6, show: 15.5 },
  'top-turn-sequence': {
    phase: 'standing', water: 'face', start: 'standing', speed: 7.5, seconds: 3.2,
    controls: [
      { at: 0, crouch: 1 }, { at: 0.5, steer: 1, compress: 1, crouch: 0.6 }, { at: 1.3, compress: 0, crouch: 0, steer: 0.5, trim: -0.5 },
      { at: 1.7, steer: -0.8, trim: -0.6 }, { at: 2.4, steer: 0, trim: 0, crouch: 0.6 },
    ],
  },
};

interface MotionFrame {
  time: number; clock: number; label: string; yaw: number; board: { position: Vector3; quaternion: Quaternion };
  /** Where the camera looks: the board riding, between the board and the body once fallen. */
  focus: Vector3; fallen: boolean;
  bones: { position: Vector3; quaternion: Quaternion }[];
}

/**
 * The motion view: each recipe drawn as the game draws it (every step through the
 * surfer's smoothing layer) and kept, then played back at its own pace, the camera
 * riding beside the board on the chest's side; with `&record`, the canvas filmed
 * with the recipe's name into `window.motionFilm` (a data URL).
 */
async function playMotion(surfers: SkinnedSurfer[], ids: string[], skyName: string): Promise<void> {
  if (params.get('alarm') === '0') RIG_DETAIL.arms.alarmShare = 0;
  const surfer = surfers[STANCE_SURFER];
  const board = boards[STANCE_SURFER];
  surfers.forEach((other, i) => { other.group.visible = i === STANCE_SURFER; });
  boards.forEach((other, i) => { other.visible = i === STANCE_SURFER; });
  const bones: Bone[] = [];
  surfer.group.traverse((object) => { if ((object as Bone).isBone) bones.push(object as Bone); });
  const side = STANCE_SIDE === 'regular' ? -1 : 1;
  const offset = new Vector3(3.4 * side, 1.5, 1.6);
  const frames: MotionFrame[] = [];
  const segments: string[] = [];
  let start = 0;
  for (const id of ids) {
    const recipe = FILM_RECIPES[id] ?? STANCE_RECIPES[id];
    if (!recipe) throw new Error(`No recipe ${id}`);
    surfer.resetMotion();
    let first = Number.NaN;
    let last = 0;
    drawnRecipe(recipe, STANCE_SIDE, boardPosition, (step) => {
      surfer.update(step, step.boardPosition.clone().add(offset));
      // A recipe begins standing with no history: kept from when the standing blend is whole (the game's comes from the pop-up).
      if (Number.isNaN(first) && recipe.start === 'standing' && step.phase === 'standing' && step.standingBlend < 1) return;
      // A recipe shown from later on (the climb): its body drawn all along, kept from then.
      if (Number.isNaN(first) && recipe.show !== undefined && step.clock < recipe.show - 1e-9) return;
      if (Number.isNaN(first)) first = step.clock;
      last = start + step.clock - first;
      const nose = new Vector3(0, 0, 1).applyQuaternion(step.boardQuaternion);
      const fallen = step.phase === 'fallen';
      frames.push({
        time: last, clock: step.clock, label: id, yaw: Math.atan2(nose.x, nose.z),
        board: { position: step.boardPosition.clone(), quaternion: step.boardQuaternion.clone() },
        focus: fallen ? step.boardPosition.clone().lerp(step.points[0], 0.6) : step.boardPosition.clone(), fallen,
        bones: bones.map((bone) => ({ position: bone.position.clone(), quaternion: bone.quaternion.clone() })),
      });
    });
    segments.push(`${id} ${(start).toFixed(1)}–${last.toFixed(1)} s`);
    // A beat on the recipe's last frame before the next.
    start = last + 0.5;
  }
  // The camera turns with the board's heading, eased over about half a second so a snap doesn't swing it.
  const headings = frames.map((frame, i) => {
    let sin = 0;
    let cos = 0;
    for (const other of frames) {
      if (other.label !== frame.label || Math.abs(other.time - frames[i].time) > 0.25) continue;
      sin += Math.sin(other.yaw);
      cos += Math.cos(other.yaw);
    }
    return Math.atan2(sin, cos);
  });
  // Fallen, the camera holds the heading it had at the fall: the loose board spins and flips.
  let held = Number.NaN;
  frames.forEach((frame, i) => {
    if (i > 0 && frames[i - 1].label !== frame.label) held = Number.NaN;
    if (!frame.fallen) held = headings[i];
    else if (Number.isNaN(held)) held = headings[i];
    else headings[i] = held;
  });
  const up = new Vector3(0, 1, 0);
  const width = 1280;
  const height = 720;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.fov = 40;
  camera.updateProjectionMatrix();
  const film = document.createElement('canvas');
  film.width = width;
  film.height = height;
  const context = film.getContext('2d')!;
  const show = (index: number) => {
    const frame = frames[index];
    frame.bones.forEach((pose, i) => { bones[i].position.copy(pose.position); bones[i].quaternion.copy(pose.quaternion); });
    board.position.copy(frame.board.position);
    board.quaternion.copy(frame.board.quaternion);
    camera.position.copy(frame.focus).add(offset.clone().applyAxisAngle(up, headings[index]));
    if (frame.fallen) camera.position.y = Math.max(camera.position.y, frame.board.position.y + 1.2);
    camera.lookAt(frame.focus.clone().add(frame.fallen ? new Vector3(0, 0.15, 0) : new Vector3(0, 0.8, 0.3)));
    shadows.follow(frame.board.position, sun.position.clone().normalize(), 0);
    renderer.render(scene, camera);
    context.drawImage(canvas, 0, 0);
    context.font = '600 26px system-ui, sans-serif';
    context.fillStyle = 'rgba(13,17,23,0.55)';
    context.fillRect(16, 16, context.measureText(frame.label).width + 24, 42);
    context.fillStyle = '#ffffff';
    context.fillText(frame.label, 28, 46);
  };
  status.textContent = `${skyName} · motion · ${SURFERS[STANCE_SURFER]} ${STANCE_SIDE} · ${segments.join(', ')}`;
  canvas.style.display = 'none';
  canvas.after(film);
  // `&strip=t,t,…`: those moments (the recipe's own clock, s) as one sheet of stills, captioned by `&captions=a|b|…`
  // (the video check), posted to the receiver with `&save` (`&name=`, `&receiver=`).
  const strip = params.get('strip');
  if (strip !== null) {
    await stillStrip(strip.split(',').map(Number), frames, show, film);
    return;
  }
  // `&at=seconds`: that moment alone, a still for scripts/browser/sheet-shot.mjs.
  const at = params.get('at');
  if (at !== null) {
    const index = Math.max(0, frames.findIndex((frame) => frame.time >= Number(at)));
    show(index);
    (window as unknown as { sheetReady: boolean }).sheetReady = true;
    return;
  }
  const recording = params.has('record');
  const chunks: Blob[] = [];
  const type = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm'].find((kind) => MediaRecorder.isTypeSupported(kind)) ?? 'video/webm';
  // `&bitrate=<bits a second>`: a lighter film (12 Mb/s by default).
  const recorder = recording ? new MediaRecorder(film.captureStream(60), { mimeType: type, videoBitsPerSecond: Number(params.get('bitrate') ?? 12_000_000) }) : undefined;
  if (recorder) {
    recorder.ondataavailable = (event) => chunks.push(event.data);
    show(0);
    recorder.start();
  }
  const total = frames[frames.length - 1].time + 0.5;
  await new Promise<void>((resolve) => {
    const began = performance.now();
    let index = 0;
    const tick = () => {
      const time = (performance.now() - began) / 1000;
      while (index + 1 < frames.length && frames[index + 1].time <= time) index += 1;
      show(index);
      if (time < total) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  if (recorder) {
    const stopped = new Promise((resolve) => { recorder.onstop = resolve; });
    recorder.stop();
    await stopped;
    const reader = new FileReader();
    const url = await new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(new Blob(chunks, { type }));
    });
    (window as unknown as { motionFilm: string }).motionFilm = url;
  }
  (window as unknown as { sheetReady: boolean }).sheetReady = true;
}

/**
 * The motion view's stills as one sheet (`&strip`): each moment's frame scaled to a tile, four to a row, its time and
 * caption under it; saved through the receiver with `&save`.
 */
async function stillStrip(times: number[], frames: MotionFrame[], show: (index: number) => void, film: HTMLCanvasElement): Promise<void> {
  const captions = (params.get('captions') ?? '').split('|');
  const tile = { width: 560, height: 315, text: 74 };
  const perRow = Math.min(4, times.length);
  const sheet = document.createElement('canvas');
  sheet.width = perRow * tile.width;
  sheet.height = 40 + Math.ceil(times.length / perRow) * (tile.height + tile.text);
  const context = sheet.getContext('2d')!;
  context.fillStyle = '#0d1117';
  context.fillRect(0, 0, sheet.width, sheet.height);
  context.font = '600 18px system-ui, sans-serif';
  context.fillStyle = '#e6edf3';
  context.fillText(params.get('title') ?? `${SURFERS[STANCE_SURFER]} ${STANCE_SIDE}: ${[...new Set(frames.map((frame) => frame.label))].join(', ')}`, 12, 26);
  const wrapText = (text: string, width: number) => {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width > width && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };
  times.forEach((time, i) => {
    const index = Math.max(0, frames.findIndex((frame) => frame.clock >= time - 1e-6));
    show(index);
    const x = (i % perRow) * tile.width;
    const y = 40 + Math.floor(i / perRow) * (tile.height + tile.text);
    context.drawImage(film, 0, 0, film.width, film.height, x, y, tile.width, tile.height);
    context.font = '12px system-ui, sans-serif';
    context.fillStyle = '#c9d1d9';
    wrapText(`${time.toFixed(2)} s · ${captions[i] ?? ''}`, tile.width - 16).slice(0, 4).forEach((text, k) => context.fillText(text, x + 8, y + tile.height + 16 + k * 15));
    if (i % perRow) {
      context.fillStyle = '#30363d';
      context.fillRect(x - 1, y, 2, tile.height + tile.text);
    }
  });
  film.style.display = 'none';
  sheet.style.maxWidth = '100%';
  document.body.append(sheet);
  if (params.has('save')) {
    const blob = await new Promise<Blob>((resolve) => sheet.toBlob((b) => resolve(b!), 'image/jpeg', Number(params.get('quality') ?? 0.85)));
    const name = params.get('name') ?? 'motion-strip.jpg';
    await fetch(`${params.get('receiver') ?? 'http://127.0.0.1:5194'}/upload?name=${encodeURIComponent(name)}`, { method: 'POST', body: blob });
    (window as unknown as { stripSaved: string }).stripSaved = `${name} ${(blob.size / 1024).toFixed(0)} KB`;
  }
  (window as unknown as { sheetReady: boolean }).sheetReady = true;
}

main().catch((error: unknown) => {
  status.textContent = `failed: ${String(error)}`;
  console.error(error);
});
