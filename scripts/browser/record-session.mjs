// Records a play session through the menus to a ride at a chosen spot (dev only).
//   npm run build && npm run preview        (the game on http://localhost:4173)
//   npm run record:session -- recordings/session.mp4 [--spot=Beach] [--swell=Medium] [--maxFilm=110] [--url=http://localhost:4173/]
// A driver plays with the keyboard like a player: it reads the dev telemetry (hidden from the film) to paddle
// for a wave with push behind it, pops up on the cue and rides S-turns. It writes the film and a log beside it.
// Chrome films its own tab (getDisplayMedia, auto-accepted) with the game's sound.
// The recorder pauses while the rider waits with no wave coming, so the film skips dead time.
import { createServer } from 'node:http';
import { writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, sleep } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const OUT = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'session.mp4';
const SPOT = args.spot ?? 'Beach';
const SWELL = args.swell ?? 'Medium';
const PAGE_URL = args.url ?? 'http://localhost:4173/';
/** Seconds of film the ride may take at most, and the wall-clock limit on trying. */
const MAX_FILM = Number(args.maxFilm ?? 110);
const MAX_WALL = Number(args.maxWall ?? 720);
const LOG = OUT.replace(/\.mp4$/, '.log');
const started = Date.now();
const log = (line) => {
  const text = `${((Date.now() - started) / 1000).toFixed(1).padStart(6)} s  ${line}`;
  console.log(text);
  appendFileSync(LOG, `${text}\n`);
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(LOG, '');

// The page posts the finished film here.
let received;
const upload = new Promise((resolve) => { received = resolve; });
const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.end(); return; }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    writeFileSync(OUT, body);
    res.end('ok');
    received(body.length);
  });
}).listen(5198);

const page = await launch({ url: PAGE_URL });
// Telemetry drives the paddle and pop-up timing; it is hidden, so the film shows the player's HUD.
await page.eval(`localStorage.setItem('breakline.settings.v1', JSON.stringify({ gameplay: { showTelemetry: true } })); location.reload()`);
await sleep(500);
await page.waitFor(`document.querySelector('.screen-menu') && !document.querySelector('.is-scene-pending')`, 60000);
await page.eval(`(() => { const s = document.createElement('style'); s.textContent = '.ride-telemetry { visibility: hidden !important; }'; document.head.append(s); })()`);
log('menu ready');

await page.eval(`(async () => {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { width: 1280, height: 720, frameRate: 30 },
    audio: { suppressLocalAudioPlayback: true },
    preferCurrentTab: true, selfBrowserSurface: 'include',
  });
  const recorder = new MediaRecorder(stream, { mimeType: 'video/mp4;codecs=avc1.64001F,mp4a.40.2', videoBitsPerSecond: 1700000, audioBitsPerSecond: 96000 });
  const chunks = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  recorder.start(1000);
  window.__film = { recorder, chunks, stream };
})()`, true);
// The "sharing this tab" bar takes room from the page: grow the window back to a 1280 × 720 page.
await sleep(800);
await page.fitViewport(1280, 720);
log('recording');

const film = {
  paused: false,
  seconds: 0,
  last: Date.now(),
  tick() {
    const now = Date.now();
    if (!this.paused) this.seconds += (now - this.last) / 1000;
    this.last = now;
  },
  async pause() { this.tick(); if (!this.paused) { this.paused = true; await page.eval('window.__film.recorder.pause()'); } },
  async resume() { this.tick(); if (this.paused) { this.paused = false; await page.eval('window.__film.recorder.resume()'); } },
};

// The title's waves, then a look through the screens.
await sleep(9000); // lets the Auto graphics benchmark finish on the menu's waves
await page.click('.tile, button', 'Settings');
await sleep(2500);
await page.click('.settings-tab', 'Graphics');
await sleep(3000);
await page.click('.icon-back');
await sleep(1500);
await page.click('.tile, button', 'Logbook');
await sleep(2500);
await page.click('.icon-back');
await sleep(1500);
await page.click('.tile, button', 'Surf');
await sleep(2000);
await page.click('.spot-card', SPOT);
await sleep(1500);
await page.click('.segmented button', SWELL);
await sleep(1500);
await page.eval(`document.querySelector('.surfer-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })`);
await sleep(2500);
await page.click('.button-primary', 'Paddle out');
log(`paddling out at ${SPOT}, ${SWELL} swell`);
await page.waitFor(`document.querySelector('#app')?.dataset.screen === 'ride'`, 120000);
log('riding screen');

const status = () => page.eval(`(() => {
  const rows = {};
  const dts = document.querySelectorAll('.ride-telemetry dt');
  for (const dt of dts) rows[dt.textContent.trim()] = dt.nextElementSibling?.textContent.trim() ?? '';
  const prompt = document.querySelector('.hud-prompt');
  return { rows, prompt: prompt && !prompt.hidden ? prompt.textContent : '' };
})()`);

let state = 'wait';
let since = Date.now();
let attempts = 0;
let best = 0;
let standingSince = 0;
let steerKey;
let lastPhase = '';
const rideStarted = Date.now();
const setState = (next) => { state = next; since = Date.now(); };
const elapsed = () => (Date.now() - since) / 1000;
const release = async () => {
  await page.keyUp('Space');
  if (steerKey) await page.keyUp(steerKey);
  steerKey = undefined;
};

while ((Date.now() - started) / 1000 < MAX_WALL) {
  film.tick();
  if (film.seconds > MAX_FILM) { log('film limit reached'); break; }
  const s = await status();
  const rider = s.rows.RIDER ?? '';
  const phase = rider.split(' · ')[0];
  if (phase !== lastPhase) {
    log(`${phase || 'no rider'} · ${rider} · face ${s.rows.FACE ?? '-'} · set ${s.rows['NEXT SET'] ?? '-'}`);
    lastPhase = phase;
  }
  const ahead = /([\d.]+) m ahead/.exec(s.rows.FACE ?? '');

  if (state === 'wait') {
    // Film a wave on its way in; skip the lulls (after the first few seconds of the ride).
    const crest = /c ([\d.]+) m\/s · (need|close)/.exec(s.rows.CREST ?? '');
    const coming = ahead && Number(ahead[1]) < 22 && crest && Number(crest[1]) >= 5;
    if (coming || Date.now() - rideStarted < 5000) await film.resume(); else await film.pause();
    // Go for a wave with some push behind it: its crest 3–11 m behind, travelling 5 m/s or more, not closing out.
    if (phase === 'PRONE' && ahead && Number(ahead[1]) < 11 && Number(ahead[1]) > 3 && crest && Number(crest[1]) >= 5 && crest[2] === 'need') {
      await film.resume();
      attempts += 1;
      log(`attempt ${attempts}: paddling (${s.rows.FACE}, ${s.rows.CREST})`);
      await page.keyDown('Space');
      setState('go');
    } else if (phase === 'FALLEN' || phase === '') {
      await page.press('KeyR');
      await sleep(1500);
    }
  } else if (state === 'go') {
    if (/Pop up now/i.test(s.prompt) || rider.includes('POP UP NOW')) {
      await page.keyUp('Space');
      await page.press('Enter', 120);
      log(`attempt ${attempts}: pop-up on the cue at ${rider}`);
      setState('rising');
    } else if (elapsed() > 8) {
      await release();
      log(`attempt ${attempts}: no cue in 8 s, paddling back out`);
      await page.press('KeyR');
      setState('settle');
    }
  } else if (state === 'rising') {
    if (phase === 'STANDING') {
      standingSince = Date.now();
      log(`attempt ${attempts}: standing`);
      setState('ride');
    } else if (phase === 'FALLEN' || elapsed() > 4) {
      log(`attempt ${attempts}: did not stand (${s.rows['POP-UP'] ?? ''})`);
      setState('after');
    }
  } else if (state === 'ride') {
    if (phase !== 'STANDING') {
      await release();
      const ride = (Date.now() - standingSince) / 1000;
      best = Math.max(best, ride);
      log(`attempt ${attempts}: ride ended after ${ride.toFixed(1)} s (${rider}; ${s.rows.FELL ?? ''})`);
      setState('after');
    } else {
      // Gentle S-turns: lean one way, then the other, with straight spells between.
      const t = (Date.now() - standingSince) / 1000;
      const want = t < 1.2 ? undefined : (Math.floor((t - 1.2) / 1.6) % 2 === 0 ? 'ArrowLeft' : 'ArrowRight');
      const lean = t >= 1.2 && ((t - 1.2) % 1.6) < 0.7 ? want : undefined;
      if (lean !== steerKey) {
        if (steerKey) await page.keyUp(steerKey);
        if (lean) await page.keyDown(lean);
        steerKey = lean;
      }
    }
  } else if (state === 'after') {
    if (elapsed() > 3.5) {
      if (best >= 6) { log('got a ride; wrapping up'); break; }
      await page.press('KeyR');
      setState('settle');
    }
  } else if (state === 'settle') {
    if (elapsed() > 2.5) setState('wait');
  }
  await sleep(80);
}
await release();
await film.resume();
log(`auto graphics: ${await page.eval("localStorage.getItem('breakline.settings.v1')").then((v) => { const j = JSON.parse(v); return j.graphics.preset + ' → ' + JSON.stringify(j.detected); })}`);
log(`attempts ${attempts}, best ride ${best.toFixed(1)} s, film ${film.seconds.toFixed(0)} s`);

// Out through the pause menu, back to the title.
await sleep(1500);
await page.press('Escape');
await sleep(2500);
await page.click('button', 'Quit to menu');
await sleep(5000);
await page.eval(`new Promise((resolve) => {
  const { recorder, chunks, stream } = window.__film;
  recorder.onstop = async () => {
    stream.getTracks().forEach((track) => track.stop());
    const blob = new Blob(chunks, { type: 'video/mp4' });
    await fetch('http://localhost:5198/upload', { method: 'POST', body: blob });
    resolve(blob.size);
  };
  recorder.stop();
})`);
const bytes = await upload;
log(`saved ${OUT} (${(bytes / 1e6).toFixed(1)} MB)`);
server.close();
await page.close();
