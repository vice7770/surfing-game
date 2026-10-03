// Real-time Wave Lab reproduction, per-snapshot timing and frozen barrel specimens.
// node scripts/browser/live-wave-diagnostics.mjs --url=http://localhost:4183/ --out=/private/tmp/tube-baseline --seconds=45
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, sleep } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).filter((s) => s.startsWith('--')).map((s) => {
  const equal = s.indexOf('=');
  return equal < 0 ? [s.slice(2), true] : [s.slice(2, equal), s.slice(equal + 1)];
}));
const out = args.out ?? '/private/tmp/tube-live';
mkdirSync(out, { recursive: true });
const url = new URL(args.url ?? 'http://localhost:4183/');
url.searchParams.set('diagnostics', '');
const page = await launch({ url: url.href, width: Number(args.width ?? 1728), height: Number(args.height ?? 860), args: ['--mute-audio'] });
const instrument = `(() => {
  let a = 0x5eed;
  Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const d = window.__waveTiming = { snapshots: [], frames: [], active: false };
  const W = window.Worker;
  window.Worker = class extends W { constructor(...args) { super(...args); this.addEventListener('message', ({data}) => {
    if (d.active && data?.snapshot?.status) d.snapshots.push({ wall: performance.now(), status: data.snapshot.status });
  }); } };
  let last;
  const raf = window.requestAnimationFrame.bind(window);
  raf(function tick(t) { if (d.active && last) d.frames.push(t - last); last = t; raf(tick); });
})();`;
await page.send('Page.addScriptToEvaluateOnNewDocument', { source: instrument });
const graphics = { preset: 'high', renderScale: 1, nativePixelDensity: args.native !== 'false', frameLimit: 'screen', waterSimulation: 'auto', seaDetail: 'rich', caustics: true, sprayMist: true, oceanView: 'far', foam: 'detailed', waterLook: 'rich', particles: 'high' };
const lab = { physical: { spot: 'padang', stage: 2, compute: 'auto', source: 'buoy', significantHeight: 4, peakPeriod: 10, directionDegrees: 10, spread: 0.4, tide: 0, windSpeed: 0, stormWindSpeed: 18, stormFetchKm: 600, stormDurationHours: 36, stormDistanceKm: 3000 }, water: 'chosen', sunHeight: 0.8, sunDirection: -15, waterLook: 'rich' };
try {
  await page.eval(`localStorage.setItem('breakline.settings.v1', ${JSON.stringify(JSON.stringify({ graphics, detected: { preset: 'high', water: 'accurate', lowPerformance: false }, seen: { rideHints: true, lowPerformanceNotice: true } }))}); localStorage.setItem('breakline.wavelab.v1', ${JSON.stringify(JSON.stringify(lab))}); location.reload()`);
  await page.waitFor(`document.querySelector('.screen-menu') && !document.querySelector('.is-scene-pending')`, 90000);
  await page.click('.tile', 'Wave Lab');
  await page.waitFor(`document.querySelector('#app')?.dataset.screen === 'wavelab' && !document.querySelector('.is-scene-pending')`, 120000);
  await page.waitFor(`window.breaklineDiagnostics?.mode.host?.snapshot.status.cells > 1000`);
  // A close front view exposes the curl, rather than measuring the quiet horizon.
  await page.eval(`(() => { const { mode } = window.breaklineDiagnostics; mode.camera.setView('front'); mode.camera.update(mode.host, mode.focus, 0); const c = mode.camera.camera; window.breaklineLab.fly.lookAt(c.position, c.position.clone().add(c.getWorldDirection(c.position.clone()))); window.__waveTiming.active = true; })()`);
  const seconds = Number(args.seconds ?? 40);
  const start = Date.now();
  const captures = [];
  for (const at of [5, 10, 15, 20, 30].filter((t) => t <= seconds)) {
    while (Date.now() - start < at * 1000) await sleep(250);
    const specimen = await page.eval(`(() => {
      const { mode, water } = window.breaklineDiagnostics;
      const host = mode.host, snapshot = host.snapshot, loft = mode.barrelLoft;
      const arrays = {};
      if (loft) for (const [key, value] of Object.entries(loft)) if (ArrayBuffer.isView(value)) {
        const n = key.startsWith('slice') ? loft.sliceCount : key === 'indices' ? loft.indexCount : value.length;
        arrays[key] = Array.from(value.subarray(0, n));
      }
      return { capturedAt: performance.now(), config: mode.config, init: { ...host.init, bed: undefined }, status: snapshot.status, frontCount: snapshot.frontCount, front: Array.from(snapshot.front.subarray(0, snapshot.frontCount * 9)), waterGrid: water.grid, surfaceData: Array.from(water.surfaceData), loft: loft ? { ...loft, ...arrays } : null, camera: { position: mode.camera.camera.position.toArray(), quaternion: mode.camera.camera.quaternion.toArray() } };
    })()`);
    const path = `${out}/at-${at}.json`;
    writeFileSync(path, JSON.stringify(specimen, (_, value) => ArrayBuffer.isView(value) ? Array.from(value) : value));
    const shot = await page.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${out}/at-${at}.png`, Buffer.from(shot.data, 'base64'));
    captures.push({ at, path, seaTime: specimen.status.seaTime, fronts: specimen.frontCount });
    console.log(JSON.stringify(captures.at(-1)));
  }
  while (Date.now() - start < seconds * 1000) await sleep(250);
  const timing = await page.eval(`(() => { window.__waveTiming.active = false; return window.__waveTiming; })()`);
  const snapshots = timing.snapshots, span = (snapshots.at(-1).wall - snapshots[0].wall) / 1000;
  const result = { url: url.href, captures, displayFps: timing.frames.length / (timing.frames.reduce((s, n) => s + n, 0) / 1000), freshSnapshotsPerSecond: (snapshots.length - 1) / span, simulationSecondsPerWallSecond: (snapshots.at(-1).status.seaTime - snapshots[0].status.seaTime) / span, ...timing };
  writeFileSync(`${out}/timing.json`, JSON.stringify(result, null, 1));
  console.log(JSON.stringify({ displayFps: result.displayFps, freshSnapshotsPerSecond: result.freshSnapshotsPerSecond, simulationSecondsPerWallSecond: result.simulationSecondsPerWallSecond }));
} finally { await page.close(); }
