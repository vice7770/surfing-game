/**
 * The Canyon's bed with its beach peaks, as numbers (canyon-beach-break): depth along the peaks' axes and across shore,
 * where each size's break contour runs, and the reef's take-off transect against the old layout's (it must not move).
 *   rolldown docs/research/canyon-beach-break-2026-10-23/bed-map.ts -o dist/scripts/bed-map.mjs --format esm --platform node \
 *     && node dist/scripts/bed-map.mjs [--canyon key=value,...]
 */
import { CANYON, CANYON_OLD, canyonBars, canyonReefSpan, createSpot } from '../../../src/wave/Bathymetry';
import { applyCanyonShape } from '../../../scripts/canyonShape';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
applyCanyonShape(option('canyon'));
const spot = createSpot('canyon', 1);
const old = createSpot('canyon', 1, { canyonBed: 'old' });
const f = (v: number) => v.toFixed(2);
console.log(`window ${CANYON.alongShore} m; reef span ${JSON.stringify(canyonReefSpan())}; bars ${JSON.stringify(canyonBars())}`);
// The reef's take-off transect and its surroundings must not move: largest difference against the old layout over the reef's footprint ± 5 m.
const span = canyonReefSpan();
let worst = 0; let at = '';
for (let x = span.from - 5; x <= span.to + 5; x += 0.5) for (let z = -330; z < 0; z += 0.5) {
  const d = Math.abs(spot.depthAt(x, z) - old.depthAt(x, z));
  if (d > worst) { worst = d; at = `(${x}, ${z})`; }
}
console.log(`largest bed change over the reef's footprint ±5 m: ${worst.toFixed(4)} m at ${at}`);
let transect = 0;
for (let z = -330; z < 0; z += 0.25) transect = Math.max(transect, Math.abs(spot.depthAt(-9, z) - old.depthAt(-9, z)));
console.log(`take-off transect x -9: largest change ${transect} m`);
for (const bar of canyonBars()) {
  console.log(`\npeak x ${bar.x}: axis depth at z = -260…-20 every 20 m: ${Array.from({ length: 13 }, (_, k) => f(spot.depthAt(bar.x, -260 + 20 * k))).join(' ')}`);
  for (const h of [2.3, 3, 4.3]) {
    const row: string[] = [];
    for (let u = -70; u <= 70; u += 10) {
      let zc = NaN;
      for (let z = -330; z < 0; z += 0.5) if (spot.depthAt(bar.x + u, z) <= h) { zc = z; break; }
      row.push(`${u}:${zc.toFixed(0)}`);
    }
    console.log(`  ${h} m contour z by u: ${row.join(' ')}`);
  }
}
const xs = [-200, -180, -160, -140, -115, -90, -70, -55, -45, -37, -20, 0, 20, 48, 58, 70, 90, 123, 150, 170, 190, 200];
console.log('\ndepth by x (columns) at z rows:');
console.log('   z \\ x ' + xs.map((x) => String(x).padStart(6)).join(''));
for (const z of [-260, -230, -200, -170, -140, -120, -100, -80, -60, -40, -20]) console.log(String(z).padStart(8) + ' ' + xs.map((x) => f(spot.depthAt(x, z)).padStart(6)).join(''));
