import { writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { Quaternion, Vector3 } from 'three';
import { afterAll, expect, it } from 'vitest';
import { AttachedRider } from '../source/src/physics/AttachedRider';
import { BoardBody } from '../source/src/physics/BoardBody';
import { PlaneWater } from '../source/src/physics/PlaneWater';
import { WATER } from '../source/src/physics/hullForces';
import { AttachedRider as OracleRider } from '../oracle/src/physics/AttachedRider';
import { BoardBody as OracleBoard } from '../oracle/src/physics/BoardBody';
import { PlaneWater as OracleWater } from '../oracle/src/physics/PlaneWater';
import fields from '../observer-fields.json';

const DT = 1 / 60, YAW = 0.23362283028731087;
const output: unknown[] = [];
const newFields = new Set(['landingForeAxis', 'landingForeOffset', 'landingForeRate', 'landingForeRateAfter', 'landingForeStiffness', 'landingForeDamping', 'landingForeForce']);
function originalWords(x: unknown): unknown {
  if (typeof x === 'function') return Function.prototype.toString.call(x);
  if (ArrayBuffer.isView(x)) return Array.from(x as unknown as ArrayLike<number>);
  if (Array.isArray(x)) return x.map(originalWords);
  if (typeof x === 'object' && x !== null) return Object.fromEntries(Object.entries(x).filter(([key]) => !newFields.has(key)).map(([key, value]) => [key, originalWords(value)]));
  return x;
}
function state(p: ReturnType<typeof pair>) {
  const board = Object.fromEntries(Object.entries(p.board).filter(([key]) => key !== 'rider'));
  return originalWords({ board, rider: p.rider, water: p.water, diagnostics: p.rider.readContactDiagnostics() });
}
function pair(oracle: boolean, angle: number, speed: number, phase: 'prone' | 'standing' = 'prone') {
  const board = oracle ? new OracleBoard() : new BoardBody();
  const yaw = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), YAW);
  const q = yaw.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), angle));
  board.place(new Vector3(0, board.shape.centerOfMass.y * Math.cos(angle), 0), q);
  const rider = oracle ? new OracleRider(board.shape, { phase }) : new AttachedRider(board.shape, { phase });
  if (board instanceof OracleBoard && rider instanceof OracleRider) board.attach(rider);
  else if (board instanceof BoardBody && rider instanceof AttachedRider) board.attach(rider);
  else throw new Error('fixture nominal class mismatch');
  const options = { slopeX: -Math.tan(angle) * Math.sin(YAW), slopeZ: -Math.tan(angle) * Math.cos(YAW) };
  const water = oracle ? new OracleWater(options) : new PlaneWater(options);
  const direction = new Vector3(0, -Math.sin(angle), Math.cos(angle)).applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), YAW));
  const tow = () => {
    if (angle === 0) {
      board.velocity.x = direction.x * speed; board.velocity.z = direction.z * speed;
      rider.velocity.x = direction.x * speed; rider.velocity.z = direction.z * speed;
    } else { board.velocity.copy(direction).multiplyScalar(speed); rider.velocity.copy(board.velocity); }
  };
  return { board, rider, water, tow };
}
function momentum(p: ReturnType<typeof pair>) { return p.board.velocity.clone().multiplyScalar(p.board.mass).addScaledVector(p.rider.velocity, p.rider.mass); }
function waterMomentum(p: ReturnType<typeof pair>) { return new Vector3(p.water.reaction.x, p.water.reaction.y, p.water.reaction.z); }
function stepWithLedger(p: ReturnType<typeof pair>) {
  const before = momentum(p), waterBefore = waterMomentum(p);
  p.board.step(DT, p.water);
  const residual = momentum(p).sub(before).sub(waterMomentum(p).sub(waterBefore));
  residual.y += (p.board.mass + p.rider.mass) * WATER.gravity * DT;
  // Internal muscle/contact impulses must cancel between the two bodies, including limited trials.
  expect(residual.length(), 'joint linear momentum minus actual water reaction and gravity').toBeLessThan(1e-6);
  return residual.toArray();
}
function detachedDiagnostics(p: ReturnType<typeof pair>) {
  const before = JSON.stringify(p.rider.readContactDiagnostics());
  const d = p.rider.readContactDiagnostics();
  if (d.last) { d.last.demandY = 123; d.last.legForce = 456; }
  expect(JSON.stringify(p.rider.readContactDiagnostics())).toBe(before);
}
afterAll(() => writeFileSync(new URL('../controlled-proof.json', import.meta.url), JSON.stringify({
  scope: 'Prospective isolated landing-only compliance on existing joint-body/pop-up fixtures. V8 is independent exact oracle outside landing; modified landing cannot claim exact parity or native failure resolution.',
  durations: { push: 0.72, landing: 0.48 }, provisionalTangential: { stiffness: 3000, dampingRatio: 0.5 }, output,
}, null, 2) + '\n'));

for (const phase of ['prone', 'standing'] as const) it(`preserves exact original ${phase} joint-body behavior`, () => {
  const old = pair(true, 0, 6, phase), candidate = pair(false, 0, 6, phase);
  for (let step = 1; step <= 120; step++) {
    for (const p of [old, candidate]) { p.tow(); p.board.step(DT, p.water); }
    const a = state(old), b = state(candidate);
    if (!isDeepStrictEqual(a, b)) expect(b, `${phase} original own-state difference at step ${step}`).toEqual(a);
    detachedDiagnostics(candidate);
  }
  output.push({ kind: 'unchanged-phase', phase, exactFrames: 120 });
});

for (const fixture of [
  { name: 'existing flat towed 6 m/s pop-up study', angle: 0, speed: 6, continueTow: true },
  { name: 'fixed 15-degree face released from 9.2 m/s tow at pop-up', angle: Math.PI / 12, speed: 9.2, continueTow: false },
]) it(fixture.name, () => {
  const old = pair(true, fixture.angle, fixture.speed), candidate = pair(false, fixture.angle, fixture.speed);
  const trace: unknown[] = [];
  let changedLanding = false, firstStanding = 0, positiveLanding = 0, landingFrames = 0;
  let prepareSnap = false, integrationMismatch = false, maximumForeOffset = 0, firstStandingForeOffset = 0;
  if (!(candidate.rider instanceof AttachedRider) || !(candidate.board instanceof BoardBody)) throw new Error('candidate nominal fixture mismatch');
  const watched = candidate.rider;
  const prepare = watched.prepare.bind(watched), finish = watched.finish.bind(watched);
  watched.prepare = (h, board, water) => {
    const position = watched.position.clone(); prepare(h, board, water);
    prepareSnap ||= !watched.position.equals(position);
  };
  watched.finish = (h, board) => {
    const position = watched.position.clone(); finish(h, board);
    integrationMismatch ||= !watched.position.equals(position.addScaledVector(watched.velocity, h));
  };
  for (let step = 1; step <= 276; step++) {
    for (const p of [old, candidate]) {
      if (step <= 180 || fixture.continueTow) p.tow();
      if (step === 181) expect(p.rider.popUp()).toBe(true);
      stepWithLedger(p);
    }
    const a = state(old), b = state(candidate);
    // Passive test wrappers are excluded from own-state parity; no numeric/scratch exclusion.
    const ar = (a as { rider: Record<string, unknown> }).rider, br = (b as { rider: Record<string, unknown> }).rider;
    delete ar.prepare; delete ar.finish; delete br.prepare; delete br.finish;
    const d = candidate.rider.readContactDiagnostics();
    if (!changedLanding && d.last?.phase !== 'landing') {
      if (!isDeepStrictEqual(a, b)) expect(b, `pre-landing original difference at step ${step}`).toEqual(a);
    } else changedLanding = true;
    if (d.last?.phase === 'landing') {
      landingFrames++;
      const s = d.last;
      for (const field of fields) expect(Number.isFinite(s[field as keyof typeof s] as number), field).toBe(true);
      if (s.appliedX !== 0 || s.appliedY !== 0 || s.appliedZ !== 0) positiveLanding++;
      const live = candidate.rider as unknown as { landingForeOffset: number; bankSpeedAfter: number; bank: { rate: number } };
      maximumForeOffset = Math.max(maximumForeOffset, Math.abs(live.landingForeOffset));
      expect(live.bankSpeedAfter).toBe(0);
      expect(live.bank.rate).toBe(0);
      trace.push({ step, boardSpeed: candidate.board.velocity.length(), riderSpeed: candidate.rider.velocity.length(), foreOffset: live.landingForeOffset, diagnostics: d });
    }
    if (candidate.rider.phase === 'standing' && firstStanding === 0) {
      firstStanding = step;
      const s = d.last;
      if (s) {
        const axis = new Vector3(0, 0, 1).applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(
          new Vector3(0, 0, 1).applyQuaternion(candidate.board.orientation).x,
          new Vector3(0, 0, 1).applyQuaternion(candidate.board.orientation).z)));
        firstStandingForeOffset = axis.dot(new Vector3(s.demandPositionX - s.demandTargetX, s.demandPositionY - s.demandTargetY, s.demandPositionZ - s.demandTargetZ));
      }
    }
    detachedDiagnostics(candidate);
  }
  expect(prepareSnap).toBe(false);
  expect(integrationMismatch).toBe(false);
  expect(landingFrames).toBeGreaterThan(0);
  expect(positiveLanding).toBeGreaterThan(0);
  // The .48s handoff is a real acceptance gate: deferred separation is not a pass.
  expect(candidate.rider.attached).toBe(true);
  expect(candidate.rider.phase).toBe('standing');
  expect(candidate.rider.popUpReport.outcome).toBe('stood');
  expect(candidate.rider.popUpReport.duration).toBeCloseTo(1.2, 1);
  expect(firstStanding).toBeGreaterThan(0);
  if (fixture.continueTow) {
    expect(candidate.rider.popUpReport.landingPeak).toBeGreaterThan(1.2);
    expect(candidate.rider.popUpReport.landingPeak).toBeLessThan(2.0);
    expect(candidate.rider.popUpReport.frontShare).toBeGreaterThan(0.5);
  }
  output.push({ ...fixture, steps: 276, firstStanding, firstStandingForeOffset, maximumForeOffset, landingFrames, positiveLanding, phase: candidate.rider.phase, attached: candidate.rider.attached, separation: candidate.rider.separation, report: candidate.rider.popUpReport, trace });
});

// Adaptation of the existing joint-body free-fall/unilateral fixture, not a fabricated feasible contact.
it('applies no fore muscle kick when a landing body has no compressive deck support', () => {
  const board = new BoardBody(); board.place(new Vector3(0, 5 + board.shape.centerOfMass.y, 0));
  const rider = new AttachedRider(board.shape, { phase: 'landing' }); board.attach(rider);
  rider.position.z += 0.03; rider.velocity.z += 0.2; board.velocity.y = -4;
  const water = new PlaneWater({ inside: () => false });
  const before = rider.velocity.z;
  board.step(DT, water);
  expect(rider.contact.feasible).toBe(false);
  expect(rider.readContactDiagnostics().last?.demandLocalY).toBeLessThanOrEqual(0);
  expect(rider.velocity.z).toBe(before);
  expect(board.velocity.z).toBe(0);
  expect(water.reaction.z).toBe(0);
  output.push({ kind: 'unloaded-landing', attached: rider.attached, inContact: rider.inContact, diagnostics: rider.readContactDiagnostics() });
});
