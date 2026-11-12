import { arcPlaces, arcRespace } from '../../../../src/wave/barrel/arcMesh';
import { readBarrelCases } from '../../../../src/wave/barrel/nodeBarrelCases';
import { libraryFromBytes } from '../../../../src/wave/barrel/barrelLibrary';
import { LANDMARK, PROFILE_POINTS } from '../../../../src/wave/barrel/ProfileLibrary';
import { BARREL_SLOPE } from '../../../../src/wave/barrel/sweptLoft';
import { lipShare } from '../../../../src/wave/barrel/arcMesh';
/**
 * Step 6, build 2's check of the curve itself (no game run): the pool's tube case at the reference pool's scale, before
 * the throw. The library joins two frames point by point; before the throw the lip mark (the face's steepest point)
 * stands at a different share of the crest-to-toe arc in each frame, so the join between two frames is not the curve
 * either frame draws. Printed per frame pair: the lip mark's share in each, and how far the library's mid-frame curve
 * lies from the join of the same two frames re-spaced by arc first (`arcMesh.ts`).
 *   npx rolldown docs/research/pool-look-reference-2026-11-11/step6/frame-blend.ts -o /tmp/frame-blend.mjs --format esm --platform node
 *   node /tmp/frame-blend.mjs [footHeight footDepth]
 */
const FOOT = [Number(process.argv[2] ?? 1.26), Number(process.argv[3] ?? 4.88)];
const lib = libraryFromBytes(readBarrelCases('pool' as never), 'basilisk' as never, 'pool' as never, 'jet-step' as never);
const slope = BARREL_SLOPE['pool' as never] as number;
const at = (tau: number) => { const p = new Float32Array(2 * PROFILE_POINTS); const l = lib.profileAt({ slope, footHeight: FOOT[0], footDepth: FOOT[1], seconds: tau, hold: 'contact' } as never, p); return { p, frame: (l as { frameSeconds?: number }).frameSeconds }; };
const off = (a: Float32Array, b: Float32Array) => { let worst = 0; for (let i = LANDMARK.crest; i <= LANDMARK.toe; i += 1) { let best = Infinity; for (let k = LANDMARK.crest; k < LANDMARK.toe; k += 1) { const ax = b[2 * k], ay = b[2 * k + 1], bx = b[2 * k + 2] - ax, by = b[2 * k + 3] - ay; const l2 = bx * bx + by * by; const u = l2 > 0 ? Math.min(1, Math.max(0, ((a[2 * i] - ax) * bx + (a[2 * i + 1] - ay) * by) / l2)) : 0; best = Math.min(best, Math.hypot(a[2 * i] - ax - u * bx, a[2 * i + 1] - ay - u * by)); } worst = Math.max(worst, best); } return worst; };

const q = (tau: number) => ({ slope, footHeight: FOOT[0], footDepth: FOOT[1], seconds: tau, hold: 'contact' }) as never;
const fb = {} as never;
const fs = at(-0.3).frame!;
console.log(`foot height ${FOOT[0]} m, foot depth ${FOOT[1]} m, scale ${(lib.frameBlend(q(-0.3), fb) as { scale: number }).scale.toFixed(2)}`);
// A frame clock: where the lower frame's index changes.
let t0 = -0.62; let f0 = (lib.frameBlend(q(t0), fb) as { lowerFrame: number }).lowerFrame;
while ((lib.frameBlend(q(t0), fb) as { lowerFrame: number }).lowerFrame === f0) t0 += 0.00002;
const share0 = lipShare(at(0).p);
const arc = new Float64Array(LANDMARK.toe - LANDMARK.crest + 1);
const spaced = (p: Float32Array) => { const places = arcPlaces(); const out = new Float32Array(p); if (arcRespace(p, share0, arc, places)) for (let i = LANDMARK.crest + 1; i < LANDMARK.toe; i += 1) { const m = places.from[i], t = places.share[i]; out[2 * i] = p[2 * m] + t * (p[2 * m + 2] - p[2 * m]); out[2 * i + 1] = p[2 * m + 1] + t * (p[2 * m + 3] - p[2 * m + 1]); } return out; };
const rows: number[] = []; const rows2: number[] = [];
let text = '';
for (let k = 0; t0 + (k + 1) * fs < -0.002; k += 1) {
  const a = at(t0 + k * fs + 1e-5).p, b = at(t0 + (k + 1) * fs - 1e-5).p, m = at(t0 + (k + 0.5) * fs).p;
  const [sa, sb] = [spaced(a), spaced(b)];
  const r = new Float32Array(m.length); for (let i = 0; i < m.length; i += 1) r[i] = 0.5 * (sa[i] + sb[i]);
  const d = Math.max(off(m, r), off(r, m));
  // The same for the two frames themselves, re-spaced against not (the helper's own corner cutting).
  const self = Math.max(off(sa, a), off(a, sa));
  rows.push(d); rows2.push(self);
  text += `${(t0 + (k + 0.5) * fs).toFixed(3)}: shares ${lipShare(a).toFixed(2)} ${lipShare(b).toFixed(2)} mid-blend off the blend of the re-spaced frames ${d.toFixed(4)} m (a frame against itself re-spaced ${self.toFixed(4)})\n`;
}
console.log(text);
const pct = (v: number[], p: number) => [...v].sort((x, y) => x - y)[Math.min(v.length - 1, Math.floor(p * v.length))];
console.log(`frame step ${fs.toFixed(4)} s; ${rows.length} frame pairs -0.6..0 s: the library's mid-blend curve off the blend of the two frames re-spaced by arc: median ${pct(rows, 0.5).toFixed(4)}, 90 % ${pct(rows, 0.9).toFixed(4)}, most ${Math.max(...rows).toFixed(4)} m; a frame against itself re-spaced: median ${pct(rows2, 0.5).toFixed(4)}, most ${Math.max(...rows2).toFixed(4)} m`);
