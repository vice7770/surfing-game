# Teahupo'o Reef, Part C (the solid reef, the lagoon, the deeper crash) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Reef's reef solid rock under the board and the rider, end a ride that strikes it with "Hit the reef", end the pass and inner reef in a lagoon with the Teahupo'o model's 1:9.64 inland slope, and make a bigger lip's crash sound deeper.

**Architecture:**
- **Bed normal and material:** a spot says what its bed is made of (`materialAt`). The water sample carries the bed's normal and material to the board and the body.
- **Contact:** the board's seabed impulses and the body's floor constraint act along that normal, with each material's friction. A strike on reef at the moment the rider separates relabels the fall "Hit the reef".
- **The lagoon:** changes only the Reef's `depthAt` shoreward of its crest.
- **The crash sound:** plays a lip's one-shot slower (deeper) as the water it gathered grows.

**Tech Stack:** TypeScript, three.js (Vector3), Vitest. The existing shallow-water solver, BoardBody, DetachedSurfer and soundMapping.

**Spec:** `docs/superpowers/specs/2026-09-27-teahupoo-reef.md` (decisions 9, 11 and Delivery's Part C).

**Scope after the user's 2026-09-28 decision:** the lip strips and carved void are to be replaced by a swept overturn surface (the Padang Padang session builds it). So Part C's tube look is not built here:
- the lip's glow;
- the spit;
- the section collapsing as one.

The step and the coral also wait: the coral textures need the user's download approval.

The branch is `claude/teahupoo-reef-c`, off main after Part B merged (PR #57, 353a62e).

## Global Constraints

- Physics honest: every value sourced, or marked **provisional** in the sources doc's Part C rulings table. Nothing is shaped by hand to make a test pass.
- The reef is solid: "harder and grippier than sand, with the bed's own sloping normal". "Hit the reef" becomes a ride-end reason. Hold-downs and injuries stay in P11 (spec decision 9).
- Sound uses the existing synthesised sounds; recordings only with the user's approval (spec decision 11).
- Other spots' contact and sound are unchanged: sand, and a bed normal that is vertical on a flat bed.
- Online: contact must be the same for every player. Material and normal come from the spot and the solver's bed alone.
- English only. Merges are left to the user. Performance is measured, never a gate.
- Downloads (the lab profile `Profile_Teahupoo.txt`, coral textures) only with the user's explicit approval. Without it, the lagoon's depth and width stay provisional.

## Review Focus

1. **The other spots' contact is unchanged.** A board or body on sand over a flat bed behaves bit for bit as before: the new along-normal math must reduce exactly to today's vertical contact. Tests in Tasks 3 and 4.
2. **A body or board on steep, drying reef** (the 1:2.29 forereef or ledge, or the crest when a trough drains it) settles without jitter, NaN or tunnelling. Tests in Tasks 3 and 4.
3. **"Hit the reef" has no false positives:**
   - a board grounding gently in shallow water while paddling ends nothing;
   - a fall far from the reef keeps its own reason.

   Tests in Task 5.
4. **The lagoon and pass hold under the Big swell at low tide:** finite, and no run-up faster than today's pass face (21–26 m/s at game size). Tests and a measurement in Task 6.
5. **A small lip's crash sounds as before;** only bigger ones deepen, and loudness is unchanged. Test in Task 7.

---

### Task 1: The Part C sources

**Files:**
- Modify: `docs/research/teahupoo-reef-sources.md` (a "Part C: the solid reef, the lagoon, the crash" section and its rulings table)

**Interfaces:**
- Produces: the rulings table's values, used verbatim by Tasks 3–7:
  - `REEF_FRICTION.board` and `REEF_FRICTION.body` (Coulomb μ on wet reef);
  - `REEF_STRIKE_SPEED` (m/s);
  - `REEF_STRIKE_WINDOW` (s);
  - `REEF.flatWidth` and `REEF.lagoonDepth` (m);
  - `REEF.inlandSlope` (1 / 9.64);
  - `CRASH_SIZE_REFERENCE` (m³);
  - `CRASH_RATE_MIN`.

- [ ] **Step 1: Research, and record each value with its source or "provisional"**

Find and read, citing each in the section:
- **Friction of a surfboard** (waxed fibreglass or epoxy, foam) and of wetsuit neoprene or skin **on wet rough rock or coral**, against sand. If no measurement is found:
  - `REEF_FRICTION.board = 0.8` and `REEF_FRICTION.body = 0.8`, **provisional**: "grippier than sand" per the spec, against the sand's 0.6.
- **The Teahupo'o lab model's profile** (Rodríguez-Burguette, Torres-Freyermuth et al., zenodo 11392175 and 10826397, CC-BY, 1:60 scale):
  - Its record page states "a reef lagoon and planar slope (1/9.64) inland", so `REEF.inlandSlope = 1 / 9.64` is sourced.
  - The lagoon's depth and the reef flat's width are only in `Profile_Teahupoo.txt`. **Do not download it without the user's approval.** With approval, read them from it at 1:60.
  - Without approval: `REEF.flatWidth = 20` and `REEF.lagoonDepth = 2.5`, **provisional**.
- **How a crash's pitch follows its size.** Minnaert (1933): a bubble's resonance f₀ = (1/2πR)·√(3γp/ρ), inversely proportional to its radius. For the same shape, the air a lip traps scales with its volume V as R ∝ V^(1/3). So pitch ∝ V^(−1/3). The rest is by ear:
  - `CRASH_SIZE_REFERENCE = 0.5` m³ (about a Practice lip's gathered water, **provisional**);
  - `CRASH_RATE_MIN = 0.5` (at most an octave down, **provisional**).
- **A strike that ends a ride:** `REEF_STRIKE_SPEED = 1` m/s of approach along the bed normal and `REEF_STRIKE_WINDOW = 0.25` s, **provisional** unless a source on board-reef impacts is found.

- [ ] **Step 2: Commit**

```bash
git add docs/research/teahupoo-reef-sources.md
git commit -m "docs: the solid reef, the lagoon and the crash's pitch: Part C sources and rulings"
```

Expected: the section exists with a rulings table naming each value above, sourced or provisional.

---

### Task 2: The bed's normal and material in every water sample

**Files:**
- Modify: `src/wave/Bathymetry.ts` (`BedMaterial`, `SurfSpot.materialAt`, the Reef's material)
- Modify: `src/physics/SurfWater.ts` (`WaterSample.bedNormalX/Y/Z`, `bedMaterial`)
- Modify: `src/physics/PlaneWater.ts` (fills them: the plane's normal, `o.bedMaterial ?? 'sand'`)
- Modify: `src/physics/PhysicalSurfWater.ts` (the bed's gradient and the spot's material)
- Modify: `src/physics/DetachedSurfer.ts` (`BodyWaterSample.bedNormal`, `bedMaterial`)
- Modify: `src/physics/SurfWaterBodyField.ts`, `src/physics/PhysicalBodyWaterField.ts` (copy or fill them)
- Test: `src/wave/Bathymetry.test.ts`, `src/physics/PhysicalSurfWater.test.ts`

**Interfaces:**
- Produces:
  - `export type BedMaterial = 'sand' | 'reef';`
  - `SurfSpot.materialAt?(x: number, z: number): BedMaterial` (absent means sand);
  - `WaterSample.bedNormalX/bedNormalY/bedNormalZ: number` (unit, `createWaterSample` gives 0, 1, 0);
  - `WaterSample.bedMaterial?: BedMaterial`;
  - `BodyWaterSample.bedNormal?: Vector3`, `BodyWaterSample.bedMaterial?: BedMaterial`;
  - `PlaneOptions.bedMaterial?: BedMaterial`;
  - `PhysicalSurfWaterOptions.materialAt?: (x: number, z: number) => BedMaterial`.

- [ ] **Step 1: Write the failing tests**

In `Bathymetry.test.ts`, inside `describe("the Teahupo'o Reef", ...)`:

```ts
    it('is reef where the reef builds the bed, and sand in the pass and on the beach', () => {
      expect(reef.materialAt!(-40, reefCrestZ(-40))).toBe('reef');
      expect(reef.materialAt!(0, -120)).toBe('reef'); // the shelf
      expect(reef.materialAt!(0, REEF.shelfEdge - 20)).toBe('reef'); // the forereef
      expect(reef.materialAt!(REEF.passX, -140)).toBe('sand');
      expect(reef.materialAt!(0, -2)).toBe('sand');
      expect(createSpot('beach', 1).materialAt).toBeUndefined();
    });
```

In `PhysicalSurfWater.test.ts` (it already builds simulations; reuse its `small` config and imports):

```ts
  it('gives each sample its bed\'s normal and material: reef on the Reef\'s ledge, sand elsewhere', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'reef', dx: 1, fineSpacing: 1 });
    const water = PhysicalSurfWater.forSimulation(simulation);
    const x = -10;
    const z = reefCrestZ(x) - 4; // on the ledge, seaward of the crest
    const sample = water.sampleAt(x, -1, z, createWaterSample());
    const step = 0.5;
    const gx = (simulation.bedAt(x + step, z) - simulation.bedAt(x - step, z)) / (2 * step);
    const gz = (simulation.bedAt(x, z + step) - simulation.bedAt(x, z - step)) / (2 * step);
    const norm = Math.hypot(gx, 1, gz);
    expect(sample.bedNormalX).toBeCloseTo(-gx / norm, 2);
    expect(sample.bedNormalY).toBeCloseTo(1 / norm, 2);
    expect(sample.bedNormalZ).toBeCloseTo(-gz / norm, 2);
    expect(sample.bedMaterial).toBe('reef');
    const beach = PhysicalSurfWater.forSimulation(new SurfZoneSimulation({ ...small, spot: 'beach' }));
    expect(beach.sampleAt(0, -1, -60, createWaterSample()).bedMaterial).toBe('sand');
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/wave/Bathymetry.test.ts src/physics/PhysicalSurfWater.test.ts -t "material"`
Expected: FAIL (`materialAt` is undefined; `bedNormalX` is undefined).

- [ ] **Step 3: Implement**

`Bathymetry.ts`:

```ts
/** What a bed is made of, for contact (the Teahupo'o Reef, Part C). */
export type BedMaterial = 'sand' | 'reef';

export interface SurfSpot {
  readonly name: SpotName;
  depthAt(x: number, z: number): number;
  /** Absent: sand everywhere. */
  materialAt?(x: number, z: number): BedMaterial;
}
```

In `reef()`, return `materialAt` beside `depthAt`. Reef rock is wherever the reef's own terms set the bed: out of the pass (its Gaussian under ½) and seaward of the beach face.

```ts
    materialAt(x, z) {
      const r = REEF;
      const pass = Math.exp(-(((x - r.passX) / r.passHalfWidth) ** 2));
      const beachFace = z < 0 ? -z * r.shoreSlope : -z * 0.06;
      const fore = z >= r.shelfEdge ? r.shelfDepth : Math.min(r.deep, r.shelfDepth + (r.shelfEdge - z) * r.foreSlope);
      const ledge = r.crestDepth + Math.max(0, reefSeaward(x, z)) * r.ledgeSlope;
      const onReef = z >= r.shelfEdge ? Math.min(r.shelfDepth, ledge) : fore;
      return pass < 0.5 && onReef < beachFace ? 'reef' : 'sand';
    },
```

Task 6 moves this to the lagoon's rule. Keep the helper expressions identical to `depthAt`'s. Extract a shared `reefTerms(x, z)` returning `{ pass, onReef, beachFace }` and use it in both, so they can't drift.

`SurfWater.ts`: add to `WaterSample`, with the doc comment "The seabed's unit normal (up on a flat bed), and what it is made of (absent: sand)":

```ts
  bedNormalX: number;
  bedNormalY: number;
  bedNormalZ: number;
  bedMaterial?: BedMaterial;
```

Give `createWaterSample()` `bedNormalX: 0, bedNormalY: 1, bedNormalZ: 0, bedMaterial: 'sand'`. Import `type BedMaterial` from `../wave/Bathymetry`.

`PlaneWater.ts`: the bed is parallel to the surface plane. Add `bedMaterial?: BedMaterial` to `PlaneOptions`, and in `sampleAt`'s `Object.assign`:

```ts
      bedNormalX: -slopeX / norm, bedNormalY: 1 / norm, bedNormalZ: -slopeZ / norm, bedMaterial: this.o.bedMaterial ?? 'sand',
```

`PhysicalSurfWater.ts`:
- Add `materialAt?: (x: number, z: number) => BedMaterial` to its options.
- In `forSimulation`, pass `materialAt: simulation.spot.materialAt ? (x, z) => simulation.spot.materialAt!(x, z) : undefined`.
- In `sampleAt`, after `out.bedY = bottom;`:

```ts
    // The bed's normal from its gradient across half a cell each way (the solver's own bed, levelled at open edges).
    const half = 0.5 * solver.dx;
    const gx = (solver.sampleCentered(bed, x + half, z) - solver.sampleCentered(bed, x - half, z)) / (2 * half);
    const gz = (solver.sampleCentered(bed, x, z + half) - solver.sampleCentered(bed, x, z - half)) / (2 * half);
    const norm = Math.hypot(gx, 1, gz);
    out.bedNormalX = -gx / norm;
    out.bedNormalY = 1 / norm;
    out.bedNormalZ = -gz / norm;
    out.bedMaterial = this.options.materialAt ? this.options.materialAt(x, z) : 'sand';
```

In `flatSea(out)` (the outside path), set the normal to (0, 1, 0) and the material to `'sand'`.

`DetachedSurfer.ts` `BodyWaterSample`: add `bedNormal?: Vector3; bedMaterial?: BedMaterial;` (absent means vertical, sand).
- `SurfWaterBodyField.sampleAt`: `out.bedNormal = (out.bedNormal ?? new Vector3()).set(sample.bedNormalX, sample.bedNormalY, sample.bedNormalZ); out.bedMaterial = sample.bedMaterial ?? 'sand';`
- `PhysicalBodyWaterField.sampleAt`: it already computes `bedSlopeX/bedSlopeZ` at lines 82–83. Move that computation above the wet check, then set `out.bedNormal` from it the same way, and `out.bedMaterial = this.simulation.spot.materialAt?.(x, z) ?? 'sand'`. Outside the domain: vertical, sand.

- [ ] **Step 4: Run to verify they pass, and the physics suites stay green**

Run: `npx vitest run src/wave/Bathymetry.test.ts src/physics`
Expected: PASS (the new tests; every existing physics test unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/wave/Bathymetry.ts src/wave/Bathymetry.test.ts src/physics/SurfWater.ts src/physics/PlaneWater.ts src/physics/PhysicalSurfWater.ts src/physics/PhysicalSurfWater.test.ts src/physics/DetachedSurfer.ts src/physics/SurfWaterBodyField.ts src/physics/PhysicalBodyWaterField.ts
git commit -m "feat: every water sample says what the bed is made of and which way it faces"
```

---

### Task 3: The board meets the reef along its normal

**Files:**
- Modify: `src/physics/BoardBody.ts` (`resolveBed` along the bed normal, friction by material, `reefStrikeAge`)
- Test: `src/physics/BoardBody.test.ts`

**Interfaces:**
- Consumes: `WaterSample.bedNormalX/Y/Z`, `bedMaterial` (Task 2); `REEF_FRICTION.board` and `REEF_STRIKE_SPEED` (Task 1).
- Produces: `BoardBody.reefStrikeAge: number`, the seconds since a point of the board last struck reef faster than `REEF_STRIKE_SPEED` along the bed normal. It is `Infinity` if never, and `place` resets it as it resets the board's motion.

- [ ] **Step 1: Write the failing tests** (Review Focus 1 and 2)

```ts
describe('the board on a solid reef (Teahupo\'o Reef, Part C)', () => {
  // A board resting on dry ground sloping up toward +z at `slope`, of `bedMaterial`.
  const settle = (slope: number, bedMaterial: 'sand' | 'reef', seconds = 3) => {
    const water = new PlaneWater({ slopeZ: slope, depth: 0, bedMaterial });
    const board = new BoardBody();
    board.place(new Vector3(0, 0.3, 0));
    for (let t = 0; t < seconds; t += 1 / 120) board.step(1 / 120, water);
    return board;
  };

  it('pushes back along the bed\'s own normal', () => {
    const board = settle(0.3, 'reef', 1);
    const n = new Vector3(0, 1, -0.3).normalize();
    const f = board.forces.bed.clone().normalize();
    // The contact holds the board up the slope's normal, not straight up.
    expect(f.dot(n)).toBeGreaterThan(0.98);
  });

  it('holds on reef where it slides on sand: reef grips harder', () => {
    // A slope between the two frictions: tan θ between 0.6 (sand) and REEF_FRICTION.board.
    const slope = (0.6 + REEF_FRICTION.board) / 2;
    const onSand = settle(slope, 'sand');
    const onReef = settle(slope, 'reef');
    expect(Math.abs(onReef.velocity.z)).toBeLessThan(0.05);
    expect(Math.abs(onSand.velocity.z)).toBeGreaterThan(0.2);
    expect(Number.isFinite(onReef.centerOfMass.y)).toBe(true);
  });

  it('rests on a flat sand bed exactly as before', () => {
    // The pre-Part-C contact, reproduced: the same state after the same steps on a flat, dry sand bed.
    const board = settle(0, 'sand', 1);
    expect(board.forces.bed.x).toBe(0);
    expect(board.forces.bed.z).toBe(0);
  });

  it('marks a strike on reef, and not a touch on sand', () => {
    const reefWater = new PlaneWater({ depth: 0, bedMaterial: 'reef' });
    const board = new BoardBody();
    board.place(new Vector3(0, 1.2, 0));
    for (let t = 0; t < 1; t += 1 / 120) board.step(1 / 120, reefWater);
    expect(board.reefStrikeAge).toBeLessThan(1);
    const sandWater = new PlaneWater({ depth: 0 });
    const onSand = new BoardBody();
    onSand.place(new Vector3(0, 1.2, 0));
    for (let t = 0; t < 1; t += 1 / 120) onSand.step(1 / 120, sandWater);
    expect(onSand.reefStrikeAge).toBe(Infinity);
  });
});
```

Import `REEF_FRICTION` from `./BoardBody`. Before writing the third test's expectations, run the existing BoardBody tests once on the current code and read the flat-bed contact tests there: the exactness guarantee is that every existing BoardBody and DetachedSurfer test passes unchanged.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/physics/BoardBody.test.ts -t "solid reef"`
Expected: FAIL (`REEF_FRICTION` is not exported; the force is vertical; `reefStrikeAge` is undefined).

- [ ] **Step 3: Implement**

Beside `BED_FRICTION`:

```ts
/** Wet reef grips harder than sand (the Teahupo'o Reef, Part C; docs/research/teahupoo-reef-sources.md). */
export const REEF_FRICTION = { board: /* Task 1's value */ 0.8, body: /* Task 1's value */ 0.8 } as const;
/** A strike on reef: the approach speed along the bed normal that counts, m/s (Task 1). */
export const REEF_STRIKE_SPEED = 1;
```

Add the field `reefStrikeAge = Infinity;`, reset it in `place` (line ~412), and advance it by `h` at the top of `resolveBed`.

Rewrite `resolveBed`'s inner loop along each sample's bed normal `n = (bnx, bny, bnz)`. It keeps `bedImpulse[slot + 1]` as the accumulated **normal** impulse, and slots 0 and 2 as the tangent impulses along `t1`, `t2`:
- `t1` is x with its component along n removed, normalised;
- `t2 = t1 × n`.

For n = (0, 1, 0): t1 = x and t2 = z, and every expression below reduces to today's.

```ts
        const sample = samples[k];
        const nx = sample.bedNormalX, ny = sample.bedNormalY, nz = sample.bedNormalZ;
        const reef = sample.bedMaterial === 'reef';
        const mu = reef ? REEF_FRICTION.board : BED_FRICTION;
        // Tangents: x with its n part removed, then t2 = t1 × n (x and z on a flat bed).
        let t1x = 1 - nx * nx, t1y = -nx * ny, t1z = -nx * nz;
        const t1n = Math.hypot(t1x, t1y, t1z);
        t1x /= t1n; t1y /= t1n; t1z /= t1n;
        const t2x = t1y * nz - t1z * ny, t2y = t1z * nx - t1x * nz, t2z = t1x * ny - t1y * nx;
        // ... per face, as today, with r = (rx, ry, rz):
          const penetration = (bed - (this.centerOfMass.y + ry)) * ny;
          if (!(penetration > 0) && bedImpulse[slot + 1] === 0) continue;
          const pvx = v.x + w.y * rz - w.z * ry, pvy = v.y + w.z * rx - w.x * rz, pvz = v.z + w.x * ry - w.y * rx;
          const vn = pvx * nx + pvy * ny + pvz * nz;
          if (reef && iteration === 0 && penetration > 0 && -vn > REEF_STRIKE_SPEED) this.reefStrikeAge = 0;
          const target = (BED_BIAS * Math.max(0, penetration - BED_SLOP)) / h;
          const inverse = this.inverseEffective(rx, ry, rz, nx, ny, nz);
          const total = Math.max(0, bedImpulse[slot + 1] + (target - vn) / inverse);
          const normalImpulse = total - bedImpulse[slot + 1];
          bedImpulse[slot + 1] = total;
          if (normalImpulse !== 0) this.bedWork(rx, ry, rz, nx * normalImpulse, ny * normalImpulse, nz * normalImpulse);
          // Coulomb friction in the bed's plane, within the cone of the accumulated normal impulse.
          const qvx = v.x + w.y * rz - w.z * ry, qvy = v.y + w.z * rx - w.x * rz, qvz = v.z + w.x * ry - w.y * rx;
          const v1 = qvx * t1x + qvy * t1y + qvz * t1z;
          const v2 = qvx * t2x + qvy * t2y + qvz * t2z;
          if (!(Math.hypot(v1, v2) > 0) && bedImpulse[slot] === 0 && bedImpulse[slot + 2] === 0) continue;
          let f1 = bedImpulse[slot] - v1 / this.inverseEffective(rx, ry, rz, t1x, t1y, t1z);
          let f2 = bedImpulse[slot + 2] - v2 / this.inverseEffective(rx, ry, rz, t2x, t2y, t2z);
          const limit = mu * total;
          const magnitude = Math.hypot(f1, f2);
          if (magnitude > limit) { f1 *= limit / magnitude; f2 *= limit / magnitude; }
          const i1 = f1 - bedImpulse[slot];
          const i2 = f2 - bedImpulse[slot + 2];
          bedImpulse[slot] = f1;
          bedImpulse[slot + 2] = f2;
          if (i1 !== 0 || i2 !== 0) this.bedWork(rx, ry, rz, i1 * t1x + i2 * t2x, i1 * t1y + i2 * t2y, i1 * t1z + i2 * t2z);
```

Keep the `touching` pre-check as it is: it is vertical and conservative. Update the class comment's "Not modelled yet" line: the sloping seabed normal is now modelled.

- [ ] **Step 4: Run to verify they pass, and every physics test stays green**

Run: `npx vitest run src/physics`
Expected: PASS, including every pre-existing BoardBody, RideSession and AttachedRider test (Review Focus 1).

- [ ] **Step 5: Commit**

```bash
git add src/physics/BoardBody.ts src/physics/BoardBody.test.ts
git commit -m "feat: the board meets the bed along its normal, and wet reef grips harder than sand"
```

---

### Task 4: The body meets the reef along its normal

**Files:**
- Modify: `src/physics/DetachedSurfer.ts` (per-node bed normal and material; the floor along the normal on reef, with Coulomb friction)
- Test: `src/physics/DetachedSurfer.test.ts`

**Interfaces:**
- Consumes: `BodyWaterSample.bedNormal`, `bedMaterial` (Task 2); `REEF_FRICTION.body` (Task 3's export).

- [ ] **Step 1: Write the failing tests** (Review Focus 1 and 2)

Build a dry reef slope as a `BodyWaterField`, the way the file's `dry` field does (lines ~238):

```ts
describe('the body on a solid reef (Teahupo\'o Reef, Part C)', () => {
  const slope = 0.44; // the 1:2.29 ledge
  const reefSlope: BodyWaterField = {
    sampleAt(position, out): void {
      out.surfaceY = -10; // dry: the water is far below
      out.bedY = slope * position.z;
      out.flow.set(0, 0, 0);
      out.wet = false;
      out.outsideDomain = false;
      out.breaking = 0;
      out.voidFraction = 0;
      out.bedNormal = (out.bedNormal ?? new Vector3()).set(0, 1, -slope).normalize();
      out.bedMaterial = 'reef';
    },
  };

  it('rests on a steep reef along its normal, without sliding or jitter', () => {
    const body = new DetachedSurfer();
    // The file's `launch` and `advance` helpers: dropped from 1.2 m over the slope at z = 0, three seconds of settling.
    launch(body, new Vector3(0, 1.2, 0));
    advance(body, reefSlope, 180);
    expect(Number.isFinite(body.centerOfMass().y)).toBe(true);
    // Every node sits on or above the slope's plane, along its normal.
    const n = new Vector3(0, 1, -slope).normalize();
    for (const node of body.nodes) expect(n.y * (node.position.y - slope * node.position.z)).toBeGreaterThan(node.radius - 0.02);
    // μ 0.8 > tan(23.7°) = 0.44: it holds.
    expect(Math.abs(body.linearMomentum().z / body.mass)).toBeLessThan(0.05);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/physics/DetachedSurfer.test.ts -t "solid reef"`
Expected: FAIL: the vertical floor lets the nodes slide down the slope (or sit below the plane along its normal).

- [ ] **Step 3: Implement**

- Keep per-node arrays beside `bedY`: `bedNormal: Vector3[]` (up by default) and `onReef: boolean[]`. Fill them where `bedY[index]` is filled (line ~539), from `this.sample.bedNormal` and `this.sample.bedMaterial === 'reef'`. Use up and sand when absent or outside the domain.
- In the constraint loop's floor pass:

```ts
        const node = this.nodes[index];
        if (this.onReef[index]) {
          // Rock: out along the bed's normal, with Coulomb friction on the move along it (position-based, Müller et al. 2007).
          const n = this.bedNormal[index];
          const penetration = node.radius - n.y * (node.position.y - this.bedY[index]);
          if (penetration > 0) {
            node.position.addScaledVector(n, penetration);
            node.grounded = true;
            const moved = this.scratch.subVectors(node.position, this.previous[index]);
            moved.addScaledVector(n, -moved.dot(n));
            const slide = moved.length();
            const hold = REEF_FRICTION.body * penetration;
            node.position.addScaledVector(moved, -(slide <= hold ? 1 : hold / slide));
          }
          continue;
        }
        const floor = this.bedY[index] + node.radius;
        if (node.position.y < floor) {
          node.position.y = floor;
          node.grounded = true;
        }
```

- In the velocity pass, grounded nodes on reef keep only a non-negative velocity along n (friction was applied in position). Sand keeps today's `vy ≥ 0`, `x, z × 0.8` exactly:

```ts
      if (node.grounded && this.onReef[index]) {
        const n = this.bedNormal[index];
        const into = node.velocity.dot(n);
        if (into < 0) node.velocity.addScaledVector(n, -into);
      } else if (node.grounded) {
        node.velocity.y = Math.max(0, node.velocity.y);
        node.velocity.x *= 0.8;
        node.velocity.z *= 0.8;
      }
```

Add a scratch `Vector3` field if the class has none free.

- [ ] **Step 4: Run to verify it passes, and every physics test stays green**

Run: `npx vitest run src/physics`
Expected: PASS (Review Focus 1: sand is unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/physics/DetachedSurfer.ts src/physics/DetachedSurfer.test.ts
git commit -m "feat: the body meets rock along the bed's normal, with Coulomb friction on reef"
```

---

### Task 5: "Hit the reef"

**Files:**
- Modify: `src/physics/AttachedRider.ts` (`RiderSeparation` gains `'reef'`; `relabelSeparation`)
- Modify: `src/physics/RideSession.ts` (relabel a separation that comes with a reef strike)
- Modify: `src/game/RideTracker.ts` (`FALL_REASONS.reef`)
- Modify: `src/ui/strings.ts` (`'ride.reason.reef': 'Hit the reef'`)
- Test: `src/physics/RideSession.test.ts`, `src/game/RideTracker.test.ts`

**Interfaces:**
- Consumes: `BoardBody.reefStrikeAge` (Task 3), `REEF_STRIKE_WINDOW` (Task 1).
- Produces:
  - `RiderSeparation = 'balance' | 'foot slip' | 'lost board' | 'impact' | 'reef'`;
  - `AttachedRider.relabelSeparation(cause: RiderSeparation): void`;
  - `FALL_REASONS.reef = 'ride.reason.reef'`.

- [ ] **Step 1: Write the failing tests** (Review Focus 3)

In `RideSession.test.ts` (import `type RideInput` from `./RideSession` and `PlaneWater` from `./PlaneWater` if the file lacks them):

```ts
describe('hitting the reef (Teahupo\'o Reef, Part C)', () => {
  it('names a fall that comes as the board strikes the reef "reef", and one in open water by its own cause', () => {
    const idle: RideInput = { paddle: false, popUp: false, steer: 0 };
    const session = new RideSession();
    const reef = new PlaneWater({ depth: 0.3, bedMaterial: 'reef' });
    session.place({ x: 0, z: 0, heading: 0, speed: 0, phase: 'standing' }, reef);
    // The board is driven down onto the reef: a strike, then the rider lets go in the same breath.
    session.board.velocity.y = -3;
    for (let t = 0; t < 0.1; t += 1 / 120) session.step(1 / 120, reef, idle);
    session.separate('impact');
    expect(session.separation).toBe('reef');
    const open = new RideSession();
    const deep = new PlaneWater({ depth: 3 });
    open.place({ x: 0, z: 0, heading: 0, speed: 0, phase: 'standing' }, deep);
    open.separate('balance');
    expect(open.separation).toBe('balance');
  });

  it('ends nothing when a paddler\'s board just touches the reef', () => {
    const session = new RideSession();
    const shallow = new PlaneWater({ depth: 0.15, bedMaterial: 'reef' });
    session.place({ x: 0, z: 0, heading: 0, speed: 0, phase: 'prone' }, shallow);
    for (let t = 0; t < 2; t += 1 / 120) session.step(1 / 120, shallow, { paddle: true, popUp: false, steer: 0 });
    expect(session.phase).not.toBe('fallen');
  });
});
```

In `RideTracker.test.ts`: `expect(FALL_REASONS.reef).toBe('ride.reason.reef');`

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/physics/RideSession.test.ts src/game/RideTracker.test.ts -t "reef"`
Expected: FAIL (`'reef'` is not a separation; `FALL_REASONS.reef` is undefined).

- [ ] **Step 3: Implement**

- `AttachedRider.ts`:
  - extend `RiderSeparation` with `'reef'`;
  - add `relabelSeparation(cause: RiderSeparation): void { if (!this.attached) this.separation = cause; }`, with the doc comment "Name a separation by what it came with (a reef strike, Part C); only once separated".
- `RideSession.ts`:
  - `export const REEF_STRIKE_WINDOW = 0.25;` (Task 1's value);
  - in `step()`, note `const wasAttached = rider.attached;` before the rider and board step, and after them: `if (wasAttached && !rider.attached && board.reefStrikeAge <= REEF_STRIKE_WINDOW) rider.relabelSeparation('reef');`;
  - in `separate(cause)`: `this.rider.release(cause); if (this.board.reefStrikeAge <= REEF_STRIKE_WINDOW) this.rider.relabelSeparation('reef');`.
- `RideTracker.ts`: `FALL_REASONS` gains `reef: 'ride.reason.reef'`.
- `strings.ts`: `'ride.reason.reef': 'Hit the reef',` next to the other ride reasons.
- Any other `Record<RiderSeparation, …>` the compiler flags (e.g. in `lessonFlow.ts`) gets its `reef` entry. A lesson treats it as a fall.

- [ ] **Step 4: Run to verify they pass; type-check**

Run: `npx vitest run src/physics src/game src/ui && npx tsc -b`
Expected: PASS; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/physics/AttachedRider.ts src/physics/RideSession.ts src/physics/RideSession.test.ts src/game/RideTracker.ts src/game/RideTracker.test.ts src/ui/strings.ts
git commit -m "feat: a fall that comes as the board strikes the reef ends the ride \"Hit the reef\""
```

---

### Task 6: The lagoon

**Files:**
- Modify: `src/wave/Bathymetry.ts` (`REEF.flatWidth`, `lagoonDepth`, `inlandSlope`; the reef flat, the lagoon and the inland slope in `depthAt`; `materialAt` and `reefLedgeAt` follow)
- Test: `src/wave/Bathymetry.test.ts`, `src/wave/SurfZoneSimulation.test.ts` (the lagoon's probe)
- Modify: `docs/research/teahupoo-reef-report.md` (a "Part C" section: the pass and lagoon under the Big swell; peel and catch rerun)

**Interfaces:**
- Consumes: Task 1's `REEF.flatWidth`, `REEF.lagoonDepth`, `REEF.inlandSlope`.
- Produces: the new Reef bed. `materialAt` is sand in the lagoon and on the inland slope. `reefLedgeAt(x)` uses the inland slope.

- [ ] **Step 1: Write the failing tests** (Review Focus 4)

In `Bathymetry.test.ts`, inside the Reef's describe:

```ts
    it('falls from its crest across a reef flat into a lagoon, then rises to the shore at 1:9.64', () => {
      const x = -60;
      const crest = reefCrestZ(x);
      const shoreward = (d: number) => {
        const radians = (REEF.angle * Math.PI) / 180;
        return { x: x - d * Math.sin(radians), z: crest + d * Math.cos(radians) };
      };
      const onFlat = shoreward(REEF.flatWidth / 2);
      expect(reef.depthAt(onFlat.x, onFlat.z)).toBeCloseTo(REEF.crestDepth, 6);
      expect(reef.materialAt!(onFlat.x, onFlat.z)).toBe('reef');
      const inLagoon = shoreward(REEF.flatWidth + 20);
      expect(reef.depthAt(inLagoon.x, inLagoon.z)).toBeCloseTo(REEF.lagoonDepth, 3);
      expect(reef.materialAt!(inLagoon.x, inLagoon.z)).toBe('sand');
      // The inland slope: 1:9.64 up to the shoreline at z = 0.
      expect(reef.depthAt(-60, -5)).toBeCloseTo(5 * REEF.inlandSlope, 9);
    });
```

In the same file, the existing checks move with the new inland slope; each change is a ruling:
- "meets a beach face and dry land shoreward of z = 0" takes `REEF.inlandSlope` in place of `REEF.shoreSlope`;
- the `reefLedgeAt` example columns follow.

Also keep "has no cliff anywhere in the window": the flat's fall into the lagoon must be no steeper than the ledge, 0.22 m per 0.5 m.

In `SurfZoneSimulation.test.ts`, inside `describe('the steep Reef holds', ...)`:

```ts
    // The pass and inner reef end in a lagoon (Part C): the Big swell no longer runs up a 1:5 face at the pass.
    it('stays finite over the lagoon at low tide', () => run({ tide: -1.0, alongShore: 60 }, 30), 300_000);
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/wave/Bathymetry.test.ts -t "lagoon"`
Expected: FAIL (`REEF.flatWidth` is undefined; the depth there is still the flat 1.5 m).

- [ ] **Step 3: Implement**

In `REEF`, with Task 1's values:

```ts
  flatWidth: 20, lagoonDepth: 2.5, inlandSlope: 1 / 9.64,
```

In `reef().depthAt`, shoreward of the crest:
- `d = −reefSeaward(x, z)` (metres shoreward of the crest line);
- the reef flat holds `crestDepth` for `d ≤ flatWidth`;
- the flat's inner edge falls to `lagoonDepth` no steeper than the ledge;
- the inland slope `−z · inlandSlope` replaces the 1:5 face, and the dry land shoreward of 0 stays.

```ts
      const inside = Math.max(0, -reefSeaward(x, z) - r.flatWidth);
      const lagoon = Math.min(r.lagoonDepth, r.crestDepth + inside * r.ledgeSlope);
      const ledge = r.crestDepth + Math.max(0, reefSeaward(x, z)) * r.ledgeSlope;
      const reefBed = reefSeaward(x, z) >= 0 ? ledge : lagoon;
      const onReef = z >= r.shelfEdge ? Math.min(r.shelfDepth, reefBed) : fore;
      // ... the pass blend as today, its floor meeting the lagoon shoreward:
      const depth = onReef + (Math.max(fore, r.passDepth) - onReef) * pass;
      return Math.min(depth, z < 0 ? -z * r.inlandSlope : -z * 0.06);
```

Update `materialAt` through the shared terms: reef where `pass < ½`, the bed is shallower than the inland slope, and the point is seaward of the flat's inner edge (`-reefSeaward ≤ flatWidth`). Sand in the lagoon, pass and beach.

`reefLedgeAt`: replace `shoreSlope` with `inlandSlope` in its crest-still-under-water condition.

Delete `shoreSlope` from `REEF` if nothing else reads it (grep first).

- [ ] **Step 4: Run to verify; the steep-Reef probes and the whole wave suite**

Run: `npx vitest run src/wave src/game`
Expected: PASS.

Every test whose expectation moves with the new inner reef gets a `Task 6: Ruling:` ledger line: the peel test's columns, the catch test's cues, the Wave Lab's lesson seas. A probe exceeding its bound is a finding: debug it (superpowers:systematic-debugging) before any bound moves.

- [ ] **Step 5: Measure, and write the report's Part C section**

- **The pass and lagoon under the Big swell at game size** (160 m window, 64 components, tides 0 / −0.6 / −1.0), with the same probe method as Part A's "At game size": the fastest water and where. Against Part A's 21–26 m/s on the pass's face.
- **Peel:** `npm run report:rideability -- --spots reef --hs 1.3 --tp 15 --direction 20 --spread 0.2 --seeds 2 --periods 12`, against Part A's 13.6 m/s, α 23°.
- **Catch:** `npm run report:catch -- --practice --ghosts --spots reef --seeds 2 --minutes 3`, against Part A's 14 stood, 2 rides ≥ 3 s.

Add these to `docs/research/teahupoo-reef-report.md` under "## Part C: the solid reef, the lagoon, the crash".

- [ ] **Step 6: Commit**

```bash
git add src/wave/Bathymetry.ts src/wave/Bathymetry.test.ts src/wave/SurfZoneSimulation.test.ts docs/research/teahupoo-reef-report.md
git commit -m "feat: the Reef's pass and inner reef end in a lagoon, rising to the shore at 1:9.64"
```

---

### Task 7: A bigger lip crashes deeper

**Files:**
- Modify: `src/audio/soundMapping.ts` (impulses carry their water; a lip's one-shot rate follows the water it gathered)
- Test: `src/audio/soundMapping.test.ts`

**Interfaces:**
- Consumes: Task 1's `CRASH_SIZE_REFERENCE` and `CRASH_RATE_MIN`.
- Produces: `Impulse.size?: number` (m³, lip impulses) and `Gathered.size`. A lip one-shot's `rate = clamp((CRASH_SIZE_REFERENCE / size)^(1/3), CRASH_RATE_MIN, 1)`.

- [ ] **Step 1: Write the failing test** (Review Focus 5)

In `soundMapping.test.ts`:

```ts
  it('crashes a bigger lip deeper, a small one as before, and as loud as its energy either way', () => {
    // Two single crashes of equal energy (volume × speed²): 0.2 m³ at 10 m/s, and 8 m³ at 1.58 m/s. The file's `frame` and `lipHits` helpers.
    const small = soundTargets(frame(lipHits([{ x: 3, z: -30, volume: 0.2, speed: 10 }])));
    const big = soundTargets(frame(lipHits([{ x: 3, z: -30, volume: 8, speed: 10 / Math.sqrt(40) }])));
    const smallShot = small.oneShots.find((shot) => shot.id === 'lipJet' || shot.id === 'lipRoller')!;
    const bigShot = big.oneShots.find((shot) => shot.id === 'lipJet' || shot.id === 'lipRoller')!;
    expect(smallShot.rate).toBe(1);
    expect(bigShot.rate).toBeCloseTo(Math.max(CRASH_RATE_MIN, (CRASH_SIZE_REFERENCE / 8) ** (1 / 3)), 9);
    expect(bigShot.gain).toBeCloseTo(smallShot.gain, 9);
  });
```

Import `CRASH_SIZE_REFERENCE` and `CRASH_RATE_MIN` from `./soundMapping`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/audio/soundMapping.test.ts -t "deeper"`
Expected: FAIL (the big lip's rate is 1).

- [ ] **Step 3: Implement**

```ts
// Minnaert (1933): a bubble rings at a frequency inversely proportional to its radius, and a lip's trapped air scales
// with its water, so its crash's pitch goes as V^(−1/3): the Teahupo'o Reef, Part C (reference and floor provisional).
export const CRASH_SIZE_REFERENCE = 0.5;
export const CRASH_RATE_MIN = 0.5;
```

- `Impulse` gains `size?: number`. The lip loop pushes `size: volume`.
- `Gathered` gains `size` (summed in `release` like `amount`).
- The one-shot loop sets `rate: gathered.id === 'lipJet' || gathered.id === 'lipRoller' ? Math.min(1, Math.max(CRASH_RATE_MIN, Math.cbrt(CRASH_SIZE_REFERENCE / Math.max(gathered.size, 1e-9)))) : 1`.

- [ ] **Step 4: Run to verify it passes; the audio suite stays green**

Run: `npx vitest run src/audio`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/audio/soundMapping.ts src/audio/soundMapping.test.ts
git commit -m "feat: a bigger lip's crash sounds deeper, its pitch falling as its water's cube root"
```

---

### Task 8: Roadmap, the full suite, the PR

**Files:**
- Modify: `ROADMAP.md` (the Teahupo'o Reef's Part C line)

- [ ] **Step 1: The full suite, type-check and build**

Run: `npx vitest run --dir src && npx tsc -b && npm run build`
Expected: all pass (15 expected-fail as today).

- [ ] **Step 2: The roadmap**

Part C's line:
- **Done:** the solid reef, "Hit the reef", the lagoon, the deeper crash.
- **Waiting:** the look, for the swept surface and the coral textures' approval.
- **Open:** the film and the user's look.

- [ ] **Step 3: Commit, push, PR**

```bash
git add ROADMAP.md
git commit -m "docs: the Teahupo'o Reef's Part C on the roadmap"
git push -u origin claude/teahupoo-reef-c
gh pr create --base main --title "Teahupo'o Reef, Part C: the solid reef, the lagoon and the deeper crash" --body-file <scratchpad>/pr-body-c.md
```

The PR is left for the user to merge.
