/**
 * **The arm carriage channel** (step 3.5g; `engine-target.md` rows 4, 5 and 15, the owner's "geometry rows first" of
 * 2026-11-18). **Drawing only: no part mass moves, no force is added and no existing force changes.**
 *
 * ## What the engine had, and why one scalar could not carry this
 *
 * The game's only arm quantity is `HumanBalance.arms`, **one dimensionless scalar 0–1** (`?rider=new` only), which
 * physics reads as an **inertia** and nothing else — `swingInertia` 6 → 10 kg·m², `riderYawInertia`'s +0.85, the
 * twist rotor's TWIST_BODY_ARMS. **Where the arms are reaches nothing.** And the drawn hand is
 * `armPart + spread × (armPart − torsoPart)` with `spread = ARM_SPREAD + ARM_ALARM × (1 − balanceMargin)`
 * (`AttachedRider.renderPoint`), so both hands are pushed out **along the board** by the same amount, at the same
 * height, with **no across component, no height and no left/right** — exactly one carriage per balance margin.
 *
 * So this module adds the three numbers the scalar lacks, per side:
 *
 * | number | what it is | datum |
 * | --- | --- | --- |
 * | `out` | the spread along the body's own trunk→arm axis, as a **share** of it — the existing `spread` | ARM_SPREAD 0.7 |
 * | `lift` | the hand's **height**, m, from the arm part's own placed point, along the body's up | 0 (today) |
 * | `across` | the hand **across** the board, m, toward the inside rail, along the body's across | 0 (today) |
 *
 * The arm part sits at **1.00 m above the deck, on the stringer, 0.45 m fore (left arm) or aft (right arm) of the
 * trunk** standing (`riderPosture.ts:93–102`, whose own comment says these heights are illustrative, not measured);
 * the trunk is at 1.05 m, the pelvis at 0.78 m, the head at 1.38 m. Today's drawn hand therefore lands at **0.965 m
 * above the deck, 0.765 m along the board from the trunk** — just below the shoulder, arms out along the board.
 * Every `lift` and `across` below is quoted against that.
 *
 * ## The four carriages, each with the footage's own population
 *
 * **Arm carriage is INDEPENDENT of leg depth** — both *"tall ⇒ arms spread"* and *"deep ⇒ arms spread"* are refuted:
 * V7 found **four carriages inside the Tall band** with the **narrowest, lowest** arms at its **deepest** leg
 * position, and V8 found two Tall-band segments with arms wide in one and hanging below the waist in the other.
 * **So nothing here reads leg depth.** What it reads is the player's own stick.
 *
 * | carriage | the footage | population |
 * | --- | --- | --- |
 * | **rest** — both hands low, drawn in, inside the rails | the clip's single most common arm position in three of the four sharpest clips | **4 clips**: V8 §2.4 (5 windows, ~15 frames), V9 §2.4 carriage A (6 windows), V7 (9 frames over 4 windows), **V11 (4 windows)** |
 * | **reach** — the pairing: **lead hand down at the rail, board or knee; rear arm up and back** | at a low's peak | **3 clips**: V5 (3 of 3 turns), V6 (2 frames, which-arm caveat), V7 (carriages A and D). None of the three times it against the board |
 * | **over** — the rear arm **above the head** | the hard-ask carriage, which **leads the rail** | **3 clips, 4 riders**: V9 2 of 2 at 1/30 s, V8 3 of 4 at 0.1–0.2 s, **V11 2 of 2 at 1/60 s** — and V11's side-on lens **settles** V10's abstention on *"above the head"*, which a drone looking down could not test |
 * | **wide** — both out and level | the balance alarm's existing look; also V1/V2's spread-and-level | the shipped `ARM_SPREAD + ARM_ALARM` behaviour, **unchanged**, and it wins over the other three |
 *
 * **The overhead arm belongs to some turns and not others, and that is deliberate.** V10's bottom turn took it and a
 * top turn 0.5 s later did not; V9's 1.10 s roundhouse cutback went without it. So `over` answers only the **top** of
 * the stick's throw (ARM_OVER_FROM–ARM_OVER_FULL): a hard ask gets it, a soft one does not. The capability is built,
 * not a reflex.
 *
 * **V11 then reproduced that as a count, which is the strongest confirmation this channel has:** *"2 of 2 direction
 * changes into a climb take it. Trim does not"* — **0 of 2 trim windows**, with both hands low and no arm above the
 * shoulder through 1.2 s and 0.7 s. **The design was made before that read landed and it survives it.**
 *
 * **⚠️ One shape V11 names that this channel CANNOT draw**, recorded so no round claims it: V11's carriage B is a lead
 * arm forward-down at chest height with the **rear arm back and LOW** (3 windows). The pairing here takes the rear arm
 * **up** and back (V5, V6, V7 — three clips), and there is no carriage with the rear arm low. It is one more drawn
 * carriage and it needs no force, but it is **not built**.
 *
 * ## The clock: the lead, and the hold — and they are different quantities
 *
 * **The arm LEADS the rail** and then **STAYS UP**: V9 §0.2 at 1/30 s has the rear arm above the shoulder at 18.034,
 * **above the head at 18.067**, the rail biting at 18.100 and spray at 18.134 — a lead of **0.07–0.10 s** — and
 * overhead for **~0.7 s** (18.03 → 18.80). Rider A: arm up 7.63, rotation begins 7.90 — **0.3 s**. V8: overhead
 * before the legs extend in **3 of 4** resolvable direction changes. **V11, at 1/60 s: +0.07 to +0.20 s on 2 of 2
 * climbing turns, held above the shoulder ≥0.17 s and both arms high ~0.8 s through a lip hit.** So the lead is
 * **3 clips, 4 riders**, and `engine-target.md` §4.6's *"two clips"* count should be corrected; the hold is V9's
 * ~0.7 s (SINGLE) with V11's ≥0.17 s and ~0.8 s beside it.
 *
 * So the carriage rises on ARM_LEAD_TIME and falls on ARM_HOLD_TIME, and **the asymmetry is the whole point**: the
 * one orderable pair the game already has runs **backwards** — the knees reach their drop on MOTOR_LAG **0.05 s**
 * against the arms' ARMS_TIME **0.15 s**, three times faster, and come back over KNEE_RETURN_TIME **0.6 s** against
 * the arms' 0.15 s, four times slower. The footage has the arm **first and held**.
 *
 * **⚠️ Neither constant below is an animation duration and neither is the footage's own number.** ARM_LEAD_TIME is
 * an exponential time constant on a set-point; the **lead** is the measured gap between the drawn hand arriving and
 * the board's rail answering, and it is reported in `3.5/README.md`, measured, not asserted here. ARM_HOLD_TIME is
 * the return constant whose settling is what V9's ~0.7 s overhead window is compared against.
 *
 * **These are two NEW constants, and the brief said row 5 needed none.** That is a correction worth recording: row 5
 * reads as *"re-ordering two existing time constants"*, but the two existing constants (MOTOR_LAG, ARMS_TIME) are the
 * clock of `HumanBalance.arms`, which is an **inertia** — re-ordering them would change `swingInertia`,
 * `riderYawInertia` and the twist rotor's share, i.e. physics, inside a switch that is otherwise drawing-only. The
 * carriage's clock is its own, and `HumanBalance.arms` is left exactly as it is.
 *
 * ## What this module is NOT
 *
 * - **Not a force.** Nothing here appears in any solve, any ledger or any work book. The seven point masses stay in
 *   their hard-coded posture; `partPosition` is untouched. The arms' only physical path (their inertia, through
 *   `HumanBalance.arms`) is **unchanged**.
 * - **Not a clock on the body.** It has no timer, no fatigue, no stamina and no self-release: `reach` and `over`
 *   follow the stick and nothing else, so the carriage lasts exactly as long as the input does plus its own return.
 *   The owner cancelled clocks (*"lets leave it as infite stamina"*) and ruled that the body moves on their input
 *   only (Ruling E).
 * - **Not depth.** No expression here reads leg depth, the stance, the crouch key or `stanceRoom`.
 */

/** 0–1 of the way from `from` to `full`. */
function ramp(x: number, from: number, full: number): number {
  return Math.max(0, Math.min(1, (x - from) / (full - from)));
}

/**
 * A carriage's three numbers: the spread as a share of the trunk→arm axis (ARM_SPREAD is today's), the hand's height
 * from the arm part's placed point in m, and its position across the board in m toward the **inside** rail (the
 * carriage's own `inside` sign multiplies it, so a negative `across` is away from that rail).
 */
export interface ArmPlace {
  out: number;
  lift: number;
  across: number;
}

/** The shipped spread, restated: `AttachedRider.ARM_SPREAD`. The rest carriage and the pairing are quoted against it. */
export const ARM_SPREAD_DATUM = 0.7;

/**
 * **rest** — both hands low and drawn in, inside the rails (row 15; V7, V8, V9). The hand lands **0.60 m above the
 * deck**, below the pelvis's 0.78 m: V8's own Tall-band segment with *"arms hanging below the waist"*, and V9's and
 * V8's most common carriage.
 *
 * **It does not reach the deck, and that is row 2's fault, not a choice.** V8's most-crouched frame has **both hands
 * at the deck with the leg chain at 95 %** — hands at the deck over straight legs is a **trunk fold**, and the trunk
 * is rows 1 and 2, which are **gated** on the pivot-and-frame decision. Drawing the hands at the deck without the
 * fold would draw a rider dangling his arms, so the carriage stops at the waist, where the footage also puts it.
 */
export const ARM_REST: ArmPlace = { out: 0.35, lift: -0.37, across: 0 };

/**
 * **reach**, the lead arm — **down at the rail, board or knee** (V5 3 of 3 turns, V6, V7). The hand lands **0.45 m
 * above the deck** (knee height; the feet are on the deck and the pelvis is at 0.78 m) and **0.22 m across** toward
 * the inside rail, which is just outboard of the rail's own half-width. Shoulder to hand is then about 0.73 m, at the
 * arm's reach, so the rig's own `blendAim`/`softReach` clamp draws it as a straight arm rather than overreaching.
 */
export const ARM_REACH_LEAD: ArmPlace = { out: 0.15, lift: -0.55, across: 0.22 };

/**
 * **reach**, the rear arm — **up and back** (V5, V6, V7, the same three clips as the lead hand; the pairing is one
 * finding and both halves come from it). The hand lands **1.30 m above the deck**, above the shoulder, pushed further
 * back along the board (`out` 1.00 against the datum's 0.7) and **0.12 m away** from the inside rail.
 *
 * **V5 also records that the rear arm moves against the trunk.** That is a trunk quantity, so it waits on rows 1–2.
 */
export const ARM_REACH_REAR: ArmPlace = { out: 1.0, lift: 0.3, across: -0.12 };

/**
 * **over**, the rear arm — **above the head** (V9 at 1/30 s, V8 3 of 4). The hand lands **1.55 m above the deck**,
 * above the head's placed 1.38 m, and comes in along the board as it rises (`out` 0.70, back to the datum) because an
 * arm raised overhead is no longer reaching backwards.
 */
export const ARM_OVER_REAR: ArmPlace = { out: 0.7, lift: 0.55, across: -0.1 };

/**
 * The stick's throw that asks for the pairing, and the (higher) throw that asks for the overhead arm. **Two bands,
 * because the overhead arm belongs to some turns and not others** (V10: a bottom turn took it, a top turn 0.5 s later
 * did not; V9's roundhouse went without it). ARM_REACH_FROM sits above the engine's own STEER_DEADBAND of 0.05, so a
 * line held straight keeps the rest carriage.
 */
export const ARM_REACH_FROM = 0.25;
export const ARM_REACH_FULL = 0.65;
export const ARM_OVER_FROM = 0.7;
export const ARM_OVER_FULL = 1;

/**
 * The carriage's rise and return, s — an exponential time constant on a set-point, **not** a duration and **not** the
 * footage's lead or hold. The rise is fast so the hand can arrive before the water answers the rail (the footage's
 * lead is **+0.07 to +0.30 s**, 2 clips, 3 riders); the return is slow so the carriage **stays** after the ask drops
 * (V9's overhead window is **~0.7 s**, SINGLE). The achieved lead is measured on the drawn hand against the board's
 * own roll and reported in `3.5/README.md`; nothing here asserts it.
 */
export const ARM_LEAD_TIME = 0.08;
export const ARM_HOLD_TIME = 0.7;

/** Below this much `reach`, with no ask, the carriage forgets which rail it was leaning over. */
export const ARM_SIDE_DROP = 0.05;

/**
 * ## ⚠️ The balance alarm does NOT gate the carriage, and that is a MEASURED decision, not a preference
 *
 * The first build of this module faded the carriage out as the balance alarm rose, so that a near fall would read
 * exactly as it ships. **That was refuted on the bench before it left the worktree.** Measured on the default rider
 * standing on `PlaneWater`, towed at 6 m/s, **frames 31–180 of a 180-frame run (150 frames a cell, 1 run a cell, 3
 * cells)** — `balanceMargin`, which is `rawMargin` through MARGIN_TIME:
 *
 * | stick | median margin | lowest margin |
 * | --- | --- | --- |
 * | 0 | **0.948** | 0.901 |
 * | 0.45 | **0.444** | 0.003 |
 * | 1 | **0.537** | 0.038 |
 *
 * **So this rider's margin sits near a half through a turn and dips to within a few thousandths of nothing.** A
 * carriage faded out at `1 − margin ≥ 0.5` would have been **7–13 % present in a median turn frame** — invisible in
 * exactly the turns it is built for. **One run a cell, on flat water, on the default rider: a small population, and
 * it is quoted as the reason for a design choice, not as a figure about surfing.**
 *
 * So the shipped alarm spread `ARM_SPREAD + ARM_ALARM × (1 − balanceMargin)` is left **exactly as it is**, and the
 * carriage's three numbers are added **on top of it**. At a near fall both arms still fly out as they always did —
 * the alarm reaches ARM_ALARM 0.8 of extra spread, which dominates the carriage's own — and on separation the phase
 * leaves `standing` and the carriage stops being drawn at all.
 */

/** The carriage's own state: how far into the pairing, how far overhead, and which rail the lead hand is dropping over. */
export interface ArmCarriageState {
  /** 0–1: into the pairing (lead hand down at the rail, rear arm up and back). */
  reach: number;
  /** 0–1: the rear arm overhead, on top of `reach`. */
  over: number;
  /** The rail the lead hand drops over, in the board's own frame (+1 the +x rail, −1 the −x rail, 0 none). Latched while the carriage is held, so a hold keeps its side. */
  inside: number;
}

export function createArmCarriage(): ArmCarriageState {
  return { reach: 0, over: 0, inside: 0 };
}

/** A new mount, or not standing: no carriage, no side. */
export function resetArmCarriage(state: ArmCarriageState): void {
  state.reach = 0;
  state.over = 0;
  state.inside = 0;
}

/**
 * One substep of the carriage. `steer` is the player's own stick, −1 to 1 (+ turns the board toward its left, the
 * heading growing) — **the ask, which is upstream of the rail biting, which is the only reason a lead is possible at
 * all**; `h` the substep, s. `rest` holds the carriage at the rest position whatever the stick says
 * (`armCarry: 'rest'`), which is row 15 on its own.
 *
 * The side is **latched**: it is taken from the stick's sign while there is one, and forgotten only once the carriage
 * has come back past ARM_SIDE_DROP, so the hold after a turn keeps the rail it was leaning over.
 */
export function stepArmCarriage(state: ArmCarriageState, h: number, steer: number, standing: boolean, rest = false): void {
  if (!standing) {
    resetArmCarriage(state);
    return;
  }
  const ask = rest ? 0 : Math.min(1, Math.abs(steer));
  const reachAsked = ramp(ask, ARM_REACH_FROM, ARM_REACH_FULL);
  const overAsked = ramp(ask, ARM_OVER_FROM, ARM_OVER_FULL);
  state.reach += (reachAsked - state.reach) * (1 - Math.exp(-h / (reachAsked > state.reach ? ARM_LEAD_TIME : ARM_HOLD_TIME)));
  state.over += (overAsked - state.over) * (1 - Math.exp(-h / (overAsked > state.over ? ARM_LEAD_TIME : ARM_HOLD_TIME)));
  const side = ask > 0 ? Math.sign(steer) || 0 : 0;
  if (side !== 0) state.inside = side;
  else if (state.reach < ARM_SIDE_DROP) state.inside = 0;
}

/**
 * Where one hand is carried now: the three numbers for `lead` (the arm on the front foot's side) or the rear arm,
 * blended rest → reach by `state.reach`, and on the rear arm reach → overhead by `state.over`.
 *
 * **The lead hand does not go overhead.** V9's overhead passage has the rear arm up and the **lead arm reaching past
 * the rail**, and its roundhouse cutback is carried on the lead arm alone, so `over` moves one arm.
 */
export function armCarriagePlace(state: ArmCarriageState, lead: boolean, out: ArmPlace = { out: 0, lift: 0, across: 0 }): ArmPlace {
  const to = lead ? ARM_REACH_LEAD : ARM_REACH_REAR;
  const r = Math.max(0, Math.min(1, state.reach));
  out.out = ARM_REST.out + (to.out - ARM_REST.out) * r;
  out.lift = ARM_REST.lift + (to.lift - ARM_REST.lift) * r;
  out.across = ARM_REST.across + (to.across - ARM_REST.across) * r;
  if (!lead && state.over > 0) {
    const o = Math.max(0, Math.min(1, state.over));
    out.out += (ARM_OVER_REAR.out - out.out) * o;
    out.lift += (ARM_OVER_REAR.lift - out.lift) * o;
    out.across += (ARM_OVER_REAR.across - out.across) * o;
  }
  return out;
}
