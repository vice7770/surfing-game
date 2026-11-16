/**
 * **Step 3.3i: the fall, drawn — a side-on (transverse) sequence of the moment he goes, before and after the ankle.**
 *
 * The coordinator's own question, which four rounds of columns have not settled: *is the board **rolling under him**
 * or **translating out from under him**, and does the ankle change which?* The owner's answer to the ride question was
 * half of one — *"I think the surfer falls over. Not sure if the board goes away from him"* — and the two readings are
 * **geometrically distinguishable**, which is why a picture settles it:
 *
 * - **rolling under him**: the deck's roll grows while the rider's centre of mass stays near the board's **own
 *   centreline** — the deck tips up and he goes over its edge. From outside that looks exactly like "the surfer falls
 *   over";
 * - **translating out from under him**: the rider's across offset **in the board's own frame** grows while the roll
 *   stays modest — the board slides away sideways and leaves him.
 *
 * So every panel is a **section across the board**, looking along it from behind the tail, drawn from the measured
 * state: the board's own section rolled by its measured roll, the rider's centre of mass at its **measured board-frame
 * across offset and height**, the feet's own half-width across, the world vertical through the feet, and the water
 * surface at its measured across slope. **The datum of the drawing is the board's own frame** (x across toward the
 * board's +x rail, y up off the deck), which is the one frame in which the two readings above differ, and it does not
 * drift as the board turns — the trap a fixed world axis would have walked into over a turn that changes heading by
 * 60°/s.
 *
 * Beside each panel are the numbers the picture must not drift from, all of them columns `deck.ts` already publishes:
 * the time to the fall, the deck's roll, the body's bank, the rider's across offset in the board frame, the **feet's
 * and the body's across speeds** (step 3.3g's own split, the 8-of-12 finding), the ankle's torque and the roll
 * ledger's own rider residual.
 *
 * **It is the Canyon-matched `FaceWater`, not Canyon** — the same cell every number in Parts 24 to 32 is measured on
 * (1.4 m / 16° / 5.7 m/s, 2.6 m deep, the board 0.75 fronts ahead of the crest and 45° off the fall line). A still
 * from the live Canyon would be a different population from every column it is printed beside, and the point of the
 * sequence is that the picture and the column cannot drift apart.
 *
 * Run from the repository's root:
 *   npx rolldown docs/research/new-rider/3.3/stills.ts -o <scratch>/st.mjs --format esm --platform node
 *   STANCE=compress STEER=1 FELT=deck OUT=<dir> node <scratch>/st.mjs
 *
 * Env: STANCE (tall|crouch|compress), STEER, EXTRA (the entry speed's offset, m/s), FELT=deck, FRAMES (how many
 * panels, default 6), SPACING (s between panels, default 0.1), SECONDS, OUT (the directory the SVG and its numbers go
 * to), NAME (the file stem).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
const num = (name: string, fallback: number) => (process.env[name] ? Number(process.env[name]) : fallback);
const STANCE = (process.env.STANCE ?? 'compress') as 'tall' | 'crouch' | 'compress';
const STEER = num('STEER', 1);
const EXTRA = num('EXTRA', 0);
const FELT = process.env.FELT === 'deck' ? 'deck' as const : undefined;
const FRAMES = num('FRAMES', 6);
const SPACING = num('SPACING', 0.1);
const SECONDS = num('SECONDS', 9);
const OUT = process.env.OUT ?? '.';
const NAME = process.env.NAME ?? 'stills';
const FACE = (process.env.FACE ?? '1.4,16,5.7').split(',').map(Number);
const DEPTH = num('DEPTH', 2.6);
const SIDE = num('SIDE', -45);
const AHEAD = num('AHEAD', 0.75);

const f = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '–');

/** One sampled frame: everything a panel is drawn from, in the board's own frame unless said otherwise. */
interface Shot {
  t: number;
  /** The deck's roll from the world vertical about the heading, °, positive with the +x rail down (`deck.ts`'s own sense). */
  roll: number;
  /** The body's bank on its ankles, °, the same sense. */
  bank: number;
  /** The rider's centre of mass in the BOARD's frame, m: x across toward +x, y up off the board's centre of mass. */
  acrossOffset: number;
  height: number;
  /** The feet's own place in the board frame, m, and their half-width across. */
  feetAcrossOffset: number;
  feetHeight: number;
  halfAcross: number;
  /** The water surface's across slope under the board, rise per unit across toward the board's +x. */
  waterSlope: number;
  /** The board's own section, m. */
  beam: number;
  thickness: number;
  /**
   * m/s, RAW: each velocity projected on the board's own across axis — the body's centre of mass and the point on the
   * deck the feet stand on. This is the **geometric** split, which is what the coordinator's question is about, and it
   * is NOT step 3.3g's published column.
   */
  bodyAcross: number;
  feetAcross: number;
  /**
   * m/s, **step 3.3g's own published split**, computed exactly as `deck.ts` computes it: the same two velocities in the
   * board frame with the felt vertical's component removed, which is the quantity the balance test is against. Printed
   * beside the raw one so the picture and the published column cannot drift apart — they are different numbers and
   * saying so is the point.
   */
  bodyFelt: number;
  feetFelt: number;
  /** N·m: the ankle's torque and the roll ledger's own rider residual, both in the sense `deck.ts` prints them. */
  ankleTorque: number;
  rollRider: number;
  /** m: how far the board's centre has moved across its own first-frame across axis since the first panel. */
  worldAcross: number;
  /**
   * **Step 3.2z's rule, carried here:** whether the two halves of the across split still reconstruct the capture
   * point's own velocity term on this frame. `deck.ts` reads its published split on the **latest frame where they do**
   * and not on the separation frame, *"because on the separation frame the rider's velocity and the feet's point have
   * already been re-set"*. The last panel of each sequence is therefore the last **consistent** frame, and the
   * separation frame's own time and roll are printed in the leg's heading instead.
   */
  consistent: boolean;
}

/** `deck.ts`'s own stance setter, unchanged, so these panels are the same rider as every column they sit beside. */
function stanceOf(rider: AttachedRider): void {
  rider.crouch = STANCE === 'crouch' ? 1 : STANCE === 'compress' ? 0.6 : 0;
  rider.compress = STANCE === 'compress' ? 1 : 0;
}

function run(limit: 'feet' | undefined): { shots: Shot[]; fellAt: number; fell: string } {
  const water = new FaceWater({ depth: DEPTH, height: FACE[0], slope: FACE[1], speed: FACE[2], vertical: 'surface' });
  const sample = createWaterSample();
  const fall = new Vector3(0, 0, 1);
  const pz = water.crestZ() + AHEAD * water.front;
  const here = water.sampleAt(0, 50, pz, sample);
  const alongFlow = here.flowX * fall.x + here.flowZ * fall.z;
  const entry = (FACE[2] - alongFlow) / Math.cos(45 / DEG) + EXTRA;
  const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
  const hAng = (Math.atan2(fall.x, fall.z) * DEG + SIDE) / DEG;
  const level = new Vector3(Math.sin(hAng), 0, Math.cos(hAng));
  const forward = level.addScaledVector(normal, -level.dot(normal)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const board = new BoardBody({});
  board.place(
    new Vector3(0, here.surfaceY, pz).addScaledVector(normal, board.shape.centerOfMass.y),
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
    forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
  );
  const rider = new AttachedRider(board.shape, {
    phase: 'standing',
    rider: 'new',
    ...(FELT ? { feltFrame: FELT } : {}),
    ...(limit ? { ankleLimit: limit } : {}),
  });
  board.attach(rider);
  stanceOf(rider);
  rider.steer = 0;
  const local = new Vector3();
  const boardUp = new Vector3();
  const side = new Vector3();
  const fwd = new Vector3();
  const feetWorld = new Vector3();
  const feetVel = new Vector3();
  const firstAcross = new Vector3();
  const firstOrigin = new Vector3();
  const shots: Shot[] = [];
  let fellAt = Number.NaN;
  let fell = '';
  const steps = Math.round(SECONDS / STEP);
  for (let i = 0; i < steps; i += 1) {
    // `deck.ts`'s own loop, in its own order: the water advances, the board steps, and the stick is held from the
    // frame after the first (its `STEER_FROM` of 0). Anything else is a different run from the columns beside it.
    water.advance(STEP);
    board.step(STEP, water);
    const t = (i + 1) * STEP;
    rider.steer = STEER;
    fwd.set(0, 0, 1).applyQuaternion(board.orientation);
    side.set(1, 0, 0).applyQuaternion(board.orientation);
    boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
    // `deck.ts`'s own roll datum: atan2(boardUp·side-of-the-heading, boardUp.y), positive the way its columns are.
    const heading = Math.atan2(fwd.x, fwd.z);
    const levelSide = new Vector3(Math.cos(heading), 0, -Math.sin(heading));
    const roll = Math.atan2(boardUp.dot(levelSide), boardUp.y) * DEG;
    board.toLocal(rider.position, local);
    const feet = (rider.support.zMin + rider.support.zMax) / 2;
    board.toWorld(new Vector3(0, 0, feet), feetWorld);
    board.velocityAt(feetWorld, feetVel);
    const here2 = water.sampleAt(board.centerOfMass.x, board.centerOfMass.y, board.centerOfMass.z, sample);
    // Step 3.3g's own split, `deck.ts`'s code: in the board frame, less the felt vertical's own component. Guarded by
    // `cap.omega > 0` as that probe is, because `captureFeet` is a constructed Vector3 and is always truthy.
    const cap = rider.human.state;
    const capTerm = cap.omega > 0 ? cap.speedAcross / cap.omega : Number.NaN;
    const felt = (rider as unknown as { captureFelt?: { x: number; y: number; z: number } }).captureFelt;
    let bodyFelt = Number.NaN;
    let feetFelt = Number.NaN;
    if (cap.omega > 0 && felt) {
      const g = Math.hypot(felt.x, felt.y, felt.z);
      const nx = g > 1e-6 ? felt.x / g : 0;
      const ny = g > 1e-6 ? felt.y / g : 1;
      const nz = g > 1e-6 ? felt.z / g : 0;
      const inverse = new Quaternion().copy(board.orientation).invert();
      const across = (v: Vector3) => {
        const b = new Vector3().copy(v).applyQuaternion(inverse);
        return b.x - (b.x * nx + b.y * ny + b.z * nz) * nx;
      };
      bodyFelt = across(rider.velocity);
      const feetAt = (rider as unknown as { captureFeet: Vector3 }).captureFeet;
      feetFelt = across(board.velocityAt(feetAt, new Vector3()));
    }
    if (shots.length === 0) {
      firstAcross.copy(side);
      firstOrigin.copy(board.centerOfMass);
    }
    shots.push({
      t,
      roll,
      bank: rider.bank.angle * DEG,
      acrossOffset: local.x,
      height: local.y,
      feetAcrossOffset: 0,
      feetHeight: feet === 0 ? 0 : board.shape.curves.rocker(0.5),
      halfAcross: (rider.support.xMax - rider.support.xMin) / 2,
      waterSlope: -(here2.slopeX * levelSide.x + here2.slopeZ * levelSide.z),
      beam: board.shape.curves.width(0.5),
      thickness: board.shape.curves.thickness(0.5),
      bodyAcross: rider.velocity.dot(side),
      feetAcross: feetVel.dot(side),
      bodyFelt,
      feetFelt,
      consistent: Number.isFinite(capTerm) && Math.abs((bodyFelt - feetFelt) - capTerm * cap.omega) < 0.01,
      ankleTorque: rider.ankle.substeps > 0 ? rider.ankle.torque : Number.NaN,
      rollRider: -board.roll.rider,
      worldAcross: new Vector3().subVectors(board.centerOfMass, firstOrigin).dot(firstAcross),
    });
    if (!rider.attached) { fell = String(rider.separation); fellAt = t; break; }
  }
  return { shots, fellAt, fell };
}

/**
 * **The two moment columns' one sign**, `deck.ts`'s own: the sense of the deck's roll at the **last** frame, so a
 * positive ankle torque or residual means *further over the way this run actually went*. Applied once, after the run.
 */
function signMoments(shots: Shot[]): void {
  const sense = Math.sign(shots[shots.length - 1]?.roll ?? 0) || 1;
  for (const s of shots) { s.ankleTorque *= sense; s.rollRider *= sense; }
}

/** The panels: the last FRAMES shots at SPACING before the fall, the fall's own frame last. */
function panelsOf(all: Shot[]): Shot[] {
  // 3.2z's rule, `deck.ts`'s own: the panels are the frames whose split still reconstructs, so the last one is the
  // last such frame and never the separation frame, whose rider velocity and feet point have already been re-set.
  const kept = all.filter((x) => x.consistent);
  const shots = kept.length > 1 ? kept : all;
  const end = shots[shots.length - 1];
  if (!end) return [];
  const out: Shot[] = [];
  for (let k = FRAMES - 1; k >= 1; k -= 1) {
    const want = end.t - k * SPACING;
    let best = shots[0];
    for (const s of shots) if (Math.abs(s.t - want) < Math.abs(best.t - want)) best = s;
    if (best && !out.includes(best)) out.push(best);
  }
  out.push(end);
  return out;
}

const W = 290;
const H = 255;
const SCALE = 120; // px per metre

/** One panel: a section across the board, the board's own frame, x across toward +x drawn to the RIGHT. */
function panel(s: Shot, end: number, x0: number, y0: number): string {
  const cx = x0 + W / 2;
  const cy = y0 + 160;
  const px = (ax: number, up: number) => [cx + ax * SCALE, cy - up * SCALE] as const;
  /**
   * The drawing's axes are the WORLD's in this section: across to the right, the world's up upward. A positive roll
   * puts the board's **+x rail down** (`prepareBank`'s own words, and `deck.ts` prints the same quantity), which in
   * these axes is a clockwise turn of the section — hence the negative. Everything given in the **board's** frame (the
   * section's own corners, the feet, the rider's centre of mass) is turned by it; the dashed world vertical is not.
   */
  const theta = -s.roll / DEG;
  const c = Math.cos(theta);
  const sn = Math.sin(theta);
  const rot = (ax: number, up: number) => px(ax * c - up * sn, ax * sn + up * c);
  const half = s.beam / 2;
  const t2 = s.thickness / 2;
  const deck = [rot(-half, t2), rot(half, t2), rot(half, -t2), rot(-half, -t2)];
  const foot = rot(0, t2);
  const footL = rot(-s.halfAcross, t2);
  const footR = rot(s.halfAcross, t2);
  const com = rot(s.acrossOffset, s.height);
  // The water surface, drawn through the board's own centre of mass with its MEASURED across slope. The height is a
  // datum, not a measurement: a planing board sits at the surface and this probe does not read its immersion.
  const wl = (ax: number) => px(ax, ax * s.waterSlope);
  const rel = s.bodyAcross - s.feetAcross;
  return `  <g>
    <rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="none" stroke="#d8d8d8"/>
    <path d="M ${wl(-1.1).join(' ')} L ${wl(1.1).join(' ')}" stroke="#2b7fc4" stroke-width="1.4" opacity="0.75"/>
    <path d="M ${px(0, -0.1).join(' ')} L ${px(0, 1.1).join(' ')}" stroke="#999" stroke-width="0.8" stroke-dasharray="3 3"/>
    <path d="M ${deck.map((p) => p.join(' ')).join(' L ')} Z" fill="#f0d8a8" stroke="#8a6b2f" stroke-width="1.2"/>
    <path d="M ${footL.join(' ')} L ${footR.join(' ')}" stroke="#c23b22" stroke-width="3.2"/>
    <path d="M ${foot.join(' ')} L ${com.join(' ')}" stroke="#333" stroke-width="2"/>
    <circle cx="${com[0]}" cy="${com[1]}" r="5" fill="#333"/>
    <text x="${x0 + 6}" y="${y0 + 14}" font-family="monospace" font-size="9.5" fill="#111">t−${f(end - s.t, 2)} s  (t ${f(s.t, 2)})</text>
    <text x="${x0 + 6}" y="${y0 + 192}" font-family="monospace" font-size="9.5" fill="#111">roll ${f(s.roll)}°   bank ${f(s.bank)}°</text>
    <text x="${x0 + 6}" y="${y0 + 205}" font-family="monospace" font-size="9.5" fill="#111">CoM across ${f(s.acrossOffset, 3)} m (feet ±${f(s.halfAcross, 2)})</text>
    <text x="${x0 + 6}" y="${y0 + 218}" font-family="monospace" font-size="9.5" fill="#111">across m/s: body ${f(s.bodyAcross, 2)} feet ${f(s.feetAcross, 2)}</text>
    <text x="${x0 + 6}" y="${y0 + 231}" font-family="monospace" font-size="9.5" fill="#111">  relative ${f(rel, 2)} · 3.3g's split ${f(s.bodyFelt, 2)}/${f(s.feetFelt, 2)}</text>
    <text x="${x0 + 6}" y="${y0 + 244}" font-family="monospace" font-size="9.5" fill="#111">ankle ${f(s.ankleTorque, 0)}  residual ${f(s.rollRider, 0)} N·m</text>
  </g>`;
}

BoardBody.rollLedger = true;
AttachedRider.ankleLedger = true;
const legs: { name: string; limit: 'feet' | undefined }[] = [
  { name: 'shipped (the ankle unbounded)', limit: undefined },
  { name: 'ankleLimit=feet (the sole\'s own bound)', limit: 'feet' },
];
const rows = legs.map((leg) => {
  const { shots, fellAt, fell } = run(leg.limit);
  signMoments(shots);
  // The separation frame's own roll, which is what `deck.ts` publishes as `rollAtFall`; the panels end earlier
  // (3.2z's rule), so it is printed in the heading rather than drawn.
  const rollAtFall = shots[shots.length - 1]?.roll ?? Number.NaN;
  return { leg, shots, panels: panelsOf(shots), fellAt, fell, rollAtFall };
});

const width = 30 + FRAMES * W;
const height = 60 + rows.length * (H + 40);
const body = rows.map((r, i) => {
  const y0 = 60 + i * (H + 40);
  const head = `  <text x="20" y="${y0 - 10}" font-family="monospace" font-size="13" fill="#111">${r.leg.name} — fell '${r.fell}' at ${f(r.fellAt, 2)} s, roll ${f(r.rollAtFall)}° on that frame; the last panel is the last frame the split reconstructs (step 3.2z's rule)</text>`;
  return [head, ...r.panels.map((s, k) => panel(s, r.panels[r.panels.length - 1].t, 20 + k * W, y0))].join('\n');
}).join('\n');

const title = `step 3.3i — the fall drawn as a SECTION ACROSS THE BOARD · stance ${STANCE} · stick ${STEER} · entry ${EXTRA >= 0 ? '+' : ''}${EXTRA} m/s · felt ${FELT ?? 'world'} · Canyon-matched FaceWater ${FACE[0]} m / ${FACE[1]}° / ${FACE[2]} m/s (a FIT to Canyon, not Canyon)`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  <text x="20" y="24" font-family="monospace" font-size="13" fill="#111">${title}</text>
  <text x="20" y="42" font-family="monospace" font-size="11" fill="#555">looking along the board from behind the tail · +x rail to the RIGHT, which is the one that goes DOWN as the roll grows · grey dashed = the world vertical through the board's centre · blue = the water surface at its measured across slope · red = the feet's half-width · black = the body's line to its centre of mass</text>
${body}
</svg>
`;
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/${NAME}.svg`, svg);
console.log(`# step 3.3i stills — ${STANCE}, stick ${STEER}, entry ${EXTRA}, felt ${FELT ?? 'world'} → ${OUT}/${NAME}.svg`);
for (const r of rows) {
  console.log(`\n## ${r.leg.name} — fell '${r.fell}' at ${f(r.fellAt, 2)} s (roll ${f(r.rollAtFall)}° on that frame), ${r.shots.length} frames; the last row is the last frame the split reconstructs (3.2z's rule), not the separation frame`);
  console.log(`| t−fall s | t s | roll ° | bank ° | CoM across m | CoM height m | body across m/s | feet across m/s | relative m/s | 3.3g's body/feet m/s | board moved across m | ankle N·m | residual N·m |`);
  console.log(`|---|---|---|---|---|---|---|---|---|---|---|---|---|`);
  const end = r.panels[r.panels.length - 1]?.t ?? Number.NaN;
  for (const s of r.panels) {
    console.log(`| ${f(end - s.t, 3)} | ${f(s.t, 3)} | ${f(s.roll)} | ${f(s.bank)} | ${f(s.acrossOffset, 3)} | ${f(s.height, 3)} | ${f(s.bodyAcross, 2)} | ${f(s.feetAcross, 2)} | ${f(s.bodyAcross - s.feetAcross, 2)} | ${f(s.bodyFelt, 2)} / ${f(s.feetFelt, 2)} | ${f(s.worldAcross, 2)} | ${f(s.ankleTorque, 0)} | ${f(s.rollRider, 1)} |`);
  }
}
