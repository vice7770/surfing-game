# G7 Part A: Characters and Sky Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the primitive surfer with four semi-realistic skinned surfers driven by the physics through IK, dress the board in real materials and fins, light the scene from Poly Haven photo skies, and add shadows, the wet look and paddle splashes.

**Architecture:**
- **Offline assets:** a headless Blender + MPFB2 script builds four MakeHuman bodies on MPFB's Mixamo skeleton, and gltfpack compresses them. A Node script downloads three pure-sky HDRIs, moves the sun's energy out of each HDR into a measured directional light, and writes a manifest.
- **Rig:** at run time, a `HumanoidRig` solves the skeleton each frame from the worker snapshot's seven rider points (`RIDER_SNAPSHOT`) with analytic two-bone IK. A code-driven layer sets knee and elbow directions, head look, chest twist and hand shape.
- **Outfits** are per-vertex coverage values computed from bone cut planes, mixed into the skin in the material shader.
- **Sky and shadows:** `PhotoSky` owns the background, the environment map and the sun, and `ShadowRig` owns the four shadow levels.

**Tech Stack:** three r186 (WebGLRenderer, GLTFLoader, MeshoptDecoder, KTX2Loader, HDRLoader, SkinnedMesh), TypeScript, Vitest, Blender 5.2 + MPFB 2 (Python), gltfpack (npm), Poly Haven API, macOS `sips`.

**Spec:** [G7 · Characters and sky](../specs/2026-09-26-g7-characters-and-sky.md)

## Global Constraints

- **Renderer:** stays `WebGLRenderer`; no TSL, no `WebGPURenderer`.
- **Stay out of P8's files:** `src/game/Controls.ts`, `index.html`, `style.css`, `src/ui/`, and `main.ts`'s page (DOM) wiring. Scene wiring in `main.ts` is a few lines.
- **Physics is the authority:**
  - the rig reads only `RIDER_SNAPSHOT` (seven points, phase, heading) and the board pose;
  - the board geometry stays `buildBoardShape()`'s;
  - fins come from `THRUSTER`;
  - no leash is drawn;
  - splashes come from the stroke impulse.
- **Licences:** CC0 / CC-BY / Mixamo only; every asset is listed in `docs/ASSETS.md`. No AI-generated character.
- **Assets:** stored in `public/assets/` in plain git. Only the chosen surfer and the current sky load. Sizes are measured and recorded, never a gate.
- **Fallback:** the primitive `Surfer` is the fallback while assets load and if they fail. The legacy wave keeps the primitive surfer.
- **Players:** English only; no new player-facing text in Part A (the picker is Part B).
- **Performance** is measured, never a gate (reference machine: M4 Pro).
- **Dependencies:** `gltfpack` is added as a devDependency (asset scripts only). No new runtime dependencies.

## Review Focus

1. **The rider far from the origin** (the physical tank sits hundreds of metres out): a skinned mesh keeps its bind-pose bounding sphere, so it gets culled. Set `frustumCulled = false` on every skinned mesh (Task 7 test).
2. **A pelvis point higher than the legs can reach** (a shorter preset on the reference posture): the feet must stay on the deck and the hips come down (Task 5 test "keeps the feet on the deck when the legs are too short").
3. **Degenerate directions:**
   - a fallen body lying exactly along its heading;
   - a foot target on the hip joint;
   - a pole parallel to the reach.

   None may produce NaN (tests in Tasks 4 and 5).
4. **The asset fetch failing** (offline, 404): the game must keep the primitive surfer and the gradient sky, with a console warning and no crash (Task 7 and Task 3 tests).
5. **Sun convention mismatch:** the visible sun in the photo and the directional light must agree. There is a pure test of the rotation (Task 3) and a browser check that the water's sun glint lines up with the photo's sun (Task 3 Step 6).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `scripts/assets/skyMath.ts` (+ test) | RGBE parse/encode, equirect directions, sun extraction and irradiance (build time) |
| `scripts/assets/fetch-skies.ts` | Download the three HDRIs and backgrounds, extract suns, write `public/assets/skies/skies.json` |
| `scripts/assets/build_surfers.py` | Blender + MPFB2: build the four bodies on the Mixamo rig, export raw GLBs |
| `scripts/assets/surfers.json` | The four recipes (macros, skin, hair, eyebrows, LOD proxy) |
| `scripts/assets/pack-surfers.mjs` | gltfpack meshopt + KTX2, the basis transcoder copy, `public/assets/surfers/surfers.json` |
| `docs/ASSETS.md` | Every asset's source, author, licence and size |
| `src/scene/PhotoSky.ts` (+ `photoSky.test.ts`) | Load a sky: background, PMREM environment, rotation, sun light; the slider mapping |
| `src/scene/rig/twoBoneIk.ts` (+ test) | Analytic two-bone IK |
| `src/scene/rig/orientBone.ts` (+ test) | Set a bone's world orientation from an axis and a hint |
| `src/scene/rig/humanoidBones.ts` | Mixamo bone names as three.js sanitises them; the required list |
| `src/scene/rig/riderVisualState.ts` (+ test) | The rig's input, decoded from the snapshot |
| `src/scene/rig/posturePoints.ts` | The seven drawn points for a posture on a board (dev sheet and tests) |
| `src/scene/rig/testHumanoid.ts` | A synthetic Mixamo-named skeleton for tests |
| `src/scene/rig/HumanoidRig.ts` (+ test) | Solve the skeleton from a `RiderVisualState` |
| `src/scene/character/outfits.ts` (+ test) | Outfit rules and per-vertex coverage |
| `src/scene/character/surferMaterial.ts` | The wet skin and outfit shader injection |
| `src/scene/character/SkinnedSurfer.ts` (+ test) | Load a preset GLB, bind the rig and materials, LOD |
| `src/scene/character/SurferView.ts` | The fallback wrapper `PhysicalMode` draws |
| `src/scene/character/surferAssets.test.ts` | The committed GLBs carry the required bones, skins and LODs |
| `src/scene/board/boardDesigns.ts` (+ test) | Board designs and their texture pixels |
| `src/scene/board/finGeometry.ts` (+ test) | Fin outline from `THRUSTER`'s depth and area |
| `src/scene/BoardMesh.ts` (+ test) | UVs, resin/wax materials, traction pad, fins |
| `src/scene/ShadowRig.ts` (+ test) | Shadow levels, the light's frustum following the rider, the blob, PCSS |
| `src/physics/AttachedRider.ts` | Expose the step's stroke impulses (`strokes`) |
| `src/wave/SprayCloud.ts` (+ test) | `strokeSplash`: drops from a hand stroke |
| `src/wave/SurfZoneRunner.ts` | Feed the strokes to the spray |
| `src/game/PhysicalMode.ts` | Draw `SurferView` and the dressed board; shadow receivers |
| `src/scene/Environment.ts` | `showSky(visible)` |
| `src/main.ts` | Construct `PhotoSky` and `ShadowRig`; the sun follows the photo; tone mapping |
| `character-sheet.html`, `src/dev/characterSheet.ts` | The screenshot sheet |
| `ROADMAP.md` | G7 entry and Backlog items |

---

### Task 1: Asset toolchain and skies download

**Files:**
- Create: `scripts/assets/skyMath.ts`, `scripts/assets/skyMath.test.ts`, `scripts/assets/fetch-skies.ts`, `docs/ASSETS.md`
- Modify: `.gitignore`, `package.json`

**Interfaces:**
- Produces: `public/assets/skies/skies.json`:
  ```json
  { "skies": [ { "id": "qwantani_dawn_puresky", "timeOfDay": "dawn",
    "hdr": "skies/qwantani_dawn_puresky_1k.hdr", "background": "skies/qwantani_dawn_puresky.jpg",
    "sun": { "direction": [x, y, z], "irradiance": [r, g, b] },
    "skyIrradiance": number, "author": "...", "licence": "CC0", "source": "https://polyhaven.com/a/<id>" } ] }
  ```
  - `sun.direction` is in three's equirect convention with no rotation.
  - `irradiance` is the sun's removed energy (W/m²-like units of the HDR).
  - `skyIrradiance` is the horizontal irradiance of the sky without the sun.

- [ ] **Step 1: Ignore caches and add scripts**

`.gitignore` gains `scripts/assets/.cache/` and `scripts/assets/.build/`. `package.json` scripts gain:

```json
"assets:skies": "rolldown scripts/assets/fetch-skies.ts -o dist/scripts/fetch-skies.mjs --format esm --platform node && node dist/scripts/fetch-skies.mjs",
"assets:surfers": "/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/assets/build_surfers.py && node scripts/assets/pack-surfers.mjs"
```

Run `npm install --save-dev gltfpack`.

- [ ] **Step 2: Write the failing sky-math tests** (`scripts/assets/skyMath.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { directionAt, encodeHdr, extractSun, parseHdr, pixelSolidAngle, type HdrImage } from './skyMath';

function skyWithSun(width: number, height: number, sunCol: number, sunRow: number): HdrImage {
  const data = new Float32Array(width * height * 3).fill(1);
  for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) {
    const i = ((sunRow + dr) * width + sunCol + dc) * 3;
    data[i] = 5000; data[i + 1] = 4000; data[i + 2] = 3000;
  }
  return { width, height, data };
}

describe('sky math', () => {
  it('round-trips RGBE within its 1% mantissa', () => {
    const image: HdrImage = { width: 4, height: 2, data: new Float32Array([0.5, 1, 2, 10, 20, 40, 0, 0, 0, 1e4, 1, 0.01, 3, 3, 3, 0.2, 0.3, 0.4, 7, 8, 9, 1, 1, 1]) };
    const back = parseHdr(encodeHdr(image));
    expect(back.width).toBe(4);
    for (let i = 0; i < image.data.length; i += 1) expect(back.data[i]).toBeCloseTo(image.data[i], image.data[i] > 1 ? -Math.log10(image.data[i] * 0.02) : 2);
  });

  it('maps the top row to straight up and the middle column to three’s −x seam convention', () => {
    expect(directionAt(0.5, 0, 64, 32).y).toBeGreaterThan(0.99);
    const horizon = directionAt(32, 16, 64, 32); // u = 0.5 + half a pixel, v ≈ 0.5
    expect(Math.abs(horizon.y)).toBeLessThan(0.06);
    expect(horizon.x).toBeGreaterThan(0.99); // atan2(z, x) = 0 at u = 0.5 → +x
  });

  it('solid angles cover the sphere', () => {
    let total = 0;
    for (let row = 0; row < 64; row += 1) total += pixelSolidAngle(row, 128, 64) * 128;
    expect(total).toBeCloseTo(4 * Math.PI, 2);
  });

  it('finds the sun, removes it and measures its irradiance', () => {
    const image = skyWithSun(128, 64, 40, 20);
    const { sun, image: cleaned } = extractSun(image);
    const expected = directionAt(40, 20, 128, 64);
    expect(sun.direction[0]).toBeCloseTo(expected.x, 2);
    expect(sun.direction[1]).toBeCloseTo(expected.y, 2);
    expect(sun.direction[2]).toBeCloseTo(expected.z, 2);
    expect(Math.max(...cleaned.data)).toBeLessThan(2);
    const omega = pixelSolidAngle(20, 128, 64);
    expect(sun.irradiance[0]).toBeCloseTo(9 * 4999 * omega, 0);
    expect(sun.irradiance[0]).toBeGreaterThan(sun.irradiance[2]);
  });

  it('leaves a sunless sky untouched', () => {
    const image: HdrImage = { width: 16, height: 8, data: new Float32Array(16 * 8 * 3).fill(1) };
    const { sun, image: cleaned } = extractSun(image);
    expect(sun.irradiance).toEqual([0, 0, 0]);
    expect(Array.from(cleaned.data)).toEqual(Array.from(image.data));
  });
});
```

- [ ] **Step 3: Run it and see it fail** — `npx vitest run scripts/assets/skyMath.test.ts` → FAIL (module not found).

- [ ] **Step 4: Implement `scripts/assets/skyMath.ts`**

```ts
/** Build-time sky maths: Radiance HDR files, three's equirect directions, and the sun's disc. */
export interface HdrImage { width: number; height: number; data: Float32Array }
export interface SunEstimate { direction: [number, number, number]; irradiance: [number, number, number]; pixels: number }

const luminance = (d: ArrayLike<number>, i: number) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];

/** Parses a Radiance RGBE file (flat or new-style run-length scanlines). */
export function parseHdr(bytes: Uint8Array): HdrImage {
  let offset = 0;
  const line = () => { let s = ''; while (bytes[offset] !== 10) s += String.fromCharCode(bytes[offset++]); offset += 1; return s; };
  if (!line().startsWith('#?')) throw new Error('not a Radiance HDR file');
  for (let header = line(); header !== ''; header = line()) { /* FORMAT=32-bit_rle_rgbe, EXPOSURE… */ }
  const size = /-Y (\d+) \+X (\d+)/.exec(line());
  if (!size) throw new Error('unsupported HDR orientation');
  const height = Number(size[1]);
  const width = Number(size[2]);
  const data = new Float32Array(width * height * 3);
  const scan = new Uint8Array(width * 4);
  for (let row = 0; row < height; row += 1) {
    if (width >= 8 && width < 32768 && bytes[offset] === 2 && bytes[offset + 1] === 2 && (bytes[offset + 2] & 0x80) === 0) {
      offset += 4;
      for (let channel = 0; channel < 4; channel += 1) {
        for (let x = 0; x < width;) {
          let count = bytes[offset++];
          if (count > 128) { count -= 128; const value = bytes[offset++]; while (count-- > 0) scan[(x++) * 4 + channel] = value; }
          else while (count-- > 0) scan[(x++) * 4 + channel] = bytes[offset++];
        }
      }
    } else {
      scan.set(bytes.subarray(offset, offset + width * 4));
      offset += width * 4;
    }
    for (let x = 0; x < width; x += 1) {
      const e = scan[x * 4 + 3];
      const scale = e === 0 ? 0 : 2 ** (e - 136);
      const i = (row * width + x) * 3;
      data[i] = scan[x * 4] * scale; data[i + 1] = scan[x * 4 + 1] * scale; data[i + 2] = scan[x * 4 + 2] * scale;
    }
  }
  return { width, height, data };
}

/** Writes a flat (not run-length) RGBE file, which three's HDRLoader reads. */
export function encodeHdr(image: HdrImage): Uint8Array {
  const header = new TextEncoder().encode(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${image.height} +X ${image.width}\n`);
  const out = new Uint8Array(header.length + image.width * image.height * 4);
  out.set(header);
  let o = header.length;
  for (let i = 0; i < image.data.length; i += 3) {
    const max = Math.max(image.data[i], image.data[i + 1], image.data[i + 2]);
    if (max < 1e-32) { o += 4; continue; }
    const exponent = Math.ceil(Math.log2(max) + 1e-9);
    const scale = 256 / 2 ** exponent;
    out[o] = Math.min(255, Math.floor(image.data[i] * scale));
    out[o + 1] = Math.min(255, Math.floor(image.data[i + 1] * scale));
    out[o + 2] = Math.min(255, Math.floor(image.data[i + 2] * scale));
    out[o + 3] = exponent + 128;
    o += 4;
  }
  return out;
}

/** The world direction of pixel (col, row) as three samples an equirect map (`equirectUv`, flipY). */
export function directionAt(col: number, row: number, width: number, height: number): { x: number; y: number; z: number } {
  const u = (col + 0.5) / width;
  const v = 1 - (row + 0.5) / height;
  const latitude = (v - 0.5) * Math.PI;
  const longitude = (u - 0.5) * 2 * Math.PI;
  return { x: Math.cos(longitude) * Math.cos(latitude), y: Math.sin(latitude), z: Math.sin(longitude) * Math.cos(latitude) };
}

/** A pixel's solid angle on the sphere, sr. */
export function pixelSolidAngle(row: number, width: number, height: number): number {
  const top = Math.PI / 2 - (row / height) * Math.PI;
  const bottom = Math.PI / 2 - ((row + 1) / height) * Math.PI;
  return (2 * Math.PI / width) * (Math.sin(top) - Math.sin(bottom));
}

/**
 * Finds the sun as the connected region around the brightest pixel that is far
 * brighter than the sky (over 8× the 99th-percentile luminance and 2 % of the
 * peak), replaces it by the sky just outside it, and returns the energy moved
 * out as the sun's irradiance on a surface facing it.
 */
export function extractSun(image: HdrImage): { sun: SunEstimate; image: HdrImage } {
  const { width, height } = image;
  const data = image.data.slice();
  const count = width * height;
  const lum = new Float32Array(count);
  let peak = 0;
  let peakIndex = 0;
  for (let p = 0; p < count; p += 1) { lum[p] = luminance(data, p * 3); if (lum[p] > peak) { peak = lum[p]; peakIndex = p; } }
  const sorted = Float32Array.from(lum).sort();
  const p99 = sorted[Math.floor(0.99 * (count - 1))];
  const threshold = Math.max(8 * p99, 0.02 * peak);
  const none: SunEstimate = { direction: [0, 1, 0], irradiance: [0, 0, 0], pixels: 0 };
  if (!(peak > threshold)) return { sun: none, image: { width, height, data } };
  const inSun = new Uint8Array(count);
  const stack = [peakIndex];
  inSun[peakIndex] = 1;
  const region: number[] = [];
  while (stack.length) {
    const p = stack.pop()!;
    region.push(p);
    const row = Math.floor(p / width);
    const col = p % width;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const r = row + dr;
      if (r < 0 || r >= height) continue;
      const q = r * width + ((col + dc + width) % width);
      if (!inSun[q] && lum[q] > threshold) { inSun[q] = 1; stack.push(q); }
    }
  }
  // The sky just outside the disc: every pixel touching the region.
  let ringR = 0; let ringG = 0; let ringB = 0; let ring = 0;
  for (const p of region) {
    const row = Math.floor(p / width);
    const col = p % width;
    for (let dr = -2; dr <= 2; dr += 1) for (let dc = -2; dc <= 2; dc += 1) {
      const r = row + dr;
      if (r < 0 || r >= height) continue;
      const q = r * width + ((col + dc + width) % width);
      if (inSun[q]) continue;
      ringR += data[q * 3]; ringG += data[q * 3 + 1]; ringB += data[q * 3 + 2]; ring += 1;
    }
  }
  const fill = ring > 0 ? [ringR / ring, ringG / ring, ringB / ring] : [0, 0, 0];
  const irradiance: [number, number, number] = [0, 0, 0];
  const centre = { x: 0, y: 0, z: 0 };
  for (const p of region) {
    const row = Math.floor(p / width);
    const omega = pixelSolidAngle(row, width, height);
    const weight = (lum[p] - luminance(fill, 0)) * omega;
    const d = directionAt(p % width, row, width, height);
    centre.x += d.x * weight; centre.y += d.y * weight; centre.z += d.z * weight;
    for (let c = 0; c < 3; c += 1) { irradiance[c] += (data[p * 3 + c] - fill[c]) * omega; data[p * 3 + c] = fill[c]; }
  }
  const length = Math.hypot(centre.x, centre.y, centre.z) || 1;
  return {
    sun: { direction: [centre.x / length, centre.y / length, centre.z / length], irradiance, pixels: region.length },
    image: { width, height, data },
  };
}

/** Horizontal irradiance from the sky above the horizon (cosine-weighted). */
export function horizontalIrradiance(image: HdrImage): number {
  let total = 0;
  for (let row = 0; row < image.height / 2; row += 1) {
    const omega = pixelSolidAngle(row, image.width, image.height);
    for (let col = 0; col < image.width; col += 1) {
      const cosine = directionAt(col, row, image.width, image.height).y;
      total += luminance(image.data, (row * image.width + col) * 3) * omega * Math.max(0, cosine);
    }
  }
  return total;
}
```

- [ ] **Step 5: Run the tests to pass** — `npx vitest run scripts/assets/skyMath.test.ts` → PASS (5 tests).

- [ ] **Step 6: Write `scripts/assets/fetch-skies.ts`**

```ts
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { encodeHdr, extractSun, horizontalIrradiance, parseHdr } from './skyMath';

/** The three photographed skies, one per P8 time of day (Poly Haven, CC0). */
const SKIES = [
  { id: 'qwantani_dawn_puresky', timeOfDay: 'dawn' },
  { id: 'kloofendal_48d_partly_cloudy_puresky', timeOfDay: 'midday' },
  { id: 'qwantani_sunset_puresky', timeOfDay: 'sunset' },
] as const;
const OUT = 'public/assets/skies';
const CACHE = 'scripts/assets/.cache';
const HEADERS = { 'User-Agent': 'breakline-asset-script' };

async function download(url: string, path: string): Promise<Uint8Array> {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  writeFileSync(path, bytes);
  return bytes;
}

mkdirSync(OUT, { recursive: true });
mkdirSync(CACHE, { recursive: true });
const manifest = [];
for (const { id, timeOfDay } of SKIES) {
  const files = await (await fetch(`https://api.polyhaven.com/files/${id}`, { headers: HEADERS })).json();
  const info = await (await fetch(`https://api.polyhaven.com/info/${id}`, { headers: HEADERS })).json();
  const hdr = parseHdr(await download(files.hdri['1k'].hdr.url, `${CACHE}/${id}_1k.hdr`));
  const { sun, image } = extractSun(hdr);
  writeFileSync(`${OUT}/${id}_1k.hdr`, encodeHdr(image));
  await download(files.tonemapped.url, `${CACHE}/${id}.jpg`);
  execFileSync('sips', ['-z', '2048', '4096', '-s', 'formatOptions', '82', `${CACHE}/${id}.jpg`, '--out', `${OUT}/${id}.jpg`], { stdio: 'ignore' });
  manifest.push({
    id, timeOfDay, hdr: `skies/${id}_1k.hdr`, background: `skies/${id}.jpg`,
    sun: { direction: sun.direction, irradiance: sun.irradiance, pixels: sun.pixels },
    skyIrradiance: horizontalIrradiance(image),
    author: Object.keys(info.authors ?? {}).join(', '), licence: 'CC0', source: `https://polyhaven.com/a/${id}`,
  });
  console.log(id, 'sun elevation', (Math.asin(sun.direction[1]) * 180 / Math.PI).toFixed(1), '°, pixels', sun.pixels);
}
writeFileSync(`${OUT}/skies.json`, `${JSON.stringify({ skies: manifest }, null, 2)}\n`);
console.log(readFileSync(`${OUT}/skies.json`, 'utf8'));
```

- [ ] **Step 7: Run it and check the result** — `npm run assets:skies`.
  - Expected: three lines with sun elevations: dawn and sunset under about 15°, midday about 48°.
  - Check the pixel counts are over 0, and that `public/assets/skies/` holds 3 × (HDR ≈ 1–3 MB flat, JPEG ≈ 1.5–3 MB) plus `skies.json`.
  - If an elevation is implausible, look at the tonemapped JPEG and swap the sky for another from the pure-skies list in the same time of day.

- [ ] **Step 8: Start `docs/ASSETS.md`** with a table: asset, source URL, author, licence, file, size, plus a "How to rebuild" section (`npm run assets:skies`, `npm run assets:surfers`).

- [ ] **Step 9: Commit** — `git add .gitignore package.json package-lock.json scripts/assets docs/ASSETS.md public/assets/skies && git commit -m "feat: fetch three photographed skies and measure their suns"`

---

### Task 2: PhotoSky runtime and the sun

**Files:**
- Create: `src/scene/PhotoSky.ts`, `src/scene/photoSky.test.ts`
- Modify: `src/scene/Environment.ts` (add `showSky`), `src/main.ts` (construct, wire sun and reflections, tone mapping)

**Interfaces:**
- Consumes: `public/assets/skies/skies.json` (Task 1).
- Produces:
  ```ts
  export type TimeOfDay = 'dawn' | 'midday' | 'sunset';
  export interface SkyEntry { id: string; timeOfDay: TimeOfDay; hdr: string; background: string; sun: { direction: [number, number, number]; irradiance: [number, number, number] }; skyIrradiance: number }
  export function sunElevationFromSlider(value: number): number;      // degrees, 5 + 60·value
  export function nearestSky(skies: readonly SkyEntry[], elevationDegrees: number): SkyEntry;
  export function skyRotation(photoSun: readonly [number, number, number], azimuthDegrees: number): number; // radians about +y
  export function rotatedSun(photoSun: readonly [number, number, number], rotation: number, out: Vector3): Vector3;
  export function skyExposure(entry: SkyEntry): { environment: number; sun: number; sunColor: Color };
  export class PhotoSky {
    constructor(renderer: WebGLRenderer, baseUrl?: string);
    readonly sunDirection: Vector3;  readonly sunColor: Color;  sunIntensity: number;
    environment?: Texture;  background?: Texture;  environmentIntensity: number;  rotation: number;
    get ready(): boolean;
    loadManifest(): Promise<readonly SkyEntry[]>;
    select(elevationDegrees: number, azimuthDegrees: number): Promise<boolean>;   // true when the sky changed
    applyTo(scene: Scene, materials: readonly MeshStandardMaterial[]): void;
  }
  ```

- [ ] **Step 1: Write the failing tests** (`src/scene/photoSky.test.ts`)

```ts
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { nearestSky, rotatedSun, skyExposure, skyRotation, sunElevationFromSlider, type SkyEntry } from './PhotoSky';

const sky = (id: string, timeOfDay: SkyEntry['timeOfDay'], elevation: number): SkyEntry => {
  const e = (elevation * Math.PI) / 180;
  return { id, timeOfDay, hdr: '', background: '', sun: { direction: [Math.cos(e), Math.sin(e), 0], irradiance: [30, 25, 20] }, skyIrradiance: 10 };
};
const skies = [sky('dawn', 'dawn', 4), sky('noon', 'midday', 48), sky('dusk', 'sunset', 12)];

describe('photo sky', () => {
  it('maps the Wave Lab slider to 5–65° of sun elevation', () => {
    expect(sunElevationFromSlider(0)).toBe(5);
    expect(sunElevationFromSlider(1)).toBe(65);
    expect(sunElevationFromSlider(2)).toBe(65);
  });

  it('snaps to the photo whose sun is nearest in elevation', () => {
    expect(nearestSky(skies, 0).id).toBe('dawn');
    expect(nearestSky(skies, 10).id).toBe('dusk');
    expect(nearestSky(skies, 35).id).toBe('noon');
  });

  it('rotates the photo so its sun sits at the game’s azimuth (x = sin a, z = −cos a)', () => {
    for (const azimuth of [-25, 0, 90, 180]) {
      const rotation = skyRotation(skies[1].sun.direction, azimuth);
      const sun = rotatedSun(skies[1].sun.direction, rotation, new Vector3());
      const a = (azimuth * Math.PI) / 180;
      const horizontal = Math.hypot(sun.x, sun.z);
      expect(sun.x / horizontal).toBeCloseTo(Math.sin(a), 6);
      expect(sun.z / horizontal).toBeCloseTo(-Math.cos(a), 6);
      expect(sun.y).toBeCloseTo(Math.sin((48 * Math.PI) / 180), 6);
    }
  });

  it('scales each sky to the same horizontal light, keeping its sun-to-sky ratio', () => {
    const noon = skyExposure(skies[1]);
    const dawn = skyExposure(skies[0]);
    const noonTotal = noon.environment * 10 + noon.sun * Math.sin((48 * Math.PI) / 180);
    const dawnTotal = dawn.environment * 10 + dawn.sun * Math.sin((4 * Math.PI) / 180);
    expect(noonTotal).toBeGreaterThan(dawnTotal); // low suns are dimmer
    expect(noon.sun / noon.environment).toBeCloseTo(Math.hypot(30, 25, 20) / 1, 0);
    expect(noon.sunColor.r).toBeGreaterThan(noon.sunColor.b);
  });
});
```

- [ ] **Step 2: Run to fail** — `npx vitest run src/scene/photoSky.test.ts` → FAIL.

- [ ] **Step 3: Implement `src/scene/PhotoSky.ts`**

```ts
import {
  Color, EquirectangularReflectionMapping, PMREMGenerator, SRGBColorSpace, TextureLoader, Vector3,
  type MeshStandardMaterial, type Scene, type Texture, type WebGLRenderer, type WebGLRenderTarget,
} from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

export type TimeOfDay = 'dawn' | 'midday' | 'sunset';
export interface SkyEntry {
  id: string; timeOfDay: TimeOfDay; hdr: string; background: string;
  sun: { direction: [number, number, number]; irradiance: [number, number, number] };
  skyIrradiance: number;
}

/** The Wave Lab's sun-height slider (0–1) as a sun elevation, degrees. */
export function sunElevationFromSlider(value: number): number {
  return 5 + 60 * Math.min(1, Math.max(0, value));
}

const elevationOf = (sky: SkyEntry) => (Math.asin(sky.sun.direction[1]) * 180) / Math.PI;

/** The photo whose measured sun elevation is nearest (the slider snaps to it). */
export function nearestSky(skies: readonly SkyEntry[], elevationDegrees: number): SkyEntry {
  return skies.reduce((best, sky) => (Math.abs(elevationOf(sky) - elevationDegrees) < Math.abs(elevationOf(best) - elevationDegrees) ? sky : best));
}

/**
 * The rotation about +y that brings the photo's sun to the game's azimuth
 * (`Environment` puts the sun at x = sin a, z = −cos a). A rotation θ turns a
 * direction's angle atan2(x, z) by +θ, as three's `backgroundRotation` and
 * `envMapRotation` turn the environment.
 */
export function skyRotation(photoSun: readonly [number, number, number], azimuthDegrees: number): number {
  const a = (azimuthDegrees * Math.PI) / 180;
  return Math.atan2(Math.sin(a), -Math.cos(a)) - Math.atan2(photoSun[0], photoSun[2]);
}

export function rotatedSun(photoSun: readonly [number, number, number], rotation: number, out: Vector3): Vector3 {
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  return out.set(photoSun[0] * c + photoSun[2] * s, photoSun[1], -photoSun[0] * s + photoSun[2] * c).normalize();
}

/**
 * Photos are exposed differently, so each is scaled to a common horizontal
 * light at a high sun; a lower sun keeps its own sun-to-sky ratio and is dimmer
 * by sin(elevation). `REFERENCE_LIGHT` is an art-direction value, tuned on the
 * screenshot sheet (Task 11), not a measured illuminance.
 */
export const REFERENCE_LIGHT = 3.2;
export function skyExposure(entry: SkyEntry): { environment: number; sun: number; sunColor: Color } {
  const [r, g, b] = entry.sun.irradiance;
  const sunLuminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const elevation = Math.max(0, entry.sun.direction[1]);
  const highSunTotal = entry.skyIrradiance + sunLuminance; // as if the same sun stood overhead
  const scale = REFERENCE_LIGHT / Math.max(1e-6, highSunTotal);
  const dimming = 0.35 + 0.65 * Math.sqrt(elevation);
  const peak = Math.max(r, g, b, 1e-9);
  return {
    environment: scale * dimming,
    sun: scale * dimming * Math.hypot(r, g, b),
    sunColor: new Color(r / peak, g / peak, b / peak),
  };
}

/** A photographed sky: the visible background, the environment for lighting and reflections, and its sun. */
export class PhotoSky {
  readonly sunDirection = new Vector3(0, 1, 0);
  readonly sunColor = new Color(1, 1, 1);
  sunIntensity = 0;
  environment?: Texture;
  background?: Texture;
  environmentIntensity = 1;
  rotation = 0;
  private skies?: readonly SkyEntry[];
  private current?: SkyEntry;
  private target?: WebGLRenderTarget;

  constructor(private readonly renderer: WebGLRenderer, private readonly baseUrl = `${import.meta.env.BASE_URL}assets/`) {}

  get ready(): boolean { return this.environment !== undefined; }
  get timeOfDay(): TimeOfDay | undefined { return this.current?.timeOfDay; }

  async loadManifest(): Promise<readonly SkyEntry[]> {
    if (!this.skies) {
      const response = await fetch(`${this.baseUrl}skies/skies.json`);
      if (!response.ok) throw new Error(`sky manifest: ${response.status}`);
      this.skies = (await response.json()).skies as SkyEntry[];
    }
    return this.skies;
  }

  /** Loads the sky nearest `elevationDegrees` if it is not the current one, and turns it to `azimuthDegrees`. */
  async select(elevationDegrees: number, azimuthDegrees: number): Promise<boolean> {
    const entry = nearestSky(await this.loadManifest(), elevationDegrees);
    const changed = entry !== this.current;
    if (changed) {
      const [hdr, background] = await Promise.all([
        new HDRLoader().loadAsync(`${this.baseUrl}${entry.hdr}`),
        new TextureLoader().loadAsync(`${this.baseUrl}${entry.background}`),
      ]);
      hdr.mapping = EquirectangularReflectionMapping;
      background.mapping = EquirectangularReflectionMapping;
      background.colorSpace = SRGBColorSpace;
      const pmrem = new PMREMGenerator(this.renderer);
      const target = pmrem.fromEquirectangular(hdr);
      pmrem.dispose();
      hdr.dispose();
      this.target?.dispose();
      this.background?.dispose();
      this.target = target;
      this.environment = target.texture;
      this.background = background;
      this.current = entry;
      const exposure = skyExposure(entry);
      this.environmentIntensity = exposure.environment;
      this.sunIntensity = exposure.sun;
      this.sunColor.copy(exposure.sunColor);
    }
    this.rotation = skyRotation(entry.sun.direction, azimuthDegrees);
    rotatedSun(entry.sun.direction, this.rotation, this.sunDirection);
    return changed;
  }

  /** Background and environment on the scene, and the same map turned the same way on materials that carry their own. */
  applyTo(scene: Scene, materials: readonly MeshStandardMaterial[]): void {
    if (!this.environment) return;
    scene.environment = this.environment;
    scene.environmentIntensity = this.environmentIntensity;
    scene.environmentRotation.set(0, this.rotation, 0);
    scene.backgroundRotation.set(0, this.rotation, 0);
    for (const material of materials) {
      material.envMap = this.environment;
      material.envMapIntensity = this.environmentIntensity;
      material.envMapRotation.set(0, this.rotation, 0);
      material.needsUpdate = true;
    }
  }
}
```

- [ ] **Step 4: Run to pass** — `npx vitest run src/scene/photoSky.test.ts` → PASS (4 tests). If the ratio test is off, fix `skyExposure` rather than the test: `sun / environment` must equal the photo's |irradiance|.

- [ ] **Step 5: Wire it in `main.ts` and `Environment.ts`**
  - **`Environment.ts`:** add `showSky(visible: boolean): void`, which sets the sky sphere's and the sun mesh's `visible` (keep a field for the sky mesh).
  - **Construct:** in `main.ts`, `this.photoSky = new PhotoSky(this.renderer)`.
  - **`applySun(settings)`:** replaces each pair of `environment.setSunPosition(...)` / `sunlight.position.copy(...)` calls (lines 280–282 and 359–360). It still calls `environment.setSunPosition` (the legacy fallback), then:
    ```ts
    void this.photoSky.select(sunElevationFromSlider(settings.sunHeight), settings.sunDirection).then(() => {
      this.environment.showSky(false);
      this.sunlight.color.copy(this.photoSky.sunColor);
      this.sunlight.intensity = this.photoSky.sunIntensity;
      this.sunlight.position.copy(this.photoSky.sunDirection).multiplyScalar(45);
      this.ambient.intensity = 0; this.fill.intensity = 0; // the environment lights the shade now
      this.photoSky.applyTo(this.scene, [this.water.mesh.material, this.physicalMode.farField.mesh.material]);
      if (!this.isBelowSurface) this.scene.background = this.photoSky.background!;
      this.refreshSun();
    }).catch((error) => console.warn('Photo sky unavailable; keeping the painted sky.', error));
    ```
  - **Refs:** keep the ambient and fill lights as fields (`this.ambient`, `this.fill`).
  - **`refreshReflection()`:** returns early when `this.photoSky.ready`.
  - **`refreshSun()`:** uses `this.photoSky.ready ? this.photoSky.sunDirection : this.environment.sunPosition.clone().normalize()`.
  - **`setUnderwater(false)`:** restores `this.photoSky.background ?? this.skyColor`.
  - **Tone mapping:** `this.renderer.toneMapping = NeutralToneMapping` (import it) and keep `toneMappingExposure` for tuning.

- [ ] **Step 6: Check it in the browser** (dev server on the worktree):
  - `?physical`, Front view, sun height at 35 % then 90 %;
  - the visible sun and the sun's glint on the water must line up in azimuth, and the sky must change at the snap points.
  - Take before/after screenshots at the same seed.
  - If the water body reads more than about 15 % darker or brighter than before, adjust `toneMappingExposure` (not the water constants) and note the value in the plan record.

- [ ] **Step 7: Commit** — `git commit -am "feat: light the scene from photographed skies" && git add src/scene/PhotoSky.ts src/scene/photoSky.test.ts && git commit --amend --no-edit`

---

### Task 3: Two-bone IK and bone orientation

**Files:**
- Create: `src/scene/rig/twoBoneIk.ts`, `src/scene/rig/twoBoneIk.test.ts`, `src/scene/rig/orientBone.ts`, `src/scene/rig/orientBone.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function solveTwoBone(root: Vector3, upper: number, lower: number, target: Vector3, pole: Vector3, outMid: Vector3, outEnd: Vector3): boolean;
  export function orientBone(bone: Object3D, axisLocal: Vector3, hintLocal: Vector3, direction: Vector3, hintDirection: Vector3): void;
  ```

- [ ] **Step 1: Write the failing tests**

`src/scene/rig/twoBoneIk.test.ts`:

```ts
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { solveTwoBone } from './twoBoneIk';

const root = new Vector3(0, 1, 0);
const mid = new Vector3();
const end = new Vector3();

describe('two-bone IK', () => {
  it('reaches a target in range, keeping both lengths', () => {
    const reached = solveTwoBone(root, 0.45, 0.42, new Vector3(0.1, 0.3, 0.2), new Vector3(0, 0, 1), mid, end);
    expect(reached).toBe(true);
    expect(end.distanceTo(new Vector3(0.1, 0.3, 0.2))).toBeLessThan(1e-9);
    expect(mid.distanceTo(root)).toBeCloseTo(0.45, 9);
    expect(mid.distanceTo(end)).toBeCloseTo(0.42, 9);
  });

  it('bends toward the pole', () => {
    solveTwoBone(root, 0.45, 0.42, new Vector3(0, 0.3, 0), new Vector3(0, 0, 1), mid, end);
    expect(mid.z).toBeGreaterThan(0.1);
    solveTwoBone(root, 0.45, 0.42, new Vector3(0, 0.3, 0), new Vector3(0, 0, -1), mid, end);
    expect(mid.z).toBeLessThan(-0.1);
  });

  it('stops short of an unreachable target without stretching', () => {
    const reached = solveTwoBone(root, 0.45, 0.42, new Vector3(0, -2, 0), new Vector3(0, 0, 1), mid, end);
    expect(reached).toBe(false);
    expect(mid.distanceTo(root)).toBeCloseTo(0.45, 9);
    expect(mid.distanceTo(end)).toBeCloseTo(0.42, 9);
    expect(end.y).toBeLessThan(root.y - 0.86);
  });

  it('stays finite for a target on the root and a pole along the reach', () => {
    solveTwoBone(root, 0.45, 0.42, root.clone(), new Vector3(0, 0, 1), mid, end);
    expect(Number.isFinite(mid.x + mid.y + mid.z + end.x + end.y + end.z)).toBe(true);
    solveTwoBone(root, 0.45, 0.42, new Vector3(0, 0.5, 0), new Vector3(0, -1, 0), mid, end);
    expect(Number.isFinite(mid.x + mid.y + mid.z)).toBe(true);
    expect(mid.distanceTo(root)).toBeCloseTo(0.45, 9);
  });
});
```

`src/scene/rig/orientBone.test.ts`:

```ts
import { Bone, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { orientBone } from './orientBone';

describe('orientBone', () => {
  it('points the local axis along the direction and turns the hint toward its target, under a rotated parent', () => {
    const parent = new Bone();
    parent.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), 0.7);
    const bone = new Bone();
    parent.add(bone);
    parent.updateMatrixWorld(true);
    const axis = new Vector3(0, 1, 0);
    const hint = new Vector3(0, 0, 1);
    const direction = new Vector3(1, 1, 0).normalize();
    orientBone(bone, axis, hint, direction, new Vector3(0, 0.3, 1));
    const world = bone.getWorldQuaternion(new Quaternion());
    expect(axis.clone().applyQuaternion(world).distanceTo(direction)).toBeLessThan(1e-9);
    const hintWorld = hint.clone().applyQuaternion(world);
    expect(hintWorld.dot(direction)).toBeCloseTo(0, 9);
    const wanted = new Vector3(0, 0.3, 1).addScaledVector(direction, -new Vector3(0, 0.3, 1).dot(direction)).normalize();
    expect(hintWorld.distanceTo(wanted)).toBeLessThan(1e-9);
  });

  it('keeps a valid rotation when the hint lies along the direction', () => {
    const bone = new Bone();
    bone.updateMatrixWorld(true);
    orientBone(bone, new Vector3(0, 1, 0), new Vector3(0, 0, 1), new Vector3(0, 0, 1), new Vector3(0, 0, 1));
    expect(Math.abs(bone.quaternion.length() - 1)).toBeLessThan(1e-9);
  });
});
```

- [ ] **Step 2: Run to fail** — `npx vitest run src/scene/rig` → FAIL.

- [ ] **Step 3: Implement**

`src/scene/rig/twoBoneIk.ts`:

```ts
import { Vector3 } from 'three';

const reach = new Vector3();
const bend = new Vector3();

/**
 * A two-bone chain (hip–knee–ankle, shoulder–elbow–wrist) solved in closed
 * form: the end goes to the target, or as far toward it as the chain reaches,
 * and the middle joint bends toward `pole` (a direction). Lengths are kept
 * exactly. Returns whether the target was reached.
 */
export function solveTwoBone(root: Vector3, upper: number, lower: number, target: Vector3, pole: Vector3, outMid: Vector3, outEnd: Vector3): boolean {
  reach.subVectors(target, root);
  let distance = reach.length();
  if (distance > 1e-9) reach.divideScalar(distance);
  else reach.set(0, -1, 0);
  const longest = (upper + lower) * (1 - 1e-6);
  const shortest = Math.abs(upper - lower) + 1e-6;
  const reached = distance <= longest && distance >= shortest;
  distance = Math.min(longest, Math.max(shortest, distance));
  bend.copy(pole).addScaledVector(reach, -pole.dot(reach));
  if (bend.lengthSq() < 1e-12) bend.set(1, 0, 0).addScaledVector(reach, -reach.x);
  if (bend.lengthSq() < 1e-12) bend.set(0, 0, 1).addScaledVector(reach, -reach.z);
  bend.normalize();
  const cosine = (upper * upper + distance * distance - lower * lower) / (2 * upper * distance);
  const sine = Math.sqrt(Math.max(0, 1 - cosine * cosine));
  outMid.copy(root).addScaledVector(reach, upper * cosine).addScaledVector(bend, upper * sine);
  outEnd.copy(root).addScaledVector(reach, distance);
  return reached;
}
```

`src/scene/rig/orientBone.ts`:

```ts
import { Matrix4, Quaternion, Vector3, type Object3D } from 'three';

const a = new Vector3(); const h = new Vector3(); const c = new Vector3();
const A = new Vector3(); const H = new Vector3(); const C = new Vector3();
const local = new Matrix4(); const world = new Matrix4();
const target = new Quaternion(); const parentWorld = new Quaternion();

function frame(axis: Vector3, hint: Vector3, outA: Vector3, outH: Vector3, outC: Vector3, out: Matrix4): Matrix4 {
  outA.copy(axis).normalize();
  outH.copy(hint).addScaledVector(outA, -hint.dot(outA));
  if (outH.lengthSq() < 1e-12) outH.set(Math.abs(outA.x) < 0.9 ? 1 : 0, Math.abs(outA.x) < 0.9 ? 0 : 1, 0).addScaledVector(outA, -(Math.abs(outA.x) < 0.9 ? outA.x : outA.y));
  outH.normalize();
  outC.crossVectors(outA, outH);
  return out.makeBasis(outA, outH, outC);
}

/**
 * Turns `bone` so its local `axisLocal` points along `direction` in the world
 * and its local `hintLocal` turns as near `hintDirection` as the axis allows,
 * then stores that as the bone's quaternion under its parent (whose world
 * matrix must be current) and updates the bone's subtree.
 */
export function orientBone(bone: Object3D, axisLocal: Vector3, hintLocal: Vector3, direction: Vector3, hintDirection: Vector3): void {
  frame(axisLocal, hintLocal, a, h, c, local);
  frame(direction, hintDirection, A, H, C, world);
  target.setFromRotationMatrix(world.multiply(local.transpose()));
  if (bone.parent) bone.parent.getWorldQuaternion(parentWorld);
  else parentWorld.identity();
  bone.quaternion.copy(parentWorld.invert().multiply(target)).normalize();
  bone.updateMatrixWorld(true);
}
```

- [ ] **Step 4: Run to pass** — `npx vitest run src/scene/rig` → PASS (6 tests).

- [ ] **Step 5: Commit** — `git add src/scene/rig && git commit -m "feat: solve two-bone chains and orient bones for the surfer rig"`

---

### Task 4: The rider visual state, a test humanoid, and the posture points

**Files:**
- Create: `src/scene/rig/humanoidBones.ts`, `src/scene/rig/riderVisualState.ts`, `src/scene/rig/riderVisualState.test.ts`, `src/scene/rig/testHumanoid.ts`, `src/scene/rig/posturePoints.ts`

**Interfaces:**
- Consumes: `RIDER_SNAPSHOT`, `RIDER_PHASES` from `src/wave/SurfZoneRunner.ts`; `riderPose`, `stanceFeet`, `deckHeight` from `src/physics/riderPosture.ts`; `buildBoardShape` from `src/physics/boardShape.ts`.
- Produces:
  ```ts
  // humanoidBones.ts — names as three.js sanitises 'mixamorig:Hips' (GLTFLoader drops the colon)
  export type Side = 'left' | 'right';
  export const BONES: { hips; spine: readonly [string, string, string]; neck; head;
    shoulder: Record<Side, string>; arm; foreArm; hand; upLeg; leg; foot; toe: Record<Side, string>;
    fingers: Record<Side, readonly (readonly [string, string, string])[]> };
  export const REQUIRED_BONES: readonly string[];
  // riderVisualState.ts
  export type RiderPhase = (typeof RIDER_PHASES)[number];
  export interface RiderVisualState { readonly points: readonly Vector3[]; phase: RiderPhase; heading: number; readonly boardPosition: Vector3; readonly boardQuaternion: Quaternion; stroking: number }
  export const POINT: { pelvis: 0; torso: 1; head: 2; leftHand: 3; rightHand: 4; leftFoot: 5; rightFoot: 6 };
  export function createRiderVisualState(): RiderVisualState;
  export function readRiderSnapshot(rider: ArrayLike<number>, board: ArrayLike<number>, out: RiderVisualState): RiderVisualState;
  // testHumanoid.ts
  export function createTestHumanoid(scale?: number): { root: Bone; bones: Map<string, Bone> };
  // posturePoints.ts
  export function posturePoints(phase: 'prone' | 'push' | 'landing' | 'standing', stance: 'regular' | 'goofy', boardPosition: Vector3, boardQuaternion: Quaternion, out: RiderVisualState): RiderVisualState;
  ```

- [ ] **Step 1: Write the failing test** (`src/scene/rig/riderVisualState.test.ts`)

```ts
import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { RIDER_SNAPSHOT } from '../../wave/SurfZoneRunner';
import { POINT, createRiderVisualState, readRiderSnapshot } from './riderVisualState';
import { posturePoints } from './posturePoints';

describe('rider visual state', () => {
  it('decodes the snapshot’s seven points, phase, heading and the board pose', () => {
    const rider = new Float64Array(RIDER_SNAPSHOT.length);
    for (let i = 0; i < 21; i += 1) rider[i] = i;
    rider[RIDER_SNAPSHOT.phase] = 3;
    rider[RIDER_SNAPSHOT.heading] = 0.4;
    const board = [1, 2, 3, 0, 0, 0, 1, 1];
    const state = readRiderSnapshot(rider, board, createRiderVisualState());
    expect(state.points[POINT.head].toArray()).toEqual([6, 7, 8]);
    expect(state.phase).toBe('standing');
    expect(state.heading).toBe(0.4);
    expect(state.boardPosition.toArray()).toEqual([1, 2, 3]);
  });

  it('puts a standing regular rider’s left foot forward, on the deck', () => {
    const state = posturePoints('standing', 'regular', new Vector3(), new Quaternion(), createRiderVisualState());
    expect(state.points[POINT.leftFoot].z).toBeGreaterThan(state.points[POINT.rightFoot].z);
    expect(state.points[POINT.leftFoot].y).toBeLessThan(0.15);
    const goofy = posturePoints('standing', 'goofy', new Vector3(), new Quaternion(), createRiderVisualState());
    expect(goofy.points[POINT.rightFoot].z).toBeGreaterThan(goofy.points[POINT.leftFoot].z);
  });
});
```

- [ ] **Step 2: Run to fail** — FAIL (modules missing).

- [ ] **Step 3: Implement the four modules**

`humanoidBones.ts`:

```ts
/** MPFB's Mixamo skeleton, named as three.js loads it (`mixamorig:Hips` → `mixamorigHips`). */
export type Side = 'left' | 'right';
const m = (name: string) => `mixamorig${name}`;
const sided = (name: string) => ({ left: m(`Left${name}`), right: m(`Right${name}`) });
const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
export const BONES = {
  hips: m('Hips'),
  spine: [m('Spine'), m('Spine1'), m('Spine2')] as const,
  neck: m('Neck'),
  head: m('Head'),
  shoulder: sided('Shoulder'), arm: sided('Arm'), foreArm: sided('ForeArm'), hand: sided('Hand'),
  upLeg: sided('UpLeg'), leg: sided('Leg'), foot: sided('Foot'), toe: sided('ToeBase'),
  fingers: {
    left: FINGERS.map((f) => [1, 2, 3].map((k) => m(`LeftHand${f}${k}`)) as unknown as readonly [string, string, string]),
    right: FINGERS.map((f) => [1, 2, 3].map((k) => m(`RightHand${f}${k}`)) as unknown as readonly [string, string, string]),
  },
} as const;
export const REQUIRED_BONES: readonly string[] = [
  BONES.hips, ...BONES.spine, BONES.neck, BONES.head,
  ...(['left', 'right'] as const).flatMap((s) => [BONES.shoulder[s], BONES.arm[s], BONES.foreArm[s], BONES.hand[s], BONES.upLeg[s], BONES.leg[s], BONES.foot[s], BONES.toe[s], BONES.fingers[s][2][0]]),
];
```

`riderVisualState.ts`:

```ts
import { Quaternion, Vector3 } from 'three';
import { RIDER_PHASES, RIDER_SNAPSHOT } from '../../wave/SurfZoneRunner';

export type RiderPhase = (typeof RIDER_PHASES)[number];
/** Snapshot point order: trunk centres, then hand and foot tips (limb centres once fallen). */
export const POINT = { pelvis: 0, torso: 1, head: 2, leftHand: 3, rightHand: 4, leftFoot: 5, rightFoot: 6 } as const;

/** What the drawn rider is solved from: the physics' seven points, phase and heading, and the board's pose. */
export interface RiderVisualState {
  readonly points: readonly Vector3[];
  phase: RiderPhase;
  heading: number;
  readonly boardPosition: Vector3;
  readonly boardQuaternion: Quaternion;
  /** 0–1: how hard the hands are pulling (cups the hands). */
  stroking: number;
}

export function createRiderVisualState(): RiderVisualState {
  return { points: Array.from({ length: 7 }, () => new Vector3()), phase: 'prone', heading: 0, boardPosition: new Vector3(), boardQuaternion: new Quaternion(), stroking: 0 };
}

export function readRiderSnapshot(rider: ArrayLike<number>, board: ArrayLike<number>, out: RiderVisualState): RiderVisualState {
  out.points.forEach((point, i) => point.set(rider[RIDER_SNAPSHOT.points + i * 3], rider[RIDER_SNAPSHOT.points + i * 3 + 1], rider[RIDER_SNAPSHOT.points + i * 3 + 2]));
  out.phase = RIDER_PHASES[Math.round(rider[RIDER_SNAPSHOT.phase])] ?? 'prone';
  out.heading = rider[RIDER_SNAPSHOT.heading];
  out.boardPosition.set(board[0], board[1], board[2]);
  out.boardQuaternion.set(board[3], board[4], board[5], board[6]);
  return out;
}
```

`posturePoints.ts` (the dev sheet and tests only; mirrors `AttachedRider.renderPoint`):

```ts
import type { Quaternion, Vector3 } from 'three';
import { buildBoardShape } from '../../physics/boardShape';
import { RIDER_PARTS, deckHeight, riderPose, stanceFeet, type PosePhase, type StanceName } from '../../physics/riderPosture';
import type { RiderVisualState } from './riderVisualState';

const shape = buildBoardShape();

/**
 * The seven drawn points of a physics posture on a board at a pose, by
 * `AttachedRider.renderPoint`'s rules (trunk centres; arms out 0.7 past their
 * centres upright; hands on the rails in the push; feet on the stringer at the
 * stance points; lying legs 0.9 past their centres). For the dev sheet and tests.
 */
export function posturePoints(phase: PosePhase, stance: StanceName, boardPosition: Vector3, boardQuaternion: Quaternion, out: RiderVisualState): RiderVisualState {
  const posture = riderPose(shape, phase, stance);
  const part = (i: number, target: Vector3) => target.set(posture.parts[i * 3], posture.parts[i * 3 + 1], posture.parts[i * 3 + 2]);
  const upright = phase === 'standing' || phase === 'landing';
  const { front, rear } = stanceFeet(shape);
  for (let i = 0; i < RIDER_PARTS.length; i += 1) {
    const point = part(i, out.points[i]);
    if (i === 3 || i === 4) {
      if (phase === 'prone' || phase === 'push') {
        const z = posture.parts[1 * 3 + 2];
        point.set((i === 3 ? 1 : -1) * (shape.curves.width(z / shape.length + 0.5) / 2 + (phase === 'prone' ? 0.02 : 0)), deckHeight(shape, z) + (phase === 'prone' ? 0.02 : 0), z);
      } else {
        const torsoX = posture.parts[3]; const torsoY = posture.parts[4]; const torsoZ = posture.parts[5];
        point.set(point.x + 0.7 * (point.x - torsoX), point.y + 0.7 * (point.y - torsoY), point.z + 0.7 * (point.z - torsoZ));
      }
    } else if (i >= 5) {
      if (upright) {
        const isFront = (i === 5) === (stance === 'regular');
        const z = isFront ? front : rear;
        point.set(0, deckHeight(shape, z), z);
      } else {
        point.set(point.x + 0.9 * (point.x - posture.parts[0]), point.y + 0.9 * (point.y - posture.parts[1]), point.z + 0.9 * (point.z - posture.parts[2]));
      }
    }
    // Board frame → world (the board group's origin is the shape frame's centre of mass).
    point.sub(shape.centerOfMass as Vector3).applyQuaternion(boardQuaternion).add(boardPosition);
  }
  out.phase = phase;
  out.heading = 0;
  out.boardPosition.copy(boardPosition);
  out.boardQuaternion.copy(boardQuaternion);
  out.stroking = 0;
  return out;
}
```

`testHumanoid.ts` (a T-pose facing +z, 1.72 m, Mixamo names; bones along +y as Blender exports them does not matter because the rig reads axes from the rest pose):

```ts
import { Bone, Vector3 } from 'three';
import { BONES } from './humanoidBones';

type Spec = [name: string, parent: string | null, position: [number, number, number]];

/** A symmetric T-pose skeleton with MPFB's Mixamo bone names, for rig tests. Positions are world, metres. */
export function createTestHumanoid(scale = 1): { root: Bone; bones: Map<string, Bone> } {
  const specs: Spec[] = [
    [BONES.hips, null, [0, 0.95, 0]],
    [BONES.spine[0], BONES.hips, [0, 1.05, 0]], [BONES.spine[1], BONES.spine[0], [0, 1.17, 0]], [BONES.spine[2], BONES.spine[1], [0, 1.3, 0]],
    [BONES.neck, BONES.spine[2], [0, 1.45, 0]], [BONES.head, BONES.neck, [0, 1.55, 0]],
  ];
  for (const [side, x] of [['left', 1], ['right', -1]] as const) {
    specs.push(
      [BONES.shoulder[side], BONES.spine[2], [x * 0.04, 1.4, 0]], [BONES.arm[side], BONES.shoulder[side], [x * 0.18, 1.4, 0]],
      [BONES.foreArm[side], BONES.arm[side], [x * 0.46, 1.4, 0]], [BONES.hand[side], BONES.foreArm[side], [x * 0.72, 1.4, 0]],
      [BONES.fingers[side][2][0], BONES.hand[side], [x * 0.81, 1.4, 0]],
      [BONES.upLeg[side], BONES.hips, [x * 0.09, 0.9, 0]], [BONES.leg[side], BONES.upLeg[side], [x * 0.09, 0.5, 0]],
      [BONES.foot[side], BONES.leg[side], [x * 0.09, 0.08, 0]], [BONES.toe[side], BONES.foot[side], [x * 0.09, 0.02, 0.14]],
    );
  }
  const bones = new Map<string, Bone>();
  const world = new Map<string, Vector3>();
  let root!: Bone;
  for (const [name, parent, position] of specs) {
    const bone = new Bone();
    bone.name = name;
    const p = new Vector3(...position).multiplyScalar(scale);
    world.set(name, p);
    if (parent) { bone.position.copy(p).sub(world.get(parent)!); bones.get(parent)!.add(bone); }
    else { bone.position.copy(p); root = bone; }
    bones.set(name, bone);
  }
  root.updateMatrixWorld(true);
  return { root, bones };
}
```

- [ ] **Step 4: Run to pass** — `npx vitest run src/scene/rig/riderVisualState.test.ts` → PASS (2 tests).

- [ ] **Step 5: Commit** — `git add src/scene/rig && git commit -m "feat: read the rider's visual state from the snapshot"`

---

### Task 5: HumanoidRig — the skeleton from the physics points

**Files:**
- Create: `src/scene/rig/HumanoidRig.ts`, `src/scene/rig/HumanoidRig.test.ts`

**Interfaces:**
- Consumes: `solveTwoBone`, `orientBone` (Task 3); `BONES`, `RiderVisualState`, `POINT`, `createTestHumanoid`, `posturePoints` (Task 4).
- Produces:
  ```ts
  export class HumanoidRig {
    constructor(bones: ReadonlyMap<string, Bone>);   // captures the bind (rest) pose; throws if a required bone is missing
    solve(state: RiderVisualState): void;             // writes bone quaternions (and the hips' position) for this frame
    readonly joints: { hip: Record<Side, Vector3>; knee; ankle; shoulder; elbow; wrist: Record<Side, Vector3> }; // world, after solve
    readonly facing: Vector3;                          // the chest's world forward after solve
  }
  ```

- [ ] **Step 1: Write the failing tests** (`src/scene/rig/HumanoidRig.test.ts`)

```ts
import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BONES } from './humanoidBones';
import { HumanoidRig } from './HumanoidRig';
import { POINT, createRiderVisualState } from './riderVisualState';
import { posturePoints } from './posturePoints';
import { createTestHumanoid } from './testHumanoid';

function restLengths(bones: Map<string, import('three').Bone>) {
  const lengths = new Map<string, number>();
  for (const bone of bones.values()) if (bone.parent) lengths.set(bone.name, bone.position.length());
  return lengths;
}
function worldOf(bones: Map<string, import('three').Bone>, name: string) { return bones.get(name)!.getWorldPosition(new Vector3()); }

describe('humanoid rig', () => {
  const board = new Vector3(3, 0.1, -40);
  const level = new Quaternion();

  it('stands on the deck: feet on their points, knees toward the toe side, elbows down, no bone stretched', () => {
    const { bones } = createTestHumanoid();
    const lengths = restLengths(bones);
    const rig = new HumanoidRig(bones);
    const state = posturePoints('standing', 'regular', board, level, createRiderVisualState());
    rig.solve(state);
    for (const side of ['left', 'right'] as const) {
      const foot = state.points[side === 'left' ? POINT.leftFoot : POINT.rightFoot];
      expect(Math.abs(rig.joints.ankle[side].y - foot.y - rig.soleHeight)).toBeLessThan(0.01);
      expect(Math.hypot(rig.joints.ankle[side].x - foot.x, rig.joints.ankle[side].z - foot.z)).toBeLessThan(0.12);
      const mid = rig.joints.hip[side].clone().lerp(rig.joints.ankle[side], 0.5);
      expect(rig.joints.knee[side].clone().sub(mid).dot(rig.facing)).toBeGreaterThan(0.01);
      const armMid = rig.joints.shoulder[side].clone().lerp(rig.joints.wrist[side], 0.5);
      expect(rig.joints.elbow[side].y).toBeLessThan(armMid.y + 1e-6);
    }
    expect(rig.facing.x).toBeLessThan(-0.5); // regular faces the board's right (−x) rail
    for (const bone of bones.values()) if (bone.parent) expect(bone.position.length()).toBeCloseTo(lengths.get(bone.name)!, 9);
  });

  it('mirrors goofy against regular across the stringer', () => {
    const regular = createTestHumanoid();
    const goofy = createTestHumanoid();
    new HumanoidRig(regular.bones).solve(posturePoints('standing', 'regular', new Vector3(), level, createRiderVisualState()));
    new HumanoidRig(goofy.bones).solve(posturePoints('standing', 'goofy', new Vector3(), level, createRiderVisualState()));
    for (const [left, right] of [[BONES.foot.left, BONES.foot.right], [BONES.leg.left, BONES.leg.right], [BONES.hand.left, BONES.hand.right]]) {
      const a = worldOf(regular.bones, left);
      const b = worldOf(goofy.bones, right);
      expect(a.x).toBeCloseTo(-b.x, 3);
      expect(a.y).toBeCloseTo(b.y, 3);
      expect(a.z).toBeCloseTo(b.z, 3);
    }
  });

  it('keeps the feet on the deck when the legs are too short for the pelvis point', () => {
    const { bones } = createTestHumanoid(0.9);
    const rig = new HumanoidRig(bones);
    const state = posturePoints('standing', 'regular', new Vector3(), level, createRiderVisualState());
    state.points[POINT.pelvis].y += 0.25;
    rig.solve(state);
    for (const side of ['left', 'right'] as const) {
      const foot = state.points[side === 'left' ? POINT.leftFoot : POINT.rightFoot];
      expect(Math.abs(rig.joints.ankle[side].y - foot.y - rig.soleHeight)).toBeLessThan(0.01);
    }
  });

  it('paddles prone: hands reach their points, knees toward the deck', () => {
    const { bones } = createTestHumanoid();
    const rig = new HumanoidRig(bones);
    const state = posturePoints('prone', 'regular', board, level, createRiderVisualState());
    rig.solve(state);
    for (const side of ['left', 'right'] as const) {
      const hand = state.points[side === 'left' ? POINT.leftHand : POINT.rightHand];
      const reach = rig.joints.shoulder[side].distanceTo(hand);
      if (reach < rig.armLength * 0.98) expect(rig.joints.wrist[side].distanceTo(hand)).toBeLessThan(1e-3);
      expect(rig.facing.y).toBeLessThan(-0.5); // chest down
    }
  });

  it('stays finite for a fallen body lying along its heading', () => {
    const { bones } = createTestHumanoid();
    const rig = new HumanoidRig(bones);
    const state = createRiderVisualState();
    state.phase = 'fallen';
    state.heading = 0;
    const along = [[0, 0, 0], [0, 0, 0.3], [0, 0, 0.6], [0.3, 0, 0.3], [-0.3, 0, 0.3], [0.1, 0, -0.4], [-0.1, 0, -0.4]];
    along.forEach((p, i) => state.points[i].set(p[0], p[1], p[2]));
    rig.solve(state);
    for (const bone of bones.values()) {
      const q = bone.quaternion;
      expect(Number.isFinite(q.x + q.y + q.z + q.w)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run to fail** — FAIL (module missing).

- [ ] **Step 3: Implement `src/scene/rig/HumanoidRig.ts`**

The solve order is:
1. body frame;
2. hips placement and leg-reach correction;
3. spine, neck and head;
4. arms;
5. legs;
6. feet and hands.

Rest data per driven bone: `axisLocal` (toward its child in its own frame), `hintLocal` (a body direction in its own frame).
- The **trunk and legs** use body forward (+z at rest) as the hint.
- The **arms** use body back (−z), since elbows point backward.
- The **feet** use body up (+y).

```ts
import { Bone, Quaternion, Vector3 } from 'three';
import { BONES, REQUIRED_BONES, type Side } from './humanoidBones';
import { orientBone } from './orientBone';
import { POINT, type RiderVisualState } from './riderVisualState';
import { solveTwoBone } from './twoBoneIk';

const SIDES: readonly Side[] = ['left', 'right'];
const REST_FORWARD = new Vector3(0, 0, 1);
const REST_UP = new Vector3(0, 1, 0);
const WORLD_UP = new Vector3(0, 1, 0);

interface Rest { bone: Bone; axis: Vector3; hint: Vector3 }

/** Code-driven detail, degrees and fractions (art direction, not measured). */
const DETAIL = {
  hipsTurn: 10, chestTurn: 25, frontFootTurn: 20, rearFootTurn: 5,
  standingElbowDrop: 0.6, fingerCurlRelaxed: 12, fingerCurlStroke: 30,
  /** A fallen limb's reach, as a share of its full length, through its centre point. */
  fallenReach: 0.92,
};

export class HumanoidRig {
  readonly joints = {
    hip: { left: new Vector3(), right: new Vector3() }, knee: { left: new Vector3(), right: new Vector3() }, ankle: { left: new Vector3(), right: new Vector3() },
    shoulder: { left: new Vector3(), right: new Vector3() }, elbow: { left: new Vector3(), right: new Vector3() }, wrist: { left: new Vector3(), right: new Vector3() },
  };
  readonly facing = new Vector3();
  /** Ankle height above the sole at rest, m. */
  readonly soleHeight: number;
  /** Ankle to mid-foot along the foot at rest, m. */
  readonly heelToMidfoot: number;
  readonly legLength: number;
  readonly armLength: number;
  private readonly rest = new Map<string, Rest>();
  private readonly upper = { leg: 0, arm: 0 };
  private readonly lower = { leg: 0, arm: 0 };
  private readonly v = Array.from({ length: 12 }, () => new Vector3());
  private readonly q = new Quaternion();

  constructor(private readonly bones: ReadonlyMap<string, Bone>) {
    const missing = REQUIRED_BONES.filter((name) => !bones.has(name));
    if (missing.length) throw new Error(`surfer skeleton lacks ${missing.join(', ')}`);
    const world = (name: string) => bones.get(name)!.getWorldPosition(new Vector3());
    const rootOf = bones.get(BONES.hips)!;
    rootOf.updateMatrixWorld(true);
    const capture = (name: string, child: string, hintWorld: Vector3) => {
      const bone = bones.get(name)!;
      const inverse = bone.getWorldQuaternion(new Quaternion()).invert();
      const axis = world(child).sub(world(name)).applyQuaternion(inverse).normalize();
      this.rest.set(name, { bone, axis, hint: hintWorld.clone().applyQuaternion(inverse) });
    };
    capture(BONES.hips, BONES.spine[0], REST_FORWARD);
    capture(BONES.spine[0], BONES.spine[1], REST_FORWARD);
    capture(BONES.spine[1], BONES.spine[2], REST_FORWARD);
    capture(BONES.spine[2], BONES.neck, REST_FORWARD);
    capture(BONES.neck, BONES.head, REST_FORWARD);
    const headInverse = bones.get(BONES.head)!.getWorldQuaternion(new Quaternion()).invert();
    this.rest.set(BONES.head, { bone: bones.get(BONES.head)!, axis: REST_UP.clone().applyQuaternion(headInverse), hint: REST_FORWARD.clone().applyQuaternion(headInverse) });
    for (const side of SIDES) {
      capture(BONES.upLeg[side], BONES.leg[side], REST_FORWARD);
      capture(BONES.leg[side], BONES.foot[side], REST_FORWARD);
      capture(BONES.foot[side], BONES.toe[side], REST_UP);
      capture(BONES.arm[side], BONES.foreArm[side], REST_FORWARD.clone().negate());
      capture(BONES.foreArm[side], BONES.hand[side], REST_FORWARD.clone().negate());
      capture(BONES.hand[side], BONES.fingers[side][2][0], REST_UP);
    }
    this.upper.leg = world(BONES.leg.left).distanceTo(world(BONES.upLeg.left));
    this.lower.leg = world(BONES.foot.left).distanceTo(world(BONES.leg.left));
    this.upper.arm = world(BONES.foreArm.left).distanceTo(world(BONES.arm.left));
    this.lower.arm = world(BONES.hand.left).distanceTo(world(BONES.foreArm.left));
    this.legLength = this.upper.leg + this.lower.leg;
    this.armLength = this.upper.arm + this.lower.arm;
    const ankle = world(BONES.foot.left);
    const toe = world(BONES.toe.left);
    const sole = Math.min(ankle.y, toe.y) - (bones.get(BONES.hips)!.getWorldPosition(new Vector3()).y - rootOf.getWorldPosition(new Vector3()).y);
    this.soleHeight = ankle.y - Math.max(0, Math.min(sole, toe.y - 0.02));
    this.heelToMidfoot = 0.5 * Math.hypot(toe.x - ankle.x, toe.z - ankle.z);
  }

  solve(state: RiderVisualState): void {
    const [up, forward, left, boardUp, boardForward, boardLeft, target, pole, a, b, c, d] = this.v;
    const p = state.points;
    boardUp.set(0, 1, 0).applyQuaternion(state.boardQuaternion);
    boardForward.set(0, 0, 1).applyQuaternion(state.boardQuaternion);
    boardLeft.set(1, 0, 0).applyQuaternion(state.boardQuaternion);
    const upright = state.phase === 'standing' || state.phase === 'landing';
    const lying = state.phase === 'prone' || state.phase === 'push' || state.phase === 'recover';
    const fallen = state.phase === 'fallen';

    // 1. Body frame: up along the spine, forward where the chest faces.
    up.subVectors(p[POINT.torso], p[POINT.pelvis]);
    if (up.lengthSq() < 1e-8) up.copy(boardUp);
    up.normalize();
    if (upright) {
      left.subVectors(p[POINT.leftFoot], p[POINT.rightFoot]).addScaledVector(up, -a.subVectors(p[POINT.leftFoot], p[POINT.rightFoot]).dot(up));
      forward.crossVectors(left, up);
    } else if (lying) forward.copy(boardUp).negate();
    else forward.set(Math.sin(state.heading), 0, Math.cos(state.heading));
    forward.addScaledVector(up, -forward.dot(up));
    if (forward.lengthSq() < 1e-6) forward.copy(WORLD_UP).negate().addScaledVector(up, up.y);
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, 1).addScaledVector(up, -up.z);
    forward.normalize();
    left.crossVectors(up, forward).normalize();
    const turnToward = (out: Vector3, degrees: number) => {
      // Turn `out` about `up` toward the board's nose by `degrees` (never past it).
      d.copy(boardForward).addScaledVector(up, -boardForward.dot(up));
      if (d.lengthSq() < 1e-6 || !upright) return out;
      d.normalize();
      const angle = Math.min((degrees * Math.PI) / 180, Math.acos(Math.max(-1, Math.min(1, out.dot(d)))));
      const sign = Math.sign(c.crossVectors(out, d).dot(up)) || 1;
      return out.applyQuaternion(this.q.setFromAxisAngle(up, sign * angle));
    };

    // 2. Hips at the pelvis point, lowered if the legs cannot reach their feet.
    const hips = this.rest.get(BONES.hips)!;
    const placeHips = (position: Vector3) => {
      hips.bone.position.copy(position);
      if (hips.bone.parent) hips.bone.parent.worldToLocal(hips.bone.position);
      hips.bone.parent?.updateMatrixWorld(true);
      orientBone(hips.bone, hips.axis, hips.hint, up, turnToward(a.copy(forward), DETAIL.hipsTurn));
    };
    placeHips(p[POINT.pelvis]);
    if (upright) {
      let excess = 0;
      for (const side of SIDES) {
        this.ankleTarget(state, side, forward, boardUp, target);
        this.bones.get(BONES.upLeg[side])!.getWorldPosition(b);
        excess = Math.max(excess, b.distanceTo(target) - 0.97 * this.legLength);
      }
      if (excess > 0) placeHips(c.copy(p[POINT.pelvis]).addScaledVector(up, -excess * 1.05));
    }
    this.facing.copy(turnToward(a.copy(forward), DETAIL.chestTurn));

    // 3. Spine, neck, head: the chest turns toward the nose, the head looks where the board goes.
    const chestUp = b.subVectors(p[POINT.head], p[POINT.torso]);
    if (chestUp.lengthSq() < 1e-8) chestUp.copy(up);
    chestUp.normalize();
    BONES.spine.forEach((name, i) => {
      const r = this.rest.get(name)!;
      const w = (i + 1) / 3;
      target.copy(up).lerp(chestUp, w).normalize();
      pole.copy(forward).lerp(this.facing, w);
      orientBone(r.bone, r.axis, r.hint, target, pole);
    });
    const neck = this.rest.get(BONES.neck)!;
    orientBone(neck.bone, neck.axis, neck.hint, target.copy(chestUp), this.facing);
    const head = this.rest.get(BONES.head)!;
    if (lying) { target.copy(boardUp).addScaledVector(boardForward, 0.3).normalize(); pole.copy(boardForward); }
    else if (upright) { target.copy(WORLD_UP); pole.copy(boardForward).lerp(this.facing, 0.25); }
    else { target.copy(chestUp); pole.copy(this.facing); }
    orientBone(head.bone, head.axis, head.hint, target, pole);

    // 4–6. Limbs.
    for (const side of SIDES) {
      const outward = c.copy(left).multiplyScalar(side === 'left' ? 1 : -1);
      // Arms.
      const shoulder = this.bones.get(BONES.arm[side])!.getWorldPosition(this.joints.shoulder[side]);
      const hand = p[side === 'left' ? POINT.leftHand : POINT.rightHand];
      if (fallen) target.subVectors(hand, shoulder).setLength(DETAIL.fallenReach * this.armLength).add(shoulder);
      else target.copy(hand);
      if (state.phase === 'prone') pole.copy(boardUp).addScaledVector(outward, 0.5);
      else if (state.phase === 'push') pole.copy(boardForward).negate().addScaledVector(boardUp, 0.3);
      else if (upright) pole.copy(up).multiplyScalar(-DETAIL.standingElbowDrop).addScaledVector(this.facing, -0.2);
      else pole.copy(this.facing).negate();
      solveTwoBone(shoulder, this.upper.arm, this.lower.arm, target, pole, this.joints.elbow[side], this.joints.wrist[side]);
      this.aimLimb(BONES.arm[side], BONES.foreArm[side], shoulder, this.joints.elbow[side], this.joints.wrist[side]);
      const handRest = this.rest.get(BONES.hand[side])!;
      orientBone(handRest.bone, handRest.axis, handRest.hint, d.subVectors(this.joints.wrist[side], this.joints.elbow[side]).normalize(), fallen ? this.facing : boardUp);
      this.curlFingers(side, state.phase === 'prone' ? DETAIL.fingerCurlRelaxed + (DETAIL.fingerCurlStroke - DETAIL.fingerCurlRelaxed) * state.stroking : DETAIL.fingerCurlRelaxed);

      // Legs.
      const hip = this.bones.get(BONES.upLeg[side])!.getWorldPosition(this.joints.hip[side]);
      const foot = p[side === 'left' ? POINT.leftFoot : POINT.rightFoot];
      if (upright) this.ankleTarget(state, side, forward, boardUp, target);
      else if (fallen) target.subVectors(foot, hip).setLength(DETAIL.fallenReach * this.legLength).add(hip);
      else target.copy(foot);
      if (upright) {
        pole.copy(this.facing);
        const other = p[side === 'left' ? POINT.rightFoot : POINT.leftFoot];
        if (a.subVectors(other, foot).dot(boardForward) > 0) pole.addScaledVector(boardForward, 0.5); // the rear knee turns in
      } else if (lying) pole.copy(boardUp).negate();
      else pole.copy(this.facing);
      solveTwoBone(hip, this.upper.leg, this.lower.leg, target, pole, this.joints.knee[side], this.joints.ankle[side]);
      this.aimLimb(BONES.upLeg[side], BONES.leg[side], hip, this.joints.knee[side], this.joints.ankle[side]);
      const footRest = this.rest.get(BONES.foot[side])!;
      if (upright) orientBone(footRest.bone, footRest.axis, footRest.hint, this.footForward(side, state, forward, boardUp, d), boardUp);
      else orientBone(footRest.bone, footRest.axis, footRest.hint, d.subVectors(this.joints.ankle[side], this.joints.knee[side]).normalize(), lying ? a.copy(boardUp).negate() : this.facing);
    }
  }

  /** Where a standing foot's ankle goes: above the deck point, behind mid-foot. */
  private ankleTarget(state: RiderVisualState, side: Side, forward: Vector3, boardUp: Vector3, out: Vector3): Vector3 {
    const point = state.points[side === 'left' ? POINT.leftFoot : POINT.rightFoot];
    const along = this.footForward(side, state, forward, boardUp, this.v[11].clone());
    return out.copy(point).addScaledVector(boardUp, this.soleHeight).addScaledVector(along, -this.heelToMidfoot);
  }

  /** A standing foot points across the deck toward the toe side, the front foot turned toward the nose. */
  private footForward(side: Side, state: RiderVisualState, forward: Vector3, boardUp: Vector3, out: Vector3): Vector3 {
    const nose = this.v[10].set(0, 0, 1).applyQuaternion(state.boardQuaternion);
    const foot = state.points[side === 'left' ? POINT.leftFoot : POINT.rightFoot];
    const other = state.points[side === 'left' ? POINT.rightFoot : POINT.leftFoot];
    const isFront = this.v[9].subVectors(foot, other).dot(nose) > 0;
    out.copy(forward).addScaledVector(boardUp, -forward.dot(boardUp)).normalize();
    const turn = ((isFront ? DETAIL.frontFootTurn : DETAIL.rearFootTurn) * Math.PI) / 180;
    return out.multiplyScalar(Math.cos(turn)).addScaledVector(nose.addScaledVector(boardUp, -nose.dot(boardUp)).normalize(), Math.sin(turn)).normalize();
  }

  /** Aims a two-bone limb's upper and lower bones at the solved joints, their hints toward the bend. */
  private aimLimb(upperName: string, lowerName: string, root: Vector3, mid: Vector3, end: Vector3): void {
    const [bend, dirUpper, dirLower] = [this.v[9], this.v[10], this.v[11]];
    dirUpper.subVectors(mid, root).normalize();
    dirLower.subVectors(end, mid).normalize();
    bend.subVectors(mid, this.v[8].copy(root).lerp(end, 0.5));
    if (bend.lengthSq() < 1e-10) bend.copy(this.facing);
    const upper = this.rest.get(upperName)!;
    orientBone(upper.bone, upper.axis, upper.hint, dirUpper, bend);
    const lower = this.rest.get(lowerName)!;
    orientBone(lower.bone, lower.axis, lower.hint, dirLower, bend);
  }

  /** Curls each finger's joints by `degrees` about its own knuckle axis (cupped while stroking). */
  private curlFingers(side: Side, degrees: number): void {
    const angle = (degrees * Math.PI) / 180;
    for (const chain of BONES.fingers[side]) {
      for (const name of chain) {
        const bone = this.bones.get(name);
        if (!bone) continue;
        // Knuckles bend about the finger's local x axis in MPFB's export (checked on the sheet; flip the sign if they bend backward).
        bone.quaternion.setFromAxisAngle(this.v[8].set(1, 0, 0), angle).premultiply(this.restLocal(bone));
      }
    }
  }

  private readonly restLocals = new Map<Bone, Quaternion>();
  private restLocal(bone: Bone): Quaternion {
    let rest = this.restLocals.get(bone);
    if (!rest) { rest = bone.quaternion.clone(); this.restLocals.set(bone, rest); }
    return rest;
  }
}
```

Implementation notes to honour while typing it in:
- `curlFingers` must capture rest locals in the constructor, not lazily after a solve has changed them. Call `restLocal` for every finger bone at the end of the constructor.
- `hips.bone.parent` is the armature node in the real GLB. `placeHips` converts the world pelvis point into that parent's space.
- The fallback chain in the body frame must never divide by zero (covered by the fallen test).

- [ ] **Step 4: Run to pass** — `npx vitest run src/scene/rig` → all PASS.
  - Fix the rig rather than the tests.
  - If "mirrors goofy" fails by a few mm, check that every detail rule is expressed through `forward`, `up`, `boardForward` and `boardUp`, never a hard-coded axis.

- [ ] **Step 5: Commit** — `git add src/scene/rig && git commit -m "feat: pose a humanoid skeleton from the physics rider's points"`

---

### Task 6: Build the four surfers (Blender + MPFB2) and check the assets

**Files:**
- Create: `scripts/assets/surfers.json`, `scripts/assets/build_surfers.py`, `scripts/assets/pack-surfers.mjs`, `src/scene/character/surferAssets.test.ts`
- Output: `public/assets/surfers/surfer1.glb` … `surfer4.glb`, `public/assets/surfers/surfers.json`, `public/assets/basis/basis_transcoder.{js,wasm}`

**Interfaces:**
- Produces: `public/assets/surfers/surfers.json`:
  ```json
  { "surfers": [ { "id": "surfer1", "file": "surfers/surfer1.glb", "sex": "female", "height": 1.66, "skin": "young_african_female", "hair": "braid01", "lods": ["LOD0", "LOD1"] } ] }
  ```
  Each GLB has one armature with the Mixamo bones, a body mesh node per LOD named `LOD0`/`LOD1`, and eyes, eyebrows, eyelashes and hair meshes shared by both LODs.

- [ ] **Step 1: Write the recipes** (`scripts/assets/surfers.json`). Macros are MPFB's 0–1 values. Heights are kept within about ±5 % of 1.72 m.

```json
{
  "pack": "scripts/assets/.cache/makehuman_system_assets_cc0.zip",
  "rig": "mixamo",
  "surfers": [
    { "id": "surfer1", "sex": "female", "macros": { "gender": 0.0, "age": 0.45, "muscle": 0.62, "weight": 0.45, "height": 0.45, "proportions": 0.7, "cupsize": 0.45, "firmness": 0.6, "race": { "african": 0.9, "asian": 0.05, "caucasian": 0.05 } }, "skin": "young_african_female", "hair": "braid01", "eyebrows": "eyebrow010", "eyes": "brown", "proxy": "female_generic" },
    { "id": "surfer2", "sex": "female", "macros": { "gender": 0.0, "age": 0.42, "muscle": 0.6, "weight": 0.42, "height": 0.5, "proportions": 0.7, "cupsize": 0.4, "firmness": 0.6, "race": { "african": 0.05, "asian": 0.05, "caucasian": 0.9 } }, "skin": "young_caucasian_female", "hair": "ponytail01", "eyebrows": "eyebrow001", "eyes": "bluegreen", "proxy": "female_generic" },
    { "id": "surfer3", "sex": "male", "macros": { "gender": 1.0, "age": 0.45, "muscle": 0.66, "weight": 0.48, "height": 0.52, "proportions": 0.7, "race": { "african": 0.85, "asian": 0.05, "caucasian": 0.1 } }, "skin": "young_african_male", "hair": "short02", "eyebrows": "eyebrow002", "eyes": "brown", "proxy": "male_generic" },
    { "id": "surfer4", "sex": "male", "macros": { "gender": 1.0, "age": 0.5, "muscle": 0.6, "weight": 0.5, "height": 0.56, "proportions": 0.7, "race": { "african": 0.05, "asian": 0.85, "caucasian": 0.1 } }, "skin": "young_asian_male", "hair": "short04", "eyebrows": "eyebrow006", "eyes": "brownlight", "proxy": "male_generic" }
  ]
}
```

- [ ] **Step 2: Discover the MPFB API on this install** (MPFB is `bl_ext.blender_org.mpfb` under Blender 5.2):
  - Run `Blender -b --python-expr "import bl_ext.blender_org.mpfb.services.humanservice as h; import inspect; print(inspect.signature(h.HumanService.add_builtin_rig))"`.
  - Grep `services/assetservice.py` and `ui/` for the pack installer (`load_pack` or similar) and for how asset paths resolve (`AssetService.find_asset_absolute_path`).
  - Record the exact calls in the script's header comment.

- [ ] **Step 3: Write `scripts/assets/build_surfers.py`**

```python
"""Builds the four G7 surfers with MPFB 2 in headless Blender and exports raw GLBs.

Run: Blender --background --python scripts/assets/build_surfers.py
Needs the MPFB extension (blender_org) enabled and the MakeHuman CC0 system asset
pack (scripts/assets/surfers.json → "pack"); installs the pack on first run.
"""
import json
import os
import sys

import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RECIPES = json.load(open(os.path.join(ROOT, "scripts/assets/surfers.json")))
OUT = os.path.join(ROOT, "scripts/assets/.build")
os.makedirs(OUT, exist_ok=True)

from bl_ext.blender_org.mpfb.services.assetservice import AssetService  # noqa: E402
from bl_ext.blender_org.mpfb.services.humanservice import HumanService  # noqa: E402
from bl_ext.blender_org.mpfb.services.targetservice import TargetService  # noqa: E402
from bl_ext.blender_org.mpfb.services.exportservice import ExportService  # noqa: E402


def ensure_pack():
    if AssetService.system_assets_pack_is_installed():
        return
    pack = os.path.join(ROOT, RECIPES["pack"])
    bpy.ops.mpfb.load_pack(filepath=pack)  # name confirmed in Step 2
    AssetService.update_all_asset_lists()


def asset(kind, name, ext):
    path = AssetService.find_asset_absolute_path(f"{name}/{name}.{ext}", kind)
    if not path:
        raise SystemExit(f"missing {kind}/{name}.{ext} in the MakeHuman asset pack")
    return path


def build(recipe):
    bpy.ops.wm.read_homefile(use_empty=True)
    basemesh = HumanService.create_human(macro_detail_dict=recipe["macros"], scale=0.1)
    basemesh.name = "LOD0"
    HumanService.add_builtin_rig(basemesh, RECIPES["rig"])
    HumanService.set_character_skin(asset("skins", recipe["skin"], "mhmat"), basemesh, skin_type="GAMEENGINE")
    HumanService.add_mhclo_asset(asset("eyes", "high-poly", "mhclo"), basemesh, asset_type="Eyes", material_type="GAMEENGINE")
    HumanService.add_mhclo_asset(asset("eyebrows", recipe["eyebrows"], "mhclo"), basemesh, asset_type="Eyebrows", material_type="GAMEENGINE")
    HumanService.add_mhclo_asset(asset("eyelashes", "eyelashes01", "mhclo"), basemesh, asset_type="Eyelashes", material_type="GAMEENGINE")
    HumanService.add_mhclo_asset(asset("hair", recipe["hair"], "mhclo"), basemesh, asset_type="Hair", material_type="GAMEENGINE")
    proxy = HumanService.add_mhclo_asset(asset("proxymeshes", recipe["proxy"], "proxy"), basemesh, asset_type="Proxymeshes", material_type="GAMEENGINE")
    proxy.name = "LOD1"
    proxy.hide_viewport = False
    proxy.hide_render = False
    basemesh.hide_viewport = False
    TargetService.bake_targets(basemesh)
    ExportService.bake_modifiers_remove_helpers(basemesh, bake_masks=True, remove_helpers=True, also_proxy=False)
    height = max(v.co.z for v in basemesh.data.vertices) - min(v.co.z for v in basemesh.data.vertices)
    path = os.path.join(OUT, f"{recipe['id']}.glb")
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", use_visible=False, export_yup=True, export_apply=False,
        export_skins=True, export_animations=False, export_morph=False, export_tangents=False,
        export_image_format="AUTO", export_materials="EXPORT",
    )
    return {"id": recipe["id"], "file": f"surfers/{recipe['id']}.glb", "sex": recipe["sex"], "height": round(height, 3),
            "skin": recipe["skin"], "hair": recipe["hair"], "lods": ["LOD0", "LOD1"]}


ensure_pack()
built = [build(recipe) for recipe in RECIPES["surfers"]]
json.dump({"surfers": built}, open(os.path.join(OUT, "surfers.json"), "w"), indent=2)
print("built", [s["id"] for s in built])
```

- [ ] **Step 4: Run the Blender build** — `/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/assets/build_surfers.py`.
  - Expected: `built ['surfer1', 'surfer2', 'surfer3', 'surfer4']` and four raw GLBs in `scripts/assets/.build/`.
  - Fix the script against the real API until it runs, recording every deviation in its header comment. Likely deviations:
    - the proxy is returned differently;
    - the pack operator has another name;
    - `bake_targets` must run before `add_builtin_rig`;
    - helpers must be removed before export.

- [ ] **Step 5: Write `scripts/assets/pack-surfers.mjs`**

```js
// Compresses the raw surfers (meshopt geometry, KTX2/ETC1S colour textures capped at 2048 px)
// and copies three's Basis transcoder next to them.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';

const BUILD = 'scripts/assets/.build';
const OUT = 'public/assets/surfers';
mkdirSync(OUT, { recursive: true });
mkdirSync('public/assets/basis', { recursive: true });
const manifest = JSON.parse(readFileSync(`${BUILD}/surfers.json`, 'utf8'));
for (const surfer of manifest.surfers) {
  execFileSync('npx', ['gltfpack', '-i', `${BUILD}/${surfer.id}.glb`, '-o', `${OUT}/${surfer.id}.glb`, '-cc', '-tc', '-tl', '2048', '-kn', '-km', '-noq'], { stdio: 'inherit' });
  surfer.bytes = statSync(`${OUT}/${surfer.id}.glb`).size;
}
for (const file of ['basis_transcoder.js', 'basis_transcoder.wasm']) copyFileSync(`node_modules/three/examples/jsm/libs/basis/${file}`, `public/assets/basis/${file}`);
writeFileSync(`${OUT}/surfers.json`, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(manifest.surfers.map((s) => `${s.id} ${(s.bytes / 1e6).toFixed(1)} MB`).join('\n'));
```

`-noq` keeps float positions, so the skinned rest pose stays exact. `-kn` keeps the named LOD and bone nodes, and `-km` keeps material names. If `-tc` is unavailable in the npm build, replace it with `-tw` (WebP) and record that in `docs/ASSETS.md`.

- [ ] **Step 6: Run the packing** — `node scripts/assets/pack-surfers.mjs` → four sizes printed. Record them in `docs/ASSETS.md`.

- [ ] **Step 7: Write the asset test** (`src/scene/character/surferAssets.test.ts`)

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REQUIRED_BONES } from '../rig/humanoidBones';

const sanitize = (name: string) => name.replace(/\s/g, '_').replace(/[[\]\.:\/]/g, '');
function glbJson(path: string) {
  const bytes = readFileSync(path);
  const length = bytes.readUInt32LE(12);
  return JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'));
}

const manifest = JSON.parse(readFileSync('public/assets/surfers/surfers.json', 'utf8'));

describe('committed surfers', () => {
  it('lists four surfers, two women and two men, near the reference height', () => {
    expect(manifest.surfers).toHaveLength(4);
    expect(manifest.surfers.filter((s: { sex: string }) => s.sex === 'female')).toHaveLength(2);
    for (const surfer of manifest.surfers) expect(Math.abs(surfer.height - 1.72) / 1.72).toBeLessThan(0.07);
  });

  it.each(manifest.surfers.map((s: { id: string }) => s.id))('%s carries the rig’s bones, one skin and both LODs', (id) => {
    const json = glbJson(`public/assets/surfers/${id}.glb`);
    const names = new Set(json.nodes.map((n: { name?: string }) => sanitize(n.name ?? '')));
    for (const bone of REQUIRED_BONES) expect(names, bone).toContain(bone);
    expect(json.skins.length).toBeGreaterThanOrEqual(1);
    expect(names).toContain('LOD0');
    expect(names).toContain('LOD1');
    expect(json.extensionsUsed).toContain('EXT_meshopt_compression');
  });
});
```

- [ ] **Step 8: Run to pass** — `npx vitest run src/scene/character/surferAssets.test.ts` → PASS.

- [ ] **Step 9: Update `docs/ASSETS.md`** with MakeHuman base mesh and system assets (CC0, makehumancommunity.org), MPFB 2 (the tool, GPL; its outputs are not covered by the GPL per MakeHuman's licence FAQ), each skin, hair and eyebrow asset used, and the sizes.

- [ ] **Step 10: Commit** — `git add scripts/assets public/assets/surfers public/assets/basis src/scene/character/surferAssets.test.ts docs/ASSETS.md && git commit -m "feat: build four MakeHuman surfers on a Mixamo skeleton"`

---

### Task 7: Outfits, wet materials, the skinned surfer and its fallback

**Files:**
- Create: `src/scene/character/outfits.ts`, `src/scene/character/outfits.test.ts`, `src/scene/character/surferMaterial.ts`, `src/scene/character/SkinnedSurfer.ts`, `src/scene/character/SkinnedSurfer.test.ts`, `src/scene/character/SurferView.ts`
- Modify: `src/game/PhysicalMode.ts`

**Interfaces:**
- Consumes: `HumanoidRig` (Task 5), `readRiderSnapshot` and `RiderVisualState` (Task 4), the GLBs (Task 6).
- Produces:
  ```ts
  // outfits.ts
  export type OutfitId = 'fullsuit' | 'springsuit' | 'vestShorts' | 'vestBikini';
  export type Chain = 'torso' | 'head' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';
  export function chainOf(boneName: string): Chain;
  export interface RestSkeleton { names: readonly string[]; positions: readonly Vector3[] } // bind-pose world joint positions by bone index
  export function computeOutfitCoverage(positions: ArrayLike<number>, skinIndex: ArrayLike<number>, skinWeight: ArrayLike<number>, rest: RestSkeleton, outfit: OutfitId): Float32Array; // vec4 per vertex: garment A, garment B, accent, unused (signed metres, clamped ±0.2)
  export const OUTFITS: readonly OutfitId[];
  // surferMaterial.ts
  export interface OutfitColors { suit: Color; accent: Color; bottoms: Color }
  export function dressMaterial(material: MeshStandardMaterial, colors: OutfitColors): MeshPhysicalMaterial; // wet skin + coverage shader
  // SkinnedSurfer.ts
  export class SkinnedSurfer { readonly group: Group; static load(url: string, renderer?: WebGLRenderer): Promise<SkinnedSurfer>;
    update(state: RiderVisualState, cameraPosition?: Vector3): void; setOutfit(outfit: OutfitId, colors?: Partial<OutfitColors>): void; setShadows(cast: boolean, receive: boolean): void }
  // SurferView.ts
  export class SurferView { readonly group: Group; load(presetId?: string): void; update(state: RiderVisualState, cameraPosition?: Vector3): void; get skinned(): SkinnedSurfer | undefined }
  ```

- [ ] **Step 1: Write the failing outfit tests** (`src/scene/character/outfits.test.ts`). They use a synthetic skeleton (`createTestHumanoid`) and hand-placed vertices, each skinned 100 % to one bone.

```ts
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BONES } from '../rig/humanoidBones';
import { createTestHumanoid } from '../rig/testHumanoid';
import { chainOf, computeOutfitCoverage, type RestSkeleton } from './outfits';

const { bones } = createTestHumanoid();
const names = [...bones.keys()];
const rest: RestSkeleton = { names, positions: names.map((n) => bones.get(n)!.getWorldPosition(new Vector3())) };
function coverage(outfit: Parameters<typeof computeOutfitCoverage>[4], bone: string, point: [number, number, number]) {
  const index = names.indexOf(bone);
  return computeOutfitCoverage(point, [index, 0, 0, 0], [1, 0, 0, 0], rest, outfit);
}

describe('outfits', () => {
  it('assigns bones to limb chains', () => {
    expect(chainOf(BONES.hand.left)).toBe('leftArm');
    expect(chainOf(BONES.toe.right)).toBe('rightLeg');
    expect(chainOf(BONES.spine[1])).toBe('torso');
    expect(chainOf(BONES.head)).toBe('head');
  });

  it('a full suit covers the forearm but not the hand, the shin but not the foot', () => {
    expect(coverage('fullsuit', BONES.foreArm.left, [0.55, 1.4, 0])[0]).toBeGreaterThan(0);
    expect(coverage('fullsuit', BONES.hand.left, [0.78, 1.4, 0])[0]).toBeLessThan(0);
    expect(coverage('fullsuit', BONES.leg.right, [-0.09, 0.3, 0])[0]).toBeGreaterThan(0);
    expect(coverage('fullsuit', BONES.foot.right, [-0.09, 0.04, 0.1])[0]).toBeLessThan(0);
    expect(coverage('fullsuit', BONES.head, [0, 1.62, 0])[0]).toBeLessThan(0);
  });

  it('a spring suit stops above the elbow and above the knee', () => {
    expect(coverage('springsuit', BONES.arm.left, [0.22, 1.4, 0])[0]).toBeGreaterThan(0);
    expect(coverage('springsuit', BONES.foreArm.left, [0.55, 1.4, 0])[0]).toBeLessThan(0);
    expect(coverage('springsuit', BONES.upLeg.left, [0.09, 0.85, 0])[0]).toBeGreaterThan(0);
    expect(coverage('springsuit', BONES.leg.left, [0.09, 0.4, 0])[0]).toBeLessThan(0);
  });

  it('boardshorts cover the hips and upper thighs; the rash vest covers the chest; both are crisp (signed distance)', () => {
    expect(coverage('vestShorts', BONES.hips, [0, 0.9, 0])[1]).toBeGreaterThan(0);
    expect(coverage('vestShorts', BONES.upLeg.left, [0.09, 0.8, 0])[1]).toBeGreaterThan(0);
    expect(coverage('vestShorts', BONES.leg.left, [0.09, 0.35, 0])[1]).toBeLessThan(0);
    expect(coverage('vestShorts', BONES.spine[2], [0, 1.35, 0])[0]).toBeGreaterThan(0);
    const justAbove = coverage('springsuit', BONES.foreArm.left, [0.47, 1.4, 0])[0];
    expect(Math.abs(justAbove)).toBeLessThan(0.2);
  });

  it('a bikini bottom is smaller than boardshorts', () => {
    expect(coverage('vestBikini', BONES.upLeg.left, [0.09, 0.8, 0])[1]).toBeLessThan(0);
    expect(coverage('vestBikini', BONES.hips, [0, 0.9, 0])[1]).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to fail**, then **implement `outfits.ts`**.
  - **Rules:** each outfit has garment A (suit or vest), garment B (shorts or bikini; none for suits), and an accent (a chest–shoulder yoke on suits; none on vests).
  - **Per chain, a rule is one of:**
    - `'all'` or `'none'`;
    - a limb cut `{ from, to, at, keep: 'root' | 'tip' }`, where the plane passes `at` of the way from joint `from` to joint `to`, normal along `from→to`;
    - a torso band `{ above?: number; below?: number }`, measured along the hips→neck line (0 at the hips joint, 1 at the neck).
  - **Values:** a vertex's value is the signed distance to its chain's plane, positive where covered, clamped to ±0.2. For a band it is the minimum of its constraints. Its chain is the chain holding the largest summed skin weight.

```ts
import { Vector3 } from 'three';
import { BONES } from '../rig/humanoidBones';

export type OutfitId = 'fullsuit' | 'springsuit' | 'vestShorts' | 'vestBikini';
export type Chain = 'torso' | 'head' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';
export const OUTFITS: readonly OutfitId[] = ['fullsuit', 'springsuit', 'vestShorts', 'vestBikini'];
export interface RestSkeleton { names: readonly string[]; positions: readonly Vector3[] }

type Limb = 'arm' | 'leg';
type Rule = 'all' | 'none' | { limb: Limb; segment: 'upper' | 'lower'; at: number; keep: 'root' | 'tip' } | { above?: number; below?: number } | { neck: number };
interface Garment { torso: Rule; head: Rule; arm: Rule; leg: Rule }
const NONE: Garment = { torso: 'none', head: 'none', arm: 'none', leg: 'none' };
/** Where garments end (fractions along the bone or the hips→neck line). Art direction from wetsuit and swimwear cuts. */
const OUTFIT_RULES: Record<OutfitId, [Garment, Garment, Garment]> = {
  fullsuit: [
    { torso: 'all', head: { neck: 0.55 }, arm: { limb: 'arm', segment: 'lower', at: 0.93, keep: 'root' }, leg: { limb: 'leg', segment: 'lower', at: 0.95, keep: 'root' } },
    NONE,
    { torso: { above: 0.62 }, head: 'none', arm: { limb: 'arm', segment: 'upper', at: 0.35, keep: 'root' }, leg: 'none' },
  ],
  springsuit: [
    { torso: 'all', head: { neck: 0.55 }, arm: { limb: 'arm', segment: 'upper', at: 0.4, keep: 'root' }, leg: { limb: 'leg', segment: 'upper', at: 0.45, keep: 'root' } },
    NONE,
    { torso: { above: 0.62 }, head: 'none', arm: { limb: 'arm', segment: 'upper', at: 0.25, keep: 'root' }, leg: 'none' },
  ],
  vestShorts: [
    { torso: { above: 0.12 }, head: { neck: 0.4 }, arm: { limb: 'arm', segment: 'upper', at: 0.45, keep: 'root' }, leg: 'none' },
    { torso: { below: 0.28 }, head: 'none', arm: 'none', leg: { limb: 'leg', segment: 'upper', at: 0.55, keep: 'root' } },
    NONE,
  ],
  vestBikini: [
    { torso: { above: 0.12 }, head: { neck: 0.4 }, arm: { limb: 'arm', segment: 'upper', at: 0.45, keep: 'root' }, leg: 'none' },
    { torso: { below: 0.06 }, head: 'none', arm: 'none', leg: { limb: 'leg', segment: 'upper', at: 0.06, keep: 'root' } },
    NONE,
  ],
};

const CHAIN_OF = new Map<string, Chain>();
for (const side of ['left', 'right'] as const) {
  const arm: Chain = side === 'left' ? 'leftArm' : 'rightArm';
  const leg: Chain = side === 'left' ? 'leftLeg' : 'rightLeg';
  [BONES.arm[side], BONES.foreArm[side], BONES.hand[side], ...BONES.fingers[side].flat()].forEach((b) => CHAIN_OF.set(b, arm));
  [BONES.upLeg[side], BONES.leg[side], BONES.foot[side], BONES.toe[side]].forEach((b) => CHAIN_OF.set(b, leg));
}
[BONES.neck, BONES.head].forEach((b) => CHAIN_OF.set(b, 'head'));

/** The chain a bone belongs to (the torso when unlisted: hips, spine, shoulders, helpers). */
export function chainOf(boneName: string): Chain {
  if (CHAIN_OF.has(boneName)) return CHAIN_OF.get(boneName)!;
  if (/Left.*(Hand|Arm)/.test(boneName)) return 'leftArm';
  if (/Right.*(Hand|Arm)/.test(boneName)) return 'rightArm';
  if (/Left.*(Leg|Foot|Toe)/.test(boneName)) return 'leftLeg';
  if (/Right.*(Leg|Foot|Toe)/.test(boneName)) return 'rightLeg';
  if (/Head|Neck|Eye|Jaw/.test(boneName)) return 'head';
  return 'torso';
}

const LIMB_JOINTS = {
  arm: { left: [BONES.arm.left, BONES.foreArm.left, BONES.hand.left], right: [BONES.arm.right, BONES.foreArm.right, BONES.hand.right] },
  leg: { left: [BONES.upLeg.left, BONES.leg.left, BONES.foot.left], right: [BONES.upLeg.right, BONES.leg.right, BONES.foot.right] },
} as const;
const LIMIT = 0.2;
const scratch = new Vector3();

function signedValue(rule: Rule, chain: Chain, p: Vector3, joint: (name: string) => Vector3): number {
  if (rule === 'all') return LIMIT;
  if (rule === 'none') return -LIMIT;
  if ('limb' in rule) {
    const side = chain.startsWith('left') ? 'left' : 'right';
    const [a, b, c] = LIMB_JOINTS[rule.limb][side];
    const from = joint(rule.segment === 'upper' ? a : b);
    const to = joint(rule.segment === 'upper' ? b : c);
    const normal = scratch.subVectors(to, from).normalize();
    const plane = from.clone().lerp(to, rule.at);
    const d = p.clone().sub(plane).dot(normal);
    return rule.keep === 'root' ? -d : d;
  }
  const hips = joint(BONES.hips);
  const neck = joint(BONES.neck);
  if ('neck' in rule) {
    const head = joint(BONES.head);
    const normal = scratch.subVectors(head, neck).normalize();
    return -p.clone().sub(neck.clone().lerp(head, rule.neck)).dot(normal);
  }
  const axis = scratch.subVectors(neck, hips);
  const length = axis.length();
  axis.divideScalar(length);
  const t = p.clone().sub(hips).dot(axis);
  let value = LIMIT;
  if (rule.above !== undefined) value = Math.min(value, t - rule.above * length);
  if (rule.below !== undefined) value = Math.min(value, rule.below * length - t);
  return value;
}

export function computeOutfitCoverage(positions: ArrayLike<number>, skinIndex: ArrayLike<number>, skinWeight: ArrayLike<number>, rest: RestSkeleton, outfit: OutfitId): Float32Array {
  const count = positions.length / 3;
  const out = new Float32Array(count * 4);
  const chains = rest.names.map(chainOf);
  const index = new Map(rest.names.map((n, i) => [n, i]));
  const joint = (name: string) => rest.positions[index.get(name)!];
  const rules = OUTFIT_RULES[outfit];
  const p = new Vector3();
  const weights = new Map<Chain, number>();
  for (let v = 0; v < count; v += 1) {
    weights.clear();
    for (let k = 0; k < 4; k += 1) {
      const w = skinWeight[v * 4 + k];
      if (w > 0) { const chain = chains[skinIndex[v * 4 + k]]; weights.set(chain, (weights.get(chain) ?? 0) + w); }
    }
    let chain: Chain = 'torso'; let best = -1;
    for (const [c, w] of weights) if (w > best) { best = w; chain = c; }
    p.set(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]);
    const part = chain === 'torso' ? 'torso' : chain === 'head' ? 'head' : chain.endsWith('Arm') ? 'arm' : 'leg';
    for (let g = 0; g < 3; g += 1) {
      const value = signedValue(rules[g][part], chain, p, joint);
      out[v * 4 + g] = Math.max(-LIMIT, Math.min(LIMIT, value));
    }
  }
  return out;
}
```

Run `npx vitest run src/scene/character/outfits.test.ts` → PASS (5 tests).

- [ ] **Step 3: Implement `surferMaterial.ts`**. It converts each GLB material to `MeshPhysicalMaterial` and applies the wet look:
  - **Skin:** roughness 0.45, clearcoat 0.35, clearcoat roughness 0.3.
  - **Hair:** colour × 0.6, roughness 0.35, `alphaTest` 0.5, `alphaToCoverage` true.
  - **Eyes:** unchanged.

  On the body material, `onBeforeCompile` adds the attribute `outfitCoverage` and the fragment mix.

```ts
import { Color, MeshPhysicalMaterial, type MeshStandardMaterial } from 'three';

export interface OutfitColors { suit: Color; accent: Color; bottoms: Color }
export const DEFAULT_COLORS: OutfitColors = { suit: new Color('#121417'), accent: new Color('#1f6f78'), bottoms: new Color('#c8553d') };
/** Wet neoprene and swimwear: glossier than skin (art direction). */
const FABRIC_ROUGHNESS = 0.38;

export function wetMaterial(source: MeshStandardMaterial, role: 'skin' | 'hair' | 'eyes' | 'other'): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial();
  material.name = source.name;
  material.map = source.map; material.normalMap = source.normalMap; material.color.copy(source.color);
  material.transparent = source.transparent; material.side = source.side;
  if (role === 'skin') { material.roughness = 0.45; material.clearcoat = 0.35; material.clearcoatRoughness = 0.3; }
  if (role === 'hair') { material.color.multiplyScalar(0.6); material.roughness = 0.35; material.alphaTest = 0.5; material.alphaToCoverage = true; material.transparent = false; }
  if (role === 'eyes') { material.roughness = 0.05; material.clearcoat = 1; }
  return material;
}

/** Adds the outfit: coverage from the `outfitCoverage` attribute, crisp to ±4 mm. */
export function dressMaterial(material: MeshPhysicalMaterial, colors: OutfitColors): MeshPhysicalMaterial {
  material.userData.outfit = { uSuit: { value: colors.suit }, uAccent: { value: colors.accent }, uBottoms: { value: colors.bottoms } };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, material.userData.outfit);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 outfitCoverage;\nvarying vec4 vCoverage;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCoverage = outfitCoverage;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vCoverage;\nuniform vec3 uSuit;\nuniform vec3 uAccent;\nuniform vec3 uBottoms;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float garmentA = smoothstep(-0.004, 0.004, vCoverage.x);
        float garmentB = smoothstep(-0.004, 0.004, vCoverage.y) * (1.0 - garmentA);
        float accent = smoothstep(-0.004, 0.004, vCoverage.z) * garmentA;
        diffuseColor.rgb = mix(diffuseColor.rgb, mix(uSuit, uAccent, accent), garmentA);
        diffuseColor.rgb = mix(diffuseColor.rgb, uBottoms, garmentB);
        float fabric = garmentA + garmentB;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, ${FABRIC_ROUGHNESS.toFixed(2)}, fabric);`);
  };
  material.customProgramCacheKey = () => 'surfer-outfit';
  material.needsUpdate = true;
  return material;
}
```

The vest outfits use the accent colour as the vest colour: `SkinnedSurfer.setOutfit` passes `suit = accent` for `vestShorts` and `vestBikini`.

- [ ] **Step 4: Write the failing SkinnedSurfer test** (`SkinnedSurfer.test.ts`). It builds a surfer from an in-memory skeleton rather than a file (no loader in Node), through `SkinnedSurfer.fromScene(scene)`, the same path `load` uses after parsing.

```ts
import { BufferGeometry, Float32BufferAttribute, Group, MeshStandardMaterial, Quaternion, Skeleton, SkinnedMesh, Uint16BufferAttribute, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createTestHumanoid } from '../rig/testHumanoid';
import { createRiderVisualState } from '../rig/riderVisualState';
import { posturePoints } from '../rig/posturePoints';
import { SkinnedSurfer } from './SkinnedSurfer';

function fakeScene() {
  const { root, bones } = createTestHumanoid();
  const list = [...bones.values()];
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([0, 1, 0, 0.5, 1.4, 0, 0.09, 0.3, 0], 3));
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute([0, 0, 0, 0, list.findIndex((b) => b.name.endsWith('LeftForeArm')), 0, 0, 0, list.findIndex((b) => b.name.endsWith('LeftLeg')), 0, 0, 0], 4));
  geometry.setAttribute('skinWeight', new Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
  const body = new SkinnedMesh(geometry, new MeshStandardMaterial({ name: 'skin' }));
  body.name = 'LOD0';
  const scene = new Group();
  scene.add(root, body);
  body.bind(new Skeleton(list));
  return scene;
}

describe('skinned surfer', () => {
  it('never culls its skinned meshes (the bind-pose bounds stay at the origin)', () => {
    const surfer = SkinnedSurfer.fromScene(fakeScene());
    surfer.group.traverse((o) => { if ((o as SkinnedMesh).isSkinnedMesh) expect(o.frustumCulled).toBe(false); });
  });

  it('writes outfit coverage on the body and poses the skeleton far from the origin', () => {
    const surfer = SkinnedSurfer.fromScene(fakeScene());
    surfer.setOutfit('fullsuit');
    const body = surfer.group.getObjectByName('LOD0') as SkinnedMesh;
    expect(body.geometry.getAttribute('outfitCoverage').count).toBe(3);
    const state = posturePoints('standing', 'regular', new Vector3(250, 0.2, -600), new Quaternion(), createRiderVisualState());
    surfer.update(state);
    const hips = surfer.group.getObjectByName('mixamorigHips')!.getWorldPosition(new Vector3());
    expect(hips.distanceTo(state.points[0])).toBeLessThan(0.3);
  });
});
```

- [ ] **Step 5: Implement `SkinnedSurfer.ts`**
  - **`fromScene(scene)`:**
    - collect bones by name;
    - wrap materials with `wetMaterial` (role by material name: `/skin|body/i` → skin, `/hair|brow|lash/i` → hair, `/eye/i` → eyes);
    - `dressMaterial` on the body meshes (`LOD0`, `LOD1`);
    - set `frustumCulled = false` and cast/receive shadow on every mesh;
    - capture the rest skeleton from `skeleton.boneInverses` (bind-pose world position = inverse of each bone inverse), and read the geometry's `position`, `skinIndex` and `skinWeight` for coverage;
    - build a `HumanoidRig`;
    - set the default outfit `'fullsuit'`.
  - **`load(url, renderer)`:** runs `GLTFLoader` with `MeshoptDecoder` and `KTX2Loader` (transcoder path `${BASE_URL}assets/basis/`, `detectSupport(renderer)`), then `fromScene(gltf.scene)`.
  - **`update(state, cameraPosition)`:** `rig.solve(state)`; with a camera, show `LOD1` beyond 8 m, otherwise `LOD0`.
  - **`setOutfit(outfit, colors)`:** recompute `outfitCoverage` for each LOD geometry and update the uniforms (for vest outfits, the suit colour becomes the accent).

- [ ] **Step 6: Implement `SurferView.ts`**. It owns a primitive `Surfer` (board hidden) as the fallback, and moves `PhysicalMode`'s pose adapter in here.

```ts
update(state: RiderVisualState, cameraPosition?: Vector3): void {
  if (this.skinnedSurfer) { this.skinnedSurfer.update(state, cameraPosition); return; }
  this.pose.heading = state.heading;
  state.points.forEach((p, i) => p.toArray(this.pose.points, i * 3));
  this.fallback.updateDetached(this.pose, state.boardPosition, state.boardQuaternion);
}
load(presetId = 'surfer1'): void {
  SkinnedSurfer.load(`${import.meta.env.BASE_URL}assets/surfers/${presetId}.glb`, this.renderer)
    .then((surfer) => { this.skinnedSurfer = surfer; this.group.add(surfer.group); this.fallback.group.visible = false; })
    .catch((error) => console.warn('Surfer model unavailable; drawing the simple surfer.', error));
}
```

- [ ] **Step 7: Wire `PhysicalMode`**
  - Replace `readonly surfer = new Surfer()` with `readonly surfer = new SurferView(renderer)`; pass the renderer through the constructor from `main.ts`, one argument.
  - Keep a `RiderVisualState` field.
  - In `update`: `readRiderSnapshot(rider, pose, this.riderState); this.riderState.stroking = …;` then `this.surfer.update(this.riderState, this.camera.camera.position)`. For now, `stroking` is 1 while the phase is `prone` and the paddle input is held; Task 9 replaces it with the stroke impulse.
  - Remove `setBoardVisible` there (`SurferView` hides the fallback's board itself).
  - Call `this.surfer.load()` in the constructor.

- [ ] **Step 8: Run the tests** — `npx vitest run src/scene/character src/scene/rig src/game/PhysicalMode.test.ts` → PASS.

- [ ] **Step 9: Check it in the browser**:
  - `?physical`, profile and front views, paddle, pop up and ride;
  - the skinned surfer follows the physics, feet stay on the deck and the full suit reads;
  - no console errors;
  - block `/assets/surfers/*` in the network panel and reload: the primitive surfer must appear with one warning.

- [ ] **Step 10: Commit** — `git add src && git commit -m "feat: draw the physical rider as a skinned, dressed surfer"`

---

### Task 8: The board — designs, UVs, resin, wax, pad and fins

**Files:**
- Create: `src/scene/board/boardDesigns.ts`, `src/scene/board/boardDesigns.test.ts`, `src/scene/board/finGeometry.ts`, `src/scene/board/finGeometry.test.ts`
- Modify: `src/scene/BoardMesh.ts`, `src/scene/BoardMesh.test.ts`

**Interfaces:**
- Consumes: `BoardShape`, `THRUSTER`.
- Produces:
  ```ts
  export interface BoardDesign { id: string; deck: string; bottom: string; rail: string; stringer: string; spray?: { color: string; from: number; to: number }; pad: string }
  export const BOARD_DESIGNS: readonly BoardDesign[];                 // 5 designs, unbranded
  export function designPixels(design: BoardDesign, surface: 'deck' | 'bottom', width: number, height: number): Uint8Array; // RGBA, u across (0 left rail… 1 right), v along (0 tail… 1 nose)
  export function waxPixels(width: number, height: number, seed?: number): Uint8Array; // roughness in G, 0 outside the wax zone
  export function finOutline(spec: FinSpec): { points: Array<[number, number]>; area: number };   // (along, down) metres
  export function createBoardMesh(shape: BoardShape, design?: BoardDesign): Group;               // + pad and fins
  ```

- [ ] **Step 1: Write the failing tests**

`boardDesigns.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BOARD_DESIGNS, designPixels, waxPixels } from './boardDesigns';

describe('board designs', () => {
  it('offers five unbranded designs', () => {
    expect(BOARD_DESIGNS).toHaveLength(5);
    expect(new Set(BOARD_DESIGNS.map((d) => d.id)).size).toBe(5);
  });
  it('paints the stringer down the middle of the deck', () => {
    const design = BOARD_DESIGNS[0];
    const pixels = designPixels(design, 'deck', 64, 256);
    const at = (x: number, y: number) => Array.from(pixels.subarray((y * 64 + x) * 4, (y * 64 + x) * 4 + 3));
    expect(at(32, 128)).not.toEqual(at(16, 128));
    expect(at(16, 128)).toEqual(at(48, 128));
  });
  it('waxes only where the rider stands', () => {
    const wax = waxPixels(32, 256);
    const g = (y: number) => wax[(y * 32 + 16) * 4 + 1];
    expect(g(Math.round(0.4 * 255))).toBeGreaterThan(100);
    expect(g(Math.round(0.95 * 255))).toBeLessThan(40);
  });
});
```

`finGeometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { THRUSTER } from '../../physics/finForces';
import { finOutline } from './finGeometry';

describe('fin outline', () => {
  it.each(THRUSTER.map((f) => [f.name, f] as const))('%s matches the physics fin’s depth and area', (_, spec) => {
    const { points, area } = finOutline(spec);
    expect(Math.max(...points.map(([, down]) => down))).toBeCloseTo(spec.depth, 3);
    expect(Math.abs(area - spec.area) / spec.area).toBeLessThan(0.05);
  });
});
```

Add to `BoardMesh.test.ts`:

```ts
it('draws three fins at the thruster’s places and a traction pad over the tail', () => {
  const fins = group.getObjectByName('fins')!;
  expect(fins.children).toHaveLength(3);
  const pad = group.getObjectByName('pad') as Mesh;
  const box = new Box3().setFromObject(pad);
  expect(box.max.z).toBeLessThan(-shape.length / 2 + 0.45 - shape.centerOfMass.z);
});
it('gives the hull UVs for its designs', () => {
  expect((group.children[0] as Mesh).geometry.getAttribute('uv')).toBeDefined();
});
```

- [ ] **Step 2: Run to fail**, then **implement**:
  - **`finOutline`:** a swept fin whose base chord is `c0` and tip chord 0.25·`c0`, with the leading edge raked back 35°; outline points at 12 depths. Solve `c0` in closed form so the trapezoid-with-rake area equals `spec.area` (area = depth·(c0 + 0.25c0)/2 → c0 = 2A/(1.25·depth)).
  - **`designPixels`:**
    - a base colour;
    - the spray from `from` to `to` along `v`, as a smooth fade;
    - rails within 6 % of each side, blended to the rail colour;
    - the stringer as a 1.2 %-wide centre band.
  - **`waxPixels`:** a seeded noise field (use `seededRandom` from `src/wave/random.ts`) at 0.55–0.85 inside 0.12 < v < 0.72, and 0 outside.

  In `BoardMesh.ts`:
  - **UVs:** add `uv` per vertex: deck/bottom (`(u+1)/2`, s), rails (side, s), caps (u, end).
  - **Material groups** (three `addGroup` calls):
    - deck: `MeshPhysicalMaterial` with `map` from the design, `roughnessMap` = wax, clearcoat 0.4;
    - bottom: design map, roughness 0.2, clearcoat 1, clearcoat roughness 0.08;
    - rails: rail colour, clearcoat 1.
  - **Pad** (`name = 'pad'`):
    - a sheet over s ∈ [0, 0.2], 1 cm inside the outline;
    - 6 mm thick, with three 3 mm arch grooves across and a kick rising 18 mm over the last 3 cm;
    - `MeshStandardMaterial` roughness 0.95 in `design.pad`.
  - **Fins** (`name = 'fins'`): one `ExtrudeGeometry` from `finOutline`, 6 mm thick, bevelled 1.5 mm. Each fin is placed at its root on the bottom at `(side·(halfWidth(s) − fromRail), rocker(s), −L/2 + fromTail)` and turned by `toe` toward the stringer. No cant, because the physics has none.

- [ ] **Step 3: Run to pass** — `npx vitest run src/scene/board src/scene/BoardMesh.test.ts` → PASS. The existing hull tests must still pass: the outward-faces test reads `children[0]`, so keep the hull first.

- [ ] **Step 4: Browser check** — the board in profile view: the resin gloss catches the sun, the pad is on the tail, the fins are under the tail and the stringer is visible.

- [ ] **Step 5: Commit** — `git add src/scene && git commit -m "feat: dress the board in resin, wax, a traction pad and thruster fins"`

---

### Task 9: Paddle splashes from the stroke impulse

**Files:**
- Modify: `src/physics/AttachedRider.ts`, `src/wave/SprayCloud.ts`, `src/wave/SprayCloud.test.ts`, `src/wave/SurfZoneRunner.ts`, `src/game/PhysicalMode.ts`
- Test: `src/physics/AttachedRider.test.ts` (one test), `src/wave/SprayCloud.test.ts` (two tests)

**Interfaces:**
- Produces:
  ```ts
  // AttachedRider
  export interface StrokeSplash { x: number; z: number; jx: number; jy: number; jz: number } // where a hand pulled this step, and the impulse the water gave it, N·s
  readonly strokes: StrokeSplash[];     // refilled in endStep, empty unless a hand pulled
  // SprayCloud
  strokeSplash(scene: SprayScene, stroke: StrokeSplash, handSpeed: number): void;
  ```

- [ ] **Step 1: Write the failing tests**
  - **`SprayCloud.test.ts`**, with the file's existing flat-scene helper (reuse whatever `SprayScene` builder the current tests use):
    - a stroke with |j| = 10 N·s spawns about `10 · STROKE_DROPS_PER_NS` drops (±1), rising, moving opposite to the impulse;
    - |j| = 0 spawns none.
  - **`AttachedRider.test.ts`:** reuse the existing prone-paddling setup (the test that reads `handLoad`). Over 2 s of paddling, `rider.strokes.length > 0` on some step. Each stroke's horizontal impulse points forward along the board (the water pushes the hand forward), and its (x, z) lies within 0.6 m of a rail.

- [ ] **Step 2: Implement**
  - **AttachedRider:** `readonly strokes: StrokeSplash[] = []`, with a two-slot pool. In `endStep`, after the reaction loop, for `k = RIDER_PARTS.length + side` with a nonzero reaction push `{ x: reactionAt[k*2]/dt, z: reactionAt[k*2+1]/dt, jx, jy, jz }`. Clear it at the top of `endStep`.
  - **SprayCloud:**
    ```ts
    /** Drops per N·s of stroke impulse (art-directed so a hard stroke throws a small handful). */
    export const STROKE_DROPS_PER_NS = 2.5;
    strokeSplash(scene: SprayScene, stroke: StrokeSplash, handSpeed: number): void {
      const impulse = Math.hypot(stroke.jx, stroke.jz);
      const expected = impulse * STROKE_DROPS_PER_NS;
      let spawns = Math.floor(expected) + (this.random() < expected - Math.floor(expected) ? 1 : 0);
      if (spawns === 0) return;
      const cell = scene.solver.cellIndex(stroke.x, stroke.z);
      const surface = scene.solver.h[cell] + scene.solver.bed[cell];
      const back = { x: -stroke.jx / impulse, z: -stroke.jz / impulse }; // water leaves opposite to the push on the hand
      for (; spawns > 0 && this.count < this.capacity; spawns -= 1) {
        const speed = handSpeed * this.between({ min: 0.3, max: 0.9 });
        this.spawn(SPRAY, stroke.x + (this.random() - 0.5) * 0.15, surface + 0.03, stroke.z + (this.random() - 0.5) * 0.15,
          back.x * speed * 0.6 + (this.random() - 0.5) * 0.4, speed, back.z * speed * 0.6 + (this.random() - 0.5) * 0.4);
      }
    }
    ```
    `handSpeed` is the pull's hand speed along the board. The runner passes the magnitude of the relative flow, estimated as |j| / (HAND_DRAG_AREA-sized mass): use `Math.min(4, 1.5 + impulse)` m/s. It is documented as a visual estimate.
  - **SurfZoneRunner:** after each step, `for (const s of session.rider.strokes) this.spray.strokeSplash(this.sprayScene, s, Math.min(4, 1.5 + Math.hypot(s.jx, s.jz)));` (only when the session is attached).
  - **PhysicalMode:** `riderState.stroking` = 1 when the latest snapshot's phase is `prone` and the paddle is held. That stays as is: the snapshot carries no stroke flag, and adding one would widen the worker boundary for a hand shape.

- [ ] **Step 3: Run to pass** — `npx vitest run src/wave/SprayCloud.test.ts src/physics/AttachedRider.test.ts src/wave/SurfZoneRunner.test.ts` → PASS.

- [ ] **Step 4: Browser check** — paddle in `?physical`: small splashes at each stroke beside the rails, thrown backward; none while gliding.

- [ ] **Step 5: Commit** — `git commit -am "feat: throw spray from paddle strokes in proportion to their push"`

---

### Task 10: Shadows at four levels

**Files:**
- Create: `src/scene/ShadowRig.ts`, `src/scene/ShadowRig.test.ts`
- Modify: `src/main.ts` (construct, per-frame follow, the URL flag), `src/game/PhysicalMode.ts` (expose casters and receivers)

**Interfaces:**
- Produces:
  ```ts
  export type ShadowLevel = 'blob' | 'rider' | 'surfaces' | 'soft';
  export const SHADOW_LEVELS: readonly ShadowLevel[];
  export function parseShadowLevel(search: string, fallback?: ShadowLevel): ShadowLevel; // ?shadows=
  export function snapToTexel(centre: Vector3, lightQuaternion: Quaternion, extent: number, mapSize: number, out: Vector3): Vector3;
  export class ShadowRig {
    constructor(renderer: WebGLRenderer, light: DirectionalLight, scene: Scene);
    readonly blob: Mesh;
    setLevel(level: ShadowLevel, receivers: { surfaces: readonly Mesh[] }): void;
    follow(focus: Vector3, sunDirection: Vector3, surfaceY: number): void;
  }
  ```

- [ ] **Step 1: Write the failing tests** (`ShadowRig.test.ts`)

```ts
import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { parseShadowLevel, snapToTexel } from './ShadowRig';

describe('shadow rig', () => {
  it('reads the level from the URL, defaulting to surfaces', () => {
    expect(parseShadowLevel('?physical&shadows=soft')).toBe('soft');
    expect(parseShadowLevel('?shadows=nonsense')).toBe('surfaces');
    expect(parseShadowLevel('')).toBe('surfaces');
  });
  it('moves the shadow frustum in whole texels so the shadow does not shimmer', () => {
    const q = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -0.6);
    const a = snapToTexel(new Vector3(10.001, 0, 5.002), q, 4, 2048, new Vector3());
    const b = snapToTexel(new Vector3(10.0012, 0, 5.0021), q, 4, 2048, new Vector3());
    expect(a.distanceTo(b)).toBeLessThan(1e-9);
    const texel = 8 / 2048;
    expect(a.distanceTo(new Vector3(10.001, 0, 5.002))).toBeLessThan(texel);
  });
});
```

- [ ] **Step 2: Run to fail**, then **implement `ShadowRig.ts`**:

  **`setLevel`:**

  | Level | Shadow map | Shadow type, size | Blob | Water/seabed receive | PCSS |
  | --- | --- | --- | --- | --- | --- |
  | `blob` | off | – | visible | no | no |
  | `rider` | on | `PCFSoftShadowMap`, 1024 | hidden | no | no |
  | `surfaces` | on | `PCFSoftShadowMap`, 2048 | hidden | yes | no |
  | `soft` | on | `PCFShadowMap`, 2048 | hidden | yes | yes |

  - **PCSS:** in `soft`, `ShaderChunk.shadowmap_pars_fragment` is replaced by the PCSS version from three's `webgl_shadowmap_pcss` example (MIT, credited in a comment). Every scene material gets `needsUpdate` when PCSS toggles.
  - **`follow`:**
    - the light sits at `focus + sun·20` and targets `focus`, snapped with `snapToTexel`;
    - the orthographic shadow camera spans ±4 m, near 1 and far 45;
    - the blob sits at `(focus.x, surfaceY + 0.02, focus.z)`: a 2.2 × 0.9 plane with a radial alpha `DataTexture`, black, opacity 0.35, `depthWrite` false.
  - **`snapToTexel`:** transforms the centre into light space (the inverse of `lightQuaternion`), rounds x and y to multiples of `2·extent/mapSize`, and transforms back.
  - **Wiring in `main.ts`:**
    - `this.shadows = new ShadowRig(this.renderer, this.sunlight, this.scene)`;
    - `setLevel(parseShadowLevel(location.search), { surfaces: [this.water.mesh, this.physicalMode.seabed.mesh, this.physicalMode.farField.mesh] })`;
    - each frame in physical mode, `follow(board position, sun direction, board y − 0.04)`.
  - **Casters:** `PhysicalMode` sets `castShadow` on the board, pad and fins and `receiveShadow` on the board; the surfer's meshes already cast and receive (Task 7).
  - **Water shader check:** confirm the water's `onBeforeCompile` displaces `transformed` before `worldpos_vertex`, so shadow coordinates follow the displaced surface. If it displaces later, move its displacement into `begin_vertex` in the same edit.

- [ ] **Step 3: Run to pass** — `npx vitest run src/scene/ShadowRig.test.ts` → PASS.

- [ ] **Step 4: Browser check of all four levels** (`?physical&shadows=blob|rider|surfaces|soft`):
  - the rider's shadow is on the deck from `rider` up;
  - on foam and the seabed from `surfaces`;
  - softer at distance with `soft`;
  - a blob only at `blob`.

  Record the frame times (Wave Lab readout) per level in the plan record.

- [ ] **Step 5: Commit** — `git add src && git commit -m "feat: cast the rider's and board's shadows at four quality levels"`

---

### Task 11: The screenshot sheet, tuning, and the record

**Files:**
- Create: `character-sheet.html`, `src/dev/characterSheet.ts`
- Modify: `ROADMAP.md`, `docs/ASSETS.md`, this plan (turn it into the design record, as the G3 plan was)

- [ ] **Step 1: Write the sheet page.**
  - **`character-sheet.html`:** `<canvas>` + `<script type="module" src="/src/dev/characterSheet.ts">` and links for `?sky=dawn|midday|sunset`.
  - **`characterSheet.ts`:**
    - renderer 1920 × 1600, a `PhotoSky` for the requested sky (elevation from its manifest entry, azimuth −25°);
    - a `ShadowRig` at `surfaces`;
    - a flat water plane (`MeshPhysicalMaterial`, colour `#1d5d6b`, roughness 0.06, `ior` 1.333, the sky's environment) at y = 0.
  - **Tiles:** a 6 × 4 grid of 320 × 400 tiles, drawn with scissor and viewport.
    - Rows are `surfer1…4`, dressed `fullsuit`, `springsuit`, `vestBikini`, `vestShorts` on board designs 0–3.
    - Columns are prone, standing and fallen, each at chase distance (4.5 m behind and beside, 1.8 m up) and at 1.5 m from the chest.
  - **Poses:** from `posturePoints`, with the board at (0, 0.03, 0). "Fallen" is a hand-set floating pose beside the board: face down, limbs spread, phase `fallen`.
  - **Done flag:** `window.sheetReady = true` once drawn.

- [ ] **Step 2: Open it and screenshot all three skies** (the dev server on the worktree, `/character-sheet.html?sky=…`). Look for:
  - feet through the deck, bent-back knees, twisted forearms, hands through the rails;
  - outfit edges in the wrong place, hair cards sorting badly;
  - exposure (skin blown out or muddy);
  - a sun too strong against the sky.

  Fix the rig's `DETAIL`, the outfit cut fractions, `REFERENCE_LIGHT` or `toneMappingExposure` until all 72 tiles read well. Record the final values.

- [ ] **Step 3: Full check in the game** (`?physical`, each spot, a ride: paddle, pop-up, ride, fall, swim, remount), with the default surfer and each of `?surfer=surfer2…4`. Add that URL flag in `PhysicalMode.surfer.load(new URLSearchParams(location.search).get('surfer') ?? 'surfer1')`; it is a dev flag, and Part B replaces it with the picker.

- [ ] **Step 4: Update the docs**
  - **`ROADMAP.md`:** a G7 entry (Part A done, Part B waiting on P8) and Backlog items: beach/sand/coastline, water texture detail, replay/photo mode, dripping water, full creator, mocap refinement, WebGPU renderer, and preset mass/height into physics.
  - **`docs/ASSETS.md`:** final sizes.
  - **This plan:** rewrite it as the design record with the deviations and the measured frame times.

- [ ] **Step 5: Full suite and build** — `npx vitest run` (pre-existing load timeouts in `SeedSweep`, `SettingsSweep`, `SustainedRide` and `SurfZoneRunner` are expected under parallel load; re-run any that time out on their own) and `npm run build`.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "docs: record G7 Part A, the characters and sky"`
