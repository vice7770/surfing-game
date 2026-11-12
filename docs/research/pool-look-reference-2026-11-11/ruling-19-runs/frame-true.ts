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

// one-way: the worst vertex of a (crest..toe) off polyline b is off(a, b). Per vertex: nearest of the two frames.
const near = (x: Float32Array, a: Float32Array, b: Float32Array) => { let worst = 0; for (let i = LANDMARK.crest; i <= LANDMARK.toe; i += 1) { const one = new Float32Array(x); const d = Math.min(offAt(x, a, i), offAt(x, b, i)); worst = Math.max(worst, d); } return worst; };
const offAt = (a: Float32Array, b: Float32Array, i: number) => { let best = Infinity; for (let k = LANDMARK.crest; k < LANDMARK.toe; k += 1) { const ax = b[2 * k], ay = b[2 * k + 1], bx = b[2 * k + 2] - ax, by = b[2 * k + 3] - ay; const l2 = bx * bx + by * by; const u = l2 > 0 ? Math.min(1, Math.max(0, ((a[2 * i] - ax) * bx + (a[2 * i + 1] - ay) * by) / l2)) : 0; best = Math.min(best, Math.hypot(a[2 * i] - ax - u * bx, a[2 * i + 1] - ay - u * by)); } return best; };
const G: number[] = [], PM: number[] = [], AR: number[] = [], SH: number[] = [], CM: number[] = [], CR: number[] = [];
const lerpShare = (a: Float32Array, b: Float32Array) => { // join by arc with the lip's share itself interpolated
  const sh = 0.5 * (lipShare(a) + lipShare(b)); const sp = (p: Float32Array) => { const places = arcPlaces(); const out = new Float32Array(p); if (arcRespace(p, sh, arc, places)) for (let i = LANDMARK.crest + 1; i < LANDMARK.toe; i += 1) { const m = places.from[i], t = places.share[i]; out[2 * i] = p[2 * m] + t * (p[2 * m + 2] - p[2 * m]); out[2 * i + 1] = p[2 * m + 1] + t * (p[2 * m + 3] - p[2 * m + 1]); } return out; };
  const x = sp(a), y = sp(b); const r = new Float32Array(a.length); for (let i = 0; i < r.length; i += 1) r[i] = 0.5 * (x[i] + y[i]); return r; };

// Leave one out: frames k-1 and k+1 joined half way, against the real frame k between them.
const two = (x: Float32Array, y: Float32Array) => Math.max(off(x, y), off(y, x));
const P: number[] = [], A: number[] = [], H: number[] = [], P1: number[] = [], A1: number[] = [];
let lines = '';
for (const [lo, hi, label] of [[-1.6, -0.6, 'clock -1.6..-0.6 s'], [-0.6, 0, 'clock -0.6..0 s']] as const) {
  P.length = 0; A.length = 0; H.length = 0;
  for (let k = Math.ceil((lo - t0) / fs); t0 + (k + 2) * fs < hi - 0.002; k += 1) {
    const a = at(t0 + k * fs + 1e-5).p, b = at(t0 + (k + 1) * fs + 1e-5).p, c = at(t0 + (k + 2) * fs + 1e-5).p;
    const pm = new Float32Array(a.length); for (let i = 0; i < pm.length; i += 1) pm[i] = 0.5 * (a[i] + c[i]);
    const sa = spaced(a), sc = spaced(c);
    const ar = new Float32Array(a.length); for (let i = 0; i < ar.length; i += 1) ar[i] = 0.5 * (sa[i] + sc[i]);
    const sh = lerpShare(a, c);
    P.push(two(pm, b)); A.push(two(ar, b)); H.push(two(sh, b));
    if (lo === -0.6) lines += `${(t0 + (k + 1) * fs).toFixed(3)}: lip shares ${lipShare(a).toFixed(2)} ${lipShare(b).toFixed(2)} ${lipShare(c).toFixed(2)}; the join of frames k-1 and k+1 off the real frame k: point by point ${two(pm, b).toFixed(4)}, arc first ${two(ar, b).toFixed(4)}, arc with the share interpolated ${two(sh, b).toFixed(4)} m
`;
  }
  const pct = (v: number[], p: number) => [...v].sort((x, y) => x - y)[Math.min(v.length - 1, Math.floor(p * v.length))];
  const row = (n: string, v: number[]) => `   ${n}: median ${pct(v, 0.5).toFixed(4)}, 90 % ${pct(v, 0.9).toFixed(4)}, most ${Math.max(...v).toFixed(4)} m`;
  console.log(`${label}, ${P.length} frames, each left out and rebuilt from its two neighbours (0.032 s apart); the rebuilt curve off the real frame, crest to toe, both ways:`);
  console.log(row('point by point (today)', P)); console.log(row('each frame spaced by arc first, lip at the throw share', A)); console.log(row('arc, the lip share interpolated', H));
}
console.log(lines);
