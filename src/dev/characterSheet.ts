/**
 * The G7 screenshot sheet (character-sheet.html): each surfer prone, standing
 * and fallen, at chase distance and at 1.5 m, under one photographed sky, on
 * flat water. `?sky=dawn|midday|sunset` picks the sky, `?row=r&col=c` draws one
 * tile full size, and `?sun` looks along the sun to check that the photo's sun
 * and the light's glint line up.
 */
import {
  DirectionalLight, Mesh, MeshPhysicalMaterial, NeutralToneMapping, PerspectiveCamera, PlaneGeometry, Quaternion, Scene, Vector3, WebGLRenderer,
} from 'three';
import { buildBoardShape } from '../physics/boardShape';
import { createBoardMesh } from '../scene/BoardMesh';
import { BOARD_DESIGNS } from '../scene/board/boardDesigns';
import { SkinnedSurfer } from '../scene/character/SkinnedSurfer';
import type { OutfitId } from '../scene/character/outfits';
import { PhotoSky, type TimeOfDay } from '../scene/PhotoSky';
import { posturePoints } from '../scene/rig/posturePoints';
import { POINT, createRiderVisualState, type RiderVisualState } from '../scene/rig/riderVisualState';

const params = new URLSearchParams(window.location.search);
const timeOfDay = (params.get('sky') ?? 'midday') as TimeOfDay;
const SURFERS = ['surfer1', 'surfer2', 'surfer3', 'surfer4'];
/** One outfit each, so the sheet shows all four: the women in the full suit and the bikini, the men in the shorts and the spring suit. */
const DRESS: readonly OutfitId[] = ['fullsuit', 'vestBikini', 'vestShorts', 'springsuit'];
const TILE = { width: 300, height: 360 };
const COLUMNS = 6;
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
  const height = single ? TILE.height * scale : TILE.height * SURFERS.length;
  renderer.setSize(width, height, false);
  renderer.setScissorTest(true);
  const state = createRiderVisualState();
  for (let r = 0; r < surfers.length; r += 1) {
    for (let c = 0; c < COLUMNS; c += 1) {
      if (single && (r !== Number(row) || c !== Number(col))) continue;
      surfers.forEach((surfer, i) => { surfer.group.visible = i === r; });
      boards.forEach((board, i) => { board.visible = i === r; });
      const shot = SHOTS[c];
      surfers[r].update(poseFor(shot, state), new Vector3(...shot.eye));
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
  status.textContent = `${entry.id} · rows ${SURFERS.join(', ')} in ${DRESS.join(', ')} · columns prone, standing, fallen × chase, 1.5 m · head ${POINT.head}`;
  (window as unknown as { sheetReady: boolean }).sheetReady = true;
}

main().catch((error: unknown) => {
  status.textContent = `failed: ${String(error)}`;
  console.error(error);
});
