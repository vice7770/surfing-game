import type { StanceMeasure } from './stanceGauge';

/**
 * The stance map (the riding-body plan, step 2): each riding stance's target
 * joint angles, with where each comes from. The document
 * (docs/research/stance-map.md) cites the pictures; the gauge
 * (`stanceGauge.ts`) reads the same measures from a drawn body.
 *
 * Provenance (the user's rule, Q20): peer-reviewed measurements first, then
 * the thesis (de Sousa 2022), then coaching cues, then the reference videos as
 * read from their frames. A target claims no more confidence than its best
 * source allows. Where no source reaches a measure it has no target: a gap,
 * listed in the document, never filled by what is drawn.
 */
export type SourceKind = 'measured' | 'thesis' | 'coaching' | 'video';
export const PROVENANCE: readonly SourceKind[] = ['measured', 'thesis', 'coaching', 'video'];
export type Confidence = 'high' | 'medium' | 'low';
/** The most a target may claim from its best source: a coaching cue turned into a number is at most medium, a frame read by eye low. */
export const CONFIDENCE_CAP: Record<SourceKind, Confidence> = { measured: 'high', thesis: 'medium', coaching: 'medium', video: 'low' };

export interface Source {
  /** For tables. */
  short: string;
  kind: SourceKind;
  cite: string;
  url?: string;
  /** A source that is not online: where it is held. */
  held?: string;
  /** Another link to the same reference. */
  also?: string;
  /** What it gives the map (or, for a reference not yet read, what it shows and where). */
  gives: string;
}

const SOURCE_LIST = {
  weiss2025: {
    short: 'Weiss 2025',
    kind: 'measured',
    cite: 'Weiss et al. 2025, Simulating surfing with optimal control: sensor fusion for biomechanical analysis (Multibody System Dynamics), Figs 6–7',
    url: 'https://doi.org/10.1007/s11044-025-10071-3',
    gives: '7 surfers on a river wave, IMUs and pose estimation: peak flexion from straight, hip 55.0° rear / 50.0° front, knee 51.1° / 44.7°, ankle 21.1° / 18.3°. A river wave is less crouched than an ocean bottom turn.',
  },
  borgonovo2021: {
    short: 'Borgonovo-Santos 2021',
    kind: 'measured',
    cite: 'Borgonovo-Santos et al. 2021, Are the kinetics and kinematics of the surf pop-up related to the anthropometric characteristics of the surfer? (Sensors 21:1783)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7961430',
    gives: 'The pop-up: 1.20 s (0.71 s pushing, 0.48 s reaching); feet 0.63 ± 0.10 m apart; 72 ± 8 % on the front foot at the reach; knees 99 ± 20° front, 101 ± 14° rear at the reach\'s peak force (the angle\'s convention is not stated); elbows 110–112 ± 18° at the push\'s peak force; the stance a half-squat, knees flexed 30–80° (citing earlier work).',
  },
  forsyth2024: {
    short: 'Forsyth 2024',
    kind: 'measured',
    cite: 'Forsyth et al. 2024, turns measured on ocean waves',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11021506/',
    gives: 'Bottom turn 101 ± 7° in 0.96 s at 1.9 rad/s, rail 39 ± 4°; cutback 156 ± 7°, rail 76 ± 5°, pitch 45°.',
  },
  moreira2014: {
    short: 'Moreira 2014',
    kind: 'measured',
    cite: 'Moreira and Peixoto 2014, qualitative biomechanical analysis of surfing manoeuvres',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4234763',
    gives: 'The trunk leans to the inside of a turn; trimming, the front foot sits over the board\'s centre of buoyancy. Directions only, no angles.',
  },
  desousa2022: {
    short: 'de Sousa 2022',
    kind: 'thesis',
    cite: 'de Sousa 2022, Development of an observation tool for the Bottom-Turn manoeuvre in surfers (master\'s thesis, Faculdade de Motricidade Humana, Universidade de Lisboa), validated with seven national coaches',
    held: 'Not online: the user holds a copy. Its phases are quoted in docs/superpowers/specs/2026-09-27-stances.md.',
    gives: 'Preparation: head toward the bottom, trunk over the front foot, knees 90–110°. Fundamental: head toward the lip, knees and hips at 90° or less, the body leaning in until the inside hand nears the water. Final: the hand leaves the water, the trunk rotates, knees to 150° or more and hips extend, the chest and leading arm point at the lip. Weight over the front foot flexed, to the back foot extending.',
  },
  surfdeeper: {
    short: 'SurfDeeper',
    kind: 'coaching',
    cite: 'SurfDeeper, Stance',
    url: 'https://www.surfdeeper.com/skill/stance',
    gives: 'Feet about shoulder width, back foot square, front foot at 30–45°; a soft knee bend, the front leg straighter than the back; hinge at the hips, tall through the spine; the chest faces forward, not fully side-on; eyes where you want to go; hands and elbows over their rails, quiet hands; weight centred.',
  },
  cornishwave: {
    short: 'Cornish Wave',
    kind: 'coaching',
    cite: 'Cornish Wave, The importance of stance',
    url: 'https://cornishwave.com/beginners-guide-to-surfing/the-importance-of-stance/',
    gives: 'Weight 60/40 onto the front foot at rest, 70/30 into the bottom turn, 40/60 onto the back foot in top turns and cutbacks.',
  },
  rapturecutback: {
    short: 'Rapture, cutback',
    kind: 'coaching',
    cite: 'Rapture Surfcamps, The cutback',
    url: 'https://www.rapturecamps.com/learn-to-surf/surf-maneuvers/cutback',
    gives: 'Weight 65/35 to 70/30 onto the back foot in the cutback.',
  },
  rapturespeed: {
    short: 'Rapture, speed',
    kind: 'coaching',
    cite: 'Rapture Surfcamps, Speed generation',
    url: 'https://www.rapturecamps.com/learn-to-surf/surf-maneuvers/speed-generation',
    gives: 'About one pump a second: extend going downhill, 55/45 onto the front foot, the arms pushing down; compress going uphill, 55/45 onto the back foot, the arms pulling up.',
  },
  balisurfing: {
    short: 'Bali Surfing Camp',
    kind: 'coaching',
    cite: 'Bali Surfing Camp, Frontside top turn',
    url: 'https://www.balisurfingcamp.com/blog/frontside-top-turn',
    gives: 'Compress low into the bottom turn, looking at the lip; decompress up the face; swing the trailing arm around to lead a heelside carve; guide the head, shoulders and hips through the rotation; finish compressed, weight and arms forward.',
  },
  // The approved reference set (Q19), cited by timestamp; the frames read are the video targets' sources.
  snapshort: {
    short: 'the snap video',
    kind: 'video',
    cite: 'Surfers of Bali, Snap In The Lip Over Shallow Reef (YouTube short xTgYU5ShueI)',
    url: 'https://www.youtube.com/shorts/xTgYU5ShueI',
    gives: 'The flow: trim, compress into the bottom turn, extend to the lip, snap (the trunk twisting, an arm up), compress back down. 360 × 640 and far off: the sequence only, no angles read.',
  },
  kerr: {
    short: 'Kerr video',
    kind: 'video',
    cite: 'SURFER, Surfing 201: How to bottom turn like a pro, with Josh Kerr',
    url: 'https://www.youtube.com/watch?v=IEmH9lRgPsU',
    gives: 'Read at 0:58–1:00 (the drop, frontside, side-on, annotated): trunk flexed about 50–65°, knees about 100–115°, the lead arm forward and low (about 50–60° from the trunk), elbows about 150–160°, the head up along the line. Large waves from 2:40, not read.',
  },
  gudauskas: {
    short: 'Gudauskas video',
    kind: 'video',
    cite: 'Aloha Visuals, How to bottom turn with Patrick Gudauskas',
    url: 'https://www.youtube.com/watch?v=rhCoXhDLkO4',
    gives: 'Read at 2:32 and 2:36 (compressed at the turn\'s base): trunk about 60–70°, the lead arm reaching forward and down near straight (elbow about 160–170°), the trailing elbow about 90° by the hip, knees about 80° or less, the lead hand at the water. At 3:20.5 (frontside, a hand dragging): trunk about 45–55°, knees about 80–90°, the head down toward the water ahead. At 3:21.5 (extending up the face): both arms wide, about 80–100° out, elbows about 140–160°, trunk about 20–30°, knees about 120–140°, looking up the face.',
  },
  whitaker: {
    short: 'Whitaker video',
    kind: 'video',
    cite: 'Surfline, Tom Whitaker: the bottom turn',
    url: 'https://www.youtube.com/watch?v=lfxVAZGqCXY',
    gives: 'Pro bottom turns from 3:08. Not read yet.',
  },
  reyes: {
    short: 'Reyes video',
    kind: 'video',
    cite: 'Surfline, Timmy Reyes: carve to snap',
    url: 'https://www.youtube.com/watch?v=nZqUTSrVELs',
    gives: 'Carve to snap. Not read yet.',
  },
  hobgood: {
    short: 'Hobgood',
    kind: 'coaching',
    cite: 'Surfline, How to do a backside snap with Damien Hobgood (his spoken cues, read from the captions)',
    url: 'https://www.youtube.com/watch?v=ay3Q4_Gtskk',
    gives: 'Backside: the bottom turn really low and compact, the body rotated with the hips rather than leaning over (0:25–0:43); at the top, the arm up opens the shoulders, turning hard (0:49–0:55); into the snap, the weight further back on the tail (1:00–1:08); do not over-rotate, square up to the lip (1:14–1:23). Its footage is too far off to read angles from.',
  },
  knox: {
    short: 'Knox',
    kind: 'coaching',
    cite: 'Surfline, How to do a cutback with Taylor Knox (his spoken cues, read from the captions)',
    url: 'https://www.youtube.com/watch?v=TmiotynMuvc',
    gives: 'Frontside: a deep bottom turn, off the bottom heavy on the back foot; up the face the weight more even, the hips and arms turning with the body, the head following (0:54–1:16). Backside: low in the bottom turn, extending up the face, pushing on the back foot with the body held more upright (2:17–2:41). Centred over the board, the limbs not flung back (2:50).',
  },
  brock: {
    short: 'Brock video',
    kind: 'video',
    cite: 'Kale Brock: the cutback\'s phases',
    url: 'https://www.youtube.com/watch?v=JytkE4cyXCo',
    gives: 'The cutback\'s phases at 1:15, 3:15 and 5:15. Not read yet.',
  },
  fanning: {
    short: 'Fanning video',
    kind: 'video',
    cite: 'Surfline, How to generate speed with Mick Fanning',
    url: 'https://www.youtube.com/watch?v=FEUM4fCde40',
    gives: 'Read at 0:33 (pumping, frontside, close): the lead arm forward at about 80–100°, the trailing arm low by the hip, knees about 120–130°, the trunk about 15–25°. Which beat of the pump it is cannot be told from one frame, so it sets no target. Its captions could not be read.',
  },
  barefootpopup: {
    short: 'Barefoot Surf pop-up',
    kind: 'video',
    cite: 'Barefoot Surf: the pop-up; and Swell Surf Camp\'s photo sequence',
    url: 'https://www.youtube.com/watch?v=9rz-ucDwjVU',
    also: 'https://swellsurfcamp.com/surf-technique-1-the-pop-up/',
    gives: 'The pop-up. Not read yet.',
  },
  robcase: {
    short: 'Rob Case video',
    kind: 'video',
    cite: 'Rob Case on Kelly Slater\'s paddle stroke',
    url: 'https://www.youtube.com/watch?v=bwFBojLeUt8',
    gives: 'Paddling, for step 8. Not read yet.',
  },
  barefootduckdive: {
    short: 'Barefoot Surf duck-dive',
    kind: 'video',
    cite: 'Barefoot Surf: the duck-dive',
    url: 'https://www.youtube.com/watch?v=yEI8IVZV46s',
    gives: 'The duck-dive, for step 8. Not read yet.',
  },
  // The animation-realism plan's sources (docs/superpowers/plans/2026-10-22-animation-realism.md, §11).
  weiss2024: {
    short: 'Weiß 2024',
    kind: 'measured',
    cite: 'Weiß A, Koelewijn A, Masmoudi I, Lluch È (2024), Combining pose estimation and inertial measurement tracking data for a biomechanical simulation of river wave surfing using optimal control (Proc. 29th ECSS, Glasgow)',
    url: 'https://cris.fau.de/publications/331306594',
    gives: 'One surfer, nine river-wave turns: the front leg\'s peaks above the rear\'s, hip flexion 58.7°, knee 69.8°.',
  },
  bruton2013: {
    short: 'Bruton 2013',
    kind: 'measured',
    cite: 'Bruton MR, O\'Dwyer NJ, Adams RD (2013), Neuromuscular characteristics of recreational and competitive male and female surfers (Int J Perform Anal Sport 13(2): 388–402)',
    url: 'https://doi.org/10.1080/24748668.2013.11868656',
    gives: 'The simulated surfing crouch; recreational women crouch shallower.',
  },
  seixas2023: {
    short: 'Seixas 2023',
    kind: 'measured',
    cite: 'Seixas P, Oliveira R, Carita AI, Moreira M (2023), Setting qualitative performance parameters of elite surfing aerial manoeuvres with 360° rotation (Cuadernos de Psicología del Deporte 23(2): 169–193)',
    url: 'https://doi.org/10.6018/cpd.534281',
    gives: 'Landings: base of support 79.2 ± 13.7 cm, front knee 113.8 ± 19.9°, front ankle dorsiflexed 32.7 ± 14.5°.',
  },
  rapturestance: {
    short: 'Rapture, stance',
    kind: 'coaching',
    cite: 'Rapture Surfcamps, Learn to surf: stance',
    url: 'https://www.rapturecamps.com/learn-to-surf/surf-fundamentals/stance',
    gives: 'The front foot 20–30° and the back 15–25° off square, the knees bent and the back knee in toward the front, the lead shoulder down the line, the hands low and quiet, the eyes where you go.',
  },
  rapturetakeoff: {
    short: 'Rapture, take-off',
    kind: 'coaching',
    cite: 'Rapture Surfcamps, Learn to surf: take-off techniques (the research brief of 2026-10-22; its exact page to confirm in the build)',
    url: 'https://www.rapturecamps.com/learn-to-surf/take-off/take-off-techniques',
    gives: 'The drop: the deepest crouch, knees past 90°, the back fairly upright, the arms at the waist or below with the lead arm along the line, the eyes on the base, 55–60 % on the back foot on a steep face (the owner\'s call, §10.2).',
  },
  rapturesides: {
    short: 'Rapture, frontside vs backside',
    kind: 'coaching',
    cite: 'Rapture Surfcamps, Learn to surf: frontside vs backside take-off',
    url: 'https://www.rapturecamps.com/learn-to-surf/take-off/frontside-vs-backside-take-off',
    gives: 'Backside the torso turns toward the wave, the shoulders open along the rails, looking over the lead shoulder down the line: not the frontside mirrored.',
  },
  wslflow: {
    short: 'WSL flow',
    kind: 'coaching',
    cite: 'Mauro C (2017), 5 Ways to Find Your Flow (WSL Performance Center)',
    url: 'https://www.worldsurfleague.com/posts/269518/performance-center-5-ways-to-fix-your-flow',
    gives: 'A quiet upper body, the front arm pointing where you go; bend the knees, not the back; turns unwind head, shoulders, hips, knees, toes.',
  },
  bartonlynch: {
    short: 'Barton Lynch',
    kind: 'coaching',
    cite: 'Stab (2016), The Average Surfer Makes These Common Mistakes Says The World Champ (Barton Lynch)',
    url: 'https://stabmag.com/style/the-average-surfer-makes-these-common-mistakes-says-the-world-champ',
    gives: 'The front arm, head and eyes lead; squat at the knees; the head centred over the board.',
  },
} satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCE_LIST;
export const SOURCES: Record<SourceId, Source> = SOURCE_LIST;

/** The thirteen references the user approved (Q19), in their order. */
export const APPROVED: readonly SourceId[] = [
  'snapshort', 'kerr', 'gudauskas', 'whitaker', 'reyes', 'hobgood', 'knox', 'brock', 'fanning', 'barefootpopup', 'weiss2025', 'robcase', 'barefootduckdive',
];

export interface StanceTarget {
  min: number;
  max: number;
  /** Best first, by the provenance rule. */
  sources: SourceId[];
  confidence: Confidence;
  note?: string;
}

export interface MappedStance {
  id: string;
  name: string;
  /** How the game reaches it: the inputs, and the physics' phase. */
  reach: string;
  sides: 'both' | 'frontside' | 'backside';
  targets: Partial<Record<StanceMeasure, StanceTarget>>;
  /** What no source reaches yet. */
  gaps?: string;
}

/** Each measure's possible values (degrees, or metres for the hand and the width, a share for the weight). */
export const MEASURE_DOMAIN: Record<StanceMeasure, [number, number]> = {
  kneeFront: [0, 180], kneeRear: [0, 180], hipFront: [0, 180], hipRear: [0, 180], ankleFront: [0, 90], ankleRear: [0, 90],
  trunkFlexion: [-180, 180], trunkPitch: [-180, 180], trunkTilt: [-180, 180], lean: [-180, 180], chestTwist: [-180, 180], hipTwist: [-180, 180],
  headYaw: [-180, 180], headPitch: [-90, 90], leadArm: [0, 180], trailArm: [0, 180], leadElbow: [0, 180], trailElbow: [0, 180],
  lowHand: [-1, 3], stanceWidth: [0, 1.5], weight: [-0.5, 1.5], footFront: [0, 90], footRear: [0, 90], rearKneeIn: [-180, 180], shoulderDrop: [-90, 90],
};

/** Feet 0.63 ± 0.10 m apart (the only measured stance width), for every standing stance. */
const WIDTH: StanceTarget = { min: 0.53, max: 0.73, sources: ['borgonovo2021'], confidence: 'high', note: 'measured at the pop-up\'s landing' };

/**
 * Every riding stance's feet and rear knee (the animation-realism plan, phase 1):
 * the feet's angles to the stringer, and the rear knee caving in toward the front.
 */
const STANCE: Partial<Record<StanceMeasure, StanceTarget>> = {
  stanceWidth: WIDTH,
  footFront: { min: 45, max: 70, sources: ['rapturestance'], confidence: 'medium', note: 'to the stringer: 20–30° off square; about 60° riding (the owner\'s call, §10.3)' },
  footRear: { min: 65, max: 90, sources: ['rapturestance'], confidence: 'medium', note: 'nearer square over the fins: about 80° riding' },
  rearKneeIn: { min: 10, max: 35, sources: ['rapturestance'], confidence: 'low', note: 'the rear knee in toward the front foot' },
};

/** Trim, either side (the plan's phase 1): the knees about equal (the owner's call, §10.1), bent at the knees, the arms low and quiet. */
const TRIM: Partial<Record<StanceMeasure, StanceTarget>> = {
  ...STANCE,
  kneeFront: { min: 115, max: 150, sources: ['borgonovo2021', 'weiss2024', 'bruton2013'], confidence: 'medium', note: 'flexed 30–65°: a half squat, knees about equal' },
  kneeRear: { min: 110, max: 145, sources: ['borgonovo2021', 'weiss2024', 'bruton2013'], confidence: 'medium', note: 'flexed 35–70°' },
  leadArm: { min: 20, max: 50, sources: ['wslflow', 'rapturestance'], confidence: 'low', note: 'the front arm loose toward the travel' },
  trailArm: { min: 10, max: 35, sources: ['wslflow', 'rapturestance'], confidence: 'low', note: 'the back arm at the side' },
  shoulderDrop: { min: 3, max: 15, sources: ['rapturestance'], confidence: 'low', note: 'the lead shoulder low, down the line' },
  weight: { min: 0.5, max: 0.62, sources: ['surfdeeper', 'cornishwave'], confidence: 'medium', note: 'centred (SurfDeeper) to 60/40 front (Cornish Wave)' },
};

export const STANCES: readonly MappedStance[] = [
  {
    id: 'trim',
    name: 'Trim',
    reach: 'Standing with no input, riding straight at 7–8 m/s on flat water (phase standing).',
    sides: 'both',
    targets: {
      ...TRIM,
      hipFront: { min: 130, max: 165, sources: ['weiss2025', 'surfdeeper'], confidence: 'low', note: 'hinged at the hips; the gauge\'s hip angle takes the trunk from the spine\'s base, so it includes the lower back' },
      hipRear: { min: 125, max: 165, sources: ['weiss2025', 'surfdeeper'], confidence: 'low' },
      ankleFront: { min: 5, max: 20, sources: ['weiss2025'], confidence: 'low', note: 'under the turn\'s peak (18°)' },
      ankleRear: { min: 5, max: 22, sources: ['weiss2025'], confidence: 'low', note: 'under the turn\'s peak (21°)' },
      trunkFlexion: { min: 10, max: 35, sources: ['surfdeeper'], confidence: 'low', note: 'hinge at the hips, tall through the spine' },
      chestTwist: { min: 20, max: 50, sources: ['surfdeeper'], confidence: 'low', note: 'the chest faces forward, not fully side-on' },
      headYaw: { min: 45, max: 90, sources: ['surfdeeper'], confidence: 'low', note: 'eyes where the rider goes: along the line, over the lead shoulder' },
    },
    gaps: 'The head\'s pitch, the elbows. On flat water there is no face: the side is the last one read (frontside at first).',
  },
  {
    id: 'trim-frontside',
    name: 'Trim, frontside',
    reach: 'Standing with no input across a 15° face at 7 m/s, the face rising on the toes\' side (phase standing; the stance sheet\'s `across` water).',
    sides: 'frontside',
    targets: {
      ...TRIM,
      trunkTilt: { min: 15, max: 30, sources: ['wslflow', 'bartonlynch'], confidence: 'medium', note: 'bend the knees, not the waist; the head over the board' },
      chestTwist: { min: 20, max: 40, sources: ['rapturestance', 'surfdeeper'], confidence: 'low', note: 'the lead shoulder pointing down the line, the hips slightly open' },
      headYaw: { min: 60, max: 90, sources: ['rapturestance', 'surfdeeper'], confidence: 'low', note: 'eyes down the line' },
    },
  },
  {
    id: 'trim-backside',
    name: 'Trim, backside',
    reach: 'Standing with no input across a 15° face at 7 m/s, the face rising on the heels\' side (phase standing; the `across-back` water).',
    sides: 'backside',
    targets: {
      ...TRIM,
      trunkTilt: { min: 15, max: 30, sources: ['wslflow', 'bartonlynch'], confidence: 'medium', note: 'bend the knees, not the waist' },
      chestTwist: { min: 45, max: 70, sources: ['rapturesides'], confidence: 'low', note: 'the chest turned toward the wave, the shoulders open along the rails' },
      headYaw: { min: 75, max: 110, sources: ['rapturesides'], confidence: 'low', note: 'over the lead shoulder, down the line' },
    },
    gaps: 'The hands\' place: the owner\'s reference photo (2026-10-22), read by the arms test, not the map.',
  },
  {
    id: 'trim-forward',
    name: 'Trim forward (W)',
    reach: 'Standing, trim +1 (W, the stick forward), straight at 7–8 m/s.',
    sides: 'both',
    targets: {
      ...STANCE,
      weight: { min: 0.6, max: 0.75, sources: ['cornishwave'], confidence: 'medium', note: 'toward 70/30 on the front foot, driving' },
    },
    gaps: 'Everything but the weight: the posture is trim\'s.',
  },
  {
    id: 'trim-back',
    name: 'Trim back (S)',
    reach: 'Standing, trim −1 (S, the stick back), straight at 7–8 m/s.',
    sides: 'both',
    targets: {
      ...STANCE,
      weight: { min: 0.35, max: 0.45, sources: ['cornishwave'], confidence: 'medium', note: '40/60 onto the back foot' },
    },
    gaps: 'Everything but the weight.',
  },
  {
    id: 'drop',
    name: 'The drop',
    reach: 'Crouched (Shift held: the full crouch, two thirds of Compress\'s depth) going down a 15° face at 5 m/s (phase standing).',
    sides: 'both',
    targets: {
      ...STANCE,
      kneeFront: { min: 65, max: 90, sources: ['desousa2022', 'rapturetakeoff'], confidence: 'medium', note: 'the deepest crouch: flexed 90–115°' },
      kneeRear: { min: 70, max: 95, sources: ['desousa2022', 'rapturetakeoff'], confidence: 'medium', note: 'flexed 85–110°' },
      trunkTilt: { min: 20, max: 40, sources: ['rapturetakeoff'], confidence: 'low', note: 'the back fairly upright' },
      headPitch: { min: 20, max: 45, sources: ['desousa2022', 'rapturetakeoff'], confidence: 'low', note: 'the eyes on the base' },
      leadArm: { min: 20, max: 50, sources: ['rapturetakeoff'], confidence: 'low', note: 'at the waist or lower, along the line' },
      trailArm: { min: 10, max: 40, sources: ['rapturetakeoff'], confidence: 'low' },
      weight: { min: 0.4, max: 0.45, sources: ['rapturetakeoff'], confidence: 'low', note: 'the owner\'s call (§10.2): 55–60 % on the back foot on a steep drop; the preparation for the bottom turn goes to the front foot (the map\'s de Sousa and Cornish Wave, 60–75 %)' },
    },
    gaps: 'The hips, the twist. Until the animation-realism plan the map read the thesis\'s preparation here (knees 90–110° included, the weight 0.60–0.75 forward, Kerr\'s trunk 45–65°): the owner\'s call (§10.2) puts the drop\'s weight back and the bottom turn\'s preparation forward.',
  },
  {
    id: 'compress-frontside',
    name: 'Compress, frontside (the bottom turn\'s base)',
    reach: 'Crouched, then steering onto the toes\' rail and compressing (Space) at 8 m/s: the thesis\'s fundamental (phase standing).',
    sides: 'frontside',
    targets: {
      kneeFront: { min: 70, max: 90, sources: ['desousa2022', 'gudauskas'], confidence: 'medium', note: '90° or less' },
      kneeRear: { min: 70, max: 90, sources: ['desousa2022', 'gudauskas'], confidence: 'medium' },
      hipFront: { min: 60, max: 90, sources: ['desousa2022'], confidence: 'medium' },
      hipRear: { min: 60, max: 90, sources: ['desousa2022'], confidence: 'medium' },
      trunkTilt: { min: 45, max: 75, sources: ['gudauskas'], confidence: 'low', note: 'read from the picture, the lean included' },
      lean: { min: 30, max: 50, sources: ['forsyth2024', 'moreira2014'], confidence: 'low', note: 'the rail at 39 ± 4°; that the body leans with it is the map\'s reading' },
      lowHand: { min: 0, max: 0.3, sources: ['desousa2022', 'gudauskas'], confidence: 'medium', note: 'the inside (trailing) hand nears the water; the number is the map\'s reading of "nears"' },
      headYaw: { min: 10, max: 70, sources: ['desousa2022'], confidence: 'low', note: 'the head turns toward the lip' },
      leadElbow: { min: 150, max: 180, sources: ['gudauskas'], confidence: 'low' },
      trailElbow: { min: 70, max: 120, sources: ['gudauskas'], confidence: 'low' },
      ...STANCE,
      weight: { min: 0.6, max: 0.75, sources: ['desousa2022', 'cornishwave'], confidence: 'medium' },
    },
    gaps: 'The ankles (deep flexion forces them; no source), the chest\'s twist.',
  },
  {
    id: 'compress-backside',
    name: 'Compress, backside',
    reach: 'Crouched, then steering onto the heels\' rail and compressing at 8 m/s (phase standing).',
    sides: 'backside',
    targets: {
      kneeFront: { min: 70, max: 90, sources: ['desousa2022'], confidence: 'medium' },
      kneeRear: { min: 70, max: 90, sources: ['desousa2022'], confidence: 'medium' },
      hipFront: { min: 60, max: 90, sources: ['desousa2022'], confidence: 'medium' },
      hipRear: { min: 60, max: 90, sources: ['desousa2022'], confidence: 'medium' },
      lean: { min: -50, max: -30, sources: ['forsyth2024', 'moreira2014'], confidence: 'low', note: 'toward the heels; the rail\'s 39° as frontside' },
      trunkFlexion: { min: -20, max: 20, sources: ['hobgood'], confidence: 'low', note: 'rotated with the hips rather than leaning over' },
      lowHand: { min: 0, max: 0.3, sources: ['desousa2022'], confidence: 'medium', note: 'backside the leading hand is the inside one' },
      ...STANCE,
      weight: { min: 0.6, max: 0.75, sources: ['desousa2022', 'cornishwave'], confidence: 'medium' },
    },
    gaps: 'The head and the arms: Hobgood\'s footage is too far off to read.',
  },
  {
    id: 'extension-frontside',
    name: 'Extension up the face, frontside',
    reach: 'Compress, frontside, then released as the movement-flow spec\'s projection: Compress and the crouch let go, tall and centred, no steer, holding that heading, read 0.3 s on (phase standing).',
    sides: 'frontside',
    targets: {
      kneeFront: { min: 150, max: 180, sources: ['desousa2022'], confidence: 'medium', note: '150° or more' },
      kneeRear: { min: 150, max: 180, sources: ['desousa2022'], confidence: 'medium' },
      trunkTilt: { min: 10, max: 35, sources: ['gudauskas'], confidence: 'low', note: 'read from the picture' },
      headPitch: { min: -30, max: 5, sources: ['balisurfing', 'gudauskas'], confidence: 'low', note: 'looking at the lip, up the face' },
      leadArm: { min: 70, max: 120, sources: ['desousa2022', 'gudauskas'], confidence: 'low', note: 'the leading arm points at the lip' },
      trailArm: { min: 60, max: 110, sources: ['balisurfing', 'gudauskas'], confidence: 'low' },
      leadElbow: { min: 140, max: 175, sources: ['gudauskas'], confidence: 'low' },
      ...STANCE,
      weight: { min: 0.35, max: 0.45, sources: ['desousa2022', 'cornishwave', 'knox'], confidence: 'medium', note: 'to the back foot while extending; 40/60; off the bottom heavy on the back foot' },
    },
    gaps: 'The chest\'s twist toward the lip (the lip\'s place is not in the board\'s frame), the hips.',
  },
  {
    id: 'extension-backside',
    name: 'Extension up the face, backside',
    reach: 'Compress, backside, then released as the spec\'s projection: tall and centred, no steer, read 0.3 s on (phase standing).',
    sides: 'backside',
    targets: {
      kneeFront: { min: 150, max: 180, sources: ['desousa2022'], confidence: 'medium' },
      kneeRear: { min: 150, max: 180, sources: ['desousa2022'], confidence: 'medium' },
      trunkTilt: { min: -20, max: 20, sources: ['knox'], confidence: 'low', note: 'the body held more upright while pushing on the back foot' },
      ...STANCE,
      weight: { min: 0.35, max: 0.45, sources: ['desousa2022', 'cornishwave', 'knox'], confidence: 'medium' },
    },
    gaps: 'The arms and the head.',
  },
  {
    id: 'top-turn-frontside',
    name: 'Top turn, frontside',
    reach: 'Standing, steering onto the heels\' rail with trim −0.5 at 8 m/s: the turn off the top (phase standing).',
    sides: 'frontside',
    targets: {
      headPitch: { min: -30, max: 5, sources: ['balisurfing'], confidence: 'low', note: 'keep looking at the lip to spot the section' },
      trailArm: { min: 60, max: 150, sources: ['balisurfing'], confidence: 'low', note: 'the trailing arm swung around to lead the heelside carve' },
      ...STANCE,
      weight: { min: 0.35, max: 0.45, sources: ['cornishwave'], confidence: 'medium', note: '40/60 onto the back foot in top turns' },
    },
    gaps: 'The legs\' depth and the rotation\'s angles (Reyes not read yet).',
  },
  {
    id: 'top-turn-backside',
    name: 'Top turn, backside',
    reach: 'Standing, steering onto the toes\' rail with trim −0.5 at 8 m/s (phase standing).',
    sides: 'backside',
    targets: {
      ...STANCE,
      weight: { min: 0.35, max: 0.45, sources: ['cornishwave'], confidence: 'medium' },
    },
    gaps: 'The upper body: Hobgood not read yet.',
  },
  {
    id: 'snap-frontside',
    name: 'Snap, frontside',
    reach: 'Standing, full steer onto the heels\' rail with trim −1 at 8 m/s: the top-turn plan\'s snap (phase standing).',
    sides: 'frontside',
    targets: {
      kneeFront: { min: 140, max: 180, sources: ['desousa2022'], confidence: 'low', note: 'extending through the snap' },
      kneeRear: { min: 130, max: 180, sources: ['desousa2022'], confidence: 'low' },
      chestTwist: { min: 20, max: 90, sources: ['balisurfing'], confidence: 'low', note: 'the head, shoulders and hips lead the heelside carve: the chest turns toward the nose' },
      trailArm: { min: 60, max: 150, sources: ['balisurfing'], confidence: 'low', note: 'the trailing arm swung around' },
      ...STANCE,
      weight: { min: 0.3, max: 0.45, sources: ['cornishwave'], confidence: 'medium', note: '40/60 or further back' },
    },
    gaps: 'Reyes\'s and the snap video\'s frames are not read at a usable size.',
  },
  {
    id: 'snap-backside',
    name: 'Snap, backside',
    reach: 'Standing, full steer onto the toes\' rail with trim −1 at 8 m/s (phase standing).',
    sides: 'backside',
    targets: {
      kneeFront: { min: 140, max: 180, sources: ['desousa2022'], confidence: 'low' },
      kneeRear: { min: 130, max: 180, sources: ['desousa2022'], confidence: 'low' },
      chestTwist: { min: -90, max: -20, sources: ['hobgood'], confidence: 'low', note: 'the shoulders opened into the toeside turn: the chest turns toward the tail' },
      ...STANCE,
      weight: { min: 0.3, max: 0.45, sources: ['cornishwave', 'hobgood'], confidence: 'medium', note: 'further back on the tail' },
    },
    gaps: 'The arm up\'s angle: shown, not said (Hobgood 0:49).',
  },
  {
    id: 'cutback-frontside',
    name: 'Cutback, frontside',
    reach: 'Crouched 0.5, steering onto the heels\' rail with trim −0.7 at 8 m/s: a drawn-out turn back toward the curl (phase standing).',
    sides: 'frontside',
    targets: {
      lean: { min: -75, max: -40, sources: ['forsyth2024', 'moreira2014'], confidence: 'low', note: 'the rail at 76 ± 5° on the heels; the body with it, the map\'s reading' },
      ...STANCE,
      weight: { min: 0.3, max: 0.4, sources: ['rapturecutback', 'cornishwave'], confidence: 'medium', note: '65/35 to 70/30 onto the back foot' },
    },
    gaps: 'The head leading and the arm reaching back toward the breaking wave (Knox and Brock not read yet).',
  },
  {
    id: 'pump-compression',
    name: 'Pump, compressing',
    reach: 'Standing at 7 m/s, crouching (Shift) for 0.4 s: the pump\'s compression, going uphill (phase standing).',
    sides: 'both',
    targets: {
      leadArm: { min: 45, max: 90, sources: ['rapturespeed'], confidence: 'low', note: 'the arms pulling up as the body compresses' },
      trailArm: { min: 45, max: 90, sources: ['rapturespeed'], confidence: 'low' },
      ...STANCE,
      weight: { min: 0.4, max: 0.5, sources: ['rapturespeed'], confidence: 'medium', note: '55/45 onto the back foot going uphill' },
    },
    gaps: 'Depths: no source gives the pump\'s knee range (Fanning not read yet).',
  },
  {
    id: 'pump-extension',
    name: 'Pump, extending',
    reach: 'After the compression, releasing the crouch for 0.3 s: the extension, going downhill (phase standing).',
    sides: 'both',
    targets: {
      leadArm: { min: 0, max: 40, sources: ['rapturespeed'], confidence: 'low', note: 'the arms pushing down on the extension' },
      trailArm: { min: 0, max: 40, sources: ['rapturespeed'], confidence: 'low' },
      ...STANCE,
      weight: { min: 0.5, max: 0.6, sources: ['rapturespeed'], confidence: 'medium', note: '55/45 onto the front foot going downhill' },
    },
    gaps: 'Depths (Fanning not read yet).',
  },
  {
    id: 'hand-in-face',
    name: 'The hand in the face (E), frontside',
    reach: 'Crouched, riding across a 15° face at 6 m/s (the face rising on the toes\' side) with the hand out (E) (phase standing).',
    sides: 'frontside',
    targets: {
      kneeFront: { min: 80, max: 100, sources: ['gudauskas'], confidence: 'low' },
      kneeRear: { min: 80, max: 100, sources: ['gudauskas'], confidence: 'low' },
      trunkTilt: { min: 40, max: 60, sources: ['gudauskas'], confidence: 'low', note: 'read from the picture, the lean included' },
      lowHand: { min: 0, max: 0.3, sources: ['gudauskas'], confidence: 'low', note: 'a hand dragging beside the rail' },
      ...STANCE,
    },
  },
  {
    id: 'pop-up',
    name: 'The pop-up\'s push',
    reach: 'Lying on a board towed at 6 m/s (as a wave carries it), then the pop-up (the push phase).',
    sides: 'both',
    targets: {
      leadElbow: { min: 90, max: 130, sources: ['borgonovo2021'], confidence: 'medium', note: '110–112 ± 18° at the push\'s peak force (the convention is not stated)' },
      trailElbow: { min: 90, max: 130, sources: ['borgonovo2021'], confidence: 'medium' },
    },
    gaps: 'The trunk\'s rise and the legs\' swing: the Barefoot Surf and Swell Surf Camp sequences are not read yet.',
  },
  {
    id: 'landing',
    name: 'The landing',
    reach: 'The pop-up\'s end: the feet land (phase landing), read at its end, 0.45 s in.',
    sides: 'both',
    targets: {
      kneeFront: { min: 80, max: 120, sources: ['borgonovo2021'], confidence: 'low', note: '99 ± 20° at the reach\'s peak force, read as included (the convention is not stated)' },
      kneeRear: { min: 85, max: 115, sources: ['borgonovo2021'], confidence: 'low', note: '101 ± 14°' },
      stanceWidth: WIDTH,
      weight: { min: 0.64, max: 0.8, sources: ['borgonovo2021'], confidence: 'medium', note: '72 ± 8 % of the force on the front foot; the hips\' place stands in for it' },
    },
  },
  {
    id: 'lying-down',
    name: 'Lying back down',
    reach: 'Standing, Enter: the rider lies back on the board (phase recover, then prone).',
    sides: 'both',
    targets: {},
    gaps: 'No source: none of the references shows a rider lying back down.',
  },
  {
    id: 'fall-start',
    name: 'A fall\'s start',
    reach: 'Standing, a hard turn that throws the rider off (phase fallen, its first 0.2 s).',
    sides: 'both',
    targets: {},
    gaps: 'No clean reference of a near fall or a fall\'s start: heat footage, cited when found, or our own playtests.',
  },
];
