import { SEAWATER_DENSITY } from './PhysicalSurfWater';
import type { WaterSample } from './SurfWater';

interface Vec { x: number; y: number; z: number }

/** Seawater at about 15 °C: density kg/m³, gravity m/s², kinematic viscosity m²/s. */
export const WATER = { density: SEAWATER_DENSITY, gravity: 9.81, viscosity: 1.19e-6 };

/**
 * Savitsky's (1964) flat-plate planing lift coefficient, split into its dynamic
 * and buoyant terms: C_L0 = τ^1.1 [0.012 λ^0.5 + 0.0055 λ^2.5 / C_V²], with τ the
 * trim in degrees, λ the mean wetted length/beam and C_V = V/√(g b); lift is
 * ½ρV²b²C_L0. Valid for 0.6 ≤ C_V ≤ 13, λ ≤ 4 and 2° ≤ τ ≤ 15°.
 */
export function savitskyLift(trimDegrees: number, lambda: number, speedCoefficient: number): { dynamic: number; buoyant: number; total: number } {
  const trim = trimDegrees ** 1.1;
  const dynamic = trim * 0.012 * Math.sqrt(lambda);
  const buoyant = (trim * 0.0055 * lambda ** 2.5) / (speedCoefficient * speedCoefficient);
  return { dynamic, buoyant, total: dynamic + buoyant };
}

/** ITTC 1957 friction line, C_F = 0.075/(log₁₀ Re − 2)²; Re is held at 10⁵ or more (the line is not valid below). */
export function ittcFriction(reynolds: number): number {
  const log = Math.log10(Math.max(1e5, reynolds)) - 2;
  return 0.075 / (log * log);
}

/**
 * Normal-pressure coefficient of a hull patch, p = ½ρ C_n |v_rel| max(0, v_rel·n)
 * for pressure spread evenly. On a flat plate every wetted patch meets the flow at
 * V sin τ, so the plate's dynamic lift is ½ρ C_n V² sin τ cos τ λ b². C_n is fixed
 * so this equals Savitsky's dynamic lift at τ = 4°, λ = 3 (about 0.46). The
 * spray-root distribution (`planingScales`) keeps that mean at λ = 3.
 */
export const PRESSURE_COEFFICIENT = (() => {
  const trim = (4 * Math.PI) / 180;
  return savitskyLift(4, 3, 5).dynamic / (3 * Math.sin(trim) * Math.cos(trim));
})();

/**
 * Planing pressure concentrates behind the spray root. Taking p ∝ 1/√x at a
 * distance x behind it gives lift ∝ √λ, as in Savitsky's dynamic term, and a
 * centre of pressure two thirds of the wetted length ahead of the trailing edge
 * (Savitsky: 0.75 at high speed). Fills `out` with each patch's pressure scale
 * for one strip of patches ordered from the leading end (where the flow meets
 * the hull) to the trailing end:
 * - `shares` are the patches' wetted bottom shares and `beams` their local beams;
 *   each patch, `stationLength` long, covers the wetted length its share adds;
 * - the mean scale over a wetted length of 3 beams is 1, matching `PRESSURE_COEFFICIENT`;
 * - `alongShare` is the squared share of the relative flow along the strip. Flow
 *   meeting the hull head-on (0), as in a drop, spreads the pressure evenly.
 */
export function planingScales(shares: ArrayLike<number>, stationLength: number, beams: ArrayLike<number>, alongShare: number, out: Float64Array): Float64Array {
  const count = shares.length;
  out.fill(1, 0, count);
  if (!(alongShare > 0)) return out;
  // Distance behind the root counts wetted length only: each patch covers the
  // stretch its wetted share adds, so the waterline ramp does not blunt the peak.
  let wetted = 0;
  for (let i = 0; i < count; i += 1) {
    if (!(shares[i] > 0)) continue;
    const low = wetted;
    const high = wetted + shares[i] * stationLength;
    wetted = high;
    // Mean of √(b/x) over the stretch, normalized by its mean 2/√3 over three beams.
    const mean = (2 * Math.sqrt(beams[i]) * (Math.sqrt(high) - Math.sqrt(low))) / (high - low);
    out[i] = 1 + alongShare * ((mean * Math.sqrt(3)) / 2 - 1);
  }
  return out;
}

/**
 * Depth over which a patch face goes from dry to fully wetted, m. The ramp is
 * centred on the waterline, so it smooths the force as the waterline crosses a
 * patch without shortening the wetted length of a sloping hull.
 */
export const WET_RAMP = 0.01;

/** Wetted share of a patch face whose centre lies `depth` below the surface. */
export function wettedShare(depth: number): number {
  return Math.min(1, Math.max(0, 0.5 + depth / WET_RAMP));
}

/**
 * A fully submerged board (duck-two-body, 2026-10-31; the two-body plan's step 1): a flat plate deep in the water meets
 * the flow on both faces. Driven face-on it is a bluff plate, C_D90 about 1.17 at aspect ratio 1 to 1.2 at 5 (Hoerner
 * 1965, *Fluid-Dynamic Drag*, 3-16), where the planing law gives it only its coefficient, about 0.46. So, submerged, the
 * normal force gains the cross-flow drag the planing law leaves out (Hoerner & Borst 1975, *Fluid-Dynamic Lift*, ch. 19:
 * a plate's normal force as its lift plus a cross-flow drag), ½ρ (C_D90 − C_n)·|v_n|·v_n by its share under.
 * Its lift at small incidence stays the planing law's, C_n·|v|·v_n: running along its length the board is a plate of
 * aspect ratio about 0.27, whose lift slope (Helmbold's 2πA/(2 + √(A² + 4)), 0.42 a radian) is the planing
 * coefficient's within a tenth. (Across the board the slope would be larger, but a plate stalls there within degrees;
 * a free linear slope that large made a loose board in a bore flutter and blow up.)
 * It takes over as the board goes under, from `SUBMERGED.from` to `SUBMERGED.depth` below the surface (its shallowest
 * face):
 * - by the reference beam, twice a plate's half-width a, its image in the free surface (the fast-motion limit, φ = 0)
 *   changes its added mass by about (a/2d)², 6 % (Newman 1977, *Marine Hydrodynamics*, §4.7; a cylinder's image
 *   doublet): a deep plate;
 * - at 15 cm the image is still most of it ((a/2d)² ≈ 0.7): the planing law's one-sided water, half a deep plate's added
 *   mass, is the nearer. A prone rider's board rests with its deck about 13 cm under (7 cm paddling): the planing law,
 *   as before.
 */
export const SUBMERGED = { normalDrag: 1.18, from: 0.15, depth: 0.5 } as const;

/**
 * How far the board's shallowest face lies below the surface, as its share of a submerged plate (smoothstepped): 0
 * awash or shallower than `SUBMERGED.from`, 1 by `SUBMERGED.depth`.
 */
export function submergedShare(depth: number): number {
  const x = Math.min(1, Math.max(0, (depth - SUBMERGED.from) / (SUBMERGED.depth - SUBMERGED.from)));
  return x * x * (3 - 2 * x);
}

/**
 * The buried rail's suction (step 3.2u; the water-physics advisor's design of 2026-11-14, logged in
 * `docs/research/water-physics/consult-log.md`). Until the rail band existed `patchForce` could only ever **push** —
 * its own note said "never suction" — so a rolled board had nothing to grip the water with, and the advisor's ruling on
 * the section was *build the suction with it, or build neither*.
 *
 * On the band's **leeward** facets — the ones the flow has turned past, `v_rel · n < 0` — the flow separates and the
 * whole separated region sits at one base pressure, so there is no fall-off with turn angle: the turn angle decides
 * membership and direction, not size (the advisor). Its coefficient is referenced to the **cross-plane** dynamic
 * pressure, the part of the flow that has to turn around the band, and it is the same bluff-body coefficient already in
 * this file: Hoerner's C_D90 ≈ 1.18 (`SUBMERGED.normalDrag`, Hoerner 1965 *Fluid-Dynamic Drag* 3-16), which for a bluff
 * body is its base-pressure coefficient to within a tenth [S for the coefficient, I for using it on a rail band].
 *
 * **The ceiling is a measured line, and it is this model's best-sourced number.** Breslin & Skalak (1959, NASA Memo
 * 2-23-59W) faired the ventilation boundary of a surface-piercing strut to C_s·F_h² = 5 with F_h = U/√(gh) — which is
 * area- and speed-free: a sustainable loading of **2.5 ρ g h** at depth h. Their chords put h at 0.032–0.152 m and our
 * buried rail runs 0.17–0.26 m under (Part 17 §3), so for once the datum brackets us instead of being extrapolated to.
 * Using a span-mean bound as a local per-facet cap is the advisor's extension [I].
 *
 * Cut off rather than extrapolated: the cross-plane speed at `crossCap` of the flow (past that nothing is measured),
 * the depth at `depthCap` (the law is positive feedback on depth — deeper pulls harder pulls deeper — and the cap is
 * the net under it), and nothing at all where the band's own sweep never reaches the separation angle, which is why the
 * tail's hard 30° tucked edge makes no suction and the round forward rail does. Cavitation does **not** bind: σ = 3.0–3.2
 * at 8 m/s and 0.2 m under, against a demanded |C_p| of 0.07–0.15, twenty times away.
 */
export const RAIL_SUCTION = {
  /** Base-pressure coefficient on the cross-plane dynamic pressure. */
  coefficient: 1.15,
  /** The cap, in ρ g h (Breslin & Skalak's C_s F_h² = 5). */
  cap: 2.5,
  /** The cross-plane speed, as a share of the flow past the patch, past which nothing is measured. */
  crossCap: 0.35,
  /** Depth, m, past which the cap stops growing. */
  depthCap: 0.35,
  /** The window of `v_rel · n`, m/s, the pressure–suction switch is blended over, instead of flipping sign at zero. */
  blend: 0.2,
} as const;

/** A hull patch placed in the world: bottom centre, outward (downward) normal, planform area and thickness. */
export interface WorldPatch {
  position: Vec;
  normal: Vec;
  /** **Planform** area, m²: the station beam, the added mass, the radiation, `planingScales` and λ all hang off it. */
  area: number;
  thickness: number;
  /**
   * A rail-band facet (`BoardShape`'s `HullPatch.band`), absent on the flat bottom:
   * - `faceArea`, the facet's true area, m², which the pressure, the friction and the suction are taken over;
   * - `up`, the station's own deck direction, because a near-vertical facet's deck is not along its own normal;
   * - `tangent`, the rail's own direction (the board's long axis), which fixes the cross-plane the suction turns in;
   * - `gate`, 0 to 1: the band's own gates — the leeward arc wide enough to separate, an air path, Taylor's condition,
   *   and 1 − the ventilated share (`BoardBody.bandGate`). 0 makes no suction at all.
   */
  band?: { faceArea: number; up: Vec; tangent: Vec; gate: number };
}

export interface PatchForce {
  /** Hydrostatic support, N, acting at `buoyancyPoint`: normal to the local water surface. */
  buoyancy: Vec;
  buoyancyPoint: Vec;
  /** Planing and impact pressure on the wetted face meeting the flow, N, acting at the patch. */
  pressure: Vec;
  /**
   * The buried rail band's suction, N, acting at the patch along **+normal** — into the water, which on a buried rail is
   * down and toward the turn's centre (`RAIL_SUCTION`). Its own accumulator, so Part 17's `pressure.y / |pressure|`
   * identity still reads the pressure alone. 0 on a flat bottom and on every patch that is not a band facet.
   */
  suction: Vec;
  /** The suction's pressure and the cap that bounds it, Pa, and 1 if the cap is what is binding: the round's score card. */
  suctionPressure: number;
  suctionCap: number;
  suctionCapped: number;
  /**
   * −∂(pressure · n)/∂(v · n), N·s/m: how fast the pressure grows with the speed
   * into the water, for an implicit integrator.
   */
  pressureDamping: number;
  /** Skin friction on both wetted faces, N, acting at the patch. */
  friction: Vec;
  /** Wetted bottom and deck areas, m². */
  wettedArea: number;
  deckWettedArea: number;
  /** Share of the patch's volume under water. */
  submerged: number;
  /**
   * Step 3.3d, a **diagnostic only**: the share of this patch's hydrostatic support that `buoyFrame: 'hull'` resolved
   * along the **hull** normal rather than the water-surface normal — `HULL_BUOYANCY`'s own blend, 0 to 1. Always 0
   * without the switch, and nothing reads it in the game: it exists so a probe can report which regime the ride is in
   * instead of re-deriving the blend from the same inputs (the frame errors of the last fortnight were all
   * re-derivations).
   */
  hullShare: number;
}

export function createPatchForce(): PatchForce {
  return {
    buoyancy: { x: 0, y: 0, z: 0 }, buoyancyPoint: { x: 0, y: 0, z: 0 }, pressure: { x: 0, y: 0, z: 0 },
    suction: { x: 0, y: 0, z: 0 }, suctionPressure: 0, suctionCap: 0, suctionCapped: 0,
    pressureDamping: 0, friction: { x: 0, y: 0, z: 0 }, wettedArea: 0, deckWettedArea: 0, submerged: 0,
    hullShare: 0,
  };
}

/**
 * **Step 3.3d, opt-in and off by default** (`BoardBodyOptions.buoyFrame: 'hull'`, the `?buoyFrame=hull` dev switch):
 * where the hydrostatic support points.
 *
 * Shipped, it points along the **water-surface** normal, `ρg(−∂η/∂x, 1, −∂η/∂z)·V` — the closed-body answer, and the
 * right one for a floating body whose immersed volume is closed above by the free surface: by the divergence theorem
 * the pressure on the wetted hull alone then integrates to Archimedes' vertical `ρgV`, because the waterplane that
 * closes it carries `p = 0`, and the horizontal part comes from the wetted **side walls** the default flat section does
 * not have as patches at all (it lumps them into the bottom facets by making the resultant vertical).
 *
 * Under a planing bottom with a **dry deck** that closure does not exist. The free surface separates at the chines, the
 * bottom is a surface wetted on one side, and `∮ p n dA` over it is `(∫p dA) n̂` — **normal to the bottom**, with no
 * side walls to turn it. That is the convention of Savitsky's own method, where the whole load, the buoyant term
 * `0.0055 λ^2.5/C_V²` included, is the bottom-pressure resultant normal to the bottom; it is what makes his pressure
 * drag `Δ tan τ` (NACA TN 4187 / Savitsky 1964, read for the consult logged in
 * `docs/research/water-physics/consult-log.md`, 2026-11-15, and quoted there).
 *
 * So the switch blends between the two by the two things that decide which regime a patch is in, and **both** matter:
 * - `1 − deck`, the patch's own **dry-deck share**. Where the deck is under the surface line the slab is closed above
 *   and the vertical answer is the right one, so the blend goes to 0 there — which also means it goes to 0 on a
 *   capsized board, whose hull normal points down and which would otherwise be pushed under by its own buoyancy.
 *   `deck` carries `deckWet`, so `deckHollow: 'on'` — which keeps a banked deck dry inside the hollow — widens this
 *   gate, consistently and by the same geometry.
 * - the local **planing share** `F_d²/(1 + F_d²)` on the Froude number of the patch's own immersion depth,
 *   `F_d = |v_rel|/√(g·d)` — 0 at rest, so a board floating heeled on flat water keeps the vertical answer and does not
 *   acquire a sideways push, and ≈0.98 at 7.5 m/s and 0.085 m of immersion. There is no fitted constant in it: it is
 *   the dimensionless group of Savitsky's own buoyant term with the beam replaced by the local depth.
 *
 * The **magnitude is preserved** and only the direction turns — the convention step 3.3c measured the geometry in
 * (`README.md` Part 27 §5), so its figures are the prediction this is tested against. Nothing is added: this is one
 * existing force rotated, its reaction on the water as implicit as it already was.
 *
 * **One convention, named because it is a choice and not a derivation.** On a rail-band facet the direction taken is
 * the station's own `band.up`, not the facet's own normal, which is step 3.3c's convention and keeps this law's figures
 * comparable with Part 27's. A near-vertical band facet is the one surface on this hull that genuinely *is* a wetted
 * side wall closing the immersed volume, so its own normal may be the better answer; nothing on the **shipped** board
 * is affected either way, because the default flat section has no band facets at all (Part 27 §5 found 0 in all eight
 * default-hull cells, against 43–53 with `hull: 'rail'`, which is off in the game).
 */
export const HULL_BUOYANCY = {
  /** The smallest blended direction length that is safe to normalise; below it the shipped direction is kept. */
  floor: 1e-6,
} as const;

function zero(v: Vec): void {
  v.x = 0;
  v.y = 0;
  v.z = 0;
}

/**
 * The water's force on one hull patch, a slab from its bottom face to its deck:
 * - buoyancy from the part of the slab under the surface, pushed by the
 *   hydrostatic pressure gradient ρg(−∂η/∂x, 1, −∂η/∂z), so down a sloping face;
 * - pressure where a wetted face meets the flow (the bottom, or the deck of a
 *   capsized board) — and, on a rail-band facet the flow has turned past, the band's
 *   own suction in its place (`RAIL_SUCTION`, step 3.2u). On a flat bottom, as
 *   before, this law never makes suction at all;
 * - ITTC skin friction on the tangential flow over both wetted faces.
 * `relative` is the patch's velocity minus the water's; `wettedLength` sets the
 * Reynolds number, and `pressureScale` places the patch in the pressure
 * distribution (`planingScales`). `deckWet` (1 by default) scales the deck's wetting: its skin friction, its
 * pressure and its share of the wetted area; buoyancy stays the slab's own volume under the surface line.
 * `hullBuoyancy` (0 by default, 1 with `buoyFrame: 'hull'`) resolves the hydrostatic support along the **hull** normal
 * where the deck is dry and the patch planes, blending back to the surface normal as it floats or submerges —
 * `HULL_BUOYANCY`, step 3.3d, opt-in. At 0 nothing below it runs and the force is bit-for-bit the shipped one.
 */
export function patchForce(
  patch: WorldPatch, water: WaterSample, relative: Vec, wettedLength: number, out: PatchForce, pressureScale = 1, submergedShareHere = 0, deckWet = 1, hullBuoyancy = 0,
): PatchForce {
  zero(out.buoyancy);
  zero(out.pressure);
  zero(out.suction);
  zero(out.friction);
  out.suctionPressure = 0;
  out.suctionCap = 0;
  out.suctionCapped = 0;
  out.pressureDamping = 0;
  out.wettedArea = 0;
  out.deckWettedArea = 0;
  out.submerged = 0;
  out.hullShare = 0;
  const { position, normal, thickness, area, band } = patch;
  // The band's facets carry their true area; everything keyed on the beam keeps the planform (the advisor's trap 2).
  const faceArea = band ? band.faceArea : area;
  out.buoyancyPoint.x = position.x;
  out.buoyancyPoint.y = position.y;
  out.buoyancyPoint.z = position.z;
  if (!water.wet || water.outsideDomain) return out;
  // A near-vertical band facet's deck is not along its own normal (the advisor's trap 1): the station's own up instead.
  const deckY = band ? position.y + band.up.y * thickness : position.y - normal.y * thickness;
  const bottom = wettedShare(water.surfaceY - position.y);
  // `deckWet`: the deck's wet share where it lies under the surface line in a planing board's open hollow (`hollowWetShare`).
  const deck = wettedShare(water.surfaceY - deckY) * deckWet;
  if (bottom === 0 && deck === 0) return out;

  const bottomLow = position.y <= deckY;
  const low = bottomLow ? position.y : deckY;
  const span = Math.abs(deckY - position.y);
  const submerged = span > 1e-9 ? Math.min(1, Math.max(0, (water.surfaceY - low) / span)) : water.surfaceY > low ? 1 : 0;
  out.submerged = submerged;
  // Aerated water (the wipeout spec, Part B): the hull floats, planes and drags in the mixture, ρ(1 − α).
  const density = WATER.density * (1 - (water.voidFraction ?? 0));
  const support = density * WATER.gravity * area * thickness * submerged;
  if (water.buoyancyNormal !== undefined) {
    // Ruling 3's rank 5 (`WaterSample.buoyancyNormal`, the case's wall water past the slope clamp): along the surface's own
    // normal at the clamp's size, so under an overhang it points down and out, as the water there accelerates downward
    // faster than g (the advisor, provisional).
    const along = support * water.buoyancyNormal;
    out.buoyancy.x = along * water.normalX;
    out.buoyancy.y = along * water.normalY;
    out.buoyancy.z = along * water.normalZ;
  } else {
    out.buoyancy.x = -support * water.slopeX;
    out.buoyancy.y = support;
    out.buoyancy.z = -support * water.slopeZ;
  }
  // Halfway up the immersed part, measured from the bottom face toward the deck.
  const centroid = bottomLow ? (thickness * submerged) / 2 : thickness * (1 - submerged / 2);
  const upX = band ? band.up.x : -normal.x;
  const upY = band ? band.up.y : -normal.y;
  const upZ = band ? band.up.z : -normal.z;
  out.buoyancyPoint.x = position.x + upX * centroid;
  out.buoyancyPoint.y = position.y + upY * centroid;
  out.buoyancyPoint.z = position.z + upZ * centroid;
  // Step 3.3d, opt-in (`HULL_BUOYANCY`): the support turned onto the HULL's normal where the deck is dry and the patch
  // planes. Direction only — the magnitude above is kept, which is step 3.3c's own convention — and the whole block is
  // dead at `hullBuoyancy = 0`, so the default force is the shipped one line for line.
  if (hullBuoyancy > 0 && support > 0) {
    const depth = water.surfaceY - position.y;
    const vsq = relative.x * relative.x + relative.y * relative.y + relative.z * relative.z;
    // `F_d²/(1 + F_d²)` on the patch's own immersion depth: 0 at rest, ≈1 planing. `depth ≤ 0` cannot reach here with
    // `support > 0` on a wet bottom, but a deck-wetted patch can, and there the dry share is 0 anyway.
    const head = WATER.gravity * Math.max(depth, 0);
    const planing = vsq > 0 ? vsq / (vsq + head) : 0;
    const share = hullBuoyancy * (1 - deck) * planing;
    out.hullShare = share;
    if (share > 0) {
      const hullLen = Math.hypot(upX, upY, upZ);
      const mag = Math.hypot(out.buoyancy.x, out.buoyancy.y, out.buoyancy.z);
      if (hullLen > 0 && mag > 0) {
        const hx = upX / hullLen;
        const hy = upY / hullLen;
        const hz = upZ / hullLen;
        const sx = out.buoyancy.x / mag;
        const sy = out.buoyancy.y / mag;
        const sz = out.buoyancy.z / mag;
        const bx = sx + share * (hx - sx);
        const by = sy + share * (hy - sy);
        const bz = sz + share * (hz - sz);
        const len = Math.hypot(bx, by, bz);
        if (len > HULL_BUOYANCY.floor) {
          out.buoyancy.x = (mag * bx) / len;
          out.buoyancy.y = (mag * by) / len;
          out.buoyancy.z = (mag * bz) / len;
        }
      }
    }
  }

  out.wettedArea = area * bottom;
  out.deckWettedArea = area * deck;
  const speed = Math.hypot(relative.x, relative.y, relative.z);
  if (!(speed > 0)) return out;
  const normalSpeed = relative.x * normal.x + relative.y * normal.y + relative.z * normal.z;
  const face = normalSpeed > 0 ? bottom : deck;
  const tx = relative.x - normalSpeed * normal.x;
  const ty = relative.y - normalSpeed * normal.y;
  const tz = relative.z - normalSpeed * normal.z;
  const tangential = Math.hypot(tx, ty, tz);
  // Submerged, both faces wet: the plate's cross-flow drag on top of the planing law, by its share under (`SUBMERGED`).
  const deep = bottom >= 1 && deck >= 1 ? submergedShareHere : 0;
  /**
   * The band's leeward share: 1 where the flow has turned past this facet, 0 where it still meets it, blended over
   * `RAIL_SUCTION.blend` of `v_rel · n` rather than flipping at zero — a real convex surface goes sub-ambient slightly
   * before the geometric crossing [I], and the switch is a sign change, not a ramp from nothing.
   */
  const leeward = band ? Math.min(1, Math.max(0, 0.5 - normalSpeed / RAIL_SUCTION.blend)) : 0;
  if (normalSpeed !== 0 && face > 0) {
    // Leeward, the suction **replaces** the deck's own pressure on that facet rather than being added to it: both act
    // along +n and counting both would double the leeward load (the advisor's fourth trap, `face = … : deck`).
    const k = 0.5 * density * PRESSURE_COEFFICIENT * pressureScale * face * faceArea * (normalSpeed < 0 ? 1 - leeward : 1);
    let pressure = k * speed * normalSpeed;
    let damping = k * (speed + (normalSpeed * normalSpeed) / speed);
    if (deep > 0) {
      const kd = 0.5 * density * faceArea * deep * (SUBMERGED.normalDrag - PRESSURE_COEFFICIENT);
      pressure += kd * Math.abs(normalSpeed) * normalSpeed;
      damping += 2 * kd * Math.abs(normalSpeed);
    }
    out.pressure.x = -pressure * normal.x;
    out.pressure.y = -pressure * normal.y;
    out.pressure.z = -pressure * normal.z;
    out.pressureDamping = damping;
  }
  if (band !== undefined && band.gate > 0 && leeward > 0 && bottom > 0) {
    // The cross-plane speed: only the part of the flow that has to turn around the band (`RAIL_SUCTION`).
    const along = relative.x * band.tangent.x + relative.y * band.tangent.y + relative.z * band.tangent.z;
    const cross = Math.min(Math.hypot(relative.x - along * band.tangent.x, relative.y - along * band.tangent.y, relative.z - along * band.tangent.z), RAIL_SUCTION.crossCap * speed);
    const curved = 0.5 * density * RAIL_SUCTION.coefficient * cross * cross;
    const cap = RAIL_SUCTION.cap * density * WATER.gravity * Math.min(RAIL_SUCTION.depthCap, Math.max(0, water.surfaceY - position.y));
    const dp = band.gate * leeward * bottom * Math.min(curved, cap);
    out.suctionPressure = Math.min(curved, cap);
    out.suctionCap = cap;
    out.suctionCapped = curved > cap ? 1 : 0;
    // Along +n: into the water, which on a buried rail is downward and inward. It does not depend on `v_rel · n`, so it
    // adds nothing to `pressureDamping` — an explicit force, bounded by the cap whatever the depth does.
    const push = dp * faceArea;
    out.suction.x = push * normal.x;
    out.suction.y = push * normal.y;
    out.suction.z = push * normal.z;
  }
  if (tangential > 0) {
    const friction = 0.5 * density * ittcFriction((speed * wettedLength) / WATER.viscosity) * tangential * (bottom + deck) * faceArea;
    out.friction.x = -friction * tx;
    out.friction.y = -friction * ty;
    out.friction.z = -friction * tz;
  }
  return out;
}
