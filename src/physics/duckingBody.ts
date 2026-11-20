import { Vector3 } from 'three';
import type { BoardBody } from './BoardBody';
import type { DetachedSurfer } from './DetachedSurfer';
import { MinimumJerkTrack } from './MinimumJerkTrack';
import { deckHeight } from './riderPosture';

/**
 * The two-body duck-dive (duck-two-body, 2026-10-31; `docs/research/duck-dive-2026-10-31/two-body-plan.md`, steps 2 and
 * 3). Ducking, the rider is the swimmer's own body (`DetachedSurfer`: its seven parts' masses, buoyancy and drag), not a
 * rigid body on the deck: its hands hold the rails ahead of the board's middle, its arms push the nose down, its back
 * knee comes onto the tail, and the body follows the board under, hanging in the water it is nearly as dense as. The
 * board meets that water as a submerged plate (`BoardBody`'s `SUBMERGED`).
 *
 * - **The grip** (step 2): each hand held to its rail, `gripAhead` m ahead of the board's middle while pressing; letting
 *   go, the hands come back along the rails to the chest (`gripBack`, where they hold it lying down), so the body no
 *   longer hangs off the nose and the board floats up level under it. Each is held by a rope at the arm's reach,
 *   `gripReach`, from the arm part's
 *   centre (the swimmer's arm part is the arm's own centre of mass), its pull shared between the arm and the board as
 *   an impulse at the grip (two-way). The hands hold up to `grip` body weights between them (a person can hang their
 *   weight from two hands: the old rider's DUCK_GRIP, provisional); pulled harder than that for `slip` s, they lose it.
 * - **The press** (step 3): the arms push along themselves, from the chest to the hands, `push` N at full press (the
 *   survey §5: a 25.75 L board's 234 N net buoyancy is what the arms, knee and foot must push down; "250 N or more"), on
 *   the board at the grips (ahead of its middle: nose first) and back on the chest, while the arms are bent; straight,
 *   they hold the chest at `armLength` from the hands (a rope again).
 * - **The knee** (step 3): `kneeDelay` s into the press the back leg swings to the tail, `kneeAt` m from the board's
 *   middle, drawn there by a spring of at most `knee` N, and once on it presses the tail down with that force.
 * - **The follow:** as the knee comes on, the arms stop pushing and draw the chest back down to the board, to `hug` m from
 *   the hands (coaching: push the nose down, then the tail, and keep the board close to the body as the wave passes over).
 *   Held at arm's length over a board deep under water, the pair is top-heavy (the board's buoyancy below the body's
 *   mass: a quarter of the pair's volume and a twentieth of its mass) and rolls over; close, its lever is short.
 * - **The balance:** close or not, the pair under water is still top-heavy, and rolls over within a second; a diver
 *   holds it level by shifting the body toward the board's high rail (the hips and the shoulders over the hands), so its
 *   weight rights the pair, as the old rider's DUCK_SHIFT did on the deck: toward `shift` m per radian of roll and
 *   `shiftRate` m per rad/s, at most `shiftMost` m off the stringer, by a muscle of at most `shiftForce` N between the body
 *   and the hands (an internal force: the pair's weight moves, not its momentum). Modelling values, like the prone
 *   balance's. Letting go, the body levels the board the same way along it: back toward the tail while the nose is down
 *   (`level` m per radian of pitch from where it lies prone, `prone` m from the board's middle, at most `levelMost` m
 *   from there), so the board floats up flat under it to be lain on again.
 * - **Timing:** the old rider's (the wipeout spec, coaching sources [A]): the press over `pressTime`, the knee over
 *   `kneeTime` after `kneeDelay`, both given back over `releaseTime`, each along a minimum-jerk path (a practised human
 *   movement eases in: Flash & Hogan 1985).
 */
export const DUCK_BODY = {
  gripAhead: 0.3,
  gripBack: 0,
  gripReach: 0.3,
  grip: 1.0,
  slip: 0.2,
  push: 250,
  armLength: 0.6,
  hug: 0.25,
  knee: 150,
  kneeAt: -0.55,
  kneeContact: 0.12,
  kneeSpring: 800,
  pressTime: 0.35,
  kneeDelay: 0.3,
  kneeTime: 0.25,
  releaseTime: 1.0,
  shift: 1.0,
  shiftRate: 0.3,
  shiftMost: 0.22,
  shiftStiffness: 1500,
  shiftDamping: 300,
  shiftForce: 200,
  level: 0.4,
  levelMost: 0.25,
  prone: -0.15,
  /** A grip's rope pulls back this share of its stretch a step (Baumgarte), so it neither sags nor kicks. */
  stiffness: 0.3,
} as const;

const GRAVITY = 9.81;
/** The swimmer's parts: the chest (torso), the arms, the legs (`DetachedSurfer`'s node order). */
const TORSO = 1;
const ARMS = [3, 4] as const;

export class DuckingBody {
  /** The arms' press and the knee on the tail, 0–1. */
  readonly press = new MinimumJerkTrack();
  readonly knee = new MinimumJerkTrack();
  /** How long the duck-dive has been held, and released, s; how long the hands have been pulled past their grip, s. */
  held = 0;
  released = 0;
  slipping = 0;
  /** The hands' pull last step, N (both), and whether the back knee is on the tail. */
  pull = 0;
  kneeOn = false;
  private readonly grip = new Vector3();
  private readonly gripMid = new Vector3();
  private readonly point = new Vector3();
  private readonly along = new Vector3();
  private readonly pointVelocity = new Vector3();
  private readonly impulse = new Vector3();
  private readonly normal = new Vector3();
  private readonly lateral = new Vector3();
  private readonly center = new Vector3();
  private readonly momentum = new Vector3();

  start(): void {
    this.press.reset();
    this.knee.reset();
    this.held = 0;
    this.released = 0;
    this.slipping = 0;
    this.pull = 0;
    this.kneeOn = false;
  }

  /**
   * Where a hand holds the board (world): on rail `side` (+1 the board's left, +x), `gripAhead` m ahead of its middle
   * pressing, back toward `gripBack` as the press is let go.
   */
  gripPoint(board: BoardBody, side: number, out: Vector3): Vector3 {
    const { shape } = board;
    const z = DUCK_BODY.gripBack + (DUCK_BODY.gripAhead - DUCK_BODY.gripBack) * Math.max(this.press.value, this.held > 0 && this.released === 0 ? 1 : 0);
    const s = Math.min(1, Math.max(0, z / shape.length + 0.5));
    return board.toWorld({ x: side * (shape.curves.width(s) / 2 - 0.02), y: deckHeight(shape, z), z }, out);
  }

  /**
   * One step of the dive, after the board and the body have each stepped: the tracks toward `amount` (the Duck-dive
   * input, 0–1), then the grip, the press and the knee as impulses between the body's parts and the board. `back` is
   * the back leg's part (by stance). Returns whether the hands have lost the board.
   */
  step(dt: number, amount: number, surfer: DetachedSurfer, board: BoardBody, back: number): boolean {
    if (amount > 0.05) {
      this.held += dt;
      this.released = 0;
      this.press.retarget(amount, DUCK_BODY.pressTime);
      if (this.held >= DUCK_BODY.kneeDelay) this.knee.retarget(amount, DUCK_BODY.kneeTime);
    } else {
      this.released += dt;
      this.press.retarget(0, DUCK_BODY.releaseTime);
      this.knee.retarget(0, DUCK_BODY.releaseTime);
    }
    this.press.step(dt);
    this.knee.step(dt);
    const weight = surfer.mass * GRAVITY;
    const { nodes } = surfer;
    // The press: along the arms from the chest to the hands, while they are bent.
    this.gripPoint(board, 1, this.grip);
    this.gripMid.copy(this.grip);
    this.gripPoint(board, -1, this.grip);
    this.gripMid.add(this.grip).multiplyScalar(0.5);
    const torso = nodes[TORSO];
    const reach = this.along.subVectors(this.gripMid, torso.position);
    const extension = reach.length();
    if (extension > 1e-6) reach.divideScalar(extension);
    // The arms push while the knee is not yet on; then they draw the chest down to the board.
    const chestReach = DUCK_BODY.armLength + (DUCK_BODY.hug - DUCK_BODY.armLength) * this.knee.value;
    const pushing = this.press.value * (1 - this.knee.value);
    if (pushing > 0 && extension < chestReach) {
      const push = DUCK_BODY.push * pushing * dt;
      torso.velocity.addScaledVector(reach, -push / torso.mass);
      this.impulse.copy(reach).multiplyScalar(push / 2);
      board.applyImpulse(this.impulse, this.gripPoint(board, 1, this.grip));
      board.applyImpulse(this.impulse, this.gripPoint(board, -1, this.grip));
    }
    // Straight, the arms hold the chest at their length from the hands; the knee on, closer.
    let pulled = this.rope(torso, this.gripMid, chestReach, board, dt);
    // The hands on the rails.
    pulled += this.rope(nodes[ARMS[0]], this.gripPoint(board, 1, this.grip), DUCK_BODY.gripReach, board, dt);
    pulled += this.rope(nodes[ARMS[1]], this.gripPoint(board, -1, this.grip), DUCK_BODY.gripReach, board, dt);
    this.pull = pulled;
    this.slipping = pulled > DUCK_BODY.grip * weight ? this.slipping + dt : 0;
    // The balance: the body shifted across the board toward its high rail.
    this.balance(dt, surfer, board);
    // The knee: swung to the tail, then pressing it down.
    this.kneeOn = false;
    if (this.knee.value > 0) {
      const leg = nodes[back];
      const { shape } = board;
      board.toWorld({ x: 0, y: deckHeight(shape, DUCK_BODY.kneeAt), z: DUCK_BODY.kneeAt }, this.point);
      const toward = this.along.subVectors(this.point, leg.position);
      const distance = toward.length();
      const force = DUCK_BODY.knee * this.knee.value;
      if (distance > DUCK_BODY.kneeContact) {
        const magnitude = Math.min(DUCK_BODY.kneeSpring * distance, force) * dt;
        toward.divideScalar(distance);
        leg.velocity.addScaledVector(toward, magnitude / leg.mass);
        board.applyImpulse(this.impulse.copy(toward).multiplyScalar(-magnitude), this.point);
      } else {
        this.kneeOn = true;
        // On the tail: the knee presses the deck down, the leg is pushed back up.
        board.toWorld({ x: 0, y: 1, z: DUCK_BODY.kneeAt }, this.normal).sub(board.toWorld({ x: 0, y: 0, z: DUCK_BODY.kneeAt }, this.pointVelocity)).normalize();
        board.applyImpulse(this.impulse.copy(this.normal).multiplyScalar(-force * dt), this.point);
        leg.velocity.addScaledVector(this.normal, (force * dt) / leg.mass);
      }
    }
    return this.slipping > DUCK_BODY.slip;
  }

  /** The body shifted across the board toward its high rail: a bounded spring-damper between the body and the hands. */
  private balance(dt: number, surfer: DetachedSurfer, board: BoardBody): void {
    // The board's across (its +x, its left) and its roll: + when that rail is up.
    const across = this.lateral.set(1, 0, 0).applyQuaternion(board.orientation);
    const roll = Math.asin(Math.max(-1, Math.min(1, across.y)));
    const rollRate = board.angularVelocity.dot(board.toWorld({ x: 0, y: 0, z: 1 }, this.point).sub(board.position).normalize());
    const wanted = Math.max(-DUCK_BODY.shiftMost, Math.min(DUCK_BODY.shiftMost, DUCK_BODY.shift * roll + DUCK_BODY.shiftRate * rollRate));
    const center = surfer.centerOfMass(this.center);
    const offset = center.sub(board.position).dot(across);
    const velocity = surfer.linearMomentum(this.momentum).divideScalar(surfer.mass).dot(across) - board.velocity.dot(across);
    const force = Math.max(-DUCK_BODY.shiftForce, Math.min(DUCK_BODY.shiftForce,
      DUCK_BODY.shiftStiffness * (wanted - offset) - DUCK_BODY.shiftDamping * velocity));
    this.shove(across, force * dt, surfer, board);
    // Letting go: along the board too, levelling it (the press no longer holds the nose down).
    const letting = 1 - Math.min(1, this.press.value * 2);
    if (letting > 0) {
      const along = this.lateral.set(0, 0, 1).applyQuaternion(board.orientation);
      const pitch = Math.asin(Math.max(-1, Math.min(1, along.y)));
      const levelled = Math.max(-DUCK_BODY.levelMost, Math.min(DUCK_BODY.levelMost, DUCK_BODY.level * pitch));
      const at = surfer.centerOfMass(this.center).sub(board.position).dot(along);
      const speed = surfer.linearMomentum(this.momentum).divideScalar(surfer.mass).dot(along) - board.velocity.dot(along);
      const push = Math.max(-DUCK_BODY.shiftForce, Math.min(DUCK_BODY.shiftForce,
        DUCK_BODY.shiftStiffness * (DUCK_BODY.prone + levelled - at) - DUCK_BODY.shiftDamping * speed)) * letting;
      this.shove(along, push * dt, surfer, board);
    }
  }

  /** An internal push `impulse` (N·s) along `direction`: on the body at its trunk (hips and chest), back on the board at the hands. */
  private shove(direction: Vector3, impulse: number, surfer: DetachedSurfer, board: BoardBody): void {
    for (const index of [0, 1]) surfer.nodes[index].velocity.addScaledVector(direction, (impulse / 2) / surfer.nodes[index].mass);
    const back = this.momentum.copy(direction).multiplyScalar(-impulse / 2);
    board.applyImpulse(back, this.gripPoint(board, 1, this.grip));
    board.applyImpulse(back, this.gripPoint(board, -1, this.grip));
  }

  /**
   * A rope from a part to a point on the board: past `length`, the part and the board are drawn together along it by an
   * impulse (shared by their masses, the board's at that point), closing a share of the stretch a step. Returns the pull,
   * N.
   */
  private rope(node: DetachedSurfer['nodes'][number], at: Vector3, length: number, board: BoardBody, dt: number): number {
    const along = this.normal.subVectors(node.position, at);
    const distance = along.length();
    if (!(distance > length)) return 0;
    along.divideScalar(distance);
    board.velocityAt(at, this.pointVelocity);
    const apart = (node.velocity.x - this.pointVelocity.x) * along.x + (node.velocity.y - this.pointVelocity.y) * along.y
      + (node.velocity.z - this.pointVelocity.z) * along.z;
    const wanted = (-DUCK_BODY.stiffness * (distance - length)) / dt;
    const inverse = 1 / node.mass + board.inverseEffectiveMass(at, along);
    const impulse = (wanted - apart) / inverse;
    if (!(impulse < 0)) return 0;
    node.velocity.addScaledVector(along, impulse / node.mass);
    board.applyImpulse(this.impulse.copy(along).multiplyScalar(-impulse), at);
    return -impulse / dt;
  }
}
