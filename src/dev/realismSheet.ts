/**
 * The animation-realism plan's stance sheet (character-sheet.html?realism;
 * docs/superpowers/plans/2026-10-22-animation-realism.md): every stage of a
 * ride as the game draws it today, beside a reference figure (magenta) built
 * from the plan's target numbers on the surfer's own proportions
 * (`stageFigures.ts`). Today's tiles are drawn as the game draws them: the real
 * rider simulated (a stance recipe, or a ride session for the water's stages)
 * and every step through the page's motion estimate and smoothing layer.
 * `&surfer=0–3` picks the surfer; `&only=<image id>` draws one image; `&save`
 * posts each JPEG to a local receiver (`&receiver=http://127.0.0.1:5194`).
 * Regular only: Goofy is the exact mirror (the stance tests check both).
 */
import {
  CylinderGeometry, Group, Mesh, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3,
  type Bone, type DirectionalLight, type Object3D, type PerspectiveCamera, type Scene, type WebGLRenderer,
} from 'three';
import { PlaneWater } from '../physics/PlaneWater';
import { RideSession, type RideInput, type RiderPlacement } from '../physics/RideSession';
import type { SkinnedSurfer } from '../scene/character/SkinnedSurfer';
import type { ShadowRig } from '../scene/ShadowRig';
import type { Side } from '../scene/rig/humanoidBones';
import { RiderMotion } from '../scene/rig/riderMotion';
import { POINT, createRiderVisualState, readRiderSnapshot, type RiderVisualState } from '../scene/rig/riderVisualState';
import { StanceGauge, measureJoints, type BoardPose, type StanceAngles, type StanceJoints } from '../scene/rig/stanceGauge';
import { RIDER_SNAPSHOT, writeRiderSnapshot } from '../wave/SurfZoneRunner';
import { STANCE_RECIPES, drawnRecipe, sessionCues, type StanceRecipe } from './ridingPoses';
import { figureLengths, type FigureLengths } from './stanceFigure';
import { footAngles, freeFigure, halfWidth, standingFigure, type FreeSpec, type StandingSpec } from './stageFigures';

const STEP = 1 / 60;
const DEG = Math.PI / 180;

export interface RealismContext {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  sun: DirectionalLight;
  shadows: ShadowRig;
  surfers: SkinnedSurfer[];
  boards: Object3D[];
  boardPosition: Vector3;
  /** The sheet's flat water: drawn see-through here, so the limbs and boards under it read. */
  water: Mesh;
  canvas: HTMLCanvasElement;
  status: HTMLElement;
  params: URLSearchParams;
}

/** How today's tile is reached: a stance recipe (`ridingPoses.ts`), or a ride session stepped to a moment. */
type Today =
  | { kind: 'recipe'; recipe: StanceRecipe }
  | {
    kind: 'session'; placement: RiderPlacement; seconds: number; input: (time: number, session: RideSession) => Partial<RideInput>;
    /** Flat water (the default), or down a 15° face along its fall line (the catch). */
    water?: 'flat' | 'face';
    /** Stops early, at the first step this holds (after `from` s), plus `after` s. */
    until?: (session: RideSession) => boolean; from?: number; after?: number;
  };

/** A camera about the board (its nose along +z, Regular's toes toward −x): the eye and the point looked at, m, or about the body. */
interface Shot { eye: [number, number, number]; look: [number, number, number]; aboutBody?: boolean }

const STAND: Shot = { eye: [-2.9, 1.5, 1.4], look: [0, 0.75, 0.2] };
const STAND_LOW: Shot = { eye: [-2.7, 1.1, 1.5], look: [0, 0.6, 0.1] };
const PRONE: Shot = { eye: [-1.9, 1.3, 1.6], look: [0, 0.18, -0.25] };
const SIT: Shot = { eye: [-2.7, 1.45, 1.7], look: [0, 0.3, -0.25] };
/** A turn from ahead of the nose, so a lean toward the toes' rail (Regular's −x) reads sideways. */
const TURN: Shot = { eye: [0.75, 1.3, 2.9], look: [-0.3, 0.6, -0.1] };
const BODY: Shot = { eye: [-2.4, 1.5, 2.1], look: [0, 0.15, 0], aboutBody: true };
const BODY_WIDE: Shot = { eye: [-3.2, 1.9, 2.6], look: [0, 0.1, 0], aboutBody: true };

/** The target figure: standing or joint by joint, on today's board or on a board of its own (its pitch and roll, °; its sink, m). */
interface Target {
  standing?: StandingSpec;
  free?: FreeSpec;
  /** The target's board, from today's: pitched nose up (+), rolled toward the toes (+), sunk. */
  board?: { pitch?: number; roll?: number; sink?: number; level?: boolean };
  /** For a figure in the water: where the camera looks, about the board. */
  focus?: [number, number, number];
}

interface Panel {
  title: string;
  today: Today;
  shot: Shot;
  target: Target;
  /** The target's numbers and sources, then today's gaps (short lines for the sheet). */
  numbers: string[];
  gaps: string[];
  /** Today has no such stage: the tile shows the nearest the game draws. */
  missing?: string;
}

interface SheetImage { id: string; title: string; panels: Panel[] }

// ---------- today ----------

const stand = (controls: StanceRecipe['controls'], seconds: number, extra: Partial<StanceRecipe> = {}): Today => ({
  kind: 'recipe', recipe: { phase: 'standing', water: 'flat', start: 'standing', speed: 8, controls, seconds, ...extra },
});
const recipe = (id: string): Today => ({ kind: 'recipe', recipe: STANCE_RECIPES[id] });
const once = (time: number, at: number) => Math.abs(time - at) < STEP / 2;
const prone = (speed = 0): RiderPlacement => ({ x: 0, z: 0, heading: 0, speed, phase: 'prone' });

// ---------- targets ----------

/** A free arm along a direction in the levelled board frame (toes, nose, up), its elbow included. */
const arm = (toes: number, nose: number, up: number, elbow = 150) => ({ dir: [toes, nose, up] as const, elbow });

/** The global stance (the research's base and the owner's call, §10.3): width 0.63 m, front foot 60° and rear 80° to the stringer, the rear knee in. */
const BASE = { width: 0.63, foot: [60, 80] as const, rearKneeIn: 20, shoulderDrop: 8 };

/**
 * Trim's arms (the owner's reference photo of 2026-10-22): relaxed and close in,
 * framing the knees, the front hand forward and down along the line, the back
 * hand by the back knee; never spread.
 */
const TRIM_FS: StandingSpec = {
  ...BASE, weight: 0.55, knee: [45, 50], lean: 5, trunk: 22, chest: 30, hips: 15, head: [80, 10],
  lead: arm(0.35, 0.35, -0.87, 155), trail: arm(0.3, -0.05, -0.95, 155),
};
const TRIM_BS: StandingSpec = {
  ...BASE, weight: 0.55, knee: [45, 50], lean: 0, trunk: 22, chest: 55, hips: 25, head: [95, 10],
  lead: arm(0.2, 0.45, -0.87, 155), trail: arm(0.25, -0.1, -0.96, 155),
};

const RAIL = (z: number) => halfWidth(z);

const IMAGES: SheetImage[] = [
  {
    id: '01-lineup-sit', title: 'The lineup sit (new stage)',
    panels: [{
      title: 'Sitting, waiting', missing: 'No sit until phase 3: idle, the rider lay prone, hands at the rails.',
      today: { kind: 'session', placement: prone(), seconds: 3.6, input: () => ({}) }, shot: SIT,
      target: {
        board: { pitch: 10, sink: 0.1 },
        free: {
          frame: 'board', hips: [0, 0.09, -0.3], up: [0, 1, 0.17], chest: [0, 1, 0.12], facing: [0, 0, 1], look: [-0.94, 0, -0.34],
          legs: { left: { at: [0.38, -0.42, 0.02], pole: [1, 0, 0.6] }, right: { at: [-0.38, -0.42, 0.02], pole: [-1, 0, 0.6] } },
          arms: { left: { at: [0.2, 0.05, -0.08], pole: [1, 0, -0.6] }, right: { at: [-0.2, 0.05, -0.08], pole: [-1, 0, -0.6] } },
        },
      },
      numbers: ['Straddling, legs hanging slightly apart, knees ~70°', 'Board level, nose just out (pitch +5–10°)', 'Torso upright, head scanning behind', 'Hands free (thighs, rails)', 'Rapture, board control (a coaching cue)'],
      gaps: ['Phase 3: drawn only; in after 2 s idle (prone, still, hands at rest), out on a stroke, a sweep or a duck', 'The board\'s trim is the physics\' prone one (phase 5)'],
    }],
  },
  {
    id: '02-paddle-catch', title: 'Paddling and the catch',
    panels: [
      {
        title: 'Paddling, cruising',
        today: { kind: 'session', placement: prone(), seconds: 6.25, input: () => ({ paddle: true }) }, shot: PRONE,
        target: {
          free: {
            frame: 'board', hips: [0, 0.11, -0.47], up: [0, 0.1, 1], chest: [0, 0.2, 1], facing: [0, -1, 0.1], look: [0, -0.15, 1],
            legs: { left: { at: [0.05, 0.03, -1.3], pole: [0, -1, 0] }, right: { at: [-0.05, 0.03, -1.3], pole: [0, -1, 0] } },
            arms: {
              left: { at: [RAIL(0.38) + 0.08, -0.05, 0.4], pole: [0.6, 1, -0.4] },
              right: { at: [-(RAIL(-0.15) + 0.06), -0.27, -0.15], pole: [-1, 0.7, -0.2] },
            },
          },
        },
        numbers: ['Sternum on the stringer, chest only slightly lifted (~10°)', 'Hand in 15–20 cm ahead of the head, elbow high', 'Pull 15–25 cm deep to past the hip', 'Legs together, no kick; head neutral, a scan every 5–10 strokes', 'L+R cycle every 2–3 s cruising (Nessler 2019: 36–54/min a side)'],
        gaps: ['Stroke rate 60/min a side, one cycle a second; length; roll (physics, phase 5)', 'Phase 3: chest drawn low, head neutral, a look-up every 8 strokes, legs together'],
      },
      {
        title: 'The catch', missing: 'No catch until phase 3: the cruising stroke went on unchanged.',
        today: { kind: 'session', placement: prone(), seconds: 2, water: 'face', input: () => ({ paddle: true }) }, shot: PRONE,
        target: {
          board: { pitch: -12 },
          free: {
            frame: 'board', hips: [0, 0.1, -0.56], up: [0, 0.22, 1], chest: [0, 0.62, 1], facing: [0, -1, 0.55], look: [0, -0.65, 1],
            legs: { left: { at: [0.05, 0.03, -1.38], pole: [0, -1, 0] }, right: { at: [-0.05, 0.03, -1.38], pole: [0, -1, 0] } },
            arms: {
              left: { at: [RAIL(-0.3) + 0.06, -0.32, -0.32], pole: [0.8, 0.8, -0.3] },
              right: { at: [-(RAIL(0.42) + 0.06), -0.08, 0.46], pole: [-0.6, 1, -0.4] },
            },
          },
        },
        numbers: ['3–5 explosive full strokes, head down', 'Steep: weight back, chest up (the cobra, ~30°)', 'Board on the face, nose down', 'Then the pop-up'],
        gaps: ['Phase 3: the cue (or > 2.5 m/s nose-down past 5°) while stroking; cobra by the pitch; arms reach full', 'The weight back on the face and the stroke rate are the physics\' (phase 5)'],
      },
    ],
  },
  {
    id: '03-duck-dive', title: 'The duck-dive',
    panels: [{
      title: 'Duck-dive, the knee',
      today: { kind: 'session', placement: prone(1.5), seconds: 1.15, input: (time) => ({ duckDive: time > 0.4 ? 1 : 0 }) }, shot: PRONE,
      target: {
        board: { pitch: -20, sink: 0.25 },
        free: {
          frame: 'board', hips: [0, 0.34, -0.32], up: [0, 0.35, 1], chest: [0, 0.45, 1], facing: [0, -1, 0.35], look: [0, -0.9, 0.4],
          legs: { left: { at: [0.06, 0.75, -1.05], pole: [0, -0.4, -1] }, right: { at: [-0.02, 0.18, -1.05], pole: [0, -1, 0.2] } },
          arms: { left: { at: [RAIL(0.35), 0.0, 0.35], pole: [1, 0, -0.6] }, right: { at: [-RAIL(0.35), 0.0, 0.35], pole: [-1, 0, -0.6] } },
        },
      },
      numbers: ['Arms straight on the rails a third back from the nose', 'Chest over the hands; head tucked toward the deck', 'Back knee on the tail pad, the other leg kicked up', 'Barefoot Surf duck-dive (approved set)'],
      gaps: ['Parked with the physics (two-body rider); drawn knee/press acceptable', 'Head tuck: keep; review after the physics'],
    }],
  },
  {
    id: '04-pop-up', title: 'The pop-up',
    panels: [
      {
        title: 'Push', today: recipe('pop-up'), shot: PRONE,
        target: {
          free: {
            frame: 'board', hips: [0, 0.24, -0.42], up: [0, 0.55, 1], chest: [0, 0.8, 1], facing: [0, -0.7, 0.6], look: [0, -0.15, 1],
            legs: { left: { at: [0.08, 0.06, -0.98], pole: [0.3, -1, 0.2] }, right: { at: [-0.08, 0.06, -0.98], pole: [-0.3, -1, 0.2] } },
            arms: { left: { at: [0.23, 0.0, -0.12], pole: [0.4, 0, -1] }, right: { at: [-0.23, 0.0, -0.12], pole: [-0.4, 0, -1] } },
          },
        },
        numbers: ['Hands flat beside the lower ribs, 0.46 m apart (not the rails)', 'Push 0.71 s, elbows 110° at peak force', 'Chest up, eyes forward', 'Borgonovo-Santos 2021'],
        gaps: ['Phase 3: hands planted flat at the lower ribs, the chest pushed up by the elbows (straight at 80 %), hips low', 'The board is 0.42 m wide there: the hands 0.37 m apart'],
      },
      {
        title: 'Landing', today: recipe('landing'), shot: STAND_LOW,
        target: {
          standing: {
            width: 0.66, weight: 0.65, knee: [85, 80], foot: [45, 45], rearKneeIn: 15, lean: 0, trunk: 38, chest: 20, hips: 10, shoulderDrop: 5, head: [60, 15],
            lead: arm(0.3, 0.6, -0.75, 140), trail: arm(0.35, -0.25, -0.9, 145),
          },
        },
        numbers: ['Feet land together: back foot ~45° over the tail pad', 'Front foot between the hands at ~45°', 'Reach and land 0.48 s; knees ~80° flexed; 72 % front', 'Eyes forward'],
        gaps: ['Phase 3: each foot swung on an arc and planted at 45°, settling to 60°/80° standing', 'The front knee folds over the physics\' low, forward landing pelvis (phase 5)'],
      },
    ],
  },
  {
    id: '05-drop', title: 'The drop',
    panels: [{
      title: 'Drop', today: recipe('drop'), shot: STAND_LOW,
      target: {
        standing: {
          ...BASE, width: 0.68, weight: 0.42, knee: [100, 95], lean: 0, trunk: 25, chest: 30, hips: 15, head: [70, 35],
          lead: arm(0.3, 0.45, -0.84, 158), trail: arm(0.3, -0.05, -0.95, 158),
        },
      },
      numbers: ['Deepest crouch: knees past 90° flexed, back fairly upright', 'Arms low, in front, framing the knees; lead arm along the line', 'Eyes on the base; 55–60 % on the back foot (owner, §10.2)', 'The research brief; the owner\'s reference photo (arms)'],
      gaps: ['Phase 1 drawn: knees, trunk, arms and gaze from the drop\'s key pose', 'Weight drawn back toward 0.42 (the physics\' pelvis: phase 5)'],
    }],
  },
  {
    id: '06-trim', title: 'Trim: frontside and backside',
    panels: [
      {
        title: 'Trim, frontside', today: stand([], 1.2, { water: 'across', speed: 7 }), shot: STAND,
        target: { standing: TRIM_FS },
        numbers: ['Knees 30–70° flexed, about equal (owner, §10.1), rear knee in', 'Front foot ~60°, rear ~80° to the stringer (owner, §10.3)', 'Lead shoulder low down the line; arms relaxed at the knees', 'Torso 15–30° from vertical, head over the board, quiet'],
        gaps: ['Phase 1 drawn: the trim key pose, the motion filter, relaxed arms', 'Weight drawn back toward 0.58 (the physics\' 0.72: phase 5)'],
      },
      {
        title: 'Trim, backside', today: stand([], 1.2, { water: 'across-back', speed: 7 }), shot: STAND,
        target: { standing: TRIM_BS },
        numbers: ['As frontside, but shoulders open along the rails (chest ~55°)', 'Head over the lead shoulder down the line', 'Lead arm along the line, trailing arm at the side, both low'],
        gaps: ['Phase 1 drawn: its own key pose (chest 55°, hinge deeper into the face)', 'The side read from the face\'s tilt (the plan\'s §3.3)'],
      },
    ],
  },
  {
    id: '07-bottom-turn', title: 'Bottom turn: frontside and backside',
    panels: [
      {
        title: 'Bottom turn, frontside', today: recipe('compress-frontside'), shot: TURN,
        target: {
          standing: {
            ...BASE, width: 0.66, weight: 0.6, knee: [95, 90], lean: 35, trunk: 15, chest: 10, hips: 10, head: [40, -15],
            lead: arm(0.75, 0.45, 0.15, 160), trail: arm(0.55, -0.3, -0.78, 145),
          },
        },
        numbers: ['Compress at the base, extend climbing', 'Rail 30–40°, body leaning with it', 'Chest and lead shoulder to the wave, lead arm at the target', 'Hands out of the water (inside hand near it)'],
        gaps: ['Trunk folded 74° from vertical (target ~50°)', 'Lead arm raised 122°: up, not at the target', 'Inside hand blends in late'],
      },
      {
        title: 'Bottom turn, backside', today: recipe('compress-backside'), shot: STAND,
        target: {
          standing: {
            ...BASE, width: 0.66, weight: 0.6, knee: [95, 90], lean: -35, trunk: 12, chest: 0, hips: 5, head: [125, -20],
            lead: arm(-0.55, 0.55, 0.25, 160), trail: arm(-0.25, -0.25, -0.93, 150),
          },
        },
        numbers: ['Shoulders square to the lip, look over the front shoulder', 'Rotated with the hips, not bent over (Hobgood)', 'Rail 30–40° on the heels, lead arm at the target'],
        gaps: ['Chest open 48° where the lip wants it square (~0°)', 'Arms out wide (125°/49°); rear hip +52° off the map'],
      },
    ],
  },
  {
    id: '08-top-turn', title: 'Top turn: frontside and backside',
    panels: [
      {
        title: 'Top turn, frontside', today: recipe('top-turn-frontside'), shot: STAND,
        target: {
          standing: {
            ...BASE, weight: 0.3, knee: [70, 55], rearKneeIn: 15, lean: -25, trunk: 20, chest: 80, hips: 40, head: [135, 20],
            lead: arm(-0.3, 0.6, -0.35, 115), trail: arm(0.3, 0.55, -0.45, 105),
          },
        },
        numbers: ['Extend climbing, compress through the redirect, front knee dropping', 'Head and lead shoulder swing back to the pocket', 'Arms at chest height or below, close', '~70/30 on the back foot'],
        gaps: ['Legs straight (20°/24°) through the redirect', 'Arms raised 95°/76°: an airplane', 'Weight 0.48 here, 0.65 on the real wave (physics)'],
      },
      {
        title: 'Top turn, backside', today: recipe('top-turn-backside'), shot: TURN,
        target: {
          standing: {
            ...BASE, weight: 0.3, knee: [70, 55], rearKneeIn: 15, lean: 25, trunk: 30, chest: -35, hips: -10, head: [-20, 20],
            lead: arm(0.5, -0.3, -0.35, 115), trail: arm(0.4, -0.6, -0.5, 110),
          },
        },
        numbers: ['As frontside on the toes: head and lead shoulder back to the pocket', 'Shoulders open, arm up opens them (Hobgood)', '~70/30 back foot'],
        gaps: ['Arms raised 94°/75°', 'Weight 0.48 (target 0.30)'],
      },
    ],
  },
  {
    id: '09-cutback', title: 'Cutback: frontside and backside',
    panels: [
      {
        title: 'Cutback, frontside', today: recipe('cutback-frontside'), shot: STAND,
        target: {
          standing: {
            ...BASE, weight: 0.32, knee: [75, 70], lean: -40, trunk: 15, chest: 110, hips: 60, head: [160, 10],
            lead: arm(-0.5, -0.6, -0.2, 160), trail: arm(0.2, 0.2, -0.8, 145),
          },
        },
        numbers: ['Head → lead shoulder → trail shoulder → hips → board, ~180°', 'Lead arm extends, then sweeps back', '65–70 % on the back foot; rail ~76° (Forsyth)'],
        gaps: ['Chest 63°: turns with the hips, no head-first sequence', 'Arms raised 128°/86°'],
      },
      {
        title: 'Cutback, backside', today: recipe('cutback-backside'), shot: TURN,
        target: {
          standing: {
            ...BASE, weight: 0.32, knee: [75, 70], lean: 40, trunk: 30, chest: -80, hips: -35, head: [-120, 10],
            lead: arm(0.4, -0.7, -0.3, 160), trail: arm(0.5, -0.2, -0.7, 145),
          },
        },
        numbers: ['Onto the toes, chest turning toward the tail', 'Look back at the whitewater over the trailing shoulder', '65–70 % back foot'],
        gaps: ['Arms raised 136°/85°', 'Not in the map; no sequence'],
      },
    ],
  },
  {
    id: '10-pump', title: 'Pumping',
    panels: [
      {
        title: 'Pump, compressing (uphill)', today: recipe('pump-compression'), shot: STAND,
        target: {
          standing: {
            ...BASE, weight: 0.45, knee: [75, 80], lean: 0, trunk: 30, chest: 30, hips: 15, head: [75, 10],
            lead: arm(0.3, 0.6, -0.75, 140), trail: arm(0.3, -0.2, -0.93, 145),
          },
        },
        numbers: ['Compress going uphill, 55 % back foot', 'Small arm motions in sync, pushing down, not rising', '~1 pump a second (Rapture)'],
        gaps: ['Arms 54°/51°, rising with the alarm: reads as a near fall', 'Weight 0.59 going uphill (target 0.45)'],
      },
      {
        title: 'Pump, extending (downhill)', today: recipe('pump-extension'), shot: STAND,
        target: {
          standing: {
            ...BASE, weight: 0.55, knee: [35, 40], lean: 0, trunk: 20, chest: 30, hips: 15, head: [75, 10],
            lead: arm(0.2, 0.5, -0.85, 150), trail: arm(0.2, -0.15, -0.97, 155),
          },
        },
        numbers: ['Extend going downhill, 55 % front foot', 'Arms pushing down with the extension'],
        gaps: ['Rear leg straight (26°), front bent (73°)', 'Weight 0.76 (target 0.55)'],
      },
    ],
  },
  {
    id: '11-tube', title: 'Tube: frontside grab-rail, backside pig-dog',
    panels: [
      {
        title: 'Tube, frontside (grab-rail)', missing: 'No tube stance today: the deep tuck (under a curl only) and the hand in the face (E).',
        today: recipe('tube-frontside'), shot: STAND_LOW,
        target: {
          standing: {
            ...BASE, width: 0.66, weight: 0.5, knee: [115, 135], rearKneeIn: 45, lean: 15, trunk: 40, chest: 30, hips: 15, head: [70, 0],
            lead: arm(0.45, 0.75, -0.1, 150),
            trail: { grab: [-RAIL(-0.45), 0.01, -0.45], pole: [-0.4, -0.6, 0.6] },
          },
        },
        numbers: ['Back hand on the outside rail, back knee dropped', 'Front palm toward the face; lead arm points at the exit', 'The owner\'s decision 12; Stab (Jordy Smith): lead arm forward, low, close'],
        gaps: ['Trunk folded 78°, weight 0.75 front', 'Rear knee 59°: never drops; no rail grab'],
      },
      {
        title: 'Tube, backside (pig-dog)', missing: 'No pig-dog today: crouch and the hand.',
        today: recipe('tube-backside'), shot: STAND_LOW,
        target: {
          standing: {
            ...BASE, width: 0.66, weight: 0.5, foot: [55, 85], knee: [120, 140], rearKneeIn: 40, lean: -10, trunk: 45, chest: 55, hips: 20, head: [90, 5],
            lead: arm(-0.15, 0.85, -0.1, 155),
            trail: { grab: [RAIL(0.0), 0.01, 0.0], pole: [0.4, 0.6, -0.5] },
          },
        },
        numbers: ['Rear knee dropped toward the deck', 'Trailing hand on the shoreward rail by the front foot (eos.surf)', 'Lead arm at the exit; chest square to it (Healey, The Inertia)'],
        gaps: ['Weight 0.80 front; no pig-dog, no grab'],
      },
    ],
  },
  {
    id: '12-kick-out', title: 'The kick-out (new stage)',
    panels: [
      {
        title: 'Kick-out over the back', missing: 'No kick-out today: the nearest is S with a hard steer (the snap).',
        today: recipe('kick-out'), shot: STAND,
        target: {
          // Today's board already climbs the face nose-up (the kick-out's recipe): the target stands on it, rolled.
          board: { roll: -10 },
          standing: {
            ...BASE, weight: 0.25, knee: [35, 75], lean: -10, trunk: 10, chest: 60, hips: 30, head: [120, -10],
            lead: arm(-0.4, 0.6, 0.3, 150), trail: arm(0.45, -0.5, 0.0, 150),
          },
        },
        numbers: ['Hard back-foot pressure, the nose swung over the back', 'Front leg long, back knee bent; arms out for balance', 'Coaching cue (Rapture etiquette names it; no measured source)'],
        gaps: ['No stage; trigger: standing, the ride analyser\'s behind-the-crest read + weight back'],
      },
      {
        title: 'Kick-out, dropping prone', today: recipe('lying-down'), shot: PRONE,
        target: {
          free: {
            frame: 'board', hips: [0, 0.32, -0.42], up: [0, 0.42, 1], chest: [0, 0.3, 1], facing: [0, -1, 0.3], look: [0, -0.2, 1],
            legs: { left: { at: [0.07, 0.05, -0.98], pole: [0.2, -1, 0.3] }, right: { at: [-0.07, 0.05, -0.98], pole: [-0.2, -1, 0.3] } },
            arms: { left: { at: [RAIL(-0.05), 0.0, -0.05], pole: [1, 0.3, -0.5] }, right: { at: [-RAIL(-0.05), 0.0, -0.05], pole: [-1, 0.3, -0.5] } },
          },
        },
        numbers: ['Drop to the chest, hands on the rails', 'Knees to the deck, legs slide back', 'Then paddle out over the back'],
        gaps: ['Lying back down exists (Enter): unsourced, no reference in the map'],
      },
    ],
  },
  {
    id: '13-falls', title: 'Falls: the reflexes over the ragdoll',
    panels: [
      {
        title: 'Fall to the side, 0.5 s in', today: recipe('fall-side'), shot: BODY,
        target: {
          board: { level: true },
          focus: [0.9, 0.35, 0],
          free: {
            frame: 'water', hips: [0.9, 0.3, 0], up: [0.35, 0.94, 0], chest: [0.25, 0.95, 0.18], facing: [0.5, 0, 0.85], look: [0.2, -0.55, 0.8],
            legs: { left: { at: [0.82, -0.32, 0.15], pole: [0.4, 0, 1] }, right: { at: [1.0, -0.3, -0.1], pole: [0.5, 0, 1] } },
            arms: { left: { at: [1.12, 1.02, 0.2], pole: [0.4, 0.2, 1] }, right: { at: [1.25, 1.0, 0.05], pole: [0.5, 0.2, 1] } },
          },
        },
        numbers: ['To the side or behind, flat, away from the board', 'Forearms over the head, a loose curl (knees ~90°)', 'Rapture safety basics'],
        gaps: ['Ragdoll limbs at their centres (fallenReach 0.92): arms spread', 'No protective pose'],
      },
      {
        title: 'Over the falls', missing: 'Today: the same ragdoll for every fall (here 0.6 s into one thrown up by a stand-in for the lip).', today: recipe('fall-over'), shot: BODY,
        target: {
          board: { level: true },
          focus: [0.9, 0.2, 0],
          free: {
            frame: 'water', hips: [0.9, 0.15, 0], up: [0.2, 0.55, 0.8], chest: [0.1, 0.25, 0.95], facing: [0, -0.9, 0.4], look: [0, -0.9, -0.3],
            legs: { left: { at: [0.82, 0.32, 0.38], pole: [0, -0.6, 1] }, right: { at: [1.0, 0.3, 0.36], pole: [0, -0.6, 1] } },
            arms: { left: { at: [0.82, 0.32, 0.7], pole: [0.6, 0.6, 0.4] }, right: { at: [1.0, 0.32, 0.7], pole: [-0.6, 0.6, 0.4] } },
          },
        },
        numbers: ['A ball: knees to the chest', 'Forearms over the head, chin tucked', 'Go limp, let it tumble (Rapture, staying calm underwater)'],
        gaps: ['Ragdoll spreads its limbs as the water pulls'],
      },
    ],
  },
  {
    id: '14-fall-shapes', title: 'Fall shapes by cause',
    panels: [
      {
        title: 'Pearl (nose dives)', missing: 'Today every fall is the same ragdoll (here 0.45 s in, the board pitched 35° nose down at the separation).',
        today: recipe('fall-pearl'), shot: BODY,
        target: {
          board: { level: true, pitch: -35, sink: 0.2 },
          focus: [0, 0.5, 0.6],
          free: {
            frame: 'water', hips: [0, 0.75, 0.15], up: [0, 0.15, 1], chest: [0, -0.15, 1], facing: [0, -1, 0], look: [0, -0.7, 0.3],
            legs: { left: { at: [0.1, 0.9, -0.62], pole: [0, -1, 0.3] }, right: { at: [-0.12, 0.85, -0.6], pole: [0, -1, 0.3] } },
            arms: { left: { at: [0.1, 0.66, 0.86], pole: [1, 0.5, 0.2] }, right: { at: [-0.1, 0.66, 0.86], pole: [-1, 0.5, 0.2] } },
          },
        },
        numbers: ['Thrown forward over the nose', 'Arms forward around the head, head tucked', 'Push the board away, feet first if possible'],
        gaps: ['No cause-specific shape (the separation cause is known: pearl, lip, balance, reef)'],
      },
      {
        title: 'Off the back', missing: 'Today: the same ragdoll (here 0.45 s in, the board pitched 25° nose up at the separation).',
        today: recipe('fall-back'), shot: BODY,
        target: {
          board: { level: true },
          focus: [0, 0.3, -1.0],
          free: {
            frame: 'water', hips: [0, 0.25, -1.25], up: [0, 0.75, -0.66], chest: [0, 0.8, -0.6], facing: [0, 0.6, 0.8], look: [0, 0.3, 1],
            legs: { left: { at: [0.12, 0.55, -0.45], pole: [0, 1, 0.3] }, right: { at: [-0.12, 0.5, -0.48], pole: [0, 1, 0.3] } },
            arms: { left: { at: [0.62, 0.45, -1.15], pole: [0, -1, 0] }, right: { at: [-0.62, 0.45, -1.15], pole: [0, -1, 0] } },
          },
        },
        numbers: ['Seat first, falling back off the tail', 'Arms out to the sides behind, feet up', 'Then the surfacing reflex'],
        gaps: ['As the pearl: one ragdoll for every cause'],
      },
    ],
  },
  {
    id: '15-surface-swim', title: 'Surfacing and swimming',
    panels: [
      {
        title: 'Surfacing', missing: 'No surfacing shape: the ragdoll rises as it floats (here rising under water, 3 s after the fall).',
        today: recipe('surfacing'), shot: BODY,
        target: {
          board: { level: true },
          focus: [0.9, 0.0, 0],
          free: {
            frame: 'water', hips: [0.9, -0.85, 0], up: [0, 1, 0.1], chest: [0, 1, 0.05], facing: [-1, 0, 0.2], look: [-1, 0.4, 0.2],
            legs: { left: { at: [0.95, -1.62, 0.15], pole: [-1, 0, 0.3] }, right: { at: [0.85, -1.6, -0.2], pole: [-1, 0, 0.3] } },
            arms: { left: { at: [0.84, 0.05, -0.12], pole: [-0.5, 0.2, 1] }, right: { at: [0.84, 0.05, 0.12], pole: [-0.5, 0.2, -1] } },
          },
        },
        numbers: ['Rising with the forearms crossed over the head', 'Look for the board before breaking the surface', 'Rapture: safety basics, staying calm underwater'],
        gaps: ['No head cover; the head comes up first'],
      },
      {
        title: 'Swimming (crawl)', today: { kind: 'session', placement: prone(), seconds: 6, input: (t, s) => { if (once(t, 0.5) && s.rider.attached) s.separate('balance'); return { paddle: t > 1 }; } }, shot: BODY,
        target: {
          focus: [0.9, -0.1, 0],
          free: {
            frame: 'water', hips: [0.9, -0.12, -0.5], up: [0, 0.05, 1], chest: [0, 0.18, 1], facing: [0, -1, 0.2], look: [0, 0.2, 1],
            legs: { left: { at: [0.98, -0.28, -1.32], pole: [0, -1, 0] }, right: { at: [0.82, -0.18, -1.32], pole: [0, -1, 0] } },
            arms: { left: { at: [1.18, -0.08, 0.55], pole: [0.6, 1, 0] }, right: { at: [0.7, -0.45, -0.3], pole: [-0.6, 0.6, 0] } },
          },
        },
        numbers: ['Crawl 0.38 cycles/s, roll 57°/66° (kept from step 8)', 'Head up to sight the board every few strokes'],
        gaps: ['Keep; add the sight (head up) toward the board'],
      },
    ],
  },
  {
    id: '16-reel-climb', title: 'Reeling the leash and climbing back on (new stages)',
    panels: [
      {
        title: 'Reeling the leash', missing: 'No reel pose: the cord is drawn from the left hand, the body is the ragdoll.',
        today: recipe('reel'), shot: BODY_WIDE,
        target: {
          board: { level: true },
          focus: [0, -0.2, -1.5],
          free: {
            frame: 'water', hips: [0, -0.8, -2.05], up: [0, 1, 0.18], chest: [0, 1, 0.22], facing: [0, 0, 1], look: [0, -0.2, 1],
            legs: { left: { at: [0.12, -1.6, -2.15], pole: [0, 0, 1] }, right: { at: [-0.1, -1.55, -1.95], pole: [0, 0, 1] } },
            arms: { left: { at: [0.08, -0.05, -1.52], pole: [0.7, -0.4, 0] }, right: { at: [-0.12, -0.38, -1.82], pole: [-1, -0.2, -0.3] } },
          },
        },
        numbers: ['Upright in the water, head up', 'Hand over hand along the cord toward the board'],
        gaps: ['leash.reeling is in the snapshot: drawn only from it'],
      },
      {
        title: 'Climbing back on', missing: 'No climb: the grab pulls the ragdoll on, then it snaps to prone (here holding the board, 6 s after the fall).',
        today: recipe('climb-grab'), shot: BODY,
        target: {
          board: { level: true },
          focus: [0.4, 0.0, 0],
          free: {
            frame: 'water', hips: [0.62, -0.25, 0], up: [-0.6, 0.8, 0], chest: [-0.75, 0.65, 0], facing: [-0.7, -0.7, 0], look: [-0.4, -0.9, 0],
            legs: { left: { at: [0.95, -0.95, 0.18], pole: [-0.4, 0, 1] }, right: { at: [0.9, -0.9, -0.2], pole: [-0.4, 0, -1] } },
            arms: { left: { at: [0.24, 0.04, 0.2], pole: [0.6, 0.5, 0.6] }, right: { at: [0.24, 0.04, -0.2], pole: [0.6, 0.5, -0.6] } },
          },
        },
        numbers: ['Both hands at the rail\'s middle, arms pressing', 'Belly onto the board from the side, then swing the legs on', 'Then lie prone'],
        gaps: ['recovery.state (holding) is not in the snapshot: one bit to add (or drawn from the swimmer near the board)'],
      },
    ],
  },
];

// ---------- the drawing ----------

const TILE = { width: 340, height: 400 };
const TEXT = 196;
const HEADER = 46;

/** The mannequin: capsules between the figure's joints, magenta. */
class Mannequin {
  readonly group = new Group();
  private readonly limbs: Mesh[] = [];
  private readonly balls: Mesh[] = [];
  private readonly head: Mesh;
  private readonly nose: Mesh;
  private readonly material = new MeshStandardMaterial({ color: '#ff3cf0', emissive: '#5a0a52', roughness: 0.55 });
  private readonly cylinder = new CylinderGeometry(1, 1, 1, 10);
  private readonly sphere = new SphereGeometry(1, 14, 10);

  constructor() {
    this.head = new Mesh(this.sphere, this.material);
    this.nose = new Mesh(this.cylinder, this.material);
    this.group.add(this.head, this.nose);
    this.group.visible = false;
  }

  show(joints: StanceJoints): void {
    const segments: [Vector3, Vector3, number][] = [
      [joints.hip.left, joints.hip.right, 0.06], [joints.hips, joints.spine, 0.075], [joints.spine, joints.neck, 0.09],
      [joints.shoulder.left, joints.shoulder.right, 0.055], [joints.neck, joints.head, 0.045],
    ];
    for (const side of ['left', 'right'] as const) {
      segments.push([joints.hip[side], joints.knee[side], 0.06], [joints.knee[side], joints.ankle[side], 0.045], [joints.ankle[side], joints.toe[side], 0.035]);
      segments.push([joints.shoulder[side], joints.elbow[side], 0.04], [joints.elbow[side], joints.wrist[side], 0.033]);
    }
    const joint: [Vector3, number][] = [];
    for (const side of ['left', 'right'] as const) {
      joint.push([joints.knee[side], 0.06], [joints.ankle[side], 0.045], [joints.elbow[side], 0.042], [joints.wrist[side], 0.045], [joints.shoulder[side], 0.055], [joints.hip[side], 0.065]);
    }
    segments.forEach(([a, b, radius], i) => this.place(this.limb(i), a, b, radius));
    for (let i = segments.length; i < this.limbs.length; i += 1) this.limbs[i].visible = false;
    joint.forEach(([at, radius], i) => {
      const ball = this.ball(i);
      ball.position.copy(at);
      ball.scale.setScalar(radius);
      ball.visible = true;
    });
    const skull = joints.head.clone().addScaledVector(joints.head.clone().sub(joints.neck).normalize(), 0.08);
    this.head.position.copy(skull);
    this.head.scale.setScalar(0.105);
    this.place(this.nose, skull, skull.clone().addScaledVector(joints.headFacing.clone().normalize(), 0.17), 0.022);
    this.group.visible = true;
  }

  hide(): void {
    this.group.visible = false;
  }

  private limb(i: number): Mesh {
    while (this.limbs.length <= i) {
      const mesh = new Mesh(this.cylinder, this.material);
      this.limbs.push(mesh);
      this.group.add(mesh);
    }
    this.limbs[i].visible = true;
    return this.limbs[i];
  }

  private ball(i: number): Mesh {
    while (this.balls.length <= i) {
      const mesh = new Mesh(this.sphere, this.material);
      this.balls.push(mesh);
      this.group.add(mesh);
    }
    return this.balls[i];
  }

  private place(mesh: Mesh, a: Vector3, b: Vector3, radius: number): void {
    const along = b.clone().sub(a);
    const length = Math.max(1e-4, along.length());
    mesh.position.copy(a).addScaledVector(along, 0.5);
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), along.divideScalar(length));
    mesh.scale.set(radius, length, radius);
  }
}

/** The move that puts a board at `at` with its nose along +z (its roll and pitch kept), and a state moved by it. */
function frameAt(position: Vector3, orientation: Quaternion, at: Vector3, keepHeight: boolean) {
  const forward = new Vector3(0, 0, 1).applyQuaternion(orientation);
  const yaw = Math.atan2(forward.x, forward.z);
  const to = keepHeight ? at.clone().setY(position.y) : at.clone();
  return { from: position.clone(), at: to, unturn: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -yaw), yaw };
}
type Frame = ReturnType<typeof frameAt>;
function moveState(state: RiderVisualState, frame: Frame): void {
  const move = (point: Vector3) => point.sub(frame.from).applyQuaternion(frame.unturn).add(frame.at);
  for (const point of state.points) move(point);
  move(state.leash.plug);
  move(state.boardPosition);
  state.boardQuaternion.premultiply(frame.unturn);
  state.heading -= frame.yaw;
}

/** A ride session stepped to its moment (`Today`'s session), every step drawn through the motion estimate to `draw`. */
function drawnSession(today: Extract<Today, { kind: 'session' }>, at: Vector3, draw: (state: RiderVisualState) => void): RiderVisualState {
  const run = (visit?: (session: RideSession, time: number, paddling: boolean) => void) => {
    const session = new RideSession();
    const water = today.water === 'face' ? new PlaneWater({ slopeZ: -Math.tan(15 * DEG) }) : new PlaneWater();
    session.place(today.placement, water);
    let time = 0;
    let stopAt = Number.POSITIVE_INFINITY;
    const end = Math.round(today.seconds / STEP);
    for (let i = 0; i < end && time < stopAt - 1e-9; i += 1) {
      const input: RideInput = { paddle: false, popUp: false, steer: 0, ...today.input(time, session) };
      session.step(STEP, water, input);
      time += STEP;
      visit?.(session, time, input.paddle);
      if (today.until && stopAt === Number.POSITIVE_INFINITY && time >= (today.from ?? 0) && today.until(session)) stopAt = time + (today.after ?? 0);
    }
    return session;
  };
  const last = run();
  // Floating on flat water the board keeps its own height; down a face it is brought to the tile's place (it slid down).
  const frame = frameAt(last.board.position, last.board.orientation, at, today.water !== 'face');
  const motion = new RiderMotion();
  const state = createRiderVisualState();
  const rider = new Float64Array(RIDER_SNAPSHOT.length);
  const board = new Float64Array(8);
  const point = new Vector3();
  run((session, time, paddling) => {
    // The take-off cue as the page has it (the rider's own; the wave's take-off window needs a wave).
    writeRiderSnapshot(session, session.rider.attached && session.rider.popUpCue, rider, point);
    session.board.position.toArray(board, 0);
    session.board.orientation.toArray(board, 3);
    readRiderSnapshot(rider, board, state);
    sessionCues(session, state);
    state.stance = 'regular';
    moveState(state, frame);
    motion.update(state, time);
    state.clock = time;
    state.stroking = paddling && state.phase === 'prone' ? 1 : 0;
    draw(state);
  });
  return state;
}

/** The target's board pose: today's, pitched, rolled and sunk as the target asks. */
function targetBoard(today: BoardPose, target: Target): BoardPose {
  const q = today.boardQuaternion.clone();
  if (target.board?.level) {
    const forward = new Vector3(0, 0, 1).applyQuaternion(q);
    q.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(forward.x, forward.z));
  }
  // Pitch nose up about the board's left (+x), roll toward Regular's toes (−x) about its nose.
  if (target.board?.pitch) q.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -target.board.pitch * DEG));
  if (target.board?.roll) q.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -target.board.roll * DEG));
  const position = today.boardPosition.clone();
  if (target.board?.sink) position.y -= target.board.sink;
  return { boardPosition: position, boardQuaternion: q };
}

const flexion = (included: number) => 180 - included;
const fmt = (value: number, digits = 0) => (Number.isFinite(value) ? value.toFixed(digits) : '—');

/** A standing pose's numbers in one line, the plan's conventions (knees as flexion; regular: the left foot in front). */
function readout(angles: StanceAngles, feet: Record<Side, number>): string {
  return `knee F ${fmt(flexion(angles.kneeFront))}° R ${fmt(flexion(angles.kneeRear))}° · feet ${fmt(feet.left)}°/${fmt(feet.right)}° · trunk ${fmt(angles.trunkTilt)}° · chest ${fmt(angles.chestTwist)}° · `
    + `arms ${fmt(angles.leadArm)}°/${fmt(angles.trailArm)}° · lean ${fmt(angles.lean)}° · ${fmt(angles.stanceWidth, 2)} m · wt ${fmt(angles.weight, 2)}`;
}

/** A lying or sitting pose's numbers in one line (the animation-realism plan's phase-3 measures). */
function lyingReadout(angles: StanceAngles, phase: string): string {
  return `phase ${phase} · chest lift ${fmt(angles.chestLift)}° · head ${fmt(angles.headPitch)}° down · trunk from vertical ${fmt(angles.sitTrunk)}° · `
    + `knees ${fmt(flexion(angles.kneeFront))}°/${fmt(flexion(angles.kneeRear))}° · legs ${fmt(angles.legsApart, 2)} m · hands ${fmt(angles.handsApart, 2)} m · elbows ${fmt(angles.leadElbow)}°/${fmt(angles.trailElbow)}°`;
}

function wrap(context: CanvasRenderingContext2D, text: string, width: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

interface Rendered { panel: Panel; today: HTMLCanvasElement; target: HTMLCanvasElement; todayLine?: string; targetLine?: string }

export async function drawRealism(ctx: RealismContext): Promise<void> {
  if (ctx.params.has('arms')) {
    await drawArms(ctx);
    return;
  }
  const { renderer, scene, camera, surfers, boards, params, status } = ctx;
  const index = Math.min(3, Math.max(0, Number(params.get('surfer') ?? 0)));
  const surfer = surfers[index];
  const board = boards[index];
  surfers.forEach((other, i) => { other.group.visible = false; if (i !== index) other.group.visible = false; });
  boards.forEach((other, i) => { other.visible = i === index; });
  const bones = new Map<string, Bone>();
  surfer.group.traverse((object) => { if ((object as Bone).isBone) bones.set(object.name, object as Bone); });
  // Built at the bind pose, before the surfer is first posed.
  const gauge = new StanceGauge(bones);
  const lengths: FigureLengths = figureLengths(gauge.joints());
  const mannequin = new Mannequin();
  scene.add(mannequin.group);
  const waterMaterial = ctx.water.material as MeshStandardMaterial;
  waterMaterial.transparent = true;
  waterMaterial.opacity = Number(params.get('waterOpacity') ?? 0.55);
  waterMaterial.depthWrite = false;
  ctx.water.renderOrder = 5;
  renderer.setScissorTest(false);
  renderer.setSize(TILE.width, TILE.height, false);
  camera.aspect = TILE.width / TILE.height;
  camera.fov = 40;
  camera.updateProjectionMatrix();
  const only = params.get('only');
  const images = only ? IMAGES.filter((image) => image.id === only) : IMAGES;
  const rendered: { image: SheetImage; panels: Rendered[] }[] = [];
  const snap = () => {
    const tile = document.createElement('canvas');
    tile.width = TILE.width;
    tile.height = TILE.height;
    tile.getContext('2d')!.drawImage(ctx.canvas, 0, 0);
    return tile;
  };
  const look = (shot: Shot, focus: Vector3) => {
    const base = shot.aboutBody ? focus : new Vector3(0, ctx.boardPosition.y, 0);
    camera.position.set(...shot.eye).add(base).setY(shot.eye[1] + (shot.aboutBody ? Math.max(0, focus.y) : 0));
    camera.lookAt(new Vector3(...shot.look).add(base));
    ctx.shadows.follow(base, ctx.sun.position.clone().normalize(), 0);
    renderer.render(scene, camera);
  };
  for (const image of images) {
    const panels: Rendered[] = [];
    for (const panel of image.panels) {
      status.textContent = `realism · ${image.id} · ${panel.title}…`;
      await new Promise((resolve) => setTimeout(resolve, 0));
      // Today: drawn as the game draws it.
      surfer.resetMotion();
      surfer.group.visible = true;
      const eye = new Vector3(...panel.shot.eye);
      const draw = (step: RiderVisualState) => surfer.update(step, eye);
      const state = panel.today.kind === 'recipe'
        ? drawnRecipe(panel.today.recipe, 'regular', ctx.boardPosition, draw).state
        : drawnSession(panel.today, ctx.boardPosition, draw);
      board.position.copy(state.boardPosition);
      board.quaternion.copy(state.boardQuaternion);
      const upright = state.phase === 'standing' || state.phase === 'landing';
      const todayJoints = gauge.joints();
      const todayLine = upright ? readout(gauge.measure(state, 'regular'), footAngles(todayJoints, state)) : lyingReadout(gauge.measure(state, 'regular'), state.phase);
      look(panel.shot, state.points[POINT.pelvis].clone());
      const today = snap();
      // The target: the figure on its board, the surfer hidden.
      surfer.group.visible = false;
      const pose = targetBoard(state, panel.target);
      board.position.copy(pose.boardPosition);
      board.quaternion.copy(pose.boardQuaternion);
      let figure: StanceJoints;
      let targetLine: string | undefined;
      if (panel.target.standing) {
        figure = standingFigure(panel.target.standing, lengths, 'regular', pose);
        targetLine = readout(measureJoints(figure, pose, 'regular'), footAngles(figure, pose));
      } else {
        figure = freeFigure(panel.target.free!, lengths, 'regular', pose);
      }
      mannequin.show(figure);
      const focus = panel.target.focus ? new Vector3(...panel.target.focus).add(new Vector3(pose.boardPosition.x, 0, pose.boardPosition.z)) : figure.hips.clone();
      look(panel.shot, focus);
      mannequin.hide();
      panels.push({ panel, today, target: snap(), todayLine, targetLine });
    }
    rendered.push({ image, panels });
  }
  surfer.group.visible = false;
  board.visible = false;
  // Each tile's readings, for the plan's tables.
  (window as unknown as { realismReadouts: unknown }).realismReadouts = rendered.flatMap(({ image, panels }) => panels.map((entry) => ({
    image: image.id, panel: entry.panel.title, today: entry.todayLine, figure: entry.targetLine,
  })));
  status.textContent = `realism · ${rendered.length} images · surfer${index + 1} regular · magenta: the target figure`;
  ctx.canvas.style.display = 'none';
  const outputs: { name: string; canvas: HTMLCanvasElement }[] = [];
  for (const { image, panels } of rendered) outputs.push({ name: `${image.id}.jpg`, canvas: composeImage(image, panels) });
  if (!only) outputs.unshift({ name: '00-overview.jpg', canvas: composeOverview(rendered) });
  for (const { name, canvas } of outputs) {
    canvas.style.display = 'block';
    canvas.style.maxWidth = '100%';
    canvas.title = name;
    document.body.append(canvas);
  }
  if (params.has('save')) {
    const receiver = params.get('receiver') ?? 'http://127.0.0.1:5194';
    const quality = Number(params.get('quality') ?? 0.82);
    const sizes: string[] = [];
    // `&suffix=<s>` saves beside the earlier stills (06-trim-<s>.jpg).
    const suffix = params.get('suffix');
    for (const { name: plain, canvas } of outputs) {
      const name = suffix ? plain.replace(/\.jpg$/, `-${suffix}.jpg`) : plain;
      const q = name.startsWith('00') ? Number(params.get('overviewQuality') ?? 0.7) : quality;
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', q));
      await fetch(`${receiver}/upload?name=${encodeURIComponent(name)}`, { method: 'POST', body: blob });
      sizes.push(`${name} ${(blob.size / 1024).toFixed(0)} KB`);
    }
    (window as unknown as { realismSaved: string[] }).realismSaved = sizes;
  }
  (window as unknown as { sheetReady: boolean }).sheetReady = true;
}

const FONT = '12px ui-monospace, Menlo, monospace';
/**
 * `&when=<text>` names what the left tiles show (a phase's before and after: "as drawn at the end of phase 1"), and
 * `&gaps=0` leaves out the panels' written gaps and their "missing" notes (written for the plan's day 0): the tiles'
 * own readings stay.
 */
const SHEET_PARAMS = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
const SUBTITLE = SHEET_PARAMS.get('when') ?? 'today as the game draws it';
const SHOW_GAPS = SHEET_PARAMS.get('gaps') !== '0';

function caption(context: CanvasRenderingContext2D, x: number, y: number, width: number, text: string, color: string): void {
  context.font = '600 13px system-ui, sans-serif';
  context.fillStyle = 'rgba(13,17,23,0.72)';
  context.fillRect(x, y, width, 22);
  context.fillStyle = color;
  context.fillText(text, x + 8, y + 15);
}

function composeImage(image: SheetImage, panels: Rendered[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = panels.length * 2 * TILE.width;
  canvas.height = HEADER + TILE.height + TEXT;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#0d1117';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = '600 18px system-ui, sans-serif';
  context.fillStyle = '#e6edf3';
  context.fillText(`${image.title}`, 12, 21);
  context.font = '11.5px system-ui, sans-serif';
  context.fillStyle = '#8b949e';
  context.fillText(`Each pair: ${SUBTITLE} (left), the target from the plan's numbers (magenta). Regular.`, 12, 38);
  panels.forEach((rendered, i) => {
    const x = i * 2 * TILE.width;
    context.drawImage(rendered.today, x, HEADER);
    context.drawImage(rendered.target, x + TILE.width, HEADER);
    caption(context, x, HEADER, TILE.width, `${rendered.panel.title} · today`, '#ffffff');
    caption(context, x + TILE.width, HEADER, TILE.width, `${rendered.panel.title} · target`, '#ff7cf3');
    if (rendered.panel.missing && SHOW_GAPS) {
      context.font = '11px system-ui, sans-serif';
      const lines = wrap(context, rendered.panel.missing, TILE.width - 16);
      context.fillStyle = 'rgba(13,17,23,0.72)';
      context.fillRect(x, HEADER + TILE.height - 8 - lines.length * 14, TILE.width, lines.length * 14 + 8);
      context.fillStyle = '#ffb86b';
      lines.forEach((line, j) => context.fillText(line, x + 8, HEADER + TILE.height - 6 - (lines.length - 1 - j) * 14 - 4));
    }
    // The text band: the target's numbers, then today's gaps.
    const width = 2 * TILE.width - 20;
    let y = HEADER + TILE.height + 16;
    context.font = FONT;
    const block = (lines: string[], color: string, bullet: string) => {
      context.fillStyle = color;
      for (const text of lines) {
        for (const [k, line] of wrap(context, `${bullet}${text}`, width).entries()) {
          if (y > canvas.height - 6) return;
          context.fillText(k ? `  ${line}` : line, x + 10, y);
          y += 15;
        }
      }
    };
    block(rendered.panel.numbers, '#ff9cf5', '+ ');
    if (SHOW_GAPS) block(rendered.panel.gaps, '#ffb86b', '– ');
    context.font = '10.5px ui-monospace, Menlo, monospace';
    if (rendered.todayLine) block([`today: ${rendered.todayLine}`], '#c9d1d9', '');
    if (rendered.targetLine) block([`figure: ${rendered.targetLine}`], '#d2a8ff', '');
    if (i > 0) {
      context.fillStyle = '#30363d';
      context.fillRect(x - 1, HEADER, 2, canvas.height - HEADER);
    }
  });
  return canvas;
}

function composeOverview(rendered: { image: SheetImage; panels: Rendered[] }[]): HTMLCanvasElement {
  const pairs = rendered.flatMap(({ panels }) => panels);
  const tile = { width: 150, height: 176 };
  const perRow = 6;
  const label = 18;
  const rows = Math.ceil(pairs.length / perRow);
  const canvas = document.createElement('canvas');
  canvas.width = perRow * 2 * tile.width;
  canvas.height = HEADER + rows * (tile.height + label);
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#0d1117';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = '600 18px system-ui, sans-serif';
  context.fillStyle = '#e6edf3';
  context.fillText('The stance sheet: every stage today (left) and its target (magenta, right)', 12, 23);
  pairs.forEach((pair, i) => {
    const x = (i % perRow) * 2 * tile.width;
    const y = HEADER + Math.floor(i / perRow) * (tile.height + label);
    context.font = '600 11.5px system-ui, sans-serif';
    context.fillStyle = pair.panel.missing ? '#ffb86b' : '#e6edf3';
    context.fillText(`${pair.panel.title}${pair.panel.missing ? ' (new)' : ''}`, x + 6, y + 13);
    context.drawImage(pair.today, x, y + label, tile.width, tile.height);
    context.drawImage(pair.target, x + tile.width, y + label, tile.width, tile.height);
  });
  return canvas;
}

// ---------- the arms (the owner's reference photo, 2026-10-22) ----------

/** Three-quarter front, slightly above (the owner's photo), and from the nose at the chest's height. */
const ARMS_FRONT: Shot = { eye: [-2.9, 2.0, 1.9], look: [0, 0.72, 0.15] };
const ARMS_SIDE: Shot = { eye: [0.25, 1.2, 3.4], look: [0, 0.72, 0] };

/** The arms' stances: crouched trim (the photo's), trim frontside and backside across the face, the drop. */
const ARMS_STANCES: { title: string; recipe: StanceRecipe }[] = [
  { title: 'Trim, crouched (the photo)', recipe: { phase: 'standing', water: 'across', start: 'standing', speed: 7, controls: [{ at: 0, crouch: 1 }], seconds: 1.2 } },
  { title: 'Trim, frontside', recipe: { phase: 'standing', water: 'across', start: 'standing', speed: 7, controls: [], seconds: 1.2 } },
  { title: 'Trim, backside', recipe: { phase: 'standing', water: 'across-back', start: 'standing', speed: 7, controls: [], seconds: 1.2 } },
  { title: 'The drop', recipe: STANCE_RECIPES.drop },
];

/**
 * The arms sheet (`?realism&arms&label=before|after`): each of `ARMS_STANCES`
 * as the game draws it, from three-quarter front slightly above (the owner's
 * reference photo) and from the nose, with where the hands hang about the
 * knees; saved as 17-arms-<label>.jpg.
 */
async function drawArms(ctx: RealismContext): Promise<void> {
  const { renderer, scene, camera, surfers, boards, params, status } = ctx;
  const label = params.get('label') ?? 'today';
  const index = Math.min(3, Math.max(0, Number(params.get('surfer') ?? 0)));
  const surfer = surfers[index];
  const board = boards[index];
  surfers.forEach((other) => { other.group.visible = false; });
  boards.forEach((other, i) => { other.visible = i === index; });
  const bones = new Map<string, Bone>();
  surfer.group.traverse((object) => { if ((object as Bone).isBone) bones.set(object.name, object as Bone); });
  const gauge = new StanceGauge(bones);
  renderer.setScissorTest(false);
  renderer.setSize(TILE.width, TILE.height, false);
  camera.aspect = TILE.width / TILE.height;
  camera.fov = 34;
  camera.updateProjectionMatrix();
  const tiles: { title: string; front: HTMLCanvasElement; side: HTMLCanvasElement; line: string }[] = [];
  const snap = () => {
    const tile = document.createElement('canvas');
    tile.width = TILE.width;
    tile.height = TILE.height;
    tile.getContext('2d')!.drawImage(ctx.canvas, 0, 0);
    return tile;
  };
  const look = (shot: Shot) => {
    const base = new Vector3(0, ctx.boardPosition.y, 0);
    camera.position.set(...shot.eye).add(base);
    camera.lookAt(new Vector3(...shot.look).add(base));
    ctx.shadows.follow(base, ctx.sun.position.clone().normalize(), 0);
    renderer.render(scene, camera);
  };
  for (const { title, recipe: stance } of ARMS_STANCES) {
    status.textContent = `realism · arms · ${title}…`;
    await new Promise((resolve) => setTimeout(resolve, 0));
    surfer.resetMotion();
    surfer.group.visible = true;
    const state = drawnRecipe(stance, 'regular', ctx.boardPosition, (step) => surfer.update(step, new Vector3(...ARMS_FRONT.eye))).state;
    board.position.copy(state.boardPosition);
    board.quaternion.copy(state.boardQuaternion);
    const joints = gauge.joints();
    // Where the hands hang: each wrist's height over its knee, and the front one ahead of its knee along the line.
    const nose = new Vector3(0, 0, 1).applyQuaternion(state.boardQuaternion).setY(0).normalize();
    const above = (side: Side) => joints.wrist[side].y - joints.knee[side].y;
    const ahead = joints.wrist.left.clone().sub(joints.knee.left).dot(nose);
    const out = Math.max(...(['left', 'right'] as const).map((side) => Math.abs(joints.wrist[side].clone().sub(joints.hips).dot(nose))));
    const line = `hands over knees F ${above('left').toFixed(2)} m, R ${above('right').toFixed(2)} m · front hand ahead ${ahead.toFixed(2)} m · out ${out.toFixed(2)} m (shoulders ${joints.shoulder.left.distanceTo(joints.shoulder.right).toFixed(2)})`;
    look(ARMS_FRONT);
    const front = snap();
    look(ARMS_SIDE);
    const side = snap();
    tiles.push({ title, front, side, line });
  }
  surfer.group.visible = false;
  board.visible = false;
  const canvas = document.createElement('canvas');
  canvas.width = tiles.length * TILE.width;
  canvas.height = HEADER + 2 * TILE.height + 52;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#0d1117';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = '600 18px system-ui, sans-serif';
  context.fillStyle = '#e6edf3';
  context.fillText(`The arms, ${label}: three-quarter front from above (top), from the nose (bottom)`, 12, 21);
  context.font = '11.5px system-ui, sans-serif';
  context.fillStyle = '#8b949e';
  context.fillText('The owner\'s reference (2026-10-22): relaxed and close in, framing the knees; never spread. Regular, surfer' + (index + 1) + '.', 12, 38);
  tiles.forEach((tile, i) => {
    const x = i * TILE.width;
    context.drawImage(tile.front, x, HEADER);
    context.drawImage(tile.side, x, HEADER + TILE.height);
    caption(context, x, HEADER, TILE.width, tile.title, '#ffffff');
    context.font = '10.5px ui-monospace, Menlo, monospace';
    context.fillStyle = '#c9d1d9';
    wrap(context, tile.line, TILE.width - 14).forEach((text, k) => context.fillText(text, x + 7, HEADER + 2 * TILE.height + 15 + k * 13));
    if (i > 0) {
      context.fillStyle = '#30363d';
      context.fillRect(x - 1, HEADER, 2, canvas.height - HEADER);
    }
  });
  ctx.canvas.style.display = 'none';
  canvas.style.display = 'block';
  canvas.style.maxWidth = '100%';
  document.body.append(canvas);
  (window as unknown as { realismReadouts: unknown }).realismReadouts = tiles.map((tile) => ({ title: tile.title, line: tile.line }));
  if (params.has('save')) {
    const receiver = params.get('receiver') ?? 'http://127.0.0.1:5194';
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', Number(params.get('quality') ?? 0.85)));
    await fetch(`${receiver}/upload?name=${encodeURIComponent(`17-arms-${label}.jpg`)}`, { method: 'POST', body: blob });
    (window as unknown as { realismSaved: string[] }).realismSaved = [`17-arms-${label}.jpg ${(blob.size / 1024).toFixed(0)} KB`];
  }
  status.textContent = `realism · arms · ${label}`;
  (window as unknown as { sheetReady: boolean }).sheetReady = true;
}
